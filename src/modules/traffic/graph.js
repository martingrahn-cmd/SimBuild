// Lane graph over world.roads: baked lane polylines (zero-allocation lookups at runtime),
// turn topology, A* routing, signalised-intersection detection and outside connections.
const DEG = Math.PI / 180;

export class LaneGraph {
  constructor(world, log) {
    this.world = world;
    this.log = log;
    this.version = -1;
    this.edges = new Map();     // edgeId -> EdgeRec
    this.nodes = new Map();     // nodeId -> NodeRec
    this.buckets = [];          // flat array of vehicle arrays, one per (edge, lane)
    this.portals = [];          // outside connections
    this.signals = new Map();   // nodeId -> signal record
    this.driveEdges = [];       // edge ids weighted for spawning
    this.sidewalks = [];        // {edgeId, side}
    this._open = [];
    this._g = new Map();
    this._came = new Map();
  }

  get dirty() { return this.world.roads.version !== this.version; }

  build() {
    const R = this.world.roads;
    this.version = R.version;
    this.edges.clear(); this.nodes.clear(); this.signals.clear();
    this.buckets.length = 0; this.portals.length = 0; this.driveEdges.length = 0; this.sidewalks.length = 0;
    let bucketBase = 0;

    for (const e of R.edges.values()) {
      const T = R.types[e.type] || R.types.street;
      const len = e.length;
      if (!(len > 4)) continue;
      const n = Math.max(2, Math.min(512, Math.ceil(len / 4) + 1));
      const ds = len / (n - 1);
      const lanes = Math.max(1, e.lanes | 0);
      const per = e.oneWay ? lanes : Math.max(1, Math.floor(lanes / 2));
      // lane polylines (a->b parameterisation)
      const lx = [], ly = [], lz = [];
      for (let l = 0; l < lanes; l++) {
        const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const p = R.laneCenter(e.id, l, i / (n - 1));
          if (!p) { X[i] = 0; Y[i] = 0; Z[i] = 0; continue; }
          X[i] = p.x; Y[i] = p.y; Z[i] = p.z;
        }
        lx.push(X); ly.push(Y); lz.push(Z);
      }
      // centre polyline + sidewalk polylines
      const cx = new Float32Array(n), cy = new Float32Array(n), cz = new Float32Array(n);
      const swR = T.sidewalk > 0.2 ? { x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n) } : null;
      const swL = swR ? { x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n) } : null;
      const off = (T.asphaltHalf || T.width / 2) + (T.sidewalk || 0) * 0.5;
      for (let i = 0; i < n; i++) {
        const s = R.sample(e.id, i / (n - 1));
        if (!s) continue;
        cx[i] = s.x; cy[i] = s.y; cz[i] = s.z;
        if (swR) {
          const nx = -s.tangent.z, nz = s.tangent.x;
          swR.x[i] = s.x + nx * off; swR.y[i] = s.y; swR.z[i] = s.z + nz * off;
          swL.x[i] = s.x - nx * off; swL.y[i] = s.y; swL.z[i] = s.z - nz * off;
        }
      }
      const rec = {
        id: e.id, a: e.a, b: e.b, type: e.type, len, n, ds, lanes, per, oneWay: !!e.oneWay,
        speed: (T.speed || 50) / 3.6, lx, ly, lz, cx, cy, cz, swR, swL, bucket: bucketBase,
        trimA: e.trimA || 0, trimB: e.trimB || 0,
        dirA: { x: 0, z: 0 }, dirB: { x: 0, z: 0 }, big: e.type === 'highway' || e.type === 'ramp',
      };
      // tangents at the ends (pointing away from the node)
      rec.dirA = norm(cx[1] - cx[0], cz[1] - cz[0]);
      rec.dirB = norm(cx[n - 2] - cx[n - 1], cz[n - 2] - cz[n - 1]);
      this.edges.set(e.id, rec);
      bucketBase += lanes;
      const w = e.type === 'highway' ? 2.4 : e.type === 'avenue' ? 1.6 : e.type === 'alley' ? 0.35 : 1;
      this.driveEdges.push({ id: e.id, w: len * w });
      if (swR) { this.sidewalks.push({ id: e.id, side: 1 }); this.sidewalks.push({ id: e.id, side: -1 }); }
    }
    for (let i = 0; i < bucketBase; i++) this.buckets.push([]);

    // nodes with their moves
    for (const nd of R.nodes.values()) {
      const outs = [];   // moves leaving this node
      const ins = [];    // approaches arriving at this node
      for (const eid of nd.edges) {
        const rec = this.edges.get(eid);
        if (!rec) continue;
        if (rec.a === nd.id) {
          outs.push({ edgeId: eid, dir: 1, to: rec.b, len: rec.len, speed: rec.speed, ang: Math.atan2(rec.dirA.z, rec.dirA.x) });
          if (!rec.oneWay) ins.push({ edgeId: eid, dir: -1, from: rec.b, ang: Math.atan2(rec.dirA.z, rec.dirA.x) });
        }
        if (rec.b === nd.id) {
          ins.push({ edgeId: eid, dir: 1, from: rec.a, ang: Math.atan2(rec.dirB.z, rec.dirB.x) });
          if (!rec.oneWay) outs.push({ edgeId: eid, dir: -1, to: rec.a, len: rec.len, speed: rec.speed, ang: Math.atan2(rec.dirB.z, rec.dirB.x) });
        }
      }
      this.nodes.set(nd.id, {
        id: nd.id, x: nd.x, y: nd.y, z: nd.z, outs, ins,
        arms: nd.edges.size, busy: -1, busyUntil: 0, degree: nd.edges.size,
      });
    }

    this.buildSignals();
    this.findPortals();
    return this;
  }

  /** Signalise 3+ arm intersections that are not roundabouts. */
  buildSignals() {
    const R = this.world.roads;
    for (const nd of this.nodes.values()) {
      if (nd.arms < 3) continue;
      let ring = false, major = false;
      for (const m of nd.ins) {
        const rec = this.edges.get(m.edgeId);
        if (!rec) continue;
        const e = R.edges.get(m.edgeId);
        if (e && e.ring) ring = true;
        // only crossings with a big road get lights; plain street crossings are priority-controlled
        if (rec.type === 'avenue' || rec.type === 'highway') major = true;
      }
      if (ring || !major) continue;
      // group approaches into two phases by axis
      const base = nd.ins[0].ang;
      const arms = [];
      for (const m of nd.ins) {
        let d = (m.ang - base) % Math.PI;
        if (d < 0) d += Math.PI;
        const phase = (d < Math.PI * 0.25 || d > Math.PI * 0.75) ? 0 : 1;
        arms.push({ edgeId: m.edgeId, dir: m.dir, phase, key: m.edgeId * 2 + (m.dir > 0 ? 1 : 0) });
      }
      const has0 = arms.some((a) => a.phase === 0), has1 = arms.some((a) => a.phase === 1);
      if (!has0 || !has1) continue;
      const green = 9 + (nd.id % 5) * 1.6;
      this.signals.set(nd.id, {
        id: nd.id, x: nd.x, y: nd.y, z: nd.z, arms,
        phase: nd.id % 2, t: (nd.id * 3.7) % (green + 3), green, yellow: 3.0, state: 'green',
      });
    }
  }

  /** Dead-end nodes on big roads (or near the map border) become outside connections. */
  findPortals() {
    const half = this.world.size * 0.5;
    for (const nd of this.nodes.values()) {
      if (nd.arms !== 1 || nd.outs.length === 0) continue;
      const rec = this.edges.get(nd.outs[0].edgeId);
      if (!rec) continue;
      const border = Math.min(half - Math.abs(nd.x), half - Math.abs(nd.z)) < 120;
      if (!(rec.big || border || rec.type === 'avenue')) continue;
      this.portals.push({ nodeId: nd.id, x: nd.x, z: nd.z, out: nd.outs[0], big: rec.big });
    }
  }

  updateSignals(dt) {
    for (const s of this.signals.values()) {
      s.t += dt;
      const cycle = s.green + s.yellow;
      if (s.t >= cycle) { s.t -= cycle; s.phase ^= 1; }
      s.state = s.t < s.green ? 'green' : 'yellow';
    }
  }

  /** 'green' | 'yellow' | 'red' for an approach (edgeId travelling in dir) at node id. */
  approachState(nodeId, edgeId, dir) {
    const s = this.signals.get(nodeId);
    if (!s) return 'none';
    const key = edgeId * 2 + (dir > 0 ? 1 : 0);
    for (const a of s.arms) if (a.key === key) return a.phase === s.phase ? s.state : 'red';
    return 'none';
  }

  // ------------------------------------------------------------ lane sampling (no allocation)
  /** Travel distance st along (edge, dir) -> writes x,y,z,tx,tz into out. */
  laneAt(rec, lane, dir, st, out) {
    const p = dir > 0 ? st : rec.len - st;
    let f = p / rec.ds;
    let i = f | 0;
    if (i < 0) i = 0; else if (i > rec.n - 2) i = rec.n - 2;
    const k = f - i;
    const X = rec.lx[lane], Y = rec.ly[lane], Z = rec.lz[lane];
    const x0 = X[i], x1 = X[i + 1], y0 = Y[i], y1 = Y[i + 1], z0 = Z[i], z1 = Z[i + 1];
    out.x = x0 + (x1 - x0) * k;
    out.y = y0 + (y1 - y0) * k;
    out.z = z0 + (z1 - z0) * k;
    let tx = (x1 - x0) * dir, tz = (z1 - z0) * dir;
    const l = Math.hypot(tx, tz) || 1;
    out.tx = tx / l; out.tz = tz / l;
    return out;
  }

  /** Sidewalk sample: side +1 = right of a->b. */
  walkAt(rec, side, dir, st, out) {
    const sw = side > 0 ? rec.swR : rec.swL;
    if (!sw) return null;
    const p = dir > 0 ? st : rec.len - st;
    let f = p / rec.ds;
    let i = f | 0;
    if (i < 0) i = 0; else if (i > rec.n - 2) i = rec.n - 2;
    const k = f - i;
    const x0 = sw.x[i], x1 = sw.x[i + 1], y0 = sw.y[i], y1 = sw.y[i + 1], z0 = sw.z[i], z1 = sw.z[i + 1];
    out.x = x0 + (x1 - x0) * k;
    out.y = y0 + (y1 - y0) * k;
    out.z = z0 + (z1 - z0) * k;
    let tx = (x1 - x0) * dir, tz = (z1 - z0) * dir;
    const l = Math.hypot(tx, tz) || 1;
    out.tx = tx / l; out.tz = tz / l;
    return out;
  }

  /** Lanes usable in a direction: [firstIndex, count]; index0 is the rightmost lane. Allocates — cold paths only. */
  laneRange(rec, dir) {
    return [this.laneFirst(rec, dir), this.laneCount(rec, dir)];
  }
  /** Index of the rightmost usable lane for a direction (allocation-free). */
  laneFirst(rec, dir) {
    if (rec.oneWay) return 0;
    return dir > 0 ? 0 : rec.per;
  }
  /** Number of usable lanes for a direction (allocation-free). */
  laneCount(rec, dir) {
    if (rec.oneWay) return dir > 0 ? rec.lanes : 0;
    return dir > 0 ? rec.per : rec.lanes - rec.per;
  }

  nodeAhead(rec, dir) { return dir > 0 ? rec.b : rec.a; }
  nodeBehind(rec, dir) { return dir > 0 ? rec.a : rec.b; }

  /** Heading of an edge leaving `nodeId` (unit xz). */
  exitDir(rec, dir) {
    // direction of travel at the far end
    return dir > 0 ? { x: -rec.dirB.x, z: -rec.dirB.z } : { x: -rec.dirA.x, z: -rec.dirA.z };
  }
  entryDir(rec, dir) {
    return dir > 0 ? { x: rec.dirA.x, z: rec.dirA.z } : { x: rec.dirB.x, z: rec.dirB.z };
  }

  // ------------------------------------------------------------ routing
  /** A* over nodes. Returns [{edgeId, dir}] or null. */
  route(fromNode, toNode, avoidEdge = -1) {
    if (fromNode === toNode) return [];
    const target = this.nodes.get(toNode);
    const start = this.nodes.get(fromNode);
    if (!target || !start) return null;
    const g = this._g, came = this._came, open = this._open;
    g.clear(); came.clear(); open.length = 0;
    const h = (nd) => Math.hypot(nd.x - target.x, nd.z - target.z) / 25;
    g.set(fromNode, 0);
    open.push({ id: fromNode, f: h(start) });
    let guard = 0;
    while (open.length && guard++ < 6000) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur.id === toNode) break;
      const nd = this.nodes.get(cur.id);
      if (!nd) continue;
      const gc = g.get(cur.id);
      if (gc === undefined || gc < cur.f - h(nd) - 1e-6) { /* stale ok */ }
      for (const mv of nd.outs) {
        if (mv.edgeId === avoidEdge && cur.id === fromNode) continue;
        const prev = came.get(cur.id);
        if (prev && prev.edgeId === mv.edgeId) continue; // no immediate U-turn
        const ng = gc + mv.len / Math.max(6, mv.speed) + 2.5;
        const old = g.get(mv.to);
        if (old !== undefined && old <= ng) continue;
        g.set(mv.to, ng);
        came.set(mv.to, { from: cur.id, edgeId: mv.edgeId, dir: mv.dir });
        const tn = this.nodes.get(mv.to);
        open.push({ id: mv.to, f: ng + (tn ? h(tn) : 0) });
      }
    }
    if (!came.has(toNode)) return null;
    const out = [];
    let cur = toNode;
    let steps = 0;
    while (cur !== fromNode && steps++ < 400) {
      const c = came.get(cur);
      if (!c) return null;
      out.push({ edgeId: c.edgeId, dir: c.dir });
      cur = c.from;
    }
    out.reverse();
    return out;
  }

  /** Turn sign at the join between two consecutive route steps: -1 right, 0 straight, +1 left. */
  turnSign(recA, dirA, recB, dirB) {
    const a = this.exitDir(recA, dirA);
    const b = this.entryDir(recB, dirB);
    const cross = a.x * b.z - a.z * b.x;
    const dot = a.x * b.x + a.z * b.z;
    if (dot > 0.72) return 0;
    return cross > 0 ? -1 : 1; // +x cross +z: right-hand turn is negative cross in this frame
  }

  randomEdge(rng) {
    let total = 0;
    for (const d of this.driveEdges) total += d.w;
    let r = rng.float() * total;
    for (const d of this.driveEdges) { r -= d.w; if (r <= 0) return this.edges.get(d.id); }
    return this.edges.get(this.driveEdges[this.driveEdges.length - 1]?.id);
  }
}

function norm(x, z) {
  const l = Math.hypot(x, z) || 1;
  return { x: x / l, z: z / l };
}

export { DEG };
