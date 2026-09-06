// The tile catalogue painted into the building atlas: facade bays (near + far LOD), plain wall
// materials, roofs, ground surfaces, doors and roof-clutter metals.

import { BuildingAtlas, wallMaterial, drawBay, drawCurtainBay, drawShopfront, nrm } from './atlas.js';
import * as THREE from 'three';

// One tile per facade holds 3 bays × 1 floor. Its three sub-rects are the near-LOD bay variants and
// the whole tile is the far-LOD row, so nothing is painted twice.
const BAYS = 3;
const BAYPX = 220;
const ROW_W = BAYPX * BAYS, ROW_H = BAYPX;
const MAT = 128;

function shade(hex, k) {
  const c = new THREE.Color(hex);
  if (k >= 1) c.lerp(new THREE.Color(0xffffff), Math.min(1, k - 1)); else c.multiplyScalar(k);
  return '#' + c.getHexString();
}

// --------------------------------------------------------------------- facade definitions
// win rect is in bay-local 0..1 space (y measured down from the top of the floor).
export const FACADES = {
  res_siding: {
    wall: 'siding', wallColor: '#d9d7cd', kind: 'punched',
    win: { x: 0.22, w: 0.56, y: 0.2, h: 0.5 }, frame: '#f2efe6', frameW: 0.035, reveal: 0.03,
    glass: ['#9db1c3', '#5f7180'], mullV: 1, mullH: 1, sill: true, sillColor: '#efeadf', dirt: 0.25,
  },
  res_brick: {
    wall: 'brick', wallColor: '#9a5f47', kind: 'punched',
    win: { x: 0.24, w: 0.52, y: 0.22, h: 0.48 }, frame: '#efeade', frameW: 0.032, reveal: 0.04,
    glass: ['#98abbc', '#5a6a79'], mullV: 1, mullH: 1, sill: true, sillColor: '#d6d0c4', dirt: 0.45,
  },
  res_stucco: {
    wall: 'stucco', wallColor: '#d8c9ad', kind: 'punched',
    win: { x: 0.23, w: 0.54, y: 0.22, h: 0.48 }, frame: '#5d4a3a', frameW: 0.03, reveal: 0.045,
    glass: ['#9fb0bf', '#5c6c7a'], mullV: 1, mullH: 1, sill: true, sillColor: '#c8b99c', dirt: 0.35,
  },
  town_brick: {
    wall: 'brick', wallColor: '#8d4f3c', kind: 'punched',
    win: { x: 0.24, w: 0.52, y: 0.14, h: 0.6 }, frame: '#f4f1e8', frameW: 0.03, reveal: 0.045,
    glass: ['#94a8ba', '#586878'], mullV: 1, mullH: 2, sill: true, sillColor: '#cfc7b8', dirt: 0.5,
  },
  town_render: {
    wall: 'stucco', wallColor: '#cfd3cf', kind: 'punched',
    win: { x: 0.22, w: 0.56, y: 0.14, h: 0.6 }, frame: '#2e3a33', frameW: 0.03, reveal: 0.04,
    glass: ['#97a9bb', '#596979'], mullV: 1, mullH: 1, sill: true, sillColor: '#b9bcb6', dirt: 0.4,
  },
  apt_concrete: {
    wall: 'concrete', wallColor: '#b6b2a8', kind: 'punched',
    win: { x: 0.13, w: 0.74, y: 0.16, h: 0.58 }, frame: '#dcd8cf', frameW: 0.026, reveal: 0.05,
    glass: ['#9cb0c1', '#5b6b7c'], mullV: 2, mullH: 0, sill: true, sillColor: '#a9a49a', dirt: 0.6,
  },
  apt_panel: {
    wall: 'panel', wallColor: '#c9bfae', kind: 'punched',
    win: { x: 0.11, w: 0.78, y: 0.15, h: 0.6 }, frame: '#3b4147', frameW: 0.024, reveal: 0.04,
    glass: ['#a0b4c6', '#5d6e7e'], mullV: 2, mullH: 0, sill: true, sillColor: '#b3aa9b', dirt: 0.5,
  },
  apt_brick: {
    wall: 'brick', wallColor: '#7e5a4b', kind: 'punched',
    win: { x: 0.15, w: 0.7, y: 0.16, h: 0.58 }, frame: '#e6e0d4', frameW: 0.026, reveal: 0.05,
    glass: ['#96aabb', '#586878'], mullV: 1, mullH: 0, sill: true, sillColor: '#cbc3b4', dirt: 0.55,
  },
  office_stone: {
    wall: 'stone', wallColor: '#b9b3a4', kind: 'punched',
    win: { x: 0.1, w: 0.8, y: 0.18, h: 0.56 }, frame: '#4b5157', frameW: 0.024, reveal: 0.05,
    glass: ['#91aabf', '#556878'], glassRough: 0.34, glassMetal: 0.12, mullV: 2, mullH: 0, sill: true, sillColor: '#a8a294', dirt: 0.35,
  },
  office_glass_blue: {
    wall: 'panel', wallColor: '#5a6d7c', kind: 'curtain',
    glass: ['#bcd6ea', '#7089a0'], spandrel: 0.19, spandrelColor: '#54707f',
    frame: '#b3bac0', glassRough: 0.34, glassMetal: 0.12, mullV: 1,
  },
  office_glass_sky: {
    wall: 'panel', wallColor: '#6a7f8e', kind: 'curtain',
    glass: ['#c8e0f2', '#7f97a9'], spandrel: 0.16, spandrelColor: '#75909f',
    frame: '#c8cdd1', glassRough: 0.34, glassMetal: 0.12, mullV: 1,
  },
  office_glass_green: {
    wall: 'panel', wallColor: '#54675f', kind: 'curtain',
    glass: ['#b8dbcb', '#6d8a7c'], spandrel: 0.17, spandrelColor: '#516b62',
    frame: '#b0b6b1', glassRough: 0.34, glassMetal: 0.12, mullV: 1,
  },
  office_glass_dark: {
    wall: 'panel', wallColor: '#53575d', kind: 'curtain',
    glass: ['#a9bccb', '#616f7c'], spandrel: 0.22, spandrelColor: '#4a5058',
    frame: '#7d858c', glassRough: 0.34, glassMetal: 0.12, mullV: 2,
  },
  comm_upper: {
    wall: 'panel', wallColor: '#cbc3b3', kind: 'punched',
    win: { x: 0.1, w: 0.8, y: 0.16, h: 0.56 }, frame: '#4a5057', frameW: 0.026, reveal: 0.04,
    glass: ['#9ab2c6', '#596b7c'], mullV: 2, mullH: 0, sill: true, sillColor: '#bcb4a5', dirt: 0.5,
  },
  comm_shop_red: { wall: 'stucco', wallColor: '#c9b9a4', kind: 'shop', frame: '#3b4249', awning: '#7d443c', signColor: '#33404c', signInk: '#e9dfc7', glass: ['#8fa2b6', '#59657f'] },
  comm_shop_green: { wall: 'brick', wallColor: '#8f5c47', kind: 'shop', frame: '#3b4249', awning: '#38594a', signColor: '#2b3a33', signInk: '#e6dcc4', glass: ['#8fa2b6', '#59657f'] },
  comm_shop_blue: { wall: 'concrete', wallColor: '#bdb8ad', kind: 'shop', frame: '#31383e', awning: '#3a5570', signColor: '#243447', signInk: '#dfe8f2', glass: ['#8fa2b6', '#59657f'] },
  ind_metal: {
    wall: 'metal', wallColor: '#9aa3a6', kind: 'punched',
    win: { x: 0.08, w: 0.84, y: 0.26, h: 0.26 }, frame: '#6e7679', frameW: 0.02, reveal: 0.025,
    glass: ['#a4b6c4', '#6a7984'], glassRough: 0.38, glassMetal: 0.12, mullV: 3, mullH: 0, sill: false, dirt: 0.7, blind: false,
  },
  ind_panel: {
    wall: 'panel', wallColor: '#b3b0a6', kind: 'punched',
    win: { x: 0.07, w: 0.86, y: 0.24, h: 0.22 }, frame: '#7a7e80', frameW: 0.02, reveal: 0.03,
    glass: ['#a1b3c1', '#66747f'], glassRough: 0.36, glassMetal: 0.12, mullV: 3, mullH: 0, sill: false, dirt: 0.8, blind: false,
  },
};


