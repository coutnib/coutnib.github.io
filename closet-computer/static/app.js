/* Closet Computer - front-end (no build step, plain JS) */
const CATS = [
  { id: 'top', label: 'Tops', e: '👕' }, { id: 'bottom', label: 'Bottoms', e: '👖' },
  { id: 'dress', label: 'Dresses', e: '👗' }, { id: 'outerwear', label: 'Outerwear', e: '🧥' },
  { id: 'shoes', label: 'Shoes', e: '👟' }, { id: 'hat', label: 'Hats', e: '👒' },
  { id: 'accessory', label: 'Accessories', e: '👜' },
];
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
const ROW_H = { hat: 110, outerwear: 140, top: 210, bottom: 240, dress: 420, shoes: 110 };
const OPTIONAL = new Set(['hat', 'outerwear']);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = $('#view');

async function api(path, opts = {}) {
  const r = await fetch(path, opts);
  if (!r.ok) {
    let m = r.statusText;
    try { const j = await r.json(); m = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail); } catch { }
    throw new Error(m);
  }
  return r.json();
}
const send = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
function openModal(html) { $('#modal-card').innerHTML = `<button class="close" onclick="closeModal()">✕</button>` + html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modal-card').innerHTML = ''; if (state.onClose) { const f = state.onClose; state.onClose = null; f(); } }
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });

const state = {
  items: [], cat: '', q: '', fav: false, onClose: null,
  b: { mode: 'separates', idx: {}, locks: {}, acc: new Set(), outfitId: null, name: '', focus: 'top', init: false },
};

/* ------------------------------------------------------------------ router */
const VIEWS = { closet: closetView, dress: dressView, lookbook: lookbookView, tryons: tryonsView, me: meView, settings: settingsView };
function route() {
  const name = (location.hash || '#closet').slice(1).split('?')[0];
  state.onClose = null; $('#modal').classList.add('hidden');   // leaving a page closes any open dialog
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.view === name));
  (VIEWS[name] || closetView)();
}
window.addEventListener('hashchange', route);

/* ------------------------------------------------------------------ status bar */
async function refreshStatus() {
  try {
    const s = await api('/api/status');
    const bg = s.bg;
    const bgTxt = { ready: `ready (${bg.model})`, downloading: `downloading ${bg.model} ${Math.round(bg.progress * 100)}% (first run only)`,
      loading: 'loading…', error: 'error: ' + bg.error, idle: 'starting…' }[bg.state];
    const n = Object.values(s.counts).reduce((a, b) => a + b, 0);
    $('#statusbar').innerHTML = `<span>👚 ${n} items</span><span>📖 ${s.outfits} outfits</span><span>✂️ Background remover: ${esc(bgTxt)}</span>`;
    setTimeout(refreshStatus, ['downloading', 'loading', 'idle'].includes(bg.state) ? 1500 : 15000);
  } catch { setTimeout(refreshStatus, 5000); }
}

