# Egg Carton Hatchery

A task tracker you play. Every task is an egg. Crack one each time you finish a task, and critters hatch as you go: one per 5 tasks on lists under 30, one per 10 on lists of 50 or more, and 5 in between. They are spread evenly so the last one hatches on your final task, and even a tiny list hatches 2. Each egg also drops a few items (cookies, berries, bubbles, squeaky stars) you can use to feed and play with your critters.

Plain HTML, CSS and JavaScript. No build step, no dependencies, no server code.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `styles.css` | All styles, light and dark theme |
| `app.js` | The tracker, critters, nursery and saving |
| `sw.js` | Offline support (service worker) |
| `manifest.webmanifest` | Lets phones install it like an app |
| `icons/` | App icons |

## Put it on GitHub Pages

1. Create a new repository on GitHub, for example `egg-carton-hatchery`.
2. Push this folder to it:

   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/egg-carton-hatchery.git
   git push -u origin main
   ```

3. On GitHub, open the repository's **Settings → Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, pick `main` and `/ (root)`, and save.
4. After a minute or two the site is live at `https://YOUR-USERNAME.github.io/egg-carton-hatchery/`.

## Add it to your phone's home screen

- **iPhone (Safari):** open the site, tap the Share button, then **Add to Home Screen**.
- **Android (Chrome):** open the site, tap the ⋮ menu, then **Add to Home screen** or **Install app**.

It then opens full screen like an app and keeps working offline.

## Where your progress is saved

Progress is saved in the browser on the device you use, nowhere else. Nothing is sent to a server.

- Clearing the browser's website data erases it.
- Your phone and computer each keep separate progress.
- On iPhone, the home screen app and the Safari tab keep **separate** progress. Pick one and stick with it.

To move progress or keep a copy, open **Carton settings** at the bottom of the page and use **Save a backup file** / **Load a backup file**.

## Updating the app

After changing `index.html`, `styles.css` or `app.js`, open `sw.js` and bump `VERSION` (for example `hatchery-v1` → `hatchery-v2`) before you push. That makes installed copies pick up the new files.

## Try it locally

Service workers need a web server, so serve the folder instead of double-clicking `index.html`:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