// --------------------------------------------------------------------- facade geometry
// Where the glazing sits inside one bay tile, in tile-local 0..1 space (y measured DOWN from the
// top of the floor, matching the painter). generate.js builds real geometry from this: the pane is
// recessed and the surrounding wall, head, cill and jambs are separate planes, so a window opening
// has a built reveal instead of a painted stripe.
export function facadeGeom(name) {
  const d = FACADES[name];
  if (!d) return { x: 0.18, w: 0.64, y: 0.18, h: 0.56, curtain: false, shop: false };
  if (d.kind === 'curtain') {
    const sp = d.spandrel ?? 0.2;
    return { x: 0.045, w: 0.91, y: sp + 0.03, h: Math.max(0.2, 1 - sp - 0.07), curtain: true, shop: false };
  }
  if (d.kind === 'shop') return { x: 0.045, w: 0.91, y: 0.37, h: 0.5, curtain: false, shop: true };
  return { x: d.win.x, w: d.win.w, y: d.win.y, h: d.win.h, curtain: false, shop: false };
}
export function isCurtain(name) { return FACADES[name]?.kind === 'curtain'; }
export function facadeWallTile(name) {
  const d = FACADES[name];
  const k = d?.wall || 'concrete';
  return ({ brick: 'wall_brick', siding: 'wall_siding', stucco: 'wall_stucco', concrete: 'wall_concrete',
    panel: 'wall_panel', stone: 'wall_stone', metal: 'wall_metal' })[k] || 'wall_concrete';
}

