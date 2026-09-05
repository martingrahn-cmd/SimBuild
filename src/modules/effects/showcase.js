// effects showcase: a staged downtown grid (towers with setbacks, mid- and low-rise blocks) on a rotated
// street grid so the post chain can be judged — PBR concrete/brick/glass facades with recessed windows
// and per-window night lights, asphalt roads with lane markings/crosswalks, concrete slabs with kerbs,
// instanced street lamps with emissive heads and additive light pools. Everything instanced or merged.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RENDER_ORDER, LAYERS } from '../../core/constants.js';
import { makeNoise2D } from '../../core/rng.js';

const THETA = 0.95;                       // grid rotation (avenues run along the `street` camera's view)
const SIN = Math.sin(THETA), COS = Math.cos(THETA);
const ROT_Y = THETA - Math.PI / 2;        // rotation.y so that local +x = u axis, local z = -v axis
const AVE_W = 24, ST_W = 16, AVE_STEP = 72, ST_STEP = 80, SIDEWALK = 3.5, SLAB_H = 0.15;
const uv2xz = (u, v) => [u * SIN + v * COS, u * COS - v * SIN];

export const showcaseUniforms = {
  winNight: { value: 0 },
  wet: { value: 0 },
  night: { value: 0 },
  axis: { value: new THREE.Vector2(SIN, COS) },
  winLevel: 0.11,          // scene-linear emissive per lit window before exposure (dev-tunable)
};
const M = { lampHead: null, pools: null };

const HASH_GLSL = /* glsl */`float shHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`;

// Showcase copies of the shared PBR textures with low anisotropy: 8x anisotropic filtering costs up to 16
// bilinear fetches per tap in software GL and adds nothing at city-builder distances.
function cheapSet(set, aniso = 2) {
  const out = { ...set };
  for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap', 'armMap']) {
    const t = out[k];
    if (!t) continue;
    if (!t.userData.fxCheap) { const c = t.clone(); c.anisotropy = aniso; c.needsUpdate = true; t.userData.fxCheap = c; }
    out[k] = t.userData.fxCheap;
  }
  return out;
}

