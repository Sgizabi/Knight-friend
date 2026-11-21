"""Years of the world in a minute or two: the spawner, encounters and the beings' adaptation
played out with a stand-in Rooken (no AI, no tokens, nothing real touched), to check that the
world stays fresh: his known answers keep mostly working but never for good, he keeps finding
new ones, no being is solved or hopeless, and the safeguards hold year after year.

The stand-in isn't Rooken's mind (that is tested with the real model, sparingly); it tests the
world's rules against several ways of playing:
  habit     always does what last worked
  varied    mostly what has worked, sometimes something new
  cautious  shelters unless it knows an answer
  bold      drives things off, trying ideas as it goes

  python brain/simulate.py --years 10            (all four, a summary per year)
  python brain/simulate.py --years 3 --policy habit --detail
"""

import argparse
import collections
import datetime as dt
import json
import os
import random
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ["KNIGHT_CREATURES"] = "on"
import beings  # noqa: E402
import creatures  # noqa: E402
import encounters  # noqa: E402
import life  # noqa: E402
import weather  # noqa: E402

NEUTRAL_WORDS = ["stay calm", "keep my distance", "wait", "talk softly", "wave my arms", "throw a stone",
                 "stand in the doorway", "hold my dagger up"]
BANK = sorted({w for c in beings.CHARACTERS.values() for w in (c.get("weakness") or {}).get("words", [])}
              | {w for m in beings.MORE_WEAKNESSES.values() for ws in m.values() for x in ws for w in x["words"]}
              | {w for c in beings.CHARACTERS.values() for w in c.get("likes", [])} | set(NEUTRAL_WORDS))
WARY = {"hostile", "nuisance"}


def own_words(kind):
    """Words a thoughtful knight might reach for from what it sees and has noticed (its look
    and tell hint at some of its weaknesses), standing in for his reasoning."""
    pool = [w for _, x in encounters.weaknesses(kind) if not x.get("deep") for w in x.get("words", [])]
    return pool + beings.CHARACTERS[kind].get("likes", [])


def explore(kind, nature, rng):
    if nature in WARY:
        choice = rng.choice(["drive_off", "drive_off", "hide", "watch", "prepare", "offer"])
    else:
        choice = rng.choice(["watch", "offer", "speak", "approach", "watch", "leave"])
    words = own_words(kind) if rng.random() < .35 and own_words(kind) else BANK
    return choice, "I " + " and ".join(rng.sample(words, min(len(words), rng.choice([1, 2]))))


def decide(policy, kind, nature, mem, rng):
    worked = mem["worked"]
    if policy == "habit":
        return worked[-1] if worked else explore(kind, nature, rng)
    if policy == "varied":
        fresh = [w for w in worked if w not in mem["failed"][-2:]]
        return rng.choice(fresh) if fresh and rng.random() < .6 else explore(kind, nature, rng)
    if policy == "cautious":
        if worked:
            return worked[-1]
        return ("hide", "I bar the door and stay by the fire") if nature in WARY and rng.random() < .6 else explore(kind, nature, rng)
    if policy == "bold":
        if worked and rng.random() < .75:
            return worked[-1]
        c, how = explore(kind, nature, rng)
        return ("drive_off" if nature in WARY else c), how
    raise ValueError(policy)


def asleep_at(t):
    return 5 <= t.hour + t.minute / 60 < 12