// --------------------------------------------------------------------- plain materials
const MATERIALS = {
  wall_concrete: { kind: 'concrete', color: '#b4b0a6', rx: 1.5, ry: 1.5 },
  wall_concrete_dark: { kind: 'concrete', color: '#8b877e', rx: 1.5, ry: 1.5 },
  wall_brick: { kind: 'brick', color: '#8d5541', rx: 1.6, ry: 1.6 },
  wall_stucco: { kind: 'stucco', color: '#d6cdba', rx: 1, ry: 1 },
  wall_siding: { kind: 'siding', color: '#d9d7cd', rx: 1, ry: 1.4 },
  wall_metal: { kind: 'metal', color: '#9aa3a6', rx: 1.2, ry: 1 },
  wall_metal_dark: { kind: 'metal', color: '#5c6367', rx: 1.2, ry: 1 },
  wall_stone: { kind: 'stone', color: '#b9b3a4', rx: 1.2, ry: 1.2 },
  wall_panel: { kind: 'panel', color: '#c6bfb2', rx: 1, ry: 1 },
};

// --------------------------------------------------------------------- custom painters
function paintShingle(t, color, steep) {
  const A = t.A;
  wallMaterial(t, 'stucco', color, -0.2, -0.2, 1.4, 1.4, 1, 1);
  const rows = 8, rh = 1 / rows, cols = 7;
  for (let j = 0; j < rows; j++) {
    const y = j * rh, off = (j % 2) * 0.5;
    for (let i = -1; i <= cols; i++) {
      const x = (i + off) / cols;
      A.fillStyle = shade(color, t.rnd(0.86, 1.14));
      A.fillRect(x + 0.004, y, 1 / cols - 0.008, rh * 0.98);
    }
    A.fillStyle = shade(color, 0.55); A.fillRect(-0.2, y + rh * 0.92, 1.4, rh * 0.09);
    t.n(-0.2, y + rh * 0.86, 1.4, rh * 0.08, 0, 0.4);
    t.n(-0.2, y + rh * 0.94, 1.4, rh * 0.07, 0, -0.5);
  }
  t.grain(-0.2, -0.2, 1.4, 1.4, 'fine', 0.24, 3);
  t.grain(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.07, 2);
  t.o(-0.2, -0.2, 1.4, 1.4, steep ? 0.9 : 0.86, 0);
}

function paintRoofTile(t, color) {
  const A = t.A;
  A.fillStyle = shade(color, 0.7); A.fillRect(-0.2, -0.2, 1.4, 1.4);
  const cols = 9, rows = 6;
  for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
    const x = i / cols, y = j / rows;
    t.gradAH(x, y, 1 / cols, 1 / rows * 0.96, [[0, shade(color, 0.62)], [0.35, shade(color, t.rnd(1.0, 1.16))], [1, shade(color, 0.72)]]);
    t.n(x, y, 1 / cols * 0.3, 1 / rows, -0.5, 0);
    t.n(x + 1 / cols * 0.7, y, 1 / cols * 0.3, 1 / rows, 0.5, 0);
  }
  for (let j = 0; j <= rows; j++) { A.fillStyle = shade(color, 0.5); A.fillRect(-0.2, j / rows - 0.012, 1.4, 0.018); t.n(-0.2, j / rows - 0.012, 1.4, 0.01, 0, 0.5); }
  t.grain(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.2, 1);
  t.o(-0.2, -0.2, 1.4, 1.4, 0.82, 0);
}

function paintFlatRoof(t, color, gravel) {
  const A = t.A;
  A.fillStyle = color; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  if (gravel) {
    for (let i = 0; i < 900; i++) {
      const x = t.rnd(-0.2, 1.2), y = t.rnd(-0.2, 1.2), s = t.rnd(0.004, 0.014);
      A.fillStyle = shade(color, t.rnd(0.7, 1.35)); A.fillRect(x, y, s, s);
    }
    t.grainN(-0.2, -0.2, 1.4, 1.4, 'fine', 0.5, 4);
    t.o(-0.2, -0.2, 1.4, 1.4, 0.94, 0);
  } else {
    // membrane with welded seams and ponding stains
    for (let i = 0; i <= 3; i++) { A.fillStyle = shade(color, 0.86); A.fillRect(-0.2, i / 3 - 0.008, 1.4, 0.016); t.n(-0.2, i / 3 - 0.008, 1.4, 0.008, 0, 0.35); t.n(-0.2, i / 3, 1.4, 0.008, 0, -0.35); }
    t.grain(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.3, 1);
    t.grain(-0.2, -0.2, 1.4, 1.4, 'fine', 0.14, 3);
    t.o(-0.2, -0.2, 1.4, 1.4, 0.78, 0);
  }
}

