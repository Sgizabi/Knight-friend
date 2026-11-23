"""Builds the knight's own little website (docs/, served free by GitHub Pages)."""

import json
from html import escape
from pathlib import Path

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{ --bg:#14110f; --panel:#1f1a17; --ink:#e9e0d2; --dim:#a39886; --ember:#e08a3c; --line:#3a312a; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--ink); font:16px/1.6 Georgia, 'Times New Roman', serif; }}
  main {{ max-width:880px; margin:0 auto; padding:40px 16px 80px; }}
  h1 {{ font-size:2.2rem; margin:0; letter-spacing:.02em; }}
  h1 small {{ display:block; font-size:1rem; color:var(--dim); font-style:italic; font-weight:normal; }}
  h2 {{ color:var(--ember); font-size:1.1rem; text-transform:uppercase; letter-spacing:.12em; margin:44px 0 14px; border-bottom:1px solid var(--line); padding-bottom:6px; }}
  .about {{ color:var(--dim); font-style:italic; max-width:60ch; }}
  .mood {{ display:inline-block; margin-top:14px; padding:2px 12px; border:1px solid var(--line); border-radius:99px; color:var(--ember); font-size:.9rem; }}
  .entry {{ background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px 18px; margin:12px 0; }}
  .entry .when {{ color:var(--dim); font-size:.85rem; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:14px; }}
  figure {{ margin:0; background:var(--panel); border:1px solid var(--line); border-radius:8px; overflow:hidden; }}
  figure img {{ display:block; width:100%; aspect-ratio:4/3; object-fit:contain; background:#0d0b0a; }}
  figcaption {{ padding:8px 10px; font-size:.9rem; color:var(--dim); }}
  a {{ color:var(--ember); }}
  a.visit {{ display:inline-block; margin-top:18px; padding:8px 18px; border:1px solid var(--ember); border-radius:99px; text-decoration:none; }}
  ul.works {{ list-style:none; padding:0; }}
  ul.works li {{ padding:10px 0; border-bottom:1px solid var(--line); }}
  ul.works span {{ color:var(--dim); font-size:.9rem; }}
  pre {{ white-space:pre-wrap; font:inherit; margin:6px 0 0; }}
  footer {{ margin-top:60px; color:var(--dim); font-size:.85rem; }}
</style>
</head>
<body><main>
{body}
<footer>This site is made and kept by an autonomous AI knight. It updates itself as the knight lives.</footer>
</main></body></html>
"""


# What the Streamlit home page reads. A copy goes to docs/data/world/ so GitHub Pages serves
# it: the home page's server can't always reach GitHub's raw-file server, and when it can't
# it falls back to its own copy of the repository, which may be hours old.
MIRRORED = ["identity.json", "memory.json", "plan.json", "status.json", "usage.json",
            "recent.json", "gallery.json", "writings.jsonl", "letters.jsonl", "replies.jsonl",
            "needs_history.jsonl", "bestiary.json"]


def mirror_world(world: Path, docs: Path):
    target = docs / "data" / "world"
    target.mkdir(parents=True, exist_ok=True)
    for name in MIRRORED:
        source = world / name
        if source.exists():
            (target / name).write_bytes(source.read_bytes())


def _lines(path):
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return rows


def _json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def build(world: Path, docs: Path):
    docs.mkdir(parents=True, exist_ok=True)
    (docs / ".nojekyll").write_text("", encoding="utf-8")
    mirror_world(world, docs)
    identity = _json(world / "identity.json", {})
    memory = _json(world / "memory.json", {})
    plan = _json(world / "plan.json", {})
    gallery = _json(world / "gallery.json", [])
    diary = _lines(world / "diary.jsonl")
    writings = _lines(world / "writings.jsonl")

    name = identity.get("name") or "A Sleeping Knight"
    parts = [f"<h1>{escape(name)}<small>{escape(identity.get('epithet', ''))}</small></h1>"]
    if identity.get("self_description"):
        parts.append(f"<p class='about'>{escape(identity['self_description'])}</p>")
    if plan.get("mood"):
        parts.append(f"<span class='mood'>feeling {escape(plan['mood'])}</span>")
    parts.append("<p><a class='visit' href='keep.html'>Visit the keep in 3D →</a></p>")

    projects = memory.get("projects") or []
    if projects:
        parts.append("<h2>The Workshop</h2><ul class='works'>")
        for p in sorted(projects, key=lambda p: p.get("updated", ""), reverse=True):
            parts.append(f"<li><a href='workshop/{escape(p['slug'])}.html'>{escape(p['title'])}</a> "
                         f"<span>— {escape(p.get('about', ''))} ({escape(p.get('status', ''))})</span></li>")
        parts.append("</ul>")

    if gallery:
        parts.append("<h2>The Gallery</h2><div class='grid'>")
        for g in reversed(gallery[-60:]):
            parts.append(f"<figure><img src='{escape(g['file'])}' alt='{escape(g['title'])}' loading='lazy'>"
                         f"<figcaption>{escape(g['title'])}</figcaption></figure>")
        parts.append("</div>")

    if writings:
        parts.append("<h2>Writings</h2>")
        for w in reversed(writings[-12:]):
            parts.append(f"<div class='entry'><strong>{escape(w['title'])}</strong> "
                         f"<span class='when'>{escape(w.get('form', ''))}</span>"
                         f"<pre>{escape(w['text'])}</pre></div>")

    if diary:
        parts.append("<h2>From the Diary</h2>")
        for e in reversed(diary[-8:]):
            parts.append(f"<div class='entry'><div class='when'>{escape(e['time'][:10])} · "
                         f"{escape(e.get('mood', ''))}</div>{escape(e['text'])}</div>")
    else:
        parts.append("<p class='about'>The knight has not yet woken.</p>")

    (docs / "index.html").write_text(PAGE.format(title=escape(name), body="\n".join(parts)),
                                     encoding="utf-8")