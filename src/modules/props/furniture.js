// Street furniture geometry. Every kind is built once at the origin, facing local -Z ("toward the road"),
// then instanced; per-instance rotation is rotY(-heading). All opaque parts share ONE material: uv0 picks a
// surface slot out of an 8-texel roughness/metalness/emissive LUT and the albedo comes from vertex colours,
// so the whole street kit costs one program and one draw call per kind.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, leafCard, tube } from './geom.js';
import { SLOT, leafUV, signUV } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Local offsets of the three lenses of each signal head (x, y, z), relative to the signal origin.
export const SIGNAL_HEADS = [[4.05, 5.30, 0], [1.55, 5.30, 0]];
export const LENS_DY = [0.30, 0, -0.30];
export const PED_HEAD = [0.0, 2.75, -0.30];

// ---------------------------------------------------------------- street lamp
function lamp(lut) {
  const b = new Builder(lut);
  const dark = 0x3b4045, mid = 0x474d53;
  b.cyl(0.20, 0.26, 0.34, 10, { pos: [0, 0.17, 0], slot: SLOT.concrete, color: 0x6d6a64, ao: { y0: 0, y1: 0.4, bottom: 0.5, top: 0.95 }, detail: 1.6 });
  b.cyl(0.085, 0.125, 8.0, 9, { pos: [0, 4.2, 0], slot: SLOT.paintedMetal, color: dark, ao: { y0: 0.2, y1: 3.0, bottom: 0.55, top: 1 }, detail: 1.1 });
  // collar
  b.cyl(0.135, 0.145, 0.16, 9, { pos: [0, 0.45, 0], slot: SLOT.paintedMetal, color: mid, detail: 1.6 });
  // swept arm from the pole top out over the carriageway
  {
    const nodes = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const z = -2.25 * t;
      const y = 7.95 + 0.62 * Math.sin(t * Math.PI * 0.5);
      nodes.push({ p: V(0, y, z), r: 0.062 - 0.016 * t });
    }
    b.add(tube(nodes, 6, 0.2), { slot: SLOT.paintedMetal, color: dark, detail: 1.2 });
  }
  // luminaire: tapered housing + emissive underside
  b.add(new THREE.CylinderGeometry(0.15, 0.115, 1.02, 6), { pos: [0, 8.5, -2.62], rot: [Math.PI / 2, 0, 0], slot: SLOT.paintedMetal, color: mid, detail: 1.4 });
  b.box(0.24, 0.055, 0.86, { pos: [0, 8.365, -2.62], slot: SLOT.lamp, color: 0xfff1cf });
  b.box(0.10, 0.10, 0.18, { pos: [0, 8.52, -2.03], slot: SLOT.paintedMetal, color: dark });
  return { geo: b.build(), cast: true, light: [0, 8.36, -2.62] };
}

