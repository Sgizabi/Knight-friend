"""The beings that come to the keep: who they are, and when they come. No AI here: fair rules.

The spawner plans each day (in the keeper's calendar) a day ahead, like the weather: at most
two notable beings a day, chosen by rarity, by what can come at that hour and in that weather,
and by what Rooken can perceive (the seeing ladder). A second being is rarer than the first
and its time is usually biased to overlap the first's stay, so two beings can be about at
once (one at five, another at twenty past, while the first is still there). Cooldowns keep
any one kind from coming back too soon; after anything hostile there is a quiet spell; across
a week gentle and neutral beings outnumber hostile ones; and now and then a strange week
(more stirring) or a quiet week (almost nothing) breaks the rhythm. All the numbers are
starting dials (DESIGN.md).

It is switched off in the real world until wave 1 (KNIGHT_CREATURES=on), so nothing appears
that Rooken can't yet meet. Everything can be tested on copies with the switch on.
"""

import datetime as dt
import json
import os
import random
from pathlib import Path

import beings
import people
import weather

# what each being is. when: day (8-17 ET), dusk (17-20), night (20-5), dark (dusk or night), any.
# likes: weather that draws it (three times as likely then). needs: what must be true for it to come
# (clear: a clear-ish sky; after_rain: rain in the last hours; wind: a wind or a gale; gale: a gale or a storm).
# render: the keep page's name for how it looks. arrives: it comes by meteor or ship (and leaves a trace).
# forms: shapes it can come in that are not ages (which heads, which disguise), weighted; fresh: never
# the same form twice running. natures: its nature is drawn for each visit (KINDS nature is what the caps count).
# arc: a chapter of a longer story (ARCS). Some, once started, come back on their own slow clock (CHAINS).
KINDS = {
    "dragon":       dict(name="the dragon", nature="proud", rarity="legendary", step=0, when="any", minutes=(40, 90), render="dragon2"),
    "glassbeak":    dict(name="the Glassbeak", nature="nuisance", rarity="rare", step=0, when="day", minutes=(30, 60)),
    "basilisk":     dict(name="the basilisk", nature="hostile", rarity="rare", step=0, when="day", minutes=(30, 60)),
    "golem":        dict(name="the wall that woke", nature="proud", rarity="uncommon", step=0, when="any", minutes=(60, 120)),
    "well":         dict(name="something in the well", nature="proud", rarity="rare", step=0, when="night", likes=["fog"], minutes=(30, 60)),
    "hill":         dict(name="the hill that breathes", nature="neutral", rarity="legendary", step=0, when="day", minutes=(120, 240)),
    "whale":        dict(name="the sky whale", nature="gentle", rarity="uncommon", step=0, when="night", needs="clear", minutes=(20, 40)),
    "wyrm":         dict(name="the deep wyrm", nature="hostile", rarity="rare", step=0, when="day", minutes=(20, 45)),
    "moths":        dict(name="the lamp-eaters", nature="nuisance", rarity="uncommon", step=0, when="night", likes=["still"], minutes=(40, 90)),
    "barrow":       dict(name="the barrow lord", nature="proud", rarity="rare", step=0, when="night", likes=["fog"], minutes=(40, 90)),
    "fog":          dict(name="the fog with eyes", nature="hostile", rarity="common", step=0, when="night", likes=["fog"], minutes=(60, 180)),
    "ninefold":     dict(name="the Ninefold Eye", nature="neutral", rarity="rare", step=3, when="night", needs="clear", minutes=(30, 60)),
    "moon2":        dict(name="the Second Moon", nature="neutral", rarity="rare", step=2, when="night", needs="clear", minutes=(120, 300)),
    "larva":        dict(name="the Starfallen Larva", nature="gentle", rarity="uncommon", step=1, when="night", likes=["starfall"], minutes=(60, 180), arrives="meteor", arrive_chance=.4),
    "listener":     dict(name="the Antlered Listener", nature="neutral", rarity="rare", step=2, when="dusk", minutes=(30, 60)),
    "leech":        dict(name="the Dream-Leech", nature="neutral", rarity="rare", step=3, when="night", minutes=(30, 60)),
    "seam":         dict(name="the Seam", nature="neutral", rarity="legendary", step=4, when="night", minutes=(20, 40)),
    "bloom":        dict(name="the Bloom-Headed Wanderer", nature="courteous", rarity="uncommon", step=0, when="dusk", minutes=(30, 60)),
    "warden":       dict(name="the Lantern Warden", nature="courteous", rarity="uncommon", step=0, when="night", minutes=(40, 90)),
    "brood":        dict(name="the Pale Brood", nature="nuisance", rarity="common", step=1, when="night", minutes=(40, 120)),
    "longman":      dict(name="the Long Man", nature="hostile", rarity="rare", step=1, when="dusk", likes=["fog"], minutes=(40, 90), render="longman2"),
    "stitched":     dict(name="the Stitched Sky", nature="neutral", rarity="legendary", step=4, when="night", needs="clear", minutes=(30, 60)),
    "manyjoint":    dict(name="the Many-Jointed", nature="hostile", rarity="rare", step=3, when="night", minutes=(30, 60)),
    "lanternheads": dict(name="the Lantern Folk", nature="gentle", rarity="uncommon", step=1, when="night", minutes=(15, 30)),
    "cartographer": dict(name="the Cartographer Moth", nature="gentle", rarity="uncommon", step=2, when="dusk", minutes=(30, 90)),
    "thorn":        dict(name="the Thornmother", nature="neutral", rarity="rare", step=0, when="day", minutes=(30, 60)),
    "ashwolves":    dict(name="the Ashwolf pack", nature="hostile", rarity="uncommon", step=0, when="night", likes=["ash"], minutes=(30, 60)),
    "bellcrab":     dict(name="the Bell-Crab", nature="neutral", rarity="uncommon", step=0, when="day", minutes=(30, 60)),
    "crawl":        dict(name="the Long Crawl", nature="hostile", rarity="rare", step=0, when="day", minutes=(60, 180)),
    "axolotl":      dict(name="the giant axolotl", nature="gentle", rarity="uncommon", step=0, when="day", needs="after_rain", minutes=(60, 180)),
    "thincrowd":    dict(name="the Thin Crowd", nature="hostile", rarity="rare", step=1, when="dusk", minutes=(30, 60)),
    "bentone":      dict(name="the Bent One", nature="hostile", rarity="rare", step=2, when="night", minutes=(30, 60)),
    "watcher":      dict(name="the Window Watcher", nature="hostile", rarity="rare", step=2, when="night", minutes=(30, 60)),
    "doorway":      dict(name="the Doorway Figure", nature="hostile", rarity="rare", step=1, when="night", minutes=(30, 60)),
    # otherworldly
    "nightgrown":   dict(name="the Night-Grown", nature="neutral", rarity="rare", step=2, when="night", needs="clear", likes=["starfall"], minutes=(40, 120), arrives="meteor"),
    "clockhead":    dict(name="the Five Hours", nature="neutral", rarity="rare", step=3, when="dark", minutes=(20, 45),
                         forms={"": 60, "clock": 8, "hourglass": 8, "metronome": 8, "galaxy": 8, "mask": 8}),
    # not of this world: tree-tall, a smiling mask, nearly always in a disguise it has never worn here before.
    # Each visit it is either hostile or merely neutral (never harmless); the caps count it as hostile.
    "stranger":     dict(name="the stranger in the trees", nature="hostile", rarity="rare", step=2, when="dusk", minutes=(30, 60),
                         forms={"cape": 21, "woodsman": 21, "bark": 21, "traveller": 21, "bare": 16}, fresh=True,
                         natures=["hostile", "hostile", "neutral"]),
    # the glassy people: one story told over many months (ARCS)
    "glassy1":      dict(name="the glassy Gardener", nature="neutral", rarity="rare", step=2, when="dusk", minutes=(30, 60), arrives="ship", arc="glassy", stage=1, render="lander"),
    "glassy2":      dict(name="the glassy Scouts", nature="neutral", rarity="rare", step=3, when="dark", minutes=(30, 60), arrives="ship", arc="glassy", stage=2),
    "glassy3":      dict(name="the glassy Expedition", nature="neutral", rarity="rare", step=3, when="dusk", minutes=(240, 480), arrives="ship", arc="glassy", stage=3),
    "glassy4":      dict(name="the glassy Sovereign", nature="neutral", rarity="legendary", step=4, when="dusk", minutes=(40, 90), arrives="ship", arc="glassy", stage=4),
    # the Tidekin, the people of the lake: shy, curious and gentle (ARCS; their reed village is a PLACE that stays)
    "tidekin1":     dict(name="the Tidekin", nature="gentle", rarity="uncommon", step=0, when="dusk", minutes=(20, 40), arc="tidekin", stage=1),
    "tidekin2":     dict(name="the Tidekin on the shore", nature="gentle", rarity="uncommon", step=0, when="dusk", likes=["rain"], minutes=(40, 90), arc="tidekin", stage=2),
    "tidekin3":     dict(name="the Tidekin traders", nature="gentle", rarity="uncommon", step=1, when="day", minutes=(40, 90), arc="tidekin", stage=3),
    "tidekin4":     dict(name="the eldest of the Tidekin", nature="gentle", rarity="rare", step=1, when="dusk", minutes=(30, 60), arc="tidekin", stage=4),
    # the Burrowfolk, the people under the plain (ARCS): a lost youngster, then the diggers looking for it soon after,
    # then their mushroom hollow on the plain (a PLACE), and once, their Burrow-Mother, who remembers how he treated the little one
    "burrow1":      dict(name="a lost Burrowfolk youngster", nature="gentle", rarity="uncommon", step=0, when="dusk", minutes=(20, 45), arrives="hole", arc="burrow", stage=1),
    "burrow2":      dict(name="the Burrowfolk diggers", nature="neutral", rarity="uncommon", step=0, when="dark", minutes=(40, 90), arrives="mounds", arc="burrow", stage=2),
    "burrow3":      dict(name="the Burrowfolk mushroom farmers", nature="gentle", rarity="uncommon", step=1, when="dark", likes=["rain"], minutes=(60, 120), arc="burrow", stage=3),
    "burrow4":      dict(name="the Burrow-Mother", nature="gentle", rarity="rare", step=1, when="dusk", minutes=(30, 60), arc="burrow", stage=4, reads="young"),
    # the Kitemakers, the people of the wind (ARCS): they come only when the wind is up. A scout lands on the tower; flocks
    # pass over; in a gale (or a storm) they come down out of it to rest on the walls; and once, the great migration, with
    # their Wind-Chief circling the keep. (likes = their own weather: since they need it anyway, this makes a windy day
    # three times as likely to bring them, so a people who can only come on some days still comes about as often as others.)
    "kite1":        dict(name="a Kitemaker scout", nature="gentle", rarity="uncommon", step=0, when="day", needs="wind", likes=["wind", "gale"], minutes=(20, 40), arrives="silk", arrive_chance=.6, arc="kite", stage=1),
    "kite2":        dict(name="a flock of Kitemakers", nature="gentle", rarity="uncommon", step=0, when="day", needs="wind", likes=["wind", "gale"], minutes=(20, 40), arc="kite", stage=2),
    "kite3":        dict(name="the Kitemakers sheltering on the walls", nature="neutral", rarity="uncommon", step=1, when="any", needs="gale", likes=["gale", "storm"], minutes=(60, 150), arrives="silk", arrive_chance=.8, arc="kite", stage=3),
    "kite4":        dict(name="the Wind-Chief and the great migration", nature="proud", rarity="rare", step=1, when="day", needs="wind", likes=["wind", "gale"], minutes=(50, 70), arc="kite", stage=4),
    # PEOPLE ON THE ROAD (lane "road": planned on a lane of their own, road_day; see people.py). Each one is someone
    # (a["person"]): a passing stranger of some trade, one of three pedlars who come round with a mule, or a knight
    # errant with a coat of arms. shuns: weather nobody sets out in.
    "traveller":    dict(name="a traveller on the road", nature="gentle", rarity="common", step=0, when="road", minutes=(25, 50), lane="road",
                         forms={"minstrel": 20, "woodcutter": 20, "herbalist": 20, "messenger": 20, "scholar": 20},
                         natures=["gentle", "courteous"], shuns=["storm", "gale", "hail"]),
    "pedlar":       dict(name="a pedlar with a mule", nature="courteous", rarity="uncommon", step=0, when="day", minutes=(40, 80), lane="road",
                         forms={"tinker": 1, "spicer": 1, "curios": 1}, fresh=True, shuns=["storm", "gale", "hail", "snow"]),
    "knight":       dict(name="a knight errant", nature="courteous", rarity="uncommon", step=0, when="road", minutes=(30, 60), lane="road",
                         natures=["courteous", "courteous", "proud"], shuns=["storm", "hail"]),
}
ROAD_CHANCE = .35                 # someone stops at the keep on a given day (about two or three a week); their own lane
ROAD_WEIGHT = {"traveller": 5, "pedlar": 2.5, "knight": 2.5}
ROAD = {k for k, v in KINDS.items() if v.get("lane") == "road"}

