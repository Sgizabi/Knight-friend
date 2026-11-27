"""Who each being is: characters, not scripts. No AI here: plain facts the rules and minds use.

For every kind (the keys match creatures.KINDS):
  traits    who it is, every visit (the spawner's ecology and, later, its behaviour mind read these)
  drives    what it might want this time; one is drawn per visit, so a returning being is the
            same character on a different errand
  signs     what announces it before it arrives (danger he can see coming is fair)
  looks     what he sees once it is here (looks_seeing: what he sees instead once he can see more)
  tell      something it does that he can learn to read (written into his bestiary when he sees it)
  weakness  what keeps a hostile being back: words (whole words or phrases) that, in what he says
            he does, count as using it, and options that use it by their nature (verbs). He is
            never told it; he can find it, and his bestiary remembers what worked.
  likes     things it accepts as an offering (words matched in what he offers)
  voice     it can talk (the minds for this arrive in session 6)
  loud      it wakes him at night; quiet ones he finds out about in the morning
  danger    0 nothing worse than a fright, 1 losses or damage, 2 injury possible, 3 a serious foe
  hurts     the injuries it can cause (peril only: bruises, burns, sprains; never worse)
  damages   what it can harm: a repair (roof, wall, ...) or "building" (one finished building)
  takes     it may make off with something he made
  gifts     what it might leave behind
  trace     what is left if it came while he slept

All of it is described plainly: nothing here tells him what to do.
"""

B = dict

