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

import weather

# what each being is. when: day (8-17 ET), dusk (17-20), night (20-5), dark (dusk or night), any.
# likes: weather that draws it (three times as likely then). needs: what must be true for it to come.
# render: the keep page's name for how it looks. ongoing: comes on its own slow clock (not yet planned).
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
    "larva":        dict(name="the Starfallen Larva", nature="gentle", rarity="uncommon", step=1, when="night", likes=["starfall"], minutes=(60, 180)),
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
    "crawl":        dict(name="the Long Crawl", nature="hostile", rarity="rare", step=0, when="any", minutes=(0, 0), ongoing=True),
    "axolotl":      dict(name="the giant axolotl", nature="gentle", rarity="uncommon", step=0, when="day", needs="after_rain", minutes=(60, 180)),
    "thincrowd":    dict(name="the Thin Crowd", nature="hostile", rarity="rare", step=1, when="dusk", minutes=(30, 60)),
    "bentone":      dict(name="the Bent One", nature="hostile", rarity="rare", step=2, when="night", minutes=(30, 60)),
    "watcher":      dict(name="the Window Watcher", nature="hostile", rarity="rare", step=2, when="night", minutes=(30, 60)),
    "doorway":      dict(name="the Doorway Figure", nature="hostile", rarity="rare", step=1, when="night", minutes=(30, 60)),
}

RARITY_WEIGHT = {"common": 10, "uncommon": 5, "rare": 2, "legendary": .4}
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


def plan_day(state, day, sched, step, rng=None):
    """Decide whether a notable being comes on this keeper's day, which, and when."""
    rng = rng or random.Random(day.toordinal())
    if rng.random() >= DAY_CHANCE[week_mode(day)]:
        return None
    start = _day_start(day)
    recent = [a for a in state["appearances"] if _parse(a["start"]) and _parse(a["start"]) > start - dt.timedelta(days=7)]
    last_hostile = max((_parse(a["start"]) for a in recent if KINDS.get(a["kind"], {}).get("nature") == "hostile"), default=None)
    week_start = start - dt.timedelta(days=weather.keeper_time(start).weekday())
    hostile_this_week = sum(1 for a in recent if KINDS.get(a["kind"], {}).get("nature") == "hostile" and _parse(a["start"]) >= week_start)
    hostile_ok = (last_hostile is None or start - last_hostile >= dt.timedelta(days=HOSTILE_QUIET_DAYS)) and hostile_this_week < HOSTILE_PER_WEEK
    choices = []
    for kind, k in KINDS.items():
        if k.get("ongoing") or k["step"] > step:
            continue
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
            choices.append((kind, RARITY_WEIGHT[k["rarity"]] * best, rng.choice([t for f, t in fits if f == best])))
    if not choices:
        return None
    kind, _, t = rng.choices(choices, [w for _, w, _ in choices])[0]
    k = KINDS[kind]
    begin = t + dt.timedelta(minutes=rng.randint(0, 50))
    end = begin + dt.timedelta(minutes=rng.randint(*k["minutes"]))
    variant = {"size": round(rng.uniform(.88, 1.15), 2), "hue": round(rng.uniform(-.06, .06), 3),
               "mark": rng.choice(["", "", "", "scarred", "old", "young"])}
    return {"id": f"{kind}-{begin.strftime('%Y%m%d%H%M')}", "kind": kind, "day": day.isoformat(),   # its evening, even past midnight
            "start": _iso(begin), "end": _iso(end), "variant": variant}


def update(world: Path, sched=None, now=None):
    """Plan today and tomorrow (once each), credit what it has witnessed, and save."""
    now = now or _now()
    sched = sched if sched is not None else weather.load(world)
    state, best = load(world), load_bestiary(world)
    witness(state, best, now)
    today = _keeper_day(now)
    for day in (today, today + dt.timedelta(days=1)):
        key = day.isoformat()
        if key in state["planned"]:
            continue
        state["planned"] = (state["planned"] + [key])[-10:]
        a = plan_day(state, day, sched, best["step"])
        if a:
            state["appearances"].append(a)
            k = KINDS[a["kind"]]
            state["cooldowns"][a["kind"]] = _iso(_parse(a["start"]) + dt.timedelta(days=COOLDOWN_DAYS[k["rarity"]]))
    state["appearances"] = state["appearances"][-60:]
    (world / "creatures.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
    (world / "bestiary.json").write_text(json.dumps(best, indent=2, ensure_ascii=False), encoding="utf-8")
    return state


def witness(state, best, now):
    """Every appearance that has ended and that he saw counts toward seeing more. (Until encounters
    exist, every appearance counts as seen; encounters will mark the ones he slept through.)"""
    for a in state["appearances"]:
        end = _parse(a.get("end"))
        if a.get("witnessed") is not None or not end or end > now or a["kind"] not in KINDS:
            continue
        seen = a.get("seen", True)
        a["witnessed"] = bool(seen)
        if not seen:
            continue
        k = KINDS[a["kind"]]
        entry = best["kinds"].get(a["kind"])
        points = WITNESS_POINTS[k["rarity"]] * (2 if not entry else 1)
        entry = entry or {"first": a["start"], "count": 0}
        entry["count"] += 1
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
        if s and e and s - dt.timedelta(minutes=ahead_minutes) <= now < e:
            out.append(a)
    return out


def export(world: Path, now=None):
    """What the keep page needs: who is here or about to be, and how they look; and how much
    he can see (visitors see what he sees). Nothing at all while the switch is off."""
    if not enabled():
        return None
    now = now or _now()
    state, best = load(world), load_bestiary(world)
    shown = [{**a, "render": KINDS[a["kind"]].get("render", a["kind"]), "nature": KINDS[a["kind"]]["nature"]}
             for a in current(state, now, ahead_minutes=120) if a["kind"] in KINDS]
    return {"current": shown, "seeing": best["step"]}