/* ------------------------------------------------------------------ closet */
async function closetView() {
  const [items, st] = await Promise.all([api(`/api/items?category=${state.cat}&q=${encodeURIComponent(state.q)}&favorite=${state.fav}`), api('/api/status')]);
  const total = Object.values(st.counts).reduce((a, b) => a + b, 0);
  view.innerHTML = `
    <div class="row"><h1>My closet</h1><div class="spacer"></div>
      <input type="search" id="q" placeholder="Search name, color, tag…" value="${esc(state.q)}" style="max-width:260px">
      <button class="btn primary" onclick="uploadModal()">＋ Add clothes</button></div>
    <div class="chips">
      <button class="chip ${state.cat ? '' : 'active'}" data-cat="">All<span class="n">${total}</span></button>
      ${CATS.map(c => `<button class="chip ${state.cat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.e} ${c.label}<span class="n">${st.counts[c.id]}</span></button>`).join('')}
      <button class="chip ${state.fav ? 'active' : ''}" id="favf">♥ Favorites</button>
    </div>
    ${items.length ? `<div class="grid">${items.map(itemCard).join('')}</div>` : `
      <div class="empty"><div class="big">🧺</div><h2>${total ? 'Nothing here yet' : 'Your closet is empty'}</h2>
      <p class="muted">Snap or upload photos of your clothes - the background is removed automatically.</p>
      <button class="btn primary" onclick="uploadModal('${state.cat}')">＋ Add ${state.cat ? CAT[state.cat].label.toLowerCase() : 'clothes'}</button></div>`}`;
  $$('.chip[data-cat]').forEach(b => b.onclick = () => { state.cat = b.dataset.cat; closetView(); });
  $('#favf').onclick = () => { state.fav = !state.fav; closetView(); };
  let t; $('#q').oninput = e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; closetView().then(() => { const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }); }, 300); };
  $$('.card[data-id]').forEach(c => c.onclick = () => itemModal(items.find(i => i.id == c.dataset.id)));
}
const itemCard = i => `<div class="card" data-id="${i.id}">
  ${i.favorite ? '<span class="fav">♥</span>' : ''}<span class="badge">${CAT[i.category]?.e || ''}</span>
  <div class="pic"><img loading="lazy" src="${i.thumb}" alt=""></div>
  <div class="meta"><span class="dot" style="background:${i.color}"></span><span class="name">${esc(i.name)}</span></div></div>`;

/* ------------------------------------------------------------------ upload */
function uploadModal(cat = '') {
  let chosen = cat || state.cat || 'top', busy = 0, added = 0;
  openModal(`<h2>Add to your closet</h2>
    <p class="muted small">What are these? (You can change it per item later.)</p>
    <div class="catpick">${CATS.map(c => `<button data-c="${c.id}" class="${c.id === chosen ? 'active' : ''}"><span class="e">${c.e}</span>${c.label}</button>`).join('')}</div>
    <div class="drop" id="drop"><div style="font-size:34px">📸</div><b>Drop photos here, or click to choose</b>
      <div class="muted small">Tip: lay the item flat or hang it against a plain wall. JPG, PNG, WEBP${''} - already-transparent PNGs are kept as-is.</div></div>
    <label class="row small" style="margin-top:10px"><input type="checkbox" id="rmbg" checked> Remove background automatically</label>
    <div class="uploads" id="ups"></div>
    <div class="row" style="margin-top:16px"><div class="spacer"></div><button class="btn primary" onclick="closeModal()">Done</button></div>`);
  state.onClose = () => { if (added) route(); };
  $$('.catpick button').forEach(b => b.onclick = () => { chosen = b.dataset.c; $$('.catpick button').forEach(x => x.classList.toggle('active', x === b)); });
  const fi = $('#file-input');
  const drop = $('#drop');
  drop.onclick = () => { fi.value = ''; fi.click(); };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); handle([...e.dataTransfer.files]); };
  fi.onchange = () => handle([...fi.files]);
  const queue = [];
  function handle(files) {
    for (const f of files.filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))) {
      const el = document.createElement('div');
      el.className = 'up';
      el.innerHTML = `<div class="pic"><div class="spin"></div></div><div>Removing background…</div>`;
      $('#ups').prepend(el);
      queue.push({ f, el, cat: chosen, rm: $('#rmbg').checked });
    }
    pump();
  }
  function pump() {
    while (busy < 2 && queue.length) {
      const job = queue.shift(); busy++;
      const fd = new FormData();
      fd.append('file', job.f); fd.append('category', job.cat); fd.append('remove_bg', job.rm);
      api('/api/items', { method: 'POST', body: fd }).then(item => {
        added++;
        job.el.innerHTML = `<div class="pic"><img src="${item.thumb}"></div><div>${CAT[item.category].e} ${esc(item.name)}</div>`;
        job.el.onclick = () => { closeModal(); itemModal(item); };
      }).catch(e => { job.el.innerHTML = `<div class="pic">⚠️</div><div class="err">${esc(job.f.name)}: ${esc(e.message)}</div>`; })
        .finally(() => { busy--; pump(); });
    }
  }
}

/* ------------------------------------------------------------------ item detail */
function itemModal(item) {
  let showOrig = false;
  openModal(`<div class="two">
      <div><div class="preview"><img id="ipic" src="${item.image}"></div>
        <div class="row" style="margin-top:8px"><div class="seg"><button class="on" id="vcut">Cutout</button><button id="vorig">Original photo</button></div></div></div>
      <div><h2>${CAT[item.category]?.e || ''} Edit item</h2>
        <label class="field">Name<input type="text" id="iname" value="${esc(item.name)}"></label>
        <label class="field">Category<select id="icat">${CATS.map(c => `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${c.e} ${c.label}</option>`).join('')}</select></label>
        <label class="field">Tags (comma separated - e.g. work, summer, going out)<input type="text" id="itags" value="${esc(item.tags.join(', '))}"></label>
        <label class="field">Notes<textarea id="inotes" rows="2">${esc(item.notes)}</textarea></label>
        <div class="row small muted"><span class="dot" style="background:${item.color}"></span> Main color: ${esc(item.color_name)}
          <label style="margin-left:auto"><input type="checkbox" id="ifav" ${item.favorite ? 'checked' : ''}> ♥ Favorite</label></div>
        <div class="row" style="margin-top:14px"><button class="btn primary" id="isave">Save</button>
          <button class="btn" id="iwear">🪞 Dress me with it</button></div>
        <details style="margin-top:14px"><summary class="small muted">Cutout not right?</summary>
          <div class="row" style="margin-top:8px"><select id="imodel" style="max-width:240px"></select><button class="btn" id="iredo">Redo cutout</button>
          <button class="btn" id="ikeep">Use original photo</button></div></details>
        <div class="row" style="margin-top:14px"><div class="spacer"></div><button class="btn danger" id="idel">Delete item</button></div>
      </div></div>`);
  state.onClose = route;
  api('/api/providers').then(p => { $('#imodel').innerHTML = Object.entries(p.bg_models).map(([k, v]) => `<option value="${k}" ${k === p.bg_model ? 'selected' : ''}>${k} - ${esc(v)}</option>`).join(''); });
  const swap = o => { showOrig = o; $('#ipic').src = o ? item.original : item.image; $('#vcut').classList.toggle('on', !o); $('#vorig').classList.toggle('on', o); };
  $('#vcut').onclick = () => swap(false); $('#vorig').onclick = () => swap(true);
  $('#isave').onclick = async () => {
    item = await api(`/api/items/${item.id}`, send('PATCH', { name: $('#iname').value, category: $('#icat').value,
      tags: $('#itags').value.split(','), notes: $('#inotes').value, favorite: $('#ifav').checked }));
    toast('Saved'); closeModal();
  };
  const redo = async (mode) => {
    const fd = new FormData(); fd.append('mode', mode); fd.append('model', $('#imodel').value);
    $('#ipic').style.opacity = .3;
    try { item = await api(`/api/items/${item.id}/reprocess`, { method: 'POST', body: fd }); swap(false); toast('Updated'); }
    catch (e) { toast(e.message); }
    $('#ipic').style.opacity = 1;
  };
  $('#iredo').onclick = () => redo('auto'); $('#ikeep').onclick = () => redo('none');
  $('#iwear').onclick = () => { putInBuilder(item); state.onClose = null; closeModal(); location.hash = '#dress'; };
  $('#idel').onclick = async () => { if (!confirm(`Delete "${item.name}"? It will also be removed from saved outfits.`)) return; await api(`/api/items/${item.id}`, { method: 'DELETE' }); toast('Deleted'); closeModal(); };
}

/* ------------------------------------------------------------------ dress me (outfit builder) */
let byCat = {};
const rowsFor = mode => mode === 'dress' ? ['hat', 'outerwear', 'dress', 'shoes'] : ['hat', 'outerwear', 'top', 'bottom', 'shoes'];

function putInBuilder(item) {
  state.b.pendingItem = item;
}

async function dressView() {
  const items = await api('/api/items');
  byCat = Object.fromEntries(CATS.map(c => [c.id, items.filter(i => i.category === c.id)]));
  const b = state.b;
  for (const s of ['hat', 'outerwear', 'top', 'bottom', 'dress', 'shoes']) {
    const n = byCat[s].length;
    if (b.idx[s] === undefined || b.idx[s] >= n) b.idx[s] = (OPTIONAL.has(s) || !n) ? -1 : 0;
  }
  if (!b.init) { b.init = true; if (!byCat.top.length && byCat.dress.length) b.mode = 'dress'; }
  if (b.pendingItem) {
    const it = b.pendingItem; b.pendingItem = null;
    if (it.category === 'accessory') b.acc.add(it.id);
    else { b.idx[it.category] = byCat[it.category].findIndex(i => i.id === it.id); if (it.category === 'dress') b.mode = 'dress'; if (['top', 'bottom'].includes(it.category)) b.mode = 'separates'; }
  }
  b.acc = new Set([...b.acc].filter(id => byCat.accessory.some(i => i.id === id)));
  if (!items.length) {
    view.innerHTML = `<div class="empty"><div class="big">🪞</div><h2>Nothing to wear yet</h2><p class="muted">Add a few tops, bottoms and shoes to start mixing outfits.</p>
      <button class="btn primary" onclick="uploadModal()">＋ Add clothes</button></div>`;
    return;
  }
  view.innerHTML = `<div class="dress">
    <div class="window"><div class="titlebar"><i></i><i></i><i></i><span>DRESS ME${b.outfitId ? ' - editing “' + esc(b.name) + '”' : ''}</span></div><div id="rows"></div></div>
    <div class="side">
      <div class="panel"><div class="row"><b>Style</b><div class="spacer"></div>
        <div class="seg"><button data-m="separates" class="${b.mode === 'separates' ? 'on' : ''}">Top + bottom</button><button data-m="dress" class="${b.mode === 'dress' ? 'on' : ''}">Dress</button></div></div></div>
      <div class="panel"><div class="row"><b>Accessories</b><div class="spacer"></div><button class="lock ${b.locks.accessory ? 'on' : ''}" id="acclock" title="Lock accessories during shuffle">${b.locks.accessory ? '🔒' : '🔓'}</button></div>
        ${byCat.accessory.length ? `<div class="acc" style="margin-top:8px">${byCat.accessory.map(i => `<button data-acc="${i.id}" class="${b.acc.has(i.id) ? 'on' : ''}" title="${esc(i.name)}"><img src="${i.thumb}"></button>`).join('')}</div>`
          : `<p class="muted small">No accessories yet. <a href="#" onclick="uploadModal('accessory');return false">Add some</a></p>`}</div>
      <div class="panel actions">
        <button class="btn" id="shuffle">🔀 Shuffle <kbd>R</kbd></button>
        <input type="text" id="oname" placeholder="Outfit name (e.g. Brunch Saturday)" value="${esc(b.name)}">
        <button class="btn" id="save">💾 ${b.outfitId ? 'Update outfit' : 'Save to lookbook'}</button>
        ${b.outfitId ? '<button class="btn ghost small" id="saveas">Save as a new outfit</button>' : ''}
        <button class="btn primary" id="try">✨ Try it on me</button>
        <p class="muted small" style="margin:4px 0 0">Flip with ‹ › or swipe. Keyboard: <kbd>↑</kbd><kbd>↓</kbd> pick a row, <kbd>←</kbd><kbd>→</kbd> flip, <kbd>L</kbd> lock.</p>
      </div></div></div>`;
  renderRows();
  $$('[data-m]').forEach(x => x.onclick = () => { b.mode = x.dataset.m; dressView(); });
  $$('[data-acc]').forEach(x => x.onclick = () => { const id = +x.dataset.acc; b.acc.has(id) ? b.acc.delete(id) : b.acc.add(id); x.classList.toggle('on'); });
  $('#acclock').onclick = () => { b.locks.accessory = !b.locks.accessory; dressView(); };
  $('#shuffle').onclick = shuffle;
  $('#oname').oninput = e => b.name = e.target.value;
  $('#save').onclick = () => saveOutfit(false);
  if ($('#saveas')) $('#saveas').onclick = () => saveOutfit(true);
  $('#try').onclick = () => { const sl = selection(); if (!sl.length) return toast('Pick at least one item'); tryOnModal(sl, b.outfitId); };
}

function renderRows(flip = {}) {
  const b = state.b;
  $('#rows').innerHTML = rowsFor(b.mode).map(s => {
    const list = byCat[s], i = b.idx[s], cur = list[i], n = list.length;
    const peek = d => { if (n < 2) return ''; let j = i + d; if (j < 0) j = n - 1; if (j >= n) j = 0; return list[j] && j !== i ? `<img class="peek" data-peek="${d}" src="${list[j].thumb}">` : ''; };
    return `<div class="slotrow ${b.focus === s ? 'focus' : ''}" data-slot="${s}">
      <div class="lbl">${CAT[s].e} ${CAT[s].label}<b>${cur ? esc(cur.name) : n ? 'None' : '-'}</b><span class="small muted">${cur ? `${i + 1} / ${n}` : ''}</span></div>
      <button class="arrow" data-flip="-1" ${n ? '' : 'disabled'}>‹</button>
      <div class="stage ${flip[s] ? (flip[s] > 0 ? 'flip-l' : 'flip-r') : ''}" style="--h:${cur ? ROW_H[s] : 56}px">
        ${cur ? peek(-1) + `<div class="main"><img src="${cur.image}" alt="${esc(cur.name)}"></div>` + peek(1)
          : n ? `<span class="none">No ${CAT[s].label.toLowerCase()} - flip to add</span>`
            : `<a class="none" href="#" data-add="${s}">＋ Add ${CAT[s].label.toLowerCase()}</a>`}
      </div>
      <button class="arrow" data-flip="1" ${n ? '' : 'disabled'}>›</button>
      <button class="lock ${b.locks[s] ? 'on' : ''}" data-lock title="Lock this row when shuffling">${b.locks[s] ? '🔒' : '🔓'}</button></div>`;
  }).join('');
  $$('.slotrow').forEach(row => {
    const s = row.dataset.slot;
    row.onclick = () => { if (b.focus !== s) { b.focus = s; $$('.slotrow').forEach(r => r.classList.toggle('focus', r === row)); } };
    $$('[data-flip]', row).forEach(x => x.onclick = e => { e.stopPropagation(); flipRow(s, +x.dataset.flip); });
    $$('[data-peek]', row).forEach(x => x.onclick = e => { e.stopPropagation(); flipRow(s, +x.dataset.peek); });
    $('[data-lock]', row).onclick = e => { e.stopPropagation(); b.locks[s] = !b.locks[s]; renderRows(); };
    const add = $('[data-add]', row); if (add) add.onclick = e => { e.preventDefault(); uploadModal(s); };
    const st = $('.stage', row); let x0 = null;
    st.onpointerdown = e => { x0 = e.clientX; };
    st.onpointerup = e => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) flipRow(s, e.clientX < x0 ? 1 : -1); x0 = null; };
  });
}

function flipRow(s, d) {
  const b = state.b, n = byCat[s].length;
  if (!n) return;
  const lo = OPTIONAL.has(s) || true ? -1 : 0;   // every row can be empty ("none")
  let i = b.idx[s] + d;
  if (i >= n) i = lo; if (i < lo) i = n - 1;
  b.idx[s] = i; b.focus = s;
  renderRows({ [s]: d });
}

function shuffle() {
  const b = state.b, rnd = n => Math.floor(Math.random() * n);
  const flips = {};
  for (const s of rowsFor(b.mode)) {
    const n = byCat[s].length;
    if (b.locks[s] || !n) continue;
    b.idx[s] = OPTIONAL.has(s) && Math.random() < 0.5 ? -1 : rnd(n);
    flips[s] = 1;
  }
  if (!b.locks.accessory && byCat.accessory.length) {
    const pool = [...byCat.accessory].sort(() => Math.random() - 0.5);
    b.acc = new Set(pool.slice(0, rnd(Math.min(3, pool.length + 1))).map(i => i.id));
    $$('[data-acc]').forEach(x => x.classList.toggle('on', b.acc.has(+x.dataset.acc)));
  }
  renderRows(flips);
}

function selection() {
  const b = state.b, out = [];
  for (const s of rowsFor(b.mode)) { const it = byCat[s][b.idx[s]]; if (it) out.push({ slot: s, item_id: it.id, item: it }); }
  for (const id of b.acc) { const it = byCat.accessory.find(i => i.id === id); if (it) out.push({ slot: 'accessory', item_id: id, item: it }); }
  return out;
}

async function saveOutfit(asNew) {
  const b = state.b, sl = selection();
  if (!sl.length) return toast('Pick at least one item');
  const body = { name: b.name || '', items: sl.map(({ slot, item_id }) => ({ slot, item_id })) };
  const o = b.outfitId && !asNew ? await api(`/api/outfits/${b.outfitId}`, send('PUT', body)) : await api('/api/outfits', send('POST', body));
  b.outfitId = o.id; b.name = o.name;
  toast(`Saved “${o.name}” to your lookbook`);
  dressView();
}

function loadIntoBuilder(o) {
  const b = state.b;
  b.outfitId = o.id; b.name = o.name; b.acc = new Set(); b.idx = {}; b.init = true;
  b.mode = o.items.some(x => x.slot === 'dress') ? 'dress' : 'separates';
  b.loadSlots = o.items;
  location.hash = '#dress';
}

document.addEventListener('keydown', e => {
  if ((location.hash || '#closet') !== '#dress' || !$('#modal').classList.contains('hidden') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const b = state.b, rows = rowsFor(b.mode);
  let k = rows.indexOf(b.focus); if (k < 0) k = 0;
  if (e.key === 'ArrowUp') { b.focus = rows[Math.max(0, k - 1)]; renderRows(); e.preventDefault(); }
  else if (e.key === 'ArrowDown') { b.focus = rows[Math.min(rows.length - 1, k + 1)]; renderRows(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { flipRow(rows[k], -1); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { flipRow(rows[k], 1); e.preventDefault(); }
  else if (e.key.toLowerCase() === 'r') shuffle();
  else if (e.key.toLowerCase() === 'l') { b.locks[rows[k]] = !b.locks[rows[k]]; renderRows(); }
});

/* ------------------------------------------------------------------ try-on */
async function tryOnModal(slots, outfitId = null) {
  const [people, prov] = await Promise.all([api('/api/people'), api('/api/providers')]);
  let pid = (people.find(p => p.is_default) || people[0] || {}).id;
  openModal(`<h2>✨ Try it on</h2>
    <p class="muted small">Your outfit: ${slots.map(s => `${CAT[s.slot]?.e || ''} ${esc(s.item.name)}`).join(' · ')}</p>
    <h3 style="font-size:15px;margin-top:14px">Photo of you</h3>
    ${people.length ? `<div class="people">${people.map(p => `<button data-p="${p.id}" class="${p.id === pid ? 'on' : ''}"><img src="${p.image}"></button>`).join('')}</div>`
      : `<p class="muted small">No photo of you yet.</p>`}
    <div class="row" style="margin-top:6px"><button class="btn small" id="addme">＋ Upload a photo of me</button></div>
    <label class="field">Model<select id="prov">${prov.providers.map(p => `<option value="${p.id}" ${p.id === prov.default ? 'selected' : ''}>${esc(p.name)}${p.missing.length ? ' (needs setup)' : ''}</option>`).join('')}</select></label>
    <p class="small muted" id="pdesc"></p>
    <label class="field">Extra direction (optional)<input type="text" id="instr" placeholder="e.g. standing on a city street at golden hour"></label>
    <div class="row"><a href="#settings" onclick="closeModal()" class="small">Model settings & API keys</a><div class="spacer"></div><button class="btn primary" id="go">Generate</button></div>
    <div id="tres" style="margin-top:16px"></div>`);
  const desc = () => { const p = prov.providers.find(x => x.id === $('#prov').value); $('#pdesc').innerHTML = esc(p.description) + (p.missing.length ? ` <b style="color:var(--warn)">Needs: ${esc(p.missing.join(', '))} - add it in Settings.</b>` : ''); };
  $('#prov').onchange = desc; desc();
  $$('[data-p]').forEach(x => x.onclick = () => { pid = +x.dataset.p; $$('[data-p]').forEach(y => y.classList.toggle('on', y === x)); });
  $('#addme').onclick = () => pickPhoto(async () => tryOnModal(slots, outfitId));
  $('#go').onclick = async () => {
    if (!pid) return toast('Upload a photo of yourself first');
    $('#go').disabled = true;
    $('#tres').innerHTML = `<div class="row"><div class="spin"></div> Generating… this can take 10-60 seconds with AI models.</div>`;
    try {
      let t = await api('/api/tryons', send('POST', { person_id: pid, slots: slots.map(({ slot, item_id }) => ({ slot, item_id })), outfit_id: outfitId, provider: $('#prov').value, instructions: $('#instr').value }));
      while (['queued', 'running'].includes(t.status)) { await new Promise(r => setTimeout(r, 2000)); t = await api(`/api/tryons/${t.id}`); }
      if (t.status === 'error') throw new Error(t.error);
      const person = people.find(p => p.id === pid);
      $('#tres').innerHTML = `<div class="tryres"><div><div class="small muted">Before</div><img src="${person.image}"></div><div><div class="small muted">After</div><img src="${t.image}"></div></div>
        <div class="row" style="margin-top:10px"><a class="btn" href="${t.image}" download="try-on-${t.id}.png">⬇ Download</a>
        ${outfitId ? `<button class="btn" id="cover">Use as outfit cover</button>` : ''}<div class="spacer"></div><a class="btn ghost" href="#tryons" onclick="closeModal()">All try-ons</a></div>`;
      if ($('#cover')) $('#cover').onclick = async () => { await api(`/api/outfits/${outfitId}`, send('PATCH', { cover_tryon_id: t.id })); toast('Cover updated'); };
    } catch (e) { $('#tres').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
    $('#go').disabled = false;
  };
}

function pickPhoto(done) {
  const fi = $('#file-input');
  fi.value = '';
  fi.onchange = async () => {
    for (const f of fi.files) { const fd = new FormData(); fd.append('file', f); try { await api('/api/people', { method: 'POST', body: fd }); } catch (e) { toast(e.message); } }
    done();
  };
  fi.click();
}

/* ------------------------------------------------------------------ lookbook */
async function lookbookView() {
  const outfits = await api('/api/outfits');
  view.innerHTML = `<div class="row"><h1>Lookbook</h1><div class="spacer"></div><a class="btn primary" href="#dress">🪞 Make an outfit</a></div>
    ${outfits.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));margin-top:14px">${outfits.map(o => `
      <div class="card" data-o="${o.id}">${o.favorite ? '<span class="fav">♥</span>' : ''}<div class="pic tall"><img loading="lazy" src="${o.cover || o.image}"></div>
      <div class="meta"><span class="name">${esc(o.name)}</span><span class="small muted">${o.items.length} items</span></div></div>`).join('')}</div>`
      : `<div class="empty" style="margin-top:14px"><div class="big">📖</div><h2>No outfits saved yet</h2><p class="muted">Build one in Dress me and hit Save.</p></div>`}`;
  $$('[data-o]').forEach(c => c.onclick = () => outfitModal(outfits.find(o => o.id == c.dataset.o)));
}

async function outfitModal(o) {
  const tryons = (await api(`/api/tryons?outfit_id=${o.id}`)).filter(t => t.status === 'done');
  openModal(`<div class="two"><div><img src="${o.image}" style="width:100%;border-radius:16px"></div>
    <div><input type="text" id="oname2" value="${esc(o.name)}" style="font-family:var(--serif);font-size:22px;font-weight:600">
      <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0">${o.items.map(x => `<div class="card"><div class="pic"><img src="${x.item.thumb}"></div><div class="meta small"><span class="name">${CAT[x.slot]?.e || ''} ${esc(x.item.name)}</span></div></div>`).join('')}</div>
      <label class="small"><input type="checkbox" id="ofav" ${o.favorite ? 'checked' : ''}> ♥ Favorite</label>
      <div class="actions" style="margin-top:12px"><button class="btn primary" id="otry">✨ Try it on me</button><button class="btn" id="oedit">🪞 Edit in Dress me</button>
        <button class="btn danger" id="odel">Delete outfit</button></div>
      ${tryons.length ? `<h3 style="font-size:15px;margin-top:16px">Try-ons</h3><div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px">${tryons.map(t => `<a href="${t.image}" target="_blank" class="card"><div class="pic tall"><img src="${t.image}"></div></a>`).join('')}</div>` : ''}
    </div></div>`);
  state.onClose = lookbookView;
  const patch = body => api(`/api/outfits/${o.id}`, send('PATCH', body));
  $('#oname2').onchange = e => patch({ name: e.target.value });
  $('#ofav').onchange = e => patch({ favorite: e.target.checked });
  $('#otry').onclick = () => { state.onClose = null; tryOnModal(o.items.map(x => ({ slot: x.slot, item_id: x.item.id, item: x.item })), o.id); };
  $('#oedit').onclick = () => { state.onClose = null; closeModal(); loadIntoBuilder(o); };
  $('#odel').onclick = async () => { if (!confirm('Delete this outfit? (The clothes stay in your closet.)')) return; await api(`/api/outfits/${o.id}`, { method: 'DELETE' }); closeModal(); };
}

/* ------------------------------------------------------------------ try-ons gallery */
async function tryonsView() {
  const [list, prov] = await Promise.all([api('/api/tryons'), api('/api/providers')]);
  const pname = id => prov.providers.find(p => p.id === id)?.name || id;
  view.innerHTML = `<h1>Try-ons</h1><p class="muted">Every generated look, newest first.</p>
    ${list.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${list.map(t => `
      <div class="card" data-t="${t.id}"><div class="pic tall">${t.status === 'done' ? `<img loading="lazy" src="${t.image}">` : t.status === 'error' ? `<div class="err" style="margin:10px;max-height:90%;overflow:auto">${esc(t.error)}</div>` : '<div class="spin"></div>'}</div>
      <div class="meta small"><span class="name">${esc(pname(t.provider))}</span><button class="btn ghost small" data-del="${t.id}">🗑</button></div></div>`).join('')}</div>`
      : `<div class="empty"><div class="big">✨</div><h2>No try-ons yet</h2><p class="muted">Build an outfit in Dress me and press “Try it on me”.</p></div>`}`;
  $$('[data-del]').forEach(x => x.onclick = async e => { e.stopPropagation(); await api(`/api/tryons/${x.dataset.del}`, { method: 'DELETE' }); tryonsView(); });
  $$('[data-t]').forEach(c => c.onclick = () => { const t = list.find(x => x.id == c.dataset.t); if (t.image) window.open(t.image, '_blank'); });
  if (list.some(t => ['queued', 'running'].includes(t.status))) setTimeout(() => location.hash === '#tryons' && tryonsView(), 3000);
}

