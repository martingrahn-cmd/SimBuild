// Road network graph: nodes + straight / quadratic-bezier edges, arc-length sampling, lane centres,
// frontage segments, nearest-edge queries. Owns world.roads (mutated in place, never replaced).
// Geometry-independent: heights (edge.profile) are filled in by the builder (build.js) on rebuild.

export const TYPE_DEFAULTS = {
  alley:   { width: 8,  lanes: 1, speed: 30, sidewalk: 2,   asphaltHalf: 2.0,  cornerR: 4,  laneW: 3.6, shoulder: 0,   median: 0,   oneWay: false },
  gravel:  { width: 8,  lanes: 2, speed: 30, sidewalk: 0,   asphaltHalf: 4.0,  cornerR: 4,  laneW: 3.5, shoulder: 0,   median: 0,   oneWay: false },
  street:  { width: 16, lanes: 2, speed: 50, sidewalk: 3,   asphaltHalf: 5.0,  cornerR: 6,  laneW: 3.8, shoulder: 0,   median: 0,   oneWay: false },
  avenue:  { width: 24, lanes: 4, speed: 60, sidewalk: 4,   asphaltHalf: 8.0,  cornerR: 8,  laneW: 3.6, shoulder: 0,   median: 0,   oneWay: false },
  highway: { width: 32, lanes: 6, speed: 100, sidewalk: 0,  asphaltHalf: 16.0, cornerR: 10, laneW: 3.8, shoulder: 1.9, median: 2.4, oneWay: false },
  ramp:    { width: 10, lanes: 1, speed: 60, sidewalk: 0,   asphaltHalf: 5.0,  cornerR: 8,  laneW: 3.8, shoulder: 1.0, median: 0,   oneWay: true },
};

const ROW_SPACING = 4; // metres between profile rows

export class Network {
  constructor(world, events, log) {
    this.world = world;
    this.events = events;
    this.log = log;
    this.R = world.roads;
    this.nodes = this.R.nodes;
    this.edges = this.R.edges;
    this._nextId = 1;
    this.cache = new Map(); // edgeId -> polyline cache
    // merge our richer type table into world.roads.types (keep width/lanes/speed keys the contract promises)
    for (const [k, v] of Object.entries(TYPE_DEFAULTS)) this.R.types[k] = { ...(this.R.types[k] || {}), ...v };
    this.dirty = true;
  }

  typeOf(type) { return this.R.types[type] || this.R.types.street; }

  // ------------------------------------------------------------------ mutations
  addNode(x, z) {
    for (const n of this.nodes.values()) {
      const dx = n.x - x, dz = n.z - z;
      if (dx * dx + dz * dz < 1.0) return n.id;
    }
    const id = this._nextId++;
    const y = this.world.terrain.getHeight(x, z);
    this.nodes.set(id, { id, x, y, z, edges: new Set() });
    return id;
  }

  addEdge(a, b, type = 'street', opts = {}) {
    const na = this.nodes.get(a), nb = this.nodes.get(b);
    if (!na || !nb || a === b) { this.log?.warn(`addEdge: bad nodes ${a}->${b}`); return -1; }
    const T = this.typeOf(type);
    const id = this._nextId++;
    const ctrl = opts.ctrl ? { x: opts.ctrl.x, z: opts.ctrl.z } : null;
    const e = {
      id, a, b, type: this.R.types[type] ? type : 'street', lanes: opts.lanes ?? T.lanes, width: T.width,
      oneWay: opts.oneWay ?? !!T.oneWay, ctrl, length: 0, elevation: opts.elevation ?? 0,
      trimA: 0, trimB: 0, bridge: false,
    };
    this.edges.set(id, e);
    na.edges.add(id); nb.edges.add(id);
    this._samplePolyline(e);
    this.dirty = true;
    this._bump({ added: [id], removed: [], nodes: [a, b] });
    return id;
  }

  removeEdge(id, silent = false) {
    const e = this.edges.get(id);
    if (!e) return;
    this.edges.delete(id);
    this.cache.delete(id);
    const na = this.nodes.get(e.a), nb = this.nodes.get(e.b);
    na?.edges.delete(id); nb?.edges.delete(id);
    this.dirty = true;
    if (!silent) this._bump({ added: [], removed: [id], nodes: [e.a, e.b] });
  }

