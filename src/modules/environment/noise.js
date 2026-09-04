// Tileable 4-octave gradient noise packed into RGBA (one octave per channel) as a DataTexture.
// One texture tap == 4 octaves of fbm in the shaders (clouds, cloud shadows, moon, milky way).
import * as THREE from 'three';

export function makeNoiseTexture(rng, size = 256) {
  const data = new Uint8Array(size * size * 4);
  const periods = [4, 8, 16, 32];
  for (let o = 0; o < 4; o++) {
    const P = periods[o];
    // gradient table, one gradient per lattice point (periodic)
    const gx = new Float32Array(P * P), gy = new Float32Array(P * P);
    for (let i = 0; i < P * P; i++) { const a = rng.float() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    let min = Infinity, max = -Infinity;
    const tmp = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * P; const iy = Math.floor(fy); const ty = fy - iy;
      const sy = ty * ty * ty * (ty * (ty * 6 - 15) + 10);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * P; const ix = Math.floor(fx); const tx = fx - ix;
        const sx = tx * tx * tx * (tx * (tx * 6 - 15) + 10);
        const g = (i, j) => (((j % P) + P) % P) * P + (((i % P) + P) % P);
        const d = (i, j, dx, dy) => { const k = g(i, j); return gx[k] * dx + gy[k] * dy; };
        const n00 = d(ix, iy, tx, ty), n10 = d(ix + 1, iy, tx - 1, ty);
        const n01 = d(ix, iy + 1, tx, ty - 1), n11 = d(ix + 1, iy + 1, tx - 1, ty - 1);
        const nx0 = n00 + (n10 - n00) * sx, nx1 = n01 + (n11 - n01) * sx;
        const v = nx0 + (nx1 - nx0) * sy;
        tmp[y * size + x] = v;
        if (v < min) min = v; if (v > max) max = v;
      }
    }
    const inv = 1 / (max - min);
    for (let i = 0; i < size * size; i++) data[i * 4 + o] = Math.round((tmp[i] - min) * inv * 255);
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
