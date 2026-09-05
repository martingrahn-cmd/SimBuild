// Isometric SVG thumbnails for the asset cards (CS2 cards are small perspective renders on a dark card).
// Every tile is a 92×58 viewBox: a floor slab with two visible extruded faces, a soft ground shadow and
// the asset drawn on top. Pure SVG, deterministic, no GPU cost.
import { PALETTE as P } from './icons.js';

const W = 92, H = 58;
const CX = 46, CY = 27, SX = 40, SY = 13, HY = 15;      // projection: sx = CX + (x - z) * SX, sy = CY + (x + z) * SY - y * HY
const iso = (x, y, z) => [CX + (x - z) * SX, CY + (x + z) * SY - y * HY];
const pts = (list) => list.map(([x, y, z]) => iso(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');
const poly = (list, fill, extra = '') => `<polygon points="${pts(list)}" fill="${fill}" ${extra}/>`;
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k)), g = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};
/** extruded box from (x0,z0) to (x1,z1), base at y0, height h */
const box = (x0, x1, z0, z1, h, col, y0 = 0, extra = '') => {
  const top = poly([[x0, y0 + h, z0], [x1, y0 + h, z0], [x1, y0 + h, z1], [x0, y0 + h, z1]], col, extra);
  const right = poly([[x1, y0, z0], [x1, y0, z1], [x1, y0 + h, z1], [x1, y0 + h, z0]], shade(col, 0.62), extra);
  const left = poly([[x0, y0, z1], [x1, y0, z1], [x1, y0 + h, z1], [x0, y0 + h, z1]], shade(col, 0.8), extra);
  return left + right + top;
};
const shadow = () => `<ellipse cx="${CX + 1}" cy="${CY + SY * 2 - 1}" rx="42" ry="8" fill="#000" opacity=".4"/>`;
const wrap = (inner) => `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
const GRASS = '#5f8a44', GRASS_D = '#4b6f37', SIDEWALK = '#b9b6ae', KERB = '#8d8a83';
const slab = (col = GRASS) => shadow() + box(-1, 1, -1, 1, 0.08, col);

// ------------------------------------------------------------------ roads
/** Road slab along x: asphalt with lane paint, kerbs and sidewalks (or gravel / highway barriers). */
export function roadTile({ lanes = 2, median = false, sidewalk = true, gravel = false, barrier = false, oneWay = false } = {}) {
  const half = Math.min(0.92, 0.22 + lanes * 0.11);
  const y = 0.08, top = y + 0.01;
  let s = slab();
  const asphalt = gravel ? '#9a8b6d' : '#4c5057';
  if (sidewalk) {
    s += box(-1, 1, -half - 0.22, -half, 0.05, SIDEWALK, y) + box(-1, 1, half, half + 0.22, 0.05, SIDEWALK, y);
    s += poly([[-1, top + 0.05, -half - 0.02], [1, top + 0.05, -half - 0.02], [1, top + 0.05, -half], [-1, top + 0.05, -half]], KERB);
  }
  s += poly([[-1, top, -half], [1, top, -half], [1, top, half], [-1, top, half]], asphalt);
  if (gravel) for (let i = 0; i < 14; i++) { const x = -0.9 + (i * 0.137) % 1.8, z = -half + 0.1 + ((i * 0.61) % 1) * (half * 2 - 0.2); s += poly([[x, top, z], [x + 0.08, top, z], [x + 0.08, top, z + 0.06], [x, top, z + 0.06]], i % 3 ? '#b3a58a' : '#7d7057'); }
  else {
    const laneW = (half * 2) / lanes;
    for (let i = 1; i < lanes; i++) {
      const z = -half + laneW * i;
      if (median && i === lanes / 2) s += poly([[-1, top + 0.01, z - 0.045], [1, top + 0.01, z - 0.045], [1, top + 0.01, z + 0.045], [-1, top + 0.01, z + 0.045]], P.yellow);
      else for (let d = -0.95; d < 1; d += 0.28) s += poly([[d, top + 0.01, z - 0.012], [d + 0.14, top + 0.01, z - 0.012], [d + 0.14, top + 0.01, z + 0.012], [d, top + 0.01, z + 0.012]], lanes === 2 && i === 1 ? P.yellow : '#e8e6df');
    }
    s += poly([[-1, top + 0.01, -half + 0.035], [1, top + 0.01, -half + 0.035], [1, top + 0.01, -half + 0.06], [-1, top + 0.01, -half + 0.06]], '#d9d7cf')
      + poly([[-1, top + 0.01, half - 0.06], [1, top + 0.01, half - 0.06], [1, top + 0.01, half - 0.035], [-1, top + 0.01, half - 0.035]], '#d9d7cf');
    if (oneWay) s += poly([[0.1, top + 0.02, -0.02], [0.35, top + 0.02, -0.02], [0.35, top + 0.02, -0.12], [0.55, top + 0.02, 0.0], [0.35, top + 0.02, 0.12], [0.35, top + 0.02, 0.02], [0.1, top + 0.02, 0.02]], '#f2f0ea');
  }
  if (barrier) s += box(-1, 1, -half - 0.08, -half, 0.14, '#9ea3ab', y) + box(-1, 1, half, half + 0.08, 0.14, '#9ea3ab', y);
  return wrap(s);
}
/** crossing / roundabout tiles for the intersections tab */
export function junctionTile(kind = 'cross') {
  const y = 0.08, top = y + 0.01, half = 0.42;
  let s = slab();
  const road = (alongX) => alongX ? poly([[-1, top, -half], [1, top, -half], [1, top, half], [-1, top, half]], '#4c5057') : poly([[-half, top, -1], [half, top, -1], [half, top, 1], [-half, top, 1]], '#4c5057');
  s += road(true) + road(false);
  if (kind === 'roundabout') { s += `<ellipse cx="${CX}" cy="${CY - 3}" rx="16" ry="8" fill="${GRASS_D}"/><ellipse cx="${CX}" cy="${CY - 4}" rx="11" ry="5.5" fill="${GRASS}"/>`; }
  else {
    for (const sgn of [-1, 1]) for (let i = 0; i < 4; i++) { const z = -0.32 + i * 0.2; s += poly([[sgn * 0.5, top + 0.01, z], [sgn * 0.62, top + 0.01, z], [sgn * 0.62, top + 0.01, z + 0.1], [sgn * 0.5, top + 0.01, z + 0.1]], '#e8e6df'); s += poly([[z, top + 0.01, sgn * 0.5], [z + 0.1, top + 0.01, sgn * 0.5], [z + 0.1, top + 0.01, sgn * 0.62], [z, top + 0.01, sgn * 0.62]], '#e8e6df'); }
    if (kind === 'lights') s += box(0.5, 0.56, 0.5, 0.56, 0.7, '#3a3f47', y) + `<circle cx="${iso(0.53, 0.75, 0.53)[0]}" cy="${iso(0.53, 0.75, 0.53)[1]}" r="2.2" fill="${P.red}"/>`;
  }
  return wrap(s);
}

// ------------------------------------------------------------------ zones
export function zoneTile(col, density = 'low') {
  let s = shadow() + box(-1, 1, -1, 1, 0.08, shade(col, 0.55));
  s += poly([[-1, 0.085, -1], [1, 0.085, -1], [1, 0.085, 1], [-1, 0.085, 1]], col, 'opacity=".9"');
  for (let i = -0.6; i < 1; i += 0.4) s += `<polyline points="${pts([[i, 0.09, -1], [i, 0.09, 1]])}" stroke="#fff" stroke-opacity=".25" stroke-width=".8" fill="none"/><polyline points="${pts([[-1, 0.09, i], [1, 0.09, i]])}" stroke="#fff" stroke-opacity=".25" stroke-width=".8" fill="none"/>`;
  const bl = density === 'high' ? [[-0.7, -0.1, -0.7, -0.1, 1.15], [0.1, 0.75, -0.75, -0.15, 0.85], [-0.75, -0.2, 0.1, 0.7, 0.7], [0.05, 0.7, 0.05, 0.7, 1.4]]
    : [[-0.7, -0.2, -0.7, -0.25, 0.28], [0.15, 0.7, -0.7, -0.2, 0.22], [-0.7, -0.15, 0.15, 0.7, 0.24], [0.2, 0.7, 0.2, 0.7, 0.3]];
  const bcol = density === 'high' ? '#c9ccd2' : '#e2d9c9';
  for (const [x0, x1, z0, z1, h] of bl) {
    s += box(x0, x1, z0, z1, h, bcol, 0.09);
    if (density === 'high') for (let yy = 0.25; yy < h - 0.1; yy += 0.28) s += poly([[x1 + 0.001, yy + 0.09, z0 + 0.08], [x1 + 0.001, yy + 0.09, z1 - 0.08], [x1 + 0.001, yy + 0.22, z1 - 0.08], [x1 + 0.001, yy + 0.22, z0 + 0.08]], '#39434f');
    else s += poly([[x0, h + 0.09, z0], [x1, h + 0.09, z0], [(x0 + x1) / 2, h + 0.32, (z0 + z1) / 2]], shade('#a8523a', 0.85)) + poly([[x0, h + 0.09, z1], [x1, h + 0.09, z1], [(x0 + x1) / 2, h + 0.32, (z0 + z1) / 2]], '#b95a3f') + poly([[x1, h + 0.09, z0], [x1, h + 0.09, z1], [(x0 + x1) / 2, h + 0.32, (z0 + z1) / 2]], shade('#b95a3f', 0.7));
  }
  return wrap(s);
}

// ------------------------------------------------------------------ props (upright sprite on a slab)
const SPRITES = {
  tree_oak: `<rect x="-2" y="-14" width="4" height="14" fill="${P.brown}"/><circle cx="0" cy="-22" r="11" fill="#4c8c3a"/><circle cx="-4" cy="-26" r="6" fill="#6aa84f" opacity=".7"/><circle cx="5" cy="-18" r="5" fill="#3c7330" opacity=".7"/>`,
  tree_pine: `<rect x="-1.8" y="-10" width="3.6" height="10" fill="${P.brown}"/><path d="M0 -36 L11 -20 h-5 l7 11 H-13 l7 -11 h-5 z" fill="#2f6b3c"/><path d="M0 -36 L11 -20 h-5 l7 11 H0 z" fill="#255a31"/>`,
  streetlamp: `<rect x="-1.2" y="-30" width="2.4" height="30" fill="${P.greyD}"/><path d="M-1 -30 h9 v2.5 h-9 z" fill="${P.greyD}"/><rect x="4" y="-29" width="7" height="3" rx="1.5" fill="${P.yellow}"/><rect x="-4" y="-1" width="8" height="2" rx="1" fill="${P.greyD}"/>`,
  bench: `<rect x="-14" y="-12" width="28" height="4" rx="1" fill="${P.brown}"/><rect x="-14" y="-6" width="28" height="3.5" rx="1" fill="${P.brown}"/><rect x="-11" y="-8" width="2.4" height="8" fill="${P.greyD}"/><rect x="8.6" y="-8" width="2.4" height="8" fill="${P.greyD}"/>`,
  bin: `<rect x="-6" y="-16" width="12" height="16" rx="1.5" fill="${P.greenD}"/><rect x="-7.5" y="-18.5" width="15" height="3.5" rx="1.2" fill="${P.green}"/><rect x="-3" y="-13" width="1.5" height="10" fill="${P.green}" opacity=".6"/><rect x="1.5" y="-13" width="1.5" height="10" fill="${P.green}" opacity=".6"/>`,
  sign: `<rect x="-1.2" y="-18" width="2.4" height="18" fill="${P.greyD}"/><rect x="-8" y="-30" width="16" height="12" rx="1.5" fill="${P.blue}"/><path d="M-4 -24 h8 m-3 -3 l3 3 -3 3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  bus_stop: `<rect x="-14" y="-24" width="28" height="3" rx="1" fill="${P.greyL}"/><rect x="-12" y="-21" width="2" height="21" fill="${P.greyD}"/><rect x="10" y="-21" width="2" height="21" fill="${P.greyD}"/><rect x="-10" y="-21" width="20" height="12" fill="${P.blueL}" opacity=".45"/><rect x="-9" y="-27" width="9" height="4.5" rx="1" fill="${P.green}"/>`,
  hydrant: `<rect x="-4" y="-16" width="8" height="16" rx="2.5" fill="${P.red}"/><rect x="-2.5" y="-20" width="5" height="5" rx="1.5" fill="${P.red}"/><rect x="-7.5" y="-12" width="15" height="3" rx="1.5" fill="${P.redD}"/><rect x="-5.5" y="-1" width="11" height="2" rx="1" fill="${P.redD}"/>`,
  fence: `<g fill="${P.brown}"><rect x="-16" y="-14" width="3" height="14"/><rect x="-7" y="-14" width="3" height="14"/><rect x="2" y="-14" width="3" height="14"/><rect x="11" y="-14" width="3" height="14"/><rect x="-17" y="-11" width="32" height="2.2"/><rect x="-17" y="-5" width="32" height="2.2"/></g>`,
  bush: `<ellipse cx="0" cy="-6" rx="12" ry="7" fill="#3f7a33"/><ellipse cx="-4" cy="-9" rx="7" ry="5" fill="#5b9a45" opacity=".8"/><ellipse cx="5" cy="-7" rx="6" ry="4.5" fill="#33642a" opacity=".8"/>`,
  planter: `<path d="M-9 -8 h18 l-2 8 h-14 z" fill="#8a6a4a"/><rect x="-10" y="-10" width="20" height="2.5" fill="#a07c57"/><ellipse cx="0" cy="-13" rx="9" ry="4.5" fill="#4f8c3b"/><circle cx="-4" cy="-14" r="1.6" fill="${P.red}"/><circle cx="3" cy="-15" r="1.6" fill="${P.yellow}"/>`,
  trafficlight: `<rect x="-1.2" y="-30" width="2.4" height="30" fill="${P.greyD}"/><rect x="-3.5" y="-32" width="7" height="14" rx="1.5" fill="#2b3037"/><circle cx="0" cy="-28.5" r="1.7" fill="${P.red}"/><circle cx="0" cy="-25" r="1.7" fill="${P.yellow}"/><circle cx="0" cy="-21.5" r="1.7" fill="${P.green}"/>`,
};
export function propTile(kind) {
  const spr = SPRITES[kind] || SPRITES.tree_oak;
  const [x, y] = iso(0, 0.09, 0);
  return wrap(slab() + `<ellipse cx="${x + 4}" cy="${y + 1}" rx="14" ry="4" fill="#000" opacity=".3"/><g transform="translate(${x} ${y}) scale(1.25)">${spr}</g>`);
}

