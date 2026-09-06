// CS2-style zoning overlay: one merged terrain-conforming mesh per zone type plus one for the empty
// zonable band. Five draw calls, no per-frame allocation.
//
// The three things that make this read as CS2 rather than as coloured paper (zoning.md §3):
//   * the fill is a translucent tint at alpha 0.52, so the ground's own value survives under it;
//   * the 8 m cell lattice, the lot lines and the region outline are all *screen-space* widths, so a
//     line is 1-2.5 px at 60 m and still 1 px at 660 m instead of a 3 m stripe and a shimmer;
//   * the colour is authored in display space and driven by weather.night, so the overlay is a lit
//     HUD layer over a dark city at 22:00 instead of the brightest thing in the frame.
//
// Geometry is clipped against RoadField, not against the 8 m cell lattice, so the road-facing edge is
// parallel to the kerb with a constant setback (items 7, 8) even though the cell data stays
// world-aligned.
import * as THREE from 'three';
import { RENDER_ORDER } from '../../core/constants.js';
import { hash2 } from '../../core/rng.js';
import { ZONE_TYPES, zoneColors, preToneMapped, toneFix, OVERLAY } from './palette.js';

const MAX_PUSH = 5.6;   // m a cell corner may be cleared before the cell is dropped instead (half a cell diagonal)
const SUB = 2;   // 2x2 quads per 8 m cell: the nodes land exactly on terrain's own 4 m grid, so the
                 // overlay is the terrain surface, not an approximation of it (item 9).

const VERT = /* glsl */`
attribute vec4 aMask;
attribute vec4 aLotMask;
attribute vec2 aCell;
attribute float aDens;
attribute float aRnd;
attribute float aLot;
varying vec4 vMask;
varying vec4 vLotMask;
varying vec2 vCell;
varying float vDens;
varying float vRnd;
varying float vLot;
varying float vDepth;
varying vec3 vWPos;
#include <common>
#include <fog_pars_vertex>
void main() {
  vMask = aMask; vLotMask = aLotMask; vCell = aCell; vDens = aDens; vRnd = aRnd; vLot = aLot;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  vDepth = -mvPosition.z;
  #include <fog_vertex>
  gl_Position = projectionMatrix * mvPosition;
}`;

