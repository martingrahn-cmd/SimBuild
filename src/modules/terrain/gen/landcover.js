// Land-cover map (RGBA8, world-aligned) that drives the terrain's macro colour variation at the 20 m and
// 200 m scales the aerial camera sees: bare-dirt patches and worn tracks, a pasture/meadow patchwork of
// Worley fields with different dryness, forest-floor darkening in hollows / floodplains / north slopes, and a
// fine break-up channel. Pure JS, deterministic (rng + hash2), ~0.2 s at 512².
//   R = dirt / bare ground     G = dryness (0 lush .. 1 straw)     B = lush / forest floor     A = fine variation
import { Noise2D, clamp, smoothstep } from './noise.js';
import { hash2 } from '../../../core/rng.js';

const FIELD = 175;   // metres, mean field size

/** Worley cell search: nearest and second-nearest feature points on a jittered grid. */
function worley(x, z, seed, out) {
  const cx = Math.floor(x / FIELD), cz = Math.floor(z / FIELD);
  let f1 = 1e9, f2 = 1e9, id1x = 0, id1z = 0;
  for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
    const gx = cx + ox, gz = cz + oz;
    const px = (gx + 0.15 + 0.7 * hash2(gx, gz, seed)) * FIELD;
    const pz = (gz + 0.15 + 0.7 * hash2(gx, gz, seed + 1)) * FIELD;
    const dx = px - x, dz = pz - z;
    // anisotropic metric: fields are longer than wide, rotated per cell so the patchwork is not a grid
    const a = hash2(gx, gz, seed + 2) * Math.PI;
    const ca = Math.cos(a), sa = Math.sin(a);
    const u = dx * ca + dz * sa, v = -dx * sa + dz * ca;
    const d = Math.sqrt(u * u * 0.55 + v * v * 1.6);
    if (d < f1) { f2 = f1; f1 = d; id1x = gx; id1z = gz; } else if (d < f2) f2 = d;
  }
  out.f1 = f1; out.f2 = f2; out.idx = id1x; out.idz = id1z;
  return out;
}

/**
 * @param rng   module rng fork
 * @param gen   generateHeightmap() result (heights, res, size, cell, river, coast, flow)
 * @param size  texels per side (world / size metres per texel)
 */