CHARACTERS = {
    "dragon": B(
        traits=["proud", "territorial", "vast", "vain", "remembers"],
        drives=["a high perch to rest on", "to look over what it thinks of as its land", "curiosity about whoever lives here",
                "hunting on the plain", "showing itself off", "passing through, and stopping because the wall is warm"],
        signs=["a shadow sweeps across the courtyard", "a hot wind that smells of struck flint", "every bird goes quiet at once"],
        looks="a dragon, huge and copper-dark, settling on the courtyard wall, its tail hanging down the stones",
        tell="its throat glows just before it breathes fire", likes=["gold", "bright", "polish", "gift", "praise", "bow", "respect", "treasure", "song"],
        voice=True, loud=True, danger=3, hurts=["a burned hand", "a singed forearm"], damages=["roof", "building"],
        gifts=["a shed scale, warm for days"], trace="scorch marks along the top of the wall"),
    "glassbeak": B(
        traits=["greedy", "clever", "skittish", "magpie-minded"],
        drives=["shiny things", "his glass most of all", "something it saw last time", "to show off what it has collected"],
        signs=["something taps on glass, somewhere", "a glitter of light on the wall that isn't the sun"],
        looks="a long-legged bird the size of a heron, its beak a shard of clear glass, eyeing everything that shines",
        tell="it bobs its head before it darts for something", likes=["glass", "shard", "shiny", "bead", "button", "mirror", "trade", "swap"],
        weakness=B(words=["cover", "hide the", "put away", "cloth", "shout", "clap", "flap"], verbs=["prepare"], note="it gives up on what it can't see"),
        danger=1, takes=True, gifts=["a bright pebble, left as if in payment"], trace="small three-toed tracks, and something missing"),
    "basilisk": B(
        traits=["solitary", "slow", "territorial", "patient"],
        drives=["warm stones to lie on", "hunting", "a quiet place to shed", "it was disturbed and is passing through"],
        signs=["a patch of grass gone grey and stiff", "a lizard on the wall, frozen mid-step, made of stone"],
        looks="a long low reptile with a crest of grey plates, moving slowly over the stones, its eyes half-lidded",
        tell="its eyelids lift slowly before its gaze lands", likes=[],
        weakness=B(words=["don't look", "look away", "eyes down", "not meet", "avoid its eyes", "mirror", "reflection", "shut my eyes", "polished", "back turned"],
                   note="its gaze is what does harm; it can't hold what won't meet its eyes"),
        danger=2, hurts=["a stiff, half-numb arm, stone-grey for a while"], damages=[],
        trace="a trail of grass turned to stone"),
    "golem": B(
        traits=["proud", "slow", "old", "stubborn", "fair-minded"],
        drives=["to see who has been mending it", "an old grievance about how it was knocked down", "to stretch after a long sleep",
                "to help with the heavy stones, if asked well"],
        signs=["the east wall's stones grind against each other", "a warm glow between the stones of the wall"],
        looks="the east wall's stones heaving up into a shape like a giant, magma glowing in the seams between them",
        tell="its seams glow brighter when it is angry", likes=["thank", "mend", "respect", "help", "ask", "mortar", "stone"],
        voice=True, loud=True, danger=2, hurts=["a bruised side"], damages=["wall"],
        gifts=["help with one heavy stone"], trace="the east wall's stones settled in a slightly different order"),
    "well": B(
        traits=["patient", "cryptic", "old", "proud", "curious"],
        drives=["to watch who draws the water", "to trade a riddle", "to be acknowledged", "boredom"],
        signs=["the well breathes out cold air", "a slow knocking from deep in the well"],
        looks="grey tentacles curling over the lip of the well, and one great pale eye rising behind them",
        tell="the water rises when it is pleased and drains when it isn't", likes=["riddle", "story", "song", "bucket", "respect", "lantern"],
        voice=True, danger=1, hurts=[], damages=[], takes=True, gifts=["a true answer to something", "an old coin from the bottom"],
        trace="wet marks around the well, far wider than the well"),
    "hill": B(
        traits=["vast", "slow", "ancient", "sleeping", "indifferent"],
        drives=["it stirs in its sleep", "it opens an eye to see the sky", "something woke it"],
        signs=["the ground hums under your feet", "trees out on the plain to the south sway with no wind"],
        looks="a long green hill lying on the plain to the south that was not there before, trees and boulders on its back, "
              "breathing so slowly you have to watch to be sure; now and then a fold in its side peels open on an eye the size of a cottage",
        tell="the grass ripples just before it moves", likes=["quiet", "song", "stillness"],
        voice=True, loud=True, danger=1, hurts=[], damages=["wall"], gifts=["a new spring of clear water at the hill's foot"],
        trace="a long hollow pressed into the plain where a hill lay, the grass flattened and the turf torn"),
    "whale": B(
        traits=["gentle", "vast", "migrating", "musical"],
        drives=["passing over on its way somewhere", "following the clear night", "singing"],
        signs=["a low note, more felt than heard", "the stars to the north go out in a long shape"],
        looks="a whale drifting through the night sky, pale and enormous, singing as it goes",
        tell="it sings lower when it is about to turn", likes=["song", "light", "lantern", "wave"],
        danger=0, gifts=["a feather-like scale that drifts down slowly"], trace="a long, thin cloud in the shape of a fin"),
    "wyrm": B(
        traits=["hungry", "blind", "territorial", "burrowing", "drawn by vibration"],
        drives=["hunting by the shaking of the ground", "a new tunnel", "warmth under the hearth", "stirred by the hill"],
        signs=["a tremor, then another, closer", "cracks spreading across the courtyard flagstones"],
        looks="a great pale worm-like wyrm bursting up through the courtyard, ringed mouth wide, feeling the air",
        tell="it follows footsteps: it turns toward anything that moves", likes=[],
        weakness=B(words=["stand still", "keep still", "stay still", "hold still", "not move", "don't move", "freeze", "stay quiet",
                          "silent", "throw", "distract", "drum", "far side"],
                   note="it hunts by feeling movement; stillness hides you, and noise elsewhere draws it"),
        loud=True, danger=2, hurts=["a twisted ankle", "a bruised side"], damages=["building", "doorway"],
        trace="a sinkhole by the courtyard, already settling"),
    "moths": B(
        traits=["light-hungry", "many", "drawn to fire"],
        drives=["the firelight", "lamp oil", "following the Lantern Folk's light"],
        signs=["the fire gutters, then gutters again", "soft wingbeats against the shutters"],
        looks="a cloud of grey moths, each the size of a hand, crowding the firelight and drinking it dim",
        tell="the fire shrinks wherever they settle", likes=["lantern", "candle", "light", "torch", "oil"],
        weakness=B(words=["smoke", "dark", "put out", "douse", "cover the fire", "lantern outside", "lure", "decoy"], note="lure their hunger elsewhere"),
        danger=0, takes=False, gifts=["dust from their wings that glows faintly for a night"], trace="soot-pale wing dust on the hearth"),
    "barrow": B(
        traits=["proud", "dutiful", "old", "lonely", "honourable"],
        drives=["to find the one who keeps this hold", "an old battle it thinks is still being fought", "to be remembered",
                "to test a fellow knight"],
        signs=["the clink of old armour beyond the west wall", "a cold mist rolls in from the west, low to the ground"],
        looks="a tall knight in ancient, moss-grown armour standing beyond the west wall, its visor dark",
        tell="it lowers its sword to show it will talk", likes=["salute", "name", "story", "duel", "respect", "remember", "honour", "oath"],
        voice=True, loud=True, danger=2, hurts=["a bruised shoulder", "a cut-free but stinging knock to the arm"], damages=[],
        gifts=["an old badge of rank"], trace="deep footprints in the frost beyond the west wall"),
    "fog": B(
        traits=["patient", "many-eyed", "drawn to cold", "cowardly"],
        drives=["drifting in with the damp", "watching", "the cold", "creeping closer to the warm"],
        signs=["the fog thickens in the courtyard", "something blinks in the mist"],
        looks="a bank of fog with eyes in it, opening and closing, edging toward the light",
        tell="it pulls back from heat", likes=[],
        weakness=B(words=["fire", "torch", "flame", "heat", "light", "brand", "hearth"], verbs=["hide"], note="it can't stand heat or bright light"),
        danger=1, hurts=[], damages=[], trace="frost on the inside of the shutters"),
    "ninefold": B(
        traits=["vast", "watchful", "silent", "unknowable"],
        drives=["watching the sky", "watching him", "something only it understands"],
        signs=["the stars to the east look wrong, as if rearranged", "the feeling of being looked at, from everywhere"],
        looks="a great ring of old bone, like a spine bent into a circle, hanging in the night sky over the courtyard, "
              "nine eyes set into it, no two alike, each looking at something different",
        tell="now and then all nine eyes turn to the same thing, one after another, and the ring stops turning", likes=["stillness", "look back", "light"],
        danger=0, gifts=["a dream you can't stop thinking about"], trace="a ring of flattened grass on the plain"),
    "moon2": B(
        traits=["vast", "silent", "drifting"],
        drives=["it rises", "small things fall from it tonight"],
        signs=["a second shadow under everything", "a green tint to the night"],
        looks="a second moon, pale green and ringed, rising beside the first",
        tell="small lights fall from it when it is high", likes=[],
        danger=0, gifts=["a small green stone that fell from it"], trace="a small green stone in the courtyard"),
    "larva": B(
        traits=["gentle", "curious", "growing", "hungry for warmth"],
        drives=["warmth", "it is lost", "it is looking for whoever it saw last time", "food"],
        signs=["a soft glow moving through the long grass", "a faint chirring, like a cricket singing underwater"],
        looks="a pale, soft grub as big as a cart, lit from inside with starlight, curled in a crater beyond the south wall, lifting its head toward the warmth of the keep",
        tell="it glows brighter when it is content", likes=["warm", "fire", "food", "bread", "blanket", "stroke", "gentle"],
        danger=0, gifts=["a cast-off skin that glows for a while"], trace="a glowing slime trail that fades by noon"),
    "listener": B(
        traits=["curious", "shy", "silent", "attentive"],
        drives=["to listen to the keep", "a sound it heard last time", "his voice", "the music of the place"],
        signs=["the wind drops and everything sounds very loud", "a tall shape at the edge of the trees, very still"],
        looks="a tall, pale creature at the edge of the trees, its antlers ending in ears, all turned toward the keep",
        tell="its ears all turn toward whatever it likes best", likes=["song", "music", "hum", "story", "whistle", "quiet"],
        danger=0, gifts=["a sound you can't forget"], trace="hoofprints at the tree line, all facing the keep"),
    "leech": B(
        traits=["drifting", "dreaming", "indifferent"],
        drives=["passing over the sleeping", "feeding on dreams", "drifting with the night wind"],
        signs=["your eyes grow heavy all at once", "the air tastes of copper"],
        looks="a long clear shape swimming through the air over the roof, small stars and flickering dreams inside it, a round mouth and no face",
        tell="it lingers longest over the most vivid sleepers", likes=[],
        danger=0, gifts=["a dream not your own"], trace="that you had dreamed a dream that wasn't yours"),
    "seam": B(
        traits=["unknowable", "patient", "curious"],
        drives=["something on the other side wants to see", "the seam opens on its own"],
        signs=["a line in the air that doesn't move when you do", "a sound like cloth tearing, very far away"],
        looks="a tear in the air above the courtyard, its edges bright and torn like cloth; through it, a dim violet somewhere "
              "else and something enormous moving slowly past, and now and then a long pale hand feeling its way through",
        tell="it widens when it is watched", likes=["hand", "touch", "light", "gift"],
        danger=1, gifts=["something from the other side, small and strange"], trace="a faint line in the air that fades by dawn"),
    "bloom": B(
        traits=["courteous", "curious", "patient", "unsettling"],
        drives=["to ask the way", "to learn about him", "to rest by the fire", "to trade stories"],
        signs=["a sweet smell, like too many flowers", "footsteps on the road, unhurried"],
        looks="a traveller in a long coat with a wide hat, polite and soft-spoken",
        looks_seeing="a traveller whose head is a great slow-opening flower, petals curling as it speaks",
        tell="it tilts its head when it is pleased", likes=["story", "tea", "seat", "welcome", "talk", "seeds", "flower"],
        voice=True, danger=1, hurts=[], damages=[], gifts=["a seed that grows fast in the glasshouse"], trace="petals on the doorstep"),
    "warden": B(
        traits=["courteous", "dutiful", "secretive", "trading"],
        drives=["walking its rounds", "to trade a secret", "it is looking for something it lost"],
        signs=["a lantern light moving along the top of the wall", "a slow, measured tread on the walls"],
        looks="a tall robed figure walking the walls with a lantern, its face in shadow",
        looks_seeing="a tall robed figure with a lantern, and something small and alive moving inside the lantern",
        tell="the lantern brightens when it hears something true", likes=["trinket", "gift", "true", "secret", "trade", "object"],
        voice=True, danger=0, gifts=["a true secret"], trace="lantern-soot on the wall top"),
    "brood": B(
        traits=["many", "thieving", "skittish", "nocturnal"],
        drives=["tools", "glass", "anything small", "bedding for their nest"],
        signs=["little scrabbling sounds in the dark", "something knocks over a cup in the hall"],
        looks="small pale things, all elbows and eyes, scuttling off with whatever they can carry",
        tell="they freeze when they are seen, then scatter", likes=["crumbs", "food", "trade"],
        weakness=B(words=["light", "lantern", "torch", "lock", "box", "shut", "hide", "bang", "clap"], verbs=["prepare"], note="they scatter from light and noise"),
        danger=1, takes=True, trace="small pale handprints, and something missing"),
    "longman": B(
        traits=["patient", "silent", "stalking", "unseen"],
        drives=["watching from the field", "coming a little closer", "waiting"],
        signs=["a tall shape in the field that wasn't there before", "it is closer each time you look away"],
        looks="a very tall, very thin figure standing in the field, its face nothing but a void with faint specks",
        tell="it only moves when you aren't looking", likes=[],
        weakness=B(words=["watch it", "keep watching", "watching it", "stare", "don't look away", "not look away", "eyes on",
                          "keep my eyes", "hold its gaze", "keep looking", "never look away"], verbs=["watch"],
                   note="it moves only when unwatched; watching it holds it in place"),
        danger=1, hurts=[], damages=[], trace="tall, narrow footprints in the field, closer than you would like"),
    "stitched": B(
        traits=["vast", "unknowable", "watchful"],
        drives=["something looks through", "the seams loosen"],
        signs=["lines in the sky like stitching", "the stars on one side of the sky go dim"],
        looks="long pale scars across the night sky, stitched shut, the stars drifting toward them; one opens, its stitches "
              "pulling taut, and an eye far larger than the gap looks down through it",
        tell="a seam opens wider when the fire is bright", likes=[],
        danger=0, gifts=["a thread of something like starlight caught on the tower"], trace="faint lines left across the dawn sky"),
    "manyjoint": B(
        traits=["patient", "light-shy", "folding", "stalking"],
        drives=["a dark corner to fold into", "creeping in from the light", "hunting the sleeping"],
        signs=["a creak in the rafters with no wind", "the corner of the hall seems darker than it should"],
        looks="something pale with far too many limbs, and far too many joints in each, folded into the hall's high corner, "
              "unfolding slowly down the walls toward the room",
        tell="it unfolds only where the light doesn't reach", likes=[],
        weakness=B(words=["light", "lantern", "torch", "fire", "bright", "candle"], note="it can't bear light; it draws in from it"),
        danger=2, hurts=["a wrenched shoulder"], damages=[], trace="scratches high in the hall's corner"),
    "lanternheads": B(
        traits=["gentle", "travelling", "many", "quiet"],
        drives=["passing through on their way somewhere", "following an old road", "resting their lights"],
        signs=["a line of small lights coming over the hill", "soft footsteps, many of them"],
        looks="a procession of figures with lanterns for heads, crossing the courtyard in single file, going somewhere",
        tell="their lanterns dim when they are afraid", likes=["light", "lantern", "wave", "bow", "oil", "candle"],
        danger=0, gifts=["a lantern-wick that never quite goes out"], trace="a line of small footprints crossing the courtyard"),
    "cartographer": B(
        traits=["gentle", "wandering", "curious"],
        drives=["resting on its long journey", "looking for a landmark", "the warm stones"],
        signs=["a large shadow flutters over the courtyard at dusk", "fine dust that glitters in the last light"],
        looks="a moth as wide as a cart, its wings patterned with a map of somewhere real",
        tell="its wings show more of the map the longer it rests", likes=["light", "rest", "quiet", "stillness"],
        danger=0, gifts=["a copy of part of the map, in your own drawing"], trace="glittering dust on the tower"),
    "thorn": B(
        traits=["territorial", "wild", "proud", "renewing"],
        drives=["walking its old paths", "where the brambles want to grow", "to see what has been planted"],
        signs=["brambles spring up overnight along the path", "the smell of crushed green leaves"],
        looks="a great stag woven of brambles and thorn, flowers in its antlers, brambles springing up where it steps",
        tell="the brambles grow faster when it is uneasy", likes=["seed", "water", "plant", "garden", "flower", "respect"],
        danger=1, hurts=["a scratched arm"], damages=["building"], gifts=["a cutting that grows into anything"],
        trace="new brambles along the path"),
    "ashwolves": B(
        traits=["pack", "fire-drawn", "hungry", "watchful"],
        drives=["the forge's heat", "hunting", "a den for the night", "the young one is curious"],
        signs=["a smell of smoke on the wind", "embers drifting with no fire to make them"],
        looks="a pack of wolves made of smoke and embers circling just beyond the walls, one standing apart, keeping watch",
        tell="the watcher howls before the pack moves", likes=["fire", "embers", "meat", "heat"],
        weakness=B(words=["water", "douse", "bucket", "rain", "wet", "bank the fire", "cold", "quench"], note="water and cold quench them"),
        loud=True, danger=2, hurts=["a burned hand", "a scorched sleeve and a sore arm"], damages=["building", "roof"],
        trace="scorch marks in a ring around the forge"),
    "bellcrab": B(
        traits=["slow", "proud of its bell", "curious", "stubborn"],
        drives=["looking for a better shell", "the warm stones", "to ring its bell"],
        signs=["a bell tolling, very slowly, from the direction of the shore", "a heavy scraping across the courtyard"],
        looks="a crab the size of a cart, wearing an old watchtower bell as its shell",
        tell="it rings the bell when it is annoyed", likes=["shell", "bell", "polish", "bucket", "fish"],
        danger=1, hurts=["a pinched hand"], damages=["wall"], gifts=["a ring of the old bell, which carries for miles"],
        trace="a long drag-mark across the courtyard"),
    "crawl": B(
        traits=["slow", "relentless", "patient"],
        drives=["toward the keep", "toward warmth"],
        signs=["a dark line on the plain that is a little closer each day"],
        looks="a long, low, many-legged shape crawling across the plain toward the keep, slow and steady",
        tell="it pauses whenever the fire is bright", likes=[],
        weakness=B(words=["fire", "torch", "light", "bright", "wall", "drive", "turn it back", "blaze"], note="bright fire turns it back"),
        danger=1, hurts=[], damages=["wall"], trace="a flattened trail across the plain"),
    "axolotl": B(
        traits=["gentle", "slow", "warmth-loving", "trusting"],
        drives=["warmth", "the puddles after the rain", "it is curious about the fire"],
        signs=["a wet slap of something heavy in the puddles", "a soft pink shape at the edge of the courtyard"],
        looks="a huge pink axolotl, as big as a pony, wading in from the rain and smiling its wide smile",
        tell="its gills flush pink when it is happy", likes=["warm", "fire", "water", "food", "fish", "pat", "gentle"],
        danger=0, gifts=["a smooth river stone it carried"], trace="wide wet footprints leading to the hearth and back"),
    "thincrowd": B(
        traits=["many", "patient", "silent", "gathering"],
        drives=["gathering", "coming one step closer", "waiting at the edge of the light"],
        signs=["one more shape at the edge of the field than last evening", "the feeling of a crowd where there is none"],
        looks="thin grey figures standing in a loose crowd at the edge of the field, one more than before, a step closer",
        tell="they only come closer while the light is failing", likes=[],
        weakness=B(words=["light", "lantern", "fire", "torch", "bright", "count them", "name them"], note="light and steady attention send them back"),
        danger=1, hurts=[], damages=[], trace="a ring of trampled grass at the field's edge"),
    "bentone": B(
        traits=["stalking", "patient", "light-bound"],
        drives=["creeping toward the warmth", "hunting", "waiting for the fire to flicker"],
        signs=["the fire flickers and something outside has moved", "a figure at the window, bent double, closer each flicker"],
        looks="a figure bent double, all spine and long arms, frozen mid-step, closer every time the fire flickers",
        tell="it moves only when the fire flickers", likes=[],
        weakness=B(words=["steady fire", "keep the fire", "tend the fire", "feed the fire", "bank the fire", "build up the fire", "logs", "steady"],
                   note="a steady fire keeps it frozen"),
        danger=2, hurts=["a wrenched arm"], damages=["doorway"], trace="handprints on the shutters, too long"),
    "watcher": B(
        traits=["patient", "staring", "silent"],
        drives=["looking in", "watching him sleep", "it wants to be noticed"],
        signs=["a shadow across the window, far too high", "the glass fogs from the outside"],
        looks="a face at the window, far too high up, long and pale, watching without blinking",
        tell="the glass cracks the longer it is ignored", likes=[],
        weakness=B(words=["shutter", "close the", "cover the window", "curtain", "look back", "face it", "board"], note="it can't stand being shut out, or looked at in return"),
        danger=1, hurts=[], damages=["window"], trace="a crack across the window glass"),
    "doorway": B(
        traits=["patient", "polite in a terrible way", "waiting"],
        drives=["to be invited in", "standing at the threshold", "waiting"],
        signs=["a knock, once, very slow", "the doorway is darker than the night behind it"],
        looks="a figure too tall for the door frame standing just outside, head bowed under the lintel, hands on the jambs",
        tell="it never steps over the threshold uninvited", likes=[],
        weakness=B(words=["shut the door", "close the door", "bar the door", "bar it", "not invite", "don't invite", "say no", "refuse"], verbs=["hide"],
                   note="a shut door turns it away; it can't come in uninvited"),
        danger=1, hurts=[], damages=["doorway"], trace="two long handprints on the door frame"),
    # otherworldly
    "nightgrown": B(
        traits=["many", "silent", "listening", "star-born"],
        drives=["listening to the sky", "gathering", "they came down with the falling stars"],
        signs=["a streak across the sky and a thud somewhere on the plain", "stars that seem to move inside shapes on the plain"],
        looks="thin, stooped figures of dark glass on the plain, constellations drifting inside them, faces a single seam of light, reaching for the sky",
        tell="they all reach up at once, then lower their arms together", likes=["stillness", "quiet", "light", "star"],
        danger=0, gifts=["a shard of dark glass with a star moving inside it"], trace="a smoking crater on the plain"),
    "clockhead": B(
        traits=["many-minded", "lost in time", "indifferent", "patient, then restless"],
        drives=["walking somewhere only it knows", "looking for the right hour", "time has slipped here",
                "to watch whoever keeps time here"],
        signs=["the fire flickers backward", "a steady ticking, coming from no clock", "you lose a minute you can't account for"],
        looks="a very tall, thin figure in a long coat with a high collar, and one head at a time: a clock, an hourglass, "
              "a metronome, a galaxy turning under glass, or a gilded smiling mask",
        tell="a head sinks into its collar and another rises just before its mood changes",
        likes=["clock", "time", "bell", "wait", "stillness", "patience", "rhythm", "music", "stars"],
        danger=1, hurts=[], damages=[], gifts=["an hour you remember twice"],
        trace="a little spilled sand on the flagstones, and every candle burned down to the same height"),
    # not of this world
    "stranger": B(
        traits=["not of this world", "watchful", "mimicking", "ever-adaptive", "unknowable"],
        drives=["to watch him from the trees", "to come closer than last time, in a new shape", "to learn how the people here walk",
                "to see whether it can pass for one of them", "something nobody could guess"],
        signs=["a tree at the forest edge that wasn't there yesterday", "the birds go quiet all along the treeline",
               "something tall leans out from behind a tree, and back again"],
        looks="something far too tall at the forest edge, peering out from behind a tree: a pale smiling mask on a dark head",
        tell="the moment it knows it has been noticed, it stops breathing and goes perfectly still", likes=[],
        weakness=B(words=["i see you", "i know what you are", "not a tree", "you're not", "you are not", "call out", "point at it",
                          "name it", "what it is", "unmask", "take off"],
                   note="seen for what it is, and told so, it goes back into the trees"),
        danger=2, hurts=["a wrenched arm", "a long scratch across the back of the hand"], damages=[],
        trace="very long footprints at the forest edge, made by different boots, all the same length"),
    "glassy1": B(
        traits=["careful", "curious", "solitary", "scientific"],
        drives=["taking samples", "measuring the keep", "looking at him, a little"],
        signs=["a pale beam of light comes down on the hills, with no sound", "a seed-shaped craft settling in the grass"],
        looks="a small, careful being of glassy light stepping from a seed-shaped craft, taking samples of soil, grass and water",
        tell="it tilts its head and its light flickers when it is curious", likes=["sample", "show", "gift", "stone", "water", "slow", "wave"],
        danger=0, gifts=["a smooth glass bead left on the wall"], trace="a scorched ring in the grass on the hills"),
    "glassy2": B(
        traits=["quick", "careful", "many", "mapping"],
        drives=["mapping the land", "sweeping the plain with light", "watching him from a distance"],
        signs=["thin beams of light sweeping the plain", "three or four quick lights moving in a line across the hills"],
        looks="three or four slim, quick beings of glassy light that come down a craft's beam and scatter over the land, running "
              "on their toes from place to place and stopping to sweep the ground with beams from their faces",
        tell="their beams stop on whatever interests them", likes=["map", "show", "wave", "light", "gift"],
        danger=0, gifts=["a map of the keep drawn in light on the flagstones, gone by morning"], trace="lines of light on the plain, fading"),
    "glassy3": B(
        traits=["many", "building", "careful", "organised"],
        drives=["a camp for a night or two", "studying the keep", "to meet him, perhaps"],
        signs=["several craft settling on the plain", "a glow on the plain like a small town"],
        looks="a camp of light on the plain, several craft, sturdy glassy builders and slim scouts moving among them",
        tell="they gather around whatever they mean to show", likes=["gift", "show", "trade", "welcome", "wave", "light"],
        danger=0, gifts=["a small device of glass that hums near the fire"], trace="circles of scorched grass on the plain"),
    "glassy4": B(
        traits=["regal", "luminous", "curious", "calm"],
        drives=["to see the keep with its own eyes", "to meet whoever its people spoke of"],
        signs=["a vast craft eases into the sky over the plain, so big the stars go out behind it",
               "beams of light come down from it onto the plain, one after another, and in each someone stands"],
        looks="a tall, luminous being with a crest of glass blades and a faint ring of light behind its head, walking toward the "
              "keep under an arch of staffs of light held up by two lines of attendants, the ground lighting under each step; a great "
              "craft settled behind it, and a far vaster one hanging in the sky over the plain, the plain gone faintly teal beneath it",
        tell="its crest brightens when it is pleased", likes=["welcome", "bow", "gift", "show", "respect"],
        danger=0, gifts=["a gift from their people"], trace="a great scorched circle on the plain"),
    # the Tidekin, the people of the lake
    "tidekin1": B(
        traits=["shy", "curious", "gentle", "skittish", "of the water"],
        drives=["to see who lives in the stone house", "following the keep's firelight across the water", "curiosity, and nothing more",
                "it was fishing at dusk and saw the smoke"],
        signs=["rings spreading on the still lake where nothing jumped", "a small warm light moving under the water near the shore"],
        looks="a sleek being like an otter with a newt's flat tail, dark green-bronze with a pale belly, head and shoulders out of "
              "the lake at dusk, holding up a spiral shell that glows like a lantern, and watching the keep",
        tell="it tilts its head, and its shell-light brightens, when it is curious", likes=["wave", "slow", "quiet", "sit", "fish", "shell", "light",
                                                                                          "lantern", "song", "hum", "gift"],
        danger=0, gifts=["a smooth river stone with a hole worn through it"], trace="small webbed prints on the shore, going back into the water"),
    "tidekin2": B(
        traits=["shy", "gentle", "musical", "many", "skittish", "of the water"],
        drives=["fishing along the shore", "singing the evening in", "to look at the keep from closer", "teaching a young one to fish"],
        signs=["a soft humming from the lake, many voices and no words", "warm lights bobbing along the shore at dusk"],
        looks="three of the lake folk on the shore at dusk, sitting back on their tails and singing without words while one of them "
              "fishes with a line, their shell-lanterns glowing beside them",
        tell="when they are at ease the singing goes on; when they are uneasy it stops all at once", likes=["song", "sing", "hum", "listen", "fish",
                                                                                                          "wave", "sit", "quiet", "bread", "gift"],
        danger=0, gifts=["a fresh fish, still cold from the lake", "a spiral shell, the colour of the evening"],
        trace="a ring of flattened reeds on the shore, and fish scales shining in the grass"),
    "tidekin3": B(
        traits=["gentle", "curious", "trading", "many", "building", "of the water"],
        drives=["to trade", "to show what they have made", "to see what he makes", "cutting reeds for the village"],
        signs=["a little reed boat poling along the lake's edge", "voices humming from the village of reeds across the water"],
        looks="a few of the lake folk come up from their floating village of reeds with river stones, shells and a fish on a cord, "
              "and set them out on a flat stone by the shore, as if to trade",
        tell="they set out what they have and step back from it, and wait", likes=["carving", "carved", "whittle", "rope", "cord", "net", "basket", "woven", "bread", "pot", "bowl", "cloth", "made", "trade", "swap", "gift", "candle", "hook", "knot"],
        danger=0, gifts=["a smooth river stone with a hole worn through it", "a spiral shell, the colour of the evening",
                         "a fresh fish, still cold from the lake", "a little boat woven of reeds"],
        trace="a flat stone by the shore, with wet marks where things were set out"),
    "tidekin4": B(
        traits=["ancient", "slow", "gentle", "wise", "of the water"],
        drives=["to see for itself the one its people speak of", "to thank him", "to ask nothing at all, only to look"],
        signs=["every shell-light in the reed village gathers at the water's edge at once", "the slow tap of a staff on the shore path"],
        looks="the eldest of the lake folk: very old, crusted with barnacles, walking slowly up from the lake with a staff of "
              "driftwood and a great shell-lantern, which it lifts toward the keep",
        tell="it lifts its lantern toward you when it means to greet you", likes=["bow", "welcome", "respect", "sit", "slow", "gift", "song",
                                                                                 "listen", "quiet", "kneel"],
        danger=0, gifts=["a pearl the size of a thumbnail, faintly warm"],
        trace="a line of slow webbed prints from the lake to the wall and back, with the taps of a staff beside them"),
    # the Burrowfolk, the people under the plain
    "burrow1": B(
        traits=["young", "lost", "curious", "timid", "skittish", "of the earth"],
        drives=["it dug the wrong way in the dark and came up somewhere new", "following the smell of bread down through the earth",
                "chasing a beetle through the tunnels, much too far", "it is lost, and trying to find the way home"],
        signs=["a scratching, somewhere under the courtyard grass", "a patch of courtyard turf trembles and lifts, and earth trickles out from under it"],
        looks="a small furry digger no bigger than a cat, like a mole crossed with a badger cub, with a white stripe down its nose, "
              "big dark eyes and one tiny glowing mushroom sprouting on its back, poking its head out of a fresh hole in the courtyard "
              "and looking about",
        tell="its nose never stops twitching; when it is frightened it ducks straight back down its hole",
        likes=["bread", "crumb", "crumbs", "food", "beetle", "worm", "quiet", "slow", "soft", "kneel", "sit", "gentle", "hum", "gift",
               "seed", "nut", "berry", "water"],
        danger=0, gifts=["a round pebble it dug up, still wet with clay"],
        trace="a hole in the courtyard, with fresh earth heaped round it and small clawed prints"),
    "burrow2": B(
        traits=["anxious", "protective", "many", "diggers", "wary", "of the earth"],
        drives=["looking for their lost little one", "following the little one's scent to the keep", "calling for a youngster that did not come home",
                "to find out where the little one went"],
        signs=["fresh mounds of earth push up across the plain, one after another, coming toward the keep",
               "a muffled digging under the ground near the wall"],
        looks="two broad, low diggers like big badgers with a mole's snout and spade claws, in leather aprons, with clusters of "
              "glowing mushrooms growing on their backs like lanterns; they push up out of fresh mounds of earth by the wall, sniff "
              "the air, and call down into the ground",
        tell="they stand up tall and sniff toward whatever they are unsure of; when they are angry they thump the ground with their claws",
        likes=["little one", "youngster", "small one", "found", "safe", "home", "went", "point", "show", "bread", "gift", "quiet", "kneel"],
        danger=1, hurts=[], damages=["wall"], harm_how={"wall": "undermined: the ground sank at its foot and stones slipped"},
        gifts=["clay packed hard at the foot of your east wall, where it was weak"],
        trace="a line of fresh mounds across the plain, ending at the wall"),
    "burrow3": B(
        traits=["gentle", "patient", "many", "growing", "of the earth"],
        drives=["tending the mushroom hollow", "bringing up new spawn from below", "to show what grows in the hollow", "harvesting the ripe caps"],
        signs=["a soft glow rising from the hollow on the plain", "the smell of fresh-turned earth on the wind"],
        looks="a few of the Burrowfolk out in their hollow on the plain, tending beds of tall glowing mushrooms, gold and green and "
              "violet, carrying baskets and watering the beds from clay pots, the mushrooms on their own backs glowing too",
        tell="when they are pleased they hum, low, and the mushrooms on their backs brighten",
        likes=["water", "bucket", "basket", "spade", "trowel", "dig", "help", "seed", "compost", "bread", "pot", "gift", "kneel",
               "quiet", "made"],
        danger=0, gifts=["a lantern-mushroom in a clay pot, which glows at night", "a basket of mushrooms, good to eat"],
        trace="baskets left at the edge of the hollow, and the beds freshly watered"),
    "burrow4": B(
        traits=["ancient", "huge", "gentle", "nearly blind", "slow", "of the earth"],
        drives=["to meet the one who met her little one"],   # (each visit's own drive comes from FORM_DRIVES: thanks or scolding)
        signs=["the ground trembles, long and slow, and the bucket in the well rattles on its rope",
               "every mushroom-light in the hollow on the plain goes out at once, then comes back brighter"],
        looks="the Burrow-Mother: a huge digger as big as a cottage, grey-furred and old, her back a garden of glowing mushrooms, "
              "rising slowly out of the plain near the keep with earth pouring off her shoulders; her eyes are milky and nearly "
              "blind, and she finds the keep by smell, her great nose working",
        tell="she cannot see well: she turns her nose toward a voice, and lowers her head to listen",
        likes=["sorry", "apologise", "apologize", "thank", "welcome", "bow", "kneel", "gift", "bread", "quiet", "slow", "hum",
               "song", "little one", "youngster", "speak", "voice"],
        danger=0, gifts=["a stone from deep under the plain, warm, with veins that glow faintly"],
        trace="a great round patch of churned earth on the plain, already settling"),
    # the Kitemakers, the people of the wind (they come only when it blows). What they shed is real silk and down: kept.
    "kite1": B(
        traits=["curious", "light", "quick", "watchful", "of the wind"],
        drives=["scouting ahead of its people on the wind", "looking for somewhere high to rest", "riding the wind front to see what lies along it",
                "following the wind to the highest stones about"],
        signs=["a bright speck wheeling high over the plain, too steady for a bird",
               "something like a loose kite rides the wind toward the keep, as often against the wind as with it"],
        looks="a long-limbed, very light being no taller than a child, with sheets of patterned silk stretched between its arms and legs "
              "like a kite; it glides in on the wind, lands on top of the tower with a snap of silk, folds the silk about itself and "
              "looks around, the fine filaments on its head streaming in the wind",
        tell="it holds its silk half open while it is unsure, ready to let the wind take it; folded right up, it is at ease",
        likes=["high", "wind", "kite", "silk", "thread", "cloth", "ribbon", "string", "colour", "pattern", "still", "quiet", "watch", "wave",
               "flag", "banner"],
        danger=0, gifts=["a strip of patterned kite-silk, red and gold, light as breath"],
        trace="a strip of patterned silk caught on the tower's stones, snapping in the wind"),
    "kite2": B(
        traits=["many", "light", "joyful", "restless", "travelling", "of the wind"],
        drives=["riding the wind front across the plain", "passing over on their way along the wind", "playing in the gusts over the keep",
                "following the way their scout went"],
        signs=["specks of colour gather on the wind above the hills to the west", "a far, thin whistling, like wind through many strings"],
        looks="a flock of Kitemakers, a dozen or more, sweeping over the keep on the wind: long-limbed gliders with silk between arm and "
              "leg, each patterned differently like a kite, red and gold and blue and green, two long ribbon-tails streaming behind each; "
              "they wheel over the courtyard, low enough to hear their silk thrum, and ride on",
        tell="when they are pleased they tumble over and over in the air; when they are wary they climb high and go silent",
        likes=["wave", "flag", "banner", "cloth", "ribbon", "colour", "kite", "cheer", "whistle", "song", "music", "watch", "wind"],
        danger=0, gifts=["a long striped tail-ribbon that came loose and drifted down into the courtyard",
                         "a tuft of fine pale down from the edge of a Kitemaker's silk"],
        trace="a ribbon of silk come down in the courtyard"),
    "kite3": B(
        traits=["many", "tired", "wary", "light", "sheltering", "of the wind"],
        drives=["the gale is too much even for them: they have come down to rest out of it", "sheltering on the lee side of the walls until the wind drops",
                "waiting out the wild wind", "resting their silk"],
        signs=["in the howling wind, shapes are tumbling down out of the sky toward the keep", "something taps and scrabbles along the top of the wall"],
        looks="a dozen or so Kitemakers clinging along the tops of the keep's walls out of the wild wind, silk wrapped tight round "
              "themselves like folded kites, heads tucked low, huddled in a row on the lee side of the stones; now and then one loses "
              "its grip, is snatched up by the wind with a crack of silk, and scrambles back",
        tell="they huddle closer together, all at once, when something worries them; they open their silk a little when they're at ease",
        likes=["shelter", "lee", "quiet", "still", "wait", "sit", "thread", "rope", "food", "water", "bread", "blanket", "fire", "warm", "cloth"],
        danger=0, takes=True, gifts=["a scrap of patterned silk left snagged on the wall-top", "a fine pale filament, like a feather, from a Kitemaker's crest"],
        trace="scraps of patterned silk snagged along the wall-tops, and small clawed scratches in the stone"),
    "kite4": B(
        traits=["ancient", "huge", "ragged", "proud", "wise", "many", "of the wind"],
        drives=["leading their people on the great migration", "to circle once the stone house its people have spoken of",
                "the wind has turned for the year, and they all go with it"],
        signs=["the western sky is speckled with colour, more and more of it, coming on the wind",
               "a deep thrumming in the air, like a great kite-string pulled taut, and the light begins to dim"],
        looks="the great migration: hundreds upon hundreds of Kitemakers streaming over on the wind, so many that the light dims, and "
              "among them their Wind-Chief, three times the size of the rest, its silk ragged and faded and covered in patterns older "
              "than any of the others', circling the keep once, slowly, low over the walls",
        tell="it turns its long head to follow you as it circles, and the whole flock follows its turns",
        likes=["bow", "wave", "banner", "flag", "kite", "salute", "respect", "watch", "silence", "quiet", "colour", "silk", "cloth", "song"],
        danger=0, gifts=["a long ribbon of the Wind-Chief's old silk, faded, patterned with lines older than anyone can read"],
        trace="the sky empty again, and silk and down drifting over the plain"),
}

