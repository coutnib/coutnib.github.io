# Stonefield

A voxel sandbox game in a single HTML file. Open `stonefield.html` in a desktop or mobile browser (it loads three.js r128 from cdnjs, so it needs an internet connection).

## Controls
- WASD to walk, Shift to sprint, Space to jump or swim, mouse to look
- Hold left click to dig or attack; right click to place, eat, trade, sleep, or use a workbench, kiln or rift stone
- E opens your pack, crafting and field journal; 1–9 or the mouse wheel picks a hotbar slot
- F flies (creative mode only)

## What's in it
- Five overworld biomes (meadow, woodland, dunes, tundra, marsh) plus the Cinderdeep underworld
- Sky light and block light that spread through the world: torches, lanterns and hearths light caves and keep night creatures away
- A village style for each biome, with settlers who each have a name, age, profession, backstory, personality and rumours about nearby places
- 19 creature types, including five rare ones tracked in the field journal
- Creature navigation: creatures check the ground before each step, avoid water, lava and big drops, plan routes with A* search, climb back out of water, and settlers walk the village paths and boardwalks
- Doors: craft from 6 planks at a workbench, right-click to open or close; closed doors keep hostile creatures out and settlers open and close their own
- Survival crafting with tools, stations, bedrolls, ruins and supply crates; creative mode in the menu

The world saves to the browser's localStorage.

## Code layout
Everything lives in `stonefield.html`. The script is split into sections marked `// ================= name =================`: noise, texture atlas (procedurally drawn), blocks & items, rendering (voxel shader, clouds, held item), world generation, structures and villages, meshing and light propagation, physics, inventory and UI, creatures and settlers, actions, sky, and the main loop.