const FRAG = /* glsl */`
uniform vec3 uLow, uHigh, uLowFix, uHighFix, uLowLin, uHighLin;
uniform float uTime, uFill, uOpacity, uNight, uNightA, uExposure;
uniform float uLineW, uEdgeW, uEdgeGlow, uEdgeA, uLotW, uLineLift, uLotLift;
uniform float uHatch, uHatchP, uHatchW, uHatchDark;
uniform float uPulseAmp, uPulseHz, uAtmo, uFogRelief;
varying vec4 vMask;
varying vec4 vLotMask;
varying vec2 vCell;
varying float vDens;
varying float vRnd;
varying float vLot;
varying float vDepth;
varying vec3 vWPos;
#include <common>
#include <fog_pars_fragment>

float band(float px, float halfPx) { return 1.0 - smoothstep(halfPx - 0.6, halfPx + 0.6, px); }

void main() {
  // ---- class colour, authored in display space -----------------------------------------------
  // The pre value is chosen so AgX at this exposure returns the palette hex; the fix term restores
  // what AgX's Rec.2020 inset cannot reach. Dividing by the exposure first makes the overlay
  // exposure-invariant, so the night look comes from uNight and not from the environment's
  // brightening of the exposure curve after dark.
  // (An off-screen pass such as terrain's planar water reflection compiles this shader with the tone
  //  mapper switched off; there the plain linear colour is the right thing to encode.)
  vec3 pre = mix(uLow, uHigh, vDens);
  vec3 fix = mix(uLowFix, uHighFix, vDens);
  vec3 col;
#ifdef TONE_MAPPING
  gl_FragColor = vec4(pre / max(uExposure, 1e-4), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  col = clamp(gl_FragColor.rgb + fix, 0.0, 1.0);
#else
  gl_FragColor = vec4(mix(uLowLin, uHighLin, vDens), 1.0);
  #include <colorspace_fragment>
  col = gl_FragColor.rgb;
#endif

  // ---- screen-space metrics ------------------------------------------------------------------
  vec2 gc = vWPos.xz / 8.0;
  vec2 gw = fwidth(gc) + 1e-7;
  float mpp = 8.0 * max(gw.x, gw.y);          // metres per pixel on the ground here
  float ppc = 1.0 / max(gw.x, gw.y);          // pixels per 8 m cell

  // ---- 8 m cell lattice: a light line, width clamped to 1.0-2.5 px ----------------------------
  vec2 gd = abs(fract(gc) - 0.5);
  float gpx = min(gd.x / gw.x, gd.y / gw.y);
  float gHalf = clamp(0.5 * uLineW / mpp, 0.5, 1.25);
  float lat = band(gpx, gHalf) * smoothstep(3.0, 7.0, ppc);

  // ---- 45 deg hatch: high density only, 3 m world period --------------------------------------
  float hc = (vWPos.x - vWPos.z) * 0.70710678 / uHatchP;
  float hw = fwidth(hc) + 1e-7;
  float hpx = abs(fract(hc) - 0.5) / hw;
  float hHalf = clamp(0.5 * uHatchW / (uHatchP * hw), 0.55, 3.0);
  float hatch = vDens * uHatch * band(hpx, hHalf) * smoothstep(2.5, 5.0, 1.0 / hw);

  // ---- lot lines and the region outline, both clamped in screen space -------------------------
  vec2 luv = clamp((vWPos.xz - vCell) / 8.0, 0.0, 1.0);
  float rd = 8.0;
  if (vMask.x > 0.5) rd = min(rd, 1.0 - luv.x);
  if (vMask.y > 0.5) rd = min(rd, luv.x);
  if (vMask.z > 0.5) rd = min(rd, 1.0 - luv.y);
  if (vMask.w > 0.5) rd = min(rd, luv.y);
  float ld = 8.0;
  if (vLotMask.x > 0.5) ld = min(ld, 1.0 - luv.x);
  if (vLotMask.y > 0.5) ld = min(ld, luv.x);
  if (vLotMask.z > 0.5) ld = min(ld, 1.0 - luv.y);
  if (vLotMask.w > 0.5) ld = min(ld, luv.y);
  float eHalf = clamp(0.5 * uEdgeW / mpp, 0.75, 2.0);
  float edge = band(rd * 8.0 / mpp, eHalf);
  float glow = 1.0 - smoothstep(0.0, uEdgeGlow, rd * 8.0);
  float lotL = band(ld * 8.0 / mpp, clamp(0.5 * uLotW / mpp, 0.5, 1.4)) * smoothstep(3.0, 7.0, ppc);

  // ---- compose in display space ---------------------------------------------------------------
  float pulse = 1.0 + uPulseAmp * (0.5 + 0.5 * sin(uTime * uPulseHz * 6.2831853));
  col *= mix(1.0, uHatchDark, hatch);
  col *= 0.97 + 0.06 * vRnd;                             // faint per-cell variation
  col *= mix(0.95, 1.0, vLot);                           // block cores sit a shade back
  // Lattice and lot lines are a fixed step lighter, not a mix toward white: a proportional mix makes
  // the line contrast depend on how dark the class is, and on the dark classes it lands above the
  // 30/255 step that reads as per-pixel stipple rather than as a drawn grid (item 9).
  col = clamp(col + lat * uLineLift, 0.0, 1.0);
  col = clamp(col + lotL * uLotLift, 0.0, 1.0);
  col += glow * 0.075 * (1.0 - lat);
  vec3 oc = clamp(mix(col, vec3(1.0), 0.86) * pulse, 0.0, 1.0);
  col = mix(col, oc, edge);

  float a = uFill + lat * 0.05 + lotL * 0.04 + hatch * 0.03 - (1.0 - vLot) * 0.03;
  a = max(a, edge * uEdgeA);

  // ---- aerial perspective: distant blocks lose chroma with the terrain, no sticker pop ---------
  float atmo = clamp((vDepth - 260.0) / 700.0, 0.0, 1.0) * uAtmo;
  col = mix(col, vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), atmo * 0.9);
  a *= 1.0 - atmo * 0.30;

  col *= uNight;
  a *= uOpacity * uNightA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
  // The overlay shares the scene's fog (item 19) — but after dark the haze converges on the same
  // blue-grey as the ground, and a HUD layer that dissolves into it stops being readable. Give the
  // fog back part of the way at night; by day uFogRelief is 0 and the fog applies in full.
  vec3 envPreFog = gl_FragColor.rgb;
  #include <fog_fragment>
  gl_FragColor.rgb = mix(gl_FragColor.rgb, envPreFog, uFogRelief);
}`;

