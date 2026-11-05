# Sprite Foundry

A pixel-art editor for game characters (32x32) and items (16x16). It is one self-contained HTML file with no build step.

## Run it
Open `index.html` in a browser. The only network use is Google Fonts. Without it, the page falls back to system fonts.

## How it works
- **Character mode**: pick preset parts (head, ears, eyes, mouth, face details, eyewear, hair, headwear, top, bottom, shoes, back, held item) and recolor each part with the swatches or the + color picker. Starter looks: Adventurer, Wizard, Knight, Cat rogue, Vampire, Orc.
- **Item mode**: weapons (sword, dagger, axe, staff, bow, shield, bomb), tools (pickaxe, hammer, shovel, key), bottles (potion, bottle, jar) and more, with Glow and Sparkles effects.
- **Paint**: pencil (B), eraser (E or right-click), fill (G), color picker (I or Alt-click), mirror (M), undo/redo (Ctrl+Z / Ctrl+Shift+Z).
- **Design your own parts**: paint over a part, then press "Save ... as a new <part>". It becomes a new option in that category. It keeps following the color swatches because colors are remapped from the palette it was saved with.
- **Auto outline** (dark, tinted, or none) and **auto shading** are computed from the part shapes.
- **Labels**: every sprite gets an automatic name and description from its parts and colors (for example "Elf Wizard: violet robe, white long hair, staff" or "Ruby Potion"). The label is the default name when you save, and it can be printed under each image or sheet frame.
- **Layers**: show or hide the body and each clothing or accessory layer. Save one layer, or all of them as a zip of same-size transparent PNGs plus `layers.json` with the stacking order.
- **Export**: PNG (transparent) or JPEG (with a background color you pick) at 1x, 4x, 8x or 16x. Press Save image, right-click the image, or Copy as PNG.
- **Sprite sheets**: animations (character: idle and walk; item: float and shine, one row each), every option in the current part category, or all your saved sprites. You can set columns, gap and scale, and save frame data as `.json` (frame rectangles, labels and animation rows) for game engines.
- **Batch**: "Save all as images (.zip)" exports every saved sprite as PNG or JPEG, plus `labels.json`.
- Your work, saved sprites and custom parts are kept in the browser's localStorage.

## Code map (all inside index.html)
- `CHAR` / `ITEMS`: part templates. Each option has draw functions keyed by render phase (`back`, `legs`, `torso`, `head`, `face`, `hair`, `hat`, ...).
- `M`: pixel-mask helper (rect, ellipse, line, mirror). `shaded()` fills a mask with automatic rim shading.
- `compose()`: draws the phases in order, then adds the outline, effects and painted pixels.
- Custom parts: `makeCustom()`, `stamp()` and `recolor()`.

To add a new preset, add an option object to a category's `opts` array, for example
`{id:'mask', name:'Mask', face(g,C,R){ ... }}`.
