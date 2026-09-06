// Per-building planning (deterministic, once at spawn) and geometry emission (per LOD, at chunk build).
// The plan holds every random decision so LOD0 and LOD1 are guaranteed to agree.

import { facadeGeom } from './tiles.js';

const DEFAULT_TAB = Array.from({ length: 64 }, (_, i) => ((Math.imul(i + 1, 2654435761) >>> 8) % 10007) / 10007);

const HOUSE_WALL = ['#f2ece0', '#e6e2d6', '#cfe0e4', '#f0dda6', '#b9cfdd', '#e9c3a6', '#b6cdb4', '#f4ead6',
  '#d8c39c', '#c6cfd4', '#e3b9a6', '#cdd8bd', '#eddcc0', '#a9bfcc', '#e8cfd2'];
const HOUSE_TRIM = ['#ffffff', '#f6f2e8', '#e8e4d9'];
const ROOFS = ['roof_shingle_dark', 'roof_shingle_grey', 'roof_shingle_brown', 'roof_tile_red', 'roof_tile_grey', 'roof_seam', 'roof_seam_blue'];
const HOUSE_FACADES = ['res_siding', 'res_brick', 'res_stucco'];
const TOWN_FACADES = ['town_brick', 'town_render'];
const APT_FACADES = ['apt_concrete', 'apt_panel', 'apt_brick'];
const OFFICE_FACADES = ['office_glass_blue', 'office_glass_sky', 'office_glass_green', 'office_glass_dark', 'office_stone', 'comm_upper'];
const SHOPS = ['comm_shop_red', 'comm_shop_green', 'comm_shop_blue'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/** multiply an sRGB hex by k (used for per-unit wall tints) */
function tintHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + ((c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0');
}
/** forward shift inside the lot so the front facade sits `yard` metres from the street boundary */
function setbackShift(ld, d, yard) {
  const room = Math.max(0, ld / 2 - d / 2 - 0.4);
  return clamp(ld / 2 - yard - d / 2, -room, room);
}

// ------------------------------------------------------------------ planning
// Floors per (type/density, level). Growth is a table, not a dice roll: high density gains a floor
// at every one of the four steps, low density at two of them (item 5), and the per-building bonus is
// capped by the gap to the next level so floors can never stop increasing (item 23).
const FLOORS = {
  'residential/low': [1, 1, 2, 2, 3],
  'residential/high': [2, 3, 5, 8, 12],
  'commercial/low': [1, 1, 2, 2, 3],
  'commercial/high': [3, 4, 5, 6, 8],
  'office/low': [2, 3, 4, 5, 6],
  'office/high': [6, 10, 15, 22, 32],
  'industrial/low': [1, 1, 2, 2, 3],
  'industrial/high': [2, 3, 4, 5, 6],
};
function floorsFor(cls, L, rng, topBonus = 2) {
  const t = FLOORS[cls] || FLOORS['commercial/low'];
  const base = t[L - 1];
  const room = L < 5 ? Math.max(0, t[L] - base - 1) : topBonus;
  return base + rng.int(0, room);
}

// Crowns, by level. Item 2 needs six distinct crown keys downtown; they are real geometry, not names.
const CROWNS = ['parapet_mech', 'setback', 'chamfer', 'spire', 'terrace', 'barrel_vault_or_crown'];
const CLUTTER_POOL = ['hvac', 'tank', 'bulkhead', 'vent', 'monitor', 'solar', 'mast'];

function clutterList(rng, n, pool = CLUTTER_POOL) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([rng.pick(pool), rng.int(0, 3)]);
  out.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] < b[0] ? -1 : 1));
  return out;
}
export function clutterKey(p) { return (p.clutterList || []).map((c) => `${c[0]}${c[1]}`).join(','); }

/** the per-building table every baked window value is drawn from (item 3: from ctx.rng, never a shader hash) */
function winTable(rng) { return Array.from({ length: 64 }, () => rng.float()); }

const LIT_BIAS = { residential: 1.32, commercial: 1.06, office: 0.72, industrial: 0.42 };

export function planBuilding(lot, level, rng) {
  const type = lot.type, dens = lot.density;
  const lw = Math.max(6, lot.w), ld = Math.max(6, lot.d);
  const L = clamp(level | 0, 1, 5);
  const cls = `${type}/${dens}`;
  let p;
  if (type === 'residential' && dens === 'low') p = planHouse(lw, ld, L, rng, cls, lot);
  else if (type === 'residential') p = L <= 2 ? planTownhouse(lw, ld, L, rng, cls) : planApartment(lw, ld, L, rng, cls, lot);
  else if (type === 'commercial') p = planShop(lw, ld, L, rng, dens === 'high', cls);
  else if (type === 'office' && dens === 'low') p = planOfficeLow(lw, ld, L, rng, cls);
  else if (type === 'office') p = planTower(lw, ld, L, rng, cls, lot);
  else p = planWarehouse(lw, ld, L, rng, dens === 'high', cls);

  p.wtab = winTable(rng);
  p.catalog = !!lot.catalog;
  p.coolT = rng.range(0.34, 0.66);
  p.bias = LIT_BIAS[type] ?? 1;
  p.warmShop = rng.bool(0.62);
  p.signIdx = rng.int(0, 5);
  // corner treatment: the facade wraps the corner with a chamfer and, on retail, the shopfront with it
  if (lot.corner && (p.kind === 'shop' || p.kind === 'apt' || p.kind === 'tower' || p.kind === 'officelow' || p.kind === 'town')) {
    p.chamfer = Math.max(p.chamfer || 0, Math.min(p.w, p.d) * 0.18);
    p.cornerTreated = true;
  }
  if (p.chamfer > 0 || p.plan === 'L' || p.plan === 'U' || p.steps > 0 || p.podium || p.setback || p.terraces) p.nonRect = true;
  p.relief = {
    reveal: REVEAL,
    band: p.bands === false ? 0.18 : BAND,
    cornice: p.roof === 'flat' ? CORNICE : Math.max(0.45, p.overhang || 0.45),
  };
  return p;
}

function planHouse(lw, ld, L, rng, cls, lot) {
  const p = { kind: 'house', level: L, cls };
  const side = clamp(lw * 0.16, 1.6, 4.5);
  const front = clamp(ld * 0.3, 4, 11);
  p.wsx = rng.int(0, 900); p.wsy = rng.int(0, 900);
  p.w = clamp(lw - side * 2, 6.5, 8 + L * 1.5);
  p.d = clamp(ld - front - 2.5, 6, 7.5 + L * 1.4);
  p.floors = floorsFor(cls, L, rng, 1);
  p.floorH = 2.82 + L * 0.06;
  { const fi = rng.int(0, HOUSE_FACADES.length - 1); p.facade = HOUSE_FACADES[(lot.facadeIdx != null ? lot.facadeIdx : fi) % HOUSE_FACADES.length]; }
  p.wall = rng.pick(HOUSE_WALL);
  p.trim = rng.pick(HOUSE_TRIM);
  p.roofTile = rng.pick(ROOFS);
  p.roofKind = rng.bool(L >= 3 ? 0.5 : 0.32) ? 'hip' : 'gable';
  p.roof = p.roofKind;
  p.crown = 'pitched';
  p.ridgeAcross = rng.bool(0.5);
  p.pitch = 0.40 + L * 0.035 + rng.range(0, 0.1);
  p.overhang = rng.range(0.5, 0.85);
  p.bayW = rng.range(2.9, 3.4);
  p.bands = false;
  p.garage = L >= 3 || (L === 2 && rng.bool(0.5));
  p.garageSide = rng.bool() ? 1 : -1;
  p.garageW = clamp(Math.min(6.2, lw - p.w - side * 0.5), 0, 6.2);
  if (p.garageW < 3.2) p.garage = false;
  p.porch = L >= 2 && rng.bool(0.7);
  p.dormers = L >= 2 && rng.bool(0.55) ? rng.int(1, 2) : 0;
  p.chimney = rng.bool(L >= 2 ? 0.72 : 0.4);
  p.solar = L >= 4 && rng.bool(0.5);
  p.wing = L >= 3 && rng.bool(0.55);
  p.hedge = L >= 2 && rng.bool(0.62);
  p.fence = !p.hedge;
  p.driveway = true;
  p.deck = L >= 3 && rng.bool(0.5);
  p.frontSet = front;
  p.clutterList = [];
  p.height = p.floors * p.floorH + p.pitch * Math.min(p.w, p.d) * 0.5;
  p.zOff = setbackShift(ld, p.d, clamp(front * 0.6, 3.5, 7.5));
  p.jitter = [rng.range(-0.6, 0.6), rng.range(-0.6, 0.6), rng.range(-0.14, 0.14)];
  p.r = [rng.float(), rng.float(), rng.float(), rng.float(), rng.float(), rng.float()];
  p.chimneyOrDormer = p.chimney || p.dormers > 0;
  return p;
}

function planTownhouse(lw, ld, L, rng, cls) {
  const p = { kind: 'town', level: L, cls };
  p.wsx = rng.int(0, 900); p.wsy = rng.int(0, 900);
  p.w = clamp(lw - 1.5, 8, 30);
  p.d = clamp(ld * 0.55, 8, 13);
  p.units = clamp(Math.round(p.w / 6.2), 2, 5);
  p.floors = floorsFor(cls, L, rng, 0);
  p.floorH = 3.05;
  p.facade = rng.pick(TOWN_FACADES);
  p.wall = rng.pick(['#f0ece2', '#e5ded0', '#cfdcdd', '#eddcbc', '#dcc7b4', '#c8d5c4']);
  p.trim = '#f4f1e8';
  p.roofKind = rng.bool(0.55) ? 'gable' : 'flat';
  p.roof = p.roofKind;
  p.plan = p.roofKind === 'flat' && rng.bool(0.6) ? 'L' : 'I';
  p.cutW = p.w * rng.range(0.26, 0.36);
  p.cutD = p.d * rng.range(0.26, 0.36);
  p.crown = p.roofKind === 'gable' ? 'pitched' : (rng.bool(0.5) ? 'parapet_mech' : 'terrace');
  p.ridgeAcross = false;
  p.roofTile = rng.pick(['roof_shingle_dark', 'roof_shingle_grey', 'roof_tile_red', 'roof_seam_blue']);
  p.pitch = 0.36 + L * 0.04;
  p.overhang = 0.5;
  p.bayW = p.w / (p.units * 2);
  p.parapetH = 0.55 + L * 0.12;
  p.hedge = rng.bool(0.6);
  p.driveway = true;
  p.frontSet = clamp(ld - p.d - 2, 3, 10);
  p.clutterList = p.roofKind === 'flat' ? clutterList(rng, 2 + rng.int(0, 2), ['hvac', 'vent', 'bulkhead', 'mast', 'solar']) : [];
  p.height = p.floors * p.floorH + (p.roofKind === 'gable' ? p.pitch * p.d * 0.5 : p.parapetH);
  p.zOff = setbackShift(ld, p.d, 3.6);
  p.unitTints = Array.from({ length: p.units }, () => rng.range(0.82, 1.06));
  p.r = [rng.float(), rng.float(), rng.float(), rng.float()];
  return p;
}

function planApartment(lw, ld, L, rng, cls, lot) {
  const p = { kind: 'apt', level: L, cls };
  p.wsx = rng.int(0, 900); p.wsy = rng.int(0, 900);
  p.w = clamp(lw - rng.range(3, 6), 12, 34);
  p.d = clamp(ld - rng.range(6, 12), 11, 24);
  p.floorH = 3.0;
  p.groundH = 4.8;                       // double-height base -> groundFloorDistinct
  p.floors = floorsFor(cls, L, rng, 5);
  p.facade = rng.pick(APT_FACADES);
  p.wall = rng.pick(['#efe9dd', '#e2ddd2', '#cfdde2', '#f0dcb6', '#d8d4cc', '#dcc4b0', '#c7d5c9', '#e6d3d6']);
  p.bayW = rng.range(3.2, 3.7);
  p.balcony = rng.bool(0.86);
  p.balconyGlass = rng.bool(0.45);
  p.plan = rng.weighted([['I', 5], ['L', 3.2], ['U', 1.4]]);
  p.cutW = p.w * rng.range(0.3, 0.42);
  p.cutD = p.d * rng.range(0.3, 0.44);
  p.setback = p.floors >= 8 && rng.bool(0.65);
  p.setbackAt = Math.max(2, Math.round(p.floors * rng.range(0.6, 0.75)));
  p.setbackIn = rng.range(1.6, 3.0);
  p.roofTile = rng.pick(['roof_gravel', 'roof_membrane', 'roof_membrane_dark']);
  p.roof = 'flat';
  p.crown = CROWNS[rng.int(0, 5)];
  if (L <= 3) p.crown = rng.bool(0.5) ? 'parapet_mech' : 'terrace';
  p.parapetH = rng.range(0.85, 1.3) + L * 0.05;
  p.clutterList = clutterList(rng, 2 + rng.int(0, 3));
  p.mixedUse = !!lot?.mixedUse;
  p.groundFacade = p.mixedUse ? rng.pick(SHOPS) : (rng.bool(0.25) ? rng.pick(SHOPS) : null);
  p.retail = p.mixedUse || !!p.groundFacade;
  p.frontSet = clamp(ld - p.d - 3, 2, 12);
  p.hedge = rng.bool(0.4);
  p.height = p.groundH + (p.floors - 1) * p.floorH + p.parapetH;
  p.zOff = setbackShift(ld, p.d, 4.5);
  p.r = Array.from({ length: 12 }, () => rng.float());
  p.clutterR = Array.from({ length: 40 }, () => rng.float());
  p.balconyFloors = p.balcony ? Math.max(0, p.floors - 2) : 0;
  return p;
}

