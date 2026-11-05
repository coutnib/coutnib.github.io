# 🌷 My Little App Shelf

My personal productivity apps, hosted on GitHub Pages. The site's homepage (`index.html`) is a small launcher that links to each app.

## Apps

| | App | Folder | What it does |
|---|---|---|---|
| 🥚 | **Egg Cartion Hathery** | [`egg-cartion-hathery/`](egg-cartion-hathery/) | Hatch little eggs as you get things done. |
| 📚 | **StudyQuest** | [`studyquest/`](studyquest/) | Level up your study sessions, one quest at a time. |

## Repo layout

```
.
├── index.html               # homepage / app launcher
├── README.md
├── egg-cartion-hathery/     # app
└── studyquest/              # app
```

Each app lives in its own folder with its own `index.html`, so it's served at `/<folder>/`.

## Adding a new app

1. Create a new folder in the repo root (for example `new-app/`) with an `index.html` inside.
2. Open the root `index.html` and add an entry to the `apps` list near the bottom:

   ```js
   {
     name: "New App",
     path: "new-app/",
     emoji: "🍓",
     desc: "What it does, in one line.",
     tint: "pink"   // pink, mint, butter, sky, lilac or peach
   }
   ```

3. Add a row to the **Apps** table above.
4. Commit and push to `main`. GitHub Pages updates in a minute or two.

## Running locally

The site is plain HTML with no build step. To preview it, serve the repo root:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.
