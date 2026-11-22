"""The beings that come to the keep: who they are, and when they come. No AI here: fair rules.

The spawner plans each day (in the keeper's calendar) a day ahead, like the weather: at most
one notable being a day, chosen by rarity, by what can come at that hour and in that weather,
and by what Rooken can perceive (the seeing ladder). Cooldowns keep any one kind from coming
back too soon; after anything hostile there is a quiet spell; across a week gentle and neutral
beings outnumber hostile ones; and now and then a strange week (more stirring) or a quiet week
(almost nothing) breaks the rhythm. All the numbers are starting dials (DESIGN.md).

It is switched off in the real world until wave 1 (KNIGHT_CREATURES=on), so nothing appears
that Rooken can't yet meet. Everything can be tested on copies with the switch on.
"""

import datetime as dt
import json
import os
import random
from pathlib import Path

import beings
import weather

# what each being is. when: day (8-17 ET), dusk (17-20), night (20-5), dark (dusk or night), any.
# likes: weather that draws it (three times as likely then). needs: what must be true for it to come.
# render: the keep page's name for how it looks. arrives: it comes by meteor or ship (and leaves a trace).
# forms: shapes it can come in that are not ages (which heads, which disguise), weighted; fresh: never
# the same form twice running. natures: its nature is drawn for each visit (KINDS nature is what the caps count).
# arc: a chapter of a longer story (ARCS). Some, once started, come back on their own slow clock (CHAINS).
KINDS = {
    "dragon":       dict(name="the dragon", nature="proud", rarity="legendary", step=0, when="any", minutes=(40, 90), render="dragon2"),
    "glassbeak":    dict(name="the Glassbeak", nature="nuisance", rarity="rare", step=0, when="day", minutes=(30, 60)),
    "basilisk":     dict(name="the basilisk", nature="hostile", rarity="rare", step=0, when="day", minutes=(30, 60)),
    "golem":        dict(name="the wall that woke", nature="proud", rarity="uncommon", step=0, when="any", minutes=(60, 120)),
    "well":         dict(name="something in the well", nature="proud", rarity="rare", step=0, when="night", likes=["fog"], minutes=(30, 60)),
    "hill":         dict(name="the hill that breathes", nature="neutral", rarity="legendary", step=0, when="day", minutes=(120, 240)),
    "whale":        dict(name="the sky whale", nature="gentle", rarity="uncommon", step=0, when="night", needs="clear", minutes=(20, 40)),
    "wyrm":         dict(name="the deep wyrm", nature="hostile", rarity="rare", step=0, when="day", minutes=(20, 45)),
    "moths":        dict(name="the lamp-eaters", nature="nuisance", rarity="uncommon", step=0, when="night", likes=["still"], minutes=(40, 90)),
    "barrow":       dict(name="the barrow lord", nature="proud", rarity="rare", step=0, when="night", likes=["fog"], minutes=(40, 90)),
    "fog":          dict(name="the fog with eyes", nature="hostile", rarity="common", step=0, when="night", likes=["fog"], minutes=(60, 180)),
    "ninefold":     dict(name="the Ninefold Eye", nature="neutral", rarity="rare", step=3, when="night", needs="clear", minutes=(30, 60)),
    "moon2":        dict(name="the Second Moon", nature="neutral", rarity="rare", step=2, when="night", needs="clear", minutes=(120, 300)),
    "larva":        dict(name="the Starfallen Larva", nature="gentle", rarity="uncommon", step=1, when="night", likes=["starfall"], minutes=(60, 180), arrives="meteor", arrive_chance=.4),
    "listener":     dict(name="the Antlered Listener", nature="neutral", rarity="rare", step=2, when="dusk", minutes=(30, 60)),
    "leech":        dict(name="the Dream-Leech", nature="neutral", rarity="rare", step=3, when="night", minutes=(30, 60)),
    "seam":         dict(name="the Seam", nature="neutral", rarity="legendary", step=4, when="night", minutes=(20, 40)),
    "bloom":        dict(name="the Bloom-Headed Wanderer", nature="courteous", rarity="uncommon", step=0, when="dusk", minutes=(30, 60)),
    "warden":       dict(name="the Lantern Warden", nature="courteous", rarity="uncommon", step=0, when="night", minutes=(40, 90)),
    "brood":        dict(name="the Pale Brood", nature="nuisance", rarity="common", step=1, when="night", minutes=(40, 120)),
    "longman":      dict(name="the Long Man", nature="hostile", rarity="rare", step=1, when="dusk", likes=["fog"], minutes=(40, 90), render="longman2"),
    "stitched":     dict(name="the Stitched Sky", nature="neutral", rarity="legendary", step=4, when="night", needs="clear", minutes=(30, 60)),
    "manyjoint":    dict(name="the Many-Jointed", nature="hostile", rarity="rare", step=3, when="night", minutes=(30, 60)),
    "lanternheads": dict(name="the Lantern Folk", nature="gentle", rarity="uncommon", step=1, when="night", minutes=(15, 30)),
    "cartographer": dict(name="the Cartographer Moth", nature="gentle", rarity="uncommon", step=2, when="dusk", minutes=(30, 90)),
    "thorn":        dict(name="the Thornmother", nature="neutral", rarity="rare", step=0, when="day", minutes=(30, 60)),
    "ashwolves":    dict(name="the Ashwolf pack", nature="hostile", rarity="uncommon", step=0, when="night", likes=["ash"], minutes=(30, 60)),
    "bellcrab":     dict(name="the Bell-Crab", nature="neutral", rarity="uncommon", step=0, when="day", minutes=(30, 60)),
    "crawl":        dict(name="the Long Crawl", nature="hostile", rarity="rare", step=0, when="day", minutes=(60, 180)),
    "axolotl":      dict(name="the giant axolotl", nature="gentle", rarity="uncommon", step=0, when="day", needs="after_rain", minutes=(60, 180)),
    "thincrowd":    dict(name="the Thin Crowd", nature="hostile", rarity="rare", step=1, when="dusk", minutes=(30, 60)),
    "bentone":      dict(name="the Bent One", nature="hostile", rarity="rare", step=2, when="night", minutes=(30, 60)),
    "watcher":      dict(name="the Window Watcher", nature="hostile", rarity="rare", step=2, when="night", minutes=(30, 60)),
    "doorway":      dict(name="the Doorway Figure", nature="hostile", rarity="rare", step=1, when="night", minutes=(30, 60)),
    # otherworldly
    "nightgrown":   dict(name="the Night-Grown", nature="neutral", rarity="rare", step=2, when="night", needs="clear", likes=["starfall"], minutes=(40, 120), arrives="meteor"),
    "clockhead":    dict(name="the Five Hours", nature="neutral", rarity="rare", step=3, when="dark", minutes=(20, 45),
                         forms={"": 60, "clock": 8, "hourglass": 8, "metronome": 8, "galaxy": 8, "mask": 8}),
    # not of this world: tree-tall, a smiling mask, nearly always in a disguise it has never worn here before.
    # Each visit it is either hostile or merely neutral (never harmless); the caps count it as hostile.
    "stranger":     dict(name="the stranger in the trees", nature="hostile", rarity="rare", step=2, when="dusk", minutes=(30, 60),
                         forms={"cape": 21, "woodsman": 21, "bark": 21, "traveller": 21, "bare": 16}, fresh=True,
                         natures=["hostile", "hostile", "neutral"]),
    # the glassy people: one story told over many months (ARCS)
    "glassy1":      dict(name="the glassy Gardener", nature="neutral", rarity="rare", step=2, when="dusk", minutes=(30, 60), arrives="ship", arc="glassy", stage=1, render="lander"),
    "glassy2":      dict(name="the glassy Scouts", nature="neutral", rarity="rare", step=3, when="dark", minutes=(30, 60), arrives="ship", arc="glassy", stage=2),
    "glassy3":      dict(name="the glassy Expedition", nature="neutral", rarity="rare", step=3, when="dusk", minutes=(240, 480), arrives="ship", arc="glassy", stage=3),
    "glassy4":      dict(name="the glassy Sovereign", nature="neutral", rarity="legendary", step=4, when="dusk", minutes=(40, 90), arrives="ship", arc="glassy", stage=4),
}

