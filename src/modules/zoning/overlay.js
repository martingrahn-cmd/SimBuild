// CS2-style zoning overlay: one merged, terrain-conforming mesh per zone type (translucent fill +
// fine grid pattern + animated bright region outline), one mesh for the empty zonable band, and one
// mesh for the lot outlines. Everything is unlit and drawn as a decal over terrain/roads.
import * as THREE from 'three';
import { RENDER_ORDER } from '../../core/constants.js';
import { ZONE_TYPES, zoneColors, lotColor } from './palette.js';

const LIFT_CELL = 0.16;   // m above the ground
const LIFT_LOT = 0.26;
const SUB = 2;            // 2x2 quads per 8 m cell -> matches the 4 m terrain grid

const VERT = /* glsl */`
attribute vec2 aUv;
attribute vec4 aMask;
attribute float aDens;
attribute float aRnd;
attribute float aLot;
varying vec2 vUv;
varying vec4 vMask;
varying float vDens;
varying float vRnd;
varying float vLot;
varying vec3 vWPos;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = aUv; vMask = aMask; vDens = aDens; vRnd = aRnd; vLot = aLot;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  #include <fog_vertex>
  gl_Position = projectionMatrix * mvPosition;
}`;

const FRAG = /* glsl */`
uniform vec3 uLow;
uniform vec3 uHigh;
uniform float uTime;
uniform float uFill;
uniform float uGrid;
uniform float uEdge;
uniform float uOpacity;
uniform float uHatch;
varying vec2 vUv;
varying vec4 vMask;
varying float vDens;
varying float vRnd;
varying float vLot;
varying vec3 vWPos;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec3 base = mix(uLow, uHigh, vDens) * (1.06 + 0.18 * vRnd);
  vec2 uv = vUv;

  // fine grid: a thin darker/brighter line inside every cell border
  vec2 g = min(uv, 1.0 - uv);
  float gd = min(g.x, g.y);
  float gaa = fwidth(gd) * 1.1 + 0.0015;
  float grid = 1.0 - smoothstep(0.038 - gaa, 0.038 + gaa, gd);

  // 45 deg hatch on high density so the two densities read apart at any zoom
  float d45 = (vWPos.x - vWPos.z) * 0.70710678;
  float hs = abs(fract(d45 / 3.0) - 0.5) * 2.0;
  float haa = fwidth(hs) * 1.2 + 0.02;
  float hatch = uHatch * vDens * (1.0 - smoothstep(0.34 - haa, 0.34 + haa, hs));

  // region outline on the sides that face a different zone
  float bd = 4.0;
  if (vMask.x > 0.5) bd = min(bd, 1.0 - uv.x);
  if (vMask.y > 0.5) bd = min(bd, uv.x);
  if (vMask.z > 0.5) bd = min(bd, 1.0 - uv.y);
  if (vMask.w > 0.5) bd = min(bd, uv.y);
  float eaa = fwidth(bd) * 1.1 + 0.0015;
  float edge = 1.0 - smoothstep(0.080 - eaa, 0.080 + eaa, bd);
  float core = 1.0 - smoothstep(0.028 - eaa, 0.028 + eaa, bd);

  // slow pulse travelling along the outline
  float ph = (vWPos.x + vWPos.z) * 0.020 - uTime * 0.22;
  float pulse = 0.62 + 0.38 * sin(ph * 6.2831853);

  // saturated near-opaque fill with darker grid lines, like the CS2 zone overlay
  vec3 col = base;
  col *= mix(1.0, 0.52, grid);
  col *= mix(1.0, 0.66, hatch);
  // cells that are not part of a lot (block cores, back gardens) sit back a little
  col *= mix(0.80, 1.0, vLot);
  float a = (uFill - (1.0 - vLot) * 0.10) + grid * uGrid * 0.5 + hatch * 0.06;

  col = mix(col, mix(base, vec3(1.0), 0.55), edge * (0.40 + 0.60 * pulse));
  col = mix(col, vec3(0.96, 0.98, 1.0), core * 0.88);
  a = max(a, edge * uEdge * (0.55 + 0.45 * pulse));
  a = max(a, core * uEdge);
  a *= uOpacity;
  if (a < 0.004) discard;

  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const LOT_VERT = /* glsl */`
