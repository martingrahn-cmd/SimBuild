// Per-building planning (deterministic, once at spawn) and geometry emission (per LOD, at chunk build).
// The plan holds every random decision so LOD0 and LOD1 are guaranteed to agree.

const HOUSE_WALL = ['#f2ece0', '#e6e2d6', '#cfe0e4', '#f0dda6', '#b9cfdd', '#e9c3a6', '#b6cdb4', '#f4ead6',
  '#d8c39c', '#c6cfd4', '#e3b9a6', '#cdd8bd', '#eddcc0', '#a9bfcc', '#e8cfd2'];
const HOUSE_TRIM = ['#ffffff', '#f6f2e8', '#e8e4d9'];
const ROOFS = ['roof_shingle_dark', 'roof_shingle_grey', 'roof_shingle_brown', 'roof_tile_red', 'roof_tile_grey', 'roof_seam', 'roof_seam_blue'];
const HOUSE_FACADES = ['res_siding', 'res_brick', 'res_stucco'];
const TOWN_FACADES = ['town_brick', 'town_render'];
const APT_FACADES = ['apt_concrete', 'apt_panel', 'apt_brick'];
const OFFICE_GLASS = ['office_glass_blue', 'office_glass_sky', 'office_glass_green', 'office_glass_dark'];
const SHOPS = ['comm_shop_red', 'comm_shop_green', 'comm_shop_blue'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/** forward shift inside the lot so the front facade sits `yard` metres from the street boundary */
function setbackShift(ld, d, yard) {
  const room = Math.max(0, ld / 2 - d / 2 - 0.4);
  return clamp(ld / 2 - yard - d / 2, -room, room);
}

// ------------------------------------------------------------------ planning
export function planBuilding(lot, level, rng) {
  const type = lot.type, dens = lot.density;
  const lw = Math.max(6, lot.w), ld = Math.max(6, lot.d);
  const L = clamp(level | 0, 1, 5);
  if (type === 'residential' && dens === 'low') return planHouse(lw, ld, L, rng);
  if (type === 'residential') return L <= 2 ? planTownhouse(lw, ld, L, rng) : planApartment(lw, ld, L, rng);
  if (type === 'commercial' && dens === 'low') return planShop(lw, ld, L, rng, false);
  if (type === 'commercial') return planShop(lw, ld, L, rng, true);
  if (type === 'office' && dens === 'low') return planOfficeLow(lw, ld, L, rng);
  if (type === 'office') return planTower(lw, ld, L, rng);
  if (type === 'industrial' && dens === 'low') return planWarehouse(lw, ld, L, rng, false);
  return planWarehouse(lw, ld, L, rng, true);
}

function common(rng) {
  return {
    wsx: rng.int(0, 900), wsy: rng.int(0, 900),
    tint: 0.9 + rng.float() * 0.2,
  };
}

function planHouse(lw, ld, L, rng) {
  const p = { kind: 'house', level: L, ...common(rng) };
  const side = clamp(lw * 0.16, 1.6, 4.5);
  const front = clamp(ld * 0.3, 4, 11);
  p.w = clamp(lw - side * 2, 6.5, 8 + L * 1.5);
  p.d = clamp(ld - front - 2.5, 6, 7.5 + L * 1.4);
  p.floors = L <= 1 ? 1 : L <= 3 ? (rng.bool(0.35) ? 1 : 2) : 2;
  p.floorH = 2.95;
  p.facade = rng.pick(HOUSE_FACADES);
  p.wall = rng.pick(HOUSE_WALL);
  p.trim = rng.pick(HOUSE_TRIM);
  p.roofTile = rng.weighted([['roof_shingle_dark', 4], ['roof_shingle_grey', 3], ['roof_shingle_brown', 3],
    ['roof_tile_red', 4], ['roof_tile_grey', 2], ['roof_seam', L >= 4 ? 1.5 : 0.4]]);
  p.roofKind = rng.bool(L >= 3 ? 0.55 : 0.3) ? 'hip' : 'gable';
  p.pitch = rng.range(0.42, 0.62);
  p.overhang = rng.range(0.45, 0.8);
  p.bayW = rng.range(2.9, 3.4);
  p.garage = L >= 3 || (L === 2 && rng.bool(0.5));
  p.garageSide = rng.bool() ? 1 : -1;
  p.garageW = clamp(Math.min(6.2, lw - p.w - side * 0.5), 0, 6.2);
  if (p.garageW < 3.2) p.garage = false;
  p.porch = L >= 2 && rng.bool(0.65);
  p.dormers = L >= 4 && p.roofKind !== 'flat' ? rng.int(1, 2) : 0;
  p.chimney = rng.bool(L >= 3 ? 0.6 : 0.35);
  p.solar = L >= 4 && rng.bool(0.55);
  p.wing = L >= 4 && rng.bool(0.5);
  p.hedge = L >= 2 && rng.bool(0.7);
  p.fence = !p.hedge && rng.bool(0.4);
  p.driveway = true;
  p.deck = L >= 3 && rng.bool(0.5);
  p.frontSet = front;
  p.height = p.floors * p.floorH + p.pitch * Math.min(p.w, p.d) * 0.5;
  p.zOff = setbackShift(ld, p.d, clamp(front * 0.6, 3.5, 7.5));
  p.jitter = [rng.range(-0.6, 0.6), rng.range(-0.6, 0.6), rng.range(-0.14, 0.14)];
  p.r = [rng.float(), rng.float(), rng.float(), rng.float(), rng.float(), rng.float()];
  return p;
}

function planTownhouse(lw, ld, L, rng) {
  const p = { kind: 'town', level: L, ...common(rng) };
  p.w = clamp(lw - 1.5, 8, 30);
  p.d = clamp(ld * 0.55, 8, 13);
  p.units = clamp(Math.round(p.w / 6.2), 2, 5);
  p.floors = L === 1 ? 2 : 3;
  p.floorH = 3.05;
  p.facade = rng.pick(TOWN_FACADES);
  p.wall = rng.pick(['#f0ece2', '#e5ded0', '#cfdcdd', '#eddcbc', '#dcc7b4', '#c8d5c4']);
  p.trim = '#f4f1e8';
  p.roofKind = rng.bool(0.6) ? 'gable' : 'flat';
  p.roofTile = rng.pick(['roof_shingle_dark', 'roof_shingle_grey', 'roof_tile_red']);
  p.pitch = rng.range(0.36, 0.5);
  p.overhang = 0.35;
  p.bayW = p.w / (p.units * 2);
  p.parapetH = 0.55;
  p.hedge = rng.bool(0.6);
  p.driveway = true;
  p.frontSet = clamp(ld - p.d - 2, 3, 10);
  p.height = p.floors * p.floorH + (p.roofKind === 'gable' ? p.pitch * p.d * 0.5 : p.parapetH);
  p.zOff = setbackShift(ld, p.d, 3.6);
  p.unitTints = Array.from({ length: p.units }, () => rng.range(0.82, 1.06));
  p.r = [rng.float(), rng.float(), rng.float(), rng.float()];
  return p;
}

function planApartment(lw, ld, L, rng) {
  const p = { kind: 'apt', level: L, ...common(rng) };
  p.w = clamp(lw - rng.range(3, 6), 12, 34);
  p.d = clamp(ld - rng.range(6, 12), 11, 24);
  p.floorH = 3.0;
  p.groundH = 3.6;
  p.floors = L === 3 ? rng.int(4, 6) : L === 4 ? rng.int(7, 9) : rng.int(10, 14);
  p.facade = rng.pick(APT_FACADES);
  p.wall = rng.pick(['#efe9dd', '#e2ddd2', '#cfdde2', '#f0dcb6', '#d8d4cc', '#dcc4b0', '#c7d5c9', '#e6d3d6']);
  p.bayW = rng.range(3.2, 3.7);
  p.balcony = rng.bool(0.85);
  p.balconyGlass = rng.bool(0.45);
  p.setback = p.floors >= 8 && rng.bool(0.6);
  p.setbackAt = Math.round(p.floors * rng.range(0.6, 0.75));
  p.setbackIn = rng.range(1.6, 3.2);
  p.roofTile = rng.pick(['roof_gravel', 'roof_membrane', 'roof_membrane_dark']);
  p.parapetH = rng.range(0.8, 1.25);
  p.clutter = 3 + Math.round(p.floors / 4);
  p.tank = rng.bool(0.3);
  p.antenna = rng.bool(0.5);
  p.stairBox = true;
  p.groundFacade = rng.bool(0.35) ? rng.pick(SHOPS) : null;
  p.frontSet = clamp(ld - p.d - 3, 2, 12);
  p.hedge = rng.bool(0.5);
  p.height = p.groundH + (p.floors - 1) * p.floorH + p.parapetH;
  p.zOff = setbackShift(ld, p.d, 4.5);
  p.r = Array.from({ length: 12 }, () => rng.float());
  p.clutterR = Array.from({ length: 40 }, () => rng.float());
  return p;
}

function planOfficeLow(lw, ld, L, rng) {
  const p = { kind: 'officelow', level: L, ...common(rng) };
  p.w = clamp(lw - rng.range(3, 7), 14, 34);
  p.d = clamp(ld - rng.range(6, 12), 12, 24);
  p.floors = clamp(1 + L, 2, 6);
  p.floorH = 3.7;
  p.groundH = 4.2;
  p.facade = rng.bool(0.5) ? 'office_stone' : 'comm_upper';
  p.wall = rng.pick(['#e9e4d8', '#dcd9d2', '#e4dbc9', '#d6dbdd']);
  p.bayW = rng.range(3.0, 3.5);
  p.roofTile = rng.pick(['roof_gravel', 'roof_membrane']);
  p.parapetH = rng.range(0.9, 1.4);
  p.clutter = 3 + L;
  p.antenna = rng.bool(0.4);
  p.tank = false;
  p.stairBox = true;
  p.canopy = true;
  p.parking = true;
  p.frontSet = clamp(ld - p.d - 3, 3, 14);
  p.height = p.groundH + (p.floors - 1) * p.floorH + p.parapetH;
  p.zOff = setbackShift(ld, p.d, 6);
  p.r = Array.from({ length: 10 }, () => rng.float());
  p.clutterR = Array.from({ length: 40 }, () => rng.float());
  return p;
}

function planTower(lw, ld, L, rng) {
  const p = { kind: 'tower', level: L, ...common(rng) };
  p.w = clamp(lw - rng.range(3, 8), 16, 40);
  p.d = clamp(ld - rng.range(4, 10), 14, 34);
  p.floorH = 3.85;
  p.groundH = 5.6;
  p.floors = L === 1 ? rng.int(5, 8) : L === 2 ? rng.int(9, 13) : L === 3 ? rng.int(13, 19)
    : L === 4 ? rng.int(18, 26) : rng.weighted([[rng.int(20, 27), 5], [rng.int(28, 34), 3], [rng.int(36, 46), 1.4]]);
  p.facade = rng.weighted([[rng.pick(OFFICE_GLASS), 6], ['office_stone', 2], ['comm_upper', 1]]);
  p.baseFacade = rng.bool(0.5) ? 'office_stone' : null;
  p.wall = rng.pick(['#f4f4f2', '#e9eef0', '#dfe3e6', '#eae6dc', '#cfe0ea', '#e8e2d2']);
  p.bayW = rng.range(2.7, 3.2);
  p.steps = p.floors >= 20 ? rng.int(1, 2) : p.floors >= 12 ? rng.int(0, 1) : 0;
  p.stepAt = [rng.range(0.5, 0.66), rng.range(0.76, 0.88)];
  p.stepIn = [rng.range(0.1, 0.2), rng.range(0.1, 0.18)];
  p.crown = rng.bool(0.7);
  p.mast = p.floors >= 12 && rng.bool(0.75);
  p.podium = rng.bool(0.55);
  p.podiumFloors = rng.int(1, 2);
  p.podiumOut = rng.range(1.6, 3.5);
  p.roofTile = 'roof_membrane_dark';
  p.parapetH = rng.range(1.0, 1.6);
  p.clutter = 4;
  p.stairBox = true;
  p.plaza = true;
  p.frontSet = clamp(ld - p.d - 3, 3, 16);
  p.height = p.groundH + (p.floors - 1) * p.floorH + p.parapetH + (p.mast ? 12 : 0);
  p.zOff = setbackShift(ld, p.d + (p.podium ? p.podiumOut : 0), 5.5);
  p.r = Array.from({ length: 14 }, () => rng.float());
  p.clutterR = Array.from({ length: 40 }, () => rng.float());
  return p;
}

function planShop(lw, ld, L, rng, high) {
  const p = { kind: 'shop', level: L, high, ...common(rng) };
  p.w = clamp(lw - rng.range(1.5, 4), 10, 36);
  p.d = clamp(ld - rng.range(5, 14), 10, 26);
  p.groundH = 4.5;
  p.floorH = 3.4;
  p.floors = high ? clamp(2 + L, 3, 9) : clamp(L <= 2 ? 1 : L <= 4 ? 2 : 3, 1, 3);
  p.shop = rng.pick(SHOPS);
  p.facade = 'comm_upper';
  p.wall = rng.pick(['#eae4d6', '#ded9cd', '#efd9a8', '#cdd9e2', '#e3c2ae', '#c9d6c6', '#e8dccb']);
  p.bayW = rng.range(3.4, 4.0);
  p.roofTile = rng.pick(['roof_gravel', 'roof_membrane', 'roof_membrane_dark']);
  p.parapetH = rng.range(0.75, 1.5);
  p.signBox = rng.bool(0.6);
  p.clutter = 2 + Math.round(p.floors / 2);
  p.stairBox = p.floors >= 3;
  p.antenna = rng.bool(0.3);
  p.parking = !high && rng.bool(0.8);
  p.frontSet = clamp(ld - p.d - 2, 1.5, 14);
  p.canopy = !high;
  p.height = p.groundH + (p.floors - 1) * p.floorH + p.parapetH;
  p.zOff = setbackShift(ld, p.d, p.high ? 3 : 5.5);
  p.r = Array.from({ length: 10 }, () => rng.float());
  p.clutterR = Array.from({ length: 40 }, () => rng.float());
  return p;
}

function planWarehouse(lw, ld, L, rng, high) {
  const p = { kind: 'ind', level: L, high, ...common(rng) };
  p.w = clamp(lw - rng.range(3, 8), 14, 46);
  p.d = clamp(ld - rng.range(8, 18), 12, 34);
  p.wallH = high ? rng.range(9, 13) : rng.range(6, 9) + L * 0.4;
  p.floorH = 4.2;
  p.floors = Math.max(1, Math.round(p.wallH / p.floorH));
  p.facade = rng.bool(0.55) ? 'ind_metal' : 'ind_panel';
  p.wall = rng.pick(['#dfe2e2', '#d5d8d6', '#e0dcd0', '#c9d2d6', '#dfd6c6']);
  p.bayW = rng.range(3.8, 4.6);
  p.roofKind = rng.bool(0.55) ? 'shed' : 'flat';
  p.roofTile = rng.pick(['roof_seam', 'roof_membrane', 'roof_gravel']);
  p.parapetH = rng.range(0.5, 0.9);
  p.docks = clamp(Math.round(p.w / 9), 1, 4);
  p.dockCanopy = rng.bool(0.7);
  p.officeBox = rng.bool(0.7);
  p.silos = high ? rng.int(0, 3) : 0;
  p.stack = high && rng.bool(0.6);
  p.vents = 3 + (high ? 4 : 2);
  p.tanks = high && rng.bool(0.5);
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
/** four tiled facade walls of a rectangular volume */
function walls(mb, A, o) {
  const near = o.lod === 0;
  const fv = [A.rect(`${o.facade}_a`), A.rect(`${o.facade}_b`), A.rect(`${o.facade}_c`)];
  const fr = A.rect(`${o.facade}_row`);
  const w = o.w, d = o.d, hw = w / 2, hd = d / 2;
  const gh = o.groundTile ? (o.groundH || o.floorH) : (o.groundH || 0);
  const upFloors = o.floors - (gh > 0 ? 1 : 0);
  const upH = upFloors * o.floorH;
  const y1 = o.y0 + gh;
  const sides = [
    { L: w, o: [-hw, 0, hd], u: [1, 0, 0], f: 0 },
    { L: w, o: [hw, 0, -hd], u: [-1, 0, 0], f: 1 },
    { L: d, o: [hw, 0, hd], u: [0, 0, -1], f: 2 },
    { L: d, o: [-hw, 0, -hd], u: [0, 0, 1], f: 3 },
  ];
  const V = [0, 1, 0];
  for (const s of sides) {
    if (o.faces && !o.faces[s.f]) continue;
    const bays = clamp(Math.round(s.L / o.bayW), 1, 24);
    const wbx = o.wsx + s.f * 137, wby = o.wsy + s.f * 41;
    if (gh > 0) {
      const g = o.groundTile || o.facade;
      const gv = near ? ['a', 'b', 'c'].map((k) => A.rect(`${g}_${k}`)) : null;
      const gt = A.rect(near ? `${g}_a` : `${g}_row`);
      const gn = near
        ? (o.groundTile ? Math.max(1, Math.round(s.L / (o.groundBayW || o.bayW * 1.35))) : bays)
        : Math.max(1, Math.ceil(bays / 3));
      mb.grid([s.o[0], o.y0, s.o[2]], s.u, V, s.L, gh, gn, 1, gt, [wbx, wby], [bays / gn, 1], gv);
    }
    if (upFloors > 0) {
      if (near) mb.grid([s.o[0], y1, s.o[2]], s.u, V, s.L, upH, bays, upFloors, fv[0], [wbx, wby + 1], [1, 1], fv);
      else {
        const nu = Math.max(1, Math.ceil(bays / 3));
        mb.grid([s.o[0], y1, s.o[2]], s.u, V, s.L, upH, nu, upFloors, fr, [wbx, wby + 1], [bays / nu, 1]);
      }
    }
  }
}

/** parapet ring on a flat roof: outer band, inner band and a coping cap */
function parapet(mb, A, cx, cz, w, d, yTop, h, outTile, capTile) {
  const t = 0.34;
  const hw = w / 2, hd = d / 2;
  const rects = [
    [cx, cz + hd - t / 2, w, t], [cx, cz - hd + t / 2, w, t],
    [cx + hw - t / 2, cz, t, d - t * 2], [cx - hw + t / 2, cz, t, d - t * 2],
  ];
  for (const [rx, rz, rw, rd] of rects) {
    mb.box(rx, yTop, rz, rw, h, rd, { side: outTile, top: capTile || outTile }, 2.2);
  }
}

/** roof deck + parapet + rooftop clutter */
function flatRoof(mb, A, p, o) {
  const roof = A.rect(o.roofTile);
  const hw = o.w / 2, hd = o.d / 2;
  mb.grid([-hw, o.y, hd], [1, 0, 0], [0, 0, -1], o.w, o.d, Math.max(1, Math.round(o.w / 5)), Math.max(1, Math.round(o.d / 5)), roof);
  if (o.parapetH > 0) parapet(mb, A, 0, 0, o.w + 0.3, o.d + 0.3, o.y, o.parapetH, A.rect(o.parapetTile || 'wall_concrete'), A.rect('trim_grey'));
  roofClutter(mb, A, p, o);
}

function roofClutter(mb, A, p, o) {
  const near = o.lod === 0;
  const R = p.clutterR || p.r;
  const metal = A.rect('metal_light'), dark = A.rect('metal_dark'), ribbed = A.rect('metal_ribbed');
  const hw = o.w / 2 - 1.6, hd = o.d / 2 - 1.6;
  let k = 0;
  const rr = () => R[(k++) % R.length];
  const n = Math.min(o.clutter || 3, near ? 8 : 5);
  for (let i = 0; i < n; i++) {
    const bw = 1.4 + rr() * 2.6, bd = 1.1 + rr() * 2.0, bh = 0.7 + rr() * 1.1;
    const x = (rr() * 2 - 1) * Math.max(0.2, hw - bw / 2), z = (rr() * 2 - 1) * Math.max(0.2, hd - bd / 2);
    mb.colorHex(i % 3 === 0 ? '#cfd3d4' : '#b8bec1');
    mb.box(x, o.y + 0.06, z, bw, bh, bd, { side: ribbed, top: metal }, 2.0);
    // fan grille on top
    mb.colorHex('#8d9498');
    mb.box(x, o.y + 0.06 + bh, z, bw * 0.5, 0.16, bd * 0.5, { side: dark, top: dark }, 2.0);
  }
  // vents
  for (let i = 0; i < (near ? 3 : 0); i++) {
    const x = (rr() * 2 - 1) * hw, z = (rr() * 2 - 1) * hd;
    mb.colorHex('#c6cacb');
    mb.cylinder(x, o.y + 0.05, z, 0.28 + rr() * 0.2, 0.5 + rr() * 0.5, 8, metal, metal);
  }
  if (o.stairBox) {
    mb.colorHex('#ded9cf');
    const sw = Math.min(4.2, o.w * 0.3), sd = Math.min(3.6, o.d * 0.34);
    mb.box(hw * 0.35, o.y + 0.05, -hd * 0.4, sw, 2.7, sd, { side: A.rect('wall_concrete'), top: A.rect('roof_membrane') }, 2.5);
  }
  if (o.tank) {
    const tx = -hw * 0.5, tz = hd * 0.35;
    mb.colorHex('#8b8b8b');
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mb.box(tx + dx * 1.0, o.y + 0.05, tz + dz * 1.0, 0.22, 2.4, 0.22, { side: A.rect('metal_dark') }, 3);
    mb.colorHex('#a08054');
    mb.cylinder(tx, o.y + 2.45, tz, 1.7, 3.0, 12, A.rect('wood_tank'), A.rect('metal_dark'));
    mb.colorHex('#7a5f42');
    mb.cylinder(tx, o.y + 5.45, tz, 1.7, 0.9, 12, A.rect('wood_tank'), A.rect('wood_tank'));
  }
  if (o.antenna) {
    mb.colorHex('#b4b8ba');
    const ax = hw * 0.6, az = hd * 0.55;
    mb.box(ax, o.y + 0.05, az, 0.16, 4.5 + rr() * 3, 0.16, { side: A.rect('metal_light') }, 4);
    mb.box(ax, o.y + 3.2, az, 1.5, 0.1, 0.1, { side: A.rect('metal_light') }, 4);
    mb.box(ax, o.y + 4.0, az, 1.0, 0.1, 0.1, { side: A.rect('metal_light') }, 4);
  }
  mb.colorHex('#ffffff');
}

/** pitched roof (gable / hip) with eave overhang, fascia and soffit */
function pitchedRoof(mb, A, o) {
  const tile = A.rect(o.roofTile);
  const oh = o.overhang;
  const W = o.w + oh * 2, D = o.d + oh * 2;
  const hw = W / 2, hd = D / 2;
  const ye = o.y;
  const rise = o.pitch * Math.min(W, D) * 0.5;
  const yr = ye + rise;
  const step = 2.4;
  // soffit (closes the underside of the overhang)
  mb.colorHex(o.trim || '#e8e4d9');
  mb.grid([-hw, ye - 0.02, -hd], [1, 0, 0], [0, 0, 1], W, D, Math.max(1, Math.round(W / 3)), Math.max(1, Math.round(D / 3)), A.rect('trim_white'));
  // fascia boards
  const ft = A.rect('trim_white');
  mb.box(0, ye, hd - 0.09, W, 0.26, 0.18, { side: ft, top: ft }, 2.5);
  mb.box(0, ye, -hd + 0.09, W, 0.26, 0.18, { side: ft, top: ft }, 2.5);
  mb.box(hw - 0.09, ye, 0, 0.18, 0.26, D - 0.36, { side: ft, top: ft }, 2.5);
  mb.box(-hw + 0.09, ye, 0, 0.18, 0.26, D - 0.36, { side: ft, top: ft }, 2.5);
  mb.colorHex(o.roofTint || '#ffffff');
  if (o.kind === 'hip') {
    const rl = Math.max(0.6, W - D);
    const rx0 = -rl / 2, rx1 = rl / 2;
    const nu = Math.max(1, Math.round(W / step)), nv = Math.max(1, Math.round((D / 2) / step));
    mb.slope([-hw, ye, hd], [hw, ye, hd], [rx1, yr, 0], [rx0, yr, 0], tile, nu, nv);
    mb.slope([hw, ye, -hd], [-hw, ye, -hd], [rx0, yr, 0], [rx1, yr, 0], tile, nu, nv);
    mb.tri([hw, ye, hd], [hw, ye, -hd], [rx1, yr, 0], tile, [0, 0], [1, 0], [0.5, 1]);
    mb.tri([-hw, ye, -hd], [-hw, ye, hd], [rx0, yr, 0], tile, [0, 0], [1, 0], [0.5, 1]);
  } else {
    const nu = Math.max(1, Math.round(W / step)), nv = Math.max(1, Math.round((D / 2) / step));
    mb.slope([-hw, ye, hd], [hw, ye, hd], [hw, yr, 0], [-hw, yr, 0], tile, nu, nv);
    mb.slope([hw, ye, -hd], [-hw, ye, -hd], [-hw, yr, 0], [hw, yr, 0], tile, nu, nv);
    // gable ends (walls, in the wall material)
    mb.colorHex(o.wallTint || '#ffffff');
    const gt = A.rect(o.gableTile || 'wall_siding');
    mb.tri([hw - oh, ye, hd - oh], [hw - oh, ye, -hd + oh], [hw - oh, yr, 0], gt, [0, 0], [1, 0], [0.5, 1]);
    mb.tri([-hw + oh, ye, -hd + oh], [-hw + oh, ye, hd - oh], [-hw + oh, yr, 0], gt, [0, 0], [1, 0], [0.5, 1]);
    mb.colorHex(o.roofTint || '#ffffff');
    // verge boards
    mb.colorHex(o.trim || '#e8e4d9');
    mb.colorHex('#ffffff');
  }
  mb.colorHex('#ffffff');
  return yr;
}

/** foundation skirt so a building on a slope never floats */
function skirt(mb, A, w, d, drop) {
  if (drop <= 0.05) return;
  mb.colorHex('#9d9a92');
  mb.box(0, -drop, 0, w + 0.12, drop + 0.05, d + 0.12, { side: A.rect('concrete_slab') }, 2.5);
  mb.colorHex('#ffffff');
}

// ------------------------------------------------------------------ archetypes
function emitHouse(mb, A, p, lod, ground) {
  const near = lod === 0;
  const y0 = 0;
  mb.colorHex(p.wall);
  const floorH = p.floorH;
  const bodyH = p.floors * floorH;
  walls(mb, A, { w: p.w, d: p.d, y0, floors: p.floors, floorH, bayW: p.bayW, facade: p.facade, wsx: p.wsx, wsy: p.wsy, lod });
  // front door
  if (near) {
    mb.colorHex('#ffffff');
    const dw = 1.15, dh = 2.35;
    mb.grid([-dw / 2 + p.w * 0.18, y0, p.d / 2 + 0.02], [1, 0, 0], [0, 1, 0], dw, dh, 1, 1, A.rect('door_entrance'));
  }
  // wing (an L-shaped plan reads much less like a box)
  if (p.wing) {
    const ww = p.w * 0.55, wd = p.d * 0.45;
    const cx = -p.w * 0.5 + ww * 0.5 + p.jitter[0] * 0.2;
    const cz = p.d * 0.5 + wd * 0.5 - 0.5;
    const save = [mb.ox, mb.oz];
    mb.ox += mb.c * cx + mb.s * cz; mb.oz += mb.s * cx - mb.c * cz;
    mb.colorHex(p.wall);
    walls(mb, A, { w: ww, d: wd, y0, floors: 1, floorH, bayW: p.bayW, facade: p.facade, wsx: p.wsx + 311, wsy: p.wsy + 7, lod, faces: [1, 0, 1, 1] });
    mb.colorHex('#ffffff');
    pitchedRoof(mb, A, { w: ww, d: wd, y: floorH, pitch: p.pitch * 0.9, overhang: p.overhang * 0.8, kind: 'gable', roofTile: p.roofTile, trim: p.trim, gableTile: p.facade === 'res_brick' ? 'wall_brick' : 'wall_siding', wallTint: p.wall });
    mb.ox = save[0]; mb.oz = save[1];
  }
  // main roof
  mb.colorHex('#ffffff');
  const yr = pitchedRoof(mb, A, {
    w: p.w, d: p.d, y: bodyH, pitch: p.pitch, overhang: p.overhang, kind: p.roofKind,
    roofTile: p.roofTile, trim: p.trim, gableTile: p.facade === 'res_brick' ? 'wall_brick' : p.facade === 'res_stucco' ? 'wall_stucco' : 'wall_siding',
    wallTint: p.wall,
  });
  // porch
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
  // garage
  if (p.garage) {
    const gw = p.garageW, gd = Math.min(p.d * 0.72, 6.4), gh = 2.85;
    const cx = p.garageSide * (p.w / 2 + gw / 2 + 0.15);
    const cz = p.d / 2 - gd / 2;
    const save = [mb.ox, mb.oz];
    mb.ox += mb.c * cx + mb.s * cz; mb.oz += mb.s * cx - mb.c * cz;
    mb.colorHex(p.wall);
    walls(mb, A, { w: gw, d: gd, y0, floors: 1, floorH: gh, bayW: p.bayW, facade: p.facade, wsx: p.wsx + 99, wsy: p.wsy + 55, lod, faces: [0, 1, 1, 1] });
    mb.colorHex('#ffffff');
    mb.grid([-gw * 0.42, 0, gd / 2 + 0.02], [1, 0, 0], [0, 1, 0], gw * 0.84, gh * 0.78, 1, 1, A.rect('door_garage'));
    mb.colorHex(p.wall);
    mb.grid([-gw / 2, gh * 0.78, gd / 2 + 0.02], [1, 0, 0], [0, 1, 0], gw, gh * 0.22, 1, 1, A.rect('wall_siding'));
    mb.colorHex('#ffffff');
    pitchedRoof(mb, A, { w: gw, d: gd, y: gh, pitch: p.pitch * 0.8, overhang: p.overhang * 0.7, kind: 'gable', roofTile: p.roofTile, trim: p.trim, gableTile: 'wall_siding', wallTint: p.wall });
    mb.ox = save[0]; mb.oz = save[1];
  }
  if (!near) return;
  // dormers
  for (let i = 0; i < p.dormers; i++) {
    const dw = 1.7, dd = 1.5;
    const x = (i - (p.dormers - 1) / 2) * (p.w / (p.dormers + 0.4));
    const z = p.d * 0.18;
    const dy = bodyH + (yr - bodyH) * 0.34;
    mb.colorHex(p.trim);
    mb.box(x, dy, z, dw, 1.35, dd, { side: A.rect('trim_white') }, 2);
    mb.colorHex('#ffffff');
    mb.grid([x - dw * 0.32, dy + 0.25, z + dd / 2 + 0.02], [1, 0, 0], [0, 1, 0], dw * 0.64, 0.95, 1, 1, A.rect('res_siding_a'));
    pitchedRoof(mb, A, { w: dw, d: dd, y: dy + 1.35, pitch: 0.55, overhang: 0.18, kind: 'gable', roofTile: p.roofTile, trim: p.trim, gableTile: 'trim_white', wallTint: p.trim });
  }
  // chimney
  if (p.chimney) {
    mb.colorHex('#a2705c');
    const cx = p.w * 0.32 * (p.r[0] > 0.5 ? 1 : -1);
    mb.box(cx, bodyH - 0.3, -p.d * 0.16, 0.85, (yr - bodyH) + 1.2, 0.75, { side: A.rect('wall_brick'), top: A.rect('trim_grey') }, 1.6);
    mb.colorHex('#ffffff');
  }
  // solar panels on the sunny slope
  if (p.solar) {
    const pw = p.w * 0.5, pd = (yr - bodyH) * 0.75;
    const t = 0.5;
    const yA = bodyH + (yr - bodyH) * 0.12, yB = bodyH + (yr - bodyH) * 0.8;
    const zA = p.d / 2 * 0.86, zB = p.d / 2 * 0.16;
    mb.quad([-pw / 2, yA + 0.05, zA], [pw / 2, yA + 0.05, zA], [pw / 2, yB + 0.05, zB], [-pw / 2, yB + 0.05, zB], A.rect('solar'));
  }
}

function emitTown(mb, A, p, lod) {
  const near = lod === 0;
  const bodyH = p.floors * p.floorH;
  const unitW = p.w / p.units;
  mb.colorHex(p.wall);
  walls(mb, A, { w: p.w, d: p.d, y0: 0, floors: p.floors, floorH: p.floorH, bayW: p.bayW, facade: p.facade, wsx: p.wsx, wsy: p.wsy, lod });
  if (near) {
    // per-unit doors and a shallow projecting entrance bay
    for (let i = 0; i < p.units; i++) {
      const cx = -p.w / 2 + unitW * (i + 0.5);
      mb.colorHex('#ffffff');
      mb.grid([cx - 0.6, 0, p.d / 2 + 0.03], [1, 0, 0], [0, 1, 0], 1.2, 2.4, 1, 1, A.rect('door_entrance'));
      mb.colorHex(p.trim);
      mb.box(cx, 2.42, p.d / 2 + 0.35, 1.9, 0.22, 0.75, { side: A.rect('trim_white'), top: A.rect('roof_membrane') }, 2);
      mb.colorHex('#a8a49b');
      mb.box(cx, 0, p.d / 2 + 0.45, 1.7, 0.2, 0.9, { side: A.rect('concrete_slab'), top: A.rect('concrete_slab') }, 2);
      // party-wall pilaster between units
      if (i > 0) { mb.colorHex(p.wall); mb.box(-p.w / 2 + unitW * i, 0, p.d / 2 + 0.06, 0.35, bodyH, 0.12, { side: A.rect('wall_brick') }, 3); }
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
    flatRoof(mb, A, p, { w: p.w, d: p.d, y: bodyH, parapetH: p.parapetH, roofTile: p.roofTile, clutter: 2, lod, parapetTile: 'wall_brick' });
  }
}

function emitApartment(mb, A, p, lod) {
  const near = lod === 0;
  const yTop = p.groundH + (p.floors - 1) * p.floorH;
  const setY = p.setback ? p.groundH + (p.setbackAt - 1) * p.floorH : yTop;
  mb.colorHex(p.wall);
  const lowerFloors = p.setback ? p.setbackAt : p.floors;
  walls(mb, A, {
    w: p.w, d: p.d, y0: 0, floors: lowerFloors, floorH: p.floorH, groundH: p.groundH, bayW: p.bayW,
    facade: p.facade, groundTile: p.groundFacade, groundBayW: 5.0, wsx: p.wsx, wsy: p.wsy, lod,
  });
  if (p.setback) {
    const w2 = p.w - p.setbackIn * 2, d2 = p.d - p.setbackIn * 2;
    mb.colorHex(p.wall);
    walls(mb, A, { w: w2, d: d2, y0: setY, floors: p.floors - p.setbackAt, floorH: p.floorH, bayW: p.bayW, facade: p.facade, wsx: p.wsx + 213, wsy: p.wsy + 17, lod });
    mb.colorHex('#ffffff');
    // terrace on the setback
    mb.grid([-p.w / 2, setY, p.d / 2], [1, 0, 0], [0, 0, -1], p.w, p.d, Math.max(1, Math.round(p.w / 5)), Math.max(1, Math.round(p.d / 5)), A.rect(p.roofTile));
    parapet(mb, A, 0, 0, p.w + 0.3, p.d + 0.3, setY, 1.0, A.rect('wall_concrete'), A.rect('trim_grey'));
    flatRoof(mb, A, p, { w: w2, d: d2, y: yTop, parapetH: p.parapetH, roofTile: p.roofTile, clutter: p.clutter, lod, tank: p.tank, antenna: p.antenna, stairBox: p.stairBox });
  } else {
    flatRoof(mb, A, p, { w: p.w, d: p.d, y: yTop, parapetH: p.parapetH, roofTile: p.roofTile, clutter: p.clutter, lod, tank: p.tank, antenna: p.antenna, stairBox: p.stairBox });
  }
  if (!near) return;
  // entrance canopy
  mb.colorHex('#dcd8cf');
  mb.box(0, p.groundH - 0.9, p.d / 2 + 0.9, Math.min(p.w * 0.4, 5.5), 0.3, 1.9, { side: A.rect('wall_concrete'), top: A.rect('roof_membrane') }, 3);
  mb.colorHex('#ffffff');
  if (!p.groundFacade) mb.grid([-1.3, 0, p.d / 2 + 0.03], [1, 0, 0], [0, 1, 0], 2.6, 2.7, 1, 1, A.rect('door_entrance'));
  // balconies on the long faces
  if (p.balcony) {
    const bays = clamp(Math.round(p.w / p.bayW), 1, 24);
    const bw = p.w / bays;
    const rail = p.balconyGlass ? A.rect('glass_plain') : A.rect('trim_grey');
    let made = 0;
    for (let f = 1; f < lowerFloors && made < 26; f++) {
      const y = p.groundH + (f - 1) * p.floorH;
      for (let i = 0; i < bays && made < 26; i++) {
        if ((i + f) % 2 === 1) continue;
        const cx = -p.w / 2 + bw * (i + 0.5);
        for (const sgn of [1, -1]) {
          const cz = sgn * (p.d / 2 + 0.72);
          mb.colorHex('#cfcabf');
          mb.box(cx, y, cz, bw * 0.92, 0.2, 1.42, { side: A.rect('wall_concrete'), top: A.rect('concrete_slab'), bottom: A.rect('wall_concrete') }, 2.2);
          mb.colorHex(p.balconyGlass ? '#bcd0dd' : '#c8c4bb');
          mb.box(cx, y + 0.2, cz + sgn * 0.66, bw * 0.92, 1.05, 0.09, { side: rail, top: A.rect('trim_grey') }, 2.2);
          mb.box(cx - bw * 0.44, y + 0.2, cz, 0.09, 1.05, 1.4, { side: rail, top: A.rect('trim_grey') }, 2.2);
          mb.box(cx + bw * 0.44, y + 0.2, cz, 0.09, 1.05, 1.4, { side: rail, top: A.rect('trim_grey') }, 2.2);
          made++;
          if (sgn === -1) break;
        }
      }
    }
    mb.colorHex('#ffffff');
  }
}

function emitOfficeLow(mb, A, p, lod) {
  const yTop = p.groundH + (p.floors - 1) * p.floorH;
  mb.colorHex(p.wall);
  walls(mb, A, { w: p.w, d: p.d, y0: 0, floors: p.floors, floorH: p.floorH, groundH: p.groundH, bayW: p.bayW, facade: p.facade, wsx: p.wsx, wsy: p.wsy, lod });
  // horizontal banding between floors reads as a precast frame
  if (lod === 0) {
    mb.colorHex('#e6e2d8');
    for (let f = 1; f < p.floors; f++) {
      const y = p.groundH + (f - 1) * p.floorH - 0.12;
      mb.box(0, y, 0, p.w + 0.24, 0.3, p.d + 0.24, { side: A.rect('wall_concrete'), top: null }, 3);
    }
    mb.colorHex('#ffffff');
  }
  flatRoof(mb, A, p, { w: p.w, d: p.d, y: yTop, parapetH: p.parapetH, roofTile: p.roofTile, clutter: p.clutter, lod, antenna: p.antenna, stairBox: p.stairBox });
  if (lod !== 0) return;
  mb.colorHex('#c9ccce');
  mb.box(0, p.groundH - 1.0, p.d / 2 + 1.3, Math.min(p.w * 0.42, 7), 0.28, 2.6, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 3);
  for (const s of [-1, 1]) mb.box(s * Math.min(p.w * 0.18, 3), 0, p.d / 2 + 2.4, 0.18, p.groundH - 1.0, 0.18, { side: A.rect('metal_light') }, 3);
  mb.colorHex('#ffffff');
  mb.grid([-1.6, 0, p.d / 2 + 0.03], [1, 0, 0], [0, 1, 0], 3.2, 2.9, 1, 1, A.rect('glass_plain'));
}

function emitTower(mb, A, p, lod) {
  const near = lod === 0;
  const yTop = p.groundH + (p.floors - 1) * p.floorH;
  // podium
  if (p.podium) {
    const pw = p.w + p.podiumOut * 2, pd = p.d + p.podiumOut;
    const ph = p.groundH + (p.podiumFloors - 1) * p.floorH;
    mb.colorHex(p.wall);
    walls(mb, A, { w: pw, d: pd, y0: 0, floors: p.podiumFloors, floorH: p.floorH, groundH: p.groundH, bayW: p.bayW * 1.2, facade: p.baseFacade || p.facade, wsx: p.wsx + 71, wsy: p.wsy + 3, lod });
    mb.colorHex('#ffffff');
    mb.grid([-pw / 2, ph, pd / 2], [1, 0, 0], [0, 0, -1], pw, pd, Math.max(1, Math.round(pw / 5)), Math.max(1, Math.round(pd / 5)), A.rect('roof_membrane'));
    parapet(mb, A, 0, 0, pw + 0.2, pd + 0.2, ph, 1.0, A.rect('wall_concrete'), A.rect('trim_grey'));
  }
  // shaft with setbacks
  let w = p.w, d = p.d, y = 0, first = true;
  const stepFloors = [];
  for (let s = 0; s < p.steps; s++) stepFloors.push(Math.max(2, Math.round(p.floors * p.stepAt[s])));
  let prev = 0;
  const segs = [];
  for (const sf of stepFloors) { segs.push(sf - prev); prev = sf; }
  segs.push(p.floors - prev);
  for (let i = 0; i < segs.length; i++) {
    const n = segs[i];
    if (n <= 0) continue;
    const segH = (first ? p.groundH + (n - 1) * p.floorH : n * p.floorH);
    mb.colorHex(p.wall);
    walls(mb, A, {
      w, d, y0: y, floors: n, floorH: p.floorH, groundH: first ? p.groundH : undefined,
      bayW: p.bayW, facade: (first && p.baseFacade && !p.podium) ? p.facade : p.facade,
      wsx: p.wsx + i * 57, wsy: p.wsy + (first ? 0 : Math.round(y / p.floorH)), lod,
    });
    y += segH;
    if (i < segs.length - 1) {
      // setback ledge
      mb.colorHex('#ffffff');
      mb.grid([-w / 2, y, d / 2], [1, 0, 0], [0, 0, -1], w, d, Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(d / 6)), A.rect('roof_membrane_dark'));
      parapet(mb, A, 0, 0, w + 0.2, d + 0.2, y, 0.9, A.rect('wall_concrete_dark'), A.rect('trim_grey'));
      w *= 1 - p.stepIn[i]; d *= 1 - p.stepIn[i];
    }
    first = false;
  }
  const topY = y;
  flatRoof(mb, A, p, { w, d, y: topY, parapetH: p.parapetH, roofTile: p.roofTile, clutter: p.clutter, lod, stairBox: p.stairBox, parapetTile: 'wall_concrete_dark' });
  if (p.crown) {
    mb.colorHex('#e8ecee');
    mb.box(0, topY + p.parapetH, 0, w * 0.72, 2.6, d * 0.72, { side: A.rect('metal_light'), top: A.rect('metal_dark') }, 3);
    mb.colorHex('#ffffff');
  }
  if (p.mast && near) {
    mb.colorHex('#c2c6c8');
    const my = topY + p.parapetH + (p.crown ? 2.6 : 0);
    mb.box(0, my, 0, 0.5, 10, 0.5, { side: A.rect('metal_light') }, 4);
    mb.box(0, my + 10, 0, 0.22, 4, 0.22, { side: A.rect('metal_light') }, 4);
    mb.colorHex('#ffffff');
  }
  if (!near) return;
  // entrance: a glazed two-storey lobby slot on the front
  mb.colorHex('#ffffff');
  const ew = Math.min(p.w * 0.5, 9);
  mb.grid([-ew / 2, 0.1, (p.podium ? p.d / 2 + p.podiumOut / 2 : p.d / 2) + 0.04], [1, 0, 0], [0, 1, 0], ew, p.groundH - 0.4, Math.max(1, Math.round(ew / 3)), 1, A.rect('glass_plain'));
  mb.colorHex('#b9bdbf');
  mb.box(0, p.groundH - 0.9, (p.podium ? p.d / 2 + p.podiumOut / 2 : p.d / 2) + 1.6, ew + 1.6, 0.35, 3.2, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 3);
  mb.colorHex('#ffffff');
}

function emitShop(mb, A, p, lod) {
  const near = lod === 0;
  const yTop = p.groundH + (p.floors - 1) * p.floorH;
  mb.colorHex(p.wall);
  walls(mb, A, {
    w: p.w, d: p.d, y0: 0, floors: p.floors, floorH: p.floorH, groundH: p.groundH, bayW: p.bayW,
    facade: p.facade, groundTile: p.shop, groundBayW: 5.6, wsx: p.wsx, wsy: p.wsy, lod,
  });
  flatRoof(mb, A, p, { w: p.w, d: p.d, y: yTop, parapetH: p.parapetH, roofTile: p.roofTile, clutter: p.clutter, lod, antenna: p.antenna, stairBox: p.stairBox });
  if (!near) return;
  if (p.signBox) {
    mb.colorHex('#e9e4d6');
    mb.box(0, yTop + p.parapetH, 0, Math.min(p.w * 0.45, 8), 1.5, 0.5, { side: A.rect('trim_white'), top: A.rect('trim_grey') }, 3);
    mb.colorHex('#ffffff');
  }
  if (p.canopy) {
    mb.colorHex('#c9ccce');
    mb.box(0, p.groundH - 0.55, p.d / 2 + 1.1, p.w * 0.9, 0.22, 2.2, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 3);
    mb.colorHex('#ffffff');
  }
}

function emitInd(mb, A, p, lod) {
  const near = lod === 0;
  const h = p.wallH;
  mb.colorHex(p.wall);
  walls(mb, A, { w: p.w, d: p.d, y0: 0, floors: p.floors, floorH: h / p.floors, bayW: p.bayW, facade: p.facade, wsx: p.wsx, wsy: p.wsy, lod });
  // roof
  if (p.roofKind === 'shed') {
    const rise = p.d * 0.08;
    const hw = p.w / 2 + 0.35, hd = p.d / 2 + 0.35;
    mb.colorHex('#ffffff');
    mb.slope([-hw, h, hd], [hw, h, hd], [hw, h + rise, -hd], [-hw, h + rise, -hd], A.rect(p.roofTile), Math.max(1, Math.round(p.w / 5)), Math.max(1, Math.round(p.d / 5)));
    // gable infills
    mb.colorHex(p.wall);
    mb.tri([hw, h, hd], [hw, h, -hd], [hw, h + rise, -hd], A.rect('wall_metal'), [0, 0], [1, 0], [1, 1]);
    mb.tri([-hw, h, -hd], [-hw, h, hd], [-hw, h + rise, -hd], A.rect('wall_metal'), [0, 0], [1, 0], [0, 1]);
    mb.colorHex('#ffffff');
    if (near) {
      // ridge vents
      for (let i = 0; i < p.vents; i++) {
        const x = (i / p.vents - 0.5 + 0.5 / p.vents) * p.w * 0.85;
        mb.colorHex('#b6babc');
        mb.box(x, h + rise * 0.75, -p.d * 0.2, 1.5, 0.55, 1.2, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 2);
      }
      mb.colorHex('#ffffff');
    }
  } else {
    flatRoof(mb, A, p, { w: p.w, d: p.d, y: h, parapetH: p.parapetH, roofTile: p.roofTile, clutter: p.vents, lod, parapetTile: 'wall_metal' });
  }
  if (!near) return;
  // loading docks on the front
  const dockW = 3.2, dockH = 3.6;
  for (let i = 0; i < p.docks; i++) {
    const cx = (i - (p.docks - 1) / 2) * (p.w / (p.docks + 0.3));
    mb.colorHex('#ffffff');
    mb.grid([cx - dockW / 2, 0.9, p.d / 2 + 0.03], [1, 0, 0], [0, 1, 0], dockW, dockH, 1, 1, A.rect('door_roller'));
    mb.colorHex('#9d9a92');
    mb.box(cx, 0, p.d / 2 + 1.1, dockW + 1.0, 0.95, 2.2, { side: A.rect('concrete_slab'), top: A.rect('concrete_slab') }, 2.5);
    mb.colorHex('#3a3d40');
    mb.box(cx - dockW / 2 - 0.2, 1.6, p.d / 2 + 0.06, 0.28, 2.6, 0.16, { side: A.rect('metal_dark') }, 3);
    mb.box(cx + dockW / 2 + 0.2, 1.6, p.d / 2 + 0.06, 0.28, 2.6, 0.16, { side: A.rect('metal_dark') }, 3);
    mb.colorHex('#ffffff');
  }
  if (p.dockCanopy) {
    mb.colorHex('#b9bec0');
    mb.box(0, dockH + 1.2, p.d / 2 + 1.5, p.w * 0.92, 0.28, 3.0, { side: A.rect('metal_light'), top: A.rect('metal_light') }, 3);
    for (const s of [-1, 1]) mb.box(s * p.w * 0.4, 0.95, p.d / 2 + 2.8, 0.2, dockH + 0.25, 0.2, { side: A.rect('metal_light') }, 3);
    mb.colorHex('#ffffff');
  }
  // small office annex
  if (p.officeBox) {
    const ow = Math.min(p.w * 0.3, 9), od = 6.5, oh = 3.4;
    const cx = -p.w / 2 - ow / 2 - 0.2;
    const cz = p.d / 2 - od / 2;
    const save = [mb.ox, mb.oz];
    mb.ox += mb.c * cx + mb.s * cz; mb.oz += mb.s * cx - mb.c * cz;
    mb.colorHex('#e6e2d6');
    walls(mb, A, { w: ow, d: od, y0: 0, floors: 1, floorH: oh, bayW: 3.2, facade: 'comm_upper', wsx: p.wsx + 401, wsy: p.wsy + 9, lod: 0 });
    mb.colorHex('#ffffff');
    mb.grid([-ow / 2, oh, od / 2], [1, 0, 0], [0, 0, -1], ow, od, 2, 2, A.rect('roof_membrane'));
    parapet(mb, A, 0, 0, ow + 0.2, od + 0.2, oh, 0.5, A.rect('wall_concrete'), A.rect('trim_grey'));
    mb.grid([-0.6, 0, od / 2 + 0.03], [1, 0, 0], [0, 1, 0], 1.2, 2.4, 1, 1, A.rect('door_entrance'));
    mb.ox = save[0]; mb.oz = save[1];
  }
  // silos and a stack
  for (let i = 0; i < p.silos; i++) {
    const x = p.w / 2 + 3.2 + i * 5.0, z = -p.d * 0.2;
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
/**
 * Ground surfaces (lawn, driveway, paths, parking, hedges, fences) for a lot.
 * `h(lx,lz)` returns the terrain height at a local point, relative to the builder origin.
 */
export function emitGround(mb, A, p, lot, h, lod) {
  const near = lod === 0;
  const lw = lot.w, ld = lot.d;
  const cz = -(p.zOff || 0);                 // lot centre in building-local space
  const hw = lw / 2 - 0.35, hd = ld / 2 - 0.35;
  const zFront = cz + hd, zBack = cz - hd;
  const kind = p.kind;
  const base = kind === 'house' ? (p.r[1] > 0.5 ? 'lawn' : 'lawn_dark')
    : kind === 'town' ? 'lawn'
      : kind === 'ind' ? 'gravel_yard'
        : kind === 'tower' ? 'paving'
          : (p.parking ? 'asphalt_stalls' : 'paving');
  const tile = A.rect(base);
  const cell = near ? 5 : 9;
  const nu = clamp(Math.round(lw / cell), 1, 8), nv = clamp(Math.round(ld / cell), 1, 8);
  mb.colorHex(kind === 'house' || kind === 'town' ? '#ffffff' : '#f4f4f4');
  const P = (i, j) => {
    const lx = -hw + (2 * hw * i) / nu, lz = zBack + ((zFront - zBack) * j) / nv;
    return [lx, h(lx, lz) + 0.05, lz];
  };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    mb.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), tile);
  }
  if (kind === 'house') {
    const dw = p.garage ? clamp(p.garageW * 0.9, 2.6, 5.6) : 3.0;
    const dx = p.garage ? p.garageSide * (p.w / 2 + p.garageW / 2 + 0.15) : p.w * 0.2;
    strip(mb, A, h, dx, zFront + 0.4, dx, p.d / 2 - 1.5, dw, 'concrete_slab', 0.075);
    strip(mb, A, h, p.w * 0.18, zFront - 0.2, p.w * 0.18, p.d / 2 - 0.2, 1.3, 'paving', 0.075);
    if (p.hedge) hedgeRun(mb, A, h, hw, zFront, zBack, 0.85);
    else if (p.fence && near) fenceRun(mb, A, h, hw, zFront, zBack, false);
    if (p.deck && near) {
      mb.colorHex('#b8926c');
      const px = -p.w * 0.2, pz = -p.d / 2 - 2.2;
      mb.box(px, h(px, pz) + 0.1, pz, 4.2, 0.22, 3.4, { side: A.rect('wood_tank'), top: A.rect('wood_tank') }, 2);
      mb.colorHex('#ffffff');
    }
  } else if (kind === 'town') {
    strip(mb, A, h, 0, zFront + 0.4, 0, p.d / 2 - 0.4, Math.min(lw * 0.7, p.w * 0.85), 'concrete_slab', 0.075);
    if (p.hedge) hedgeRun(mb, A, h, hw, zFront, zBack, 0.7);
  } else if (kind === 'ind') {
    strip(mb, A, h, 0, zFront + 0.4, 0, p.d / 2 + 1, Math.min(lw * 0.85, p.w + 4), 'asphalt', 0.075);
    if (p.fence && near) fenceRun(mb, A, h, hw, zFront, zBack, true);
  } else {
    strip(mb, A, h, 0, zFront + 0.4, 0, p.d / 2 - 0.3, Math.min(lw * 0.85, p.w + 3), kind === 'tower' ? 'paving' : 'asphalt', 0.075);
  }
}

function strip(mb, A, h, x0, z0, x1, z1, w, tileName, off) {
  const tile = A.rect(tileName);
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 0.5 || w < 0.4) return;
  const ux = dx / len, uz = dz / len;
  const px = -uz * w / 2, pz = ux * w / 2;
  const n = clamp(Math.round(len / 3), 1, 10);
  const P = (t, s) => {
    const lx = x0 + dx * t + px * s, lz = z0 + dz * t + pz * s;
    return [lx, h(lx, lz) + off, lz];
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
