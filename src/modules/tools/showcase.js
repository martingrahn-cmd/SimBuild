// Showcase staging for the tools module: a small CS2-style street grid with four zoned blocks, and
// then every tool preview held open at once so a still frame shows what the tools actually look like:
//   · a curved avenue being drawn from an intersection, with node handles, the alignment guide and
//     live length / angle / grade / price chips (red when the segment is invalid),
//   · the zoning brush over a block: the affected 8 m cells lit in the zone colour inside a dashed circle,
//   · a service ghost (footprint volume + road-frontage tie line) with its coverage circle,
//   · a road segment selected, highlighted with the blue selection ribbon.
// The composite draw is only used in the showcase; in the game one tool draws at a time.
import { ICON } from './chips.js';
import { serviceDef, money } from './costs.js';

export const CAMERAS = {
  tools: { yaw: 0.78, pitch: 0.54, distance: 240, target: [56, 2, 50] },
  toolsclose: { yaw: 1.08, pitch: 0.30, distance: 84, target: [24, 2, 68] },
  toolswide: { yaw: 0.42, pitch: 1.00, distance: 520, target: [40, 0, 30] },
};

// scene constants (metres)
const AVE_Z = 20;
const XS = [-240, -160, -80, 0, 80, 160, 240];
const ZS = [-140, -60, 20, 100, 180];

const GHOST = { a: [0, 100], ctrl: [30, 70], b: [96, 6] };
const BRUSH = { x: -62, z: 62, r: 22, type: 'residential', density: 'low' };
const SERVICE = { kind: 'park_small', x: 148, z: 88 };
let REJECT = null;   // a genuinely invalid segment found on the map, shown red next to the valid ghost

const ZONE_RGB = {
  residential: { low: [0.37, 0.84, 0.20], high: [0.05, 0.56, 0.24] },
  commercial: { low: [0.18, 0.71, 0.96], high: [0.07, 0.25, 0.79] },
  industrial: { low: [0.97, 0.71, 0.08], high: [0.82, 0.33, 0.06] },
  office: { low: [0.78, 0.37, 0.96], high: [0.42, 0.11, 0.72] },
};

function buildRoads(ctx) {
  const R = ctx.world.roads;
  const node = (x, z) => R.addNode(x, z);
  const edge = (a, b, type = 'street', opts) => R.addEdge(a, b, type, opts);
  const chain = (pts, type, opts) => {
    const ids = pts.map(([x, z]) => node(x, z));
    for (let i = 1; i < ids.length; i++) edge(ids[i - 1], ids[i], type, opts);
    return ids;
  };
  // the avenue the player will select, running the width of the grid
  chain([[-330, AVE_Z], ...XS.map((x) => [x, AVE_Z]), [330, AVE_Z]], 'avenue');
  // north-south streets
  for (const x of XS) chain(ZS.map((z) => [x, z]), 'street');
  // east-west streets
  for (const z of ZS) { if (z === AVE_Z) continue; chain(XS.map((x) => [x, z]), 'street'); }
  // an alley splitting a deep block, and a curved street off the east side (variety in the backdrop)
  chain([[-200, 100], [-200, 180]], 'alley');
  edge(node(240, -60), node(320, 30), 'street', { ctrl: { x: 322, z: -54 } });
}

function paintZones(ctx) {
  const z = ctx.modules.zoning;
  if (!z?.bulk) return;
  z.refresh?.();
  z.bulk(({ rect }) => {
    rect(-238, -138, -162, -62, 'residential', 'low');
    rect(-158, -138, -82, -62, 'residential', 'high');
    rect(2, -138, 78, -62, 'commercial', 'low');
    rect(82, -138, 158, -62, 'office', 'high');
    rect(-238, 102, -162, 178, 'residential', 'low');
    rect(82, 102, 158, 178, 'industrial', 'low');
  });
  z.setOverlayVisible?.(true);
}

/**
 * Find a real reason to show the red ghost: the nearest water to the town, and a 110 m segment
 * running off the shore into it. `evaluate()` rejects it with "Cannot end in water" — no faking.
 */
