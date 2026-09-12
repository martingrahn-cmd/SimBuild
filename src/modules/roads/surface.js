// Spatial lookup of the exact generated pavement triangles. Bridges are included;
// barriers, piers, paint decals and terrain are deliberately not pavement.
//
// Query cells retain only integer triangle indexes. The triangle data itself lives in
// one packed Float32Array rather than an object/array per triangle: a city rebuild
// creates many pavement triangles and this lookup survives for seating/placement.
const CELL = 32;
const STRIDE = 14; // three xyz points, dx1/dz1/dx2/dz2 and inverse determinant

export class PavementSurface {
  constructor() { this.cells = new Map(); this.data = new Float32Array(0); this.count = 0; }
  clear() { this.cells.clear(); this.data = new Float32Array(0); this.count = 0; }
  _reserve(count) {
    if (count * STRIDE <= this.data.length) return;
    const cap = Math.max(1024, count * STRIDE, Math.ceil(this.data.length * 1.5));
    const next = new Float32Array(cap);
    // `count` includes the slot currently being appended; only copy completed triangles.
    next.set(this.data.subarray(0, (count - 1) * STRIDE));
    this.data = next;
  }
  add(acc, all = false) {
    const { idx, pos, pavement } = acc;
    for (let i = 0; i < idx.length; i += 3) {
      const ia = idx[i], ib = idx[i + 1], ic = idx[i + 2];
      if (!all && (!pavement.has(ia) || !pavement.has(ib) || !pavement.has(ic))) continue;
      const a = ia * 3, b = ib * 3, c = ic * 3;
      const x0 = Math.fround(pos[a]), y0 = Math.fround(pos[a + 1]), z0 = Math.fround(pos[a + 2]);
      const x1 = Math.fround(pos[b]), y1 = Math.fround(pos[b + 1]), z1 = Math.fround(pos[b + 2]);
      const x2 = Math.fround(pos[c]), y2 = Math.fround(pos[c + 1]), z2 = Math.fround(pos[c + 2]);
      const dx1 = x1 - x0, dz1 = z1 - z0, dx2 = x2 - x0, dz2 = z2 - z0;
      const det = dx1 * dz2 - dx2 * dz1;
      if (Math.abs(det) < 1e-9) continue;
      const tri = this.count++;
      this._reserve(this.count);
      const o = tri * STRIDE, d = this.data;
      d[o] = x0; d[o + 1] = y0; d[o + 2] = z0; d[o + 3] = x1; d[o + 4] = y1; d[o + 5] = z1; d[o + 6] = x2; d[o + 7] = y2; d[o + 8] = z2;
      d[o + 9] = dx1; d[o + 10] = dz1; d[o + 11] = dx2; d[o + 12] = dz2; d[o + 13] = 1 / det;
      const x0c = Math.floor(Math.min(x0, x1, x2) / CELL), x1c = Math.floor(Math.max(x0, x1, x2) / CELL);
      const z0c = Math.floor(Math.min(z0, z1, z2) / CELL), z1c = Math.floor(Math.max(z0, z1, z2) / CELL);
      for (let x = x0c; x <= x1c; x++) for (let z = z0c; z <= z1c; z++) {
        const key = `${x},${z}`;
        let cell = this.cells.get(key);
        if (!cell) this.cells.set(key, cell = []);
        cell.push(tri);
      }
    }
  }
  heightAt(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const candidates = this.cells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
    let height = null;
    for (const tri of candidates || []) {
      const o = tri * STRIDE, p = this.data, dx = x - p[o], dz = z - p[o + 2];
      const u = (dx * p[o + 12] - p[o + 9] * dz) * p[o + 13];
      const v = (p[o + 10] * dz - dx * p[o + 11]) * p[o + 13];
      if (u < -1e-7 || v < -1e-7 || u + v > 1 + 1e-7) continue;
      const y = p[o + 1] + u * (p[o + 4] - p[o + 1]) + v * (p[o + 7] - p[o + 1]);
      if (height === null || y > height) height = y;
    }
    return height;
  }
  stats() { return { cells: this.cells.size, triangles: this.count, packedBytes: this.count * STRIDE * 4 }; }
}
