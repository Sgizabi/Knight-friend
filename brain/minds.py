"""The beings' minds: a short thought when a being arrives (why it came this time, how it means to
go about it, what it does first) and a short turn each time Rooken acts (what it does, within
what the rules have already decided, and, for beings with a voice, what it says).

The rules (encounters.py) still decide every outcome; a mind only decides how the being goes
about things and what that looks like, so neither side's AI ever writes itself a win. A clever
being that has been driven off the same way before may come ready for it ("cunning"), which
blunts that answer a little, fairly and only for the quick learners.

Minds run on their own model and allowance (llm.LADDER["beings"]), never Rooken's. They fall
silent, and the rules' own words stand in, when their daily cap is spent, a call fails, or Rooken
himself has had to move onto their model: he always comes first.
"""

import datetime as dt
import json
import re

import beings
import creatures
import encounters
import llm

MIND_BUDGET = 60000         # tokens a day for every being's mind together (of the model's ~200,000)
HISTORY = 4                 # past visits a being remembers in detail
APPROACHES = ["careful", "bold", "curious", "cunning", "distant", "friendly"]
TEMPER = {"careful": "wary", "bold": "bold", "curious": "calm", "cunning": "wary", "distant": "wary", "friendly": "calm"}
CUNNING_LEARNS = .2         # only beings that learn at least this fast can come ready for his last answer
BANNED = re.compile(r"\b(blood|bloody|gore|guts|corpse|kill|killed|dead body|holy|pray|prayer|god|gods|demon|hell|"
                    r"crucifix|angel|church|temple)\b", re.I)

SYSTEM = (
    "You are the mind of one being in a dark-fantasy world, deciding only what this being does. A lone "
    "knight lives in a ruined keep nearby; he decides for himself, and fair rules decide how things turn "
    "out. You never speak or decide for him, and you never change an outcome you are given.\n"
    "Stay in character: what you are, your traits, why you came. Peril, never gore; nothing religious; "
    "nothing cruel for its own sake. Write what someone watching would see, in plain short sentences, "
    "present tense, calling yourself 'it' (or 'they' for many). No narrator flourishes. Reply in English, as JSON only.")


def can_think(brain, usage, world):
    """Whether the beings' minds may think today (else the rules' own words stand in)."""
    if brain is None or not creatures.enabled():
        return False
    models = llm.chosen_models(world)
    if models["beings"] == models["main"]:
        return False                               # Rooken is on their model: his needs come first
    return usage.get("mind_tokens", 0) + getattr(brain, "tokens_by_role", {}).get("beings", 0) < MIND_BUDGET


def _ago(t, now):
    days = (now - t).total_seconds() / 86400
    return "earlier today" if days < 1 else "yesterday" if days < 2 else f"{int(days)} days ago" if days < 60 \
        else f"about {int(days / 30)} months ago"


def history(world, kind, now):
    """This kind's last few meetings with him, from its side."""
    out = []
    for e in [e for e in encounters._lines(world / "encounters.jsonl") if e.get("kind") == kind][-HISTORY:]:
        t = encounters._parse(e.get("time"))
        steps = "; then ".join(f"he chose to {s.get('choice', '').replace('_', ' ')} ({s.get('how', '')[:90]}), "
                              f"and it went {'his way' if s.get('result') == 'good' else 'your way' if s.get('result') == 'bad' else 'nowhere much'}"
                              for s in e.get("steps", []))
        why = f" (you came for: {e['why']})" if e.get("why") else ""
        out.append(f"- {_ago(t, now) if t else 'once'}{why}: {steps or 'you passed by'}")
    return out


def _who(a):
    kind = a["kind"]
    c, k = beings.CHARACTERS[kind], creatures.KINDS[kind]
    if c.get("looks_seeing") and a.get("seeing", 0) < 2:    # he can't see what it truly is yet: neither may it say
        lines = [f"You are a being that looks like {c['looks']}. What you truly are ({c['looks_seeing']}) the knight "
                 "cannot see yet: describe only what he can see."]
    else:
        lines = [f"You are {k['name']}: {c.get('looks_seeing') or c['looks']}."]
    lines += [f"Your nature: {k['nature']}. Your traits: {', '.join(c['traits'])}.",
             f"This time you came for: {a.get('drive', '')}."]
    mark = (a.get("variant") or {}).get("mark")
    if mark:
        lines.append(f"You are {'an old' if mark == 'old' else 'a young' if mark == 'young' else 'a scarred'} one of your kind.")
    if c.get("likes"):
        lines.append(f"You care for: {', '.join(encounters.likes_of(a))}.")
    if c.get("voice"):
        lines.append("You can talk, in your own manner; you need not.")
    else:
        lines.append("You cannot talk.")
    return "\n".join(lines)


