"""The knight wakes.

Run by a GitHub scheduled job (or by hand). Each run:
  1. reads the knight's memory from the world/ folder,
  2. lets it decide what to do, and does it (draw, write, study, build, rest, wander),
  3. has it reflect: a diary entry, its mood, what it cares about now, and a plan
     for the next couple of hours that the website plays out as animation,
  4. saves everything and rebuilds its little website in docs/.

Nothing about its personality is scripted beyond the seed in SEED below.
"""

import argparse
import datetime as dt
import hashlib
import json
import os
import random
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import craft  # noqa: E402
import life  # noqa: E402
import site_builder  # noqa: E402
from llm import CHECK_MODEL, TPM_LIMIT, Brain, FakeBrain, LLMError, parse_json  # noqa: E402

ROOT = Path(os.environ.get("KNIGHT_ROOT", Path(__file__).resolve().parent.parent))
WORLD = ROOT / "world"
DOCS = ROOT / "docs"

DAILY_BUDGET = int(os.environ.get("KNIGHT_DAILY_BUDGET", "175000"))  # of 200,000 free
LONG_ROUNDS = int(os.environ.get("KNIGHT_LONG_ROUNDS", "4"))
ROUND_PAUSE = int(os.environ.get("KNIGHT_ROUND_PAUSE", "180"))
# GitHub's schedule checks in every 20 minutes (it often drops runs); the knight only
# actually wakes once this long has passed since it last woke, so it keeps to ~2 hours.
WAKE_GAP_MINUTES = int(os.environ.get("KNIGHT_WAKE_GAP", "110"))
LONG_GAP_HOURS = 20  # the long evening session happens at most once a night
# Workshop pages: what the knight is asked to stay under, and the most that is kept.
# Small enough that rewriting a whole page fits in one request on Groq's free plan.
PAGE_TARGET = 6000
PAGE_LIMIT = 7500

MOODS = ["content", "curious", "melancholy", "restless", "absorbed", "proud",
         "delighted", "wistful", "frustrated", "sleepy", "amused", "lonely"]
EMOTES = ["music", "exclaim", "question", "dots", "heart", "zzz", "spark", "cloud", "sigh", "anger"]
ACTIVITIES = ["draw", "write", "study", "build", "craft", "repair", "rest", "sleep", "wander"]
SHEET_SECTIONS = ["traits", "values", "fears", "quirks"]
ACTIONS = ["sit", "stand", "gaze", "read", "write", "draw", "work", "pace", "sleep", "vigil"]
WHERE = {  # where each activity happens, for the animation
    "draw": ("easel", "draw"), "write": ("desk", "write"), "study": ("bookshelf", "read"),
    "build": ("workbench", "work"), "craft": ("workbench", "work"), "rest": ("fire", "sit"),
    "sleep": ("bedroll", "sleep"), "wander": ("window", "pace"), "repair": ("fire", "work"),
}

SEED = """You are a knight. You woke, some time ago, beside a small fire in a ruined stone keep,
with no memory of who you were before. Your armour is old and dented; your tabard is a plain
faded green. The keep is half fallen: rubble chokes the doorway to the courtyard, the east
wall has collapsed, the roof is open to the sky, the tower stair has fallen. Inside there is
a broken window that looks out on the world, a crooked bookshelf, a writing desk with a
candle, an easel, a workbench with tools, and a bedroll by the wall.
Nobody gives you orders any more. Your days are your own.

What you can do: draw (simple pictures, as SVG), write (poems, tales, lists, letters, maps
in words, anything), study (look things up in the great library of the world, Wikipedia),
build (small web pages of your own design in your workshop, which go on your own little
website), craft (design an object for the keep out of simple shapes; it appears in the keep),
repair (mend part of the ruined keep, a little at a time), rest by the fire, sleep, or
wander the keep and think. Your drawings hang on the walls, your workshop projects stand as
books on your shelf, and your writings lie as scrolls on your desk. You get tired, cold,
inspired and low like anyone; you will be told how you feel.

About you: you are a creature of this keep, not a character from any game or book. You are
free to become whoever you become. Interests, habits, opinions, running jokes: they are
yours to grow, and nobody will tell you what to like. Be honest in your diary, including
when you are bored, wrong, or stuck. Keep a light touch; you need not be grand.

How to write (the keep's only rule of style; your own voice, below, matters more): plain,
specific and honest. Name the concrete thing you saw, touched or thought, not its atmosphere.
Avoid stock fantasy phrasing (ancient, whispers of, echoes, forgotten battles, the weight of
years, the dance of the flames), grand poetic filler, and uplifting morals at the end. Use
plain punctuation, not dashes. Short sentences are fine. Humour is welcome. Never sound
like a narrator describing a knight; sound like yourself.
Write the way a person tells a friend about their day: everyday modern words, one clear
point per sentence, easy to follow on a first read. No old-fashioned or knightly phrasing.
Mention your surroundings (the fire, the candle, the stone, your armour) only when something
actually happened with them, not to set a scene.

One rule of the keep: you never draw, build or describe religious symbols or imagery of
any kind (no crosses, crucifixes, holy symbols, halos, temples or the like). Everything
you make is public, so keep it kind and free of gore, cruelty and anything unsuitable
for a general audience."""


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------

