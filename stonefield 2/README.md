# Stonefield

A voxel sandbox game in a single HTML file. Open `stonefield.html` in a desktop or mobile browser (it loads three.js r128 from cdnjs, so it needs an internet connection).

## Controls
- WASD to walk, Shift to sprint, Space to jump or swim, mouse to look
- Hold left click to dig or attack; right click to place, eat, trade, sleep, or use a workbench, kiln or rift stone
- E opens your pack, crafting, field journal, quests and crew; 1–9 or the mouse wheel picks a hotbar slot
- F flies (creative mode only)
- M opens the world map; Q discards one of the held item (Shift+Q the whole stack)
- While riding: Space jumps (or climbs on a flier), Shift dives (or sprints on the ground), Ctrl boosts, right click dismounts

## What's in it
- Five overworld biomes (meadow, woodland, dunes, tundra, marsh) plus the Cinderdeep underworld
- Sky light and block light that spread through the world: torches, lanterns and hearths light caves and keep night creatures away
- A village style for each biome, with settlers who each have a name, age, profession, backstory, personality and rumours about nearby places
- 20 creature types, including five rare ones tracked in the field journal
- Creature navigation: creatures check the ground before each step, avoid water, lava and big drops, plan routes with A* search, climb back out of water, and settlers walk the village paths and boardwalks
- Doors: craft from 6 planks at a workbench, right-click to open or close; closed doors keep hostile creatures out and settlers open and close their own
- Survival crafting with tools, stations, bedrolls, ruins and supply crates; creative mode in the menu

### Hiring, companions and quests
- **Hire gatherers**: talk to a settler or a wanderer, open the Hire tab and send them on a lumber, quarry, foraging, hunting or digging run (short or long, paid in Roast Meat). They come back with a haul based on the biome and their skills. Place a Storage Box within 40 blocks when you hire them and the haul is delivered there; switch on Standing orders and they pay themselves from the box and go out again. Sleeping speeds up trips.
- **Followers and guards**: hire anyone as a Follower (travels with you, goes through doors, fights hostile creatures) or a Guard (stands watch over the spot and fights anything hostile nearby). Manage them in the pack's Crew tab, up to 6 companions in total.
- **Wanderers** pass through by day. Many carry a request (fetch items, clear out creatures, tame an animal, or find a village or ruin). Accept it, then claim the reward from the pack's Quests tab.
- **Taming**: hold the right treat near an animal and it will come to you; feed it a few times to tame it. Forage Mix (herbivores), Smoked Jerky (tusker, rimecat), Critter Bait (croaker, skink), Wild Seed (finch) and Starlight Treat (the rare creatures). Tamed animals follow you, can be told to stay (right-click with an empty hand), come through the rift, and bring small gifts. Tusker, rimecat and crystalback also fight for you. The field journal lists what each animal likes.

### Map, guard posts and mounts
- **World map** (M, or the Map button on touch): fog of war that clears as you explore, coloured by biome, with villages, ruins and towers you have found, your spawn point, storage boxes, guard posts and quest targets. Drag to pan, wheel or +/- to zoom. The explored area is saved with the world. The Cinderdeep cannot be mapped.
- **Guard posts**: in the Crew tab, or in a hired person's dialog, press Assign post (or Move post), then click an explored spot on the map. They walk there and guard a 14 block radius, even when you are far away; they take up the post again whenever you return.
- **Mounts**: craft a Saddle (hide, fiber, stick) at the workbench, or a Flight Harness (saddle, ember shards, fiber) for fliers. Hold it and right-click a tamed mossback, woolhorn, tusker, glimmerstag, shellback or crystalback (saddle), or a Stormwing or Duskwing (harness). Then right-click with an empty hand to ride. Stormwings (day) and Duskwings (night) are rare fliers: tame them with Smoked Jerky and Starlight Treats. Land before you dismount. Releasing a tame returns its saddle.
- **Discard**: pick up a stack and press Discard in the pack (right-click for just one), or press Q in the world.

### Building and decorating
- **Storage Box** (27 slots) and **Stonebound Box** (54 slots): right-click to open, shift-click to move stacks, Stash matching and Take all. Hold Shift while right-clicking to place a block against a box or sign.
- **Signs** you can write on (four lines, both sides), fences, stone posts, hedges, flower beds, rugs, whitewash and stone tiles.
- **Biome pieces**: Hay Bale (meadow), Mossy Cobble (woodland), Desert Lantern and Carved Sandstone (dunes), Snow Lantern and Frost Brick (tundra), Reed Mat and Mud Brick (marsh).
- **Holiday pieces**, highlighted in the crafting list when in season by your computer's calendar: Pumpkin Lantern (Halloween), Gift Box and Festive Lights (winter holidays), Blossom Bed (spring), Paper Lantern (lunar festival).
- Every new item is a crafting ingredient or can be salvaged at a workbench (look for the Salvage tag), and Mossy Cobble counts as cobble for stone tools and the kiln.

The world saves to the browser's localStorage.

## Code layout
Everything lives in `stonefield.html`. The script is split into sections marked `// ================= name =================`: noise, texture atlas (procedurally drawn), blocks & items, rendering (voxel shader, clouds, held item), world generation, structures and villages, meshing and light propagation, physics, inventory and UI, creatures and settlers, actions, sky, and the main loop.
