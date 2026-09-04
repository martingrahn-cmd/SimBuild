// Terrain runtime data: the heightfield, derived normal/AO/flow texture, chunk bounds and the world.terrain API
// (bilinear height, normal, slope, water test, heightfield raycast, brush modify).
import * as THREE from 'three';

const _tmpN = new THREE.Vector3();

export class TerrainData {
  /**
   * @param {{heights:Float32Array, flow:Float32Array, res:number, size:number, cell:number}} gen
   */
  constructor(gen, seaLevel = 0, chunks = 16) {
    this.res = gen.res;
    this.size = gen.size;
    this.half = gen.size / 2;
    this.cell = gen.cell;
    this.heights = gen.heights;
    this.flow = gen.flow;
    this.seaLevel = seaLevel;
    this.chunks = chunks;
    this.cellsPerChunk = (this.res - 1) / chunks;
    this.chunkSize = this.size / chunks;
    this.chunkMin = new Float32Array(chunks * chunks);
    this.chunkMax = new Float32Array(chunks * chunks);
    this.minH = 0; this.maxH = 0;

    // GPU-side data: R32F heights (texelFetch in the vertex shader) + RGBA8 (nx, nz, ao, flow)
    this.heightTex = new THREE.DataTexture(this.heights, this.res, this.res, THREE.RedFormat, THREE.FloatType);
    this.heightTex.magFilter = this.heightTex.minFilter = THREE.NearestFilter;
    this.heightTex.generateMipmaps = false;
    this.heightTex.wrapS = this.heightTex.wrapT = THREE.ClampToEdgeWrapping;
    this.heightTex.needsUpdate = true;

    this.normalData = new Uint8Array(this.res * this.res * 4);
    this.normalTex = new THREE.DataTexture(this.normalData, this.res, this.res, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.normalTex.magFilter = this.normalTex.minFilter = THREE.LinearFilter;
    this.normalTex.generateMipmaps = false;
    this.normalTex.wrapS = this.normalTex.wrapT = THREE.ClampToEdgeWrapping;

    this._blurS = new Float32Array(this.res * this.res);
    this._blurL = new Float32Array(this.res * this.res);
    this.rebuildDerived(0, 0, this.res - 1, this.res - 1);
    this.rebuildAllChunkBounds();
    this.version = 0;
  }

  // ---------------------------------------------------------------- sampling
  /** bilinear height; clamped outside the world */
  getHeight(x, z) {
    const res = this.res, h = this.heights;
    let fx = (x + this.half) / this.cell, fz = (z + this.half) / this.cell;
    if (fx < 0) fx = 0; else if (fx > res - 1.0001) fx = res - 1.0001;
    if (fz < 0) fz = 0; else if (fz > res - 1.0001) fz = res - 1.0001;
    const ix = fx | 0, iz = fz | 0;
    const u = fx - ix, v = fz - iz;
    const i = iz * res + ix;
    const h00 = h[i], h10 = h[i + 1], h01 = h[i + res], h11 = h[i + res + 1];
    return (h00 * (1 - u) + h10 * u) * (1 - v) + (h01 * (1 - u) + h11 * u) * v;
  }
  getNormal(x, z, out) {
    out = out || new THREE.Vector3();
    const e = this.cell * 0.5;
    const dx = this.getHeight(x + e, z) - this.getHeight(x - e, z);
    const dz = this.getHeight(x, z + e) - this.getHeight(x, z - e);
    return out.set(-dx, 2 * e, -dz).normalize();
  }
  /** slope angle in radians */
  getSlope(x, z) {
    const n = this.getNormal(x, z, _tmpN);
    return Math.acos(Math.min(1, Math.max(-1, n.y)));
  }
  isWater(x, z) { return this.getHeight(x, z) < this.seaLevel; }

  /**
   * Ray vs heightfield. Conservative marching (step bounded by height above ground / max slope) + bisection.
   * @param {THREE.Ray} ray
   * @returns {{point:THREE.Vector3, normal:THREE.Vector3}|null}
   */
  raycast(ray) {
    const o = ray.origin, d = ray.direction;
    // clip to the world column [x,z in ±half, y in minH-1 .. maxH+1]
    let t0 = 0, t1 = 20000;
    const lim = this.half;
    const clip = (oc, dc, lo, hi) => {
      if (Math.abs(dc) < 1e-9) { if (oc < lo || oc > hi) { t1 = -1; } return; }
      let a = (lo - oc) / dc, b = (hi - oc) / dc;
      if (a > b) { const t = a; a = b; b = t; }
      if (a > t0) t0 = a; if (b < t1) t1 = b;
    };
    clip(o.x, d.x, -lim, lim); clip(o.z, d.z, -lim, lim); clip(o.y, d.y, this.minH - 1, this.maxH + 1);
    if (t1 < t0) return null;
    const maxSlope = 2.5;
    let t = t0, prevT = t0;
    let prevAbove = o.y + d.y * t - this.getHeight(o.x + d.x * t, o.z + d.z * t);
    if (prevAbove < 0) {
      // starts under ground: report the entry point
      const p = new THREE.Vector3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
      return { point: p, normal: this.getNormal(p.x, p.z) };
    }
    const minStep = this.cell * 0.35;
    for (let iter = 0; iter < 4000 && t < t1; iter++) {
      let step = prevAbove / (1 + maxSlope);
      if (step < minStep) step = minStep;
      if (step > 64) step = 64;
      t += step;
      if (t > t1) t = t1;
      const px = o.x + d.x * t, pz = o.z + d.z * t, py = o.y + d.y * t;
      const above = py - this.getHeight(px, pz);
      if (above <= 0) {
        // bisect between prevT (above) and t (below)
        let a = prevT, b = t;
        for (let k = 0; k < 10; k++) {
          const m = (a + b) * 0.5;
          const mx = o.x + d.x * m, mz = o.z + d.z * m, my = o.y + d.y * m;
          if (my - this.getHeight(mx, mz) > 0) a = m; else b = m;
        }
        const tf = (a + b) * 0.5;
        const p = new THREE.Vector3(o.x + d.x * tf, 0, o.z + d.z * tf);
        p.y = this.getHeight(p.x, p.z);
        return { point: p, normal: this.getNormal(p.x, p.z) };
      }
      prevT = t; prevAbove = above;
    }
    return null;
  }

  // ---------------------------------------------------------------- editing
  /**
   * Brush: {x, z, radius, strength, mode:'raise'|'lower'|'flatten'|'smooth'}. strength in metres (per call).
   * Returns the modified cell rect for chunk updates.
   */
  modify(brush) {
    const { x, z, radius = 20 } = brush;
    const strength = brush.strength ?? 1;
    const mode = brush.mode || 'raise';
    const res = this.res, h = this.heights;
    const cx = (x + this.half) / this.cell, cz = (z + this.half) / this.cell, cr = radius / this.cell;
    const ix0 = Math.max(0, Math.floor(cx - cr)), ix1 = Math.min(res - 1, Math.ceil(cx + cr));
    const iz0 = Math.max(0, Math.floor(cz - cr)), iz1 = Math.min(res - 1, Math.ceil(cz + cr));
    if (ix1 < ix0 || iz1 < iz0) return null;
    const target = mode === 'flatten' ? (brush.target ?? this.getHeight(x, z)) : 0;
    let src = null;
    if (mode === 'smooth') src = h.slice();
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
      const dx = (ix - cx) / cr, dz = (iz - cz) / cr;
      const r = Math.sqrt(dx * dx + dz * dz);
      if (r >= 1) continue;
      const w = 1 - r * r * (3 - 2 * r);      // smooth falloff
      const i = iz * res + ix;
      switch (mode) {
        case 'raise': h[i] += strength * w; break;
        case 'lower': h[i] -= strength * w; break;
        case 'flatten': h[i] += (target - h[i]) * Math.min(1, w * strength); break;
        case 'smooth': {
          let sum = 0, cnt = 0;
          for (let oz = -2; oz <= 2; oz++) for (let ox = -2; ox <= 2; ox++) {
            const jx = ix + ox, jz = iz + oz;
            if (jx < 0 || jz < 0 || jx >= res || jz >= res) continue;
            sum += src[jz * res + jx]; cnt++;
          }
          h[i] += (sum / cnt - h[i]) * Math.min(1, w * strength);
          break;
        }
        default: break;
      }
    }
    const m = 10;
    this.rebuildDerived(Math.max(0, ix0 - m), Math.max(0, iz0 - m), Math.min(res - 1, ix1 + m), Math.min(res - 1, iz1 + m));
    this.heightTex.needsUpdate = true;
    this.normalTex.needsUpdate = true;
    // chunk bounds
    const c0x = Math.floor(ix0 / this.cellsPerChunk), c1x = Math.min(this.chunks - 1, Math.floor(ix1 / this.cellsPerChunk));
    const c0z = Math.floor(iz0 / this.cellsPerChunk), c1z = Math.min(this.chunks - 1, Math.floor(iz1 / this.cellsPerChunk));
    for (let cz2 = c0z; cz2 <= c1z; cz2++) for (let cx2 = c0x; cx2 <= c1x; cx2++) this.rebuildChunkBounds(cx2, cz2);
    this.version++;
    return { ix0, iz0, ix1, iz1 };
  }

