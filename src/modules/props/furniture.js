// Street-furniture geometry. Every kind is modelled once at the origin facing local -Z ("toward the
// road"); the chunk builder bakes copies into one merged geometry per 256 m chunk, so the whole hard
// -furniture kind-class costs ONE draw call per visible chunk (spec section 5's geometry rule).
//
// All opaque parts share one material: uv0 picks a surface slot out of a 9-texel roughness/metalness/
// emissive LUT, uv1 carries a tiling albedo + scuff normal, and the albedo itself is a vertex colour.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, leafCard, tube } from './geom.js';
import { SLOT, signUV, LEAF_CELL, cellRect } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Local offsets used by the signal-lens instancing (x, y, z relative to the signal origin).
export const SIGNAL_HEADS = [[3.05, 5.62, 0], [0.95, 5.62, 0]];
export const LENS_DY = [0.32, 0, -0.32];
export const PED_HEAD = [0.0, 2.62, -0.28];
export const LENS_Z = -0.20;

// ------------------------------------------------------------------ street lamp (arterial)
// spec item 4c: column 8.5-9.5 m, ~0.16 m dia at the base tapering to ~0.10 m, base collar
// 0.35-0.50 m across, mast arm 1.2-2.0 m reach, luminaire body ~0.55 x 0.25 x 0.10 m.
function lamp(lut) {
  const b = new Builder(lut);
  const H = 9.0, REACH = 1.65;
  const dark = 0x9299a0, mid = 0xa6adb3;
  b.cyl(0.21, 0.24, 0.16, 8, { pos: [0, 0.08, 0], slot: SLOT.concrete, color: 0x716e68, ao: { y0: 0, y1: 0.3, bottom: 0.5, top: 0.95 }, detail: 1.6 });
  b.cyl(0.115, 0.135, 0.42, 8, { pos: [0, 0.30, 0], slot: SLOT.paintedMetal, color: mid, ao: { y0: 0.1, y1: 0.5, bottom: 0.6, top: 1 }, detail: 1.6 });
  b.cyl(0.050, 0.080, H - 0.5, 7, { pos: [0, 0.5 + (H - 0.5) / 2, 0], slot: SLOT.paintedMetal, color: dark, ao: { y0: 0.5, y1: 3.4, bottom: 0.62, top: 1 }, detail: 1.1 });
  {
    const nodes = [];
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      nodes.push({ p: V(0, H - 0.18 + 0.30 * Math.sin(t * Math.PI * 0.5), -REACH * t), r: 0.048 - 0.012 * t });
    }
    b.add(tube(nodes, 5, 0.2), { slot: SLOT.paintedMetal, color: dark, detail: 1.2 });
  }
  // luminaire: flat rectangular LED head, 0.55 x 0.25 x 0.10, with an emissive underside panel
  b.box(0.25, 0.10, 0.55, { pos: [0, H + 0.07, -REACH - 0.16], slot: SLOT.paintedMetal, color: mid, detail: 2.2 });
  b.box(0.20, 0.030, 0.48, { pos: [0, H + 0.012, -REACH - 0.16], slot: SLOT.lamp, color: 0xfff3d8 });
  b.box(0.09, 0.09, 0.14, { pos: [0, H + 0.09, -REACH + 0.14], slot: SLOT.paintedMetal, color: dark });
  return { geo: b.build(), head: [0, H + 0.03, -REACH - 0.16] };
}

