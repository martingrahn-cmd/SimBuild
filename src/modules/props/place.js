// Placement rules. Everything here is deterministic (ctx.rng only) and every candidate goes through
// one gate — `Placer.tryAdd` — which snaps y by KIND (never by isRoad), rejects asphalt, water and
// footprint overlaps using the spec's own radii table, and only then writes the item.
import { makeNoise2D } from '../../core/rng.js';
import { SPECIES, SPECIES_NAMES, RADII, SCALE_MIN, SCALE_MAX, shapeFor } from './species.js';

const SIDEWALK_LIFT = 0.21;      // ROAD_LIFT 0.08 + SW_H 0.16 - 0.03  (roads/build.js:12,18)
const SIDEWALK_KINDS = new Set(['bench', 'bin', 'hydrant', 'sign', 'bus_stop']);
const NO_ASPHALT = new Set(['tree_oak', 'tree_pine', 'bush', 'fence', 'planter', 'bench', 'bin']);
const LAMP_CLEAR = new Set(['bench', 'bin', 'sign']);
const MAX_R = 2.2;

export class Placer {
  constructor(ctx) {
    this.ctx = ctx;
    this.world = ctx.world;
    this.T = ctx.world.terrain;
    this.reset();
  }

  reset() {
    this.items = [];
    this.byId = new Map();
    this.hash = new Map();
    this.nextId = 1;
    this.trees = [];
    this.furniture = [];
    this.fenceRuns = [];
    this.hedgeRuns = [];
    this.bushes = [];
    this.planterFills = [];
    this.litter = [];
    this.lampHeads = [];
    this.signals = [];
    this.stops = [];
    this.lampsByEdge = new Map();
    this.signalNodes = new Set();
  }

  key(x, z) { return `${Math.floor(x / 4)},${Math.floor(z / 4)}`; }

  near(x, z, radius, fn) {
    const c = Math.ceil(radius / 4);
    const ix = Math.floor(x / 4), iz = Math.floor(z / 4);
    for (let dz = -c; dz <= c; dz++) for (let dx = -c; dx <= c; dx++) {
      const arr = this.hash.get(`${ix + dx},${iz + dz}`);
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) if (fn(arr[i]) === false) return false;
    }
    return true;
  }

  /** Ground height for a kind, exactly per the spec's item 3a rule. */
  groundY(kind, x, z, opts) {
    if (opts && opts.y !== undefined) return opts.y;
    if (SIDEWALK_KINDS.has(kind) && opts && opts.edgeId !== undefined && opts.t !== undefined) {
      const lc = this.world.roads.laneCenter?.(opts.edgeId, 0, opts.t);
      if (lc) return lc.y + SIDEWALK_LIFT;
    }
    return this.T.getHeight(x, z);
  }

  /** Footprint + clearance test. `exemptFence` lets a fence run touch its own neighbours. */
  free(kind, x, z, scale, opts = {}) {
    const r = (RADII[kind] ?? 0.4) * scale;
    let ok = true;
    this.near(x, z, r + MAX_R + 1.6, (o) => {
      if (kind === 'fence' && o.kind === 'fence') return true;
      if (opts.group !== undefined && o.group === opts.group) return true;
      const dx = o.x - x, dz = o.z - z;
      const d = Math.hypot(dx, dz);
      const need = r + (RADII[o.kind] ?? 0.4) * (o.scale || 1);
      if (d < need) { ok = false; return false; }
      if ((kind === 'streetlamp' && LAMP_CLEAR.has(o.kind)) || (o.kind === 'streetlamp' && LAMP_CLEAR.has(kind))) {
        if (d < 1.5) { ok = false; return false; }
      }
      return true;
    });
    return ok;
  }

  onAsphalt(x, z) { return this.world.roads.isRoad ? this.world.roads.isRoad(x, z) === 1 : false; }

  /** Trunks must clear the asphalt edge by 1.2 m. */
  trunkClear(x, z) {
    if (this.onAsphalt(x, z)) return false;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (this.onAsphalt(x + Math.cos(a) * 1.3, z + Math.sin(a) * 1.3)) return false;
    }
    return true;
  }

  /**
   * The one gate. Returns the new item or null.
   * opts: {heading, scale, species, variant, side, t, edgeId, lotId, nodeId, y, group, force}
   */
  tryAdd(kind, x, z, opts = {}) {
    const scale = opts.scale ?? 1;
    if (this.T.isWater(x, z)) return null;
    if (NO_ASPHALT.has(kind) && this.onAsphalt(x, z)) return null;
    if ((kind === 'tree_oak' || kind === 'tree_pine') && !this.trunkClear(x, z)) return null;
    if (!opts.force && !this.free(kind, x, z, scale, opts)) return null;
    const y = this.groundY(kind, x, z, opts);
    const it = {
      id: this.nextId++, kind, x, y, z,
      heading: opts.heading ?? 0, scale,
    };
    if (opts.species) it.species = opts.species;
    if (opts.variant) it.variant = opts.variant;
    if (opts.side) it.side = opts.side;
    if (opts.t !== undefined) it.t = opts.t;
    if (opts.edgeId !== undefined) it.edgeId = opts.edgeId;
    if (opts.lotId !== undefined) it.lotId = opts.lotId;
    if (opts.nodeId !== undefined) it.nodeId = opts.nodeId;
    if (opts.group !== undefined) it.group = opts.group;
    this.items.push(it);
    this.byId.set(it.id, it);
    const k = this.key(x, z);
    let arr = this.hash.get(k);
    if (!arr) { arr = []; this.hash.set(k, arr); }
    arr.push(it);
    return it;
  }

  remove(id) {
    const it = this.byId.get(id);
    if (!it) return false;
    this.byId.delete(id);
    const i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
    const arr = this.hash.get(this.key(it.x, it.z));
    if (arr) { const j = arr.indexOf(it); if (j >= 0) arr.splice(j, 1); }
    return true;
  }

  at(x, z, radius = 2) {
    const out = [];
    this.near(x, z, radius, (o) => { if (Math.hypot(o.x - x, o.z - z) <= radius) out.push(o); return true; });
    return out;
  }
}

