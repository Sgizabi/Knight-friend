"""People on the road: travellers, pedlars with a mule, and knights errant. No AI here: fair rules.

They are beings like the others (creatures.KINDS lane "road"), with three differences:
  - they come along the old road on a lane of their own (creatures.road_day), so they never take
    a day's turn from the beings of the wild, and they never count toward seeing more;
  - each is someone: a name, a manner, and (for knights) a coat of arms. Pedlars are three
    regulars who come round again and again; knights are new or, now and then, one he has met
    before; travellers are strangers passing through. What he knows of each is kept per person
    (bestiary "people"), and their minds remember their own meetings with him;
  - two options of their own: trade (with a pedlar: something of his for something of theirs)
    and spar (with a knight: a friendly bout with blunted blades). Whether to is always his choice.

Peril only: a bout can leave him bruised (an injury that heals in a couple of days, within the
same limits every being keeps to); nothing worse.
"""

import datetime as dt
import random
import re

# --- who they are -----------------------------------------------------------------------------

GIVEN = {"Sir": ["Aldous", "Berrin", "Dunstan", "Edric", "Falk", "Garrow", "Hollis", "Ivo", "Jory", "Kell", "Leofric",
                 "Merrow", "Osric", "Piers", "Tobin", "Wystan", "Anselm", "Corwen", "Hale", "Rowan"],
         "Dame": ["Alis", "Cressa", "Elsabet", "Gwenna", "Maud", "Nell", "Ottilie", "Rosamund", "Sabeth", "Wenna",
                  "Agnes", "Bryony", "Hild", "Joan", "Linnet", "Marrow", "Petra", "Tamsin", "Wilmot", "Ysa"]}
PLACES = ["Harrowmere", "the Low Fells", "Wrenhallow", "Coldwater", "Brackenridge", "the Thornway", "Stillbrook",
          "Oakhollow", "Fernmoor", "Greyford", "Ashdown", "the Saltmarsh", "Kestrel Hill", "Millbeck", "Hartwell",
          "Redmere", "the Long Dale", "Whitlow", "Barrowby", "Glimmerdown"]
# heraldry: a field, maybe divided; one charge. Metals on colours or colours on metals (the old rule).
METALS = {"gold": "#d4a93c", "silver": "#e6e2d8"}
COLOURS = {"red": "#9b2a22", "blue": "#2b4a8c", "green": "#2f6a3a", "black": "#1d1b1b", "purple": "#5b2d6c"}
DIVISIONS = {"plain": "", "pale": "divided down the middle", "fess": "divided across", "bend": "divided on a slant",
             "quarterly": "quartered", "chevron": "with a chevron", "band": "with a broad band across"}
CHARGES = {"tower": "a tower", "key": "a key", "bell": "a bell", "fish": "a fish", "leaf": "an oak leaf",
           "star": "a five-pointed star", "roundels": "three roundels", "lozenge": "a lozenge", "hammer": "a hammer",
           "acorn": "an acorn", "wheel": "a wheel", "none": ""}
MANNERS = {"genial": "cheerful and talkative, easy company", "stern": "formal and sparing with words, but fair",
           "boastful": "full of tales of their own deeds, and fond of a contest", "weary": "long on the road, kind and tired",
           "eager": "young and keen to prove themselves", "seasoned": "old and unhurried, hard to impress, quietly kind"}
HORSES = ["bay", "grey", "black", "chestnut", "dun"]
SKILL = {"young": (.38, .5), "": (.45, .6), "old": (.55, .66)}   # how good a knight is with a blade, by age