  // ---------------------------------------------------------------- derived data
  rebuildAllChunkBounds() {
    let mn = Infinity, mx = -Infinity;
    for (let cz = 0; cz < this.chunks; cz++) for (let cx = 0; cx < this.chunks; cx++) {
      this.rebuildChunkBounds(cx, cz);
      const i = cz * this.chunks + cx;
      if (this.chunkMin[i] < mn) mn = this.chunkMin[i];
      if (this.chunkMax[i] > mx) mx = this.chunkMax[i];
    }
    this.minH = mn; this.maxH = mx;
  }
  rebuildChunkBounds(cx, cz) {
    const res = this.res, n = this.cellsPerChunk;
    let mn = Infinity, mx = -Infinity;
    for (let iz = cz * n; iz <= cz * n + n; iz++) {
      const row = iz * res;
      for (let ix = cx * n; ix <= cx * n + n; ix++) { const v = this.heights[row + ix]; if (v < mn) mn = v; if (v > mx) mx = v; }
    }
    const i = cz * this.chunks + cx;
    this.chunkMin[i] = mn; this.chunkMax[i] = mx;
    if (mn < this.minH) this.minH = mn; if (mx > this.maxH) this.maxH = mx;
  }
  /** normals + two-scale cavity AO + flow into the RGBA8 texture for the cell rect (inclusive) */
  rebuildDerived(ix0, iz0, ix1, iz1) {
    const res = this.res, h = this.heights, cell = this.cell, out = this.normalData;
    const rS = 2, rL = 8;
    // box blurs (separable) over the rect expanded by the radius; clamp at edges
    const ex0 = Math.max(0, ix0 - rL), ex1 = Math.min(res - 1, ix1 + rL), ez0 = Math.max(0, iz0 - rL), ez1 = Math.min(res - 1, iz1 + rL);
    const blur = (dst, r) => {
      const tmp = this._tmpRow || (this._tmpRow = new Float32Array(res * res));
      for (let iz = ez0; iz <= ez1; iz++) {
        const row = iz * res;
        for (let ix = ex0; ix <= ex1; ix++) {
          let s = 0, c = 0;
          for (let o = -r; o <= r; o++) { const jx = ix + o; if (jx >= 0 && jx < res) { s += h[row + jx]; c++; } }
          tmp[row + ix] = s / c;
        }
      }
      for (let iz = ez0; iz <= ez1; iz++) for (let ix = ex0; ix <= ex1; ix++) {
        let s = 0, c = 0;
        for (let o = -r; o <= r; o++) { const jz = iz + o; if (jz >= 0 && jz < res) { s += tmp[jz * res + ix]; c++; } }
        dst[iz * res + ix] = s / c;
      }
    };
    blur(this._blurS, rS);
    blur(this._blurL, rL);
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const i = iz * res + ix;
        const xl = h[iz * res + (ix > 0 ? ix - 1 : ix)], xr = h[iz * res + (ix < res - 1 ? ix + 1 : ix)];
        const zu = h[(iz > 0 ? iz - 1 : iz) * res + ix], zd = h[(iz < res - 1 ? iz + 1 : iz) * res + ix];
        const sx = ix > 0 && ix < res - 1 ? 2 * cell : cell, sz = iz > 0 && iz < res - 1 ? 2 * cell : cell;
        let nx = (xl - xr) / sx, nz = (zu - zd) / sz, ny = 1;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz); nx /= l; ny /= l; nz /= l;
        const cavS = this._blurS[i] - h[i];   // >0 concave
        const cavL = this._blurL[i] - h[i];
        let ao = 1 - Math.min(0.5, Math.max(0, cavS) * 0.22) - Math.min(0.3, Math.max(0, cavL) * 0.03);
        ao = Math.min(1, ao + Math.max(0, -cavS) * 0.03);   // ridges slightly brighter
        const o = i * 4;
        out[o] = Math.round((nx * 0.5 + 0.5) * 255);
        out[o + 1] = Math.round((nz * 0.5 + 0.5) * 255);
        out[o + 2] = Math.round(Math.max(0.3, Math.min(1, ao)) * 255);
        out[o + 3] = Math.round(Math.min(1, Math.max(0, this.flow[i])) * 255);
      }
    }
    this.normalTex.needsUpdate = true;
  }

  dispose() { this.heightTex.dispose(); this.normalTex.dispose(); }
}