# Story arcs: each stage unlocks the next once it has been met enough times. If he drives them
# off (regard falls to -2), the arc rests a long while and comes back warier, further away.
# linger: stages that stay open once the story has passed them (the Tidekin go on trading after their
# eldest has come). An advance_after as long as the stages closes the last one once it has been met
# (their eldest comes to the wall once). place: something they make that STAYS in his world from that
# stage on, growing over build_days (PLACES); if he drives them off it is taken away, and it is begun
# again when they come back after their rest.
ARCS = {"glassy": {"stages": ["glassy1", "glassy2", "glassy3", "glassy4"], "advance_after": [3, 2, 1], "rest_days": 60},
        "tidekin": {"stages": ["tidekin1", "tidekin2", "tidekin3", "tidekin4"], "advance_after": [2, 2, 2, 1], "rest_days": 60,
                    "linger": [3], "place": {"at": 3, "kind": "village", "build_days": 21}},
        # soon: once a stage is passed, the next comes within days, not whenever the dice say (the diggers come looking
        # for the youngster soon after it was lost). remember: the arc keeps how he treated that stage's being (MOODS).
        "burrow": {"stages": ["burrow1", "burrow2", "burrow3", "burrow4"], "advance_after": [1, 1, 2, 1], "rest_days": 60,
                   "linger": [3], "soon": [2], "remember": 1, "place": {"at": 3, "kind": "hollow", "build_days": 14}},
        # the Kitemakers: the scout once; flocks and gale-shelterers keep coming on windy days after the Wind-Chief has been
        "kite": {"stages": ["kite1", "kite2", "kite3", "kite4"], "advance_after": [1, 2, 2, 1], "rest_days": 60, "linger": [2, 3]}}