# More than one way to keep a being back, so no answer is the answer forever. Each individual
# answers to its main weakness most of the time (92% for simple beings, about 77% for clever ones)
# and to each other one now and then (50%);
# a "deep" one works on every individual, but only shows itself once he has met the kind
# several times (DEEP_AFTER in encounters.py). Same shape as weakness: words, verbs, note.
MORE_WEAKNESSES = {
    "glassbeak": {"alt": [B(words=["mirror", "reflection", "its reflection"], note="its own reflection confuses it")],
                  "deep": [B(words=["whistle", "mimic", "its call", "call like it"], note="its own call makes it think a rival is near")]},
    "basilisk": {"alt": [B(words=["water", "splash", "douse", "wet", "cold water"], note="cold water makes it sluggish")],
                 "deep": [B(words=["sing", "song", "hum", "lullaby"], note="a steady song makes it drowsy")]},
    "wyrm": {"alt": [B(words=["salt"], note="salt drives it back under")],
             "deep": [B(words=["hot stone", "heated stone", "warm stone", "hearth stone"], note="a heated stone dropped far off draws it away")]},
    "moths": {"alt": [B(words=["bell", "ring", "chime", "hum", "sing"], note="a ringing note scatters them")],
              "deep": [B(words=["open the shutters", "moonlight", "open the window"], note="they would rather have the moon")]},
    "fog": {"alt": [B(words=["wind", "fan", "bellows", "blow"], note="moving air thins it")],
            "deep": [B(words=["count its eyes", "count the eyes"], note="counted, its eyes close one by one")]},
    "brood": {"alt": [B(words=["bell", "ring", "whistle"], note="a high sound sends them running")],
              "deep": [B(words=["lullaby", "sing", "hum"], note="they settle at a lullaby")]},
    "longman": {"alt": [B(words=["lantern on it", "light on it", "lamp on it", "shine"], note="a light kept on it holds it like a gaze")],
                "deep": [B(words=["turn my back", "turn away", "ignore it", "close my eyes"], note="unwatched on purpose, calmly, it loses interest")]},
    "manyjoint": {"alt": [B(words=["shout", "bang", "clap", "noise"], note="a sudden noise makes it fold up")],
                  "deep": [B(words=["pretend to sleep", "lie still", "stay asleep"], note="it only hunts the waking")]},
    "ashwolves": {"alt": [B(words=["shout", "bang", "bell", "noise", "howl back"], note="a loud noise breaks the pack's nerve")],
                  "deep": [B(words=["the watcher", "their lookout", "the one keeping watch", "stare down"], note="face down the watcher and the pack scatters")]},
    "crawl": {"alt": [B(words=["dig", "ditch", "trench"], note="a ditch turns it aside")],
              "deep": [B(words=["salt", "line of ash", "ash line"], note="it won't cross a line of ash")]},
    "thincrowd": {"alt": [B(words=["sing", "song", "bell"], note="a song sends them back a step")],
                  "deep": [B(words=["welcome them", "invite them", "ask them in"], note="welcomed, they have nothing to come for")]},
    "bentone": {"alt": [B(words=["lantern", "candle", "steady light", "shutter"], note="a steady light holds it too")],
                "deep": [B(words=["mirror", "reflection"], note="it freezes at its own shape")]},
    "watcher": {"alt": [B(words=["lamp in the window", "candle in the window", "light in the window"], note="a light inside the window dazzles it")],
                "deep": [B(words=["wave", "greet", "nod", "say hello"], note="greeted, it seems embarrassed and goes")]},
    "doorway": {"alt": [B(words=["salt", "line across", "line of ash", "threshold"], note="a line across the threshold")],
                "deep": [B(words=["ask its name", "what is your name", "its name"], note="asked its name, it has to leave to remember it")]},
    "stranger": {"alt": [B(words=["lantern on it", "light on it", "torch on it", "shine", "lamp on it"], note="in a steady light its disguise doesn't hold")],
                 "deep": [B(words=["play along", "pretend not to notice", "greet it as", "treat it as", "as if it were"],
                            note="met as what it pretends to be, it doesn't know what to do, and leaves")]},
}

