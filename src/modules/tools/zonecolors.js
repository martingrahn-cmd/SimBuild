// The zone-brush preview must fill cells in the *same* colours as the zoning overlay
// (module spec §4 item 10). The eight hexes are a cross-module contract declared in
// src/modules/zoning/palette.js — import them rather than copying, so "equals the palette value
// exactly" is true by construction and can never drift in the last bit.
import { HEX } from '../zoning/palette.js';

export const ZONE_HEX = HEX;

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function linearTriple(hex) {
  return [
    toLinear(((hex >> 16) & 255) / 255),
    toLinear(((hex >> 8) & 255) / 255),
    toLinear((hex & 255) / 255),
  ];
}

/** Same eight colours, converted to linear for a toneMapped:false overlay material. */
export const ZONE_RGB_LINEAR = {};
for (const [type, byDensity] of Object.entries(HEX)) {
  ZONE_RGB_LINEAR[type] = {};
  for (const [density, hex] of Object.entries(byDensity)) ZONE_RGB_LINEAR[type][density] = linearTriple(hex);
}

export const ZONE_PREVIEW_ALPHA = 0.45;   // spec band 0.40–0.50
