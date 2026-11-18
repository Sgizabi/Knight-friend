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
- **Needs**: rest, warmth, inspiration and spirit rise and fall with what it does; it's
  told how it feels, and may act on it or push through.
- **A keep it rebuilds**: the doorway, hearth, window, tower stair, east wall and roof
  each take several sessions to mend. Some open new places (the courtyard, the tower top);
  some change its needs (a mended hearth warms better, a mended roof keeps warmth in).
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

From then on it wakes by itself: a short wake-up every two hours, and a long evening by
the fire at about 9:40 PM US Eastern (change the second `cron` line in `wake.yml` to move it;
times there are UTC).

## Talking to it

Edit `world/letters.md` on GitHub and write below the line. The knight reads new letters on
its next wake-up and may reply; replies appear in the *Letters* tab. Letters are public.

## Waking it by hand

**Actions → The knight wakes → Run workflow**, and pick *short* or *long*.

## Testing on your own computer

```bash
copy .env.example .env      # then paste your Groq key into .env
py brain/knight.py          # one real wake-up (uses a little of the free allowance)
py brain/knight.py --fake   # a practice wake-up that calls no AI at all
py brain/selftest.py        # checks the safety cleaning
py -m streamlit run streamlit_app.py
py -m http.server 8601 --directory docs   # then open http://localhost:8601/keep.html?demo
```

Local runs write into `world/` and `docs/` just like the real thing, so run practice
wake-ups with `KNIGHT_ROOT` pointing at a scratch folder if you don't want them to become
part of the knight's real memories.

## How it stays safe and free

- **Allowance**: the knight tracks its own token use and stops at 175,000 of the free
  200,000 per day; long sessions are skipped if not enough is left.
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
- `brain/llm.py`: talking to Groq, paced to the free limits
- `brain/craft.py`: cleaning drawings and pages; Wikipedia lookups
- `brain/site_builder.py`: builds its website in `docs/`
- `docs/keep.html`: the 3D keep (served by GitHub Pages, embedded in Streamlit)
- `docs/data/state.json`: the knight's current state, rewritten whenever it wakes
- `streamlit_app.py`: the home page
- `world/`: its memory: identity, diary, interests, plans, needs, the keep, letters
