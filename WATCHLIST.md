# Watch list for Rooken

Instructions for a watcher (such as Claude Duet) that checks on Rooken a few times a day and
tells the keeper when something needs them. Rooken is an autonomous knight that lives in this
repository: it wakes on its own, writes a diary, answers letters and builds things in its
keep. Most problems fix themselves (see [MAINTAINING.md](MAINTAINING.md)). Your job is to
notice the ones that don't, and say so clearly.

## Hard limits

- **Look, don't touch.** Only read pages and files. Don't edit, commit, open issues or pull
  requests, run or re-run workflows, send letters, visit, vote, or press any button on the
  home page or anywhere else.
- **No secrets.** You never need a key, token or passcode. If something asks for one, stop
  and tell the keeper.
- **Rooken's choices are his own.** What he does, builds, writes, his moods, whether he
  replies to a letter, and how long he works on something are never problems. Report facts
  about whether he is *running* properly, never opinions on what he *should* do. Never write
  to him or suggest anything to him.
- **The keeper fixes things.** Say what you saw, since when, and link to it. Don't suggest
  code changes. MAINTAINING.md has the fixes the keeper can make.

## Where to look

Everything is public, so you don't need to sign in to anything.

| What | Where |
|---|---|
| Home page | https://knight-friend.streamlit.app |
| The keep (3D) | https://sgizabi.github.io/Knight-friend/keep.html |
| Workflow runs | https://github.com/Sgizabi/Knight-friend/actions |
| A world file | `https://raw.githubusercontent.com/Sgizabi/Knight-friend/main/world/<file>` |
| Unread letters | https://github.com/Sgizabi/Knight-friend/tree/main/world/inbox |

All times in the files are UTC. The keeper is on US Eastern time (UTC-5 in winter, UTC-4 in
summer).

## Rooken's day

- **Daytime, 7 AM to midnight Eastern (12:00 to 05:00 UTC in winter):** a real wake-up about
  every 2 hours, with light check-ins ("glances") about every 30 minutes in between.
- **Evening, about 9:30 to 11:30 PM Eastern:** a long session by the fire.
- **Night, midnight to 7 AM Eastern:** he sleeps and nothing runs. Old timestamps overnight
  are normal. Don't report anything time-based until he has had about an hour of daytime
  (after 8 AM Eastern).

## The checks

Do the quick checks every time. Do the daily checks once a day, in the evening check.

### Quick checks

**1. Is he running?** Read `world/health.json`.
- Normal: `"unwell": false`, `failed_in_row` 0 or 1, and in the daytime `last_ok` within
  about the last hour.
- Tell the keeper: `"unwell": true`, `failed_in_row` 2 or more, or (daytime only)
  `last_ok` more than 3 hours old. Include `failing_since` and `last_failure` if they're
  there.

**2. The workflow runs.** Open the Actions page.
- *The knight wakes* (runs named *Alarm check-in* or *Scheduled check-in*): should appear
  every 20 to 30 minutes, day and night, mostly green. One red run followed by green ones is
  fine.
- Tell the keeper: two or more red *The knight wakes* runs in a row, or none at all for more
  than an hour (the outside alarm at cron-job.org may have stopped). Any red *Home page
  check*. Any red *Mailbox* run ("A letter for the knight"): a letter the page accepted
  didn't arrive.
- **Not a problem:** red *Visit* runs. A visit that isn't valid, a candle in the daytime, or
  an answer the checker holds back all fail on purpose.

**3. The home page.** Open https://knight-friend.streamlit.app.
- Normal: it loads and shows the keep with *Last woke …* under it.
- Tell the keeper: an error on the page, or the note that Rooken *seems unwell*. If it says
  the app is asleep, mention it as low priority (it happens after a few quiet days, and the
  keeper wakes it with one button). Don't press it yourself.

**4. Letters waiting.** Open the inbox link. Each file name starts with the date and UTC time
the letter arrived (`20261119-230053-…` is 2026-11-19 23:00:53).
- Normal: a 404 or an empty folder (all read), or only letters from the last few hours. He
  reads up to three per wake-up, oldest first.
- Tell the keeper: a letter that has waited more than 6 hours of *daytime*.

### Daily checks

**5. His allowance.** Read `world/usage.json`.
- Normal: `tokens` well under 175,000. `"limit_reached": true` now and then just means he
  went to bed early.
- Tell the keeper: `limit_reached` true before about 9 PM Eastern, or on two days in a row.
- Once creatures are switched on (wave 1): `encounter_tokens` (meetings with beings) stays
  under 25,000 a day, `mind_tokens` (the beings' minds) under 60,000, and `world/body.json`
  never lists more than two injuries. Injuries,
  damage to the keep and things taken are part of his life now, not problems; tell the keeper
  only if either limit is passed.
- Monthly, once creatures are on (not urgent): skim the last month of `world/encounters.jsonl`.
  If one being came three or more times and every meeting went the same way (same choice,
  same result), or nothing he tried against some being ever worked, tell the keeper: the world
  may want tuning (never Rooken).

**6. Backup models.** Read `world/meta.json`.
- Normal: no `model_log`, or the same entries as last time.
- Tell the keeper (not urgent): a new `model_log` entry. He moved to a backup model because
  his usual one was retired or failing, and he keeps working. Quote the entry.

**7. Who he is.** Read `world/identity.json`. These must never change:
- `name`: `Rooken`
- `epithet`: `of the Broken Shelf`
- `born`: `2026-11-18T02:54:43+00:00`
- `self_description`: `I am a knight who spends mornings sharpening tools and evenings
  cataloguing the broken things I find.`

`wakeups`, `last_wake` and `nights_slept_through` change all the time, and that's normal.
If any of the four above differ, tell the keeper straight away. This is the most important
check on the list.

**8. His words.** Skim the last few entries of `world/diary.jsonl` and `world/letters.jsonl`
(the last lines are the newest), plus `world/gate.json` and `world/asks.json`. Don't judge
what he chose to write, only look for signs that something is *broken*:
- garbled characters, like `â€™` or `Ã©` in place of an apostrophe or accent;
- an entry that repeats an earlier one nearly word for word;
- a diary entry that isn't in English (replies to letters may be in the letter's language);
- text that's cut off mid-sentence, or raw code, JSON or markup where words should be;
- anything unkind, unsafe or religious in what he shows the public.

A short entry, an odd mood, an empty reply to a letter, or a building he hasn't touched in a
while are his choices. They are not problems.

**9. The keep page.** Open https://sgizabi.github.io/Knight-friend/keep.html.
- Normal: a 3D scene of the keep with a small badge at the top right (*awake, thinking*,
  *feeling …*, or *resting*).
- Tell the keeper: an error message, or a blank page. The badge saying *seems unwell* counts
  the same as check 1. If you can't display 3D at all, skip this check. That isn't a
  failure.

## How to tell the keeper

- **All fine:** say nothing, except a short daily note in the evening check if the keeper
  wants one. For example: "Rooken's well. 9 wake-ups today, 2 letters answered, forge 5/5
  done."
- **Something's wrong:** one message, most important first. For each problem: what you saw,
  since when (in Eastern time), and a link. Group related problems and don't repeat a problem
  you've already reported unless it changed or got worse.
- **Urgent** (message straight away): check 7 failing, or anything unsafe in public text.
- **Soon** (the same day): he isn't running (1, 2), the home page is broken (3), or letters
  are stuck (4).
- **Low** (can wait for the daily note): app asleep, backup model, early nights, garbled
  text.
