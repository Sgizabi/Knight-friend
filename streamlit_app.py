"""The knight's home page. It only reads; the knight lives in the GitHub job."""

import base64
import datetime as dt
import json
import os
import urllib.request
from html import escape
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

APP = Path(__file__).resolve().parent
ROOT = Path(os.environ.get("KNIGHT_ROOT", APP))

st.set_page_config(page_title="The Keep", page_icon="🔥", layout="centered")

st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=VT323&family=EB+Garamond:ital@0;1&display=swap');
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
RAW = (f"https://raw.githubusercontent.com/{META['repo']}/{META.get('branch', 'main')}"
       if META.get("repo") and "KNIGHT_ROOT" not in os.environ else "")


@st.cache_data(ttl=120, show_spinner=False)
def read_text(rel):
    """Fresh from GitHub when deployed (the knight commits there), else from disk."""
    if RAW:
        try:
            with urllib.request.urlopen(f"{RAW}/{rel}", timeout=10) as response:
                return response.read().decode("utf-8")
        except Exception:
            pass
    path = ROOT / rel
    return path.read_text(encoding="utf-8") if path.exists() else None


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
    if hours < 1:
        return "just now"
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
replies = read_lines("world/replies.jsonl")
pages_url = ""
if META.get("repo"):
    owner, repo = META["repo"].split("/", 1)
    pages_url = f"https://{owner.lower()}.github.io/{repo}/"

# ------------------------------------------------------------------ the keep, in 3D
# The same page the knight's website serves, with its current state handed in directly.
# It keeps itself up to date by re-reading the knight's state from GitHub every two minutes.
keep_state = read_json("docs/data/state.json", {})
svgs = {g["file"]: read_text(f"docs/{g['file']}") or "" for g in keep_state.get("gallery", [])}
keep_page = (APP / "docs" / "keep.html").read_text(encoding="utf-8")
payload = json.dumps({"state": keep_state, "svgs": svgs, "asset_base": f"{RAW}/docs/" if RAW else None})
components.html(keep_page.replace("__DATA__", payload.replace("</", "<\\/")), height=600)
if pages_url:
    st.markdown(f"<p class='muted' style='text-align:center'>Click the keep to use the keyboard · "
                f"<a href='{pages_url}keep.html' target='_blank'>open it full screen</a></p>", unsafe_allow_html=True)

tabs = st.tabs(["Diary", "Gallery", "Workshop", "Writings", "Mind", "Letters"])

# ------------------------------------------------------------------ diary
with tabs[0]:
    if not diary:
        st.markdown("<p class='muted'>The diary is empty.</p>", unsafe_allow_html=True)
    for entry in reversed(diary[-25:]):
        st.markdown(
            f"<div class='entry'><div class='when'>{escape(when(entry['time']))} · "
            f"{escape(entry.get('activity', ''))} · <span class='mood'>{escape(entry.get('mood', ''))}"
            f"</span></div>{escape(entry['text'])}</div>", unsafe_allow_html=True)

# ------------------------------------------------------------------ gallery
with tabs[1]:
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
with tabs[2]:
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
            components.html(f"<iframe sandbox='allow-scripts' srcdoc=\"{escape(page, quote=True)}\" "
                            "style='width:100%;height:560px;border:1px solid #3a2f27;border-radius:10px;"
                            "background:#fff'></iframe>", height=575)
        if pages_url:
            st.markdown(f"[Open it on the knight's own website]({pages_url}workshop/{chosen['slug']}.html)")

# ------------------------------------------------------------------ writings
with tabs[3]:
    if not writings:
        st.markdown("<p class='muted'>No writings yet.</p>", unsafe_allow_html=True)
    for w in reversed(writings[-20:]):
        st.markdown(f"<div class='entry'><div class='when'>{escape(w.get('form', ''))} · "
                    f"{escape(when(w['time']))}</div><strong>{escape(w['title'])}</strong>"
                    f"<pre>{escape(w['text'])}</pre></div>", unsafe_allow_html=True)

# ------------------------------------------------------------------ mind
with tabs[4]:
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
    needs = keep_state.get("needs") or {}
    if needs and identity.get("name"):
        st.markdown("### How it feels")
        for name, value in needs.items():
            st.progress(min(1.0, max(0.0, value / 100)), text=f"{name} · {round(value)}/100")
    repairs = (keep_state.get("keep") or {}).get("repairs") or {}
    if repairs and identity.get("name"):
        st.markdown("### Mending the keep")
        for name, r in repairs.items():
            done, needed = r["done"], r["needed"]
            label = "mended" if done >= needed else f"{done}/{needed}"
            st.progress(min(1.0, done / needed), text=f"{name} · {label}")
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

# ------------------------------------------------------------------ letters
with tabs[5]:
    st.markdown("You can leave the knight a letter. It reads new letters when it next wakes, "
                "and may write back. Letters are public, like everything here.")
    if META.get("repo"):
        st.markdown(f"[Write a letter (edit `world/letters.md` on GitHub)]"
                    f"(https://github.com/{META['repo']}/edit/{META.get('branch', 'main')}/world/letters.md)")
    for item in reversed(replies[-10:]):
        st.markdown(f"<div class='entry'><div class='when'>{escape(when(item['time']))} · its reply</div>"
                    f"{escape(item['reply'])}</div>", unsafe_allow_html=True)