function paintStandingSeam(t, color) {
  const A = t.A;
  A.fillStyle = color; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  const cols = 6;
  for (let i = -1; i <= cols; i++) {
    const x = i / cols;
    t.gradAH(x, -0.2, 1 / cols, 1.4, [[0, shade(color, 1.2)], [0.15, shade(color, 0.9)], [0.85, shade(color, 0.95)], [1, shade(color, 1.25)]]);
    A.fillStyle = shade(color, 1.35); A.fillRect(x - 0.008, -0.2, 0.016, 1.4);
    t.n(x - 0.01, -0.2, 0.01, 1.4, -0.6, 0); t.n(x, -0.2, 0.01, 1.4, 0.6, 0);
  }
  t.grain(-0.2, -0.2, 1.4, 1.4, 'streak', 0.12, 1);
  t.o(-0.2, -0.2, 1.4, 1.4, 0.44, 0.75);
}

function paintSolar(t) {
  const A = t.A;
  A.fillStyle = '#2c3138'; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  const n = 4;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    t.gradA(i / n + 0.012, j / n + 0.012, 1 / n - 0.024, 1 / n - 0.024, [[0, '#1d3f66'], [0.5, '#16304f'], [1, '#0f2237']]);
  }
  A.save(); A.globalAlpha = 0.25; A.globalCompositeOperation = 'screen';
  A.fillStyle = '#9fc4e8'; A.beginPath(); A.moveTo(-0.2, 1.0); A.lineTo(0.8, -0.2); A.lineTo(1.2, -0.2); A.lineTo(0.2, 1.2); A.closePath(); A.fill();
  A.restore();
  A.fillStyle = '#8d949b';
  for (let i = 0; i <= n; i++) { A.fillRect(i / n - 0.006, -0.2, 0.012, 1.4); A.fillRect(-0.2, i / n - 0.006, 1.4, 0.012); }
  t.o(-0.2, -0.2, 1.4, 1.4, 0.32, 0.6);
  t.n(-0.2, -0.2, 1.4, 1.4, 0, 0);
}

function paintLawn(t, dark) {
  const A = t.A;
  const base = dark ? '#4a5f31' : '#5c7439';
  A.fillStyle = base; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  for (let i = 0; i < 2600; i++) {
    const x = t.rnd(-0.2, 1.2), y = t.rnd(-0.2, 1.2);
    A.fillStyle = shade(base, t.rnd(0.7, 1.35));
    A.fillRect(x, y, 0.008, 0.016);
  }
  // mown stripes
  A.save(); A.globalAlpha = 0.12; A.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) { A.fillStyle = '#c9e08a'; A.fillRect(-0.2, i * 0.25, 1.4, 0.12); }
  A.restore();
  t.grain(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.3, 1);
  t.grainN(-0.2, -0.2, 1.4, 1.4, 'fine', 0.55, 4);
  t.o(-0.2, -0.2, 1.4, 1.4, 0.95, 0);
}

function paintHedge(t) {
  const A = t.A;
  A.fillStyle = '#31491f'; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  for (let i = 0; i < 2400; i++) {
    const x = t.rnd(-0.2, 1.2), y = t.rnd(-0.2, 1.2);
    A.fillStyle = shade('#3d5a26', t.rnd(0.55, 1.5));
    A.fillRect(x, y, t.rnd(0.008, 0.022), t.rnd(0.008, 0.02));
  }
  t.grain(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.42, 1);
  t.grainN(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.75, 2);
  t.o(-0.2, -0.2, 1.4, 1.4, 0.96, 0);
}

function paintAsphaltLot(t, stalls) {
  const A = t.A;
  A.fillStyle = '#3b3d3f'; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  t.grain(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.32, 1);
  for (let i = 0; i < 1800; i++) {
    const x = t.rnd(-0.2, 1.2), y = t.rnd(-0.2, 1.2);
    A.fillStyle = shade('#4a4d50', t.rnd(0.6, 1.4)); A.fillRect(x, y, 0.007, 0.007);
  }
  if (stalls) {
    A.save(); A.globalAlpha = 0.78; A.fillStyle = '#d9d6c8';
    for (let i = 0; i <= 3; i++) A.fillRect(i / 3 - 0.008, 0.06, 0.016, 0.88);
    A.restore();
  }
  t.grainN(-0.2, -0.2, 1.4, 1.4, 'fine', 0.45, 3);
  t.o(-0.2, -0.2, 1.4, 1.4, 0.86, 0);
}