// ------------------------------------------------------------------ ornamental lantern post (item 4d)
function lantern(lut) {
  const b = new Builder(lut);
  const H = 5.0;
  const bronze = 0x3a3128, glassC = 0x3d4247;
  b.cyl(0.20, 0.26, 0.22, 10, { pos: [0, 0.11, 0], slot: SLOT.concrete, color: 0x6d6a64, ao: { y0: 0, y1: 0.3, bottom: 0.5, top: 0.95 }, detail: 1.6 });
  b.cyl(0.085, 0.14, 0.55, 10, { pos: [0, 0.42, 0], slot: SLOT.paintedMetal, color: bronze, detail: 1.8 });
  b.cyl(0.048, 0.075, H - 1.3, 8, { pos: [0, 0.7 + (H - 1.3) / 2, 0], slot: SLOT.paintedMetal, color: bronze, ao: { y0: 0.7, y1: 2.4, bottom: 0.6, top: 1 }, detail: 1.2 });
  // curled arm
  {
    const nodes = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      nodes.push({ p: V(0, H - 0.75 + 0.62 * Math.sin(t * Math.PI * 0.55), -0.42 * Math.sin(t * Math.PI * 0.5)), r: 0.036 - 0.008 * t });
    }
    b.add(tube(nodes, 6, 0.2), { slot: SLOT.paintedMetal, color: bronze, detail: 1.4 });
  }
  // lantern: tapered glass box with a cap and a finial
  b.add(new THREE.CylinderGeometry(0.20, 0.13, 0.44, 4), { pos: [0, H - 0.28, -0.42], rot: [0, Math.PI / 4, 0], slot: SLOT.glass, color: glassC, detail: 2 });
  b.add(new THREE.CylinderGeometry(0.055, 0.10, 0.30, 4), { pos: [0, H - 0.44, -0.42], rot: [0, Math.PI / 4, 0], slot: SLOT.lamp, color: 0xffeec6 });
  b.add(new THREE.CylinderGeometry(0.03, 0.26, 0.20, 4), { pos: [0, H - 0.01, -0.42], rot: [0, Math.PI / 4, 0], slot: SLOT.paintedMetal, color: bronze });
  b.sphere(0.045, 6, 5, { pos: [0, H + 0.12, -0.42], slot: SLOT.paintedMetal, color: bronze });
  return { geo: b.build(), head: [0, H - 0.42, -0.42] };
}

// ------------------------------------------------------------------ traffic signal
function trafficLight(lut) {
  const b = new Builder(lut);
  const dark = 0x2f3438, body = 0xb0741c, back = 0x24282b;
  const MAST = 5.62, REACH = 3.35;
  b.cyl(0.26, 0.32, 0.26, 8, { pos: [0, 0.13, 0], slot: SLOT.concrete, color: 0x6b6862, ao: { y0: 0, y1: 0.4, bottom: 0.5, top: 0.95 }, detail: 1.6 });
  b.cyl(0.14, 0.175, 0.42, 8, { pos: [0, 0.34, 0], slot: SLOT.paintedMetal, color: dark, detail: 1.6 });
  b.cyl(0.085, 0.125, 6.5, 7, { pos: [0, 3.35, 0], slot: SLOT.paintedMetal, color: dark, ao: { y0: 0.4, y1: 2.6, bottom: 0.62, top: 1 }, detail: 1.1 });
  {
    const nodes = [];
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      nodes.push({ p: V(REACH * t, MAST + 0.62 + 0.22 * Math.sin(t * Math.PI * 0.5) - 0.14 * t * t, 0), r: 0.068 - 0.020 * t });
    }
    b.add(tube(nodes, 5, 0.2), { slot: SLOT.paintedMetal, color: dark, detail: 1.2 });
  }
  b.add(new THREE.CylinderGeometry(0.028, 0.028, 1.9, 5), { pos: [0.66, 5.72, 0], rot: [0, 0, -0.70], slot: SLOT.steel, color: 0x585e62 });
  for (const [hx, hy] of SIGNAL_HEADS) {
    // backplate + amber housing + visors, CS2's cs2_8 head
    b.box(0.62, 1.34, 0.035, { pos: [hx, hy, 0.045], slot: SLOT.paintedMetal, color: back, detail: 2.4 });
    b.box(0.38, 1.18, 0.30, { pos: [hx, hy, -0.10], slot: SLOT.plastic, color: body, detail: 2.2 });
    b.box(0.10, 0.26, 0.10, { pos: [hx, hy + 0.80, 0], slot: SLOT.paintedMetal, color: dark });
    for (const dy of LENS_DY) {
      b.add(new THREE.CylinderGeometry(0.170, 0.150, 0.20, 8, 1, true), { pos: [hx, hy + dy + 0.035, LENS_Z - 0.06], rot: [Math.PI / 2, 0, 0], slot: SLOT.plastic, color: body });
      b.add(new THREE.CylinderGeometry(0.150, 0.150, 0.02, 7), { pos: [hx, hy + dy, LENS_Z + 0.02], rot: [Math.PI / 2, 0, 0], slot: SLOT.plastic, color: 0x1a1c1e });
    }
  }
  // pedestrian head at 2.62 m
  b.box(0.40, 0.60, 0.30, { pos: [PED_HEAD[0], PED_HEAD[1], PED_HEAD[2] + 0.06], slot: SLOT.plastic, color: body, detail: 2.4 });
  b.box(0.30, 0.44, 0.025, { pos: [PED_HEAD[0], PED_HEAD[1] + 0.03, PED_HEAD[2] - 0.13], slot: SLOT.plastic, color: 0x3a1414 });
  b.box(0.18, 0.11, 0.10, { pos: [PED_HEAD[0] + 0.26, PED_HEAD[1] - 0.34, PED_HEAD[2] + 0.04], slot: SLOT.plastic, color: 0x33383c });
  return { geo: b.build() };
}