function findRejected(ctx) {
  const T = ctx.world.terrain;
  let best = null, bd = Infinity;
  for (let z = -430; z <= 430; z += 12) {
    for (let x = -430; x <= 430; x += 12) {
      if (!T.isWater(x, z)) continue;
      const d = Math.hypot(x - 60, z - 30);
      if (d < bd) { bd = d; best = { x, z }; }
    }
  }
  if (!best) return null;
  let dir = null, hi = -Infinity;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const px = best.x + Math.cos(a) * 115, pz = best.z + Math.sin(a) * 115;
    if (T.isWater(px, pz)) continue;
    const h = T.getHeight(px, pz);
    if (h > hi) { hi = h; dir = a; }
  }
  if (dir === null) return null;
  return { a: { x: best.x + Math.cos(dir) * 115, z: best.z + Math.sin(dir) * 115 }, b: { x: best.x, z: best.z } };
}

/** The segment of the avenue between x = 0 and x = 80 — the one the showcase leaves selected. */
function findAvenueEdge(ctx) {
  const R = ctx.world.roads;
  let best = null, bd = Infinity;
  for (const e of R.edges.values()) {
    if (e.type !== 'avenue') continue;
    const a = R.nodes.get(e.a), b = R.nodes.get(e.b);
    if (!a || !b) continue;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const d = Math.hypot(mx - 40, mz - AVE_Z);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// -------------------------------------------------------------------------------- composite preview

function zoneCells(ctx, cx, cz, r) {
  const zon = ctx.modules.zoning;
  const cell = ctx.world.zones.cellSize || 8;
  const half = ctx.world.size / 2;
  const idx = (v) => Math.floor((v + half) / cell);
  const ctr = (i) => i * cell - half + cell * 0.5;
  const out = [];
  const r2 = r * r;
  for (let iz = idx(cz - r); iz <= idx(cz + r); iz++) {
    for (let ix = idx(cx - r); ix <= idx(cx + r); ix++) {
      const x = ctr(ix), z = ctr(iz);
      if ((x - cx) ** 2 + (z - cz) ** 2 > r2) continue;
      if (zon?.zonableAt && !zon.zonableAt(x, z)) continue;
      out.push(x, z);
    }
  }
  return out;
}

function composite(ctx, S) {
  const g = S.giz, T = ctx.world.terrain;

  // 1. the road ghost, its handles, guide line and chips (the road tool's own draw)
  S.tools.road.draw();

  // 2. zoning brush — cells + dashed circle (appended to the same flat batch)
  const col = ZONE_RGB[BRUSH.type][BRUSH.density];
  const cells = zoneCells(ctx, BRUSH.x, BRUSH.z, BRUSH.r);
  for (let i = 0; i < cells.length; i += 2) g.cell(cells[i], cells[i + 1], 7.3, col, 0.44);
  g.showBrush(BRUSH.x, BRUSH.z, BRUSH.r, 'flatten', { fill: 0.10, grid: 0, rimIn: 0.93 });
  g.brush.mesh.material.uniforms.uColor.value.setRGB(col[0], col[1], col[2]);
  g.brush.mesh.material.uniforms.uRim.value.setRGB(Math.min(1, col[0] + 0.4), Math.min(1, col[1] + 0.4), Math.min(1, col[2] + 0.4));
  const by = T.getHeight(BRUSH.x, BRUSH.z);
  S.chips.add(BRUSH.x, by + 2, BRUSH.z, ICON.cells, 'Residential · low', '', 0, -44);
  S.chips.add(BRUSH.x, by + 2, BRUSH.z, ICON.area, `${cells.length / 2} cells`, '', 0, -24, `${((cells.length / 2) * 64 / 1000).toFixed(1)} k m²`);

  // 3. service ghost + coverage circle + road frontage tie
  const d = serviceDef(SERVICE.kind);
  const ne = ctx.world.roads.nearestEdge?.(SERVICE.x, SERVICE.z, 120);
  const heading = ne ? Math.atan2(ne.point.z - SERVICE.z, ne.point.x - SERVICE.x) + Math.PI / 2 : 0;
  g.footprint(SERVICE.x, SERVICE.z, d.w, d.d, heading, d.h, [0.55, 0.82, 1.0], 0.18);
  if (ne) {
    g.groundLine(SERVICE.x, SERVICE.z, ne.point.x, ne.point.z, 1.2, [0.4, 1, 0.55], 0.8, true);
    g.marker(ne.point.x, ne.point.z, 1.8, [0.45, 1, 0.6]);
  }
  g.showCoverage(SERVICE.x, SERVICE.z, d.coverage, [0.35, 0.85, 1.0]);

  // 4. the rejected segment: same tool, same evaluation, red because it ends in the water
  if (REJECT) {
    const ev = S.tools.road._eval(REJECT.a, REJECT.b);
    g.setGhostAlt(ev.path, ctx.world.roads.types.street.width, ev.ok ? 'valid' : 'invalid');
    g.marker(REJECT.a.x, REJECT.a.z, 2.4, ev.ok ? [1, 1, 1] : [1, 0.55, 0.48]);
    g.marker(REJECT.b.x, REJECT.b.z, 2.4, ev.ok ? [1, 1, 1] : [1, 0.55, 0.48]);
    const my = T.getHeight(REJECT.b.x, REJECT.b.z);
    const mid = { x: (REJECT.a.x + REJECT.b.x) / 2, z: (REJECT.a.z + REJECT.b.z) / 2 };
    S.chips.add(mid.x, T.getHeight(mid.x, mid.z) + 2, mid.z, ICON.length, `${Math.round(ev.len)} m`, '', 0, -18);
    S.chips.add(REJECT.b.x, my + 2, REJECT.b.z, ICON.bad, ev.ok ? 'valid' : ev.reason, 'bad', 0, -34);
  }
  const sy = T.getHeight(SERVICE.x, SERVICE.z);
  S.chips.add(SERVICE.x, sy + d.h + 2, SERVICE.z, ICON.info, d.label, '', 0, -20);
  S.chips.add(SERVICE.x, sy + d.h + 2, SERVICE.z, ICON.cost, money(d.cost), 'cost', 0, -40);
  S.chips.add(SERVICE.x, sy + 1, SERVICE.z, ICON.radius, `${d.coverage} m`, '', 0, 26);
}

export async function stage(ctx, S, api) {
  REJECT = findRejected(ctx);
  buildRoads(ctx);
  ctx.modules.roads?.rebuild?.();
  paintZones(ctx);

  // leave a road segment selected so the blue selection ribbon and its info chip are on screen
  const sel = findAvenueEdge(ctx);
  if (sel) api.selectObject('road', sel.id);

  // hold a curved avenue mid-draw: anchor on the intersection, control placed, cursor on open ground
  api.select('road', { type: 'avenue', mode: 'curve', elevation: 0, snap: ['magnet'] });
  api.beginAt(GHOST.a[0], GHOST.a[1]);
  api.controlAt(GHOST.ctrl[0], GHOST.ctrl[1]);
  api.setHover(GHOST.b[0], GHOST.b[1]);

  S._showcaseDraw = () => composite(ctx, S);
  S.dirty();

  const p = S.tools.road.state().preview;
  const rej = REJECT ? S.tools.road._eval(REJECT.a, REJECT.b) : null;
  ctx.log.info(`showcase: ${ctx.world.roads.edges.size} edges, ghost ${p ? `${Math.round(p.len)} m / ${money(p.cost)} / ${p.ok ? 'valid' : p.reason}` : 'none'}, rejected ${rej ? `${Math.round(rej.len)} m @ ${Math.round(REJECT.b.x)},${Math.round(REJECT.b.z)} — ${rej.reason || 'VALID (no red demo)'}` : 'none found'}, selection edge #${sel?.id}`);
}
