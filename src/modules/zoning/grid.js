// world.zones implementation: an 8 m world-aligned cell grid, a "zonable band" derived from
// world.roads.frontage (nearest road wins, so cells are owned by exactly one road side), painting
// with validity rules (no water, no steep ground, no road coverage) and lot generation.
//
// Coordinates: cell (ix,iz) covers [ix*8-1024, ix*8-1024+8) in x and the same in z.
import { hash2 } from '../../core/rng.js';
import { ZONE_TYPES, DENSITIES, LOT_SLOTS, LOT_DEPTH, MIN_DEPTH, MAX_DEPTH } from './palette.js';

const SLOPE_MAX = 0.42;      // rad (~24 deg) — steeper than this cannot be built on
const RELIEF_MAX = 6.5;      // m of height range across one 8 m cell
const NO_FRONTAGE = new Set(['highway', 'ramp']);

export class ZoneGrid {
  constructor(ctx) {
    this.ctx = ctx;
    this.world = ctx.world;
    this.log = ctx.log;
    this.Z = ctx.world.zones;
    this.cell = this.Z.cellSize || 8;
    this.half = this.world.size / 2;
    this.res = Math.round(this.world.size / this.cell);
    this.cells = this.Z.cells;
    this.lots = this.Z.lots;
    this.zonable = new Map();     // key -> {edgeId, side, depth, lat, t}
    this.valid = new Map();       // key -> bool (terrain/road validity cache)
    this.byEdge = new Map();      // edgeId -> Set(lotId)
    this.claimed = new Map();     // cell key -> lotId (a cell belongs to at most one lot)
    this.nextLot = 1;
    this.zonableStamp = -1;
    this._o = { x: 0, z: 0, nx: 0, nz: 0 };
    this._changed = [];
  }

  // ---------------------------------------------------------------- indexing
  idx(v) { return Math.floor((v + this.half) / this.cell); }
  ctr(i) { return i * this.cell - this.half + this.cell * 0.5; }
  key(ix, iz) { return ix + ',' + iz; }
  keyAt(x, z) { return this.idx(x) + ',' + this.idx(z); }
  inBounds(ix, iz) { return ix >= 0 && iz >= 0 && ix < this.res && iz < this.res; }

  // ---------------------------------------------------------------- validity
  /** Terrain + road validity of a cell, cached. */
  cellValid(ix, iz) {
    const k = this.key(ix, iz);
    let v = this.valid.get(k);
    if (v !== undefined) return v;
    v = this._testCell(ix, iz);
    this.valid.set(k, v);
    return v;
  }

