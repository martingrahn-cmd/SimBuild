// Road corridor field.
//
// zoning.md failure mode 7: `roads.isRoad` is a 4 m mask whose sidewalk value bleeds a cell past the
// real kerb, so it can only ever be a veto — the geometric setback is the authority. This class is
// that authority: every road centreline is sampled at 2 m into a bucketed point set carrying the
// type's clearance (asphaltHalf + sidewalk + margin), which gives
//
//   * `clearance(edge)`             the lateral distance a lot/overlay edge must keep,
//   * `push(x, z)`                  move a point out of the union of all corridors (the union of
//                                   discs is what rounds the overlay off at junctions),
//   * `inside(x, z, exceptEdge)`    "is this inside somebody else's corridor",
//
// so the overlay's front edge follows the road instead of the 8 m cell lattice (items 7 and 8) and
// no overlay fragment lands on asphalt, kerb or sidewalk.

const BUCKET = 24;             // m
const ORIGIN = 1152;           // half world + one bucket of slack
const RES = Math.ceil((ORIGIN * 2) / BUCKET);
export const SETBACK = 1.55;   // m clear of the paved corridor (item 8 wants 0.5-2.0)

export class RoadField {
  constructor(world) {
    this.world = world;
    // Flat bucket grid rather than a Map: the overlay rebuild queries this ~20 000 times and the
    // 45 ms budget does not survive nine Map lookups per query.
    this.head = new Int32Array(RES * RES);
    this.next = new Int32Array(0);
    this.sx = new Float32Array(0); this.sz = new Float32Array(0);
    this.sc = new Float32Array(0); this.snx = new Float32Array(0); this.snz = new Float32Array(0);
    this.se = new Int32Array(0);
    this.count = 0;
    this.maxClear = 0;
    this.stamp = -1;
    this._out = { x: 0, z: 0, moved: false };
  }

  /** Lateral clearance from a road's centreline: paved corridor + setback. */
  clearance(type) {
    const T = this.world.roads.types?.[type] || this.world.roads.types?.street || {};
    const ah = T.asphaltHalf ?? (T.width || 16) / 4;
    const sw = T.sidewalk > 0.05 ? T.sidewalk : 0;
    return Math.max((T.width || 16) / 2, ah + sw + SETBACK);
  }
  /** Paved half width the spec measures the setback against: asphaltHalf + sidewalk. */
  paved(type) {
    const T = this.world.roads.types?.[type] || this.world.roads.types?.street || {};
    return (T.asphaltHalf ?? (T.width || 16) / 4) + (T.sidewalk > 0.05 ? T.sidewalk : 0);
  }

  _bi(x, z) {
    const i = Math.floor((x + ORIGIN) / BUCKET), j = Math.floor((z + ORIGIN) / BUCKET);
    if (i < 0 || j < 0 || i >= RES || j >= RES) return -1;
    return j * RES + i;
  }

  build() {
    this.head.fill(-1);
    this.maxClear = 0;
    this.count = 0;
    const R = this.world.roads;
    if (!R.edges || typeof R.sample !== 'function') return 0;
    let cap = 0;
    for (const e of R.edges.values()) cap += Math.max(2, Math.ceil((e.length || 0) / 2)) + 1;
    if (this.next.length < cap) {
      this.next = new Int32Array(cap); this.sx = new Float32Array(cap); this.sz = new Float32Array(cap);
      this.sc = new Float32Array(cap); this.snx = new Float32Array(cap); this.snz = new Float32Array(cap);
      this.se = new Int32Array(cap);
    }
    let n = 0;
    for (const e of R.edges.values()) {
      const clear = this.clearance(e.type);
      if (clear > this.maxClear) this.maxClear = clear;
      const steps = Math.max(2, Math.ceil((e.length || 0) / 2));
      for (let i = 0; i <= steps && n < cap; i++) {
        const s = R.sample(e.id, i / steps);
        if (!s) continue;
        const b = this._bi(s.x, s.z);
        if (b < 0) continue;
        this.sx[n] = s.x; this.sz[n] = s.z; this.sc[n] = clear; this.se[n] = e.id;
        this.snx[n] = -s.tangent.z; this.snz[n] = s.tangent.x;
        this.next[n] = this.head[b]; this.head[b] = n;
        n++;
      }
    }
    this.count = n;
    this.stamp = R.version || 0;
    return n;
  }

