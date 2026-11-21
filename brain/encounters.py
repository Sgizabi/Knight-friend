"""Encounters: when a being comes, what Rooken can do, and what happens. No AI here: fair rules.

His own mind chooses what he does (knight.py, Knight.encounter); these rules settle what comes
of it, so the AI never writes either side a win. They weigh the being's nature and its mood
this visit, how rested and warm he is, whether he prepared, their history, whether what he did
happens to use the being's weakness or offer what it likes, and chance.

The floor (DESIGN.md section 5): he is never killed. A being can push a need only so low,
injuries never stack past a set level and heal in days, damage is repairable and limited each
week, losses are capped and can be won back, and he is woken at night only so often.
"""

import datetime as dt
import json
import random
import re
from pathlib import Path

import beings
import creatures
import life

FLOOR = 25                  # a being can push a need no lower than this
INJURIES_MOST = 2           # injuries at once
SEVERITY_MOST = 3           # their total severity
DAMAGE_PER_WEEK = 1         # damaging visits in seven days (and so never more than one building at a time)
LOSSES_PER_WEEK = 1         # things taken in seven days
NIGHT_WAKES_PER_WEEK = 2    # nights a week a being may wake him
STEPS_MOST = 3              # decisions in one encounter
NOTICE_BEFORE = 20          # minutes before it arrives that the signs begin
GIFT_CHANCE = .35
WIN_BACK_CHANCE = .6
HEAL_DAYS = {1: (2, 3), 2: (3, 5)}

# (good, bad) for each nature and choice; the rest of the chance is "nothing much happens".
# What "good" means depends on the choice: wonder when watching, accepted when offering,
# gone when driving it off, nothing harmed when sheltering.
ODDS = {
    "gentle":    {"watch": (.55, 0), "approach": (.6, .03), "offer": (.75, 0), "speak": (.5, 0), "hide": (0, 0),
                  "prepare": (0, 0), "drive_off": (.85, 0), "leave": (.15, 0)},
    "neutral":   {"watch": (.45, .05), "approach": (.4, .15), "offer": (.5, .05), "speak": (.4, .05), "hide": (0, .03),
                  "prepare": (0, 0), "drive_off": (.5, .3), "leave": (.15, .05)},
    "courteous": {"watch": (.3, .05), "approach": (.5, .05), "offer": (.7, .03), "speak": (.7, .03), "hide": (0, .1),
                  "prepare": (0, 0), "drive_off": (.5, .35), "leave": (.1, .05)},
    "proud":     {"watch": (.3, .2), "approach": (.3, .3), "offer": (.6, .15), "speak": (.55, .15), "hide": (0, .25),
                  "prepare": (0, 0), "drive_off": (.3, .55), "leave": (.1, .25)},
    "nuisance":  {"watch": (.2, .5), "approach": (.35, .3), "offer": (.65, .1), "speak": (.2, .4), "hide": (.1, .35),
                  "prepare": (.3, .15), "drive_off": (.55, .25), "leave": (.05, .55)},
    "hostile":   {"watch": (.25, .4), "approach": (.1, .55), "offer": (.1, .45), "speak": (.1, .45), "hide": (.3, .15),
                  "prepare": (.35, .1), "drive_off": (.45, .4), "leave": (.05, .5)},
}

SAYS = {   # what happened, in plain words; "+" adds how this being answers (beings.REACTS)
    ("watch", "good"): "You watch, and it lets you. +",
    ("watch", "neutral"): "You watch. It goes on with whatever it came for.",
    ("watch", "bad"): "You watch. +",
    ("approach", "good"): "You go closer, and it allows it. +",
    ("approach", "neutral"): "You go closer. It keeps its distance.",
    ("approach", "bad"): "You go closer. +",
    ("offer", "good"): "It seems to accept what you offer. +",
    ("offer", "neutral"): "It pays no attention to what you offer.",
    ("offer", "bad"): "Your offering doesn't go down well. +",
    ("speak", "good"): "It seems to listen. +",
    ("speak", "neutral"): "You speak; if it hears, it gives no sign.",
    ("speak", "bad"): "Your voice sets it off. +",
    ("hide", "good"): "You shelter, and it passes without harming anything.",
    ("hide", "neutral"): "You shelter. It is still out there; you can hear it.",
    ("hide", "bad"): "You shelter, but outside it does as it likes. +",
    ("prepare", "good"): "You get ready in time.",
    ("prepare", "neutral"): "You do what you can before it comes.",
    ("prepare", "bad"): "You are still getting ready when it comes. +",
    ("drive_off", "good"): "It gives way, and goes.",
    ("drive_off", "neutral"): "It backs off a little, but doesn't leave.",
    ("drive_off", "bad"): "It doesn't give way. +",
    ("leave", "good"): "You carry on, and in time it goes on its way.",
    ("leave", "neutral"): "You carry on, aware of it the whole time.",
    ("leave", "bad"): "You carry on, and it takes its chance. +",
}
WEAKNESS_SAYS = "It stops short: whatever you did, it works on it. +"


