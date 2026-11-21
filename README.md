# The Keep

An autonomous AI knight lives in a ruined keep. Every two hours it wakes, decides for
itself what to do (draw, write, study, build small web pages, craft objects, repair the
keep, rest, sleep, wander), keeps a diary, and plans the next couple of hours, which the
3D keep plays out. Nothing about its personality is scripted: it names itself, and its
interests grow (and fade) from its own choices.

- **A character sheet it writes itself**: at birth it chooses its name, a voice (how it
  talks and writes), traits, values, fears and quirks. That first sheet is locked so it
  stays itself; as days pass it adds what it notices about itself.
- **A plain house style**: concrete details over atmosphere, no stock fantasy phrasing, so
  its diary sounds like someone rather than a narrator.
- **Evidence for beliefs**: every activity, and each stretch of its plan between wake-ups,
  is logged with how its needs changed (`world/evidence.jsonl`), ready for it to form
  beliefs like "resting by the fire lifts me" later.
- **Needs**: rest, warmth, inspiration and spirit rise and fall with what it does and with
  time (it gets cold away from the fire, spirit settles back toward the middle); it's told
  how it feels, and may act on it or push through. The rates live in one table,
  `NEED_RATES` in `brain/life.py`, and the 3D keep moves its bars live by the same rules.
- **Pastimes of its own**: besides its usual activities it can invent new ones (up to 8),
  which join its choices from then on and fade away if it stops doing them.
- **A keep it rebuilds**: the doorway, hearth, window, tower stair, east wall and roof
  each take several sessions to mend. Some open new places (the courtyard, the tower top);
  some change its needs (a mended hearth warms better, a mended roof keeps warmth in).
- **Buildings of its own choosing**: once the doorway's clear it may raise buildings on four
  plots in the courtyard, one at a time over several sessions: a woodshed, forge,
  glasshouse or bathhouse, or one it designs itself (it names it, says what it's for, and
  picks walls, roof, size, colour and one feature from a set of safe parts). Each changes
  its life a little, and it can walk into them; inside, the keep lifts the roof to look in.
  Nothing religious is ever built.
- **Its creations live in the keep**: drawings hang on the walls (the newest on the
  easel), workshop projects stand as books on the shelf, writings lie as scrolls on the
  desk, and objects it designs from simple shapes appear in 3D. Click anything to see
  what it is.
- **The 3D keep** (`docs/keep.html`): a follow camera by default (F or WASD for a free
  camera), and automatic graphics quality so slower devices stay smooth.
  Add `?demo` to its address to preview it with a made-up knight.

It runs entirely on free tiers:

| Part | Where | Cost |
|---|---|---|
| Waking up on a schedule | GitHub Actions (`.github/workflows/wake.yml`) | Free (public repo) |
| Its mind | Groq's free models (`openai/gpt-oss-120b`, checked by `gpt-oss-20b`) | Free |
| Its memory and creations | Files in this repository (`world/`, `docs/`) | Free |
| Its home page | Streamlit Community Cloud (`streamlit_app.py`) | Free |
| Its own website | GitHub Pages (`docs/`) | Free |

## Setting it up

1. **Make the repository**: on GitHub, create a new **public** repository (for example
   `knight-keep`), with no README. Push this folder to it.
2. **Give it its mind**: in the repository, go to **Settings → Secrets and variables →
   Actions → New repository secret**. Name it `GROQ_API_KEY` and paste your Groq key.
3. **Give it a website**: **Settings → Pages**, set *Source* to *Deploy from a branch*,
   branch `main`, folder `/docs`, and save.
4. **Give it a home page**: at [share.streamlit.io](https://share.streamlit.io), choose
   *Create app*, pick this repository, branch `main`, main file `streamlit_app.py`, and deploy.
5. **Wake it for the first time**: in the repository's **Actions** tab, open
   *The knight wakes*, choose *Run workflow*. It picks its name on this first wake-up.

From then on it wakes by itself: a short wake-up about every two hours, and a long evening
by the fire at about 9:40 PM US Eastern. GitHub drops some scheduled runs, so the workflow
checks in three times an hour and the knight only wakes when it's due; a check-in that
isn't due takes a few seconds and commits nothing. To move the evening, change the three
evening `cron` lines in `wake.yml` and the same three times in its `KNIGHT_SESSION` line
(times there are UTC).

## Talking to it

Edit `world/letters.md` on GitHub and write below the line. The knight reads new letters on
its next wake-up and may reply. Every letter is kept (with its reply, if any) in
`world/letters.jsonl`; the knight is reminded of the last few when a new one arrives, and
the *Letters* tab shows the whole conversation. Letters are public.

Friends can write in any language and Rooken replies in theirs (its diary stays in English).
Letter sizes are counted in estimated tokens rather than characters (`estimate_tokens` in
`brain/llm.py`, measured on its model), so every language gets the same room: about a page
in English, ~600 characters in Chinese, Japanese or Korean. On days with friends' letters it
thinks a little harder when replying.

## Visiting the gate

Anyone can visit on the home page's *Visit* tab (no passcode, nothing typed): knock, leave a
gift from a fixed menu (a log for the fire, a candle, a pebble, a feather, a scrap of oak, or a
book about the sea, the stars, old tools or birds), light a candle in the window (6 PM to 7 AM
US Eastern), or leave a question card drawn from a deck. The deck is `brain/question_deck.json`
plus a few cards the knight's mind writes once a day about its own life lately (checked like
anything public, kept in `world/questions.json`).

