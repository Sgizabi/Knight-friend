"""The beings' minds: a short thought when a being arrives (why it came this time, how it means to
go about it, what it does first) and a short turn each time Rooken acts (what it does, within
what the rules have already decided, and, for beings with a voice, what it says).

The rules (encounters.py) still decide every outcome; a mind only decides how the being goes
about things and what that looks like, so neither side's AI ever writes itself a win. A clever
being that has been driven off the same way before may come ready for it ("cunning"), which
blunts that answer a little, fairly and only for the quick learners.

When a second being arrives while the first is still here, the two get one bounded exchange
at arrival only: the first reacts once (react), the second replies once (reply), and then it
is back to Rooken. That is the whole of their talk to each other; nothing they say settles
anything, and neither gets a turn on Rooken's steps.

Minds run on their own model and allowance (llm.LADDER["beings"]), never Rooken's. They fall
silent, and the rules' own words stand in, when their daily cap is spent, a call fails, or Rooken
himself has had to move onto their model: he always comes first.
"""

import datetime as dt
import json
import os
import re

import beings
import creatures
import encounters
import llm
import people

MIND_BUDGET = 60000         # tokens a day for every being's mind together (of the model's ~200,000)
# How much the beings' minds talk to each other. "arrival" (the default): when a second
# being arrives while the first is present, the first reacts once and the second replies
# once — exactly two lines, at arrival only, then it is back to Rooken. "medium": the
# first's reaction only, no reply. "full" is not built yet: it would give both minds a
# turn on every one of Rooken's steps, and needs a transcript and a per-step budget of its
# own before it is switched on. Set KNIGHT_MIND_MODE=medium to dial back, or =full only
# once that exists (it falls back to the arrival exchange, and says so).
MIND_MODE = os.environ.get("KNIGHT_MIND_MODE", "arrival").strip().lower()
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
    "present tense, calling yourself 'it' (or 'they' for many; a person by their name or 'they'). No narrator "
    "flourishes. Reply in English, as JSON only.")


def mind_mode():
    """Which mind-interaction mode is on: "arrival" (one reaction plus one reply per
    overlap, at arrival only), "medium" (the reaction only), or "full" (not built yet;
    falls back to the arrival exchange, and says so, rather than pretending)."""
    return MIND_MODE if MIND_MODE in ("arrival", "medium", "full") else "arrival"


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


AGE_HISTORY = {"young": 1, "old": 6}   # how much of its kind's past with him a being carries


def history(world, kind, now, n=HISTORY, person=None):
    """This kind's last few meetings with him, from its side (a person's: only their own)."""
    out = []
    for e in [e for e in encounters._lines(world / "encounters.jsonl") if e.get("kind") == kind
              and (person is None or e.get("person") == person)][-n:]:
        t = encounters._parse(e.get("time"))
        steps = "; then ".join(f"he chose to {s.get('choice', '').replace('_', ' ')} ({s.get('how', '')[:90]}), "
                              f"and it went {'his way' if s.get('result') == 'good' else 'your way' if s.get('result') == 'bad' else 'nowhere much'}"
                              for s in e.get("steps", []))
        why = f" (you came for: {e['why']})" if e.get("why") else ""
        out.append(f"- {_ago(t, now) if t else 'once'}{why}: {steps or 'you passed by'}")
    return out