// ----------------------------------------------------------------------------------------- materials
function facadeMaterial(assets, concrete) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0 });
  assets.applyPbr(m, cheapSet({ ...concrete, normalMap: null, aoMap: null }), {});
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWinNight = showcaseUniforms.winNight;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aBox; attribute vec4 aStyle; attribute vec4 aFlags;
        varying vec2 vFace; flat varying vec2 vFaceSize; flat varying float vTop; flat varying float vFaceId; flat varying vec4 vStyle; flat varying vec4 vFlags;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vec2 shFs = abs(normal.x) > 0.5 ? vec2(aBox.z, aBox.y) : (abs(normal.y) > 0.5 ? vec2(aBox.x, aBox.z) : vec2(aBox.x, aBox.y));
        vec2 shS = shFs / 9.0;
        #ifdef USE_MAP
          vMapUv *= shS;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv *= shS;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv *= shS;
        #endif
        #ifdef USE_METALNESSMAP
          vMetalnessMapUv *= shS;
        #endif
        #ifdef USE_AOMAP
          vAoMapUv *= shS;
        #endif
        vFace = uv * shFs; vFaceSize = shFs; vTop = normal.y;
        vFaceId = normal.x > 0.5 ? 0.0 : (normal.x < -0.5 ? 1.0 : (normal.z > 0.5 ? 2.0 : 3.0));
        vStyle = aStyle; vFlags = aFlags;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uWinNight; uniform sampler2D uEnvNoise;
        varying vec2 vFace; flat varying vec2 vFaceSize; flat varying float vTop; flat varying float vFaceId; flat varying vec4 vStyle; flat varying vec4 vFlags;
        ${HASH_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 vColorFlat = diffuse;
        #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
          vColorFlat *= vColor.rgb;
        #endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (abs(vTop) < 0.5) {
          float style = vStyle.x, floorH = vStyle.y, winW = vStyle.z, seed = vStyle.w;
          float glass = vFlags.y;
          float H = vFaceSize.y, Wf = vFaceSize.x;
          float gh = floorH * 1.45;
          float isGround = step(vFace.y, gh) * vFlags.w;
          float fy = mix((vFace.y - gh * vFlags.w) / floorH, vFace.y / gh - 1.0, isGround);
          float fx = vFace.x / winW;
          vec2 cell = floor(vec2(fx, fy)); vec2 f = fract(vec2(fx, fy));
          float wr = mix(vFlags.x, 0.94, glass);
          float y0 = mix(0.27, 0.10, glass), y1 = mix(0.86, 0.97, glass);
          if (isGround > 0.5) { y0 = 0.08; y1 = 0.80; wr = mix(0.82, 0.94, glass); }
          float x0 = 0.5 - wr * 0.5, x1 = 0.5 + wr * 0.5;
          float inX = step(x0, f.x) * step(f.x, x1);
          float inY = step(y0, f.y) * step(f.y, y1);
          float margin = step(0.7, vFace.x) * step(vFace.x, Wf - 0.7);
          float cellTop = (cell.y + 1.0) * floorH + gh * vFlags.w;
          float notTop = max(step(cellTop, H - 0.25), isGround);
          float isWin = inX * inY * margin * notTop;
          vec3 wall = mix(diffuseColor.rgb, vColorFlat, 0.55);
          float slab = 1.0 - 0.32 * (1.0 - smoothstep(0.0, 0.05, f.y)) * (1.0 - glass) * (1.0 - isGround);
          wall *= slab;
          if (style > 1.5 && style < 2.5) {
            float course = step(0.80, fract(vFace.y / 0.075));
            float rowOff = step(0.5, fract(vFace.y / 0.15)) * 0.5;
            float head = step(0.88, fract(vFace.x / 0.24 + rowOff));
            wall *= 1.0 - 0.22 * max(course, head);
          }
          if (glass > 0.5) wall = mix(wall, vec3(0.10, 0.11, 0.12), 0.85);
          float revealL = smoothstep(0.0, 0.22, (f.x - x0) / max(wr, 0.01));
          float revealT = 1.0 - smoothstep(0.70, 1.0, (f.y - y0) / max(y1 - y0, 0.01));
          float reveal = 0.40 + 0.60 * revealL * revealT;
          float curtain = shHash(cell + seed * 7.13 + vFaceId * 31.7);
          float blinds = step(0.74, curtain) * (1.0 - glass * 0.6);
          vec3 glassCol = mix(vec3(0.014, 0.018, 0.026), vec3(0.12, 0.11, 0.10), blinds) * reveal;
          float fb = 0.035;
          float frame = step(x0 - fb, f.x) * step(f.x, x1 + fb) * step(y0 - fb * 1.2, f.y) * step(f.y, y1 + fb * 1.2) * margin * notTop * (1.0 - isWin);
          vec3 frameCol = mix(wall * 0.5, vec3(0.15, 0.16, 0.17), glass);
          float sill = step(y0 - 0.10, f.y) * step(f.y, y0 - fb * 1.2) * inX * margin * notTop * (1.0 - glass) * (1.0 - isGround);
          wall = mix(wall, frameCol, frame);
          wall = mix(wall, wall * 1.2 + 0.04, sill);
          if (isGround > 0.5 && glass < 0.5) {
            float band = step(gh - 0.55, vFace.y) * step(vFace.y, gh - 0.05) * margin;
            float ah = shHash(vec2(seed, vFaceId));
            vec3 awning = ah < 0.33 ? vec3(0.45, 0.10, 0.08) : (ah < 0.66 ? vec3(0.08, 0.16, 0.30) : vec3(0.10, 0.25, 0.14));
            wall = mix(wall, awning * (0.85 + 0.3 * shHash(floor(vFace * 8.0))), band * step(0.4, ah + isGround * 0.2));
          }
          diffuseColor.rgb = mix(wall, glassCol, isWin);
          roughnessFactor = mix(roughnessFactor, mix(0.14, 0.45, blinds), isWin);
          metalnessFactor = mix(metalnessFactor, 0.0, isWin);
          float shopOn = step(0.3, shHash(vec2(seed * 1.7 + vFaceId * 3.1, floor(vFace.x / (winW * 3.0)))));
          float onP = mix(vFlags.z, 0.85 * shopOn, isGround);
          float on = step(1.0 - onP, shHash(cell * 1.31 + seed * 3.7 + vFaceId * 17.1));
          float tintH = shHash(cell * 0.77 + seed * 5.1 + 3.0);
          vec3 tint = tintH < 0.60 ? vec3(1.0, 0.58, 0.24) : (tintH < 0.80 ? vec3(0.62, 0.78, 1.0) : vec3(1.0, 0.90, 0.55));
          if (glass > 0.5) tint = mix(tint, vec3(0.80, 0.90, 1.0), 0.45);
          if (isGround > 0.5) tint = mix(vec3(1.0, 0.80, 0.50), vec3(0.80, 0.92, 1.0), step(0.7, shHash(vec2(seed, vFaceId + 5.0))));
          float bright = 0.5 + 0.8 * shHash(cell + seed + 9.0);
          totalEmissiveRadiance += isWin * on * uWinNight * tint * bright * mix(1.0, 0.45, blinds) * (0.6 + 0.4 * reveal);
        } else if (vTop > 0.5) {
          vec2 e = min(vFace, vFaceSize - vFace); float edge = min(e.x, e.y);
          float rn = texture2D(uEnvNoise, vFace * 0.04 + vStyle.w).g;
          float rk = shHash(vec2(vStyle.w, 2.0));
          vec3 roofA = rk < 0.4 ? vec3(0.055, 0.055, 0.06) : (rk < 0.75 ? vec3(0.11, 0.105, 0.10) : vec3(0.17, 0.165, 0.15));
          vec3 roof = roofA * (0.8 + 0.5 * rn);
          float parapet = 1.0 - smoothstep(0.35, 0.6, edge);
          diffuseColor.rgb = mix(roof, diffuseColor.rgb * 0.85, parapet);
          roughnessFactor = 0.95;
        }`);
  };
  return m;
}

function asphaltMaterial(assets, set) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  assets.applyPbr(m, cheapSet({ ...set, normalMap: null }), { aoIntensity: 0.6 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWet = showcaseUniforms.wet;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aRoad; attribute vec4 aSeg; varying vec4 vRoad; flat varying vec4 vSeg;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvRoad = aRoad; vSeg = aSeg;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWet; uniform sampler2D uEnvNoise; varying vec4 vRoad; flat varying vec4 vSeg;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float along = vRoad.x, across = vRoad.y, W = vRoad.z, kind = vRoad.w;
        float halfW = W * 0.5;
        float period = vSeg.x, offset = vSeg.y, crossW = vSeg.z, len = vSeg.w;
        vec3 col = diffuseColor.rgb;
        vec4 nz = texture2D(uEnvNoise, vEnvWorldPos.xz * 0.011);
        vec4 nz2 = texture2D(uEnvNoise, vEnvWorldPos.xz * 0.0017 + 0.3);
        col *= (0.80 + 0.38 * nz.r) * (0.88 + 0.24 * nz2.b);
        float lanes = kind < 0.5 ? 4.0 : 2.0;
        float edge = halfW - 0.35;
        float laneW = (edge * 2.0) / lanes;
        float lx = mod(across + edge, laneW);
        float track = exp(-pow((abs(lx - laneW * 0.5) - laneW * 0.27) / 0.30, 2.0));
        col *= 1.0 + 0.09 * track;
        col *= 1.0 - 0.10 * exp(-pow((lx - laneW * 0.5) / 0.6, 2.0));
        float a2 = mod(along - offset + period * 0.5, period) - period * 0.5;
        float inter = kind < 0.5 ? step(abs(a2), crossW * 0.5 + 0.3) : 0.0;
        float lineW = 0.12;
        float edgeLine = step(abs(abs(across) - edge), lineW * 0.5);
        float centre = kind < 0.5 ? step(abs(abs(across) - 0.16), 0.06) : step(abs(across), 0.06);
        float dash = step(fract(along / 12.0), 0.25);
        float divider = kind < 0.5 ? step(abs(abs(across) - laneW), lineW * 0.5) * dash : 0.0;
        float cw = 0.0, stop = 0.0;
        if (kind < 0.5) {
          float d = abs(a2) - crossW * 0.5;
          cw = step(0.6, d) * step(d, 3.6) * step(fract(across / 1.2), 0.5);
          stop = step(3.9, d) * step(d, 4.3) * step(0.05, sign(a2) * sign(across) + 1.0);
        } else {
          float d = min(along, len - along);
          cw = step(0.6, d) * step(d, 3.6) * step(fract(across / 1.2), 0.5);
        }
        float shWhite = max(max(edgeLine, divider) * (1.0 - inter), max(cw, stop));
        float shYellow = centre * (1.0 - inter) * (1.0 - cw) * (1.0 - stop);
        float wear = 0.35 + 0.65 * smoothstep(0.2, 0.8, nz.g);
        col = mix(col, vec3(0.70, 0.70, 0.68), shWhite * wear * 0.85);
        col = mix(col, vec3(0.80, 0.62, 0.16), shYellow * wear * 0.85);
        diffuseColor.rgb = col * (1.0 - uWet * 0.45);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.6, max(shWhite, shYellow) * 0.6);
        roughnessFactor = mix(roughnessFactor, 0.22, uWet * 0.85);`);
  };
  return m;
}