/* ------------------------------------------------------------------ me */
async function meView() {
  const people = await api('/api/people');
  view.innerHTML = `<div class="row"><h1>Photos of me</h1><div class="spacer"></div><button class="btn primary" id="addp">＋ Add a photo</button></div>
    <p class="muted">Used for try-ons. Best results: full body, facing the camera, good light, fitted clothes, plain background.</p>
    ${people.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${people.map(p => `
      <div class="card"><div class="pic tall"><img src="${p.image}"></div><div class="meta small">
      ${p.is_default ? '<b>⭐ Default</b>' : `<button class="btn ghost small" data-def="${p.id}">Make default</button>`}<div class="spacer"></div>
      <button class="btn ghost small" data-delp="${p.id}">🗑</button></div></div>`).join('')}</div>`
      : `<div class="empty"><div class="big">🙂</div><h2>Add a photo of yourself</h2><p class="muted">Then try any outfit on you.</p></div>`}`;
  $('#addp').onclick = () => pickPhoto(meView);
  $$('[data-def]').forEach(x => x.onclick = async () => { await api(`/api/people/${x.dataset.def}/default`, { method: 'POST' }); meView(); });
  $$('[data-delp]').forEach(x => x.onclick = async () => { if (!confirm('Delete this photo?')) return; await api(`/api/people/${x.dataset.delp}`, { method: 'DELETE' }); meView(); });
}

/* ------------------------------------------------------------------ settings */
async function settingsView() {
  const p = await api('/api/providers');
  view.innerHTML = `<h1>Settings</h1>
    <h2 style="margin-top:20px">Try-on model</h2>
    <p class="muted small">Pick which image model generates “what it looks like on me”. Keys are stored only on this computer (in <code>data/settings.json</code>).
      You can also set them as environment variables (OPENAI_API_KEY, GEMINI_API_KEY, REPLICATE_API_TOKEN, FAL_KEY). Add your own model by dropping a Python file into <code>plugins/</code>.</p>
    ${p.providers.map(pr => `<div class="provider ${pr.id === p.default ? 'on' : ''}" data-pr="${pr.id}">
      <label class="row"><input type="radio" name="defprov" value="${pr.id}" ${pr.id === p.default ? 'checked' : ''}><h3>${esc(pr.name)}
        ${pr.missing.length ? `<span class="pill">needs ${esc(pr.missing.join(', '))}</span>` : '<span class="pill ok">ready</span>'}</h3></label>
      <p class="muted small" style="margin:6px 0">${esc(pr.description)}</p>
      ${pr.fields.length ? `<div class="two" style="gap:0 14px">${pr.fields.map(f => `<label class="field">${esc(f.label)}
        ${f.type === 'select' ? `<select data-k="${f.key}">${f.options.map(o => `<option ${o === f.value ? 'selected' : ''}>${o}</option>`).join('')}</select>`
          : `<input type="${f.type === 'password' ? 'password' : 'text'}" data-k="${f.key}" value="${esc(f.value)}" placeholder="${esc(f.default || '')}" autocomplete="off">`}
        ${f.help ? `<span class="small">${esc(f.help)}</span>` : ''}</label>`).join('')}</div>` : ''}
    </div>`).join('')}
    ${p.plugin_errors.length ? `<div class="err">Plugin errors:\n${esc(p.plugin_errors.join('\n'))}</div>` : ''}
    <h2 style="margin-top:24px">Background removal</h2>
    <label class="field">Model (runs locally, downloaded once)<select id="bgm">${Object.entries(p.bg_models).map(([k, v]) => `<option value="${k}" ${k === p.bg_model ? 'selected' : ''}>${k} - ${esc(v)}</option>`).join('')}</select></label>
    <div class="row" style="margin-top:16px"><button class="btn primary" id="saveset">Save settings</button><div class="spacer"></div>
      <a class="btn" href="/api/export">⬇ Back up my closet (.zip)</a></div>`;
  $('#saveset').onclick = async () => {
    const providers = {};
    $$('[data-pr]').forEach(card => { providers[card.dataset.pr] = Object.fromEntries($$('[data-k]', card).map(i => [i.dataset.k, i.value])); });
    await api('/api/settings', send('PUT', { provider: $('input[name=defprov]:checked').value, bg_model: $('#bgm').value, providers }));
    toast('Settings saved'); settingsView();
  };
}

/* apply an outfit loaded from the lookbook once the builder has its item lists */
const _dressView = dressView;
dressView = async function () {
  const b = state.b;
  if (b.loadSlots) {
    const items = await api('/api/items');
    const cats = Object.fromEntries(CATS.map(c => [c.id, items.filter(i => i.category === c.id)]));
    for (const s of ['hat', 'outerwear', 'top', 'bottom', 'dress', 'shoes']) b.idx[s] = -1;
    for (const x of b.loadSlots) {
      if (x.slot === 'accessory') b.acc.add(x.item.id);
      else if (cats[x.slot]) b.idx[x.slot] = cats[x.slot].findIndex(i => i.id === x.item.id);
    }
    b.loadSlots = null;
  }
  return _dressView();
};
VIEWS.dress = dressView;

route();
refreshStatus();