def _who_person(a):
    """Someone on the road: who they are, in their own terms."""
    kind, p = a["kind"], a.get("person") or {}
    form = (a.get("variant") or {}).get("kind", "")
    lines = []
    if kind == "knight":
        age = {"young": "You are young, hardly more than a squire.", "old": "You are old and grey, with long years on the road.", "": ""}[p.get("age", "")]
        lines += [f"You are {p.get('name', 'a knight')}, a knight errant riding the old road on a {p.get('horse', 'bay')} horse, "
                  f"carrying {people.blazon(p.get('arms'))}. {age}".strip(),
                  f"Your manner: {people.MANNERS.get(p.get('manner'), '')}. You would gladly spar with blunted blades if he asks, "
                  "or you might offer; you never fight in earnest here."]
    elif kind == "pedlar":
        lines += [beings.FORM_MIND["pedlar"].get(form, "You are a pedlar with a mule."),
                  "You trade: you want something for what is on your cloth (a thing he has, some work, a song or a story), "
                  "and you haggle in your own manner. Fair rules settle whether a deal is struck, and nothing changes hands "
                  "unless you are told a deal was struck. On your cloth today: "
                  + ", ".join(w for w in (a.get("wares") or []) if w not in (a.get("sold") or [])) + "."]
    else:
        lines += [f"You are {p.get('name', 'a traveller')}, " + beings.FORM_MIND["traveller"].get(form, "a traveller on the road.")[4:]]
    lines += [f"Your nature this time: {creatures.nature_of(a)}.", f"This time you stopped at the keep because: {a.get('drive', '')}."]
    likes = encounters.likes_of(a)
    if likes:
        lines.append(f"You care for: {', '.join(likes)}.")
    if a.get("road_news"):
        lines.append(f"What people say along the road lately: {a['road_news']}")
    if p.get("they") in ("he", "she"):
        lines.append(f"(You are a {'man' if p['they'] == 'he' else 'woman'}.)")
    lines.append("You are an ordinary person of this world, and you can talk. The knight is a stranger who lives alone in the "
                 "ruined keep, on foot (he has no horse); you talk to him over the low courtyard wall.")
    return "\n".join(lines)


def road_news(world, now):
    """What travellers would have heard lately: what the visiting peoples have built nearby, and the beings seen at the keep."""
    state = creatures.load(world)
    seen = []
    for a in reversed(state.get("appearances", [])):
        s = encounters._parse(a.get("start"))
        if s and s < now and now - s < dt.timedelta(days=21) and a.get("seen") and creatures.KINDS.get(a["kind"], {}).get("lane") != "road":
            name = creatures.KINDS[a["kind"]]["name"]
            if name not in seen:
                seen.append(name)
    parts = [creatures.places_line(world, now)]
    if seen:
        parts.append("Folk say they have seen strange things about the ruined keep lately: " + ", ".join(seen[:4]) + ".")
    return " ".join(x for x in parts if x)


