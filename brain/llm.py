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
MODELS_URL = "https://api.groq.com/openai/v1/models"
# Good free Groq models for each job, best first (checked 2026-11-19). If one is retired, the
# knight moves to the next and remembers it in world/meta.json. The checker gets a different
# model from the main one where it can, so it spends from a separate daily allowance.
LADDER = {
    "main": ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"],
    "check": ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-safeguard-20b"],  # safeguard: only ~2k a minute
}
# The keeper can name a model outright (GitHub repo variables KNIGHT_MODEL / KNIGHT_CHECK_MODEL);
# an empty value means "use the list above".
OVERRIDE = {"main": os.environ.get("KNIGHT_MODEL") or "", "check": os.environ.get("KNIGHT_CHECK_MODEL") or ""}
MAIN_MODEL = OVERRIDE["main"] or LADDER["main"][0]
CHECK_MODEL = OVERRIDE["check"] or LADDER["check"][0]
TPM_LIMIT = int(os.environ.get("KNIGHT_TPM") or "7400")   # until the model's own limit is known
TPD = re.compile(r"tokens per day \(TPD\): Limit (\d+), Used (\d+)", re.I)
RPD = re.compile(r"requests per day \(RPD\)", re.I)
GONE_WORDS = ("decommissioned", "model_not_found", "does not exist", "not found", "no longer supported",
              "has been deprecated", "model_terminated")


def _char_cost(ch):
    o = ord(ch)
    if o < 128:
        if ch.isalpha() or ch == " ":
            return .22                               # English and other plain Latin text
        if ch.isdigit():
            return .35                               # numbers go in short runs
        return 1.0                                   # symbols, newlines: code and markup are dense
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
    model (2026-11-19), tokens per character: English prose ~0.23 (HTML or code ~0.47, since
    symbols cost about a token each), Spanish/French ~0.25-0.28,
    Vietnamese/Russian/Arabic/Hindi ~0.33-0.38, Thai ~0.5, Chinese/Japanese/Korean ~0.78,
    emoji ~1.9. The weights above lean a little high, so it never underestimates much."""
    return round(sum(_char_cost(ch) for ch in str(text or "")))



class LLMError(Exception):
    pass


class DailyLimit(LLMError):
    """Groq said the day's allowance for this model is used up. Not worth retrying today."""

    def __init__(self, model, limit=None, used=None):
        super().__init__(f"daily limit reached for {model}" + (f" (limit {limit})" if limit else ""))
        self.model, self.limit, self.used = model, limit, used


def _scrub(text):
    """Error details go into public logs: leave out account ids."""
    return re.sub(r"\borg_\w+", "org_…", text)


def _is_gone(code, detail):
    low = detail.lower()
    return code == 404 or (code in (400, 410) and "model" in low and any(w in low for w in GONE_WORDS))


