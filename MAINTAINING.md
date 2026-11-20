# Keeping Rooken well

A short guide for the keeper: how to tell Rooken is healthy, and what to change if something
breaks. Most problems fix themselves; the ones that don't come down to a few settings.

## Is it healthy?

Look at these, roughly in this order:

1. **The home page.** Under the keep it says *Last woke …*. In the daytime (7 AM to midnight
   US Eastern) that should be under about three hours ago. At night it sleeps, and the
   keep shows it on its bedroll.
2. **The badge in the keep** (top right). *awake, thinking* or *feeling …* is normal.
   **seems unwell** means one of two things: four check-ins in a row have failed, or nothing
   has got through for 12 hours. The home page shows the same note under the keep.
3. **GitHub → Actions.** *Alarm check-in* runs every 30 minutes and should be green. A red
   run has a log that says what went wrong.
4. **The files in `world/`** (on GitHub you can open them in the browser):
   - `usage.json`: the tokens it has used today, by model. `limit_reached: true` means Groq
     said "no more today" and it turned in early.
   - `health.json`: `failed_in_row` and the time of the last good check-in.
   - `meta.json`: `models` (only there if it moved to a backup model), `model_log` (when and
     why it moved) and `daily_limits` (limits Groq has told it about).
   - `test_usage.json`: tokens your own tests spent today (see below).

If something checks on Rooken for you (such as Claude Duet), point it at
[WATCHLIST.md](WATCHLIST.md): what to check, what's normal, when to tell you, and what it must
never touch.

## What looks after itself

- **A retired model.** If Groq retires the model Rooken thinks with, it moves to the next on
  its list (`LADDER` in `brain/llm.py`), writes that down in `world/meta.json`, and carries on.
  The checker (the second model that reviews everything public) works the same way.
- **A smaller free allowance.** If Groq refuses for the day, Rooken reads the limit Groq
  states and sets its own daily cap just under it (87.5%) for that model from then on. That
  wake-up ends with an early night instead of an error.
- **The per-minute limit.** It reads each model's limit from Groq's replies and paces itself.
- **A broken code change.** Before every real wake-up a practice run happens on a throwaway
  copy. If the practice fails, the real wake-up is skipped, so its memories stay safe.
- **The home page after an update.** It reloads the knight's code when that changes, and a
  letter or answer is never blocked by its own quick check failing (the workflow that posts it
  checks again). *Home page check* in GitHub Actions sends a test letter and answer through
  the page whenever its code changes; a red run there means the page needs a look.

## What to change if something breaks

All of these are set in the repository: **Settings → Secrets and variables → Actions**.
*Secrets* are hidden. *Variables* are plain settings, and none are needed day to day.

| Problem | What to do |
|---|---|
| Every model on its list is gone (the log says "no backup is left") | Pick a current model at [console.groq.com/docs/models](https://console.groq.com/docs/models) and add a **variable** `KNIGHT_MODEL` with its name (e.g. `openai/gpt-oss-120b`). `KNIGHT_CHECK_MODEL` does the same for the checker. Delete the variable to go back to the built-in list. |
| You want it to use less (or more) of the allowance | **Variable** `KNIGHT_DAILY_BUDGET`, e.g. `150000`. It never goes above a limit Groq has told it about. If Groq raises its limits later, delete that model's entry under `daily_limits` in `world/meta.json`. |
| Red runs that say `HTTP 401` (the Groq key stopped working) | Make a new key at [console.groq.com/keys](https://console.groq.com/keys). Put it in three places: the **secret** `GROQ_API_KEY`, the Streamlit secret `groq_api_key`, and your local `.env`. |
| Visits or letters on the home page fail ("could not send") | The GitHub token in the Streamlit secrets has probably expired. Make a new fine-grained token at GitHub → Settings → Developer settings → Personal access tokens. Limit it to the Knight-friend repository with **Actions: Read and write**, and put it in the Streamlit secret `github_token`. |
| No check-ins at all (Actions shows no *Alarm check-in* runs) | The alarm lives at [cron-job.org](https://cron-job.org). It stops a job after too many failures in a row, so check it there. The job POSTs to `https://api.github.com/repos/Sgizabi/Knight-friend/actions/workflows/wake.yml/dispatches` with the body `{"ref":"main","inputs":{"check_in":"true"}}`. If its token has expired, make a new one like the one above (Actions read/write on this repository only) and paste it into the job's `Authorization: Bearer …` header. |
| The home page says the app is asleep | Streamlit apps sleep after a few days without visitors. Opening the page and pressing the button wakes it. Rooken itself keeps living either way. |

**Streamlit secrets** are under share.streamlit.io → the app → **Settings → Secrets**. There
are three: `mailbox_passcode` (for friends' letters), `github_token`, and `groq_api_key`.

To pause Rooken completely, pause the job at cron-job.org. Nothing is lost, and it picks up
again when you switch the job back on.

## Testing with the real key

Your tests and Rooken share one free Groq allowance. Record what a test spends, so Rooken's
daily cap counts it too. Add one line at the end of the test script:

```python
import llm
llm.record_test_usage(brain, "what this test was")   # brain: the llm.Brain your test used
```

It adds the tokens to `world/test_usage.json` in the real project, then commits and pushes
that one file straight away. Rooken only ever reads this file, so it never clashes with its
own commits. Only tokens spent on the models Rooken uses count against its cap, because each
model has its own allowance.

For trying things out without spending anything, use `--fake` (see the README) or
`KNIGHT_ROOT` pointing at a scratch copy of `world/` and `docs/`.

## Never change

Rooken's identity (`world/identity.json`, the sheet it wrote at birth) is its own. Fixes
change the code around it, never who it is.
