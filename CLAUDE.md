# Notes for Claude

The Keep: an autonomous AI knight (it named itself **Rooken of the Broken Shelf**) that lives
in this repo. See README.md for how it works. These notes are what a new Claude session needs
to pick up the work.

## Ground rules from the owner

- **Give thoughts first, wait for a go-ahead** before changing code.
- **Keep it free**: GitHub Actions (public repo), Groq free tier, GitHub Pages, Streamlit
  Community Cloud. Nothing that costs money or needs new accounts.
- **Never change who Rooken is**: its character sheet (`world/identity.json`) is locked by
  design, and its memories (`world/`) are its own. Code changes may shape *how* it is guided,
  never rewrite its identity or history.
- Its writing should sound like **a person talking to a friend who knows the keep** (its own
  stated voice), not like a fantasy narrator, and not bland either.

## Before working

- `git pull` first: the knight commits to `main` on its own every couple of hours.
- Practice wake-up (no AI, no internet, no commits, doesn't touch real memories):
  copy `world/` and `docs/` into a scratch folder, then
  `KNIGHT_PRACTICE=1 KNIGHT_ROUND_PAUSE=0 KNIGHT_ROOT=<scratch> py brain/knight.py --fake`
  (PowerShell: set each with `$env:NAME = "value"` first). Also `py brain/selftest.py`.
- The workflow runs that same practice wake-up before every real one and skips the real one
  if it fails.

## Checking on a new diary entry

The newest entries are at the end of `world/recent.json` (or, without a clone,
https://sgizabi.github.io/Knight-friend/data/world/recent.json). Read the last few and judge:

- **Too literary** (the AI model's own habit): objects acting like people ("the fire popped,
  as if approving"), light/dust/sound for mood, ending on a neat image, polished phrasing.
- **Too bland** (the risk of over-correcting): a plain report with no opinion, humour or
  personality ("I cleared the slab. The courtyard is now accessible.").
- **Target**: plain words with a person behind them, e.g. "Got the last slab out of the
  doorway. Took three days and most of my back. It's mostly weeds out there, but it's my weeds."

Knobs, all in `brain/knight.py`: the diary instructions and tone samples in `reflect()`,
`DIARY_TEMPERATURE` (0.7), and the house style in `SEED`. Old entries are fed back as
context, so a change takes a few wake-ups to settle in. Report findings to the owner and
propose changes; don't change things unasked.

## Other things to keep an eye on

- **Wake-ups**: Actions tab should show check-ins at :07/:27/:47 (quick, mostly "not due")
  and a real wake-up about every 2 hours, plus a long evening session ~9:40 PM US Eastern.
- **Needs**: tuned in `NEED_RATES` and friends at the top of the needs section of
  `brain/life.py`; the Mind tab's chart shows whether they move enough.
- **Pastimes** it invents live in `world/memory.json` (`pastimes`); letters in
  `world/letters.jsonl`.
- **Home page** (Streamlit) reads the knight's data from GitHub Pages; the line under the
  keep says where it read from. After a change to `streamlit_app.py` or `docs/keep.html`,
  Streamlit sometimes needs **Manage app → Reboot app** to pick it up.
