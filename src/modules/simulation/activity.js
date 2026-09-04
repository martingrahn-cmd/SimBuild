// Day/night activity curves as pure functions of the solar hour (0..24). All return 0..1.
// Used by traffic (commute), buildings (window lights per zone) and props (street lights).
const g = (h, c, w) => { let d = Math.abs(h - c); if (d > 12) d = 24 - d; return Math.exp(-(d * d) / (2 * w * w)); };
const wrap = (h) => ((h % 24) + 24) % 24;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Commute intensity: morning and evening rush peaks, small midday plateau, near-silent at 03:00. */
export function commute(hour) {
  const h = wrap(hour);
  const v = 0.95 * g(h, 8.1, 1.05) + 0.85 * g(h, 17.4, 1.35) + 0.22 * g(h, 12.5, 2.2) + 0.05 * g(h, 22, 1.8);
  const base = 0.025 + 0.075 * smooth(5.5, 7.5, h) * (1 - smooth(20, 23.5, h));
  return clamp01(v + base);
}
/** Vehicles on the road relative to peak (commute + shopping/leisure + freight). */
export function traffic(hour) {
  const h = wrap(hour);
  const leisure = 0.34 * smooth(10, 12, h) * (1 - smooth(19, 21.5, h));
  const night = 0.06 * g(h, 23.5, 1.5);
  return clamp01(commute(h) * 0.9 + leisure + night + 0.03);
}
/** Fraction of residential windows lit. */
export function residentialLights(hour) {
  const h = wrap(hour);
  const evening = 0.88 * smooth(16.5, 19, h) * (1 - smooth(22.5, 24.5, h));
  const morning = 0.55 * smooth(5.2, 6.5, h) * (1 - smooth(7.5, 9, h));
  const late = 0.18 * (1 - smooth(23, 26, h < 12 ? h + 24 : h)) * (h > 22 || h < 3 ? 1 : 0);
  const night = 0.09;
  return clamp01(Math.max(evening, morning, late, night) - 0.05 * smooth(9, 11, h) * (1 - smooth(15, 17, h)));
}
/** Fraction of commercial (shops, restaurants, signage) windows lit. */
export function commercialLights(hour) {
  const h = wrap(hour);
  const open = 0.9 * smooth(8, 9.5, h) * (1 - smooth(21.5, 23.5, h));
  const signage = 0.35 * smooth(16, 18, h) + 0.35 * (1 - smooth(4, 7, h));
  return clamp01(Math.max(open, signage, 0.12));
}
/** Fraction of office windows lit. */
export function officeLights(hour) {
  const h = wrap(hour);
  const work = 0.92 * smooth(7, 8.5, h) * (1 - smooth(17.5, 19.5, h));
  const late = 0.3 * smooth(17, 18.5, h) * (1 - smooth(21.5, 23.5, h));
  return clamp01(Math.max(work, late, 0.08));
}
/** Fraction of industrial lights (shift work, floodlights). */
export function industrialLights(hour) {
  const h = wrap(hour);
  return clamp01(0.55 + 0.3 * smooth(6, 7.5, h) * (1 - smooth(18, 20, h)));
}
/** Street lights: on from dusk to dawn with short ramps. */
export function streetLights(hour) {
  const h = wrap(hour);
  return clamp01(Math.max(smooth(17.6, 18.8, h), 1 - smooth(5.6, 6.8, h)));
}
/** Share of the population awake. */
export function awake(hour) {
  const h = wrap(hour);
  return clamp01(0.06 + 0.94 * smooth(5.5, 8, h) * (1 - smooth(22, 25, h < 6 ? h + 24 : h)));
}
/** Pedestrians on the street relative to peak. */
export function pedestrians(hour) {
  const h = wrap(hour);
  return clamp01(0.55 * commute(h) + 0.5 * smooth(10, 12, h) * (1 - smooth(19.5, 22.5, h)) + 0.04);
}

/** Fill `out` with every curve at `hour` (no allocation when out is passed). */
export function profile(hour, out = {}) {
  out.hour = wrap(hour);
  out.commute = commute(hour); out.traffic = traffic(hour); out.pedestrians = pedestrians(hour); out.awake = awake(hour);
  out.residential = residentialLights(hour); out.commercial = commercialLights(hour); out.office = officeLights(hour);
  out.industrial = industrialLights(hour); out.streetLights = streetLights(hour);
  return out;
}
