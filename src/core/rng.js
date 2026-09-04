// Seeded RNG (sfc32). The ONLY randomness source allowed in modules.
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export class RNG {
  constructor(seed, label = '') {
    this.seed = seed;
    this.label = label;
    const h = hashString(`${seed}:${label}`);
    this.a = h(); this.b = h(); this.c = h(); this.d = h();
    for (let i = 0; i < 12; i++) this.next();
  }
  /** uint32 */
  next() {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }
  /** [0,1) */
  float() { return this.next() / 4294967296; }
  /** [min,max) */
  range(min, max) { return min + (max - min) * this.float(); }
  /** integer in [min,max] inclusive */
  int(min, max) { return min + Math.floor(this.float() * (max - min + 1)); }
  bool(p = 0.5) { return this.float() < p; }
  pick(arr) { return arr[Math.floor(this.float() * arr.length)]; }
  /** weighted pick: items = [[value, weight], ...] */
  weighted(items) {
    let total = 0;
    for (const [, w] of items) total += w;
    let r = this.float() * total;
    for (const [v, w] of items) { r -= w; if (r <= 0) return v; }
    return items[items.length - 1][0];
  }
  /** approx normal(0,1) */
  gauss() {
    let u = 0, v = 0;
    while (u === 0) u = this.float();
    while (v === 0) v = this.float();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /** independent derived stream */
  fork(label) { return new RNG(this.seed, `${this.label}/${label}`); }
}

/** Deterministic 2D hash in [0,1), for procedural placement without state. */
export function hash2(x, y, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Simple 2D value noise + fbm, seeded. Good enough for macro variation; terrain uses its own. */
export function makeNoise2D(seed = 0) {
  const perm = new Uint8Array(512);
  const r = new RNG(seed, 'noise');
  const p = Array.from({ length: 256 }, (_, i) => i);
  r.shuffle(p);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const noise = (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const A = perm[X] + Y, B = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
      lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u), v) * 0.7;
  };
  const fbm = (x, y, octaves = 5, lacunarity = 2, gain = 0.5) => {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x * freq, y * freq); norm += amp; amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  };
  return { noise, fbm };
}