SOON_CHANCE = .6                  # a 'soon' stage comes on the first day it can (the day after next, usually) with this chance, else the next
# How a being that reads the arc comes this time (its variant 'kind', its nature that visit), from how he treated
# the remembered stage's being ("kind": he reached out to it; "harsh": he drove it off; "": neither, or he only
# glimpsed it, and then the arc's regard decides). The Burrow-Mother comes to thank him or to scold him.
MOODS = {"young": {"kind": "thanks", "harsh": "scold"}}
MOOD_NATURE = {"thanks": "gentle", "scold": "proud"}
# what a place is, in plain words (for him: what he can see of it from the keep), by how far it has grown
PLACES = {"village": ("Out at the lake's edge, the Tidekin are building something of reeds that floats on the water.",
                      "Out at the lake's edge floats the Tidekin's village of reeds: little round huts on rafts, with shell-lights in the doorways.",
                      "The Tidekin are taking their reed village apart and drawing it back into the reeds."),
          "hollow": ("Out on the plain to the south, the Burrowfolk are digging a hollow, with heaps of fresh earth round it.",
                     "Out on the plain to the south lies the Burrowfolk's hollow, where they grow their mushrooms; after dark it glows gold and green.",
                     "The Burrowfolk are filling in their hollow on the plain, and the mushroom glow there is going out.")}

# Slow presences: once one starts, it comes back every so many days, a step closer each time,
# until it reaches the wall or he turns it back. Follow-ups take that day's place (one being a
# day) and count as the same dangerous event (no second hostile visit is added for them).
CHAINS = {"thincrowd": {"every": 1, "most": 5}, "crawl": {"every": 2, "most": 4}}

# Ecology: what has been about lately shifts who comes next. Built from traits, not pair by pair.
DRAWN_BY = {"wyrm": ["hill"], "moths": ["lanternheads", "warden"], "larva": ["moon2", "nightgrown"],
            "glassbeak": ["nightgrown", "glassy1", "moon2"], "brood": ["nightgrown", "glassy3"], "ashwolves": ["dragon"]}
TRACE_DAYS = {"meteor": 4, "ship": 3, "hole": 3, "mounds": 5, "silk": 2}   # (a hole in the courtyard, mounds across the plain, silk left snagged on the stones)
LEFT_AFTER = {"hole", "mounds", "silk"}   # traces left once it has gone (while it is here, it shows them itself)

# Meetings: when a second being's stay overlaps the first's, the two are about at the same time
# and each is met on its own, in turn (there is no 'companion' that comes as part of another any
# more; older plans that still have one are handled as before). Never two legendary beings;
# exactly one of a pair counts as the dangerous event. How they treat each other (their stance)
# comes from who they are and what has passed between their kinds; fair rules say who prevails.
# A second notable being, planned on its own (not as a companion): rarer than the first, and
# usually timed to overlap it, so two beings can be about at once without doubling how often
# he meets something on his own. At most two notable beings a day in all.
MAX_NOTABLE_PER_DAY = 2
SECOND_CHANCE = .18
SECOND_OVERLAP_BIAS = .7      # this share of second spawns start inside the first one's stay
# Beings with no young or old: things that are never born or never age (the Seam, the fog, the Long
# Man...), things not alive in the usual way (the barrow lord, the wall that woke, the Lantern
# Folk, a swarm), and some whose age is left a mystery for now (the well, the glassy people).
AGED = {"axolotl", "bellcrab", "glassbeak", "ashwolves", "dragon", "whale", "thorn", "basilisk", "wyrm", "larva",
        # (later waves, once their three ages are designed)
        "listener", "cartographer", "bentone", "watcher", "nightgrown", "leech"}
AGELESS = set(KINDS) - AGED
STANCES = ["team up", "rival", "squabble", "ignore", "avoid", "flee", "chase off", "follow", "compete",
           "steal from", "uneasy truce", "size up"]

# Beings that can come to the real keep: the waves released so far, each with its final art.
# The rest are fully built behind the scenes and come as their waves are released (tests, the
# simulator and the preview can use all of them: KNIGHT_ALL_BEINGS=on).
RELEASED = {"fog", "axolotl", "bellcrab", "glassbeak", "ashwolves", "dragon", "longman",       # wave 1
            "whale", "moths", "barrow", "thorn", "lanternheads", "brood", "thincrowd", "doorway",    # wave 2
            "basilisk", "wyrm", "crawl", "golem", "well", "bloom", "warden", "larva",               # wave 3
            "listener", "cartographer", "moon2", "bentone", "watcher", "nightgrown", "glassy1",     # wave 4
            "clockhead", "stranger", "ninefold", "leech", "seam", "stitched",                         # last wave
            "manyjoint", "hill", "glassy2", "glassy3", "glassy4",
            "tidekin1", "tidekin2", "tidekin3", "tidekin4",                                         # the peoples: the Tidekin
            "burrow1", "burrow2", "burrow3", "burrow4",                                             #   the Burrowfolk
            "kite1", "kite2", "kite3", "kite4",                                                     #   the Kitemakers
            "traveller", "pedlar", "knight"}                                                         # people on the road


def nature_of(a):
    """This visit's nature (some beings differ from visit to visit; most are always what their kind is)."""
    return a.get("nature") or KINDS[a["kind"]]["nature"]


def released(kind):
    return kind in RELEASED or os.environ.get("KNIGHT_ALL_BEINGS", "").strip().lower() == "on"