// ------------------------------------------------------------------ tree helper
export function makeTree(rng, placer, species, x, z, opts = {}) {
  const sp = SPECIES[species];
  const scale = opts.scale ?? rng.range(SCALE_MIN, SCALE_MAX);
  const it = placer.tryAdd(sp.kind, x, z, {
    species, scale, heading: rng.float() * Math.PI * 2, edgeId: opts.edgeId, lotId: opts.lotId,
  });
  if (!it) return null;
  const worldH = sp.base * scale;
  const shp = shapeFor(species, worldH);
  const t = sp.tints[(rng.float() * sp.tints.length) | 0];
  const v = rng.range(0.88, 1.12);
  placer.trees.push({
    item: it, x: it.x, y: it.y, z: it.z, heading: it.heading, worldH, species,
    tint: [t[0] * v, t[1] * v, t[2] * v], shape: shp, group: opts.group || 'forest',
  });
  if (opts.litter !== false) placer.litter.push({ x: it.x, y: it.y, z: it.z, scale: Math.max(1.0, Math.min(2.5, worldH * 0.13)) });
  return it;
}

// ------------------------------------------------------------------ forest (Poisson-disc)
export function scatterForest(ctx, placer, region, opts = {}) {
  const { rng, world } = ctx;
  const T = world.terrain;
  const r = rng.fork('forest');
  const n1 = makeNoise2D(world.seed + 71);
  const n2 = makeNoise2D(world.seed + 913);
  const density = opts.density ?? 1;
  const maxTrees = Math.round((opts.maxTrees ?? 6500) * density);
  const attempts = Math.round(maxTrees * 26);
  const { x0, z0, x1, z1 } = region;
  const maxH = (T.maxHeight ?? 200) - 20;
  const lots = world.zones?.lots;
  let placed = 0;
  for (let i = 0; i < attempts && placed < maxTrees; i++) {
    const x = r.range(x0, x1), z = r.range(z0, z1);
    const h = T.getHeight(x, z);
    if (h < 0.9 || h > maxH) continue;
    if (T.isWater(x, z)) continue;
    const slope = T.getSlope(x, z);
    if (slope > 0.55) continue;
    if (opts.roadClear && world.roads.isRoad && world.roads.isRoad(x, z) !== 0) continue;
    if (lots && lots.size && inLot(lots, x, z)) continue;
    if (opts.avoid && !opts.avoid(x, z)) continue;
    // macro stands + clearings
    let dens = 0.5 + 0.5 * n1.fbm(x / 340, z / 340, 4);
    dens = Math.pow(Math.max(0, dens - 0.16) / 0.84, 0.7);
    dens *= 0.42 + 0.72 * (0.5 + 0.5 * n2.fbm(x / 105 + 11, z / 105 - 7, 3));
    dens *= 1 - Math.min(0.9, Math.max(0, (slope - 0.30) / 0.30));
    // feather the region border so the stand does not end on a straight line
    const fx = Math.min(x - x0, x1 - x), fz = Math.min(z - z0, z1 - z);
    dens *= Math.min(1, Math.min(fx, fz) / 70);
    dens = Math.max(0, Math.min(1, dens));
    if (dens < (opts.standMin ?? 0.30)) continue;   // hard stand boundary: woodland, not parkland
    const rmin = (2.2 + 4.6 * (1 - dens)) * r.range(0.72, 1.40);
    if (!poissonFree(placer, x, z, rmin)) continue;
    // species mix: conifers up the slope and with altitude, broadleaves in the valley
    const stand = 0.5 + 0.5 * n2.fbm(x / 210 - 31, z / 210 + 19, 3);
    const conifer = Math.min(1, 0.18 + Math.max(0, (h - 12) / 34) + slope * 0.9 + (stand - 0.5) * 1.3);
    let sp;
    if (r.float() < conifer) sp = r.bool(0.55) ? 'spruce' : 'fir';
    else {
      sp = r.weighted([['oak', 30], ['maple', 13], ['birch', 18], ['poplar', 12], ['willow', 7], ['blossom', 4]]);
      if (sp === 'willow' && h > 12) sp = 'oak';
    }
    const it = makeTree(r, placer, sp, x, z, { litter: false });
    if (it) { placer.trees[placer.trees.length - 1].rmin = rmin; placed++; }
  }
  return placed;
}