// ------------------------------------------------------------------ bench / bin / hydrant / sign
function bench(lut) {
  const b = new Builder(lut);
  const frame = 0x2f3439, wood = 0x8a6038;
  for (const sx of [-0.74, 0.74]) {
    b.box(0.07, 0.44, 0.075, { pos: [sx, 0.22, -0.20], slot: SLOT.paintedMetal, color: frame, ao: { y0: 0, y1: 0.4, bottom: 0.5, top: 1 } });
    b.box(0.07, 0.44, 0.075, { pos: [sx, 0.22, 0.22], slot: SLOT.paintedMetal, color: frame, ao: { y0: 0, y1: 0.4, bottom: 0.5, top: 1 } });
    b.box(0.07, 0.06, 0.56, { pos: [sx, 0.455, 0.01], slot: SLOT.paintedMetal, color: frame });
    b.box(0.06, 0.62, 0.06, { pos: [sx, 0.75, 0.26], rot: [-0.20, 0, 0], slot: SLOT.paintedMetal, color: frame });
    b.box(0.09, 0.05, 0.11, { pos: [sx, 0.03, -0.20], slot: SLOT.paintedMetal, color: frame });
    b.box(0.09, 0.05, 0.11, { pos: [sx, 0.03, 0.22], slot: SLOT.paintedMetal, color: frame });
  }
  for (let i = 0; i < 4; i++) b.box(1.72, 0.045, 0.115, { pos: [0, 0.487, -0.22 + i * 0.145], slot: SLOT.wood, color: wood, detail: 3 });
  for (let i = 0; i < 3; i++) b.box(1.72, 0.115, 0.042, { pos: [0, 0.63 + i * 0.145, 0.30 + i * 0.030], rot: [-0.20, 0, 0], slot: SLOT.wood, color: wood, detail: 3 });
  return { geo: b.build() };
}

function bin(lut) {
  const b = new Builder(lut);
  const green = 0x2f4438;
  b.cyl(0.27, 0.22, 0.76, 9, { pos: [0, 0.42, 0], slot: SLOT.paintedMetal, color: green, ao: { y0: 0.04, y1: 0.6, bottom: 0.55, top: 1 }, detail: 2.4 });
  b.cyl(0.285, 0.285, 0.07, 9, { pos: [0, 0.80, 0], slot: SLOT.paintedMetal, color: 0x232b26 });
  b.cyl(0.24, 0.28, 0.10, 9, { pos: [0, 0.88, 0], slot: SLOT.paintedMetal, color: 0x232b26 });
  b.cyl(0.20, 0.24, 0.06, 8, { pos: [0, 0.04, 0], slot: SLOT.steel, color: 0x3a3f42 });
  for (let i = 0; i < 3; i++) b.box(0.05, 0.60, 0.05, { pos: [Math.cos(i * 2.09) * 0.255, 0.45, Math.sin(i * 2.09) * 0.255], slot: SLOT.steel, color: 0x1e2422 });
  return { geo: b.build() };
}

function hydrant(lut) {
  const b = new Builder(lut);
  const red = 0xa8352c;
  b.cyl(0.17, 0.19, 0.07, 8, { pos: [0, 0.035, 0], slot: SLOT.concrete, color: 0x6d6a64 });
  b.cyl(0.115, 0.135, 0.52, 8, { pos: [0, 0.33, 0], slot: SLOT.plastic, color: red, ao: { y0: 0.05, y1: 0.4, bottom: 0.6, top: 1 }, detail: 3 });
  b.cyl(0.145, 0.145, 0.06, 8, { pos: [0, 0.62, 0], slot: SLOT.plastic, color: 0x8c2b24 });
  b.sphere(0.135, 8, 5, { pos: [0, 0.68, 0], scale: [1, 0.8, 1], slot: SLOT.plastic, color: red });
  b.cyl(0.045, 0.05, 0.10, 8, { pos: [0, 0.80, 0], slot: SLOT.chrome, color: 0xb9bcbe });
  for (const s of [-1, 1]) b.cyl(0.065, 0.075, 0.13, 8, { pos: [s * 0.14, 0.46, 0], rot: [0, 0, Math.PI / 2], slot: SLOT.chrome, color: 0xa8acae });
  b.cyl(0.07, 0.08, 0.14, 8, { pos: [0, 0.46, -0.14], rot: [Math.PI / 2, 0, 0], slot: SLOT.chrome, color: 0xa8acae });
  return { geo: b.build() };
}