RARITY_WEIGHT = {"common": 10, "uncommon": 5, "rare": 2, "legendary": .9}   # legendary: about 3-5 a year
COOLDOWN_DAYS = {"common": 4, "uncommon": 7, "rare": 20, "legendary": 60}
WITNESS_POINTS = {"common": 1, "uncommon": 2, "rare": 4, "legendary": 8}
STEPS = [0, 10, 45, 150, 320]     # witness points for each step of seeing: about a week, a month, four months, eight
DAY_CHANCE = {"normal": .42, "strange": .75, "quiet": .12}   # a notable being, on a given day
HOSTILE_QUIET_DAYS = 3            # after anything hostile, no hostile beings for this long
HOSTILE_PER_WEEK = 2              # at most this many hostile visits in a keeper's week
HOURS = {"day": range(8, 17), "dusk": range(17, 20), "night": [20, 21, 22, 23, 0, 1],   # (keeper's hours: evenings, when people look in)
         "dark": [17, 18, 19, 20, 21, 22, 23, 0], "any": range(8, 23), "road": range(8, 20)}
CLEARISH = {"clear", "wind", "still", "starfall", "aurora"}
WINDY = {"wind", "gale"}          # needs="wind"
WILD_WIND = {"gale", "storm"}     # needs="gale": wind too wild even for the Kitemakers to stay up in


def enabled():
    return os.environ.get("KNIGHT_CREATURES", "").strip().lower() == "on"


def _now():
    return dt.datetime.now(dt.timezone.utc)


def _iso(t):
    return t.replace(microsecond=0).isoformat()


def _parse(s):
    try:
        return dt.datetime.fromisoformat(s)
    except (TypeError, ValueError):
        return None


def _keeper_day(t):
    return weather.keeper_time(t).date()


def _day_start(day):
    """Midnight of a keeper's day, in UTC."""
    return dt.datetime(day.year, day.month, day.day, tzinfo=dt.timezone.utc) + dt.timedelta(hours=5)