# Story arcs: each stage unlocks the next once it has been met enough times. If he drives them
# off (regard falls to -2), the arc rests a long while and comes back warier, further away.
ARCS = {"glassy": {"stages": ["glassy1", "glassy2", "glassy3", "glassy4"], "advance_after": [3, 2, 1], "rest_days": 60}}

# Slow presences: once one starts, it comes back every so many days, a step closer each time,
# until it reaches the wall or he turns it back. Follow-ups take that day's place (one being a
# day) and count as the same dangerous event (no second hostile visit is added for them).
CHAINS = {"thincrowd": {"every": 1, "most": 5}, "crawl": {"every": 2, "most": 4}}

# Ecology: what has been about lately shifts who comes next. Built from traits, not pair by pair.
DRAWN_BY = {"wyrm": ["hill"], "moths": ["lanternheads", "warden"], "larva": ["moon2", "nightgrown"],
            "glassbeak": ["nightgrown", "glassy1", "moon2"], "brood": ["nightgrown", "glassy3"], "ashwolves": ["dragon"]}
TRACE_DAYS = {"meteor": 4, "ship": 3}

# Meetings: now and then (about one notable day in eight) a second being is about at the same
# time. Never two legendary beings; two hostile ones only together (and they count as one
# dangerous event). How they treat each other (their stance) comes from who they are and what
# has passed between their kinds before; fair rules say who prevails.
MEET_CHANCE = .125
# Beings with no young or old: things that are never born or never age (the Seam, the fog, the Long
# Man...), things not alive in the usual way (the barrow lord, the wall that woke, the Lantern
# Folk, a swarm), and some whose age is left a mystery for now (the well, the glassy people).
AGED = {"axolotl", "bellcrab", "glassbeak", "ashwolves", "dragon", "whale", "thorn", "basilisk", "wyrm", "larva",
        # (later waves, once their three ages are designed)
        "listener", "cartographer", "bentone", "watcher", "nightgrown", "leech"}
