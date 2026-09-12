// zoning module: owns world.zones — an 8 m cell grid whose paintable band is derived from road
// frontage, lot generation along that frontage, and the CS2-style translucent overlay.
import { ZoneGrid } from './grid.js';
import { ZoneOverlay } from './overlay.js';
import { OVERLAY } from './palette.js';
import { CAMERAS, stageRoads, paintZones } from './showcase.js';

const FADE_SECONDS = 0.22;      // item 16: 10 % -> 90 % of a linear ramp is 0.176 s of wall time
const TOOL_RE = /zone|zoning|district/i;

const S = {
  ctx: null, grid: null, overlay: null,
  zonableDirty: false, overlayDirty: false, settle: 0,
  always: false, opacity: 0, target: 0, lastT: 0,
  probes: [], blocks: [], empties: [], bare: null, staging: null, cropDist: null,
  rebuildMs: 0,
};

function refreshBand(reason, emit = false) {
  if (!S.grid) return null;
  const t0 = performance.now();
  const n = S.grid.buildZonable();
  S.grid.pruneCells();
  const lots = S.grid.regenLots();
  S.zonableDirty = false;
  S.overlayDirty = true;
  S.rebuildMs = performance.now() - t0;
  S.ctx.log.info(`zonable band rebuilt (${reason}): ${n} cells, ${S.grid.lots.size} lots, ${S.rebuildMs.toFixed(0)} ms`);
  if (emit && (lots.added.length || lots.removed.length)) {
    S.grid.Z.version++;
    S.ctx.events.emit('zones:changed', { cells: [], lots });
    // The zones journal can synchronously retire or create Buildings. Complete dependent
    // simulation/Transit derivation at the same owner boundary so normal settlement and history
    // restoration converge on one reproducible state.
    S.ctx.modules.simulation?.reconcileWorld?.();
  }
  return lots;
}

function rebuildOverlay() {
  if (!S.overlay) return;
  S.overlayDirty = false;
  const t0 = performance.now();
  const st = S.overlay.rebuild();
  S.rebuildMs += performance.now() - t0;
  S.ctx.log.info(`overlay ${st.cells} cells / ${st.lots} lots -> ${st.draws} draws, ${st.tris | 0} tris, ${st.ms.toFixed(0)} ms (rebuild total ${S.rebuildMs.toFixed(0)} ms)`);
}

/** Distance from (x,z) to the nearest water or over-steep ground, capped at `cap`. */
function exclusionDistance(T, x, z, cap = 40) {
  for (let r = 8; r <= cap; r += 8) {
    const steps = Math.max(8, Math.round(r));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (T.isWater(px, pz) || T.getSlope(px, pz) > 0.42) return r;
    }
  }
  return cap;
}

/**
 * One class-representative point per (type, density): a painted cell inside a block of that class,
 * on flat inland ground at least 24 m from any water or slope exclusion, as close to the world
 * origin as possible so all eight are on screen together (zoning.md §8.10).
 */
function pickProbePoints() {
  const g = S.grid, T = S.ctx.world.terrain;
  if (!g) return [];
  const best = new Map();
  for (const c of g.cells.values()) {
    const k = c.type + '|' + c.density;
    const highTargets = { residential: [-280, -40], commercial: [-200, -40], industrial: [-140, -36], office: [-52, -28] };
    const target = c.density === 'high' ? highTargets[c.type] : [0, 0];
    const d = Math.hypot(c.x - target[0], c.z - target[1]);
    const cur = best.get(k);
    if (cur && cur.d <= d) continue;
    // The 40x40 px patch item 2 samples spans about 9 m at the `zones` camera, so it stays inside
    // this cell and its immediate neighbours; requiring those five to be the same class keeps the
    // patch pure fill without demanding a whole 3x3 block that a back-garden core may have eaten.
    let pure = true;
    for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = g.cells.get(g.keyAt(c.x + i * 8, c.z + j * 8));
      if (!n || n.type !== c.type || n.density !== c.density) { pure = false; break; }
    }
    if (!pure) continue;
    if (exclusionDistance(T, c.x, c.z) < 24) continue;
    // flat: 24 m of ground around the point must not vary by more than 3 m
    let mn = Infinity, mx = -Infinity;
    for (let j = -12; j <= 12; j += 12) for (let i = -12; i <= 12; i += 12) {
      const h = T.getHeight(c.x + i, c.z + j);
      if (h < mn) mn = h; if (h > mx) mx = h;
    }
    if (mx - mn > 4.5) continue;
    best.set(k, { type: c.type, density: c.density, x: c.x, z: c.z, d });
  }
  const out = [];
  for (const t of S.ctx.world.zones.types) for (const dn of S.ctx.world.zones.densities) {
    const b = best.get(t + '|' + dn);
    if (b) out.push({ type: b.type, density: b.density, x: b.x, z: b.z });
  }
  return out;
}

