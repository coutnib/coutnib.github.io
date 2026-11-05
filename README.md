# StudyQuest ⏱️✨

A gamified study timer for iPhone. It's a web app that you install to your Home Screen.

## Features
- **Study modes:** Pomodoro (25/5, long break every 4), 52/17, Ultradian (90/20), Custom, simple Countdown, and Flowtime (a stopwatch that earns 1 min of break per 5 min studied). Every duration can be changed.
- **Gamification:** XP and levels with theme-specific titles, a mascot that evolves as you level up, a daily streak with an XP multiplier (up to +50%), a daily goal, and 20 achievements.
- **6 themes:** Cute 🐰, Spooky 👻, Cozy Forest 🦊, Space 🚀, Ocean 🐋, Retro Arcade 👾. Each one has its own colors, fonts, mascot, sounds and phrases.
- **Stats:** today, total, streaks, a 7-day chart, a per-subject breakdown, and recent sessions.
- Works offline. Data stays on your phone, with export and import for backups.

## Put it on GitHub Pages
1. Create a new **public** repo on GitHub, for example `studyquest`.
2. Upload every file in this folder, including the `icons/` folder, to the repo root. On github.com you can use **Add file → Upload files** and drag the files in.
3. Go to **Settings → Pages** in the repo. Under "Build and deployment", pick **Deploy from a branch**, then `main` / `(root)`, and click Save.
4. Wait about a minute. Your app will be at `https://<your-username>.github.io/studyquest/`.

## Install on iPhone
Open that URL in **Safari**, tap **Share → Add to Home Screen**, and launch it from the new icon.

## Good to know
- **Keep the app open while a timer runs.** iOS pauses web apps in the background, so the end-of-timer sound can't play while the app is closed. The timer still keeps correct time: when you come back, it catches up and you get credit. "Keep screen on" in Settings helps.
- Sounds follow the iPhone silent switch.
- **Updating the app:** after changing files, bump `CACHE` in `sw.js` (for example `studyquest-v2`). Your phone picks up the new version on the second launch after that.
- Data is stored per device and per browser. Use **Settings → Export backup** now and then.