AGELESS = set(KINDS) - AGED
STANCES = ["team up", "rival", "squabble", "ignore", "avoid", "flee", "chase off", "follow", "compete",
           "steal from", "uneasy truce", "size up"]

# Beings that can come to the real keep: the waves released so far, each with its final art.
# The rest are fully built behind the scenes and come as their waves are released (tests, the
# simulator and the preview can use all of them: KNIGHT_ALL_BEINGS=on).
RELEASED = {"fog", "axolotl", "bellcrab", "glassbeak", "ashwolves", "dragon", "longman",       # wave 1
            "whale", "moths", "barrow", "thorn", "lanternheads", "brood", "thincrowd", "doorway",    # wave 2
            "basilisk", "wyrm", "crawl", "golem", "well", "bloom", "warden", "larva",               # wave 3
            "listener", "cartographer", "moon2", "bentone", "watcher", "nightgrown", "glassy1",     # wave 4
            "clockhead", "stranger"}                                                                 # last wave


def nature_of(a):
    """This visit's nature (some beings differ from visit to visit; most are always what their kind is)."""
    return a.get("nature") or KINDS[a["kind"]]["nature"]


def released(kind):
    return kind in RELEASED or os.environ.get("KNIGHT_ALL_BEINGS", "").strip().lower() == "on"


RARITY_WEIGHT = {"common": 10, "uncommon": 5, "rare": 2, "legendary": .9}   # legendary: about 3-5 a year
COOLDOWN_DAYS = {"common": 4, "uncommon": 7, "rare": 20, "legendary": 60}
WITNESS_POINTS = {"common": 1, "uncommon": 2, "rare": 4, "legendary": 8}
STEPS = [0, 10, 45, 150, 320]     # witness points for each step of seeing: about a week, a month, four months, eight
DAY_CHANCE = {"normal": .42, "strange": .75, "quiet": .12}   # a notable being, on a given day
HOSTILE_QUIET_DAYS = 3            # after anything hostile, no hostile beings for this long
HOSTILE_PER_WEEK = 2              # at most this many hostile visits in a keeper's week
HOURS = {"day": range(8, 17), "dusk": range(17, 20), "night": [20, 21, 22, 23, 0, 1],   # (keeper's hours: evenings, when people look in)
         "dark": [17, 18, 19, 20, 21, 22, 23, 0], "any": range(8, 23)}