function planOfficeLow(lw, ld, L, rng, cls) {
  const p = { kind: 'officelow', level: L, cls };
  p.wsx = rng.int(0, 900); p.wsy = rng.int(0, 900);
  p.w = clamp(lw - rng.range(3, 7), 14, 34);
  p.d = clamp(ld - rng.range(6, 12), 12, 24);
  p.floors = floorsFor(cls, L, rng, 1);
  p.floorH = 3.7;
  p.groundH = 4.7;
  p.facade = rng.pick(['office_stone', 'comm_upper', 'office_glass_sky']);
  p.wall = rng.pick(['#e9e4d8', '#dcd9d2', '#e4dbc9', '#d6dbdd']);
  p.bayW = rng.range(3.0, 3.5);
  p.roofTile = rng.pick(['roof_gravel', 'roof_membrane']);
  p.roof = 'flat';
  p.crown = [null, 'parapet_mech', 'terrace', 'parapet_mech', 'setback', 'barrel_vault_or_crown'][L];
  p.plan = rng.weighted([['I', 6], ['L', 2.5]]);
  p.cutW = p.w * rng.range(0.3, 0.4);
  p.cutD = p.d * rng.range(0.3, 0.4);
  p.parapetH = rng.range(0.95, 1.4) + L * 0.06;
  p.clutterList = clutterList(rng, 2 + rng.int(0, 3));
  p.canopy = true;
  p.parking = true;
  p.frontSet = clamp(ld - p.d - 3, 3, 14);
  p.height = p.groundH + (p.floors - 1) * p.floorH + p.parapetH;
  p.zOff = setbackShift(ld, p.d, 6);
  p.r = Array.from({ length: 10 }, () => rng.float());
  p.clutterR = Array.from({ length: 40 }, () => rng.float());
  return p;
}

function planTower(lw, ld, L, rng, cls, lot) {
  const p = { kind: 'tower', level: L, cls };
  p.wsx = rng.int(0, 900); p.wsy = rng.int(0, 900);
  // a downtown lot carries a variant index so no two towers in the cluster share a silhouette
  const V = Number.isFinite(lot?.variant) ? lot.variant : rng.int(0, 1295);
  const fi = V % 6;
  const ci = Math.floor(V / 6) % 6;
  const pi = Math.floor(V / 36) % 3;
  const poi = Math.floor(V / 108) % 2;
  const wi = Math.floor(V / 216) % 6;
  p.w = clamp(lw - rng.range(3, 8) - wi * 0.9, 16, lot?.minFloors ? 48 : 40);
  p.d = clamp(ld - rng.range(4, 10) - (wi % 3) * 0.7, 14, 34);
  p.floorH = 3.85;
  p.groundH = 5.6;
  p.floors = Math.max(floorsFor(cls, L, rng, 14), lot?.minFloors && L === 5 ? lot.minFloors : 0);
  p.facade = OFFICE_FACADES[fi];
  p.baseFacade = rng.bool(0.55) ? 'office_stone' : null;
  p.wall = rng.pick(['#f4f4f2', '#e9eef0', '#dfe3e6', '#eae6dc', '#cfe0ea', '#e8e2d2']);
  p.bayW = rng.range(2.7, 3.2);
  p.crown = L >= 3 ? CROWNS[ci] : (L === 2 ? 'parapet_mech' : 'terrace');
  p.plan = ['I', 'I', 'L'][pi];
  p.cutW = p.w * rng.range(0.28, 0.38);
  p.cutD = p.d * rng.range(0.28, 0.38);
  p.chamfer = p.crown === 'chamfer' ? Math.min(p.w, p.d) * rng.range(0.14, 0.2) : 0;
  p.steps = p.crown === 'setback' ? (p.floors >= 18 ? 2 : 1) : (p.floors >= 22 && rng.bool(0.5) ? 1 : 0);
  p.stepAt = [rng.range(0.5, 0.66), rng.range(0.76, 0.88)];
  p.stepIn = [rng.range(0.1, 0.2), rng.range(0.1, 0.18)];
  p.terraces = p.crown === 'terrace' ? 3 : 0;
  p.mast = p.crown === 'spire' || (p.floors >= 14 && rng.bool(0.45));
  p.podium = rng.bool(0.55) ? true : false;
  p.podium = poi === 1;
  p.podiumFloors = rng.int(1, 2);
  p.podiumOut = rng.range(1.8, 3.6);
  p.roofTile = 'roof_membrane_dark';
  p.roof = 'flat';
  p.parapetH = rng.range(1.0, 1.6) + L * 0.05;
  p.clutterList = clutterList(rng, 2 + rng.int(0, 3));
  p.mixedUse = !!lot?.mixedUse;
  p.retail = p.mixedUse;
  p.plaza = true;
  p.frontSet = clamp(ld - p.d - 3, 3, 16);
  p.crownH = p.crown === 'spire' ? 22 : p.crown === 'barrel_vault_or_crown' ? 6.5 : p.crown === 'parapet_mech' ? 4.2 : 0;
  p.height = p.groundH + (p.floors - 1) * p.floorH + p.parapetH + p.crownH * 0.6;
  p.zOff = setbackShift(ld, p.d + (p.podium ? p.podiumOut : 0), 5.5);
  p.r = Array.from({ length: 14 }, () => rng.float());
  p.clutterR = Array.from({ length: 40 }, () => rng.float());
  p.variantKey = `${p.plan}${p.podium ? 'p' : ''}${wi}`;
  return p;
}

function planShop(lw, ld, L, rng, high, cls) {
  const p = { kind: 'shop', level: L, high, cls };
  p.wsx = rng.int(0, 900); p.wsy = rng.int(0, 900);
  p.w = clamp(lw - rng.range(1.5, 4), 10, 36);
  p.d = clamp(ld - rng.range(5, 14), 10, 26);
  p.groundH = 5.0;                       // double height -> groundFloorDistinct
  p.floorH = 3.4;
  p.floors = floorsFor(cls, L, rng, high ? 3 : 1);
  p.shop = rng.pick(SHOPS);
  p.facade = rng.pick(['comm_upper', 'office_stone', 'apt_panel', 'town_render']);
  p.wall = rng.pick(['#eae4d6', '#ded9cd', '#efd9a8', '#cdd9e2', '#e3c2ae', '#c9d6c6', '#e8dccb']);
  p.bayW = rng.range(3.4, 4.0);
  p.roofTile = rng.pick(['roof_gravel', 'roof_membrane', 'roof_membrane_dark']);
  p.roof = 'flat';
  p.crown = [null, 'parapet_mech', 'terrace', 'parapet_mech', 'setback', 'barrel_vault_or_crown'][L];
  p.parapetH = 0.9 + L * 0.16;
  p.clutterList = clutterList(rng, 2 + rng.int(0, 3), ['hvac', 'vent', 'bulkhead', 'monitor', 'solar', 'mast']);
  p.retail = true;
  p.mixedUse = false;
  p.stairBox = p.floors >= 3;
  p.parking = !high && rng.bool(0.8);
  p.frontSet = clamp(ld - p.d - 2, 1.5, 14);
  p.canopy = !high;
  p.units = p.w > 27 ? 3 : p.w > 16 ? 2 : 1;
  p.unitOff = Array.from({ length: p.units }, () => rng.int(-1, 1));
  p.unitShop = Array.from({ length: p.units }, () => rng.pick(SHOPS));
  p.unitFacade = Array.from({ length: p.units }, () => rng.weighted([['comm_upper', 5], ['apt_brick', 1.6], ['town_render', 1.2], ['apt_panel', 1.4], ['office_stone', 1]]));
  p.unitTint = Array.from({ length: p.units }, () => rng.range(0.84, 1.06));
  p.unitDepth = Array.from({ length: p.units }, () => rng.range(0.82, 1.0));
  p.unitParapet = Array.from({ length: p.units }, () => rng.range(0.75, 1.5));
  p.tallest = 0;
  for (let i = 1; i < p.units; i++) if (p.unitOff[i] > p.unitOff[p.tallest]) p.tallest = i;
  const maxOff = Math.max(...p.unitOff);
  p.height = p.groundH + Math.max(0, p.floors + maxOff - 1) * p.floorH + p.parapetH;
  p.zOff = setbackShift(ld, p.d, p.high ? 3 : 5.5);
  p.r = Array.from({ length: 10 }, () => rng.float());
  p.clutterR = Array.from({ length: 40 }, () => rng.float());
  return p;
}

function planWarehouse(lw, ld, L, rng, high, cls) {
  const p = { kind: 'ind', level: L, high, cls };
  p.wsx = rng.int(0, 900); p.wsy = rng.int(0, 900);
  p.w = clamp(lw - rng.range(3, 8), 14, 46);
  p.d = clamp(ld - rng.range(8, 18), 12, 34);
  p.floors = floorsFor(cls, L, rng, 1);
  p.floorH = (high ? [4.6, 4.0, 3.65, 3.45, 3.35] : [4.8, 5.6, 4.05, 4.55, 4.05])[L - 1];
  p.wallH = p.floors * p.floorH;
  p.facade = rng.bool(0.55) ? 'ind_metal' : 'ind_panel';
  p.wall = rng.pick(['#dfe2e2', '#d5d8d6', '#e0dcd0', '#c9d2d6', '#dfd6c6']);
  p.bayW = rng.range(3.8, 4.6);
  p.roofKind = rng.bool(0.55) ? 'shed' : 'flat';
  p.roof = p.roofKind === 'shed' ? 'shed' : 'flat';
  p.crown = p.roofKind === 'shed' ? 'monitor_ridge' : (L >= 4 ? 'parapet_mech' : 'flat_cap');
  p.roofTile = rng.pick(['roof_seam', 'roof_membrane', 'roof_gravel', 'roof_seam_blue']);
  p.parapetH = 0.5 + L * 0.12;
  p.bands = false;
  p.docks = clamp(Math.round(p.w / 9), 1, 4);
  p.dockCanopy = rng.bool(0.7);
  p.officeBox = rng.bool(0.7);
  p.silos = high ? rng.int(L >= 3 ? 1 : 0, 3) : 0;
  p.stack = high && L >= 3 && rng.bool(0.7);
  p.tanks = high && rng.bool(0.5);
  p.clutterList = p.roofKind === 'flat' ? clutterList(rng, 2 + rng.int(0, 3), ['hvac', 'vent', 'monitor', 'solar', 'mast', 'bulkhead']) : [];
  p.yard = true;
  p.fence = true;
  p.frontSet = clamp(ld - p.d - 2, 4, 18);
  p.height = p.wallH + (p.roofKind === 'shed' ? p.d * 0.08 : p.parapetH);
  p.zOff = setbackShift(ld, p.d + 8, 12);
  p.r = Array.from({ length: 12 }, () => rng.float());
  p.clutterR = Array.from({ length: 40 }, () => rng.float());
  return p;
}

// ------------------------------------------------------------------ shared emitters
// Facade relief is BUILT, not painted. A storey is either
//   full mode  — the wall sits on the nominal face and the glazing is recessed REVEAL metres behind
//                it, with head, cill and both jamb planes closing the opening, or
//   banded mode — the whole glazing plane is recessed and vertical piers plus projecting floor bands
//                come back out to the face, so every floor has a shadow line under it and every bay
//                a jamb shadow (cs2_1). Tall buildings use full mode for the storeys the street sees
//                and banded mode above, which is what keeps the triangle count sane.

export const REVEAL = 0.14;     // glazing plane behind the wall face (m) — item 1 wants >= 0.10
export const BAND = 0.07;       // floor band projection past the wall face (m) — item 1 wants >= 0.04
export const PIER = 0.055;      // vertical pier projection past the wall face (m)
export const CORNICE = 0.20;    // parapet cap overhang (m) — item 1 wants >= 0.15
const FULL_CELL_BUDGET = 140;   // per building, LOD0
let LOD = 0;
export function setLod(l) { LOD = l; }