// ------------------------------------------------------------------ services (building block + roof detail)
const SVC = {
  power_coal:  { col: '#7d848c', h: 0.7, extra: () => box(-0.55, -0.35, -0.55, -0.35, 1.9, '#9aa1a8', 0.09) + box(-0.15, 0.05, -0.55, -0.35, 1.7, '#9aa1a8', 0.09) + `<ellipse cx="${iso(-0.45, 2.15, -0.45)[0]}" cy="${iso(-0.45, 2.15, -0.45)[1]}" rx="7" ry="4" fill="#eee" opacity=".6"/>` },
  power_wind:  { col: '#e6e9ec', h: 0.05, extra: () => { const [x, y] = iso(0, 0.1, 0); return `<rect x="${x - 1.3}" y="${y - 34}" width="2.6" height="34" fill="#d8dce0"/><g transform="translate(${x} ${y - 34})"><path d="M0 0 L2 -15 L-2 -15 z M0 0 L13 7 L11 10 z M0 0 L-13 7 L-11 10 z" fill="#f4f6f8"/><circle r="2.2" fill="#c8cdd3"/></g>`; } },
  power_solar: { col: '#25415e', h: 0.12, extra: () => { let s = ''; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) s += poly([[-0.9 + i * 0.6, 0.35, -0.8 + j * 0.85], [-0.4 + i * 0.6, 0.35, -0.8 + j * 0.85], [-0.4 + i * 0.6, 0.15, -0.15 + j * 0.85], [-0.9 + i * 0.6, 0.15, -0.15 + j * 0.85]], '#2b6cb0') + poly([[-0.9 + i * 0.6, 0.36, -0.8 + j * 0.85], [-0.4 + i * 0.6, 0.36, -0.8 + j * 0.85], [-0.4 + i * 0.6, 0.16, -0.15 + j * 0.85], [-0.9 + i * 0.6, 0.16, -0.15 + j * 0.85]], 'url(#sbSolar)'); return `<defs><linearGradient id="sbSolar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fd3ff" stop-opacity=".5"/><stop offset="1" stop-color="#1c3f6e" stop-opacity="0"/></linearGradient></defs>` + s; } },
  water_pump:  { col: '#4f7ea8', h: 0.5, extra: () => box(0.15, 0.7, 0.15, 0.7, 1.1, '#5f8fb8', 0.09) + `<ellipse cx="${iso(0.42, 1.2, 0.42)[0]}" cy="${iso(0.42, 1.2, 0.42)[1]}" rx="12" ry="6" fill="#7cb0dc"/><ellipse cx="${iso(0.42, 1.2, 0.42)[0]}" cy="${iso(0.42, 1.2, 0.42)[1] - 1}" rx="9" ry="4.5" fill="#a9d1f0"/>` },
  sewage:      { col: '#6c7a6b', h: 0.35, extra: () => `<path d="M${iso(0.6, 0.45, 0.6)[0]} ${iso(0.6, 0.45, 0.6)[1]} q6 4 8 12" stroke="#7a8a95" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${iso(0.6, 0.45, 0.6)[0] + 8} ${iso(0.6, 0.45, 0.6)[1] + 12} q1 4 -1 6 q4 -1 6 2" stroke="#4d8fc9" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },
  landfill:    { col: '#8a7d63', h: 0.05, extra: () => `<ellipse cx="${CX}" cy="${CY + 8}" rx="24" ry="11" fill="#7a6b4f"/><ellipse cx="${CX - 4}" cy="${CY + 4}" rx="16" ry="8" fill="#8f7d5c"/><g fill="#5f5340"><rect x="30" y="16" width="5" height="4"/><rect x="48" y="10" width="6" height="4"/><rect x="40" y="22" width="4" height="4"/><rect x="56" y="19" width="5" height="3"/></g>` },
  incinerator: { col: '#8a8f96', h: 0.75, extra: () => box(0.3, 0.55, -0.55, -0.3, 1.9, '#aab0b7', 0.09) + `<path d="M${iso(0.42, 2.0, -0.42)[0]} ${iso(0.42, 2.0, -0.42)[1]} c-4 -6 2 -9 1 -14 c4 4 6 9 3 14 z" fill="${P.orange}"/>` },
  clinic:      { col: '#e9ecef', h: 0.55, extra: () => { const [x, y] = iso(1.0, 0.4, 0.3); return `<rect x="${x - 3}" y="${y - 9}" width="6" height="18" fill="${P.red}"/><rect x="${x - 9}" y="${y - 3}" width="18" height="6" fill="${P.red}"/>`; } },
  hospital:    { col: '#e9ecef', h: 1.3, extra: () => { const [x, y] = iso(1.0, 0.9, 0.2); return box(-0.6, 0.2, -0.6, 0.2, 2.1, '#f2f4f6', 0.09) + `<rect x="${x - 3}" y="${y - 10}" width="6" height="20" fill="${P.red}"/><rect x="${x - 10}" y="${y - 3}" width="20" height="6" fill="${P.red}"/>`; } },
  school:      { col: '#d9b27d', h: 0.45, extra: () => box(-0.9, -0.1, -0.9, 0.9, 0.7, '#e2c397', 0.09) + `<rect x="${iso(0.3, 0.09, 0.5)[0] - 6}" y="${iso(0.3, 0.09, 0.5)[1] - 4}" width="12" height="7" rx="1" fill="#4a7f3d" opacity=".8"/>` },
  high_school: { col: '#c9a06e', h: 0.7, extra: () => box(-0.9, 0.2, -0.9, -0.2, 1.1, '#d8b283', 0.09) + `<rect x="${iso(0.5, 0.09, 0.5)[0] - 8}" y="${iso(0.5, 0.09, 0.5)[1] - 5}" width="16" height="9" rx="1" fill="#a75d3e" opacity=".8"/>` },
  university:  { col: '#cfc8b8', h: 0.9, extra: () => box(-0.7, 0.7, -0.7, -0.1, 1.5, '#e0dacb', 0.09) + `<ellipse cx="${iso(0, 1.62, -0.4)[0]}" cy="${iso(0, 1.62, -0.4)[1]}" rx="10" ry="5" fill="#7c9a6e"/><ellipse cx="${iso(0, 1.7, -0.4)[0]}" cy="${iso(0, 1.7, -0.4)[1]}" rx="7" ry="3.5" fill="#94b285"/>` },
  police:      { col: '#3c5f8a', h: 0.8, extra: () => { const [x, y] = iso(1.0, 0.45, 0.2); return `<path d="M${x} ${y - 8} l6 2.5 v5 c0 4 -3 7 -6 8.5 c-3 -1.5 -6 -4.5 -6 -8.5 v-5 z" fill="${P.yellow}"/>`; } },
  fire:        { col: '#b6413d', h: 0.7, extra: () => box(0.4, 0.75, 0.4, 0.75, 1.7, '#c9524d', 0.09) + `<rect x="${iso(1.0, 0.35, -0.3)[0] - 6}" y="${iso(1.0, 0.35, -0.3)[1] - 7}" width="12" height="13" rx="1" fill="#7a2c2a"/><rect x="${iso(1.0, 0.35, 0.3)[0] - 6}" y="${iso(1.0, 0.35, 0.3)[1] - 7}" width="12" height="13" rx="1" fill="#7a2c2a"/>` },
  park_small:  { col: GRASS, h: 0.03, extra: () => { let s = `<path d="M${iso(-1, 0.12, 0.05)[0]} ${iso(-1, 0.12, 0.05)[1]} L${iso(1, 0.12, -0.05)[0]} ${iso(1, 0.12, -0.05)[1]}" stroke="#cdbf9c" stroke-width="4"/>`; for (const [x, z, r] of [[-0.5, -0.5, 1], [0.4, 0.5, 0.85], [0.5, -0.4, 0.7]]) { const [px, py] = iso(x, 0.1, z); s += `<g transform="translate(${px} ${py}) scale(${r * 0.9})">${SPRITES.tree_oak}</g>`; } return s; } },
  park_large:  { col: GRASS, h: 0.03, extra: () => { let s = `<ellipse cx="${CX + 6}" cy="${CY + 14}" rx="15" ry="7" fill="#4c86b8"/><ellipse cx="${CX + 6}" cy="${CY + 13}" rx="12" ry="5" fill="#6aa4d2"/>`; for (const [x, z, r] of [[-0.7, -0.5, 0.9], [-0.2, -0.8, 0.75], [0.6, -0.6, 0.8], [-0.7, 0.4, 0.85], [0.1, 0.1, 0.6]]) { const [px, py] = iso(x, 0.1, z); s += `<g transform="translate(${px} ${py}) scale(${r * 0.9})">${SPRITES.tree_oak}</g>`; } return s; } },
  plaza:       { col: '#bdb6a8', h: 0.05, extra: () => `<ellipse cx="${CX}" cy="${CY + 10}" rx="17" ry="8" fill="#8f877a"/><ellipse cx="${CX}" cy="${CY + 9}" rx="13" ry="6" fill="#5a9ccc"/><ellipse cx="${CX}" cy="${CY + 7}" rx="5" ry="2.5" fill="#a9a196"/><path d="M${CX} ${CY + 6} v-10" stroke="#bfe0ff" stroke-width="2.5" stroke-linecap="round"/><path d="M${CX - 4} ${CY - 2} q4 -8 8 0" stroke="#bfe0ff" stroke-width="1.6" fill="none"/>` },
};
export function serviceTile(kind) {
  const d = SVC[kind] || { col: '#9aa1a8', h: 0.6, extra: () => '' };
  let s = slab();
  let b = d.h > 0.06 ? box(-0.85, 0.85, -0.85, 0.85, d.h, d.col, 0.09) : '';
  b += d.extra();
  s += `<g transform="translate(${CX} ${CY + 2}) scale(.72) translate(${-CX} ${-CY - 2})">${b}</g>`;
  return wrap(s);
}

// ------------------------------------------------------------------ terrain / bulldoze / info views
export function terrainTile(mode) {
  let s = slab();
  const [x, y] = iso(0, 0.1, 0);
  if (mode === 'raise') s += `<ellipse cx="${x}" cy="${y}" rx="24" ry="12" fill="${GRASS_D}"/><ellipse cx="${x - 2}" cy="${y - 5}" rx="16" ry="8" fill="#7aa35a"/><ellipse cx="${x - 3}" cy="${y - 9}" rx="9" ry="4.5" fill="#8fb56c"/>`;
  else if (mode === 'lower') s += `<ellipse cx="${x}" cy="${y}" rx="24" ry="12" fill="${GRASS_D}"/><ellipse cx="${x + 2}" cy="${y + 2}" rx="16" ry="8" fill="#3d5a30"/><ellipse cx="${x + 3}" cy="${y + 3}" rx="8" ry="4" fill="#2f4726"/>`;
  else if (mode === 'flatten') s += `<ellipse cx="${x}" cy="${y}" rx="24" ry="12" fill="#6f9a52"/><path d="M${x - 24} ${y} h48" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 2" opacity=".7"/>`;
  else s += `<path d="M${x - 26} ${y + 4} q10 -14 20 -2 t22 -6" stroke="${GRASS_D}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M${x - 26} ${y + 4} q10 -14 20 -2 t22 -6" stroke="#7aa35a" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  const a = { raise: 'M0 -20 v14 M-5 -15 l5 -5 5 5', lower: 'M0 -20 v14 M-5 -11 l5 5 5 -5', flatten: 'M-9 -18 h18', smooth: 'M-10 -18 q5 -6 10 0 t10 0' }[mode];
  s += `<path d="${a}" transform="translate(${x} ${y - 4})" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return wrap(s);
}
export function bulldozeTile() {
  let s = slab('#7a6f5c');
  s += box(-0.6, -0.2, -0.5, -0.1, 0.25, '#a59a86', 0.09) + box(0.1, 0.5, 0.2, 0.6, 0.18, '#8e8371', 0.09) + box(-0.3, 0.1, 0.1, 0.5, 0.32, '#b1a692', 0.09);
  const [x, y] = iso(0.55, 0.1, -0.5);
  s += `<g transform="translate(${x - 12} ${y - 20}) scale(.8)"><rect x="2" y="15" width="18" height="7" rx="3.5" fill="#2c3440"/><circle cx="6" cy="18.5" r="2" fill="#8f99a8"/><circle cx="11" cy="18.5" r="2" fill="#8f99a8"/><circle cx="16" cy="18.5" r="2" fill="#8f99a8"/><path d="M4 14 V8 a2 2 0 0 1 2 -2 h5 l3 -4 h4 v12 z" fill="${P.yellow}"/><path d="M19 8 h5 v12 l-5 2 z" fill="#8f99a8"/></g>`;
  return wrap(s);
}
const INFO_GRAD = {
  traffic: ['#3fbf5a', '#f2c230', '#e5484d'], landvalue: ['#3a4b6b', '#4fa3e0', '#ffd76a'], pollution: ['#3fbf5a', '#c9b03a', '#7a4a3a'],
  happiness: ['#e5484d', '#f2c230', '#3fbf5a'], education: ['#40496b', '#7f7fd8', '#e0c3ff'], health: ['#e5484d', '#f2c230', '#5fd76c'],
  fire: ['#3fbf5a', '#f2a230', '#ff4a2a'], crime: ['#3fbf5a', '#f2c230', '#8f2fbf'], power: ['#2b3140', '#f7c948', '#fff4b0'],
  water: ['#2b3140', '#3b9cf5', '#bfe3ff'], garbage: ['#3fbf5a', '#c9b03a', '#8a5a34'], density: ['#2b3140', '#3b9cf5', '#ffffff'], none: ['#5f8a44', '#6f9a52', '#7aa35a'],
};
export function infoTile(name) {
  const g = INFO_GRAD[name] || INFO_GRAD.none;
  const id = `sbInfo_${name}`;
  let s = `<defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${g[0]}"/><stop offset=".5" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/></linearGradient></defs>`;
  s += shadow() + box(-1, 1, -1, 1, 0.08, '#4b5563');
  s += poly([[-1, 0.085, -1], [1, 0.085, -1], [1, 0.085, 1], [-1, 0.085, 1]], `url(#${id})`);
  for (const [x0, x1, z0, z1, h] of [[-0.75, -0.3, -0.75, -0.3, 0.6], [0.05, 0.55, -0.7, -0.25, 0.9], [-0.7, -0.2, 0.15, 0.6, 0.45], [0.1, 0.7, 0.1, 0.65, 0.7]]) s += box(x0, x1, z0, z1, h, '#e5e7eb', 0.09, 'opacity=".55"');
  s += poly([[-1, 0.09, -0.05], [1, 0.09, -0.05], [1, 0.09, 0.05], [-1, 0.09, 0.05]], '#f3f4f6', 'opacity=".3"') + poly([[-0.05, 0.09, -1], [0.05, 0.09, -1], [0.05, 0.09, 1], [-0.05, 0.09, 1]], '#f3f4f6', 'opacity=".3"');
  return wrap(s);
}
export function lineTile(color = '#2f8ff5') {
  let s = slab('#5a6270');
  s += `<path d="M${iso(-0.9, 0.1, 0.6)[0]} ${iso(-0.9, 0.1, 0.6)[1]} Q${iso(0.2, 0.1, 0.4)[0]} ${iso(0.2, 0.1, 0.4)[1]} ${iso(0.9, 0.1, -0.7)[0]} ${iso(0.9, 0.1, -0.7)[1]}" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  for (const [x, z] of [[-0.9, 0.6], [0.05, 0.25], [0.9, -0.7]]) { const [px, py] = iso(x, 0.1, z); s += `<circle cx="${px}" cy="${py}" r="3.2" fill="#fff" stroke="${color}" stroke-width="1.8"/>`; }
  const [bx, by] = iso(0.35, 0.1, 0.05);
  s += `<g transform="translate(${bx - 9} ${by - 12}) scale(.7)"><rect x="0" y="0" width="26" height="15" rx="3" fill="${P.green}"/><rect x="3" y="3" width="8" height="6" rx="1" fill="${P.blueL}"/><rect x="14" y="3" width="8" height="6" rx="1" fill="${P.blueL}"/><circle cx="6" cy="16" r="2.5" fill="#2c3440"/><circle cx="20" cy="16" r="2.5" fill="#2c3440"/></g>`;
  return wrap(s);
}