CLEARISH = {"clear", "wind", "still", "starfall", "aurora"}


def enabled():
    return os.environ.get("KNIGHT_CREATURES", "").strip().lower() == "on"


def _now():
    return dt.datetime.now(dt.timezone.utc)


def _iso(t):
    return t.replace(microsecond=0).isoformat()


def _parse(s):
    try:
        return dt.datetime.fromisoformat(s)
    except (TypeError, ValueError):
        return None


def _keeper_day(t):
    return weather.keeper_time(t).date()


def _day_start(day):
    """Midnight of a keeper's day, in UTC."""
    return dt.datetime(day.year, day.month, day.day, tzinfo=dt.timezone.utc) + dt.timedelta(hours=5)


def _load(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def load(world: Path):
    state = _load(world / "creatures.json", {})
    state.setdefault("appearances", [])
    state.setdefault("planned", [])
    state.setdefault("cooldowns", {})
    state.setdefault("chains", {})
    state.setdefault("arcs", {"glassy": {"stage": 1, "met": {}, "regard": 0}})
    return state


def load_bestiary(world: Path):
    b = _load(world / "bestiary.json", {})
    b.setdefault("points", 0)
    b.setdefault("step", 0)
    b.setdefault("kinds", {})
    return b


def week_mode(day):
    """Most weeks are ordinary; one in ten is strange, one in ten is quiet."""
    year, week, _ = day.isocalendar()
    r = random.Random(year * 100 + week).random()
    return "strange" if r < .1 else "quiet" if r < .2 else "normal"


def _possible(kind, t, sched):
    """How well a being fits this hour: 0 if it can't come, 3 if the weather draws it, else 1."""
    k = KINDS[kind]
    p = weather.at(sched, t)
    wkind = p.get("kind") if p else "clear"
    needs = k.get("needs")
    if needs == "clear" and wkind not in CLEARISH:
        return 0
    if needs == "after_rain":
        earlier = [weather.at(sched, t - dt.timedelta(hours=h)) for h in (1, 3, 6, 9)]
        if not any(q and q.get("kind") in ("rain", "storm") for q in earlier):
            return 0
    return 3 if wkind in k.get("likes", []) else 1


def traits(kind):
    return beings.CHARACTERS.get(kind, {}).get("traits", [])


def ecology(kind, state, start, keep=None):
    """How much more (or less) likely a being is, given what has been about lately."""
    def kinds_within(days):
        return [a["kind"] for a in state["appearances"]
                if _parse(a["start"]) and start - dt.timedelta(days=days) <= _parse(a["start"]) < start]
    near, lately = kinds_within(2), kinds_within(4)
    t, m = traits(kind), 1.0
    if "skittish" in t and any({"territorial", "vast"} & set(traits(k)) for k in near):
        m *= .3                                    # something big has been about: the timid stay away
    if any(k in lately for k in DRAWN_BY.get(kind, [])):
        m *= 2.5                                   # drawn after another (light-eaters after lanterns...)
    if "fire-drawn" in t and keep and any(b.get("key") == "forge" and b.get("finished") for b in keep.get("buildings", [])):
        m *= 1.6                                   # the forge's heat draws fire-lovers
    if {"thieving", "greedy"} & set(t) and any(
            a.get("arrival") and _parse(a["start"]) and
            start - dt.timedelta(days=TRACE_DAYS[a["arrival"]]) <= _parse(a["start"]) < start
            for a in state["appearances"]):
        m *= 2                                     # scavengers, after something fell or landed
    return m


def arc_open(state, kind, start):
    """An arc's chapter can come only when it is the arc's current one, and the arc isn't resting."""
    k = KINDS[kind]
    if not k.get("arc"):
        return True
    arc = state.get("arcs", {}).get(k["arc"], {})
    rest = _parse(arc.get("rest_until"))
    return k["stage"] == arc.get("stage", 1) and not (rest and rest > start)


def counts_as_danger(a):
    """A hostile visit that counts toward the quiet spell and the weekly limit: not a slow
    presence's return, and not a hostile being that came along with another hostile one."""
    return bool(KINDS.get(a["kind"], {}).get("nature") == "hostile" and a.get("chain", 1) == 1
            and (not a.get("companion") or a.get("counts")))


def hostile_allowed(state, start):
    """Whether a hostile being may come at this time: a quiet spell after the last, and a weekly limit."""
    recent = [a for a in state["appearances"] if _parse(a["start"]) and start - dt.timedelta(days=7) < _parse(a["start"]) <= start]
    last = max((_parse(a["start"]) for a in recent if KINDS.get(a["kind"], {}).get("nature") == "hostile"), default=None)
    week_start = start - dt.timedelta(days=weather.keeper_time(start).weekday())
    this_week = sum(1 for a in recent if counts_as_danger(a) and _parse(a["start"]) >= week_start)
    return (last is None or start - last >= dt.timedelta(days=HOSTILE_QUIET_DAYS)) and this_week < HOSTILE_PER_WEEK


def plan_day(state, day, sched, step, rng=None, keep=None):
    """Decide whether a notable being comes on this keeper's day, which, and when."""
    rng = rng or random.Random(day.toordinal())
    if rng.random() >= DAY_CHANCE[week_mode(day)]:
        return None
    start = _day_start(day)
    hostile_ok = hostile_allowed(state, start)
    choices = []
    for kind, k in KINDS.items():
        if k["step"] > step or not arc_open(state, kind, start) or not released(kind):
            continue
        if kind in state.get("chains", {}):
            continue                               # already on its way
        until = _parse(state["cooldowns"].get(kind))
        if until and until > start:
            continue
        if k["nature"] == "hostile" and not hostile_ok:
            continue
        fits = []
        for h in HOURS[k["when"]]:
            t = start + dt.timedelta(hours=h + (24 if h < 5 else 0)) if k["when"] in ("night", "dark") else start + dt.timedelta(hours=h)
            fits.append((_possible(kind, t, sched), t))
        best = max(f for f, _ in fits)
        if best:   # any of the best-fitting hours, fairly
            weight = RARITY_WEIGHT[k["rarity"]] * best * ecology(kind, state, start, keep)
            choices.append((kind, weight, rng.choice([t for f, t in fits if f == best])))
    if not choices:
        return None
    kind, _, t = rng.choices(choices, [w for _, w, _ in choices])[0]
    return _appearance(kind, day, t, rng, state)


def _hour_time(kind, day, rng, sched):
    """A fitting hour on this day for a follow-up visit (chains)."""
    k, start = KINDS[kind], _day_start(day)
    hours = [start + dt.timedelta(hours=h + (24 if h < 5 else 0)) for h in HOURS[k["when"]]]
    good = [t for t in hours if _possible(kind, t, sched)] or hours
    return rng.choice(good)


def _appearance(kind, day, t, rng, state, chain=None):
    k = KINDS[kind]
    begin = t + dt.timedelta(minutes=rng.randint(0, 50))
    end = begin + dt.timedelta(minutes=rng.randint(*k["minutes"]))
    variant = {"size": round(rng.uniform(.88, 1.15), 2), "hue": round(rng.uniform(-.06, .06), 3),
               "mark": rng.choice(["", "", "", "", "", "scarred"]),
               "age": "" if kind in AGELESS else rng.choices(["young", "", "old"], [15, 70, 15])[0]}
    if k.get("forms"):                             # which heads, which disguise (fresh: not the one it wore last time)
        last = next((x.get("variant", {}).get("kind") for x in reversed(state.get("appearances", [])) if x["kind"] == kind), None)
        forms = {f: w for f, w in k["forms"].items() if not (k.get("fresh") and f == last)}
        variant["kind"] = rng.choices(list(forms), list(forms.values()))[0]
    drives = beings.CHARACTERS.get(kind, {}).get("drives") or [""]
    a = {"id": f"{kind}-{begin.strftime('%Y%m%d%H%M')}", "kind": kind, "day": day.isoformat(),   # its evening, even past midnight
         "start": _iso(begin), "end": _iso(end), "variant": variant,
         "drive": rng.choice(drives),                              # why it came this time
         "temper": rng.choice(["calm", "calm", "wary", "bold"])}   # its mood this visit
    if k.get("natures"):
        a["nature"] = rng.choice(k["natures"])
    if k.get("arrives") and rng.random() < k.get("arrive_chance", 1):
        a["arrival"] = k["arrives"]
    if chain:
        a["chain"] = chain
    if k.get("arc"):
        a["regard"] = state.get("arcs", {}).get(k["arc"], {}).get("regard", 0)   # how close they dare come
    return a


def follow_up(state, day, sched):
    """A slow presence that is on its way comes back on this day, a step closer."""
    for kind, c in list(state.get("chains", {}).items()):
        if c.get("next") != day.isoformat():
            continue
        rng = random.Random(day.toordinal() * 7 + len(kind))
        c["n"] += 1
        last = c["n"] >= CHAINS[kind]["most"]
        a = _appearance(kind, day, _hour_time(kind, day, rng, sched), rng, state, chain=c["n"])
        if last:
            a["last"] = True                       # it reaches the wall this time; then it is over
            del state["chains"][kind]
        else:
            c["next"] = (day + dt.timedelta(days=CHAINS[kind]["every"])).isoformat()
        return a
    return None


def turn_back(state, kind, now=None):
    """He turned a slow presence back: it stops coming (until another time it starts again)."""
    now = now or _now()
    state.get("chains", {}).pop(kind, None)
    for a in state["appearances"]:
        if a["kind"] == kind and _parse(a["start"]) and _parse(a["start"]) > now:
            a["cancelled"] = True


def note_arc(state, kind, regard_change, now=None):
    """How he met a chapter shapes the next: closer if he welcomed them, warier if not."""
    k = KINDS.get(kind, {})
    if not k.get("arc") or not regard_change:
        return
    arc = state.setdefault("arcs", {}).setdefault(k["arc"], {"stage": 1, "met": {}, "regard": 0})
    arc["regard"] = max(-3, min(3, arc.get("regard", 0) + regard_change))
    if arc["regard"] <= -2:
        arc["rest_until"] = _iso((now or _now()) + dt.timedelta(days=ARCS[k["arc"]]["rest_days"]))
        arc["regard"] = -1                         # when they return, warier, but they do return


def might(kind, a=None):
    """How much a being can make another give way (for who prevails between them)."""
    c = beings.CHARACTERS.get(kind, {})
    m = 1 + c.get("danger", 0) + (2 if "vast" in traits(kind) else 0) + (1 if "territorial" in traits(kind) else 0)
    m += {"legendary": 2, "rare": 1}.get(KINDS[kind]["rarity"], 0)
    return m * ((a or {}).get("variant") or {}).get("size", 1)


def stance(k1, k2, relations, rng):
    """How the first treats the second, from their traits and their kinds' history."""
    t1, t2 = set(traits(k1)), set(traits(k2))
    n1, n2 = KINDS[k1]["nature"], KINDS[k2]["nature"]
    past = relations.get("|".join(sorted([k1, k2])), 0)
    options = ["ignore", "size up", "uneasy truce"]
    if n1 == "hostile" and n2 == "hostile":
        options += ["team up", "rival", "squabble"] + (["team up"] * 2 if past > 0 else ["rival"] * 2 if past < 0 else [])
    if t1 & {"territorial", "proud"}:
        options += ["chase off", "rival"]
    if t2 & {"territorial", "vast"} and t1 & {"skittish", "shy", "gentle"}:
        options += ["flee", "avoid", "avoid"]
    if t1 & {"thieving", "greedy"}:
        options += ["steal from", "compete"]
    if "light-hungry" in t1 and k2 in ("lanternheads", "warden"):
        options += ["follow", "follow"]
    if t1 & {"curious"}:
        options += ["follow", "size up"]
    if past < 0:
        options += ["rival", "chase off"]
    elif past > 0:
        options += ["uneasy truce", "ignore", "team up" if n1 == n2 == "hostile" else "follow"]
    return rng.choice(options)


def companion(state, a, sched, step, rng, keep=None):
    """A second being about at the same time as a, or None."""
    k = KINDS[a["kind"]]
    start, end = _parse(a["start"]), _parse(a["end"])
    choices = []
    for kind, kk in KINDS.items():
        if kind == a["kind"] or kk["step"] > step or kk.get("arc") or kind in CHAINS or a.get("chain") or not released(kind):
            continue
        if kk["rarity"] == "legendary" and k["rarity"] == "legendary":
            continue
        if kk["nature"] == "hostile" and k["nature"] != "hostile" and not hostile_allowed(state, start):
            continue                               # a hostile one alongside a gentler one: still within the safeguards
        until = _parse(state["cooldowns"].get(kind))
        if until and until > start:
            continue
        if not _possible(kind, start, sched):
            continue
        hunt = 3 if kk["nature"] == "hostile" and k["nature"] != "hostile" else 1   # predators follow where life is
        choices.append((kind, RARITY_WEIGHT[kk["rarity"]] * hunt * ecology(kind, state, start, keep)))
    if not choices:
        return None
    kind = rng.choices([c for c, _ in choices], [w for _, w in choices])[0]
    t = start + dt.timedelta(minutes=rng.randint(0, 15))
    b = _appearance(kind, dt.date.fromisoformat(a["day"]), t - dt.timedelta(minutes=0), rng, state)
    b["start"] = _iso(t)
    b["end"] = _iso(min(end, t + dt.timedelta(minutes=rng.randint(*KINDS[kind]["minutes"]) or 30)))
    b["companion"] = True
    if KINDS[kind]["nature"] == "hostile" and k["nature"] != "hostile":
        b["counts"] = True                         # it is the danger in this meeting: it leads, and it counts
    rel = state.setdefault("relations", {})
    a["with"], b["with"] = b["id"], a["id"]
    a["with_kind"], b["with_kind"] = kind, a["kind"]
    a["stance"], b["stance"] = stance(a["kind"], kind, rel, rng), stance(kind, a["kind"], rel, rng)
    if {a["stance"], b["stance"]} & {"chase off", "rival", "compete", "squabble", "steal from"}:
        ma, mb = might(a["kind"], a), might(kind, b)
        a["prevails"] = a["id"] if rng.random() < ma / (ma + mb) else b["id"]   # fair: the mightier usually
        b["prevails"] = a["prevails"]
        loser = b if a["prevails"] == a["id"] else a
        loser["end"] = _iso(min(_parse(loser["end"]), _parse(loser["start"]) + dt.timedelta(minutes=25)))
    if a["stance"] == "flee" or b["stance"] == "flee":
        runner = a if a["stance"] == "flee" else b
        runner["end"] = _iso(min(_parse(runner["end"]), _parse(runner["start"]) + dt.timedelta(minutes=15)))
    return b


def note_relation(state, k1, k2, stance1, stance2=""):
    """Their kinds remember: allies after a team-up, a grudge after a fight, so the world grows its own politics."""
    key = "|".join(sorted([k1, k2]))
    rel = state.setdefault("relations", {})
    s = {stance1, stance2}
    delta = 1 if s & {"team up", "uneasy truce", "follow"} else -1 if s & {"rival", "chase off", "steal from", "squabble", "compete"} else 0
    rel[key] = max(-3, min(3, rel.get(key, 0) + delta))


def update(world: Path, sched=None, now=None, keep=None):
    """Plan today and tomorrow (once each), credit what it has witnessed, and save."""
    now = now or _now()
    sched = sched if sched is not None else weather.load(world)
    state, best = load(world), load_bestiary(world)
    if keep is None:
        keep = _load(world / "keep.json", {})
    witness(state, best, now)
    today = _keeper_day(now)
    for day in (today, today + dt.timedelta(days=1)):
        key = day.isoformat()
        if key in state["planned"]:
            continue
        state["planned"] = (state["planned"] + [key])[-10:]
        a = follow_up(state, day, sched) or plan_day(state, day, sched, best["step"], keep=keep)
        if a and not a.get("chain"):                # now and then, another being is about at the same time
            mrng = random.Random(day.toordinal() * 13 + 5)
            b = companion(state, a, sched, best["step"], mrng, keep) if mrng.random() < MEET_CHANCE else None
            if b:
                state["appearances"].append(b)
                state["cooldowns"][b["kind"]] = _iso(_parse(b["start"]) + dt.timedelta(days=COOLDOWN_DAYS[KINDS[b["kind"]]["rarity"]]))
        if a:
            state["appearances"].append(a)
            k = KINDS[a["kind"]]
            state["cooldowns"][a["kind"]] = _iso(_parse(a["start"]) + dt.timedelta(days=COOLDOWN_DAYS[k["rarity"]]))
            if a["kind"] in CHAINS and "chain" not in a:          # the first of a slow approach
                a["chain"] = 1
                state["chains"][a["kind"]] = {"n": 1, "next": (day + dt.timedelta(days=CHAINS[a["kind"]]["every"])).isoformat()}
    state["appearances"] = state["appearances"][-60:]
    (world / "creatures.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
    (world / "bestiary.json").write_text(json.dumps(best, indent=2, ensure_ascii=False), encoding="utf-8")
    return state


def witness(state, best, now):
    """Every appearance that has ended and that he saw counts toward seeing more. (Until encounters
    exist, every appearance counts as seen; encounters will mark the ones he slept through.)"""
    for a in state["appearances"]:
        end = _parse(a.get("end"))
        if a.get("witnessed") is not None or not end or end > now or a["kind"] not in KINDS or a.get("cancelled"):
            continue
        seen = a.get("seen", True)
        a["witnessed"] = bool(seen)
        if not seen:
            continue
        k = KINDS[a["kind"]]
        if k.get("arc"):                           # a chapter met: enough of them and the story moves on
            arc = state.setdefault("arcs", {}).setdefault(k["arc"], {"stage": 1, "met": {}, "regard": 0})
            arc.setdefault("met", {})[a["kind"]] = arc["met"].get(a["kind"], 0) + 1
            stages, after = ARCS[k["arc"]]["stages"], ARCS[k["arc"]]["advance_after"]
            i = stages.index(a["kind"])
            if i < len(after) and arc.get("stage", 1) == i + 1 and arc["met"][a["kind"]] >= after[i]:
                arc["stage"] = i + 2
        entry = best["kinds"].get(a["kind"]) or {}   # (an encounter may have started it: notes, regard)
        points = WITNESS_POINTS[k["rarity"]] * (2 if not entry.get("count") else 1)
        entry.setdefault("first", a["start"])
        entry["count"] = entry.get("count", 0) + 1
        entry["last"] = a["start"]
        best["kinds"][a["kind"]] = entry
        best["points"] += points
    best["step"] = max(s for s, need in enumerate(STEPS) if best["points"] >= need)


def current(state, now=None, ahead_minutes=0):
    """Appearances under way now (or starting within ahead_minutes)."""
    now = now or _now()
    out = []
    for a in state.get("appearances", []):
        s, e = _parse(a.get("start")), _parse(a.get("end"))
        if s and e and s - dt.timedelta(minutes=ahead_minutes) <= now < e and not a.get("cancelled"):
            out.append(a)
    return out


def export(world: Path, now=None):
    """What the keep page needs: who is here or about to be, and how they look; and how much
    he can see (visitors see what he sees). Nothing at all while the switch is off."""
    if not enabled():
        return None
    now = now or _now()
    state, best = load(world), load_bestiary(world)
    import encounters                              # (here, to keep the two modules from importing each other at load)
    shown = [{**{k: a[k] for k in ("id", "kind", "start", "end", "variant", "arrival", "chain", "last", "with",
                                   "stance", "prevails", "caption", "caption_at") if k in a},
              **({"stance_says": encounters.STANCE_SAYS[a["stance"]]} if a.get("stance") in encounters.STANCE_SAYS
                 and not a.get("companion") else {}),
              "render": KINDS[a["kind"]].get("render", a["kind"]), "nature": nature_of(a)}
             for a in current(state, now, ahead_minutes=120) if a["kind"] in KINDS]
    traces = [{"kind": a["arrival"], "id": a["id"], "since": a["start"]} for a in state["appearances"]
              if a.get("arrival") and _parse(a["start"]) and
              _parse(a["start"]) <= now < _parse(a["start"]) + dt.timedelta(days=TRACE_DAYS[a["arrival"]])]
    return {"current": shown, "seeing": best["step"], "traces": traces}
