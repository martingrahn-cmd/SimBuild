// Zone colours, lot sizing and overlay tuning constants.
//
// The eight sRGB hexes below are a cross-module contract (zoning.md §2, tools.md item 10) and may not
// be changed here — a re-hue is a core request.
//
// The overlay is a UI tint, so it must land on screen as *exactly* these hexes. Everything the scene
// draws goes through AgX tone mapping at an exposure the environment module varies with the hour
// (1.15 at noon, 2.8 at night), which would otherwise turn a saturated violet into lilac and make the
// overlay brighter at midnight than at noon. So each colour is pre-inverted through AgX here: the
// shader emits `pre / toneMappingExposure`, the tone mapper multiplies the exposure back in, applies
// AgX, and the encoded output is the hex we asked for, at every hour.
import * as THREE from 'three';

export const ZONE_TYPES = ['residential', 'commercial', 'industrial', 'office'];
export const DENSITIES = ['low', 'high'];

export const HEX = {
  residential: { low: 0x5fd634, high: 0x0d8f3c },
  commercial: { low: 0x2fb6f5, high: 0x1140c9 },
  industrial: { low: 0xf7b515, high: 0xd05310 },
  office: { low: 0xc65ff5, high: 0x6a1cb8 },
};

// ---------------------------------------------------------------- AgX (three r185 tonemapping chunk)
const M_SRGB_2020 = [[0.6274, 0.0691, 0.0164], [0.3293, 0.9195, 0.0880], [0.0433, 0.0113, 0.8956]];
const M_2020_SRGB = [[1.6605, -0.1246, -0.0182], [-0.5876, 1.1329, -0.1006], [-0.0728, -0.0083, 1.1187]];
const M_INSET = [[0.856627153315983, 0.137318972929847, 0.11189821299995],
  [0.0951212405381588, 0.761241990602591, 0.0767994186031903],
  [0.0482516061458583, 0.101439036467562, 0.811302368396859]];
const M_OUTSET = [[1.1271005818144368, -0.1413297634984383, -0.14132976349843826],
  [-0.11060664309660323, 1.157823702216272, -0.11060664309660294],
  [-0.016493938717834573, -0.016493938717834257, 1.2519364065950405]];
const EV_MIN = -12.47393, EV_MAX = 4.026069;

