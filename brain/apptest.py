"""Runs the home page for real, on a throwaway copy, and sends a letter and a written answer
through it, with Groq and GitHub faked (nothing is spent or posted). It catches the page and
the knight's code drifting apart, including the page holding on to brain code from before an
update. Needs streamlit installed.  Run: py brain/apptest.py   (also runs on GitHub on push)"""

import io
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
T = Path(tempfile.mkdtemp(prefix="keep-apptest-"))
for part in ("world", "docs", "brain"):
    shutil.copytree(REPO / part, T / part, ignore=shutil.ignore_patterns("__pycache__"))
shutil.copy(REPO / "streamlit_app.py", T / "streamlit_app.py")
os.environ["KNIGHT_ROOT"] = str(T)
# a question of its own with no options, so the written-answer form shows
(T / "world" / "asks.json").write_text(json.dumps({"current": {
    "id": "a202601010900", "time": "2026-01-01T09:00:00+00:00", "text": "What should I build first?",
    "options": [], "tally": {}, "said": []}, "past": []}), encoding="utf-8")
# a hostile being at the keep right now, so the "help drive it off" form shows
import datetime as _dt  # noqa: E402
_now = _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0)
HOSTILE = {"id": "ashwolves-209901010000", "kind": "ashwolves", "start": (_now - _dt.timedelta(minutes=5)).isoformat(),
           "end": (_now + _dt.timedelta(minutes=40)).isoformat(), "nature": "hostile", "help": 0, "help_full": 5, "help_open": True}
_state = json.loads((T / "docs" / "data" / "state.json").read_text(encoding="utf-8"))
_state["creatures"] = {"current": [HOSTILE], "seeing": 0, "traces": []}
(T / "docs" / "data" / "state.json").write_text(json.dumps(_state), encoding="utf-8")

calls = []
sent = []


class _Reply(io.BytesIO):
    status = 204
    headers = {}

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def fake_urlopen(request, timeout=0):
    url = getattr(request, "full_url", request)
    calls.append(url)
    if getattr(request, "data", None):
        sent.append(request.data.decode("utf-8", "replace"))
    if "groq.com" in url:
        return _Reply(json.dumps({"choices": [{"message": {"content": "ALLOW - fine"}, "finish_reason": "stop"}],
                                  "usage": {"total_tokens": 10}}).encode())
    if "api.github.com" in url and getattr(request, "method", "GET") == "GET":
        return _Reply(json.dumps({"workflow_runs": []}).encode())
    return _Reply(b"")


urllib.request.urlopen = fake_urlopen
from streamlit.testing.v1 import AppTest  # noqa: E402

# 1. a page that has been up a while: brain code loaded, then an update lands underneath
sys.path.insert(0, str(T / "brain"))
import llm  # noqa: E402
brain_before_update = llm.Brain
time.sleep(1.1)
for name in ("llm.py", "letterbox.py", "visitors.py"):
    path = T / "brain" / name
    path.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")   # same code, newer file

at = AppTest.from_file(str(T / "streamlit_app.py"), default_timeout=90)
at.secrets["mailbox_passcode"] = "test passcode"
at.secrets["github_token"] = "test-token"
at.secrets["groq_api_key"] = "test-key"
at.run()
assert not at.exception, at.exception
assert sys.modules["llm"].Brain is not brain_before_update, "the page kept brain code from before the update"

# 2. a letter, all the way to the mailbox
fields = {w.label: w for w in at.text_input}
fields["Your first name or a nickname (shown publicly)"].input("Tester")
at.text_area[0].input("Hello Rooken, how is the wall coming along?")
fields["Mailbox passcode (from the keeper)"].input("test passcode")
next(b for b in at.button if b.label == "Send to Rooken").click()
at.run()
assert not at.exception, at.exception
assert any("on its way" in m.value for m in at.success), [m.value for m in at.error] + [m.value for m in at.warning]
assert any(c.endswith("/mailbox.yml/dispatches") for c in calls), calls

# 3. a written answer to its question, all the way to the gate
fields = {w.label: w for w in at.text_input}
fields["Your answer"].input("The woodshed, so the fire stays happy.")
next(b for b in at.button if b.label == "Leave your answer").click()
at.run()
assert not at.exception, at.exception
assert any(c.endswith("/visit.yml/dispatches") for c in calls), calls
assert sum("groq.com" in c for c in calls) >= 2, "the letter and the answer should both have been checked"

# 4. helping drive off a hostile being, with a name to be remembered by
fields = {w.label: w for w in at.text_input}
fields["A name to be remembered by (optional)"].input("Kitty")
next(b for b in at.button if b.label == "📣 Help drive it off").click()
at.run()
assert not at.exception, at.exception
helps = [b for b in sent if '"kind": "help"' in b]
assert helps and HOSTILE["id"] in helps[-1] and helps[-1].rstrip('"}').endswith(":Kitty"), helps
at.run()
assert any("helped with this one" in c.value for c in at.caption), "a second help from the same visit should not be offered"
shutil.rmtree(T, ignore_errors=True)
print("home page checks passed")