/** Sign post + a plate from the sign atlas, merged (the plate uses uv0 = the atlas, slot = plastic). */
function signPost(lut, plate, w, h, py) {
  const b = new Builder(lut);
  const H = py + h * 0.5 + 0.08;
  b.cyl(0.038, 0.046, H, 8, { pos: [0, H / 2, 0], slot: SLOT.steel, color: 0x9298a0, ao: { y0: 0, y1: 1.0, bottom: 0.55, top: 1 }, detail: 1.6 });
  b.cyl(0.075, 0.09, 0.10, 8, { pos: [0, 0.05, 0], slot: SLOT.concrete, color: 0x6d6a64 });
  const post = b.build();
  // the plate carries the sign atlas on uv1 and flags itself with uv0.y = 0.9, so the one furniture
  // material can swap samplers without a second draw call
  const uv = signUV(plate);
  const front = leafCard(w, h, uv);
  front.applyMatrix4(new THREE.Matrix4().makeTranslation(0, py, -0.052));
  const back = leafCard(w, h, uv);
  back.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI));
  back.applyMatrix4(new THREE.Matrix4().makeTranslation(0, py, -0.042));
  for (const g of [front, back]) {
    const n = g.attributes.position.count;
    const src = g.attributes.uv.array;
    g.setAttribute('uv1', new THREE.Float32BufferAttribute(Float32Array.from(src), 2));
    const u0 = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { u0[i * 2] = lut.u(SLOT.plastic); u0[i * 2 + 1] = 0.9; }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(u0, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  }
  return { geo: mergeGeometries([post, front, back], false) };
}

// ------------------------------------------------------------------ bus shelter
function busStop(lut) {
  const b = new Builder(lut);
  const frame = 0x394047;
  const W = 3.9, D = 1.55;
  for (const sx of [-W / 2 + 0.08, W / 2 - 0.08]) for (const sz of [-D / 2 + 0.08, D / 2 - 0.08]) {
    b.box(0.10, 2.52, 0.10, { pos: [sx, 1.26, sz], slot: SLOT.paintedMetal, color: frame, ao: { y0: 0, y1: 1.2, bottom: 0.55, top: 1 }, detail: 1.6 });
  }
  b.box(W + 0.34, 0.10, D + 0.42, { pos: [0, 2.60, 0.02], slot: SLOT.paintedMetal, color: 0x3f464c, detail: 1.2 });
  b.box(W + 0.34, 0.16, 0.10, { pos: [0, 2.49, -(D / 2 + 0.20)], slot: SLOT.paintedMetal, color: 0x2c5a80, detail: 2 });
  b.box(W - 0.5, 0.05, 0.20, { pos: [0, 2.51, 0.16], slot: SLOT.lamp, color: 0xfff3d8 });
  // glass: rear wall + two ends
  b.box(W - 0.30, 2.06, 0.030, { pos: [0, 1.34, D / 2 - 0.09], slot: SLOT.glass, color: 0x2b3339, detail: 1 });
  for (const sx of [-W / 2 + 0.09, W / 2 - 0.09]) b.box(0.030, 2.06, D - 0.30, { pos: [sx, 1.34, 0], slot: SLOT.glass, color: 0x2b3339, detail: 1 });
  // timetable panel on the right-hand end
  b.box(0.045, 0.86, 0.62, { pos: [W / 2 - 0.16, 1.52, 0.10], slot: SLOT.paintedMetal, color: 0x1c2126, detail: 2 });
  b.box(0.020, 0.74, 0.52, { pos: [W / 2 - 0.20, 1.52, 0.10], slot: SLOT.plastic, color: 0xd8dde2 });
  // seat
  b.box(W - 0.3, 0.09, 0.09, { pos: [0, 0.52, D / 2 - 0.24], slot: SLOT.paintedMetal, color: frame });
  for (let i = 0; i < 3; i++) b.box(W - 0.7, 0.05, 0.13, { pos: [0, 0.49, D / 2 - 0.54 + i * 0.16], slot: SLOT.wood, color: 0x8a6038, detail: 3 });
  for (const sx of [-0.9, 0.9]) b.box(0.07, 0.48, 0.42, { pos: [sx, 0.25, D / 2 - 0.38], slot: SLOT.paintedMetal, color: frame });
  return { geo: b.build() };
}