# the three pedlars who come round (each with a mule), and what each might have on the cloth
PEDLARS = {
    "tinker": {"name": "Odo Brannock", "who": "a tinker", "mule": "Pebble", "they": "he", "manner": "cheerful, chatty, always mending something",
               "looks": "a stout, red-cheeked tinker with a leather apron and a felt hat, leading a grey mule hung all over with "
                        "pots, pans and bundles of iron that clank as it walks"},
    "spicer": {"name": "Tamsin Ferrow", "who": "a pedlar of cloth, candles and sweet things", "mule": "Bramble", "they": "she",
               "manner": "brisk and sharp at a bargain, but honest",
               "looks": "a tall, quick woman in a russet hooded cloak, leading a brown mule with striped panniers full of cloth, "
                        "candles, little jars and paper twists"},
    "curios": {"name": "Wim Asherby", "who": "a dealer in odd things", "mule": "Quill", "they": "he",
               "manner": "old and dreamy, with a story about where every single thing came from",
               "looks": "a thin old man with a long white beard and a patched blue coat, leading a pale mule with a painted "
                        "box on its back, its little drawers each full of something odd"},
}
# what a ware does once he has it: find (kept with his things), tool (kept, and counts as something he can use with
# the beings, like the things he makes), repair (one session's work on something that needs mending), need (how he
# feels, once: a warm blanket, honey), heal (eases one injury: it heals now)
WARES = {
    "tinker": {"a brass hand-bell": "tool", "a little hand mirror of polished tin": "tool", "a horn lantern": "tool",
               "a bundle of iron nails": "repair", "a mended copper pot": "find", "a good whetstone": "tool"},
    "spicer": {"a thick wool blanket": ("need", {"warmth": 12}), "a bundle of beeswax candles": ("need", {"inspiration": 8}),
               "a twist of salt": "tool", "a pot of heather honey": ("need", {"spirit": 8}), "a skein of red thread": "find",
               "a jar of salve for bruises": "heal"},
    "curios": {"an old map of the hills, inked by hand": ("need", {"inspiration": 6}), "a string of blue glass beads": "find",
               "a carved wooden whistle": "tool", "a packet of flower seeds": "find",
               "a book of riddles with half its pages missing": ("need", {"inspiration": 10}),
               "a brass compass that points not quite north": "find"},
}
CONSUMED = {"a pot of heather honey", "a bundle of beeswax candles", "a jar of salve for bruises"}   # used up, not kept
WARES_SHOWN = 3
# what a pedlar takes in exchange, besides things he owns (named in what he offers): his work, food, a song or a tale
PAY_WORDS = ["help", "work", "carry", "load", "mend", "fix", "shoe", "water for the mule", "water", "bread", "food",
             "firewood", "wood", "song", "sing", "story", "tale", "drawing", "draw", "poem", "write", "letter", "map"]

TRAVELLERS = {   # who passes along the road: a trade each
    "minstrel": "a minstrel", "woodcutter": "a woodcutter", "herbalist": "a herb-gatherer",
    "messenger": "a messenger", "scholar": "a wandering scholar"}
TRAVELLER_NAMES = {"he": ["Hob", "Perrin", "Teodor", "Gil", "Benet", "Drogo", "Emmot", "Noll", "Sim", "Wat", "Huw", "Aldo"],
                   "she": ["Ailsa", "Mab", "Liss", "Orla", "Cat", "Ida", "Lark", "Mattie", "Ros", "Tibby", "Yolande", "Fen"]}


def _rng(*seed):
    return random.Random(":".join(str(s) for s in seed))


def arms(rng):
    """A coat of arms: field (and second tincture if divided), charge, and its colour; plus plain words for it."""
    metal = rng.random() < .5
    pool1, pool2 = (METALS, COLOURS) if metal else (COLOURS, METALS)
    field = rng.choice(list(pool1))
    div = rng.choices(list(DIVISIONS), [4, 2, 2, 2, 1.5, 1.5, 1.5])[0]
    second = rng.choice(list(pool2)) if div != "plain" else ""
    charge = rng.choices(list(CHARGES), [3, 2, 2, 2, 2, 2, 2, 1.5, 1.5, 1.5, 1.5, 2])[0]
    if div in ("plain", "chevron", "band"):          # on the field: the other kind of tincture (and not the chevron's own)
        on = rng.choice([c for c in pool2 if c != second] or list(pool2))
    else:                                            # across a divided field: anything but its two halves
        on = rng.choice([c for c in (list(METALS) + list(COLOURS)) if c not in (field, second)])
    return {"field": field, "div": div, "second": second, "charge": charge, "on": on if charge != "none" else ""}