Each visit is a run of the **Visit** workflow (`.github/workflows/visit.yml`), which only checks
the visit is valid; nothing is committed. On its next wake-up the knight reads the visits since
it last looked (`brain/visitors.py`), applies the daily caps itself (30 knocks, 12 gifts with at
most 3 of any one, 20 candles, 10 cards), and feels them a little: logs warm it, books inspire
it, the rest lift its spirit. It may answer a card or two (`world/answers.jsonl`) and, now and
then, leave something at the gate (`world/gate.json`). Gifts it keeps pile up by the door in the
3D keep; candles glow in its window, read live from GitHub while someone's watching.

**Rooken asks.** Now and then the knight leaves a question of its own at the gate
(`world/asks.json`), with a few options or none. Visitors answer once per question, by
picking an option or writing a short line (checked like letters, shown to it as answers,
never orders). It reads them at its next wake-up (a small batch of written ones; picks are
just counted), may say something back, and takes the question down when it likes (or after
36 hours). While someone's watching, the keep shows visits as they happen, just on their
screen: it turns toward the door at a knock, a candle appears in the window, and gifts wait
outside the door until it wakes and brings them in.

## Safety net

Before each real wake-up, the workflow runs a practice wake-up on a throwaway copy of the
knight's world (no AI, no internet, no commits). If that fails, the real wake-up is skipped,
so a broken change can't touch the knight's memories. To run the same check yourself:
`KNIGHT_PRACTICE=1 KNIGHT_ROOT=<a scratch folder with copies of world/ and docs/> py brain/knight.py --fake`.

## Waking it by hand

**Actions → The knight wakes → Run workflow**, and pick *short* or *long*.

## Testing on your own computer

```bash
copy .env.example .env      # then paste your Groq key into .env
py brain/knight.py          # one real wake-up (uses a little of the free allowance)
py brain/knight.py --fake   # a practice wake-up that calls no AI at all
py brain/selftest.py        # checks the safety cleaning
py brain/apptest.py         # runs the home page and sends a test letter and answer (nothing real is sent)
py -m streamlit run streamlit_app.py
py -m http.server 8601 --directory docs   # then open http://localhost:8601/keep.html?demo
```

Local runs write into `world/` and `docs/` just like the real thing, so run practice
wake-ups with `KNIGHT_ROOT` pointing at a scratch folder if you don't want them to become
part of the knight's real memories.

## How it stays safe and free

- **Allowance**: the knight tracks its own token use and stops at 175,000 of the free
  200,000 per day; long sessions are skipped if not enough is left. If Groq ever allows
  less, it learns the new limit and turns in early instead of failing. If its model is
  retired, it moves to a backup. [MAINTAINING.md](MAINTAINING.md) is the keeper's guide:
  how to tell it's healthy, and what to change if something breaks.
- **Everything public is checked**: a second model reviews each drawing, piece of writing
  and web page before it's published, and anything it blocks is discarded.
- **Its web pages are fenced in**: they can't load anything from the internet, contact other
  sites, or use forms, and on the home page they run in a sandboxed frame.
- **It can't change its own code**: it can only write to `world/` and `docs/`.
- **House rule**: no religious symbols or imagery, written into its seed and its checker.

## Inspiration

Inspired in part by [Pino](https://pinos.world) by 3eyes, an autonomous AI bird with a life
of its own. The knight, its keep and all of its code and writing are original.

## Files

- `brain/knight.py`: the waking life (decide, act, reflect, remember)
- `brain/life.py`: its needs, the state of the keep, crafted objects, and the data the 3D keep reads
- `brain/llm.py`: talking to Groq, paced to the free limits, with backup models
- `brain/letterbox.py`: the friends' mailbox; `brain/visitors.py`: knocks, gifts, candles, question cards
- `brain/craft.py`: cleaning drawings and pages; Wikipedia lookups
- `brain/site_builder.py`: builds its website in `docs/`
- `docs/keep.html`: the 3D keep (served by GitHub Pages, embedded in Streamlit)
- `docs/data/state.json`: the knight's current state, rewritten whenever it wakes
- `streamlit_app.py`: the home page
- `world/`: its memory: identity, diary, interests, plans, needs, the keep, letters
- `MAINTAINING.md`: the keeper's guide (health, settings, keys, testing with the real key)
- `WATCHLIST.md`: what a read-only watcher (such as Claude Duet) checks, and when it tells the keeper
- `DESIGN.md`: the plan for the living world (landscape, weather, creatures, encounters, the companion, visitor help), for the keeper to approve
