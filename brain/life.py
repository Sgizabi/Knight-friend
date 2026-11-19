"""The knight's body and home: its needs, the state of the keep, and the things it has made.

Needs (rest, warmth, inspiration, spirit) rise and fall with what it does, including
the plan it plays out between wake-ups. They are feelings it is told about, not orders.

The keep starts ruined. Repairs take several sessions each; some open new places and
some change how its needs behave (a mended roof keeps the warmth in, for instance).
"""

import datetime as dt
import json
import math
import re
from pathlib import Path

NEEDS = ["rest", "warmth", "inspiration", "spirit"]

REPAIRS = {
    "doorway": {"name": "the rubble choking the doorway to the courtyard", "needed": 3,
                "unlocks": "courtyard", "effect": "the overgrown courtyard beyond is open to you"},
    "hearth":  {"name": "the scattered stones of the old hearth", "needed": 2,
                "effect": "the fire warms you better"},
    "window":  {"name": "the broken window, its frame rotten and glass long gone", "needed": 2,
                "effect": "gazing out lifts your inspiration more"},
    "stair":   {"name": "the fallen stair up to the tower", "needed": 3,
                "unlocks": "tower", "effect": "you can climb to the tower top and look far out"},
    "wall":    {"name": "the collapsed east wall", "needed": 4, "effect": "the hall feels whole and safe"},
    "roof":    {"name": "the open gap in the roof", "needed": 4, "effect": "the warmth no longer escapes"},
}

BASE_PLACES = ["fire", "window", "bookshelf", "desk", "easel", "workbench", "bedroll"]

# How each waking activity moves its needs.
ACTIVITY_EFFECTS = {
    "rest":   {"warmth": 22, "rest": 12, "spirit": 2},
    "sleep":  {"rest": 40, "warmth": -4},
    "study":  {"inspiration": 16, "rest": -5},
    "wander": {"inspiration": 10, "spirit": 4, "rest": -3},
    "draw":   {"inspiration": -14, "rest": -5},
    "write":  {"inspiration": -12, "rest": -4},
    "build":  {"inspiration": -16, "rest": -7},
    "craft":  {"inspiration": -12, "rest": -8, "warmth": 3},
    "repair": {"rest": -12, "warmth": 5, "spirit": 6},
}

# Pastimes it invents for itself. It picks the kind; the kind (not the knight) sets how
# its needs move, so no invented pastime can be a shortcut to feeling perfect.
PASTIME_KINDS = {
    "restful":    {"rest": 8, "warmth": 4, "spirit": 2},
    "creative":   {"inspiration": -10, "rest": -4, "spirit": 4},
    "physical":   {"rest": -10, "warmth": 4, "spirit": 5},
    "thoughtful": {"inspiration": 10, "rest": -3},
}
MAX_PASTIMES = 8

# A mended hearth warms better; a mended window lifts inspiration more.
HEARTH_WARMTH = 1.4
WINDOW_INSPIRATION = 1.2

PLACEMENTS = ["floor", "table", "shelf", "wall"]
SHAPES = {"box": 3, "cylinder": 3, "cone": 2, "sphere": 1, "torus": 2}
MAX_PARTS = 24