# Weather that blunts a being's main weakness (fire is hard to keep up in the rain, a steady
# flame in a gale, a gaze in the fog).
FAILS_IN = {"fog": ["rain", "storm"], "crawl": ["rain", "storm"], "bentone": ["wind", "gale", "storm"], "longman": ["fog"],
            "thincrowd": ["fog"], "manyjoint": ["storm"], "ashwolves": ["snow"]}

# What a young or an old one looks like, where age changes the whole shape of it (not just its
# size). Said after `looks`; a kind not listed gets the plain "young: small and quick" lines.
AGE_LOOKS = {
    "larva": {"young": "not one grub but a brood of them: five little pale grubs, each the size of a dog, nosing about the crater",
              "old": "no longer a grub at all: a tall chrysalis standing in the crater, split down the front with light, crumpled wings pushing out of the top"},
    "axolotl": {"young": "a young one: no legs yet, all tail and enormous feathery gills, darting about the pools like a fish",
                "old": "an old one: huge, half-sunk in the water and slow as a log, lilies and weed growing on its back, its gills faded to the pink of old roses"},
    "dragon": {"young": "a wyrmling no bigger than a large dog, scrambling along the wall top, snapping at moths and huffing smoke it cannot yet light",
               "old": "an old dragon draped along the wall, its torn wings folded round it like a cloak, smoke always curling from its nostrils, one horn broken short"},
    "whale": {"young": "a calf, swimming close beside its mother: two whales in the sky, one small",
              "old": "an old one, crusted and slow, trailing a long cloud of small lights behind it like a wake of stars"},
    "thorn": {"young": "a fawn of bramble spotted with blossom, all legs, springing along and now and then breaking into a run of leaps",
              "old": "an old one: its antlers grown into the crown of a tree, birds nesting in them, moss hanging from its chin like a beard"},
    "basilisk": {"young": "a speckled hatchling, all eyes, its gaze too weak to do more than make the skin prickle",
                 "old": "an old one, half turned to stone itself, moss on its back and its eyes shut; it seldom needs to open them"},
    "wyrm": {"young": "three young worms, each out of its own hole, rising and ducking back like a game",
             "old": "an old one, vast, its hide crusted with stone and roots, rising like a column of the earth itself"},
    "glassbeak": {"young": "a fledgling, its glass beak too heavy for it, wobbling on its stilt legs",
                  "old": "an old one, hunched, its neck drawn in, its glass beak cracked and clouded, still as a post for long stretches"},
    "bellcrab": {"young": "a small crab in a hand bell, scuttling sideways",
                 "old": "an old one, its bell so overgrown with moss and grass that it looks like a little hill that walks"},
    "listener": {"young": "a small one, half hidden behind a bush, rising now and then to peek: stub antlers and one great pair of ears, turning and turning",
                 "old": "an old one, towering, its antlers a vast rack of small ears, some long withered, moss on its shoulders, leaning on a staff and utterly still"},
    "cartographer": {"young": "not a moth yet: a caterpillar on the desk, its skin all map-lines, inching along with a bite out of the corner of a map",
                     "old": "an old one, far bigger, its wings a map drawn over and over and faded, frayed and see-through at the tips, a compass rose on each"},
    "bentone": {"young": "a small one, low to the ground and only half bent, twitching between flickers as if it cannot hold still",
                "old": "an old one, its limbs far too long, arched into a high hoop, white hair hanging from its upside-down head to the ground"},
    "watcher": {"young": "only small pale fingers at the bottom corner of the pane, tapping, and the top of a face just over the sill",
                "old": "a face so long it runs past the top and bottom of the window, both hands spread on the glass, the pane fogging from outside"},
    "nightgrown": {"young": "a bed of knee-high seedlings of dark glass, growing out of the ground where the stars came down, swaying",
                   "old": "three of them, tall and cracked, so full of stars they shine white, stars leaking from the cracks, each with one arm raised"},
    "leech": {"young": "a small one, no longer than a man, darting low over the roof, only a few dreams flickering inside it",
              "old": "an old one, vast and slow, its clear skin clouded and scarred, so full of old dreams that they trail out behind it in a long wake of light"},
    "ashwolves": {"young": "the pack is mostly pups, tumbling and play-fighting in the ash, one grown wolf keeping watch",
                  "old": "an old pack, grey ash all through and their fire burned low, padding in a file behind a big old grey wolf with a limp and a mane of pale ash at its neck"},
}

