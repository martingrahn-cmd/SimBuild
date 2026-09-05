// Deterministic heightfield generator: warped fbm plains, hill ring, ridged mountains at the E/N/S edges,
// a meandering river valley from the east range to a west coast, an island, and droplet hydraulic erosion.
// Pure JS (no three) so it can be unit-tested in node. All randomness comes from the passed rng (sfc32).
import { Noise2D, clamp, lerp, smoothstep } from './noise.js';

/**
 * @param rng   ctx.rng fork
 * @param opts  { res: 513, size: 2048 }
 * @returns { heights: Float32Array(res*res) [z][x], flow: Float32Array, river, coast, minH, maxH }
 */
export function generateHeightmap(rng, opts = {}) {
  const res = opts.res ?? 513;
  const size = opts.size ?? 2048;
  const half = size / 2;
  const cell = size / (res - 1);
  const n = res * res;
  const heights = new Float32Array(n);

  const nBase = new Noise2D(rng.fork('base'));
  const nMount = new Noise2D(rng.fork('mount'));
  const nWarp = new Noise2D(rng.fork('warp'));
  const nDetail = new Noise2D(rng.fork('detail'));
  const nRiver = new Noise2D(rng.fork('river'));
  const nCoast = new Noise2D(rng.fork('coast'));

  // ---- river centreline z_r(x): single-valued in x, precomputed per column ----
  const river = makeRiver(nRiver, res, half, cell);
  // ---- coast line x_c(z): single-valued in z, precomputed per row ----
  const coast = makeCoast(nCoast, res, half, cell);

  const island = { x: -900, z: 190, r: 110 };

  for (let iz = 0; iz < res; iz++) {
    const z = -half + iz * cell;
    const xc = coast.xAt[iz];
    for (let ix = 0; ix < res; ix++) {
      const x = -half + ix * cell;
      // domain warp for organic shapes
      const wx = x + 110 * nWarp.fbm(x / 640, z / 640, 3);
      const wz = z + 110 * nWarp.fbm(x / 640 + 5.3, z / 640 + 2.1, 3);

      // gentle plains: ~16 m with ±6 m rolling at 430 m, small undulation at 95 m, micro at 22 m
      let h = 16
        + 6.0 * nBase.fbm(wx / 460, wz / 460, 3, 2.0, 0.42)
        + 0.6 * nBase.fbm(x / 110 + 11, z / 110, 2, 2.0, 0.5)
        + 0.12 * nDetail.fbm(x / 24, z / 24, 2);

      // ring of hills (east/north/south), fading toward the west coast
      const rE = Math.max(x, Math.abs(z));
      const westFade = smoothstep(-840, -430, x);
      const mHill = smoothstep(540, 920, rE) * westFade;
      const hillN = 0.32 + 0.32 * nBase.fbm(wx / 330 + 3, wz / 330 - 7, 4, 2.0, 0.45)
        + 0.36 * nMount.ridged(wx / 240 + 4, wz / 240 - 2, 5, 2.05, 0.5, 1.15);
      h += 52 * hillN * mHill;
      // coastal hills / headlands on the west
      const mWest = smoothstep(-520, -980, x) * smoothstep(120, 520, Math.abs(z));
      h += 40 * (0.5 + 0.5 * nBase.fbm(wx / 300 - 9, wz / 300 + 4, 4)) * mWest;

      // ridged mountains at the edges
      const mM = smoothstep(560, 1010, rE) * westFade;
      if (mM > 0) {
        h += mountain(nMount, wx, wz, mM, 0, 0);
      }

      // ---- river valley (carve) ----
      {
        const dr = river.distance(x, z, ix);
        if (dr < 420) {
          const d = dr + 18 * nRiver.fbm(x / 120 + 3, z / 120, 3) + 4 * nRiver.fbm(x / 28, z / 28, 2);
          const w = river.halfWidth[ix];
          const shoreW = 10 + 26 * (0.5 + 0.5 * nRiver.fbm(x / 210 + 5, z / 210 - 3, 2));   // 10..36 m beaches
          h = Math.min(h, riverProfile(d, w, nRiver, x, z, shoreW, ix));
        }
      }
      // ---- coast (carve) ----
      {
        const dx = x - xc;
        const beachW = 12 + 40 * (0.5 + 0.5 * nCoast.fbm(z / 260 + 3, x / 260, 2));   // 12..52 m
        h = Math.min(h, coastProfile(dx, nCoast, x, z, beachW));
      }
      // ---- rugged headlands in the far west corners (added after the carve: rise straight out of the sea) ----
      const mW = smoothstep(-720, -1010, x) * smoothstep(600, 1010, Math.abs(z)) * smoothstep(-1024, -930, x) * smoothstep(1024, 940, Math.abs(z))
        * (0.55 + 0.45 * (0.5 + 0.5 * nBase.fbm(wx / 220 + 6, wz / 220 - 5, 3)));   // asymmetric: no smooth cone
      if (mW > 0) {
        // rounded coastal hills with a rocky crest (no single cone): fbm dome + a damped share of the ridged relief
        const dome = 0.5 + 0.5 * nBase.fbm(wx / 210 + 6, wz / 210 - 5, 4, 2.0, 0.5);
        const hw = -12 + mW * (26 + 40 * dome) + mountain(nMount, wx, wz, mW, 2, 1, 0.45) * 0.22;
        h = Math.max(h, hw);
      }
      // ---- island (add back) ----
      {
        // elongated NW-SE, ridged crest, a low grassy shelf on the lee side
        const ddx = x - island.x, ddz = z - island.z;
        const ex = (ddx * 0.83 + ddz * 0.56) / 1.35, ez = (-ddx * 0.56 + ddz * 0.83) / 0.85;
        const r = Math.sqrt(ex * ex + ez * ez) / island.r + 0.12 * nBase.fbm(x / 70 + 2, z / 70, 3);
        if (r < 1.5) {
          // rounded summit (plateau-ish top, no witch-hat spire), rocky flanks from a damped ridged field
          const bump = Math.pow(1 - smoothstep(0.12, 1.4, r), 1.15);
          const rid = nMount.ridged(x / 150 + 9, z / 150 + 4, 5, 2.05, 0.5, 1.25);
          const shelf = smoothstep(1.2, 0.5, r) * 4.5;
          const ih = -6 + shelf + 24 * bump * (0.65 + 0.35 * rid) + 5 * bump * nBase.fbm(x / 40, z / 40, 3);
          h = Math.max(h, ih);
        }
      }
      heights[iz * res + ix] = h;
    }
  }

  // ---- hydraulic erosion (droplets) on hills and mountains ----
  const flow = erode(heights, res, rng.fork('erosion'), { droplets: opts.droplets ?? 42000, maxSteps: 48, minSeedHeight: 28 });

  // light 3x3 smoothing pass on steep areas only (removes single-cell spikes left by erosion)
  despike(heights, res);

  let minH = Infinity, maxH = -Infinity;
  for (let i = 0; i < n; i++) { const v = heights[i]; if (v < minH) minH = v; if (v > maxH) maxH = v; }
  return { heights, flow, river, coast, island, minH, maxH, res, size, cell };
}