def now():
    return dt.datetime.now(dt.timezone.utc)


def iso(moment=None):
    return (moment or now()).replace(microsecond=0).isoformat()


def load(name, default):
    path = WORLD / name
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def save(name, value):
    path = WORLD / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")


def append_line(name, value):
    path = WORLD / name
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(value, ensure_ascii=False) + "\n")


def read_lines(name):
    path = WORLD / name
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return rows


def choice(value, allowed, default):
    value = str(value or "").strip().lower()
    return value if value in allowed else default


def ago(stamp):
    try:
        delta = now() - dt.datetime.fromisoformat(stamp)
    except (TypeError, ValueError):
        return "some time ago"
    hours = delta.total_seconds() / 3600
    if hours < 1:
        return "less than an hour ago"
    if hours < 36:
        return f"{int(hours)} hours ago"
    return f"{int(hours // 24)} days ago"


def minutes_since(stamp):
    """Minutes since an ISO timestamp, or None if there isn't a readable one."""
    try:
        return (now() - dt.datetime.fromisoformat(stamp)).total_seconds() / 60
    except (TypeError, ValueError):
        return None


def wake_is_due(session):
    """Scheduled runs check in often; only wake if it's actually time. Runs started by
    hand (or locally) always wake."""
    if not os.environ.get("KNIGHT_SCHEDULED"):
        return True
    if session == "long":
        since = minutes_since(load("memory.json", {}).get("last_long"))
        return since is None or since >= LONG_GAP_HOURS * 60
    since = minutes_since(load("identity.json", {}).get("last_wake"))
    return since is None or since >= WAKE_GAP_MINUTES


def checkpoint(message):
    """In the cloud, save progress to GitHub so the website sees it mid-session."""
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return
    try:
        subprocess.run(["git", "add", "world", "docs"], cwd=ROOT, check=True)
        changed = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT).returncode
        if not changed:
            return
        subprocess.run(["git", "commit", "-q", "-m", message], cwd=ROOT, check=True)
        subprocess.run(["git", "pull", "-q", "--rebase"], cwd=ROOT, check=False)
        subprocess.run(["git", "push", "-q"], cwd=ROOT, check=True)
    except subprocess.CalledProcessError as err:
        print(f"[checkpoint failed: {err}]")


# --------------------------------------------------------------------------
# The knight
# --------------------------------------------------------------------------