  removeNode(id) {
    const n = this.nodes.get(id);
    if (!n) return;
    const removed = [...n.edges];
    for (const eid of removed) this.removeEdge(eid, true);
    this.nodes.delete(id);
    this.dirty = true;
    this._bump({ added: [], removed, nodes: [id] });
  }

  _bump(payload) {
    this.R.version++;
    this.events.emit('roads:changed', payload);
  }

  // ------------------------------------------------------------------ curve sampling
  /** Point on the (possibly bezier) edge curve at parameter t (NOT arc length). */
  curveAt(e, t, out = {}) {
    const A = this.nodes.get(e.a), B = this.nodes.get(e.b);
    if (e.ctrl) {
      const mt = 1 - t;
      out.x = mt * mt * A.x + 2 * mt * t * e.ctrl.x + t * t * B.x;
      out.z = mt * mt * A.z + 2 * mt * t * e.ctrl.z + t * t * B.z;
    } else { out.x = A.x + (B.x - A.x) * t; out.z = A.z + (B.z - A.z) * t; }
    return out;
  }

  /** Re-sample an edge polyline (xz only) — called on add and when a node moves. Fills the cache entry. */
  _samplePolyline(e) {
    const A = this.nodes.get(e.a), B = this.nodes.get(e.b);
    // chord/curve length estimate for the sample count
    let approx = 0;
    {
      let px = A.x, pz = A.z;
      for (let i = 1; i <= 16; i++) { const p = this.curveAt(e, i / 16); approx += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; }
    }
    const n = Math.max(2, Math.ceil(approx / ROW_SPACING)) + 1;
    const xs = new Float64Array(n), zs = new Float64Array(n), s = new Float64Array(n);
    const p = {};
    for (let i = 0; i < n; i++) { this.curveAt(e, i / (n - 1), p); xs[i] = p.x; zs[i] = p.z; }
    s[0] = 0;
    for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
    const len = s[n - 1];
    // tangents (central differences)
    const tx = new Float64Array(n), tz = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
      let dx = xs[i1] - xs[i0], dz = zs[i1] - zs[i0];
      const l = Math.hypot(dx, dz) || 1; tx[i] = dx / l; tz[i] = dz / l;
    }
    const ys = new Float64Array(n);
    for (let i = 0; i < n; i++) ys[i] = this.world.terrain.getHeight(xs[i], zs[i]);
    e.length = len;
    this.cache.set(e.id, { n, xs, zs, ys, s, tx, tz, len, water: new Uint8Array(n), terrain: new Float64Array(n), bridge: new Uint8Array(n) });
  }

  poly(edgeId) {
    const e = this.edges.get(edgeId);
    if (!e) return null;
    let c = this.cache.get(edgeId);
    if (!c) { this._samplePolyline(e); c = this.cache.get(edgeId); }
    return c;
  }

  /** Direction of edge e leaving node id (unit xz). */
  dirFrom(e, nodeId) {
    const c = this.poly(e.id);
    if (nodeId === e.a) return { x: c.tx[0], z: c.tz[0] };
    return { x: -c.tx[c.n - 1], z: -c.tz[c.n - 1] };
  }

  /** Interpolated sample at arc-length distance d along the edge. out gets x,y,z,tx,tz. */
  sampleAt(edgeId, d, out = {}) {
    const c = this.poly(edgeId);
    if (!c) return null;
    if (d <= 0) d = 0; else if (d >= c.len) d = c.len;
    // binary search on s
    let lo = 0, hi = c.n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c.s[mid] <= d) lo = mid; else hi = mid; }
    const seg = c.s[hi] - c.s[lo] || 1;
    const k = (d - c.s[lo]) / seg;
    out.x = c.xs[lo] + (c.xs[hi] - c.xs[lo]) * k;
    out.z = c.zs[lo] + (c.zs[hi] - c.zs[lo]) * k;
    out.y = c.ys[lo] + (c.ys[hi] - c.ys[lo]) * k;
    let tx = c.tx[lo] + (c.tx[hi] - c.tx[lo]) * k, tz = c.tz[lo] + (c.tz[hi] - c.tz[lo]) * k;
    const l = Math.hypot(tx, tz) || 1; out.tx = tx / l; out.tz = tz / l;
    return out;
  }

  // ------------------------------------------------------------------ public API (world.roads)
  sample(edgeId, t) {
    const e = this.edges.get(edgeId);
    if (!e) return null;
    const o = this.sampleAt(edgeId, t * e.length, {});
    if (!o) return null;
    return { x: o.x, y: o.y, z: o.z, tangent: { x: o.tx, z: o.tz }, normal: { x: -o.tz, z: o.tx } };
  }

  /** Signed lateral offsets of lane centres (positive = right in a->b direction), lane 0 = rightmost. */
  laneOffsets(e) {
    const T = this.typeOf(e.type);
    const lanes = e.lanes;
    const out = new Array(lanes);
    if (e.oneWay) {
      const usable = T.asphaltHalf * 2 - T.shoulder * 2;
      const lw = usable / lanes;
      for (let i = 0; i < lanes; i++) out[i] = usable / 2 - lw * (i + 0.5);
    } else {
      const per = Math.max(1, Math.floor(lanes / 2));
      const usable = T.asphaltHalf - T.shoulder - T.median / 2;
      const lw = usable / per;
      for (let i = 0; i < per; i++) out[i] = T.median / 2 + usable - lw * (i + 0.5);
      for (let i = per; i < lanes; i++) out[i] = -(T.median / 2 + usable - lw * (i - per + 0.5));
    }
    return out;
  }

  laneCenter(edgeId, laneIndex, t) {
    const e = this.edges.get(edgeId);
    if (!e) return null;
    const offs = this.laneOffsets(e);
    const off = offs[Math.max(0, Math.min(offs.length - 1, laneIndex | 0))];
    const o = this.sampleAt(edgeId, t * e.length, {});
    const nx = -o.tz, nz = o.tx;
    return { x: o.x + nx * off, y: o.y, z: o.z + nz * off, tangent: { x: o.tx, z: o.tz } };
  }

  frontage(edgeId) {
    const e = this.edges.get(edgeId);
    if (!e) return [];
    const T = this.typeOf(e.type);
    const halfW = e.width / 2;
    const from = e.trimA + 2, to = e.length - e.trimB - 2;
    if (to - from < 8) return [];
    const chunks = Math.max(1, Math.round((to - from) / 48));
    const out = [];
    const o = {};
    for (let c = 0; c < chunks; c++) {
      const d0 = from + (to - from) * (c / chunks), d1 = from + (to - from) * ((c + 1) / chunks);
      this.sampleAt(edgeId, (d0 + d1) / 2, o);
      const nx = -o.tz, nz = o.tx;
      for (const side of ['right', 'left']) {
        const sgn = side === 'right' ? 1 : -1;
        out.push({
          side, from: d0 / e.length, to: d1 / e.length,
          x: o.x + nx * sgn * halfW, z: o.z + nz * sgn * halfW,
          heading: Math.atan2(nx * sgn, -nz * sgn), width: halfW, length: d1 - d0,
        });
      }
    }
    return out;
  }

  nearestEdge(x, z, maxDist = 30) {
    let best = null, bestD2 = maxDist * maxDist;
    for (const e of this.edges.values()) {
      const c = this.poly(e.id);
      for (let i = 1; i < c.n; i++) {
        const ax = c.xs[i - 1], az = c.zs[i - 1], bx = c.xs[i], bz = c.zs[i];
        const dx = bx - ax, dz = bz - az;
        const l2 = dx * dx + dz * dz || 1;
        let k = ((x - ax) * dx + (z - az) * dz) / l2; k = k < 0 ? 0 : k > 1 ? 1 : k;
        const px = ax + dx * k, pz = az + dz * k;
        const d2 = (px - x) * (px - x) + (pz - z) * (pz - z);
        if (d2 < bestD2) {
          bestD2 = d2;
          const d = c.s[i - 1] + (c.s[i] - c.s[i - 1]) * k;
          best = { edge: e, t: d / c.len, point: { x: px, y: c.ys[i - 1] + (c.ys[i] - c.ys[i - 1]) * k, z: pz }, dist: Math.sqrt(d2) };
        }
      }
    }
    return best;
  }

  /** Install the API on world.roads (in place). */
  install() {
    const R = this.R;
    R.addNode = (x, z) => this.addNode(x, z);
    R.addEdge = (a, b, type, opts) => this.addEdge(a, b, type, opts);
    R.removeEdge = (id) => this.removeEdge(id);
    R.removeNode = (id) => this.removeNode(id);
    R.nearestEdge = (x, z, maxDist) => this.nearestEdge(x, z, maxDist);
    R.sample = (id, t) => this.sample(id, t);
    R.laneCenter = (id, lane, t) => this.laneCenter(id, lane, t);
    R.frontage = (id) => this.frontage(id);
  }
}