export function rectOutline(w, d) {
  const hw = w / 2, hd = d / 2;
  return [[-hw, hd], [hw, hd], [hw, -hd], [-hw, -hd]];
}
export function chamferOutline(w, d, c) {
  const hw = w / 2, hd = d / 2;
  c = Math.max(0.6, Math.min(c, Math.min(hw, hd) * 0.55));
  return [[-hw + c, hd], [hw - c, hd], [hw, hd - c], [hw, -hd + c], [hw - c, -hd], [-hw + c, -hd], [-hw, -hd + c], [-hw, hd - c]];
}
export function lOutline(w, d, cw, cd) {
  const hw = w / 2, hd = d / 2;
  cw = clamp(cw, 2, w * 0.55); cd = clamp(cd, 2, d * 0.55);
  return [[-hw, hd], [hw, hd], [hw, -hd], [-hw + cw, -hd], [-hw + cw, -hd + cd], [-hw, -hd + cd]];
}
export function uOutline(w, d, cw, cd) {
  const hw = w / 2, hd = d / 2;
  cw = clamp(cw, 2, w * 0.4); cd = clamp(cd, 2, d * 0.5);
  return [[-hw, hd], [hw, hd], [hw, -hd], [hw - cw, -hd], [hw - cw, -hd + cd], [-hw + cw, -hd + cd], [-hw + cw, -hd], [-hw, -hd]];
}
export function outlineFor(p, scale = 1) {
  let poly;
  if (p.chamfer > 0) poly = chamferOutline(p.w, p.d, p.chamfer);
  else if (p.plan === 'L') poly = lOutline(p.w, p.d, p.cutW, p.cutD);
  else if (p.plan === 'U') poly = uOutline(p.w, p.d, p.cutW, p.cutD);
  else poly = rectOutline(p.w, p.d);
  return scale === 1 ? poly : poly.map(([x, z]) => [x * scale, z * scale]);
}
function polyCentroid(poly) {
  let x = 0, z = 0;
  for (const p of poly) { x += p[0]; z += p[1]; }
  return [x / poly.length, z / poly.length];
}
/** an inset copy of a convex-ish outline (setbacks, terraces) */
function insetPoly(poly, k) {
  const [cx, cz] = polyCentroid(poly);
  return poly.map(([x, z]) => {
    const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1;
    const s = Math.max(0.15, (l - k) / l);
    return [cx + dx * s, cz + dz * s];
  });
}

/** deterministic integer hash -> index into the building's rng-drawn table */
function ih(a, b) { return (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ 0x9e3779b9) >>> 0; }
const TIERS = [0.26, 0.52, 0.86, 1.30];

/**
 * Bake one window cell's night state onto the builder. Every value comes from `tab`, which the plan
 * drew from ctx.rng — nothing is hashed in the shader, so a cell can never flicker per pixel.
 */
function setWin(mb, tab, hx, hy, coolT, bias, record) {
  const h = ih(hx, hy);
  const r = tab[h % tab.length];
  const t = tab[(h >> 7) % tab.length];
  const c = tab[(h >> 14) % tab.length];
  const tier = TIERS[(h >> 21) & 3] * (0.85 + 0.3 * t);
  const cool = c > coolT ? 1 : 0;
  mb.winState(r, tier, cool, bias);
  if (record && mb.cells) mb.cells.push(r, tier, cool, bias);
}

function edgesOf(poly, faces) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz);
    if (L < 0.5) continue;
    if (faces && faces[i] === 0) continue;
    out.push({ a, ux: dx / L, uz: dz / L, nx: -dz / L, nz: dx / L, L, i });
  }
  return out;
}

/**
 * Facade walls with built relief.
 * o = { w, d, poly?, y0, floors, floorH, groundH?, bayW, facade, groundTile?, groundBayW?,
 *       wsx, wsy, lod, faces?, wtab, bias, coolT, bands?, fullBudget? }
 */
function walls(mb, A, o) {
  const near = o.lod === 0;
  const poly = o.poly || rectOutline(o.w, o.d);
  const gh = o.groundH || 0;
  const upFloors = Math.max(0, (o.floors || 1) - (gh > 0 ? 1 : 0));
  const floorH = o.floorH;
  const tab = o.wtab || DEFAULT_TAB;
  const bias = o.bias ?? 1;
  const coolT = o.coolT ?? 0.5;

  const st = [];
  if (gh > 0) st.push({ y: o.y0, h: gh, facade: o.groundTile || o.facade, bayW: o.groundBayW || o.bayW, ground: true });
  for (let f = 0; f < upFloors; f++) st.push({ y: o.y0 + gh + f * floorH, h: floorH, facade: o.facade, bayW: o.bayW });
  if (!st.length) return;
  const yTop = st[st.length - 1].y + st[st.length - 1].h;
  const edges = edgesOf(poly, o.faces);
  if (!edges.length) return;

  if (!near) {
    // LOD1: a coarse quad grid on the row tile — same colour, same silhouette, no relief, and still
    // one baked window state per quad so a far city lights up in blocks rather than as flat slabs.
    const row = A.rect(`${o.facade}_row`);
    const H = yTop - o.y0;
    for (const e of edges) {
      const bays = clamp(Math.round(e.L / o.bayW), 1, 26);
      const nu = Math.max(1, Math.ceil(bays / 3)), nv = Math.max(1, Math.min(10, Math.ceil(st.length / 2)));
      const du = e.L / nu, dv = H / nv;
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        setWin(mb, tab, o.wsx + e.i * 31 + i, o.wsy + j, coolT, bias, false);
        const x0 = e.a[0] + e.ux * du * i, z0 = e.a[1] + e.uz * du * i;
        const x1 = e.a[0] + e.ux * du * (i + 1), z1 = e.a[1] + e.uz * du * (i + 1);
        const y0 = o.y0 + dv * j, y1 = o.y0 + dv * (j + 1);
        mb.quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], row);
      }
    }
    mb.noWin();
    return;
  }

  // how many storeys can afford the nine-quad treatment
  let perStorey = 0;
  for (const e of edges) perStorey += clamp(Math.round(e.L / o.bayW), 1, 26);
  const budget = o.fullBudget ?? FULL_CELL_BUDGET;
  const sFull = clamp(Math.floor(budget / Math.max(1, perStorey)), 1, st.length);

  const coarseFrom = 8;
  for (let s = 0; s < st.length; s++) {
    if (s >= coarseFrom && (s - coarseFrom) % 2 === 1) continue;
    const S = st[s];
    const merged = s >= coarseFrom && s + 1 < st.length ? 2 : 1;
    S.h = (S.h0 ?? (S.h0 = S.h)) * merged;
    const full = s < sFull;
    const g = facadeGeom(S.facade);
    const tv = [A.rect(`${S.facade}_a`), A.rect(`${S.facade}_b`), A.rect(`${S.facade}_c`)];
    const rev = full ? REVEAL : REVEAL;
    for (const e of edges) {
      const bays = clamp(Math.round(e.L / S.bayW), 1, 26);
      const bw = e.L / bays;
      const P = (t, y, off) => [e.a[0] + e.ux * t + e.nx * off, y, e.a[1] + e.uz * t + e.nz * off];
      for (let i = 0; i < bays; i++) {
        const t0 = i * bw, t1 = t0 + bw;
        const hv = ih(o.wsx + e.i * 17 + i, o.wsy + s * 5);
        const tile = tv[hv % 3];
        setWin(mb, tab, o.wsx + e.i * 31 + i, o.wsy + s, coolT, bias, true);
        if (!full) {
          mb.quad(P(t0, S.y, -rev), P(t1, S.y, -rev), P(t1, S.y + S.h, -rev), P(t0, S.y + S.h, -rev), tile);
          mb.noWin();
          continue;
        }
        const wx0 = t0 + g.x * bw, wx1 = t0 + (g.x + g.w) * bw;
        const wy1 = S.y + S.h * (1 - g.y);
        const wy0 = S.y + S.h * (1 - g.y - g.h);
        const su = [g.x, 1 - g.y - g.h, g.x + g.w, 1 - g.y];
        // recessed glazing
        mb.quad(P(wx0, wy0, -rev), P(wx1, wy0, -rev), P(wx1, wy1, -rev), P(wx0, wy1, -rev), tile, su);
        mb.noWin();
        // wall around the opening, on the nominal face
        mb.quad(P(t0, S.y, 0), P(t1, S.y, 0), P(t1, wy0, 0), P(t0, wy0, 0), tile, [0, 0, 1, su[1]]);
        mb.quad(P(t0, wy1, 0), P(t1, wy1, 0), P(t1, S.y + S.h, 0), P(t0, S.y + S.h, 0), tile, [0, su[3], 1, 1]);
        mb.quad(P(t0, wy0, 0), P(wx0, wy0, 0), P(wx0, wy1, 0), P(t0, wy1, 0), tile, [0, su[1], g.x, su[3]]);
        mb.quad(P(wx1, wy0, 0), P(t1, wy0, 0), P(t1, wy1, 0), P(wx1, wy1, 0), tile, [g.x + g.w, su[1], 1, su[3]]);
        // reveals: head faces down, cill faces up, jambs face into the opening
        const sl = 0.03;
        mb.quad(P(wx0, wy1, -rev), P(wx1, wy1, -rev), P(wx1, wy1, 0), P(wx0, wy1, 0), tile, [g.x, su[3], g.x + g.w, Math.min(1, su[3] + sl)]);
        mb.quad(P(wx0, wy0, 0), P(wx1, wy0, 0), P(wx1, wy0, -rev), P(wx0, wy0, -rev), tile, [g.x, Math.max(0, su[1] - sl), g.x + g.w, su[1]]);
        mb.quad(P(wx0, wy0, 0), P(wx0, wy0, -rev), P(wx0, wy1, -rev), P(wx0, wy1, 0), tile, [Math.max(0, g.x - 0.04), su[1], g.x, su[3]]);
        mb.quad(P(wx1, wy0, -rev), P(wx1, wy0, 0), P(wx1, wy1, 0), P(wx1, wy1, -rev), tile, [g.x + g.w, su[1], Math.min(1, g.x + g.w + 0.04), su[3]]);
      }
    }
  }
  mb.noWin();

  // piers over the banded storeys — their sides are the jamb shadows of every bay above the base
  if (sFull < st.length) {
    const yA = st[sFull].y, yB = yTop;
    const pt = A.rect(o.pierTile || 'wall_concrete');
    for (const e of edges) {
      const bays = clamp(Math.round(e.L / o.bayW), 1, 26);
      const bw = e.L / bays;
      const pw = Math.min(0.42, bw * 0.14);
      for (let i = 0; i <= bays; i++) {
        const t = clamp(i * bw, pw / 2, e.L - pw / 2);
        const P = (tt, y, off) => [e.a[0] + e.ux * tt + e.nx * off, y, e.a[1] + e.uz * tt + e.nz * off];
        const a = t - pw / 2, b = t + pw / 2;
        mb.quad(P(a, yA, PIER), P(b, yA, PIER), P(b, yB, PIER), P(a, yB, PIER), pt);
        mb.quad(P(a, yA, -REVEAL), P(a, yA, PIER), P(a, yB, PIER), P(a, yB, -REVEAL), pt);
        mb.quad(P(b, yA, PIER), P(b, yA, -REVEAL), P(b, yB, -REVEAL), P(b, yB, PIER), pt);
      }
    }
  }

  // projecting floor bands: a shadow line under every storey (cs2_1)
  if (o.bands !== false) {
    const bt = A.rect(o.bandTile || 'wall_concrete');
    const every = st.length > 30 ? 3 : st.length > 18 ? 2 : 1;
    for (let s = 1; s < st.length; s += every) bandRing(mb, bt, edges, st[s].y - 0.16, 0.34, BAND);
    if (st.length > 1 && gh > 0) bandRing(mb, bt, edges, st[1].y - 0.24, 0.46, BAND + 0.05);
  }
}

/** a projecting horizontal band following an outline: face, underside and top */
function bandRing(mb, tile, edges, y, h, out) {
  for (const e of edges) {
    const P = (t, yy, off) => [e.a[0] + e.ux * t + e.nx * off, yy, e.a[1] + e.uz * t + e.nz * off];
    const n = clamp(Math.round(e.L / 26), 1, 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * e.L, b = ((i + 1) / n) * e.L;
      mb.quad(P(a, y, out), P(b, y, out), P(b, y + h, out), P(a, y + h, out), tile);
      mb.quad(P(a, y, -0.01), P(b, y, -0.01), P(b, y, out), P(a, y, out), tile);       // underside (faces down)
      mb.quad(P(a, y + h, out), P(b, y + h, out), P(b, y + h, -0.01), P(a, y + h, -0.01), tile); // top
    }
  }
}