function paintPaving(t, color, joints) {
  const A = t.A;
  A.fillStyle = color; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  if (joints) {
    const n = 4;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      A.fillStyle = shade(color, t.rnd(0.92, 1.08));
      A.fillRect(i / n + 0.008, j / n + 0.008, 1 / n - 0.016, 1 / n - 0.016);
    }
    for (let i = 0; i <= n; i++) {
      A.fillStyle = shade(color, 0.78);
      A.fillRect(i / n - 0.006, -0.2, 0.012, 1.4); A.fillRect(-0.2, i / n - 0.006, 1.4, 0.012);
      t.n(i / n - 0.006, -0.2, 0.006, 1.4, -0.35, 0); t.n(i / n, -0.2, 0.006, 1.4, 0.35, 0);
    }
  }
  t.grain(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.26, 1);
  t.grain(-0.2, -0.2, 1.4, 1.4, 'fine', 0.14, 3);
  t.grainN(-0.2, -0.2, 1.4, 1.4, 'fine', 0.3, 3);
  t.o(-0.2, -0.2, 1.4, 1.4, 0.88, 0);
}

function paintDoor(t, kind) {
  const A = t.A;
  if (kind === 'garage') {
    A.fillStyle = '#cfcabf'; A.fillRect(-0.2, -0.2, 1.4, 1.4);
    const rows = 6;
    for (let j = 0; j < rows; j++) {
      t.gradA(0.02, j / rows, 0.96, 1 / rows * 0.94, [[0, '#e5e1d6'], [0.6, '#cdc8bc'], [1, '#a9a49a']]);
      t.n(0.02, j / rows, 0.96, 1 / rows * 0.4, 0, 0.35);
      t.n(0.02, j / rows + 1 / rows * 0.7, 0.96, 1 / rows * 0.3, 0, -0.45);
    }
    A.fillStyle = '#8d887e'; A.fillRect(0, -0.2, 0.02, 1.4); A.fillRect(0.98, -0.2, 0.02, 1.4);
    t.ao(0, 0, 1, 0.14, 0.5, 'up');
    t.o(-0.2, -0.2, 1.4, 1.4, 0.55, 0.15);
  } else if (kind === 'roller') {
    A.fillStyle = '#7f868a'; A.fillRect(-0.2, -0.2, 1.4, 1.4);
    const rows = 16;
    for (let j = 0; j < rows; j++) {
      t.gradA(0.03, j / rows, 0.94, 1 / rows, [[0, '#98a0a4'], [0.5, '#7c8488'], [1, '#646b6f']]);
      t.n(0.03, j / rows, 0.94, 1 / rows * 0.5, 0, 0.3);
      t.n(0.03, j / rows + 1 / rows * 0.5, 0.94, 1 / rows * 0.5, 0, -0.3);
    }
    A.fillStyle = '#4d5356'; A.fillRect(0, -0.2, 0.03, 1.4); A.fillRect(0.97, -0.2, 0.03, 1.4);
    t.grain(-0.2, -0.2, 1.4, 1.4, 'streak', 0.2, 1);
    t.ao(0, 0.86, 1, 0.14, 0.5, 'down');
    t.o(-0.2, -0.2, 1.4, 1.4, 0.45, 0.6);
  } else { // entrance
    A.fillStyle = '#b8b2a6'; A.fillRect(-0.2, -0.2, 1.4, 1.4);
    t.a(0.14, 0.1, 0.72, 0.9, '#5b4632');
    t.gradA(0.14, 0.1, 0.72, 0.9, [[0, '#6d5540'], [1, '#493626']]);
    t.a(0.2, 0.18, 0.6, 0.3, '#3d4b58');
    t.o(0.2, 0.18, 0.6, 0.3, 0.33, 0.6);
    t.e(0.2, 0.18, 0.6, 0.3, 0.8);
    t.a(0.22, 0.56, 0.56, 0.34, '#4a3728');
    t.n(0.14, 0.1, 0.04, 0.9, 0.5, 0); t.n(0.82, 0.1, 0.04, 0.9, -0.5, 0);
    t.a(0.74, 0.5, 0.05, 0.05, '#c9b07a');
    t.o(0.74, 0.5, 0.05, 0.05, 0.2, 0.9);
    t.ao(0.1, 0.02, 0.8, 0.14, 0.5, 'up');
    t.o(0.14, 0.1, 0.72, 0.9, 0.55, 0.05);
  }
}