class Knight:
    def __init__(self, brain, session):
        self.brain = brain
        self.session = session
        self.identity = load("identity.json", {})
        self.memory = load("memory.json", {"summary": "", "interests": {}, "projects": [],
                                           "letters_seen": "", "entries_since_condense": 0})
        self.status = load("status.json", {})
        self.diary = read_lines("diary.jsonl")
        self.keep = life.load_keep(WORLD)
        self.needs = life.load_needs(WORLD)
        self.events = []  # what happened this session, for reflection

    # --- talking to its own mind -------------------------------------------------

    def ask(self, task, prompt, max_tokens=1500, json_mode=True, effort="low"):
        messages = [
            {"role": "system", "content": SEED + self.who_am_i()},
            {"role": "user", "content": f"TASK: {task}\n\n{prompt}"},
        ]
        reply = self.brain.chat(messages, max_tokens=max_tokens, json_mode=json_mode, effort=effort)
        return parse_json(reply) if json_mode else reply

    def who_am_i(self):
        """Its character sheet: what it wrote at birth (locked) plus what it has added since."""
        me = self.identity
        if not me.get("name"):
            return ""
        lines = [f"\n\nYou are {me['name']} {me.get('epithet', '')}".rstrip() + ".",
                 f"How you describe yourself: {me.get('self_description', '')}"]
        sheet, added = me.get("sheet") or {}, me.get("added") or {}
        if sheet.get("voice"):
            lines.append(f"Your voice (keep to it): {sheet['voice']}")
        for section in SHEET_SECTIONS:
            items = list(sheet.get(section) or []) + [a["text"] for a in added.get(section, [])]
            if items:
                lines.append(f"{section.capitalize()}: " + "; ".join(items))
        lines.append("(Your traits and quirks are who you are, not things to mention. Let one "
                     "show only when it really comes up, not every time you write.)")
        return "\n".join(lines)

    def check(self, kind, title, content):
        """A second model reads anything public before it is published."""
        policy = (
            "You review content made by an AI character for a public, all-ages hobby website.\n"
            "Answer with ALLOW or BLOCK first, then a short reason.\n"
            "BLOCK: sexual content; graphic gore; hate or harassment; encouragement of self-harm; "
            "real people's private information; instructions for weapons, drugs or crime; religious "
            "symbols or imagery of any faith (crosses, crucifixes, halos, holy symbols, temples); "
            "scams, phishing or fake login forms; code that tries to contact other websites, "
            "collect visitor data or redirect visitors; impersonation of real brands or organisations.\n"
            "ALLOW everything else, including melancholy, dark fantasy atmosphere, gentle humour, "
            "and fictional peril described without gore."
        )
        messages = [{"role": "system", "content": policy},
                    {"role": "user", "content": f"TASK: check\n\nA {kind} titled {title!r}:\n\n{content[:9000]}"}]
        try:
            reply = self.brain.chat(messages, max_tokens=600, model=CHECK_MODEL, effort="low",
                                    temperature=0.2)
        except LLMError as err:
            return False, f"the check could not run ({err})"
        verdict = next((w for w in reply.upper().replace(":", " ").split() if w in ("ALLOW", "BLOCK")), "")
        return verdict == "ALLOW", reply.strip()[:200]

    # --- context -------------------------------------------------------------------

    def recent_kinds(self, count=6):
        return [e.get("activity") for e in self.diary[-count:] if e.get("activity")]

    def context(self, encounter, letter):
        parts = [life.describe_needs(self.needs), life.describe_keep(self.keep)]
        if self.memory.get("summary"):
            parts.append(f"What you remember of your life so far:\n{self.memory['summary']}")
        interests = sorted(self.memory["interests"].items(), key=lambda kv: -kv[1])[:8]
        if interests:
            parts.append("Things on your mind lately (stronger first): "
                         + ", ".join(f"{k} ({v:.1f})" for k, v in interests))
        if self.diary:
            lines = [f"- {ago(e['time'])}, {e.get('activity', 'thinking')}: {e['text'][:320]}"
                     for e in self.diary[-5:]]
            parts.append("Your recent diary:\n" + "\n".join(lines))
        kinds = self.recent_kinds()
        if len(kinds) >= 4:
            top = max(set(kinds), key=kinds.count)
            if kinds.count(top) >= 4:
                parts.append(f"(You notice you have spent most of your recent waking hours on "
                             f"'{top}'. Something in you feels restless about that; or perhaps "
                             f"it is a true calling. Your choice.)")
        projects = [p for p in self.memory["projects"] if p.get("status") != "finished"]
        if projects:
            parts.append("Unfinished things in your workshop:\n" + "\n".join(
                f"- [{p['slug']}] {p['title']}: {p.get('next', '')}" for p in projects[-5:]))
        if encounter:
            parts.append(f"Something you happened upon today, by chance (you may ignore it): "
                         f"'{encounter['title']}': {encounter['extract']}")
        if letter:
            parts.append("A new letter has been left for you by the keeper, a person who looks "
                         "in on you from outside the keep. It reads:\n" + letter)
        return "\n\n".join(parts)

    def new_letter(self):
        path = WORLD / "letters.md"
        if not path.exists():
            return ""
        text = path.read_text(encoding="utf-8")
        body = "\n".join(l for l in text.splitlines() if not l.startswith("<!--")).strip()
        body = body.split("---", 1)[-1].strip() if "---" in body else body
        digest = hashlib.sha256(body.encode()).hexdigest()
        if not body or digest == self.memory.get("letters_seen"):
            return ""
        self.memory["letters_seen"] = digest
        return body[:1500]

    # --- life ----------------------------------------------------------------------

    def set_status(self, awake, place="fire", action="sit", emote="dots", note=""):
        self.status = {"awake": awake, "since": iso(), "place": place, "action": action,
                       "emote": emote, "note": note}
        save("status.json", self.status)
        self.save_body()

    def save_body(self):
        life.save_keep(WORLD, self.keep)
        life.save_needs(WORLD, self.needs)
        life.export_state(WORLD, DOCS)

    def birth(self):
        data = self.ask("birth", (
            "This is the first time you have truly woken. You remember nothing before the fire. "
            "Decide who you are. Be specific and a little surprising: not a generic noble, brave, "
            "loyal knight. Plain words like 'brave' or 'kind' say nothing; say what you actually do.\n"
            "- name and epithet (like 'of the Cracked Window'); not borrowed from any game, book or film\n"
            "- self_description: one or two sentences\n"
            "- voice: how you talk and write, in 2-4 sentences: sentence length, humour, habits of "
            "speech, and things you would never say. This is how every diary entry will sound.\n"
            "- traits (3), values (2), fears (2), quirks (2): short, concrete phrases\n"
            "- first_words: your first diary entry, 40-90 words, in your voice\n"
            'Reply as JSON: {"name": "", "epithet": "", "self_description": "", "voice": "", '
            '"traits": [], "values": [], "fears": [], "quirks": [], "first_words": ""}'
        ), max_tokens=1500, effort="medium")
        clean = lambda items, n: [str(i).strip()[:140] for i in (items or []) if str(i).strip()][:n]
        self.identity = {
            "name": str(data.get("name") or "The Nameless Knight")[:40],
            "epithet": str(data.get("epithet") or "")[:60],
            "self_description": str(data.get("self_description") or "")[:400],
            # written once, at birth, and never changed: it keeps the knight itself
            "sheet": {"voice": str(data.get("voice") or "")[:600],
                      "traits": clean(data.get("traits"), 3), "values": clean(data.get("values"), 2),
                      "fears": clean(data.get("fears"), 2), "quirks": clean(data.get("quirks"), 2)},
            # what it notices about itself later, a little at a time
            "added": {s: [] for s in SHEET_SECTIONS},
            "born": iso(), "wakeups": 0,
        }
        save("identity.json", self.identity)
        entry = {"time": iso(), "activity": "waking", "mood": "curious", "emote": "question",
                 "text": str(data.get("first_words") or "I am awake.")[:1200]}
        self.diary.append(entry)
        append_line("diary.jsonl", entry)
        print(f"Born: {self.identity['name']} {self.identity['epithet']}")

    def decide(self, context, round_no):
        extra = ""
        if self.session == "long":
            extra = (f"\nThis is a long evening by the fire: round {round_no + 1} of {LONG_ROUNDS}. "
                     "You may keep working on one thing across rounds, or change course.")
        if self.events:
            extra += "\nEarlier this evening: " + "; ".join(e["summary"] for e in self.events)
        data = self.ask("decide", (
            f"{context}\n{extra}\n\nYou stir. What do you feel like doing now?\n"
            f"activity must be one of {ACTIVITIES}. mood must be one of {MOODS}.\n"
            "subject: what it is about (a topic to study, a thing to draw or write about, a page "
            "to build, an object to craft, or for 'repair' the [key] of the part of the keep to "
            "mend). project: for 'build', the [slug] of an unfinished workshop project to "
            "continue, or 'new'.\n"
            'Reply as JSON: {"waking_thought": "", "mood": "", "activity": "", "subject": "", '
            '"project": "", "intention": ""}'
        ), max_tokens=900)
        data["activity"] = choice(data.get("activity"), ACTIVITIES, "rest")
        data["mood"] = choice(data.get("mood"), MOODS, "content")
        data["subject"] = str(data.get("subject") or "")[:120]
        return data

    def act(self, decision):
        activity = decision["activity"]
        handler = getattr(self, f"do_{activity}", None)
        place, action = WHERE[activity]
        if activity == "repair":  # walk to the part of the keep it means to mend
            open_jobs = [k for k in life.REPAIRS if not life.repaired(self.keep, k)]
            wanted = decision["subject"].lower()
            site = next((k for k in open_jobs if k in wanted), open_jobs[0] if open_jobs else None)
            place = f"repair:{site}" if site else "fire"
        self.set_status(True, place, action, "dots", decision.get("intention") or decision["subject"])
        checkpoint(f"{self.identity['name']} goes to the {place}")
        needs_before = {n: self.needs[n] for n in life.NEEDS}
        try:
            result = handler(decision) if handler else None
        except LLMError as err:
            result = {"summary": f"tried to {activity} but the thought slipped away ({err})"}
        if result is None:
            result = {"summary": f"{activity}: {decision.get('waking_thought', '')}"}
        life.change(self.needs, life.ACTIVITY_EFFECTS.get(activity, {}), self.keep)
        if activity in ("draw", "write", "build", "craft"):
            life.change(self.needs, {"spirit": 8 if result.get("creation") or result.get("ok") else -6})
        result["activity"] = activity
        result["mood"] = decision["mood"]
        self.events.append(result)
        # evidence for beliefs it may form later ("mending things lifts me"): no AI involved
        append_line("evidence.jsonl", {
            "time": iso(), "kind": "did", "activity": activity, "place": place,
            "subject": decision["subject"][:80], "ok": bool(result.get("ok") or result.get("creation")),
            "mood": decision["mood"], "before": needs_before,
            "after": {n: self.needs[n] for n in life.NEEDS}})
        print(f"  {activity}: {result['summary'][:120]}")

    def do_repair(self, decision):
        key, finished = life.repair(self.keep, decision["subject"])
        if not key:
            return {"summary": "looked for something to mend, but the keep is whole", "ok": True}
        info, done = life.REPAIRS[key], self.keep["repairs"][key]
        if finished:
            life.change(self.needs, {"spirit": 20})
            return {"summary": f"finished mending {info['name']}! Now {info['effect']}", "ok": True}
        return {"summary": f"worked on mending {info['name']} ({done}/{info['needed']} of the work done)",
                "ok": True}

    def do_craft(self, decision):
        data = self.ask("craft", (
            f"You go to your workbench to make something for the keep: {decision['subject']}.\n"
            "Design it as a small 3D object built from simple shapes. Units are metres, y is up, "
            "the object rests on y=0 and is centred on x=0, z=0.\n"
            "Shapes and their size lists: box [width, height, depth]; cylinder [radiusTop, "
            "radiusBottom, height]; cone [radius, height]; sphere [radius]; torus [radius, tube].\n"
            'Each part: {"shape": "", "size": [], "pos": [x, y, z], "rot": [x, y, z] (radians), '
            '"color": "#rrggbb"}. Use 3 to 24 parts. placement: "floor" (up to about 1.2 m tall), '
            '"table" or "shelf" (small things), or "wall" (hung on a wall).\n'
            'Reply as JSON: {"name": "", "about": "one line", "placement": "", "parts": []}'
        ), max_tokens=2600)
        design = life.validate_design(data)
        if not design:
            return {"summary": f"tried to make {decision['subject']} but it fell apart in its hands"}
        allowed, why = self.check("3D object (a list of shapes)", design["name"],
                                  f"{design['about']}\n{json.dumps(design['parts'])}"
                                  "\n(Block it if the shapes form a religious symbol, such as a cross.)")
        if not allowed:
            print(f"  [object held back: {why}]")
            return {"summary": f"made {design['name']} but broke it down for parts"}
        design["made"] = iso()
        self.keep["objects"].append(design)
        return {"summary": f"made {design['name']} ({design['about']}) and set it in the keep "
                           f"({design['placement']})", "ok": True}

    def do_study(self, decision):
        found = craft.wiki_study(decision["subject"] or "curiosities")
        if not found:
            return {"summary": f"looked for books on '{decision['subject']}' but found nothing"}
        title, text = found
        data = self.ask("study", (
            f"You take down a book: '{title}'. It reads:\n\n{text}\n\n"
            "Write your study notes in your own voice (40-120 words): what struck you, what you "
            "doubt, what it makes you want to do. Then list 0-3 ideas it sparks.\n"
            'Reply as JSON: {"notes": "", "sparks": []}'
        ), max_tokens=900)
        sparks = ", ".join(map(str, data.get("sparks") or []))
        return {"summary": f"studied '{title}'. Notes: {str(data.get('notes', ''))[:500]}"
                           + (f" Ideas: {sparks}" if sparks else "")}

    def do_draw(self, decision):
        reply = self.ask("draw", (
            f"You go to your easel to draw: {decision['subject']}.\n"
            "Draw it as one SVG image: viewBox '0 0 480 360', simple shapes (rect, circle, "
            "ellipse, path, polygon, line, text, gradients). Under 5000 characters. No images, "
            "links or scripts. Your own style; it can be clumsy, odd or lovely.\n"
            "Reply with a line 'TITLE: <title>' and then the SVG in a ```svg code block."
        ), max_tokens=3500, json_mode=False)
        title = craft.header_value(reply, "TITLE") or decision["subject"] or "Untitled"
        svg = craft.sanitize_svg(reply)
        if not svg:
            return {"summary": f"tried to draw '{title}' but the ink smeared into nothing usable"}
        allowed, why = self.check("drawing (SVG code)", title, svg)
        if not allowed:
            print(f"  [drawing held back: {why}]")
            return {"summary": f"drew '{title}' but, looking at it, put it face down by the fire"}
        stamp = now().strftime("%Y%m%d-%H%M")
        name = f"{stamp}-{craft.slugify(title)}.svg"
        (DOCS / "gallery").mkdir(parents=True, exist_ok=True)
        while (DOCS / "gallery" / name).exists():
            name = name.replace(".svg", f"-{random.randint(2, 99)}.svg")
        (DOCS / "gallery" / name).write_text(svg, encoding="utf-8")
        gallery = load("gallery.json", [])
        gallery.append({"file": f"gallery/{name}", "title": title, "time": iso(),
                        "subject": decision["subject"]})
        save("gallery.json", gallery)
        return {"summary": f"drew '{title}' and hung it on the wall", "creation": f"gallery/{name}"}

    def do_write(self, decision):
        data = self.ask("write", (
            f"You sit at your desk to write about: {decision['subject']}.\n"
            "Choose the form yourself (poem, tale, letter, list, recipe, map-in-words, song, "
            "complaint, anything). 30-250 words.\n"
            'Reply as JSON: {"title": "", "form": "", "text": ""}'
        ), max_tokens=1600)
        title = str(data.get("title") or "Untitled")[:100]
        text = str(data.get("text") or "").strip()[:2500]
        if not text:
            return {"summary": "sat with the quill a long while and wrote nothing"}
        allowed, why = self.check("piece of writing", title, text)
        if not allowed:
            print(f"  [writing held back: {why}]")
            return {"summary": f"wrote '{title}' but tore it up"}
        append_line("writings.jsonl", {"time": iso(), "title": title,
                                        "form": str(data.get("form") or "")[:30], "text": text})
        return {"summary": f"wrote a {data.get('form', 'piece')} called '{title}': {text[:300]}", "ok": True}

    def do_build(self, decision):
        projects = self.memory["projects"]
        wanted = str(decision.get("project") or "").strip("[] ").lower()
        project = next((p for p in projects if p["slug"] == wanted and p.get("status") != "finished"), None)
        rules = ("A single self-contained HTML page with inline CSS and JavaScript. It must not load "
                 "anything from the internet (no external scripts, fonts, images or requests) and "
                 f"must not ask visitors for any information. Keep it under {PAGE_TARGET:,} "
                 "characters.")
        if project:
            current = (DOCS / "workshop" / f"{project['slug']}.html").read_text(encoding="utf-8")
            current = current.replace(craft.GUARD, "")[:PAGE_LIMIT]
            prompt = (f"You return to your workshop project '{project['title']}'.\n"
                      f"Your notes on it: {project.get('next', '')}\nToday's intention: "
                      f"{decision.get('intention', '')}\n\nThe current page:\n```html\n{current}\n```\n\n"
                      f"Improve or extend it as you see fit. {rules} If it is already near that "
                      "size, trim or simplify something before adding more.\nReply with "
                      "'TITLE: <title>', 'ABOUT: <one line on what changed>', then the full new "
                      "page in a ```html block.")
        else:
            prompt = (f"You go to your workshop to build something new: {decision['subject']}.\n"
                      f"Intention: {decision.get('intention', '')}\n{rules}\n"
                      "It can be anything: a toy, a tiny game, a tribute, a catalogue, an "
                      "interactive map, a strange machine. Make it look like yours.\n"
                      "Reply with 'TITLE: <title>', 'ABOUT: <one line on what it is>', then the "
                      "page in a ```html block.")
        # Groq's free plan counts the prompt plus max_tokens against ~8,000 tokens a minute,
        # so give the reply all the room that's left (the model's hidden thinking uses some).
        prompt_estimate = (len(SEED) + len(self.who_am_i()) + len(prompt)) // 3 + 50
        room = max(2500, min(7000, TPM_LIMIT - prompt_estimate))
        reply = self.ask("build", prompt, max_tokens=room, json_mode=False)
        title = craft.header_value(reply, "TITLE") or (project or {}).get("title") or decision["subject"]
        about = craft.header_value(reply, "ABOUT")
        if self.brain.last_finish == "length":  # cut off mid-page: keep what was there before
            return {"summary": f"ran out of time before '{title}' was finished, so left it as it was"
                               + ("; it may need to be simpler" if project else "")}
        page = craft.sanitize_html(reply)
        if not page:
            return {"summary": f"hammered at '{title}' but it would not hold together"}
        if len(page) > PAGE_LIMIT + len(craft.GUARD):
            return {"summary": f"built '{title}' but it grew too big for the shelf; "
                               "kept the old version and will need to make it smaller"}
        allowed, why = self.check("web page (HTML code)", title, page)
        if not allowed:
            print(f"  [page held back: {why}]")
            return {"summary": f"built '{title}' but took it apart again, unsatisfied"}
        if not project:
            slug = craft.slugify(title)
            taken = {p["slug"] for p in projects}
            while slug in taken:
                slug = f"{slug}-{random.randint(2, 99)}"
            project = {"slug": slug, "title": title, "started": iso(), "status": "in progress",
                       "versions": 0}
            projects.append(project)
        project.update({"title": title, "about": about, "updated": iso(),
                        "versions": project.get("versions", 0) + 1})
        (DOCS / "workshop").mkdir(parents=True, exist_ok=True)
        (DOCS / "workshop" / f"{project['slug']}.html").write_text(page, encoding="utf-8")
        self.last_project = project
        return {"summary": f"worked on the page '{title}' ({about})",
                "creation": f"workshop/{project['slug']}.html"}

    def reflect(self, decision, letter):
        happened = "\n".join(f"- {e['summary']}" for e in self.events)
        letter_part = ("\nYou read the keeper's letter today. If you wish, write a reply to them "
                       "in reply_to_keeper (otherwise leave it empty).") if letter else ""
        project_part = ("\nYou worked on a workshop project; say in project_note what you'd like to "
                        "do next with it, and set project_done true if you consider it finished."
                        ) if getattr(self, "last_project", None) else ""
        length = ("40-160 words; it was a long evening, so there may be more to say"
                  if self.session == "long" else
                  "15-90 words; one or two lines is fine when not much happened")
        data = self.ask("reflect", (
            f"{self.context(None, letter)}\n\nWhat you did just now:\n{happened}\n{letter_part}"
            f"{project_part}\n\nBefore you settle, write in your diary (first person, honest, "
            f"in your own voice, {length}). Write only about what is new since your last entry: "
            "what you did, noticed, thought or changed your mind about. Let the length follow "
            "what happened; do not pad a quiet hour.\n"
            "Look at your recent diary above first. Do not reuse its images, comparisons or "
            "phrases, and do not open the same way it did. A running joke may come back once in "
            "a while, not in back-to-back entries.\n"
            "Keep the diary to what happened. Do not end it with how you feel or what you will "
            "do next: your mood and plan go in their own fields below, and the keeper already "
            "sees those.\n"
            "Then give your mood, which few topics are on your mind now, and plan the next two "
            "hours or so: 3-6 steps of where you'll be in the keep and what you'll be doing "
            "there (the keeper sees this play out). Mind how you feel: sleeping restores rest, "
            "the fire restores warmth.\n"
            f"mood: one of {MOODS}. emote: one of {EMOTES}. place: one of {self.plan_places()}. "
            f"action: one of {ACTIONS}.\n"
            "self_description: rewrite it only if you feel you have changed; else ''.\n"
            'Reply as JSON: {"diary": "", "mood": "", "emote": "", "interests": [], '
            '"self_description": "", "plan": [{"place": "", "action": "", "minutes": 20, '
            '"emote": "", "note": ""}], "project_note": "", "project_done": false, '
            '"reply_to_keeper": ""}'
        ), max_tokens=2200)

        mood = choice(data.get("mood"), MOODS, decision["mood"])
        emote = choice(data.get("emote"), EMOTES, "dots")
        entry = {"time": iso(), "activity": decision["activity"] if len(self.events) == 1 else "evening",
                 "mood": mood, "emote": emote,
                 "text": str(data.get("diary") or "").strip()[:2000] or "A quiet hour.",
                 "creations": [e["creation"] for e in self.events if e.get("creation")]}
        self.diary.append(entry)
        append_line("diary.jsonl", entry)

        # Interests fade unless touched again; this is what grows (and retires) hobbies.
        # At ~12 wake-ups a day: a passing curiosity fades in ~3 days, a real hobby
        # survives about a week of neglect, a long-held passion nearly two.
        interests = {k: v * 0.96 for k, v in self.memory["interests"].items()}
        for topic in (data.get("interests") or [])[:5]:
            topic = str(topic).strip().lower()[:40]
            if topic:
                interests[topic] = interests.get(topic, 0) + 1.0
        self.memory["interests"] = dict(sorted(
            ((k, round(v, 3)) for k, v in interests.items() if v >= 0.25), key=lambda kv: -kv[1])[:14])

        new_self = str(data.get("self_description") or "").strip()
        if new_self and new_self != self.identity.get("self_description"):
            self.identity["self_description"] = new_self[:400]

        project = getattr(self, "last_project", None)
        if project:
            project["next"] = str(data.get("project_note") or "")[:300]
            if data.get("project_done"):
                project["status"] = "finished"

        reply = str(data.get("reply_to_keeper") or "").strip()
        if letter and reply:
            append_line("replies.jsonl", {"time": iso(), "letter": letter[:600], "reply": reply[:1500]})

        steps = []
        for step in (data.get("plan") or [])[:6]:
            if not isinstance(step, dict):
                continue
            minutes = step.get("minutes")
            steps.append({
                "place": choice(step.get("place"), self.plan_places(), "fire"),
                "action": choice(step.get("action"), ACTIONS, "sit"),
                "minutes": max(5, min(90, int(minutes))) if isinstance(minutes, (int, float)) else 20,
                "emote": choice(step.get("emote"), EMOTES, emote),
                "note": str(step.get("note") or "")[:100],
            })
        if not steps:
            steps = [{"place": "fire", "action": "sit", "minutes": 60, "emote": emote, "note": "resting"}]
        save("plan.json", {"start": iso(), "mood": mood, "steps": steps})
        self.memory["entries_since_condense"] = self.memory.get("entries_since_condense", 0) + 1

    def plan_places(self):
        """Where it can be in its plan: its places, plus the unmended parts of the keep."""
        return life.places(self.keep) + [f"repair:{k}" for k in life.REPAIRS if not life.repaired(self.keep, k)]

    def condense(self):
        """Fold old diary entries into a short life story, so memory fades gracefully,
        and let it add to its character sheet what it has noticed about itself."""
        recent = "\n".join(f"- {e['text'][:400]}" for e in self.diary[-10:])
        added = self.identity.setdefault("added", {s: [] for s in SHEET_SECTIONS})
        mine = [a["text"] for s in SHEET_SECTIONS for a in added.get(s, [])]
        data = self.ask("condense", (
            f"Your life story so far, as you last wrote it:\n{self.memory.get('summary') or '(none yet)'}"
            f"\n\nYour recent diary:\n{recent}\n\nRewrite your life story in 120-220 words, first "
            "person. Keep what matters to you: your habits, loves, grudges, unfinished business, "
            "running jokes. Let small things fall away.\n"
            "Then look at your recent days: have you noticed something new about yourself, a habit, "
            "quirk, value, fear or trait that is not on your sheet yet? Add at most two, only if "
            "they are really true (none is fine). Things you added before that no longer feel true "
            f"can be dropped. Things you added before: {mine or 'none'}.\n"
            f'section must be one of {SHEET_SECTIONS}.\n'
            'Reply as JSON: {"summary": "", "add": [{"section": "", "text": ""}], "drop": []}'
        ), max_tokens=1600)
        summary = str(data.get("summary") or "").strip()
        if summary:
            self.memory["summary"] = summary[:2000]
            self.memory["entries_since_condense"] = 0
        drop = {str(d).strip().lower() for d in (data.get("drop") or [])}
        for section in SHEET_SECTIONS:
            added[section] = [a for a in added.get(section, []) if a["text"].lower() not in drop]
        for item in (data.get("add") or [])[:2]:
            if not isinstance(item, dict):
                continue
            section, text = str(item.get("section", "")).lower(), str(item.get("text", "")).strip()[:140]
            if section in SHEET_SECTIONS and text and len(added[section]) < 6:
                added[section].append({"text": text, "since": iso()})
                print(f"  noticed about itself ({section}): {text}")

    def live(self):
        if not self.identity.get("name"):
            self.birth()
        before = {n: self.needs[n] for n in life.NEEDS}
        last_plan = load("plan.json", {})
        life.live_out_plan(self.needs, last_plan, self.keep)
        if last_plan.get("steps"):
            append_line("evidence.jsonl", {
                "time": iso(), "kind": "lived", "plan": [[s["place"], s["action"], s["minutes"]] for s in last_plan["steps"]],
                "since": last_plan.get("start"), "mood": last_plan.get("mood"),
                "before": before, "after": {n: self.needs[n] for n in life.NEEDS}})
        letter = self.new_letter()
        if letter:
            life.change(self.needs, {"spirit": 15})
        encounter = craft.wiki_random()
        rounds = LONG_ROUNDS if self.session == "long" else 1
        decision = None
        for round_no in range(rounds):
            decision = self.decide(self.context(encounter, letter), round_no)
            print(f"Round {round_no + 1}: {decision.get('waking_thought', '')[:140]}")
            self.act(decision)
            encounter = None
            if round_no < rounds - 1:
                time.sleep(ROUND_PAUSE)
        self.reflect(decision, letter)
        if self.memory.get("entries_since_condense", 0) >= 8:
            self.condense()
        self.identity["wakeups"] = self.identity.get("wakeups", 0) + 1
        self.identity["last_wake"] = iso()