/** parapet ring on a flat roof: an upstand plus a coping cap that overhangs on both sides */
function parapet(mb, A, poly, yTop, h, outTile, capTile) {
  const edges = edgesOf(poly, null);
  const t = 0.3;
  if (LOD !== 0) {
    for (const e of edges) {
      const P = (tt, y, off) => [e.a[0] + e.ux * tt + e.nx * off, y, e.a[1] + e.uz * tt + e.nz * off];
      mb.quad(P(0, yTop, 0), P(e.L, yTop, 0), P(e.L, yTop + h + 0.14, 0), P(0, yTop + h + 0.14, 0), outTile);
      mb.quad(P(0, yTop + h + 0.14, -t), P(e.L, yTop + h + 0.14, -t), P(e.L, yTop + h + 0.14, CORNICE), P(0, yTop + h + 0.14, CORNICE), capTile);
    }
    return;
  }
  for (const e of edges) {
    const P = (tt, y, off) => [e.a[0] + e.ux * tt + e.nx * off, y, e.a[1] + e.uz * tt + e.nz * off];
    const n = clamp(Math.round(e.L / 26), 1, 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * e.L, b = ((i + 1) / n) * e.L;
      mb.quad(P(a, yTop, 0), P(b, yTop, 0), P(b, yTop + h, 0), P(a, yTop + h, 0), outTile);           // outer
      mb.quad(P(b, yTop, -t), P(a, yTop, -t), P(a, yTop + h, -t), P(b, yTop + h, -t), outTile);       // inner
      // coping cap: overhangs CORNICE outside and t inside, with a visible cap thickness
      const cy = yTop + h;
      mb.quad(P(a, cy, CORNICE), P(b, cy, CORNICE), P(b, cy + 0.14, CORNICE), P(a, cy + 0.14, CORNICE), capTile);
      mb.quad(P(a, cy, 0), P(b, cy, 0), P(b, cy, CORNICE), P(a, cy, CORNICE), capTile);
      mb.quad(P(a, cy + 0.14, CORNICE), P(b, cy + 0.14, CORNICE), P(b, cy + 0.14, -t - 0.08), P(a, cy + 0.14, -t - 0.08), capTile);
      mb.quad(P(b, cy, -t - 0.08), P(a, cy, -t - 0.08), P(a, cy + 0.14, -t - 0.08), P(b, cy + 0.14, -t - 0.08), capTile);
    }
  }
}

/** roof deck over an outline (triangle fan from the centroid) */
function roofDeck(mb, tile, poly, y) {
  const [cx, cz] = polyCentroid(poly);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    mb.tri([cx, y, cz], [a[0], y, a[1]], [b[0], y, b[1]], tile, [0.5, 0.5], [0, 0], [1, 0]);
  }
}

/** roof deck + parapet with a real cap + rooftop clutter */
function flatRoof(mb, A, p, o) {
  const poly = o.poly || rectOutline(o.w, o.d);
  roofDeck(mb, A.rect(o.roofTile), poly, o.y);
  if (o.parapetH > 0) parapet(mb, A, poly, o.y, o.parapetH, A.rect(o.parapetTile || 'wall_concrete'), A.rect(o.capTile || 'trim_grey'));
  roofClutter(mb, A, p, o);
}

// every piece is a (kind, size-tier) token; the multiset is what item 6 compares between neighbours
const CLUTTER_KINDS = ['hvac', 'tank', 'bulkhead', 'vent', 'monitor', 'solar', 'mast'];

function roofClutter(mb, A, p, o) {
  const near = o.lod === 0;
  const list = o.clutterList || p.clutterList || [];
  if (!list.length) return;
  const R = p.clutterR || p.r;
  const metal = A.rect('metal_light'), dark = A.rect('metal_dark'), ribbed = A.rect('metal_ribbed');
  const hw = o.w / 2 - 1.8, hd = o.d / 2 - 1.8;
  let k = 0;
  const rr = () => R[(k++) % R.length];
  const n = near ? list.length : Math.min(list.length, 1);
  for (let i = 0; i < n; i++) {
    const [kind, tier] = list[i];
    const sc = 0.7 + tier * 0.42;
    const x = (rr() * 2 - 1) * Math.max(0.3, hw * 0.82), z = (rr() * 2 - 1) * Math.max(0.3, hd * 0.82);
    switch (kind) {
      case 'hvac': {
        const bw = (1.5 + rr() * 1.6) * sc, bd = (1.2 + rr() * 1.3) * sc, bh = (0.8 + rr() * 0.7) * sc;
        mb.colorHex(i % 3 === 0 ? '#cfd3d4' : '#b8bec1');
        mb.box(x, o.y + 0.06, z, bw, bh, bd, { side: ribbed, top: metal }, 2.0);
        mb.colorHex('#8d9498');
        mb.box(x, o.y + 0.06 + bh, z, bw * 0.5, 0.18, bd * 0.5, { side: dark, top: dark }, 2.0);
        break;
      }
      case 'tank': {
        mb.colorHex('#8b8b8b');
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mb.box(x + dx * 1.0 * sc, o.y + 0.05, z + dz * 1.0 * sc, 0.22, 2.4 * sc, 0.22, { side: dark }, 3);
        mb.colorHex('#a08054');
        mb.cylinder(x, o.y + 2.45 * sc, z, 1.6 * sc, 2.8 * sc, 12, A.rect('wood_tank'), dark);
        mb.colorHex('#7a5f42');
        mb.cylinder(x, o.y + 5.25 * sc, z, 1.6 * sc, 0.85, 12, A.rect('wood_tank'), A.rect('wood_tank'));
        break;
      }
      case 'bulkhead': {
        mb.colorHex('#ded9cf');
        const sw = Math.min(4.6, o.w * 0.3) * sc, sd = Math.min(4.0, o.d * 0.32) * sc;
        mb.box(x * 0.6, o.y + 0.05, z * 0.6, sw, 2.5 + sc, sd, { side: A.rect('wall_concrete'), top: A.rect('roof_membrane') }, 2.5);
        break;
      }
      case 'vent': {
        mb.colorHex('#c6cacb');
        for (let v = 0; v < 3; v++) mb.cylinder(x + v * 0.9 * sc, o.y + 0.05, z, 0.26 + rr() * 0.18, (0.6 + rr() * 0.7) * sc, 8, metal, metal);
        break;
      }
      case 'monitor': {
        mb.colorHex('#b6babc');
        const mw = Math.min(o.w * 0.62, 12) * sc;
        mb.box(x * 0.3, o.y + 0.05, z * 0.5, mw, 1.1 * sc, 1.9 * sc, { side: A.rect('glass_plain'), top: metal }, 2.0);
        break;
      }
      case 'solar': {
        mb.colorHex('#ffffff');
        const pw = Math.min(o.w * 0.5, 9) * sc, pd = Math.min(o.d * 0.3, 4.5) * sc;
        const px = x * 0.4, pz = z * 0.4;
        mb.quad([px - pw / 2, o.y + 0.35, pz + pd / 2], [px + pw / 2, o.y + 0.35, pz + pd / 2],
          [px + pw / 2, o.y + 0.95, pz - pd / 2], [px - pw / 2, o.y + 0.95, pz - pd / 2], A.rect('solar'));
        break;
      }
      default: { // mast
        mb.colorHex('#b4b8ba');
        const mh = (4.5 + rr() * 4) * sc;
        mb.box(x, o.y + 0.05, z, 0.18, mh, 0.18, { side: metal }, 4);
        mb.box(x, o.y + mh * 0.7, z, 1.5, 0.1, 0.1, { side: metal }, 4);
        mb.box(x, o.y + mh * 0.86, z, 1.0, 0.1, 0.1, { side: metal }, 4);
        break;
      }
    }
  }
  mb.colorHex('#ffffff');
}

/** pitched roof (gable / hip) with eave overhang, fascia and soffit */
function pitchedRoof(mb, A, o) {
  const tile = A.rect(o.roofTile);
  const oh = o.overhang;
  const swap = !!o.ridgeAcross;
  const W = (swap ? o.d : o.w) + oh * 2, D = (swap ? o.w : o.d) + oh * 2;
  const hw = W / 2, hd = D / 2;
  const ye = o.y;
  const rise = o.pitch * Math.min(W, D) * 0.5;
  const yr = ye + rise;
  const step = LOD === 0 ? 2.6 : 1e6;
  const S = (x, y, z) => (swap ? [z, y, -x] : [x, y, z]);
  if (LOD === 0) {
    mb.colorHex(o.trim || '#e8e4d9');
    // soffit closes the underside of the overhang
    mb.grid(S(-hw, ye - 0.02, -hd), swap ? [0, 0, -1] : [1, 0, 0], swap ? [1, 0, 0] : [0, 0, 1], W, D,
      Math.max(1, Math.round(W / 3)), Math.max(1, Math.round(D / 3)), A.rect('trim_white'));
    const ft = A.rect('trim_white');
    const bx = (cx, cz, bw, bh, bd) => { const q = S(cx, 0, cz); mb.box(q[0], ye, q[2], swap ? bd : bw, bh, swap ? bw : bd, { side: ft, top: ft }, 2.5); };
    bx(0, hd - 0.09, W, 0.3, 0.2);
    bx(0, -hd + 0.09, W, 0.3, 0.2);
    bx(hw - 0.09, 0, 0.2, 0.3, D - 0.4);
    bx(-hw + 0.09, 0, 0.2, 0.3, D - 0.4);
  }
  mb.colorHex(o.roofTint || '#ffffff');
  if (o.kind === 'hip') {
    const rl = Math.max(0.6, W - D);
    const rx0 = -rl / 2, rx1 = rl / 2;
    const nu = Math.max(1, Math.round(W / step)), nv = Math.max(1, Math.round((D / 2) / step));
    mb.slope(S(-hw, ye, hd), S(hw, ye, hd), S(rx1, yr, 0), S(rx0, yr, 0), tile, nu, nv);
    mb.slope(S(hw, ye, -hd), S(-hw, ye, -hd), S(rx0, yr, 0), S(rx1, yr, 0), tile, nu, nv);
    mb.tri(S(hw, ye, hd), S(hw, ye, -hd), S(rx1, yr, 0), tile, [0, 0], [1, 0], [0.5, 1]);
    mb.tri(S(-hw, ye, -hd), S(-hw, ye, hd), S(rx0, yr, 0), tile, [0, 0], [1, 0], [0.5, 1]);
  } else {
    const nu = Math.max(1, Math.round(W / step)), nv = Math.max(1, Math.round((D / 2) / step));
    mb.slope(S(-hw, ye, hd), S(hw, ye, hd), S(hw, yr, 0), S(-hw, yr, 0), tile, nu, nv);
    mb.slope(S(hw, ye, -hd), S(-hw, ye, -hd), S(-hw, yr, 0), S(hw, yr, 0), tile, nu, nv);
    mb.colorHex(o.wallTint || '#ffffff');
    const gt = A.rect(o.gableTile || 'wall_siding');
    mb.tri(S(hw - oh, ye, hd - oh), S(hw - oh, ye, -hd + oh), S(hw - oh, yr, 0), gt, [0, 0], [1, 0], [0.5, 1]);
    mb.tri(S(-hw + oh, ye, -hd + oh), S(-hw + oh, ye, hd - oh), S(-hw + oh, yr, 0), gt, [0, 0], [1, 0], [0.5, 1]);
  }
  mb.colorHex('#ffffff');
  return yr;
}

/** foundation skirt so a building on a slope never floats; carries the base AO, never a black wall */
function skirt(mb, A, w, d, drop, poly) {
  if (drop <= 0.05) return;
  mb.colorHex('#b3aea5');
  mb.baseAO(-drop, drop + 0.9, 0.5);
  const p = poly || rectOutline(w, d);
  const edges = edgesOf(p, null);
  const tile = A.rect('concrete_slab');
  for (const e of edges) {
    const P = (t, y) => [e.a[0] + e.ux * t + e.nx * 0.06, y, e.a[1] + e.uz * t + e.nz * 0.06];
    const n = LOD === 0 ? clamp(Math.round(e.L / 5), 1, 8) : 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * e.L, b = ((i + 1) / n) * e.L;
      mb.quad(P(a, -drop), P(b, -drop), P(b, 0.06), P(a, 0.06), tile);
    }
  }
  mb.clearAO();
  mb.colorHex('#ffffff');
}

/**
 * The lit retail base (item 4 / cs2_8): double-height glazing, a lit interior card behind it and an
 * illuminated fascia sign, plus a projecting blade sign on the frontage.
 */