function paintMetal(t, color, rough, metal, ribbed) {
  const A = t.A;
  A.fillStyle = color; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  if (ribbed) {
    const cols = 10;
    for (let i = -1; i <= cols; i++) {
      const x = i / cols;
      t.gradAH(x, -0.2, 1 / cols, 1.4, [[0, shade(color, 0.75)], [0.4, shade(color, 1.15)], [1, shade(color, 0.8)]]);
      t.n(x, -0.2, 1 / cols * 0.35, 1.4, -0.45, 0);
      t.n(x + 1 / cols * 0.65, -0.2, 1 / cols * 0.35, 1.4, 0.45, 0);
    }
  }
  t.grain(-0.2, -0.2, 1.4, 1.4, 'streak', 0.16, 1);
  t.grain(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.18, 1);
  t.o(-0.2, -0.2, 1.4, 1.4, rough, metal);
}

function paintWood(t, color) {
  const A = t.A;
  A.fillStyle = color; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  const cols = 12;
  for (let i = -1; i <= cols; i++) {
    const x = i / cols;
    A.fillStyle = shade(color, t.rnd(0.82, 1.16)); A.fillRect(x, -0.2, 1 / cols - 0.006, 1.4);
    A.fillStyle = shade(color, 0.6); A.fillRect(x + 1 / cols - 0.006, -0.2, 0.006, 1.4);
    t.n(x + 1 / cols - 0.008, -0.2, 0.004, 1.4, -0.4, 0); t.n(x + 1 / cols - 0.004, -0.2, 0.004, 1.4, 0.4, 0);
  }
  t.grain(-0.2, -0.2, 1.4, 1.4, 'streak', 0.24, 2);
  t.o(-0.2, -0.2, 1.4, 1.4, 0.8, 0);
}

function paintTrim(t, color) {
  const A = t.A;
  A.fillStyle = color; A.fillRect(-0.2, -0.2, 1.4, 1.4);
  t.grain(-0.2, -0.2, 1.4, 1.4, 'blotch', 0.16, 1);
  t.grain(-0.2, -0.2, 1.4, 1.4, 'fine', 0.1, 2);
  t.o(-0.2, -0.2, 1.4, 1.4, 0.8, 0);
}

function paintGlassPlain(t, color) {
  t.gradA(-0.2, -0.2, 1.4, 1.4, [[0, shade(color, 1.5)], [0.5, color], [1, shade(color, 0.6)]]);
  const A = t.A;
  A.save(); A.globalAlpha = 0.4; A.globalCompositeOperation = 'screen';
  A.fillStyle = '#93aac2'; A.beginPath(); A.moveTo(-0.2, 1.2); A.lineTo(0.9, -0.2); A.lineTo(1.2, -0.2); A.lineTo(0.1, 1.2); A.closePath(); A.fill();
  A.restore();
  t.o(-0.2, -0.2, 1.4, 1.4, 0.06, 0.85);
  t.e(-0.2, -0.2, 1.4, 1.4, 1);
}


// --------------------------------------------------------------------- lit retail base
/** illuminated fascia / blade sign: a coloured board with lettering, fully emissive */
function paintSign(t, bg, ink) {
  const A = t.A;
  t.a(-0.2, -0.2, 1.4, 1.4, bg);
  t.gradA(-0.2, -0.2, 1.4, 1.4, [[0, shade(bg, 1.25)], [0.55, bg], [1, shade(bg, 0.82)]]);
  t.o(-0.2, -0.2, 1.4, 1.4, 0.42, 0.05);
  t.e(-0.2, -0.2, 1.4, 1.4, 0.30);
  A.save(); A.fillStyle = ink;
  let lx = 0.11;
  const n = 4 + Math.floor(t.rnd(0, 4));
  for (let i = 0; i < n && lx < 0.86; i++) {
    const lw = t.rnd(0.05, 0.115);
    A.fillRect(lx, 0.34, lw, 0.31);
    lx += lw + 0.028;
  }
  A.restore();
  // the letters themselves are the bright part
  const E = t.E;
  E.save(); E.fillStyle = '#ffffff';
  lx = 0.11;
  for (let i = 0; i < n && lx < 0.86; i++) { const lw = 0.08; E.fillRect(lx, 0.34, lw, 0.31); lx += lw + 0.028; }
  E.restore();
  t.n(-0.2, -0.2, 1.4, 1.4, 0, 0);
}

