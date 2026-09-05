// Small CSG-free geometry builder: primitives are generated in local space, transformed, tagged with a
// material slot (uv0 -> LUT), a detail-uv (uv1) and a baked vertex colour (albedo + hand-painted AO),
// then merged into one BufferGeometry per prop kind.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _c = new THREE.Color();

export class Builder {
  constructor(lut) {
    this.lut = lut;
    this.parts = [];
  }

  /**
   * geo: a BufferGeometry (consumed). opts:
   *  pos [x,y,z], rot [rx,ry,rz], scale number|[x,y,z]
   *  slot: SLOT.* material slot, color: hex, ao: {top,bottom} vertical AO gradient, detail: uv1 scale
   */
  add(geo, opts = {}) {
    const { pos, rot, scale, slot = 0, color = 0xffffff, ao = null, detail = 1 } = opts;
    _m.identity();
    if (rot) { _e.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); _q.setFromEuler(_e); } else _q.identity();
    const s = scale === undefined ? _v.set(1, 1, 1) : (typeof scale === 'number' ? _v.set(scale, scale, scale) : _v.fromArray(scale));
    _m.compose(pos ? new THREE.Vector3(pos[0], pos[1], pos[2]) : new THREE.Vector3(), _q, s);
    geo.applyMatrix4(_m);
    const n = geo.attributes.position.count;
    const p = geo.attributes.position.array;
    // uv0 -> material slot lookup
    const uv = new Float32Array(n * 2);
    const u = this.lut.u(slot);
    for (let i = 0; i < n; i++) { uv[i * 2] = u; uv[i * 2 + 1] = 0.5; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    // uv1 -> tiling detail normal, planar on the dominant axis
    const uv1 = new Float32Array(n * 2);
    const nr = geo.attributes.normal ? geo.attributes.normal.array : null;
    for (let i = 0; i < n; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      let ax = 0, ay = 0, az = 0;
      if (nr) { ax = Math.abs(nr[i * 3]); ay = Math.abs(nr[i * 3 + 1]); az = Math.abs(nr[i * 3 + 2]); }
      if (ay > ax && ay > az) { uv1[i * 2] = x * detail; uv1[i * 2 + 1] = z * detail; }
      else if (ax > az) { uv1[i * 2] = z * detail; uv1[i * 2 + 1] = y * detail; }
      else { uv1[i * 2] = x * detail; uv1[i * 2 + 1] = y * detail; }
    }
    geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    // vertex colour = albedo * baked AO
    _c.set(color);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      let k = 1;
      if (ao) {
        const y = p[i * 3 + 1];
        const t = THREE.MathUtils.clamp((y - ao.y0) / Math.max(0.001, ao.y1 - ao.y0), 0, 1);
        k = ao.bottom + (ao.top - ao.bottom) * (t * t * (3 - 2 * t));
      }
      col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'uv1', 'color'].includes(k)) geo.deleteAttribute(k);
    this.parts.push(geo);
    return this;
  }

  box(w, h, d, opts) { return this.add(new THREE.BoxGeometry(w, h, d), opts); }
  cyl(rt, rb, h, seg = 8, opts = {}) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!opts.open), opts); }
  sphere(r, wseg = 8, hseg = 6, opts) { return this.add(new THREE.SphereGeometry(r, wseg, hseg), opts); }
  /** Quarter-circle tube sweep in the XY plane (used for lamp arms). */
  arc(radius, tubeR, arcRad, seg = 8, radial = 6, opts) {
    return this.add(new THREE.TorusGeometry(radius, tubeR, radial, seg, arcRad), opts);
  }
  build() {
    if (!this.parts.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.parts, false);
    this.parts.length = 0;
    g.computeBoundingSphere();
    return g;
  }
}

/** A single leaf/foliage card: a quad in the XY plane facing +Z, with UVs into the leaf atlas. */
export function leafCard(w, h, uvRect) {
  const g = new THREE.BufferGeometry();
  const hw = w / 2;
  const pos = new Float32Array([-hw, -h * 0.5, 0, hw, -h * 0.5, 0, hw, h * 0.5, 0, -hw, h * 0.5, 0]);
  const uv = new Float32Array([
    uvRect.u0, uvRect.v0,
    uvRect.u0 + uvRect.du, uvRect.v0,
    uvRect.u0 + uvRect.du, uvRect.v0 + uvRect.dv,
    uvRect.u0, uvRect.v0 + uvRect.dv,
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/** Horizontal quad (facing +Y) used for impostor canopy caps and ground decals. */
export function groundCard(w, d, uvRect) {
  const g = new THREE.BufferGeometry();
  const hw = w / 2, hd = d / 2;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-hw, 0, hd, hw, 0, hd, hw, 0, -hd, -hw, 0, -hd]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
    uvRect.u0, uvRect.v0, uvRect.u0 + uvRect.du, uvRect.v0, uvRect.u0 + uvRect.du, uvRect.v0 + uvRect.dv, uvRect.u0, uvRect.v0 + uvRect.dv]), 2));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/**
 * Sweep a tapered tube along a polyline of {p:Vector3, r:number} nodes.
 * Returns a BufferGeometry with position/normal/uv (uv.x wraps, uv.y is arc length in metres).
 */
export function tube(nodes, sides = 6, uvScale = 0.25) {
  const rings = nodes.length;
  const verts = rings * (sides + 1);
  const pos = new Float32Array(verts * 3);
  const nor = new Float32Array(verts * 3);
  const uv = new Float32Array(verts * 2);
  const idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3(), tx = new THREE.Vector3(), ty = new THREE.Vector3();
  let arc = 0;
  for (let i = 0; i < rings; i++) {
    const a = nodes[i].p;
    if (i < rings - 1) dir.copy(nodes[i + 1].p).sub(a).normalize();
    else dir.copy(a).sub(nodes[i - 1].p).normalize();
    if (i > 0) arc += nodes[i].p.distanceTo(nodes[i - 1].p);
    tx.crossVectors(Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up, dir).normalize();
    ty.crossVectors(dir, tx).normalize();
    for (let s = 0; s <= sides; s++) {
      const ang = (s / sides) * Math.PI * 2;
      const cx = Math.cos(ang), sy = Math.sin(ang);
      const nx = tx.x * cx + ty.x * sy, ny = tx.y * cx + ty.y * sy, nz = tx.z * cx + ty.z * sy;
      const o = (i * (sides + 1) + s);
      pos[o * 3] = a.x + nx * nodes[i].r; pos[o * 3 + 1] = a.y + ny * nodes[i].r; pos[o * 3 + 2] = a.z + nz * nodes[i].r;
      nor[o * 3] = nx; nor[o * 3 + 1] = ny; nor[o * 3 + 2] = nz;
      uv[o * 2] = s / sides; uv[o * 2 + 1] = arc * uvScale;
    }
  }
  for (let i = 0; i < rings - 1; i++) for (let s = 0; s < sides; s++) {
    const a = i * (sides + 1) + s, b = a + 1, c = a + sides + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