# Beings that come in forms that are not ages (creatures.KINDS forms): what he sees this time (said after
# `looks`), and what the being's own mind is told about itself. Every form is listed, so nothing is left out.
FORM_LOOKS = {
    "clockhead": {"": "Its heads change while you watch: one sinks into the collar and another rises.",
                  "clock": "This one is smaller, with only one head: a clock, its hands creeping. It walks slowly and stops often.",
                  "hourglass": "This one is smaller, with only one head: an hourglass, the sand running. It paces, restless.",
                  "metronome": "This one is smaller, with only one head: a metronome, ticking. It walks in step with its own ticking.",
                  "galaxy": "This one is smaller, with only one head: a galaxy turning under a glass globe. It stands looking up at the sky, "
                            "far away, and the fire flickers.",
                  "mask": "This one is smaller, with only one head: a gilded smiling mask. It stands and watches whoever is watching it."},
    "stranger": {"cape": "This time it comes out in a long hooded cape, gliding over the grass and stopping dead, far too tall for whoever "
                         "that cape was made for.",
                 "woodsman": "This time it is dressed as a woodsman, in a hat, coat and scarf with a bundle of sticks, but it swings "
                             "the same arm as the leg, lifts its knees too high and bobs its head like a bird.",
                 "bark": "This time it is dressed in bark and branches, arms held up like boughs and leaves for a crown, standing "
                         "among the trees as one of them, then lurching forward.",
                 "traveller": "This time it comes as a traveller, in a patched cloak and cowl with a pack and a staff, limping, "
                              "though the limp keeps changing legs.",
                 "bare": "This time it wears nothing over itself: a far too tall, thin dark body and the smiling mask, walking out "
                         "into the open as if it thinks nobody can see it."},
    # the Burrow-Mother comes as he left things with her little one (creatures.MOODS), not in a form drawn at random
    "burrow4": {"thanks": "She lowers her great head toward the keep and holds it there, breathing slow and warm, the mushrooms on "
                          "her back glowing gold: it looks like thanks.",
                "scold": "She rears up out of the earth and rumbles at the keep, long and low, her nose pointed straight at it, the "
                         "mushrooms on her back gone a hard pale white: it sounds like a scolding."},
}
_DISGUISES = {"cape": "a long hooded cape", "woodsman": "a woodsman's hat, coat, scarf and sticks",
              "bark": "bark and branches, as if you were a tree", "traveller": "a traveller's cloak, pack and staff"}
