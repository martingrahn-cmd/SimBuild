// world.zones implementation: an 8 m world-aligned cell grid, a "zonable band" derived from
// world.roads.frontage (nearest road wins, so a cell is owned by exactly one road side), painting
// with validity rules (no water, no steep ground, no relief, no asphalt under the cell centre) and
// lot generation with fixed per-class dimensions.
//
// Coordinates: cell (ix,iz) covers [ix*8-1024, ix*8-1024+8) in x and the same in z; ctr(i) = i*8-1020.
import { hash2 } from '../../core/rng.js';
import { ZONE_TYPES, DENSITIES, LOT_SLOTS, LOT_DEPTH, MAX_DEPTH } from './palette.js';
import { RoadField } from './roadfield.js';

const SLOPE_MAX = 0.42;      // rad — steeper than this cannot be built on (item 13)
const RELIEF_MAX = 6.5;      // m of height range across one 8 m cell (item 13)
const NO_FRONTAGE = new Set(['highway', 'ramp']);
const SIDES = ['right', 'left'];

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
    this.zonable = new Map();     // key -> {edgeId, side, depth, lat, t, ix, iz}
    this.valid = new Map();       // key -> bool (terrain/road validity cache)
    this.byEdge = new Map();      // edgeId -> Set(lotId)
    this.claimed = new Map();     // cell key -> lotId
    this.field = new RoadField(this.world);
    this.nextLot = 1;
    this._o = { x: 0, z: 0, nx: 0, nz: 0 };
    this._changed = [];
    this._probe = [];
    this.zonableMs = 0;
  }

  // ---------------------------------------------------------------- indexing
  idx(v) { return Math.floor((v + this.half) / this.cell); }
  ctr(i) { return i * this.cell - this.half + this.cell * 0.5; }
  key(ix, iz) { return ix + ',' + iz; }
  keyAt(x, z) { return this.idx(x) + ',' + this.idx(z); }
  inBounds(ix, iz) { return ix >= 0 && iz >= 0 && ix < this.res && iz < this.res; }
  static parse(key) { const c = key.indexOf(','); return [+key.slice(0, c), +key.slice(c + 1)]; }

  // ---------------------------------------------------------------- validity
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
    const h = this.cell * 0.5;
    // water anywhere in the cell disqualifies it (item 13: centre or any of the 4 corners)
    if (T.isWater(x, z)) return false;
    if (T.isWater(x - h, z - h) || T.isWater(x + h, z - h) || T.isWater(x - h, z + h) || T.isWater(x + h, z + h)) return false;
    // relief across the cell, and slope at the centre
    let mn = Infinity, mx = -Infinity;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const y = T.getHeight(x + i * h, z + j * h);
      if (y < mn) mn = y; if (y > mx) mx = y;
    }
    if (mx - mn > RELIEF_MAX) return false;
    if (T.getSlope(x, z) > SLOPE_MAX) return false;
    // Road coverage is a veto, not the authority (failure mode 7): the 4 m mask bleeds a cell past the
    // kerb, so only a carriageway running through the cell centre disqualifies it. Cells that merely
    // overlap a corridor keep their land; the overlay clips its own geometry against RoadField, which
    // is geometric and exact, so nothing paints onto asphalt.
    if (typeof R.isRoad === 'function' && R.isRoad(x, z) === 1) return false;
    // ...and a cell whose centre is inside a road corridor is road, not land: without this a cell
    // sitting on a narrow alley keeps its centre clear of the asphalt mask, gets painted from some
    // other road's band, and then has its corners pushed out to both sides at once - which draws the
    // overlay straight across the alley as one stretched quad.
    if (this.field.penetration(x, z) > 0.5) return false;
    return true;
  }

  // ---------------------------------------------------------------- zonable band
  /** Lateral distance from the road centreline at which the buildable band starts. */
  frontStart(type) { return this.field.clearance(type); }

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

  /** Rebuild the map of cells a road can serve (depth 1..MAX_DEPTH from each frontage side). */
  buildZonable() {
    const t0 = performance.now();
    this.zonable.clear();
    this.valid.clear();
    this.field.build();
    const R = this.world.roads;
    const o = this._o;
    for (const e of R.edges.values()) {
      if (NO_FRONTAGE.has(e.type)) continue;       // item 14: highways and ramps carry no frontage
      const sp = this.spans(e.id);
      if (!sp) continue;
      const front = this.frontStart(e.type);
      for (const side of SIDES) {
        const s = sp[side];
        if (!s) continue;
        const sgn = side === 'right' ? 1 : -1;
        for (let d = s.d0; d <= s.d1 + 1e-6; d += 3) {
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
    for (let iz = j0; iz <= j1; iz++) for (let ix = i0; ix <= i1; ix++) {
      const dx = this.ctr(ix) - x, dz = this.ctr(iz) - z;
      if (dx * dx + dz * dz > r2) continue;
      if (this._set(ix, iz, type, density)) changed.push(this.key(ix, iz));
    }
    // one zones:changed per call, even when the stroke changed nothing (item 26)
    this._commit(changed.slice());
    return changed.length;
  }

  /** One lot regeneration, one version bump, one zones:changed — never one per cell (item 26). */
  _commit(cells) {
    const lots = this.regenLots();
    this.Z.version++;
    this.ctx.events.emit('zones:changed', { cells, lots });
    return lots;
  }

  _set(ix, iz, type, density) {
    if (!this.inBounds(ix, iz)) return false;
    const key = this.key(ix, iz);
    if (type === null) {
      if (!this.cells.has(key)) return false;
      this.cells.delete(key);
      return true;
    }
    const zc = this.zonable.get(key);
    if (!zc) return false;
    const c = this.cells.get(key);
    if (c && c.type === type && c.density === density) return false;
    this.cells.set(key, { x: this.ctr(ix), z: this.ctr(iz), type, density, edgeId: zc.edgeId, side: zc.side, depth: zc.depth });
    return true;
  }

  /**
   * Batch many strokes into a single lot regeneration + event. `fn` receives
   * `{ circle(x,z,r,type,density), rect(x0,z0,x1,z1,type,density), erase(x,z,r) }`.
   *
   * An optional second pass `trim({erase, cells, claimed, zonable})` runs after a provisional lot
   * generation, so a caller can take back land no lot could use (the showcase paints frontage bands,
   * not solid blocks) while the whole thing still costs exactly one regeneration and one event.
   */
  bulk(fn, trim) {
    const changed = [];
    const circle = (x, z, radius, type, density) => {
      const r = Math.max(this.cell * 0.5, radius), r2 = r * r;
      for (let iz = this.idx(z - r); iz <= this.idx(z + r); iz++) for (let ix = this.idx(x - r); ix <= this.idx(x + r); ix++) {
        const dx = this.ctr(ix) - x, dz = this.ctr(iz) - z;
        if (dx * dx + dz * dz > r2) continue;
        if (this._set(ix, iz, type, density)) changed.push(this.key(ix, iz));
      }
    };
    const rect = (x0, z0, x1, z1, type, density) => {
      const xa = Math.min(x0, x1), xb = Math.max(x0, x1), za = Math.min(z0, z1), zb = Math.max(z0, z1);
      for (let iz = this.idx(za); iz <= this.idx(zb); iz++) for (let ix = this.idx(xa); ix <= this.idx(xb); ix++) {
        const cx = this.ctr(ix), cz = this.ctr(iz);
        if (cx < xa || cx > xb || cz < za || cz > zb) continue;
        if (this._set(ix, iz, type, density)) changed.push(this.key(ix, iz));
      }
    };
    const api = { circle, rect, erase: (x, z, r) => circle(x, z, r, null, null) };
    fn(api);
    if (trim) {
      this.regenLots();
      trim({ erase: api.erase, cells: this.cells, claimed: this.claimed, zonable: this.zonable, valid: this.valid });
    }
    this._commit(changed);
    return changed.length;
  }

  // ---------------------------------------------------------------- lots
  /** Stable identity across rebuilds: road side + front cell (so buildingId is never orphaned). */
  _lotKey(l) { return l.edgeId + ':' + l.side + ':' + (l.cells[0] || `${Math.round(l.x)}_${Math.round(l.z)}`); }

  isJunction(nodeId) {
    const n = this.world.roads.nodes?.get(nodeId);
    return !!n && n.edges && n.edges.size >= 2;
  }

  /**
   * Rebuild every lot. Roads are processed by importance (avenue, street, alley; longer first) and
   * each lot claims its cells, so opposite frontages share a block and the perpendicular road takes
   * what is left — the pinwheel subdivision real blocks have.
   */
  regenLots() {
    const prev = new Map();
    for (const l of this.lots.values()) prev.set(this._lotKey(l), l);
    const removed = [], added = [];
    this.lots.clear();
    this.byEdge.clear();
    this.claimed.clear();
    const rank = (e) => (e.type === 'avenue' ? 0 : e.type === 'street' ? 1 : 2);
    const edges = [...this.world.roads.edges.values()].filter((e) => !NO_FRONTAGE.has(e.type));
    const jitter = (e) => hash2(e.id, 7, this.world.seed);
    edges.sort((a, b) => rank(a) - rank(b) || (b.length - a.length) * 0.02 + (jitter(a) - jitter(b)) || a.id - b.id);
    for (const e of edges) {
      if (this._rec) this._rec.push({ id: e.id, type: e.type, len: +e.length.toFixed(0), sides: {} });
      for (const lot of this.genEdge(e)) {
        const sig = this._lotKey(lot);
        const old = prev.get(sig);
        if (old) { lot.id = old.id; lot.buildingId = old.buildingId; prev.delete(sig); }
        else added.push(lot.id);
        this.lots.set(lot.id, lot);
        let set = this.byEdge.get(e.id);
        if (!set) this.byEdge.set(e.id, set = new Set());
        set.add(lot.id);
        for (const k of lot.cells) this.claimed.set(k, lot.id);
      }
    }
    for (const l of prev.values()) removed.push(l.id);
    return { added, removed };
  }

  /** Slot table for one side of one edge: 8 m frontage slots with their cell column. */
  _slots(e, side) {
    const sp = this.spans(e.id);
    if (!sp || !sp[side]) return null;
    const s = sp[side];
    const sgn = side === 'right' ? 1 : -1;
    const front = this.frontStart(e.type);
    const o = this._o;
    // roads.frontage() insets by the junction trim, which at a 4-way crossing is ~16 m — an 80 m
    // block edge comes back as 48 m of frontage and the block corners fall outside every run, which
    // is exactly the corner notch of failure mode 10. Reach back toward the edge ends: the cells
    // there are painted and unclaimed or they are not, and the run stops on its own either way.
    const reach = 18;
    s.d0 = Math.max(1, s.d0 - reach);
    s.d1 = Math.min(e.length - 1, s.d1 + reach);
    const span = s.d1 - s.d0;
    const n = Math.floor(span / this.cell);
    if (n < 2) return null;
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
        if (this.claimed.has(key)) break;
        keys.push(key);
      }
      slots.push({ dc, x: o.x, z: o.z, nx, nz, type, density, avail: keys.length, keys });
    }
    return { slots, n, d0: s.d0, pad, front, sgn };
  }

  /** Generate the lot row(s) along one edge from its frontage spans and the painted cells. */
  genEdge(e) {
    const out = [];
    if (NO_FRONTAGE.has(e.type)) return out;
    const startJ = this.isJunction(e.a), endJ = this.isJunction(e.b);
    for (const side of SIDES) {
      const S = this._slots(e, side);
      if (this._rec) this._rec[this._rec.length - 1].sides[side] = S ? S.slots.map((s) => (s ? `${s.type ? s.type[0] + s.density[0] : '--'}${s.avail}` : 'x')).join(' ') : 'none';
      if (!S) continue;
      const { slots, n } = S;
      let i = 0;
      while (i < n) {
        const a = slots[i];
        if (!a || !a.type || a.avail < LOT_DEPTH[a.type][a.density]) { i++; continue; }
        const depth = LOT_DEPTH[a.type][a.density];
        let j = i + 1;
        while (j < n && slots[j] && slots[j].type === a.type && slots[j].density === a.density && slots[j].avail >= depth) j++;
        // A slot next to the run that has land but not the full preferred depth is the block corner a
        // perpendicular road's lots cut into; the end lot grows one 8 m slot to claim it, which is
        // both item 12's corner rule and the cure for failure mode 10's corner notch. The same +1
        // slot absorbs a leftover where the run itself ends at a junction node.
        const same = (t) => t && t.type === a.type && t.density === a.density && t.avail >= 1;
        this._splitRun(e, side, S, i, j, depth, {
          pre: i > 0 && same(slots[i - 1]),
          post: j < n && same(slots[j]),
          junA: i === 0 && startJ,
          junB: j === n && endJ,
        }, out);
        i = j;
      }
    }
    return out;
  }

  _splitRun(e, side, S, i0, i1, depth, ends, out) {
    const { slots, front, sgn } = S;
    const a = slots[i0];
    const want = LOT_SLOTS[a.type][a.density];
    const k = Math.floor((i1 - i0) / want);
    if (k < 1) return;
    let rem = (i1 - i0) - k * want;
    const sizes = new Array(k).fill(want);
    const corner = new Array(k).fill(false);
    // A lot may grow by at most one 8 m slot (item 11), so each end gets at most one extension:
    // the adjacent short slot first (it is otherwise unclaimable), else a leftover of the run.
    let start = i0;
    if (ends.pre) { start = i0 - 1; sizes[0] += 1; corner[0] = true; }
    else if (rem > 0 && ends.junA) { sizes[0] += 1; corner[0] = true; rem--; }
    if (ends.post && !corner[k - 1]) { sizes[k - 1] += 1; corner[k - 1] = true; }
    else if (rem > 0 && ends.junB && !corner[k - 1]) { sizes[k - 1] += 1; corner[k - 1] = true; rem--; }
    // whatever is still left over stays as an unclaimed back-garden gap mid-run, never as a sliver lot
    const gapAt = rem > 0 ? Math.max(1, Math.min(k - 1, k >> 1)) : -1;
    const o = this._o;
    let cursor = start;
    for (let l = 0; l < k; l++) {
      if (l === gapAt) cursor += rem;
      const w = sizes[l];
      const b = cursor + w;
      const first = slots[cursor], last = slots[b - 1];
      if (!first || !last) { cursor = b; continue; }
      const dcMid = (first.dc + last.dc) * 0.5;
      if (!this.sampleAt(e.id, e.length, dcMid, o)) { cursor = b; continue; }
      const nx = o.nx * sgn, nz = o.nz * sgn;
      const lat = front + depth * this.cell * 0.5;
      const x = o.x + nx * lat, z = o.z + nz * lat;
      const cells = [];
      for (let s = cursor; s < b; s++) {
        const sl = slots[s];
        if (!sl) continue;
        for (let d = 0; d < depth && d < sl.keys.length; d++) cells.push(sl.keys[d]);
      }
      if (!cells.length) { cursor = b; continue; }
      out.push({
        id: this.nextLot++, edgeId: e.id, side, cells,
        x, y: this.world.terrain.getHeight(x, z), z,
        w: w * this.cell, d: depth * this.cell,
        heading: Math.atan2(-nx, nz),      // faces the road: 0 = north = -Z, clockwise
        nx, nz, ax: -nz, az: nx,
        type: a.type, density: a.density,
        corner: corner[l],
        t: dcMid / e.length,
        buildingId: null,
      });
      cursor = b;
    }
  }

  // ---------------------------------------------------------------- front edge (items 7, 8)
  /**
   * Ordered vertices of the overlay's road-facing edge for one side of one edge, <= 2 m apart.
   * The line is the road's own offset curve at `clearance`, so its distance to the centreline is
   * constant (no 8 m staircase); vertices that fall inside another road's corridor at a junction are
   * dropped rather than pushed, and each vertex is nudged outward within the 1.0-2.0 m setback window
   * until `roads.isRoad` also reads clear — the mask is a veto over a geometric authority, so the
   * clearance stays inside the window either way.
   */
  frontEdge(edgeId, side) {
    const R = this.world.roads;
    const e = R.edges.get(edgeId);
    if (!e || NO_FRONTAGE.has(e.type)) return [];
    const S = this.spans(edgeId);
    if (!S || !S[side]) return [];
    const sgn = side === 'right' ? 1 : -1;
    const paved = this.field.paved(e.type);
    const base = this.frontStart(e.type);   // paved + SETBACK; see the note on isRoad below
    const s = S[side];
    const steps = Math.max(2, Math.ceil((s.d1 - s.d0) / 1.6));   // <= 2 m apart even round a curve
    // Sample the offset curve, then keep the longest *contiguous* stretch: near a junction the run
    // dives into the crossing road's corridor, and a returned vertex there would be measured against
    // that other road. Dropping those from the middle would leave a gap wider than the 2 m the
    // contract promises, so the ends are trimmed instead.
    const all = [];
    for (let i = 0; i <= steps; i++) {
      const d = s.d0 + (s.d1 - s.d0) * (i / steps);
      const p = R.sample(edgeId, Math.max(0, Math.min(1, d / e.length)));
      if (!p) { all.push(null); continue; }
      const nx = p.normal.x * sgn, nz = p.normal.z * sgn;
      const x = p.x + nx * base, z = p.z + nz * base;
      // a vertex whose nearest road is not this edge belongs to the junction, not to this frontage
      if (this.field.inside(x, z, edgeId) || this.field.nearestEdgeId(x, z, 40) !== edgeId) { all.push(null); continue; }
      all.push({ x, z, t: d / e.length, clearance: base - paved });
    }
    let bi = 0, bn = 0, ci = 0, cn = 0;
    for (let i = 0; i <= all.length; i++) {
      if (i < all.length && all[i]) { if (cn === 0) ci = i; cn++; }
      else { if (cn > bn) { bn = cn; bi = ci; } cn = 0; }
    }
    return bn ? all.slice(bi, bi + bn) : [];
  }

  /** dev: replay lot generation, recording the slot state each edge actually saw. */
  diagnose() {
    this._rec = [];
    this.regenLots();
    const rec = this._rec;
    this._rec = null;
    for (const r of rec) r.lots = this.lotsFor(r.id).length;
    return rec;
  }

  /** dev: per-slot analysis for one edge — why lots did or did not appear there. */
  debugEdge(edgeId) {
    const e = this.world.roads.edges.get(edgeId);
    if (!e) return null;
    const out = { id: edgeId, type: e.type, len: +e.length.toFixed(1), front: +this.frontStart(e.type).toFixed(2), sides: {} };
    for (const side of SIDES) {
      const S = this._slots(e, side);
      if (!S) { out.sides[side] = null; continue; }
      out.sides[side] = {
        n: S.n,
        slots: S.slots.map((s) => (s ? `${s.type ? s.type[0] + s.density[0] : '--'}:${s.avail}` : 'null')),
        lots: this.lotsFor(edgeId).filter((l) => l.side === side).length,
      };
    }
    return out;
  }

  // ---------------------------------------------------------------- boundary walk (item 13)
  /**
   * Ordered boundary cell runs of the painted area: one closed loop per 4-connected component,
   * walked clockwise with a Moore neighbourhood so a critic can count direction changes over a
   * named sub-run.
   */
  boundaryLoops() {
    const comps = [];
    const seen = new Set();
    for (const key of this.cells.keys()) {
      if (seen.has(key)) continue;
      const stack = [key], comp = [];
      seen.add(key);
      while (stack.length) {
        const k = stack.pop();
        comp.push(k);
        const [ix, iz] = ZoneGrid.parse(k);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nk = this.key(ix + dx, iz + dz);
          if (!seen.has(nk) && this.cells.has(nk)) { seen.add(nk); stack.push(nk); }
        }
      }
      comps.push(comp);
    }
    // clockwise Moore-neighbour tracing with a backtrack pointer, per component
    const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const loops = [];
    for (const comp of comps) {
      if (comp.length < 6) continue;
      const inComp = new Set(comp);
      let start = comp[0], sp = ZoneGrid.parse(start);
      for (const k of comp) {
        const p = ZoneGrid.parse(k);
        if (p[1] < sp[1] || (p[1] === sp[1] && p[0] < sp[0])) { start = k; sp = p; }
      }
      let cx = sp[0], cz = sp[1], bdir = 4;      // backtrack lies to the west of the start
      const loop = [start];
      const limit = comp.length * 8 + 32;
      while (loop.length < limit) {
        let moved = false;
        for (let s2 = 1; s2 <= 8; s2++) {
          const di = (bdir + s2) % 8;
          const nx = cx + DIRS[di][0], nz = cz + DIRS[di][1];
          const nk = this.key(nx, nz);
          if (!inComp.has(nk)) continue;
          cx = nx; cz = nz; bdir = (di + 4) % 8; moved = true;
          if (nk === start) { moved = false; break; }
          loop.push(nk);
          break;
        }
        if (!moved) break;
      }
      if (loop.length >= 6) loops.push(loop);
    }
    loops.sort((a, b) => b.length - a.length);
    return loops;
  }

  /** Direction changes (axis flips) along an ordered cell run — item 13's raggedness measure. */
  static directionChanges(run) {
    let n = 0, last = null;
    for (let i = 1; i < run.length; i++) {
      const [ax, az] = ZoneGrid.parse(run[i - 1]), [bx, bz] = ZoneGrid.parse(run[i]);
      const d = (bx - ax) + ',' + (bz - az);
      if (last !== null && d !== last) n++;
      last = d;
    }
    return n;
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
    const k = this.claimed.get(this.keyAt(x, z));
    if (k !== undefined) {
      const l = this.lots.get(k);
      if (l) {
        const dx = x - l.x, dz = z - l.z;
        if (Math.abs(dx * l.ax + dz * l.az) <= l.w * 0.5 && Math.abs(dx * l.nx + dz * l.nz) <= l.d * 0.5) return l;
      }
    }
    for (const l of this.lots.values()) {
      const dx = x - l.x, dz = z - l.z;
      if (Math.abs(dx * l.ax + dz * l.az) <= l.w * 0.5 && Math.abs(dx * l.nx + dz * l.nz) <= l.d * 0.5) return l;
    }
    return null;
  }

  stats() {
    const per = {};
    for (const t of ZONE_TYPES) per[t] = 0;
    for (const c of this.cells.values()) per[c.type] = (per[c.type] || 0) + 1;
    let claimed = 0;
    for (const k of this.cells.keys()) if (this.claimed.has(k)) claimed++;
    return { cells: this.cells.size, zonable: this.zonable.size, lots: this.lots.size, claimed, per };
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