attribute vec3 aColor;
attribute float aKind;
varying vec3 vCol;
varying float vKind;
varying vec3 vWPos;
#include <common>
#include <fog_pars_vertex>
void main() {
  vCol = aColor; vKind = aKind;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  #include <fog_vertex>
  gl_Position = projectionMatrix * mvPosition;
}`;

const LOT_FRAG = /* glsl */`
uniform float uOpacity;
uniform float uTime;
varying vec3 vCol;
varying float vKind;
varying vec3 vWPos;
#include <common>
#include <fog_pars_fragment>
void main() {
  // kind 0 = lot border, 1 = frontage bar (brighter, gently breathing)
  float pulse = 0.80 + 0.20 * sin(((vWPos.x + vWPos.z) * 0.02 - uTime * 0.22) * 6.2831853);
  vec3 col = mix(vCol, vCol * 1.25 + 0.18, vKind);
  float a = mix(0.46, 0.62 * pulse, vKind) * uOpacity;
  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function cellMaterial(shared, low, high, opts = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uLow: { value: low }, uHigh: { value: high },
        uTime: shared.uTime, uOpacity: shared.uOpacity,
        uFill: { value: opts.fill ?? 0.63 },
        uGrid: { value: opts.grid ?? 0.30 },
        uEdge: { value: opts.edge ?? 0.95 },
        uHatch: { value: opts.hatch ?? 1.0 },
      },
    ]),
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -12,
  });
  // UniformsUtils.merge clones; re-point the shared animation uniforms so one write drives all
  m.uniforms.uTime = shared.uTime;
  m.uniforms.uOpacity = shared.uOpacity;
  m.uniforms.uLow.value = low;
  m.uniforms.uHigh.value = high;
  return m;
}

export class ZoneOverlay {
  constructor(ctx, grid) {
    this.ctx = ctx;
    this.grid = grid;
    this.world = ctx.world;
    this.group = new THREE.Group();
    this.group.name = 'zoning-overlay';
    this.group.renderOrder = RENDER_ORDER.MARKINGS + 4;
    ctx.group.add(this.group);
    this.shared = { uTime: { value: 0 }, uOpacity: { value: 1 } };
    this.colors = zoneColors();
    this.meshes = new Map();      // type -> Mesh
    this.stats = { cells: 0, lots: 0, tris: 0, draws: 0 };

    const white = new THREE.Color(0.80, 0.85, 0.92);
    this.emptyMat = cellMaterial(this.shared, white, white, { fill: 0.10, grid: 0.42, edge: 0.42, hatch: 0.0 });
    for (const t of ZONE_TYPES) {
      const mat = cellMaterial(this.shared, this.colors[t].low, this.colors[t].high);
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.renderOrder = RENDER_ORDER.MARKINGS + 5;
      this.group.add(mesh);
      this.meshes.set(t, mesh);
    }
    this.emptyMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.emptyMat);
    this.emptyMesh.frustumCulled = false;
    this.emptyMesh.visible = false;
    this.emptyMesh.renderOrder = RENDER_ORDER.MARKINGS + 4;
    this.group.add(this.emptyMesh);

