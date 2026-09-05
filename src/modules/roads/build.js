// Road geometry builder: node (intersection) analysis with corner fillets/mitres on curve-aware arm frames,
// terrain-conforming height profiles from design heights, batched cut/fill with graded slopes written straight
// into the heightfield, per-tile merged meshes: asphalt strips + intersection polygons, kerbs/sidewalks, gravel
// verges, bridge decks/parapets/piers/abutments, highway median barriers, decal markings (crosswalks, stop and
// yield lines, turn arrows, gore hatching). Also derives lamp positions and the intersection list.
import * as THREE from 'three';
import { LAYERS } from '../../core/constants.js';

const TILE = 1024;
const ROW = 4;               // metres between rows along a straight edge
const ROW_CURVE = 2.5;       // ... along a bezier edge
const ROAD_LIFT = 0.08;      // asphalt surface above the node/profile height
const DROP = 0.25;           // terrain sits this far below the profile under the road corridor
const FLAT_MARGIN = 0.8;     // flat verge outside the sidewalk back before the graded slope starts
const GRADE = 1.5;           // cut/fill slope: metres of run per metre of rise
const GRADE_REACH = 22;      // max lateral reach of the graded slope
const KERB_H = 0.15;
const SW_H = 0.16;
const BRIDGE_CLEAR = 4.2;    // deck height above sea level over water
const BRIDGE_MIN = 6.0;      // road-above-terrain fill at which a deck replaces an embankment (water always decks)
const MAX_GRADE = 0.15;      // profile grade limit (rise per metre)
const PLATEAU = 24;          // minimum metres over which an arm blends from the node height to the terrain profile
const DECK_DEPTH = 1.5;
const PIER_SPACING = 24;

const KERB_COL = [0.66, 0.66, 0.64];
const KERB_FACE_COL = [0.5, 0.5, 0.49];
const SW_COL = [0.84, 0.84, 0.82];
const SW_IN_COL = [0.76, 0.76, 0.74];
const BARRIER_COL = [1.15, 1.15, 1.12];
const BARRIER_SIDE_COL = [0.98, 0.98, 0.95];
const DECK_COL = [0.86, 0.86, 0.83];
const PIER_COL = [0.78, 0.78, 0.75];
const PAINT_WHITE = [0.93, 0.92, 0.87];

const ACCEL_LEN = 120;       // acceleration / deceleration lane taper length
const MERGE_LEN = 90;        // ramp narrowing zone before it joins the highway

/** Pack per-vertex road flags (decoded in materials.js). Float32 keeps ints exact below 2^24. */
export function packFlags({ oneWay = false, hw = false, dbl = false, noLineL = false, noLineR = false, lanes = 0, ext = 0, extLeft = false, kerbL = false, kerbR = false }) {
  return (oneWay ? 1 : 0) | (hw ? 2 : 0) | (dbl ? 4 : 0) | (noLineL ? 8 : 0) | (noLineR ? 16 : 0) | ((lanes & 15) << 5)
    | ((Math.max(0, Math.min(255, Math.round(ext * 32)))) << 9) | (extLeft ? 1 << 17 : 0) | (kerbL ? 1 << 18 : 0) | (kerbR ? 1 << 19 : 0);
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
  return ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / den;
}