def _clean(text, limit):
    text = re.sub(r"\s+", " ", re.sub(r"[<>{}\[\]*_#`]", "", str(text or ""))).strip().strip('"')
    if not text or BANNED.search(text):
        return ""
    return text[:limit].rsplit(" ", 1)[0] + "..." if len(text) > limit else text


def _ask(brain, task, prompt, max_tokens):
    reply = brain.chat([{"role": "system", "content": SYSTEM}, {"role": "user", "content": f"TASK: {task}\n\n{prompt}"}],
                       max_tokens=max_tokens, model="beings", json_mode=True, temperature=.9)
    return llm.parse_json(reply)


def arrive(brain, a, world, setting, now=None):
    """Its first thought on arriving. Returns {why, approach, doing, says} or None (the rules carry on)."""
    now = now or dt.datetime.now(dt.timezone.utc)
    past = history(world, a["kind"], now)
    prompt = (f"{_who(a)}\n\n{setting}\n\n" +
              ("Your past meetings with the knight (your kind remembers):\n" + "\n".join(past) + "\n\n" if past else
               "You have never met this knight.\n\n") +
              "You are arriving now. Decide, in character:\n"
              "- why: why you have come this time, in a short line (if you have come before, a different reason or "
              "a different way of going about it than last time)\n"
              f"- approach: one of {APPROACHES} ('cunning' means you come ready for how he dealt with you last time)\n"
              "- doing: what you do first, as he would see it, one or two short sentences\n"
              "- says: only the words you speak aloud to him, if you can talk and want to (no actions, no "
              "quotation marks); otherwise empty\n"
              'Reply as JSON: {"why": "", "approach": "", "doing": "", "says": ""}')
    try:
        data = _ask(brain, "being_arrive", prompt, 600)
    except llm.LLMError as err:
        print(f"  [its mind is quiet: {err}]")
        return None
    approach = str(data.get("approach") or "").strip().lower()
    m = {"why": _clean(data.get("why"), 160) or a.get("drive", ""), "approach": approach if approach in APPROACHES else "careful",
         "doing": _clean(data.get("doing"), 260),
         "says": _clean(data.get("says"), 160) if beings.CHARACTERS[a["kind"]].get("voice") else ""}
    return m if m["doing"] else None


def settle_in(a, m, entry):
    """What a mind's choice changes, fairly: its mood this visit, and (only for quick learners
    that came 'cunning') readiness for the answer that last worked on its kind."""
    a["mind"] = m
    a["temper"] = TEMPER.get(m["approach"], a.get("temper", "calm"))
    wise = (entry or {}).get("wise") or {}
    if m["approach"] == "cunning" and beings.LEARNS.get(a["kind"], 0) >= CUNNING_LEARNS and wise:
        a["avoid"] = max(wise, key=lambda k: wise[k].get("at", ""))


def turn(brain, a, choice, how, out):
    """Its answer to what he just did, within the outcome the rules settled. Returns {does, says} or None."""
    m = a.get("mind") or {}
    settled = {"good": "it goes well for the knight: you are won over, put off or driven back, as fits",
               "bad": "it goes badly for the knight: you are displeased, or press on, or have your way, as fits",
               "neutral": "nothing much changes"}[out["result"]]
    facts = " ".join([out.get("said", "")] + out.get("extra", []))
    prompt = (f"{_who(a)}\nWhy you came: {m.get('why', '')}. Your approach: {m.get('approach', '')}.\n\n"
              f"The knight chose to {choice.replace('_', ' ')}: \"{how[:200]}\"\n"
              f"The outcome is already settled ({settled}): {facts}\n"
              + ("This ends the meeting: you leave, or stop, or are gone.\n" if out.get("ends") else "") +
              "Describe what you do now, as he would see it, in one or two short sentences that fit that outcome "
              "exactly: add no harm, gift or loss beyond it, and don't repeat what you did before. says: only the "
              "words you speak aloud, if you can talk and want to (no actions, no quotation marks); otherwise empty.\n"
              'Reply as JSON: {"does": "", "says": ""}')
    try:
        data = _ask(brain, "being_turn", prompt, 400)
    except llm.LLMError as err:
        print(f"  [its mind is quiet: {err}]")
        return None
    t = {"does": _clean(data.get("does"), 260),
         "says": _clean(data.get("says"), 160) if beings.CHARACTERS[a["kind"]].get("voice") else ""}
    return t if t["does"] else None


def told(does, says):
    return (does + (f' It says: "{says}"' if says else "")).strip()