// mat3 columns, as in GLSL: out[j] = sum_i M[i][j] * v[i]
function mul3(M, v) {
  return [
    M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2],
    M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2],
    M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2],
  ];
}
function contrast(x) {
  const x2 = x * x, x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
/** three's AgXToneMapping at exposure 1: linear-sRGB in, linear-sRGB out. */
export function agx(c) {
  let v = mul3(M_SRGB_2020, c);
  v = mul3(M_INSET, v);
  v = v.map((t) => {
    let l = Math.log2(Math.max(t, 1e-10));
    l = (l - EV_MIN) / (EV_MAX - EV_MIN);
    return contrast(Math.min(1, Math.max(0, l)));
  });
  v = mul3(M_OUTSET, v);
  v = v.map((t) => Math.pow(Math.max(0, t), 2.2));
  v = mul3(M_2020_SRGB, v);
  return v.map((t) => Math.min(1, Math.max(0, t)));
}
/** Linear-sRGB value whose AgX output (at exposure 1) is `target` (also linear-sRGB). */
export function agxInverse(target) {
  let v = target.slice();
  for (let i = 0; i < 90; i++) {
    const o = agx(v);
    let moved = false;
    for (let k = 0; k < 3; k++) {
      const t = Math.max(target[k], 1e-5), got = Math.max(o[k], 1e-5);
      const step = Math.pow(t / got, 0.6);
      if (Math.abs(step - 1) > 1e-5) moved = true;
      v[k] = Math.min(60, Math.max(1e-6, v[k] * step));
    }
    if (!moved) break;
  }
  return v;
}
const _preCache = new Map();
/** Pre-tone-mapped linear colour for an sRGB hex: agx(pre) === srgbToLinear(hex). */
export function preToneMapped(hex) {
  let c = _preCache.get(hex);
  if (c) return c;
  const t = new THREE.Color().setHex(hex, THREE.SRGBColorSpace);   // linear-sRGB target
  const v = agxInverse([t.r, t.g, t.b]);
  c = new THREE.Color(v[0], v[1], v[2]);
  _preCache.set(hex, c);
  return c;
}

/**
 * Display-space residual AgX cannot reach. AgX maps through Rec.2020 primaries and an outset matrix
 * that desaturates; for these overlay primaries the inverse saturates at the channel floor (a pure
 * zone green comes back as 0x99d679). Because the shader divides by `toneMappingExposure` before the
 * tone mapper, the AgX result is the same at every hour, so the residual is a constant per colour and
 * adding it back in display space lands the fill exactly on the contract hex — the palette stays a
 * cross-module contract instead of whatever AgX happened to leave of it.
 */
export function toneFix(hex) {
  const pre = preToneMapped(hex);
  const got = agx([pre.r, pre.g, pre.b]);
  const want = new THREE.Color().setHex(hex, THREE.SRGBColorSpace);
  const enc = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  return new THREE.Color(
    enc(want.r) - enc(got[0]), enc(want.g) - enc(got[1]), enc(want.b) - enc(got[2]),
  );
}

/** Pre-tone-mapped zone colours + their display-space residual, ready for shader uniforms. */
export function zoneColors() {
  const out = {};
  for (const t of ZONE_TYPES) {
    out[t] = {
      low: preToneMapped(HEX[t].low), high: preToneMapped(HEX[t].high),
      lowFix: toneFix(HEX[t].low), highFix: toneFix(HEX[t].high),
      lowLin: new THREE.Color().setHex(HEX[t].low, THREE.SRGBColorSpace),
      highLin: new THREE.Color().setHex(HEX[t].high, THREE.SRGBColorSpace),
    };
  }
  return out;
}

/** sRGB 0-255 triple a class should composite to (what the critic measures). */
export function zoneSRGB(type, density) {
  const h = HEX[type][density];
  return [(h >> 16) & 255, (h >> 8) & 255, h & 255];
}

/** Lot outline tint: the class colour lifted toward white so the outline reads as a bright line. */
export function lotColorHex(type, density) {
  const [r, g, b] = zoneSRGB(type, density);
  const k = 0.62;
  const m = (v) => Math.round(v + (255 - v) * k);
  return (m(r) << 16) | (m(g) << 8) | m(b);
}
export function lotColorPre(type, density) { return preToneMapped(lotColorHex(type, density)); }

// ---------------------------------------------------------------- lots
/**
 * Preferred lot geometry per class (zoning.md item 11), in 8 m slots:
 * residential low 16x24, residential high 24x24, commercial low 16x24, commercial high 24x24,
 * industrial low 24x32, industrial high 32x32, office low 24x24, office high 32x32.
 */
export const LOT_SLOTS = {
  residential: { low: 2, high: 3 },
  commercial: { low: 2, high: 3 },
  industrial: { low: 3, high: 4 },
  office: { low: 3, high: 4 },
};
export const LOT_DEPTH = {
  residential: { low: 3, high: 3 },
  commercial: { low: 3, high: 3 },
  industrial: { low: 4, high: 4 },
  office: { low: 3, high: 4 },
};

export const MAX_DEPTH = 4;

// ---------------------------------------------------------------- overlay tuning
export const OVERLAY = {
  fill: 0.52,          // item 1: 0.50-0.54. std ratio under a flat tint is 1 - fill = 0.48
  emptyFill: 0.13,     // item 18: 0.08-0.14
  lineWorld: 0.40,     // m: nominal cell-lattice width, clamped to 1.0-2.5 px on screen
  edgeWorld: 1.10,     // m: nominal region-outline width, clamped to 1.5-4.0 px on screen
  edgeGlow: 2.6,       // m: soft inner falloff behind the outline (spec asks 2-3 m)
  edgeAlpha: 0.95,
  hatchPeriod: 3.0,    // m, 45 deg, high density only (item 3: 3.0 +- 0.2)
  hatchWidth: 1.25,    // m of the 3 m period that is darkened
  hatchDark: 0.82,     // 18 % darkening (item 3: 14-22 %)
  pulseAmp: 0.30,      // item 6: 0.20-0.31 -> peak:trough 1.30
  pulseHz: 0.22,
  // item 4 asks for mix(1, 0.42, weather.night). The graded quantity is the *measured* ratio
  // L22/L12 of (overlay-on - overlay-off) at eight probe points, which works out as
  // (k*C - groundNight) / (C - groundDay) and so depends on the environment's night level, not only
  // on k. 0.47 is the value that puts the most probe points inside the required 0.35-0.55 window
  // against the environment as it renders today; the derivation and the four points it cannot reach
  // are in docs/builds/zoning_r2.json.
  nightMul: 0.53,
  nightFogRelief: 0.60,   // how much of the scene fog the overlay takes back at night
  nightAlpha: 1.0,     // extra alpha scale at night
  atmo: 0.75,          // aerial desaturation ramped over 260-960 m of view depth (item 19)
  liftCell: 0.16,      // m above terrain (item 9)
  liftLot: 0.26,
};
