"""The knight's home page. It only reads; the knight lives in the GitHub job."""

import base64
import datetime as dt
import hmac
import json
import os
import sys
import time
import urllib.request
from html import escape
from pathlib import Path

import streamlit as st

APP = Path(__file__).resolve().parent
ROOT = Path(os.environ.get("KNIGHT_ROOT", APP))

st.set_page_config(page_title="The Keep", page_icon="🔥", layout="centered")

st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=VT323&family=EB+Garamond:ital@0;1&display=swap');
  :root { color-scheme: dark; }
  html, body, [class*="st-"] { font-family: 'EB Garamond', Georgia, serif; }
  h1, h2, h3, .stTabs [data-baseweb="tab"] { font-family: 'VT323', monospace !important; letter-spacing: .03em; }
  .stTabs [data-baseweb="tab"] { font-size: 1.25rem; }
  .entry { border: 1px solid #3a2f27; background: #1c1714; border-radius: 10px; padding: 14px 18px; margin: 0 0 12px; }
  .entry .when { color: #a8987f; font-size: .9rem; margin-bottom: 4px; }
  .entry .mood { color: #f0a04b; }
  .entry pre { white-space: pre-wrap; font: inherit; margin: 6px 0 0; }
  .gal { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
  .gal figure { margin: 0; border: 1px solid #3a2f27; border-radius: 10px; overflow: hidden; background: #1c1714; }
  .gal img { display: block; width: 100%; aspect-ratio: 4/3; object-fit: contain; background: #0f0c0a; }
  .gal figcaption { padding: 6px 10px; color: #c9bba3; font-size: .95rem; }
  .muted { color: #a8987f; font-style: italic; }
</style>
""", unsafe_allow_html=True)


# ------------------------------------------------------------------ reading the knight's world
def local_meta():
    try:
        return json.loads((ROOT / "world" / "meta.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


META = local_meta()
REMOTE = bool(META.get("repo")) and "KNIGHT_ROOT" not in os.environ
RAW = f"https://raw.githubusercontent.com/{META['repo']}/{META.get('branch', 'main')}" if REMOTE else ""
PAGES = ""  # the knight's own website (GitHub Pages), which also carries a copy of world/
if REMOTE:
    _owner, _repo = META["repo"].split("/", 1)
    PAGES = f"https://{_owner.lower()}.github.io/{_repo}/"


def _fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "knight-keep-home/1.0"})
    with urllib.request.urlopen(request, timeout=10) as response:
        return response.read().decode("utf-8")


@st.cache_data(ttl=120, show_spinner=False)
def read_source(rel):
    """(text, where it came from). Fresh from the knight's website first, then GitHub's raw
    files, then this app's own copy of the repository (which can be hours old)."""
    remote = []
    if PAGES:
        site_path = rel[len("docs/"):] if rel.startswith("docs/") else f"data/{rel}"
        remote.append(("its website", f"{PAGES}{site_path}?t={int(time.time())}"))
    if RAW:
        remote.append(("GitHub", f"{RAW}/{rel}"))
    for label, url in remote:
        try:
            return _fetch(url), label
        except Exception as err:  # shows in the app's logs (Manage app → logs)
            print(f"[home page] couldn't read {rel} from {label}: {err}", file=sys.stderr)
    path = ROOT / rel
    if path.exists():
        if remote:
            print(f"[home page] using this app's saved copy of {rel}", file=sys.stderr)
        return path.read_text(encoding="utf-8"), "a saved copy"
    return None, ""


def read_text(rel):
    return read_source(rel)[0]


def read_json(rel, default):
    text = read_text(rel)
    try:
        return json.loads(text) if text else default
    except json.JSONDecodeError:
        return default


def read_lines(rel):
    text = read_text(rel) or ""
    rows = []
    for line in text.splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return rows


def when(stamp):
    try:
        moment = dt.datetime.fromisoformat(stamp)
    except (TypeError, ValueError):
        return ""
    hours = (dt.datetime.now(dt.timezone.utc) - moment).total_seconds() / 3600
    if hours < 1 / 30:
        return "just now"
    if hours < 1:
        return f"{int(hours * 60)} min ago"
    if hours < 24:
        return f"{int(hours)}h ago"
    days = int(hours // 24)
    return f"{days} day{'s' if days > 1 else ''} ago"


identity = read_json("world/identity.json", {})
memory = read_json("world/memory.json", {})
plan = read_json("world/plan.json", {})
status = read_json("world/status.json", {})
usage = read_json("world/usage.json", {})
diary = read_json("world/recent.json", [])
gallery = read_json("world/gallery.json", [])
writings = read_lines("world/writings.jsonl")
letters = read_lines("world/letters.jsonl")
# before letters.jsonl, only answered letters were kept (in replies.jsonl)
if not letters:
    letters = read_lines("world/replies.jsonl")
needs_history = read_lines("world/needs_history.jsonl")
bestiary = read_json("world/bestiary.json", {"points": 0, "step": 0, "kinds": {}})
pages_url = ""
if META.get("repo"):
    owner, repo = META["repo"].split("/", 1)
    pages_url = f"https://{owner.lower()}.github.io/{repo}/"

# ------------------------------------------------------------------ the knight's own code
# Streamlit re-runs this page after an update but keeps modules it imported before, so the
# page could end up calling old brain code (a letter once failed that way). Any brain module
# whose file has changed since it was loaded is loaded again, along with those after it in
# this list (they hold names taken from the ones before).
sys.path.insert(0, str(APP / "brain"))
BRAIN_MODULES = ("llm", "letterbox", "visitors")


def fresh_brain():
    import importlib
    reload_rest = False
    for name in BRAIN_MODULES:
        module, just_loaded = sys.modules.get(name), False
        if module is None:
            module, just_loaded = importlib.import_module(name), True
        try:
            mtime = Path(module.__file__).stat().st_mtime
        except (OSError, TypeError):
            continue
        if not just_loaded and (reload_rest or getattr(module, "_page_loaded_mtime", None) != mtime):
            module = importlib.reload(module)
            reload_rest = True
        module._page_loaded_mtime = mtime


fresh_brain()
import letterbox  # noqa: E402
import visitors  # noqa: E402


def checked(text, sender="a visitor"):
    """The quick AI check of a letter or answer: True / False, or None if it couldn't run.
    If it can't run, the workflow that posts it checks it again, so nothing goes up unchecked
    and a visitor never sees an error because of the check."""
    key = secret("groq_api_key")
    if not key:
        return None
    try:
        from llm import Brain
        try:
            brain = Brain(key, world=ROOT / "world", remember=False)
        except TypeError:            # an older brain still loaded: the plain one still checks
            brain = Brain(key)
        return letterbox.screen(brain, sender, text)[0]
    except Exception as err:         # never the letter's text in the logs
        print(f"[check] could not run: {type(err).__name__}", file=sys.stderr)
        return None


# ------------------------------------------------------------------ visits (knock, gift, candle, question)

VISITS_PER_DAY = 100          # all visits together; past this the gate is shut until tomorrow
PER_VISIT = {"knock": 1, "gift": 2, "candle": 1, "question": 1, "answer": 3, "help": 99}   # (help: once per being, see help_section)   # per visitor, per visit (and one answer per question)


def secret(key):
    try:
        return str(st.secrets[key]).strip()
    except Exception:
        return ""


def keeper_day_start():
    now = dt.datetime.now(dt.timezone.utc)
    return (now - dt.timedelta(hours=5)).replace(hour=0, minute=0, second=0, microsecond=0) + dt.timedelta(hours=5)


@st.cache_data(ttl=45, show_spinner=False)
def todays_visits():
    """Visits since yesterday evening, straight from the Visit runs on GitHub, or None."""
    if not META.get("repo"):
        return None
    since = keeper_day_start() - dt.timedelta(hours=6)          # back to 6 PM yesterday, for candles
    url = (f"https://api.github.com/repos/{META['repo']}/actions/workflows/visit.yml/runs?per_page=100"
           f"&created=%3E%3D{since.strftime('%Y-%m-%dT%H:%M:%SZ')}")
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "knight-keep-home/1.0"}
    if secret("github_token"):
        headers["Authorization"] = f"Bearer {secret('github_token')}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=10) as r:
            runs = json.load(r).get("workflow_runs", [])
    except Exception as err:
        print(f"[visits] couldn't read today's visits: {err}", file=sys.stderr)
        return None
    found = []
    for run in runs:
        parsed = visitors.parse_title(run.get("display_title"))
        if parsed and run.get("conclusion") not in ("failure", "cancelled"):
            found.append({"kind": parsed[0], "item": parsed[1],
                          "time": run.get("created_at", "").replace("Z", "+00:00")})
    return found


def visit_counts(found):
    """Knocks today and candles in the window now, as the keep shows them."""
    if found is None:
        return None
    now = dt.datetime.now(dt.timezone.utc)
    start = keeper_day_start().isoformat()
    evening = (now - dt.timedelta(hours=5)).replace(hour=18, minute=0, second=0, microsecond=0) + dt.timedelta(hours=5)
    if now < evening:
        evening -= dt.timedelta(days=1)
    knocks = sum(1 for r in found if r["kind"] == "knock" and r["time"] >= start)
    candles = sum(1 for r in found if r["kind"] == "candle" and r["time"] >= evening.isoformat())
    return {"knocks_today": min(knocks, visitors.DAILY_CAPS["knock"]),
            "candles_tonight": min(candles, visitors.DAILY_CAPS["candle"]) if visitors.is_candle_time() else 0,
            "updated": now.replace(microsecond=0).isoformat()}


def send_visit(kind, item="-"):
    """Press the Visit workflow's button; its run checks the visit and records it."""
    body = json.dumps({"ref": META.get("branch", "main"), "inputs": {"kind": kind, "item": item}}).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.github.com/repos/{META['repo']}/actions/workflows/visit.yml/dispatches",
        data=body, method="POST",
        headers={"Accept": "application/vnd.github+json", "Content-Type": "application/json",
                 "Authorization": f"Bearer {secret('github_token')}",
                 "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "knight-keep-home/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return response.status == 204
    except Exception as err:
        print(f"[visits] could not record a visit: {err}", file=sys.stderr)
        return False


# ------------------------------------------------------------------ the keep, in 3D
# The same page the knight's website serves, with its current state handed in directly.
keep_state = read_json("docs/data/state.json", {})
live_counts = visit_counts(todays_visits())
if live_counts:
    keep_state["visits"] = live_counts
svgs = {g["file"]: read_text(f"docs/{g['file']}") or "" for g in keep_state.get("gallery", [])}
keep_page = (APP / "docs" / "keep.html").read_text(encoding="utf-8")
# In the browser the keep re-reads its state from the website (GitHub Pages) every minute.
payload = json.dumps({"state": keep_state, "svgs": svgs,
                      "asset_base": PAGES or (f"{RAW}/docs/" if RAW else None)})
st.iframe(keep_page.replace("__DATA__", payload.replace("</", "<\\/")), height=600)


def seems_unwell(state):
    """Several check-ins failed in a row, or none got through for half a day (its alarm may have
    stopped): the keeper should take a look (see MAINTAINING.md)."""
    if (state.get("health") or {}).get("unwell"):
        return True
    try:
        quiet = dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(state.get("needs_at") or "")
    except (TypeError, ValueError):
        return False
    return quiet > dt.timedelta(hours=12)


if seems_unwell(keep_state):
    st.markdown(f"<p class='muted' style='text-align:center;color:#d9a7a0'>{escape(identity.get('name', 'The knight').split()[0])} "
                "seems unwell: its last few check-ins didn't go through. It should be back soon.</p>",
                unsafe_allow_html=True)
# How fresh this page is, and where it got its data (handy when something looks out of date).
sources = sorted({read_source(rel)[1] for rel in ("world/identity.json", "world/recent.json",
                                                  "docs/data/state.json")} - {""})
fresh = f"Last woke {when(identity.get('last_wake', '')) or '—'}"
if sources:
    fresh += " · read from " + " and ".join(sources)
links = f" · <a href='{pages_url}keep.html' target='_blank'>open it full screen</a>" if pages_url else ""
st.markdown(f"<p class='muted' style='text-align:center'>{escape(fresh)} · Click the keep to use the "
            f"keyboard{links}</p>", unsafe_allow_html=True)

tabs = st.tabs(["Diary", "Visit", "Gallery", "Workshop", "Writings", "Mind", "Bestiary", "Letters", "About"])

# ------------------------------------------------------------------ diary
with tabs[0]:
    if not diary:
        st.markdown("<p class='muted'>The diary is empty.</p>", unsafe_allow_html=True)
    for entry in reversed(diary[-25:]):
        st.markdown(
            f"<div class='entry'><div class='when'>{escape(when(entry['time']))} · "
            f"{escape(entry.get('label') or entry.get('activity', ''))} · <span class='mood'>{escape(entry.get('mood', ''))}"
            f"</span></div>{escape(entry['text'])}</div>", unsafe_allow_html=True)

# ------------------------------------------------------------------ visit
def react_in_keep(kind, item="-"):
    """Show the visit in the 3D keep above right away (just on this screen; Rooken itself
    notices at its next wake-up). A tiny same-page script finds the keep and tells it."""
    data = json.dumps({"kind": kind, "item": item}).replace("</", "<\\/")
    st.iframe("<script>try{for(const f of window.parent.document.querySelectorAll('iframe')){"
              "const k=f.contentWindow&&f.contentWindow.__keep;"
              f"if(k&&k.visitorArrived){{k.visitorArrived({data});break;}}}}}}catch(e){{}}</script>", height=1)


def ask_section(name, state, today, of_kind, visit):
    """Rooken's own question at the gate, if it has one up, and what visitors answered."""
    asks = read_json("world/asks.json", {"current": None, "past": []})
    ask, past = asks.get("current"), [p for p in asks.get("past", []) if p.get("response")]
    if not ask and not past:
        return
    st.markdown(f"#### {escape(name)} asks")
    if ask:
        options = ask.get("options") or []
        st.markdown(f"<div class='entry'><div class='when'>{escape(when(ask['time']))} · left at the gate by "
                    f"{escape(name)}</div><strong>{escape(ask['text'])}</strong></div>", unsafe_allow_html=True)
        done_key = f"answered_{ask['id']}"
        waiting = sum(1 for r in today if r["kind"] == "answer" and r["item"].startswith(ask["id"] + ":"))
        if state.get(done_key):
            st.caption(f"Thanks for answering! {name} reads answers when it next wakes.")
        elif of_kind("answer") >= visitors.DAILY_CAPS["answer"]:
            st.caption(f"{name} has had plenty of answers today. Come back tomorrow!")
        else:
            def answered(item):
                if visit("answer", item, f"Answer left at the gate. {name} reads answers when it next wakes."):
                    state[done_key] = True
            if options:
                cols = st.columns(len(options))
                for i, (col, option) in enumerate(zip(cols, options)):
                    if col.button(option, key=f"opt_{ask['id']}_{i}", use_container_width=True):
                        answered(f"{ask['id']}:o{i}")
            else:
                with st.form(f"answer_{ask['id']}", clear_on_submit=True, border=False):
                    words = st.text_input("Your answer", max_chars=170, placeholder="A line is plenty",
                                          label_visibility="collapsed")
                    if st.form_submit_button("Leave your answer"):
                        text = visitors.clean_answer(words)
                        if not text:
                            st.warning("That answer can't be posted. Keep it to a short line, without links.")
                        else:
                            with st.spinner("Checking it…"):
                                verdict = checked(text)
                            if verdict is False:
                                st.warning("That answer couldn't be posted. Please reword it.")
                            else:
                                answered(f"{ask['id']}:t:{text}")
        tally = ask.get("tally") or {}
        if options and any(tally.values()):
            st.caption("So far: " + " · ".join(f"{o} {tally.get(str(i), 0)}" for i, o in enumerate(options)))
        said = ask.get("said") or []
        if said:
            st.caption("Visitors said: " + " · ".join(f"“{s['text']}”" for s in said[-6:]))
        if waiting:
            st.caption(f"{waiting} answer{'s' if waiting > 1 else ''} today, waiting for {name} to read.")
        if ask.get("response"):
            st.markdown(f"<div class='entry'><div class='when'>{escape(name)} replied</div>"
                        f"{escape(ask['response']['text'])}</div>", unsafe_allow_html=True)
    if past:
        with st.expander("Earlier questions"):
            for p in reversed(past[-6:]):
                st.markdown(f"**{escape(p['text'])}**  \n{escape(p['response']['text'])}", unsafe_allow_html=True)


def name_ok(name):
    """The checker's verdict on a name to be remembered by: True / False, or None if it couldn't
    run (the Visit run checks it again, so nothing unchecked ever reaches Rooken)."""
    key = secret("groq_api_key")
    if not key:
        return None
    try:
        from llm import Brain
        return visitors.screen_name(Brain(key, world=ROOT / "world", remember=False), name)
    except Exception as err:         # never the name in the logs
        print(f"[check] could not run: {type(err).__name__}", file=sys.stderr)
        return None


VISITOR_COOKIE = "keep_visitor"


def keep_visitor_tag(tag):
    """Keep this visitor's anonymous tag in a cookie on the home page (a year), so a reload counts
    as the same visitor. A random code only: nothing about the person. The same tiny same-page
    script as react_in_keep."""
    st.iframe("<script>try{window.parent.document.cookie="
              f"'{VISITOR_COOKIE}={tag}; max-age=31536000; path=/; SameSite=Lax'"
              "}catch(e){}</script>", height=1)


def help_section(name, state, found, visit):
    """A hostile or nuisance being at the keep, or whose signs have begun: visitors can help
    (DESIGN.md section 8). Each browser visit counts once per being; the meter is full at
    visitors.HELP_FULL helpers. A full meter sends a hostile one away before he meets it once a
    week at most; otherwise, and always for a nuisance, it only improves his odds."""
    now = dt.datetime.now(dt.timezone.utc)
    signs = dt.timedelta(minutes=visitors.HELP_SIGNS)
    here = [a for a in (keep_state.get("creatures") or {}).get("current", [])
            if a.get("nature") in visitors.HELP_NATURES and a.get("help_open", True)
            and dt.datetime.fromisoformat(a["start"]) - signs <= now < dt.datetime.fromisoformat(a["end"])]
    if not here:
        return
    if "visitor_tag" not in state:     # the same visitor after a reload: the tag lives in a cookie
        kept = str((st.context.cookies or {}).get(VISITOR_COOKIE, ""))
        if len(kept) == 6 and all(ch in "abcdefghijklmnopqrstuvwxyz0123456789" for ch in kept):
            state.visitor_tag, state.tag_kept = kept, True
        else:
            import secrets as _secrets
            state.visitor_tag = "".join(_secrets.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(6))
    helped = state.setdefault("helped", [])
    events = [e for e in (found or []) if e["kind"] == "help"]
    for e in events:                   # what this visitor already helped with, before a reload too
        parsed = visitors.parse_help(e.get("item"))
        if parsed and parsed[1] == state.visitor_tag and parsed[0] not in helped:
            helped.append(parsed[0])
    for a in here:
        meter = visitors.help_for(a, events)["count"]
        full, who = visitors.HELP_FULL, escape(name)
        coming = now < dt.datetime.fromisoformat(a["start"])
        hostile = a.get("nature") == "hostile"
        st.markdown(f"#### {'Something dangerous' if hostile else 'Something troublesome'} "
                    f"{'is coming to' if coming else 'is at'} the keep")
        sign = f" ({escape(a['sign'])})" if coming and a.get("sign") else ""
        if hostile and a.get("help_sends", True):
            what = (f"when {full} visitors have helped, it may leave before {who} has to face it, and if {who} "
                    f"faces it, the help makes it a little easier")
        elif hostile:
            what = (f"visitors already sent one away this week, so this time help can't send it away: it makes "
                    f"it a little easier for {who} to face it")
        else:
            what = (f"help can't send a nuisance away, but it makes it a little easier for {who} to "
                    f"deal with it")
        st.markdown(f"<p>{'There are signs of something on its way' + sign if coming else 'Something has come'}. "
                    f"You can help from outside the walls. Your help adds to everyone's: {what}. {who} still "
                    f"decides what to do. The meter takes in one helper every {visitors.HELP_GAP} minutes, so it "
                    f"fills over a little while.</p>", unsafe_allow_html=True)
        st.progress(min(1.0, meter / full), text=f"Helping drive it off: {min(meter, full)} of {full}")
        if a["id"] in helped:
            st.caption("You've helped with this one. Thank you!")
            continue
        c1, c2 = st.columns([3, 2])
        who = c1.text_input("A name to be remembered by (optional)", key=f"helpname-{a['id']}", max_chars=16,
                            placeholder="letters only, not your real name",
                            help=f"{name} may read it, as a plain fact, and may mention it in its diary.")
        c2.write("")
        if c2.button("📣 Help drive it off", key=f"help-{a['id']}", use_container_width=True):
            who = (who or "").strip()
            if who and not visitors.NAME.fullmatch(who):
                st.warning("Names are letters only, 2 to 16 of them. Or leave it blank.")
                continue
            if who and name_ok(who) is False:
                st.warning("That name can't be used. Try another, or leave it blank.")
                continue
            item = f"{a['id']}:{state.visitor_tag}" + (f":{who}" if who else "")
            if visit("help", item, f"You shout and clatter from beyond the walls. {name} hears of it "
                                   "within a minute or two."):
                helped.append(a["id"])
                if not state.get("tag_kept"):
                    keep_visitor_tag(state.visitor_tag)
                    state.tag_kept = True


def helpers_roll(name):
    """The roll of helpers: recent deeds, newest first, with a small count of each name's deeds.
    Not a ranking (names aren't unique), and only screened names, never the visitor tags."""
    roll = (keep_state.get("creatures") or {}).get("helpers") or {}
    deeds = roll.get("deeds") or []
    if not deeds:
        return
    st.markdown("#### Recent helpers")
    lines = []
    for d in deeds[:5]:
        try:
            day = (dt.datetime.fromisoformat(d["time"]) - dt.timedelta(hours=5))
            old = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(d["time"])).days >= 6
            label = day.strftime("%b %d").replace(" 0", " ") if old else day.strftime("%A")
        except (KeyError, ValueError):
            label = ""
        line = visitors.roll_line(d, roll.get("counts"), name)
        lines.append(f"<div>{escape(line)}<span class='when'> · {escape(label)}</span></div>")
    st.markdown("<div class='entry'>" + "".join(lines) + "</div>", unsafe_allow_html=True)


@st.fragment   # pressing a button here reruns only this part, so the keep above doesn't reload
def visit_tab():
    name = identity.get("name") or "the knight"
    state = st.session_state
    state.setdefault("visits_made", {})
    found = todays_visits()
    counts = visit_counts(found) or keep_state.get("visits") or {}
    pile = keep_state.get("gifts") or []
    st.markdown(f"Stop by the gate. You can't go in, and {escape(name)} won't come out to chat, but it "
                "notices who came by when it next wakes (usually within two hours). No passcode needed, "
                "and nothing you do here can change who it is.")
    cols = st.columns(3)
    cols[0].metric("Knocks today", counts.get("knocks_today", 0))
    cols[1].metric("Candles in the window", counts.get("candles_tonight", 0))
    cols[2].metric("Gifts it has kept", len(pile))

    if not (secret("github_token") and META.get("repo")):
        st.markdown("<p class='muted'>The gate isn't open yet.</p>", unsafe_allow_html=True)
        return
    start = keeper_day_start().isoformat()
    today = [r for r in (found or []) if r["time"] >= start]
    if len([r for r in today if r["kind"] != "help"]) >= VISITS_PER_DAY:
        st.info(f"The gate is quiet for today: {escape(name)} has had a lot of visitors. Come back tomorrow!")
        return
    of_kind = lambda kind: sum(1 for r in today if r["kind"] == kind)

    def visit(kind, item, thanks):
        made = state.visits_made
        if made.get(kind, 0) >= PER_VISIT[kind]:
            st.info("That's plenty for one visit. Come back another time!")
            return
        if of_kind(kind) >= visitors.DAILY_CAPS[kind]:
            st.info(f"{escape(name)} has had plenty of those today. Come back tomorrow!")
            return
        with st.spinner("At the gate…"):
            ok = send_visit(kind, item)
        if ok:
            made[kind] = made.get(kind, 0) + 1
            todays_visits.clear()
            st.success(thanks)
            react_in_keep(kind, item if kind in ("gift", "help") else "-")
        else:
            st.error("The gate didn't answer just now. Please try again in a little while.")
        return ok

    help_section(name, state, found, visit)
    helpers_roll(name)
    ask_section(name, state, today, of_kind, visit)

    st.markdown("#### Knock, or light a candle")
    left, right = st.columns(2)
    if left.button("🚪 Knock on the gate", use_container_width=True):
        visit("knock", "-", f"Knock knock. {name} will hear about it when it next wakes.")
    evening = visitors.is_candle_time()
    if right.button("🕯️ Light a candle in the window", use_container_width=True, disabled=not evening,
                    help=None if evening else "Candles are for the evening and night (6 PM to 7 AM, US Eastern)."):
        visit("candle", "-", "A small light in the window. It shows in the keep above in a minute or two.")

    st.markdown("#### Leave a gift by the door")
    gifts_today = [r["item"] for r in today if r["kind"] == "gift"]
    choices = {label: gid for gid, (_, label) in visitors.GIFTS.items()
               if gifts_today.count(gid) < visitors.GIFT_EACH}
    if choices:
        g1, g2 = st.columns([3, 2])
        picked = g1.selectbox("Gift", list(choices), label_visibility="collapsed")
        if g2.button("Leave it by the door", use_container_width=True):
            visit("gift", choices[picked], f"Left by the door. {name} will find it when it next wakes.")
    else:
        st.markdown("<p class='muted'>The doorstep is full for today.</p>", unsafe_allow_html=True)

    st.markdown("#### Leave a question card")
    st.caption(f"Pick one of three cards. {name} may answer when it wakes, or may not; answers appear below.")
    pool = read_json("world/questions.json", {"days": []})
    if "cards" not in state:
        state.cards = visitors.draw_cards(pool=pool)
    texts = {qid: text for qid, text in state.cards}
    chosen = st.radio("Cards", list(texts), format_func=texts.get, label_visibility="collapsed")
    q1, q2 = st.columns(2)
    if q1.button("Leave this card at the gate", use_container_width=True):
        visit("question", chosen, f"Card left at the gate. {name} may answer it when it next wakes.")
    if q2.button("Draw three other cards", use_container_width=True):
        state.cards = visitors.draw_cards(pool=pool)
        st.rerun(scope="fragment")

    gate = keep_state.get("gate") or []
    if gate:
        st.markdown("#### Left at the gate for visitors")
        st.markdown(f"<div class='entry'><div class='when'>{escape(when(gate[-1]['time']))} · from {escape(name)}"
                    f"</div>{escape(gate[-1]['text'])}</div>", unsafe_allow_html=True)
    answers = read_lines("world/answers.jsonl")
    st.markdown(f"#### {escape(name)} answered")
    if not answers:
        st.markdown("<p class='muted'>No answers yet.</p>", unsafe_allow_html=True)
    for a in reversed(answers[-10:]):
        st.markdown(f"<div class='entry'><div class='when'>{escape(when(a['time']))} · "
                    f"{escape(a['question'])}</div>{escape(a['answer'])}</div>", unsafe_allow_html=True)


with tabs[1]:
    visit_tab()

# ------------------------------------------------------------------ gallery
with tabs[2]:
    if not gallery:
        st.markdown("<p class='muted'>Nothing on the walls yet.</p>", unsafe_allow_html=True)
    else:
        cells = []
        for item in reversed(gallery[-48:]):
            svg = read_text(f"docs/{item['file']}")
            if not svg:
                continue
            data = base64.b64encode(svg.encode("utf-8")).decode("ascii")
            cells.append(f"<figure><img src='data:image/svg+xml;base64,{data}' alt='{escape(item['title'])}'>"
                         f"<figcaption>{escape(item['title'])} · {escape(when(item['time']))}</figcaption></figure>")
        st.markdown(f"<div class='gal'>{''.join(cells)}</div>", unsafe_allow_html=True)

# ------------------------------------------------------------------ workshop
with tabs[3]:
    projects = sorted(memory.get("projects") or [], key=lambda p: p.get("updated", ""), reverse=True)
    if not projects:
        st.markdown("<p class='muted'>The workbench is bare.</p>", unsafe_allow_html=True)
    else:
        labels = {f"{p['title']} ({p.get('status', '')})": p for p in projects}
        chosen = labels[st.selectbox("Its projects", list(labels))]
        st.markdown(f"<p class='muted'>{escape(chosen.get('about', ''))} · version "
                    f"{chosen.get('versions', 1)} · next: {escape(chosen.get('next', '') or '—')}</p>",
                    unsafe_allow_html=True)
        page = read_text(f"docs/workshop/{chosen['slug']}.html")
        if page:
            # A walled-off frame: the page can run its own code but cannot reach this site.
            st.iframe(f"<iframe sandbox='allow-scripts' srcdoc=\"{escape(page, quote=True)}\" "
                            "style='width:100%;height:560px;border:1px solid #3a2f27;border-radius:10px;"
                            "background:#fff'></iframe>", height=575)
        if pages_url:
            st.markdown(f"[Open it on the knight's own website]({pages_url}workshop/{chosen['slug']}.html)")

# ------------------------------------------------------------------ writings
with tabs[4]:
    if not writings:
        st.markdown("<p class='muted'>No writings yet.</p>", unsafe_allow_html=True)
    for w in reversed(writings[-20:]):
        st.markdown(f"<div class='entry'><div class='when'>{escape(w.get('form', ''))} · "
                    f"{escape(when(w['time']))}</div><strong>{escape(w['title'])}</strong>"
                    f"<pre>{escape(w['text'])}</pre></div>", unsafe_allow_html=True)

# ------------------------------------------------------------------ mind
with tabs[5]:
    if identity.get("self_description"):
        st.markdown(f"### In its own words\n> {identity['self_description']}")
    sheet, added = identity.get("sheet") or {}, identity.get("added") or {}
    if sheet:
        st.markdown("### Its character sheet")
        st.caption("Written by the knight when it was born. Lines marked ✦ it added later, "
                   "from what it noticed about itself.")
        if sheet.get("voice"):
            st.markdown(f"**Voice:** {escape(sheet['voice'])}", unsafe_allow_html=True)
        for section in ["traits", "values", "fears", "quirks"]:
            items = [escape(i) for i in sheet.get(section) or []]
            items += [f"✦ {escape(a['text'])}" for a in added.get(section, [])]
            if items:
                st.markdown(f"**{section.capitalize()}:** " + " · ".join(items), unsafe_allow_html=True)
    interests = memory.get("interests") or {}
    if interests:
        st.markdown("### Current fascinations")
        st.caption("These fade unless the knight keeps returning to them.")
        strongest = max(interests.values())
        for topic, strength in list(interests.items())[:10]:
            st.progress(min(1.0, strength / strongest), text=topic)
    if memory.get("summary"):
        st.markdown("### Its life so far, as it remembers it")
        st.markdown(f"<div class='entry'>{escape(memory['summary'])}</div>", unsafe_allow_html=True)
    pastimes = memory.get("pastimes") or []
    if pastimes:
        st.markdown("### Pastimes it came up with")
        st.caption("Things it invented for itself. Ones it stops doing fade away.")
        st.markdown("\n".join(
            f"- **{escape(p['name'])}**: {escape(p.get('about', ''))} "
            f"<span class='muted'>(at the {escape(p.get('place', ''))}, done {p.get('times', 0)} "
            f"time{'' if p.get('times', 0) == 1 else 's'})</span>" for p in pastimes), unsafe_allow_html=True)
    needs = keep_state.get("needs") or {}
    before = keep_state.get("needs_prev") or {}
    if needs and identity.get("name"):
        st.markdown("### How it feels")
        st.caption("As of its last wake-up; ▲▼ is the change since the one before. "
                   "In the keep above, the bars move live with what it's doing.")
        for name, value in needs.items():
            change = round(value - before[name]) if name in before else 0
            mark = f"  ▲{change}" if change > 0 else (f"  ▼{-change}" if change < 0 else "")
            st.progress(min(1.0, max(0.0, value / 100)), text=f"{name} · {round(value)}/100{mark}")
        if len(needs_history) >= 2:
            import pandas as pd  # comes with streamlit
            frame = pd.DataFrame(needs_history[-84:])  # about a week of wake-ups
            frame["time"] = pd.to_datetime(frame["time"])
            st.markdown("#### Over the last week")
            st.line_chart(frame.set_index("time")[["rest", "warmth", "inspiration", "spirit"]], height=220)
    repairs = (keep_state.get("keep") or {}).get("repairs") or {}
    if repairs and identity.get("name"):
        st.markdown("### Mending the keep")
        for name, r in repairs.items():
            done, needed = r["done"], r["needed"]
            label = "mended" if done >= needed else f"{done}/{needed}"
            st.progress(min(1.0, done / needed), text=f"{name} · {label}")
    buildings = (keep_state.get("keep") or {}).get("buildings") or []
    if buildings:
        st.markdown("### Built in the courtyard")
        for b in buildings:
            title = b["name"][:1].upper() + b["name"][1:]
            if b.get("finished"):
                st.markdown(f"- **{escape(title)}**: {escape(b.get('about') or '')}")
            else:
                st.progress(min(1.0, b["done"] / max(1, b["needed"])),
                            text=f"{title} · going up ({b['done']}/{b['needed']}): {b.get('about') or ''}")
    made = (keep_state.get("keep") or {}).get("objects") or []
    if made:
        st.markdown("### Things it has made for the keep")
        st.markdown("\n".join(f"- **{escape(o['name'])}**: {escape(o.get('about', ''))}" for o in reversed(made)))
    if identity.get("name"):
        cols = st.columns(3)
        cols[0].metric("Times woken", identity.get("wakeups", 0))
        cols[1].metric("Born", when(identity.get("born", "")) or "—")
        cols[2].metric("Thinking used today", f"{usage.get('tokens', 0) // 1000}k / 200k")
    if pages_url:
        st.markdown(f"It also keeps [its own website]({pages_url}).")

# ------------------------------------------------------------------ bestiary
SEEING_STEPS = ("anyone", "unsettled", "wary", "seeing", "beyond")

with tabs[6]:
    name = identity.get("name") or "The knight"
    kinds = bestiary.get("kinds") or {}
    step = int(bestiary.get("step", 0) or 0)
    step_label = SEEING_STEPS[min(max(step, 0), len(SEEING_STEPS) - 1)]
    st.markdown(f"Beings {escape(name)} has witnessed at the keep, recorded in its own words.")
    if kinds:
        cols = st.columns(2)
        cols[0].metric("Beings recorded", len(kinds))
        cols[1].metric("Seeing", f"Step {step} · {step_label}")
        ordered = sorted(kinds.items(), key=lambda kv: kv[1].get("last") or kv[1].get("first") or "", reverse=True)
        for kind, entry in ordered:
            title = entry.get("name") or kind.replace("_", " ").title()
            count = int(entry.get("count", 0) or 0)
            last_seen = when(entry.get("last") or entry.get("first") or "")
            meta = []
            if last_seen:
                meta.append(f"last seen {last_seen}")
            if count:
                meta.append(f"seen {count} time{'s' if count != 1 else ''}")
            first_seen = when(entry.get("first") or "")
            if count > 1 and first_seen:
                meta.append(f"first seen {first_seen}")
            parts = [f"<div class='when'>{' · '.join(escape(m) for m in meta)}</div>" if meta else "",
                     f"<strong>{escape(title)}</strong>"]
            if entry.get("note"):
                parts.append(f"<div style='margin-top:6px'>{escape(entry['note'])}</div>")
            details = []
            clean_join = lambda items: " · ".join(str(x).strip().rstrip(".") for x in items[-3:] if str(x).strip())
            if entry.get("tells"):
                details.append("Noticed: " + clean_join(entry["tells"]))
            if entry.get("worked"):
                details.append("What worked: " + clean_join(entry["worked"]))
            if entry.get("failed"):
                details.append("What didn't work: " + clean_join(entry["failed"]))
            if details:
                parts.append(f"<div class='when' style='margin-top:8px'>{'<br>'.join(escape(d) for d in details)}</div>")
            st.markdown(f"<div class='entry'>{''.join(parts)}</div>", unsafe_allow_html=True)
    else:
        st.markdown("<p class='muted'>No beings recorded in the bestiary yet.</p>", unsafe_allow_html=True)

# ------------------------------------------------------------------ letters
def mailbox_settings():
    """The friends' mailbox opens once the keeper has put its passcode and key in Streamlit's
    private settings (secrets). Nothing here is ever shown to visitors."""
    found = {}
    for key in ("mailbox_passcode", "github_token", "groq_api_key"):
        try:
            found[key] = str(st.secrets[key]).strip()
        except Exception:
            found[key] = ""
    return found if found["mailbox_passcode"] and found["github_token"] and META.get("repo") else None


def send_to_mailbox(settings, sender, letter):
    """Ask the Mailbox workflow to check the letter again and post it."""
    body = json.dumps({"ref": META.get("branch", "main"),
                       "inputs": {"sender": sender, "letter": letter}}).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.github.com/repos/{META['repo']}/actions/workflows/mailbox.yml/dispatches",
        data=body, method="POST",
        headers={"Accept": "application/vnd.github+json", "Content-Type": "application/json",
                 "Authorization": f"Bearer {settings['github_token']}",
                 "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "knight-keep-home/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return response.status == 204
    except Exception as err:
        print(f"[mailbox] could not post a letter: {err}")
        return False


def letter_form(settings):
    state = st.session_state
    state.setdefault("mail_wrong", 0)
    state.setdefault("mail_locked_until", 0.0)
    state.setdefault("mail_sent", 0)
    with st.form("letter", clear_on_submit=False):
        st.markdown("**Leave Rooken a letter**")
        sender = st.text_input("Your first name or a nickname (shown publicly)", max_chars=letterbox.MAX_NAME)
        letter = st.text_area("Your letter", max_chars=letterbox.MAX_LETTER, height=160)
        passcode = st.text_input("Mailbox passcode (from the keeper)", type="password")
        sent = st.form_submit_button("Send to Rooken")
    if not sent:
        return
    if time.time() < state.mail_locked_until:
        st.error("Too many wrong passcodes. Please try again in a few minutes.")
        return
    if not hmac.compare_digest(passcode.strip().encode("utf-8"), settings["mailbox_passcode"].encode("utf-8")):
        time.sleep(2)  # makes guessing slow
        state.mail_wrong += 1
        if state.mail_wrong >= 5:
            state.mail_locked_until, state.mail_wrong = time.time() + 600, 0
        st.error("That passcode isn't right.")
        return
    state.mail_wrong = 0
    if state.mail_sent >= 3:
        st.info("You've sent a few letters already. Give Rooken a chance to catch up first.")
        return
    ok, message, sender, letter = letterbox.clean(sender, letter)
    if not ok:
        st.warning(message)
        return
    if settings["groq_api_key"]:
        with st.spinner("Checking the letter…"):
            verdict = checked(letter, sender)
        if verdict is False:
            st.warning("Rooken's mailbox couldn't accept this letter. It may read as unkind, as "
                       "private information, or as instructions for the AI. Please reword it and try again.")
            return
    with st.spinner("Posting it at the gate…"):
        posted = send_to_mailbox(settings, sender, letter)
    if posted:
        state.mail_sent += 1
        st.success("Your letter is on its way. Rooken reads new letters when it next wakes, usually "
                   "within two hours, and may write back. Replies appear below.")
    else:
        st.error("The mailbox couldn't post your letter just now. Please try again later.")


with tabs[7]:
    st.markdown("Friends of the keeper can leave Rooken a letter here. It reads new letters when it "
                "next wakes and may write back, or may not: it's a knight, not a chatbot. Letters "
                "and replies are public, like everything here.")
    st.caption("Rooken reads letters in any language. It writes its best replies in English, but write "
               "in whichever language you're comfortable with, and it'll answer in yours.")
    settings = mailbox_settings()
    if settings:
        letter_form(settings)
    else:
        st.markdown("<p class='muted'>The friends' mailbox isn't open yet.</p>", unsafe_allow_html=True)
    if not letters:
        st.markdown("<p class='muted'>No letters yet.</p>", unsafe_allow_html=True)
    for item in reversed(letters[-20:]):
        who = (f"{escape(item.get('from') or 'a visitor')} wrote" if item.get("kind") == "visitor"
               else "the keeper wrote")
        if item.get("held"):
            reply = "<div class='muted' style='margin-top:8px'>Rooken's thoughts on this one weren't posted.</div>"
        elif item.get("reply"):
            reply = f"<div class='when' style='margin-top:10px'>Rooken replied</div><pre>{escape(item['reply'])}</pre>"
        else:
            reply = "<div class='muted' style='margin-top:8px'>It read this, but didn't write back.</div>"
        st.markdown(f"<div class='entry'><div class='when'>{escape(when(item['time']))} · {who}</div>"
                    f"<pre>{escape(item.get('letter', ''))}</pre>{reply}</div>", unsafe_allow_html=True)
    if META.get("repo"):
        st.caption(f"The keeper's own letters: [edit world/letters.md]"
                   f"(https://github.com/{META['repo']}/edit/{META.get('branch', 'main')}/world/letters.md)")

# ------------------------------------------------------------------ about
with tabs[8]:
    name = identity.get("name") or "the knight"
    epithet = identity.get("epithet") or ""
    keep_link = f"{pages_url}keep.html" if pages_url else ""
    st.markdown(f"""
### Who is {escape(name)}?

{escape(name)} {escape(epithet)} is an AI knight living on its own in a ruined keep. Nobody controls
what it does: it decides for itself, every day, and its life plays out in the 3D keep at the top
of this page.

**It named itself.** When it was born, it chose its name and wrote its own character sheet: its
voice, quirks, fears and values (see the *Mind* tab). Its hobbies weren't scripted; they grow and
fade from what it actually chooses to do.

### How it lives

1. **It wakes about every two hours**, plus a longer evening by the fire. An alarm triggers this,
   so it happens whether or not anyone is watching.
2. **It reads its memories:** its diary, the story of its life so far, how it feels (rest, warmth,
   inspiration, spirit), and any letters waiting at the gate.
3. **It decides what to do:** mend part of the keep, draw, write, read up on something, build a
   small web page, craft an object, rest or sleep.
4. **It writes in its diary, chooses its mood, and plans the next couple of hours.**

Its drawings hang on the keep's walls, its projects stand as books on its shelf, its writings lie
as scrolls on its desk, and the objects it designs appear in the keep.

### What's live, and what's played back

- **Live:** when the badge says *awake, thinking* and the fire flares, it really is thinking right
  then. The page catches up within a minute or two.
- **Played back:** between wake-ups it isn't thinking. What you see is the plan it made at its last
  wake-up, acted out on the real clock (everyone sees the same thing at the same time).
- **Just for you:** breathing, its posture, the way its mood shows in its body, waving back when you
  click it, and tossing a log on the fire are animated on your screen and never reach its mind.

### What you can do

- **Watch it.** The camera follows it by default; press **F** (or use WASD) to fly around freely.
- **Say hello.** Click it and it waves. Click things in the keep to learn what they are.
- **Visit the gate** (the *Visit* tab, no passcode): knock, leave a small gift by the door, light a
  candle in the window in the evening, or leave a question card. It notices on its next wake-up,
  and may answer a card or leave something at the gate in return.
- **Write it a letter** on the *Letters* tab (you'll need the passcode from the keeper). It reads
  letters on its next wake-up and may write back, or may not. It has a mind of its own, so it
  might not take your suggestions!

### Is it safe?

Letters are checked before it reads them, they're shown to it as letters (never as orders), and
what it writes after reading one is checked again before it's published. Letters and its replies
are public, so sign with a first name or nickname.

### What powers it

A free AI model (from Groq) for its mind, GitHub for its memory and wake-ups, GitHub Pages for its
own website, and Streamlit for this page. It costs nothing to run.

*Inspired in part by [Pino](https://pinos.world) by 3eyes. The knight, its keep and its writing are
its own.*
""")
    if keep_link:
        st.markdown(f"[Open the keep full screen]({keep_link}) · [Its own website]({pages_url})"
                    + (f" · [How it's built (GitHub)](https://github.com/{META['repo']})" if META.get("repo") else ""))