/** the lit interior card behind a shopfront: ceiling strips, back wall, shelving silhouettes */
function paintInterior(t, warm) {
  const A = t.A;
  const back = warm ? '#5b4b3a' : '#4a5058';
  t.a(-0.2, -0.2, 1.4, 1.4, back);
  t.gradA(-0.2, -0.2, 1.4, 1.4, [[0, shade(back, 1.7)], [0.28, shade(back, 1.25)], [1, shade(back, 0.62)]]);
  // ceiling light strips
  for (let i = 0; i < 3; i++) {
    const y = 0.06 + i * 0.055;
    t.a(0.08, y, 0.84, 0.028, warm ? '#ffe6bd' : '#e8f0ff');
  }
  // shelving / counters
  A.save(); A.globalAlpha = 0.85;
  for (let i = 0; i < 6; i++) {
    A.fillStyle = shade(['#8d6b46', '#5e6d7a', '#8f4a44', '#4d6b52', '#b0a184', '#6a5a78'][i % 6], t.rnd(0.8, 1.2));
    A.fillRect(0.06 + i * 0.155, t.rnd(0.42, 0.62), 0.11, t.rnd(0.18, 0.34));
  }
  A.restore();
  // glazing over the interior: a reflection wedge and slim mullions, so one quad is the whole shopfront
  A.save(); A.globalAlpha = 0.30; A.globalCompositeOperation = 'screen';
  A.fillStyle = '#93a7bb';
  A.beginPath(); A.moveTo(-0.2, 1.2); A.lineTo(0.72, -0.2); A.lineTo(1.02, -0.2); A.lineTo(0.08, 1.2); A.closePath(); A.fill();
  A.restore();
  for (const x of [0.02, 0.5, 0.98]) { t.a(x - 0.014, -0.2, 0.028, 1.4, '#3b4249'); t.o(x - 0.014, -0.2, 0.028, 1.4, 0.42, 0.3); t.e(x - 0.014, -0.2, 0.028, 1.4, 0); }
  t.a(-0.2, 0.02, 1.4, 0.026, '#3b4249');
  t.o(-0.2, -0.2, 1.4, 1.4, 0.36, 0.25);
  t.n(-0.2, -0.2, 1.4, 1.4, 0, 0);
  // emissive: bright ceiling, mid room, dim floor — three tiers inside one card
  const E = t.E, gr = E.createLinearGradient(0, -0.2, 0, 1.2);
  const c = (v) => `rgb(${(v * 255) | 0},${(v * 255) | 0},${(v * 255) | 0})`;
  gr.addColorStop(0, c(0.55)); gr.addColorStop(0.14, c(1.0)); gr.addColorStop(0.45, c(0.62)); gr.addColorStop(1, c(0.24));
  E.fillStyle = gr; E.fillRect(-0.2, -0.2, 1.4, 1.4);
}

/** clear shopfront glazing with mullions — sits in front of the interior card */
function paintShopGlass(t) {
  const A = t.A;
  t.a(-0.2, -0.2, 1.4, 1.4, '#2f3a44');
  A.save(); A.globalAlpha = 0.35; A.globalCompositeOperation = 'screen';
  A.fillStyle = '#93a7bb';
  A.beginPath(); A.moveTo(-0.2, 1.2); A.lineTo(0.75, -0.2); A.lineTo(1.05, -0.2); A.lineTo(0.1, 1.2); A.closePath(); A.fill();
  A.restore();
  for (const x of [0.0, 0.5, 0.98]) { t.a(x - 0.012, -0.2, 0.024, 1.4, '#3b4249'); t.o(x - 0.012, -0.2, 0.024, 1.4, 0.4, 0.35); }
  t.a(-0.2, 0.9, 1.4, 0.1, '#6d6a63');
  t.o(-0.2, -0.2, 1.4, 1.4, 0.34, 0.15);
  t.n(-0.2, -0.2, 1.4, 1.4, 0, 0);
  t.e(-0.2, -0.2, 1.4, 1.4, 0);
}

