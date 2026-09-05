// audio — procedural WebAudio ambience + interface sounds. Every sound is synthesised in pure JS from
// ctx.rng (filtered-noise wind and leaves, traffic hum with doppler passes, bird phrases, night crickets,
// rain, thunder, UI feedback) and mixed by time of day, camera distance and weather. The AudioContext is
// created only after a user gesture and NEVER when ctx.headless is true. Listens to audio:play
// {sound, x, z, volume}, ui:action and world-change events. api: setMasterVolume, mute, play, enable…
import { CATALOGUE, renderOne, SR } from './synth.js';
import { Mixer } from './mixer.js';
import { Panel } from './panel.js';
import { setupScene, updateScene, disposeScene, CAMERAS } from './scene.js';

const STORAGE_KEY = 'simbuild.audio';
const LAYER_NAMES = ['wind', 'leaves', 'traffic', 'crickets', 'rain'];
const UI_MAP = { closeInfo: 'ui_close', dismissNotification: 'ui_close', save: 'ui_confirm', load: 'ui_open', infoview: 'ui_open', download: 'ui_confirm', category: 'ui_open', tab: 'ui_click', pause: 'ui_click', resume: 'ui_click' };

const S = {
  ctx: null, sounds: new Map(), mixer: null, panel: null, staged: false, live: false, headless: true,
  master: 0.8, muted: false, bus: { ambient: 1, world: 1, ui: 1 },
  hint: { traffic: null },
  mix: {
    wind: 0, leaves: 0, traffic: 0, crickets: 0, rain: 0, birdRate: 0,
    cutoff: { wind: 8000, leaves: 8000, traffic: 3000, crickets: 8000, rain: 7000 },
    factors: { hour: 12, night: 0, day: 1, dawnChorus: 0, dist: 500, near: 0, rain: 0, windSpeed: 2, traffic: 0, temperature: 18 },
  },
  target: { wind: 0, leaves: 0, traffic: 0, crickets: 0, rain: 0 },
  timers: { bird: 0.25, owl: 1.5, thunder: 3, car: 0.8 },
  sched: null, applyAcc: 0, zoneAcc: 9,
  events: [], eventPool: [], maxEvents: 4,
  unsub: [], gesture: null, enabling: null, stats: { renderMs: 0, sampleRate: SR },
};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const gauss = (x, mu, sigma) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2);

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ master: S.master, muted: S.muted, bus: S.bus })); } catch (e) { /* private mode */ }
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return;
    const d = JSON.parse(raw);
    if (typeof d.master === 'number') S.master = clamp01(d.master);
    if (typeof d.muted === 'boolean') S.muted = d.muted;
    if (d.bus) for (const k of Object.keys(S.bus)) if (typeof d.bus[k] === 'number') S.bus[k] = clamp01(d.bus[k]);
  } catch (e) { /* ignore */ }
}

/** Record a scheduler/world event for the panel (fixed-size ring, objects reused). */
function logEvent(name, volume) {
  const e = S.events.length >= S.maxEvents ? S.events.shift() : (S.eventPool.pop() || { name: '', hour: 0, volume: 1 });
  e.name = name; e.hour = S.ctx.clock.hour; e.volume = volume;
  S.events.push(e);
}

/** Positional trigger relative to the camera target; returns whether the mixer played it. */
function trigger(name, x, z, volume = 1, rate = 1) {
  if (!S.sounds.has(name)) { S.ctx.log.warn(`unknown sound "${name}"`); return false; }
  let pan = 0, vol = volume;
  if (typeof x === 'number' && typeof z === 'number') {
    const cam = S.ctx.camera;
    const dx = x - cam.target.x, dz = z - cam.target.z;
    const d = Math.hypot(dx, dz);
    const radius = 0.6 * cam.distance + 40;
    vol *= 1 / (1 + (d / radius) * (d / radius));
    const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);            // camera right vector on the ground plane
    pan = Math.max(-1, Math.min(1, (dx * rx + dz * rz) / (cam.distance * 0.8 + 40))) * 0.8;
  }
  if (vol < 0.01) return false;
  logEvent(name, vol);
  S.panel?.flash(name);
  return S.mixer ? S.mixer.play(name, { volume: vol, pan, rate }) : false;
}

