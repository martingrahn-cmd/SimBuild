// Road geometry builder: node (intersection) analysis with corner fillets/mitres, terrain-conforming height
// profiles, cut/fill terrain flattening, per-tile merged meshes: asphalt strips + intersection polygons,
// kerbs/sidewalks, gravel embankment skirts, bridge decks/parapets/piers, highway median barriers,
// decal markings (crosswalks, stop lines, turn arrows). Also derives lamp positions and the intersection list.
import * as THREE from 'three';
import { LAYERS } from '../../core/constants.js';

const TILE = 512;
const ROW = 4;               // metres between rows along an edge
const ROAD_LIFT = 0.03;      // asphalt above the flattened terrain
const KERB_H = 0.15;
const SW_H = 0.16;
const BRIDGE_CLEAR = 4.2;    // deck height above sea level over water
const BRIDGE_MIN = 2.4;      // road-above-terrain height at which a deck replaces an embankment
const PLATEAU = 24;          // minimum metres over which an arm blends from the node height to the terrain profile
const DECK_DEPTH = 1.5;
const PIER_SPACING = 24;

const KERB_COL = [0.74, 0.74, 0.72];
const SW_COL = [0.84, 0.84, 0.82];
const BARRIER_COL = [1.05, 1.05, 1.03];
const DECK_COL = [0.98, 0.97, 0.95];
const PIER_COL = [0.9, 0.9, 0.88];
const PAINT_WHITE = [0.93, 0.92, 0.87];
const PAINT_YELLOW = [0.95, 0.76, 0.22];

const ACCEL_LEN = 120;       // acceleration / deceleration lane taper length
const MERGE_LEN = 90;        // ramp narrowing zone before it joins the highway