function cellMaterial(shared, colors, opts = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uLow: { value: null }, uHigh: { value: null }, uLowFix: { value: null }, uHighFix: { value: null },
        uLowLin: { value: null }, uHighLin: { value: null }, uExposure: { value: 1 },
        uTime: { value: 0 }, uOpacity: { value: 1 }, uNight: { value: 1 }, uNightA: { value: 1 },
        uFill: { value: opts.fill ?? OVERLAY.fill },
        uLineW: { value: opts.lineW ?? OVERLAY.lineWorld },
        uEdgeW: { value: OVERLAY.edgeWorld },
        uEdgeGlow: { value: OVERLAY.edgeGlow },
        uEdgeA: { value: opts.edgeA ?? OVERLAY.edgeAlpha },
        uLotW: { value: 0.75 },
        uLineLift: { value: opts.lineLift ?? 0.115 },
        uLotLift: { value: 0.085 },
        uHatch: { value: opts.hatch ?? 1 },
        uHatchP: { value: OVERLAY.hatchPeriod },
        uHatchW: { value: OVERLAY.hatchWidth },
        uHatchDark: { value: OVERLAY.hatchDark },
        uPulseAmp: { value: opts.pulse ?? OVERLAY.pulseAmp },
        uPulseHz: { value: OVERLAY.pulseHz },
        uAtmo: { value: OVERLAY.atmo },
        uFogRelief: { value: 0 },
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
  // UniformsUtils.merge clones, so re-point the shared animation uniforms: one write drives all
  m.uniforms.uTime = shared.uTime;
  m.uniforms.uOpacity = shared.uOpacity;
  m.uniforms.uNight = shared.uNight;
  m.uniforms.uNightA = shared.uNightA;
  m.uniforms.uLow.value = colors.low;
  m.uniforms.uHigh.value = colors.high;
  m.uniforms.uLowFix.value = colors.lowFix;
  m.uniforms.uHighFix.value = colors.highFix;
  m.uniforms.uLowLin.value = colors.lowLin;
  m.uniforms.uHighLin.value = colors.highLin;
  m.uniforms.uExposure = shared.uExposure;
  m.uniforms.uFogRelief = shared.uFogRelief;
  return m;
}