def _now():
    return dt.datetime.now(dt.timezone.utc)


def _iso(t):
    return t.replace(microsecond=0).isoformat()


def _parse(s):
    try:
        return dt.datetime.fromisoformat(s)
    except (TypeError, ValueError):
        return None


def _load(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def _lines(path):
    out = []
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    except OSError:
        pass
    return out


def character(kind):
    return beings.CHARACTERS.get(kind, {})


# --- his body: injuries that heal ------------------------------------------------------

def load_body(world: Path):
    body = _load(world / "body.json", {})
    body.setdefault("injuries", [])
    return body


def save_body(world: Path, body):
    (world / "body.json").write_text(json.dumps(body, indent=2, ensure_ascii=False), encoding="utf-8")


def heal(body, now=None):
    """Injuries heal on their own in a few days. Returns what has healed."""
    now = now or _now()
    healed = [i for i in body["injuries"] if _parse(i.get("heals")) and _parse(i["heals"]) <= now]
    body["injuries"] = [i for i in body["injuries"] if i not in healed]
    return healed


def severity(body):
    return sum(i.get("severity", 1) for i in body["injuries"])


def describe_body(body, now=None):
    now = now or _now()
    if not body["injuries"]:
        return ""
    parts = []
    for i in body["injuries"]:
        days = max(0, (_parse(i["heals"]) - now).total_seconds() / 86400) if _parse(i.get("heals")) else 1
        when = "nearly healed" if days < 1 else "healing, a day or two more" if days < 2.5 else "healing, a few days more"
        parts.append(f"{i['what']} ({when})")
    return "Your body: " + "; ".join(parts) + ". Heavy work tires you more until it heals."


def work_strain(body):
    """Extra rest heavy work costs while injured (one-off, per session of work)."""
    return -3 * min(SEVERITY_MOST, severity(body))


# --- what has happened lately (for the weekly caps) --------------------------------------

def recent(world: Path, days=7, now=None):
    now = now or _now()
    return [e for e in _lines(world / "encounters.jsonl")
            if _parse(e.get("time")) and now - _parse(e["time"]) < dt.timedelta(days=days)]


def record(world: Path, entry):
    with (world / "encounters.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# --- when he meets one --------------------------------------------------------------------

def is_loud(kind):
    k = creatures.KINDS.get(kind, {})
    return bool(character(kind).get("loud")) or k.get("nature") == "hostile"


def due(world: Path, asleep=False, now=None):
    """The being he should meet at this check-in, if any: one that is here or whose signs have
    begun, not yet met. Asleep, only a loud or hostile one wakes him, and only so many nights a week."""
    if not creatures.enabled():
        return None
    now = now or _now()
    state = creatures.load(world)
    for a in creatures.current(state, now, ahead_minutes=NOTICE_BEFORE):
        if a.get("met") or a.get("slept") or a["kind"] not in creatures.KINDS:
            continue
        if _parse(a["end"]) - now < dt.timedelta(minutes=5):
            continue                                   # all but gone
        if asleep:
            wakes = sum(1 for e in recent(world, now=now) if e.get("woke"))
            if not is_loud(a["kind"]) or wakes >= NIGHT_WAKES_PER_WEEK:
                continue
        return a
    return None


def settle(world: Path, asleep_at, now=None):
    """Beings that came and went without a meeting: slept through (he finds what they left in
    the morning), or only glimpsed. asleep_at(t): was he asleep then. Returns what he'll know."""
    now = now or _now()
    state = creatures.load(world)
    news = []
    for a in state["appearances"]:
        end = _parse(a.get("end"))
        if a.get("met") or a.get("slept") or a.get("cancelled") or not end or end > now or a["kind"] not in creatures.KINDS:
            continue
        if a.get("witnessed") is not None:
            continue                                   # already counted before encounters existed
        c = character(a["kind"])
        if asleep_at(_parse(a["start"])):
            a["slept"], a["seen"] = True, False
            if c.get("trace"):
                news.append({"time": a["start"], "kind": a["kind"], "text": f"In the morning you found {c['trace']}."})
        else:
            a["met"] = {"outcome": "glimpsed"}
            news.append({"time": a["start"], "kind": a["kind"], "text": f"You glimpsed {c.get('looks', 'something strange')}, and then it was gone."})
    if news:
        (world / "creatures.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
    return news


def phase(a, now=None):
    return "signs" if (now or _now()) < _parse(a["start"]) else "here"


def scene(a, entry, seeing, ph, history):
    """What he notices, in plain words: signs first, then the being itself."""
    kind, c = a["kind"], character(a["kind"])
    lines = []
    if not history:
        if a.get("arrival") == "meteor":
            lines.append("A streak of light crosses the sky and something comes down on the plain with a thud you feel in your chest.")
        elif a.get("arrival") == "ship":
            lines.append("A pale light comes down over the hills, without a sound.")
        lines += [f"{s[0].upper()}{s[1:]}." for s in c.get("signs", [])[:2]]
    if ph == "here":
        looks = c.get("looks_seeing") if seeing >= 2 and c.get("looks_seeing") else c.get("looks", "something strange")
        lines.append(f"Then you see it: {looks}.")
        mark = (a.get("variant") or {}).get("mark")
        if mark and entry and entry.get("count"):
            lines.append({"scarred": "This one has an old scar.", "old": "This one looks old.",
                          "young": "This one looks young."}[mark])
        if a.get("chain"):
            n = a["chain"]
            lines.append("They are at the wall now." if a.get("last") else
                         f"It is the {['', 'first', 'second', 'third', 'fourth', 'fifth'][min(n, 5)]} time; closer than before.")
        if a.get("regard", 0) < 0:
            lines.append("They keep well back, warier than before.")
        elif a.get("regard", 0) > 0:
            lines.append("They come closer than before, as if they remember you.")
        if c.get("voice"):
            lines.append("It looks as if it could talk.")
    else:
        lines.append("Whatever it is hasn't come into sight yet.")
    return " ".join(lines)


def knowledge(entry):
    """What he knows about this being from before, in his own words where he wrote them."""
    if not entry or not entry.get("count"):
        return "You have never seen anything like it."
    parts = [f"You have met this before ({entry.get('count', 1)} time{'s' if entry.get('count', 1) != 1 else ''})"
             + (f"; you call it {entry['name']}" if entry.get("name") else "") + "."]
    if entry.get("note"):
        parts.append(f"Your own note on it: {entry['note']}")
    if entry.get("tells"):
        parts.append("You've noticed: " + "; ".join(entry["tells"][:3]) + ".")
    if entry.get("worked"):
        parts.append("What has worked before: " + "; ".join(entry["worked"][-3:]) + ".")
    if entry.get("failed"):
        parts.append("What hasn't: " + "; ".join(entry["failed"][-3:]) + ".")
    return " ".join(parts)


def options(ph):
    keys = [k for k in beings.OPTIONS if ph == "signs" or k != "prepare"]
    return {k: beings.OPTIONS[k] for k in keys}


def _says(text, words):
    text = " " + re.sub(r"[^a-z' ]+", " ", (text or "").lower()) + " "
    return any(re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", text) for w in words)


def uses_weakness(kind, choice, how):
    w = character(kind).get("weakness")
    if not w:
        return False
    return choice in w.get("verbs", []) or _says(how, w.get("words", []))


def offers_liked(kind, how):
    return _says(how, character(kind).get("likes", []))


# --- the rules -----------------------------------------------------------------------------

def resolve(a, choice, how, ctx, rng=None):
    """What comes of what he chose. ctx: needs, body, keep, entry (bestiary), prepared, step,
    week (recent encounters), now. Returns the outcome; apply() makes it so."""
    rng = rng or random.Random()
    kind = a["kind"]
    k, c = creatures.KINDS[kind], character(kind)
    nature = k["nature"]
    choice = choice if choice in ODDS[nature] else "watch"
    good, bad = ODDS[nature][choice]
    weak = uses_weakness(kind, choice, how)
    liked = choice in ("offer", "speak", "approach") and offers_liked(kind, how)
    regard = (ctx.get("entry") or {}).get("regard", 0) + a.get("regard", 0)
    if liked:
        good, bad = good + .2, bad * .5
    if ctx.get("prepared"):
        bad *= .5
    temper = a.get("temper", "calm")
    bad *= {"calm": .7, "wary": 1.0, "bold": 1.3}.get(temper, 1)
    if temper == "wary":
        good *= .85
    good += .07 * regard
    bad -= .04 * regard
    needs = ctx["needs"]
    if needs["rest"] < 25:
        bad += .08
    if needs["warmth"] < 25:
        bad += .04
    if weak:                                       # he found what keeps it back
        good, bad = max(good, .9), min(bad, .02)
    good, bad = max(0, min(.95, good)), max(0, min(.9, bad))
    if good + bad > 1:
        good, bad = good / (good + bad), bad / (good + bad)
    roll = rng.random()
    result = "good" if roll < good else "bad" if roll < good + bad else "neutral"
    if a.get("last") and not (result == "good" and choice in ("drive_off", "hide", "prepare")):
        result = "bad" if nature == "hostile" else result     # a slow presence that reaches the wall

    out = {"choice": choice, "result": result, "weakness": weak, "liked": liked, "effects": {},
           "injury": None, "damage": None, "loss": None, "gift": None, "returned": None, "regard": 0,
           "tell": None, "turned_back": False}
    said = WEAKNESS_SAYS if weak and result == "good" else SAYS[(choice, result)]
    react = beings.REACTS.get(kind, ("", ""))[0 if result == "good" else 1]
    if any(react and react in t for t in ctx.get("said", [])):
        react = ""                                 # (it already did that this time)
    text = [said.replace("+", react).strip()]
    if result == "good":
        if choice in ("watch", "approach") and c.get("tell") and c["tell"] not in (ctx.get("entry") or {}).get("tells", []):
            out["tell"] = c["tell"]
            text.append(f"You notice something about it: {c['tell']}.")
        out["effects"] = {"watch": {"inspiration": 8, "spirit": 4}, "approach": {"inspiration": 10, "spirit": 5},
                          "offer": {"spirit": 8}, "speak": {"spirit": 6, "inspiration": 4},
                          "drive_off": {"spirit": 6 if nature in ("hostile", "nuisance") else -2},
                          "hide": {"spirit": 2}, "prepare": {"spirit": 2}, "leave": {"spirit": 1}}[choice]
        if choice in ("offer", "speak", "approach") and nature != "hostile":
            out["regard"] = 1
        if choice == "drive_off":
            out["regard"] = -1 if nature not in ("hostile", "nuisance") else 0
            out["turned_back"] = bool(a.get("chain"))
        if choice in ("offer", "speak", "approach", "watch") and c.get("gifts") and nature != "hostile" and \
                rng.random() < (GIFT_CHANCE + (.15 if choice == "offer" else 0)):
            out["gift"] = rng.choice(c["gifts"])
            text.append(f"It leaves you something: {out['gift']}.")
        lost = [x for x in (ctx["keep"].get("lost") or []) if x.get("by") == kind]
        if lost and choice in ("offer", "drive_off", "speak") and rng.random() < WIN_BACK_CHANCE:
            out["returned"] = lost[0]
            text.append(f"And {lost[0]['name']} is back: it drops it, or leaves it behind.")
    elif result == "bad":
        danger = c.get("danger", 0)
        out["effects"] = {"spirit": -8, "rest": -3} if danger else {"spirit": -4}
        week = ctx.get("week", [])
        can_damage = sum(1 for e in week if e.get("damage")) < DAMAGE_PER_WEEK
        can_take = sum(1 for e in week if e.get("loss")) < LOSSES_PER_WEEK
        body = ctx["body"]
        can_hurt = danger >= 2 and len(body["injuries"]) < INJURIES_MOST and severity(body) < SEVERITY_MOST
        harms = []
        if can_hurt and c.get("hurts") and choice not in ("hide", "prepare") and                 (choice in ("drive_off", "approach") or nature == "hostile"):
            harms.append("injury")
        if can_damage and c.get("damages") and danger >= 1:
            harms.append("damage")
        if can_take and c.get("takes") and danger >= 1 and _takeable(ctx["keep"]):
            harms.append("loss")
        if choice in ("hide", "leave", "watch", "prepare") and "injury" in harms and len(harms) > 1:
            harms.remove("injury")               # he kept his distance: what suffers is the keep
        if harms:
            what = rng.choice(harms)
            if what == "injury":
                sev = 2 if danger >= 3 and rng.random() < .4 and severity(body) <= SEVERITY_MOST - 2 else 1
                lo, hi = HEAL_DAYS[sev]
                out["injury"] = {"what": rng.choice(c["hurts"]), "severity": sev, "by": kind,
                                 "heals": _iso(ctx["now"] + dt.timedelta(days=rng.uniform(lo, hi)))}
                text.append(f"You come away with {out['injury']['what']}.")
            elif what == "damage":
                out["damage"] = _damage_target(c["damages"], ctx["keep"], rng)
                if out["damage"]:
                    text.append("It does some harm to the keep.")
            elif what == "loss":
                obj = _takeable(ctx["keep"], rng)
                out["loss"] = {"name": obj["name"], "by": kind}
                text.append(f"It makes off with {obj['name']}.")
        if choice == "drive_off" and nature not in ("hostile", "nuisance"):
            out["regard"] = -1
        if choice in ("offer", "speak", "approach") and nature in ("proud", "courteous"):
            out["regard"] = -1
    else:
        if choice in ("watch", "approach"):
            out["effects"] = {"inspiration": 3}
            if a.get("drive") and not any("seems to want" in t for t in ctx.get("said", [])):
                text.append(f"What it seems to want: {a['drive']}.")   # watching shows what it came for
    # It goes when he drives it off or finds what keeps it back, when it passes him by, or when it
    # has done its harm; otherwise it answers and he decides again (2 or 3 decisions, usually).
    harmed = bool(out["injury"] or out["damage"] or out["loss"])
    decisive = (result == "good" and (choice in ("drive_off", "hide", "leave") or weak)) or (result == "bad" and harmed)
    step = ctx.get("step", 1)
    out["ends"] = decisive or (step >= 2 and result != "neutral") or step >= STEPS_MOST
    if out["ends"] and result == "neutral":
        text.append("In its own time, it goes.")
    out["text"] = " ".join(text)
    return out


def _takeable(keep, rng=None):
    """Something it could carry off: one of the things he made, never the newest."""
    objs = (keep.get("objects") or [])[:-1]
    if not objs:
        return None
    return (rng or random).choice(objs[-8:])


def _damage_target(targets, keep, rng):
    options = []
    for t in targets:
        if t == "building":
            options += [b["place"] for b in life.finished_buildings(keep) if not life.damaged(keep, b["place"])]
        elif t in life.REPAIRS and not life.damaged(keep, t) and (life.repaired(keep, t) or keep["repairs"].get(t, 0) > 0):
            options.append(t)
    return rng.choice(options) if options else None


HOW = {"roof": "scorched and holed again", "wall": "cracked, stones loosened", "doorway": "knocked askew, stones fallen",
       "window": "cracked across", "stair": "cracked", "hearth": "knocked apart"}


def apply(out, a, needs, body, keep, entry, how, now=None):
    """Make an outcome so: his needs (never below the floor), his body, the keep, his bestiary."""
    now = now or _now()
    for name, delta in out["effects"].items():
        if delta < 0:
            delta = -min(-delta, max(0.0, needs[name] - FLOOR))
        if delta:
            life.change(needs, {name: delta}, keep)
    if out["injury"]:
        body["injuries"].append(out["injury"])
    if out["damage"]:
        key = out["damage"]
        did = life.harm(keep, key, HOW.get(key, "damaged") if key in life.REPAIRS else "battered and damaged",
                        sessions=2 if character(a["kind"]).get("danger", 0) >= 3 else 1)
        out["damage_text"] = did
        if not did:
            out["damage"] = None
    if out["loss"]:
        obj = next((o for o in keep["objects"] if o["name"] == out["loss"]["name"]), None)
        if obj:
            keep["objects"].remove(obj)
            keep.setdefault("lost", []).append({**obj, "by": out["loss"]["by"], "lost": _iso(now)})
    if out["returned"]:
        lost = keep.get("lost") or []
        obj = next((x for x in lost if x.get("name") == out["returned"]["name"]), None)
        if obj:
            lost.remove(obj)
            keep["objects"].append({k: v for k, v in obj.items() if k not in ("by", "lost")})
    if out["gift"]:
        does = beings.GIFT_DOES.get(out["gift"])
        if does and does[0] == "repair":
            life.repair(keep, does[1])                 # (help with the work: one session of it)
        if out["gift"] not in beings.INTANGIBLE:
            keep.setdefault("finds", []).append({"what": out["gift"], "from": a["kind"], "time": _iso(now)})
            keep["finds"] = keep["finds"][-30:]
    entry["regard"] = max(-3, min(3, entry.get("regard", 0) + out["regard"]))
    if out["tell"] and out["tell"] not in entry.setdefault("tells", []):
        entry["tells"].append(out["tell"])
    how = re.sub(r"\s+", " ", str(how or "")).strip()[:120]
    if how and out["result"] == "good" and out["choice"] not in ("leave",):
        entry["worked"] = ([x for x in entry.get("worked", []) if x != how] + [how])[-4:]
    elif how and out["result"] == "bad":
        entry["failed"] = ([x for x in entry.get("failed", []) if x != how] + [how])[-4:]
