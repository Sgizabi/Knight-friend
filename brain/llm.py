"""Talking to the free Groq models, politely.

Groq's free plan allows roughly 8,000 tokens per minute and 200,000 tokens per
day for each model. This module paces requests so the knight never trips the
per-minute limit, retries when it does anyway, and counts what it spends.
"""

import json
import os
import random
import re
import time
import urllib.error
import urllib.request

API_URL = "https://api.groq.com/openai/v1/chat/completions"
MAIN_MODEL = os.environ.get("KNIGHT_MODEL", "openai/gpt-oss-120b")
# The checker gets its own model so it spends from a separate daily allowance.
CHECK_MODEL = os.environ.get("KNIGHT_CHECK_MODEL", "openai/gpt-oss-20b")
TPM_LIMIT = int(os.environ.get("KNIGHT_TPM", "7400"))


def _char_cost(ch):
    o = ord(ch)
    if o < 128:
        return .25                                   # English and other plain Latin text
    if 0x1F000 <= o or 0x2600 <= o <= 0x27BF or 0xFE00 <= o <= 0xFE0F:
        return 2.0                                   # emoji and pictographs
    if 0x1100 <= o <= 0x11FF or 0xAC00 <= o <= 0xD7AF:
        return 1.0                                   # Korean
    if 0x2E80 <= o <= 0x9FFF or 0xF900 <= o <= 0xFAFF or 0xFF00 <= o <= 0xFFEF:
        return .85                                   # Chinese, Japanese
    if 0x0E00 <= o <= 0x0E7F:
        return .6                                    # Thai
    if 0x80 <= o <= 0x24F or 0x1E00 <= o <= 0x1EFF:
        return .6                                    # accented Latin (French, Vietnamese...)
    if 0x0400 <= o <= 0x04FF:
        return .4                                    # Cyrillic
    return .45                                       # Arabic, Hindi and the rest


def estimate_tokens(text):
    """Roughly how much of its AI allowance a text uses, in any language. Measured on its
    model (2026-11-19), tokens per character: English ~0.23, Spanish/French ~0.25-0.28,
    Vietnamese/Russian/Arabic/Hindi ~0.33-0.38, Thai ~0.5, Chinese/Japanese/Korean ~0.78,
    emoji ~1.9. The weights above lean a little high, so it never underestimates much."""
    return round(sum(_char_cost(ch) for ch in str(text or "")))



class LLMError(Exception):
    pass


class Brain:
    def __init__(self, api_key):
        self.key = api_key
        self.windows = {}  # model -> [(timestamp, tokens)]
        self.tokens_by_model = {}
        self.last_finish = None  # "length" when the last reply was cut off by max_tokens

    @property
    def tokens_used(self):
        return sum(self.tokens_by_model.values())

    def _wait_for_room(self, model, estimate):
        window = self.windows.setdefault(model, [])
        while True:
            now = time.time()
            window[:] = [(t, n) for t, n in window if now - t < 62]
            if not window or sum(n for _, n in window) + estimate <= TPM_LIMIT:
                return
            time.sleep(max(1.0, 62 - (now - window[0][0])))

    def chat(self, messages, max_tokens=1500, model=None, json_mode=False,
             effort="low", temperature=1.0):
        model = model or MAIN_MODEL
        # a little over the measured size, so pacing never undercounts (Chinese uses ~3x English per character)
        estimate = int(sum(estimate_tokens(m["content"]) for m in messages) * 1.15) + max_tokens
        body = {
            "model": model,
            "messages": messages,
            "max_completion_tokens": max_tokens,
            "temperature": temperature,
        }
        if effort and "gpt-oss" in model:
            body["reasoning_effort"] = effort
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        last_error = "unknown"
        for _attempt in range(5):
            self._wait_for_room(model, estimate)
            request = urllib.request.Request(
                API_URL,
                data=json.dumps(body).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {self.key}",
                    "Content-Type": "application/json",
                    "User-Agent": "knight-keep/1.0",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=180) as response:
                    data = json.load(response)
            except urllib.error.HTTPError as err:
                detail = err.read().decode("utf-8", errors="replace")[:400]
                last_error = f"HTTP {err.code}: {detail}"
                self.windows[model].append((time.time(), estimate))
                if err.code == 429 or err.code >= 500:
                    wait = float(err.headers.get("retry-after") or 20)
                    time.sleep(min(wait, 120) + 1)
                    continue
                if err.code == 400 and "response_format" in body and "json" in detail.lower():
                    body.pop("response_format")  # the model fumbled JSON mode; parse by hand
                    continue
                raise LLMError(last_error)
            except (urllib.error.URLError, TimeoutError, ConnectionError) as err:
                last_error = str(err)
                time.sleep(10)
                continue

            used = (data.get("usage") or {}).get("total_tokens", estimate)
            self.windows[model].append((time.time(), used))
            self.tokens_by_model[model] = self.tokens_by_model.get(model, 0) + used
            self.last_finish = data["choices"][0].get("finish_reason")
            return data["choices"][0]["message"].get("content") or ""
        raise LLMError(f"gave up after retries ({last_error})")


