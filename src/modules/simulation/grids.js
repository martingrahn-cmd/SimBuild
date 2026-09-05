// 256² world grids for info views: ground pollution, air pollution, noise, land value. Recomputed from
// scratch (stateless) once a game hour from the building stock, road graph, water and service coverage —
// so the same inputs always give the same grid, save/load included. No allocations after construction.
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const ROAD_NOISE = { street: [0.07, 3], avenue: [0.11, 4], highway: [0.16, 6], alley: [0.03, 2], gravel: [0.025, 2] };

export class Grids {
  constructor(n = 256, worldSize = 2048) {
    this.n = n; this.cell = worldSize / n; this.half = worldSize / 2;
    const N = n * n;
    this.ground = new Float32Array(N); this.air = new Float32Array(N); this.noise = new Float32Array(N); this.landValue = new Float32Array(N);
    this._lv = new Float32Array(N);
    this.cn = n >> 2;                                   // coarse 64² helpers (water / parks proximity)
    this._water = new Float32Array(this.cn * this.cn); this._parks = new Float32Array(this.cn * this.cn); this._tmp = new Float32Array(this.cn * this.cn);
    this.version = 0;
    this._exposed = null;
  }
  /** The object published as world.economy.grids. */
  expose() {
    if (this._exposed) return this._exposed;
    const g = this;
    this._exposed = {
      size: g.n, cellSize: g.cell, ground: g.ground, air: g.air, noise: g.noise, landValue: g.landValue, version: 0,
      index: (x, z) => g.index(x, z),
      sample: (name, x, z) => { const a = g[name]; return a ? g.sample(a, x, z) : 0; },
    };
    return this._exposed;
  }
  clear() { this.ground.fill(0); this.air.fill(0); this.noise.fill(0); this.landValue.fill(0); this.version = 0; if (this._exposed) this._exposed.version = 0; }
  index(x, z) {
    const n = this.n;
    let ix = Math.floor((x + this.half) / this.cell), iz = Math.floor((z + this.half) / this.cell);
    ix = ix < 0 ? 0 : ix >= n ? n - 1 : ix; iz = iz < 0 ? 0 : iz >= n ? n - 1 : iz;
    return iz * n + ix;
  }
  sample(arr, x, z) { return arr[this.index(x, z)]; }
  _splat(arr, cx, cz, r, amp) {
    const n = this.n;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(n - 1, Math.ceil(cx + r));
    const z0 = Math.max(0, Math.floor(cz - r)), z1 = Math.min(n - 1, Math.ceil(cz + r));
    const inv = 1 / (r * r);
    for (let z = z0; z <= z1; z++) {
      const dz = z + 0.5 - cz;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const d2 = (dx * dx + dz * dz) * inv;
        if (d2 >= 1) continue;
        const w = 1 - d2;
        arr[z * n + x] += amp * w * w;
      }
    }
  }
  /** 3-tap dilation on the coarse grid: proximity falloff for water and parks. */
  _dilate(src, passes) {
    const cn = this.cn, tmp = this._tmp;
    for (let p = 0; p < passes; p++) {
      for (let z = 0; z < cn; z++) for (let x = 0; x < cn; x++) {
        let m = src[z * cn + x];
        if (x > 0) m = Math.max(m, src[z * cn + x - 1] * 0.72); if (x < cn - 1) m = Math.max(m, src[z * cn + x + 1] * 0.72);
        if (z > 0) m = Math.max(m, src[(z - 1) * cn + x] * 0.72); if (z < cn - 1) m = Math.max(m, src[(z + 1) * cn + x] * 0.72);
        tmp[z * cn + x] = m;
      }
      src.set(tmp);
    }
  }
  /**
   * @param {Map} buildings  economy records with x, z, type, density, level, capacity
   * @param {object} env     hooks: edges(), nodes(), congestion(), isWater(x,z), servicesActive(), coverage(kind,x,z)
   * @param {number} happiness city happiness 0..1 (land value base)
   */
  update(buildings, env, happiness) {
    const n = this.n, cell = this.cell, half = this.half;
    this.ground.fill(0); this.air.fill(0); this.noise.fill(0); this._lv.fill(0);
    // buildings
    for (const r of buildings.values()) {
      if (r.x !== r.x || r.z !== r.z) continue;
      const cx = (r.x + half) / cell, cz = (r.z + half) / cell;
      const dens = r.density === 'high' ? 1.6 : 1;
      switch (r.type) {
        case 'industrial': {
          const amp = (0.10 + 0.04 * r.level) * dens;
          this._splat(this.ground, cx, cz, 6, amp); this._splat(this.air, cx, cz, 13, amp * 0.8);
          this._splat(this.noise, cx, cz, 4, amp * 0.6); this._splat(this._lv, cx, cz, 10, -0.22);
          break;
        }
        case 'commercial': this._splat(this.noise, cx, cz, 3, 0.10 * dens); this._splat(this._lv, cx, cz, 8, 0.09 * dens); break;
        case 'office': this._splat(this._lv, cx, cz, 10, 0.14 * dens); this._splat(this.noise, cx, cz, 2, 0.04); break;
        default: this._splat(this._lv, cx, cz, 4, 0.035 * dens);
      }
    }
    // roads: traffic noise along every edge (straight approximation of curved edges)
    const edges = env.edges(), nodes = env.nodes();
    if (edges && nodes && edges.size) {
      const cong = 0.6 + 0.6 * (env.congestion() || 0);
      for (const e of edges.values()) {
        const a = nodes.get(e.a), b = nodes.get(e.b); if (!a || !b) continue;
        const [amp, r] = ROAD_NOISE[e.type] || ROAD_NOISE.street;
        const len = e.length || Math.hypot(b.x - a.x, b.z - a.z);
        const steps = Math.max(1, Math.ceil(len / 20));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          this._splat(this.noise, (a.x + (b.x - a.x) * t + half) / cell, (a.z + (b.z - a.z) * t + half) / cell, r, amp * cong);
        }
      }
    }
    // water and parks proximity on the coarse grid
    const cn = this.cn, cc = cell * 4, water = this._water, parks = this._parks;
    let anyWater = false;
    for (let z = 0; z < cn; z++) for (let x = 0; x < cn; x++) {
      const wx = -half + (x + 0.5) * cc, wz = -half + (z + 0.5) * cc;
      const w = env.isWater(wx, wz) ? 1 : 0; water[z * cn + x] = w; anyWater = anyWater || w > 0;
    }
    if (anyWater) this._dilate(water, 3);
    const active = !!env.servicesActive();
    if (active) {
      for (let z = 0; z < cn; z++) for (let x = 0; x < cn; x++) {
        const wx = -half + (x + 0.5) * cc, wz = -half + (z + 0.5) * cc;
        parks[z * cn + x] = clamp01(env.coverage('park_small', wx, wz) * 0.8 + env.coverage('park_large', wx, wz) + env.coverage('plaza', wx, wz) * 0.5);
      }
    } else parks.fill(0);
    // compose land value, clamp the pollution grids
    const g = this.ground, a = this.air, no = this.noise, lv = this._lv, out = this.landValue;
    const base = 0.22 + 0.32 * happiness;
    for (let z = 0; z < n; z++) {
      const cz = (z >> 2) * cn;
      for (let x = 0; x < n; x++) {
        const i = z * n + x, ci = cz + (x >> 2);
        const gg = g[i] > 1 ? 1 : g[i], aa = a[i] > 1 ? 1 : a[i], nn = no[i] > 1 ? 1 : no[i];
        g[i] = gg; a[i] = aa; no[i] = nn;
        const w = water[ci], pk = parks[ci];
        out[i] = clamp01(base + lv[i] + 0.18 * w * (1 - gg) + 0.12 * pk - 0.6 * gg - 0.4 * aa - 0.35 * nn);
      }
    }
    this.version++;
    if (this._exposed) this._exposed.version = this.version;
  }
}