FORM_MIND = {
    "clockhead": {"": "You have five heads and wear one at a time, each a mood: the clock patient, the hourglass restless, "
                      "the metronome focused, the galaxy far away, the mask unreadable. When your mood changes, the head "
                      "sinks into your collar and another rises.",
                  "clock": "You have only one head, a clock: you are patient, and slow to move.",
                  "hourglass": "You have only one head, an hourglass: you are restless, until the sand runs out.",
                  "metronome": "You have only one head, a metronome: you are focused, and keep to your own beat.",
                  "galaxy": "You have only one head, a galaxy under glass: your thoughts are far away, among the stars.",
                  "mask": "You have only one head, a gilded mask: nobody can read you, and you watch whoever watches you."},
    "stranger": {**{f: f"This time you wear a disguise you have never worn here before ({d}). You believe it makes you pass "
                       "for someone from here; you do not know that you move wrongly in it. You never speak."
                    for f, d in _DISGUISES.items()},
                 "bare": "This time you wear no disguise, and you believe nobody can see you. If anything notices you, you "
                         "realise, look back at it, and go back into the trees. You never speak."},
    "burrow4": {"thanks": "Your little one came home safe from the knight's stone house, and your people have not been driven from "
                          "it. You have come up to thank him, in your way.",
                "scold": "Your little one, or your people, were driven off from the knight's stone house. You have come up to "
                         "scold him, in your way: you are slow to anger, and not cruel."},
}
# what such a being came for, by how it comes this time
FORM_DRIVES = {"burrow4": {"thanks": ["to thank the one who was kind to her little one", "to see for herself, as well as she can, "
                                      "the stone house where her little one came up"],
                           "scold": ["to scold the one who drove off her little one", "to tell the stone house, in her way, "
                                     "that her people are not to be driven off"]}}