// ------------------------------------------------------------------ planter
function planter(lut) {
  const b = new Builder(lut);
  b.add(new THREE.CylinderGeometry(0.60, 0.48, 0.62, 4), { pos: [0, 0.31, 0], rot: [0, Math.PI / 4, 0], slot: SLOT.concrete, color: 0x9d988e, ao: { y0: 0, y1: 0.6, bottom: 0.62, top: 1 }, detail: 1.8 });
  b.add(new THREE.CylinderGeometry(0.64, 0.60, 0.09, 4), { pos: [0, 0.62, 0], rot: [0, Math.PI / 4, 0], slot: SLOT.concrete, color: 0xa9a49a, detail: 1.8 });
  b.add(new THREE.CylinderGeometry(0.53, 0.53, 0.05, 4), { pos: [0, 0.63, 0], rot: [0, Math.PI / 4, 0], slot: SLOT.rubber, color: 0x3a2c20 });
  return { geo: b.build() };
}

// ------------------------------------------------------------------ fences (built as runs)
/**
 * A built fence following the ground. `pts` are [{x,y,z}] samples ~1 m apart along the run; the
 * bottom rail tracks the ground within 0.12 m because every post and rail node reuses the sample's y.
 * variant: 'slat' (white picket), 'railing' (dark metal, posts at 2.2 m), 'wall' (rendered panels).
 */
export function fenceRun(lut, pts, variant, rng) {
  if (pts.length < 2) return null;
  const b = new Builder(lut);
  const seg = [];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  const postPitch = variant === 'railing' ? 2.2 : variant === 'wall' ? 2.6 : 1.9;
  // walk the polyline
  const at = (d) => {
    let acc2 = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      if (acc2 + l >= d || i === pts.length - 1) {
        const t = l > 1e-5 ? Math.min(1, (d - acc2) / l) : 0;
        return {
          x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
          y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
          z: pts[i - 1].z + (pts[i].z - pts[i - 1].z) * t,
          h: Math.atan2(pts[i].x - pts[i - 1].x, -(pts[i].z - pts[i - 1].z)),
        };
      }
      acc2 += l;
    }
    return pts[pts.length - 1];
  };
  const H = variant === 'wall' ? 1.55 : variant === 'railing' ? 1.25 : 1.12;
  const nPosts = Math.max(2, Math.round(acc / postPitch) + 1);
  for (let i = 0; i < nPosts; i++) {
    const p = at((i / (nPosts - 1)) * acc);
    if (variant === 'wall') {
      b.box(0.24, H + 0.18, 0.24, { pos: [p.x, p.y + (H + 0.18) / 2 - 0.06, p.z], rot: [0, -p.h, 0], slot: SLOT.concrete, color: 0xa6a196, ao: { y0: p.y, y1: p.y + 1.0, bottom: 0.6, top: 1 }, detail: 1.4 });
    } else if (variant === 'railing') {
      b.box(0.10, H + 0.12, 0.10, { pos: [p.x, p.y + (H + 0.12) / 2 - 0.06, p.z], rot: [0, -p.h, 0], slot: SLOT.paintedMetal, color: 0x23282c, ao: { y0: p.y, y1: p.y + 0.8, bottom: 0.55, top: 1 }, detail: 2 });
      b.add(new THREE.CylinderGeometry(0.055, 0.055, 0.10, 6), { pos: [p.x, p.y + H + 0.10, p.z], slot: SLOT.paintedMetal, color: 0x23282c });
    } else {
      b.box(0.095, H + 0.16, 0.095, { pos: [p.x, p.y + (H + 0.16) / 2 - 0.06, p.z], rot: [0, -p.h, 0], slot: SLOT.wood, color: 0xa89e8c, ao: { y0: p.y, y1: p.y + 0.6, bottom: 0.5, top: 1 }, detail: 3 });
    }
  }
  // rails / panels between posts
  const nSpan = nPosts - 1;
  for (let i = 0; i < nSpan; i++) {
    const a = at((i / nSpan) * acc), c = at(((i + 1) / nSpan) * acc);
    const mx = (a.x + c.x) / 2, mz = (a.z + c.z) / 2, my = (a.y + c.y) / 2;
    const L = Math.hypot(c.x - a.x, c.z - a.z);
    const head = Math.atan2(c.x - a.x, -(c.z - a.z));
    const pitch = Math.atan2(c.y - a.y, Math.max(1e-4, L));
    if (variant === 'wall') {
      b.box(L, H * 0.86, 0.14, { pos: [mx, my + H * 0.43 + 0.04, mz], rot: [0, -head, pitch], slot: SLOT.concrete, color: 0xbdb7ab, ao: { y0: my, y1: my + 1.2, bottom: 0.66, top: 1 }, detail: 1.2 });
      b.box(L, 0.09, 0.20, { pos: [mx, my + H * 0.90, mz], rot: [0, -head, pitch], slot: SLOT.concrete, color: 0xa39d92, detail: 1.4 });
    } else if (variant === 'railing') {
      for (const ry of [0.10, H - 0.06]) b.box(L, 0.055, 0.045, { pos: [mx, my + ry, mz], rot: [0, -head, pitch], slot: SLOT.paintedMetal, color: 0x23282c, detail: 2 });
      const bars = Math.max(2, Math.round(L / 0.20));
      for (let k = 0; k < bars; k++) {
        const t = (k + 0.5) / bars;
        const px = a.x + (c.x - a.x) * t, pz = a.z + (c.z - a.z) * t, py = a.y + (c.y - a.y) * t;
        b.box(0.022, H - 0.14, 0.022, { pos: [px, py + 0.10 + (H - 0.14) / 2, pz], rot: [0, -head, 0], slot: SLOT.paintedMetal, color: 0x23282c });
      }
    } else {
      for (const ry of [0.11, 0.38, 0.86]) b.box(L, 0.06, 0.042, { pos: [mx, my + ry, mz], rot: [0, -head, pitch], slot: SLOT.wood, color: 0xc9c3b4, detail: 3 });
      const pick = Math.max(2, Math.round(L / 0.32));
      for (let k = 0; k < pick; k++) {
        const t = (k + 0.5) / pick;
        const px = a.x + (c.x - a.x) * t, pz = a.z + (c.z - a.z) * t, py = a.y + (c.y - a.y) * t;
        const ph = 0.92 + (rng ? rng.range(-0.02, 0.02) : 0);
        b.box(0.082, ph, 0.030, { pos: [px, py + 0.08 + ph / 2, pz], rot: [0, -head, 0], slot: SLOT.wood, color: 0xd2ccbd, ao: { y0: py, y1: py + 0.7, bottom: 0.62, top: 1 }, detail: 4 });
      }
    }
  }
  return b.build();
}

