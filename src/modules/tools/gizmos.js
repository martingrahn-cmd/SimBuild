// 3D gizmo layer for the tools module: ghost road ribbons, node markers, brush discs, coverage
// circles, zone-cell previews, footprint ghosts and selection highlights.
//
// Everything is drawn from three preallocated dynamic meshes (one per material family), so the whole
// tool overlay costs at most 8 draw calls and never allocates per frame:
//   ribbon  — road ghosts and the road-selection highlight (metric width shading, arrows, rim light)
//   flat    — cells, markers, rects, brackets, perimeter walls (vertex colour + per-vertex shape param)
//   disc    — brush and coverage circles (terrain-conformed radial mesh, dashed rim, world grid)
import * as THREE from 'three';
import { RENDER_ORDER, LAYERS } from '../../core/constants.js';

const COMMON_DEFS = '';

// ---------------------------------------------------------------------------------------- materials

function ribbonMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uFill: { value: new THREE.Color(0.72, 0.86, 1.0) },
      uEdge: { value: new THREE.Color(1.0, 1.0, 1.0) },
      uFillA: { value: 0.16 },
      uOpacity: { value: 1.0 },
      uWidth: { value: 16 },
      uTime: { value: 0 },
      uArrows: { value: 1 },
      uCentre: { value: 1 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: COMMON_DEFS + /* glsl */`
      varying vec2 vUv;
      uniform vec3 uFill, uEdge;
      uniform float uFillA, uOpacity, uWidth, uTime, uArrows, uCentre;
      void main() {
        float hw = max(uWidth * 0.5, 0.5);
        float ax = abs(vUv.x - 0.5) * 2.0;
        float dEdge = (1.0 - ax) * hw;                    // metres in from the rim
        float aa = fwidth(dEdge) + 1e-4;                  // metres per pixel across the ribbon
        float rw = max(0.34, aa * 1.7);                   // keep the rim ~2 px wide at any zoom
        float rim = 1.0 - smoothstep(rw, rw + aa, dEdge);
        float cx = ax * hw;                               // metres from the centreline
        float sAA = fwidth(cx) + 1e-4;
        float cw = max(0.22, sAA * 1.1);
        float dashPhase = fract(vUv.y * 0.1667 + 0.25);
        float centre = uCentre * (1.0 - smoothstep(cw, cw + sAA, cx)) * step(0.42, dashPhase);
        float s = mod(vUv.y - uTime * 5.0, 26.0);
        float shaft = step(s, 4.0) * step(cx, 0.45);
        float head = step(4.0, s) * step(s, 6.8) * step(cx, max(0.0, 6.8 - s) * 0.62 + 0.18);
        float arrow = uArrows * clamp(head + shaft, 0.0, 1.0);
        float bright = clamp(max(rim, max(centre, arrow)), 0.0, 1.0);
        // a touch more presence toward the rim so the band reads as a solid ribbon, not two lines
        float body = uFillA * (0.86 + 0.30 * ax * ax);
        float a = (body + rim * 0.92 + centre * 0.55 + arrow * 0.45) * uOpacity;
        vec3 col = mix(uFill, uEdge, bright);
        if (a <= 0.002) discard;
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -12,
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
    fragmentShader: COMMON_DEFS + /* glsl */`
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
          a = mix(a, max(a, 0.85), border);
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
        if (a <= 0.003) discard;
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -16,
    toneMapped: false,
  });
}

function discMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0.4, 0.85, 1.0) },
      uRim: { value: new THREE.Color(1, 1, 1) },
      uFill: { value: 0.16 },
      uGridA: { value: 0.0 },
      uGrid: { value: 8.0 },
      uDashes: { value: 32.0 },
      uRimIn: { value: 0.94 },
      uRimA: { value: 0.95 },
      uDashMin: { value: 0.34 },
      uTime: { value: 0 },
      uOpacity: { value: 1.0 },
      uSpokes: { value: 0.0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: COMMON_DEFS + /* glsl */`
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform vec3 uColor, uRim;
      uniform float uFill, uGridA, uGrid, uDashes, uRimIn, uRimA, uDashMin, uTime, uOpacity, uSpokes;
      void main() {
        float r = vUv.x;
        float th = vUv.y;
        float aa = fwidth(r) + 1e-5;
        float fill = pow(max(0.0, 1.0 - r), 0.85) * uFill;
        float rw = max(1.0 - uRimIn, aa * 1.8);           // rim stays ~2 px wide at any zoom
        float rim = smoothstep(1.0 - rw - aa, 1.0 - rw + aa * 0.3, r) * (1.0 - smoothstep(1.0 - aa * 1.2, 1.0, r));
        float dash = mix(uDashMin, 1.0, step(0.46, fract(th * uDashes + uTime * 0.05)));
        vec2 g = vWorld.xz / uGrid;
        vec2 gd = abs(fract(g) - 0.5) / max(fwidth(g), vec2(1e-4));
        float grid = (1.0 - min(min(gd.x, gd.y), 1.0)) * uGridA * (0.35 + 0.65 * (1.0 - r));
        float spoke = 0.0;
        if (uSpokes > 0.5) {
          float sp = abs(fract(th * 12.0) - 0.5) * 2.0;
          spoke = (1.0 - smoothstep(0.90, 1.0, sp)) * 0.0 + smoothstep(0.965, 1.0, sp) * 0.12 * smoothstep(0.25, 1.0, r);
        }
        float a = (fill + grid + rim * dash * uRimA + spoke) * uOpacity;
        vec3 col = mix(uColor, uRim, clamp(rim * 1.2, 0.0, 1.0));
        if (a <= 0.003) discard;
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -7,
    polygonOffsetUnits: -14,
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
  /** One quad, corners in order; uv are per-corner [u,v]; colour/param apply to all four. */
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
  constructor(material, rings = 12, segs = 64) {
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
    this.mesh.castShadow = this.mesh.receiveShadow = false;
    this._cx = NaN; this._cz = NaN; this._r = -1;
  }
  /** Rebuild only when the circle actually moved/resized (drag-friendly). */
  place(terrain, cx, cz, radius, lift = 0.22, force = false) {
    if (!force && Math.abs(cx - this._cx) < 0.35 && Math.abs(cz - this._cz) < 0.35 && Math.abs(radius - this._r) < 0.35) return;
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
    this.mesh.material.uniforms.uDashes.value = Math.max(10, Math.min(96, Math.round(radius * 0.55)));
  }
  hide() { this.mesh.visible = false; this._r = -1; }
  dispose() { this.geo.dispose(); }
}

// ------------------------------------------------------------------------------------------- gizmos

const C = {
  valid: [0.70, 0.86, 1.0],
  validEdge: [1.0, 1.0, 1.0],
  invalid: [1.0, 0.30, 0.24],
  invalidEdge: [1.0, 0.68, 0.62],
  select: [0.22, 0.62, 1.0],
  selectEdge: [0.78, 0.92, 1.0],
  bulldoze: [1.0, 0.26, 0.20],
  raise: [0.45, 0.95, 0.55],
  lower: [1.0, 0.62, 0.22],
  flatten: [0.35, 0.72, 1.0],
  smooth: [0.72, 0.55, 1.0],
};

export class Gizmos {
  constructor(ctx) {
    this.ctx = ctx;
    this.terrain = ctx.world.terrain;
    this.time = 0;
    this.matRibbon = ribbonMaterial();
    this.matRibbonSel = ribbonMaterial();
    this.matFlat = flatMaterial();
    this.matDisc = discMaterial();
    this.matCover = discMaterial();

    this.matRibbonAlt = ribbonMaterial();
    this.ghost = new DynamicMesh(1100, this.matRibbon);          // road ghost ribbon
    this.ghostAlt = new DynamicMesh(400, this.matRibbonAlt);    // second ghost (showcase: rejected segment)
    this.selRibbon = new DynamicMesh(700, this.matRibbonSel);   // selected road segment
    this.flat = new DynamicMesh(900, this.matFlat, { attrs: true });
    this.brush = new ConformDisc(this.matDisc, 10, 72);
    this.coverage = new ConformDisc(this.matCover, 8, 96);

    this.matRibbonSel.uniforms.uFill.value.setRGB(0.30, 0.70, 1.0);
    this.matRibbonSel.uniforms.uEdge.value.setRGB(C.selectEdge[0], C.selectEdge[1], C.selectEdge[2]);
    this.matRibbonSel.uniforms.uFillA.value = 0.30;
    this.matRibbonSel.uniforms.uArrows.value = 0;
    this.matCover.uniforms.uFill.value = 0.13;
    this.matCover.uniforms.uRimIn.value = 0.975;
    this.matCover.uniforms.uRimA.value = 0.85;
    this.matCover.uniforms.uDashMin.value = 0.7;
    this.matCover.uniforms.uSpokes.value = 1;

    this.root = new THREE.Group();
    this.root.name = 'tools:gizmos';
    for (const m of [this.ghost.mesh, this.ghostAlt.mesh, this.selRibbon.mesh, this.coverage.mesh, this.brush.mesh, this.flat.mesh]) this.root.add(m);
    ctx.group.add(this.root);
    this._tmp = { a: [0, 0, 0], b: [0, 0, 0], c: [0, 0, 0], d: [0, 0, 0] };
  }

  update(dt) {
    this.time += dt;
    this.matRibbon.uniforms.uTime.value = this.time;
    this.matRibbonAlt.uniforms.uTime.value = this.time;
    this.matRibbonSel.uniforms.uTime.value = this.time;
    this.matFlat.uniforms.uTime.value = this.time;
    this.matDisc.uniforms.uTime.value = this.time;
    this.matCover.uniforms.uTime.value = this.time;
  }

  // ------------------------------------------------------------------ road ghost
  /**
   * path: [{x,z}] centreline; width in metres; state 'valid'|'invalid'.
   * Rows are conformed to the terrain so the ribbon hugs hills like the road will.
   */
  setGhost(path, width, state = 'valid', opts = {}) {
    const m = this.ghost;
    if (!path || path.length < 2) { m.clear(); return; }
    const T = this.terrain;
    const lift = opts.lift ?? 0.24;
    const hw = Math.max(1, width * 0.5);
    const u = this.matRibbon.uniforms;
    const bad = state === 'invalid';
    u.uFill.value.setRGB(...(bad ? C.invalid : (opts.fill || C.valid)));
    u.uEdge.value.setRGB(...(bad ? C.invalidEdge : C.validEdge));
    u.uWidth.value = width;
    u.uFillA.value = bad ? 0.34 : (opts.fillA ?? 0.36);
    u.uArrows.value = width >= 11 && !opts.noArrows ? 1 : 0;
    u.uCentre.value = opts.noCentre ? 0 : 1;
    u.uOpacity.value = opts.opacity ?? 1;
    this._strip(m, path, hw, lift);
  }
  clearGhost() { this.ghost.clear(); }

  /** Second ghost slot — the showcase uses it to hold a rejected segment next to a valid one. */
  setGhostAlt(path, width, state = 'invalid') {
    if (!path || path.length < 2) { this.ghostAlt.clear(); return; }
    const u = this.matRibbonAlt.uniforms;
    const bad = state === 'invalid';
    u.uFill.value.setRGB(...(bad ? C.invalid : C.valid));
    u.uEdge.value.setRGB(...(bad ? C.invalidEdge : C.validEdge));
    u.uWidth.value = width;
    u.uFillA.value = bad ? 0.34 : 0.36;
    u.uArrows.value = 0;
    u.uCentre.value = 1;
    this._strip(this.ghostAlt, path, Math.max(1, width * 0.5), 0.24);
  }
  clearGhostAlt() { this.ghostAlt.clear(); }

  setSelectionRibbon(path, width) {
    const m = this.selRibbon;
    if (!path || path.length < 2) { m.clear(); return; }
    this.matRibbonSel.uniforms.uWidth.value = width;
    this._strip(m, path, Math.max(1, width * 0.5), 0.30);
  }
  clearSelectionRibbon() { this.selRibbon.clear(); }

  /**
   * Build a ribbon along `path`. The strip is subdivided ACROSS its width as well as along it, so a
   * 24 m band still hugs a crowned road or a bump instead of letting the terrain poke through it.
   */
  _strip(m, path, hw, lift, across = 0) {
    const T = this.terrain;
    const K = across || (hw > 6 ? 4 : 2);
    m.begin();
    let s = 0;
    const N = Math.min(path.length, Math.floor(m.max / K) + 1);
    for (let i = 1; i < N; i++) {
      const a = path[i - 1], b = path[i];
      let dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      // shared normal with the neighbours for a mitre-free but smooth look
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
      }
      s = s1;
    }
    m.end();
  }

  // ------------------------------------------------------------------ flat layer (built per stroke)
  beginFlat() { this.flat.begin(); return this; }
  endFlat() { this.flat.end(); return this; }
  clearFlat() { this.flat.clear(); }

  /** Axis-aligned ground square (used for zone cells). */
  cell(x, z, size, colour, alpha, border = 0.09) {
    const T = this.terrain, h = size * 0.5, y = 0.26;
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
  marker(x, z, radius = 2.6, colour = [1, 1, 1], y = 0.34) {
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
    put(radius * 1.16, [0.03, 0.06, 0.10, 0.34], [0.0, 1, 1.0, 0.0]);   // slim dark outline
    put(radius, [colour[0], colour[1], colour[2], 1.0], [0.60, 1, 0.56, 0.5]);
    return this;
  }

  /** Free quad in the flat layer (shape 2 = plain fill, per-corner colours allowed). */
  poly(p0, p1, p2, p3, colour, param = [0, 2, 0, 0]) {
    this.flat.quad(p0, p1, p2, p3, [0, 0, 1, 0, 1, 1, 0, 1], colour, param);
    return this;
  }

  /** Thin ground line between two world points (metre width), terrain-conformed in steps. */
  groundLine(x0, z0, x1, z1, width, colour, alpha, dashed = false, y = 0.28) {
    const T = this.terrain;
    let dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) return this;
    dx /= len; dz /= len;
    const nx = -dz * width * 0.5, nz = dx * width * 0.5;
    const step = dashed ? 9 : Math.max(12, len / 24);
    const on = dashed ? 5.4 : step;
    const col = [colour[0], colour[1], colour[2], alpha];
    for (let s = 0; s < len - 0.01; s += step) {
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

  /** Ground outline of a rotated rectangle (footprints, marquees). */
  rectOutline(cx, cz, w, d, heading, width, colour, alpha) {
    const s = Math.sin(heading), c = Math.cos(heading);
    const hw = w * 0.5, hd = d * 0.5;
    const pt = (u, v) => [cx + u * c - v * s, cz + u * s + v * c];
    const p = [pt(-hw, -hd), pt(hw, -hd), pt(hw, hd), pt(-hw, hd)];
    for (let i = 0; i < 4; i++) {
      const a = p[i], b = p[(i + 1) % 4];
      this.groundLine(a[0], a[1], b[0], b[1], width, colour, alpha, false, 0.3);
    }
    return this;
  }

  /** Translucent footprint volume: a filled ground pad + four fading perimeter walls + a top rim. */
  footprint(cx, cz, w, d, heading, height, colour, alpha = 0.20) {
    const T = this.terrain;
    const s = Math.sin(heading), c = Math.cos(heading);
    const hw = w * 0.5, hd = d * 0.5;
    const pt = (u, v) => { const x = cx + u * c - v * s, z = cz + u * s + v * c; return [x, z]; };
    const corner = [pt(-hw, -hd), pt(hw, -hd), pt(hw, hd), pt(-hw, hd)];
    let base = -Infinity;
    for (const [x, z] of corner) base = Math.max(base, T.getHeight(x, z));
    base += 0.15;
    const col = [colour[0], colour[1], colour[2], alpha];
    // ground pad
    this.flat.quad(
      [corner[0][0], T.getHeight(corner[0][0], corner[0][1]) + 0.24, corner[0][1]],
      [corner[1][0], T.getHeight(corner[1][0], corner[1][1]) + 0.24, corner[1][1]],
      [corner[2][0], T.getHeight(corner[2][0], corner[2][1]) + 0.24, corner[2][1]],
      [corner[3][0], T.getHeight(corner[3][0], corner[3][1]) + 0.24, corner[3][1]],
      [0, 0, 1, 0, 1, 1, 0, 1], col, [0.035, 0, 0, 0],
    );
    // walls, alpha fading upward
    const top = [colour[0], colour[1], colour[2], 0.0];
    const bot = [colour[0], colour[1], colour[2], Math.min(0.5, alpha * 2.1)];
    for (let i = 0; i < 4; i++) {
      const a = corner[i], b = corner[(i + 1) % 4];
      this.flat.quad(
        [a[0], base, a[1]], [b[0], base, b[1]], [b[0], base + height, b[1]], [a[0], base + height, a[1]],
        [0, 0, 1, 0, 1, 1, 0, 1], [bot, bot, top, top], [0, 2, 0, 0],
      );
    }
    // bright top rim
    const rim = [Math.min(1, colour[0] + 0.35), Math.min(1, colour[1] + 0.35), Math.min(1, colour[2] + 0.35), 0.85];
    const t = base + height;
    for (let i = 0; i < 4; i++) {
      const a = corner[i], b = corner[(i + 1) % 4];
      this.flat.quad([a[0], t, a[1]], [b[0], t, b[1]], [b[0], t + 0.5, b[1]], [a[0], t + 0.5, a[1]],
        [0, 0, 1, 0, 1, 1, 0, 1], [rim, rim, [rim[0], rim[1], rim[2], 0.0], [rim[0], rim[1], rim[2], 0.0]], [0, 2, 0, 0]);
    }
    // corner posts
    for (const [x, z] of corner) {
      const y0 = T.getHeight(x, z) + 0.1;
      const r = 0.4;
      this.flat.quad([x - r, y0, z], [x + r, y0, z], [x + r, t + 1.2, z], [x - r, t + 1.2, z],
        [0, 0, 1, 0, 1, 1, 0, 1], [rim, rim, [rim[0], rim[1], rim[2], 0.05], [rim[0], rim[1], rim[2], 0.05]], [0, 2, 0, 0]);
      this.flat.quad([x, y0, z - r], [x, y0, z + r], [x, t + 1.2, z + r], [x, t + 1.2, z - r],
        [0, 0, 1, 0, 1, 1, 0, 1], [rim, rim, [rim[0], rim[1], rim[2], 0.05], [rim[0], rim[1], rim[2], 0.05]], [0, 2, 0, 0]);
    }
    return this;
  }

  /** Selection cage: ground outline + fading walls + corner brackets, sized to an object AABB. */
  selectionCage(cx, cz, w, d, heading, height, colour = C.selectEdge) {
    const T = this.terrain;
    const s = Math.sin(heading), c = Math.cos(heading);
    const hw = w * 0.5, hd = d * 0.5;
    const pt = (u, v) => [cx + u * c - v * s, cz + u * s + v * c];
    const corner = [pt(-hw, -hd), pt(hw, -hd), pt(hw, hd), pt(-hw, hd)];
    let base = Infinity;
    for (const [x, z] of corner) base = Math.min(base, T.getHeight(x, z));
    base += 0.16;
    const h = Math.max(2, height);
    const bot = [colour[0], colour[1], colour[2], 0.26];
    const top = [colour[0], colour[1], colour[2], 0.0];
    for (let i = 0; i < 4; i++) {
      const a = corner[i], b = corner[(i + 1) % 4];
      this.flat.quad([a[0], base, a[1]], [b[0], base, b[1]], [b[0], base + h, b[1]], [a[0], base + h, a[1]],
        [0, 0, 1, 0, 1, 1, 0, 1], [bot, bot, top, top], [0, 2, 0, 0]);
    }
    // L brackets on the ground at each corner
    const arm = Math.min(6, Math.min(w, d) * 0.3);
    const lw = 0.55;
    const bright = [colour[0], colour[1], colour[2], 0.95];
    for (let i = 0; i < 4; i++) {
      const a = corner[i];
      const prev = corner[(i + 3) % 4], next = corner[(i + 1) % 4];
      for (const o of [next, prev]) {
        let dx = o[0] - a[0], dz = o[1] - a[1];
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        this.groundLine(a[0] - dx * lw * 0.5, a[1] - dz * lw * 0.5, a[0] + dx * arm, a[1] + dz * arm, lw, colour, bright[3], false, 0.34);
      }
    }
    return this;
  }

  // ------------------------------------------------------------------ discs
  showBrush(x, z, radius, kind = 'flatten', opts = {}) {
    const u = this.matDisc.uniforms;
    const col = C[kind] || C.flatten;
    u.uColor.value.setRGB(col[0], col[1], col[2]);
    u.uRim.value.setRGB(Math.min(1, col[0] + 0.4), Math.min(1, col[1] + 0.4), Math.min(1, col[2] + 0.4));
    u.uFill.value = opts.fill ?? 0.15;
    u.uGridA.value = opts.grid ?? 0;
    u.uGrid.value = opts.gridSize ?? 8;
    u.uRimIn.value = opts.rimIn ?? 0.93;
    u.uOpacity.value = opts.opacity ?? 1;
    this.brush.place(this.terrain, x, z, radius, 0.25);
    this.brush.mesh.visible = true;
  }
  hideBrush() { this.brush.hide(); }

  showCoverage(x, z, radius, colour = [0.35, 0.85, 1.0]) {
    if (!(radius > 1)) { this.coverage.hide(); return; }
    const u = this.matCover.uniforms;
    u.uColor.value.setRGB(colour[0], colour[1], colour[2]);
    u.uRim.value.setRGB(Math.min(1, colour[0] + 0.45), Math.min(1, colour[1] + 0.35), Math.min(1, colour[2] + 0.2));
    this.coverage.place(this.terrain, x, z, radius, 0.30);
    this.coverage.mesh.visible = true;
  }
  hideCoverage() { this.coverage.hide(); }

  hideAll() {
    this.clearGhost(); this.clearGhostAlt(); this.clearSelectionRibbon(); this.clearFlat(); this.hideBrush(); this.hideCoverage();
  }

  dispose() {
    this.ghost.dispose(); this.ghostAlt.dispose(); this.selRibbon.dispose(); this.flat.dispose();
    this.brush.dispose(); this.coverage.dispose();
    for (const m of [this.matRibbon, this.matRibbonAlt, this.matRibbonSel, this.matFlat, this.matDisc, this.matCover]) m.dispose();
    this.root.removeFromParent();
  }
}

export { C as GIZMO_COLORS };
