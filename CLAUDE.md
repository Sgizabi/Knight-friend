# Notes for Claude

The Keep: an autonomous AI knight (it named itself **Rooken of the Broken Shelf**) that lives
in this repo. See README.md for how it works. These notes are what a new Claude session needs
to pick up the work.

## If you built this project in an earlier session: what changed since

On 2026-11-18 a separate session (on the owner's laptop) changed a lot. Anything you remember
about the points below is out of date; the code wins. Details are in the commit messages:
`git log c9744de..HEAD`.

- **Diary voice**: house style asks for everyday modern words; the diary prompt asks for
  what it thought (opinions, small complaints, jokes), names narrator habits to drop
  (objects acting like people, mood lighting/sounds, ending on a neat image), gives three
  tone-only samples, avoids repeating recent images, and keeps mood and plans out of the
  entry. Length follows what happened (15-90 words short, 40-160 long). The reflection runs
  at `DIARY_TEMPERATURE` 0.7. Quirks are "who you are, not things to mention".
- **Schedule**: the workflow checks in at :07/:27/:47; `wake_is_due()` only wakes it when
  `WAKE_GAP_MINUTES` (110) have passed. The evening session has three tries (02:37, 03:17,
  03:57 UTC) and runs once a night (`last_long` in memory.json). Manual runs always wake.
  A not-due check-in makes no AI calls and commits nothing.
- **Safety net**: the workflow runs `--is-due`, then a practice wake-up on a temp copy
  (`KNIGHT_PRACTICE=1`: no internet, no git), and only then the real one.
- **Workshop pages**: target 6,000 chars, hard limit 7,500; `max_tokens` is sized to what's
  left of Groq's ~8k tokens/minute after the prompt; a reply cut off at the limit
  (`brain.last_finish == "length"`) keeps the previous version.
- **Letters**: every letter is logged with its reply (or none) in `world/letters.jsonl`
  (`replies.jsonl` is no longer written); the last 3 exchanges are in context when a new
  letter arrives; the Letters tab shows the conversation.
- **Pastimes**: it can choose `invent` and describe a pastime (name, about, place, action,
  kind). The kind (`PASTIME_KINDS` in life.py) sets the needs effect; max 8; they fade like
  interests. Stored in `memory.json` as `pastimes`.
- **Needs**: `NEED_RATES` table in life.py; warmth drops away from the fire (faster with
  the roof open); spirit settles toward 55 (`SPIRIT_SETTLE_PER_HOUR`); sleep restores some
  inspiration; gains shrink above 60 (`SATURATE_ABOVE`); dozing after the plan restores
  less. `needs.json` keeps `previous` (for the change marks) and history goes to
  `world/needs_history.jsonl`.
- **Home page**: the knight copies what the home page reads into `docs/data/world/`; the
  home page reads from GitHub Pages first (then raw GitHub, then its own copy) and logs
  failures; a line under the keep shows when it last woke and where the data came from.
  The 3D keep re-reads state every minute, never steps back to older state, and moves the
  need bars live using `needs_model` from state.json, with an arrow showing which way each
  is heading. The Mind tab shows the change marks, a needs chart and its pastimes.

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
