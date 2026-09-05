// Placement rules: forests from a slope/height/noise density map outside roads and lots, garden trees and
// hedges on the strip behind the pavement, lamps from roads.api.lampPositions, signals from
// roads.api.intersections, and sidewalk furniture along frontage with a 1-D occupancy test per edge.
import { makeNoise2D } from '../../core/rng.js';
import { SPECIES } from './trees.js';

/** Cylinders (x, z, r) that stay clear of planting — the showcase drops one on every camera eye point. */
export const CLEAR_ZONES = [];
export function clearOf(x, z) {
  for (let i = 0; i < CLEAR_ZONES.length; i++) {
    const c = CLEAR_ZONES[i];
    const dx = x - c.x, dz = z - c.z;
    if (dx * dx + dz * dz < c.r * c.r) return false;
  }
  return true;
}

const SIDEWALK_Y = 0.16 + 0.08;   // roads' SW_H + ROAD_LIFT above the road profile height
const VERGE_Y = 0.25 + 0.16 + 0.08; // terrain under the corridor sits DROP below the profile

/** Chamfer distance (metres) to the nearest paved cell, from the roads coverage mask. */
export function roadDistanceField(world) {
  const cov = world.roads.coverage;
  if (!cov || !cov.data) return null;
  const { res, cell, data } = cov;
  const half = world.size / 2;
  const d = new Float32Array(res * res);
  const BIG = 1e6;
  for (let i = 0; i < d.length; i++) d[i] = data[i] ? 0 : BIG;
  const D1 = 1, D2 = Math.SQRT2;
  for (let z = 0; z < res; z++) for (let x = 0; x < res; x++) {
    const i = z * res + x;
    let v = d[i];
    if (v === 0) continue;
    if (x > 0) v = Math.min(v, d[i - 1] + D1);
    if (z > 0) v = Math.min(v, d[i - res] + D1);
    if (x > 0 && z > 0) v = Math.min(v, d[i - res - 1] + D2);
    if (x < res - 1 && z > 0) v = Math.min(v, d[i - res + 1] + D2);
    d[i] = v;
  }
  for (let z = res - 1; z >= 0; z--) for (let x = res - 1; x >= 0; x--) {
    const i = z * res + x;
    let v = d[i];
    if (v === 0) continue;
    if (x < res - 1) v = Math.min(v, d[i + 1] + D1);
    if (z < res - 1) v = Math.min(v, d[i + res] + D1);
    if (x < res - 1 && z < res - 1) v = Math.min(v, d[i + res + 1] + D2);
    if (x > 0 && z < res - 1) v = Math.min(v, d[i + res - 1] + D2);
    d[i] = v;
  }
  return {
    at(x, z) {
      const ix = Math.floor((x + half) / cell), iz = Math.floor((z + half) / cell);
      if (ix < 0 || iz < 0 || ix >= res || iz >= res) return 1e6;
      return d[iz * res + ix] * cell;
    },
  };
}

/** Lot occupancy (if zoning is present) so forests never grow through buildings. */
function lotTest(world) {
  const lots = world.zones?.lots;
  if (!lots || !lots.size) return null;
  const cell = 16, half = world.size / 2, res = Math.ceil(world.size / cell);
  const grid = new Uint8Array(res * res);
  const mark = (x, z) => {
    const ix = Math.floor((x + half) / cell), iz = Math.floor((z + half) / cell);
    if (ix >= 0 && iz >= 0 && ix < res && iz < res) grid[iz * res + ix] = 1;
  };
  for (const lot of lots.values()) {
    const r = Math.max(lot.w, lot.d) * 0.5 + 4;
    for (let dz = -r; dz <= r; dz += cell * 0.5) for (let dx = -r; dx <= r; dx += cell * 0.5) mark(lot.x + dx, lot.z + dz);
  }
  return (x, z) => {
    const ix = Math.floor((x + half) / cell), iz = Math.floor((z + half) / cell);
    return ix >= 0 && iz >= 0 && ix < res && iz < res ? grid[iz * res + ix] : 0;
  };
}