  /** Deepest corridor penetration at (x,z); returns the sample or null. */
  /** Index of the deepest penetrating sample at (x,z), or -1. `_pen`/`_d` carry its depth/distance. */
  _deepest(x, z, exceptEdge) {
    const r = this.maxClear;
    let i0 = Math.floor((x - r + ORIGIN) / BUCKET), i1 = Math.floor((x + r + ORIGIN) / BUCKET);
    let j0 = Math.floor((z - r + ORIGIN) / BUCKET), j1 = Math.floor((z + r + ORIGIN) / BUCKET);
    if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0;
    if (i1 >= RES) i1 = RES - 1; if (j1 >= RES) j1 = RES - 1;
    let best = -1, bestPen = 0, bestD = 0;
    for (let j = j0; j <= j1; j++) {
      const row = j * RES;
      for (let i = i0; i <= i1; i++) {
        for (let k = this.head[row + i]; k !== -1; k = this.next[k]) {
          if (exceptEdge !== undefined && this.se[k] === exceptEdge) continue;
          const dx = x - this.sx[k], dz = z - this.sz[k];
          const c = this.sc[k];
          const d2 = dx * dx + dz * dz;
          if (d2 >= c * c) continue;
          const d = Math.sqrt(d2), pen = c - d;
          if (pen > bestPen) { bestPen = pen; best = k; bestD = d; }
        }
      }
    }
    this._pen = bestPen; this._d = bestD;
    return best;
  }

  inside(x, z, exceptEdge) { return this._deepest(x, z, exceptEdge) >= 0; }

  /** Edge id of the closest centreline sample to (x,z) within `maxDist`, or -1. */
  nearestEdgeId(x, z, maxDist = 40) {
    let i0 = Math.floor((x - maxDist + ORIGIN) / BUCKET), i1 = Math.floor((x + maxDist + ORIGIN) / BUCKET);
    let j0 = Math.floor((z - maxDist + ORIGIN) / BUCKET), j1 = Math.floor((z + maxDist + ORIGIN) / BUCKET);
    if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0;
    if (i1 >= RES) i1 = RES - 1; if (j1 >= RES) j1 = RES - 1;
    let best = -1, bestD2 = maxDist * maxDist;
    for (let j = j0; j <= j1; j++) {
      const row = j * RES;
      for (let i = i0; i <= i1; i++) {
        for (let k = this.head[row + i]; k !== -1; k = this.next[k]) {
          const dx = x - this.sx[k], dz = z - this.sz[k];
          const d2 = dx * dx + dz * dz;
          if (d2 < bestD2) { bestD2 = d2; best = this.se[k]; }
        }
      }
    }
    return best;
  }

  /** How far inside the corridor union (0 outside). */
  penetration(x, z) { this._deepest(x, z); return this._pen; }

  /**
   * Move a point out of every road corridor. Returns the shared {x,z,moved}; three relaxation passes
   * handle a point that sits inside two corridors at a junction.
   */
  push(x, z) {
    const o = this._out;
    o.x = x; o.z = z; o.moved = false;
    for (let it = 0; it < 3; it++) {
      const k = this._deepest(o.x, o.z);
      if (k < 0) break;
      const d = this._d, c = this.sc[k], px = this.sx[k], pz = this.sz[k];
      if (d > 1e-3) { o.x = px + (o.x - px) / d * c; o.z = pz + (o.z - pz) / d * c; }
      else { o.x = px + this.snx[k] * c; o.z = pz + this.snz[k] * c; }
      o.moved = true;
    }
    return o;
  }
}