/** Ambient targets from the clock, camera and weather. Allocation-free. */
function computeMix(ctx) {
  const f = S.mix.factors, w = ctx.world.weather, cam = ctx.camera;
  const hour = ctx.clock.hour, el = ctx.clock.sunElevation(hour);
  f.hour = hour;
  f.night = 1 - smooth(-0.12, 0.05, el);
  f.day = smooth(-0.05, 0.16, el);
  f.dawnChorus = gauss(hour, 6.6, 1.3) + 0.55 * gauss(hour, 18.2, 1.2);
  f.dist = cam.distance;
  f.near = 1 - smooth(70, 700, cam.distance);
  f.rain = clamp01(w.rain || 0);
  f.windSpeed = w.wind?.speed || 0;
  f.temperature = w.temperature ?? 18;
  const tr = S.hint.traffic;
  const veh = ctx.world.traffic?.vehicles?.size || 0, bld = ctx.world.buildings?.items?.size || 0;
  f.traffic = typeof tr === 'number' ? clamp01(tr) : veh > 0 ? clamp01(veh / 150) : clamp01(bld / 400);
  const windK = clamp01(f.windSpeed / 9), warm = smooth(5, 14, f.temperature);
  const t = S.target;
  t.wind = (0.2 + 0.6 * windK) * (0.55 + 0.45 * (1 - f.near)) * (1 - 0.3 * f.rain);
  t.leaves = windK * f.near * 0.95 * (1 - 0.5 * f.rain);
  t.traffic = f.traffic * (1 - 0.6 * f.night) * (0.55 + 0.45 * f.near);
  t.crickets = f.night * warm * (1 - f.rain) * (0.3 + 0.7 * f.near);
  t.rain = f.rain * (0.6 + 0.4 * f.near);
  const birds = f.day * (1 - 0.85 * f.rain) * (0.25 + 0.75 * f.near) * (1 + 1.3 * f.dawnChorus);
  S.mix.birdRate = birds * 0.55;
  const c = S.mix.cutoff;
  c.rain = 1400 + 5600 * f.near; c.traffic = 500 + 2800 * f.near; c.wind = 8000; c.leaves = 8000; c.crickets = 3000 + 5000 * f.near;
}

function scheduler(dt, ctx) {
  const f = S.mix.factors, T = S.timers, rng = S.sched;
  const next = (rate) => (rate <= 1e-4 ? 1 : Math.min(40, Math.max(0.25, -Math.log(1 - rng.float() * 0.999) / rate)));
  const around = (r) => { const a = rng.float() * Math.PI * 2, d = 10 + rng.float() * r; return [ctx.camera.target.x + Math.cos(a) * d, ctx.camera.target.z + Math.sin(a) * d]; };
  T.bird -= dt;
  if (T.bird <= 0) {
    const rate = S.mix.birdRate;
    if (rate > 1e-3) {
      const name = rng.weighted([['bird_robin', 0.5], ['bird_finch', 0.38], ['bird_crow', 0.12]]);
      const [x, z] = around(60 + 0.4 * f.dist);
      trigger(name, x, z, 0.55 + rng.float() * 0.45, 0.94 + rng.float() * 0.12);
    }
    T.bird = next(rate);
  }
  T.owl -= dt;
  if (T.owl <= 0) {
    const rate = f.night * (1 - f.rain) * (0.15 + 0.85 * f.near) * 0.05;
    if (rate > 1e-3) { const [x, z] = around(90); trigger('owl', x, z, 0.5 + rng.float() * 0.4, 0.96 + rng.float() * 0.08); }
    T.owl = next(rate);
  }
  T.thunder -= dt;
  if (T.thunder <= 0) {
    const rate = smooth(0.45, 0.8, f.rain) * 0.035;
    if (rate > 1e-3) trigger('thunder', undefined, undefined, 0.5 + rng.float() * 0.5, 0.85 + rng.float() * 0.3);
    T.thunder = next(rate);
  }
  T.car -= dt;
  if (T.car <= 0) {
    const rate = f.near * f.traffic * (1 - 0.6 * f.night) * 0.3;
    if (rate > 1e-3) { const [x, z] = around(40); trigger('car_pass', x, z, 0.4 + rng.float() * 0.5, 0.9 + rng.float() * 0.2); }
    T.car = next(rate);
  }
}

