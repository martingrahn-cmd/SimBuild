// Zone colours, lot sizing and overlay tuning constants.
// Colours are given as sRGB hex (CS2 overlay palette: green residential, blue commercial,
// orange industrial, purple office; the low density variant is lighter/pastel, high is saturated).
import * as THREE from 'three';

export const ZONE_TYPES = ['residential', 'commercial', 'industrial', 'office'];
export const DENSITIES = ['low', 'high'];

const HEX = {
  residential: { low: 0x5fd634, high: 0x0d8f3c },
  commercial: { low: 0x2fb6f5, high: 0x1140c9 },
  industrial: { low: 0xf7b515, high: 0xd05310 },
  office: { low: 0xc65ff5, high: 0x6a1cb8 },
};

/** Linear-space colours ready for a shader uniform. */
export function zoneColors() {
  const out = {};
  for (const t of ZONE_TYPES) {
    out[t] = {
      low: new THREE.Color().setHex(HEX[t].low, THREE.SRGBColorSpace),
      high: new THREE.Color().setHex(HEX[t].high, THREE.SRGBColorSpace),
    };
  }
  return out;
}

/** Bright outline tint used for lot borders. */
export function lotColor(type, density) {
  const c = new THREE.Color().setHex(HEX[type][density], THREE.SRGBColorSpace);
  return c.lerp(new THREE.Color(1, 1, 1), 0.46);
}

/** Preferred lot width in 8 m cells, per zone type and density. */
export const LOT_SLOTS = {
  residential: { low: 2, high: 3 },
  commercial: { low: 2, high: 3 },
  industrial: { low: 3, high: 4 },
  office: { low: 3, high: 4 },
};

/** Preferred lot depth in cells (clamped to what the zoned band actually offers). */
// Preferred lot depth in cells. Kept at 3 for most zones so that on an 80 m block the two opposite
// frontages (3+3 cells = 48 m of the 64 m interior) leave a band for the perpendicular streets' lots.
export const LOT_DEPTH = {
  residential: { low: 3, high: 3 },
  commercial: { low: 3, high: 3 },
  industrial: { low: 4, high: 4 },
  office: { low: 3, high: 4 },
};

export const MIN_DEPTH = 2;
export const MAX_DEPTH = 4;