function makeRiver(nz, res, half, cell) {
  const zAt = new Float32Array(res), halfWidth = new Float32Array(res);
  const zr = (x) => -300 + 130 * Math.sin(x / 280 + 0.5) + 70 * Math.sin(x / 110 + 2.0) + 45 * nz.fbm(x / 160, 0.3, 3);
  for (let ix = 0; ix < res; ix++) {
    const x = -half + ix * cell;
    zAt[ix] = zr(x);
    // estuary widening toward the coast (x < -300), gorge narrowing in the east range
    halfWidth[ix] = 34 + 9 * nz.fbm(x / 140 + 7, 1.7, 2) + 70 * smoothstep(-330, -640, x) - 8 * smoothstep(650, 950, x);
  }
  const win = Math.ceil(420 / cell);
  /** true distance from (x,z) to the centreline polyline, searched in a window of columns around ix */
  const distance = (x, z, ix) => {
    let best = Infinity;
    const i0 = Math.max(0, ix - win), i1 = Math.min(res - 2, ix + win);
    for (let i = i0; i <= i1; i++) {
      const ax = -half + i * cell, az = zAt[i];
      const bx = ax + cell, bz = zAt[i + 1];
      const abx = bx - ax, abz = bz - az;
      let t = ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + abx * t - x, pz = az + abz * t - z;
      const dd = px * px + pz * pz;
      if (dd < best) best = dd;
    }
    return Math.sqrt(best);
  };
  return { zAt, halfWidth, zr, distance };
}

