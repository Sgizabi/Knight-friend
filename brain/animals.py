"""Small life around the keep: crows on the walls, birds in the dead tree, hares on the plain, deer at
the forest edge, an owl, bats, a fox, fish in the lake, a stray cat. No AI and no encounters: fair
rules decide who is about each hour (the time of day, the season, the weather), worked out from the
hour itself, so everyone who looks in sees the same animals, and Rooken is told in a line what is
around. The keep page draws them and has them shy away from anything big or hostile.
"""

import datetime as dt
import random

import weather

ALL = {"winter", "spring", "summer", "autumn"}
WARM = {"spring", "summer", "autumn"}
WET = {"rain", "storm", "upward_rain", "glass_hail", "snow"}
WILD = {"storm", "glass_hail", "ash"}

# hours are the keeper's (US Eastern); chance: how often it is about in an hour that suits it
KINDS = {
    "crows":      dict(hours=range(6, 20), seasons=ALL, avoid=WILD, chance=.85, says="crows on the walls"),
    "songbirds":  dict(hours=range(5, 20), seasons=WARM, avoid=WET | WILD, chance=.8, says="small birds in the dead tree"),
    "hares":      dict(hours=[5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21], seasons=ALL, avoid=WILD | {"rain"}, chance=.75, says="hares on the plain"),
    "deer":       dict(hours=[5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21], seasons=ALL, avoid=WILD, chance=.6, says="deer at the forest edge"),
    "butterflies": dict(hours=range(8, 19), seasons={"spring", "summer"}, avoid=WET | WILD | {"fog"}, chance=.8,
                        says="butterflies over the courtyard"),
    "owl":        dict(hours=[19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5], seasons=ALL, avoid=WILD, chance=.75, says="an owl in the dead tree"),
    "bats":       dict(hours=[17, 18, 19, 20, 21, 22], seasons=WARM, avoid=WET | WILD, chance=.8, says="bats over the keep"),
    "fox":        dict(hours=[19, 20, 21, 22, 23, 0, 1, 2, 3, 4], seasons=ALL, avoid=WILD, chance=.5, says="a fox out on the plain"),
    "fish":       dict(hours=range(5, 22), seasons=WARM, avoid=WILD | {"snow"}, chance=.8, says="fish rising in the lake"),
    "cat":        dict(hours=range(6, 24), seasons=ALL, avoid=WET | WILD, chance=.3, says="a stray cat on the wall"),
}
SLOTS = 8    # hours ahead the keep page is given (it fetches new state at least every half hour)


def _hour(t):
    return t.replace(minute=0, second=0, microsecond=0)


def about(sched, t):
    """The animals about in the hour that holds t: the same answer for anyone who asks."""
    h = _hour(t)
    k = weather.keeper_time(h)
    p = weather.at(sched, h) or {}
    sky, season = p.get("kind", "clear"), weather.season(h)
    out = []
    for name, a in KINDS.items():
        if k.hour not in a["hours"] or season not in a["seasons"] or sky in a["avoid"]:
            continue
        rng = random.Random(f"{h.isoformat()}|{name}")   # (the hour and the kind decide; nothing else)
        if rng.random() < a["chance"]:
            out.append(name)
    return out


def export(sched, now=None):
    """For the keep page: who is about this hour and the next few."""
    now = now or dt.datetime.now(dt.timezone.utc)
    h = _hour(now)
    return [{"start": (h + dt.timedelta(hours=i)).isoformat(), "end": (h + dt.timedelta(hours=i + 1)).isoformat(),
             "kinds": about(sched, h + dt.timedelta(hours=i))} for i in range(SLOTS)]


def line(sched, now=None):
    """One plain line for him about what small life is around just now (or nothing, if there is none)."""
    kinds = about(sched, now or dt.datetime.now(dt.timezone.utc))
    if not kinds:
        return ""
    says = [KINDS[k]["says"] for k in kinds]
    return "Around the keep: " + (says[0] if len(says) == 1 else ", ".join(says[:-1]) + " and " + says[-1]) + "."