function poissonFree(placer, x, z, rmin) {
  let ok = true;
  placer.near(x, z, rmin + 1, (o) => {
    if (o.kind !== 'tree_oak' && o.kind !== 'tree_pine') return true;
    if (Math.hypot(o.x - x, o.z - z) < rmin) { ok = false; return false; }
    return true;
  });
  return ok;
}

function inLot(lots, x, z) {
  for (const lot of lots.values()) {
    const dx = x - lot.x, dz = z - lot.z;
    const c = Math.cos(lot.heading), s = Math.sin(lot.heading);
    const u = dx * c - dz * s, v = dx * s + dz * c;
    if (Math.abs(u) < lot.w * 0.5 + 1 && Math.abs(v) < lot.d * 0.5 + 1) return true;
  }
  return false;
}

// ------------------------------------------------------------------ road furniture
const FURNITURE_TYPES = new Set(['street', 'avenue', 'alley']);

/** Signals at every node with >= 3 street/avenue arms. */
export function placeSignals(ctx, placer) {
  const roads = ctx.modules.roads;
  const R = ctx.world.roads;
  if (!roads?.intersections) return;
  const inters = roads.intersections();
  for (const it of inters) {
    if (it.roundabout) continue;
    const major = it.arms.filter((a) => a.type === 'street' || a.type === 'avenue');
    if (major.length < 3) continue;
    if (placer.signalNodes.has(it.id)) continue;
    placer.signalNodes.add(it.id);
    const sig = { nodeId: it.id, x: it.x, y: it.y, z: it.z, arms: [], cycle: 60 };
    const base = Math.atan2(major[0].dir.x, major[0].dir.z);
    for (const a of major) {
      const dx = a.dir.x, dz = a.dir.z;
      const rx = dz, rz = -dx;
      const lateral = a.width * 0.5 + (a.sidewalk || 2) * 0.62;
      const along = a.trim + 3.6;
      const x = it.x + dx * along + rx * lateral;
      const z = it.z + dz * along + rz * lateral;
      const heading = Math.atan2(-dx, dz);
      const edge = R.edges.get(a.edgeId);
      const t = edge ? Math.min(0.98, Math.max(0.02, (a.trim + 3.6) / Math.max(1, edge.length))) : 0.05;
      const tt = a.atA === false ? 1 - t : t;
      const lc = R.laneCenter?.(a.edgeId, 0, tt);
      const y = (lc ? lc.y : ctx.world.terrain.getHeight(x, z)) + SIDEWALK_LIFT;
      const item = placer.tryAdd('trafficlight', x, z, {
        heading, scale: 1, y, edgeId: a.edgeId, t: tt, nodeId: it.id, group: `sig${it.id}`, force: true,
      });
      if (!item) continue;
      const ang = Math.atan2(dx, dz);
      let d = Math.abs(((ang - base + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const group = d > Math.PI * 0.5 ? 0 : 1;
      placer.furniture.push({ kit: 'trafficlight', x, y, z, heading, scale: 1 });
      sig.arms.push({ edgeId: a.edgeId, atA: a.atA !== false, group, x, y, z, heading, item });
    }
    if (sig.arms.length) placer.signals.push(sig);
  }
}

/** Lamps on the roads' own anchors, verbatim: same count, same x/y/z. */
export function placeLamps(ctx, placer, edgeIds) {
  const roads = ctx.modules.roads;
  const R = ctx.world.roads;
  if (!roads?.lampPositions) return;
  const ids = edgeIds || [...R.edges.keys()];
  for (const id of ids) {
    const e = R.edges.get(id);
    if (!e || e.type === 'gravel') continue;
    const list = roads.lampPositions(id);
    const mine = [];
    for (const p of list) {
      const it = placer.tryAdd('streetlamp', p.x, p.z, {
        heading: p.heading, scale: 1, y: p.y, edgeId: id, side: p.side, t: p.t, force: true,
      });
      if (!it) continue;
      placer.furniture.push({ kit: 'streetlamp', x: p.x, y: p.y, z: p.z, heading: p.heading, scale: 1 });
      placer.lampHeads.push({ x: p.x, y: p.y, z: p.z, heading: p.heading, kit: 'streetlamp', edgeId: id, t: p.t, side: p.side });
      mine.push({ id: it.id, x: p.x, y: p.y, z: p.z, heading: p.heading, side: p.side, t: p.t });
    }
    placer.lampsByEdge.set(id, mine);
  }
}

/** Street trees, benches, bins, hydrants, signs and bus stops along one edge. */
export function placeEdgeFurniture(ctx, placer, edgeIds) {
  const R = ctx.world.roads;
  const T = ctx.world.terrain;
  const rng = ctx.rng.fork('street');
  const ids = edgeIds || [...R.edges.keys()];
  const intersections = ctx.modules.roads?.intersections?.() || [];
  const nearInt = (x, z) => {
    for (const i of intersections) if (Math.hypot(i.x - x, i.z - z) < 40) return true;
    return false;
  };
  for (const id of ids) {
    const e = R.edges.get(id);
    if (!e || !FURNITURE_TYPES.has(e.type)) continue;
    const Ty = R.types[e.type] || R.types.street;
    if (!Ty.sidewalk) continue;
    const len = e.length;
    const from = (e.trimA || 0) + 8, to = len - (e.trimB || 0) - 8;
    if (to - from < 12) continue;
    const r = rng.fork(`e${id}`);

    // --- street trees in the verge, 12-18 m, both sides (item 13a)
    if (Ty.sidewalk >= 3) {
      for (const sgn of [1, -1]) {
        let d = from + r.range(0, 8);
        while (d <= to) {
          const s = R.sample(id, d / len);
          if (s) {
            const nx = -s.tangent.z, nz = s.tangent.x;
            const off = Ty.asphaltHalf + Ty.sidewalk + r.range(0.8, 1.6);
            const x = s.x + nx * sgn * off, z = s.z + nz * sgn * off;
            const sp = r.weighted([['oak', 11], ['maple', 5], ['birch', 7], ['poplar', 5], ['blossom', 3]]);
            makeTree(r, placer, sp, x, z, { edgeId: id, group: 'street' });
          }
          d += r.range(12, 18);
        }
      }
    }

    // --- benches / bins on the sidewalk, >= 40 m apart, 0.6-1.2 m back from the kerb, facing the road
    let d = from + r.range(4, 14);
    let k = 0;
    while (d <= to) {
      const sgn = k % 2 === 0 ? 1 : -1;
      placeKerbside(placer, R, id, len, d, sgn, Ty, k % 2 === 0 ? 'bench' : 'bin', r);
      k++;
      d += r.range(40, 48);
    }
    // --- hydrants
    d = from + r.range(14, 34);
    while (d <= to) {
      placeKerbside(placer, R, id, len, d, r.bool() ? 1 : -1, Ty, 'hydrant', r, 0.55);
      d += r.range(58, 76);
    }
    // --- junction signs
    for (const [node, atA] of [[e.a, true], [e.b, false]]) {
      const info = R.nodes.get(node);
      if (!info || info.edges.size < 2) continue;
      const dAlong = atA ? (e.trimA || 0) + 5.0 : len - (e.trimB || 0) - 5.0;
      const s = R.sample(id, dAlong / len);
      if (!s) continue;
      const sgn = atA ? 1 : -1;
      const kit = r.bool(0.45) ? 'sign_stop' : (r.bool(0.5) ? 'sign_street' : 'sign');
      placeKerbside(placer, R, id, len, dAlong, sgn, Ty, 'sign', r, 0.45, kit,
        Math.atan2(s.tangent.x * sgn, -s.tangent.z * sgn));
    }
    // --- bus stop: >= 1 per 250 m, within 40 m of an intersection, on the sidewalk
    if ((e.type === 'street' || e.type === 'avenue') && len > 60) {
      const n = Math.max(1, Math.floor(len / 250));
      for (let k = 0; k < n; k++) {
        const dd = from + (to - from) * ((k + 0.35) / n);
        const s = R.sample(id, dd / len);
        if (!s) continue;
        const sgn = k % 2 === 0 ? 1 : -1;
        const nx = -s.tangent.z, nz = s.tangent.x;
        const off = Ty.asphaltHalf + Ty.sidewalk - 0.85;
        const x = s.x + nx * sgn * off, z = s.z + nz * sgn * off;
        if (!nearInt(x, z)) continue;
        if (placer.onAsphalt(x, z)) continue;
        const heading = Math.atan2(-nx * sgn, nz * sgn);
        const it = placer.tryAdd('bus_stop', x, z, { heading, scale: 1, edgeId: id, t: dd / len, side: sgn > 0 ? 'right' : 'left', group: `bs${id}${k}` });
        if (!it) continue;
        placer.furniture.push({ kit: 'bus_stop', x: it.x, y: it.y, z: it.z, heading, scale: 1 });
        placer.stops.push({ id: it.id, x: it.x, y: it.y, z: it.z, heading, edgeId: id, side: sgn > 0 ? 'right' : 'left', t: dd / len });
        // flag on the kerb
        const fx = s.x + nx * sgn * (Ty.asphaltHalf + Ty.sidewalk * 0.42), fz = s.z + nz * sgn * (Ty.asphaltHalf + Ty.sidewalk * 0.42);
        if (!placer.onAsphalt(fx, fz)) {
          const fit = placer.tryAdd('sign', fx, fz, { heading, scale: 1, edgeId: id, t: dd / len, group: `bs${id}${k}` });
          if (fit) placer.furniture.push({ kit: 'sign_bus', x: fit.x, y: fit.y, z: fit.z, heading, scale: 1 });
        }
      }
    }
  }
}

/** Kerbside item: search the 0.6-1.2 m setback band (and +-2 m along) for a spot off the asphalt. */
function placeKerbside(placer, R, id, len, d, sgn, Ty, kind, r, minOff = 0.6, kit = null, headingOverride = null) {
  for (const dd of [d, d + 2.2, d - 2.2, d + 4.4]) {
    if (dd < 0 || dd > len) continue;
    const s = R.sample(id, dd / len);
    if (!s) continue;
    const nx = -s.tangent.z, nz = s.tangent.x;
    for (const off of [0.9, 0.7, 1.1, 1.2, minOff]) {
      const x = s.x + nx * sgn * (Ty.asphaltHalf + off);
      const z = s.z + nz * sgn * (Ty.asphaltHalf + off);
      if (placer.onAsphalt(x, z)) continue;
      const heading = headingOverride !== null ? headingOverride : Math.atan2(-nx * sgn, nz * sgn);
      const it = placer.tryAdd(kind, x, z, { heading, scale: 1, edgeId: id, t: dd / len, side: sgn > 0 ? 'right' : 'left' });
      if (!it) continue;
      placer.furniture.push({ kit: kit || kind, x: it.x, y: it.y, z: it.z, heading, scale: 1 });
      return it;
    }
  }
  return null;
}

// ------------------------------------------------------------------ park / plaza + boundaries
export function placePark(ctx, placer, park) {
  const { rng } = ctx;
  const T = ctx.world.terrain;
  const r = rng.fork('park');
  const { cx, cz, w, d } = park;
  const hw = w * 0.5, hd = d * 0.5;
  const inside = (x, z) => Math.abs(x - cx) < hw && Math.abs(z - cz) < hd;

  // hedge runs framing two sides, with a gate gap
  for (const [ax, az, bx, bz] of [
    [cx - hw, cz - hd, cx + hw, cz - hd],
    [cx - hw, cz - hd, cx - hw, cz + hd],
  ]) {
    hedgeLine(ctx, placer, ax, az, bx, bz, { gap: [0.42, 0.58] });
  }
  // two built fence variants on the other two sides
  fenceLine(ctx, placer, cx + hw, cz - hd, cx + hw, cz + hd, 'railing', { gap: [0.46, 0.56] });
  fenceLine(ctx, placer, cx - hw, cz + hd, cx + hw, cz + hd, 'slat');

  // lantern posts around a central plaza, benches facing in, bins, planters
  const px = cx, pz = cz;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const rr = 16;
    const x = px + Math.cos(a) * rr, z = pz + Math.sin(a) * rr;
    const it = placer.tryAdd('streetlamp', x, z, { heading: Math.atan2(px - x, -(pz - z)), scale: 1, variant: 'lantern' });
    if (!it) continue;
    placer.furniture.push({ kit: 'streetlamp_lantern', x: it.x, y: it.y, z: it.z, heading: it.heading, scale: 1 });
    placer.lampHeads.push({ x: it.x, y: it.y, z: it.z, heading: it.heading, kit: 'streetlamp_lantern' });
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    const x = px + Math.cos(a) * 10.5, z = pz + Math.sin(a) * 10.5;
    const it = placer.tryAdd('bench', x, z, { heading: Math.atan2(px - x, -(pz - z)), scale: 1 });
    if (it) placer.furniture.push({ kit: 'bench', x: it.x, y: it.y, z: it.z, heading: it.heading, scale: 1 });
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 1.1;
    const x = px + Math.cos(a) * 13.5, z = pz + Math.sin(a) * 13.5;
    const it = placer.tryAdd('bin', x, z, { heading: r.float() * 6.28, scale: 1 });
    if (it) placer.furniture.push({ kit: 'bin', x: it.x, y: it.y, z: it.z, heading: it.heading, scale: 1 });
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x = px + Math.cos(a) * 7.0, z = pz + Math.sin(a) * 7.0;
    const it = placer.tryAdd('planter', x, z, { heading: r.float() * 6.28, scale: 1 });
    if (!it) continue;
    placer.furniture.push({ kit: 'planter', x: it.x, y: it.y, z: it.z, heading: it.heading, scale: 1 });
    placer.planterFills.push({ x: it.x, y: it.y, z: it.z, heading: it.heading, scale: 1 });
  }
  // specimen trees of several species + shrub groups
  const specimens = ['oak', 'maple', 'blossom', 'willow', 'fir', 'birch', 'spruce', 'poplar'];
  for (let i = 0; i < 46; i++) {
    const x = r.range(cx - hw + 4, cx + hw - 4), z = r.range(cz - hd + 4, cz + hd - 4);
    if (Math.hypot(x - px, z - pz) < 20) continue;
    makeTree(r, placer, specimens[i % specimens.length], x, z, { group: 'park' });
  }
  for (let i = 0; i < 90; i++) {
    const x = r.range(cx - hw + 2, cx + hw - 2), z = r.range(cz - hd + 2, cz + hd - 2);
    if (Math.hypot(x - px, z - pz) < 5) continue;
    const scale = r.range(0.85, 1.45);
    const it = placer.tryAdd('bush', x, z, { heading: r.float() * 6.28, scale });
    if (it) placer.bushes.push({ x: it.x, y: it.y, z: it.z, heading: it.heading, scale });
  }
  return inside;
}

/** A hedge run: items every 2 m plus one geometry run per <= 16 m so chunk culling still works. */
export function hedgeLine(ctx, placer, ax, az, bx, bz, opt = {}) {
  const T = ctx.world.terrain;
  const L = Math.hypot(bx - ax, bz - az);
  const n = Math.max(2, Math.round(L / 2));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (opt.gap && t > opt.gap[0] && t < opt.gap[1]) { flushRun(placer, pts, 'hedge'); continue; }
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    if (T.isWater(x, z) || placer.onAsphalt(x, z)) { flushRun(placer, pts, 'hedge'); continue; }
    const it = placer.tryAdd('fence', x, z, { variant: 'hedge', scale: 1, heading: Math.atan2(bx - ax, -(bz - az)) });
    if (!it) { flushRun(placer, pts, 'hedge'); continue; }
    pts.push({ x: it.x, y: it.y, z: it.z });
    if (pts.length >= 9) { const last = pts[pts.length - 1]; flushRun(placer, pts, 'hedge'); pts.push({ ...last }); }
  }
  flushRun(placer, pts, 'hedge');
}

export function fenceLine(ctx, placer, ax, az, bx, bz, variant, opt = {}) {
  const T = ctx.world.terrain;
  const L = Math.hypot(bx - ax, bz - az);
  const n = Math.max(2, Math.round(L / 2));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (opt.gap && t > opt.gap[0] && t < opt.gap[1]) { flushRun(placer, pts, variant); continue; }
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    if (T.isWater(x, z) || placer.onAsphalt(x, z)) { flushRun(placer, pts, variant); continue; }
    const it = placer.tryAdd('fence', x, z, { variant, scale: 1, heading: Math.atan2(bx - ax, -(bz - az)) });
    if (!it) { flushRun(placer, pts, variant); continue; }
    pts.push({ x: it.x, y: it.y, z: it.z });
    if (pts.length >= 9) { const last = pts[pts.length - 1]; flushRun(placer, pts, variant); pts.push({ ...last }); }
  }
  flushRun(placer, pts, variant);
}

function flushRun(placer, pts, variant) {
  if (pts.length >= 2) {
    const copy = pts.map((p) => ({ ...p }));
    if (variant === 'hedge') placer.hedgeRuns.push({ pts: copy });
    else placer.fenceRuns.push({ pts: copy, variant });
  }
  pts.length = 0;
}

export { SIDEWALK_LIFT, SPECIES_NAMES };