function riverProfile(d, w, nz, x, z, shoreW = 22, ix = 0) {
  if (d < w) {
    const t = d / w;
    return -8.0 + 6.0 * t * t + 0.6 * nz.fbm(x / 30, z / 30, 2);
  }
  const b = d - w;
  if (b < shoreW) return lerp(-2, 2.6, b / shoreW);    // shore / beach (width varies along the river)
  // floodplain (gently rising, 2.6..5 m) then a valley wall up to the plains; the plain-side rise is steep
  // enough to read as a valley (10-16 %) but only ~80 m wide, so the plains above stay buildable
  const f = b - shoreW;
  const flood = 35 + 30 * (0.5 + 0.5 * nz.fbm(x / 300 + 1, z / 300 + 8, 2));   // 35..65 m floodplain
  if (f < flood) return 2.6 + 2.4 * (f / flood);
  const g = f - flood;
  const wallN = 0.5 + 0.5 * nz.fbm(x / 90 + 4, z / 90 + 2, 3);
  return 5.0 + (0.14 + 0.08 * wallN) * g + 0.0016 * g * g;
}

function makeCoast(nz, res, half, cell) {
  const xAt = new Float32Array(res);
  for (let iz = 0; iz < res; iz++) {
    const z = -half + iz * cell;
    xAt[iz] = -640 + 70 * Math.sin(z / 310 + 1.2) + 50 * Math.sin(z / 120 + 0.4) + 60 * nz.fbm(z / 200, 0.7, 3);
  }
  return { xAt };
}

function coastProfile(dx, nz, x, z, beachW = 26) {
  if (dx < 0) {
    // sea floor: gentle shelf then drop
    const shelf = -1.5 + 0.05 * dx + 0.0003 * dx * dx * (dx > -200 ? 0 : -1);
    return Math.max(-60, shelf) + 0.8 * nz.fbm(x / 45, z / 45, 2);
  }
  if (dx < beachW) return -1.5 + 4.6 * (dx / beachW);   // beach: -1.5 → 3.1 m
  const f = dx - beachW;
  return 3.1 + 0.035 * f + 0.0016 * f * f;
}

/**
 * Ridged mountain relief in metres for a mask m (0..1): a primary ridged field with a soft-capped peak
 * (no single spire), secondary ridges at half scale, and a talus apron that eases the foot into the hills.
 */
function mountain(nz, wx, wz, m, ox, oz, sc = 1) {
  const rid = nz.ridged(wx / (520 * sc) + ox, wz / (520 * sc) + oz, 7, 2.05, 0.52, 1.3);
  const rid2 = nz.ridged(wx / (210 * sc) + ox + 7, wz / (210 * sc) + oz - 3, 5, 2.05, 0.5, 1.2);
  const mk = Math.pow(m, 1.3);
  // soft cap: pow(rid,1.35) saturates toward 1 instead of spiking (1 - exp(-k x)) / (1 - exp(-k))
  const pk = Math.pow(rid, 1.35);
  const capped = (1 - Math.exp(-2.2 * pk)) / (1 - Math.exp(-2.2));
  const primary = 270 * capped;
  const secondary = 70 * rid2 * (0.35 + 0.65 * rid);
  const talus = 22 * m * (1 - mk);   // apron: fills the foot with gentle scree slopes
  return 45 * m + (primary + secondary) * mk + talus;
}

/**
 * Droplet hydraulic erosion (after Lague). Heights are normalised by hScale during the simulation.
 * Returns a flow/sediment map in [0,1].
 */
