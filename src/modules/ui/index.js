// ui — CS2-style game HUD in DOM (inside #ui): bottom toolbar with category sub-panels (services from
// world.services.kinds, milestone-gated), status strip (clock / speed, weather, population, happiness,
// money), RCI demand, info panel on selection, transit line panel, infoview selector + legend, top-right
// notifications / journal / statistics, milestone toast, canvas minimap, main / pause / save / load /
// settings menus, photo mode (P), dev corner (?dev=1 or backtick).
// In the real game the UI renders 0 draw calls; the declared budget covers the showcase backdrop only.
import { Hud } from './hud.js';
import { setupScene, stageHud, updateScene } from './showcase.js';

const S = { hud: null, staged: false, unsub: [] };
const param = (k) => new URLSearchParams(window.location.search).get(k);

export default {
  name: 'ui',
  dependencies: [],
  budget: { drawCalls: 20, triangles: 500_000 },

  async init(ctx) {
    if (param('nohud') === '1') { ctx.log.info('HUD disabled by ?nohud=1 (profiling)'); return; }
    const hud = S.hud = new Hud(ctx, { cityName: param('city') || 'New Dollarton', dev: param('dev') === '1' });
    const ev = ctx.events, own = 'ui';
    S.unsub.push(
      ev.on('tool:changed', (p) => hud.onToolChanged(p), own),
      ev.on('selection:changed', (p) => hud.onSelection(p), own),
      ev.on('sim:demand', (p) => hud.refreshDemand(p), own),
      ev.on('sim:milestone', (p) => hud.onMilestone(p), own),
      ev.on('sim:loan', (p) => hud.notify({ type: 'money', title: p?.type === 'loan_paid' ? 'Loan repaid' : 'Loan taken', body: p?.amount ? `¢${Math.round(p.amount).toLocaleString('en-US')}` : '', ttl: 6 }), own),
      ev.on('weather:changed', () => { hud._wKind = -1; }, own),
      ev.on('transit:changed', () => hud.onTransitChanged(), own),
      ev.on('save:saved', (p) => { hud.menus.refresh(); if (p?.slot === 'auto') hud.notify({ type: 'info', title: 'Autosaved', body: `Day ${ctx.clock.day} · ${hud.dateString()}`, ttl: 4 }); }, own),
      ev.on('save:loaded', () => { hud.notify({ type: 'success', title: 'Game loaded', body: `${hud.cityName} · day ${ctx.clock.day}`, ttl: 6 }); hud.hideInfo(); hud.minimap.setSample(null); }, own),
      ev.on('module:error', (p) => {
        if (p?.module === 'ui') return;
        hud.notify({ type: 'error', title: `Module "${p?.module}" ${p?.phase || ''} error`, body: String(p?.error?.message || p?.error || 'unknown error').slice(0, 140), ttl: 12 });
      }, own),
      ev.on('time:day', ({ day }) => hud.notify({ type: 'info', title: 'New month', body: `${hud.dateString()} begins. Monthly budget applied.`, ttl: 6 }), own),
      ev.on('app:ready', () => {
        if (S.staged || ctx.headless) return;
        const showcase = ctx.world.flags.showcase;
        if (!showcase || showcase === 'democity' || showcase === 'all') hud.menus.open('main', { boot: true });
        hud.notify({ type: 'info', title: `Welcome to ${hud.cityName}`, body: 'Use the toolbar to build roads and zone land. Right-drag to orbit, wheel to zoom, Esc for the menu.', ttl: 12 });
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
    openMenu: (kind) => S.hud?.menus.open(kind),
    closeMenu: () => S.hud?.menus.close(),
    setPhotoMode: (on) => S.hud?.setPhotoMode(on),
    setInfoview: (name) => S.hud?.setInfoview(name),
    showLines: (id) => S.hud?.showLines(id),
    toast: (t) => S.hud?.toast(t),
    serialize() { return { cityName: S.hud?.cityName || 'New Dollarton', infoview: S.hud?.infoview || null, minimap: !S.hud?.minimap.collapsed }; },
    deserialize(d) { if (!S.hud || !d) return; if (d.cityName) { S.hud.cityName = d.cityName; S.hud.cityEl.textContent = d.cityName; } if (d.minimap === false) S.hud.minimap.toggle(false); },
    get hud() { return S.hud; },
  },

  showcase: {
    description: 'All HUD panels open with sample data (road panel, selected building, transit lines, statistics, legend, milestone toast, notifications, minimap) over a lit block grid',
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
