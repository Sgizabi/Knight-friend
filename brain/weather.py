"""The weather over the keep, chosen by the world itself: no AI, no tokens.

It is a schedule of periods (a few hours each) kept about a day ahead in world/weather.json,
so the knight, the 3D keep and its visitors all see the same sky. Each period has a kind and
an intensity (0.3 light to 1.0 heavy). Seasons follow the keeper's calendar (US Eastern);
weather tends to come in streaks; and once in a while something that isn't weather at all
drifts over the keep.

Weather is part of the knight's world, never advice: it changes how its needs move (rain
chills, storms spoil sleep, a clear sky lifts the spirit), heavy weather keeps courtyard work
from being possible, and the knight is told plainly what the sky is doing.
"""

import datetime as dt
import json
import random
from pathlib import Path

NORMAL = ["clear", "cloudy", "rain", "storm", "fog", "wind", "snow"]
ABNORMAL = ["ash", "starfall", "aurora", "upward_rain", "glass_hail", "still"]
NIGHT_ONLY = {"starfall", "aurora"}
ABNORMAL_CHANCE = .02        # per period: roughly once every week or two
STREAK = .4                  # chance the next period keeps the same kind of weather
AHEAD_HOURS = 30             # how far ahead the schedule reaches
KEEP_HOURS = 26              # how much of the past it keeps (the keep replays plans that far back)

# by month in the keeper's calendar: how likely each kind is
SEASON_WEIGHTS = {
    "winter": {"clear": 22, "cloudy": 28, "rain": 6, "storm": 1, "fog": 12, "wind": 12, "snow": 19},
    "spring": {"clear": 26, "cloudy": 22, "rain": 24, "storm": 8, "fog": 8, "wind": 12, "snow": 0},
    "summer": {"clear": 40, "cloudy": 18, "rain": 14, "storm": 14, "fog": 4, "wind": 10, "snow": 0},
    "autumn": {"clear": 22, "cloudy": 26, "rain": 22, "storm": 5, "fog": 13, "wind": 12, "snow": 0},
}
SNOW_BY_MONTH = {11: 3, 3: 4}  # a little snow at the edges of winter
HOURS = {"clear": (4, 9), "cloudy": (4, 9), "rain": (3, 7), "storm": (1, 3), "fog": (3, 6), "wind": (3, 6),
         "snow": (3, 8)}
ABNORMAL_HOURS = (1.5, 4)

# How it moves the knight's needs, per minute, at full intensity and full exposure (out in the
# open; half under the hall's open roof; none by the fire, indoors in its buildings, or under a
# mended roof). The 3D keep reads the same numbers, so its bars move in step.
EFFECTS = {
    "clear": {"spirit": .004},
    "cloudy": {},
    "rain": {"warmth": -.09, "spirit": -.002},
    "storm": {"warmth": -.14, "rest": -.02, "spirit": -.003},
    "fog": {"warmth": -.03},
    "wind": {"warmth": -.06},
    "snow": {"warmth": -.16},
    "ash": {"warmth": -.02, "spirit": -.004},
    "starfall": {"inspiration": .04, "spirit": .004},
    "aurora": {"inspiration": .03, "spirit": .006},
    "upward_rain": {"inspiration": .03, "warmth": -.04},
    "glass_hail": {"warmth": -.06, "rest": -.02},
    "still": {"spirit": -.004},
}
# and while it sleeps, wherever it sleeps: a storm or a wind rattling the keep spoils rest
SLEEP_EFFECTS = {"storm": {"rest": -.08}, "glass_hail": {"rest": -.04}, "wind": {"rest": -.02}}

# how it is told, plainly
WORDS = {
    "clear": ("clear skies", "clear skies", "a bright, clear sky"),
    "cloudy": ("a few clouds", "an overcast sky", "a low, heavy grey sky"),
    "rain": ("a light rain", "steady rain", "heavy rain"),
    "storm": ("a thunderstorm", "a thunderstorm", "a violent thunderstorm"),
    "fog": ("a light mist", "fog", "thick fog"),
    "wind": ("a breeze", "a strong wind", "a gale"),
    "snow": ("light snow", "snow", "heavy snow"),
    "ash": ("ash drifting down from a sky with no fire in it",) * 3,
    "starfall": ("stars falling across the night sky",) * 3,
    "aurora": ("curtains of green and violet light in the northern sky",) * 3,
    "upward_rain": ("rain falling upward, off the stones and into the sky",) * 3,
    "glass_hail": ("hail like small beads of glass, chiming where it lands",) * 3,
    "still": ("an utter stillness: no wind, no birds, not a sound",) * 3,
}


def _now():
    return dt.datetime.now(dt.timezone.utc)


def _parse(s):
    try:
        return dt.datetime.fromisoformat(s)
    except (TypeError, ValueError):
        return None


def _iso(t):
    return t.replace(microsecond=0).isoformat()


def keeper_time(t):
    """The keeper's clock (US Eastern, standard time)."""
    return t - dt.timedelta(hours=5)


