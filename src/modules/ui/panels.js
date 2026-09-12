// Modal menus: main menu (Continue / New game with seed & map / Load / Settings), Esc pause menu,
// save/load slot panels (window.__sim.saves), settings (quality, audio, autosave, minimap, keys).
// Every choice emits ui:action; the core save system consumes save/load/download itself.
import { ICONS } from './icons.js';
import { el, btn, esc } from './dom.js';

const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
const SLOT_NAMES = { auto: 'Autosave', slot1: 'Slot 1', slot2: 'Slot 2', slot3: 'Slot 3' };
const QUALITIES = ['low', 'medium', 'high', 'ultra'];
const APP_VERSION = import.meta.env?.VITE_APP_VERSION || '0.1.0';
const BUILD_ID = String(import.meta.env?.VITE_BUILD_ID || 'development').slice(0, 7);
const VERSION_LABEL = `Version ${APP_VERSION} · build ${BUILD_ID}`;
const KEYS = [['Esc', 'Pause menu / close panel'], ['Space', 'Pause / resume'], ['1 2 3', 'Game speed'], ['P', 'Photo mode'], ['M', 'Toggle minimap'], ['W A S D', 'Pan camera'], ['Q E', 'Rotate camera'], ['RMB drag', 'Orbit'], ['MMB drag', 'Pan'], ['Wheel', 'Zoom'], ['`', 'Dev corner']];

function ago(ts) {
  if (!ts) return '';
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString();
}

export class Menus {
  constructor(hud) {
    this.hud = hud; this.ctx = hud.ctx;
    this.el = null; this.kind = null; this._wasRunning = false; this._stack = []; this._openOpts = {};
    this.settings = { quality: this.ctx.quality || 'high', volume: 80, muted: false };
    this._rng = this.ctx.rng.fork('menu');
    try { const a = this.ctx.modules?.audio; if (a?.getMasterVolume) this.settings.volume = Math.round(a.getMasterVolume() * 100); if (a?.isMuted) this.settings.muted = !!a.isMuted(); } catch (e) { /* optional */ }
  }
  isOpen() { return !!this.el; }
  saves() { return window.__sim?.saves || null; }

  open(kind, opts = {}) {
    if (this.el && this.kind !== 'pause' && this.kind !== 'main' && !opts.push) this._stack.length = 0;
    if (this.el && opts.push) this._stack.push(this.kind);
    this._destroy();
    this.kind = kind; this._openOpts = { ...opts };
    if (kind === 'pause' && !this._pausing) { const c = this.ctx.clock; this._pausing = true; this._wasRunning = !(c.paused || c.speed === 0); c.pause(); this.hud._syncSpeed(); this.hud.action('pauseMenu', true); }
    const modal = this.el = el('div', `sb-modal sb-pe is-${kind === 'main' || kind === 'new' ? 'main' : 'pause'}`);
    modal.addEventListener('click', (e) => { if (e.target === modal && kind !== 'main' && kind !== 'new') this.close(); });
    const menu = el('div', 'sb-menu sb-glass');
    modal.appendChild(menu);
    ({ main: this._main, new: this._new, pause: this._pause, save: (m) => this._slots('save', m), load: (m) => this._slots('load', m), settings: this._settings }[kind] || this._pause).call(this, menu, opts);
    this.hud.root.appendChild(modal);
    this.hud.root.classList.toggle('is-menu', kind === 'main' || kind === 'new');
    this.hud.action('menu', kind);
  }
  back() { const prev = this._stack.pop(); if (prev) this.open(prev); else this.close(); }
  close() {
    if (!this.el) return;
    this._destroy(); this._stack.length = 0; this.kind = null;
    if (this._pausing) { this._pausing = false; if (this._wasRunning) this.ctx.clock.resume(); this.hud._syncSpeed(); this.hud.action('pauseMenu', false); }
    this.hud.action('menu', null);
  }
  _destroy() { this.el?.remove(); this.el = null; this.hud.root.classList.remove('is-menu'); }
  refresh() {
    if (!['main', 'pause', 'save', 'load'].includes(this.kind)) return;
    const stack = this._stack.slice(), opts = { ...this._openOpts };
    this.open(this.kind, opts); this._stack = stack;
  }