// ---------------------------------------------------------------- forest
export function scatterForest(ctx, roadDist, opts = {}) {
  const { world, rng } = ctx;
  const T = world.terrain;
  const half = world.size / 2;
  const { spacing = 6.1, maxTrees = 16000, minRoadDist = 15, edge = 24 } = opts;
  const n1 = makeNoise2D(world.seed + 71);   // macro forest patches
  const n2 = makeNoise2D(world.seed + 913);  // clearings / species mix
  const inLot = lotTest(world);
  const r = rng.fork('forest');
  const out = [];
  const cols = Math.floor((world.size - edge * 2) / spacing);
  const start = -half + edge;
  for (let jz = 0; jz < cols; jz++) {
    for (let jx = 0; jx < cols; jx++) {
      const x = start + jx * spacing + r.range(-spacing * 0.46, spacing * 0.46);
      const z = start + jz * spacing + r.range(-spacing * 0.46, spacing * 0.46);
      const h = T.getHeight(x, z);
      if (h < 1.2) continue;
      const slope = T.getSlope(x, z);
      if (slope > 0.72) continue;
      if (roadDist && roadDist.at(x, z) < minRoadDist) continue;
      if (inLot && inLot(x, z)) continue;
      if (!clearOf(x, z)) continue;
      // density: broad patches, thinned on steep ground and near the shoreline
      let dens = 0.5 + 0.5 * n1.fbm(x / 380, z / 380, 4);
      dens = Math.pow(Math.max(0, dens - 0.14) / 0.86, 0.75) * 1.25;
      const clear = 0.5 + 0.5 * n2.fbm(x / 110 + 11, z / 110 - 7, 3);
      dens *= 0.42 + 0.72 * clear;
      dens *= Math.min(1, (h - 1.2) / 2.5);
      dens *= 1 - Math.min(0.85, Math.max(0, (slope - 0.34) / 0.42));
      if (h > 78) dens *= Math.max(0, 1 - (h - 78) / 55);
      if (r.float() > dens) continue;
      // species mix by altitude / slope with a noisy stand boundary
      const stand = 0.5 + 0.5 * n2.fbm(x / 240 - 31, z / 240 + 19, 3);
      const coniferBias = Math.min(1, Math.max(0, (h - 22) / 55) + slope * 0.8 + (stand - 0.5) * 0.9);
      let sp;
      if (r.float() < coniferBias) sp = 'pine';
      else sp = r.float() < 0.34 + (1 - coniferBias) * 0.2 ? 'birch' : 'oak';
      // stand age varies over ~70 m so the canopy is lumpy rather than an orchard
      const age = 0.70 + 0.62 * (0.5 + 0.5 * n2.fbm(x / 68 + 5, z / 68 - 3, 2));
      out.push(makeTree(r, sp, x, T.getHeight(x, z), z, 'forest', age));
      if (out.length >= maxTrees) return out;
    }
  }
  return out;
}

const HEIGHTS = {
  oak: [8.5, 15.5], pine: [12, 24], birch: [8, 15],
};
const TINT = {
  oak: [[0.80, 0.98, 0.66], [1.06, 1.02, 0.80], [0.92, 1.0, 0.74], [1.12, 0.94, 0.60]],
  pine: [[0.80, 0.94, 0.82], [0.92, 1.0, 0.88], [0.72, 0.90, 0.80]],
  birch: [[0.98, 1.05, 0.80], [1.08, 1.05, 0.72], [0.90, 1.0, 0.76]],
};
export function makeTree(rng, species, x, y, z, kind, scaleK = 1) {
  const hr = HEIGHTS[species];
  const s = rng.range(hr[0], hr[1]) * scaleK;
  const t = TINT[species][(rng.float() * TINT[species].length) | 0];
  const v = rng.range(0.88, 1.12);
  return {
    x, y, z, species, kind,
    scale: s, rot: rng.float() * Math.PI * 2,
    lean: rng.range(-0.035, 0.035),
    tint: [t[0] * v, t[1] * v, t[2] * v],
  };
}

// ---------------------------------------------------------------- street
const FURNITURE_TYPES = ['street', 'avenue', 'alley'];