export class ZoneOverlay {
  constructor(ctx, grid) {
    this.ctx = ctx;
    this.grid = grid;
    this.world = ctx.world;
    this.group = new THREE.Group();
    this.group.name = 'zoning-overlay';
    ctx.group.add(this.group);
    this.shared = {
      uTime: { value: 0 }, uOpacity: { value: 1 }, uNight: { value: 1 }, uNightA: { value: 1 },
      uExposure: { value: 1 }, uFogRelief: { value: 0 },
    };
    this.colors = zoneColors();
    this.meshes = new Map();
    this.stats = { cells: 0, lots: 0, tris: 0, draws: 0, ms: 0 };
    this.materials = [];
    this._vcache = new Map();

    const emptyHex = 0xdbe6f7;
    const emptyLin = new THREE.Color().setHex(emptyHex, THREE.SRGBColorSpace);
    this.emptyMat = cellMaterial(this.shared, {
      low: preToneMapped(emptyHex), high: preToneMapped(emptyHex),
      lowFix: toneFix(emptyHex), highFix: toneFix(emptyHex),
      lowLin: emptyLin, highLin: emptyLin,
    }, { fill: OVERLAY.emptyFill, hatch: 0, edgeA: 0.24, lineW: 0.42, pulse: 0.0, lineLift: 0.30 });
    for (const t of ZONE_TYPES) {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), cellMaterial(this.shared, this.colors[t]));
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.renderOrder = RENDER_ORDER.MARKINGS + 5;
      this.group.add(mesh);
      this.meshes.set(t, mesh);
      this.materials.push(mesh.material);
    }
    this.emptyMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.emptyMat);
    this.emptyMesh.frustumCulled = false;
    this.emptyMesh.visible = false;
    this.emptyMesh.renderOrder = RENDER_ORDER.MARKINGS + 4;
    this.group.add(this.emptyMesh);
    this.materials.push(this.emptyMat);
  }

  setVisible(v) { this.group.visible = !!v; }
  get visible() { return this.group.visible; }
  setOpacity(v) { this.shared.uOpacity.value = v; }
  get opacity() { return this.shared.uOpacity.value; }

  update(dt) {
    // The outline pulse is presentation, not world state, so it runs on wall time rather than on the
    // frame dt the loop clamps to 0.1 s (at 3 fps under software GL that clamp would slow the pulse
    // to a third of real time). It stops dead when the clock is paused, which is what every capture
    // does, so a still is deterministic and two stills of the same scene are identical.
    const t = performance.now() * 0.001;
    const real = this._lastT ? Math.min(0.5, t - this._lastT) : dt;
    this._lastT = t;
    const tw = this.world.time;
    if (!tw.paused && tw.speed > 0) this.shared.uTime.value += real;
    // item 4: the overlay is a lit HUD layer, dimmed by the environment's published night factor.
    const w = this.world.weather;
    let night = w && typeof w.night === 'number' ? w.night : null;
    if (night === null) {
      const el = this.ctx.clock?.sunElevation?.() ?? 1;
      night = 1 - Math.min(1, Math.max(0, (el + 0.13) / 0.15));
    }
    this.shared.uNight.value = 1 + (OVERLAY.nightMul - 1) * night;
    this.shared.uNightA.value = 1 + (OVERLAY.nightAlpha - 1) * night;
    this.shared.uFogRelief.value = OVERLAY.nightFogRelief * night;
  }

  // ------------------------------------------------------------------ build
  rebuild() {
    const t0 = performance.now();
    this.buildCells();
    this.stats.ms = performance.now() - t0;
    return this.stats;
  }

  _zid(c) { return c ? c.type + (c.density === 'high' ? '1' : '0') : null; }

  buildCells() {
    const grid = this.grid, cells = grid.cells;
    const buckets = new Map();
    for (const t of ZONE_TYPES) buckets.set(t, []);
    const empty = [];
    for (const [key, c] of cells) buckets.get(c.type)?.push([key, c]);
    for (const key of grid.zonable.keys()) if (!cells.has(key)) empty.push(key);

    this._vcache.clear();
    let tris = 0, draws = 0;
    for (const t of ZONE_TYPES) {
      const list = buckets.get(t);
      const mesh = this.meshes.get(t);
      const geo = this._geometry(list.map((p) => p[0]), false);
      mesh.geometry.dispose();
      mesh.geometry = geo;
      mesh.visible = list.length > 0;
      if (mesh.visible) { draws++; tris += geo.index.count / 3; }
    }
    const geoE = this._geometry(empty, true);
    this.emptyMesh.geometry.dispose();
    this.emptyMesh.geometry = geoE;
    this.emptyMesh.visible = empty.length > 0;
    if (this.emptyMesh.visible) { draws++; tris += geoE.index.count / 3; }
    this._vcache.clear();

    this.stats.cells = cells.size;
    this.stats.lots = grid.lots.size;
    this.stats.tris = tris;
    this.stats.draws = draws;
  }

  /**
   * Terrain height at a point already pushed clear of the road corridor. The third component of the
   * cached triple is the height; the fourth is how far the point had to move, which the caller uses
   * to drop a cell the corridor would otherwise turn inside out at a junction.
   */
  _node(px, pz, out) {
    const k = ((px + 1024) * 0.25) * 1024 + (pz + 1024) * 0.25;   // nodes land on terrain's 4 m grid
    let v = this._vcache.get(k);
    if (v === undefined) {
      const p = this.grid.field.push(px, pz);
      v = [p.x, p.z, this.world.terrain.getHeight(p.x, p.z), Math.hypot(p.x - px, p.z - pz)];
      this._vcache.set(k, v);
    }
    out[0] = v[0]; out[1] = v[1]; out[2] = v[2]; out[3] = v[3];
  }

  /**
   * Merged geometry for a list of cell keys. `emptyMode` builds the unpainted zonable band, whose
   * "region" is the band itself.
   */
  _geometry(keys, emptyMode) {
    const geo = new THREE.BufferGeometry();
    const n = keys.length;
    const g = this.grid;
    const vpc = (SUB + 1) * (SUB + 1), tpc = SUB * SUB * 2;
    const pos = new Float32Array(n * vpc * 3);
    const mask = new Float32Array(n * vpc * 4);
    const lmask = new Float32Array(n * vpc * 4);
    const cellA = new Float32Array(n * vpc * 2);
    const dens = new Float32Array(n * vpc);
    const rnd = new Float32Array(n * vpc);
    const lotf = new Float32Array(n * vpc);
    const idx = new Uint32Array(n * tpc * 3);
    const cell = g.cell, step = cell / SUB, lift = OVERLAY.liftCell;
    const seed = this.world.seed | 0;
    const nodeOut = [0, 0, 0, 0];
    const zid = emptyMode
      ? (k) => (g.zonable.has(k) && !g.cells.has(k) ? 'empty' : null)
      : (k) => this._zid(g.cells.get(k));
    const lotOf = emptyMode ? () => -1 : (k) => (g.claimed.has(k) ? g.claimed.get(k) : -1);
    let vp = 0, ip = 0, vbase = 0;
    const scratch = new Float32Array(vpc * 3);

    for (let c = 0; c < n; c++) {
      const key = keys[c];
      const ci = key.indexOf(',');
      const ix = +key.slice(0, ci), iz = +key.slice(ci + 1);
      const x0 = ix * cell - g.half, z0 = iz * cell - g.half;
      const me = zid(key);
      const mpx = zid(g.key(ix + 1, iz)) === me ? 0 : 1;
      const mnx = zid(g.key(ix - 1, iz)) === me ? 0 : 1;
      const mpz = zid(g.key(ix, iz + 1)) === me ? 0 : 1;
      const mnz = zid(g.key(ix, iz - 1)) === me ? 0 : 1;
      const my = lotOf(key);
      const lpx = my >= 0 && lotOf(g.key(ix + 1, iz)) !== my ? 1 : 0;
      const lnx = my >= 0 && lotOf(g.key(ix - 1, iz)) !== my ? 1 : 0;
      const lpz = my >= 0 && lotOf(g.key(ix, iz + 1)) !== my ? 1 : 0;
      const lnz = my >= 0 && lotOf(g.key(ix, iz - 1)) !== my ? 1 : 0;
      const rec = emptyMode ? null : g.cells.get(key);
      const d = rec && rec.density === 'high' ? 1 : 0;
      const r = hash2(ix, iz, seed);            // position-derived, so paint order cannot change it
      const inLot = my >= 0 ? 1 : 0;
      // A cell that would need more than one cell-width of clearing sits essentially inside a
      // junction; pushing its corners out individually folds the quad into a spike, so drop it.
      let worst = 0, sp = 0;
      for (let j = 0; j <= SUB; j++) for (let i = 0; i <= SUB; i++) {
        this._node(x0 + i * step, z0 + j * step, nodeOut);
        scratch[sp++] = nodeOut[0]; scratch[sp++] = nodeOut[1]; scratch[sp++] = nodeOut[2];
        if (nodeOut[3] > worst) worst = nodeOut[3];
      }
      if (worst > MAX_PUSH) continue;
      sp = 0;
      for (let j = 0; j <= SUB; j++) for (let i = 0; i <= SUB; i++) {
        nodeOut[0] = scratch[sp++]; nodeOut[1] = scratch[sp++]; nodeOut[2] = scratch[sp++];
        pos[vp * 3] = nodeOut[0]; pos[vp * 3 + 1] = nodeOut[2] + lift; pos[vp * 3 + 2] = nodeOut[1];
        mask[vp * 4] = mpx; mask[vp * 4 + 1] = mnx; mask[vp * 4 + 2] = mpz; mask[vp * 4 + 3] = mnz;
        lmask[vp * 4] = lpx; lmask[vp * 4 + 1] = lnx; lmask[vp * 4 + 2] = lpz; lmask[vp * 4 + 3] = lnz;
        cellA[vp * 2] = x0; cellA[vp * 2 + 1] = z0;
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
    geo.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, vp * 3), 3));
    geo.setAttribute('aMask', new THREE.BufferAttribute(mask.subarray(0, vp * 4), 4));
    geo.setAttribute('aLotMask', new THREE.BufferAttribute(lmask.subarray(0, vp * 4), 4));
    geo.setAttribute('aCell', new THREE.BufferAttribute(cellA.subarray(0, vp * 2), 2));
    geo.setAttribute('aDens', new THREE.BufferAttribute(dens.subarray(0, vp), 1));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd.subarray(0, vp), 1));
    geo.setAttribute('aLot', new THREE.BufferAttribute(lotf.subarray(0, vp), 1));
    geo.setIndex(new THREE.BufferAttribute(idx.subarray(0, ip), 1));
    geo.computeBoundingSphere();
    return geo;
  }

  /** Copy the scene's fog and the renderer exposure into the custom shaders. Allocation-free. */
  syncFog(scene) {
    this.shared.uExposure.value = this.ctx.renderer?.toneMappingExposure ?? 1;
    const fog = scene.fog;
    for (let i = 0; i < this.materials.length; i++) {
      const u = this.materials[i].uniforms;
      if (!u.fogColor) continue;
      if (fog) { u.fogColor.value.copy(fog.color); if (u.fogDensity) u.fogDensity.value = fog.density ?? 0; }
      else if (u.fogDensity) u.fogDensity.value = 0;
    }
  }

  dispose() {
    for (const m of this.meshes.values()) { m.geometry.dispose(); m.material.dispose(); }
    this.emptyMesh.geometry.dispose(); this.emptyMat.dispose();
    this.group.parent?.remove(this.group);
  }
}