function enable() {
  if (S.headless) { S.ctx.log.info('audio disabled: headless'); return Promise.resolve(false); }
  if (S.mixer?.enabled && S.mixer.state === 'running') return Promise.resolve(true);
  if (S.enabling) return S.enabling;
  S.enabling = (async () => {
    if (!S.mixer) S.mixer = new Mixer(S.sounds, S.ctx.log);
    S.mixer.masterLevel = S.master; S.mixer.muted = S.muted;
    for (const k of Object.keys(S.bus)) S.mixer.busLevel[k] = S.bus[k];
    const ok = await S.mixer.enable();
    if (ok) {
      S.ctx.log.info(`audio live: ${S.mixer.sampleRate} Hz, ${S.sounds.size} sounds`);
      if (S.gesture) { for (const [ev, fn] of S.gesture) window.removeEventListener(ev, fn); S.gesture = null; }
      for (const n of LAYER_NAMES) S.mixer.setLayer(n, S.mix[n], S.mix.cutoff[n]);
    }
    S.panel?.refresh(true);
    S.enabling = null;
    return ok;
  })();
  return S.enabling;
}

export default {
  name: 'audio',
  dependencies: [],
  budget: { drawCalls: 60, triangles: 900_000 },

  async init(ctx) {
    S.ctx = ctx; S.headless = !!ctx.headless;
    S.sched = ctx.rng.fork('scheduler');
    loadSettings();
    // synthesis: one catalogue entry per macrotask so boot stays responsive
    const t0 = performance.now();
    for (const e of CATALOGUE) {
      S.sounds.set(e.name, renderOne(e, ctx.rng, ctx.log));
      await new Promise((r) => setTimeout(r, 0));
    }
    S.stats.renderMs = performance.now() - t0;
    ctx.log.info(`synthesised ${S.sounds.size} sounds in ${Math.round(S.stats.renderMs)} ms (${SR} Hz)`);
    computeMix(ctx);
    for (const n of LAYER_NAMES) S.mix[n] = S.target[n];

    const ev = ctx.events, own = 'audio';
    const ready = () => S.live;
    S.unsub.push(
      ev.on('app:ready', () => { S.live = true; }, own),
      ev.on('audio:play', (p) => { if (p?.sound) trigger(p.sound, p.x, p.z, p.volume ?? 1, p.rate ?? 1); }, own),
      ev.on('ui:action', (p) => { if (!ready() || !p?.action) return; trigger(UI_MAP[p.action] || 'ui_click'); }, own),
      ev.on('selection:changed', (p) => { if (ready() && p?.kind) trigger('ui_hover'); }, own),
      ev.on('buildings:changed', (p) => {
        if (!ready()) return;
        const added = p?.added?.length || 0, removed = p?.removed?.length || 0;
        if (added) { const b = ctx.world.buildings.items.get(p.added[0]); trigger('build_place', b?.x, b?.z, added > 8 ? 0.5 : 0.9); }
        if (removed) trigger('bulldoze', undefined, undefined, removed > 8 ? 0.5 : 0.9);
      }, own),
      ev.on('services:changed', (p) => { if (ready() && p?.added?.length) { const s = ctx.world.services.items.get(p.added[0]); trigger('build_place', s?.x, s?.z, 0.9); } }, own),
      ev.on('roads:changed', (p) => { if (!ready()) return; if (p?.added?.length) trigger('road_place', undefined, undefined, p.added.length > 8 ? 0.5 : 0.9); else if (p?.removed?.length) trigger('bulldoze', undefined, undefined, 0.6); }, own),
      ev.on('zones:changed', (p) => { if (ready() && p?.cells?.length && S.zoneAcc > 0.18) { S.zoneAcc = 0; trigger('zone_paint'); } }, own),
      ev.on('sim:milestone', () => { if (ready()) trigger('milestone'); }, own),
      ev.on('module:error', (p) => { if (ready() && p?.module !== 'audio') trigger('ui_error', undefined, undefined, 0.7); }, own),
    );

    if (!S.headless) {
      // gesture gate: the first pointer/key interaction anywhere starts the context
      const fn = () => { enable(); };
      S.gesture = [['pointerdown', fn], ['keydown', fn], ['touchend', fn]];
      for (const [name, f] of S.gesture) window.addEventListener(name, f, { passive: true });
      const vis = () => { if (!S.mixer) return; if (document.hidden) S.mixer.suspend(); else S.mixer.resume(); };
      document.addEventListener('visibilitychange', vis);
      S.unsub.push(() => document.removeEventListener('visibilitychange', vis));
    } else {
      ctx.log.info('headless: AudioContext will not be created');
    }
  },

  update(dt, ctx) {
    computeMix(ctx);
    S.zoneAcc += dt;
    // smooth the meters (the mixer ramps on its own, this keeps the panel and getMix() continuous)
    const k = Math.min(1, dt * 4);
    for (const n of LAYER_NAMES) S.mix[n] += (S.target[n] - S.mix[n]) * k;
    S.applyAcc += dt;
    if (S.mixer?.enabled && S.applyAcc > 0.1) {
      S.applyAcc = 0;
      for (const n of LAYER_NAMES) S.mixer.setLayer(n, S.mix[n], S.mix.cutoff[n]);
    }
    scheduler(dt, ctx);
    if (S.staged) updateScene(ctx, dt);
    S.panel?.update(dt);
  },

  dispose(ctx) {
    for (const u of S.unsub) { try { u(); } catch (e) { /* ignore */ } }
    S.unsub.length = 0;
    if (S.gesture) { for (const [ev, fn] of S.gesture) window.removeEventListener(ev, fn); S.gesture = null; }
    S.panel?.dispose(); S.panel = null;
    S.mixer?.dispose(); S.mixer = null;
    if (S.staged) disposeScene(ctx);
    S.staged = false; S.live = false;
  },

  api: {
    /** 0..1 master volume (perceptual curve applied in the mixer). */
    setMasterVolume(v) { S.master = clamp01(+v || 0); S.mixer?.setMasterVolume(S.master); saveSettings(); return S.master; },
    getMasterVolume() { return S.master; },
    /** mute(true|false); mute() mutes. Returns the muted state. */
    mute(on = true) { S.muted = !!on; S.mixer?.setMuted(S.muted); saveSettings(); return S.muted; },
    unmute() { return this.mute(false); },
    toggleMute() { return this.mute(!S.muted); },
    isMuted() { return S.muted; },
    /** play(name, {x, z, volume, rate}) — positional when x/z are given. Returns true if audible output was scheduled. */
    play(name, opts) { return trigger(name, opts?.x, opts?.z, opts?.volume ?? 1, opts?.rate ?? 1); },
    /** Start the AudioContext (needs a user gesture in browsers). Resolves false when headless. */
    enable() { return enable(); },
    isEnabled() { return !!S.mixer?.enabled && S.mixer.state === 'running'; },
    state() { return S.headless ? 'headless' : S.mixer ? S.mixer.state : 'idle'; },
    sampleRate() { return S.mixer?.sampleRate || 0; },
    setBusVolume(bus, v) { if (bus in S.bus) { S.bus[bus] = clamp01(+v || 0); S.mixer?.setBusVolume(bus, S.bus[bus]); saveSettings(); } return S.bus[bus]; },
    getBusVolume(bus) { return S.bus[bus]; },
    /** Names + metadata of every sound. */
    sounds() { return [...S.sounds.values()].map((s) => ({ name: s.name, group: s.group, label: s.label, desc: s.desc, loop: s.loop, seconds: s.seconds, channels: s.channels.length, sampleRate: s.sampleRate })); },
    /** Raw synthesised buffer: {channels:[Float32Array…], sampleRate, loop, gain, seconds}. */
    getBuffer(name) { return S.sounds.get(name) || null; },
    /** Live ambient mix (read-only object, updated every frame): layer levels, birdRate, cutoffs, factors. */
    getMix() { return S.mix; },
    /** Override the traffic density estimate (0..1) or null to derive it from world.traffic / buildings. */
    setAmbienceHint(h) { if (h && 'traffic' in h) S.hint.traffic = h.traffic === null ? null : clamp01(+h.traffic || 0); },
    serialize() { return { master: S.master, muted: S.muted, bus: { ...S.bus } }; },
    deserialize(d) { if (!d) return; if (typeof d.master === 'number') this.setMasterVolume(d.master); if (typeof d.muted === 'boolean') this.mute(d.muted); if (d.bus) for (const k of Object.keys(S.bus)) if (typeof d.bus[k] === 'number') this.setBusVolume(k, d.bus[k]); },
  },

  showcase: {
    description: 'Soundscape park: every procedural sound with its waveform and play button, live time/zoom/weather mix meters, enable-audio gate; PBR lawn, T-junction street, groves, lamps and a bandstand as the backdrop',
    cameras: CAMERAS,
    async setup(ctx) {
      S.hint.traffic = 0.45;
      const info = await setupScene(ctx);
      S.staged = true;
      updateScene(ctx, 0);
      S.panel = new Panel(ctx, {
        sounds: S.sounds, api: ctx.modules.audio, stats: S.stats,
        getMix: () => S.mix, getEvents: () => S.events,
      });
      S.panel.mount();
      ctx.log.info(`showcase staged: ${info.trees} trees, ${info.lamps} lamps`);
    },
  },
};
