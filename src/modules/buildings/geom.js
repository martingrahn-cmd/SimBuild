// Geometry accumulator. Everything a building emits goes through one MeshBuilder per chunk per LOD:
// positions, normals, atlas uvs, per-vertex colour (cheap per-building/per-part tinting + baked
// contact AO), `win` (the BAKED per-window night state, constant across a quad) and `bidx` (the
// building's tint slot for info views).
//
// Local space of a building: +x right, +y up, +z forward = the direction the front facade faces.

import * as THREE from 'three';

export class MeshBuilder {
  constructor() {
    this.pos = []; this.nor = []; this.uv = []; this.col = []; this.win = []; this.bid = []; this.idx = [];
    this.v = 0;
    this.ox = 0; this.oy = 0; this.oz = 0; this.c = 1; this.s = 0;
    this._col = [1, 1, 1];
    this._w = [0, 0, 0, 0];
    this._bidx = 0;
    this._aoFn = null;               // optional (lx,ly,lz) -> brightness multiplier (contact AO)
    this.cells = null;               // when set, window quads record [rand, tier, cool] here
  }
  get triangles() { return this.idx.length / 3; }
  get empty() { return this.v === 0; }

  /** place the local frame: origin (world) + heading (front direction) */
  frame(ox, oy, oz, heading) {
    this.ox = ox; this.oy = oy; this.oz = oz;
    this.c = Math.cos(heading); this.s = Math.sin(heading);
  }
  worldX(lx, lz) { return this.ox + this.c * lx + this.s * lz; }
  worldZ(lx, lz) { return this.oz + this.s * lx - this.c * lz; }
  color(r, g, b) { this._col[0] = r; this._col[1] = g; this._col[2] = b; return this; }
  building(i) { this._bidx = i; return this; }
  /** baked window state for the quads that follow; bias 0 means "not a window surface" */
  winState(rand, tier, cool, bias) { this._w[0] = rand; this._w[1] = tier; this._w[2] = cool; this._w[3] = bias; return this; }
  noWin() { this._w[0] = 0; this._w[1] = 0; this._w[2] = 0; this._w[3] = 0; return this; }
  /** contact darkening: vertices below y0+h are multiplied toward `amount` */
  baseAO(y0, h, amount) {
    this._aoFn = h > 0 ? (lx, ly) => { const t = (ly - y0) / h; return t >= 1 ? 1 : amount + (1 - amount) * (t < 0 ? 0 : t); } : null;
    return this;
  }
  /** arbitrary contact darkening, e.g. the ground plate fading into the wall it meets */
  aoFn(fn) { this._aoFn = fn; return this; }
  clearAO() { this._aoFn = null; return this; }
  colorHex(hex, jitter = 0, rng = null) {
    const col = _c.set(hex);
    if (jitter && rng) {
      const k = 1 + (rng.float() - 0.5) * jitter;
      col.r = Math.min(1, col.r * k); col.g = Math.min(1, col.g * k); col.b = Math.min(1, col.b * k);
    }
    return this.color(col.r, col.g, col.b);
  }

  _push(lx, ly, lz, nx, ny, nz, u, vv) {
    this.pos.push(this.ox + this.c * lx + this.s * lz, this.oy + ly, this.oz + this.s * lx - this.c * lz);
    this.nor.push(this.c * nx + this.s * nz, ny, this.s * nx - this.c * nz);
    this.uv.push(u, vv);
    let k = this._aoFn ? this._aoFn(lx, ly, lz) : 1;
    if (!Number.isFinite(k)) k = 1;
    this.col.push(this._col[0] * k, this._col[1] * k, this._col[2] * k);
    this.win.push(this._w[0], this._w[1], this._w[2], this._w[3]);
    this.bid.push(this._bidx);
    this.v++;
  }