def run(years, policy, seed=1, detail=False):
    rng = random.Random(seed)
    w = Path(tempfile.mkdtemp())
    t0 = dt.datetime(2026, 11, 21, 17, tzinfo=dt.timezone.utc)
    keep = life.load_keep(w)
    keep["repairs"] = {k: v["needed"] for k, v in life.REPAIRS.items()}
    keep["buildings"] = [{"key": k, "name": f"the {k}", "place": k, "plot": i, "done": 4, "needed": 4, "finished": "x"}
                         for i, k in enumerate(["forge", "woodshed", "glasshouse"])]
    keep["objects"] = [{"name": f"Thing {i}"} for i in range(5)]
    body, log, memory = {"injuries": []}, [], collections.defaultdict(lambda: {"worked": [], "failed": []})
    years_out = []
    year = collections.Counter()
    per_kind = collections.defaultdict(collections.Counter)
    damaged_at = {}
    for d in range(int(365 * years)):
        for h in (0, 9):
            now = t0 + dt.timedelta(days=d, hours=h)
            sched = weather.update(w, now)
            creatures.update(w, sched, now, keep=keep)
            state, best = creatures.load(w), creatures.load_bestiary(w)
            changed = False
            for a in state["appearances"]:
                start = creatures._parse(a["start"])
                if a.get("met") or a.get("slept") or a.get("cancelled") or start > now:
                    continue
                if not encounters.leads(a, {x["id"]: x for x in state["appearances"]}):   # met with the one that leads
                    a["met"], changed = {"outcome": "with"}, True
                    continue
                changed = True
                kind = a["kind"]
                nature = creatures.KINDS[kind]["nature"]
                week = [e for e in log if start - e["time"] < dt.timedelta(days=7)]
                if asleep_at(start):
                    wakes = sum(1 for e in week if e.get("woke"))
                    if not encounters.is_loud(kind) or wakes >= encounters.NIGHT_WAKES_PER_WEEK:
                        a["slept"], a["seen"] = True, False
                        year["slept"] += 1
                        continue
                entry = best["kinds"].setdefault(kind, {})
                encounters.heal(body, start)
                mem = memory[kind]
                needs = {"rest": rng.uniform(30, 85), "warmth": rng.uniform(40, 85), "inspiration": 60, "spirit": 55}
                said, prepared, rec = [], False, {"time": start, "woke": asleep_at(start)}
                year["encounters"] += 1
                year[f"n_{nature}"] += 1
                for step in range(1, encounters.STEPS_MOST + 1):
                    choice, how = decide(policy, kind, nature, mem, rng)
                    known = (choice, how) in mem["worked"]
                    out = encounters.resolve(a, choice, how, {
                        "needs": needs, "body": body, "keep": keep, "entry": entry, "prepared": prepared, "step": step,
                        "week": week + [rec], "now": start, "said": said,
                        "sky": (weather.at(sched, start) or {}).get("kind", "")}, rng)
                    encounters.apply(out, a, needs, body, keep, entry, how, start)
                    said.append(out["text"])
                    prepared = prepared or choice == "prepare"
                    wary = nature in WARY and encounters.weaknesses(kind)
                    if known and wary:
                        year["reuse"] += 1
                        per_kind[kind]["reuse"] += 1
                        if out["result"] == "good":
                            year["reuse_ok"] += 1
                            per_kind[kind]["reuse_ok"] += 1
                        else:
                            year["stale"] += 1
                    if out["result"] == "good" and wary:
                        per_kind[kind]["good"] += 1
                        if (choice, how) not in mem["worked"]:
                            mem["worked"].append((choice, how))
                            mem["worked"] = mem["worked"][-4:]
                            if out.get("used"):
                                year["found"] += 1
                                year["found_deep"] += out["used"].startswith("deep")
                    elif out["result"] != "good" and known:
                        mem["failed"].append((choice, how))
                        if out["result"] == "bad":
                            mem["worked"].remove((choice, how)) if (choice, how) in mem["worked"] else None
                    if wary:
                        per_kind[kind]["meet"] += step == 1
                    for k in ("injury", "loss"):
                        if out[k]:
                            rec[k] = True
                            year[k] += 1
                    if out["damage"]:
                        rec["damage"] = True
                        year["damage"] += 1
                        damaged_at[out["damage"]] = start
                    year["bad"] += out["result"] == "bad"
                    if out["turned_back"]:
                        creatures.turn_back(state, kind, start)
                    creatures.note_arc(state, kind, out["regard"], start)
                    if out["ends"]:
                        break
                log.append(rec)
                log[:] = log[-60:]
                a["met"], a["seen"] = {"outcome": out["result"]}, True
                for key, when in list(damaged_at.items()):          # he mends what was harmed in a couple of days
                    if start - when > dt.timedelta(days=2):
                        while life.damaged(keep, key):
                            life.repair(keep, key)
                        del damaged_at[key]
                if d % 12 == 0:
                    keep["objects"].append({"name": f"Made thing {d}"})
            if changed:
                (w / "creatures.json").write_text(json.dumps(state), encoding="utf-8")
                (w / "bestiary.json").write_text(json.dumps(best), encoding="utf-8")
        if (d + 1) % 365 == 0:
            best = creatures.load_bestiary(w)
            solved = [k for k, c in per_kind.items() if c["reuse"] >= 4 and c["reuse_ok"] / c["reuse"] >= .95]
            hopeless = [k for k, c in per_kind.items() if c["meet"] >= 3 and c["good"] == 0]
            years_out.append({"year": len(years_out) + 1, **year, "solved": solved, "hopeless": hopeless,
                              "seeing": best["step"], "arc": creatures.load(w)["arcs"]["glassy"].get("stage")})
            if detail:
                print(len(years_out), dict(per_kind))
            for k, c in per_kind.items():
                ALL_KINDS[k].update(c)
            year, per_kind = collections.Counter(), collections.defaultdict(collections.Counter)
    return years_out


ALL_KINDS = collections.defaultdict(collections.Counter)   # every year together, per being


def kinds_report():
    print("\nper being, all years and stand-ins together: how often a known answer still worked")
    rows = sorted(ALL_KINDS.items(), key=lambda kv: -beings.LEARNS.get(kv[0], .15))
    for k, c in rows:
        if c["reuse"]:
            print(f"  {k:12s} learns {beings.LEARNS.get(k, .15):.2f}  known answers worked {c['reuse_ok'] / c['reuse']:.0%} "
                  f"of {c['reuse']}")


def report(policy, ys):
    print(f"\n== {policy}")
    print("year  meets  wary  known-works  stale  found(deep)  injuries/mo  damage/mo  losses/mo  solved  hopeless  seeing arc")
    for y in ys:
        works = y["reuse_ok"] / y["reuse"] if y.get("reuse") else 0
        print(f"{y['year']:>4}  {y['encounters']:>5}  {y.get('n_hostile', 0) + y.get('n_nuisance', 0):>4}  "
              f"{works:>11.0%}  {y.get('stale', 0):>5}  {y.get('found', 0):>5}({y.get('found_deep', 0)})    "
              f"{y.get('injury', 0) / 12:>11.2f}  {y.get('damage', 0) / 12:>9.2f}  {y.get('loss', 0) / 12:>9.2f}  "
              f"{','.join(y['solved']) or '-':>6}  {','.join(y['hopeless']) or '-':>8}  {y['seeing']:>6} {y['arc']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", type=float, default=10)
    ap.add_argument("--policy", choices=["habit", "varied", "cautious", "bold", "all"], default="all")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--detail", action="store_true")
    args = ap.parse_args()
    for policy in (["habit", "varied", "cautious", "bold"] if args.policy == "all" else [args.policy]):
        report(policy, run(args.years, policy, args.seed, args.detail))
    kinds_report()


if __name__ == "__main__":
    main()