// ------------------------------------------------------------------ hedge + bush (alpha-foliage class)
function foliageQuad(out, cx, cy, cz, corners, nrm, cell, ao, flip, sub) {
  const base = out.pos.length / 3;
  let r = cellRect(cell);
  if (sub) r = [r[0] + sub[0] * r[2], r[1] + sub[1] * r[3], sub[2] * r[2], sub[3] * r[3]];
  const uvs = flip
    ? [[r[0] + r[2], r[1]], [r[0], r[1]], [r[0], r[1] + r[3]], [r[0] + r[2], r[1] + r[3]]]
    : [[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]];
  for (let k = 0; k < 4; k++) {
    out.pos.push(cx + corners[k].x, cy + corners[k].y, cz + corners[k].z);
    out.nrm.push(nrm.x, nrm.y, nrm.z);
    out.uv.push(uvs[k][0], uvs[k][1]);
    out.col.push(ao, ao, ao);
  }
  out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function foliageBuild(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
  g.setIndex(out.idx);
  return g;
}
const newOut = () => ({ pos: [], nrm: [], uv: [], col: [], idx: [] });

/**
 * A clipped hedge run: a closed prism whose top undulates (>= 0.08 m amplitude) with a continuous
 * noise of world position, dark sides and a brighter top (top-to-side dL >= 15), plus alpha-cut
 * leaf cards breaking the silhouette. Nothing repeats, so the tiling NCC test has nothing to find.
 */
export function hedgeRun(pts, rng, opt = {}) {
  const out = newOut();
  const height = opt.height ?? 1.45;
  const halfW = opt.width ? opt.width * 0.5 : 0.42;
  const AO_TOP = 1.06, AO_SIDE = 0.46, AO_LOW = 0.26;
  const N = pts.length;
  if (N < 2) return null;
  const nx = [], nz = [], top = [];
  for (let i = 0; i < N; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(N - 1, i + 1)];
    let tx = c.x - a.x, tz = c.z - a.z;
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    nx.push(-tz); nz.push(tx);
    const w = Math.sin(pts[i].x * 0.9 + pts[i].z * 0.7) * 0.105 + Math.sin(pts[i].x * 2.3 - pts[i].z * 1.9) * 0.070 + Math.sin(pts[i].z * 4.1) * 0.040;
    top.push(height + w);
  }
  const V3 = (x, y, z) => ({ x, y, z });
  for (let i = 0; i < N - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    for (const s of [1, -1]) {
      const p0 = V3(a.x + nx[i] * halfW * s - a.x, 0, a.z + nz[i] * halfW * s - a.z);
      const p1 = V3(c.x + nx[i + 1] * halfW * s - a.x, c.y - a.y, c.z + nz[i + 1] * halfW * s - a.z);
      // side quad, bottom to top
      foliageQuad(out, a.x, a.y, a.z, [
        V3(p0.x, 0.02, p0.z), V3(p1.x, p1.y + 0.02, p1.z),
        V3(p1.x, p1.y + top[i + 1], p1.z), V3(p0.x, top[i], p0.z),
      ], { x: nx[i] * s, y: 0.12, z: nz[i] * s }, LEAF_CELL.solid, s > 0 ? AO_SIDE : AO_SIDE * 0.88, rng.bool(),
        [rng.range(0, 0.55), rng.range(0, 0.5), 0.45, 0.5]);
    }
    // top quad
    foliageQuad(out, a.x, a.y, a.z, [
      V3(nx[i] * halfW, top[i], nz[i] * halfW),
      V3(c.x - a.x + nx[i + 1] * halfW, c.y - a.y + top[i + 1], c.z - a.z + nz[i + 1] * halfW),
      V3(c.x - a.x - nx[i + 1] * halfW, c.y - a.y + top[i + 1], c.z - a.z - nz[i + 1] * halfW),
      V3(-nx[i] * halfW, top[i], -nz[i] * halfW),
    ], { x: 0, y: 1, z: 0 }, LEAF_CELL.solid, AO_TOP, rng.bool(), [rng.range(0, 0.55), rng.range(0, 0.5), 0.45, 0.5]);
    // silhouette-breaking leaf cards along the top edge and the shoulders
    const cards = 4;
    for (let k = 0; k < cards; k++) {
      const t = (k + 0.5) / cards;
      const px = a.x + (c.x - a.x) * t, pz = a.z + (c.z - a.z) * t, py = a.y + (c.y - a.y) * t;
      const th = top[i] + (top[i + 1] - top[i]) * t;
      const s = rng.bool() ? 1 : -1;
      const w = rng.range(0.42, 0.76);
      const ang = rng.range(0, Math.PI * 2);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      foliageQuad(out, px + nx[i] * halfW * s * 0.7, py + th - w * 0.2, pz + nz[i] * halfW * s * 0.7, [
        V3(-w * ca, -w * 0.5, -w * sa), V3(w * ca, -w * 0.5, w * sa),
        V3(w * ca, w * 0.5, w * sa), V3(-w * ca, w * 0.5, -w * sa),
      ], { x: nx[i] * s * 0.4, y: 0.9, z: nz[i] * s * 0.4 }, LEAF_CELL.hedge, rng.range(0.72, 1.0), rng.bool());
    }
    // a darker skirt at the base so the interior reads deep
    foliageQuad(out, a.x, a.y, a.z, [
      V3(nx[i] * halfW * 0.7, 0.0, nz[i] * halfW * 0.7),
      V3(c.x - a.x + nx[i + 1] * halfW * 0.7, c.y - a.y, c.z - a.z + nz[i + 1] * halfW * 0.7),
      V3(c.x - a.x - nx[i + 1] * halfW * 0.7, c.y - a.y, c.z - a.z - nz[i + 1] * halfW * 0.7),
      V3(-nx[i] * halfW * 0.7, 0.0, -nz[i] * halfW * 0.7),
    ], { x: 0, y: 1, z: 0 }, LEAF_CELL.solid, AO_LOW, rng.bool(), [rng.range(0, 0.55), rng.range(0, 0.5), 0.45, 0.5]);
  }
  return foliageBuild(out);
}