def _load(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def load(world: Path):
    state = _load(world / "creatures.json", {})
    state.setdefault("appearances", [])
    state.setdefault("planned", [])
    state.setdefault("cooldowns", {})
    state.setdefault("chains", {})
    state.setdefault("arcs", {"glassy": {"stage": 1, "met": {}, "regard": 0}})
    return state


def load_bestiary(world: Path):
    b = _load(world / "bestiary.json", {})
    b.setdefault("points", 0)
    b.setdefault("step", 0)
    b.setdefault("kinds", {})
    return b


def week_mode(day):
    """Most weeks are ordinary; one in ten is strange, one in ten is quiet."""
    year, week, _ = day.isocalendar()
    r = random.Random(year * 100 + week).random()
    return "strange" if r < .1 else "quiet" if r < .2 else "normal"


def _possible(kind, t, sched):
    """How well a being fits this hour: 0 if it can't come, 3 if the weather draws it, else 1."""
    k = KINDS[kind]
    p = weather.at(sched, t)
    wkind = p.get("kind") if p else "clear"
    needs = k.get("needs")
    if needs == "clear" and wkind not in CLEARISH:
        return 0
    if (needs == "wind" and wkind not in WINDY) or (needs == "gale" and wkind not in WILD_WIND):
        return 0
    if wkind in k.get("shuns", ()):
        return 0
    if needs == "after_rain":
        earlier = [weather.at(sched, t - dt.timedelta(hours=h)) for h in (1, 3, 6, 9)]
        if not any(q and q.get("kind") in ("rain", "storm") for q in earlier):
            return 0
    return 3 if wkind in k.get("likes", []) else 1


def traits(kind):
    return beings.CHARACTERS.get(kind, {}).get("traits", [])


def ecology(kind, state, start, keep=None):
    """How much more (or less) likely a being is, given what has been about lately."""
    def kinds_within(days):
        return [a["kind"] for a in state["appearances"]
                if _parse(a["start"]) and start - dt.timedelta(days=days) <= _parse(a["start"]) < start]
    near, lately = kinds_within(2), kinds_within(4)
    t, m = traits(kind), 1.0
    if "skittish" in t and any({"territorial", "vast"} & set(traits(k)) for k in near):
        m *= .3                                    # something big has been about: the timid stay away
    if any(k in lately for k in DRAWN_BY.get(kind, [])):
        m *= 2.5                                   # drawn after another (light-eaters after lanterns...)
    if "fire-drawn" in t and keep and any(b.get("key") == "forge" and b.get("finished") for b in keep.get("buildings", [])):
        m *= 1.6                                   # the forge's heat draws fire-lovers
    if {"thieving", "greedy"} & set(t) and any(
            a.get("arrival") in ("meteor", "ship") and _parse(a["start"]) and
            start - dt.timedelta(days=TRACE_DAYS[a["arrival"]]) <= _parse(a["start"]) < start
            for a in state["appearances"]):
        m *= 2                                     # scavengers, after something fell or landed
    return m


def arc_open(state, kind, start):
    """An arc's chapter can come only when it is the arc's current one, and the arc isn't resting."""
    k = KINDS[kind]
    if not k.get("arc"):
        return True
    arc = state.get("arcs", {}).get(k["arc"], {})
    rest = _parse(arc.get("rest_until"))
    here = arc.get("stage", 1)
    now_open = k["stage"] == here or (k["stage"] in ARCS[k["arc"]].get("linger", ()) and here > k["stage"])
    return now_open and not (rest and rest > start)


def counts_as_danger(a):
    """A hostile visit that counts toward the quiet spell and the weekly limit: not a slow
    presence's return, and exactly one of a pair counts. A pair's members carry an explicit
    "counts" flag (set when the pair is linked); a lone hostile visit counts on its own.
    Beings planned before pairs carried the flag fall back to the old rule."""
    if KINDS.get(a["kind"], {}).get("nature") != "hostile" or a.get("chain", 1) != 1:
        return False
    if "counts" in a:
        return bool(a["counts"])
    return not a.get("companion") or a.get("counts")


def hostile_allowed(state, start):
    """Whether a hostile being may come at this time: a quiet spell after the last, and a weekly limit.
    Judged against the schedule as it stands, both ways: a hostile already planned within three
    days either side of this time blocks it, and so does a week that already has its two."""
    hostiles = [a for a in state["appearances"]
                if _parse(a["start"]) and KINDS.get(a["kind"], {}).get("nature") == "hostile"
                and counts_as_danger(a)]
    before = [ _parse(a["start"]) for a in hostiles if _parse(a["start"]) <= start]
    after = [_parse(a["start"]) for a in hostiles if _parse(a["start"]) > start]
    if before and start - max(before) < dt.timedelta(days=HOSTILE_QUIET_DAYS):
        return False
    if after and min(after) - start < dt.timedelta(days=HOSTILE_QUIET_DAYS):
        return False
    week_start = start - dt.timedelta(days=weather.keeper_time(start).weekday())
    this_week = sum(1 for a in hostiles
                    if week_start <= _parse(a["start"]) < week_start + dt.timedelta(days=7))
    return this_week < HOSTILE_PER_WEEK


def plan_day(state, day, sched, step, rng=None, keep=None):
    """Decide whether a notable being comes on this keeper's day, which, and when."""
    rng = rng or random.Random(day.toordinal())
    if rng.random() >= DAY_CHANCE[week_mode(day)]:
        return None
    start = _day_start(day)
    choices = []
    for kind, k in KINDS.items():
        if k["step"] > step or not arc_open(state, kind, start) or not released(kind) or k.get("lane"):
            continue
        if kind in state.get("chains", {}):
            continue                               # already on its way
        until = _parse(state["cooldowns"].get(kind))
        if until and until > start:
            continue
        fits = []
        for h in HOURS[k["when"]]:
            t = start + dt.timedelta(hours=h + (24 if h < 5 else 0)) if k["when"] in ("night", "dark") else start + dt.timedelta(hours=h)
            fits.append((_possible(kind, t, sched), t))
        best = max(f for f, _ in fits)
        if best:   # any of the best-fitting hours, fairly
            t = rng.choice([t for f, t in fits if f == best])
            if k["nature"] == "hostile" and not hostile_allowed(state, t):
                continue                           # the quiet spell is judged at when it would come, not at midnight
            weight = RARITY_WEIGHT[k["rarity"]] * best * ecology(kind, state, start, keep)
            choices.append((kind, weight, t))
    if not choices:
        return None
    kind, _, t = rng.choices(choices, [w for _, w, _ in choices])[0]
    return _appearance(kind, day, t, rng, state)


def _hour_time(kind, day, rng, sched):
    """A fitting hour on this day for a follow-up visit (chains)."""
    k, start = KINDS[kind], _day_start(day)
    hours = [start + dt.timedelta(hours=h + (24 if h < 5 else 0)) for h in HOURS[k["when"]]]
    good = [t for t in hours if _possible(kind, t, sched)] or hours
    return rng.choice(good)


def _appearance(kind, day, t, rng, state, chain=None):
    k = KINDS[kind]
    begin = t + dt.timedelta(minutes=rng.randint(0, 50))
    end = begin + dt.timedelta(minutes=rng.randint(*k["minutes"]))
    variant = {"size": round(rng.uniform(.88, 1.15), 2), "hue": round(rng.uniform(-.06, .06), 3),
               "mark": rng.choice(["", "", "", "", "", "scarred"]),
               "age": "" if kind in AGELESS else rng.choices(["young", "", "old"], [15, 70, 15])[0]}
    if k.get("forms"):                             # which heads, which disguise (fresh: not the one it wore last time)
        last = next((x.get("variant", {}).get("kind") for x in reversed(state.get("appearances", [])) if x["kind"] == kind), None)
        forms = {f: w for f, w in k["forms"].items() if not (k.get("fresh") and f == last)}
        variant["kind"] = rng.choices(list(forms), list(forms.values()))[0]
    drives = beings.CHARACTERS.get(kind, {}).get("drives") or [""]
    a = {"id": f"{kind}-{begin.strftime('%Y%m%d%H%M')}", "kind": kind, "day": day.isoformat(),   # its evening, even past midnight
         "start": _iso(begin), "end": _iso(end), "variant": variant,
         "drive": rng.choice(drives),                              # why it came this time
         "temper": rng.choice(["calm", "calm", "wary", "bold"])}   # its mood this visit
    if k.get("natures"):
        a["nature"] = rng.choice(k["natures"])
    if k.get("arrives") and rng.random() < k.get("arrive_chance", 1):
        a["arrival"] = k["arrives"]
    if chain:
        a["chain"] = chain
    if k.get("arc"):
        a["regard"] = state.get("arcs", {}).get(k["arc"], {}).get("regard", 0)   # how close they dare come
    if k.get("reads"):                             # it comes as he left things with the one it remembers
        variant["kind"] = mood(state, kind)
        a["nature"] = MOOD_NATURE[variant["kind"]]
        a["drive"] = rng.choice(beings.FORM_DRIVES[kind][variant["kind"]])
    if k.get("lane") == "road":                    # someone in particular (people.py): who, how old, what they have with them
        p = people.person_for(kind, variant.get("kind", ""), state, day, rng)
        a["person"] = p
        variant["age"] = p.get("age", "")
        variant["mark"] = ""
        form = variant.get("kind", "")
        a["drive"] = rng.choice(beings.FORM_DRIVES.get(kind, {}).get(form) or drives)
        if kind == "knight" and p.get("manner") == "boastful" and rng.random() < .5:
            a["drive"] = "looking for a friendly bout, to keep their arm in"
        if kind == "pedlar":
            a["wares"] = people.wares_for(a, form)
    return a


def mood(state, kind):
    """How a being that reads its arc comes: from how he treated the remembered being, else from the arc's regard."""
    k = KINDS[kind]
    arc = state.get("arcs", {}).get(k["arc"], {})
    said = MOODS[k["reads"]].get(arc.get("young", ""))
    return said or ("thanks" if arc.get("regard", 0) >= 0 else "scold")


def remember(state, kind, steps):
    """The arc keeps how he treated the being of its remembered stage: steps = [(choice, result)] of the meeting.
    Harsh if he drove it off at any step; kind if he reached out to it (offered, spoke, went closer); else neither.
    (By what he chose, not how the dice fell: a kindness that didn't come off still counts as kind.)"""
    k = KINDS.get(kind, {})
    spec = ARCS.get(k.get("arc"), {})
    if not spec.get("remember") or k.get("stage") != spec["remember"] or not steps:
        return
    choices = {c for c, _ in steps}
    arc = state.setdefault("arcs", {}).setdefault(k["arc"], {"stage": 1, "met": {}, "regard": 0})
    arc["young"] = "harsh" if "drive_off" in choices else "kind" if choices & {"offer", "speak", "approach"} else ""


def road_day(state, day, sched, rng=None):
    """Someone who stops at the keep on this day, coming along the road (their own lane: they never take a
    day's turn from the beings of the wild, and nothing of the wild's limits applies to them), or None."""
    rng = rng or random.Random(day.toordinal() * 17 + 3)
    if rng.random() >= ROAD_CHANCE:
        return None
    start = _day_start(day)
    choices = []
    for kind in ROAD:
        if not released(kind):
            continue
        until = _parse(state["cooldowns"].get(kind))
        if until and until > start:
            continue
        fits = [(_possible(kind, start + dt.timedelta(hours=h), sched), start + dt.timedelta(hours=h)) for h in HOURS[KINDS[kind]["when"]]]
        good = [t for f, t in fits if f]
        if good:
            choices.append((kind, ROAD_WEIGHT[kind], rng.choice(good)))
    if not choices:
        return None                                # (nobody sets out in a storm)
    kind, _, t = rng.choices(choices, [w for _, w, _ in choices])[0]
    return _appearance(kind, day, t, rng, state)


def soon_visit(state, day, sched):
    """A stage that comes soon after the last (ARCS soon): on the first day that can have it, often, else the next."""
    for name, spec in ARCS.items():
        arc = state.get("arcs", {}).get(name, {})
        soon = arc.get("soon")
        if not soon or day.isoformat() < soon["from"]:
            continue
        kind, start = soon["kind"], _day_start(day)
        if not arc_open(state, kind, start) or not released(kind):
            arc.pop("soon")                        # (driven off meanwhile, or not out yet: it waits for the dice like any other)
            continue
        rng = random.Random(day.toordinal() * 11 + len(kind))
        if day.isoformat() == soon["from"] and rng.random() >= SOON_CHANCE:
            continue                               # not today: tomorrow for certain
        arc.pop("soon")
        return _appearance(kind, day, _hour_time(kind, day, rng, sched), rng, state)
    return None


def follow_up(state, day, sched):
    """A slow presence that is on its way comes back on this day, a step closer."""
    for kind, c in list(state.get("chains", {}).items()):
        if c.get("next") != day.isoformat():
            continue
        rng = random.Random(day.toordinal() * 7 + len(kind))
        c["n"] += 1
        last = c["n"] >= CHAINS[kind]["most"]
        a = _appearance(kind, day, _hour_time(kind, day, rng, sched), rng, state, chain=c["n"])
        if last:
            a["last"] = True                       # it reaches the wall this time; then it is over
            del state["chains"][kind]
        else:
            c["next"] = (day + dt.timedelta(days=CHAINS[kind]["every"])).isoformat()
        return a
    return None


def turn_back(state, kind, now=None):
    """He turned a slow presence back: it stops coming (until another time it starts again)."""
    now = now or _now()
    state.get("chains", {}).pop(kind, None)
    for a in state["appearances"]:
        if a["kind"] == kind and _parse(a["start"]) and _parse(a["start"]) > now:
            a["cancelled"] = True


def note_arc(state, kind, regard_change, now=None):
    """How he met a chapter shapes the next: closer if he welcomed them, warier if not."""
    k = KINDS.get(kind, {})
    if not k.get("arc") or not regard_change:
        return
    arc = state.setdefault("arcs", {}).setdefault(k["arc"], {"stage": 1, "met": {}, "regard": 0})
    arc["regard"] = max(-3, min(3, arc.get("regard", 0) + regard_change))
    if arc["regard"] <= -2:
        arc["rest_until"] = _iso((now or _now()) + dt.timedelta(days=ARCS[k["arc"]]["rest_days"]))
        arc["regard"] = -1                         # when they return, warier, but they do return
        if arc.get("place") and not arc["place"].get("gone"):
            arc["place"]["gone"] = _iso(now or _now())   # what they built is taken away (over a day)


def tend_places(state, now=None):
    """Places a people makes in his world: begun when their story reaches that stage (and they aren't
    resting after being driven off), taken away a day after he drove them off, begun again on their return."""
    now = now or _now()
    for name, spec in ARCS.items():
        p = spec.get("place")
        arc = state.get("arcs", {}).get(name)
        if not p or not arc:
            continue
        place, rest = arc.get("place"), _parse(arc.get("rest_until"))
        if place and place.get("gone") and now - _parse(place["gone"]) > dt.timedelta(days=1):
            arc.pop("place")
            place = None
        if not place and arc.get("stage", 1) >= p["at"] and not (rest and rest > now):
            arc["place"] = {"since": _iso(now)}


def places(state, now=None):
    """What stands in his world now: [{arc, kind, grown 0..1, leaving}]."""
    now = now or _now()
    out = []
    for name, spec in ARCS.items():
        place = state.get("arcs", {}).get(name, {}).get("place")
        if not spec.get("place") or not place:
            continue
        days = (now - _parse(place["since"])).total_seconds() / 86400
        out.append({"arc": name, "kind": spec["place"]["kind"], "since": place["since"],
                    "grown": round(max(0, min(1, days / spec["place"]["build_days"])), 2), "leaving": bool(place.get("gone"))})
    return out


def places_line(world: Path, now=None):
    """One plain line for him about what the visiting peoples have made nearby (empty if nothing)."""
    if not enabled():
        return ""
    lines = []
    for p in places(load(world), now):
        said = PLACES[p["kind"]]
        lines.append(said[2] if p["leaving"] else said[1] if p["grown"] >= .5 else said[0])
    return " ".join(lines)


def might(kind, a=None):
    """How much a being can make another give way (for who prevails between them)."""
    c = beings.CHARACTERS.get(kind, {})
    m = 1 + c.get("danger", 0) + (2 if "vast" in traits(kind) else 0) + (1 if "territorial" in traits(kind) else 0)
    m += {"legendary": 2, "rare": 1}.get(KINDS[kind]["rarity"], 0)
    return m * ((a or {}).get("variant") or {}).get("size", 1)


def stance(k1, k2, relations, rng):
    """How the first treats the second, from their traits and their kinds' history."""
    t1, t2 = set(traits(k1)), set(traits(k2))
    n1, n2 = KINDS[k1]["nature"], KINDS[k2]["nature"]
    past = relations.get("|".join(sorted([k1, k2])), 0)
    options = ["ignore", "size up", "uneasy truce"]
    if n1 == "hostile" and n2 == "hostile":
        options += ["team up", "rival", "squabble"] + (["team up"] * 2 if past > 0 else ["rival"] * 2 if past < 0 else [])
    if t1 & {"territorial", "proud"}:
        options += ["chase off", "rival"]
    if t2 & {"territorial", "vast"} and t1 & {"skittish", "shy", "gentle"}:
        options += ["flee", "avoid", "avoid"]
    if t1 & {"thieving", "greedy"}:
        options += ["steal from", "compete"]
    if "light-hungry" in t1 and k2 in ("lanternheads", "warden"):
        options += ["follow", "follow"]
    if t1 & {"curious"}:
        options += ["follow", "size up"]
    if past < 0:
        options += ["rival", "chase off"]
    elif past > 0:
        options += ["uneasy truce", "ignore", "team up" if n1 == n2 == "hostile" else "follow"]
    return rng.choice(options)


def link_pair(state, a, b, rng):
    """Tie two appearances together as a pair that is about at the same time: each knows the
    other, each has a stance toward the other (opening attitude only; minds may shift how it
    plays out), and fair rules say who prevails. Exactly one of the pair counts as the
    dangerous event if either is hostile: the hostile one, or the first of them if both are.
    (Whether either one leads its own meeting is decided separately, in encounters.leads:
    companions have one leader, independent seconds both lead.)"""
    rel = state.setdefault("relations", {})
    a["with"], b["with"] = b["id"], a["id"]
    a["with_kind"], b["with_kind"] = b["kind"], a["kind"]
    a["stance"], b["stance"] = stance(a["kind"], b["kind"], rel, rng), stance(b["kind"], a["kind"], rel, rng)
    ha, hb = (KINDS[a["kind"]]["nature"] == "hostile", KINDS[b["kind"]]["nature"] == "hostile")
    # (by kind, as the safeguards count it — a stranger's visit nature may be drawn neutral,
    # but the caps still count its kind as hostile)
    a["counts"], b["counts"] = (True, False) if ha else (False, True) if hb else (False, False)
    if {a["stance"], b["stance"]} & {"chase off", "rival", "compete", "squabble", "steal from"}:
        ma, mb = might(a["kind"], a), might(b["kind"], b)
        a["prevails"] = a["id"] if rng.random() < ma / (ma + mb) else b["id"]   # fair: the mightier usually
        b["prevails"] = a["prevails"]
        loser = b if a["prevails"] == a["id"] else a
        loser["end"] = _iso(min(_parse(loser["end"]), _parse(loser["start"]) + dt.timedelta(minutes=25)))
    if a["stance"] == "flee" or b["stance"] == "flee":
        runner = a if a["stance"] == "flee" else b
        runner["end"] = _iso(min(_parse(runner["end"]), _parse(runner["start"]) + dt.timedelta(minutes=15)))


def _keeper_hour(kind_day_start, t):
    """The keeper's hour of day for a UTC time (0-23; night hours past midnight count as 0-4)."""
    return int((t - kind_day_start).total_seconds() // 3600) % 24


def _fits_hour(kind, t, day):
    """Whether this kind may come at this hour of the keeper's day."""
    return _keeper_hour(_day_start(day), t) in HOURS[KINDS[kind]["when"]]


def second_spawn(state, lead, sched, step, rng, keep=None):
    """A second notable being planned on its own for the same day, or None. Rarer than the
    first, and usually timed to start inside the first one's stay, so the two can be about
    at once (the 5pm / 5:20 case) without doubling how often he meets something alone.
    Returns the appearance, linked to the lead as a pair when their stays overlap."""
    if rng.random() >= SECOND_CHANCE:
        return None
    day = dt.date.fromisoformat(lead["day"])
    start, end = _parse(lead["start"]), _parse(lead["end"])
    lead_minutes = max(1.0, (end - start).total_seconds() / 60)
    candidates = []
    if rng.random() < SECOND_OVERLAP_BIAS:
        candidates.append(start + dt.timedelta(minutes=lead_minutes * rng.uniform(.25, .85)))
    hours = list(range(8, 26))   # keeper hours 8-23, then 0-1 past midnight
    rng.shuffle(hours)
    candidates += [_day_start(day) + dt.timedelta(hours=h) for h in hours]
    for t in candidates:
        choices = []
        for kind, kk in KINDS.items():
            if kind == lead["kind"] or kk["step"] > step or kk.get("arc") or kind in CHAINS or not released(kind) or kk.get("lane"):
                continue
            if kk["rarity"] == "legendary" and KINDS[lead["kind"]]["rarity"] == "legendary":
                continue
            if not _fits_hour(kind, t, day) or not _possible(kind, t, sched):
                continue
            until = _parse(state["cooldowns"].get(kind))
            if until and until > t:
                continue
            if kk["nature"] == "hostile" and not hostile_allowed(state, t):
                continue
            choices.append((kind, RARITY_WEIGHT[kk["rarity"]] * _possible(kind, t, sched) * ecology(kind, state, t, keep)))
        if not choices:
            continue
        kind = rng.choices([c for c, _ in choices], [w for _, w in choices])[0]
        b = _appearance(kind, day, t, rng, state)
        duration = _parse(b["end"]) - _parse(b["start"])
        b["start"] = _iso(t)
        b["end"] = _iso(t + duration)
        b["second"] = True
        if _parse(b["start"]) < end and start < _parse(b["end"]):
            link_pair(state, lead, b, rng)
        return b
    return None


def note_relation(state, k1, k2, stance1, stance2=""):
    """Their kinds remember: allies after a team-up, a grudge after a fight, so the world grows its own politics."""
    key = "|".join(sorted([k1, k2]))
    rel = state.setdefault("relations", {})
    s = {stance1, stance2}
    delta = 1 if s & {"team up", "uneasy truce", "follow"} else -1 if s & {"rival", "chase off", "steal from", "squabble", "compete"} else 0
    rel[key] = max(-3, min(3, rel.get(key, 0) + delta))


def update(world: Path, sched=None, now=None, keep=None):
    """Plan today and tomorrow (once each), credit what it has witnessed, and save."""
    now = now or _now()
    sched = sched if sched is not None else weather.load(world)
    state, best = load(world), load_bestiary(world)
    if keep is None:
        keep = _load(world / "keep.json", {})
    witness(state, best, now)
    tend_places(state, now)
    today = _keeper_day(now)
    for day in (today, today + dt.timedelta(days=1)):
        key = day.isoformat()
        if key in state["planned"]:
            continue
        state["planned"] = (state["planned"] + [key])[-10:]
        a = follow_up(state, day, sched) or soon_visit(state, day, sched) or plan_day(state, day, sched, best["step"], keep=keep)
        if a:
            state["appearances"].append(a)
            k = KINDS[a["kind"]]
            state["cooldowns"][a["kind"]] = _iso(_parse(a["start"]) + dt.timedelta(days=COOLDOWN_DAYS[k["rarity"]]))
            if a["kind"] in CHAINS and "chain" not in a:          # the first of a slow approach
                a["chain"] = 1
                state["chains"][a["kind"]] = {"n": 1, "next": (day + dt.timedelta(days=CHAINS[a["kind"]]["every"])).isoformat()}
        if a and not a.get("chain"):                # a second being for the same day, on its own
            mrng = random.Random(day.toordinal() * 13 + 5)
            second = second_spawn(state, a, sched, best["step"], mrng, keep)
            if second:
                state["appearances"].append(second)
                state["cooldowns"][second["kind"]] = _iso(_parse(second["start"]) + dt.timedelta(days=COOLDOWN_DAYS[KINDS[second["kind"]]["rarity"]]))
        r = road_day(state, day, sched)            # and someone on the road, on a lane of their own
        if r:
            state["appearances"].append(r)
            state["cooldowns"][r["kind"]] = _iso(_parse(r["start"]) + dt.timedelta(days=COOLDOWN_DAYS[KINDS[r["kind"]]["rarity"]]))
    witness(state, best, now)                      # (again: a visit just planned may already be over by now, e.g. a morning
    state["appearances"] = state["appearances"][-60:]   #  traveller planned at noon; credited here, so asking twice changes nothing)
    keep_people(state)
    if len(best.get("people") or {}) > PEOPLE_KEPT:    # what he knows of people: those still about, and the latest met
        roster = state.get("people") or {}
        ranked = sorted(best["people"].items(), key=lambda kv: (kv[0] in roster, kv[1].get("last", "")), reverse=True)
        best["people"] = dict(ranked[:PEOPLE_KEPT])
    (world / "creatures.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
    (world / "bestiary.json").write_text(json.dumps(best, indent=2, ensure_ascii=False), encoding="utf-8")
    return state


PEOPLE_KEPT = 40                  # people remembered (the pedlars always; knights met; the rest drop off)


def keep_people(state):
    """The roster stays small: pedlars always, anyone still in the appearances, and the knights he has met most lately."""
    roster = state.get("people") or {}
    if len(roster) <= PEOPLE_KEPT:
        return
    live = {(a.get("person") or {}).get("id") for a in state["appearances"]}
    ranked = sorted(roster.values(), key=lambda p: (p["id"].startswith("pedlar"), p["id"] in live, bool(p.get("visits")), p.get("last", "")), reverse=True)
    state["people"] = {p["id"]: p for p in ranked[:PEOPLE_KEPT]}


def witness(state, best, now):
    """Every appearance that has ended and that he saw counts toward seeing more. (Until encounters
    exist, every appearance counts as seen; encounters will mark the ones he slept through.)"""
    for a in state["appearances"]:
        end = _parse(a.get("end"))
        if a.get("witnessed") is not None or not end or end > now or a["kind"] not in KINDS or a.get("cancelled"):
            continue
        seen = a.get("seen", True)
        a["witnessed"] = bool(seen)
        if not seen:
            continue
        k = KINDS[a["kind"]]
        if k.get("lane") == "road":                # someone on the road: remembered as themselves (no seeing points: nothing uncanny)
            pid = (a.get("person") or {}).get("id")
            p = state.setdefault("people", {}).get(pid)
            if p is not None:
                p["visits"] = p.get("visits", 0) + 1
                p["last"] = a["start"]
            entry = best.setdefault("people", {}).setdefault(pid or a["kind"], {})
            entry.setdefault("first", a["start"])
            entry["count"] = entry.get("count", 0) + 1
            entry["last"] = a["start"]
            continue
        if k.get("arc"):                           # a chapter met: enough of them and the story moves on
            arc = state.setdefault("arcs", {}).setdefault(k["arc"], {"stage": 1, "met": {}, "regard": 0})
            arc.setdefault("met", {})[a["kind"]] = arc["met"].get(a["kind"], 0) + 1
            stages, after = ARCS[k["arc"]]["stages"], ARCS[k["arc"]]["advance_after"]
            i = stages.index(a["kind"])
            if i < len(after) and arc.get("stage", 1) == i + 1 and arc["met"][a["kind"]] >= after[i]:
                arc["stage"] = i + 2
                if i + 2 in ARCS[k["arc"]].get("soon", ()):   # the next comes soon after (from the first day not yet planned)
                    arc["soon"] = {"kind": stages[i + 1], "from": (_keeper_day(now) + dt.timedelta(days=2)).isoformat()}
        entry = best["kinds"].get(a["kind"]) or {}   # (an encounter may have started it: notes, regard)
        points = WITNESS_POINTS[k["rarity"]] * (2 if not entry.get("count") else 1)
        entry.setdefault("first", a["start"])
        entry["count"] = entry.get("count", 0) + 1
        entry["last"] = a["start"]
        best["kinds"][a["kind"]] = entry
        best["points"] += points
    best["step"] = max(s for s, need in enumerate(STEPS) if best["points"] >= need)


def current(state, now=None, ahead_minutes=0):
    """Appearances under way now (or starting within ahead_minutes)."""
    now = now or _now()
    out = []
    for a in state.get("appearances", []):
        s, e = _parse(a.get("start")), _parse(a.get("end"))
        if s and e and s - dt.timedelta(minutes=ahead_minutes) <= now < e and not a.get("cancelled"):
            out.append(a)
    return out


def export(world: Path, now=None):
    """What the keep page needs: who is here or about to be, and how they look; and how much
    he can see (visitors see what he sees). Nothing at all while the switch is off."""
    if not enabled():
        return None
    now = now or _now()
    state, best = load(world), load_bestiary(world)
    import encounters                              # (here, to keep the two modules from importing each other at load)
    import visitors
    sends = visitors.can_send_away(world, now)
    here = current(state, now, ahead_minutes=120)
    here_ids = {a["id"] for a in here}
    shown = []
    for a in here:
        if a["kind"] not in KINDS:
            continue
        both_here = bool(a.get("with") in here_ids)   # a stance is only shown while both of them are here
        item = {**{k: a[k] for k in ("id", "kind", "start", "end", "variant", "arrival", "chain", "last", "with",
                                     "with_met", "prevails", "caption", "caption_at", "regard", "person", "bout", "chose") if k in a},
                "render": KINDS[a["kind"]].get("render", a["kind"]), "nature": nature_of(a)}
        if a.get("met"):                           # (his meeting with it is over: the page stops acting out a choice in progress)
            item["met"] = True
        count = (best["kinds"].get(a["kind"]) or {}).get("count", 0)
        item["times"] = max(0, count - (1 if a.get("witnessed") else 0))   # how often it came before (some show themselves more each time)
        if item["nature"] in visitors.HELP_NATURES:   # the "driving it off" meter, as of his last check-in
            item["help"] = (a.get("help") or {}).get("count", 0)   # (the page also counts help live, from the Visit runs)
            item["help_full"] = visitors.HELP_FULL
            item["help_open"] = not a.get("met")
            item["help_sends"] = item["nature"] == "hostile" and sends   # a full meter may still send it away first
            if now < _parse(a["start"]) and encounters.character(a["kind"]).get("signs"):
                item["sign"] = encounters.character(a["kind"])["signs"][0]   # what is seen of it while it is coming
        if a.get("wares"):                         # what a pedlar has on the cloth (what he traded for is gone from it)
            item["wares"] = [w for w in a["wares"] if w not in (a.get("sold") or [])]
        if both_here:
            if a.get("stance"):
                item["stance"] = a["stance"]
            if a.get("stance") in encounters.STANCE_SAYS:
                item["stance_says"] = encounters.STANCE_SAYS[a["stance"]]
        shown.append(item)
    def left_at(a):                                # a hole or mounds are left once it has gone (while it is here, it shows them itself)
        return a.get("end") if a.get("arrival") in LEFT_AFTER else a["start"]
    traces = [{"kind": a["arrival"], "id": a["id"], "since": left_at(a)} for a in state["appearances"]
              if a.get("arrival") and not a.get("cancelled") and _parse(left_at(a)) and
              _parse(left_at(a)) <= now < _parse(left_at(a)) + dt.timedelta(days=TRACE_DAYS[a["arrival"]])]
    for p in places(state, now):                   # what a people has built (it stays): built afresh as each hut is added (sixths)
        traces.append({"kind": p["kind"], "id": f"{p['arc']}-{p['kind']}-{'leaving' if p['leaving'] else int(p['grown'] * 6)}",
                       "since": p["since"], "grown": p["grown"], "leaving": p["leaving"]})
    helpers = visitors.roll(world, now)            # the roll of helpers (recent deeds, screened names only)
    return {"current": shown, "seeing": best["step"], "traces": traces,
            **({"helpers": helpers} if helpers["deeds"] else {})}