export class RoadBuilder {
  constructor(net, world, mats, group, log) {
    this.net = net; this.world = world; this.mats = mats; this.group = group; this.log = log;
    this.meshes = [];
    this.nodeInfo = new Map();
    this.stats = { edges: 0, nodes: 0, tris: 0, meshes: 0, bridges: 0, flattenCalls: 0, terrainVerts: 0, ms: 0 };
    this.flattening = false;
    this.tiles = new Map();
    this._tmp = {};
    this._grid = null;
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
    this.detectRings();
    for (const n of net.nodes.values()) this.analyseNode(n);
    for (const e of net.edges.values()) this.profileSmooth(e);
    this.nodeHeights();
    for (const e of net.edges.values()) { this.profileBlend(e); if (e.bridge) bridges++; }
    for (const info of this.nodeInfo.values()) if (info.kind === 'intersection') this.nodeShapes(info);
    this.conformTerrain();
    this.buildCoverage();
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

  /** Point + frame on an arm's curve at distance w from the node (w along the arm, u across on the arm's +s side). */
  armAt(a, w, out = {}) {
    const e = a.e, c = this.net.poly(e.id);
    const d = a.atA ? w : c.len - w;
    const o = this.net.sampleAt(e.id, d, this._tmp);
    const dx = a.atA ? o.tx : -o.tx, dz = a.atA ? o.tz : -o.tz;
    out.x = o.x; out.z = o.z; out.y = o.y; out.dx = dx; out.dz = dz; out.sx = -dz; out.sz = dx;
    return out;
  }

  // ------------------------------------------------------------------ one-way cycles (roundabouts)
  detectRings() {
    const net = this.net;
    for (const e of net.edges.values()) e.ring = false;
    const outOf = new Map();
    for (const e of net.edges.values()) { if (!e.oneWay) continue; if (!outOf.has(e.a)) outOf.set(e.a, []); outOf.get(e.a).push(e); }
    for (const e0 of net.edges.values()) {
      if (!e0.oneWay || e0.ring) continue;
      const path = [e0]; let cur = e0; let closed = false;
      for (let step = 0; step < 16; step++) {
        const outs = (outOf.get(cur.b) || []).filter((x) => x !== cur);
        if (!outs.length) break;
        const dIn = net.dirFrom(cur, cur.b);
        let best = null, bestDot = -2;
        for (const x of outs) { const d = net.dirFrom(x, cur.b); const dot = -(dIn.x * d.x + dIn.z * d.z); if (dot > bestDot) { bestDot = dot; best = x; } }
        if (best.b === e0.a) { path.push(best); closed = true; break; }
        if (path.includes(best)) break;
        path.push(best); cur = best;
      }
      if (closed && path.length >= 3) for (const e of path) e.ring = true;
    }
  }

  // ------------------------------------------------------------------ node analysis
  analyseNode(n) {
    const net = this.net;
    const arms = [];
    for (const eid of n.edges) {
      const e = net.edges.get(eid);
      if (!e) continue;
      const d = net.dirFrom(e, n.id);
      const Ty = net.typeOf(e.type);
      arms.push({ e, d, s: { x: -d.z, z: d.x }, ox: n.x, oz: n.z, T: Ty, wa: Ty.asphaltHalf, sw: Ty.sidewalk, r: Ty.cornerR, ang: Math.atan2(d.z, d.x), trim: 0, atA: e.a === n.id });
    }
    arms.sort((a, b) => a.ang - b.ang);
    const info = { node: n, arms, kind: 'end', corners: [], mitre: null, paths: [], ring: [], hasRing: arms.some((a) => a.e.ring) };
    this.nodeInfo.set(n.id, info);
    if (arms.length === 0) { info.kind = 'isolated'; return; }
    if (arms.length === 1) { info.kind = 'end'; return; }
    if (arms.length === 2) {
      const gap = ((arms[1].ang - arms[0].ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const bend = Math.abs(Math.PI - gap);
      if (bend < 0.42 && Math.abs(arms[0].wa - arms[1].wa) < 0.01 && Math.abs(arms[0].sw - arms[1].sw) < 0.01) {
        info.kind = 'joint';
        const t = norm2(arms[1].d.x - arms[0].d.x, arms[1].d.z - arms[0].d.z);
        info.mitre = { nx: -t.z, nz: t.x, scale: 1 / Math.max(0.5, Math.cos(bend / 2)) };
        return;
      }
    }
    if (arms.length === 3) {
      const ramp = arms.find((a) => a.T.oneWay && a.e.lanes === 1 && !a.e.ring);
      const hws = arms.filter((a) => a !== ramp);
      if (ramp && hws[0].e.type === hws[1].e.type && !hws[0].T.oneWay) {
        const g = Math.abs(hws[0].d.x * hws[1].d.x + hws[0].d.z * hws[1].d.z);
        const par = hws.map((h) => h.d.x * ramp.d.x + h.d.z * ramp.d.z);
        const iR = par[0] > par[1] ? 0 : 1;
        if (g > 0.8 && par[iR] > 0.75 && this.setupMerge(info, ramp, hws[iR], hws[1 - iR])) return;
      }
    }
    info.kind = 'intersection';
    // corners on straight arm frames first, then re-anchor curved arms on their curve at the trim distance and
    // recompute, so strips and intersection polygons meet exactly on the curve (no kink on curved arms).
    for (let iter = 0; iter < 4; iter++) {
      this.computeCorners(info);
      if (!this.refreshFrames(info)) break;
    }
    for (const a of arms) { if (a.atA) a.e.trimA = a.trim; else a.e.trimB = a.trim; }
  }

  computeCorners(info) {
    const n = info.node, arms = info.arms, m = arms.length;
    info.corners = [];
    for (const a of arms) a.trim = 0;
    for (let i = 0; i < m; i++) {
      const A = arms[i], B = arms[(i + 1) % m];
      const gap = (((B.ang - A.ang) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const corner = { i, j: (i + 1) % m, A, B, gap, kind: 'flat', C: null, r: 0, k: 0, center: null, tA: 0, tB: 0 };
      // a one-way ring continuing through this node: the island-side corner follows the curve itself
      if (m >= 3 && A.e.ring && B.e.ring && A.e !== B.e && A.atA !== B.atA) { corner.kind = 'curve'; info.corners.push(corner); continue; }
      const pA = { x: A.ox + A.s.x * A.wa, z: A.oz + A.s.z * A.wa };
      const pB = { x: B.ox - B.s.x * B.wa, z: B.oz - B.s.z * B.wa };
      const tI = lineIntersect(pA, A.d, pB, B.d);
      let C = null;
      if (tI !== null) {
        C = { x: pA.x + A.d.x * tI, z: pA.z + A.d.z * tI };
        const far = Math.hypot(C.x - n.x, C.z - n.z);
        if (far > 4 * Math.max(A.wa, B.wa) + 12) C = null;
      }
      if (gap < Math.PI - 0.05 && C) {
        let r = Math.min(A.r, B.r);
        if (A.e.ring || B.e.ring) r = Math.min(r, 4);
        const half = gap / 2;
        r = Math.min(r, 14 * Math.tan(half));
        const k = r / Math.tan(half);
        const bis = norm2(A.d.x + B.d.x, A.d.z + B.d.z);
        const cd = r / Math.sin(half);
        corner.kind = 'fillet'; corner.C = C; corner.r = r; corner.k = k;
        corner.center = { x: C.x + bis.x * cd, z: C.z + bis.z * cd };
        corner.tA = (C.x - A.ox) * A.d.x + (C.z - A.oz) * A.d.z + k;
        corner.tB = (C.x - B.ox) * B.d.x + (C.z - B.oz) * B.d.z + k;
      } else if (C && Math.abs(Math.sin(gap)) > 0.12) {
        corner.kind = 'mitre'; corner.C = C;
        corner.tA = Math.max(0, (C.x - A.ox) * A.d.x + (C.z - A.oz) * A.d.z);
        corner.tB = Math.max(0, (C.x - B.ox) * B.d.x + (C.z - B.oz) * B.d.z);
      } else {
        corner.kind = 'flat'; corner.C = { x: (pA.x + pB.x) / 2, z: (pA.z + pB.z) / 2 };
      }
      info.corners.push(corner);
    }
    for (const c of info.corners) { c.A.trim = Math.max(c.A.trim, c.tA); c.B.trim = Math.max(c.B.trim, c.tB); }
    for (const a of arms) a.trim = Math.max(a.trim, a.wa * 0.4) + 0.4;
  }

  /** Re-anchor curved arms: frame = tangent at the trim point on the curve. Returns true when anything moved. */
  refreshFrames(info) {
    let moved = false;
    const o = {};
    for (const a of info.arms) {
      if (!a.e.ctrl) continue;
      const trim = Math.min(a.trim, a.e.length * 0.45);
      this.armAt(a, trim, o);
      const nd = norm2(o.dx, o.dz);
      const ox = o.x - nd.x * trim, oz = o.z - nd.z * trim;
      if (Math.abs(nd.x - a.d.x) > 1e-4 || Math.abs(nd.z - a.d.z) > 1e-4 || Math.abs(ox - a.ox) > 0.01 || Math.abs(oz - a.oz) > 0.01) moved = true;
      a.d = nd; a.s = { x: -nd.z, z: nd.x }; a.ox = ox; a.oz = oz; a.ang = Math.atan2(nd.z, nd.x);
    }
    return moved;
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
    const atEnd = ramp.atA === false;
    const probeD = atEnd ? Math.max(0, c.len - 60) : Math.min(c.len, 60);
    const o = net.sampleAt(ramp.e.id, probeD, {});
    const sAxis = { x: -R.d.z, z: R.d.x };
    const sideSign = ((o.x - n.x) * sAxis.x + (o.z - n.z) * sAxis.z) >= 0 ? 1 : -1;
    const sOut = { x: sAxis.x * sideSign, z: sAxis.z * sideSign };
    const TyH = R.T, TyR = ramp.T;
    const per = Math.max(1, Math.floor(R.e.lanes / 2));
    const usable = TyH.asphaltHalf - TyH.shoulder - TyH.median / 2;
    const lw = usable / per;
    const ext = lw + TyH.shoulder;
    const oRight = O.atA ? O.s : { x: -O.s.x, z: -O.s.z };
    O.e.accel = { atA: O.atA, ext, side: (oRight.x * sOut.x + oRight.z * sOut.z) >= 0 ? 1 : -1, L: ACCEL_LEN };
    const rRight = R.atA ? R.s : { x: -R.s.x, z: -R.s.z };
    R.e.noKerb = { atA: R.atA, side: (rRight.x * sOut.x + rRight.z * sOut.z) >= 0 ? 1 : -1, L: MERGE_LEN };
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
    c.s[0] = 0;
    for (let i = 1; i < c.n; i++) c.s[i] = c.s[i - 1] + Math.hypot(c.xs[i] - c.xs[i - 1], c.zs[i] - c.zs[i - 1]);
    c.len = c.s[c.n - 1]; ramp.e.length = c.len;
    for (let i = 0; i < c.n; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(c.n - 1, i + 1);
      const dx = c.xs[i1] - c.xs[i0], dz = c.zs[i1] - c.zs[i0]; const l = Math.hypot(dx, dz) || 1;
      c.tx[i] = dx / l; c.tz[i] = dz / l;
    }
    const rt = atEnd ? { x: ramp.d.z, z: -ramp.d.x } : { x: -ramp.d.z, z: ramp.d.x };
    const rightIsOut = (rt.x * sOut.x + rt.z * sOut.z) > 0;
    ramp.e.merge = { atEnd, node: n, sOut, halfAt, shoulderAt, innerSide: rightIsOut ? -1 : 1, ext };
    info.merge = { R, ramp, sOut, sideSign: (sOut.x * R.s.x + sOut.z * R.s.z) >= 0 ? 1 : -1, TyH, shoulderAt };
    return true;
  }

  armOf(info, e) { return info.arms.find((a) => a.e === e); }

  /** Intersection outline (asphalt polygon ring) + corner sidewalk paths, from the final arm frames. */
  nodeShapes(info) {
    const n = info.node;
    const ring = [];
    const pushPt = (x, z) => {
      const l = ring[ring.length - 1];
      if (l && Math.abs(l.x - x) < 1e-3 && Math.abs(l.z - z) < 1e-3) return;
      ring.push({ x, z });
    };
    const paths = [];
    const o = {};
    for (const c of info.corners) {
      const A = c.A, B = c.B;
      const aMinus = { x: A.ox + A.d.x * A.trim - A.s.x * A.wa, z: A.oz + A.d.z * A.trim - A.s.z * A.wa };
      const aPlus = { x: A.ox + A.d.x * A.trim + A.s.x * A.wa, z: A.oz + A.d.z * A.trim + A.s.z * A.wa };
      const bMinus = { x: B.ox + B.d.x * B.trim - B.s.x * B.wa, z: B.oz + B.d.z * B.trim - B.s.z * B.wa };
      pushPt(aMinus.x, aMinus.z);
      pushPt(aPlus.x, aPlus.z);
      const path = [{ x: aPlus.x, z: aPlus.z, nx: A.s.x, nz: A.s.z, t: 0 }];
      if (c.kind === 'curve') {
        // island side of a roundabout: follow A's curve back to the node, then B's curve out to its trim
        const stepsA = Math.max(2, Math.ceil(A.trim / 1.5)), stepsB = Math.max(2, Math.ceil(B.trim / 1.5));
        for (let k = 1; k <= stepsA; k++) {
          this.armAt(A, A.trim * (1 - k / stepsA), o);
          path.push({ x: o.x + o.sx * A.wa, z: o.z + o.sz * A.wa, nx: o.sx, nz: o.sz, t: 0 });
        }
        for (let k = 1; k < stepsB; k++) {
          this.armAt(B, B.trim * (k / stepsB), o);
          path.push({ x: o.x - o.sx * B.wa, z: o.z - o.sz * B.wa, nx: -o.sx, nz: -o.sz, t: 1 });
        }
        path.push({ x: bMinus.x, z: bMinus.z, nx: -B.s.x, nz: -B.s.z, t: 1 });
      } else if (c.kind === 'fillet') {
        const TA = { x: c.C.x + A.d.x * c.k, z: c.C.z + A.d.z * c.k };
        const TB = { x: c.C.x + B.d.x * c.k, z: c.C.z + B.d.z * c.k };
        if (Math.hypot(TA.x - aPlus.x, TA.z - aPlus.z) > 0.05) path.push({ x: TA.x, z: TA.z, nx: A.s.x, nz: A.s.z, t: 0 });
        const a0 = Math.atan2(TA.z - c.center.z, TA.x - c.center.x);
        const a1 = Math.atan2(TB.z - c.center.z, TB.x - c.center.x);
        let da = a1 - a0;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const segs = Math.max(3, Math.ceil(Math.abs(da) * c.r / 1.0));
        for (let k = 1; k < segs; k++) {
          const a = a0 + da * (k / segs);
          path.push({ x: c.center.x + Math.cos(a) * c.r, z: c.center.z + Math.sin(a) * c.r, nx: -Math.cos(a), nz: -Math.sin(a), t: k / segs });
        }
        path.push({ x: TB.x, z: TB.z, nx: -B.s.x, nz: -B.s.z, t: 1 });
        if (Math.hypot(TB.x - bMinus.x, TB.z - bMinus.z) > 0.05) path.push({ x: bMinus.x, z: bMinus.z, nx: -B.s.x, nz: -B.s.z, t: 1 });
      } else {
        const m = norm2(A.s.x - B.s.x, A.s.z - B.s.z);
        const cosHalf = Math.max(0.35, Math.abs(m.x * A.s.x + m.z * A.s.z));
        path.push({ x: c.C.x, z: c.C.z, nx: m.x / cosHalf, nz: m.z / cosHalf, t: 0.5 });
        path.push({ x: bMinus.x, z: bMinus.z, nx: -B.s.x, nz: -B.s.z, t: 1 });
      }
      // drop consecutive duplicates
      const clean = [path[0]];
      for (let k = 1; k < path.length; k++) { const p = path[k], q = clean[clean.length - 1]; if (Math.hypot(p.x - q.x, p.z - q.z) > 0.03) clean.push(p); }
      for (let k = 1; k < clean.length - 1; k++) pushPt(clean[k].x, clean[k].z);
      paths.push({ path: clean, A, B });
    }
    info.ring = ring; info.paths = paths;
  }

  /** Signed distance (≤ 0 inside) from a point to the node's paved region (arm rectangles + corner sidewalks). */
  regionDist(info, px, pz, halfOf) {
    let best = Infinity;
    for (const a of info.arms) {
      const lx = px - a.ox, lz = pz - a.oz;
      const along = lx * a.d.x + lz * a.d.z, across = Math.abs(lx * a.s.x + lz * a.s.z);
      const dx = Math.max(-along - 0.5, along - (a.trim + 0.5)), dy = across - halfOf(a);
      const d = (dx > 0 && dy > 0) ? Math.hypot(dx, dy) : Math.max(dx, dy);
      if (d < best) best = d;
    }
    for (const { path, A, B } of info.paths) {
      const sw = Math.max(A.sw, B.sw) + FLAT_MARGIN + 0.5;
      for (const p of path) { const d = Math.hypot(px - p.x, pz - p.z) - sw; if (d < best) best = d; }
    }
    return best;
  }

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
      const h = c.design[i];
      c.terrain[i] = h;
      const w = h < T.seaLevel;            // design height, so filled shores do not flip on a rebuild
      c.water[i] = w ? 1 : 0;
      if (w) anyWater = true;
      raw[i] = w ? Math.max(h, T.seaLevel + BRIDGE_CLEAR + 1.6) : h;
    }
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
    // grade limit: average of a cut-limited (peaks lowered) and a fill-limited (dips raised) profile, both within
    // MAX_GRADE, so steep ridges are cut and gullies filled instead of the road following a 40% slope
    if (n > 2) {
      const cut = Float64Array.from(c.smooth), fill = Float64Array.from(c.smooth);
      for (let i = 1; i < n; i++) { const ds = (c.s[i] - c.s[i - 1]) * MAX_GRADE; cut[i] = Math.min(cut[i], cut[i - 1] + ds); fill[i] = Math.max(fill[i], fill[i - 1] - ds); }
      for (let i = n - 2; i >= 0; i--) { const ds = (c.s[i + 1] - c.s[i]) * MAX_GRADE; cut[i] = Math.min(cut[i], cut[i + 1] + ds); fill[i] = Math.max(fill[i], fill[i + 1] - ds); }
      for (let i = 0; i < n; i++) c.smooth[i] = c.water[i] ? Math.max(c.smooth[i], (cut[i] + fill[i]) * 0.5) : (cut[i] + fill[i]) * 0.5;
    }
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
      if ((n.designY ?? y) < T.seaLevel) y = Math.max(y, T.seaLevel + BRIDGE_CLEAR);
      n.y = y;
    }
  }

  profileBlend(e) {
    const net = this.net;
    const c = net.poly(e.id);
    const nA = net.nodes.get(e.a), nB = net.nodes.get(e.b);
    const n = c.n, len = c.len;
    const yA = nA.y, yB = nB.y;
    // blend length: at most the free length between the two plateaus, so each end is exactly its node height
    const L = Math.max(0.5, Math.min(Math.max(PLATEAU, Math.min(len * 0.45, 40)), len - e.trimA - e.trimB));
    c.blend = { yA, yB, tA: e.trimA, tB: e.trimB, L };
    for (let i = 0; i < n; i++) c.ys[i] = net.blendY(c, c.s[i], c.smooth[i]);
    e.bridge = false;
    for (let i = 0; i < n; i++) {
      const b = c.water[i] || (c.ys[i] - c.terrain[i] > BRIDGE_MIN);
      c.bridge[i] = b ? 1 : 0;
      if (b) e.bridge = true;
    }
    e.elevation = e.bridge ? 1 : 0;
  }

  /** Corridor half width (asphalt + sidewalk/kerb + flat verge) of a type. */
  corridorHalf(Ty) { return Ty.asphaltHalf + (Ty.sidewalk > 0.05 ? Ty.sidewalk + 0.05 : (Ty.median > 0 || Ty.oneWay ? 0.6 : 0.3)) + FLAT_MARGIN; }

  bridgeAt(c, d) {
    let lo = 0, hi = c.n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c.s[mid] <= d) lo = mid; else hi = mid; }
    const kk = (d - c.s[lo]) / ((c.s[hi] - c.s[lo]) || 1);
    return (kk < 0.5 ? c.bridge[lo] : c.bridge[hi]) === 1;
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
      const wa = Ty.asphaltHalf, wo = this.corridorHalf(Ty) + 0.4;
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
      if (info.kind === 'end') { const a = info.arms[0]; const r = this.corridorHalf(a.T) + 0.4; for (let dz = -r; dz <= r; dz += 2) for (let dx = -r; dx <= r; dx += 2) if (dx * dx + dz * dz <= r * r) mark(n.x + dx, n.z + dz, dx * dx + dz * dz <= a.wa * a.wa ? 1 : 2); continue; }
      if (info.kind !== 'intersection') continue;
      let reach = 0;
      for (const a of info.arms) reach = Math.max(reach, a.trim + this.corridorHalf(a.T) + 2);
      for (let dz = -reach; dz <= reach; dz += 2) for (let dx = -reach; dx <= reach; dx += 2) {
        if (dx * dx + dz * dz > reach * reach) continue;
        const px = n.x + dx, pz = n.z + dz;
        if (this.regionDist(info, px, pz, (a) => this.corridorHalf(a.T) + 0.4) > 0) continue;
        mark(px, pz, this.regionDist(info, px, pz, (a) => a.wa) <= 0 ? 1 : 2);
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
  /**
   * Conform the heightfield to the road corridor: under asphalt + sidewalk + verge the terrain is set exactly
   * to (profile - DROP); outside, it is clamped to a 1:GRADE cut/fill slope from the corridor edge so hillsides
   * are graded instead of sliced. Heights are written directly and the derived data is rebuilt once via a
   * zero-strength brush (one terrain:changed). Bridge rows and sea beds are never touched.
   */
  conformTerrain() {
    const T = this.world.terrain;
    if (typeof T.modify !== 'function' || !T.heights) return;
    const res = T.resolution, cell = T.cellSize || 4, half = this.world.size / 2, h = T.heights;
    if (!res || h.length !== res * res) return;
    if (!this._grid || this._grid.res !== res) this._grid = { res, tgt: new Float32Array(res * res), best: new Float64Array(res * res), cMax: new Float32Array(res * res), cMin: new Float32Array(res * res) };
    const G = this._grid;
    G.best.fill(Infinity); G.cMax.fill(Infinity); G.cMin.fill(-Infinity);
    const sea = T.seaLevel ?? 0;
    // sea-bed mask from the untouched heightfield (taken once), so filled shores keep the same decision on rebuilds
    if (!G.seabed) { G.seabed = new Uint8Array(res * res); G.origH = Float32Array.from(h); for (let i = 0; i < res * res; i++) G.seabed[i] = h[i] < sea + 0.3 ? 1 : 0; }
    let ix0 = res, iz0 = res, ix1 = -1, iz1 = -1;
    const mark = (px, pz, roadY, uOut) => {
      const ix = Math.round((px + half) / cell), iz = Math.round((pz + half) / cell);
      if (ix < 0 || iz < 0 || ix >= res || iz >= res) return;
      const i = iz * res + ix;
      if (G.seabed[i] && roadY - G.origH[i] > 2.5) return;     // water / sea bed: decks and abutments handle it
      const t = roadY - DROP;
      if (uOut <= 0) {
        // the sample closest to the vertex sets its height (rows are 1 m apart; on a grade this matters)
        const ddx = px - (ix * cell - half), ddz = pz - (iz * cell - half);
        const key = ddx * ddx + ddz * ddz;
        if (key < G.best[i]) { G.best[i] = key; G.tgt[i] = t; }
      } else {
        const s = uOut / GRADE;
        if (t + s < G.cMax[i]) G.cMax[i] = t + s;
        if (t - s > G.cMin[i]) G.cMin[i] = t - s;
      }
      if (ix < ix0) ix0 = ix; if (ix > ix1) ix1 = ix; if (iz < iz0) iz0 = iz; if (iz > iz1) iz1 = iz;
    };
    const o = {};
    const STEP = Math.min(1.0, cell * 0.25);
    for (const e of this.net.edges.values()) {
      const c = this.net.poly(e.id);
      const Ty = this.net.typeOf(e.type);
      const halfC = this.corridorHalf(Ty);
      const from = Math.max(0, e.trimA - 1), to = Math.min(c.len, c.len - e.trimB + 1);
      for (let d = from; d <= to + 0.001; d += STEP) {
        const dd = Math.min(d, to);
        if (this.bridgeAt(c, dd)) { if (dd >= to) break; continue; }
        this.net.sampleAt(e.id, dd, o);
        const nx = -o.tz, nz = o.tx;
        let extL = 0, extR = 0;
        if (e.accel) { const dist = e.accel.atA ? dd : c.len - dd; const ext = e.accel.ext * (1 - smooth01(dist / e.accel.L)); if (e.accel.side > 0) extR = ext; else extL = ext; }
        if (e.merge) { const dist = e.merge.atEnd ? c.len - dd : dd; if (dist < MERGE_LEN) { const hh = e.merge.halfAt(dist) + 0.6 + FLAT_MARGIN; extL = hh - halfC; extR = hh - halfC; } }
        const hL = halfC + extL, hR = halfC + extR;
        for (let u = -(hL + GRADE_REACH); u <= hR + GRADE_REACH; u += STEP) {
          const uOut = u < 0 ? -u - hL : u - hR;
          mark(o.x + nx * u, o.z + nz * u, o.y, uOut);
        }
        if (dd >= to) break;
      }
    }
    for (const info of this.nodeInfo.values()) {
      const n = info.node;
      if (info.kind === 'end') {
        const a = info.arms[0]; const r = this.corridorHalf(a.T);
        const R2 = r + GRADE_REACH;
        for (let dz = -R2; dz <= R2; dz += STEP) for (let dx = -R2; dx <= R2; dx += STEP) { const dist = Math.hypot(dx, dz); if (dist > R2) continue; mark(n.x + dx, n.z + dz, n.y, dist - r); }
        continue;
      }
      if (info.kind !== 'intersection') continue;
      if ((n.designY ?? n.y) < sea + 0.3 && n.y - (n.designY ?? n.y) > 2) continue;
      let reach = 0;
      for (const a of info.arms) reach = Math.max(reach, a.trim + this.corridorHalf(a.T) + 1);
      const R2 = reach + GRADE_REACH;
      const halfOf = (a) => this.corridorHalf(a.T);
      for (let dz = -R2; dz <= R2; dz += STEP) for (let dx = -R2; dx <= R2; dx += STEP) {
        if (dx * dx + dz * dz > R2 * R2) continue;
        const px = n.x + dx, pz = n.z + dz;
        const dist = this.regionDist(info, px, pz, halfOf);
        if (dist > GRADE_REACH) continue;
        mark(px, pz, n.y, dist);
      }
    }
    if (ix1 < ix0) { this.stats.terrainVerts = 0; this.stats.flattenCalls = 0; return; }
    // apply
    let changed = 0;
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
      const i = iz * res + ix;
      let v = h[i];
      if (G.best[i] < Infinity) v = G.tgt[i];
      else { if (v > G.cMax[i]) v = G.cMax[i]; if (v < G.cMin[i]) v = G.cMin[i]; }
      if (Math.abs(v - h[i]) > 1e-4) { h[i] = v; changed++; }
    }
    this.stats.terrainVerts = changed;
    this.stats.flattenCalls = changed ? 1 : 0;
    if (!changed) return;
    this.flattening = true;
    try {
      const cx = ((ix0 + ix1) / 2) * cell - half, cz = ((iz0 + iz1) / 2) * cell - half;
      const radius = Math.hypot((ix1 - ix0) / 2, (iz1 - iz0) / 2) * cell + cell * 2;
      T.modify({ x: cx, z: cz, radius, strength: 0, mode: 'raise' });
    } finally { this.flattening = false; }
  }

  // ------------------------------------------------------------------ edge strips
  emitEdge(e) {
    const net = this.net;
    const c = net.poly(e.id);
    const Ty = net.typeOf(e.type);
    const iA = this.nodeInfo.get(e.a), iB = this.nodeInfo.get(e.b);
    const nA = net.nodes.get(e.a), nB = net.nodes.get(e.b);
    const from = e.trimA, to = c.len - e.trimB;
    if (to - from < 0.5) return;
    const rowStep = e.ctrl ? ROW_CURVE : ROW;
    const ds = [from];
    for (let d = Math.ceil(from / rowStep) * rowStep; d < to - 0.5; d += rowStep) if (d > from + 0.5) ds.push(d);
    ds.push(to);
    c.rowDs = ds;
    const rows = [];
    const o = {};
    const hasKerb = Ty.sidewalk > 0.05;
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      net.sampleAt(e.id, d, o);
      let x = o.x, z = o.z, nx = -o.tz, nz = o.tx, scale = 1;
      if (i === 0) {
        if (iA.kind === 'intersection') { const a = this.armOf(iA, e); x = a.ox + a.d.x * a.trim; z = a.oz + a.d.z * a.trim; nx = a.s.x; nz = a.s.z; }
        else if ((iA.kind === 'joint' || iA.kind === 'merge') && !e.merge) { const m = iA.mitre; const sgn = (m.nx * nx + m.nz * nz) >= 0 ? 1 : -1; nx = m.nx * sgn; nz = m.nz * sgn; scale = m.scale; x = nA.x; z = nA.z; }
      } else if (i === ds.length - 1) {
        if (iB.kind === 'intersection') { const a = this.armOf(iB, e); x = a.ox + a.d.x * a.trim; z = a.oz + a.d.z * a.trim; nx = -a.s.x; nz = -a.s.z; }
        else if ((iB.kind === 'joint' || iB.kind === 'merge') && !e.merge) { const m = iB.mitre; const sgn = (m.nx * nx + m.nz * nz) >= 0 ? 1 : -1; nx = m.nx * sgn; nz = m.nz * sgn; scale = m.scale; x = nB.x; z = nB.z; }
      }
      let lo = 0, hi = c.n - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c.s[mid] <= d) lo = mid; else hi = mid; }
      const kk = (d - c.s[lo]) / ((c.s[hi] - c.s[lo]) || 1);
      const terr = c.terrain[lo] + (c.terrain[hi] - c.terrain[lo]) * kk;
      const bridge = (kk < 0.5 ? c.bridge[lo] : c.bridge[hi]) === 1;
      const dEndA = iA.kind === 'intersection' || iA.kind === 'end' ? d - from : 1e4;
      const dEndB = iB.kind === 'intersection' || iB.kind === 'end' ? to - d : 1e4;
      const row = { x, y: o.y, z, nx, nz, scale, d, terr, bridge, water: (kk < 0.5 ? c.water[lo] : c.water[hi]) === 1, dEnd: Math.min(dEndA, dEndB), tx: o.tx, tz: o.tz, wL: Ty.asphaltHalf, wR: Ty.asphaltHalf, sideL: true, sideR: true, road: null, kerbL: hasKerb, kerbR: hasKerb };
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
        if (dist < e.noKerb.L + 0.5) { if (e.noKerb.side > 0) { row.sideR = false; row.kerbR = false; } else { row.sideL = false; row.kerbL = false; } }
      }
      if (e.merge) {
        const M = e.merge;
        const dist = M.atEnd ? c.len - d : d;
        if (dist < MERGE_LEN + 0.5) {
          const hh = M.halfAt(dist);
          row.wL = hh; row.wR = hh;
          if (M.innerSide > 0) { row.sideR = false; row.kerbR = false; } else { row.sideL = false; row.kerbL = false; }
          row.road = { wa: hh, y: M.shoulderAt(dist), flags: packFlags({ oneWay: true, lanes: 1, noLineL: M.innerSide < 0, noLineR: M.innerSide > 0 }), dEnd: 1e4 };
        }
      }
      if (e.ring) row.dEnd = 1e4;     // no solid-near-stop-line on roundabout rings
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
    for (let i = 0; i < nR; i++) {
      const r0 = rows[Math.max(0, i - 1)], r1 = rows[Math.min(nR - 1, i + 1)];
      const fx = r1.x - r0.x, fy = r1.y - r0.y, fz = r1.z - r0.z;
      const l = Math.hypot(fx, fy, fz) || 1; rows[i].fx = fx / l; rows[i].fy = fy / l; rows[i].fz = fz / l;
      if (opts.pathTangent) { rows[i].fx = rows[i].tx; rows[i].fz = rows[i].tz; rows[i].fy = 0; }
    }
    const baseFlags = { oneWay: !!(e && e.oneWay), hw: Ty.median > 0, dbl: Ty.lanes >= 4 && Ty.median === 0, lanes: e ? e.lanes : 0 };
    const laneW = (e && e.oneWay) ? Ty.shoulder : Ty.laneW;
    const wa = base;
    // ---- asphalt surface
    if (withAsphalt) {
      const ids = new Array(nR);
      for (let i = 0; i < nR; i++) {
        const r = rows[i];
        const rx = r.nx * r.scale, rz = r.nz * r.scale;
        const ux = 0 * r.fz - rz * r.fy, uy = rz * r.fx - rx * r.fz, uz = rx * r.fy - 0 * r.fx;
        const ul = Math.hypot(ux, uy, uz) || 1;
        const y = r.y + ROAD_LIFT;
        const wL = r.wL ?? wa, wR = r.wR ?? wa;
        // aRoad = (asphalt half width, shoulder [one-way] or accel-lane width [two-way], packed flags, distance to end)
        let rw = wa, ry = (e && e.oneWay) ? laneW : (r.ext || 0), rf, rd = r.dEnd;
        if (r.road) { rw = r.road.wa; ry = r.road.y; rf = r.road.flags; rd = r.road.dEnd; }
        else rf = packFlags({ ...baseFlags, extLeft: !!r.extLeft, kerbL: r.kerbL, kerbR: r.kerbR });
        const a = asphaltAcc.v(r.x - rx * wL, y, r.z - rz * wL, ux / ul, uy / ul, uz / ul, -wL, r.d, SW_COL, rw, ry, rf, rd);
        const b = asphaltAcc.v(r.x + rx * wR, y, r.z + rz * wR, ux / ul, uy / ul, uz / ul, wR, r.d, SW_COL, rw, ry, rf, rd);
        ids[i] = [a, b];
      }
      for (let i = 1; i < nR; i++) asphaltAcc.quadN(ids[i - 1][0], ids[i][0], ids[i][1], ids[i - 1][1]);
    }
    // ---- side profiles
    for (const sgn of sides) {
      const sw = Ty.sidewalk;
      const swOf = (i) => (opts.swAt ? opts.swAt(i) : sw);
      const prof = (i) => {
        const s = swOf(i);
        if (s > 0.05) {
          return [
            { u: wa, y: 0, kind: 'kerbface' }, { u: wa + 0.05, y: KERB_H, kind: 'kerbface' },
            { u: wa + 0.05, y: KERB_H, kind: 'kerb' }, { u: wa + 0.38, y: SW_H, kind: 'kerb' },
            { u: wa + 0.38, y: SW_H, kind: 'swin' }, { u: wa + s, y: SW_H - 0.03, kind: 'sw' },
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
      const colOf = (kind) => kind === 'sw' ? SW_COL : kind === 'swin' ? SW_IN_COL : kind === 'kerbface' ? KERB_FACE_COL : KERB_COL;
      const emitProfileRow = (i) => {
        const r = rows[i];
        const P = prof(i);
        const rx = r.nx * r.scale * sgn, rz = r.nz * r.scale * sgn;
        const wb = (sgn > 0 ? r.wR : r.wL) ?? wa;
        const ids = [];
        for (let k = 0; k < P.length; k += 2) {
          const p0 = P[k], p1 = P[k + 1];
          const u0 = p0.u - wa + wb, u1 = p1.u - wa + wb;
          let du = (p1.u - p0.u), dy = p1.y - p0.y;
          const l = Math.hypot(du, dy) || 1; du /= l; dy /= l;
          const nu = -dy, ny = du;
          const nx = rx * nu, nz = rz * nu;
          const nl = Math.hypot(nx, ny, nz) || 1;
          const acc = p0.kind === 'edge' ? grav : conc;
          const c0 = p0.kind === 'swin' ? SW_IN_COL : colOf(p0.kind), c1 = p0.kind === 'swin' ? SW_COL : colOf(p0.kind);
          const a = acc.v(r.x + rx * u0, r.y + p0.y, r.z + rz * u0, nx / nl, ny / nl, nz / nl, u0, r.d, c0);
          const b = acc.v(r.x + rx * u1, r.y + p1.y, r.z + rz * u1, nx / nl, ny / nl, nz / nl, u1, r.d, c1);
          ids.push([acc, a, b]);
        }
        return { ids, outerU: P[P.length - 1].u - wa + wb, outerY: P[P.length - 1].y };
      };
      const skirtPrev = { a: -1, b: -1 };
      const parapetPrev = { ids: null };
      const emitSkirt = (i, r, cur, connect) => {
        const rx = r.nx * r.scale * sgn, rz = r.nz * r.scale * sgn;
        const u0 = cur.outerU, y0 = r.y + cur.outerY;
        // gravel verge from the sidewalk back to the (graded) ground; if the ground is lower than the 1:GRADE
        // line, march outward until the line meets it so the verge never ends in mid air
        let uFoot = u0 + FLAT_MARGIN, yFoot;
        const terr0 = T.getHeight(r.x + rx * uFoot, r.z + rz * uFoot);
        if (y0 - terr0 <= 0.4) yFoot = Math.min(terr0, y0) - 0.22;
        else {
          let found = false;
          for (let uu = uFoot; uu <= u0 + 45; uu += 0.5) {
            const yl = y0 - (uu - u0 - 0.5) / GRADE;
            const th = T.getHeight(r.x + rx * uu, r.z + rz * uu);
            if (th >= yl - 0.05) { uFoot = uu; yFoot = th - 0.3; found = true; break; }
          }
          if (!found) { uFoot = u0 + 45; yFoot = y0 - 44.5 / GRADE; }
        }
        let du = uFoot - u0, dy = yFoot - y0; const l = Math.hypot(du, dy) || 1; du /= l; dy /= l;
        const nu = -dy, ny = du;
        const nx = rx * nu, nz = rz * nu; const nl = Math.hypot(nx, ny, nz) || 1;
        const dh = Math.max(0, y0 - yFoot);
        const shade = Math.max(0.78, 1 - dh * 0.03);
        const topCol = [0.58, 0.6, 0.5], botCol = [0.5 * shade, 0.56 * shade, 0.4 * shade];
        const a = grav.v(r.x + rx * u0, y0, r.z + rz * u0, nx / nl, ny / nl, nz / nl, u0, r.d, topCol);
        const b = grav.v(r.x + rx * uFoot, yFoot, r.z + rz * uFoot, nx / nl, ny / nl, nz / nl, uFoot, r.d, botCol);
        if (connect && skirtPrev.a >= 0) grav.quadN(skirtPrev.a, a, b, skirtPrev.b);
        skirtPrev.a = a; skirtPrev.b = b;
      };
      const emitParapet = (i, r, cur, connect) => {
        const rx = r.nx * r.scale * sgn, rz = r.nz * r.scale * sgn;
        const u0 = cur.outerU - 0.05, yTop = r.y + 1.05, yDeck = r.y + cur.outerY, yBot = r.y - DECK_DEPTH;
        const pts = [
          [u0, yDeck, -1, 0, BARRIER_SIDE_COL], [u0, yTop, -1, 0, BARRIER_SIDE_COL],
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
        const needPar = r.bridge || (rp && rp.bridge), needSk = !r.bridge;
        if (needPar) emitParapet(i, r, cur, parapetPrev.ids !== null); else parapetPrev.ids = null;
        if (needSk) emitSkirt(i, r, cur, skirtPrev.a >= 0); else skirtPrev.a = -1;
        prev = cur;
      }
    }
    // ---- bridge deck underside + piers + abutments (once per strip, not per side)
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
            if (yBot - ground > 1.5) { this.emitPier(conc, r.x, r.z, yBot + 0.1, ground, rx, rz, outer * 0.72, 1.4, r.fx, r.fz); lastPier = r.d; }
          }
        } else inRun = false;
        if (i > 0 && rows[i - 1].bridge !== r.bridge) {
          const g = r.bridge ? rows[i - 1] : r, b = r.bridge ? r : rows[i - 1];
          this.emitAbutment(conc, g, b, outer);
        }
      }
      for (let i = 1; i < nR; i++) if (deckIds[i] && deckIds[i - 1]) conc.quadN(deckIds[i - 1][0], deckIds[i][0], deckIds[i][1], deckIds[i - 1][1]);
    }
    // ---- highway median barrier
    if (withAsphalt && Ty.median > 0) {
      const prof = [[-0.45, 0.0, -1, 0, BARRIER_SIDE_COL], [-0.32, 0.30, -1, 0.12, BARRIER_SIDE_COL], [-0.32, 0.30, -1, 0.3, BARRIER_SIDE_COL], [-0.14, 0.92, -1, 0.3, BARRIER_COL], [-0.14, 0.92, 0, 1, BARRIER_COL], [0.14, 0.92, 0, 1, BARRIER_COL], [0.14, 0.92, 1, 0.3, BARRIER_COL], [0.32, 0.30, 1, 0.3, BARRIER_SIDE_COL], [0.32, 0.30, 1, 0.12, BARRIER_SIDE_COL], [0.45, 0.0, 1, 0, BARRIER_SIDE_COL]];
      let prevIds = null;
      for (let i = 0; i < nR; i++) {
        const r = rows[i];
        const rx = r.nx * r.scale, rz = r.nz * r.scale;
        const ids = [];
        for (let k = 0; k < prof.length; k += 2) {
          const p0 = prof[k], p1 = prof[k + 1];
          const nx = rx * p0[2], ny = p0[3], nz = rz * p0[2]; const nl = Math.hypot(nx, ny, nz) || 1;
          const a = conc.v(r.x + rx * p0[0], r.y + ROAD_LIFT + p0[1], r.z + rz * p0[0], nx / nl, ny / nl, nz / nl, p0[0] + p0[1], r.d, p0[4]);
          const b = conc.v(r.x + rx * p1[0], r.y + ROAD_LIFT + p1[1], r.z + rz * p1[0], nx / nl, ny / nl, nz / nl, p1[0] + p1[1], r.d, p1[4]);
          ids.push([a, b]);
        }
        if (prevIds) for (let k = 0; k < ids.length; k++) conc.quadN(prevIds[k][0], ids[k][0], ids[k][1], prevIds[k][1]);
        prevIds = ids;
      }
    }
  }

  /** Abutment: concrete block from the deck end down into the embankment, with angled wing walls. */
  emitAbutment(acc, g, b, outer) {
    const T = this.world.terrain;
    // along axis from the ground row (g) to 1.2 m past the deck row (b)
    const fx0 = b.x - g.x, fz0 = b.z - g.z; const fl = Math.hypot(fx0, fz0) || 1; const fx = fx0 / fl, fz = fz0 / fl;
    const rx = -fz, rz = fx;
    const w = outer + 0.12;
    const yTop = Math.min(g.y, b.y) - 0.02;
    const cornersXZ = [[g.x - rx * w, g.z - rz * w], [b.x - rx * w + fx * 1.2, b.z - rz * w + fz * 1.2], [b.x + rx * w + fx * 1.2, b.z + rz * w + fz * 1.2], [g.x + rx * w, g.z + rz * w]];
    let yBot = Infinity;
    for (const [x, z] of cornersXZ) yBot = Math.min(yBot, T.getHeight(x, z));
    yBot = Math.max(Math.min(yBot, T.getHeight(b.x, b.z)) - 1.2, (T.seaLevel ?? 0) - 6);
    const faces = [[1, 2, fx, fz], [0, 1, -rx, -rz], [2, 3, rx, rz]];   // front + two sides (back is buried)
    for (const [i0, i1, nx, nz] of faces) {
      const P0 = cornersXZ[i0], P1 = cornersXZ[i1];
      const a = acc.v(P0[0], yBot, P0[1], nx, 0, nz, 0, yBot, PIER_COL);
      const bb = acc.v(P1[0], yBot, P1[1], nx, 0, nz, 4, yBot, PIER_COL);
      const c = acc.v(P1[0], yTop, P1[1], nx, 0, nz, 4, yTop, PIER_COL);
      const d = acc.v(P0[0], yTop, P0[1], nx, 0, nz, 0, yTop, PIER_COL);
      acc.quadN(a, bb, c, d);
    }
    // wing walls: from the front corners back along the embankment, flaring outward
    for (const sgn of [1, -1]) {
      const cx = b.x + sgn * rx * w + fx * 1.2, cz = b.z + sgn * rz * w + fz * 1.2;
      const ex = g.x + sgn * rx * (w + 2.6) - fx * 2.5, ez = g.z + sgn * rz * (w + 2.6) - fz * 2.5;
      const yTopE = yTop - 0.15, yBotE = Math.max(Math.min(T.getHeight(ex, ez), yTop - 0.3) - 0.8, yTop - 3.2);
      const dxw = ex - cx, dzw = ez - cz; const nl = Math.hypot(dxw, dzw) || 1;
      const nx = sgn * (dzw / nl), nz = -sgn * (dxw / nl);
      const v = [acc.v(cx, yBot, cz, nx, 0, nz, 0, 0, PIER_COL), acc.v(ex, yBotE, ez, nx, 0, nz, 3, 0, PIER_COL), acc.v(ex, yTopE, ez, nx, 0, nz, 3, 2, PIER_COL), acc.v(cx, yTop, cz, nx, 0, nz, 0, 2, PIER_COL)];
      acc.quadN(v[0], v[1], v[2], v[3]);
      const u = [acc.v(cx, yBot, cz, -nx, 0, -nz, 0, 0, PIER_COL), acc.v(ex, yBotE, ez, -nx, 0, -nz, 3, 0, PIER_COL), acc.v(ex, yTopE, ez, -nx, 0, -nz, 3, 2, PIER_COL), acc.v(cx, yTop, cz, -nx, 0, -nz, 0, 2, PIER_COL)];
      acc.quadN(u[0], u[1], u[2], u[3]);
      // cap on top of the wing wall
      const t = [acc.v(cx + nx * 0.2, yTop, cz + nz * 0.2, 0, 1, 0, 0, 0, BARRIER_COL), acc.v(ex + nx * 0.2, yTopE, ez + nz * 0.2, 0, 1, 0, 3, 0, BARRIER_COL), acc.v(ex - nx * 0.2, yTopE, ez - nz * 0.2, 0, 1, 0, 3, 0.4, BARRIER_COL), acc.v(cx - nx * 0.2, yTop, cz - nz * 0.2, 0, 1, 0, 0, 0.4, BARRIER_COL)];
      acc.quadN(t[0], t[1], t[2], t[3]);
    }
  }

  emitPier(acc, x, z, yTop, yBot, rx, rz, halfW, halfT, fx, fz) {
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
    // pier cap (a wider head under the deck, still inside the deck's outer edge)
    const capH = 0.9, cw = halfW * 1.28, ct = halfT * 1.5;
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
    if (info.kind === 'merge') { this.emitGore(info); return; }
    if (info.kind !== 'intersection') return;
    const arms = info.arms;
    const ring = info.ring, paths = info.paths;
    if (ring.length >= 3) {
      const acc = this.acc('asphalt', n.x, n.z);
      const y = n.y + ROAD_LIFT;
      const contour = ring.map((p) => new THREE.Vector2(p.x, p.z));
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (err) { tris = []; }
      const ids = ring.map((p) => acc.v(p.x, y, p.z, 0, 1, 0, p.x, p.z, SW_COL, 0, 0, 0, 0));
      for (const t of tris) {
        const a = ring[t[0]], b = ring[t[1]], c2 = ring[t[2]];
        const cross = (b.x - a.x) * (c2.z - a.z) - (b.z - a.z) * (c2.x - a.x);
        if (cross < 0) acc.tri(ids[t[0]], ids[t[1]], ids[t[2]]); else acc.tri(ids[t[0]], ids[t[2]], ids[t[1]]);
      }
    }
    for (const { path, A, B } of paths) {
      const rows = path.map((p) => ({ x: p.x, y: n.y, z: p.z, nx: p.nx, nz: p.nz, scale: 1, d: 0, terr: 0, bridge: false, water: false, dEnd: 0, tx: 0, tz: 0 }));
      for (let i = 1; i < rows.length; i++) rows[i].d = rows[i - 1].d + Math.hypot(rows[i].x - rows[i - 1].x, rows[i].z - rows[i - 1].z);
      for (let i = 0; i < rows.length; i++) { rows[i].tx = -rows[i].nz; rows[i].tz = rows[i].nx; }
      const TyA = A.T, TyB = B.T;
      const Ty = (TyA.sidewalk >= TyB.sidewalk) ? TyA : TyB;
      const swAt = Ty.sidewalk > 0.05 ? ((i) => Math.max(0.6, TyA.sidewalk + (TyB.sidewalk - TyA.sidewalk) * (path[i].t ?? 0))) : null;
      this.emitStrip(rows, Ty, null, n.x, n.z, 0, { asphalt: false, sides: [1], swAt, pathTangent: true });
    }
    if (arms.length >= 3 || arms.some((a) => a.T.sidewalk > 0)) this.emitDecals(info);
  }

  emitDeadEnd(info) {
    const n = info.node, a = info.arms[0];
    if (!a) return;
    const Ty = a.T;
    const wa = a.wa;
    const rows = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const ang0 = Math.atan2(a.s.z, a.s.x);
      const mid = Math.atan2(-a.d.z, -a.d.x);
      let da0 = mid - ang0; while (da0 > Math.PI) da0 -= 2 * Math.PI; while (da0 < -Math.PI) da0 += 2 * Math.PI;
      const ang = ang0 + da0 * 2 * k;
      const nx = Math.cos(ang), nz = Math.sin(ang);
      rows.push({ x: n.x + nx * wa, y: n.y, z: n.z + nz * wa, nx, nz, scale: 1, d: k * Math.PI * wa, terr: 0, bridge: false, water: false, dEnd: 0, tx: -nz, tz: nx });
    }
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

  /** Decal helpers in an arm's local frame: u across (+s), w along the arm away from the node, on the curve. */
  stripY(e, d) {
    const c = this.net.poly(e.id), ds = c.rowDs;
    if (!ds || ds.length < 2) return this.net.sampleAt(e.id, d, this._tmp).y;
    let i = 0;
    while (i < ds.length - 2 && ds[i + 1] < d) i++;
    const d0 = ds[i], d1 = ds[i + 1];
    const y0 = this.net.sampleAt(e.id, d0, this._tmp).y, y1 = this.net.sampleAt(e.id, d1, this._tmp).y;
    const k = Math.max(0, Math.min(1, (d - d0) / ((d1 - d0) || 1)));
    return y0 + (y1 - y0) * k;
  }

  decalFrame(paint, a) {
    const o = {};
    const P = (u, w) => {
      const dist = a.trim + w;
      this.armAt(a, dist, o);
      const y = this.stripY(a.e, a.atA ? dist : a.e.length - dist);
      return { x: o.x + o.sx * u, z: o.z + o.sz * u, y: y + ROAD_LIFT + 0.015 };
    };
    const rect = (u0, u1, w0, w1, col) => {
      const p00 = P(u0, w0), p10 = P(u1, w0), p11 = P(u1, w1), p01 = P(u0, w1);
      const i0 = paint.v(p00.x, p00.y, p00.z, 0, 1, 0, 0, 0, col), i1 = paint.v(p10.x, p10.y, p10.z, 0, 1, 0, 1, 0, col);
      const i2 = paint.v(p11.x, p11.y, p11.z, 0, 1, 0, 1, 1, col), i3 = paint.v(p01.x, p01.y, p01.z, 0, 1, 0, 0, 1, col);
      const cross = (p10.x - p00.x) * (p11.z - p00.z) - (p10.z - p00.z) * (p11.x - p00.x);
      if (cross < 0) paint.quad(i0, i1, i2, i3); else paint.quad(i0, i3, i2, i1);
    };
    const tri = (pts, col) => {
      const ps = pts.map(([u, w]) => P(u, w));
      const ids = ps.map((p) => paint.v(p.x, p.y, p.z, 0, 1, 0, 0, 0, col));
      const cross = (ps[1].x - ps[0].x) * (ps[2].z - ps[0].z) - (ps[1].z - ps[0].z) * (ps[2].x - ps[0].x);
      if (cross < 0) paint.tri(ids[0], ids[1], ids[2]); else paint.tri(ids[0], ids[2], ids[1]);
    };
    /** stroke a polyline in (u,w) with a given width; square joints */
    const stroke = (pts, width, col) => {
      const hw = width / 2;
      for (let i = 1; i < pts.length; i++) {
        const [u0, w0] = pts[i - 1], [u1, w1] = pts[i];
        const du = u1 - u0, dw = w1 - w0; const l = Math.hypot(du, dw) || 1;
        const nu = -dw / l * hw, nw = du / l * hw;
        tri([[u0 + nu, w0 + nw], [u1 + nu, w1 + nw], [u1 - nu, w1 - nw]], col);
        tri([[u0 + nu, w0 + nw], [u1 - nu, w1 - nw], [u0 - nu, w0 - nw]], col);
        if (i < pts.length - 1) { tri([[u1 - hw, w1 - hw], [u1 + hw, w1 - hw], [u1 + hw, w1 + hw]], col); tri([[u1 - hw, w1 - hw], [u1 + hw, w1 + hw], [u1 - hw, w1 + hw]], col); }
      }
    };
    /** arrow head: tip at (u,w), pointing along (du,dw) */
    const head = (u, w, du, dw, len, wide, col) => {
      const l = Math.hypot(du, dw) || 1; du /= l; dw /= l;
      const bu = u - du * len, bw = w - dw * len;
      const nu = -dw * wide / 2, nw = du * wide / 2;
      tri([[u, w], [bu + nu, bw + nw], [bu - nu, bw - nw]], col);
    };
    return { P, rect, tri, stroke, head };
  }

  emitDecals(info) {
    const n = info.node;
    const paint = this.acc('paint', n.x, n.z);
    const many = info.arms.length >= 3;
    for (const a of info.arms) {
      const e = a.e, Ty = a.T;
      if (e.ring) continue;                                 // no markings across a roundabout ring
      const isHw = Ty.median > 0 || Ty.oneWay;
      const wa = a.wa;
      const F = this.decalFrame(paint, a);
      const usableLen = e.length - e.trimA - e.trimB;
      if (!isHw && many && Ty.sidewalk > 0) {
        const bw = 0.5, gap = 0.5;
        const span = wa * 2 - 0.9;
        const count = Math.floor((span + gap) / (bw + gap));
        const start = -wa + 0.45 + (span - (count * (bw + gap) - gap)) / 2;
        if (info.hasRing) {
          // roundabout entry: give-way teeth on the incoming half, zebra further back
          for (let u = -wa + 0.5; u < -0.3; u += 0.85) F.tri([[u, 0.6], [u + 0.55, 0.6], [u + 0.275, 1.55]], PAINT_WHITE);
          if (usableLen > 12) for (let i = 0; i < count; i++) F.rect(start + i * (bw + gap), start + i * (bw + gap) + bw, 3.2, 6.2, PAINT_WHITE);
        } else {
          for (let i = 0; i < count; i++) F.rect(start + i * (bw + gap), start + i * (bw + gap) + bw, 1.4, 4.4, PAINT_WHITE);
          F.rect(-wa + 0.35, -0.12, 5.0, 5.45, PAINT_WHITE);
        }
      }
      const per = e.oneWay ? e.lanes : Math.floor(e.lanes / 2);
      if (!isHw && many && per >= 2 && !info.hasRing && usableLen > 24) {
        const usable = wa - Ty.shoulder - Ty.median / 2;
        const lw = usable / per;
        for (let k = 0; k < per; k++) {
          const cu = -(Ty.median / 2 + usable - lw * (k + 0.5));
          const kind = k === 0 ? (per === 2 ? 'straight-right' : 'right') : k === per - 1 ? 'left' : 'straight';
          this.emitArrow(F, cu, 13.0, kind);
        }
      }
    }
  }

  /** Turn arrow pointing toward the node. Driver coordinates: uD = driver's right (= -s), w along the arm. */
  emitArrow(F, cu, w0, kind) {
    const col = PAINT_WHITE;
    const map = (pts) => pts.map(([uD, w]) => [cu - uD, w0 + w]);
    const straight = kind === 'straight' || kind === 'straight-right';
    const stroke = (pts) => F.stroke(map(pts), 0.32, col);
    const head = (uD, w, du, dw, len = 1.4, wide = 1.15) => { const [u, ww] = map([[uD, w]])[0]; F.head(u, ww, -du, dw, len, wide, col); };
    if (straight) { stroke([[0, 0], [0, -3.0]]); head(0, -4.4, 0, -1); }
    else stroke([[0, 0], [0, -1.9]]);
    if (kind === 'right' || kind === 'straight-right') {
      const wb = straight ? -1.3 : -1.9;
      stroke([[0, wb], [0.16, wb - 0.5], [0.5, wb - 0.82], [0.95, wb - 0.95]]);
      head(2.1, wb - 0.95, 1, 0, 1.15, 1.05);
    }
    if (kind === 'left') {
      const wb = -1.9;
      stroke([[0, wb], [-0.16, wb - 0.5], [-0.5, wb - 0.82], [-0.95, wb - 0.95]]);
      head(-2.1, wb - 0.95, -1, 0, 1.15, 1.05);
    }
  }

  /** Gore hatching where a ramp meets the carriageway (merge nodes). */
  emitGore(info) {
    const M = info.merge; if (!M) return;
    const n = info.node;
    const paint = this.acc('paint', n.x, n.z);
    const R = M.R;
    const F = this.decalFrame(paint, { ...R, trim: 0 });
    const sg = M.sideSign;
    const waH = M.TyH.asphaltHalf, shH = M.TyH.shoulder;
    const uIn = (w) => sg * (waH - shH + 0.2);
    const uOut = (w) => sg * (waH + M.shoulderAt(w) - 0.2);
    const L = Math.min(36, R.e.length - 6);
    // boundary lines of the gore
    for (let w = 0.5; w < L - 3; w += 3) { F.rect(Math.min(uIn(w), uIn(w) + sg * 0.15), Math.max(uIn(w), uIn(w) + sg * 0.15), w, w + 3, PAINT_WHITE); }
    // chevrons pointing at the nose (the node)
    for (let w = 2.5; w < L - 2; w += 3.4) {
      const a = uIn(w), b = uOut(w);
      const pts = [[a, w + 1.6], [b, w]];
      F.stroke(pts, 0.28, PAINT_WHITE);
    }
    // nose triangle
    F.tri([[uIn(0), 0.3], [uOut(0), 0.3], [(uIn(0) + uOut(0)) / 2, 2.2]], PAINT_WHITE);
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
        out.push({ x: o.x + nx * u, y: y + (sgn === 0 ? 0 : SW_H - 0.03 + ROAD_LIFT), z: o.z + nz * u, heading: Math.atan2(dirX, -dirZ), side: sgn === 0 ? 'median' : sgn > 0 ? 'right' : 'left', edgeId, t: d / e.length });
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
        id: n.id, x: n.x, y: n.y, z: n.z, roundabout: info.hasRing,
        arms: info.arms.map((a) => ({
          edgeId: a.e.id, dir: { x: a.d.x, z: a.d.z }, trim: a.trim, width: a.wa, sidewalk: a.sw, type: a.e.type, ring: !!a.e.ring,
          lanesIn: a.e.oneWay ? (a.atA ? 0 : a.e.lanes) : Math.floor(a.e.lanes / 2),
          stopT: a.atA ? (a.trim + 5.2) / a.e.length : (a.e.length - a.trim - 5.2) / a.e.length,
          atA: a.atA,
        })),
      });
    }
    return out;
  }
}