/** A shrub: a card blob around a small solid core, canonical (unit) so the chunk builder can place it. */
export function bushGeometry(rng, cards = 16) {
  const out = newOut();
  const V3 = (x, y, z) => ({ x, y, z });
  const H = 1.0, R = 0.62;
  // solid core so the bush is a volume, not a card cloud
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const c = Math.cos(a) * R * 0.52, s = Math.sin(a) * R * 0.52;
    const a2 = ((i + 1) / 5) * Math.PI * 2;
    const c2 = Math.cos(a2) * R * 0.52, s2 = Math.sin(a2) * R * 0.52;
    foliageQuad(out, 0, 0, 0, [V3(c, 0.02, s), V3(c2, 0.02, s2), V3(c2, H * 0.72, s2), V3(c, H * 0.72, s)],
      { x: Math.cos(a), y: 0.25, z: Math.sin(a) }, LEAF_CELL.solid, 0.52, i % 2 === 0);
  }
  for (let i = 0; i < cards; i++) {
    const a = rng.float() * Math.PI * 2;
    const r = Math.pow(rng.float(), 0.5) * R;
    const y = H * (0.20 + rng.float() * 0.78);
    const w = R * rng.range(0.75, 1.35);
    const ca = Math.cos(a + rng.range(-0.6, 0.6)), sa = Math.sin(a + rng.range(-0.6, 0.6));
    const ao = (0.48 + 0.52 * (r / R)) * (0.74 + 0.34 * (y / H));
    foliageQuad(out, Math.cos(a) * r, y, Math.sin(a) * r, [
      V3(-w * 0.5 * ca, -w * 0.4, -w * 0.5 * sa), V3(w * 0.5 * ca, -w * 0.4, w * 0.5 * sa),
      V3(w * 0.5 * ca, w * 0.4, w * 0.5 * sa), V3(-w * 0.5 * ca, w * 0.4, -w * 0.5 * sa),
    ], { x: Math.cos(a) * 0.7, y: 0.7, z: Math.sin(a) * 0.7 }, LEAF_CELL.bush, Math.min(1.05, ao), rng.bool());
  }
  return foliageBuild(out);
}