function retailBase(mb, A, p, o) {
  const poly = o.poly || rectOutline(o.w, o.d);
  const edges = edgesOf(poly, o.faces);
  const gh = o.groundH;
  const inner = A.rect(p.warmShop ? 'interior_warm' : 'interior_cool');
  const sign = A.rect(`sign_${p.signIdx % 6}`);
  const conc = A.rect('wall_concrete');
  const dark = A.rect('trim_dark');
  const y0 = o.y0 ?? 0;
  const gy0 = y0 + 0.62, gy1 = y0 + gh - 1.15;
  const REC = 0.40;                       // the shopfront glazing sits a real 0.40 m behind the pier line
  for (const e of edges) {
    const P = (t, y, off) => [e.a[0] + e.ux * t + e.nx * off, y, e.a[1] + e.uz * t + e.nz * off];
    const n = clamp(Math.round(e.L / 5.5), 1, 8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * e.L + 0.16, b = ((i + 1) / n) * e.L - 0.16;
      // the glazed shopfront: interior, reflection and mullions in one recessed plane
      mb.winState(0.985, 1.22, p.warmShop ? 0 : 1, 1.0);
      if (mb.cells) mb.cells.push(0.985, 1.22, p.warmShop ? 0 : 1, 1.0);
      mb.quad(P(a, gy0, -REC), P(b, gy0, -REC), P(b, gy1, -REC), P(a, gy1, -REC), inner);
      mb.noWin();
      // head, cill and jamb reveals close the opening
      mb.quad(P(a, gy1, -REC), P(b, gy1, -REC), P(b, gy1, 0.02), P(a, gy1, 0.02), conc);
      mb.quad(P(a, gy0, 0.02), P(b, gy0, 0.02), P(b, gy0, -REC), P(a, gy0, -REC), conc);
      mb.quad(P(a, gy0, 0.02), P(a, gy0, -REC), P(a, gy1, -REC), P(a, gy1, 0.02), conc);
      mb.quad(P(b, gy0, -REC), P(b, gy0, 0.02), P(b, gy1, 0.02), P(b, gy1, -REC), conc);
      // pier between shop bays
      if (i < n - 1) mb.quad(P(b, y0, 0.03), P(b + 0.32, y0, 0.03), P(b + 0.32, gy1 + 0.1, 0.03), P(b, gy1 + 0.1, 0.03), conc);
    }
    // bulkhead below the glass, and the pavement it meets
    mb.quad(P(0.1, y0, 0.03), P(e.L - 0.1, y0, 0.03), P(e.L - 0.1, gy0, 0.03), P(0.1, gy0, 0.03), conc);
    // illuminated fascia sign band running the frontage
    const fy = y0 + gh - 1.08;
    mb.winState(0.985, 1.0, 0, 1.0);
    mb.quad(P(0.1, fy, 0.30), P(e.L - 0.1, fy, 0.30), P(e.L - 0.1, fy + 0.82, 0.30), P(0.1, fy + 0.82, 0.30), sign);
    mb.noWin();
    mb.quad(P(0.1, fy, 0.30), P(e.L - 0.1, fy, 0.30), P(e.L - 0.1, fy, -0.01), P(0.1, fy, -0.01), dark);
    mb.quad(P(0.1, fy + 0.82, -0.01), P(e.L - 0.1, fy + 0.82, -0.01), P(e.L - 0.1, fy + 0.82, 0.30), P(0.1, fy + 0.82, 0.30), dark);
  }
  // a projecting blade sign on the frontage
  if (edges.length) {
    const e = edges[0];
    const P = (t, y, off) => [e.a[0] + e.ux * t + e.nx * off, y, e.a[1] + e.uz * t + e.nz * off];
    const t = e.L * 0.22, by = y0 + gh - 3.2;
    mb.winState(0.985, 1.1, 1, 1.0);
    mb.quad(P(t, by, 0.32), P(t, by, 1.7), P(t, by + 1.8, 1.7), P(t, by + 1.8, 0.32), sign);
    mb.quad(P(t + 0.12, by, 1.7), P(t + 0.12, by, 0.32), P(t + 0.12, by + 1.8, 0.32), P(t + 0.12, by + 1.8, 1.7), sign);
    mb.noWin();
    mb.colorHex('#9aa0a4');
    mb.quad(P(t, by + 1.8, 0.32), P(t, by + 1.8, 1.7), P(t + 0.12, by + 1.8, 1.7), P(t + 0.12, by + 1.8, 0.32), A.rect('metal_dark'));
    mb.colorHex('#ffffff');
  }
}

/** entrance canopy + doors on the frontage edge */
function entrance(mb, A, p, o) {
  const w = Math.min(o.w * 0.34, 6.5);
  mb.colorHex('#ffffff');
  mb.grid([-w / 2, (o.y0 || 0) + 0.05, o.d / 2 + 0.05], [1, 0, 0], [0, 1, 0], w, Math.min(3.1, o.groundH - 0.6),
    Math.max(1, Math.round(w / 3)), 1, A.rect(o.doorTile || 'door_entrance'));
  mb.colorHex('#c4c8ca');
  mb.box(0, (o.y0 || 0) + o.groundH - 1.15, o.d / 2 + 1.35, w + 1.8, 0.3, 2.7, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 3);
  for (const s of [-1, 1]) mb.box(s * (w / 2 + 0.6), (o.y0 || 0), o.d / 2 + 2.5, 0.18, o.groundH - 1.15, 0.18, { side: A.rect('metal_light') }, 3);
  mb.colorHex('#ffffff');
}


// ------------------------------------------------------------------ archetypes
const BASE_AO_H = 2.2, BASE_AO_K = 0.20;   // item 9: the bottom of every wall darkens into the ground

/** which edges carry a shopfront: the street frontage, and on a chamfered corner the return too */
function retailFaces(poly, near) {
  const f = new Array(poly.length).fill(0);
  f[0] = 1;
  if (near && poly.length === 8) { f[1] = 1; f[2] = 1; }
  else if (near && poly.length === 4) f[1] = 1;
  return f;
}

/**
 * Crown treatments (item 2). Each is real mass on top of the shaft, emitted at BOTH LODs so a tower
 * never changes silhouette when it switches (item 16).
 */
function emitCrown(mb, A, p, poly, yTop, kind, w, d) {
  const light = A.rect('metal_light'), dark = A.rect('metal_dark'), conc = A.rect('wall_concrete');
  switch (kind) {
    case 'parapet_mech': {
      mb.colorHex('#dcdcd6');
      const mw = w * 0.52, md = d * 0.52;
      mb.box(0, yTop, 0, mw, 4.2, md, { side: A.rect('metal_ribbed'), top: A.rect('roof_membrane_dark') }, 3);
      mb.colorHex('#b6babc');
      mb.box(0, yTop + 4.2, 0, mw * 0.55, 0.8, md * 0.55, { side: dark, top: dark }, 2);
      mb.colorHex('#ffffff');
      break;
    }
    case 'setback': {
      mb.colorHex('#e6e6e0');
      mb.box(0, yTop, 0, w * 0.7, 3.4, d * 0.7, { side: conc, top: A.rect('roof_membrane_dark') }, 3);
      mb.colorHex('#d8d8d2');
      mb.box(0, yTop + 3.4, 0, w * 0.42, 2.6, d * 0.42, { side: conc, top: A.rect('roof_membrane_dark') }, 3);
      mb.colorHex('#ffffff');
      break;
    }
    case 'chamfer': {
      // a chamfered attic storey that follows the cut corners, capped with a metal collar
      const cp = chamferOutline(w * 0.94, d * 0.94, Math.min(w, d) * 0.17);
      mb.colorHex('#e2e6e8');
      wallBand(mb, cp, yTop, 3.2, light);
      roofDeck(mb, A.rect('roof_membrane_dark'), cp, yTop + 3.2);
      mb.colorHex('#aeb4b7');
      wallBand(mb, chamferOutline(w * 1.02, d * 1.02, Math.min(w, d) * 0.18), yTop + 3.2, 0.55, dark);
      mb.colorHex('#ffffff');
      break;
    }
    case 'spire': {
      mb.colorHex('#dfe3e5');
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const k = 1 - i / steps;
        mb.box(0, yTop + i * 2.6, 0, w * 0.5 * k + 1.2, 2.6, d * 0.5 * k + 1.2, { side: light, top: dark }, 3);
      }
      mb.colorHex('#c2c6c8');
      mb.box(0, yTop + steps * 2.6, 0, 0.55, 12, 0.55, { side: light }, 5);
      mb.box(0, yTop + steps * 2.6 + 12, 0, 0.22, 5, 0.22, { side: light }, 5);
      mb.colorHex('#ffffff');
      break;
    }
    case 'terrace': {
      mb.colorHex('#e4e2da');
      for (let i = 0; i < 3; i++) {
        const k = 0.86 - i * 0.2;
        const tp = insetPoly(poly, (1 - k) * Math.min(w, d) * 0.5);
        wallBand(mb, tp, yTop + i * 3.1, 3.1, conc);
        roofDeck(mb, A.rect('roof_membrane'), tp, yTop + (i + 1) * 3.1);
        parapet(mb, A, tp, yTop + (i + 1) * 3.1, 0.95, conc, A.rect('trim_grey'));
      }
      mb.colorHex('#ffffff');
      break;
    }
    case 'barrel_vault_or_crown': {
      // a barrel vault sitting on the parapet: eight facets across the short axis
      const seg = 8, r = Math.min(w, d) * 0.5;
      mb.colorHex('#cfd6d9');
      for (let i = 0; i < seg; i++) {
        const a0 = Math.PI * (i / seg), a1 = Math.PI * ((i + 1) / seg);
        const z0 = -Math.cos(a0) * r, y0 = Math.sin(a0) * r * 0.72;
        const z1 = -Math.cos(a1) * r, y1 = Math.sin(a1) * r * 0.72;
        mb.quad([w / 2, yTop + y0, z0], [-w / 2, yTop + y0, z0], [-w / 2, yTop + y1, z1], [w / 2, yTop + y1, z1], A.rect('roof_seam'), null);
      }
      mb.colorHex('#b8bec1');
      for (const sx of [-1, 1]) mb.box(sx * w / 2, yTop, 0, 0.3, r * 0.72, d, { side: light, top: light }, 3);
      mb.colorHex('#ffffff');
      break;
    }
    default: break;
  }
}

/** a plain wall band following an outline (crowns, attic storeys) */
function wallBand(mb, poly, y, h, tile) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.4) continue;
    mb.quad([a[0], y, a[1]], [b[0], y, b[1]], [b[0], y + h, b[1]], [a[0], y + h, a[1]], tile);
  }
}