def blazon(a):
    """The arms in plain words: 'a blue shield quartered with gold, with a silver tower'."""
    if not a:
        return ""
    if a["div"] == "plain":
        s = f"a plain {a['field']} shield"
    elif a["div"] in ("chevron", "band"):
        s = f"a {a['field']} shield with a {a['second']} {'chevron' if a['div'] == 'chevron' else 'band across it'}"
    else:
        s = f"a shield of {a['field']} and {a['second']}, {DIVISIONS[a['div']]}"
    if a["charge"] != "none":
        thing = CHARGES[a["charge"]].split(" ", 1)[1]           # (every tincture's name begins with a consonant: "a gold key")
        s += (f", bearing three {a['on']} roundels" if a["charge"] == "roundels" else f", bearing a {a['on']} {thing}")
    return s


def new_knight(rng, day):
    title = rng.choice(["Sir", "Dame"])
    age = rng.choices(["young", "", "old"], [25, 55, 20])[0]
    manner = rng.choice(["eager", "genial", "boastful"] if age == "young" else
                        ["seasoned", "stern", "weary", "genial"] if age == "old" else ["genial", "stern", "boastful", "weary"])
    name = f"{title} {rng.choice(GIVEN[title])} of {rng.choice(PLACES)}"
    lo, hi = SKILL[age]
    return {"id": f"knight-{day.isoformat()}-{rng.randint(100, 999)}", "kind": "knight", "name": name,
            "they": "he" if title == "Sir" else "she", "age": age, "manner": manner, "arms": arms(rng),
            "horse": rng.choice(HORSES), "skill": round(rng.uniform(lo, hi), 2)}


def new_traveller(rng, form, day):
    they = rng.choice(["he", "she"])                 # (the page draws them as the brain says: man or woman)
    return {"id": f"traveller-{day.isoformat()}-{rng.randint(100, 999)}", "kind": "traveller", "form": form,
            "name": rng.choice(TRAVELLER_NAMES[they]), "who": TRAVELLERS[form], "they": they}


def short(p):
    """What to call them in a sentence: a knight's title and first name; anyone else's first name."""
    name = (p or {}).get("name") or "They"
    return " ".join(name.split()[:2]) if name.split()[0] in ("Sir", "Dame") else name.split()[0]


def pedlar(form):
    p = PEDLARS[form]
    return {"id": f"pedlar-{form}", "kind": "pedlar", "form": form, "name": p["name"], "who": p["who"],
            "mule": p["mule"], "manner": p["manner"], "they": p["they"]}


def person_for(kind, form, state, day, rng):
    """Who comes this time: the pedlar of that form; a knight, new or (now and then) one met before; a passing stranger."""
    roster = state.setdefault("people", {})
    if kind == "pedlar":
        p = roster.get(f"pedlar-{form}") or pedlar(form)
    elif kind == "knight":
        known = [p for p in roster.values() if p.get("kind") == "knight" and p.get("visits")]
        p = rng.choice(known) if known and rng.random() < RETURNING else new_knight(rng, day)
    else:
        p = new_traveller(rng, form, day)
    roster[p["id"]] = p
    return p


RETURNING = .35   # a knight who comes is one he has met before, this often (once he has met any)


def describe(p):
    """What he sees of them (said after their look)."""
    if p.get("kind") == "knight":
        age = {"young": "young, hardly more than a squire", "old": "grey-haired and weathered", "": ""}[p.get("age", "")]
        return (f"A knight on a {p.get('horse', 'bay')} horse, in mail and a surcoat, {age + ', ' if age else ''}"
                f"carrying {blazon(p.get('arms'))}.")
    return ""


def wares_for(a, form):
    """What a pedlar lays out on the cloth this visit (the same all visit)."""
    rng = _rng(a["id"], "wares")
    return rng.sample(list(WARES[form]), WARES_SHOWN)


def ware_does(form, ware):
    d = WARES.get(form, {}).get(ware, "find")
    return d if isinstance(d, tuple) else (d,)


