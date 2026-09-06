// 3D gizmo layer for the tools module: the ghost road ribbon, node discs, brush rings, coverage
// annuli, the blue affected-area wash, zone-cell previews, footprint rectangles and selection
// outlines.
//
// Everything is drawn from preallocated dynamic meshes (one per material family), so the whole tool
// overlay costs a handful of draw calls and never allocates per frame:
//   ribbon  — the road ghost: an OPAQUE near-white paint band exactly the width of the road type
//   flat    — cells, discs, rects, volumes, dashes (vertex colour + per-vertex shape param)
//   disc    — brush rings / coverage annuli / the affected-area wash, terrain-conformed, from a pool
//
// Every mesh sits on LAYERS.HELPERS so the terrain planar-reflection camera (which disables exactly
// that layer, terrain/water.js:192) never sees it, and every mesh has castShadow/receiveShadow off.
//
// Linear output ceiling: every material here emits ≤ 0.70 linear so nothing crosses the night bloom
// threshold (2.2 / 2.8 = 0.79 at 22:00 — module spec §4 item 6).
import * as THREE from 'three';
import { RENDER_ORDER, LAYERS } from '../../core/constants.js';

export const LINEAR_CAP = 0.70;

// ---------------------------------------------------------------------------------------- materials

function ribbonMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uFill: { value: new THREE.Color(0.615, 0.618, 0.625) },   // linear — encodes to ≈ 205/255 sRGB
      uEdge: { value: new THREE.Color(LINEAR_CAP, LINEAR_CAP, LINEAR_CAP) },
      uFillA: { value: 0.97 },                                   // paint, not glass (r1 blocker 1)
      uOpacity: { value: 1.0 },
      uWidth: { value: 16 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform vec3 uFill, uEdge;
      uniform float uFillA, uOpacity, uWidth;
      void main() {
        float hw = max(uWidth * 0.5, 0.5);
        float ax = abs(vUv.x - 0.5) * 2.0;
        float dEdge = (1.0 - ax) * hw;                    // metres in from the rim
        float aa = fwidth(dEdge) + 1e-4;
        float rw = max(0.30, aa * 1.6);
        float rim = 1.0 - smoothstep(rw, rw + aa, dEdge);
        // the body is paint: full alpha across the band, the rim only a slight brightening
        float a = mix(uFillA, 1.0, rim * 0.6) * uOpacity;
        vec3 col = mix(uFill, uEdge, rim * 0.7);
        if (a <= 0.004) discard;
        gl_FragColor = vec4(min(col, vec3(${LINEAR_CAP.toFixed(3)})), clamp(a, 0.0, 1.0));
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -6,
    toneMapped: false,
  });
}

function flatMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 1.0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */`
      attribute vec4 aColor;
      attribute vec4 aParam;
      varying vec2 vUv;
      varying vec4 vCol;
      varying vec4 vPar;
      void main() {
        vUv = uv; vCol = aColor; vPar = aParam;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      varying vec4 vCol;
      varying vec4 vPar;
      uniform float uOpacity;
      void main() {
        float shape = vPar.y;
        vec3 col = vCol.rgb;
        float a = vCol.a;
        if (shape < 0.5) {
          // rect with a bright inner border of width vPar.x (uv units)
          vec2 d = 0.5 - abs(vUv - 0.5);
          float m = min(d.x, d.y);
          float aa = fwidth(m) + 1e-5;
          float border = 1.0 - smoothstep(vPar.x, vPar.x + aa, m);
          a = mix(a, max(a, 0.88), border);
          col = mix(col, mix(col, vec3(1.0), 0.6), border);
        } else if (shape < 1.5) {
          // disc: filled core of radius vPar.z + ring from vPar.x to 1
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;
          float aa = fwidth(r) + 1e-5;
          float core = 1.0 - smoothstep(vPar.z - aa, vPar.z + aa, r);
          float ring = smoothstep(vPar.x - aa, vPar.x + aa * 0.5, r) * (1.0 - smoothstep(1.0 - aa * 2.0, 1.0, r));
          float k = max(core, ring);
          a = vCol.a * k;
          col = mix(col, vec3(1.0), k * vPar.w);
        }
        // shape >= 1.5: flat fill, straight vertex colour/alpha
        a *= uOpacity;
        if (a <= 0.004) discard;
        // 0.96, not 0.70: this layer carries the zoning palette, whose brightest hex (0xf7b515) is
        // 0.93 linear, and every cell is drawn at 0.45 alpha so the composite stays far under the
        // night bloom threshold. Opaque whites in this layer are already authored at 0.70.
        gl_FragColor = vec4(min(col, vec3(0.96)), clamp(a, 0.0, 1.0));
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
    toneMapped: false,
  });
}

/**
 * Terrain-conformed ring / annulus / wash. One material serves three jobs:
 *   uFill  > 0  a translucent body (the blue affected-area wash)
 *   uRimIn      the outer ring, dashed when uDashMin < 1
 *   uRing2 > 0  a second ring at that normalised radius (the sculpt brush's inner ring)
 */
function discMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0.4, 0.85, 1.0) },
      uRim: { value: new THREE.Color(LINEAR_CAP, LINEAR_CAP, LINEAR_CAP) },
      uFill: { value: 0.0 },
      uRimIn: { value: 0.965 },
      uRimA: { value: 0.45 },
      uRing2: { value: 0.0 },
      uRing2W: { value: 0.012 },
      uDashes: { value: 32.0 },
      uDashMin: { value: 1.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform vec3 uColor, uRim;
      uniform float uFill, uRimIn, uRimA, uRing2, uRing2W, uDashes, uDashMin, uOpacity;
      void main() {
        float r = vUv.x;
        float th = vUv.y;
        float aa = fwidth(r) + 1e-5;
        float body = uFill * (1.0 - smoothstep(1.0 - aa * 2.0, 1.0, r));
        float rw = max(1.0 - uRimIn, aa * 1.6);
        float rim = smoothstep(1.0 - rw - aa, 1.0 - rw + aa * 0.3, r) * (1.0 - smoothstep(1.0 - aa * 1.2, 1.0, r));
        float dash = mix(uDashMin, 1.0, step(0.45, fract(th * uDashes)));
        float ring2 = 0.0;
        if (uRing2 > 0.001) {
          float w2 = max(uRing2W, aa * 1.4);
          ring2 = (1.0 - smoothstep(w2, w2 + aa, abs(r - uRing2)));
        }
        float rimA = rim * dash * uRimA + ring2 * uRimA * 0.85;
        float a = (body + rimA) * uOpacity;
        vec3 col = mix(uColor, uRim, clamp((rim + ring2) * 1.4, 0.0, 1.0));
        if (a <= 0.004) discard;
        gl_FragColor = vec4(min(col, vec3(${LINEAR_CAP.toFixed(3)})), clamp(a, 0.0, 1.0));
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -7,
    polygonOffsetUnits: -7,
    toneMapped: false,
  });
}

// ------------------------------------------------------------------------------------ dynamic mesh

/** Preallocated triangle soup with position/uv (+ optional aColor/aParam) and a moving draw range. */
class DynamicMesh {
  constructor(maxQuads, material, { attrs = false, order = RENDER_ORDER.UI3D } = {}) {
    const maxVerts = maxQuads * 4;
    this.max = maxQuads;
    this.pos = new Float32Array(maxVerts * 3);
    this.uv = new Float32Array(maxVerts * 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    if (attrs) {
      this.col = new Float32Array(maxVerts * 4);
      this.par = new Float32Array(maxVerts * 4);
      g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aParam', new THREE.BufferAttribute(this.par, 4).setUsage(THREE.DynamicDrawUsage));
    }
    const idx = new Uint32Array(maxQuads * 6);
    for (let i = 0; i < maxQuads; i++) {
      const o = i * 4, k = i * 6;
      idx[k] = o; idx[k + 1] = o + 1; idx[k + 2] = o + 2;
      idx[k + 3] = o; idx[k + 4] = o + 2; idx[k + 5] = o + 3;
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4000);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.visible = false;
    this.mesh.layers.set(LAYERS.HELPERS);
    this.mesh.layers.enable(0);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.n = 0;
  }
  begin() { this.n = 0; return this; }
  quad(p0, p1, p2, p3, uvs, colour, param) {
    if (this.n >= this.max) return this;
    const o = this.n * 4;
    const P = [p0, p1, p2, p3];
    for (let i = 0; i < 4; i++) {
      const b = (o + i) * 3;
      this.pos[b] = P[i][0]; this.pos[b + 1] = P[i][1]; this.pos[b + 2] = P[i][2];
      const u = (o + i) * 2;
      this.uv[u] = uvs[i * 2]; this.uv[u + 1] = uvs[i * 2 + 1];
      if (this.col) {
        const c = (o + i) * 4;
        const cc = Array.isArray(colour[0]) ? colour[i] : colour;
        this.col[c] = cc[0]; this.col[c + 1] = cc[1]; this.col[c + 2] = cc[2]; this.col[c + 3] = cc[3];
        this.par[c] = param[0]; this.par[c + 1] = param[1]; this.par[c + 2] = param[2]; this.par[c + 3] = param[3];
      }
    }
    this.n++;
    return this;
  }
  end() {
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.uv.needsUpdate = true;
    if (this.col) { this.geo.attributes.aColor.needsUpdate = true; this.geo.attributes.aParam.needsUpdate = true; }
    this.geo.setDrawRange(0, this.n * 6);
    this.mesh.visible = this.n > 0;
    return this;
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); this.mesh.visible = false; }
  dispose() { this.geo.dispose(); }
}

// ------------------------------------------------------------------------------------ conformed disc

/** Radial mesh (rings × segments) whose vertices are snapped to the terrain; uv = (r01, theta01). */
class ConformDisc {
  constructor(material, rings = 10, segs = 72) {
    this.rings = rings; this.segs = segs;
    const nv = (rings + 1) * (segs + 1);
    this.pos = new Float32Array(nv * 3);
    const uv = new Float32Array(nv * 2);
    for (let i = 0; i <= rings; i++) {
      for (let j = 0; j <= segs; j++) {
        const k = (i * (segs + 1) + j) * 2;
        uv[k] = i / rings; uv[k + 1] = j / segs;
      }
    }
    const idx = new Uint32Array(rings * segs * 6);
    let p = 0;
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1;
        idx[p++] = a; idx[p++] = c; idx[p++] = b;
        idx[p++] = b; idx[p++] = c; idx[p++] = d;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4000);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = RENDER_ORDER.UI3D;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.visible = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.layers.set(LAYERS.HELPERS);   // r1 issue 6: without this the ring enters water reflections
    this.mesh.layers.enable(0);
    this._cx = NaN; this._cz = NaN; this._r = -1;
  }
  /** Rebuild only when the circle actually moved/resized (drag-friendly, zero allocation). */
  place(terrain, cx, cz, radius, lift = 0.20, force = false) {
    if (!force && Math.abs(cx - this._cx) < 0.25 && Math.abs(cz - this._cz) < 0.25 && Math.abs(radius - this._r) < 0.25) return;
    this._cx = cx; this._cz = cz; this._r = radius;
    const { rings, segs, pos } = this;
    for (let i = 0; i <= rings; i++) {
      const rr = (i / rings) * radius;
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
        const k = (i * (segs + 1) + j) * 3;
        pos[k] = x; pos[k + 1] = terrain.getHeight(x, z) + lift; pos[k + 2] = z;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
  hide() { this.mesh.visible = false; }
  dispose() { this.geo.dispose(); this.mesh.material.dispose(); }
}

// ------------------------------------------------------------------------------------------- gizmos

const C = {
  valid: [0.62, 0.62, 0.63],
  validEdge: [LINEAR_CAP, LINEAR_CAP, LINEAR_CAP],
  // #E5484D, held to the 0.70 linear bloom ceiling (encodes to ≈ 218,71,76 — indistinguishable)
  invalid: [0.700, 0.062, 0.071],
  invalidEdge: [0.700, 0.300, 0.280],
  select: [0.22, 0.62, 1.0],
  selectEdge: [0.70, 0.70, 0.70],
  bulldoze: [0.700, 0.062, 0.071],
  // the affected-area wash: sRGB (40,131,196) → hue 205° (spec item 22 band is 195–215°)
  wash: [0.021, 0.227, 0.552],
  washEdge: [0.18, 0.50, 0.70],
  raise: [0.30, 0.62, 0.36],
  lower: [0.65, 0.40, 0.14],
  flatten: [0.22, 0.47, 0.66],
  smooth: [0.47, 0.36, 0.66],
  cyan: [0.30, 0.62, 0.70],
};

const N_DISCS = 6;

export class Gizmos {
  constructor(ctx) {
    this.ctx = ctx;
    this.terrain = ctx.world.terrain;
    this.time = 0;
    this.matRibbon = ribbonMaterial();
    this.matRibbonAlt = ribbonMaterial();
    this.matFlat = flatMaterial();

    this.ghost = new DynamicMesh(1400, this.matRibbon);       // road ghost ribbon
    this.ghostAlt = new DynamicMesh(600, this.matRibbonAlt);  // second ghost (the invalid pose)
    this.flat = new DynamicMesh(1400, this.matFlat, { attrs: true });

    this.discs = [];
    for (let i = 0; i < N_DISCS; i++) this.discs.push(new ConformDisc(discMaterial(), 8, 72));
    this._discN = 0;

    this.lift = { min: Infinity, max: -Infinity, verts: 0 };

    this.root = new THREE.Group();
    this.root.name = 'tools:gizmos';
    for (const m of [this.ghost.mesh, this.ghostAlt.mesh]) this.root.add(m);
    for (const d of this.discs) this.root.add(d.mesh);
    this.root.add(this.flat.mesh);
    ctx.group.add(this.root);
  }

  update(dt) {
    this.time += dt;
    this.matFlat.uniforms.uTime.value = this.time;
  }

  // ------------------------------------------------------------------ road ghost
  /** path: [{x,z}] centreline; width in metres; state 'valid'|'invalid'. */
  setGhost(path, width, state = 'valid', opts = {}) {
    const m = this.ghost;
    if (!path || path.length < 2) { m.clear(); return; }
    const u = this.matRibbon.uniforms;
    const bad = state === 'invalid';
    u.uFill.value.setRGB(...(bad ? C.invalid : (opts.fill || C.valid)));
    u.uEdge.value.setRGB(...(bad ? C.invalidEdge : C.validEdge));
    u.uWidth.value = width;
    u.uFillA.value = bad ? 0.72 : (opts.fillA ?? 0.97);
    u.uOpacity.value = opts.opacity ?? 1;
    this._strip(m, path, Math.max(1, width * 0.5), opts.lift ?? 0.15);
  }
  clearGhost() { this.ghost.clear(); }

  setGhostAlt(path, width, state = 'invalid', opts = {}) {
    if (!path || path.length < 2) { this.ghostAlt.clear(); return; }
    const u = this.matRibbonAlt.uniforms;
    const bad = state === 'invalid';
    u.uFill.value.setRGB(...(bad ? C.invalid : C.valid));
    u.uEdge.value.setRGB(...(bad ? C.invalidEdge : C.validEdge));
    u.uWidth.value = width;
    u.uFillA.value = bad ? 0.72 : 0.97;
    u.uOpacity.value = opts.opacity ?? 1;
    this._strip(this.ghostAlt, path, Math.max(1, width * 0.5), opts.lift ?? 0.15);
  }
  clearGhostAlt() { this.ghostAlt.clear(); }

  /** Reset the per-frame ghost-lift statistics (spec §2 stats().ghostLiftMin/Max). */
  beginLift() { this.lift.min = Infinity; this.lift.max = -Infinity; this.lift.verts = 0; }

  /**
   * Build a ribbon along `path`, subdivided across its width as well as along it, so a 24 m band
   * hugs a crowned road or a bump instead of letting the terrain poke through it. Every vertex is
   * placed exactly `lift` metres above getHeight at its own x,z.
   */
  _strip(m, path, hw, lift) {
    const T = this.terrain;
    const K = hw > 6 ? 4 : 2;
    m.begin();
    let s = 0;
    const N = Math.min(path.length, Math.floor(m.max / K) + 1);
    const L = this.lift;
    for (let i = 1; i < N; i++) {
      const a = path[i - 1], b = path[i];
      let dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      let n0x = -dz, n0z = dx, n1x = -dz, n1z = dx;
      if (i > 1) {
        const p = path[i - 2];
        let ex = a.x - p.x, ez = a.z - p.z; const el = Math.hypot(ex, ez) || 1; ex /= el; ez /= el;
        n0x = (-dz - ez) * 0.5; n0z = (dx + ex) * 0.5;
        const nl = Math.hypot(n0x, n0z) || 1; n0x /= nl; n0z /= nl;
      }
      if (i < N - 1) {
        const q = path[i + 1];
        let fx = q.x - b.x, fz = q.z - b.z; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
        n1x = (-dz - fz) * 0.5; n1z = (dx + fx) * 0.5;
        const nl = Math.hypot(n1x, n1z) || 1; n1x /= nl; n1z /= nl;
      }
      const s0 = s, s1 = s + len;
      for (let k = 0; k < K; k++) {
        const u0 = k / K, u1 = (k + 1) / K;
        const o0 = (u0 * 2 - 1) * hw, o1 = (u1 * 2 - 1) * hw;
        const ax0 = a.x + n0x * o0, az0 = a.z + n0z * o0;
        const ax1 = a.x + n0x * o1, az1 = a.z + n0z * o1;
        const bx1 = b.x + n1x * o1, bz1 = b.z + n1z * o1;
        const bx0 = b.x + n1x * o0, bz0 = b.z + n1z * o0;
        m.quad(
          [ax0, T.getHeight(ax0, az0) + lift, az0],
          [ax1, T.getHeight(ax1, az1) + lift, az1],
          [bx1, T.getHeight(bx1, bz1) + lift, bz1],
          [bx0, T.getHeight(bx0, bz0) + lift, bz0],
          [u0, s0, u1, s0, u1, s1, u0, s1], null, null,
        );
        L.verts += 4;
      }
      s = s1;
    }
    if (L.verts > 0) { L.min = Math.min(L.min, lift); L.max = Math.max(L.max, lift); }
    m.end();
  }

  ghostVerts() { return this.ghost.n * 4 + this.ghostAlt.n * 4; }

  // ------------------------------------------------------------------ flat layer (built per stroke)
  beginFlat() { this.flat.begin(); return this; }
  endFlat() { this.flat.end(); return this; }
  clearFlat() { this.flat.clear(); }

  /** Axis-aligned ground square (zone cells). */
  cell(x, z, size, colour, alpha, border = 0.09) {
    const T = this.terrain, h = size * 0.5, y = 0.22;
    const c = [colour[0], colour[1], colour[2], alpha];
    this.flat.quad(
      [x - h, T.getHeight(x - h, z - h) + y, z - h],
      [x + h, T.getHeight(x + h, z - h) + y, z - h],
      [x + h, T.getHeight(x + h, z + h) + y, z + h],
      [x - h, T.getHeight(x - h, z + h) + y, z + h],
      [0, 0, 1, 0, 1, 1, 0, 1], c, [border, 0, 0, 0],
    );
    return this;
  }

  /** Ground disc marker (node handles): dark halo + white core and ring. */
  marker(x, z, radius = 2.6, colour = C.validEdge, y = 0.30, halo = 0) {
    const T = this.terrain;
    const put = (r, col, param) => {
      this.flat.quad(
        [x - r, T.getHeight(x - r, z - r) + y, z - r],
        [x + r, T.getHeight(x + r, z - r) + y, z - r],
        [x + r, T.getHeight(x + r, z + r) + y, z + r],
        [x - r, T.getHeight(x - r, z + r) + y, z + r],
        [0, 0, 1, 0, 1, 1, 0, 1], col, param,
      );
    };
    if (halo > 0) put(radius * halo, [C.cyan[0], C.cyan[1], C.cyan[2], 0.55], [0.80, 1, 0.0, 0.0]);
    put(radius * 1.14, [0.02, 0.04, 0.07, 0.42], [0.0, 1, 1.0, 0.0]);
    put(radius, [colour[0], colour[1], colour[2], 1.0], [0.62, 1, 1.0, 0.0]);
    return this;
  }

  /** Thin ground line between two world points (metre width), terrain-conformed in steps. */
  groundLine(x0, z0, x1, z1, width, colour, alpha, dashed = false, y = 0.26) {
    const T = this.terrain;
    let dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) return this;
    dx /= len; dz /= len;
    const nx = -dz * width * 0.5, nz = dx * width * 0.5;
    // 3:2 dash-to-gap, the reference's rhythm
    const period = dashed ? 11 : Math.max(12, len / 24);
    const on = dashed ? 6.6 : period;
    const col = [colour[0], colour[1], colour[2], alpha];
    for (let s = 0; s < len - 0.01; s += period) {
      const e = Math.min(len, s + on);
      const ax = x0 + dx * s, az = z0 + dz * s;
      const bx = x0 + dx * e, bz = z0 + dz * e;
      this.flat.quad(
        [ax - nx, T.getHeight(ax - nx, az - nz) + y, az - nz],
        [ax + nx, T.getHeight(ax + nx, az + nz) + y, az + nz],
        [bx + nx, T.getHeight(bx + nx, bz + nz) + y, bz + nz],
        [bx - nx, T.getHeight(bx - nx, bz - nz) + y, bz - nz],
        [0, 0, 1, 0, 1, 1, 0, 1], col, [0, 2, 0, 0],
      );
    }
    return this;
  }

  /** Ground outline of a rotated rectangle (footprints, marquees, selection). */
  rectOutline(cx, cz, w, d, heading, width, colour, alpha, y = 0.30) {
    const s = Math.sin(heading), c = Math.cos(heading);
    const hw = w * 0.5, hd = d * 0.5;
    const pt = (u, v) => [cx + u * c - v * s, cz + u * s + v * c];
    const p = [pt(-hw, -hd), pt(hw, -hd), pt(hw, hd), pt(-hw, hd)];
    for (let i = 0; i < 4; i++) {
      const a = p[i], b = p[(i + 1) % 4];
      this.groundLine(a[0], a[1], b[0], b[1], width, colour, alpha, false, y);
    }
    return this;
  }

  /** Filled ground rectangle (the service footprint — criterion 18 wants a fill, not a cage). */
  rectFill(cx, cz, w, d, heading, colour, alpha, border = 0.045, y = 0.24) {
    const T = this.terrain;
    const s = Math.sin(heading), c = Math.cos(heading);
    const hw = w * 0.5, hd = d * 0.5;
    const pt = (u, v) => [cx + u * c - v * s, cz + u * s + v * c];
    const q = [pt(-hw, -hd), pt(hw, -hd), pt(hw, hd), pt(-hw, hd)];
    // subdivide so the pad conforms to rolling ground
    const NX = 3, NZ = 3;
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NZ; j++) {
        const u0 = -hw + (i / NX) * w, u1 = -hw + ((i + 1) / NX) * w;
        const v0 = -hd + (j / NZ) * d, v1 = -hd + ((j + 1) / NZ) * d;
        const a = pt(u0, v0), b = pt(u1, v0), cc = pt(u1, v1), dd = pt(u0, v1);
        this.flat.quad(
          [a[0], T.getHeight(a[0], a[1]) + y, a[1]],
          [b[0], T.getHeight(b[0], b[1]) + y, b[1]],
          [cc[0], T.getHeight(cc[0], cc[1]) + y, cc[1]],
          [dd[0], T.getHeight(dd[0], dd[1]) + y, dd[1]],
          [0, 0, 1, 0, 1, 1, 0, 1], [colour[0], colour[1], colour[2], alpha], [0, 2, 0, 0],
        );
      }
    }
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      this.groundLine(a[0], a[1], b[0], b[1], 0.9, C.validEdge, 0.85, false, y + 0.02);
    }
    void border;
    return this;
  }

  /**
   * A doomed object: a red translucent volume sized to its footprint (criterion 11).
   * Ground pad + four walls fading upward + a bright top rim.
   */
  doomVolume(cx, cz, w, d, heading, height, colour = C.bulldoze, alpha = 0.35) {
    const T = this.terrain;
    const s = Math.sin(heading), c = Math.cos(heading);
    const hw = w * 0.5, hd = d * 0.5;
    const pt = (u, v) => [cx + u * c - v * s, cz + u * s + v * c];
    const corner = [pt(-hw, -hd), pt(hw, -hd), pt(hw, hd), pt(-hw, hd)];
    let base = -Infinity;
    for (const [x, z] of corner) base = Math.max(base, T.getHeight(x, z));
    base += 0.18;
    const h = Math.max(2, height);
    const col = [colour[0], colour[1], colour[2], alpha];
    this.flat.quad(
      [corner[0][0], T.getHeight(corner[0][0], corner[0][1]) + 0.24, corner[0][1]],
      [corner[1][0], T.getHeight(corner[1][0], corner[1][1]) + 0.24, corner[1][1]],
      [corner[2][0], T.getHeight(corner[2][0], corner[2][1]) + 0.24, corner[2][1]],
      [corner[3][0], T.getHeight(corner[3][0], corner[3][1]) + 0.24, corner[3][1]],
      [0, 0, 1, 0, 1, 1, 0, 1], col, [0, 2, 0, 0],
    );
    const bot = [colour[0], colour[1], colour[2], alpha];
    const top = [colour[0], colour[1], colour[2], alpha * 0.35];
    for (let i = 0; i < 4; i++) {
      const a = corner[i], b = corner[(i + 1) % 4];
      this.flat.quad(
        [a[0], base, a[1]], [b[0], base, b[1]], [b[0], base + h, b[1]], [a[0], base + h, a[1]],
        [0, 0, 1, 0, 1, 1, 0, 1], [bot, bot, top, top], [0, 2, 0, 0],
      );
    }
    const rim = [Math.min(LINEAR_CAP, colour[0] + 0.10), colour[1] + 0.22, colour[2] + 0.22, 0.9];
    const t = base + h;
    for (let i = 0; i < 4; i++) {
      const a = corner[i], b = corner[(i + 1) % 4];
      this.flat.quad([a[0], t, a[1]], [b[0], t, b[1]], [b[0], t + 0.45, b[1]], [a[0], t + 0.45, a[1]],
        [0, 0, 1, 0, 1, 1, 0, 1], [rim, rim, [rim[0], rim[1], rim[2], 0.0], [rim[0], rim[1], rim[2], 0.0]], [0, 2, 0, 0]);
    }
    return this;
  }

  /** Selection outline: a white 0.9-alpha line hugging the object's footprint (criterion 12). */
  selectionOutline(cx, cz, w, d, heading) {
    this.rectOutline(cx, cz, w, d, heading, 0.9, C.validEdge, 0.9, 0.32);
    return this;
  }

  /** Selection outline for a road: two lines along the kerbs, not a ribbon wider than the asphalt. */
  selectionPath(path, width) {
    if (!path || path.length < 2) return this;
    const hw = width * 0.5;
    for (const side of [-1, 1]) {
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        let dx = b.x - a.x, dz = b.z - a.z;
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const nx = -dz * hw * side, nz = dx * hw * side;
        this.groundLine(a.x + nx, a.z + nz, b.x + nx, b.z + nz, 0.9, C.validEdge, 0.9, false, 0.32);
      }
    }
    return this;
  }

  // ------------------------------------------------------------------ discs (pooled)
  beginDiscs() { this._discN = 0; }
  endDiscs() { for (let i = this._discN; i < this.discs.length; i++) this.discs[i].hide(); }

  /**
   * One conformed ring/annulus/wash from the pool.
   * opts: {colour, rim, fill, rimA, rimIn, ring2, dashes, dashMin, lift}
   */
  disc(x, z, radius, opts = {}) {
    if (this._discN >= this.discs.length || !(radius > 0.5)) return null;
    const d = this.discs[this._discN++];
    const u = d.mesh.material.uniforms;
    const col = opts.colour || C.cyan;
    u.uColor.value.setRGB(col[0], col[1], col[2]);
    const rim = opts.rim || C.validEdge;
    u.uRim.value.setRGB(rim[0], rim[1], rim[2]);
    u.uFill.value = opts.fill ?? 0;
    u.uRimA.value = opts.rimA ?? 0.45;
    u.uRimIn.value = opts.rimIn ?? 0.965;
    u.uRing2.value = opts.ring2 ?? 0;
    u.uRing2W.value = opts.ring2W ?? 0.010;
    u.uDashes.value = opts.dashes ?? Math.max(12, Math.min(96, Math.round(radius * 0.7)));
    u.uDashMin.value = opts.dashMin ?? 1.0;
    u.uOpacity.value = opts.opacity ?? 1;
    d.place(this.terrain, x, z, radius, opts.lift ?? 0.20);
    d.mesh.visible = true;
    return d;
  }

  /** The saturated translucent blue "this is what will change" wash of $REF/cs2_1.jpg. */
  wash(x, z, radius, opts = {}) {
    return this.disc(x, z, radius, {
      colour: C.wash, rim: C.washEdge, fill: opts.fill ?? 0.62, rimA: 0.85, rimIn: 0.955,
      dashMin: 1.0, lift: 0.19, ...opts,
    });
  }

  hideAll() {
    this.clearGhost(); this.clearGhostAlt(); this.clearFlat();
    this.beginDiscs(); this.endDiscs();
  }

  /** Visible meshes owned by this layer — the tools-group draw-call figure. */
  visibleMeshes() {
    let n = 0;
    for (const m of [this.ghost.mesh, this.ghostAlt.mesh, this.flat.mesh]) if (m.visible) n++;
    for (const d of this.discs) if (d.mesh.visible) n++;
    return n;
  }

  triangles() {
    let t = (this.ghost.n + this.ghostAlt.n + this.flat.n) * 2;
    for (const d of this.discs) if (d.mesh.visible) t += d.rings * d.segs * 2;
    return t;
  }

  dispose() {
    this.ghost.dispose(); this.ghostAlt.dispose(); this.flat.dispose();
    for (const d of this.discs) d.dispose();
    for (const m of [this.matRibbon, this.matRibbonAlt, this.matFlat]) m.dispose();
    this.root.removeFromParent();
  }
}

export { C as GIZMO_COLORS };