// ---------------------------------------------------------------- traffic signal
function trafficLight(lut) {
  const b = new Builder(lut);
  const dark = 0x2c3135, body = 0x1d2124;
  b.cyl(0.24, 0.30, 0.30, 10, { pos: [0, 0.15, 0], slot: SLOT.concrete, color: 0x6b6862, ao: { y0: 0, y1: 0.4, bottom: 0.5, top: 0.95 }, detail: 1.6 });
  b.cyl(0.095, 0.135, 6.4, 9, { pos: [0, 3.35, 0], slot: SLOT.paintedMetal, color: dark, ao: { y0: 0.2, y1: 2.6, bottom: 0.6, top: 1 }, detail: 1.1 });
  b.cyl(0.15, 0.16, 0.14, 9, { pos: [0, 0.42, 0], slot: SLOT.paintedMetal, color: dark });
  // mast arm
  {
    const nodes = [];
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      nodes.push({ p: V(4.7 * t, 6.28 + 0.26 * Math.sin(t * Math.PI * 0.5) - 0.10 * t * t, 0), r: 0.075 - 0.022 * t });
    }
    b.add(tube(nodes, 6, 0.2), { slot: SLOT.paintedMetal, color: dark, detail: 1.2 });
  }
  // brace
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 5), { pos: [0.72, 5.68, 0], rot: [0, 0, -0.72], slot: SLOT.steel, color: 0x565c60 });
  for (const [hx, hy] of SIGNAL_HEADS) {
    b.box(0.36, 1.12, 0.34, { pos: [hx, hy, 0], slot: SLOT.paintedMetal, color: body, detail: 2.2 });
    b.box(0.10, 0.30, 0.10, { pos: [hx, hy + 0.78, 0], slot: SLOT.paintedMetal, color: dark });
    // visors
    for (const dy of LENS_DY) {
      b.add(new THREE.CylinderGeometry(0.145, 0.125, 0.20, 8, 1, true), { pos: [hx, hy + dy + 0.03, -0.24], rot: [Math.PI / 2, 0, 0], slot: SLOT.paintedMetal, color: body });
      b.add(new THREE.CylinderGeometry(0.125, 0.125, 0.03, 8), { pos: [hx, hy + dy, -0.16], rot: [Math.PI / 2, 0, 0], slot: SLOT.paintedMetal, color: 0x111315 });
    }
  }
  // pedestrian head on the pole
  b.box(0.34, 0.52, 0.26, { pos: [PED_HEAD[0], PED_HEAD[1], PED_HEAD[2]], slot: SLOT.paintedMetal, color: body, detail: 2.4 });
  b.box(0.26, 0.40, 0.03, { pos: [PED_HEAD[0], PED_HEAD[1], PED_HEAD[2] - 0.14], slot: SLOT.plastic, color: 0x101214 });
  b.box(0.16, 0.10, 0.10, { pos: [PED_HEAD[0] + 0.24, PED_HEAD[1] - 0.30, PED_HEAD[2]], slot: SLOT.plastic, color: 0x33383c });
  return { geo: b.build(), cast: true };
}

// ---------------------------------------------------------------- bench
function bench(lut) {
  const b = new Builder(lut);
  const frame = 0x2f3439, wood = 0x8a6038;
  for (const sx of [-0.74, 0.74]) {
    b.box(0.07, 0.44, 0.075, { pos: [sx, 0.22, -0.20], slot: SLOT.paintedMetal, color: frame, ao: { y0: 0, y1: 0.4, bottom: 0.5, top: 1 } });
    b.box(0.07, 0.44, 0.075, { pos: [sx, 0.22, 0.22], slot: SLOT.paintedMetal, color: frame, ao: { y0: 0, y1: 0.4, bottom: 0.5, top: 1 } });
    b.box(0.07, 0.06, 0.56, { pos: [sx, 0.455, 0.01], slot: SLOT.paintedMetal, color: frame });
    // back stay
    b.box(0.06, 0.62, 0.06, { pos: [sx, 0.75, 0.26], rot: [-0.20, 0, 0], slot: SLOT.paintedMetal, color: frame });
    b.box(0.09, 0.05, 0.11, { pos: [sx, 0.03, -0.20], slot: SLOT.paintedMetal, color: frame });
    b.box(0.09, 0.05, 0.11, { pos: [sx, 0.03, 0.22], slot: SLOT.paintedMetal, color: frame });
  }
  for (let i = 0; i < 4; i++) {
    const z = -0.22 + i * 0.145;
    b.box(1.72, 0.045, 0.115, { pos: [0, 0.487, z], slot: SLOT.wood, color: wood, detail: 3 });
  }
  for (let i = 0; i < 3; i++) {
    const y = 0.63 + i * 0.145;
    b.box(1.72, 0.115, 0.042, { pos: [0, y, 0.30 + i * 0.030], rot: [-0.20, 0, 0], slot: SLOT.wood, color: wood, detail: 3 });
  }
  return { geo: b.build(), cast: true };
}