def available_models(key):
    """The model names this key can use right now (asking costs no tokens), or None."""
    try:
        request = urllib.request.Request(MODELS_URL, headers={"Authorization": f"Bearer {key}",
                                                              "User-Agent": "knight-keep/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            return {m["id"] for m in json.load(response).get("data", []) if m.get("active", True)}
    except (urllib.error.URLError, TimeoutError, ConnectionError, ValueError, KeyError):
        return None


def read_meta(world):
    try:
        return json.loads((world / "meta.json").read_text(encoding="utf-8")) if world else {}
    except (OSError, ValueError):
        return {}


def write_meta(world, changes):
    """Merge into world/meta.json (other parts of the knight keep their notes there too)."""
    if not world:
        return
    meta = {**read_meta(world), **changes}
    (world / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def chosen_models(world=None):
    """Which model does each job: the keeper's choice if set, else a backup it moved to earlier,
    else the first on the list."""
    remembered = read_meta(world).get("models") or {}
    return {role: OVERRIDE[role] or remembered.get(role) or LADDER[role][0] for role in LADDER}


class Brain:
    def __init__(self, api_key, world=None, remember=True):
        self.key = api_key
        self.world = world          # where it finds (and remembers) a switch of model: world/meta.json
        self.remember = remember    # False for the quick letter checks, which only read it
        self.models = chosen_models(world)
        self.gone = set()
        self.tpm = {}               # model -> its per-minute limit, learned from Groq's replies
        self.windows = {}  # model -> [(timestamp, tokens)]
        self.tokens_by_model = {}
        self.last_finish = None  # "length" when the last reply was cut off by max_tokens

    @property
    def tokens_used(self):
        return sum(self.tokens_by_model.values())

    def _wait_for_room(self, model, estimate):
        window = self.windows.setdefault(model, [])
        limit = self.tpm.get(model, TPM_LIMIT)
        while True:
            now = time.time()
            window[:] = [(t, n) for t, n in window if now - t < 62]
            if not window or sum(n for _, n in window) + estimate <= limit:
                return
            time.sleep(max(1.0, 62 - (now - window[0][0])))

    def _move_on(self, role, model):
        """Its model was retired: take the next good one on the list and remember it."""
        self.gone.add(model)
        listed = available_models(self.key)
        other = self.models.get("check" if role == "main" else "main")
        options = [m for m in LADDER[role] if m not in self.gone and (listed is None or m in listed)]
        options.sort(key=lambda m: m == other)       # keep the two jobs on different models if it can
        if not options:
            raise LLMError(f"model {model} is no longer available and no backup is left "
                           f"(set the KNIGHT_MODEL repo variable to a current Groq model)")
        new = options[0]
        self.models[role] = new
        print(f"[model {model} is no longer available; {role} now uses {new}]")
        if self.world and self.remember:
            meta = read_meta(self.world)
            log = (meta.get("model_log") or [])[-9:] + [{"time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                                          "job": role, "from": model, "to": new}]
            write_meta(self.world, {"models": {**(meta.get("models") or {}), role: new}, "model_log": log})
        return new

    def chat(self, messages, max_tokens=1500, model=None, json_mode=False,
             effort="low", temperature=1.0):
        """model: "main" (the default) or "check" for its two jobs, or a model's own name."""
        role = model if model in LADDER else ("main" if model is None else None)
        name = self.models[role] if role else model
        # a little over the measured size, so pacing never undercounts (Chinese uses ~3x English per character)
        estimate = int(sum(estimate_tokens(m["content"]) for m in messages) * 1.15) + max_tokens
        drop = set()                                  # options this model turned out not to take

        def body_for(name):
            body = {"model": name, "messages": messages, "max_completion_tokens": max_tokens,
                    "temperature": temperature}
            if effort and "gpt-oss" in name:
                body["reasoning_effort"] = effort
            elif "qwen" in name:
                body["reasoning_format"] = "hidden"   # think quietly; only the answer comes back
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            for key in drop:
                body.pop(key, None)
            return body

        last_error = "unknown"
        for _attempt in range(6):
            self._wait_for_room(name, estimate)
            body = body_for(name)
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
                    tpm = response.headers.get("x-ratelimit-limit-tokens")
            except urllib.error.HTTPError as err:
                detail = _scrub(err.read().decode("utf-8", errors="replace")[:400])
                last_error = f"HTTP {err.code}: {detail}"
                self.windows[name].append((time.time(), estimate))
                if err.code == 429 and (TPD.search(detail) or RPD.search(detail)):
                    found = TPD.search(detail)
                    limit, used = (int(found.group(1)), int(found.group(2))) if found else (None, None)
                    raise DailyLimit(name, limit, used)
                if err.code == 429 or err.code >= 500:
                    wait = float(err.headers.get("retry-after") or 20)
                    time.sleep(min(wait, 120) + 1)
                    continue
                if role and _is_gone(err.code, detail):
                    name = self._move_on(role, name)
                    continue
                if err.code == 400 and "response_format" in body and "json" in detail.lower():
                    drop.add("response_format")  # the model fumbled JSON mode; parse by hand
                    continue
                if err.code == 400 and "reasoning" in detail.lower() and not {"reasoning_format", "reasoning_effort"} <= drop:
                    drop.update({"reasoning_format", "reasoning_effort"})
                    continue
                raise LLMError(last_error)
            except (urllib.error.URLError, TimeoutError, ConnectionError) as err:
                last_error = str(err)
                time.sleep(10)
                continue

            if tpm and tpm.isdigit():
                self.tpm[name] = int(int(tpm) * .925)  # a little under the model's per-minute limit
            used = (data.get("usage") or {}).get("total_tokens", estimate)
            self.windows[name].append((time.time(), used))
            self.tokens_by_model[name] = self.tokens_by_model.get(name, 0) + used
            self.last_finish = data["choices"][0].get("finish_reason")
            text = data["choices"][0]["message"].get("content") or ""
            return re.sub(r"<think>[\s\S]*?</think>\s*", "", text)
        raise LLMError(f"gave up after retries ({last_error})")


def record_test_usage(brain, note="test", push=True, repo=None):
    """For the keeper's own test runs with the real key: add what they spent to
    world/test_usage.json in the real project (not a practice copy), so the knight's daily cap
    counts it too (tests and the knight share one Groq allowance). With push=True it's committed
    and pushed straight away; the knight only ever reads this file, so it never conflicts.
    Call it once at the end of a test script:  llm.record_test_usage(brain, "letters test")"""
    import datetime
    import subprocess
    from pathlib import Path
    spent = {m: n for m, n in brain.tokens_by_model.items() if m != "fake" and n}
    if not spent:
        return 0
    repo = Path(repo or Path(__file__).resolve().parent.parent)
    path = repo / "world" / "test_usage.json"
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

    def add():
        try:
            log = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            log = {}
        if log.get("date") != today:
            log = {"date": today, "tokens": 0, "by_model": {}, "runs": []}
        log["tokens"] += sum(spent.values())
        for m, n in spent.items():
            log["by_model"][m] = log["by_model"].get(m, 0) + n
        log["runs"] = (log["runs"] + [{"note": str(note)[:60], "tokens": sum(spent.values())}])[-30:]
        path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return log["tokens"]

    def git(*args):
        return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)

    if push:
        git("pull", "--rebase", "--autostash", "--quiet")       # start from the knight's latest
    total = add()
    print(f"[test usage: {sum(spent.values())} tokens recorded ({total} by tests today)]")
    if push:
        git("add", "world/test_usage.json")
        git("commit", "--quiet", "-m", f"Testing used {sum(spent.values())} tokens ({note})", "--", "world/test_usage.json")
        for _ in range(3):
            if git("push", "--quiet").returncode == 0:
                break
            git("pull", "--rebase", "--autostash", "--quiet")
        else:
            print("[test usage saved locally but not pushed yet: push when you can]")
    # brain's counts are now recorded; don't record them twice
    brain.tokens_by_model.clear()
    return sum(spent.values())


def tests_today(world, models=None):
    """Tokens the keeper's tests spent today on the shared allowance (see record_test_usage);
    with models, only what they spent on those (each model has its own daily allowance)."""
    import datetime
    try:
        log = json.loads((world / "test_usage.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return 0
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    if log.get("date") != today:
        return 0
    if models is None:
        return int(log.get("tokens", 0))
    return sum(int(n) for m, n in (log.get("by_model") or {}).items() if m in models)


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
        if task == "encounter":
            options = re.findall(r"^- \[([a-z_]+)\] ", prompt, re.M) or ["watch"]
            return json.dumps({"thought": "What on earth is that?", "choice": random.choice(options),
                               "how": random.choice(["I keep very still and watch it.", "I wave a torch and shout at it.",
                                                     "I offer it a bright glass bead.", "I bar the door and sit by the fire."])})
        if task == "encounter_after":
            return json.dumps({"thought": "Well. That happened.", "name": "the odd visitor",
                               "note": "It came, it looked about, it went. I kept still."})
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
            activity = random.choice(["draw", "write", "study", "build", "craft", "repair", "raise",
                                      "rest", "sleep", "wander", "invent"] + own[-3:])
            subject = (random.choice(["doorway", "stair", "hearth"]) if activity == "repair" else
                       random.choice(["woodshed", "forge", "own", "a hut for my maps"]) if activity == "raise"
                       else "old lighthouses")
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
        if task == "letter":
            return json.dumps({"language": "English", "reply": "Thanks for writing. The fire says hello."})
        if task == "questions":
            return json.dumps({"questions": ["How is the lighthouse page coming along?",
                                             "What did the wall teach you this week?", "too short?",
                                             "Why do you count the stairs?", "no question mark",
                                             "Why do you count the stairs?"]})
        if task == "design":
            return json.dumps({"name": random.choice(["The Reading Nook", "Map Room", "a"]),
                               "about": "a dry corner for books and maps", "kind": "thoughtful",
                               "look": {"walls": random.choice(["timber", "stone", "glass"]), "roof": "gable",
                                        "size": "small", "accent": "sea blue", "feature": "lantern"}})
        if task == "condense":
            return json.dumps({"summary": "I am a test knight who likes lighthouses.",
                               "add": [{"section": "quirks", "text": "talks to the bookshelf"},
                                       {"section": "nonsense", "text": "ignored"}], "drop": []})
        return "{}"