  /**
   * One quad. a,b,c,d are local [x,y,z] corners in CCW order seen from the front face;
   * a = uv(0,0), b = uv(1,0), c = uv(1,1), d = uv(0,1) inside the tile rect.
   * `sub` = [u0, v0, u1, v1] in tile-local 0..1 space (default the whole tile).
   */
  quad(a, b, c, d, tile, sub, flipU = false) {
    const nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]);
    const ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]);
    const nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    const l = Math.hypot(nx, ny, nz);
    if (!(l > 1e-9)) return;            // a degenerate quad would carry a zero normal and shade as NaN
    const s = sub || FULL;
    let u0 = tile.u + tile.du * s[0], u1 = tile.u + tile.du * s[2];
    if (flipU) { const t = u0; u0 = u1; u1 = t; }
    const v0 = tile.v + tile.dv * s[1], v1 = tile.v + tile.dv * s[3];
    const i0 = this.v;
    this._push(a[0], a[1], a[2], nx / l, ny / l, nz / l, u0, v0);
    this._push(b[0], b[1], b[2], nx / l, ny / l, nz / l, u1, v0);
    this._push(c[0], c[1], c[2], nx / l, ny / l, nz / l, u1, v1);
    this._push(d[0], d[1], d[2], nx / l, ny / l, nz / l, u0, v1);
    // the local->world basis (right, up, front) is left-handed by construction, so the winding is
    // reversed here; the transformed normal is still the true outward normal (M is orthogonal).
    this.idx.push(i0, i0 + 2, i0 + 1, i0, i0 + 3, i0 + 2);
  }

  /**
   * Tiled plane: corner `o` (local), unit axes `uD`/`vD`, extents uLen/vLen, split into nu×nv tiles.
   * `variants` picks a tile per cell from a deterministic integer hash of the cell index.
   */
  grid(o, uD, vD, uLen, vLen, nu, nv, tile, hx = 0, hy = 0, variants = null) {
    nu = Math.max(1, nu | 0); nv = Math.max(1, nv | 0);
    const du = uLen / nu, dv = vLen / nv;
    const p = (i, j) => [o[0] + uD[0] * du * i + vD[0] * dv * j, o[1] + uD[1] * du * i + vD[1] * dv * j, o[2] + uD[2] * du * i + vD[2] * dv * j];
    const nvar = variants ? variants.length : 0;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      let t = tile;
      if (nvar) {
        const h = (Math.imul(i + (hx | 0), 73856093) ^ Math.imul(j + (hy | 0), 19349663)) >>> 0;
        t = variants[h % nvar];
      }
      this.quad(p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1), t);
    }
  }

  /**
   * Axis-aligned box in local space (centre cx,cz; base y0; size w×h×d).
   * tiles: {side, front?, top, bottom?}; `world` = metres per tile for the tiled subdivision.
   */
  box(cx, y0, cz, w, h, d, tiles, world = 3) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h;
    const side = tiles.side, top = tiles.top === undefined ? tiles.side : tiles.top, bot = tiles.bottom;
    const nw = Math.max(1, Math.round(w / world)), nd = Math.max(1, Math.round(d / world)), nh = Math.max(1, Math.round(h / world));
    const front = tiles.front || side, back = tiles.back || side, left = tiles.left || side, right = tiles.right || side;
    this.grid([x0, y0, z1], [1, 0, 0], [0, 1, 0], w, h, nw, nh, front);
    this.grid([x1, y0, z0], [-1, 0, 0], [0, 1, 0], w, h, nw, nh, back);
    this.grid([x1, y0, z1], [0, 0, -1], [0, 1, 0], d, h, nd, nh, right);
    this.grid([x0, y0, z0], [0, 0, 1], [0, 1, 0], d, h, nd, nh, left);
    if (top) this.grid([x0, y1, z1], [1, 0, 0], [0, 0, -1], w, d, nw, nd, top);
    if (bot) this.grid([x0, y0, z0], [1, 0, 0], [0, 0, 1], w, d, nw, nd, bot);
  }

  /** vertical cylinder (silo, tank, chimney) */
  cylinder(cx, y0, cz, r, h, seg, sideTile, topTile) {
    seg = Math.max(6, seg | 0);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r;
      const x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
      this.quad([x0, y0, z0], [x1, y0, z1], [x1, y0 + h, z1], [x0, y0 + h, z0], sideTile);
    }
    if (topTile) {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        this.tri([cx, y0 + h, cz], [cx + Math.cos(a1) * r, y0 + h, cz + Math.sin(a1) * r],
          [cx + Math.cos(a0) * r, y0 + h, cz + Math.sin(a0) * r], topTile, [0.5, 0.5], [1, 0], [0, 0]);
      }
    }
  }

  /** triangle helper (roof gables) */
  tri(a, b, c, tile, uvA, uvB, uvC) {
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const l = Math.hypot(nx, ny, nz);
    if (!(l > 1e-9)) return;
    const i0 = this.v;
    const U = (uv) => tile.u + uv[0] * tile.du, V = (uv) => tile.v + uv[1] * tile.dv;
    this._push(a[0], a[1], a[2], nx / l, ny / l, nz / l, U(uvA), V(uvA));
    this._push(b[0], b[1], b[2], nx / l, ny / l, nz / l, U(uvB), V(uvB));
    this._push(c[0], c[1], c[2], nx / l, ny / l, nz / l, U(uvC), V(uvC));
    this.idx.push(i0, i0 + 2, i0 + 1);
  }

  /** free quad from 4 local points with explicit tiling counts (used for roof slopes) */
  slope(a, b, c, d, tile, nu, nv) {
    const P = (u, v) => {
      const ab = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
      const dc = [d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u, d[2] + (c[2] - d[2]) * u];
      return [ab[0] + (dc[0] - ab[0]) * v, ab[1] + (dc[1] - ab[1]) * v, ab[2] + (dc[2] - ab[2]) * v];
    };
    nu = Math.max(1, nu | 0); nv = Math.max(1, nv | 0);
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      this.quad(P(i / nu, j / nv), P((i + 1) / nu, j / nv), P((i + 1) / nu, (j + 1) / nv), P(i / nu, (j + 1) / nv), tile);
    }
  }

  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('win', new THREE.Float32BufferAttribute(this.win, 4));
    g.setAttribute('bidx', new THREE.Float32BufferAttribute(this.bid, 1));
    g.setIndex(this.v > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

const _c = new THREE.Color();
const FULL = [0, 0, 1, 1];