  _testCell(ix, iz) {
    if (!this.inBounds(ix, iz)) return false;
    const T = this.world.terrain, R = this.world.roads;
    const x = this.ctr(ix), z = this.ctr(iz);
    const h = this.cell * 0.5 - 0.6;
    // water anywhere in the cell disqualifies it
    if (T.isWater(x, z)) return false;
    if (T.isWater(x - h, z - h) || T.isWater(x + h, z - h) || T.isWater(x - h, z + h) || T.isWater(x + h, z + h)) return false;
    // relief / slope
    let mn = Infinity, mx = -Infinity;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const y = T.getHeight(x + i * h, z + j * h);
      if (y < mn) mn = y; if (y > mx) mx = y;
    }
    if (mx - mn > RELIEF_MAX) return false;
    if (T.getSlope(x, z) > SLOPE_MAX) return false;
    // Road coverage: any asphalt inside the cell kills it. The coverage mask is a 4 m grid, so the
    // "sidewalk/verge" value bleeds up to one grid cell past the real kerb — the geometric clearance
    // is already handled by frontStart(), so a verge sample only counts as fatal when the whole cell
    // sits inside one (a cell straddling a crossing road's footway).
    const isRoad = R.isRoad;
    if (typeof isRoad === 'function') {
      let verge = 0;
      const s = this.cell * 0.5 - 1.4;
      const pts = [[0, 0], [-s, 0], [s, 0], [0, -s], [0, s]];
      for (const [dx, dz] of pts) {
        const c = isRoad(x + dx, z + dz);
        if (c === 1) return false;
        if (c === 2) verge++;
      }
      if (verge >= 5) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- zonable band
  /** Lateral distance from the road centreline at which lots start (clear of sidewalk + verge). */
  frontStart(type) {
    const T = this.world.roads.types[type] || this.world.roads.types.street || {};
    const ah = T.asphaltHalf ?? (T.width || 16) / 4;
    const sw = T.sidewalk > 0.05 ? T.sidewalk + 0.05 : 0.3;
    const corridor = ah + sw + 0.8 + 0.4;   // matches roads' corridorHalf + coverage margin
    return Math.max((T.width || 16) / 2, corridor + 0.35);
  }

  /** Per-side frontage span [d0,d1] in metres along the edge, from world.roads.frontage. */
  spans(edgeId) {
    const R = this.world.roads;
    const e = R.edges.get(edgeId);
    if (!e) return null;
    const fr = R.frontage(edgeId) || [];
    if (!fr.length) return null;
    const out = {};
    for (const f of fr) {
      const s = out[f.side] || (out[f.side] = { from: f.from, to: f.to });
      if (f.from < s.from) s.from = f.from;
      if (f.to > s.to) s.to = f.to;
    }
    for (const k of Object.keys(out)) { out[k].d0 = out[k].from * e.length; out[k].d1 = out[k].to * e.length; }
    return out;
  }

  sampleAt(edgeId, len, d, out) {
    const s = this.world.roads.sample(edgeId, Math.max(0, Math.min(1, d / len)));
    if (!s) return null;
    out.x = s.x; out.z = s.z; out.nx = s.normal.x; out.nz = s.normal.z;
    return out;
  }

  /** Rebuild the map of cells that a road can serve (depth 1..MAX_DEPTH from each frontage side). */
  buildZonable() {
    const t0 = performance.now();
    this.zonable.clear();
    this.valid.clear();
    const R = this.world.roads;
    const o = this._o;
    for (const e of R.edges.values()) {
      if (NO_FRONTAGE.has(e.type)) continue;
      const sp = this.spans(e.id);
      if (!sp) continue;
      const front = this.frontStart(e.type);
      for (const side of ['right', 'left']) {
        const s = sp[side];
        if (!s) continue;
        const sgn = side === 'right' ? 1 : -1;
        const step = 3;
        for (let d = s.d0; d <= s.d1 + 1e-6; d += step) {
          const dd = Math.min(d, s.d1);
          if (!this.sampleAt(e.id, e.length, dd, o)) continue;
          const nx = o.nx * sgn, nz = o.nz * sgn;
          for (let k = 1; k <= MAX_DEPTH; k++) {
            const lat = front + (k - 0.5) * this.cell;
            const px = o.x + nx * lat, pz = o.z + nz * lat;
            const ix = this.idx(px), iz = this.idx(pz);
            if (!this.inBounds(ix, iz)) continue;
            const key = this.key(ix, iz);
            const prev = this.zonable.get(key);
            if (prev && (prev.depth < k || (prev.depth === k && prev.lat <= lat))) continue;
            if (!this.cellValid(ix, iz)) continue;
            this.zonable.set(key, { edgeId: e.id, side, depth: k, lat, t: dd / e.length, ix, iz });
          }
        }
      }
    }
    this.zonableStamp = (this.world.roads.version || 0) + (this.world.roads.coverage?.version || 0) * 1e-3;
    this.zonableMs = performance.now() - t0;
    return this.zonable.size;
  }

  /** Drop cells that are no longer servable (roads moved / terrain changed). */
  pruneCells() {
    let removed = 0;
    for (const key of [...this.cells.keys()]) {
      const z = this.zonable.get(key);
      if (!z) { this.cells.delete(key); removed++; continue; }
      const c = this.cells.get(key);
      c.edgeId = z.edgeId; c.side = z.side; c.depth = z.depth;
    }
    return removed;
  }

  // ---------------------------------------------------------------- painting
  paint(x, z, radius, type, density = 'low') {
    if (!ZONE_TYPES.includes(type)) return 0;
    if (!DENSITIES.includes(density)) density = 'low';
    return this._brush(x, z, radius, type, density);
  }

  erase(x, z, radius) { return this._brush(x, z, radius, null, null); }

  _brush(x, z, radius, type, density) {
    const r = Math.max(this.cell * 0.5, radius);
    const i0 = this.idx(x - r), i1 = this.idx(x + r);
    const j0 = this.idx(z - r), j1 = this.idx(z + r);
    const r2 = r * r;
    const changed = this._changed; changed.length = 0;
    const edges = new Set();
    for (let iz = j0; iz <= j1; iz++) for (let ix = i0; ix <= i1; ix++) {
      const dx = this.ctr(ix) - x, dz = this.ctr(iz) - z;
      if (dx * dx + dz * dz > r2) continue;
      if (this._set(ix, iz, type, density, edges)) changed.push(this.key(ix, iz));
    }
    if (!changed.length) return 0;
    const lotDelta = this.regenLots();
    this.Z.version++;
    this.ctx.events.emit('zones:changed', { cells: changed.slice(), lots: lotDelta });
    return changed.length;
  }

  _set(ix, iz, type, density, edges) {
    if (!this.inBounds(ix, iz)) return false;
    const key = this.key(ix, iz);
    if (type === null) {
      const c = this.cells.get(key);
      if (!c) return false;
      edges.add(c.edgeId);
      this.cells.delete(key);
      return true;
    }
    const zc = this.zonable.get(key);
    if (!zc) return false;
    const c = this.cells.get(key);
    if (c && c.type === type && c.density === density) return false;
    if (c) edges.add(c.edgeId);
    edges.add(zc.edgeId);
    this.cells.set(key, { x: this.ctr(ix), z: this.ctr(iz), type, density, edgeId: zc.edgeId, side: zc.side, depth: zc.depth });
    return true;
  }

  /**
   * Batch many strokes into a single lot regeneration + event. `fn` receives
   * `{ circle(x,z,r,type,density), rect(x0,z0,x1,z1,type,density), erase(x,z,r) }`.
   */
  bulk(fn) {
    const edges = new Set();
    const changed = [];
    const circle = (x, z, radius, type, density) => {
      const r = Math.max(this.cell * 0.5, radius), r2 = r * r;
      for (let iz = this.idx(z - r); iz <= this.idx(z + r); iz++) for (let ix = this.idx(x - r); ix <= this.idx(x + r); ix++) {
        const dx = this.ctr(ix) - x, dz = this.ctr(iz) - z;
        if (dx * dx + dz * dz > r2) continue;
        if (this._set(ix, iz, type, density, edges)) changed.push(this.key(ix, iz));
      }
    };
    const rect = (x0, z0, x1, z1, type, density) => {
      for (let iz = this.idx(Math.min(z0, z1)); iz <= this.idx(Math.max(z0, z1)); iz++) {
        for (let ix = this.idx(Math.min(x0, x1)); ix <= this.idx(Math.max(x0, x1)); ix++) {
          const cx = this.ctr(ix), cz = this.ctr(iz);
          if (cx < Math.min(x0, x1) || cx > Math.max(x0, x1) || cz < Math.min(z0, z1) || cz > Math.max(z0, z1)) continue;
          if (this._set(ix, iz, type, density, edges)) changed.push(this.key(ix, iz));
        }
      }
    };
    fn({ circle, rect, erase: (x, z, r) => circle(x, z, r, null, null) });
    const lotDelta = this.regenLots();
    this.Z.version++;
    this.ctx.events.emit('zones:changed', { cells: changed, lots: lotDelta });
    return changed.length;
  }

  // ---------------------------------------------------------------- lots
  /**
   * Rebuild every lot. Roads are processed by importance (avenue before street before alley, longer
   * before shorter) and each lot claims its cells, so opposite frontages share a block and the
   * perpendicular road only gets what is left — the ladder/pinwheel subdivision real blocks have,
   * instead of the mitred quadrants a pure nearest-road split would give.
   */
  regenLots() {
    const removed = [...this.lots.keys()];
    this.lots.clear();
    this.byEdge.clear();
    this.claimed.clear();
    const rank = (e) => (e.type === 'avenue' ? 0 : e.type === 'street' ? 1 : 2);
    const edges = [...this.world.roads.edges.values()].filter((e) => !NO_FRONTAGE.has(e.type));
    // Equal-ranked roads are shuffled deterministically so that neighbouring perpendicular streets do
    // not all claim in the same order: a block then subdivides as a pinwheel (every frontage keeps a
    // row of lots) instead of two roads taking the whole interior.
    const jitter = (e) => hash2(e.id, 7, this.world.seed);
    edges.sort((a, b) => rank(a) - rank(b) || (b.length - a.length) * 0.02 + (jitter(a) - jitter(b)) || a.id - b.id);
    const added = [];
    for (const e of edges) {
      for (const lot of this.genEdge(e)) {
        this.lots.set(lot.id, lot);
        let set = this.byEdge.get(e.id);
        if (!set) this.byEdge.set(e.id, set = new Set());
        set.add(lot.id);
        for (const k of lot.cells) this.claimed.set(k, lot.id);
        added.push(lot.id);
      }
    }
    return { added, removed };
  }

  /** Generate the lot row(s) along one edge from its frontage spans and the painted cells. */
  genEdge(e) {
    const out = [];
    if (NO_FRONTAGE.has(e.type)) return out;
    const sp = this.spans(e.id);
    if (!sp) return out;
    const front = this.frontStart(e.type);
    const o = this._o;
    for (const side of ['right', 'left']) {
      const s = sp[side];
      if (!s) continue;
      const sgn = side === 'right' ? 1 : -1;
      const span = s.d1 - s.d0;
      const n = Math.floor(span / this.cell);
      if (n < 2) continue;
      const pad = (span - n * this.cell) * 0.5;
      const slots = [];
      for (let i = 0; i < n; i++) {
        const dc = s.d0 + pad + (i + 0.5) * this.cell;
        if (!this.sampleAt(e.id, e.length, dc, o)) { slots.push(null); continue; }
        const nx = o.nx * sgn, nz = o.nz * sgn;
        let type = null, density = null;
        const keys = [];
        for (let k = 1; k <= MAX_DEPTH; k++) {
          const lat = front + (k - 0.5) * this.cell;
          const key = this.keyAt(o.x + nx * lat, o.z + nz * lat);
          const c = this.cells.get(key);
          if (!c) break;
          if (k === 1) { type = c.type; density = c.density; }
          else if (c.type !== type || c.density !== density) break;
          keys.push(key);
        }
        // how deep can this slot still go before running into another road's lots?
        let avail = 0;
        const cap = type ? LOT_DEPTH[type][density] : 0;
        for (let k = 0; k < keys.length && k < cap; k++) {
          if (this.claimed.has(keys[k])) break;
          avail = k + 1;
        }
        slots.push({ dc, x: o.x, z: o.z, nx, nz, type, density, depth: avail, keys });
      }
      let i = 0;
      while (i < n) {
        const a = slots[i];
        if (!a || !a.type || a.depth < MIN_DEPTH) { i++; continue; }
        let j = i + 1;
        while (j < n && slots[j] && slots[j].type === a.type && slots[j].density === a.density && slots[j].depth === a.depth) j++;
        this._splitRun(e, side, sgn, front, slots, i, j, n, out);
        i = j;
      }
    }
    return out;
  }

  _splitRun(e, side, sgn, front, slots, i0, i1, n, out) {
    const m = i1 - i0;
    const a = slots[i0];
    const depth = a.depth;
    const want = LOT_SLOTS[a.type][a.density];
    const k = Math.max(1, Math.round(m / want));
    const base = Math.floor(m / k), rem = m % k;
    let cursor = i0;
    for (let l = 0; l < k; l++) {
      const w = base + (l < rem ? 1 : 0);
      if (w <= 0) continue;
      const b = cursor + w;
      const first = slots[cursor], last = slots[b - 1];
      // corner fit: a lot that ends where the frontage itself ends grows toward the junction so the
      // block corner is covered instead of leaving a notch
      let extA = 0, extB = 0;
      if (cursor === 0) extA = 5;
      if (b === n) extB = 5;
      const width = (b - cursor) * this.cell + extA + extB;
      const dcMid = (first.dc + last.dc) * 0.5 + (extB - extA) * 0.5;
      const o = this._o;
      if (!this.sampleAt(e.id, e.length, dcMid, o)) { cursor = b; continue; }
      const nx = o.nx * sgn, nz = o.nz * sgn;
      const lat = front + depth * this.cell * 0.5;
      const x = o.x + nx * lat, z = o.z + nz * lat;
      const cells = [];
      for (let s = cursor; s < b; s++) for (let d = 0; d < depth && d < slots[s].keys.length; d++) cells.push(slots[s].keys[d]);
      const id = this.nextLot++;
      out.push({
        id, edgeId: e.id, side, cells,
        x, y: this.world.terrain.getHeight(x, z), z,
        w: width, d: depth * this.cell,
        // heading: the way a building on the lot faces, i.e. toward the road (0 = north = -Z)
        heading: Math.atan2(-nx, nz),
        nx, nz, ax: -nz, az: nx,
        type: a.type, density: a.density,
        corner: extA > 0 || extB > 0,
        t: dcMid / e.length,
        buildingId: null,
      });
      cursor = b;
    }
  }

  /** dev: slot analysis for one edge (why lots did or did not appear). */
  debugEdge(edgeId) {
    const e = this.world.roads.edges.get(edgeId);
    if (!e) return null;
    const sp = this.spans(edgeId);
    const front = this.frontStart(e.type);
    const o = this._o;
    const out = { id: edgeId, type: e.type, len: +e.length.toFixed(1), front: +front.toFixed(2), sides: {} };
    if (!sp) return out;
    for (const side of ['right', 'left']) {
      const s = sp[side];
      if (!s) continue;
      const sgn = side === 'right' ? 1 : -1;
      const span = s.d1 - s.d0, n = Math.floor(span / this.cell);
      const pad = (span - n * this.cell) * 0.5;
      const slots = [];
      for (let i = 0; i < n; i++) {
        const dc = s.d0 + pad + (i + 0.5) * this.cell;
        this.sampleAt(e.id, e.length, dc, o);
        const nx = o.nx * sgn, nz = o.nz * sgn;
        const rec = { dc: +dc.toFixed(0), cells: [] };
        for (let k = 1; k <= MAX_DEPTH; k++) {
          const lat = front + (k - 0.5) * this.cell;
          const key = this.keyAt(o.x + nx * lat, o.z + nz * lat);
          const c = this.cells.get(key);
          rec.cells.push(`${key}:${c ? c.type[0] + c.density[0] : '-'}${this.claimed.has(key) ? '*' : ''}`);
        }
        slots.push(rec);
      }
      out.sides[side] = { d0: +s.d0.toFixed(1), d1: +s.d1.toFixed(1), n, slots };
    }
    return out;
  }

  // ---------------------------------------------------------------- queries
  cellAt(x, z) { return this.cells.get(this.keyAt(x, z)) || null; }
  lotsFor(edgeId) {
    const set = this.byEdge.get(edgeId);
    if (!set) return [];
    const out = [];
    for (const id of set) { const l = this.lots.get(id); if (l) out.push(l); }
    return out;
  }
  freeLots() {
    const out = [];
    for (const l of this.lots.values()) if (!l.buildingId) out.push(l);
    return out;
  }
  lotAt(x, z) {
    for (const l of this.lots.values()) {
      const dx = x - l.x, dz = z - l.z;
      const u = dx * l.ax + dz * l.az, v = dx * l.nx + dz * l.nz;
      if (Math.abs(u) <= l.w * 0.5 && Math.abs(v) <= l.d * 0.5) return l;
    }
    return null;
  }

  stats() {
    const per = {};
    for (const t of ZONE_TYPES) per[t] = 0;
    for (const c of this.cells.values()) per[c.type] = (per[c.type] || 0) + 1;
    return { cells: this.cells.size, zonable: this.zonable.size, lots: this.lots.size, per };
  }

  /** Install the public API on world.zones (in place, never replacing the section). */
  install() {
    const Z = this.Z;
    Z.paint = (x, z, r, type, density) => this.paint(x, z, r, type, density);
    Z.erase = (x, z, r) => this.erase(x, z, r);
    Z.lotsFor = (edgeId) => this.lotsFor(edgeId);
    Z.freeLots = () => this.freeLots();
    Z.cellAt = (x, z) => this.cellAt(x, z);
    Z.lotAt = (x, z) => this.lotAt(x, z);
    Z.zonableAt = (x, z) => this.zonable.get(this.keyAt(x, z)) || null;
    Z.maxDepth = MAX_DEPTH;
  }
}