# How quickly each being gets used to a trick he keeps using (0: never; a third is quick). It
# fades again if he leaves the trick alone (HALF_LIFE_DAYS in encounters.py). Clever and
# long-memoried beings learn fast; simple, hungry or mindless ones barely at all, so a few
# stay dependable puzzles.
LEARNS = {"dragon": .3, "glassbeak": .3, "barrow": .3, "longman": .3, "well": .25, "doorway": .25, "watcher": .25,
          "bentone": .25, "thincrowd": .2, "basilisk": .15, "ashwolves": .2, "brood": .15, "manyjoint": .15,
          "golem": .15, "fog": .05, "wyrm": .05, "crawl": 0, "moths": .05, "stranger": .3}

# How each one answers him, in plain words: (when it goes well, when it goes badly). The rules
# pick which; these say what that looks like for this being (its behaviour mind, from session 6,
# adds the particulars). Peril only.
REACTS = {
    "dragon": ("It lowers its great head and looks at you a long moment, then settles, unbothered, its tail curling on the stones.",
               "It rears up on the wall and a gout of fire rolls across the courtyard."),
    "glassbeak": ("It cocks its head, clicks its glass beak, and seems to decide you are worth dealing with.",
                  "It darts past you, quick as a thrown stone, after whatever shines."),
    "basilisk": ("It lowers its lids and goes still in the sun, letting you be.",
                 "Its eyelids lift. Where its gaze passes, the grass goes grey and stiff."),
    "golem": ("Its seams dim to a warm glow and it rumbles, almost like a laugh.",
              "Its seams flare and it swings a fist of stone into the wall."),
    "well": ("The water rises softly, and a slow ripple runs out from the eye.",
             "A tentacle lashes over the well's lip and the water drains away with a roar."),
    "hill": ("The great eye blinks once, slowly, and the hum in the ground softens.",
             "The hill shrugs, and the whole keep shudders; dust sifts from every wall."),
    "whale": ("Its song drops lower, and for a moment you'd swear it is singing to you.",
              "It swings away north, the song cut off, and the night feels emptier."),
    "wyrm": ("It sways, feeling the air, and slowly turns away from you.",
             "The ground heaves and it lunges toward the movement, flagstones flying."),
    "moths": ("They lift off the fire in a grey swirl and drift away after other light.",
              "They pour over the hearth; the fire shrinks to a sullen red glow."),
    "barrow": ("It lowers its sword and inclines its helm, one knight to another.",
               "It raises its sword and advances, cold mist rolling ahead of it."),
    "fog": ("The eyes blink and the bank of fog draws back from the light.",
            "The fog rolls in close, cold and wet, the eyes all around you."),
    "ninefold": ("One by one the nine eyes turn away, and the night eases.",
                 "All nine eyes turn to you at once, and your knees give a little."),
    "moon2": ("A small light falls from it, slow as a leaf, and lands somewhere near.",
              "The green light grows heavy and strange, and you can't shake a dull dread."),
    "larva": ("It glows brighter, chirrs, and noses closer to the warmth.",
              "It curls up tight, its glow guttering, and wriggles off into the grass."),
    "listener": ("Every ear on its antlers turns toward you, and it stays a while.",
                 "It startles, all its ears flattening, and is gone into the trees."),
    "leech": ("It drifts on, dreams flickering, and your head feels clear.",
              "It hangs over you, and for a moment your thoughts aren't yours."),
    "seam": ("The hand on the other side goes still, then lifts in what might be a greeting.",
             "The seam widens with a sound like tearing cloth, and cold air pours through."),
    "bloom": ("It tilts its head; its voice is warm, and it seems pleased with you.",
              "Its manner cools. It says something polite that sounds like a warning."),
    "warden": ("Its lantern brightens, and it says something quiet you'll keep thinking about.",
               "Its lantern dims and it turns away along the wall without a word."),
    "brood": ("They freeze, all eyes, then scatter back into the dark.",
              "They swarm the workbench in a pale scurry, grabbing what they can."),
    "longman": ("It stays exactly where it is, a thin shape in the field, and in time it is simply not there.",
                "You blink, and it is far nearer, right against the outer wall, its void of a face turned to you. "
                "Then it is back in the field, as if it never moved."),
    "stitched": ("The seams in the sky draw closed, slowly, like an eye closing.",
                 "A seam opens wide right overhead, and whatever is behind it looks straight at you."),
    "manyjoint": ("It folds itself small and draws back into the dark of the rafters.",
                  "It unfolds all at once, far longer than it looked, reaching down out of the corner."),
    "lanternheads": ("Their lanterns brighten as they pass, and one of them dips its head to you.",
                     "Their lanterns dim and they hurry on, the line breaking apart."),
    "cartographer": ("It opens its wings wide and holds still, as if to let you read the map.",
                     "It beats its great wings, raising a storm of dust, and lifts away."),
    "thorn": ("It lowers its antlers; flowers open along the new brambles.",
              "It stamps, and brambles burst up through the courtyard, thorns and all."),
    "ashwolves": ("The watcher stops pacing and sits, and the pack settles at the edge of the dark.",
                  "The watcher howls and the pack comes over the wall in a rush of smoke and sparks."),
    "bellcrab": ("It rings its bell once, softly, and settles on the warm stones.",
                 "It rings its bell furiously and snaps its great claws, shoving at the wall."),
    "crawl": ("It stops on the plain, as if thinking, and turns slowly back the way it came.",
              "It keeps coming, slow and steady, and reaches the foot of the wall."),
    "axolotl": ("Its gills flush pink and it wades closer, smiling its wide smile.",
                "It flinches and slips away through the puddles, back toward the water."),
    "thincrowd": ("At the edge of the light they stop, and one by one they are gone.",
                  "When you look again, they are a step closer, and one more than before."),
    "bentone": ("It stays frozen mid-step, as long as the fire holds steady.",
                "The fire flickers, and in that instant it is at the shutters, long fingers on the wood."),
    "watcher": ("The face at the window draws back and is gone.",
                "The face presses closer, and a crack runs across the glass."),
    "doorway": ("It stands a moment more, head bowed, then simply isn't there.",
                "It leans in under the lintel, as far as the threshold allows, and waits."),
    "nightgrown": ("They lower their arms together and stand quiet, the stars drifting inside them.",
                   "Their seams of light all turn to you at once, and the air goes thin and cold."),
    "clockhead": ("Its hands stop, and for a moment everything is perfectly ordinary. Then it walks on.",
                  "Its hands spin wildly, and you lose a stretch of time you can't account for."),
    "stranger": ("It goes as still as a tree, and when you look again there is only the forest edge.",
                 "It comes out of the trees all at once, far too fast for something so tall, and the smile is right in front of you."),
    "glassy1": ("It tilts its head; its light flickers, curious, and it holds something up to look at.",
                "Its light flares and it hurries back into its craft."),
    "glassy2": ("Their beams stop on you, linger, and move on without hurry.",
                "Their beams snap to you and they pull back fast, in a tight line."),
    "glassy3": ("Some of them gather nearer, as if they mean to show you something.",
                "The whole camp dims, and they draw together on the far side of the plain."),
    "tidekin1": ("Its shell-light brightens; it tilts its head, and stays a little longer.",
                 "It ducks under at once, and the rings spread out over the empty water."),
    "tidekin2": ("The singing goes on, and one of them lifts its lantern to you.",
                 "The singing stops all at once, and they slip back into the water one after another."),
    "tidekin3": ("They nod over what you brought, turning it in their webbed hands, and push their own things toward you.",
                 "They gather up what they brought and pole their boat back toward the reeds."),
    "tidekin4": ("It lifts its lantern toward you, slowly, and holds it there a long moment.",
                 "It looks at you a long while, then turns, and walks slowly back down to the water."),
    "burrow1": ("It creeps a little way out of its hole, nose working, and its big dark eyes stay on you.",
                "It ducks straight down its hole; after a while two dark eyes peep over the rim, and then they are gone."),
    "burrow2": ("One of them rumbles softly to the other, and they stop digging to look at you.",
                "They thump the ground with their claws, hard, and dig down out of sight."),
    "burrow3": ("They hum, low, and the mushrooms on their backs brighten.",
                "Their humming stops; they pick up their baskets and go down into the earth."),
    "burrow4": ("She lowers her great head until her nose is almost on the ground before you, and breathes out, long and warm.",
                "She gives a low rumble you feel through your boots, and turns her nose away from you."),
    "kite1": ("It opens its silk wide in the wind, holds it there a moment, and folds it again, looking at you.",
              "It lets the wind snatch it off the tower, and is a speck over the plain in moments."),
    "kite2": ("A few of them tumble over and over in the air above you before they ride on.",
              "They climb high all at once, silent, and the wind takes them away."),
    "kite3": ("Along the wall, one after another, they open their silk a little and settle.",
              "They throw themselves into the wind in a rush of silk, and are blown away over the plain."),
    "kite4": ("The Wind-Chief dips low over the courtyard, so low you feel the wind of it, and the whole flock dips after it.",
              "The Wind-Chief climbs, and the whole sky of them turns away from the keep after it."),
    "glassy4": ("Its crest brightens, and it inclines its head toward you.",
                "Its crest dims; its attendants close around it and it turns away."),
}