export function placeStreet(ctx, roadDist) {
  const { world, modules } = ctx;
  const R = world.roads;
  const roads = modules.roads;
  const rng = ctx.rng.fork('street');
  const T = world.terrain;
  const kinds = {
    streetlamp: [], trafficlight: [], bench: [], bin: [], hydrant: [], sign: [],
    bus_stop: [], fence: [], planter: [], bush: [], flowers: [], hedge: [],
    plate_stop: [], plate_speed: [], plate_street: [], plate_bus: [], glass: [],
  };
  const trees = [];
  if (!roads || !R.edges.size) return { kinds, trees };

  const signalNodes = new Set();
  // ---- traffic signals at real intersections
  const inters = roads.intersections ? roads.intersections() : [];
  for (const it of inters) {
    if (it.roundabout) continue;
    const major = it.arms.filter((a) => a.type === 'street' || a.type === 'avenue');
    if (major.length < 3) continue;
    signalNodes.add(it.id);
    for (const a of it.arms) {
      if (a.type === 'alley' || a.type === 'gravel') continue;
      const dx = a.dir.x, dz = a.dir.z;
      const rx = dz, rz = -dx;                       // right of a driver approaching the node
      const lateral = a.width + (a.sidewalk || 2) * 0.55;
      const along = a.trim + 3.4;
      const x = it.x + dx * along + rx * lateral;
      const z = it.z + dz * along + rz * lateral;
      const y = T.getHeight(x, z) + VERGE_Y;
      kinds.trafficlight.push({ x, y, z, heading: Math.atan2(-dx, dz), scale: 1, nodeId: it.id, phase: 0 });
    }
    // phase groups: opposite arms share a phase
    const list = kinds.trafficlight.filter((s) => s.nodeId === it.id);
    if (list.length) {
      const base = Math.atan2(it.arms[0].dir.x, it.arms[0].dir.z);
      for (const s of list) {
        const a = s.heading;
        const d = Math.abs(((a - base + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        s.phase = d > Math.PI * 0.5 ? 0 : 1;
      }
    }
  }

  // ---- per edge: lamps, then furniture in the gaps
  for (const e of R.edges.values()) {
    const T4 = R.types[e.type] || R.types.street;
    const isRoad = FURNITURE_TYPES.includes(e.type);
    // lamps on everything except gravel
    if (e.type !== 'gravel') {
      for (const p of roads.lampPositions(e.id)) {
        kinds.streetlamp.push({ x: p.x, y: p.y, z: p.z, heading: p.heading, scale: rng.range(0.97, 1.03), edgeId: e.id });
      }
    }
    if (!isRoad || !T4.sidewalk) continue;
    const len = e.length;
    const from = (e.trimA || 0) + 7, to = len - (e.trimB || 0) - 7;
    if (to - from < 10) continue;
    // 1-D occupancy along the edge so furniture never lands on a lamp base
    const lampDs = [];
    for (const p of roads.lampPositions(e.id)) lampDs.push(p.t * len);
    const free = (d) => { for (const ld of lampDs) if (Math.abs(ld - d) < 5.5) return false; return true; };

    const sidewalkOff = T4.asphaltHalf + T4.sidewalk * 0.55;
    const vergeOff = T4.asphaltHalf + T4.sidewalk + 2.6;
    const step = e.type === 'avenue' ? 15 : 19;
    let hydrantAcc = rng.range(0, 60);
    let stopAcc = 0;
    for (let d = from; d <= to; d += step) {
      for (const sgn of [1, -1]) {
        const dd = d + (sgn > 0 ? 0 : step * 0.5);
        if (dd < from || dd > to || !free(dd)) continue;
        const s = R.sample(e.id, dd / len);
        if (!s) continue;
        const nx = -s.tangent.z, nz = s.tangent.x;
        const px = s.x + nx * sgn * sidewalkOff, pz = s.z + nz * sgn * sidewalkOff;
        const heading = Math.atan2(-nx * sgn, nz * sgn); // face the carriageway
        const y = s.y + SIDEWALK_Y;
        if (T.isWater(px, pz)) continue;
        const roll = rng.float();
        if (roll < 0.20) kinds.bench.push({ x: px, y, z: pz, heading, scale: 1 });
        else if (roll < 0.36) kinds.bin.push({ x: px, y, z: pz, heading, scale: 1 });
        else if (roll < 0.52) kinds.planter.push({ x: px, y, z: pz, heading, scale: rng.range(0.9, 1.15), flowers: rng.bool(0.6) });
        else if (roll < 0.60) {
          kinds.sign.push({ x: px, y, z: pz, heading, scale: 1 });
          kinds.plate_speed.push({ x: px, y, z: pz, heading, scale: 1 });
        }
        // verge planting behind the pavement
        if (rng.float() < 0.45) {
          const vx = s.x + nx * sgn * (vergeOff + rng.range(-0.8, 1.6));
          const vz = s.z + nz * sgn * (vergeOff + rng.range(-0.8, 1.6));
          if (!T.isWater(vx, vz) && clearOf(vx, vz) && (!roadDist || roadDist.at(vx, vz) > 1)) {
            const gy = T.getHeight(vx, vz);
            if (rng.float() < 0.45) trees.push(makeTree(rng, rng.weighted([['oak', 5], ['birch', 4], ['pine', 1]]), vx, gy, vz, 'street', 0.62));
            else kinds.bush.push({ x: vx, y: gy, z: vz, heading: rng.float() * 6.28, scale: rng.range(0.85, 1.5) });
          }
        }
      }
      hydrantAcc += step;
      if (hydrantAcc > 78) {
        hydrantAcc = 0;
        const s = R.sample(e.id, d / len);
        if (s) {
          const nx = -s.tangent.z, nz = s.tangent.x;
          const sgn = rng.bool() ? 1 : -1;
          kinds.hydrant.push({ x: s.x + nx * sgn * (T4.asphaltHalf + T4.sidewalk * 0.82), y: s.y + SIDEWALK_Y, z: s.z + nz * sgn * (T4.asphaltHalf + T4.sidewalk * 0.82), heading: Math.atan2(-nx * sgn, nz * sgn), scale: 1 });
        }
      }
      stopAcc += step;
    }

    // stop / street-name signs on the approaches of unsignalised junctions
    for (const [node, atA] of [[e.a, true], [e.b, false]]) {
      if (signalNodes.has(node)) continue;
      const info = R.nodes.get(node);
      if (!info || info.edges.size < 3) continue;
      const dAlong = atA ? (e.trimA || 0) + 4.5 : len - (e.trimB || 0) - 4.5;
      const s = R.sample(e.id, dAlong / len);
      if (!s) continue;
      const nx = -s.tangent.z, nz = s.tangent.x;
      const sgn = atA ? 1 : -1;                 // outer kerb on the approach side
      const px = s.x + nx * sgn * (T4.asphaltHalf + T4.sidewalk * 0.65);
      const pz = s.z + nz * sgn * (T4.asphaltHalf + T4.sidewalk * 0.65);
      const face = atA ? 1 : -1;
      const heading = Math.atan2(s.tangent.x * face, -s.tangent.z * face);
      kinds.sign.push({ x: px, y: s.y + SIDEWALK_Y, z: pz, heading, scale: 1 });
      if (rng.bool(0.5)) kinds.plate_stop.push({ x: px, y: s.y + SIDEWALK_Y, z: pz, heading, scale: 1 });
      else kinds.plate_street.push({ x: px, y: s.y + SIDEWALK_Y, z: pz, heading, scale: 1 });
    }

    // bus stops on the longer through-roads
    if ((e.type === 'street' || e.type === 'avenue') && len > 66 && rng.bool(0.38)) {
      const d = len * 0.42;
      const s = R.sample(e.id, d / len);
      if (s) {
        const nx = -s.tangent.z, nz = s.tangent.x;
        const sgn = 1;
        const off = T4.asphaltHalf + T4.sidewalk + 1.35;
        const px = s.x + nx * sgn * off, pz = s.z + nz * sgn * off;
        if (!T.isWater(px, pz)) {
          const heading = Math.atan2(-nx * sgn, nz * sgn);
          const y = T.getHeight(px, pz) + VERGE_Y;
          kinds.bus_stop.push({ x: px, y, z: pz, heading, scale: 1 });
          kinds.glass.push({ x: px, y, z: pz, heading, scale: 1 });
          const fx = s.x + nx * sgn * (T4.asphaltHalf + T4.sidewalk * 0.55), fz = s.z + nz * sgn * (T4.asphaltHalf + T4.sidewalk * 0.55);
          kinds.sign.push({ x: fx, y: s.y + SIDEWALK_Y, z: fz, heading, scale: 1 });
          kinds.plate_bus.push({ x: fx, y: s.y + SIDEWALK_Y, z: fz, heading, scale: 1 });
        }
      }
    }
  }
  return { kinds, trees };
}

// ---------------------------------------------------------------- gardens
/**
 * Garden planting on the strip behind the pavement (or on zoning lots when they exist):
 * hedges/fences along the frontage line, an ornamental tree or two and shrubs.
 */
export function placeGardens(ctx, roadDist, out) {
  const { world } = ctx;
  const R = world.roads;
  const T = world.terrain;
  const rng = ctx.rng.fork('gardens');
  const lots = world.zones?.lots;
  const push = (arr, o) => arr.push(o);
  const addRow = (x0, z0, dirX, dirZ, length, y0, kindArr, spacing, jitter) => {
    const n = Math.max(1, Math.round(length / spacing));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = x0 + dirX * length * t + rng.range(-jitter, jitter);
      const z = z0 + dirZ * length * t + rng.range(-jitter, jitter);
      if (T.isWater(x, z) || (roadDist && roadDist.at(x, z) < 3)) continue;
      push(kindArr, { x, y: T.getHeight(x, z), z, heading: Math.atan2(dirX, -dirZ), scale: rng.range(0.9, 1.15) });
    }
  };

  if (lots && lots.size) {
    for (const lot of lots.values()) {
      if (lot.type !== 'residential') continue;
      const c = Math.cos(lot.heading), s = Math.sin(lot.heading);
      const front = lot.d * 0.5 - 1.6;
      addRow(lot.x - c * lot.w * 0.42 - s * front, lot.z + s * lot.w * 0.42 - c * front, c, -s, lot.w * 0.84, 0, out.kinds.fence, 2.0, 0.05);
      for (let i = 0; i < 2; i++) {
        const ox = rng.range(-0.32, 0.32) * lot.w, oz = rng.range(-0.2, 0.32) * lot.d;
        const x = lot.x + c * ox - s * oz, z = lot.z - s * ox - c * oz;
        if (T.isWater(x, z)) continue;
        out.trees.push(makeTree(rng, rng.weighted([['oak', 5], ['birch', 5], ['pine', 2]]), x, T.getHeight(x, z), z, 'garden', 0.58));
      }
    }
    return out;
  }

  // no zoning yet: green the block interiors on a jittered grid keyed off the distance to the
  // nearest kerb, so the built-up area reads as a leafy suburb instead of mown lawn.
  const half = world.size / 2;
  const step = 7.0;
  const n = Math.floor((world.size - 60) / step);
  for (let jz = 0; jz < n; jz++) for (let jx = 0; jx < n; jx++) {
    const x = -half + 30 + jx * step + rng.range(-step * 0.45, step * 0.45);
    const z = -half + 30 + jz * step + rng.range(-step * 0.45, step * 0.45);
    const rd = roadDist ? roadDist.at(x, z) : 1e6;
    if (rd < 4.5 || rd > 52) continue;
    if (!clearOf(x, z)) continue;
    if (T.isWater(x, z)) continue;
    if (T.getSlope(x, z) > 0.55) continue;
    const y = T.getHeight(x, z);
    if (y < 0.8) continue;
    // thin out right next to the kerb (that strip belongs to the pavement kit)
    const p = rd < 9 ? 0.12 : rd < 18 ? 0.62 : 0.82;
    if (rng.float() > p) continue;
    const roll = rng.float();
    if (roll < 0.42) out.trees.push(makeTree(rng, rng.weighted([['oak', 6], ['birch', 5], ['pine', 3]]), x, y, z, 'garden', rd < 14 ? 0.62 : 0.78));
    else if (roll < 0.62) out.kinds.hedge.push({ x, y, z, heading: rng.float() * 6.28, scale: rng.range(0.9, 1.5) });
    else if (roll < 0.88) out.kinds.bush.push({ x, y, z, heading: rng.float() * 6.28, scale: rng.range(0.8, 1.7) });
    else out.kinds.flowers.push({ x, y, z, heading: rng.float() * 6.28, scale: rng.range(0.8, 1.5) });
  }
  // picket fence runs along the front of some block faces
  for (const e of R.edges.values()) {
    if (e.type !== 'street' && e.type !== 'alley') continue;
    const Ty = R.types[e.type] || R.types.street;
    if (!Ty.sidewalk) continue;
    const len = e.length;
    const from = (e.trimA || 0) + 8, to = len - (e.trimB || 0) - 8;
    if (to - from < 24) continue;
    for (const sgn of [1, -1]) {
      if (!rng.bool(0.45)) continue;
      const offF = Ty.asphaltHalf + Ty.sidewalk + 2.4;
      const d0 = from + rng.range(0, 12), d1 = Math.min(to, d0 + rng.range(24, 70));
      for (let d = d0; d < d1; d += 2.0) {
        const sm = R.sample(e.id, d / len);
        if (!sm) continue;
        const nx = -sm.tangent.z, nz = sm.tangent.x;
        const x = sm.x + nx * sgn * offF, z = sm.z + nz * sgn * offF;
        if (T.isWater(x, z)) continue;
        out.kinds.fence.push({ x, y: T.getHeight(x, z), z, heading: Math.atan2(sm.tangent.x, -sm.tangent.z), scale: 1 });
      }
    }
  }
  return out;
}
