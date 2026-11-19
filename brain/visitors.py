"""Visitors: knocks, gifts, candles in the window, and questions from the home page.

Anyone can visit (no passcode): nothing is typed, every choice comes from a fixed menu or a
card drawn from a deck, so nothing a visitor does can put words in Rooken's mouth or give it
orders.

How a visit travels: the home page presses the "Visit" workflow's button with its own
limited key. That run checks the visit is valid (an invalid one fails, and is ignored) and
its title records what it was, e.g. "Visit · gift · log". Nothing is written to the
repository. When Rooken wakes, it reads the visits since it last looked, and the daily caps
are applied here, on its side, whatever the home page allowed.

Run by the workflow:  python3 brain/visitors.py check   (reads KIND and ITEM from env)
"""

import datetime as dt
import json
import os
import random
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(os.environ.get("KNIGHT_ROOT", Path(__file__).resolve().parent.parent))
WORLD = ROOT / "world"
DECK = json.loads((Path(__file__).parent / "question_deck.json").read_text(encoding="utf-8"))

# what visitors can leave by the door: id -> (how Rooken hears of it, how the page shows it)
GIFTS = {
    "log":        ("a pine log for the fire", "🪵 A log for the fire"),
    "candle":     ("a candle", "🕯️ A candle"),
    "pebble":     ("a smooth pebble", "🪨 A smooth pebble"),
    "feather":    ("a feather", "🪶 A feather"),
    "oak":        ("a scrap of oak", "🪵 A scrap of oak"),
    "book:sea":   ("a book about the sea", "📘 A book about the sea"),
    "book:stars": ("a book about the stars", "📗 A book about the stars"),
    "book:tools": ("a book about old tools", "📙 A book about old tools"),
    "book:birds": ("a book about birds", "📕 A book about birds"),
}
KINDS = ["knock", "gift", "candle", "question", "answer"]
DAILY_CAPS = {"knock": 30, "gift": 12, "candle": 20, "question": 10, "answer": 40}   # per day, all visitors
GIFT_EACH = 3                                                           # of any one gift, per day
TITLE = re.compile(r"^Visit · (knock|gift|candle|question|answer) · (.*)$")
# Rooken's own question at the gate, and visitors' answers to it
ASK_OPEN_HOURS = 36          # a question closes on its own after this long
ANSWER_TOKENS = 45           # a written answer: a line (~170 characters in English, fewer in some languages)
ANSWERS_READ_TOKENS = 320    # written answers it reads per wake-up (option picks are just counted)


def _now():
    return dt.datetime.now(dt.timezone.utc)


def keeper_date(moment=None):
    """The keeper's date (US Eastern), which is when Rooken's days begin and end."""
    return ((moment or _now()) - dt.timedelta(hours=5)).strftime("%Y%m%d")


def is_candle_time(moment=None):
    """Candles go in the window in the evening and at night (6 PM to 7 AM US Eastern)."""
    hour = ((moment or _now()) - dt.timedelta(hours=5)).hour
    return hour >= 18 or hour < 7


# --------------------------------------------------------------------------
# Questions: today's (about its own life, written once a day) and the big deck
# --------------------------------------------------------------------------