  // ---------------------------------------------------------------- pieces
  _head(menu, html) { const h = el('div', 'sb-menu-head', html); menu.appendChild(h); return h; }
  _body(menu) { const b = el('div', 'sb-menu-body'); menu.appendChild(b); return b; }
  _foot(menu) { const f = el('div', 'sb-menu-foot'); menu.appendChild(f); return f; }
  _mbtn(body, icon, label, sub, fn, cls = '') { const b = btn('sb-mbtn ' + cls, icon + `<span>${esc(label)}</span>` + (sub ? `<span class="sb-ms">${esc(sub)}</span>` : '')); b.addEventListener('click', fn); body.appendChild(b); return b; }
  _backBtn(foot, label = 'Back') { const b = btn('sb-action', ICONS.back() + `<span>${label}</span>`); b.addEventListener('click', () => this.back()); foot.appendChild(b); return b; }
  _fullscreen(body) {
    const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
    return this._mbtn(body, ICONS.fullscreen(), active ? 'Exit Fullscreen' : 'Fullscreen', active ? 'Esc' : '', async () => {
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen; if (exit) await exit.call(document);
        } else {
          const enter = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen; if (enter) await enter.call(document.documentElement);
        }
        this.hud.action('fullscreen', !!(document.fullscreenElement || document.webkitFullscreenElement));
        this.open(this.kind || 'pause');
      } catch (error) {
        this.hud.notify({ type: 'warning', title: 'Fullscreen unavailable', body: 'The browser did not allow fullscreen for this window.', ttl: 6 });
      }
    });
  }

  _cloudPromo(body) {
    const cloud = window.__sim?.cloudSaves?.state;
    if (!cloud?.available) return;
    const card = el('div', `sb-cloud-promo${cloud.signedIn ? ' is-on' : ''}`);
    card.innerHTML = `${ICONS.cloud()}<div class="sb-cloud-title">${cloud.signedIn ? 'Your city travels with you' : 'Keep your city with you'}</div><div class="sb-cloud-copy">${cloud.signedIn ? 'Cloud saves are on. Continue from any computer where you sign in.' : 'Sign in to continue on any computer and keep your city safe if this browser is cleared.'}</div>`;
    if (!cloud.signedIn) {
      const signIn = btn('sb-action small primary', '<span>Sign in to GameVolt</span>');
      signIn.addEventListener('click', () => window.GameVolt?.auth?.login?.());
      card.appendChild(signIn);
    }
    body.appendChild(card);
  }

  _main(menu, { boot = false } = {}) {
    this._head(menu, `<div class="sb-brand">NEW <b>DOLLARTON</b></div><div class="sb-sub">City builder · seed ${this.ctx.world.seed}</div>`);
    const body = this._body(menu);
    const slots = this.saves()?.slots?.() || [];
    const latest = this.saves()?.latestSlot?.() || null;
    const resume = this._mbtn(body, ICONS.play(), 'Continue', latest ? `${latest.cityName || SLOT_NAMES[latest.slot] || 'Saved city'} · day ${latest.day ?? '?'}` : 'no saved cities', () => {
      if (!latest) return;
      this.hud.action('load', latest.slot); this.hud.notify({ type: 'info', title: 'Loading latest city', body: latest.cityName || SLOT_NAMES[latest.slot], ttl: 4 }); this.close();
    }, 'primary');
    if (!latest) resume.disabled = true;
    this._mbtn(body, ICONS.plus(), 'New Game', 'seed & map', () => this.open('new', { push: true }));
    const lb = this._mbtn(body, ICONS.load(), 'Load / Manage Cities', slots.length ? `${slots.length} saved ${slots.length === 1 ? 'city' : 'cities'}` : 'no saved cities', () => this.open('load', { push: true }));
    if (!slots.length) lb.disabled = true;
    this._fullscreen(body);
    this._mbtn(body, ICONS.sliders(), 'Settings', `${this.settings.quality} quality`, () => this.open('settings', { push: true }));
    this._cloudPromo(body);
    const foot = this._foot(menu);
    foot.appendChild(el('span', 'sb-version', VERSION_LABEL));
  }
  _new(menu) {
    this._head(menu, `<div class="sb-h1">New Game</div><div class="sb-h2">Choose a map, a seed and a starting budget.</div>`);
    const body = this._body(menu);
    const form = el('div', 'sb-form');
    const name = el('input', 'sb-input'); name.value = this.hud.cityName; name.maxLength = 32; name.placeholder = 'City name';
    const seed = el('input', 'sb-input'); seed.type = 'number'; seed.value = String(this.ctx.world.seed); seed.min = 1; seed.max = 999999999;
    const rnd = btn('sb-action small', ICONS.chevrons(2) + '<span>Random</span>'); rnd.addEventListener('click', () => { seed.value = String(this._rng.int(1, 999999)); });
    const presets = Object.keys(this.ctx.world.terrain?.presets || {});
    const maps = presets.length ? presets : ['procedural'];
    let map = maps[0], money = 150000;
    const existing = new Map((this.saves()?.slots?.() || []).filter(s => /^slot[1-3]$/.test(s.slot)).map(s => [s.slot, s]));
    let saveSlot = ['slot1', 'slot2', 'slot3'].find(id => !existing.has(id)) || 'slot1';
    const seg = (items, cur, onPick) => { const g = el('div', 'sb-seg'); const bs = items.map(([v, l]) => { const b = btn('sb-btn' + (v === cur ? ' is-active' : ''), l); b.addEventListener('click', () => { bs.forEach((x) => x.classList.toggle('is-active', x === b)); onPick(v); }); g.appendChild(b); return b; }); return g; };
    const field = (k, node, help) => { const f = el('div', 'sb-field'); f.appendChild(el('span', 'sb-k', k)); f.appendChild(node); if (help) f.appendChild(el('span', 'sb-h', help)); form.appendChild(f); };
    field('City name', name);
    const seedRow = el('div', 'sb-inrow'); seedRow.append(seed, rnd);
    field('Seed', seedRow, 'Same seed + same actions = identical city.');
    field('Map', seg(maps.map((m) => [m, m.replace(/\b\w/g, (c) => c.toUpperCase())]), map, (v) => { map = v; }));
    field('Budget', seg([[500000, 'Easy ¢500k'], [150000, 'Normal ¢150k'], [50000, 'Hard ¢50k']], money, (v) => { money = v; }));
    const slotChoices = el('div', 'sb-new-slots');
    const choices = ['slot1', 'slot2', 'slot3'].map(id => {
      const saved = existing.get(id), choice = btn(`sb-slot-choice${id === saveSlot ? ' is-active' : ''}`);
      choice.innerHTML = `<b>${esc(SLOT_NAMES[id])}</b><span>${saved ? `${esc(saved.cityName || 'Saved city')} · day ${saved.day ?? '?'}` : 'Empty'}</span>`;
      choice.addEventListener('click', () => { saveSlot = id; choices.forEach(c => c.classList.toggle('is-active', c === choice)); start.dataset.confirm = ''; start.querySelector('span').textContent = existing.has(id) ? 'Replace & start' : 'Start city'; });
      slotChoices.appendChild(choice); return choice;
    });
    field('Save slot', slotChoices, 'Choosing an occupied slot replaces that city after confirmation.');
    body.appendChild(form);
    const foot = this._foot(menu);
    this._backBtn(foot);
    const start = btn('sb-action primary', ICONS.play() + '<span>Start city</span>');
    start.querySelector('span').textContent = existing.has(saveSlot) ? 'Replace & start' : 'Start city';
    start.addEventListener('click', () => {
      if (existing.has(saveSlot) && start.dataset.confirm !== saveSlot) {
        start.dataset.confirm = saveSlot; start.querySelector('span').textContent = 'Confirm replace';
        this.hud.notify({ type: 'warning', title: `${SLOT_NAMES[saveSlot]} already has a city`, body: 'Press Confirm replace to start over in this slot.', ttl: 7 });
        return;
      }
      const s = Math.max(1, Math.floor(+seed.value || 1337));
      const cfg = { name: name.value.trim() || 'New City', seed: s, map, money, slot: saveSlot };
      this.hud.cityName = cfg.name; this.hud.cityEl.textContent = cfg.name;
      this.hud.action('newGame', cfg);
      if (this.ctx.headless) { this.close(); return; }
      const p = new URLSearchParams(window.location.search);
      p.delete('showcase'); p.delete('time'); p.delete('camera'); p.set('mode', 'play'); p.set('seed', String(s)); p.set('map', map); p.set('city', cfg.name); p.set('money', String(money)); p.set('slot', saveSlot); p.set('new', '1');
      window.location.search = p.toString();
    });
    foot.appendChild(start);
  }
  _pause(menu) {
    const c = this.ctx.clock;
    this._head(menu, `<div class="sb-h1">Paused</div><div class="sb-h2">${esc(this.hud.cityName)} · ${esc(this.hud.dateString())} · day ${c.day}</div>`);
    const body = this._body(menu);
    this._mbtn(body, ICONS.play(), 'Resume', 'Esc', () => this.close(), 'primary');
    this._mbtn(body, ICONS.save(), 'Save Game', this.saves()?.activeSlot ? SLOT_NAMES[this.saves().activeSlot] : '', () => this.open('save', { push: true }));
    const slots = this.saves()?.slots?.() || [];
    const lb = this._mbtn(body, ICONS.load(), 'Load / Manage Cities', slots.length ? `${slots.length} saved ${slots.length === 1 ? 'city' : 'cities'}` : 'no saved cities', () => this.open('load', { push: true }));
    if (!slots.length) lb.disabled = true;
    this._fullscreen(body);
    this._mbtn(body, ICONS.sliders(), 'Settings', '', () => this.open('settings', { push: true }));
    this._mbtn(body, ICONS.camera(), 'Photo Mode', 'P', () => { this.close(); this.hud.setPhotoMode(true); });
    this._mbtn(body, ICONS.map(), 'Main Menu', '', () => this.open('main', { push: true }));
    const foot = this._foot(menu);
    foot.appendChild(el('span', 'sb-version', VERSION_LABEL));
  }
  _slots(mode, menu) {
    const saves = this.saves();
    const cloud = window.__sim?.cloudSaves?.state;
    const existing = new Map((saves?.slots?.() || []).map((s) => [s.slot, s]));
    const ids = [...SLOTS, ...[...existing.keys()].filter((k) => !SLOTS.includes(k))];
    const location = cloud?.signedIn ? 'Signed in · cities sync across your devices.' : 'Saved on this device · sign in with GameVolt for cloud sync.';
    this._head(menu, `<div class="sb-h1">${mode === 'save' ? 'Save Game' : 'Load / Manage Cities'}</div><div class="sb-h2">${mode === 'save' ? `Pick a slot. ${location}` : `Open or delete a saved city. ${location}`}</div>`);
    const body = this._body(menu);
    const list = el('div', 'sb-slots');
    for (const id of ids) {
      const s = existing.get(id);
      const row = el('div', 'sb-slot' + (id === 'auto' ? ' is-autosave' : ''));
      row.innerHTML = `<div class="sb-sic">${id === 'auto' ? ICONS.check() : ICONS.save()}</div><div class="sb-st"><div class="sb-s1">${esc(s?.cityName || SLOT_NAMES[id] || id)}</div><div class="sb-s2${s ? '' : ' empty'}">${s ? `${esc(SLOT_NAMES[id] || id)} · day ${s.day ?? '?'} · ${ago(s.savedAt)}` : `${esc(SLOT_NAMES[id] || id)} · empty`}</div></div>`;
      const bb = el('div', 'sb-sb');
      if (mode === 'save' && id !== 'auto') { const b = btn('sb-action small primary', ICONS.save() + '<span>Save</span>'); b.addEventListener('click', () => { this.hud.action('save', id); }); bb.appendChild(b); }
      if (s) {
        const l = btn('sb-action small' + (mode === 'load' ? ' primary' : ''), ICONS.load() + '<span>Load</span>'); l.addEventListener('click', () => { this.hud.action('load', id); this.hud.notify({ type: 'info', title: 'Loading game', body: `${SLOT_NAMES[id] || id}`, ttl: 4 }); this.close(); }); bb.appendChild(l);
        const d = btn('sb-action small danger', ICONS.trash()); d.setAttribute('data-tip', 'Delete city'); let armed = false, reset;
        d.addEventListener('click', async () => {
          if (!armed) { armed = true; d.classList.add('is-confirm'); d.innerHTML = '<span>Delete?</span>'; clearTimeout(reset); reset = setTimeout(() => { armed = false; d.classList.remove('is-confirm'); d.innerHTML = ICONS.trash(); }, 5000); return; }
          clearTimeout(reset); d.disabled = true; this.hud.action('deleteSave', id); const removed = await saves?.remove?.(id); if (removed) this.refresh(); else d.disabled = false;
        }); bb.appendChild(d);
      }
      row.appendChild(bb); list.appendChild(row);
    }
    body.appendChild(list);
    const foot = this._foot(menu);
    this._backBtn(foot);
    const dl = btn('sb-action', ICONS.download() + '<span>Download JSON</span>'); dl.addEventListener('click', () => this.hud.action('download')); foot.appendChild(dl);
    const up = btn('sb-action', ICONS.upload() + '<span>Upload JSON</span>');
    const file = el('input'); file.type = 'file'; file.accept = 'application/json,.json'; file.style.display = 'none';
    file.addEventListener('change', async () => { const f = file.files?.[0]; if (!f) return; this.hud.action('upload', f.name); try { await saves?.upload?.(f); this.hud.notify({ type: 'success', title: 'Save imported', body: f.name, ttl: 5 }); this.close(); } catch (e) { this.hud.notify({ type: 'error', title: 'Import failed', body: String(e?.message || e), ttl: 8 }); } });
    up.addEventListener('click', () => file.click()); up.appendChild(file); foot.appendChild(up);
  }
  _settings(menu) {
    this._head(menu, `<div class="sb-h1">Settings</div><div class="sb-h2">Graphics quality, audio and interface.</div>`);
    const body = this._body(menu);
    const form = el('div', 'sb-form');
    const field = (k, node, help) => { const f = el('div', 'sb-field'); f.appendChild(el('span', 'sb-k', k)); f.appendChild(node); if (help) f.appendChild(el('span', 'sb-h', help)); form.appendChild(f); };
    const toggle = (on, fn) => { const t = btn('sb-toggle' + (on ? ' is-on' : '')); t.addEventListener('click', () => { on = !on; t.classList.toggle('is-on', on); fn(on); }); return t; };
    // quality
    const qs = el('div', 'sb-seg'); const cur = this.settings.quality;
    const applyBtn = btn('sb-action primary sb-hidden', ICONS.check() + '<span>Apply & reload</span>');
    const qbs = QUALITIES.map((q) => { const b = btn('sb-btn' + (q === cur ? ' is-active' : ''), q[0].toUpperCase() + q.slice(1)); b.addEventListener('click', () => { qbs.forEach((x) => x.classList.toggle('is-active', x === b)); this.settings.quality = q; this.hud.action('setQuality', q); applyBtn.classList.toggle('sb-hidden', q === (this.ctx.quality || 'high')); }); qs.appendChild(b); return b; });
    field('Quality', qs, 'Shadow map, cascades, anisotropy, post-processing.');
    applyBtn.addEventListener('click', () => { const p = new URLSearchParams(window.location.search); p.set('quality', this.settings.quality); window.location.search = p.toString(); });
    // audio
    const audio = this.ctx.modules?.audio;
    const vol = el('input', 'sb-range'); vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = String(this.settings.volume);
    vol.addEventListener('input', () => { this.settings.volume = +vol.value; try { audio?.setMasterVolume?.(this.settings.volume / 100); } catch (e) { /* optional */ } this.hud.action('setAudio', 'master', this.settings.volume / 100); });
    field('Master volume', vol);
    field('Mute', toggle(this.settings.muted, (on) => { this.settings.muted = on; try { audio?.mute?.(on); } catch (e) { /* optional */ } this.hud.action('setAudio', 'mute', on); }));
    // interface
    const saves = this.saves();
    field('Autosave', toggle(saves ? saves.autosave !== false : true, (on) => { if (saves) saves.autosave = on; this.hud.action('setAutosave', on); }), 'Saves to the Autosave slot every game day.');
    field('Minimap', toggle(!this.hud.minimap.collapsed, (on) => this.hud.minimap.toggle(on)));
    field('Dev corner', toggle(!this.hud.devBox.classList.contains('sb-hidden'), (on) => this.hud.devBox.classList.toggle('sb-hidden', !on)), 'fps / draw calls / triangles, showcase switcher.');
    body.appendChild(form);
    body.appendChild(el('div', 'sb-section', 'Keys'));
    const keys = el('div', 'sb-keys');
    for (const [k, v] of KEYS) { keys.appendChild(el('span', 'sb-key', esc(k))); keys.appendChild(el('span', '', esc(v))); }
    body.appendChild(keys);
    const foot = this._foot(menu);
    this._backBtn(foot, this._stack.length ? 'Back' : 'Close');
    foot.appendChild(applyBtn);
  }
}