def _load(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def _save(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")


def _now():
    return dt.datetime.now(dt.timezone.utc)


# --------------------------------------------------------------------------
# The keep
# --------------------------------------------------------------------------

def load_keep(world: Path):
    keep = _load(world / "keep.json", {})
    keep.setdefault("repairs", {k: 0 for k in REPAIRS})
    for k in REPAIRS:
        keep["repairs"].setdefault(k, 0)
    keep.setdefault("objects", [])
    return keep


def save_keep(world: Path, keep):
    _save(world / "keep.json", keep)


def repaired(keep, key):
    return keep["repairs"].get(key, 0) >= REPAIRS[key]["needed"]


def places(keep):
    found = list(BASE_PLACES)
    for key, info in REPAIRS.items():
        if info.get("unlocks") and repaired(keep, key):
            found.append(info["unlocks"])
    return found


def describe_keep(keep):
    lines = []
    for key, info in REPAIRS.items():
        done, needed = keep["repairs"][key], info["needed"]
        state = "mended" if done >= needed else f"{done}/{needed} of the work done"
        lines.append(f"- [{key}] {info['name']}: {state}" + ("" if done >= needed else f" (once mended, {info['effect']})"))
    objects = keep["objects"][-6:]
    text = "The state of your keep:\n" + "\n".join(lines)
    if objects:
        text += "\nThings you have made for the keep: " + ", ".join(o["name"] for o in objects)
    return text


def repair(keep, wanted):
    """Do one session's work on a repair. Returns (key, finished_now) or (None, False)."""
    wanted = (wanted or "").lower()
    open_jobs = [k for k in REPAIRS if not repaired(keep, k)]
    if not open_jobs:
        return None, False
    key = next((k for k in open_jobs if k in wanted), None)
    key = key or next((k for k in open_jobs if keep["repairs"][k] > 0), open_jobs[0])
    keep["repairs"][key] += 1
    return key, repaired(keep, key)


def validate_design(data):
    """Clean up an object the knight designed. Returns a safe design or None."""
    if not isinstance(data, dict):
        return None
    parts = []
    for raw in (data.get("parts") or [])[:MAX_PARTS]:
        if not isinstance(raw, dict):
            continue
        shape = str(raw.get("shape", "")).lower()
        if shape not in SHAPES:
            continue
        size = _numbers(raw.get("size"), SHAPES[shape], 0.005, 2.0, 0.1)
        pos = _numbers(raw.get("pos"), 3, -2.0, 3.0, 0.0)
        rot = _numbers(raw.get("rot"), 3, -7.0, 7.0, 0.0)
        color = str(raw.get("color", ""))
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
            color = "#8a8a8a"
        parts.append({"shape": shape, "size": size, "pos": pos, "rot": rot, "color": color})
    if not parts:
        return None
    placement = str(data.get("placement", "floor")).lower()
    return {"name": str(data.get("name") or "a nameless thing")[:60],
            "about": str(data.get("about") or "")[:160],
            "placement": placement if placement in PLACEMENTS else "floor",
            "parts": parts}


def _numbers(value, count, low, high, default):
    if not isinstance(value, (list, tuple)):
        value = []
    out = []
    for i in range(count):
        try:
            v = float(value[i])
            v = default if not math.isfinite(v) else v
        except (IndexError, TypeError, ValueError):
            v = default
        out.append(round(max(low, min(high, v)), 4))
    return out


# --------------------------------------------------------------------------
# Needs
# --------------------------------------------------------------------------

def load_needs(world: Path):
    needs = _load(world / "needs.json", {})
    for n in NEEDS:
        needs.setdefault(n, 70.0)
    return needs


def save_needs(world: Path, needs):
    needs["updated"] = _now().replace(microsecond=0).isoformat()
    _save(world / "needs.json", needs)


def change(needs, deltas, keep=None):
    for name, delta in deltas.items():
        if name == "warmth" and delta > 0 and keep and repaired(keep, "hearth"):
            delta *= HEARTH_WARMTH
        if name == "inspiration" and delta > 0 and keep and repaired(keep, "window"):
            delta *= WINDOW_INSPIRATION
        if delta > 0 and needs[name] > SATURATE_ABOVE:
            delta *= max(SATURATE_MIN, (100 - needs[name]) / (100 - SATURATE_ABOVE))
        needs[name] = round(max(0.0, min(100.0, needs[name] + delta)), 1)


# How its needs move between wake-ups, per minute of the plan it plays out. This is the one
# place to turn things up or down; the 3D keep reads the same numbers (via state.json) so
# its bars move live in step with what the knight will feel when it next wakes.
NEED_RATES = {
    "sleep":   {"rest": .35, "warmth": -.05, "inspiration": .06},   # sleep restores rest, clears the head
    "fire":    {"warmth": .25, "rest": .05},                        # sitting or working by the fire
    "away":    {"rest": -.04, "warmth": -.2},                       # anywhere else, roof still open
    "away_roofed": {"rest": -.04, "warmth": -.08},                  # anywhere else, roof mended
    "work":    {"rest": -.03},                                      # extra, for hands-on work
    "gaze":    {"inspiration": .06},                                # gazing or reading (extra)
    "dozing":  {"rest": .04, "warmth": .03},                        # after the plan ran out, by the fire
}
# Spirit settles back toward this, by this share of the distance each hour, unless something
# lifts it (a letter, a finished repair, a creation it's glad of) or lowers it.
SPIRIT_HOME = 55.0
# Gains get smaller near the top (going from 90 to 100 is harder than from 40 to 50), so
# its needs don't sit pinned at 100. Above this level a gain is scaled down, to no less
# than SATURATE_MIN of its size.
SATURATE_ABOVE = 60.0
SATURATE_MIN = 0.25
SPIRIT_SETTLE_PER_HOUR = 0.06
DRIFT_MAX_HOURS = 48


def drift(needs, minutes):
    """The slow pull of time, whatever it was doing: spirit eases back toward the middle."""
    hours = max(0.0, min(DRIFT_MAX_HOURS, minutes / 60))
    if hours <= 0:
        return
    gap = needs["spirit"] - SPIRIT_HOME
    needs["spirit"] = round(SPIRIT_HOME + gap * (1 - SPIRIT_SETTLE_PER_HOUR) ** hours, 1)


def step_rates(step, keep):
    """The per-minute effect of one step of its plan."""
    action, place = step.get("action"), step.get("place")
    if action == "sleep":
        rates = dict(NEED_RATES["sleep"])
    elif place == "fire":
        rates = dict(NEED_RATES["fire"])
    else:
        rates = dict(NEED_RATES["away_roofed" if repaired(keep, "roof") else "away"])
    extras = []
    if action == "work":
        extras.append(NEED_RATES["work"])
    if action in ("gaze", "read"):
        extras.append(NEED_RATES["gaze"])
    for extra in extras:
        for name, value in extra.items():
            rates[name] = rates.get(name, 0) + value
    return rates


def _overlap_minutes(a0, a1, b0, b1):
    return max(0.0, (min(a1, b1) - max(a0, b0)).total_seconds() / 60)


def live_out_plan(needs, plan, keep):
    """Apply the effects of the plan it has played out since it last woke.

    Only the stretch not yet counted: a light check-in or a night's sleep in between
    catches its needs up and marks the plan with applied_until, so the same hours are
    never counted twice."""
    try:
        start = dt.datetime.fromisoformat(plan["start"])
    except (KeyError, TypeError, ValueError):
        return
    now, counted_from = _now(), start
    try:
        counted_from = max(start, dt.datetime.fromisoformat(plan["applied_until"]))
    except (KeyError, TypeError, ValueError):
        pass
    t = start
    for step in plan.get("steps", []):
        end = t + dt.timedelta(minutes=step.get("minutes", 20))
        m = _overlap_minutes(t, end, counted_from, now)
        if m > 0:
            change(needs, {k: v * m for k, v in step_rates(step, keep).items()}, keep)
        t = end
    m = _overlap_minutes(t, now, counted_from, now)   # dozed by the fire after the plan ran out
    if m > 0:
        change(needs, {k: v * m for k, v in NEED_RATES["dozing"].items()}, keep)


def describe_needs(needs):
    words = {
        "rest": ["exhausted", "weary", "rested enough", "well rested"],
        "warmth": ["chilled to the bone", "cold", "comfortable", "warm"],
        "inspiration": ["dry of ideas", "uninspired", "a little inspired", "brimming with ideas"],
        "spirit": ["low in spirit", "subdued", "steady", "in high spirits"],
    }
    parts = [f"{n} {round(needs[n])}/100 ({words[n][min(3, int(needs[n] // 25))]})" for n in NEEDS]
    return ("How you feel in body and spirit: " + ", ".join(parts) + ". These are feelings, "
            "not orders: you may rest when weary, or push through if something matters more.")


# --------------------------------------------------------------------------
# What the 3D keep reads
# --------------------------------------------------------------------------

def _lines(path: Path):
    rows = []
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return rows


def export_state(world: Path, docs: Path):
    """Everything the 3D keep needs, in one small file next to the website."""
    memory = _load(world / "memory.json", {})
    keep = load_keep(world)
    gallery = _load(world / "gallery.json", [])
    needs = load_needs(world)
    state = {
        "identity": _load(world / "identity.json", {}),
        "plan": _load(world / "plan.json", {}),
        "status": _load(world / "status.json", {}),
        "needs": {n: needs[n] for n in NEEDS},
        "needs_prev": needs.get("previous"),  # at the start of its last wake-up, for the ▲▼ marks
        "needs_at": needs.get("updated"),
        # the same rules the knight lives by, so the keep can move the bars live
        "needs_model": {"rates": NEED_RATES, "spirit_home": SPIRIT_HOME,
                        "spirit_settle_per_hour": SPIRIT_SETTLE_PER_HOUR,
                        "drift_max_hours": DRIFT_MAX_HOURS, "hearth_warmth": HEARTH_WARMTH,
                        "saturate_above": SATURATE_ABOVE, "saturate_min": SATURATE_MIN,
                        "window_inspiration": WINDOW_INSPIRATION},
        "keep": {"repairs": {k: {"done": keep["repairs"][k], "needed": v["needed"]} for k, v in REPAIRS.items()},
                 "objects": keep["objects"][-16:]},
        "places": places(keep),
        "gallery": [{"file": g["file"], "title": g["title"], "time": g["time"]} for g in gallery[-7:]],
        "projects": [{"slug": p["slug"], "title": p["title"], "status": p.get("status", "")}
                     for p in (memory.get("projects") or [])][-14:],
        "writings": [{"title": w["title"], "form": w.get("form", "")} for w in _lines(world / "writings.jsonl")[-6:]],
        "interests": list((memory.get("interests") or {}).keys())[:5],
        "exported": _now().replace(microsecond=0).isoformat(),
    }
    _save(docs / "data" / "state.json", state)
    return state