def load_pool(world=WORLD):
    try:
        return json.loads((world / "questions.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"days": []}


def save_pool(questions, world=WORLD, day=None):
    day = day or keeper_date()
    pool = load_pool(world)
    days = [d for d in pool.get("days", []) if d.get("date") != day][-1:]   # keep yesterday's too
    days.append({"date": day, "items": [{"id": f"t{day}-{i}", "text": q} for i, q in enumerate(questions)]})
    (world / "questions.json").write_text(json.dumps({"days": days}, ensure_ascii=False, indent=2), encoding="utf-8")


def has_todays_questions(world=WORLD):
    return any(d.get("date") == keeper_date() and d.get("items") for d in load_pool(world).get("days", []))


def question_text(qid, world=WORLD):
    qid = str(qid or "")
    if re.fullmatch(r"d\d+", qid):
        i = int(qid[1:])
        return DECK[i] if i < len(DECK) else None
    m = re.fullmatch(r"t(\d{8})-(\d+)", qid)
    if m:
        for day in load_pool(world).get("days", []):
            if day.get("date") == m.group(1):
                for item in day.get("items", []):
                    if item.get("id") == qid:
                        return item.get("text")
    return None


def draw_cards(world=WORLD, k=3, rng=random, pool=None):
    """Three cards for a visitor: usually one or two about Rooken's life lately, the rest
    from the big deck. Different every visit."""
    pool = pool if pool is not None else load_pool(world)
    today = [d for d in pool.get("days", []) if d.get("date") == keeper_date()]
    fresh = [(i["id"], i["text"]) for d in today for i in d.get("items", [])]
    take = min(len(fresh), rng.choice([1, 2]) if fresh else 0)
    cards = rng.sample(fresh, take) if take else []
    deck = rng.sample(range(len(DECK)), k - take)
    return cards + [(f"d{i}", DECK[i]) for i in deck]


# --------------------------------------------------------------------------
# Rooken asks: one question of its own at the gate at a time
# --------------------------------------------------------------------------

def load_asks(world=WORLD):
    try:
        return json.loads((world / "asks.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"current": None, "past": []}


def save_asks(asks, world=WORLD):
    (world / "asks.json").write_text(json.dumps(asks, ensure_ascii=False, indent=2), encoding="utf-8")


def find_ask(ask_id, world=WORLD):
    """The question with this id, if it's open (or closed within the last day)."""
    asks = load_asks(world)
    for ask in [asks.get("current")] + list(asks.get("past", []))[-3:]:
        if ask and ask.get("id") == ask_id:
            if ask is asks.get("current"):
                return ask
            closed = ask.get("closed") or ask.get("time", "")
            if closed and dt.datetime.fromisoformat(closed) > _now() - dt.timedelta(days=1):
                return ask
    return None


def clean_answer(text):
    """A visitor's written answer, as one tidy line, or None if it can't be posted."""
    import letterbox   # here, so the workflow's quick checks don't need it otherwise
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    ok, _, _, text = letterbox.clean("a visitor", text)
    if not ok or len(text) < 2 or letterbox.estimate_tokens(text) > ANSWER_TOKENS:
        return None
    return text


def parse_answer(item):
    """'a202611191900:o2' (picked option 2) or 'a202611191900:t:some words' -> (ask id, kind, value)."""
    m = re.fullmatch(r"(a\d{12}):(?:o(\d)|t:(.+))", (item or "").strip(), re.S)
    if not m:
        return None
    return (m.group(1), "option", int(m.group(2))) if m.group(2) is not None else (m.group(1), "text", m.group(3))


# --------------------------------------------------------------------------
# Validating a visit (the workflow) and reading visits (the knight)
# --------------------------------------------------------------------------

def valid(kind, item, world=WORLD):
    item = (item or "-").strip()
    if kind in ("knock", "candle"):
        return item in ("", "-")
    if kind == "gift":
        return item in GIFTS
    if kind == "question":
        return question_text(item, world) is not None
    if kind == "answer":
        parsed = parse_answer(item)
        ask = find_ask(parsed[0], world) if parsed else None
        if not ask:
            return False
        if parsed[1] == "option":
            return parsed[2] < len(ask.get("options") or [])
        return clean_answer(parsed[2]) == parsed[2].strip()
    return False


def parse_title(title):
    m = TITLE.match(title or "")
    return (m.group(1), m.group(2).strip()) if m else None


def fetch(since, until=None, repo=None, token=None):
    """Visits (successful Visit runs) made after `since` (and up to `until`), oldest first.
    None if they couldn't be read, so the caller can try again next time instead of
    skipping past them."""
    repo = repo or os.environ.get("GITHUB_REPOSITORY") or _meta_repo()
    if not repo or os.environ.get("KNIGHT_PRACTICE"):
        return []
    token = token or os.environ.get("GITHUB_TOKEN")
    events, page = [], 1
    created = urllib.parse.quote(f">={since[:10]}")
    while page <= 5:
        url = (f"https://api.github.com/repos/{repo}/actions/workflows/visit.yml/runs"
               f"?status=success&per_page=100&page={page}&created={created}")
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "knight-keep/1.0"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as r:
                runs = json.load(r).get("workflow_runs", [])
        except Exception as err:
            print(f"[visitors: could not read visits: {err}]")
            return None
        for run in runs:
            parsed = parse_title(run.get("display_title"))
            at = run.get("created_at", "").replace("Z", "+00:00")
            if parsed and since < at and (until is None or at <= until):
                events.append({"kind": parsed[0], "item": parsed[1], "time": at})
        if len(runs) < 100:
            break
        page += 1
    return sorted(events, key=lambda e: e["time"])


def _meta_repo():
    try:
        return json.loads((WORLD / "meta.json").read_text(encoding="utf-8")).get("repo")
    except (OSError, json.JSONDecodeError):
        return None


def accept(events, memory, world=WORLD):
    """Apply the daily caps (on Rooken's side, whatever the home page allowed) and drop
    anything invalid. Updates the day's tallies in memory; returns what got through."""
    tally = memory.get("visits_today") or {}
    accepted = []
    for e in events:
        day = keeper_date(dt.datetime.fromisoformat(e["time"]))
        if tally.get("date") != day:
            tally = {"date": day, "gift_each": {}}
        kind, item = e["kind"], e["item"]
        if not valid(kind, item, world) or tally.get(kind, 0) >= DAILY_CAPS[kind]:
            continue
        if kind == "gift":
            if tally["gift_each"].get(item, 0) >= GIFT_EACH:
                continue
            tally["gift_each"][item] = tally["gift_each"].get(item, 0) + 1
        tally[kind] = tally.get(kind, 0) + 1
        accepted.append(e)
    memory["visits_today"] = tally
    return accepted


def display_counts():
    """What the keep shows: candles lit tonight, knocks today (keeper's time). None if the
    visits couldn't be read."""
    now = _now()
    start_of_day = (now - dt.timedelta(hours=5)).replace(hour=0, minute=0, second=0, microsecond=0) + dt.timedelta(hours=5)
    evening = (now - dt.timedelta(hours=5)).replace(hour=18, minute=0, second=0, microsecond=0) + dt.timedelta(hours=5)
    if now < evening:                       # before 6 PM: "tonight" means last night's candles
        evening -= dt.timedelta(days=1)
    since = min(start_of_day, evening).isoformat()
    found = fetch(since)
    if found is None:
        return None
    events = [e for e in found if valid(e["kind"], e["item"])]
    candles = sum(1 for e in events if e["kind"] == "candle" and e["time"] >= evening.isoformat()
                  ) if is_candle_time(now) else 0   # by 7 AM they've burned down
    knocks = sum(1 for e in events if e["kind"] == "knock" and e["time"] >= start_of_day.isoformat())
    return {"candles_tonight": min(candles, DAILY_CAPS["candle"]), "knocks_today": min(knocks, DAILY_CAPS["knock"]),
            "updated": now.replace(microsecond=0).isoformat()}


def check():
    """For the Visit workflow: fail the run unless the visit is valid (an invalid visit is ignored)."""
    kind, item = os.environ.get("KIND", ""), os.environ.get("ITEM", "-")
    if not valid(kind, item):
        sys.exit("not a valid visit")
    if kind == "candle" and not is_candle_time():
        sys.exit("candles are for the evening and the night")
    if kind == "answer" and parse_answer(item)[1] == "text" and os.environ.get("GROQ_API_KEY"):
        import letterbox
        from llm import Brain
        verdict, _ = letterbox.screen(Brain(os.environ["GROQ_API_KEY"]), "a visitor", parse_answer(item)[2])
        if verdict is False:
            sys.exit("the checker held this answer back")   # the reason isn't logged: the run is public
    print(f"A visit: {kind}")


if __name__ == "__main__" and sys.argv[1:] == ["check"]:
    check()