# Gifts that aren't things to keep: told, not added to what the beings left him.
INTANGIBLE = {"a fresh fish, still cold from the lake", "a basket of mushrooms, good to eat",
              "clay packed hard at the foot of your east wall, where it was weak", "a true answer to something", "a sound you can't forget", "a dream you can't stop thinking about",
              "a dream not your own", "a true secret", "an hour you remember twice", "help with one heavy stone",
              "a map of the keep drawn in light on the flagstones, gone by morning",
              "a new spring of clear water at the hill's foot", "a ring of the old bell, which carries for miles"}
# Gifts that do something: (what, where)
GIFT_DOES = {"help with one heavy stone": ("repair", "wall"),
             "clay packed hard at the foot of your east wall, where it was weak": ("repair", "wall")}

# His options: plain verbs that fit any being; what he picks is his.
OPTIONS = {
    "watch":     "watch it from where you are",
    "hide":      "shelter: bar the door, stay by the fire",
    "prepare":   "get ready before it arrives: put things away, bank the fire, see to the door",
    "offer":     "offer it something you have",
    "speak":     "speak to it",
    "drive_off": "drive it off: noise, fire, your old dagger",
    "approach":  "go closer",
    "leave":     "leave it be and carry on with what you were doing",
}

NATURES = ["gentle", "neutral", "courteous", "proud", "nuisance", "hostile"]