function emitHouse(mb, A, p, lod) {
  const near = lod === 0;
  const bodyH = p.floors * p.floorH;
  const poly = rectOutline(p.w, p.d);
  mb.colorHex(p.wall);
  mb.baseAO(0, BASE_AO_H, BASE_AO_K);
  walls(mb, A, {
    w: p.w, d: p.d, poly, y0: 0, floors: p.floors, floorH: p.floorH, bayW: p.bayW, facade: p.facade,
    wsx: p.wsx, wsy: p.wsy, lod, wtab: p.wtab, bias: p.bias, coolT: p.coolT, bands: false, fullBudget: 400,
  });
  mb.clearAO();
  if (near) {
    mb.colorHex('#ffffff');
    mb.grid([-0.58 + p.w * 0.18, 0, p.d / 2 + 0.05], [1, 0, 0], [0, 1, 0], 1.16, 2.35, 1, 1, A.rect('door_entrance'));
  }
  if (p.wing) {
    const ww = p.w * 0.55, wd = p.d * 0.45;
    const cx = -p.w * 0.5 + ww * 0.5 + p.jitter[0] * 0.2;
    const cz = p.d * 0.5 + wd * 0.5 - 0.5;
    const save = [mb.ox, mb.oz];
    mb.ox += mb.c * cx + mb.s * cz; mb.oz += mb.s * cx - mb.c * cz;
    mb.colorHex(p.wall);
    mb.baseAO(0, BASE_AO_H, BASE_AO_K);
    walls(mb, A, {
      w: ww, d: wd, y0: 0, floors: 1, floorH: p.floorH, bayW: p.bayW, facade: p.facade,
      wsx: p.wsx + 311, wsy: p.wsy + 7, lod, faces: [1, 1, 0, 1], wtab: p.wtab, bias: p.bias, coolT: p.coolT,
      bands: false, fullBudget: 400,
    });
    mb.clearAO();
    mb.colorHex('#ffffff');
    pitchedRoof(mb, A, { w: ww, d: wd, y: p.floorH, pitch: p.pitch * 0.9, overhang: p.overhang * 0.8, kind: 'gable', ridgeAcross: !p.ridgeAcross, roofTile: p.roofTile, trim: p.trim, gableTile: p.facade === 'res_brick' ? 'wall_brick' : 'wall_siding', wallTint: p.wall });
    mb.ox = save[0]; mb.oz = save[1];
  }
  mb.colorHex('#ffffff');
  const yr = pitchedRoof(mb, A, {
    w: p.w, d: p.d, y: bodyH, pitch: p.pitch, overhang: p.overhang, kind: p.roofKind, ridgeAcross: p.ridgeAcross,
    roofTile: p.roofTile, trim: p.trim,
    gableTile: p.facade === 'res_brick' ? 'wall_brick' : p.facade === 'res_stucco' ? 'wall_stucco' : 'wall_siding',
    wallTint: p.wall,
  });
  if (p.porch && near) {
    const pw = Math.min(p.w * 0.62, 5.2), pd = 1.9;
    const pz = p.d / 2 + pd / 2;
    mb.colorHex('#a8a49b');
    mb.box(p.w * 0.05, 0, pz, pw, 0.28, pd, { side: A.rect('concrete_slab'), top: A.rect('concrete_slab') }, 2.5);
    mb.colorHex(p.trim);
    for (const s of [-1, 1]) mb.box(p.w * 0.05 + s * (pw / 2 - 0.2), 0.28, pz + pd / 2 - 0.22, 0.2, 2.5, 0.2, { side: A.rect('trim_white') }, 3);
    mb.box(p.w * 0.05, 2.6, pz, pw + 0.5, 0.3, pd + 0.35, { side: A.rect('trim_white'), top: A.rect('roof_membrane') }, 3);
    mb.colorHex('#ffffff');
  }
  if (p.garage) {
    const gw = p.garageW, gd = Math.min(p.d * 0.72, 6.4), gh = 2.85;
    const cx = p.garageSide * (p.w / 2 + gw / 2 + 0.15);
    const cz = p.d / 2 - gd / 2;
    const save = [mb.ox, mb.oz];
    mb.ox += mb.c * cx + mb.s * cz; mb.oz += mb.s * cx - mb.c * cz;
    mb.colorHex(p.wall);
    mb.baseAO(0, BASE_AO_H, BASE_AO_K);
    walls(mb, A, {
      w: gw, d: gd, y0: 0, floors: 1, floorH: gh, bayW: p.bayW, facade: p.facade,
      wsx: p.wsx + 99, wsy: p.wsy + 55, lod, faces: [0, 1, 1, 1], wtab: p.wtab, bias: 0, coolT: p.coolT,
      bands: false, fullBudget: 400,
    });
    mb.clearAO();
    mb.colorHex('#ffffff');
    mb.grid([-gw * 0.42, 0, gd / 2 + 0.06], [1, 0, 0], [0, 1, 0], gw * 0.84, gh * 0.78, 1, 1, A.rect('door_garage'));
    mb.colorHex('#ffffff');
    pitchedRoof(mb, A, { w: gw, d: gd, y: gh, pitch: p.pitch * 0.8, overhang: p.overhang * 0.7, kind: 'gable', roofTile: p.roofTile, trim: p.trim, gableTile: 'wall_siding', wallTint: p.wall });
    mb.ox = save[0]; mb.oz = save[1];
  }
  if (!near) return;
  for (let i = 0; i < p.dormers; i++) {
    const dw = 1.7, dd = 1.5;
    const x = (i - (p.dormers - 1) / 2) * (p.w / (p.dormers + 0.4));
    const z = p.d * 0.18;
    const dy = bodyH + (yr - bodyH) * 0.34;
    mb.colorHex(p.trim);
    mb.box(x, dy, z, dw, 1.35, dd, { side: A.rect('trim_white') }, 2);
    mb.colorHex('#ffffff');
    mb.winState(p.wtab[(i * 7) % 64], 0.9, p.wtab[(i * 11) % 64] > p.coolT ? 1 : 0, p.bias);
    mb.grid([x - dw * 0.32, dy + 0.25, z + dd / 2 + 0.03], [1, 0, 0], [0, 1, 0], dw * 0.64, 0.95, 1, 1, A.rect('res_siding_a'));
    mb.noWin();
    pitchedRoof(mb, A, { w: dw, d: dd, y: dy + 1.35, pitch: 0.55, overhang: 0.18, kind: 'gable', roofTile: p.roofTile, trim: p.trim, gableTile: 'trim_white', wallTint: p.trim });
  }
  if (p.chimney) {
    mb.colorHex('#a2705c');
    const cx = p.w * 0.32 * (p.r[0] > 0.5 ? 1 : -1);
    mb.box(cx, bodyH - 0.3, -p.d * 0.16, 0.85, (yr - bodyH) + 1.2, 0.75, { side: A.rect('wall_brick'), top: A.rect('trim_grey') }, 1.6);
    mb.colorHex('#ffffff');
  }
  if (p.solar) {
    const pw = p.w * 0.5, pd = (yr - bodyH) * 0.75;
    const yA = bodyH + (yr - bodyH) * 0.12, yB = bodyH + (yr - bodyH) * 0.8;
    const zA = p.d / 2 * 0.86, zB = p.d / 2 * 0.16;
    mb.quad([-pw / 2, yA + 0.05, zA], [pw / 2, yA + 0.05, zA], [pw / 2, yB + 0.05, zB], [-pw / 2, yB + 0.05, zB], A.rect('solar'));
  }
}

function emitTown(mb, A, p, lod) {
  const near = lod === 0;
  const bodyH = p.floors * p.floorH;
  const unitW = p.w / p.units;
  const poly = outlineFor(p);
  mb.colorHex(p.wall);
  mb.baseAO(0, BASE_AO_H, BASE_AO_K);
  walls(mb, A, {
    w: p.w, d: p.d, poly, y0: 0, floors: p.floors, floorH: p.floorH, bayW: p.bayW, facade: p.facade,
    wsx: p.wsx, wsy: p.wsy, lod, wtab: p.wtab, bias: p.bias, coolT: p.coolT, bandTile: 'wall_concrete', fullBudget: 78,
  });
  mb.clearAO();
  if (near) {
    for (let i = 0; i < p.units; i++) {
      const cx = -p.w / 2 + unitW * (i + 0.5);
      mb.colorHex('#ffffff');
      mb.grid([cx - 0.6, 0, p.d / 2 + 0.06], [1, 0, 0], [0, 1, 0], 1.2, 2.4, 1, 1, A.rect('door_entrance'));
      mb.colorHex(p.trim);
      mb.box(cx, 2.42, p.d / 2 + 0.4, 1.9, 0.24, 0.85, { side: A.rect('trim_white'), top: A.rect('roof_membrane') }, 2);
      mb.colorHex('#a8a49b');
      mb.box(cx, 0, p.d / 2 + 0.5, 1.7, 0.2, 0.9, { side: A.rect('concrete_slab'), top: A.rect('concrete_slab') }, 2);
      if (i > 0) { mb.colorHex(p.wall); mb.box(-p.w / 2 + unitW * i, 0, p.d / 2 + 0.1, 0.35, bodyH, 0.2, { side: A.rect('wall_brick') }, 3); }
    }
    mb.colorHex('#ffffff');
  }
  if (p.roofKind === 'gable') {
    pitchedRoof(mb, A, { w: p.w, d: p.d, y: bodyH, pitch: p.pitch, overhang: p.overhang, kind: 'gable', roofTile: p.roofTile, trim: p.trim, gableTile: 'wall_brick', wallTint: p.wall });
    if (near) for (let i = 0; i < p.units; i++) {
      mb.colorHex('#9c7060');
      mb.box(-p.w / 2 + unitW * (i + 0.5), bodyH, -p.d * 0.1, 0.7, p.pitch * p.d * 0.5 + 1.0, 0.6, { side: A.rect('wall_brick'), top: A.rect('trim_grey') }, 1.6);
      mb.colorHex('#ffffff');
    }
  } else {
    flatRoof(mb, A, p, { poly, w: p.w, d: p.d, y: bodyH, parapetH: p.parapetH, roofTile: p.roofTile, lod, parapetTile: 'wall_brick' });
  }
}

function emitApartment(mb, A, p, lod) {
  const near = lod === 0;
  const yTop = p.groundH + (p.floors - 1) * p.floorH;
  const lowerFloors = p.setback ? p.setbackAt : p.floors;
  const setY = p.setback ? p.groundH + (p.setbackAt - 1) * p.floorH : yTop;
  const poly = outlineFor(p);
  mb.colorHex(p.wall);
  mb.baseAO(0, BASE_AO_H, BASE_AO_K);
  walls(mb, A, {
    w: p.w, d: p.d, poly, y0: 0, floors: lowerFloors, floorH: p.floorH, groundH: p.groundH, bayW: p.bayW,
    facade: p.facade, groundTile: p.retail ? null : p.groundFacade, groundBayW: 5.0,
    wsx: p.wsx, wsy: p.wsy, lod, wtab: p.wtab, bias: p.bias, coolT: p.coolT, fullBudget: 72,
  });
  mb.clearAO();
  if (p.setback) {
    const p2 = insetPoly(poly, p.setbackIn);
    mb.colorHex(p.wall);
    walls(mb, A, {
      w: p.w - p.setbackIn * 2, d: p.d - p.setbackIn * 2, poly: p2, y0: setY, floors: p.floors - p.setbackAt,
      floorH: p.floorH, bayW: p.bayW, facade: p.facade, wsx: p.wsx + 213, wsy: p.wsy + 17, lod,
      wtab: p.wtab, bias: p.bias, coolT: p.coolT, fullBudget: 40,
    });
    mb.colorHex('#ffffff');
    roofDeck(mb, A.rect(p.roofTile), poly, setY);
    parapet(mb, A, poly, setY, 1.0, A.rect('wall_concrete'), A.rect('trim_grey'));
    flatRoof(mb, A, p, { poly: p2, w: p.w - p.setbackIn * 2, d: p.d - p.setbackIn * 2, y: yTop, parapetH: p.parapetH, roofTile: p.roofTile, lod });
    emitCrown(mb, A, p, p2, yTop + p.parapetH, p.crown, p.w - p.setbackIn * 2, p.d - p.setbackIn * 2);
  } else {
    flatRoof(mb, A, p, { poly, w: p.w, d: p.d, y: yTop, parapetH: p.parapetH, roofTile: p.roofTile, lod });
    emitCrown(mb, A, p, poly, yTop + p.parapetH, p.crown, p.w, p.d);
  }
  if (p.retail) retailBase(mb, A, p, { w: p.w, d: p.d, poly, y0: 0, groundH: p.groundH, faces: retailFaces(poly, near) });
  if (!near) return;
  if (!p.retail) {
    mb.colorHex('#dcd8cf');
    mb.box(0, p.groundH - 1.0, p.d / 2 + 0.95, Math.min(p.w * 0.4, 5.5), 0.32, 2.0, { side: A.rect('wall_concrete'), top: A.rect('roof_membrane') }, 3);
    mb.colorHex('#ffffff');
    mb.grid([-1.3, 0, p.d / 2 + 0.06], [1, 0, 0], [0, 1, 0], 2.6, 2.7, 1, 1, A.rect('door_entrance'));
  }
  // stacked balconies with a real slab and a railing (item 13)
  if (p.balcony) {
    const bays = clamp(Math.round(p.w / p.bayW), 1, 24);
    const bw = p.w / bays;
    const rail = p.balconyGlass ? A.rect('glass_plain') : A.rect('trim_grey');
    let made = 0;
    for (let f = 1; f < lowerFloors && made < 30; f++) {
      const y = p.groundH + (f - 1) * p.floorH;
      for (let i = 0; i < bays && made < 30; i++) {
        if ((i + f) % 2 === 1) continue;
        const cx = -p.w / 2 + bw * (i + 0.5);
        const cz = p.d / 2 + 0.78;
        mb.colorHex('#cfcabf');
        mb.box(cx, y, cz, bw * 0.92, 0.22, 1.52, { side: A.rect('wall_concrete'), top: A.rect('concrete_slab'), bottom: A.rect('wall_concrete_dark') }, 2.2);
        mb.colorHex(p.balconyGlass ? '#bcd0dd' : '#c8c4bb');
        mb.box(cx, y + 0.22, cz + 0.71, bw * 0.92, 1.08, 0.09, { side: rail, top: A.rect('trim_grey') }, 2.2);
        mb.box(cx - bw * 0.44, y + 0.22, cz, 0.09, 1.08, 1.5, { side: rail, top: A.rect('trim_grey') }, 2.2);
        mb.box(cx + bw * 0.44, y + 0.22, cz, 0.09, 1.08, 1.5, { side: rail, top: A.rect('trim_grey') }, 2.2);
        made++;
      }
    }
    mb.colorHex('#ffffff');
  }
}