/** Flowers in a planter bowl (alpha-foliage class). */
export function planterFillGeometry(rng) {
  const out = newOut();
  const V3 = (x, y, z) => ({ x, y, z });
  for (let i = 0; i < 10; i++) {
    const a = rng.float() * Math.PI * 2;
    const r = Math.pow(rng.float(), 0.5) * 0.42;
    const y = 0.62 + rng.range(0.06, 0.36);
    const w = rng.range(0.30, 0.52);
    const ca = Math.cos(a), sa = Math.sin(a);
    foliageQuad(out, Math.cos(a) * r, y, Math.sin(a) * r, [
      V3(-w * 0.5 * ca, -w * 0.45, -w * 0.5 * sa), V3(w * 0.5 * ca, -w * 0.45, w * 0.5 * sa),
      V3(w * 0.5 * ca, w * 0.45, w * 0.5 * sa), V3(-w * 0.5 * ca, w * 0.45, -w * 0.5 * sa),
    ], { x: ca * 0.5, y: 0.85, z: sa * 0.5 }, LEAF_CELL.flower, rng.range(0.8, 1.05), rng.bool());
  }
  return foliageBuild(out);
}

/**
 * Litter / darkening ring under a trunk (item 1e): ONE alpha-cut quad laid on the ground. The atlas
 * cell fades to transparent at its rim, so alphaTest gives a ragged mulch patch rather than a disc,
 * and every tree costs 2 triangles instead of 20.
 */
export function litterRing(rng) {
  const out = newOut();
  const V3 = (x, y, z) => ({ x, y, z });
  const R = 1.0;
  const a = rng.range(0, Math.PI * 2);
  const c = Math.cos(a), s = Math.sin(a);
  foliageQuad(out, 0, 0, 0, [
    V3(-R * c - R * s, 0, -R * s + R * c), V3(R * c - R * s, 0, R * s + R * c),
    V3(R * c + R * s, 0, R * s - R * c), V3(-R * c + R * s, 0, -R * s - R * c),
  ], { x: 0, y: 1, z: 0 }, LEAF_CELL.litter, 0.62, rng.bool());
  return foliageBuild(out);
}

// ------------------------------------------------------------------ lens disc
export function lensGeometry() {
  const g = new THREE.CircleGeometry(0.135, 12);
  g.rotateY(Math.PI);
  return g;
}

// ------------------------------------------------------------------ public
export function buildKits(lut, rng) {
  const out = {};
  const L = lamp(lut);
  out.streetlamp = { geo: L.geo, head: L.head };
  const N = lantern(lut);
  out.streetlamp_lantern = { geo: N.geo, head: N.head };
  out.trafficlight = trafficLight(lut);
  out.bench = bench(lut);
  out.bin = bin(lut);
  out.hydrant = hydrant(lut);
  out.sign = signPost(lut, 'speed', 0.60, 0.60, 2.10);
  out.sign_stop = signPost(lut, 'stop', 0.62, 0.62, 2.08);
  out.sign_street = signPost(lut, 'street', 1.05, 0.52, 2.28);
  out.sign_bus = signPost(lut, 'bus', 0.56, 0.56, 2.12);
  out.bus_stop = busStop(lut);
  out.planter = planter(lut);
  return out;
}