function erode(heights, res, rng, { droplets = 30000, maxSteps = 40, minSeedHeight = 30 } = {}) {
  const hScale = 300;
  const n = res * res;
  const map = new Float32Array(n);
  for (let i = 0; i < n; i++) map[i] = heights[i] / hScale;
  const flow = new Float32Array(n);

  const inertia = 0.05, capacityFactor = 6, minSlope = 0.01, erodeSpeed = 0.35, depositSpeed = 0.3;
  const evaporate = 0.015, gravity = 4, radius = 2;
  const maskLo = 24, maskHi = 70;
  // brush weights
  const bx = [], bz = [], bw = [];
  let wsum = 0;
  for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
    const dd = Math.sqrt(dx * dx + dz * dz);
    if (dd <= radius) { const w = 1 - dd / radius; bx.push(dx); bz.push(dz); bw.push(w); wsum += w; }
  }
  for (let i = 0; i < bw.length; i++) bw[i] /= wsum;

  const minSeed = minSeedHeight / hScale;
  for (let d = 0; d < droplets; d++) {
    // seed on hills/mountains only (rejection sampling, bounded)
    let px = 0, pz = 0, ok = false;
    for (let tries = 0; tries < 12; tries++) {
      px = 1 + rng.float() * (res - 3); pz = 1 + rng.float() * (res - 3);
      if (map[Math.floor(pz) * res + Math.floor(px)] > minSeed) { ok = true; break; }
    }
    if (!ok) continue;
    let dirX = 0, dirZ = 0, speed = 1, water = 1, sediment = 0;
    for (let step = 0; step < maxSteps; step++) {
      const ix = Math.floor(px), iz = Math.floor(pz);
      if (ix < 1 || iz < 1 || ix >= res - 2 || iz >= res - 2) break;
      const u = px - ix, v = pz - iz;
      const i00 = iz * res + ix;
      const h00 = map[i00], h10 = map[i00 + 1], h01 = map[i00 + res], h11 = map[i00 + res + 1];
      const gx = (h10 - h00) * (1 - v) + (h11 - h01) * v;
      const gz = (h01 - h00) * (1 - u) + (h11 - h10) * u;
      const h = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;
      dirX = dirX * inertia - gx * (1 - inertia);
      dirZ = dirZ * inertia - gz * (1 - inertia);
      let len = Math.sqrt(dirX * dirX + dirZ * dirZ);
      if (len < 1e-6) { const a = rng.float() * Math.PI * 2; dirX = Math.cos(a); dirZ = Math.sin(a); len = 1; }
      dirX /= len; dirZ /= len;
      const nx = px + dirX, nz = pz + dirZ;
      const jx = Math.floor(nx), jz = Math.floor(nz);
      if (jx < 1 || jz < 1 || jx >= res - 2 || jz >= res - 2) break;
      const uu = nx - jx, vv = nz - jz;
      const j00 = jz * res + jx;
      const nh = map[j00] * (1 - uu) * (1 - vv) + map[j00 + 1] * uu * (1 - vv) + map[j00 + res] * (1 - uu) * vv + map[j00 + res + 1] * uu * vv;
      const dh = nh - h;
      const capacity = Math.max(-dh, minSlope) * speed * water * capacityFactor;
      // erosion strength fades out on the low plains so the city area stays smooth
      const hm = h * hScale;
      const mask = hm <= maskLo ? 0 : hm >= maskHi ? 1 : ((hm - maskLo) / (maskHi - maskLo)) ** 2;
      if (mask <= 0) break;
      if (sediment > capacity || dh > 0) {
        const dep = (dh > 0 ? Math.min(dh, sediment) : (sediment - capacity) * depositSpeed) * mask;
        sediment -= dep;
        map[i00] += dep * (1 - u) * (1 - v); map[i00 + 1] += dep * u * (1 - v);
        map[i00 + res] += dep * (1 - u) * v; map[i00 + res + 1] += dep * u * v;
        flow[i00] += dep * 0.5;
      } else {
        const er = Math.min((capacity - sediment) * erodeSpeed, -dh) * mask;
        for (let b = 0; b < bw.length; b++) {
          const k = (iz + bz[b]) * res + (ix + bx[b]);
          const amt = er * bw[b];
          const hv = map[k];
          const take = hv < amt ? hv : amt;
          map[k] = hv - take;
          sediment += take;
          flow[k] += take;
        }
      }
      speed = Math.sqrt(Math.max(0, speed * speed + dh * gravity));
      water *= (1 - evaporate);
      px = nx; pz = nz;
    }
  }
  for (let i = 0; i < n; i++) heights[i] = map[i] * hScale;
  // normalise flow: soft curve, most cells ~0
  let fmax = 0;
  for (let i = 0; i < n; i++) if (flow[i] > fmax) fmax = flow[i];
  const k = fmax > 0 ? 1 / (fmax * 0.12) : 0;
  for (let i = 0; i < n; i++) flow[i] = 1 - Math.exp(-flow[i] * k);
  return flow;
}

function despike(heights, res) {
  const src = heights.slice();
  for (let iz = 1; iz < res - 1; iz++) for (let ix = 1; ix < res - 1; ix++) {
    const i = iz * res + ix;
    const c = src[i];
    const avg = (src[i - 1] + src[i + 1] + src[i - res] + src[i + res]) * 0.25;
    const dev = c - avg;
    if (Math.abs(dev) > 2.5) heights[i] = avg + dev * 0.4;
  }
}

export { clamp, lerp, smoothstep };