/** Pack per-vertex road flags (decoded in materials.js). Float32 keeps ints exact below 2^24. */
export function packFlags({ oneWay = false, hw = false, dbl = false, noLineL = false, noLineR = false, lanes = 0, ext = 0, extLeft = false }) {
  return (oneWay ? 1 : 0) | (hw ? 2 : 0) | (dbl ? 4 : 0) | (noLineL ? 8 : 0) | (noLineR ? 16 : 0) | ((lanes & 15) << 5)
    | ((Math.max(0, Math.min(255, Math.round(ext * 32)))) << 9) | (extLeft ? 1 << 17 : 0);
}
function smooth01(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

/** Growable geometry accumulator with a fixed attribute layout (pos, nrm, uv, color, aRoad). */
class Acc {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.road = []; this.idx = []; this.n = 0; }
  v(x, y, z, nx, ny, nz, u, v, col = SW_COL, r0 = 0, r1 = 0, r2 = 0, r3 = 0) {
    this.pos.push(x, y, z); this.nrm.push(nx, ny, nz); this.uv.push(u, v);
    this.col.push(col[0], col[1], col[2]); this.road.push(r0, r1, r2, r3);
    return this.n++;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  /** quad whose winding is fixed so its face normal agrees with vertex a's stored normal */
  quadN(a, b, c, d) {
    const p = this.pos, nr = this.nrm;
    const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2];
    const bx = p[b * 3] - ax, by = p[b * 3 + 1] - ay, bz = p[b * 3 + 2] - az;
    const cx = p[c * 3] - ax, cy = p[c * 3 + 1] - ay, cz = p[c * 3 + 2] - az;
    const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
    const dot = nx * nr[a * 3] + ny * nr[a * 3 + 1] + nz * nr[a * 3 + 2];
    if (dot >= 0) this.idx.push(a, b, c, a, c, d); else this.idx.push(a, c, b, a, d, c);
  }
  get empty() { return this.idx.length === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aRoad', new THREE.Float32BufferAttribute(this.road, 4));
    g.setIndex(this.n > 65000 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

function norm2(x, z) { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; }
function lineIntersect(p, d, q, e) {
  // p + d*t = q + e*s ; returns t or null when parallel
  const den = d.x * e.z - d.z * e.x;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / den;
  return t;
}

export class RoadBuilder {
  constructor(net, world, mats, group, log) {
    this.net = net; this.world = world; this.mats = mats; this.group = group; this.log = log;
    this.meshes = [];
    this.nodeInfo = new Map();
    this.stats = { edges: 0, nodes: 0, tris: 0, meshes: 0, bridges: 0, flattenCalls: 0, ms: 0 };
    this.flattening = false;
    this.tiles = new Map();
  }

  dispose() {
    for (const m of this.meshes) { this.group.remove(m); m.geometry.dispose(); }
    this.meshes = [];
    this.tiles.clear();
  }

  // ------------------------------------------------------------------ orchestration
  rebuild() {
    const t0 = performance.now();
    this.dispose();
    const net = this.net;
    for (const e of net.edges.values()) if (!net.cache.has(e.id)) net._samplePolyline(e);
    this.nodeInfo.clear();
    let bridges = 0;
    for (const n of net.nodes.values()) this.analyseNode(n);
    for (const e of net.edges.values()) this.profileSmooth(e);
    this.nodeHeights();
    for (const e of net.edges.values()) { this.profileBlend(e); if (e.bridge) bridges++; }
    this.flattenTerrain();
    this.buildCoverage();
    // re-sample terrain under skirts after flattening, then emit geometry
    for (const e of net.edges.values()) this.emitEdge(e);
    for (const n of net.nodes.values()) this.emitNode(n);
    let tris = 0, meshes = 0;
    for (const [key, tile] of this.tiles) {
      for (const [name, acc] of Object.entries(tile)) {
        if (acc.empty) continue;
        const geo = acc.build();
        const mesh = new THREE.Mesh(geo, this.mats[name]);
        mesh.name = `roads/${name}/${key}`;
        mesh.renderOrder = this.mats.order[name];
        mesh.castShadow = name === 'concrete';
        mesh.receiveShadow = true;
        mesh.layers.enable(LAYERS.ROADS);
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        this.group.add(mesh);
        this.meshes.push(mesh);
        tris += acc.idx.length / 3; meshes++;
      }
    }
    this.tiles.clear();
    this.stats.edges = net.edges.size; this.stats.nodes = net.nodes.size; this.stats.tris = tris; this.stats.meshes = meshes;
    this.stats.bridges = bridges; this.stats.ms = performance.now() - t0;
    net.dirty = false;
  }

  acc(name, x, z) {
    const key = `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;
    let tile = this.tiles.get(key);
    if (!tile) { tile = { asphalt: new Acc(), concrete: new Acc(), gravel: new Acc(), paint: new Acc() }; this.tiles.set(key, tile); }
    return tile[name];
  }

  // ------------------------------------------------------------------ node analysis
  analyseNode(n) {
    const net = this.net;
    const T = this.world.terrain;
    const arms = [];
    for (const eid of n.edges) {
      const e = net.edges.get(eid);
      if (!e) continue;
      const d = net.dirFrom(e, n.id);
      const Ty = net.typeOf(e.type);
      arms.push({ e, d, s: { x: -d.z, z: d.x }, T: Ty, wa: Ty.asphaltHalf, sw: Ty.sidewalk, r: Ty.cornerR, ang: Math.atan2(d.z, d.x), trim: 0, atA: e.a === n.id });
    }
    arms.sort((a, b) => a.ang - b.ang);
    const info = { node: n, arms, kind: 'end', corners: [], mitre: null };
    this.nodeInfo.set(n.id, info);
    if (arms.length === 0) { info.kind = 'isolated'; return; }
    if (arms.length === 1) { info.kind = 'end'; return; }
    if (arms.length === 2) {
      const gap = ((arms[1].ang - arms[0].ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const bend = Math.abs(Math.PI - gap);
      if (bend < 0.42 && Math.abs(arms[0].wa - arms[1].wa) < 0.01 && Math.abs(arms[0].sw - arms[1].sw) < 0.01) {
        info.kind = 'joint';
        // shared mitre cross-section: perpendicular to the through direction, scaled to keep the width
        const t = norm2(arms[1].d.x - arms[0].d.x, arms[1].d.z - arms[0].d.z);
        info.mitre = { nx: -t.z, nz: t.x, scale: 1 / Math.max(0.5, Math.cos(bend / 2)) };
        return;
      }
    }
    if (arms.length === 3) {
      const ramp = arms.find((a) => a.T.oneWay && a.e.lanes === 1);
      const hws = arms.filter((a) => a !== ramp);
      if (ramp && hws[0].e.type === hws[1].e.type && !hws[0].T.oneWay) {
        const g = Math.abs(hws[0].d.x * hws[1].d.x + hws[0].d.z * hws[1].d.z);
        // the ramp arrives (or leaves) nearly parallel to one of the highway arms
        const par = hws.map((h) => h.d.x * ramp.d.x + h.d.z * ramp.d.z);
        const iR = par[0] > par[1] ? 0 : 1;
        if (g > 0.8 && par[iR] > 0.75 && this.setupMerge(info, ramp, hws[iR], hws[1 - iR])) return;
      }
    }
    info.kind = 'intersection';
    const m = arms.length;
    for (let i = 0; i < m; i++) {
      const A = arms[i], B = arms[(i + 1) % m];
      const gap = m === 1 ? Math.PI * 2 : (((B.ang - A.ang) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const corner = { i, j: (i + 1) % m, A, B, gap, kind: 'flat', C: null, r: 0, k: 0, center: null, tA: 0, tB: 0 };
      // side lines: A's +s side and B's -s side
      const pA = { x: n.x + A.s.x * A.wa, z: n.z + A.s.z * A.wa };
      const pB = { x: n.x - B.s.x * B.wa, z: n.z - B.s.z * B.wa };
      const tI = lineIntersect(pA, A.d, pB, B.d);
      let C = null;
      if (tI !== null) {
        C = { x: pA.x + A.d.x * tI, z: pA.z + A.d.z * tI };
        const far = Math.hypot(C.x - n.x, C.z - n.z);
        if (far > 4 * Math.max(A.wa, B.wa) + 12) C = null;
      }
      if (gap < Math.PI - 0.05 && C) {
        // convex corner: fillet
        let r = Math.min(A.r, B.r);
        const half = gap / 2;
        const kMax = 14;
        r = Math.min(r, kMax * Math.tan(half));
        const k = r / Math.tan(half);
        const bis = norm2(A.d.x + B.d.x, A.d.z + B.d.z);
        const cd = r / Math.sin(half);
        corner.kind = 'fillet'; corner.C = C; corner.r = r; corner.k = k;
        corner.center = { x: C.x + bis.x * cd, z: C.z + bis.z * cd };
        corner.tA = (C.x - n.x) * A.d.x + (C.z - n.z) * A.d.z + k;
        corner.tB = (C.x - n.x) * B.d.x + (C.z - n.z) * B.d.z + k;
      } else if (C && Math.abs(Math.sin(gap)) > 0.12) {
        corner.kind = 'mitre'; corner.C = C;
        corner.tA = Math.max(0, (C.x - n.x) * A.d.x + (C.z - n.z) * A.d.z);
        corner.tB = Math.max(0, (C.x - n.x) * B.d.x + (C.z - n.z) * B.d.z);
      } else {
        corner.kind = 'flat'; corner.C = { x: (pA.x + pB.x) / 2, z: (pA.z + pB.z) / 2 };
      }
      info.corners.push(corner);
    }
    for (const c of info.corners) { c.A.trim = Math.max(c.A.trim, c.tA); c.B.trim = Math.max(c.B.trim, c.tB); }
    for (const a of arms) a.trim = Math.max(a.trim, a.wa * 0.4) + 0.4;
    for (const a of arms) { if (a.atA) a.e.trimA = a.trim; else a.e.trimB = a.trim; }
  }

  /**
   * Ramp merging into / diverging from a dual carriageway: the highway arms stay continuous (mitre joint),
   * the arm O (opposite to the ramp's approach) gets an acceleration/deceleration lane tapering over
   * ACCEL_LEN, and the ramp is pushed sideways so that it runs alongside arm R, narrowing to one lane.
   */
  setupMerge(info, ramp, R, O) {
    const n = info.node, net = this.net;
    const c = net.poly(ramp.e.id);
    if (!c || c.len < MERGE_LEN + 20) return false;
    info.kind = 'merge';
    const t = norm2(O.d.x - R.d.x, O.d.z - R.d.z);
    const bend = Math.acos(Math.max(-1, Math.min(1, -(R.d.x * O.d.x + R.d.z * O.d.z))));
    info.mitre = { nx: -t.z, nz: t.x, scale: 1 / Math.max(0.5, Math.cos(bend / 2)) };
    // side of the highway axis the ramp lies on (sampled well before the node)
    const atEnd = ramp.atA === false;
    const probeD = atEnd ? Math.max(0, c.len - 60) : Math.min(c.len, 60);
    const o = net.sampleAt(ramp.e.id, probeD, {});
    const sAxis = { x: -R.d.z, z: R.d.x }; // perpendicular to arm R's direction
    const sideSign = ((o.x - n.x) * sAxis.x + (o.z - n.z) * sAxis.z) >= 0 ? 1 : -1;
    const sOut = { x: sAxis.x * sideSign, z: sAxis.z * sideSign };
    const TyH = R.T, TyR = ramp.T;
    const per = Math.max(1, Math.floor(R.e.lanes / 2));
    const usable = TyH.asphaltHalf - TyH.shoulder - TyH.median / 2;
    const lw = usable / per;
    const ext = lw + TyH.shoulder;
    // O's edge: extra lane on the ramp's side, from the node
    const oRight = O.atA ? O.s : { x: -O.s.x, z: -O.s.z };
    O.e.accel = { atA: O.atA, ext, side: (oRight.x * sOut.x + oRight.z * sOut.z) >= 0 ? 1 : -1, L: ACCEL_LEN };
    // R's edge: no kerb on the ramp side over the merge zone
    const rRight = R.atA ? R.s : { x: -R.s.x, z: -R.s.z };
    R.e.noKerb = { atA: R.atA, side: (rRight.x * sOut.x + rRight.z * sOut.z) >= 0 ? 1 : -1, L: MERGE_LEN };
    // ramp: push outward so its inner edge hugs the highway edge; width tapers to the accel lane width
    const halfAt = (dFromNode) => TyR.asphaltHalf + (ext / 2 - TyR.asphaltHalf) * (1 - smooth01(dFromNode / MERGE_LEN));
    const shoulderAt = (dFromNode) => TyR.shoulder + (TyH.shoulder - TyR.shoulder) * (1 - smooth01(dFromNode / MERGE_LEN));
    for (let i = 0; i < c.n; i++) {
      const dFromNode = atEnd ? c.len - c.s[i] : c.s[i];
      if (dFromNode > MERGE_LEN + 60) continue;
      const lateral = (c.xs[i] - n.x) * sOut.x + (c.zs[i] - n.z) * sOut.z;
      const need = TyH.asphaltHalf + halfAt(dFromNode);
      const shift = Math.max(0, need - lateral);
      c.xs[i] += sOut.x * shift; c.zs[i] += sOut.z * shift;
    }
    // re-derive arc length + tangents after the shift
    c.s[0] = 0;
    for (let i = 1; i < c.n; i++) c.s[i] = c.s[i - 1] + Math.hypot(c.xs[i] - c.xs[i - 1], c.zs[i] - c.zs[i - 1]);
    c.len = c.s[c.n - 1]; ramp.e.length = c.len;
    for (let i = 0; i < c.n; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(c.n - 1, i + 1);
      const dx = c.xs[i1] - c.xs[i0], dz = c.zs[i1] - c.zs[i0]; const l = Math.hypot(dx, dz) || 1;
      c.tx[i] = dx / l; c.tz[i] = dz / l;
    }
    // ramp's right-hand side in its a->b direction: travel direction is -d when the ramp ends here, +d otherwise
    const rt = atEnd ? { x: ramp.d.z, z: -ramp.d.x } : { x: -ramp.d.z, z: ramp.d.x };
    const rightIsOut = (rt.x * sOut.x + rt.z * sOut.z) > 0;
    ramp.e.merge = { atEnd, node: n, sOut, halfAt, shoulderAt, innerSide: rightIsOut ? -1 : 1, ext };
    return true;
  }

  armOf(info, e) { return info.arms.find((a) => a.e === e); }

  // ------------------------------------------------------------------ height profile
  profileSmooth(e) {
    const net = this.net, T = this.world.terrain;
    const c = net.poly(e.id);
    const iA = this.nodeInfo.get(e.a), iB = this.nodeInfo.get(e.b);
    if (iA.kind !== 'intersection') e.trimA = 0;
    if (iB.kind !== 'intersection') e.trimB = 0;
    const n = c.n;
    const raw = new Float64Array(n);
    let anyWater = false;
    for (let i = 0; i < n; i++) {
      const h = T.getHeight(c.xs[i], c.zs[i]);
      c.terrain[i] = h;
      const w = T.isWater(c.xs[i], c.zs[i]);
      c.water[i] = w ? 1 : 0;
      if (w) anyWater = true;
      raw[i] = w ? Math.max(h, T.seaLevel + BRIDGE_CLEAR + 1.6) : h;
    }
    // triangular moving average over +-W metres (arc-length aware)
    const W = anyWater ? 75 : 30;
    if (!c.smooth) c.smooth = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0, wsum = 0;
      for (let j = 0; j < n; j++) {
        const d = Math.abs(c.s[j] - c.s[i]);
        if (d > W) continue;
        const w = 1 - d / W;
        sum += raw[j] * w; wsum += w;
      }
      c.smooth[i] = wsum > 0 ? sum / wsum : raw[i];
    }
    for (let i = 0; i < n; i++) if (c.water[i] && c.terrain[i] < T.seaLevel - 1.5) c.smooth[i] = Math.max(c.smooth[i], T.seaLevel + BRIDGE_CLEAR * 0.8);
  }

  /** Node height = mean of the incident edges' smoothed profiles at the node (keeps arms free of kinks). */
  nodeHeights() {
    const T = this.world.terrain;
    for (const info of this.nodeInfo.values()) {
      const n = info.node;
      if (!info.arms.length) continue;
      let sum = 0;
      for (const a of info.arms) { const c = this.net.poly(a.e.id); sum += a.atA ? c.smooth[0] : c.smooth[c.n - 1]; }
      let y = sum / info.arms.length;
      if (T.isWater(n.x, n.z)) y = Math.max(y, T.seaLevel + BRIDGE_CLEAR);
      n.y = y;
    }
  }

  profileBlend(e) {
    const net = this.net, T = this.world.terrain;
    const c = net.poly(e.id);
    const nA = net.nodes.get(e.a), nB = net.nodes.get(e.b);
    const n = c.n, len = c.len;
    const yA = nA.y, yB = nB.y;
    const L = Math.max(PLATEAU, Math.min(len * 0.45, 40));
    for (let i = 0; i < n; i++) {
      const s = c.s[i];
      let y = c.smooth[i];
      const kA = Math.min(1, Math.max(0, (s - e.trimA) / L));
      const kB = Math.min(1, Math.max(0, (len - e.trimB - s) / L));
      const smoothA = kA * kA * (3 - 2 * kA), smoothB = kB * kB * (3 - 2 * kB);
      y = yA + (y - yA) * smoothA;
      y = yB + (y - yB) * smoothB;
      c.ys[i] = y;
    }
    e.bridge = false;
    for (let i = 0; i < n; i++) {
      const b = c.water[i] || (c.ys[i] - c.terrain[i] > BRIDGE_MIN);
      c.bridge[i] = b ? 1 : 0;
      if (b) e.bridge = true;
    }
    e.elevation = e.bridge ? 1 : 0;
  }

  /** Coverage mask on the terrain grid (0 = none, 1 = asphalt, 2 = sidewalk/verge) for other modules. */
  buildCoverage() {
    const T = this.world.terrain;
    const cell = T.cellSize || 4;
    const res = Math.round(this.world.size / cell);
    const half = this.world.size / 2;
    const R = this.world.roads;
    if (!R.coverage || R.coverage.res !== res) R.coverage = { res, cell, data: new Uint8Array(res * res), version: 0 };
    const data = R.coverage.data;
    data.fill(0);
    const mark = (x, z, v) => {
      const ix = Math.floor((x + half) / cell), iz = Math.floor((z + half) / cell);
      if (ix < 0 || iz < 0 || ix >= res || iz >= res) return;
      const i = iz * res + ix;
      if (v === 1 || data[i] === 0) data[i] = v;
    };
    const o = {};
    for (const e of this.net.edges.values()) {
      const c = this.net.poly(e.id);
      const Ty = this.net.typeOf(e.type);
      const wa = Ty.asphaltHalf, wo = wa + Ty.sidewalk + 1.0;
      for (let d = 0; d <= c.len + 0.01; d += cell * 0.5) {
        const dd = Math.min(d, c.len);
        this.net.sampleAt(e.id, dd, o);
        const nx = -o.tz, nz = o.tx;
        for (let u = -wo; u <= wo; u += cell * 0.5) mark(o.x + nx * u, o.z + nz * u, Math.abs(u) <= wa ? 1 : 2);
        if (dd >= c.len) break;
      }
    }
    for (const info of this.nodeInfo.values()) {
      const n = info.node;
      let reach = 0;
      for (const a of info.arms) reach = Math.max(reach, a.trim + a.wa + a.sw + 1);
      for (let dz = -reach; dz <= reach; dz += cell * 0.5) for (let dx = -reach; dx <= reach; dx += cell * 0.5) {
        if (dx * dx + dz * dz > reach * reach) continue;
        mark(n.x + dx, n.z + dz, 2);
      }
    }
    R.coverage.version++;
    R.isRoad = (x, z) => {
      const ix = Math.floor((x + half) / cell), iz = Math.floor((z + half) / cell);
      if (ix < 0 || iz < 0 || ix >= res || iz >= res) return 0;
      return data[iz * res + ix];
    };
  }

  // ------------------------------------------------------------------ terrain cut/fill
  flattenTerrain() {
    const T = this.world.terrain;
    if (typeof T.modify !== 'function' || !T.heights) return;
    this.flattening = true;
    let calls = 0;
    const cell = T.cellSize || 4;
    const BR = cell * 1.5;          // brush radius: fully flattened within 0.6 * BR = 0.9 cell
    const DROP = 0.3;               // terrain sits this far below the road surface (covers bilinear error on grades)
    try {
      for (const info of this.nodeInfo.values()) {
        if (info.kind === 'isolated') continue;
        const n = info.node;
        if (T.getHeight(n.x, n.z) < T.seaLevel + 0.3 && n.y - T.getHeight(n.x, n.z) > 2) continue;
        let reach = 0;
        for (const a of info.arms) reach = Math.max(reach, a.trim + a.wa + a.sw);
        T.modify({ x: n.x, z: n.z, radius: (reach + 3) / 0.6, strength: 3, mode: 'flatten', target: n.y - DROP });
        calls++;
      }
      const o = {};
      for (const e of this.net.edges.values()) {
        const c = this.net.poly(e.id);
        const Ty = this.net.typeOf(e.type);
        const half = Ty.asphaltHalf + Ty.sidewalk + 1.6;
        const from = e.trimA, to = c.len - e.trimB;
        const nLat = Math.max(1, Math.ceil(half * 2 / cell));
        for (let d = from; d <= to + 0.01; d += cell) {
          const dd = Math.min(d, to);
          this.net.sampleAt(e.id, dd, o);
          let lo = 0, hi = c.n - 1;
          while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c.s[mid] <= dd) lo = mid; else hi = mid; }
          if (c.bridge[lo] && c.bridge[hi]) { if (dd >= to) break; continue; }
          const nx = -o.tz, nz = o.tx;
          let extL = 0, extR = 0;
          if (e.accel) { const dist = e.accel.atA ? dd : c.len - dd; const ext = e.accel.ext * (1 - smooth01(dist / e.accel.L)); if (e.accel.side > 0) extR = ext; else extL = ext; }
          for (let k = 0; k <= nLat; k++) {
            const u = -half - extL + (half * 2 + extL + extR) * (k / nLat);
            const px = o.x + nx * u, pz = o.z + nz * u;
            const th = T.getHeight(px, pz);
            // never fill water or raise a sea bed: decks / embankment skirts handle those
            if (th < T.seaLevel + 0.3 && o.y - th > 2.5) continue;
            if (Math.abs(th - (o.y - DROP)) < 0.04) continue;
            T.modify({ x: px, z: pz, radius: BR, strength: 3, mode: 'flatten', target: o.y - DROP });
            calls++;
          }
          if (dd >= to) break;
        }
      }
    } finally { this.flattening = false; }
    this.stats.flattenCalls = calls;
  }

  // ------------------------------------------------------------------ edge strips
  emitEdge(e) {
    const net = this.net, T = this.world.terrain;
    const c = net.poly(e.id);
    const Ty = net.typeOf(e.type);
    const iA = this.nodeInfo.get(e.a), iB = this.nodeInfo.get(e.b);
    const nA = net.nodes.get(e.a), nB = net.nodes.get(e.b);
    const from = e.trimA, to = c.len - e.trimB;
    if (to - from < 0.5) return;
    // row distances
    const ds = [from];
    for (let d = Math.ceil(from / ROW) * ROW; d < to - 0.5; d += ROW) if (d > from + 0.5) ds.push(d);
    ds.push(to);
    const rows = [];
    const o = {};
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      net.sampleAt(e.id, d, o);
      let x = o.x, z = o.z, nx = -o.tz, nz = o.tx, scale = 1;
      if (i === 0) {
        if (iA.kind === 'intersection') { const a = this.armOf(iA, e); x = nA.x + a.d.x * a.trim; z = nA.z + a.d.z * a.trim; nx = a.s.x; nz = a.s.z; }
        else if ((iA.kind === 'joint' || iA.kind === 'merge') && !e.merge) { const m = iA.mitre; const sgn = (m.nx * nx + m.nz * nz) >= 0 ? 1 : -1; nx = m.nx * sgn; nz = m.nz * sgn; scale = m.scale; x = nA.x; z = nA.z; }
      } else if (i === ds.length - 1) {
        if (iB.kind === 'intersection') { const a = this.armOf(iB, e); x = nB.x + a.d.x * a.trim; z = nB.z + a.d.z * a.trim; nx = -a.s.x; nz = -a.s.z; }
        else if ((iB.kind === 'joint' || iB.kind === 'merge') && !e.merge) { const m = iB.mitre; const sgn = (m.nx * nx + m.nz * nz) >= 0 ? 1 : -1; nx = m.nx * sgn; nz = m.nz * sgn; scale = m.scale; x = nB.x; z = nB.z; }
      }
      // bridge flag at this distance
      let lo = 0, hi = c.n - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c.s[mid] <= d) lo = mid; else hi = mid; }
      const kk = (d - c.s[lo]) / ((c.s[hi] - c.s[lo]) || 1);
      const terr = c.terrain[lo] + (c.terrain[hi] - c.terrain[lo]) * kk;
      const bridge = (kk < 0.5 ? c.bridge[lo] : c.bridge[hi]) === 1;
      const dEndA = iA.kind === 'intersection' || iA.kind === 'end' ? d - from : 1e4;
      const dEndB = iB.kind === 'intersection' || iB.kind === 'end' ? to - d : 1e4;
      const row = { x, y: o.y, z, nx, nz, scale, d, terr, bridge, water: (kk < 0.5 ? c.water[lo] : c.water[hi]) === 1, dEnd: Math.min(dEndA, dEndB), tx: o.tx, tz: o.tz, wL: Ty.asphaltHalf, wR: Ty.asphaltHalf, sideL: true, sideR: true, road: null };
      // acceleration / deceleration lane (highway arm opposite a ramp)
      if (e.accel) {
        const dist = e.accel.atA ? d : c.len - d;
        const ext = e.accel.ext * (1 - smooth01(dist / e.accel.L));
        if (ext > 0.02) {
          if (e.accel.side > 0) row.wR = Ty.asphaltHalf + ext; else row.wL = Ty.asphaltHalf + ext;
          row.ext = ext; row.extLeft = e.accel.side < 0;
        }
      }
      if (e.noKerb) {
        const dist = e.noKerb.atA ? d : c.len - d;
        if (dist < e.noKerb.L + 0.5) { if (e.noKerb.side > 0) row.sideR = false; else row.sideL = false; }
      }
      // ramp merge zone: narrows to one lane, no kerb on the highway side, shoulder blends to the highway's
      if (e.merge) {
        const M = e.merge;
        const dist = M.atEnd ? c.len - d : d;
        if (dist < MERGE_LEN + 0.5) {
          const h = M.halfAt(dist);
          row.wL = h; row.wR = h;
          if (M.innerSide > 0) row.sideR = false; else row.sideL = false;
          row.road = { wa: h, y: M.shoulderAt(dist), flags: packFlags({ oneWay: true, lanes: 1, noLineL: M.innerSide < 0, noLineR: M.innerSide > 0 }), dEnd: 1e4 };
        }
      }
      rows.push(row);
    }
    const mid = rows[rows.length >> 1];
    this.emitStrip(rows, Ty, e, mid.x, mid.z, Ty.asphaltHalf);
  }

  /**
   * Emit the full cross-section along `rows`. base = lateral offset where the sidewalk profile starts
   * (asphaltHalf for edges; 0 for intersection corner paths, which carry only the sidewalk side). When
   * `asphalt` is true the asphalt surface between -base..+base is emitted with lane data.
   */
  emitStrip(rows, Ty, e, tileX, tileZ, base, opts = {}) {
    const T = this.world.terrain;
    const asphaltAcc = this.acc('asphalt', tileX, tileZ);
    const conc = this.acc('concrete', tileX, tileZ);
    const grav = this.acc('gravel', tileX, tileZ);
    const sides = opts.sides || [1, -1];
    const withAsphalt = opts.asphalt !== false;
    const nR = rows.length;
    // 3D tangent per row (for slope-aware normals)
    for (let i = 0; i < nR; i++) {
      const r0 = rows[Math.max(0, i - 1)], r1 = rows[Math.min(nR - 1, i + 1)];
      let fx = r1.x - r0.x, fy = r1.y - r0.y, fz = r1.z - r0.z;
      const l = Math.hypot(fx, fy, fz) || 1; rows[i].fx = fx / l; rows[i].fy = fy / l; rows[i].fz = fz / l;
      if (opts.pathTangent) { rows[i].fx = rows[i].tx; rows[i].fz = rows[i].tz; rows[i].fy = 0; }
    }
    const baseFlags = { oneWay: !!(e && e.oneWay), hw: Ty.median > 0, dbl: Ty.lanes >= 4 && Ty.median === 0, lanes: e ? e.lanes : 0 };
    const flags0 = packFlags(baseFlags);
    const laneW = (e && e.oneWay) ? Ty.shoulder : Ty.laneW;   // one-way roads carry their shoulder in .y
    const wa = base;
    // ---- asphalt surface
    if (withAsphalt) {
      const ids = new Array(nR);
      for (let i = 0; i < nR; i++) {
        const r = rows[i];
        const rx = r.nx * r.scale, rz = r.nz * r.scale;
        // up normal = cross(R, F)
        const ux = 0 * r.fz - rz * r.fy, uy = rz * r.fx - rx * r.fz, uz = rx * r.fy - 0 * r.fx;
        const ul = Math.hypot(ux, uy, uz) || 1;
        const y = r.y + ROAD_LIFT;
        const wL = r.wL ?? wa, wR = r.wR ?? wa;
        let rw = wa, ry = laneW, rf = flags0, rd = r.dEnd, uL = -wL, uR = wR;
        if (r.road) { rw = r.road.wa; ry = r.road.y; rf = r.road.flags; rd = r.road.dEnd; uL = -wL; uR = wR; }
        else if (r.ext) rf = packFlags({ ...baseFlags, ext: r.ext, extLeft: r.extLeft });
        const a = asphaltAcc.v(r.x - rx * wL, y, r.z - rz * wL, ux / ul, uy / ul, uz / ul, uL, r.d, SW_COL, rw, ry, rf, rd);
        const b = asphaltAcc.v(r.x + rx * wR, y, r.z + rz * wR, ux / ul, uy / ul, uz / ul, uR, r.d, SW_COL, rw, ry, rf, rd);
        ids[i] = [a, b];
      }
      for (let i = 1; i < nR; i++) asphaltAcc.quadN(ids[i - 1][0], ids[i][0], ids[i][1], ids[i - 1][1]);
    }
    // ---- side profiles
    for (const sgn of sides) {
      const sw = Ty.sidewalk;
      const swOf = (i) => (opts.swAt ? opts.swAt(i) : sw);
      // profile points from the asphalt edge outward: [du, dy, kind]
      const prof = (i) => {
        const s = swOf(i);
        if (s > 0.05) {
          return [
            { u: wa, y: 0, kind: 'kerbface' }, { u: wa + 0.05, y: KERB_H, kind: 'kerbface' },
            { u: wa + 0.05, y: KERB_H, kind: 'kerb' }, { u: wa + 0.38, y: SW_H, kind: 'kerb' },
            { u: wa + 0.38, y: SW_H, kind: 'sw' }, { u: wa + s, y: SW_H - 0.03, kind: 'sw' },
            { u: wa + s, y: SW_H - 0.03, kind: 'back' }, { u: wa + s + 0.05, y: -0.06, kind: 'back' },
          ];
        }
        if (Ty.median > 0 || Ty.oneWay) {
          return [
            { u: wa, y: 0, kind: 'kerbface' }, { u: wa + 0.03, y: 0.09, kind: 'kerbface' },
            { u: wa + 0.03, y: 0.09, kind: 'kerb' }, { u: wa + 0.55, y: 0.10, kind: 'kerb' },
            { u: wa + 0.55, y: 0.10, kind: 'back' }, { u: wa + 0.6, y: -0.06, kind: 'back' },
          ];
        }
        return [{ u: wa, y: 0, kind: 'edge' }, { u: wa + 0.3, y: -0.06, kind: 'edge' }];
      };
      const emitProfileRow = (i) => {
        const r = rows[i];
        const P = prof(i);
        const rx = r.nx * r.scale * sgn, rz = r.nz * r.scale * sgn;
        const wb = (sgn > 0 ? r.wR : r.wL) ?? wa;   // per-row asphalt half width on this side
        const ids = [];
        for (let k = 0; k < P.length; k += 2) {
          const p0 = P[k], p1 = P[k + 1];
          const u0 = p0.u - wa + wb, u1 = p1.u - wa + wb;
          let du = (p1.u - p0.u), dy = p1.y - p0.y;
          const l = Math.hypot(du, dy) || 1; du /= l; dy /= l;
          const nu = -dy, ny = du;
          const nx = rx * nu, nz = rz * nu;
          const nl = Math.hypot(nx, ny, nz) || 1;
          const col = p0.kind === 'sw' ? SW_COL : KERB_COL;
          const acc = p0.kind === 'edge' ? grav : conc;
          const a = acc.v(r.x + rx * u0, r.y + p0.y, r.z + rz * u0, nx / nl, ny / nl, nz / nl, u0, r.d, col);
          const b = acc.v(r.x + rx * u1, r.y + p1.y, r.z + rz * u1, nx / nl, ny / nl, nz / nl, u1, r.d, col);
          ids.push([acc, a, b]);
        }
        return { ids, outerU: P[P.length - 1].u - wa + wb, outerY: P[P.length - 1].y };
      };
      const skirtPrev = { a: -1, b: -1 };
      const parapetPrev = { ids: null };
      const emitSkirt = (i, r, cur, connect) => {
        const rx = r.nx * r.scale * sgn, rz = r.nz * r.scale * sgn;
        const u0 = cur.outerU, y0 = r.y + cur.outerY;
        const footU = u0 + 0.8;
        const fx = r.x + rx * footU, fz = r.z + rz * footU;
        let terr = T.getHeight(fx, fz);
        const dh = y0 - terr;
        let uFoot = footU, yFoot = terr - 0.25;
        if (dh > 0.6) { uFoot = u0 + 0.9 + dh * 1.5; const fx2 = r.x + rx * uFoot, fz2 = r.z + rz * uFoot; terr = T.getHeight(fx2, fz2); yFoot = terr - 0.3; }
        let du = uFoot - u0, dy = yFoot - y0; const l = Math.hypot(du, dy) || 1; du /= l; dy /= l;
        const nu = -dy, ny = du;
        const nx = rx * nu, nz = rz * nu; const nl = Math.hypot(nx, ny, nz) || 1;
        const shade = Math.max(0.6, 1 - Math.max(0, dh) * 0.06);
        const topCol = [0.62, 0.63, 0.55], botCol = [0.52 * shade, 0.58 * shade, 0.42 * shade];
        const a = grav.v(r.x + rx * u0, y0, r.z + rz * u0, nx / nl, ny / nl, nz / nl, u0, r.d, topCol);
        const b = grav.v(r.x + rx * uFoot, yFoot, r.z + rz * uFoot, nx / nl, ny / nl, nz / nl, uFoot, r.d, botCol);
        if (connect && skirtPrev.a >= 0) grav.quadN(skirtPrev.a, a, b, skirtPrev.b);
        skirtPrev.a = a; skirtPrev.b = b;
      };
      const emitParapet = (i, r, cur, connect) => {
        const rx = r.nx * r.scale * sgn, rz = r.nz * r.scale * sgn;
        const u0 = cur.outerU - 0.05, yTop = r.y + 1.05, yDeck = r.y + cur.outerY, yBot = r.y - DECK_DEPTH;
        const pts = [
          [u0, yDeck, -1, 0, BARRIER_COL], [u0, yTop, -1, 0, BARRIER_COL],
          [u0, yTop, 0, 1, BARRIER_COL], [u0 + 0.38, yTop, 0, 1, BARRIER_COL],
          [u0 + 0.38, yTop, 1, 0, DECK_COL], [u0 + 0.38, yBot, 1, 0, DECK_COL],
          [u0 + 0.38, yBot, 0, -1, DECK_COL], [0, yBot, 0, -1, DECK_COL],
        ];
        const ids = [];
        for (let k = 0; k < pts.length; k += 2) {
          const p0 = pts[k], p1 = pts[k + 1];
          const nx = rx * p0[2], ny = p0[3], nz = rz * p0[2]; const nl = Math.hypot(nx, ny, nz) || 1;
          const a = conc.v(r.x + rx * p0[0], p0[1], r.z + rz * p0[0], nx / nl, ny / nl, nz / nl, p0[0] + p0[1], r.d, p0[4]);
          const b = conc.v(r.x + rx * p1[0], p1[1], r.z + rz * p1[0], nx / nl, ny / nl, nz / nl, p1[0] + p1[1], r.d, p1[4]);
          ids.push([a, b]);
        }
        if (connect && parapetPrev.ids) for (let k = 0; k < ids.length; k++) conc.quadN(parapetPrev.ids[k][0], ids[k][0], ids[k][1], parapetPrev.ids[k][1]);
        parapetPrev.ids = ids;
      };
      let prev = null;
      for (let i = 0; i < nR; i++) {
        const r = rows[i];
        const has = sgn > 0 ? r.sideR !== false : r.sideL !== false;
        if (!has) { prev = null; skirtPrev.a = -1; parapetPrev.ids = null; continue; }
        const cur = emitProfileRow(i);
        if (prev) {
          for (let k = 0; k < cur.ids.length; k++) {
            const [acc, a, b] = cur.ids[k]; const [, pa, pb] = prev.ids[k];
            acc.quadN(pa, a, b, pb);
          }
        }
        const rp = prev ? rows[i - 1] : null;
        const needPar = r.bridge || (rp && rp.bridge), needSk = !r.bridge || (rp && !rp.bridge);
        if (needPar) emitParapet(i, r, cur, parapetPrev.ids !== null); else parapetPrev.ids = null;
        if (needSk) emitSkirt(i, r, cur, skirtPrev.a >= 0); else skirtPrev.a = -1;
        prev = cur;
      }
    }
    // ---- bridge deck underside + piers (once per strip, not per side)
    if (withAsphalt) {
      const outer = wa + (Ty.sidewalk > 0.05 ? Ty.sidewalk : (Ty.median > 0 || Ty.oneWay ? 0.6 : 0.3)) + 0.33;
      const deckIds = new Array(nR).fill(null);
      let lastPier = -1e9, inRun = false;
      for (let i = 0; i < nR; i++) {
        const r = rows[i];
        const rx = r.nx * r.scale, rz = r.nz * r.scale;
        const yBot = r.y - DECK_DEPTH;
        const near = r.bridge || (i > 0 && rows[i - 1].bridge) || (i < nR - 1 && rows[i + 1].bridge);
        if (near) {
          const a = conc.v(r.x - rx * outer, yBot, r.z - rz * outer, 0, -1, 0, -outer, r.d, DECK_COL);
          const b = conc.v(r.x + rx * outer, yBot, r.z + rz * outer, 0, -1, 0, outer, r.d, DECK_COL);
          deckIds[i] = [a, b];
        }
        if (r.bridge) {
          if (!inRun) { inRun = true; lastPier = r.d - PIER_SPACING * 0.45; }
          if (r.d - lastPier >= PIER_SPACING && i < nR - 2 && rows[i + 1].bridge) {
            const ground = Math.min(T.getHeight(r.x, r.z), T.seaLevel) - 3;
            if (yBot - ground > 1.5) { this.emitPier(conc, r.x, r.z, yBot + 0.1, ground, rx, rz, outer * 1.35, 1.6, r.fx, r.fz); lastPier = r.d; }
          }
        } else inRun = false;
      }
      for (let i = 1; i < nR; i++) if (deckIds[i] && deckIds[i - 1]) conc.quadN(deckIds[i - 1][0], deckIds[i][0], deckIds[i][1], deckIds[i - 1][1]);
    }
    // ---- highway median barrier
    if (withAsphalt && Ty.median > 0) {
      const prof = [[-0.45, 0.0, -1, 0], [-0.32, 0.30, -1, 0.12], [-0.32, 0.30, -1, 0.3], [-0.14, 0.92, -1, 0.3], [-0.14, 0.92, 0, 1], [0.14, 0.92, 0, 1], [0.14, 0.92, 1, 0.3], [0.32, 0.30, 1, 0.3], [0.32, 0.30, 1, 0.12], [0.45, 0.0, 1, 0]];
      let prevIds = null;
      for (let i = 0; i < nR; i++) {
        const r = rows[i];
        const rx = r.nx * r.scale, rz = r.nz * r.scale;
        const ids = [];
        for (let k = 0; k < prof.length; k += 2) {
          const p0 = prof[k], p1 = prof[k + 1];
          const nx = rx * p0[2], ny = p0[3], nz = rz * p0[2]; const nl = Math.hypot(nx, ny, nz) || 1;
          const a = conc.v(r.x + rx * p0[0], r.y + ROAD_LIFT + p0[1], r.z + rz * p0[0], nx / nl, ny / nl, nz / nl, p0[0] + p0[1], r.d, BARRIER_COL);
          const b = conc.v(r.x + rx * p1[0], r.y + ROAD_LIFT + p1[1], r.z + rz * p1[0], nx / nl, ny / nl, nz / nl, p1[0] + p1[1], r.d, BARRIER_COL);
          ids.push([a, b]);
        }
        if (prevIds) for (let k = 0; k < ids.length; k++) conc.quadN(prevIds[k][0], ids[k][0], ids[k][1], prevIds[k][1]);
        prevIds = ids;
      }
    }
  }

  emitPier(acc, x, z, yTop, yBot, rx, rz, halfW, halfT, fx, fz) {
    // box: across = R (halfW), along = F (halfT)
    const corners = [[-halfW, -halfT], [halfW, -halfT], [halfW, halfT], [-halfW, halfT]];
    const P = corners.map(([a, b]) => [x + rx * a + fx * b, z + rz * a + fz * b]);
    const faces = [[0, 1, fx, fz], [1, 2, rx, rz], [2, 3, -fx, -fz], [3, 0, -rx, -rz]];
    for (const [i0, i1, nx, nz] of faces) {
      const nl = Math.hypot(nx, nz) || 1;
      const a = acc.v(P[i0][0], yBot, P[i0][1], nx / nl, 0, nz / nl, 0, yBot, PIER_COL);
      const b = acc.v(P[i1][0], yBot, P[i1][1], nx / nl, 0, nz / nl, halfW, yBot, PIER_COL);
      const c = acc.v(P[i1][0], yTop, P[i1][1], nx / nl, 0, nz / nl, halfW, yTop, PIER_COL);
      const d = acc.v(P[i0][0], yTop, P[i0][1], nx / nl, 0, nz / nl, 0, yTop, PIER_COL);
      acc.quadN(a, b, c, d);
    }
    // pier cap (a wider head under the deck)
    const capH = 0.9, cw = halfW * 1.08, ct = halfT * 1.4;
    const C = corners.map(([a, b]) => [x + rx * a * (cw / halfW) + fx * b * (ct / halfT), z + rz * a * (cw / halfW) + fz * b * (ct / halfT)]);
    for (const [i0, i1, nx, nz] of faces) {
      const nl = Math.hypot(nx, nz) || 1;
      const a = acc.v(C[i0][0], yTop - capH, C[i0][1], nx / nl, 0, nz / nl, 0, yTop - capH, DECK_COL);
      const b = acc.v(C[i1][0], yTop - capH, C[i1][1], nx / nl, 0, nz / nl, cw, yTop - capH, DECK_COL);
      const c = acc.v(C[i1][0], yTop + 0.1, C[i1][1], nx / nl, 0, nz / nl, cw, yTop + 0.1, DECK_COL);
      const d = acc.v(C[i0][0], yTop + 0.1, C[i0][1], nx / nl, 0, nz / nl, 0, yTop + 0.1, DECK_COL);
      acc.quadN(a, b, c, d);
    }
    const u = C.map((p) => acc.v(p[0], yTop - capH, p[1], 0, -1, 0, p[0], p[1], DECK_COL));
    acc.quadN(u[0], u[1], u[2], u[3]);
  }

  // ------------------------------------------------------------------ intersections
  emitNode(n) {
    const info = this.nodeInfo.get(n.id);
    if (!info) return;
    if (info.kind === 'end') { this.emitDeadEnd(info); return; }
    if (info.kind !== 'intersection') return;
    const net = this.net;
    const arms = info.arms;
    const ring = []; // [{x,z}]
    const pushPt = (x, z) => {
      const l = ring[ring.length - 1];
      if (l && Math.abs(l.x - x) < 1e-3 && Math.abs(l.z - z) < 1e-3) return;
      ring.push({ x, z });
    };
    const paths = [];
    for (const c of info.corners) {
      const A = c.A, B = c.B;
      // arm A cross-section from -s to +s (its -s corner closes the previous corner path)
      const aMinus = { x: n.x + A.d.x * A.trim - A.s.x * A.wa, z: n.z + A.d.z * A.trim - A.s.z * A.wa };
      const aPlus = { x: n.x + A.d.x * A.trim + A.s.x * A.wa, z: n.z + A.d.z * A.trim + A.s.z * A.wa };
      const bMinus = { x: n.x + B.d.x * B.trim - B.s.x * B.wa, z: n.z + B.d.z * B.trim - B.s.z * B.wa };
      pushPt(aMinus.x, aMinus.z);
      pushPt(aPlus.x, aPlus.z);
      // corner path with outward normals
      const path = [{ x: aPlus.x, z: aPlus.z, nx: A.s.x, nz: A.s.z, t: 0 }];
      if (c.kind === 'fillet') {
        const TA = { x: c.C.x + A.d.x * c.k, z: c.C.z + A.d.z * c.k };
        const TB = { x: c.C.x + B.d.x * c.k, z: c.C.z + B.d.z * c.k };
        if (Math.hypot(TA.x - aPlus.x, TA.z - aPlus.z) > 0.05) path.push({ x: TA.x, z: TA.z, nx: A.s.x, nz: A.s.z, t: 0 });
        // arc from TA to TB around c.center (normals toward the centre = away from the asphalt)
        const a0 = Math.atan2(TA.z - c.center.z, TA.x - c.center.x);
        let a1 = Math.atan2(TB.z - c.center.z, TB.x - c.center.x);
        let da = a1 - a0;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const segs = Math.max(3, Math.ceil(Math.abs(da) * c.r / 1.2));
        for (let k = 1; k < segs; k++) {
          const a = a0 + da * (k / segs);
          const px = c.center.x + Math.cos(a) * c.r, pz = c.center.z + Math.sin(a) * c.r;
          path.push({ x: px, z: pz, nx: -Math.cos(a), nz: -Math.sin(a), t: k / segs });
        }
        path.push({ x: TB.x, z: TB.z, nx: -B.s.x, nz: -B.s.z, t: 1 });
        if (Math.hypot(TB.x - bMinus.x, TB.z - bMinus.z) > 0.05) path.push({ x: bMinus.x, z: bMinus.z, nx: -B.s.x, nz: -B.s.z, t: 1 });
      } else {
        const m = norm2(A.s.x - B.s.x, A.s.z - B.s.z);
        const cosHalf = Math.max(0.35, Math.abs(m.x * A.s.x + m.z * A.s.z));
        path.push({ x: c.C.x, z: c.C.z, nx: m.x / cosHalf, nz: m.z / cosHalf, t: 0.5 });
        path.push({ x: bMinus.x, z: bMinus.z, nx: -B.s.x, nz: -B.s.z, t: 1 });
      }
      for (let k = 1; k < path.length - 1; k++) pushPt(path[k].x, path[k].z);
      // the first / last points of the path are the arm corners (already in the ring via aPlus / next aMinus)
      paths.push({ path, A, B });
    }
    // asphalt polygon
    if (ring.length >= 3) {
      const acc = this.acc('asphalt', n.x, n.z);
      const y = n.y + ROAD_LIFT;
      const contour = ring.map((p) => new THREE.Vector2(p.x, p.z));
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (err) { tris = []; }
      const ids = ring.map((p) => acc.v(p.x, y, p.z, 0, 1, 0, p.x, p.z, SW_COL, 0, 0, 0, 0));
      for (const t of tris) {
        // ensure upward winding
        const a = ring[t[0]], b = ring[t[1]], c2 = ring[t[2]];
        const cross = (b.x - a.x) * (c2.z - a.z) - (b.z - a.z) * (c2.x - a.x);
        if (cross < 0) acc.tri(ids[t[0]], ids[t[1]], ids[t[2]]); else acc.tri(ids[t[0]], ids[t[2]], ids[t[1]]);
      }
    }
    // corner sidewalks (kerb + sidewalk + skirt along each corner path; the arm A / B sidewalk widths blend)
    for (const { path, A, B } of paths) {
      const rows = path.map((p) => {
        return { x: p.x, y: n.y, z: p.z, nx: p.nx, nz: p.nz, scale: 1, d: 0, terr: 0, bridge: false, water: false, dEnd: 0, tx: 0, tz: 0 };
      });
      // running distance for the concrete uv
      for (let i = 1; i < rows.length; i++) rows[i].d = rows[i - 1].d + Math.hypot(rows[i].x - rows[i - 1].x, rows[i].z - rows[i - 1].z);
      // path tangents for strip normals
      for (let i = 0; i < rows.length; i++) { rows[i].tx = -rows[i].nz; rows[i].tz = rows[i].nx; }
      const TyA = A.T, TyB = B.T;
      const Ty = (TyA.sidewalk >= TyB.sidewalk) ? TyA : TyB;
      const swAt = Ty.sidewalk > 0.05 ? ((i) => Math.max(0.6, TyA.sidewalk + (TyB.sidewalk - TyA.sidewalk) * (path[i].t ?? 0))) : null;
      this.emitStrip(rows, Ty, null, n.x, n.z, 0, { asphalt: false, sides: [1], swAt, pathTangent: true });
    }
    // decals: crosswalks, stop lines, arrows
    if (arms.length >= 3 || arms.some((a) => a.T.sidewalk > 0)) this.emitDecals(info);
  }

  emitDeadEnd(info) {
    const n = info.node, a = info.arms[0];
    if (!a) return;
    // sidewalk / kerb wraps around the end of the road
    const Ty = a.T;
    const wa = a.wa;
    const rows = [];
    const steps = 12;
    // semicircle around the node from +s, through -d, to -s (outward normals radial)
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const ang0 = Math.atan2(a.s.z, a.s.x), ang1 = Math.atan2(-a.s.z, -a.s.x);
      // rotate from +s to -s passing through -d
      const mid = Math.atan2(-a.d.z, -a.d.x);
      let da0 = mid - ang0; while (da0 > Math.PI) da0 -= 2 * Math.PI; while (da0 < -Math.PI) da0 += 2 * Math.PI;
      const ang = ang0 + da0 * 2 * k;
      const nx = Math.cos(ang), nz = Math.sin(ang);
      rows.push({ x: n.x + nx * wa, y: n.y, z: n.z + nz * wa, nx, nz, scale: 1, d: k * Math.PI * wa, terr: 0, bridge: false, water: false, dEnd: 0, tx: -nz, tz: nx });
    }
    // asphalt cap: fan
    const acc = this.acc('asphalt', n.x, n.z);
    const y = n.y + ROAD_LIFT;
    const c = acc.v(n.x, y, n.z, 0, 1, 0, n.x, n.z, SW_COL, 0, 0, 0, 0);
    const ids = rows.map((r) => acc.v(r.x, y, r.z, 0, 1, 0, r.x, r.z, SW_COL, 0, 0, 0, 0));
    for (let i = 1; i < ids.length; i++) {
      const a0 = rows[i - 1], b0 = rows[i];
      const cross = (a0.x - n.x) * (b0.z - n.z) - (a0.z - n.z) * (b0.x - n.x);
      if (cross < 0) acc.tri(c, ids[i - 1], ids[i]); else acc.tri(c, ids[i], ids[i - 1]);
    }
    this.emitStrip(rows, Ty, null, n.x, n.z, 0, { asphalt: false, sides: [1], pathTangent: true });
  }

  emitDecals(info) {
    const n = info.node;
    const paint = this.acc('paint', n.x, n.z);
    const net = this.net;
    const o = {};
    const yAt = (e, atA, dist) => { net.sampleAt(e.id, atA ? dist : e.length - dist, o); return o.y + ROAD_LIFT + 0.012; };
    const many = info.arms.length >= 3;
    for (const a of info.arms) {
      const e = a.e, Ty = a.T;
      const isHw = Ty.median > 0 || Ty.oneWay;
      // local frame: origin at the trim point on the arm axis, along = a.d (away from node), across = a.s
      const O = { x: n.x + a.d.x * a.trim, z: n.z + a.d.z * a.trim };
      const P = (u, w) => ({ x: O.x + a.s.x * u + a.d.x * w, z: O.z + a.s.z * u + a.d.z * w });
      const rect = (u0, u1, w0, w1, col) => {
        const p00 = P(u0, w0), p10 = P(u1, w0), p11 = P(u1, w1), p01 = P(u0, w1);
        const y0 = yAt(e, a.atA, a.trim + w0), y1 = yAt(e, a.atA, a.trim + w1);
        const i0 = paint.v(p00.x, y0, p00.z, 0, 1, 0, 0, 0, col), i1 = paint.v(p10.x, y0, p10.z, 0, 1, 0, 1, 0, col);
        const i2 = paint.v(p11.x, y1, p11.z, 0, 1, 0, 1, 1, col), i3 = paint.v(p01.x, y1, p01.z, 0, 1, 0, 0, 1, col);
        // winding: up-facing
        const cross = (p10.x - p00.x) * (p11.z - p00.z) - (p10.z - p00.z) * (p11.x - p00.x);
        if (cross < 0) paint.quad(i0, i1, i2, i3); else paint.quad(i0, i3, i2, i1);
      };
      const wa = a.wa;
      if (!isHw && many && Ty.sidewalk > 0) {
        // zebra crosswalk
        const bw = 0.5, gap = 0.5;
        const span = wa * 2 - 0.9;
        const count = Math.floor((span + gap) / (bw + gap));
        const start = -wa + 0.45 + (span - (count * (bw + gap) - gap)) / 2;
        for (let i = 0; i < count; i++) rect(start + i * (bw + gap), start + i * (bw + gap) + bw, 0.9, 3.9, PAINT_WHITE);
        // stop line on the incoming half (traffic drives on the right: incoming lanes are on the -s side)
        rect(-wa + 0.35, -0.12, 4.5, 4.95, PAINT_WHITE);
      } else if (!isHw && !many && Ty.sidewalk > 0) {
        // 2-arm sharp bend: nothing
      }
      // turn arrows on avenues (2+ lanes per direction)
      const per = e.oneWay ? e.lanes : Math.floor(e.lanes / 2);
      if (!isHw && many && per >= 2) {
        const usable = wa - Ty.shoulder - Ty.median / 2;
        const lw = usable / per;
        for (let k = 0; k < per; k++) {
          const cu = -(Ty.median / 2 + usable - lw * (k + 0.5));
          const kind = k === 0 ? (per === 2 ? 'straight-right' : 'right') : k === per - 1 ? 'left' : 'straight';
          this.emitArrow(paint, P, (w) => yAt(e, a.atA, a.trim + w), cu, 12.5, kind);
        }
      }
    }
  }

  /** Arrow decal pointing toward the node (local +w is away from the node, so the arrow points to -w). */
  emitArrow(paint, P, yAtW, cu, w0, kind) {
    const tri = (pts, col) => {
      // vehicles approach the node travelling -d, so their right-hand side is -s: mirror local u
      const S = 1.3;
      const ids = pts.map(([u, w]) => { const p = P(cu - u * S, w0 + w * S); return paint.v(p.x, yAtW(w0 + w * S), p.z, 0, 1, 0, 0, 0, col); });
      const p0 = P(cu - pts[0][0] * S, w0 + pts[0][1] * S), p1 = P(cu - pts[1][0] * S, w0 + pts[1][1] * S), p2 = P(cu - pts[2][0] * S, w0 + pts[2][1] * S);
      const cross = (p1.x - p0.x) * (p2.z - p0.z) - (p1.z - p0.z) * (p2.x - p0.x);
      if (cross < 0) paint.tri(ids[0], ids[1], ids[2]); else paint.tri(ids[0], ids[2], ids[1]);
    };
    const quad = (u0, w0q, u1, w1q, col) => { tri([[u0, w0q], [u1, w0q], [u1, w1q]], col); tri([[u0, w0q], [u1, w1q], [u0, w1q]], col); };
    const col = PAINT_WHITE;
    // shaft along -w (toward the node): w from 0 (tail) to -2.6 (head base)
    const straight = kind === 'straight' || kind === 'straight-right';
    quad(-0.17, 0, 0.17, -2.7, col);
    if (straight) tri([[-0.6, -2.5], [0.6, -2.5], [0, -3.9]], col);
    if (kind === 'right' || kind === 'straight-right') {
      const wb = straight ? -1.2 : -2.5;
      quad(0, wb - 0.17, 1.05, wb + 0.17, col);
      tri([[0.95, wb - 0.55], [0.95, wb + 0.55], [1.75, wb]], col);
      if (!straight) quad(-0.17, wb, 0.17, wb - 0.3, col);
    }
    if (kind === 'left') {
      const wb = -2.5;
      quad(-1.05, wb - 0.17, 0, wb + 0.17, col);
      tri([[-0.95, wb - 0.55], [-0.95, wb + 0.55], [-1.75, wb]], col);
    }
  }

  // ------------------------------------------------------------------ derived data for other modules
  lampPositions(edgeId) {
    const net = this.net;
    const e = net.edges.get(edgeId);
    if (!e) return [];
    const Ty = net.typeOf(e.type);
    const out = [];
    const o = {};
    const from = e.trimA + 9, to = e.length - e.trimB - 6;
    if (to - from < 4) return out;
    const spacing = Ty.median > 0 ? 40 : Ty.lanes >= 4 ? 30 : 28;
    const count = Math.max(1, Math.floor((to - from) / spacing));
    const both = Ty.lanes >= 4 && Ty.median === 0;
    for (let i = 0; i <= count; i++) {
      const d = from + (to - from) * (count === 0 ? 0.5 : i / count);
      net.sampleAt(edgeId, d, o);
      const nx = -o.tz, nz = o.tx;
      const sides = Ty.median > 0 ? [0] : both ? [1, -1] : [i % 2 === 0 ? 1 : -1];
      for (const sgn of sides) {
        let u, y = o.y;
        if (sgn === 0) { u = 0; y = o.y + 0.95; }
        else u = sgn * (Ty.sidewalk > 0.05 ? Ty.asphaltHalf + Ty.sidewalk - 0.7 : Ty.asphaltHalf + 0.9);
        const dirX = sgn === 0 ? nx : -sgn * nx, dirZ = sgn === 0 ? nz : -sgn * nz;
        if (sgn === 0 && Ty.sidewalk < 0.05) y = o.y + 0.95;
        out.push({ x: o.x + nx * u, y: y + (sgn === 0 ? 0 : SW_H - 0.03), z: o.z + nz * u, heading: Math.atan2(dirX, -dirZ), side: sgn === 0 ? 'median' : sgn > 0 ? 'right' : 'left', edgeId, t: d / e.length });
      }
    }
    return out;
  }

  intersections() {
    const out = [];
    for (const info of this.nodeInfo.values()) {
      if (info.kind !== 'intersection' || info.arms.length < 3) continue;
      const n = info.node;
      out.push({
        id: n.id, x: n.x, y: n.y, z: n.z,
        arms: info.arms.map((a) => ({
          edgeId: a.e.id, dir: { x: a.d.x, z: a.d.z }, trim: a.trim, width: a.wa, sidewalk: a.sw, type: a.e.type,
          lanesIn: a.e.oneWay ? (a.atA ? 0 : a.e.lanes) : Math.floor(a.e.lanes / 2),
          stopT: a.atA ? (a.trim + 4.7) / a.e.length : (a.e.length - a.trim - 4.7) / a.e.length,
          atA: a.atA,
        })),
      });
    }
    return out;
  }
}
