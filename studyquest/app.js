'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const STORE_KEY = 'studyquest:v1';
  const MIN = 60000;
  const RING_C = 2 * Math.PI * 90;

  /* ================= STUDY MODES ================= */
  const MODES = {
    pomodoro:  { name: 'Pomodoro',  icon: '🍅', kind: 'cycle', desc: 'Short focus sprints with quick breaks and a long break every few rounds.', focus: 25, short: 5, long: 15, longEvery: 4 },
    deep:      { name: '52 / 17',   icon: '🧠', kind: 'cycle', desc: '52 minutes of deep work, then a proper 17-minute recharge.', focus: 52, short: 17, long: 17, longEvery: 0 },
    ultradian: { name: 'Ultradian', icon: '🌊', kind: 'cycle', desc: '90-minute blocks that match your body\'s natural energy rhythm.', focus: 90, short: 20, long: 30, longEvery: 0 },
    custom:    { name: 'Custom',    icon: '🛠️', kind: 'cycle', desc: 'Your own rhythm. Set every timer in "Adjust times" below.', focus: 40, short: 8, long: 20, longEvery: 3 },
    countdown: { name: 'Countdown', icon: '⏳', kind: 'countdown', desc: 'One simple timer. No breaks, no fuss.', focus: 30 },
    flow:      { name: 'Flowtime',  icon: '🌀', kind: 'flow', desc: 'A stopwatch. Study until your focus fades, then take 1 min of break for every 5 you studied.' },
  };
  const MODE_FIELDS = ['focus', 'short', 'long', 'longEvery'];

  /* ================= THEMES ================= */
  const THEMES = {
    cute: {
      name: 'Cute', meta: '#ffe3ef', preview: ['#ffe3ef', '#e3ecff', '#ff6fae'],
      mascots: ['🥚', '🐣', '🐥', '🐰'], decor: ['🌸', '💖', '✨', '🍓', '⭐', '🎀'], burst: ['💖', '✨', '🌸', '⭐', '🍓'],
      words: { focus: 'Focus time ♡', short: 'Snack break', long: 'Cozy nap', start: 'Let\'s go!', resume: 'Keep going', pause: 'Pause' },
      titles: ['Tiny Sprout', 'Busy Bee', 'Study Bunny', 'Cuddle Scholar', 'Sparkle Sage', 'Mochi Master', 'Rainbow Genius', 'Legendary Cutie'],
      lines: {
        idle: ['Ready when you are! ♡', 'Let\'s study together~', 'Pick a subject and let\'s go!'],
        focus: ['You\'re doing amazing!', 'Stay cozy and focused~', 'I believe in you! 💕', 'One page at a time ♡'],
        pause: ['Taking a tiny pause?', 'I\'ll wait right here!'],
        break: ['Snack time! 🍪', 'Stretch those paws!', 'Drink some water ♡'],
        done: ['Yay!! You did it!', 'So proud of you! 💕', 'Sparkly brain unlocked ✨'],
      },
      chime: { type: 'sine', notes: [880, 1109, 1319, 1760] },
    },
    spooky: {
      name: 'Spooky', meta: '#1b0f26', preview: ['#1b0f26', '#2e1238', '#ff8c1a'],
      mascots: ['🕯️', '🎃', '👻', '🧛'], decor: ['🦇', '🕸️', '🌙', '🕷️', '💀', '🍂'], burst: ['🦇', '👻', '🎃', '💀', '🕷️'],
      words: { focus: 'The Haunting', short: 'Graveyard break', long: 'Rest in peace', start: 'Summon', resume: 'Rise again', pause: 'Banish' },
      titles: ['Restless Spirit', 'Candle Keeper', 'Pumpkin Scholar', 'Ghostly Grinder', 'Crypt Crammer', 'Midnight Scribe', 'Grim Genius', 'Lord of the Library'],
      lines: {
        idle: ['The tomes await… 🕯️', 'Dare you begin?', 'Mwahaha… study time.'],
        focus: ['The spirits are pleased…', 'Focus… or be haunted 👻', 'Your brain grows stronger…', 'No escape from knowledge!'],
        pause: ['Did something go bump?', 'The candle flickers…'],
        break: ['Rise from your desk! 🧟', 'Stretch your bones 💀', 'Sip some potion 🧪'],
        done: ['A spell well cast! 🔮', 'Spooktacular work!', 'The ghosts applaud 👻'],
      },
      chime: { type: 'triangle', notes: [587, 554, 440, 349] },
    },
    forest: {
      name: 'Cozy Forest', meta: '#f4ecd8', preview: ['#f4ecd8', '#dbe7c9', '#5f8d4e'],
      mascots: ['🌰', '🌱', '🍄', '🦊'], decor: ['🍂', '🌿', '🍄', '🌲', '🐞', '🍁'], burst: ['🍂', '🍄', '🌿', '🌼', '🍁'],
      words: { focus: 'Deep woods focus', short: 'Campfire break', long: 'Hibernate', start: 'Begin', resume: 'Continue', pause: 'Rest' },
      titles: ['Little Acorn', 'Moss Reader', 'Mushroom Scholar', 'Trail Wanderer', 'Grove Keeper', 'Wise Owl', 'Ancient Oak', 'Spirit of the Forest'],
      lines: {
        idle: ['The forest is quiet. Shall we?', 'Grab some tea 🍵', 'A cozy session awaits.'],
        focus: ['Slow and steady grows the oak 🌳', 'Breathe in, focus on.', 'You\'re growing roots!'],
        pause: ['Listening to the birds…', 'Take your time.'],
        break: ['Warm your hands by the fire 🔥', 'Go stretch like a fox!', 'Refill your tea 🍵'],
        done: ['Your tree grew a little! 🌳', 'Beautifully done.', 'The woods are proud 🦊'],
      },
      chime: { type: 'sine', notes: [523, 659, 784, 659] },
    },
    space: {
      name: 'Space', meta: '#070b22', preview: ['#070b22', '#1d1450', '#5ce1e6'],
      mascots: ['🛰️', '🚀', '🛸', '👽'], decor: ['⭐', '✨', '🪐', '☄️', '🌙', '·'], burst: ['⭐', '🪐', '✨', '☄️', '🚀'],
      words: { focus: 'Mission active', short: 'Orbit break', long: 'Shore leave', start: 'Launch', resume: 'Re-engage', pause: 'Hold' },
      titles: ['Space Cadet', 'Junior Pilot', 'Star Navigator', 'Orbit Officer', 'Nebula Captain', 'Galaxy Commander', 'Cosmic Admiral', 'Master of the Universe'],
      lines: {
        idle: ['All systems go. 🚀', 'Awaiting launch, Commander.', 'Coordinates set for knowledge.'],
        focus: ['Thrusters at full power!', 'Navigating the asteroid belt…', 'Houston, we have focus.'],
        pause: ['Holding orbit…', 'Engines idling.'],
        break: ['Zero-g stretch time!', 'Refuel with a snack 🍫', 'Look out the window 🌍'],
        done: ['Mission accomplished! 🌟', 'Successful landing!', 'One small step for your brain!'],
      },
      chime: { type: 'sine', notes: [392, 523, 784, 1047] },
    },
    ocean: {
      name: 'Ocean', meta: '#def6ff', preview: ['#def6ff', '#a9dcf0', '#0096c7'],
      mascots: ['🫧', '🐠', '🐢', '🐋'], decor: ['🫧', '🐚', '🐟', '🌊', '🪸', '⭐'], burst: ['🫧', '🐠', '🐚', '🌊', '⭐'],
      words: { focus: 'Deep dive', short: 'Surface for air', long: 'Beach day', start: 'Dive in', resume: 'Dive back', pause: 'Float' },
      titles: ['Little Bubble', 'Tide Pooler', 'Reef Reader', 'Coral Scholar', 'Wave Rider', 'Deep Diver', 'Sea Sage', 'Leviathan Learner'],
      lines: {
        idle: ['The water\'s perfect today 🌊', 'Ready to dive?', 'Just keep studying~'],
        focus: ['Swimming deeper…', 'Go with the current 🐢', 'Calm waters, clear mind.'],
        pause: ['Floating for a sec…', 'Bobbing on the waves.'],
        break: ['Come up for air! 🫧', 'Stretch your fins!', 'Hydrate (ironic, right?) 💧'],
        done: ['Splashing success! 🐬', 'You found treasure! 🐚', 'What a wave!'],
      },
      chime: { type: 'sine', notes: [659, 784, 988, 1319] },
    },
    retro: {
      name: 'Retro Arcade', meta: '#0d0d1a', preview: ['#0d0d1a', '#000000', '#39ff14'],
      mascots: ['👾', '🕹️', '🤖', '👑'], decor: ['👾', '⭐', '💾', '🍒', '🔺', '🟩'], burst: ['⭐', '👾', '🍒', '💎', '🔺'],
      words: { focus: 'Player 1 focus', short: 'Pause screen', long: 'Bonus stage', start: 'Press start', resume: 'Continue?', pause: 'Pause' },
      titles: ['Noob', 'Rookie', 'Player One', 'Combo Kid', 'High Scorer', 'Speedrunner', 'Final Boss', 'Hall of Fame'],
      lines: {
        idle: ['INSERT COIN TO STUDY', 'READY PLAYER ONE?', 'NEW GAME +'],
        focus: ['COMBO x2!', 'You\'re on a high score run!', 'Don\'t lose a life now!'],
        pause: ['GAME PAUSED', 'Save point reached.'],
        break: ['Power-up time! 🍄', 'Rest your thumbs.', 'Grab a 1-UP 🍒'],
        done: ['LEVEL CLEAR!', 'NEW HIGH SCORE!', 'FLAWLESS VICTORY!'],
      },
      chime: { type: 'square', notes: [523, 659, 784, 1047] },
    },
  };

  /* ================= ACHIEVEMENTS ================= */
  const ACHIEVEMENTS = [
    { id: 'first',    icon: '🌟', name: 'First Steps',   desc: 'Finish your first focus session', test: (s) => s.count >= 1 },
    { id: 'hour1',    icon: '⏳', name: 'Hour Hero',     desc: 'Study 1 hour in total',          test: (s) => s.totalMin >= 60 },
    { id: 'hour10',   icon: '📚', name: 'Bookworm',      desc: 'Study 10 hours in total',        test: (s) => s.totalMin >= 600 },
    { id: 'hour50',   icon: '🎓', name: 'Scholar',       desc: 'Study 50 hours in total',        test: (s) => s.totalMin >= 3000 },
    { id: 'hour100',  icon: '🏛️', name: 'Professor',     desc: 'Study 100 hours in total',       test: (s) => s.totalMin >= 6000 },
    { id: 'streak3',  icon: '🔥', name: 'On Fire',       desc: 'Study 3 days in a row',          test: (s) => s.bestStreak >= 3 },
    { id: 'streak7',  icon: '📅', name: 'Week Warrior',  desc: 'Study 7 days in a row',          test: (s) => s.bestStreak >= 7 },
    { id: 'streak30', icon: '🌋', name: 'Unstoppable',   desc: 'Study 30 days in a row',         test: (s) => s.bestStreak >= 30 },
    { id: 'goal',     icon: '🎯', name: 'Goal Getter',   desc: 'Hit your daily goal',            test: (s) => s.maxDay >= s.goal },
    { id: 'beast',    icon: '💪', name: 'Beast Mode',    desc: 'Study 4 hours in one day',       test: (s) => s.maxDay >= 240 },
    { id: 'cycle',    icon: '🍅', name: 'Full Cycle',    desc: 'Finish a full Pomodoro cycle',   test: (s) => s.flags.fullCycle },
    { id: 'marathon', icon: '🏃', name: 'Marathon',      desc: 'One focus session of 90+ min',   test: (s) => s.longest >= 90 },
    { id: 'flow',     icon: '🌀', name: 'In the Zone',   desc: 'A 45+ min Flowtime session',     test: (s) => s.flowLongest >= 45 },
    { id: 'night',    icon: '🦉', name: 'Night Owl',     desc: 'Finish a session after 10pm',    test: (s) => s.night },
    { id: 'early',    icon: '🐦', name: 'Early Bird',    desc: 'Start a session before 7am',     test: (s) => s.early },
    { id: 'weekend',  icon: '🛋️', name: 'Weekend Grind', desc: 'Study on a weekend',             test: (s) => s.weekend },
    { id: 'subjects', icon: '🗂️', name: 'Well-Rounded',  desc: 'Study 3 different subjects',     test: (s) => s.subjectCount >= 3 },
    { id: 'themes',   icon: '🎨', name: 'Fashionista',   desc: 'Try 3 different themes',         test: (s) => s.themeCount >= 3 },
    { id: 'lvl5',     icon: '⭐', name: 'Rising Star',   desc: 'Reach level 5',                  test: (s) => s.level >= 5 },
    { id: 'lvl10',    icon: '👑', name: 'Legend',        desc: 'Reach level 10',                 test: (s) => s.level >= 10 },
  ];

  /* ================= STATE ================= */
  function defaultState() {
    return {
      v: 1,
      settings: { theme: 'cute', sound: true, keepAwake: true, autoBreaks: true, autoFocus: false, dailyGoal: 60 },
      modes: {},
      subjects: ['General', 'Math', 'Reading'],
      subject: 'General',
      modeId: 'pomodoro',
      sessions: [],
      xp: 0,
      achievements: {},
      themesTried: ['cute'],
      flags: {},
      timer: null,
      hideInstall: false,
    };
  }
  function load() {
    const d = defaultState();
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* ignore */ }
    if (!s || typeof s !== 'object') return d;
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, flags: { ...(s.flags || {}) } };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full / blocked */ }
  }
  let state = load();
  if (!THEMES[state.settings.theme]) state.settings.theme = 'cute';
  if (!MODES[state.modeId]) state.modeId = 'pomodoro';

  const theme = () => THEMES[state.settings.theme];
  const modeCfg = (id = state.modeId) => ({ ...MODES[id], ...(state.modes[id] || {}) });

  /* ================= HELPERS ================= */
  const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pad = (n) => String(n).padStart(2, '0');
  function fmt(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
  const fmtMin = (min) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60 ? (min % 60) + 'm' : ''}`.trim() : `${min}m`);
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const keyToDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

  function levelInfo(xp) {
    const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2));
    const base = 50 * level * (level - 1);
    const next = 50 * (level + 1) * level;
    return { level, into: xp - base, need: next - base };
  }
  const levelTitle = (lvl) => { const t = theme().titles; return t[Math.min(lvl - 1, t.length - 1)]; };
  const mascotFor = (lvl) => theme().mascots[lvl < 3 ? 0 : lvl < 6 ? 1 : lvl < 10 ? 2 : 3];

  function streakInfo() {
    const days = new Set(state.sessions.map((s) => dayKey(new Date(s.end))));
    const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    let current = 0;
    while (days.has(dayKey(d))) { current++; d.setDate(d.getDate() - 1); }
    const sorted = [...days].sort();
    let best = 0, run = 0, prev = null;
    for (const k of sorted) {
      const dt = keyToDate(k);
      run = prev && Math.round((dt - prev) / 86400000) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = dt;
    }
    return { current, best: Math.max(best, current) };
  }

  function computeStats() {
    const today = dayKey(new Date());
    const st = { count: 0, totalMin: 0, todayMin: 0, longest: 0, flowLongest: 0, byDay: {}, bySubject: {},
      night: false, early: false, weekend: false };
    for (const s of state.sessions) {
      const end = new Date(s.end), start = new Date(s.start);
      st.count++; st.totalMin += s.min;
      const k = dayKey(end);
      st.byDay[k] = (st.byDay[k] || 0) + s.min;
      st.bySubject[s.subject] = (st.bySubject[s.subject] || 0) + s.min;
      st.longest = Math.max(st.longest, s.min);
      if (s.mode === 'flow') st.flowLongest = Math.max(st.flowLongest, s.min);
      if (end.getHours() >= 22) st.night = true;
      if (start.getHours() >= 4 && start.getHours() < 7) st.early = true;
      if (end.getDay() === 0 || end.getDay() === 6) st.weekend = true;
    }
    st.todayMin = st.byDay[today] || 0;
    st.maxDay = Math.max(0, ...Object.values(st.byDay));
    const sk = streakInfo();
    st.streak = sk.current; st.bestStreak = sk.best;
    st.level = levelInfo(state.xp).level;
    st.subjectCount = Object.keys(st.bySubject).length;
    st.themeCount = state.themesTried.length;
    st.goal = state.settings.dailyGoal;
    st.flags = state.flags;
    return st;
  }

  /* ================= SOUND ================= */
  let audioCtx = null;
  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { audioCtx = null; }
  }
  function chime(kind = 'done') {
    if (!state.settings.sound || !audioCtx) return;
    const c = theme().chime;
    const notes = kind === 'done' ? c.notes : kind === 'level' ? [...c.notes, ...c.notes.map((n) => n * 2)] : c.notes.slice(0, 2).reverse();
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = c.type; o.frequency.value = f;
      const t = audioCtx.currentTime + i * 0.15;
      const peak = c.type === 'square' ? 0.08 : 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(audioCtx.destination);
      o.start(t); o.stop(t + 0.55);
    });
  }

  /* ================= WAKE LOCK ================= */
  let wakeLock = null;
  async function requestWake() {
    if (!state.settings.keepAwake || !('wakeLock' in navigator) || wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { /* not allowed */ }
  }
  function releaseWake() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }

  /* ================= TIMER ENGINE ================= */
  function newPhase(type, mins) {
    const m = modeCfg();
    if (m.kind === 'flow' && type === 'focus') return { type, countUp: true, acc: 0, runStart: null, running: false, startedAt: null };
    if (mins == null) mins = type === 'focus' ? m.focus : type === 'long' ? m.long : m.short;
    const duration = Math.round(mins * MIN);
    return { type, countUp: false, duration, remaining: duration, endsAt: null, running: false, startedAt: null };
  }
  function ensureTimer() {
    if (!state.timer || state.timer.modeId !== state.modeId || !state.timer.phase) {
      state.timer = { modeId: state.modeId, cycle: 0, phase: newPhase('focus') };
    }
  }
  const P = () => state.timer.phase;
  function remaining(p) { return p.running ? Math.max(0, p.endsAt - Date.now()) : p.remaining; }
  function elapsed(p) {
    if (p.countUp) return p.acc + (p.running ? Date.now() - p.runStart : 0);
    return p.duration - remaining(p);
  }
  const isPristine = (p) => !p.running && elapsed(p) < 1000;

  function run() {
    const p = P();
    if (p.running) return;
    unlockAudio();
    const now = Date.now();
    if (!p.startedAt) p.startedAt = now;
    if (p.countUp) p.runStart = now; else p.endsAt = now + p.remaining;
    p.running = true;
    save(); requestWake();
    say(p.type === 'focus' ? 'focus' : 'break');
    renderTimer();
  }
  function pause() {
    const p = P();
    if (!p.running) return;
    const now = Date.now();
    if (p.countUp) { p.acc += now - p.runStart; p.runStart = null; }
    else { p.remaining = Math.max(0, p.endsAt - now); p.endsAt = null; }
    p.running = false;
    save(); releaseWake(); say('pause'); renderTimer();
  }
  function resetTimer() {
    const p = P();
    if (p.type === 'focus' && elapsed(p) >= MIN && !confirm('Reset this session? Time studied so far won\'t be saved.')) return;
    state.timer = { modeId: state.modeId, cycle: state.timer.cycle, phase: newPhase('focus') };
    save(); releaseWake(); say('idle'); renderTimer();
  }

  /** Ends the current phase. `natural` = timer ran out on its own. */
  function completePhase(natural) {
    const t = state.timer, p = t.phase, m = modeCfg(t.modeId);
    const el = natural && !p.countUp ? p.duration : elapsed(p);
    p.running = false;
    let autoRun = false;

    if (p.type === 'focus') {
      const mins = Math.floor(el / MIN);
      if (mins >= 1) recordSession(mins, natural || m.kind === 'flow', t.modeId, p.startedAt);
      else toast('Under 1 minute — not counted', 'Keep going next time!');

      if (m.kind === 'countdown') {
        t.phase = newPhase('focus'); t.cycle = 0;
      } else if (m.kind === 'flow') {
        t.phase = mins >= 1 ? newPhase('short', Math.max(1, Math.round(mins / 5))) : newPhase('focus');
        autoRun = mins >= 1 && state.settings.autoBreaks;
      } else {
        if (natural) t.cycle++;
        const longNow = natural && m.longEvery > 0 && t.cycle >= m.longEvery;
        if (longNow) {
          if (t.modeId === 'pomodoro') state.flags.fullCycle = true;
          addXP(25, 'Cycle bonus!');
        }
        t.phase = newPhase(longNow ? 'long' : 'short');
        autoRun = state.settings.autoBreaks;
      }
    } else {
      if (p.type === 'long') t.cycle = 0;
      t.phase = newPhase('focus');
      if (natural) { chime('break'); toast(`${theme().words[p.type]} is over!`, 'Back to it 💪'); }
      autoRun = natural && state.settings.autoFocus;
      say('idle');
    }
    checkAchievements();
    save();
    if (autoRun) run(); else { releaseWake(); renderTimer(); }
    renderHeader(); renderGoal();
  }

  function recordSession(mins, full, modeId, startedAt) {
    const end = Date.now();
    state.sessions.push({ start: startedAt || end - mins * MIN, end, min: mins, subject: state.subject, mode: modeId, full: !!full });
    const streak = streakInfo().current;
    const mult = 1 + Math.min(streak, 10) * 0.05;
    const xp = Math.round(mins * mult) + (full ? 10 : 0);
    addXP(xp, streak > 1 ? `🔥 ${streak}-day streak bonus ×${mult.toFixed(2)}` : `${mins} min of ${state.subject}`);
    chime('done');
    burst();
    say('done');
    const mascot = $('#mascot');
    mascot.classList.remove('cheer'); void mascot.offsetWidth; mascot.classList.add('cheer');
  }

  function addXP(amount, sub) {
    const before = levelInfo(state.xp).level;
    state.xp += amount;
    toast(`+${amount} XP`, sub);
    const after = levelInfo(state.xp).level;
    if (after > before) {
      setTimeout(() => {
        toast(`⬆️ Level ${after}!`, `You are now: ${levelTitle(after)} ${mascotFor(after)}`, true);
        chime('level'); burst(36);
      }, 700);
    }
    renderHeader();
  }

  function checkAchievements() {
    let gained = true;
    while (gained) {
      gained = false;
      const st = computeStats();
      for (const a of ACHIEVEMENTS) {
        if (!state.achievements[a.id] && a.test(st)) {
          state.achievements[a.id] = Date.now();
          gained = true;
          setTimeout(() => toast(`🏆 ${a.icon} ${a.name}`, `${a.desc} · +20 XP`, true), 1200);
          state.xp += 20;
        }
      }
    }
    save();
  }

  function tick() {
    if (!state.timer) return;
    const p = P();
    if (p.running && !p.countUp && Date.now() >= p.endsAt) { completePhase(true); return; }
    renderTime();
  }

  /* ================= RENDER ================= */
  function applyTheme() {
    const th = theme();
    document.body.dataset.theme = state.settings.theme;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', th.meta);
    const decor = $('#decor');
    decor.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.textContent = pick(th.decor);
      s.style.left = `${Math.random() * 100}%`;
      s.style.fontSize = `${14 + Math.random() * 22}px`;
      s.style.animationDuration = `${18 + Math.random() * 18}s`;
      s.style.animationDelay = `${-Math.random() * 30}s`;
      decor.appendChild(s);
    }
  }

  function renderHeader() {
    const li = levelInfo(state.xp);
    $('#lvlNum').textContent = li.level;
    $('#lvlTitle').textContent = levelTitle(li.level);
    $('#xpFill').style.width = `${(li.into / li.need) * 100}%`;
    $('#xpText').textContent = `${li.into} / ${li.need} XP · ${state.xp} total`;
    $('#streak').textContent = `🔥 ${streakInfo().current}`;
    $('#mascot').textContent = mascotFor(li.level);
  }

  function renderModes() {
    $('#modeChips').innerHTML = Object.entries(MODES).map(([id, m]) =>
      `<button class="chip ${id === state.modeId ? 'active' : ''}" data-mode="${id}" role="tab">${m.icon} ${m.name}</button>`).join('');
    $('#modeDesc').textContent = MODES[state.modeId].desc;
    renderAdjust();
  }

  function renderAdjust() {
    const m = modeCfg();
    const field = (key, label, min, max) =>
      `<label class="row">${label}<input type="number" data-field="${key}" value="${m[key]}" min="${min}" max="${max}" inputmode="numeric"></label>`;
    let html = '';
    if (m.kind === 'cycle') {
      html = field('focus', 'Focus (min)', 1, 240) + field('short', 'Short break (min)', 1, 120) +
        field('long', 'Long break (min)', 1, 180) + field('longEvery', 'Long break every … sessions (0 = never)', 0, 12);
    } else if (m.kind === 'countdown') {
      html = field('focus', 'Timer length (min)', 1, 600);
    } else {
      html = '<p class="muted small">Flowtime has no fixed length. Press Start, study as long as you\'re focused, then press Done. Your break will be 1 minute for every 5 minutes studied.</p>';
    }
    html += '<p class="muted small">Changes apply to the next timer you start.</p>';
    $('#adjustFields').innerHTML = html;
  }

  function renderSubjects() {
    if (!state.subjects.includes(state.subject)) state.subject = state.subjects[0] || 'General';
    $('#subjectSelect').innerHTML = state.subjects.map((s) =>
      `<option ${s === state.subject ? 'selected' : ''} value="${esc(s)}">${esc(s)}</option>`).join('') +
      '<option value="__add">➕ Add subject…</option>';
    $('#subjectList').innerHTML = state.subjects.map((s, i) =>
      `<li><span>${esc(s)}</span>${state.subjects.length > 1 ? `<button data-remove="${i}" aria-label="Remove ${esc(s)}">🗑️</button>` : ''}</li>`).join('');
  }

  function renderTime() {
    const p = P(), w = theme().words;
    const label = p.countUp ? fmt(elapsed(p)) : fmt(remaining(p));
    $('#timeText').textContent = label;
    let frac;
    if (p.countUp) frac = (elapsed(p) % (60 * MIN)) / (60 * MIN);
    else frac = p.duration ? 1 - remaining(p) / p.duration : 0;
    $('#ringFg').style.strokeDashoffset = RING_C * (1 - frac);
    document.title = p.running ? `${label} · ${w[p.type]}` : 'StudyQuest';
  }

  function renderTimer() {
    ensureTimer();
    const p = P(), w = theme().words, m = modeCfg();
    $('#phaseLabel').textContent = w[p.type];
    document.body.classList.toggle('running', p.running);
    document.body.classList.toggle('on-break', p.type !== 'focus');
    document.body.classList.toggle('on-focus', p.type === 'focus');
    const mainBtn = $('#mainBtn');
    mainBtn.textContent = p.running ? w.pause : isPristine(p) ? w.start : w.resume;

    const skip = $('#skipBtn');
    if (p.type !== 'focus') { skip.textContent = 'Skip ⏭'; skip.disabled = false; }
    else { skip.textContent = 'Done ✓'; skip.disabled = elapsed(p) < 1000; }
    $('#resetBtn').disabled = isPristine(p) && p.type === 'focus';

    const dots = $('#cycleDots');
    if (m.kind === 'cycle' && m.longEvery > 0) {
      dots.innerHTML = Array.from({ length: m.longEvery }, (_, i) => `<i class="${i < state.timer.cycle ? 'on' : ''}"></i>`).join('');
    } else dots.innerHTML = '';
    renderTime();
  }

  function renderGoal() {
    const st = computeStats(), goal = state.settings.dailyGoal;
    $('#goalText').textContent = `${st.todayMin} / ${goal} min${st.todayMin >= goal ? ' ✅' : ''}`;
    $('#goalFill').style.width = `${Math.min(100, (st.todayMin / goal) * 100)}%`;
  }

  let lastLineKind = null;
  function say(kind) {
    lastLineKind = kind;
    $('#bubble').textContent = pick(theme().lines[kind] || theme().lines.idle);
  }

  function renderStats() {
    const st = computeStats();
    const cards = [
      [fmtMin(st.todayMin), 'Today'],
      [`${st.streak} 🔥`, 'Current streak'],
      [fmtMin(st.totalMin), 'Total studied'],
      [`${st.bestStreak}`, 'Best streak (days)'],
      [st.count, 'Sessions'],
      [st.count ? fmtMin(Math.round(st.totalMin / st.count)) : '–', 'Avg session'],
    ];
    $('#statCards').innerHTML = cards.map(([b, s]) => `<div class="card"><b>${b}</b><span>${s}</span></div>`).join('');

    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    const vals = days.map((d) => st.byDay[dayKey(d)] || 0);
    const max = Math.max(state.settings.dailyGoal, ...vals);
    $('#weekChart').innerHTML = days.map((d, i) => `
      <div class="col ${i === 6 ? 'today' : ''}">
        <span class="val">${vals[i] ? fmtMin(vals[i]) : ''}</span>
        <div class="bar-v ${vals[i] ? '' : 'empty'}" style="height:${Math.max(3, (vals[i] / max) * 100)}%"></div>
        <span class="day">${d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
      </div>`).join('');

    const subj = Object.entries(st.bySubject).sort((a, b) => b[1] - a[1]);
    const smax = subj.length ? subj[0][1] : 1;
    $('#subjBars').innerHTML = subj.length ? subj.map(([name, min]) => `
      <div class="subj-row"><div class="top"><span>${esc(name)}</span><span>${fmtMin(min)}</span></div>
      <div class="bar"><div style="width:${(min / smax) * 100}%"></div></div></div>`).join('')
      : '<p class="muted small">No sessions yet. Go start a timer!</p>';

    const recent = state.sessions.slice(-12).reverse();
    $('#recent').innerHTML = recent.length ? recent.map((s) => {
      const d = new Date(s.end);
      return `<li><span>${MODES[s.mode]?.icon || '⏱️'} <b>${fmtMin(s.min)}</b> · ${esc(s.subject)}</span>
        <span class="when">${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span></li>`;
    }).join('') : '<li class="muted">Nothing here yet.</li>';
  }

  function renderBadges() {
    const got = Object.keys(state.achievements).length;
    $('#badgeCount').textContent = `${got} of ${ACHIEVEMENTS.length} unlocked · each one is worth +20 XP`;
    $('#badgeGrid').innerHTML = ACHIEVEMENTS.map((a) => {
      const when = state.achievements[a.id];
      return `<div class="card badge ${when ? 'unlocked' : 'locked'}">
        <div class="ico">${a.icon}</div><div class="name">${a.name}</div><div class="desc">${a.desc}</div>
        ${when ? `<div class="desc">✓ ${new Date(when).toLocaleDateString()}</div>` : ''}</div>`;
    }).join('');
  }

  function renderSettings() {
    $('#themeGrid').innerHTML = Object.entries(THEMES).map(([id, t]) => `
      <button class="theme-card ${id === state.settings.theme ? 'active' : ''}" data-theme-id="${id}"
        style="background:linear-gradient(150deg, ${t.preview[0]}, ${t.preview[1]}); color:${t.preview[2]}">
        <span class="em">${t.mascots[1]}</span>${t.name}</button>`).join('');
    $('#goalInput').value = state.settings.dailyGoal;
    $('#soundToggle').checked = state.settings.sound;
    $('#awakeToggle').checked = state.settings.keepAwake;
    $('#autoBreakToggle').checked = state.settings.autoBreaks;
    $('#autoFocusToggle').checked = state.settings.autoFocus;
    renderSubjects();
  }

  function renderAll() {
    applyTheme(); renderHeader(); renderModes(); renderSubjects(); renderTimer(); renderGoal();
    const v = currentView;
    if (v === 'stats') renderStats(); else if (v === 'badges') renderBadges(); else if (v === 'settings') renderSettings();
  }

  /* ================= FX ================= */
  function toast(title, sub, big = false) {
    const el = document.createElement('div');
    el.className = `toast${big ? ' big' : ''}`;
    el.innerHTML = `${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3300);
  }
  function burst(n = 22) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = $('#burst');
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.textContent = pick(theme().burst);
      const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 150;
      s.style.setProperty('--x', `${Math.cos(ang) * dist}px`);
      s.style.setProperty('--y', `${Math.sin(ang) * dist}px`);
      s.style.setProperty('--r', `${(Math.random() - 0.5) * 360}deg`);
      s.style.animationDelay = `${Math.random() * 0.15}s`;
      box.appendChild(s);
      setTimeout(() => s.remove(), 1600);
    }
  }

  /* ================= EVENTS ================= */
  let currentView = 'timer';
  function showView(v) {
    currentView = v;
    $$('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${v}`));
    $$('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    if (v === 'stats') renderStats(); else if (v === 'badges') renderBadges(); else if (v === 'settings') renderSettings();
    window.scrollTo({ top: 0 });
  }
  $$('.tabbar button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

  $('#mainBtn').addEventListener('click', () => (P().running ? pause() : run()));
  $('#resetBtn').addEventListener('click', resetTimer);
  $('#skipBtn').addEventListener('click', () => {
    const p = P();
    if (p.type === 'focus') {
      if (modeCfg().kind !== 'flow' && !confirm('Finish this session early? You\'ll get XP for the minutes you studied.')) return;
      completePhase(false);
    } else completePhase(false);
  });

  $('#modeChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b || b.dataset.mode === state.modeId) return;
    const p = P();
    if (!isPristine(p) && !confirm('Switch mode? The current timer will be reset.')) return;
    state.modeId = b.dataset.mode;
    state.timer = null; ensureTimer(); releaseWake();
    save(); renderModes(); renderTimer(); say('idle');
  });

  $('#adjustFields').addEventListener('change', (e) => {
    const inp = e.target.closest('[data-field]');
    if (!inp) return;
    const key = inp.dataset.field;
    let val = Math.round(Number(inp.value));
    const lo = Number(inp.min), hi = Number(inp.max);
    if (!Number.isFinite(val)) val = modeCfg()[key];
    val = Math.min(hi, Math.max(lo, val));
    inp.value = val;
    state.modes[state.modeId] = { ...(state.modes[state.modeId] || {}), [key]: val };
    const p = P();
    if (isPristine(p)) state.timer.phase = newPhase(p.type);
    save(); renderTimer();
  });

  $('#subjectSelect').addEventListener('change', (e) => {
    if (e.target.value === '__add') {
      const name = (prompt('New subject name:') || '').trim().slice(0, 30);
      if (name && !state.subjects.includes(name)) state.subjects.push(name);
      if (name) state.subject = name;
    } else state.subject = e.target.value;
    save(); renderSubjects();
  });

  $('#themeGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-id]');
    if (!b) return;
    state.settings.theme = b.dataset.themeId;
    if (!state.themesTried.includes(state.settings.theme)) state.themesTried.push(state.settings.theme);
    checkAchievements(); save();
    renderAll(); say(P().running ? (P().type === 'focus' ? 'focus' : 'break') : 'idle');
  });

  $('#goalInput').addEventListener('change', (e) => {
    const v = Math.min(960, Math.max(5, Math.round(Number(e.target.value)) || 60));
    state.settings.dailyGoal = v; e.target.value = v;
    checkAchievements(); save(); renderGoal();
  });
  const bindToggle = (sel, key, after) => $(sel).addEventListener('change', (e) => {
    state.settings[key] = e.target.checked; save(); after && after();
  });
  bindToggle('#soundToggle', 'sound', () => { unlockAudio(); chime('done'); });
  bindToggle('#awakeToggle', 'keepAwake', () => { if (state.settings.keepAwake && P().running) requestWake(); else releaseWake(); });
  bindToggle('#autoBreakToggle', 'autoBreaks');
  bindToggle('#autoFocusToggle', 'autoFocus');

  $('#addSubjectForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#newSubject').value.trim().slice(0, 30);
    if (name && !state.subjects.includes(name)) state.subjects.push(name);
    $('#newSubject').value = '';
    save(); renderSubjects();
  });
  $('#subjectList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove]');
    if (!b) return;
    const name = state.subjects[Number(b.dataset.remove)];
    if (!confirm(`Remove "${name}"? Past sessions stay in your stats.`)) return;
    state.subjects.splice(Number(b.dataset.remove), 1);
    save(); renderSubjects();
  });

  $('#exportBtn').addEventListener('click', async () => {
    const json = JSON.stringify(state, null, 2);
    const name = `studyquest-backup-${dayKey(new Date())}.json`;
    const file = new File([json], name, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'StudyQuest backup' }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.sessions) || typeof data.xp !== 'number') throw new Error('bad');
      if (!confirm('Replace your current progress with this backup?')) return;
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      state = load();
      renderAll(); toast('Backup restored ✓');
    } catch (err) { toast('That file isn\'t a StudyQuest backup'); }
  });
  $('#resetAllBtn').addEventListener('click', () => {
    if (!confirm('Delete ALL sessions, XP and badges? This cannot be undone.')) return;
    if (!confirm('Really sure? Maybe export a backup first.')) return;
    const keep = state.settings;
    state = defaultState(); state.settings = keep;
    save(); renderAll(); toast('Fresh start ✨');
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && currentView === 'timer' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault(); $('#mainBtn').click();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    tick(); renderHeader(); renderGoal();
    if (state.timer && P().running) requestWake();
  });

  // iOS "Add to Home Screen" hint (only in Safari, not already installed)
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIOS && !navigator.standalone && !state.hideInstall) $('#installHint').hidden = false;
  $('#installClose').addEventListener('click', () => { $('#installHint').hidden = true; state.hideInstall = true; save(); });

  /* ================= BOOT ================= */
  ensureTimer();
  renderAll();
  say(P().running ? (P().type === 'focus' ? 'focus' : 'break') : 'idle');
  tick();
  setInterval(tick, 250);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