function slabMaterial(assets, set) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  assets.applyPbr(m, cheapSet({ ...set, normalMap: null }), { aoIntensity: 0.6 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWet = showcaseUniforms.wet;
    shader.uniforms.uAxis = showcaseUniforms.axis;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vUp;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvUp = normal.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWet; uniform vec2 uAxis; uniform sampler2D uEnvNoise; varying float vUp;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 shUV = vec2(vEnvWorldPos.x * uAxis.x + vEnvWorldPos.z * uAxis.y, vEnvWorldPos.x * uAxis.y - vEnvWorldPos.z * uAxis.x);
        vec4 nz = texture2D(uEnvNoise, vEnvWorldPos.xz * 0.009);
        vec3 col = diffuseColor.rgb * (0.86 + 0.28 * nz.r) * vec3(0.98, 0.97, 0.95);
        vec2 jf = fract(shUV / 1.5);
        float joint = 1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.045, min(min(jf.x, 1.0 - jf.x), min(jf.y, 1.0 - jf.y))));
        col *= mix(0.78, joint, step(0.5, vUp));
        diffuseColor.rgb = col * (1.0 - uWet * 0.35);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, uWet * 0.8);');
  };
  return m;
}

function groundMaterial(assets, set) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, vertexColors: true });
  assets.applyPbr(m, cheapSet({ ...set, normalMap: null }), { aoIntensity: 0.8 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWet = showcaseUniforms.wet;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\nuniform sampler2D uEnvNoise; uniform float uWet;')
      .replace('#include <map_fragment>', `
        vec4 t1 = texture2D(map, vMapUv);
        vec4 t2 = texture2D(map, vMapUv * 0.21 + vec2(0.31, 0.57));
        vec4 n = texture2D(uEnvNoise, vEnvWorldPos.xz * 0.0005 + vec2(0.13, 0.71));
        diffuseColor *= mix(t1, t2, 0.35) * mix(0.85, 1.15, (n.a + n.b) * 0.5);
        vec3 lush = vec3(0.30, 0.50, 0.21), mid = vec3(0.50, 0.62, 0.30), dry = vec3(0.74, 0.70, 0.40);
        vec3 tint = mix(mix(lush, mid, smoothstep(0.3, 0.6, n.g)), dry, smoothstep(0.55, 0.85, n.r * 0.6 + n.b * 0.4));
        diffuseColor.rgb *= tint * 1.3 * mix(0.8, 1.15, n.b);
        diffuseColor.rgb *= 1.0 - uWet * 0.4;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, uWet * 0.8);');
  };
  return m;
}

// --------------------------------------------------------------------------------------- generators
function makeRoadStrip(u0, u1, vc, width, kind, seg, alongIsU) {
  // a rectangle in the (u,v) frame: along axis is u (avenue) or v (cross street)
  const g = new THREE.BufferGeometry();
  const len = u1 - u0;
  const pos = [], nor = [], uv = [], road = [], sg = [];
  const corners = [[u0, -width / 2], [u1, -width / 2], [u0, width / 2], [u1, width / 2]];
  for (const [a, c] of corners) {
    const [x, z] = alongIsU ? uv2xz(a, vc + c) : uv2xz(vc + c, a);
    pos.push(x, 0.02, z); nor.push(0, 1, 0);
    uv.push(a / 4.5, c / 4.5);
    road.push(a - u0, c, width, kind);
    sg.push(seg[0], seg[1] - u0, seg[2], len);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aRoad', new THREE.Float32BufferAttribute(road, 4));
  g.setAttribute('aSeg', new THREE.Float32BufferAttribute(sg, 4));
  // winding: (0,1,2),(2,1,3) — check orientation so the normal faces +y
  g.setIndex(alongIsU ? [0, 1, 2, 2, 1, 3] : [0, 2, 1, 1, 2, 3]);
  return g;
}

function makeSlabBox(uc, vc, w, d, h) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const fs = nx > 0.5 ? [d, h] : (ny > 0.5 ? [w, d] : [w, h]);
    uv.setXY(i, uv.getX(i) * fs[0] / 2.5, uv.getY(i) * fs[1] / 2.5);
  }
  const [x, z] = uv2xz(uc, vc);
  g.rotateY(ROT_Y);
  g.translate(x, h / 2, z);
  return g;
}

const STYLES = [
  { id: 0, color: 0xd8cfc0, floorH: 3.2, winW: 2.6, winR: 0.62, glass: 0, onP: 0.42 },   // beige concrete
  { id: 1, color: 0xb8b6b0, floorH: 3.3, winW: 3.0, winR: 0.66, glass: 0, onP: 0.38 },   // grey concrete
  { id: 2, color: 0x9c5540, floorH: 3.1, winW: 2.4, winR: 0.52, glass: 0, onP: 0.40 },   // brick
  { id: 3, color: 0x6c7580, floorH: 3.7, winW: 2.2, winR: 0.90, glass: 1, onP: 0.55 },   // glass office
  { id: 4, color: 0xe4dfd4, floorH: 3.2, winW: 2.8, winR: 0.58, glass: 0, onP: 0.40 },   // white plaster
  { id: 5, color: 0x50535a, floorH: 3.5, winW: 2.0, winR: 0.70, glass: 0, onP: 0.45 },   // dark modern
  { id: 6, color: 0xc9a67e, floorH: 3.2, winW: 2.5, winR: 0.56, glass: 0, onP: 0.40 },   // sandstone
];

export async function setupShowcase(ctx) {
  const rng = ctx.rng.fork('showcase');
  const group = ctx.group;
  const { assets } = ctx;
  const [grass, asphalt, concreteWall, concreteFloor] = await Promise.all([
    assets.pbr('aerial_grass_rock', { repeat: [7000 / 14, 7000 / 14] }),
    assets.pbr('asphalt_02', {}),
    assets.pbr('concrete_wall_008', {}),
    assets.pbr('concrete_floor_worn_001', {}),
  ]);

  // ------------------------------------------------------------------ ground
  const groundFn = makeGroundHeight(rng.fork('ground'));
  const groundH = groundFn.heightAt;
  const ground = new THREE.Mesh(makeGroundGeometry(groundFn), groundMaterial(assets, grass));
  ground.position.y = -0.04;
  ground.receiveShadow = true; ground.renderOrder = 6; ground.name = 'fx-ground'; // drawn after the occluders (front-to-back)
  ground.layers.enable(LAYERS.TERRAIN);
  group.add(ground);

  // ------------------------------------------------------------------ street grid
  const K = 5;                                   // avenues k=-K..K, cross streets j=-K..K
  const aveV = (k) => -10 + k * AVE_STEP;
  const stU = (j) => 22 + j * ST_STEP;
  const uMin = stU(-K) - 20, uMax = stU(K) + 20;
  const roadGeos = [];
  for (let k = -K; k <= K; k++) {
    const out = k === 0;   // the central avenue leaves town in both directions
    roadGeos.push(makeRoadStrip(out ? -2600 : uMin, out ? 2600 : uMax, aveV(k), AVE_W, 0, [ST_STEP, stU(0), ST_W], true));
  }
  // the central cross street continues north/south as a two-lane road
  roadGeos.push(makeRoadStrip(aveV(K) + AVE_W / 2, 2600, stU(0), ST_W, 1, [1e6, 0, 0], false));
  roadGeos.push(makeRoadStrip(-2600, aveV(-K) - AVE_W / 2, stU(0), ST_W, 1, [1e6, 0, 0], false));
  for (let j = -K; j <= K; j++) for (let k = -K; k < K; k++) {
    roadGeos.push(makeRoadStrip(aveV(k) + AVE_W / 2, aveV(k + 1) - AVE_W / 2, stU(j), ST_W, 1, [1e6, 0, 0], false));
  }
  const roads = new THREE.Mesh(mergeGeometries(roadGeos, false), asphaltMaterial(assets, asphalt));
  roads.receiveShadow = true; roads.renderOrder = 4; roads.name = 'fx-roads';
  roads.material.polygonOffset = true; roads.material.polygonOffsetFactor = -1; roads.material.polygonOffsetUnits = -1;
  roads.layers.enable(LAYERS.ROADS);
  group.add(roads);

  // ------------------------------------------------------------------ blocks: slabs + buildings + lamps
  const slabGeos = [];
  const buildings = [];    // {u, v, w, h, d, style, rot, flags}
  const clutter = [];      // {u, v, w, h, d}
  const lamps = [];        // {u, v, heading}
  const trees = [];        // {u, v, s, kind}
  const blockW = ST_STEP - ST_W, blockD = AVE_STEP - AVE_W;

  const addBuilding = (u, v, w, h, d, style, rot = 0, ground = 1, forceStyle = null) => {
    const st = forceStyle ?? style;
    buildings.push({ u, v, w, h, d, style: st, rot, ground });
    return buildings.length - 1;
  };
  const addClutter = (b) => {
    // roof units on top of a building record
    const n = b.h > 40 ? rng.int(2, 4) : b.h > 14 ? rng.int(1, 3) : (rng.bool(0.5) ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const cw = rng.range(1.6, 4.5), cd = rng.range(1.4, 3.5), chh = rng.range(1.2, 3.2);
      const cu = b.u + rng.range(-(b.w / 2 - cw / 2 - 1.2), b.w / 2 - cw / 2 - 1.2);
      const cv = b.v + rng.range(-(b.d / 2 - cd / 2 - 1.2), b.d / 2 - cd / 2 - 1.2);
      clutter.push({ u: cu, v: cv, w: cw, h: chh, d: cd, y: b.h, rot: b.rot });
    }
    if (b.h > 60 && rng.bool(0.6)) clutter.push({ u: b.u, v: b.v, w: 0.5, h: rng.range(6, 14), d: 0.5, y: b.h, rot: 0 });
  };

  for (let j = -K; j < K; j++) for (let k = -K; k < K; k++) {
    const u0 = stU(j) + ST_W / 2, v0 = aveV(k) + AVE_W / 2;
    const uc = u0 + blockW / 2, vc = v0 + blockD / 2;
    const r = Math.hypot(uc, vc);
    let tier = r < 150 ? 'core' : r < 285 ? 'mid' : 'low';
    if (j === 0 && k === -1) tier = 'park';       // the night_street preset looks across this block
    if (j === 1 && k === -1) tier = 'low';        // the closeup preset hovers over this block at 44 m
    if (tier === 'low' || tier === 'park') {
      // sidewalk ring only, grass inside
      slabGeos.push(makeSlabBox(uc, v0 + SIDEWALK / 2, blockW, SIDEWALK, SLAB_H));
      slabGeos.push(makeSlabBox(uc, v0 + blockD - SIDEWALK / 2, blockW, SIDEWALK, SLAB_H));
      slabGeos.push(makeSlabBox(u0 + SIDEWALK / 2, vc, SIDEWALK, blockD - 2 * SIDEWALK, SLAB_H));
      slabGeos.push(makeSlabBox(u0 + blockW - SIDEWALK / 2, vc, SIDEWALK, blockD - 2 * SIDEWALK, SLAB_H));
    } else {
      slabGeos.push(makeSlabBox(uc, vc, blockW, blockD, SLAB_H));
    }
    const inner0 = u0 + SIDEWALK, inner1 = u0 + blockW - SIDEWALK;
    if (tier === 'park') {
      // small urban park: crossing paths, lawn, trees, a few lamps
      slabGeos.push(makeSlabBox(uc, vc, 3.2, blockD - 2 * SIDEWALK, SLAB_H));
      slabGeos.push(makeSlabBox(uc, vc, blockW - 2 * SIDEWALK, 3.2, SLAB_H));
      for (let i = 0; i < 22; i++) {
        const tu = rng.range(inner0 + 2, inner1 - 2), tv = rng.range(v0 + SIDEWALK + 2, v0 + blockD - SIDEWALK - 2);
        if (Math.abs(tu - uc) < 3 || Math.abs(tv - vc) < 3) continue;
        if (tu > uc + 18 && Math.abs(tv - (vc + 4)) < 9) continue;   // keep the night_street camera spot clear
        trees.push({ u: tu, v: tv, s: rng.range(0.8, 1.35) });
      }
      lamps.push({ u: uc + 2.4, v: vc + 6, heading: 2 }, { u: uc + 2.4, v: vc - 9, heading: 2 }, { u: uc + 14, v: vc - 2.4, heading: 1 }, { u: uc - 14, v: vc + 2.4, heading: -1 });
    } else if (tier === 'core') {
      // one or two towers with podium + setbacks, plus a mid-rise filler
      const nT = rng.bool(0.45) ? 2 : 1;
      const styleT = rng.pick([3, 3, 5, 1, 0]);
      const towerW = nT === 2 ? rng.range(20, 26) : rng.range(26, 36);
      for (let t = 0; t < nT; t++) {
        const tu = nT === 2 ? (t === 0 ? inner0 + towerW / 2 + 2 : inner1 - towerW / 2 - 2) : uc + rng.range(-6, 6);
        const tv = vc + rng.range(-4, 4);
        const H = rng.range(55, 150) * (1 - (r / 150) * 0.35);
        const podW = Math.min(towerW + rng.range(6, 14), nT === 2 ? blockW / 2 - 6 : blockW - 8);
        const podD = Math.min(rng.range(30, 40), blockD - 8);
        const podH = rng.range(6, 14);
        const bi = addBuilding(tu, tv, podW, podH, podD, styleT === 3 ? 1 : styleT, 0, 1);
        addClutter(buildings[bi]);
        const tw = towerW, td = rng.range(20, Math.min(30, podD - 4));
        const bt = addBuilding(tu, tv, tw, H, td, styleT, 0, 0);
        addClutter(buildings[bt]);
        if (rng.bool(0.6)) { const bc = addBuilding(tu, tv, tw * rng.range(0.55, 0.8), H + rng.range(5, 12), td * rng.range(0.55, 0.8), styleT, 0, 0); addClutter(buildings[bc]); }
      }
      if (nT === 1 && rng.bool(0.7)) {
        // mid-rise filler on one end of the block
        const fw = rng.range(14, 22), side = rng.bool() ? 1 : -1;
        const fu = side > 0 ? inner1 - fw / 2 - 0.5 : inner0 + fw / 2 + 0.5;
        const b = addBuilding(fu, vc + rng.range(-3, 3), fw, rng.range(18, 34), blockD - 2 * SIDEWALK - 4, rng.pick([0, 1, 2, 4, 6]), 0, 1);
        addClutter(buildings[b]);
      }
    } else if (tier === 'mid') {
      // two rows of terraced mid-rises facing each avenue
      for (let row = 0; row < 2; row++) {
        const depth = rng.range(17, 21);
        const rv = row === 0 ? v0 + SIDEWALK + depth / 2 + 0.6 : v0 + blockD - SIDEWALK - depth / 2 - 0.6;
        let u = inner0 + 0.4;
        while (u < inner1 - 10) {
          const w = Math.min(rng.range(12, 26), inner1 - 0.4 - u);
          if (w < 8) break;
          const h = rng.range(15, 42) * (r < 200 ? 1.15 : 1.0);
          const style = rng.pick([0, 1, 2, 2, 4, 6, 5, 3]);
          const b = addBuilding(u + w / 2, rv, w, h, depth * rng.range(0.85, 1.0), style, 0, 1);
          addClutter(buildings[b]);
          u += w + rng.range(0.0, 1.2);
        }
      }
    } else {
      // low-rise: detached 2–4 storey blocks with gaps, set back from the sidewalk
      for (let row = 0; row < 2; row++) {
        const depth = rng.range(11, 15);
        const rv = row === 0 ? v0 + SIDEWALK + depth / 2 + 3.5 : v0 + blockD - SIDEWALK - depth / 2 - 3.5;
        let u = inner0 + rng.range(1, 4);
        while (u < inner1 - 9) {
          const w = Math.min(rng.range(9, 16), inner1 - 1 - u);
          if (w < 7) break;
          const h = rng.pick([6.8, 7.0, 10.2, 10.4, 13.6]);
          const style = rng.pick([0, 2, 2, 4, 6, 6, 1]);
          const b = addBuilding(u + w / 2, rv, w, h, depth, style, rng.range(-0.03, 0.03), 1);
          addClutter(buildings[b]);
          // yard trees around detached houses
          if (rng.bool(0.8)) trees.push({ u: u + rng.range(-2.5, w + 2.5), v: rv + (row === 0 ? -1 : 1) * (depth / 2 + rng.range(1.5, 3.0)), s: rng.range(0.6, 1.1) });
          if (rng.bool(0.5)) trees.push({ u: u + w + rng.range(1.0, 3.0), v: rv + rng.range(-depth / 2, depth / 2), s: rng.range(0.7, 1.2) });
          u += w + rng.range(3, 7);
        }
      }
    }
    // street trees on the sidewalks of mid/low blocks (both avenue sides), between lamps
    if (tier !== 'core') {
      for (let tu = u0 + 8; tu < u0 + blockW - 6; tu += 13.5) {
        if (rng.bool(0.15)) continue;
        trees.push({ u: tu + rng.range(-1, 1), v: v0 + 1.6, s: rng.range(0.75, 1.15) });
        trees.push({ u: tu + 6 + rng.range(-1, 1), v: v0 + blockD - 1.6, s: rng.range(0.75, 1.15) });
      }
    }
  }
  // lamps along avenues (both sides) and cross streets (one side), skipping intersections
  for (let k = -K; k <= K; k++) {
    const v = aveV(k);
    for (let u = uMin + 14; u < uMax - 10; u += 27) {
      const dj = Math.abs(((u - stU(0)) % ST_STEP + ST_STEP * 1.5) % ST_STEP - ST_STEP / 2);
      if (dj < ST_W / 2 + 2.5) continue;
      lamps.push({ u, v: v + AVE_W / 2 + 0.9, heading: -1 });
      lamps.push({ u: u + 13, v: v - AVE_W / 2 - 0.9, heading: 1 });
    }
  }
  for (let j = -K; j <= K; j++) for (let k = -K; k < K; k++) {
    const u = stU(j) + ST_W / 2 + 0.9;
    for (let v = aveV(k) + AVE_W / 2 + 12; v < aveV(k + 1) - AVE_W / 2 - 8; v += 30) lamps.push({ u, v, heading: 2 });
  }

  // ------------------------------------------------------------------ forest belt around the town
  // clumpy woodland from the edge of the grid outward (same density field that darkens the ground, so
  // canopy and forest floor agree): a dense band of big trees within ~350 m of town, scattered clumps beyond
  {
    const fr = rng.fork('forest');
    const place = (u0, u1, v0, v1, tries, cap, k, smin, smax) => {
      let n = 0;
      for (let i = 0; i < tries && n < cap; i++) {
        const u = fr.range(u0, u1), v = fr.range(v0, v1);
        const [x, z] = uv2xz(u, v);
        const f = groundFn.forestAt(x, z);
        if (f < 0.05 || fr.float() > f * k) continue;
        trees.push({ u, v, s: fr.range(smin, smax) * (0.8 + 0.3 * f), forest: true });
        n++;
      }
      return n;
    };
    const nNear = place(uMin - 380, uMax + 380, aveV(-K) - 400, aveV(K) + 400, 120000, 20000, 1.0, 1.3, 2.3);
    const nFar = place(-2200, 2200, -2200, 2200, 60000, 8000, 0.35, 1.5, 2.6);
    ctx.log.info(`forest: ${nNear} near + ${nFar} far trees`);
  }

  // ------------------------------------------------------------------ slabs mesh
  const slabs = new THREE.Mesh(mergeGeometries(slabGeos, false), slabMaterial(assets, concreteFloor));
  slabs.receiveShadow = true; slabs.castShadow = false; slabs.renderOrder = 3; slabs.name = 'fx-slabs';
  group.add(slabs);

  // ------------------------------------------------------------------ buildings (one instanced mesh)
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const nB = buildings.length;
  const aBox = new Float32Array(nB * 3), aStyle = new Float32Array(nB * 4), aFlags = new Float32Array(nB * 4);
  buildings.forEach((b, i) => {
    const st = STYLES[b.style];
    aBox[i * 3] = b.w; aBox[i * 3 + 1] = b.h; aBox[i * 3 + 2] = b.d;
    aStyle[i * 4] = st.id; aStyle[i * 4 + 1] = st.floorH * rng.range(0.96, 1.06); aStyle[i * 4 + 2] = st.winW * rng.range(0.9, 1.15); aStyle[i * 4 + 3] = rng.range(0, 100);
    aFlags[i * 4] = st.winR * rng.range(0.92, 1.08); aFlags[i * 4 + 1] = st.glass; aFlags[i * 4 + 2] = st.onP * rng.range(0.7, 1.3); aFlags[i * 4 + 3] = b.ground;
  });
  boxGeo.setAttribute('aBox', new THREE.InstancedBufferAttribute(aBox, 3));
  boxGeo.setAttribute('aStyle', new THREE.InstancedBufferAttribute(aStyle, 4));
  boxGeo.setAttribute('aFlags', new THREE.InstancedBufferAttribute(aFlags, 4));
  const bMesh = new THREE.InstancedMesh(boxGeo, facadeMaterial(assets, concreteWall), nB);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  buildings.forEach((b, i) => {
    const [x, z] = uv2xz(b.u, b.v);
    q.setFromAxisAngle(up, ROT_Y + b.rot);
    s.set(b.w, b.h, b.d); p.set(x, b.h / 2, z);
    bMesh.setMatrixAt(i, m4.compose(p, q, s));
    col.setHex(STYLES[b.style].color).multiplyScalar(rng.range(0.82, 1.08));
    bMesh.setColorAt(i, col);
  });
  bMesh.castShadow = true; bMesh.receiveShadow = true; bMesh.frustumCulled = false;
  bMesh.renderOrder = 0; bMesh.name = 'fx-buildings';
  bMesh.layers.enable(LAYERS.BUILDINGS);
  group.add(bMesh);

  // roof clutter
  const cMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x5a5c60, roughness: 0.8, metalness: 0.2 }), clutter.length);
  clutter.forEach((c, i) => {
    const [x, z] = uv2xz(c.u, c.v);
    q.setFromAxisAngle(up, ROT_Y + c.rot); s.set(c.w, c.h, c.d); p.set(x, c.y + c.h / 2, z);
    cMesh.setMatrixAt(i, m4.compose(p, q, s));
  });
  cMesh.castShadow = true; cMesh.receiveShadow = true; cMesh.frustumCulled = false; cMesh.name = 'fx-roof-clutter'; cMesh.renderOrder = 1;
  group.add(cMesh);

  // ------------------------------------------------------------------ lamps
  const pole = new THREE.CylinderGeometry(0.09, 0.15, 9, 7); pole.translate(0, 4.5, 0);
  const arm = new THREE.BoxGeometry(2.2, 0.12, 0.12); arm.translate(1.0, 8.85, 0);
  const lampGeo = mergeGeometries([pole, arm], false);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.55, metalness: 0.7 });
  const lMesh = new THREE.InstancedMesh(lampGeo, lampMat, lamps.length);
  const headGeo = new THREE.BoxGeometry(0.62, 0.13, 0.26);
  M.lampHead = new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.5, metalness: 0.3, emissive: 0xffe2b0, emissiveIntensity: 0 });
  const hMesh = new THREE.InstancedMesh(headGeo, M.lampHead, lamps.length);
  const poolGeo = new THREE.PlaneGeometry(13, 13); poolGeo.rotateX(-Math.PI / 2);
  M.pools = new THREE.ShaderMaterial({
    uniforms: { uNight: showcaseUniforms.night },
    vertexShader: /* glsl */`
      varying vec2 vP;
      void main() {
        vP = uv;
        vec4 mv = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          mv = instanceMatrix * mv;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uNight; varying vec2 vP;
      void main() {
        float d = length(vP - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.2);
        gl_FragColor = vec4(vec3(1.0, 0.70, 0.40) * a * uNight * 0.085, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  M.pools.userData.envSkip = true;
  const pMesh = new THREE.InstancedMesh(poolGeo, M.pools, lamps.length);
  lamps.forEach((l, i) => {
    const [x, z] = uv2xz(l.u, l.v);
    // arm points toward the road: heading -1 => -v, 1 => +v, 2 => +u (cross street lamp on the -u side... arm to +u? no: to -u)
    const dirU = l.heading === 2 ? -1 : 0, dirV = l.heading === 2 ? 0 : l.heading;
    const [dx, dz] = uv2xz(dirU, dirV);
    const ang = Math.atan2(dz, dx); // rotation.y such that local +x maps to (dx,dz): x' = cos(a), z' = -sin(a) => a = -atan2(dz,dx)
    q.setFromAxisAngle(up, -ang);
    s.set(1, 1, 1); p.set(x, 0, z);
    lMesh.setMatrixAt(i, m4.compose(p, q, s));
    p.set(x + dx * 1.85, 8.85, z + dz * 1.85);
    hMesh.setMatrixAt(i, m4.compose(p, q, s));
    p.set(x + dx * 2.2, 0.24, z + dz * 2.2);
    q.identity();
    pMesh.setMatrixAt(i, m4.compose(p, q, s));
  });
  lMesh.castShadow = false; lMesh.receiveShadow = true; lMesh.frustumCulled = false; lMesh.name = 'fx-lamps'; lMesh.renderOrder = 2;
  hMesh.castShadow = false; hMesh.receiveShadow = false; hMesh.frustumCulled = false; hMesh.name = 'fx-lamp-heads'; hMesh.renderOrder = 2;
  pMesh.frustumCulled = false; pMesh.renderOrder = RENDER_ORDER.TRANSPARENT; pMesh.name = 'fx-lamp-pools';
  pMesh.castShadow = false; pMesh.receiveShadow = false;
  group.add(lMesh, hMesh, pMesh);

  // ------------------------------------------------------------------ trees: three crossed alpha-tested leaf cards per tree, one instanced mesh
  const leafTex = makeLeafTexture(rng.fork('leaf'), assets);
  const treeGeo = makeTreeGeometry();
  const treeMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, metalness: 0, color: 0xffffff });
  const tMesh = new THREE.InstancedMesh(treeGeo, treeMat, trees.length);
  tMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide });
  const treeCols = [0x6f8f3a, 0x7a9a40, 0x8aa244, 0xa8a03c, 0xc98a34, 0xd0703a, 0x5f8236];
  trees.forEach((t, i) => {
    const [x, z] = uv2xz(t.u, t.v);
    q.setFromAxisAngle(up, rng.range(0, Math.PI * 2)); s.set(t.s, t.s * rng.range(0.9, 1.15), t.s); p.set(x, (t.forest ? groundH(x, z) - 0.3 : 0.15), z);
    tMesh.setMatrixAt(i, m4.compose(p, q, s));
    col.setHex(rng.weighted(treeCols.map((c, k) => [c, k < 3 ? 3 : 1]))).multiplyScalar(rng.range(0.85, 1.1));
    if (t.forest) col.multiplyScalar(rng.range(0.72, 0.95));
    tMesh.setColorAt(i, col);
  });
  tMesh.castShadow = true; tMesh.receiveShadow = true; tMesh.frustumCulled = false; tMesh.name = 'fx-trees'; tMesh.renderOrder = 2;
  group.add(tMesh);

  ctx.log.info(`showcase staged: ${nB} building boxes, ${clutter.length} roof units, ${lamps.length} lamps, ${trees.length} trees, ${roadGeos.length} road segments, ${slabGeos.length} slabs`);
}

/** Height function for the showcase ground: flat plateau under the street grid, rolling wooded hills
 *  rising toward the horizon, with a cut corridor for the two roads that leave town. */
function makeGroundHeight(rng) {
  const { fbm } = makeNoise2D(rng.int(1, 1e9));
  const U0 = -520, U1 = 560, V0 = -520, V1 = 500, MARGIN = 160, RAMP = 900;
  const TU0 = -428, TU1 = 472, TV0 = -442, TV1 = 422;   // street grid bounds + 30 m
  /** woodland density 0..1 at a world position: clumpy, densest just outside town, clear of the two roads out */
  const forestAt = (x, z) => {
    const u = x * SIN + z * COS, v = x * COS - z * SIN;
    if (u > TU0 && u < TU1 && v > TV0 && v < TV1) return 0;
    const du = Math.max(TU0 - u, u - TU1, 0), dv = Math.max(TV0 - v, v - TV1, 0);
    const d = Math.hypot(du, dv);
    const clump = 0.5 + 0.5 * fbm(u * 0.0035 + 3.1, v * 0.0035 + 7.7, 3);
    const near = 1 - Math.min(1, d / 1700);
    const road = Math.min(THREE.MathUtils.smoothstep(Math.abs(v + 10), AVE_W / 2 + 10, AVE_W / 2 + 30), THREE.MathUtils.smoothstep(Math.abs(u - 22), ST_W / 2 + 8, ST_W / 2 + 26));
    return THREE.MathUtils.smoothstep(clump, 0.28, 0.75) * (0.35 + 0.65 * near) * road * THREE.MathUtils.smoothstep(d, 0, 40);
  };
  const heightAt = (x, z) => {
    const u = x * SIN + z * COS, v = x * COS - z * SIN;
    const du = Math.max(U0 - u, u - U1, 0), dv = Math.max(V0 - v, v - V1, 0);
    const d = Math.hypot(du, dv);
    const t = THREE.MathUtils.smoothstep(d, MARGIN, MARGIN + RAMP);
    if (t <= 0) return 0;
    const far = THREE.MathUtils.smoothstep(d, 900, 2600);
    const n1 = fbm(x * 0.00055 + 11.3, z * 0.00055 + 4.2, 4) * 0.5 + 0.5;
    const n2 = fbm(x * 0.0022 + 1.7, z * 0.0022 + 9.1, 3);
    let h = t * (n1 * n1 * 150 + 8) + far * (n1 * 220 + 40) + t * n2 * 12;
    // road corridors out of town (avenue k=0 at v=-10, cross street j=0 at u=22)
    const corr = Math.min(THREE.MathUtils.smoothstep(Math.abs(v + 10), 30, 260), THREE.MathUtils.smoothstep(Math.abs(u - 22), 22, 200));
    return h * corr;
  };
  return { heightAt, forestAt };
}

/** 7 km ground mesh sampled from the height function. */
function makeGroundGeometry({ heightAt, forestAt }) {
  const SIZE = 7000, SEG = 220;
  const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    // forest floor: canopy shade darkens and cools the ground under dense woodland
    const f = forestAt(x, z);
    col[i * 3] = 1 - 0.62 * f; col[i * 3 + 1] = 1 - 0.50 * f; col[i * 3 + 2] = 1 - 0.55 * f;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** Three vertical cards crossed at 60 degrees; normals point up so all cards shade like a canopy top. */
function makeTreeGeometry() {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.PlaneGeometry(7.5, 10.0);
    g.translate(0, 5.0, 0);
    g.rotateY((i / 3) * Math.PI);
    const n = g.attributes.normal;
    for (let k = 0; k < n.count; k++) n.setXYZ(k, 0, 1, 0);
    parts.push(g);
  }
  return mergeGeometries(parts, false);
}

/** Procedural leaf-cluster card: neutral green base (tinted per instance), darker underside, trunk at the bottom. */
function makeLeafTexture(rng, assets) {
  const size = 256;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  // trunk
  g.fillStyle = '#4a3626';
  g.fillRect(size / 2 - 7, size * 0.55, 14, size * 0.45);
  g.fillStyle = '#3a2a1c';
  g.fillRect(size / 2 - 7, size * 0.55, 5, size * 0.45);
  // leaf clusters: many overlapping soft ellipses inside a canopy silhouette
  const cx = size / 2, cy = size * 0.40, rx = size * 0.44, ry = size * 0.36;
  for (let i = 0; i < 900; i++) {
    const a = rng.range(0, Math.PI * 2), r = Math.sqrt(rng.float());
    const x = cx + Math.cos(a) * rx * r * (0.9 + 0.1 * Math.sin(a * 5));
    const y = cy + Math.sin(a) * ry * r;
    const t = (y - (cy - ry)) / (2 * ry);           // 0 top .. 1 bottom
    const l = 0.62 - t * 0.30 + rng.range(-0.08, 0.08);
    const rr = rng.range(4, 9);
    const rgb = [Math.round(255 * (0.62 * l + 0.10)), Math.round(255 * (0.78 * l + 0.14)), Math.round(255 * (0.36 * l + 0.05))];
    g.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${rng.range(0.85, 1)})`;
    g.beginPath(); g.ellipse(x, y, rr, rr * 0.7, rng.range(0, 3.14), 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 2;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/** Per-frame showcase state: window lights, lamp emissive, wetness. */
export function updateShowcase(dt, ctx, night) {
  const w = ctx.world.weather;
  const n = THREE.MathUtils.clamp(w.night ?? night ?? 0, 0, 1);
  showcaseUniforms.winNight.value = n * showcaseUniforms.winLevel;
  showcaseUniforms.night.value = n;
  showcaseUniforms.wet.value = w.wetness || 0;
  if (M.lampHead) M.lampHead.emissiveIntensity = n * 3.2;
}