// ---------------------------------------------------------------- litter bin
function bin(lut) {
  const b = new Builder(lut);
  const green = 0x2f4438;
  b.cyl(0.27, 0.22, 0.76, 12, { pos: [0, 0.42, 0], slot: SLOT.paintedMetal, color: green, ao: { y0: 0.04, y1: 0.6, bottom: 0.55, top: 1 }, detail: 2.4 });
  b.cyl(0.285, 0.285, 0.07, 12, { pos: [0, 0.80, 0], slot: SLOT.paintedMetal, color: 0x232b26 });
  b.cyl(0.24, 0.28, 0.10, 12, { pos: [0, 0.88, 0], slot: SLOT.paintedMetal, color: 0x232b26 });
  b.cyl(0.20, 0.24, 0.06, 12, { pos: [0, 0.04, 0], slot: SLOT.steel, color: 0x3a3f42 });
  for (let i = 0; i < 3; i++) b.box(0.05, 0.60, 0.05, { pos: [Math.cos(i * 2.09) * 0.255, 0.45, Math.sin(i * 2.09) * 0.255], slot: SLOT.steel, color: 0x1e2422 });
  return { geo: b.build(), cast: true };
}

// ---------------------------------------------------------------- fire hydrant
function hydrant(lut) {
  const b = new Builder(lut);
  const red = 0xa8352c;
  b.cyl(0.17, 0.19, 0.07, 10, { pos: [0, 0.035, 0], slot: SLOT.concrete, color: 0x6d6a64 });
  b.cyl(0.115, 0.135, 0.52, 10, { pos: [0, 0.33, 0], slot: SLOT.plastic, color: red, ao: { y0: 0.05, y1: 0.4, bottom: 0.6, top: 1 }, detail: 3 });
  b.cyl(0.145, 0.145, 0.06, 10, { pos: [0, 0.62, 0], slot: SLOT.plastic, color: 0x8c2b24 });
  b.sphere(0.135, 10, 6, { pos: [0, 0.68, 0], scale: [1, 0.8, 1], slot: SLOT.plastic, color: red });
  b.cyl(0.045, 0.05, 0.10, 8, { pos: [0, 0.80, 0], slot: SLOT.chrome, color: 0xb9bcbe });
  for (const s of [-1, 1]) b.cyl(0.065, 0.075, 0.13, 8, { pos: [s * 0.14, 0.46, 0], rot: [0, 0, Math.PI / 2], slot: SLOT.chrome, color: 0xa8acae });
  b.cyl(0.07, 0.08, 0.14, 8, { pos: [0, 0.46, -0.14], rot: [Math.PI / 2, 0, 0], slot: SLOT.chrome, color: 0xa8acae });
  return { geo: b.build(), cast: true };
}

// ---------------------------------------------------------------- sign post (plate is a separate mesh)
function signPost(lut, h) {
  const b = new Builder(lut);
  b.cyl(0.038, 0.045, h, 8, { pos: [0, h / 2, 0], slot: SLOT.steel, color: 0x9298a0, ao: { y0: 0, y1: 1.0, bottom: 0.55, top: 1 }, detail: 1.6 });
  b.cyl(0.075, 0.09, 0.10, 8, { pos: [0, 0.05, 0], slot: SLOT.concrete, color: 0x6d6a64 });
  return { geo: b.build(), cast: true };
}

/** Double-sided plate quad with UVs into the sign atlas. */
function signPlate(name, w, h, y) {
  const uv = signUV(name);
  const g = leafCard(w, h, uv);
  g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, y, -0.055));
  const back = leafCard(w, h, uv);
  back.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI));
  back.applyMatrix4(new THREE.Matrix4().makeTranslation(0, y, -0.045));
  const m = mergeGeometries([g, back], false);
  const n = m.attributes.position.count;
  m.setAttribute('aFlex', new THREE.BufferAttribute(new Float32Array(n), 1));
  return m;
}