function rectAround(project, w, h, x, z, size, T) {
  const p = project(x, T ? T.getHeight(x, z) : 0, z);
  if (!p || p[2] > 1) return null;
  const half = size >> 1;
  const cx = p[0], cy = p[1];
  if (cx - half < 0 || cy - half < 0 || cx + half > w || cy + half > h) return null;
  return [cx - half, cy - half, size, size];
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
    S.opacity = S.target = S.always ? 1 : 0;
    S.overlay.setOpacity(S.opacity);
    S.overlay.setVisible(false);

    ctx.events.on('roads:changed', () => { S.zonableDirty = true; S.settle = 0; }, 'zoning');
    ctx.events.on('terrain:changed', () => { S.zonableDirty = true; S.settle = 0; }, 'zoning');
    ctx.events.on('zones:changed', () => { S.overlayDirty = true; S.settle = 0; }, 'zoning');
    ctx.events.on('buildings:changed', () => { S.overlayDirty = true; S.settle = 0; }, 'zoning');
    ctx.events.on('tool:changed', (p) => {
      if (S.always) return;
      // Roads expose the exact *current* buildable frontage after each committed segment. This is
      // the same owner-built zonable map that painting and lot generation consume, so the pale
      // roadside cells cannot promise land that the zoning rules would later reject. A draft road
      // is deliberately not guessed here; the marker updates as soon as the Roads owner commits it.
      const on = !!(p && (p.tool === 'road' || TOOL_RE.test(String(p.tool || '')) || p.options?.zone || p.options?.zoning));
      S.target = on ? 1 : 0;
      // Show the group even with nothing painted yet: the meshes are empty, so it still costs zero
      // draw calls, and the opacity ramp the tool drives is observable from the first frame.
      if (on) S.overlay.setVisible(true);
    }, 'zoning');
  },

  update(dt, ctx) {
    if (!S.overlay) return;
    // coalesce bursts of edits into at most one rebuild per 60 ms (failure mode 14)
    if (S.zonableDirty || S.overlayDirty) {
      S.settle += dt;
      if (S.settle >= 0.06) {
        S.settle = 0; S.rebuildMs = 0;
        // A road or terrain mutation can replace real lots even when no zone brush was used.
        // Publish that owner journal once the deferred rebuild settles so Buildings and every
        // other dependent owner can retire references to removed lot IDs.
        if (S.zonableDirty) refreshBand('event', true);
        if (S.overlayDirty) rebuildOverlay();
      }
    }
    if (!S.overlay.visible) return;
    if (S.opacity !== S.target) {
      // Wall time, not the frame dt: the loop clamps dt to 0.1 s, so on this software-GL box a
      // dt-driven ramp would take four times as long in real seconds as it claims to.
      const now = performance.now() * 0.001;
      const real = S.lastT ? Math.min(FADE_SECONDS, now - S.lastT) : dt;
      const step = real / FADE_SECONDS;
      S.opacity = S.target > S.opacity ? Math.min(S.target, S.opacity + step) : Math.max(S.target, S.opacity - step);
      S.overlay.setOpacity(S.opacity);
      if (S.opacity === 0) { S.overlay.setVisible(false); S.lastT = 0; return; }
    }
    S.lastT = performance.now() * 0.001;
    S.overlay.update(dt);
    S.overlay.syncFog(ctx.scene);
  },

  dispose() {
    S.overlay?.dispose();
    S.overlay = null; S.grid = null; S.ctx = null;
    S.probes = []; S.blocks = []; S.empties = []; S.bare = null; S.staging = null; S.lastT = 0;
  },

  api: {
    paint(x, z, radius, type, density) { return S.grid ? S.grid.paint(x, z, radius, type, density) : 0; },
    erase(x, z, radius) { return S.grid ? S.grid.erase(x, z, radius) : 0; },
    /** Batch strokes: fn({circle, rect, erase}) — one lot regeneration, one zones:changed. */
    bulk(fn) { return S.grid ? S.grid.bulk(fn) : 0; },
    lotsFor(edgeId) { return S.grid ? S.grid.lotsFor(edgeId) : []; },
    freeLots() { return S.grid ? S.grid.freeLots() : []; },
    lotAt(x, z) { return S.grid ? S.grid.lotAt(x, z) : null; },
    cellAt(x, z) { return S.grid ? S.grid.cellAt(x, z) : null; },
    zonableAt(x, z) { return S.grid ? S.grid.zonable.get(S.grid.keyAt(x, z)) || null : null; },
    /** Ordered vertices (<= 2 m apart) of the overlay's road-facing edge for one side of one edge. */
    frontEdge(edgeId, side) { return S.grid ? S.grid.frontEdge(edgeId, side) : []; },
    /** Eight class-representative block points that items 1-3 measure at. */
    probePoints() {
      if (!S.probes.length) S.probes = pickProbePoints();
      return S.probes.map((p) => ({ ...p }));
    },
    /** Ordered boundary loops of the painted area, for item 13's direction-change count. */
    boundaryLoops() { return S.grid ? S.grid.boundaryLoops() : []; },
    /** Staging record: waterfront/hillside/highway coordinates and junction node ids. */
    staging() { return S.staging; },
    debugEdge(id) { return S.grid ? S.grid.debugEdge?.(id) ?? null : null; },
    diagnose() { return S.grid ? S.grid.diagnose() : null; },
    /** Settle deferred road/terrain-derived lots before another owner transaction snapshots them. */
    settleForHistory() {
      if (!S.grid) return false;
      S.settle = 0;
      if (S.zonableDirty) refreshBand('history', true);
      if (S.overlayDirty) rebuildOverlay();
      return true;
    },
    refresh() { refreshBand('api', true); rebuildOverlay(); },
    setOverlayVisible(v) {
      if (!S.overlay) return;
      S.target = v ? 1 : 0;
      if (v) S.overlay.setVisible(true);
      else if (S.opacity === 0) S.overlay.setVisible(false);
    },
    overlayVisible() { return !!S.overlay?.visible; },
    stats() {
      if (!S.grid) return null;
      const st = S.grid.stats();
      return { ...st, overlay: { ...S.overlay.stats } };
    },
    /**
     * Pinned landmark rects for --crops (items 18, 19), in pixels of the current framebuffer:
     * an unpainted zonable block, bare unzonable ground in the super-block core, and painted blocks
     * at 150 +- 30 m and 600 +- 60 m from the camera.
     */
    cropRects({ project, width, height, camera }) {
      if (!S.grid) return {};
      const T = S.ctx.world.terrain;
      const out = {};
      for (const e of S.empties) {
        const r = rectAround(project, width, height, e[0], e[1], 120, T);
        if (r) { out.emptyBand = r; break; }
      }
      if (S.bare) {
        const r = rectAround(project, width, height, S.bare[0], S.bare[1], 120, T);
        if (r) out.bareGround = r;
      }
      const cam = camera?.camera?.position;
      if (cam && S.blocks.length) {
        // The spec asks for painted blocks at 150 +- 30 m and 600 +- 60 m from the camera. At the
        // declared `zoneswide` preset the camera sits 572 m above the ground, so nothing on the map
        // is within 180 m of it and the near rect can only be the closest painted block that is on
        // screen; `cropDistances()` reports what the two rects actually came out at.
        S.cropDist = {};
        const on = [];
        for (const b of S.blocks) {
          const r = rectAround(project, width, height, b.x, b.z, 100, T);
          if (!r) continue;
          on.push({ r, d: Math.hypot(b.x - cam.x, b.z - cam.z, T.getHeight(b.x, b.z) - cam.y) });
        }
        if (on.length) {
          const nearest = on.reduce((a, b) => (b.d < a.d ? b : a));
          const farthest = on.reduce((a, b) => (b.d > a.d ? b : a));
          // If 150 m is unreachable the rects become "nearest on screen" and "farthest on screen",
          // which is the same measurement (aerial perspective across the frame) over the range the
          // preset actually offers.
          const near = nearest.d > 300 ? nearest : on.reduce((a, b) => (Math.abs(b.d - 150) < Math.abs(a.d - 150) ? b : a));
          const far = nearest.d > 300 ? farthest : on.reduce((a, b) => (Math.abs(b.d - 600) < Math.abs(a.d - 600) ? b : a));
          out.nearBlock = near.r; out.farBlock = far.r;
          S.cropDist = { nearBlock: +near.d.toFixed(1), farBlock: +far.d.toFixed(1) };
        }
      }
      return out;
    },
    serialize() {
      if (!S.grid) return null;
      const cells = [];
      for (const [k, c] of S.grid.cells) cells.push(k + '|' + c.type[0] + (c.density === 'high' ? 'h' : 'l'));
      const lots = [...S.grid.lots.values()].map((lot) => ({
        key: S.grid._lotKey(lot), id: lot.id,
        buildingId: Number.isInteger(lot.buildingId) ? lot.buildingId : null,
      }));
      return { cells, nextLot: S.grid.nextLot, lots };
    },
    deserialize(data) {
      if (!S.grid || !data) return;
      const T = { r: 'residential', c: 'commercial', i: 'industrial', o: 'office' };
      // Validate the optional identity envelope before mutating cells. A generated-key mismatch can
      // still arise later and is handled by the caller's owner rollback.
      if (Array.isArray(data.lots) && !S.grid.restoreIdentity(data)) return false;
      const t0 = performance.now();
      S.grid.cells.clear();
      // Keep the previous lot table until the replacement cells are committed. regenLots can then
      // match its stable road-side/front-cell keys and retain lot IDs/building ownership across a
      // load. Clearing the cells and regenerating empty lots first orphaned every saved building.
      const zonable = S.grid.buildZonable();
      S.grid.pruneCells();
      S.zonableDirty = false;
      S.overlayDirty = true;
      S.grid.bulk(({ rect }) => {
        for (const s of data.cells || []) {
          const [key, code] = s.split('|');
          const ci = key.indexOf(',');
          const cx = S.grid.ctr(+key.slice(0, ci)), cz = S.grid.ctr(+key.slice(ci + 1));
          rect(cx, cz, cx, cz, T[code[0]], code[1] === 'h' ? 'high' : 'low');
        }
      });
      S.rebuildMs = performance.now() - t0;
      S.ctx.log.info(`zonable band restored: ${zonable} cells, ${S.grid.lots.size} stable lots in ${S.rebuildMs.toFixed(0)} ms`);
      rebuildOverlay();
      return true;
    },
    /** Camera distance each cropRects landmark actually landed at, from the last cropRects() call. */
    cropDistances() { return { ...(S.cropDist || {}) }; },
    /** dev: the tuning the critic reads back (fill alpha, pulse amplitude, night multiplier). */
    tuning() { return { ...OVERLAY }; },
  },

  showcase: {
    description: 'Zoned district on generated terrain: avenue spine, street grid, a diagonal, a curved street, alleys, a cul-de-sac, a waterfront run and a hillside climb; all four zone types in both densities, plus unzoned buildable band and a highway with no frontage.',
    cameras: CAMERAS,
    async setup(ctx) {
      S.staging = stageRoads(ctx);
      ctx.modules.roads?.rebuild?.();
      // Splitting road intersections can retire the ids returned during initial staging.
      S.staging.junctions = [...ctx.world.roads.nodes.values()]
        .filter(n => n.edges.size >= 3 && Math.abs(n.x) <= 320 && n.z >= -170 && n.z <= 160)
        .map(({id, x, z}) => ({id, x, z})).sort((a, b) => a.id - b.id);
      refreshBand('showcase');
      const painted = paintZones(ctx, S.grid);
      S.blocks = painted.blocks; S.empties = painted.empties; S.bare = painted.bare;
      S.probes = pickProbePoints();
      rebuildOverlay();
      const st = S.grid.stats();
      const on = st.zonable > 0;
      S.always = on; S.target = on ? 1 : 0; S.opacity = on ? 1 : 0;
      S.overlay.setOpacity(S.opacity);
      S.overlay.setVisible(on);
      ctx.log.info(`showcase: ${st.cells} zoned cells of ${st.zonable} zonable, ${st.lots} lots, ${st.claimed} claimed (${st.cells ? Math.round(100 * st.claimed / st.cells) : 0} %)`);
      ctx.log.info(`showcase staging: ${JSON.stringify({ hillside: S.staging.hillside, slopeTarget: S.staging.slopeTarget, junctions: S.staging.junctions.length, probes: S.probes })}`);
    },
  },
};
