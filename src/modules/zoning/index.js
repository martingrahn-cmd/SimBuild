// zoning module: owns world.zones — an 8 m cell grid whose paintable band is derived from road
// frontage, lot generation along that frontage, and the CS2-style translucent overlay
// (coloured cells with a grid pattern, an animated region outline and lot outlines).
import { ZoneGrid } from './grid.js';
import { ZoneOverlay } from './overlay.js';
import { CAMERAS, stageRoads, paintZones } from './showcase.js';

const S = {
  ctx: null, grid: null, overlay: null,
  zonableDirty: false, overlayDirty: false, settle: 0,
  always: false, wanted: false, opacity: 0, target: 0,
};

const TOOL_RE = /zone|zoning|district/i;

function refreshBand(reason) {
  if (!S.grid) return;
  const t0 = performance.now();
  const n = S.grid.buildZonable();
  S.grid.pruneCells();
  S.grid.regenLots();
  S.zonableDirty = false;
  S.overlayDirty = true;
  S.ctx.log.info(`zonable band rebuilt (${reason}): ${n} cells, ${S.grid.lots.size} lots, ${(performance.now() - t0).toFixed(0)} ms`);
}

function rebuildOverlay() {
  if (!S.overlay) return;
  S.overlayDirty = false;
  const st = S.overlay.rebuild();
  S.ctx.log.info(`overlay ${st.cells} cells / ${st.lots} lots -> ${st.draws} draws, ${st.tris | 0} tris, ${st.ms.toFixed(0)} ms`);
}

export default {
  name: 'zoning',
  dependencies: ['terrain', 'roads'],
  budget: { drawCalls: 10, triangles: 120_000 },

  async init(ctx) {
    S.ctx = ctx;
    S.grid = new ZoneGrid(ctx);
    S.grid.install();
    S.overlay = new ZoneOverlay(ctx, S.grid);
    S.always = ctx.world.flags.showcase === 'zoning';
    S.wanted = S.always;
    S.opacity = S.target = S.always ? 1 : 0;
    S.overlay.setOpacity(S.opacity);
    S.overlay.setVisible(S.always);

    ctx.events.on('roads:changed', () => { S.zonableDirty = true; S.settle = 0; }, 'zoning');
    ctx.events.on('terrain:changed', () => { S.zonableDirty = true; S.settle = 0; }, 'zoning');
    ctx.events.on('zones:changed', () => { S.overlayDirty = true; S.settle = 0; }, 'zoning');
    ctx.events.on('buildings:changed', () => { S.overlayDirty = true; S.settle = 0; }, 'zoning');
    ctx.events.on('tool:changed', (p) => {
      if (S.always) return;
      const on = !!(p && (TOOL_RE.test(String(p.tool || '')) || p.options?.zone || p.options?.zoning));
      S.wanted = on;
      S.target = on ? 1 : 0;
      if (on) S.overlay.setVisible(true);
    }, 'zoning');
  },

  update(dt, ctx) {
    if (!S.overlay) return;
    // coalesce bursts of edits into one rebuild
    if (S.zonableDirty || S.overlayDirty) {
      S.settle += dt;
      if (S.settle >= 0.06) {
        S.settle = 0;
        if (S.zonableDirty) refreshBand('event');
        if (S.overlayDirty) rebuildOverlay();
      }
    }
    if (!S.overlay.visible) return;
    // fade in/out with the zoning tool
    if (S.opacity !== S.target) {
      const k = Math.min(1, dt * 6);
      S.opacity += (S.target - S.opacity) * k;
      if (Math.abs(S.target - S.opacity) < 0.01) S.opacity = S.target;
      S.overlay.setOpacity(S.opacity);
      if (S.opacity === 0) { S.overlay.setVisible(false); return; }
    }
    S.overlay.update(dt);
    S.overlay.syncFog(ctx.scene);
  },

  dispose() {
    S.overlay?.dispose();
    S.overlay = null; S.grid = null; S.ctx = null;
  },

  api: {
    paint(x, z, radius, type, density) { return S.grid ? S.grid.paint(x, z, radius, type, density) : 0; },
    erase(x, z, radius) { return S.grid ? S.grid.erase(x, z, radius) : 0; },
    /** Batch strokes: fn({circle, rect, erase}) — one lot regeneration and one event. */
    bulk(fn) { return S.grid ? S.grid.bulk(fn) : 0; },
    lotsFor(edgeId) { return S.grid ? S.grid.lotsFor(edgeId) : []; },
    freeLots() { return S.grid ? S.grid.freeLots() : []; },
    lotAt(x, z) { return S.grid ? S.grid.lotAt(x, z) : null; },
    cellAt(x, z) { return S.grid ? S.grid.cellAt(x, z) : null; },
    /** Can this point be zoned at all (i.e. is it inside a road's buildable band)? */
    zonableAt(x, z) { return S.grid ? S.grid.zonable.get(S.grid.keyAt(x, z)) || null : null; },
    /** dev: per-slot analysis for one road edge. */
    debugEdge(id) { return S.grid ? S.grid.debugEdge(id) : null; },
    /** Force a rebuild of the buildable band + lots (after external road/terrain edits). */
    refresh() { refreshBand('api'); rebuildOverlay(); },
    setOverlayVisible(v) {
      if (!S.overlay) return;
      S.wanted = !!v; S.target = v ? 1 : 0;
      if (v) S.overlay.setVisible(true);
    },
    overlayVisible() { return !!S.overlay?.visible; },
    stats() { return S.grid ? { ...S.grid.stats(), overlay: S.overlay?.stats } : null; },
    serialize() {
      if (!S.grid) return null;
      const cells = [];
      for (const [k, c] of S.grid.cells) cells.push(k + '|' + c.type[0] + (c.density === 'high' ? 'h' : 'l'));
      return { cells };
    },
    deserialize(data) {
      if (!S.grid || !data) return;
      const T = { r: 'residential', c: 'commercial', i: 'industrial', o: 'office' };
      S.grid.cells.clear();
      refreshBand('deserialize');
      S.grid.bulk(({ rect }) => {
        for (const s of data.cells || []) {
          const [key, code] = s.split('|');
          const ci = key.indexOf(',');
          const ix = +key.slice(0, ci), iz = +key.slice(ci + 1);
          const cx = S.grid.ctr(ix), cz = S.grid.ctr(iz);
          rect(cx, cz, cx, cz, T[code[0]], code[1] === 'h' ? 'high' : 'low');
        }
      });
      rebuildOverlay();
    },
  },

  showcase: {
    description: 'Street grid with an avenue, a diagonal and a curved street; all four zone types painted in both densities on both sides, with lots, region outlines and the empty zonable band.',
    cameras: CAMERAS,
    async setup(ctx) {
      stageRoads(ctx);
      ctx.modules.roads?.rebuild?.();
      refreshBand('showcase');
      paintZones(ctx, S.grid);
      rebuildOverlay();
      S.always = true; S.wanted = true; S.target = 1; S.opacity = 1;
      S.overlay.setOpacity(1);
      S.overlay.setVisible(true);
      const st = S.grid.stats();
      ctx.log.info(`showcase: ${st.cells} zoned cells of ${st.zonable} zonable, ${st.lots} lots`);
    },
  },
};
