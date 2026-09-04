// Fixed-size ring buffer of float rows (n keys per sample). Zero allocations after construction.
export class Ring {
  constructor(len, n) {
    this.len = len; this.n = n;
    this.data = new Float32Array(len * n);
    this.head = 0;      // next write slot
    this.count = 0;     // valid samples (<= len)
  }
  clear() { this.head = 0; this.count = 0; this.data.fill(0); }
  /** push one row (array-like of length n) */
  push(row) {
    const o = this.head * this.n, d = this.data;
    for (let i = 0; i < this.n; i++) d[o + i] = row[i];
    this.head = (this.head + 1) % this.len;
    if (this.count < this.len) this.count++;
  }
  /** value of key index k at sample i (0 = oldest, count-1 = newest) */
  get(i, k) {
    const idx = (this.head - this.count + i + this.len) % this.len;
    return this.data[idx * this.n + k];
  }
  last(k) { return this.count ? this.get(this.count - 1, k) : 0; }
  /** min/max of a key over the last m samples (or all); writes into out [min,max] */
  range(k, m, out) {
    const cnt = Math.min(this.count, m || this.count);
    let lo = Infinity, hi = -Infinity;
    for (let i = this.count - cnt; i < this.count; i++) { const v = this.get(i, k); if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!cnt) { lo = 0; hi = 0; }
    out[0] = lo; out[1] = hi; return out;
  }
  /** copy of a key's series, oldest first (allocates) */
  series(k) { const a = new Float32Array(this.count); for (let i = 0; i < this.count; i++) a[i] = this.get(i, k); return a; }
  serialize() { return { len: this.len, n: this.n, head: this.head, count: this.count, data: Array.from(this.data) }; }
  deserialize(s) {
    if (!s || s.len !== this.len || s.n !== this.n) { this.clear(); return; }
    this.head = s.head | 0; this.count = Math.min(this.len, s.count | 0);
    for (let i = 0; i < this.data.length; i++) this.data[i] = s.data[i] || 0;
  }
}