    this.lotMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uOpacity: this.shared.uOpacity, uTime: this.shared.uTime }]),
      vertexShader: LOT_VERT, fragmentShader: LOT_FRAG,
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, fog: true,
      polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -18,
    });
    this.lotMat.uniforms.uOpacity = this.shared.uOpacity;
    this.lotMat.uniforms.uTime = this.shared.uTime;
    this.lotMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.lotMat);
    this.lotMesh.frustumCulled = false;
    this.lotMesh.visible = false;
    this.lotMesh.renderOrder = RENDER_ORDER.MARKINGS + 6;
    this.group.add(this.lotMesh);
  }

  setVisible(v) { this.group.visible = !!v; }
  get visible() { return this.group.visible; }
  setOpacity(v) { this.shared.uOpacity.value = v; }
  update(dt) { this.shared.uTime.value += dt; }

  // ------------------------------------------------------------------ build
  rebuild() {
    const t0 = performance.now();
    this.buildCells();
    this.buildLots();
    this.stats.ms = performance.now() - t0;
    return this.stats;
  }

  /** Zone id used for the boundary test: same type AND density = same region. */
  _zid(c) { return c ? c.type + (c.density === 'high' ? '1' : '0') : null; }

  buildCells() {
    const grid = this.grid, cells = grid.cells;
    const buckets = new Map();
    for (const t of ZONE_TYPES) buckets.set(t, []);
    const empty = [];
    for (const [key, c] of cells) buckets.get(c.type)?.push([key, c]);
    for (const [key, z] of grid.zonable) if (!cells.has(key)) empty.push([key, z]);

    let tris = 0, draws = 0;
    for (const t of ZONE_TYPES) {
      const list = buckets.get(t);
      const mesh = this.meshes.get(t);
      const geo = this._cellGeometry(list, (c) => (c.density === 'high' ? 1 : 0), (key, c) => this._zid(c));
      mesh.geometry.dispose();
      mesh.geometry = geo;
      mesh.visible = list.length > 0;
      if (mesh.visible) { draws++; tris += geo.index.count / 3; }
    }
    const geoE = this._cellGeometry(empty, () => 0, () => 'empty', true);
    this.emptyMesh.geometry.dispose();
    this.emptyMesh.geometry = geoE;
    this.emptyMesh.visible = empty.length > 0;
    if (this.emptyMesh.visible) { draws++; tris += geoE.index.count / 3; }

    this.stats.cells = cells.size;
    this.stats.tris = tris;
    this.stats.draws = draws;
  }

  /**
   * Merged geometry for a list of [key, record] cells. `densOf` returns 0/1, `zidOf` returns the
   * region id used to decide where the bright outline goes; `emptyMode` compares against the zonable
   * map instead of the painted cells.
   */
  _cellGeometry(list, densOf, zidOf, emptyMode = false) {
    const geo = new THREE.BufferGeometry();
    const n = list.length;
    const g = this.grid, T = this.world.terrain;
    const vpc = (SUB + 1) * (SUB + 1);
    const tpc = SUB * SUB * 2;
    const pos = new Float32Array(n * vpc * 3);
    const uv = new Float32Array(n * vpc * 2);
    const mask = new Float32Array(n * vpc * 4);
    const dens = new Float32Array(n * vpc);
    const rnd = new Float32Array(n * vpc);
    const lotf = new Float32Array(n * vpc);
    const idx = new Uint32Array(n * tpc * 3);
    const cell = g.cell, step = cell / SUB;
    const rng = this.ctx.rng.fork('overlay');
    let vp = 0, ip = 0, vbase = 0;
    const has = emptyMode
      ? (ix, iz) => (g.zonable.has(g.key(ix, iz)) && !g.cells.has(g.key(ix, iz)) ? 'empty' : null)
      : (ix, iz) => zidOf(g.key(ix, iz), g.cells.get(g.key(ix, iz)));

    for (let c = 0; c < n; c++) {
      const [key, rec] = list[c];
      const ci = key.indexOf(',');
      const ix = +key.slice(0, ci), iz = +key.slice(ci + 1);
      const x0 = ix * cell - g.half, z0 = iz * cell - g.half;
      const me = emptyMode ? 'empty' : zidOf(key, rec);
      const mpx = has(ix + 1, iz) === me ? 0 : 1;
      const mnx = has(ix - 1, iz) === me ? 0 : 1;
      const mpz = has(ix, iz + 1) === me ? 0 : 1;
      const mnz = has(ix, iz - 1) === me ? 0 : 1;
      const d = densOf(rec);
      const r = rng.float();
      const inLot = emptyMode || g.claimed.has(key) ? 1 : 0;
      for (let j = 0; j <= SUB; j++) for (let i = 0; i <= SUB; i++) {
        const px = x0 + i * step, pz = z0 + j * step;
        pos[vp * 3] = px; pos[vp * 3 + 1] = T.getHeight(px, pz) + LIFT_CELL; pos[vp * 3 + 2] = pz;
        uv[vp * 2] = i / SUB; uv[vp * 2 + 1] = j / SUB;
        mask[vp * 4] = mpx; mask[vp * 4 + 1] = mnx; mask[vp * 4 + 2] = mpz; mask[vp * 4 + 3] = mnz;
        dens[vp] = d; rnd[vp] = r; lotf[vp] = inLot;
        vp++;
      }
      for (let j = 0; j < SUB; j++) for (let i = 0; i < SUB; i++) {
        const a = vbase + j * (SUB + 1) + i, b = a + 1, cc = a + SUB + 1, dd = cc + 1;
        idx[ip++] = a; idx[ip++] = cc; idx[ip++] = b;
        idx[ip++] = b; idx[ip++] = cc; idx[ip++] = dd;
      }
      vbase += vpc;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('aMask', new THREE.BufferAttribute(mask, 4));
    geo.setAttribute('aDens', new THREE.BufferAttribute(dens, 1));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute('aLot', new THREE.BufferAttribute(lotf, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    return geo;
  }

  buildLots() {
    const lots = [...this.grid.lots.values()];
    const T = this.world.terrain;
    const pos = [], col = [], kind = [], idx = [];
    const push = (x, z, c, k) => {
      pos.push(x, T.getHeight(x, z) + LIFT_LOT, z);
      col.push(c.r, c.g, c.b);
      kind.push(k);
      return pos.length / 3 - 1;
    };
    // one border ribbon: for each lot side, a strip inset inward by `th`
    const strip = (ax, az, bx, bz, inx, inz, th, c, k) => {
      const len = Math.hypot(bx - ax, bz - az);
      const segs = Math.max(1, Math.round(len / 4));
      let p0 = push(ax, az, c, k), p1 = push(ax + inx * th, az + inz * th, c, k);
      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const q0 = push(x, z, c, k), q1 = push(x + inx * th, z + inz * th, c, k);
        idx.push(p0, q0, p1, p1, q0, q1);
        p0 = q0; p1 = q1;
      }
    };
    for (const l of lots) {
      const c = lotColor(l.type, l.density);
      const hw = l.w * 0.5, hd = l.d * 0.5;
      // corners: front-left, front-right, back-right, back-left (front = toward the road)
      const fx = l.x - l.nx * hd, fz = l.z - l.nz * hd;
      const bx = l.x + l.nx * hd, bz = l.z + l.nz * hd;
      const fl = [fx - l.ax * hw, fz - l.az * hw], fr = [fx + l.ax * hw, fz + l.az * hw];
      const bl = [bx - l.ax * hw, bz - l.az * hw], br = [bx + l.ax * hw, bz + l.az * hw];
      const th = 0.6;
      strip(fl[0], fl[1], fr[0], fr[1], l.nx, l.nz, th, c, 0);            // front
      strip(bl[0], bl[1], br[0], br[1], -l.nx, -l.nz, th, c, 0);          // back
      strip(fl[0], fl[1], bl[0], bl[1], l.ax, l.az, th, c, 0);            // left
      strip(fr[0], fr[1], br[0], br[1], -l.ax, -l.az, th, c, 0);          // right
      // frontage bar: a brighter thicker band hugging the street edge of the lot
      const inset = 0.55;
      strip(fl[0] + l.nx * inset, fl[1] + l.nz * inset, fr[0] + l.nx * inset, fr[1] + l.nz * inset, l.nx, l.nz, 0.9, c, 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(col), 3));
    geo.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(kind), 1));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    this.lotMesh.geometry.dispose();
    this.lotMesh.geometry = geo;
    this.lotMesh.visible = lots.length > 0;
    this.stats.lots = lots.length;
    if (this.lotMesh.visible) { this.stats.draws++; this.stats.tris += idx.length / 3; }
    return geo;
  }

  syncFog(scene) {
    const fog = scene.fog;
    const mats = [...this.meshes.values()].map((x) => x.material).concat([this.emptyMat, this.lotMat]);
    for (const m of mats) {
      const u = m.uniforms;
      if (!u.fogColor) continue;
      if (fog) { u.fogColor.value.copy(fog.color); if (u.fogDensity) u.fogDensity.value = fog.density ?? 0; }
      else if (u.fogDensity) u.fogDensity.value = 0;
    }
  }

  dispose() {
    for (const m of this.meshes.values()) { m.geometry.dispose(); m.material.dispose(); }
    this.emptyMesh.geometry.dispose(); this.emptyMat.dispose();
    this.lotMesh.geometry.dispose(); this.lotMat.dispose();
    this.group.parent?.remove(this.group);
  }
}