def parse_json(text):
    """Read a JSON object out of a reply, tolerating chatter around it."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    fence = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if fence:
        try:
            return json.loads(fence.group(1))
        except json.JSONDecodeError:
            pass
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    raise LLMError("reply was not readable JSON")


# --------------------------------------------------------------------------
# A stand-in brain for testing the plumbing without spending any allowance.
# --------------------------------------------------------------------------

class FakeBrain(Brain):
    def __init__(self):
        super().__init__("fake")

    def chat(self, messages, max_tokens=1500, model=None, json_mode=False,
             effort="low", temperature=1.0):
        prompt = messages[-1]["content"]
        task = re.search(r"TASK: (\w+)", prompt)
        task = task.group(1) if task else ""
        self.tokens_by_model["fake"] = self.tokens_by_model.get("fake", 0) + 500
        moods = ["content", "curious", "melancholy", "restless", "absorbed", "proud"]
        emotes = ["music", "question", "dots", "heart", "spark", "sigh"]
        if task == "check":
            return "ALLOW - harmless test content"
        if task == "birth":
            return json.dumps({"name": "Test Knight", "epithet": "of the Practice Run",
                               "self_description": "A placeholder knight made for testing.",
                               "voice": "Short sentences. Counts things out loud.",
                               "traits": ["counts stones", "hums when bored", "distrusts doors"],
                               "values": ["tidy rubble"], "fears": ["damp", "silence"],
                               "quirks": ["names every rat"],
                               "first_words": "I wake. The fire is warm. Am I real? Only a test."})
        if task == "decide":
            own = re.findall(r"^- \[([a-z0-9-]+)\] ", prompt, re.M)  # its own pastimes, if any
            activity = random.choice(["draw", "write", "study", "build", "craft", "repair",
                                      "rest", "sleep", "wander", "invent"] + own[-3:])
            subject = random.choice(["doorway", "stair", "hearth"]) if activity == "repair" else "old lighthouses"
            return json.dumps({"waking_thought": f"Perhaps I will {activity}.",
                               "mood": random.choice(moods), "activity": activity,
                               "subject": subject, "project": "new",
                               "intention": "to see what happens",
                               "new_pastime": {"name": random.choice(["Sorting glass", "Counting stairs", "Humming"]),
                                               "about": "a practice pastime", "place": "workbench",
                                               "action": "work", "kind": random.choice(
                                                   ["restful", "creative", "physical", "thoughtful", "bogus"])}})
        if task == "craft":
            return json.dumps({"name": "A small lantern", "about": "to keep the dark polite",
                               "placement": random.choice(["floor", "table", "shelf", "wall"]),
                               "parts": [
                                   {"shape": "box", "size": [.2, .04, .2], "pos": [0, .02, 0], "rot": [0, 0, 0], "color": "#3a2a1a"},
                                   {"shape": "cylinder", "size": [.07, .08, .22], "pos": [0, .15, 0], "rot": [0, 0, 0], "color": "#f2c46b"},
                                   {"shape": "cone", "size": [.12, .1], "pos": [0, .31, 0], "rot": [0, 0, 0], "color": "#3a2a1a"},
                                   {"shape": "torus", "size": [.04, .01], "pos": [0, .39, 0], "rot": [1.57, 0, 0], "color": "nonsense"},
                                   {"shape": "pyramid", "size": [1], "pos": [0, 0, 0]}]})
        if task == "draw":
            return ("TITLE: A small lighthouse\n```svg\n<svg xmlns='http://www.w3.org/2000/svg' "
                    "viewBox='0 0 480 360'><rect width='480' height='360' fill='#1b2233'/>"
                    "<rect x='220' y='120' width='40' height='200' fill='#ddd'/>"
                    "<circle cx='240' cy='110' r='18' fill='#ffd36b' onclick='alert(1)'/>"
                    "<script>alert(1)</script></svg>\n```")
        if task == "write":
            return json.dumps({"title": "Ode to a Candle", "form": "poem",
                               "text": "Small flame, you keep\nthe dark polite."})
        if task == "build":
            return ("TITLE: The Lighthouse Ledger\nABOUT: A page counting imaginary ships.\n"
                    "```html\n<!DOCTYPE html><html><head><title>Ledger</title>"
                    "<meta http-equiv='refresh' content='0;url=https://example.com'></head>"
                    "<body style='background:#111;color:#eee'><h1>Ships seen: <span id=n>0</span></h1>"
                    "<button onclick='n.textContent=+n.textContent+1'>Another ship</button>"
                    "</body></html>\n```")
        if task == "study":
            return json.dumps({"notes": "Lighthouses once burned whale oil. Strange.",
                               "sparks": ["draw a lighthouse at night"]})
        if task == "glance":
            return json.dumps({"thought": "Still eleven steps. Still counting them.",
                               "change_plan": random.random() < .3,
                               "plan": [{"place": "bedroll", "action": "sleep", "minutes": 40, "note": "a nap"}]})
        if task == "reflect":
            return json.dumps({
                "diary": "A test entry. I did a thing and felt a feeling about it.",
                "mood": random.choice(moods), "emote": random.choice(emotes),
                "interests": ["lighthouses", "candles"], "self_description": "",
                "plan": [
                    {"place": "fire", "action": "sit", "minutes": 20, "emote": "dots", "note": "thinking",
                     "thoughts": ["The fire's lazy today. Same.", "Should check the wall later."]},
                    {"place": "window", "action": "gaze", "minutes": 15, "emote": "sigh", "note": "watching the sea"},
                    {"place": "workbench", "action": "work", "minutes": 30, "emote": "spark", "note": "tinkering"},
                    {"place": "bedroll", "action": "sleep", "minutes": 50, "emote": "zzz", "note": "napping"},
                ],
                "project_note": "add more ships", "project_done": False,
                "reply_to_keeper": "Thank you for the letter." if "new letter" in prompt else "",
                "answers": [{"card": 1, "answer": "The hammer. It never argues."},
                            {"card": 7, "answer": "Out of range, should be ignored."}] if "[1] " in prompt else [],
                "leave_at_gate": "A flat stone, good for skipping." if "leave_at_gate" in prompt else "",
                "ask_response": "Most of you said soup. Noted, and slightly worrying." if "ask_response" in prompt else "",
                "close_ask": False,
                "ask_visitors": {"question": "Which is worse: a leaky roof or a wobbly stair?",
                                 "options": ["Leaky roof", "Wobbly stair", "Leaky roof", "Both, obviously", "x" * 80]}
                if "ask_visitors" in prompt else {}})
        if task == "questions":
            return json.dumps({"questions": ["How is the lighthouse page coming along?",
                                             "What did the wall teach you this week?", "too short?",
                                             "Why do you count the stairs?", "no question mark",
                                             "Why do you count the stairs?"]})
        if task == "condense":
            return json.dumps({"summary": "I am a test knight who likes lighthouses.",
                               "add": [{"section": "quirks", "text": "talks to the bookshelf"},
                                       {"section": "nonsense", "text": "ignored"}], "drop": []})
        return "{}"