# --- his own skill with a blade: it grows a little with every bout ------------------------------

def bouts(history_lines):
    """How many bouts he has fought (spar steps across all his meetings)."""
    return sum(1 for e in history_lines for s in e.get("steps", []) if s.get("choice") == "spar")


def his_skill(n_bouts):
    return .5 + min(.15, .025 * n_bouts)


# --- matching what he says ---------------------------------------------------------------------

def _words(text):
    return set(re.findall(r"[a-z]{4,}", (text or "").lower()))


COMMON = {"with", "that", "this", "from", "into", "have", "some", "them", "they", "their", "your", "what", "very",
          "little", "good", "made", "old", "small", "something"}


def named_of(names, how):
    """Which of these names his words point to (the one sharing the most distinctive words), or None."""
    said = _words(how)
    best, score = None, 0
    for n in names:
        ws = _words(n) - COMMON
        s = len(ws & said)
        if s > score:
            best, score = n, s
    return best


def his_things(keep):
    """What he could trade: the things he has made (newest last) and what he was given or traded for."""
    return [("object", o["name"]) for o in (keep.get("objects") or [])] + [("find", f["what"]) for f in (keep.get("finds") or [])]


# --- the rules: a trade, a bout ----------------------------------------------------------------

TRADE_ODDS = {"thing": .75, "service": .6, "nothing": .3}   # a deal is struck this often, by what he offers
TRADE_SOUR = .05                                            # the haggling goes badly (no harm: they're put out)
BOUT_INJURY = .4                                            # a lost bout leaves a bruise this often (within the limits)
BOUT_HURTS = ["a bruised shoulder", "a sore wrist", "bruised ribs", "a swollen knee"]


def resolve_trade(a, how, ctx, rng, liked=False):
    """He offers something of his for one of the pedlar's wares. Returns (result, extra): result good/neutral/bad;
    extra says what changes hands."""
    form = (a.get("person") or {}).get("form") or (a.get("variant") or {}).get("kind", "")
    wares = [w for w in (a.get("wares") or []) if w not in (a.get("sold") or [])]
    mine = his_things(ctx["keep"])
    # "X for Y": what he gives comes before the "for", what he wants after it (else both are looked for in all of it)
    parts = re.split(r"\b(?:in exchange for|in return for|for)\b", how or "", flags=re.I)
    give_text, want_text = (" ".join(parts[:-1]), parts[-1]) if len(parts) > 1 else (how or "", how or "")
    gives = named_of([n for _, n in mine], give_text)
    service = liked or any(re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", give_text.lower()) for w in PAY_WORDS)
    pay = "thing" if gives else "service" if service else "nothing"
    good = TRADE_ODDS[pay]
    temper = a.get("temper", "calm")
    good *= .85 if temper == "wary" else 1
    good += .07 * (ctx.get("regard", 0))
    good = max(.05, min(.92, good))
    bad = TRADE_SOUR * (1.3 if temper == "bold" else 1)
    roll = rng.random()
    result = "good" if roll < good and wares else "bad" if roll < good + bad else "neutral"
    gets = (named_of(wares, want_text) or named_of(wares, how) or wares[0]) if wares else None
    kind = next((k for k, n in mine if n == gives), None)
    return result, {"gives": gives, "gives_kind": kind, "gets": gets, "pay": pay, "form": form}


def resolve_bout(a, ctx, rng):
    """A friendly bout with blunted blades: fair rules on how good each is and how he is today."""
    p = a.get("person") or {}
    mine = his_skill(ctx.get("bouts", 0))
    theirs = p.get("skill", .5)
    needs, body = ctx["needs"], ctx["body"]
    sev = sum(i.get("severity", 1) for i in body.get("injuries", []))
    win = .5 + (mine - theirs) + (needs["rest"] - 50) / 300 - .06 * sev - (.05 if needs["warmth"] < 25 else 0)
    win = max(.15, min(.85, win))
    lose = (1 - win) * .6
    roll = rng.random()
    return "good" if roll < win else "bad" if roll < win + lose else "neutral"