// --------------------------------------------------------------------- build
export function buildAtlas(rng, anisotropy) {
  const at = new BuildingAtlas(rng);

  for (const [name, d] of Object.entries(FACADES)) {
    at.paint(`${name}_row`, ROW_W, ROW_H, (t) => {
      if (d.kind !== 'curtain') {
        wallMaterial(t, d.wall, d.wallColor, -0.1, -0.4, 1.2, 1.8, BAYS * 1.2, 1.8);
        // floor line + slab shadow so stacked bays read as storeys
        t.a(-0.1, 0.966, 1.2, 0.018, shade(d.wallColor, 0.7));
        t.ao(-0.1, 0.86, 1.2, 0.11, 0.3, 'down');
        t.ao(-0.1, 0, 1.2, 0.05, 0.22, 'up');
      }
      for (let i = 0; i < BAYS; i++) {
        const x = i / BAYS, w = 1 / BAYS;
        if (d.kind === 'curtain') drawCurtainBay(t, d, x, w, 0, 1, i);
        else if (d.kind === 'shop') drawShopfront(t, d, x, w, 0, 1, i);
        else drawBay(t, d, x, w, 0, 1, i);
      }
    });
    for (let i = 0; i < BAYS; i++) at.sub(`${name}_${'abc'[i]}`, `${name}_row`, i, BAYS);
  }

  for (const [name, m] of Object.entries(MATERIALS)) {
    at.paint(name, MAT, MAT, (t) => wallMaterial(t, m.kind, m.color, -0.2, -0.2, 1.4, 1.4, m.rx * 1.4, m.ry * 1.4));
  }

  at.paint('roof_shingle_dark', MAT, MAT, (t) => paintShingle(t, '#3b3a38', true));
  at.paint('roof_shingle_grey', MAT, MAT, (t) => paintShingle(t, '#6a6a66', true));
  at.paint('roof_shingle_brown', MAT, MAT, (t) => paintShingle(t, '#5a4436', true));
  at.paint('roof_tile_red', MAT, MAT, (t) => paintRoofTile(t, '#9c4f37'));
  at.paint('roof_tile_grey', MAT, MAT, (t) => paintRoofTile(t, '#6d6f70'));
  at.paint('roof_gravel', MAT, MAT, (t) => paintFlatRoof(t, '#6e6b63', true));
  at.paint('roof_membrane', MAT, MAT, (t) => paintFlatRoof(t, '#8f9089', false));
  at.paint('roof_membrane_dark', MAT, MAT, (t) => paintFlatRoof(t, '#4e5150', false));
  at.paint('roof_seam', MAT, MAT, (t) => paintStandingSeam(t, '#8b9296'));
  at.paint('roof_seam_blue', MAT, MAT, (t) => paintStandingSeam(t, '#4c6070'));
  at.paint('solar', MAT, MAT, (t) => paintSolar(t));

  at.paint('lawn', MAT, MAT, (t) => paintLawn(t, false));
  at.paint('lawn_dark', MAT, MAT, (t) => paintLawn(t, true));
  at.paint('hedge', MAT, MAT, (t) => paintHedge(t));
  at.paint('asphalt', MAT, MAT, (t) => paintAsphaltLot(t, false));
  at.paint('asphalt_stalls', MAT, MAT, (t) => paintAsphaltLot(t, true));
  at.paint('paving', MAT, MAT, (t) => paintPaving(t, '#a8a49b', true));
  at.paint('concrete_slab', MAT, MAT, (t) => paintPaving(t, '#9d9a92', false));
  at.paint('gravel_yard', MAT, MAT, (t) => paintPaving(t, '#8b8579', false));

  at.paint('door_garage', MAT, MAT, (t) => paintDoor(t, 'garage'));
  at.paint('door_roller', MAT, MAT, (t) => paintDoor(t, 'roller'));
  at.paint('door_entrance', MAT, MAT, (t) => paintDoor(t, 'entrance'));

  at.paint('metal_light', MAT, MAT, (t) => paintMetal(t, '#a7adb0', 0.42, 0.7, false));
  at.paint('metal_ribbed', MAT, MAT, (t) => paintMetal(t, '#98a0a3', 0.4, 0.75, true));
  at.paint('metal_dark', MAT, MAT, (t) => paintMetal(t, '#565c60', 0.5, 0.65, false));
  at.paint('metal_rust', MAT, MAT, (t) => paintMetal(t, '#7d604b', 0.75, 0.35, false));
  at.paint('wood_tank', MAT, MAT, (t) => paintWood(t, '#6b4f38'));
  at.paint('trim_white', MAT, MAT, (t) => paintTrim(t, '#e8e4d9'));
  at.paint('trim_grey', MAT, MAT, (t) => paintTrim(t, '#9c988f'));
  at.paint('trim_dark', MAT, MAT, (t) => paintTrim(t, '#3f4247'));
  at.paint('glass_plain', MAT, MAT, (t) => paintGlassPlain(t, '#7089a0'));

  // lit retail base (item 4): fascia signs, blade signs, interior cards, shopfront glazing
  const SIGNS = [['#b8342f', '#ffe9c8'], ['#1f4f7a', '#eaf3ff'], ['#2d6b4a', '#f0f7e4'], ['#7a3b7d', '#ffe8f6'],
    ['#c2701a', '#fff2d8'], ['#2b3a4a', '#dfe8f2']];
  for (let i = 0; i < SIGNS.length; i++) at.paint(`sign_${i}`, MAT, MAT / 3, (t) => paintSign(t, SIGNS[i][0], SIGNS[i][1]));
  at.paint('interior_warm', MAT, MAT, (t) => paintInterior(t, true));
  at.paint('interior_cool', MAT, MAT, (t) => paintInterior(t, false));
  at.paint('shop_glass', MAT, MAT, (t) => paintShopGlass(t));

  return { atlas: at, textures: at.finish(anisotropy) };
}