function emitOfficeLow(mb, A, p, lod) {
  const yTop = p.groundH + (p.floors - 1) * p.floorH;
  const poly = outlineFor(p);
  mb.colorHex(p.wall);
  mb.baseAO(0, BASE_AO_H, BASE_AO_K);
  walls(mb, A, {
    w: p.w, d: p.d, poly, y0: 0, floors: p.floors, floorH: p.floorH, groundH: p.groundH, bayW: p.bayW,
    facade: p.facade, wsx: p.wsx, wsy: p.wsy, lod, wtab: p.wtab, bias: p.bias, coolT: p.coolT, fullBudget: 78,
  });
  mb.clearAO();
  flatRoof(mb, A, p, { poly, w: p.w, d: p.d, y: yTop, parapetH: p.parapetH, roofTile: p.roofTile, lod });
  emitCrown(mb, A, p, poly, yTop + p.parapetH, p.crown, p.w, p.d);
  if (lod !== 0) return;
  entrance(mb, A, p, { w: p.w, d: p.d, groundH: p.groundH, y0: 0, doorTile: 'glass_plain' });
}

function emitTower(mb, A, p, lod) {
  const near = lod === 0;
  if (p.podium) {
    const pw = p.w + p.podiumOut * 2, pd = p.d + p.podiumOut;
    const ph = p.groundH + (p.podiumFloors - 1) * p.floorH;
    const ppoly = p.chamfer > 0 ? chamferOutline(pw, pd, p.chamfer) : rectOutline(pw, pd);
    mb.colorHex(p.wall);
    mb.baseAO(0, BASE_AO_H, BASE_AO_K);
    walls(mb, A, {
      w: pw, d: pd, poly: ppoly, y0: 0, floors: p.podiumFloors, floorH: p.floorH, groundH: p.groundH,
      bayW: p.bayW * 1.2, facade: p.baseFacade || p.facade, wsx: p.wsx + 71, wsy: p.wsy + 3, lod,
      wtab: p.wtab, bias: p.bias, coolT: p.coolT, fullBudget: 64,
    });
    mb.clearAO();
    mb.colorHex('#ffffff');
    roofDeck(mb, A.rect('roof_membrane'), ppoly, ph);
    parapet(mb, A, ppoly, ph, 1.0, A.rect('wall_concrete'), A.rect('trim_grey'));
    if (p.retail) retailBase(mb, A, p, { w: pw, d: pd, poly: ppoly, y0: 0, groundH: p.groundH, faces: retailFaces(ppoly, near) });
  } else if (p.retail) {
    retailBase(mb, A, p, { w: p.w, d: p.d, poly: outlineFor(p), y0: 0, groundH: p.groundH, faces: retailFaces(outlineFor(p), near) });
  }
  // shaft, with setbacks
  const stepFloors = [];
  for (let s = 0; s < p.steps; s++) stepFloors.push(Math.max(2, Math.round(p.floors * p.stepAt[s])));
  const segs = [];
  let prev = 0;
  for (const sf of stepFloors) { segs.push(sf - prev); prev = sf; }
  segs.push(p.floors - prev);
  let w = p.w, d = p.d, y = 0, first = true, scale = 1;
  for (let i = 0; i < segs.length; i++) {
    const n = segs[i];
    if (n <= 0) continue;
    const segH = first ? p.groundH + (n - 1) * p.floorH : n * p.floorH;
    const poly = outlineFor(p, scale);
    mb.colorHex(p.wall);
    if (first) mb.baseAO(0, BASE_AO_H, BASE_AO_K);
    walls(mb, A, {
      w, d, poly, y0: y, floors: n, floorH: p.floorH, groundH: first ? p.groundH : undefined,
      bayW: p.bayW, facade: p.facade, wsx: p.wsx + i * 57, wsy: p.wsy + (first ? 0 : Math.round(y / p.floorH)),
      lod, wtab: p.wtab, bias: p.bias, coolT: p.coolT, fullBudget: first ? 72 : 26,
    });
    mb.clearAO();
    y += segH;
    if (i < segs.length - 1) {
      mb.colorHex('#ffffff');
      roofDeck(mb, A.rect('roof_membrane_dark'), poly, y);
      parapet(mb, A, poly, y, 0.9, A.rect('wall_concrete_dark'), A.rect('trim_grey'));
      const k = 1 - p.stepIn[i];
      scale *= k; w *= k; d *= k;
    }
    first = false;
  }
  const topPoly = outlineFor(p, scale);
  const topY = y;
  flatRoof(mb, A, p, { poly: topPoly, w, d, y: topY, parapetH: p.parapetH, roofTile: p.roofTile, lod, parapetTile: 'wall_concrete_dark' });
  emitCrown(mb, A, p, topPoly, topY + p.parapetH, p.crown, w, d);
  if (p.mast && p.crown !== 'spire') {
    mb.colorHex('#c2c6c8');
    const my = topY + p.parapetH + 4.4;
    mb.box(0, my, 0, 0.5, 11, 0.5, { side: A.rect('metal_light') }, 5);
    mb.box(0, my + 11, 0, 0.22, 4.5, 0.22, { side: A.rect('metal_light') }, 5);
    mb.colorHex('#ffffff');
  }
  if (!near || p.retail) return;
  const fz = (p.podium ? p.d / 2 + p.podiumOut / 2 : p.d / 2);
  mb.colorHex('#ffffff');
  const ew = Math.min(p.w * 0.5, 9);
  mb.grid([-ew / 2, 0.1, fz + 0.06], [1, 0, 0], [0, 1, 0], ew, p.groundH - 0.6, Math.max(1, Math.round(ew / 3)), 1, A.rect('glass_plain'));
  mb.colorHex('#b9bdbf');
  mb.box(0, p.groundH - 1.0, fz + 1.7, ew + 1.8, 0.36, 3.3, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 3);
  mb.colorHex('#ffffff');
}

function emitShop(mb, A, p, lod) {
  const near = lod === 0;
  const units = p.units || 1;
  const uw = p.w / units;
  for (let u = 0; u < units; u++) {
    const floors = clamp(p.floors + (p.unitOff ? p.unitOff[u] : 0), 1, 12);
    const dU = p.d * (p.unitDepth ? p.unitDepth[u] : 1);
    const parapetH = p.unitParapet ? p.unitParapet[u] : p.parapetH;
    const yTop = p.groundH + (floors - 1) * p.floorH;
    const cx = -p.w / 2 + uw * (u + 0.5);
    const cz = p.d / 2 - dU / 2;
    const save = [mb.ox, mb.oz];
    mb.ox += mb.c * cx + mb.s * cz; mb.oz += mb.s * cx - mb.c * cz;
    const uwid = uw - (units > 1 ? 0.12 : 0);
    const poly = (u === p.tallest && p.chamfer > 0) ? chamferOutline(uwid, dU, p.chamfer) : rectOutline(uwid, dU);
    mb.colorHex(tintHex(p.wall, p.unitTint ? p.unitTint[u] : 1));
    mb.baseAO(0, BASE_AO_H, BASE_AO_K);
    walls(mb, A, {
      w: uwid, d: dU, poly, y0: 0, floors, floorH: p.floorH, groundH: p.groundH,
      bayW: p.bayW, facade: (p.unitFacade ? p.unitFacade[u] : p.facade),
      wsx: p.wsx + u * 173, wsy: p.wsy + u * 31, lod, wtab: p.wtab, bias: p.bias, coolT: p.coolT, fullBudget: 72,
    });
    mb.clearAO();
    mb.colorHex('#ffffff');
    flatRoof(mb, A, p, {
      poly, w: uwid, d: dU, y: yTop, parapetH, roofTile: p.roofTile, lod,
      clutterList: u === p.tallest ? p.clutterList : p.clutterList.slice(0, 2),
    });
    if (u === p.tallest) emitCrown(mb, A, p, poly, yTop + parapetH, p.crown, uwid, dU);
    // the lit retail base, on every unit — this is what makes a night street read (cs2_8)
    retailBase(mb, A, { ...p, signIdx: (p.signIdx + u) % 6, warmShop: u % 2 === 0 ? p.warmShop : !p.warmShop },
      { w: uwid, d: dU, poly, y0: 0, groundH: p.groundH, faces: retailFaces(poly, near) });
    mb.ox = save[0]; mb.oz = save[1];
  }
  if (!near) return;
  if (p.canopy) {
    mb.colorHex('#c9ccce');
    mb.box(0, p.groundH - 1.9, p.d / 2 + 1.2, p.w * 0.92, 0.24, 2.4, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 3);
    mb.colorHex('#ffffff');
  }
}

function emitInd(mb, A, p, lod) {
  const near = lod === 0;
  const h = p.wallH;
  const poly = rectOutline(p.w, p.d);
  mb.colorHex(p.wall);
  mb.baseAO(0, BASE_AO_H, BASE_AO_K);
  walls(mb, A, {
    w: p.w, d: p.d, poly, y0: 0, floors: p.floors, floorH: h / p.floors, bayW: p.bayW, facade: p.facade,
    wsx: p.wsx, wsy: p.wsy, lod, wtab: p.wtab, bias: p.bias, coolT: p.coolT, bands: false, fullBudget: 64,
    pierTile: 'wall_metal',
  });
  mb.clearAO();
  if (p.roofKind === 'shed') {
    const rise = p.d * 0.08;
    const hw = p.w / 2 + 0.4, hd = p.d / 2 + 0.4;
    mb.colorHex('#ffffff');
    mb.slope([-hw, h, hd], [hw, h, hd], [hw, h + rise, -hd], [-hw, h + rise, -hd], A.rect(p.roofTile), Math.max(1, Math.round(p.w / 5)), Math.max(1, Math.round(p.d / 5)));
    mb.colorHex(p.wall);
    mb.tri([hw, h, hd], [hw, h, -hd], [hw, h + rise, -hd], A.rect('wall_metal'), [0, 0], [1, 0], [1, 1]);
    mb.tri([-hw, h, -hd], [-hw, h, hd], [-hw, h + rise, -hd], A.rect('wall_metal'), [0, 0], [1, 0], [0, 1]);
    mb.colorHex('#ffffff');
    const nv = Math.max(2, Math.min(5, p.floors + 1));
    for (let i = 0; i < nv; i++) {
      const x = (i / nv - 0.5 + 0.5 / nv) * p.w * 0.85;
      mb.colorHex('#b6babc');
      mb.box(x, h + rise * 0.72, -p.d * 0.2, 1.6, 0.6, 1.3, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 2);
    }
    mb.colorHex('#ffffff');
  } else {
    flatRoof(mb, A, p, { poly, w: p.w, d: p.d, y: h, parapetH: p.parapetH, roofTile: p.roofTile, lod, parapetTile: 'wall_metal' });
    emitCrown(mb, A, p, poly, h + p.parapetH, p.crown, p.w, p.d);
  }
  if (!near) return;
  const dockW = 3.2, dockH = 3.6;
  for (let i = 0; i < p.docks; i++) {
    const cx = (i - (p.docks - 1) / 2) * (p.w / (p.docks + 0.3));
    mb.colorHex('#ffffff');
    mb.grid([cx - dockW / 2, 0.9, p.d / 2 + 0.06], [1, 0, 0], [0, 1, 0], dockW, dockH, 1, 1, A.rect('door_roller'));
    mb.colorHex('#9d9a92');
    mb.box(cx, 0, p.d / 2 + 1.2, dockW + 1.0, 0.95, 2.4, { side: A.rect('concrete_slab'), top: A.rect('concrete_slab') }, 2.5);
    mb.colorHex('#3a3d40');
    mb.box(cx - dockW / 2 - 0.2, 1.6, p.d / 2 + 0.1, 0.28, 2.6, 0.2, { side: A.rect('metal_dark') }, 3);
    mb.box(cx + dockW / 2 + 0.2, 1.6, p.d / 2 + 0.1, 0.28, 2.6, 0.2, { side: A.rect('metal_dark') }, 3);
    mb.colorHex('#ffffff');
  }
  if (p.dockCanopy) {
    mb.colorHex('#b9bec0');
    mb.box(0, dockH + 1.2, p.d / 2 + 1.6, p.w * 0.92, 0.3, 3.1, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 3);
    for (const s of [-1, 1]) mb.box(s * p.w * 0.4, 0.95, p.d / 2 + 2.9, 0.2, dockH + 0.25, 0.2, { side: A.rect('metal_light') }, 3);
    mb.colorHex('#ffffff');
  }
  if (p.officeBox) {
    const ow = Math.min(p.w * 0.3, 9), od = 6.5, oh = 3.4;
    const cx = -p.w / 2 - ow / 2 - 0.25;
    const cz = p.d / 2 - od / 2;
    const save = [mb.ox, mb.oz];
    mb.ox += mb.c * cx + mb.s * cz; mb.oz += mb.s * cx - mb.c * cz;
    mb.colorHex('#e6e2d6');
    mb.baseAO(0, BASE_AO_H, BASE_AO_K);
    walls(mb, A, { w: ow, d: od, y0: 0, floors: 1, floorH: oh, bayW: 3.2, facade: 'comm_upper', wsx: p.wsx + 401, wsy: p.wsy + 9, lod: 0, wtab: p.wtab, bias: p.bias, coolT: p.coolT, bands: false, fullBudget: 400 });
    mb.clearAO();
    mb.colorHex('#ffffff');
    roofDeck(mb, A.rect('roof_membrane'), rectOutline(ow, od), oh);
    parapet(mb, A, rectOutline(ow, od), oh, 0.5, A.rect('wall_concrete'), A.rect('trim_grey'));
    mb.grid([-0.6, 0, od / 2 + 0.06], [1, 0, 0], [0, 1, 0], 1.2, 2.4, 1, 1, A.rect('door_entrance'));
    mb.ox = save[0]; mb.oz = save[1];
  }
  for (let i = 0; i < p.silos; i++) {
    const x = p.w / 2 + 3.4 + i * 5.0, z = -p.d * 0.2;
    mb.colorHex('#d6d8d6');
    mb.cylinder(x, 0, z, 2.2, 10 + p.clutterR[i] * 5, 12, A.rect('metal_light'), A.rect('metal_light'));
    mb.colorHex('#b0b4b6');
    mb.cylinder(x, 10 + p.clutterR[i] * 5, z, 2.2, 1.6, 12, A.rect('metal_dark'), A.rect('metal_dark'));
    mb.colorHex('#ffffff');
  }
  if (p.stack) {
    mb.colorHex('#c8bfb2');
    mb.cylinder(-p.w / 2 + 2.5, 0, -p.d / 2 - 2.5, 1.2, h + 12, 12, A.rect('wall_concrete'), A.rect('metal_dark'));
    mb.colorHex('#ffffff');
  }
  if (p.tanks) {
    for (let i = 0; i < 2; i++) {
      mb.colorHex('#cfd4d6');
      mb.cylinder(-p.w / 2 - 4.5, 0, -p.d * 0.1 + i * 6, 2.6, 5.5, 12, A.rect('metal_light'), A.rect('metal_light'));
      mb.colorHex('#ffffff');
    }
  }
}