// ---------------------------------------------------------------- bus shelter
function busStop(lut) {
  const b = new Builder(lut);
  const frame = 0x394047;
  const W = 3.9, D = 1.55;
  for (const sx of [-W / 2 + 0.08, W / 2 - 0.08]) for (const sz of [-D / 2 + 0.08, D / 2 - 0.08]) {
    b.box(0.10, 2.52, 0.10, { pos: [sx, 1.26, sz], slot: SLOT.paintedMetal, color: frame, ao: { y0: 0, y1: 1.2, bottom: 0.55, top: 1 }, detail: 1.6 });
  }
  b.box(W + 0.34, 0.10, D + 0.42, { pos: [0, 2.60, 0.02], slot: SLOT.paintedMetal, color: 0x3f464c, detail: 1.2 });
  b.box(W + 0.34, 0.14, 0.10, { pos: [0, 2.50, -(D / 2 + 0.20)], slot: SLOT.paintedMetal, color: 0x2c5a80, detail: 2 });
  // light strip under the roof
  b.box(W - 0.5, 0.05, 0.20, { pos: [0, 2.51, 0.18], slot: SLOT.lamp, color: 0xfff3d8 });
  // rear kerb rail + bench
  b.box(W - 0.3, 0.09, 0.09, { pos: [0, 0.52, D / 2 - 0.20], slot: SLOT.paintedMetal, color: frame });
  for (let i = 0; i < 3; i++) b.box(W - 0.6, 0.05, 0.13, { pos: [0, 0.49, D / 2 - 0.52 + i * 0.16], slot: SLOT.wood, color: 0x8a6038, detail: 3 });
  for (const sx of [-0.9, 0.9]) b.box(0.07, 0.48, 0.42, { pos: [sx, 0.25, D / 2 - 0.36], slot: SLOT.paintedMetal, color: frame });
  return { geo: b.build(), cast: true };
}
function busGlass() {
  const W = 3.9, D = 1.55;
  const parts = [];
  const panel = (w, h, pos, roty) => {
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Matrix4().makeRotationY(roty);
    m.setPosition(pos[0], pos[1], pos[2]);
    g.applyMatrix4(m);
    parts.push(g);
  };
  panel(W - 0.34, 2.10, [0, 1.36, D / 2 - 0.08], 0);
  panel(D - 0.34, 2.10, [-W / 2 + 0.09, 1.36, 0], Math.PI / 2);
  panel(D - 0.34, 2.10, [W / 2 - 0.09, 1.36, 0], Math.PI / 2);
  const g = mergeGeometries(parts, false);
  g.setAttribute('aFlex', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
  return g;
}

// ---------------------------------------------------------------- fence (2 m section, runs along X)
function fence(lut) {
  const b = new Builder(lut);
  const paint = 0xbfb9ab;
  for (const sx of [-0.97, 0.97]) b.box(0.095, 1.12, 0.095, { pos: [sx, 0.56, 0], slot: SLOT.wood, color: 0xa89e8c, ao: { y0: 0, y1: 0.5, bottom: 0.5, top: 1 }, detail: 3 });
  b.box(1.98, 0.075, 0.05, { pos: [0, 0.40, 0], slot: SLOT.wood, color: paint, detail: 3 });
  b.box(1.98, 0.075, 0.05, { pos: [0, 0.84, 0], slot: SLOT.wood, color: paint, detail: 3 });
  for (let i = 0; i < 7; i++) {
    const x = -0.84 + i * 0.28;
    b.box(0.085, 0.95, 0.032, { pos: [x, 0.50, 0], slot: SLOT.wood, color: paint, ao: { y0: 0, y1: 0.6, bottom: 0.62, top: 1 }, detail: 4 });
  }
  return { geo: b.build(), cast: true };
}

// ---------------------------------------------------------------- planter
function planter(lut) {
  const b = new Builder(lut);
  b.add(new THREE.CylinderGeometry(0.62, 0.50, 0.62, 4), { pos: [0, 0.31, 0], rot: [0, Math.PI / 4, 0], slot: SLOT.concrete, color: 0x9d988e, ao: { y0: 0, y1: 0.6, bottom: 0.62, top: 1 }, detail: 1.8 });
  b.add(new THREE.CylinderGeometry(0.66, 0.62, 0.09, 4), { pos: [0, 0.62, 0], rot: [0, Math.PI / 4, 0], slot: SLOT.concrete, color: 0xa9a49a, detail: 1.8 });
  b.add(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 4), { pos: [0, 0.63, 0], rot: [0, Math.PI / 4, 0], slot: SLOT.rubber, color: 0x3a2c20 });
  return { geo: b.build(), cast: true };
}