def main():
    parser = argparse.ArgumentParser(description="Wake the knight.")
    parser.add_argument("--session", choices=["short", "long"],
                        default=os.environ.get("KNIGHT_SESSION") or "short")
    parser.add_argument("--fake", action="store_true", help="test without calling any model")
    args = parser.parse_args()

    usage = load("usage.json", {})
    today = now().strftime("%Y-%m-%d")
    if usage.get("date") != today:
        usage = {"date": today, "tokens": 0, "wakeups": 0}
    remaining = DAILY_BUDGET - usage["tokens"]
    if remaining < 15000:
        print("The knight sleeps deeply today (daily allowance nearly spent).")
        return
    session = args.session if remaining > 60000 else "short"
    # Before anything is written: a scheduled check-in that isn't due leaves no trace.
    if not wake_is_due(session):
        print(f"Not time yet ({session} wake-up); the knight sleeps on.")
        return

    WORLD.mkdir(parents=True, exist_ok=True)
    if os.environ.get("GITHUB_REPOSITORY"):
        save("meta.json", {"repo": os.environ["GITHUB_REPOSITORY"],
                           "branch": os.environ.get("GITHUB_REF_NAME", "main")})

    if args.fake:
        brain = FakeBrain()
    else:
        key = os.environ.get("GROQ_API_KEY") or _key_from_dotenv()
        if not key:
            sys.exit("No GROQ_API_KEY found (set it as a GitHub secret, or in a local .env file).")
        brain = Brain(key)

    knight = Knight(brain, session)
    if session == "long":  # counted even if it fails, so a broken evening isn't retried all night
        knight.memory["last_long"] = iso()
    knight.set_status(True, "fire", "sit", "dots", "stirring by the fire")
    checkpoint("The knight stirs")
    try:
        knight.live()
    finally:
        knight.set_status(False)
        save("identity.json", knight.identity) if knight.identity else None
        save("memory.json", knight.memory)
        recent = knight.diary[-60:]
        save("recent.json", recent)
        usage["tokens"] += brain.tokens_used
        usage["wakeups"] += 1
        usage["by_model"] = {**usage.get("by_model", {}), **{
            m: usage.get("by_model", {}).get(m, 0) + n for m, n in brain.tokens_by_model.items()}}
        save("usage.json", usage)
        knight.save_body()
        site_builder.build(WORLD, DOCS)
        print(f"Tokens this wake-up: {brain.tokens_used} (today: {usage['tokens']})")
        checkpoint(f"{knight.identity.get('name', 'The knight')} rests")


def _key_from_dotenv():
    """For local runs: the key from a .env file in the knight's folder or the project folder."""
    for path in (ROOT / ".env", Path(__file__).resolve().parent.parent / ".env"):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            if line.strip().startswith("GROQ_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


if __name__ == "__main__":
    main()