// ------------------------------------------------------------------ lot ground
// buildings owns the lot SURFACE and the boundary on the lots it occupies (item 7): lawn or paving
// plate, driveway, path, forecourt, parking bay row, industrial apron, hedge or fence — plus the
// contact apron that darkens the ground into the wall so nothing looks pasted on.

const PLATE_Y = 0.09;     // the lot plate sits clear of terrain grass tufts
const STRIP_Y = 0.115;   // drives and paths sit on top of the plate
const APRON_W = 0.95;   // item 9: the ground darkens into the wall inside one metre

/** minimum distance from (x,z) to an outline, used for the contact gradient */
function distToPoly(poly, x, z) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz || 1;
    let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a[0] + dx * t - x, pz = a[1] + dz * t - z;
    const d = Math.hypot(px, pz);
    if (d < best) best = d;
  }
  return best;
}

/** the ground darkening where the lot surface meets the building (item 9) */
function contactApron(mb, A, poly, h, tileName) {
  const tile = A.rect(tileName);
  mb.colorHex('#ffffff');
  mb.aoFn((lx, ly, lz) => {
    const d = distToPoly(poly, lx, lz);
    const t = d / APRON_W;
    return 0.34 + 0.66 * (t > 1 ? 1 : t);
  });
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz);
    if (L < 0.5) continue;
    const ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
    const n = clamp(Math.round(L / 6), 1, 4);
    for (let k = 0; k < n; k++) {
      const t0 = (k / n) * L - (k === 0 ? APRON_W : 0), t1 = ((k + 1) / n) * L + (k === n - 1 ? APRON_W : 0);
      const P = (t, off) => {
        const lx = a[0] + ux * t + nx * off, lz = a[1] + uz * t + nz * off;
        return [lx, h(lx, lz) + PLATE_Y + 0.055, lz];
      };
      mb.quad(P(t0, APRON_W), P(t1, APRON_W), P(t1, 0.02), P(t0, 0.02), tile);
    }
  }
  mb.clearAO();
}

/**
 * Ground surfaces for a lot. `h(lx,lz)` gives the terrain height at a local point relative to the
 * builder origin. Also fills `p.paved`, which `lotSurface(id)` publishes so props can plant around it.
 */
export function emitGround(mb, A, p, lot, h, lod) {
  const near = lod === 0;
  const lw = lot.w, ld = lot.d;
  const cz = -(p.zOff || 0);
  const hw = lw / 2 - 0.25, hd = ld / 2 - 0.25;
  const zFront = cz + hd + 2.4, zBack = cz - hd;
  const kind = p.kind;
  const base = kind === 'house' ? (p.r[1] > 0.5 ? 'lawn' : 'lawn_dark')
    : kind === 'town' ? 'lawn'
      : kind === 'ind' ? 'gravel_yard'
        : kind === 'tower' ? 'paving'
          : (p.parking ? 'asphalt_stalls' : 'paving');
  const tile = A.rect(base);
  const cell = near ? 6 : 24;
  const nu = clamp(Math.round(lw / cell), 1, 4), nv = clamp(Math.round(ld / cell), 1, 4);
  mb.colorHex(kind === 'house' || kind === 'town' ? '#ffffff' : '#f4f4f4');
  const P = (i, j) => {
    const lx = -hw + (2 * hw * i) / nu, lz = zBack + ((zFront - zBack) * j) / nv;
    return [lx, h(lx, lz) + PLATE_Y, lz];
  };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    mb.quad(P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), P(i, j), tile);
  }
  const paved = [];
  if (kind === 'house') {
    const dw = p.garage ? clamp(p.garageW * 0.9, 2.6, 5.6) : 3.0;
    const dx = p.garage ? p.garageSide * (p.w / 2 + p.garageW / 2 + 0.15) : p.w * 0.2;
    strip(mb, A, h, dx, zFront + 0.5, dx, p.d / 2 - 1.5, dw, 'concrete_slab');
    paved.push({ x: dx, z: (zFront + p.d / 2) / 2, w: dw, d: Math.abs(zFront - p.d / 2) + 1, heading: 0 });
    strip(mb, A, h, p.w * 0.18, zFront - 0.2, p.w * 0.18, p.d / 2 - 0.2, 1.3, 'paving');
    paved.push({ x: p.w * 0.18, z: (zFront + p.d / 2) / 2, w: 1.3, d: Math.abs(zFront - p.d / 2), heading: 0 });
    if (p.hedge) hedgeRun(mb, A, h, hw, zFront, zBack, 0.9);
    else if (p.fence) fenceRun(mb, A, h, hw, zFront, zBack, false);
    if (p.deck && near) {
      mb.colorHex('#b8926c');
      const px = -p.w * 0.2, pz = -p.d / 2 - 2.2;
      mb.box(px, h(px, pz) + PLATE_Y + 0.05, pz, 4.2, 0.22, 3.4, { side: A.rect('wood_tank'), top: A.rect('wood_tank') }, 2);
      mb.colorHex('#ffffff');
      paved.push({ x: px, z: pz, w: 4.2, d: 3.4, heading: 0 });
    }
  } else if (kind === 'town') {
    const fw = Math.min(lw * 0.7, p.w * 0.85);
    strip(mb, A, h, 0, zFront + 0.5, 0, p.d / 2 - 0.4, fw, 'concrete_slab');
    paved.push({ x: 0, z: (zFront + p.d / 2) / 2, w: fw, d: Math.abs(zFront - p.d / 2) + 1, heading: 0 });
    if (p.hedge) hedgeRun(mb, A, h, hw, zFront, zBack, 0.75);
    else fenceRun(mb, A, h, hw, zFront, zBack, false);
  } else if (kind === 'ind') {
    const aw = Math.min(lw * 0.9, p.w + 6);
    strip(mb, A, h, 0, zFront + 0.5, 0, p.d / 2 + 1, aw, 'asphalt');
    paved.push({ x: 0, z: (zFront + p.d / 2) / 2, w: aw, d: Math.abs(zFront - p.d / 2) + 2, heading: 0 });
    if (p.fence) fenceRun(mb, A, h, hw, zFront, zBack, true);
  } else {
    // a real forecourt right up to the kerb, not a green verge
    const fw = Math.min(lw * 0.96, p.w + 8);
    strip(mb, A, h, 0, zFront + 1.2, 0, p.d / 2 - 0.3, fw, kind === 'tower' ? 'paving' : 'asphalt');
    paved.push({ x: 0, z: (zFront + p.d / 2) / 2, w: fw, d: Math.abs(zFront - p.d / 2) + 2, heading: 0 });
    if (kind === 'tower' && near) {
      // entrance steps and a plinth so the tower meets the ground with something
      mb.colorHex('#b7b3aa');
      const sz = p.d / 2 + 1.1;
      mb.box(0, h(0, sz) + PLATE_Y, sz, Math.min(p.w * 0.6, 12), 0.34, 2.2, { side: A.rect('concrete_slab'), top: A.rect('concrete_slab') }, 2.5);
      mb.colorHex('#ffffff');
    }
  }
  // contact darkening where the ground meets the walls
  const fpoly = outlineFor(p);
  if (near) contactApron(mb, A, fpoly, h, kind === 'house' || kind === 'town' ? (p.r[1] > 0.5 ? 'lawn' : 'lawn_dark') : (kind === 'ind' ? 'gravel_yard' : kind === 'tower' ? 'paving' : 'asphalt'));
  p.paved = paved;
}

function strip(mb, A, h, x0, z0, x1, z1, w, tileName) {
  const tile = A.rect(tileName);
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 0.5 || w < 0.4) return;
  const ux = dx / len, uz = dz / len;
  const px = -uz * w / 2, pz = ux * w / 2;
  const n = clamp(Math.round(len / 3), 1, 10);
  const P = (t, s) => {
    const lx = x0 + dx * t + px * s, lz = z0 + dz * t + pz * s;
    return [lx, h(lx, lz) + STRIP_Y, lz];
  };
  mb.colorHex('#ffffff');
  for (let i = 0; i < n; i++) mb.quad(P(i / n, -1), P(i / n, 1), P((i + 1) / n, 1), P((i + 1) / n, -1), tile);
}

function hedgeRun(mb, A, h, hw, zFront, zBack, height) {
  const tile = A.rect('hedge');
  mb.colorHex('#ffffff');
  const seg = (x0, z0, x1, z1) => {
    const n = clamp(Math.round(Math.hypot(x1 - x0, z1 - z0) / 3), 1, 8);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0;
      const bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1;
      const ya = h(ax, az), yb = h(bx, bz);
      const t = 0.45;
      const nx = -(bz - az), nz = (bx - ax);
      const l = Math.hypot(nx, nz) || 1;
      const ox = (nx / l) * t, oz = (nz / l) * t;
      mb.quad([ax + ox, ya, az + oz], [bx + ox, yb, bz + oz], [bx + ox, yb + height, bz + oz], [ax + ox, ya + height, az + oz], tile);
      mb.quad([bx - ox, yb, bz - oz], [ax - ox, ya, az - oz], [ax - ox, ya + height, az - oz], [bx - ox, yb + height, bz - oz], tile);
      mb.quad([ax - ox, ya + height, az - oz], [ax + ox, ya + height, az + oz], [bx + ox, yb + height, bz + oz], [bx - ox, yb + height, bz - oz], tile);
    }
  };
  seg(-hw, zFront - 1.5, -hw, zBack);
  seg(hw, zBack, hw, zFront - 1.5);
  seg(-hw, zBack, hw, zBack);
}

function fenceRun(mb, A, h, hw, zFront, zBack, industrial) {
  const tile = A.rect(industrial ? 'metal_dark' : 'trim_white');
  const height = industrial ? 2.2 : 1.25;
  mb.colorHex(industrial ? '#9aa0a4' : '#efece3');
  const seg = (x0, z0, x1, z1) => {
    const n = clamp(Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.4), 1, 12);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0;
      const bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1;
      const ya = h(ax, az), yb = h(bx, bz);
      mb.quad([ax, ya, az], [bx, yb, bz], [bx, yb + height, bz], [ax, ya + height, az], tile);
      mb.quad([bx, yb, bz], [ax, ya, az], [ax, ya + height, az], [bx, yb + height, bz], tile);
    }
  };
  seg(-hw, zFront - 1.5, -hw, zBack);
  seg(hw, zBack, hw, zFront - 1.5);
  seg(-hw, zBack, hw, zBack);
  mb.colorHex('#ffffff');
}

// ------------------------------------------------------------------ entry point
export function emitBuilding(mb, A, p, lod) {
  LOD = lod;
  switch (p.kind) {
    case 'house': return emitHouse(mb, A, p, lod);
    case 'town': return emitTown(mb, A, p, lod);
    case 'apt': return emitApartment(mb, A, p, lod);
    case 'officelow': return emitOfficeLow(mb, A, p, lod);
    case 'tower': return emitTower(mb, A, p, lod);
    case 'shop': return emitShop(mb, A, p, lod);
    case 'ind': return emitInd(mb, A, p, lod);
    default: return null;
  }
}

export { skirt };