// ---------------------------------------------------------------- foliage props (share the tree leaf material)
function cardBlob(rng, { cards, radius, height, uv, tint, flat = 1 }) {
  const parts = [];
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const centre = new THREE.Vector3(0, height * 0.5, 0);
  for (let i = 0; i < cards; i++) {
    const a = rng.float() * Math.PI * 2;
    const r = Math.pow(rng.float(), 0.55) * radius;
    const y = height * (0.18 + rng.float() * 0.8);
    const pos = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * flat);
    const outward = pos.clone().sub(centre);
    if (outward.lengthSq() < 1e-5) outward.set(0, 1, 0);
    const d = Math.min(1, outward.length() / radius);
    const w = radius * rng.range(0.85, 1.5);
    const g = leafCard(w, w * rng.range(0.75, 1.0), uv);
    const face = outward.clone().normalize();
    face.x += rng.range(-0.5, 0.5); face.y += rng.range(-0.35, 0.35); face.z += rng.range(-0.5, 0.5);
    face.normalize();
    _m.lookAt(new THREE.Vector3(), face, new THREE.Vector3(0, 1, 0));
    _q.setFromRotationMatrix(_m);
    _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rng.range(-0.7, 0.7)));
    _m.compose(pos, _q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(_m);
    const shade = outward.clone().normalize().lerp(new THREE.Vector3(0, 1, 0), 0.35).normalize();
    const nrm = g.attributes.normal.array;
    for (let k = 0; k < 4; k++) { nrm[k * 3] = shade.x; nrm[k * 3 + 1] = shade.y; nrm[k * 3 + 2] = shade.z; }
    const ao = (0.45 + 0.55 * d) * (0.72 + 0.4 * (y / height));
    const c = new Float32Array(12);
    for (let k = 0; k < 4; k++) { c[k * 3] = tint[0] * ao; c[k * 3 + 1] = tint[1] * ao; c[k * 3 + 2] = tint[2] * ao; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const fl = new Float32Array(4).fill(0.4 + rng.float() * 0.5);
    g.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1));
    parts.push(g);
  }
  return mergeGeometries(parts, false);
}

// ---------------------------------------------------------------- public
export function buildFurniture(lut, rng) {
  const out = {};
  out.streetlamp = lamp(lut);
  out.trafficlight = trafficLight(lut);
  out.bench = bench(lut);
  out.bin = bin(lut);
  out.hydrant = hydrant(lut);
  out.sign = signPost(lut, 2.45);
  out.bus_stop = busStop(lut);
  out.fence = fence(lut);
  out.planter = planter(lut);
  out.plate_stop = { geo: signPlate('stop', 0.62, 0.62, 2.08), cast: false };
  out.plate_speed = { geo: signPlate('speed', 0.60, 0.60, 2.10), cast: false };
  out.plate_street = { geo: signPlate('street', 1.05, 0.52, 2.18), cast: false };
  out.plate_bus = { geo: signPlate('bus', 0.56, 0.56, 2.12), cast: false };
  out.glass = { geo: busGlass(), cast: false };
  out.bush = { geo: cardBlob(rng.fork('bush'), { cards: 15, radius: 0.52, height: 1.0, uv: leafUV('bush'), tint: [0.92, 1.0, 0.86] }), cast: true };
  out.flowers = { geo: cardBlob(rng.fork('flowers'), { cards: 9, radius: 0.42, height: 0.62, uv: leafUV('flower'), tint: [1, 1, 1] }), cast: false };
  out.hedge = { geo: cardBlob(rng.fork('hedge'), { cards: 20, radius: 0.62, height: 1.1, uv: leafUV('bush'), tint: [0.84, 0.96, 0.80], flat: 0.45 }), cast: true };
  return out;
}