def _who(a):
    kind = a["kind"]
    if creatures.KINDS[kind].get("lane") == "road":
        return _who_person(a)
    c, k = beings.CHARACTERS[kind], creatures.KINDS[kind]
    if c.get("looks_seeing") and a.get("seeing", 0) < 2:    # he can't see what it truly is yet: neither may it say
        lines = [f"You are a being that looks like {c['looks']}. What you truly are ({c['looks_seeing']}) the knight "
                 "cannot see yet: describe only what he can see."]
    else:
        lines = [f"You are {k['name']}: {c.get('looks_seeing') or c['looks']}."]
    lines += [f"Your nature: {creatures.nature_of(a)}. Your traits: {', '.join(c['traits'])}.",
             f"This time you came for: {a.get('drive', '')}."]
    age, mark = encounters.age_of(a), (a.get("variant") or {}).get("mark")
    if age == "young":
        lines.append("You are young: small, quick, impulsive and easily startled; you know little of this knight "
                     "beyond what you have heard.")
    elif age == "old":
        lines.append("You are old: big, worn and slow, patient and hard to fool; you remember a great deal.")
    if beings.AGE_LOOKS.get(a["kind"], {}).get(age):
        lines.append(f"How you look: {beings.AGE_LOOKS[a['kind']][age]}.")
    form = (a.get("variant") or {}).get("kind", "")
    if beings.FORM_MIND.get(a["kind"], {}).get(form):
        lines.append(beings.FORM_MIND[a["kind"]][form])
    if mark == "scarred":
        lines.append("You carry an old scar.")
    if c.get("likes"):
        lines.append(f"You care for: {', '.join(encounters.likes_of(a))}.")
    if a.get("with_kind"):
        o = beings.CHARACTERS.get(a["with_kind"], {})
        lines.append(f"Another being is here too: {o.get('looks', 'something else')}. Toward it you mean to: "
                     f"{a.get('stance', 'size up')}" + (" (and fair rules say "
                     + ("you prevail" if a.get("prevails") == a.get("id") else "it prevails") + " between you)"
                     if a.get("prevails") else "") + ".")
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
    person = (a.get("person") or {}).get("id")
    if person:                                     # someone: their own meetings with him, and the talk of the road
        a["road_news"] = road_news(world, now)
        past = history(world, a["kind"], now, HISTORY, person)
    else:
        past = history(world, a["kind"], now, AGE_HISTORY.get(encounters.age_of(a), HISTORY))
    prompt = (f"{_who(a)}\n\n{setting}\n\n" +
              (f"Your past meetings with the knight ({'you remember' if person else 'your kind remembers'}):\n" + "\n".join(past) + "\n\n" if past else
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
    age = encounters.age_of(a)                     # the young aren't ready for him; the old more readily are
    learner = beings.LEARNS.get(a["kind"], 0) >= (CUNNING_LEARNS / 2 if age == "old" else CUNNING_LEARNS)
    if m["approach"] == "cunning" and learner and age != "young" and wise:
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


def react(brain, a, b, world, setting):
    """The first being's one reaction to the second arriving while it is here. Returns
    {does, says} or None. A reaction only: it settles nothing, changes no outcome, and
    adds no harm, gift or loss — Rooken has not acted yet, and the rules have not spoken."""
    other = beings.CHARACTERS.get(b["kind"], {})
    prompt = (f"{_who(a)}\n\n{setting}\n\n"
              f"Another being has just arrived while you are here: {other.get('looks', 'something else')}. "
              f"Toward it you mean to: {a.get('stance', 'size up')}.\n"
              "Describe what you do now, as he would see it, in one or two short sentences: add no harm, "
              "gift or loss, and decide nothing for the knight. says: only the words you speak aloud to "
              "it, if you can talk and want to (no actions, no quotation marks); otherwise empty.\n"
              'Reply as JSON: {"does": "", "says": ""}')
    try:
        data = _ask(brain, "being_react", prompt, 400)
    except llm.LLMError as err:
        print(f"  [its mind is quiet: {err}]")
        return None
    t = {"does": _clean(data.get("does"), 260),
         "says": _clean(data.get("says"), 160) if beings.CHARACTERS[a["kind"]].get("voice") else ""}
    return t if t["does"] else None


def reply(brain, b, a, reaction, world, setting):
    """The second being's one reply to the first's reaction — the second and last line of
    the arrival exchange. Returns {does, says} or None. Like react: a reply only, it
    settles nothing and adds no harm, gift or loss; after it, the exchange is over and
    it is back to Rooken."""
    other = beings.CHARACTERS.get(a["kind"], {})
    prompt = (f"{_who(b)}\n\n{setting}\n\n"
              f"The being that was already here, {other.get('looks', 'something else')}, has just reacted "
              f"to your arrival: {told(reaction.get('does', ''), reaction.get('says', ''))} "
              f"Toward it you mean to: {b.get('stance', 'size up')}.\n"
              "Answer it, in one or two short sentences as he would see it: add no harm, gift or loss, "
              "and decide nothing for the knight. says: only the words you speak aloud to it, if you can "
              "talk and want to (no actions, no quotation marks); otherwise empty.\n"
              'Reply as JSON: {"does": "", "says": ""}')
    try:
        data = _ask(brain, "being_reply", prompt, 400)
    except llm.LLMError as err:
        print(f"  [its mind is quiet: {err}]")
        return None
    t = {"does": _clean(data.get("does"), 260),
         "says": _clean(data.get("says"), 160) if beings.CHARACTERS[b["kind"]].get("voice") else ""}
    return t if t["does"] else None


def told(does, says, who="It"):
    return (does + (f' {who} says: "{says}"' if says else "")).strip()