export function generateLandcover(rng, gen, size = 512) {
  const { heights, res, cell, flow } = gen;
  const world = gen.size, half = world / 2;
  const data = new Uint8Array(size * size * 4);
  const nA = new Noise2D(rng.fork('patch')), nB = new Noise2D(rng.fork('dry')), nC = new Noise2D(rng.fork('lush')), nD = new Noise2D(rng.fork('fine')), nE = new Noise2D(rng.fork('track'));
  const w = { f1: 0, f2: 0, idx: 0, idz: 0 };
  const hAt = (x, z) => {
    let fx = (x + half) / cell, fz = (z + half) / cell;
    fx = clamp(fx, 0, res - 1.001); fz = clamp(fz, 0, res - 1.001);
    const ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz, i = iz * res + ix;
    return (heights[i] * (1 - u) + heights[i + 1] * u) * (1 - v) + (heights[i + res] * (1 - u) + heights[i + res + 1] * u) * v;
  };
  const step = world / size;
  for (let ty = 0; ty < size; ty++) {
    const z = -half + (ty + 0.5) * step;
    for (let tx = 0; tx < size; tx++) {
      const x = -half + (tx + 0.5) * step;
      const h = hAt(x, z);
      const e = 6;
      const hx = hAt(x + e, z) - hAt(x - e, z), hz = hAt(x, z + e) - hAt(x, z - e);
      const slope = Math.sqrt(hx * hx + hz * hz) / (2 * e);
      // large-scale curvature (hollows > 0) from a 40 m ring
      const ring = (hAt(x + 40, z) + hAt(x - 40, z) + hAt(x, z + 40) + hAt(x, z - 40)) * 0.25;
      const hollow = clamp((ring - h) / 6, -1, 1);
      const northFacing = clamp(-hz / (2 * e) * 6, 0, 1);           // -Z is north: slopes falling toward -Z
      const low = smoothstep(2.4, 6.5, h);                          // above the beach / shore
      const plains = low * (1 - smoothstep(0.10, 0.22, slope)) * (1 - smoothstep(60, 140, h));
      let riverD = 1e9;
      if (gen.river) {
        const ix = clamp(Math.round((x + half) / cell), 0, res - 1);
        if (Math.abs(z - gen.river.zAt[ix]) < 200) riverD = gen.river.distance(x, z, ix);   // cheap reject far from the river
      }
      const flowV = flow ? flow[clamp(Math.round((z + half) / cell), 0, res - 1) * res + clamp(Math.round((x + half) / cell), 0, res - 1)] : 0;

      // ---- fields: Worley patchwork with a per-cell dryness, softened edges, and dirt tracks on the boundaries
      worley(x, z, 101, w);
      const cellDry = hash2(w.idx, w.idz, 7);
      const cellKind = hash2(w.idx, w.idz, 9);                       // < 0.45 meadow (no fence line), else pasture/crop
      const edge = w.f2 - w.f1;                                      // metres to the cell boundary (approx)
      const regional = 0.5 + 0.5 * nB.fbm(x / 520 + 3, z / 520 - 1, 3, 2.0, 0.5);
      let dry = regional * 0.38 + (cellDry - 0.5) * 0.75 * plains + 0.22 * (0.5 + 0.5 * nB.fbm(x / 95, z / 95, 3)) - 0.06;
      dry += smoothstep(80, 220, h) * 0.5;                            // straw at altitude
      dry -= 0.15 * smoothstep(420, 150, Math.hypot(x, z));           // the city centre plain is a little greener
      dry += smoothstep(0.08, 0.2, slope) * 0.2;                      // thin dry grass on slopes
      dry = clamp(dry, 0, 1);

      // ---- lush / forest floor: hollows, floodplain, north slopes, and blobby forest patches
      const forestBlob = smoothstep(0.52, 0.72, 0.5 + 0.5 * nC.fbm(x / 150 + 8, z / 150 + 2, 4, 2.1, 0.5) + 0.12 * nC.fbm(x / 35, z / 35, 2));
      let lush = 0.55 * Math.max(0, hollow) + 0.35 * northFacing * smoothstep(0.03, 0.12, slope)
        + 0.7 * forestBlob + 0.4 * smoothstep(140, 40, riverD) * low;
      lush *= low * (1 - smoothstep(120, 220, h));
      lush = clamp(lush * (1 - dry * 0.5), 0, 1);

      // ---- dirt: bare patches, worn tracks along field boundaries and ridge lines of a noise field, deposits
      const patchN = 0.5 + 0.5 * nA.fbm(x / 80 + 1, z / 80 + 5, 4, 2.0, 0.5) + 0.15 * nA.fbm(x / 18, z / 18, 2);
      let dirt = smoothstep(0.70, 0.81, patchN) * 0.75 * plains;
      const trackN = 1 - Math.abs(nE.fbm(x / 260 + 2, z / 260 + 4, 2, 2.0, 0.5));
      const track = smoothstep(0.955, 0.985, trackN) * plains * (1 - smoothstep(0.06, 0.12, slope));
      const fence = (cellKind > 0.45 ? 1 : 0) * (1 - smoothstep(1.5, 5.0, edge)) * plains * 0.8;
      dirt = Math.max(dirt, track * 0.85, fence * (0.5 + 0.5 * cellKind));
      dirt = Math.max(dirt, smoothstep(0.25, 0.8, flowV) * 0.6);
      // bare ground where the forest floor is deepest (leaf litter) and on cattle-trodden field corners
      dirt = Math.max(dirt, smoothstep(0.75, 1.0, lush) * 0.35 * (0.5 + 0.5 * nA.fbm(x / 30, z / 30, 2)));
      dirt = clamp(dirt, 0, 1);

      // ---- fine variation (8..25 m) breaks tiling and gives the 1-20 m grain CS2 has
      const fine = clamp(0.5 + 0.5 * (0.6 * nD.fbm(x / 22, z / 22, 3, 2.0, 0.5) + 0.4 * nD.fbm(x / 7 + 3, z / 7, 2)), 0, 1);

      const o = (ty * size + tx) * 4;
      data[o] = Math.round(dirt * 255);
      data[o + 1] = Math.round(dry * 255);
      data[o + 2] = Math.round(lush * 255);
      data[o + 3] = Math.round(fine * 255);
    }
  }
  return { data, size };
}
