// ui — CS2-style game HUD in DOM (inside #ui): bottom toolbar with category sub-panels, status strip
// (clock / speed, weather, population, happiness, money), RCI demand bars, info panel on selection,
// top-right notifications, dev corner (fps / draws / tris + showcase / camera switchers).
// In the real game the UI renders 0 draw calls; the declared budget covers the showcase backdrop only.
import { Hud } from './hud.js';
import { setupScene, stageHud, updateScene } from './showcase.js';

const S = { hud: null, staged: false, unsub: [] };

export default {
  name: 'ui',
  dependencies: [],
  budget: { drawCalls: 16, triangles: 400_000 },

  async init(ctx) {
    if (/[?&]nohud=1/.test(window.location.search)) { ctx.log.info('HUD disabled by ?nohud=1 (profiling)'); return; }
    const hud = S.hud = new Hud(ctx, { cityName: 'New Dollarton', dev: true });
    const ev = ctx.events, own = 'ui';
    S.unsub.push(
      ev.on('tool:changed', (p) => hud.onToolChanged(p), own),
      ev.on('selection:changed', (p) => hud.onSelection(p), own),
      ev.on('sim:demand', (p) => hud.refreshDemand(p), own),
      ev.on('weather:changed', () => { hud._wKind = -1; }, own),
      ev.on('module:error', (p) => {
        if (p?.module === 'ui') return;
        hud.notify({ type: 'error', title: `Module "${p?.module}" ${p?.phase || ''} error`, body: String(p?.error?.message || p?.error || 'unknown error').slice(0, 140), ttl: 12 });
      }, own),
      ev.on('time:day', ({ day }) => hud.notify({ type: 'info', title: 'New month', body: `Day ${day} begins. Monthly budget applied.`, ttl: 6 }), own),
      ev.on('app:ready', () => {
        if (!S.staged && !ctx.headless) hud.notify({ type: 'info', title: 'Welcome to New Dollarton', body: 'Use the toolbar to build roads and zone land. Right-drag to orbit, wheel to zoom.', ttl: 10 });
      }, own),
    );
  },

  update(dt, ctx) {
    S.hud?.update(dt);
    if (S.staged) updateScene(ctx);
  },

  dispose(ctx) {
    for (const u of S.unsub) { try { u(); } catch (e) { /* ignore */ } }
    S.unsub.length = 0;
    S.hud?.dispose(); S.hud = null;
    for (const c of [...ctx.group.children]) { ctx.group.remove(c); c.geometry?.dispose?.(); c.material?.dispose?.(); }
    S.staged = false;
  },

  api: {
    notify: (n) => S.hud?.notify(n),
    showInfo: (sel) => S.hud?.showInfo(sel),
    hideInfo: () => S.hud?.hideInfo(),
    setCategory: (id) => S.hud?.setCategory(id),
    setSource: (src) => S.hud?.setSource(src),
    setCityName: (name) => { if (S.hud) { S.hud.cityName = name; S.hud.cityEl.textContent = name; } },
    get hud() { return S.hud; },
  },

  showcase: {
    description: 'All HUD panels open with sample data (road panel, selected building, notifications) over a small lit block grid',
    cameras: {
      ui: { yaw: 0.78, pitch: 0.34, distance: 300, target: [-10, 14, -30] },
    },
    async setup(ctx) {
      await setupScene(ctx);
      S.staged = true;
      updateScene(ctx);
      if (S.hud) stageHud(S.hud, ctx);
    },
  },
};