def season(t):
    m = keeper_time(t).month
    return "winter" if m in (12, 1, 2) else "spring" if m in (3, 4, 5) else "summer" if m in (6, 7, 8) else "autumn"


def _is_night(t):
    h = keeper_time(t).hour
    return h >= 20 or h < 5


def load(world: Path):
    try:
        data = json.loads((world / "weather.json").read_text(encoding="utf-8"))
        return data if isinstance(data.get("periods"), list) else {"periods": []}
    except (OSError, json.JSONDecodeError, AttributeError):
        return {"periods": []}


def _draw(rng, start, last):
    """The next period's weather, from the season, the last period (streaks) and chance."""
    if rng.random() < ABNORMAL_CHANCE:
        kinds = [k for k in ABNORMAL if k not in NIGHT_ONLY or _is_night(start)]
        kind = rng.choice(kinds)
        return kind, round(rng.uniform(.6, 1.0), 2), rng.uniform(*ABNORMAL_HOURS)
    if last and last.get("kind") in NORMAL and rng.random() < STREAK:
        kind = last["kind"]
        intensity = min(1.0, max(.3, last.get("intensity", .6) + rng.uniform(-.25, .25)))
    else:
        weights = dict(SEASON_WEIGHTS[season(start)])
        weights["snow"] = weights["snow"] or SNOW_BY_MONTH.get(keeper_time(start).month, 0)
        kind = rng.choices(list(weights), list(weights.values()))[0]
        intensity = rng.uniform(.3, 1.0)
    return kind, round(intensity, 2), rng.uniform(*HOURS[kind])


def update(world: Path, now=None):
    """Keep the schedule reaching a day or so ahead, forgetting what's long past."""
    now = now or _now()
    data = load(world)
    periods = [p for p in data["periods"] if _parse(p.get("end")) and _parse(p["end"]) > now - dt.timedelta(hours=KEEP_HOURS)]
    end = _parse(periods[-1]["end"]) if periods else now - dt.timedelta(hours=2)
    while end < now + dt.timedelta(hours=AHEAD_HOURS):
        rng = random.Random(int(end.timestamp()))          # the same schedule, however often it's asked
        kind, intensity, hours = _draw(rng, end, periods[-1] if periods else None)
        nxt = end + dt.timedelta(hours=hours)
        periods.append({"start": _iso(end), "end": _iso(nxt), "kind": kind, "intensity": intensity})
        end = nxt
    data = {"periods": periods}
    (world / "weather.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def at(sched, t):
    """The period covering time t, or None."""
    for p in (sched or {}).get("periods", []):
        a, b = _parse(p.get("start")), _parse(p.get("end"))
        if a and b and a <= t < b:
            return p
    return None


def deltas(period, exposure, sleeping=False):
    """Per-minute need changes from the weather, for how exposed it is (0 to 1)."""
    if not period:
        return {}
    i = period.get("intensity", .6)
    out = {k: v * i * exposure for k, v in EFFECTS.get(period.get("kind"), {}).items()}
    if sleeping:
        for k, v in SLEEP_EFFECTS.get(period.get("kind"), {}).items():
            out[k] = out.get(k, 0) + v * i
    return {k: v for k, v in out.items() if v}   # nothing at all where it doesn't reach


def blocks_courtyard(period):
    """Heavy weather makes courtyard work impossible for now (a limit of its world)."""
    if not period:
        return False
    k, i = period.get("kind"), period.get("intensity", .6)
    return k in ("storm", "glass_hail") or (k in ("rain", "snow") and i >= .65)


def words(period):
    if not period:
        return "clear skies"
    w = WORDS.get(period.get("kind"), WORDS["clear"])
    i = period.get("intensity", .6)
    return w[0] if i < .5 else w[1] if i < .8 else w[2]


def _when(t):
    h = keeper_time(t).hour
    return ("in the small hours" if h < 5 else "early in the morning" if h < 8 else "in the morning" if h < 12
            else "around midday" if h < 14 else "in the afternoon" if h < 17 else "in the evening" if h < 20 else "tonight")


def describe(sched, now=None):
    """One plain line for the knight: what the sky is doing, and what seems to be coming."""
    now = now or _now()
    p = at(sched, now)
    line = f"The weather: {words(p)}."
    if p:
        nxt = next((q for q in sched.get("periods", []) if _parse(q.get("start")) and _parse(q["start"]) >= _parse(p["end"])), None)
        if nxt and nxt.get("kind") != p.get("kind"):
            line += f" It looks like {words(nxt)} {_when(_parse(nxt['start']))}."
        if blocks_courtyard(p):
            line += " It's too wild out for any work in the courtyard just now."
    return line


def export(world: Path, now=None):
    """What the 3D keep needs to draw the sky and move the bars in step."""
    now = now or _now()
    sched = load(world)
    keep = [p for p in sched["periods"] if _parse(p.get("end")) and _parse(p["end"]) > now - dt.timedelta(hours=KEEP_HOURS)]
    return {"periods": keep, "effects": EFFECTS, "sleep_effects": SLEEP_EFFECTS}
