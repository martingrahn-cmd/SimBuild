// Audio showcase backdrop: a "soundscape park" — PBR lawn with stochastic tiling, dirt patches, mown
// stripes and forest-floor darkening under the groves; a T-junction of two streets (asphalt with wheel
// tracks, kerb gutter grime, double-yellow centre, crosswalk, concrete sidewalks with slab joints,
// kerbs); instanced oaks and pines with autumn tints and wind sway; street and park lamps with warm
// halos and ground pools at night; benches; a bandstand at the close-up target. Everything repeated is
// instanced or merged; all randomness from ctx.rng.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RENDER_ORDER } from '../../core/constants.js';
import { makeNoise2D } from '../../core/rng.js';

export const CAMERAS = {
  bandstand: { yaw: 2.6, pitch: 0.24, distance: 70, target: [20, 4, 20] },
  junction: { yaw: -0.5, pitch: 0.55, distance: 140, target: [-50, 0, 60] },
};

const ROAD_Z = 62, ROAD_W = 16, SIDE_W = 3.2, KERB_W = 0.32, KERB_H = 0.14, SIDE_X = -50;
const MAIN_LEN = 1800, SIDE_LEN = 900;
const CROSSWALK_X = 40;
const PARK = { x0: -40, x1: 210, z0: -210, z1: 50 };
const BAND = { x: 20, z: 20 };
const FLOOR_SIZE = 1400;
const HILL_SEED = 4711;
let _noise = null;
const rampUp = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Rolling hills beyond ~400 m from the park; flat along both road corridors; fades out again before the plane edge. */
export function heightAt(x, z) {
  if (!_noise) _noise = makeNoise2D(HILL_SEED);
  const r = Math.hypot(x, z);
  let amp = rampUp(380, 820, r) * (1 - rampUp(1550, 1950, r));
  if (amp <= 0) return 0;
  const dMain = Math.abs(z - ROAD_Z), dSide = z < ROAD_Z ? Math.abs(x - SIDE_X) : 1e9;
  const corridor = Math.min(rampUp(45, 160, dMain), rampUp(45, 160, dSide));
  amp *= corridor;
  const a = _noise.fbm(x / 900 + 3.1, z / 900 + 7.7, 4), b = _noise.fbm(x / 280 + 1.3, z / 280 + 2.9, 3);
  return (Math.max(0, a + 0.12) * 260 + b * 30 + 10) * amp;     // 0..~115 m rolling hills
}

export const U = { time: { value: 0 }, wind: { value: 0.35 }, night: { value: 0 } };
const S = { objects: [], floorTex: null, foliageTex: null, glowTex: null, m4: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), sc: new THREE.Vector3() };

const HASH = /* glsl */`float auHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`;
const WP_VERT = (s) => s
  .replace('#include <common>', '#include <common>\nvarying vec3 vAuW;')
  .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 auWP = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nauWP = instanceMatrix * auWP;\n#endif\nauWP = modelMatrix * auWP; vAuW = auWP.xyz;');
function lowAniso(set) { for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'armMap', 'metalnessMap']) if (set[k]) { set[k].anisotropy = 2; set[k].needsUpdate = true; } return set; }
function withAttr(g, name, v) { const a = new Float32Array(g.attributes.position.count).fill(v); g.setAttribute(name, new THREE.BufferAttribute(a, 1)); return g; }
function colourGeo(g, rng, hex, jitter, gradY) {
  const c = new THREE.Color(hex), pos = g.attributes.position, arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const j = (1 + (rng.float() - 0.5) * jitter) * (gradY ? gradY[0] + (gradY[1] - gradY[0]) * Math.min(1, Math.max(0, pos.getY(i) / gradY[2])) : 1);
    arr[i * 3] = c.r * j; arr[i * 3 + 1] = c.g * j; arr[i * 3 + 2] = c.b * j;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g;
}
function planarUv(g, scale, ox, oy, axis = 0) {
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (axis ? pos.getZ(i) : pos.getX(i)) * scale + ox, pos.getY(i) * scale + oy);
  return g;
}
const inPark = (x, z) => x > PARK.x0 && x < PARK.x1 && z > PARK.z0 && z < PARK.z1;
const onRoad = (x, z, m) => (Math.abs(z - ROAD_Z) < ROAD_W / 2 + SIDE_W + m) || (Math.abs(x - SIDE_X) < ROAD_W / 2 + SIDE_W + m && z < ROAD_Z);

// ---------------------------------------------------------------- vegetation layout (shared by ground mask and instancing)
function layoutTrees(rng) {
  const oaks = [], pines = [];
  const add = (x, z, pine, s) => (pine ? pines : oaks).push({ x, z, s, r: rng.float() * Math.PI * 2, t: rng.float() });
  // park: loose groves, keep the bandstand ring and the lawn in front of the street camera open
  for (let i = 0; i < 130; i++) {
    const x = PARK.x0 + rng.float() * (PARK.x1 - PARK.x0), z = PARK.z0 + rng.float() * (PARK.z1 - PARK.z0);
    const db = Math.hypot(x - BAND.x, z - BAND.z);
    if (db < 34) continue;
    if (x > 10 && x < 80 && z > 20 && z < 52) continue;                 // open lawn between road and bandstand
    if (rng.float() < 0.55 && db < 90) continue;                        // thinner near the bandstand
    add(x, z, rng.float() < 0.18, 0.8 + rng.float() * 0.7);
  }
  // dense tree belts south of the road and north-west, clustered
  const clusters = [];
  for (let k = 0; k < 22; k++) clusters.push({ x: -700 + rng.float() * 1400, z: rng.float() < 0.5 ? 95 + rng.float() * 450 : -260 - rng.float() * 500, r: 40 + rng.float() * 80, pine: rng.float() });
  for (const c of clusters) {
    const n = Math.round(c.r * c.r * 0.0062);
    for (let i = 0; i < n; i++) {
      const a = rng.float() * Math.PI * 2, rr = Math.sqrt(rng.float()) * c.r;
      const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
      if (onRoad(x, z, 6) || inPark(x, z)) continue;
      add(x, z, rng.float() < c.pine * 0.8, 0.85 + rng.float() * 0.9);
    }
  }
  // street trees along the main road's north sidewalk edge, east of the junction
  for (let x = -20; x < 400; x += 22) if (Math.abs(x - CROSSWALK_X) > 8) add(x + rng.range(-1.5, 1.5), ROAD_Z - ROAD_W / 2 - SIDE_W - 3.2, false, 0.7 + rng.float() * 0.25);
  // far belt: forested hills on the horizon (blob LOD), denser on the slopes
  for (let i = 0; i < 1150; i++) {
    const a = rng.float() * Math.PI * 2, rr = 620 + rng.float() * 1250;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (onRoad(x, z, 8)) continue;
    const h = heightAt(x, z);
    if (rng.float() > 0.35 + Math.min(1, Math.max(0, h / 45))) continue;
    add(x, z, rng.float() < 0.45, 1.0 + rng.float() * 0.9);
  }
  for (const list of [oaks, pines]) for (const t of list) t.y = heightAt(t.x, t.z);
  return { oaks, pines };
}

// ---------------------------------------------------------------- ground
function makeFloorMask(trees) {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
  const k = N / FLOOR_SIZE;
  for (const list of [trees.oaks, trees.pines]) for (const t of list) {
    const px = (t.x + FLOOR_SIZE / 2) * k, py = (t.z + FLOOR_SIZE / 2) * k, r = Math.max(2, 7.5 * t.s * k);
    const gr = g.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
async function makeGround(ctx, trees) {
  const [aer, leafy, mud] = await Promise.all([ctx.assets.pbr('aerial_grass_rock', {}), ctx.assets.pbr('leafy_grass', {}), ctx.assets.pbr('brown_mud_leaves_01', {})]);
  lowAniso(aer); lowAniso(leafy); lowAniso(mud);
  S.floorTex = makeFloorMask(trees);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  ctx.assets.applyPbr(m, { map: aer.map, normalMap: leafy.normalMap || aer.normalMap, roughnessMap: aer.roughnessMap }, { normalScale: 0.7 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uLeafy = { value: leafy.map }; s.uniforms.uMud = { value: mud.map }; s.uniforms.uFloor = { value: S.floorTex };
    s.uniforms.uPark = { value: new THREE.Vector4(PARK.x0, PARK.z0, PARK.x1, PARK.z1) };
    s.vertexShader = WP_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vAuW;\nuniform sampler2D uLeafy; uniform sampler2D uMud; uniform sampler2D uFloor; uniform vec4 uPark;\n${HASH}`)
      .replace('#include <map_fragment>', `
        vec2 w = vAuW.xz;
        float dist = length(vViewPosition);
        // macro masks at 3 scales (all sampled from the photo itself so they share its statistics)
        float macroA = texture2D(map, w * 0.00017 + vec2(0.2, 0.7)).g;     // 6 km tint drift
        float macroB = texture2D(map, w * 0.0009 + vec2(0.8, 0.1)).r;      // 1 km selector
        float macroC = texture2D(map, w * 0.0041 + vec2(0.45, 0.25)).b * 0.6 + texture2D(map, w * 0.013 + vec2(0.1, 0.9)).b * 0.4;    // 240 m + 75 m dirt patches
        // stochastic tiling: the 13 m aerial photo sampled twice (rotated 36 deg, rescaled) and picked by macroB
        vec2 uvA = w / 13.0;
        vec2 uvB = vec2(uvA.x * 0.809 - uvA.y * 0.588, uvA.x * 0.588 + uvA.y * 0.809) * 0.87 + vec2(0.37, 0.61);
        vec4 aerA = texture2D(map, uvA), aerB = texture2D(map, uvB);
        vec4 aerial = mix(aerA, aerB, smoothstep(0.32, 0.68, macroB));
        // near detail: leafy grass at 2.4 m, blended in under 140 m
        vec4 near = texture2D(uLeafy, w / 2.4);
        float nearK = 1.0 - smoothstep(60.0, 160.0, dist);
        vec4 grass = mix(aerial, aerial * (0.55 + 0.9 * near), nearK * 0.7);
        // hue drift: lush / mid / dry
        vec3 lush = vec3(0.24, 0.50, 0.16), mid = vec3(0.42, 0.56, 0.22), dry = vec3(0.66, 0.60, 0.32);
        vec3 tint = mix(mix(lush, mid, smoothstep(0.3, 0.6, macroB)), dry, smoothstep(0.5, 0.9, macroA) * 0.6);
        // mown stripes inside the park (6 m, alternating 5 percent) — CS2 lawns have them
        float parkK = step(uPark.x, w.x) * step(w.x, uPark.z) * step(uPark.y, w.y) * step(w.y, uPark.w);
        float stripe = 1.0 + 0.075 * (step(0.5, fract((w.x + w.y * 0.15) / 8.0)) * 2.0 - 1.0) * parkK * (1.0 - smoothstep(500.0, 1100.0, dist));
        vec3 col = grass.rgb * tint * 1.5 * stripe;
        col = mix(col, col * vec3(0.88, 0.9, 0.7), parkK * 0.5);            // park lawn slightly fresher/lighter
        col = mix(col, col * vec3(1.12, 1.0, 0.78), smoothstep(20.0, 70.0, vAuW.y) * 0.55);   // drier, paler grass on the hill tops
        // dirt patches and forest floor
        vec4 mudC = texture2D(uMud, w / 3.1 + vec2(0.13, 0.71));
        float dirtMask = smoothstep(0.56, 0.74, macroC + (aerA.r - 0.45) * 0.25) * smoothstep(0.3, 0.65, macroB) * (1.0 - parkK * 0.6);
        float floorM = texture2D(uFloor, (w + ${(FLOOR_SIZE / 2).toFixed(1)}) / ${FLOOR_SIZE.toFixed(1)}).r;
        floorM *= step(0.0, w.x + ${(FLOOR_SIZE / 2).toFixed(1)}) * step(w.x, ${(FLOOR_SIZE / 2).toFixed(1)}) * step(0.0, w.y + ${(FLOOR_SIZE / 2).toFixed(1)}) * step(w.y, ${(FLOOR_SIZE / 2).toFixed(1)});
        float floorK = smoothstep(0.15, 0.7, floorM);
        col = mix(col, mudC.rgb * vec3(1.0, 0.92, 0.8) * 1.05, max(dirtMask * 0.7, floorK * 0.75));
        col *= 1.0 - floorK * 0.35;
        // far away the photo detail averages out: keep the hue, lose the micro contrast
        float dfade = smoothstep(900.0, 3200.0, dist) * 0.5;
        col = mix(col, vec3(0.34, 0.40, 0.20) * (0.85 + 0.35 * macroA), dfade);
        diffuseColor.rgb *= col;`)
      .replace('#include <normal_fragment_maps>', `
        #ifdef USE_NORMALMAP
          vec3 mapN = texture2D(normalMap, vAuW.xz / 2.4).xyz * 2.0 - 1.0;
          mapN.xy *= normalScale * (1.0 - smoothstep(60.0, 220.0, length(vViewPosition)));
          normal = normalize(tbn * mapN);
        #endif`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, 0.88);');
  };
  const hills = new THREE.PlaneGeometry(4000, 4000, 176, 176);
  hills.rotateX(-Math.PI / 2);
  const hp = hills.attributes.position;
  for (let i = 0; i < hp.count; i++) hp.setY(i, heightAt(hp.getX(i), hp.getZ(i)));
  hills.computeVertexNormals();
  const g = new THREE.Mesh(hills, m);
  g.receiveShadow = true; g.renderOrder = RENDER_ORDER.TERRAIN; g.name = 'audio-ground'; g.frustumCulled = false;
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1), m);
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.08; outer.receiveShadow = true; outer.renderOrder = RENDER_ORDER.TERRAIN - 1; outer.name = 'audio-ground-outer';
  return [g, outer];
}

// ---------------------------------------------------------------- roads
async function makeRoads(ctx) {
  const [asph, conc] = await Promise.all([ctx.assets.pbr('asphalt_02', {}), ctx.assets.pbr('concrete_floor_worn_001', {})]);
  lowAniso(asph); lowAniso(conc);
  const parts = [];
  const tag = (geo, kind, along) => {
    const n = geo.attributes.position.count;
    geo.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(n).fill(kind), 1));
    geo.setAttribute('aAlong', new THREE.BufferAttribute(new Float32Array(n).fill(along), 1));
    parts.push(geo);
  };
  // asphalt strips: uv.x = metres along, uv.y = 0..1 across
  const asphalt = (cx, cz, len, alongX) => {
    const g = new THREE.PlaneGeometry(len, ROAD_W, 1, 1);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len);
    g.rotateX(-Math.PI / 2); if (!alongX) g.rotateY(Math.PI / 2);
    g.translate(cx, 0.03, cz); tag(g, 0, alongX ? 1 : 0);
  };
  const slab = (cx, cz, len, w, alongX, kind) => {
    const h = kind === 2 ? KERB_H : KERB_H - 0.02;
    const g = new THREE.BoxGeometry(alongX ? len : w, h, alongX ? w : len);
    g.translate(cx, h / 2, cz); tag(g, kind, alongX ? 1 : 0);
  };
  const half = ROAD_W / 2;
  asphalt(0, ROAD_Z, MAIN_LEN, true);
  asphalt(SIDE_X, ROAD_Z - half - SIDE_LEN / 2, SIDE_LEN, false);
  // main road sidewalks + kerbs; north side has a gap at the junction
  const sX0 = -MAIN_LEN / 2, sX1 = MAIN_LEN / 2;
  const segs = [[sX0, SIDE_X - half - SIDE_W], [SIDE_X + half + SIDE_W, sX1]];
  const sideZ = (sign) => ROAD_Z + sign * (half + SIDE_W / 2), kerbZ = (sign) => ROAD_Z + sign * (half - KERB_W / 2);
  slab((sX0 + sX1) / 2, sideZ(1), sX1 - sX0, SIDE_W, true, 1); slab((sX0 + sX1) / 2, kerbZ(1), sX1 - sX0, KERB_W, true, 2);
  for (const [a, b] of segs) { slab((a + b) / 2, sideZ(-1), b - a, SIDE_W, true, 1); slab((a + b) / 2, kerbZ(-1), b - a, KERB_W, true, 2); }
  // side road sidewalks + kerbs (run north from the main road's sidewalk edge)
  const zTop = ROAD_Z - half - SIDE_W, zEnd = ROAD_Z - half - SIDE_LEN;
  for (const sign of [-1, 1]) {
    slab(SIDE_X + sign * (half + SIDE_W / 2), (zTop + zEnd) / 2, zTop - zEnd, SIDE_W, false, 1);
    slab(SIDE_X + sign * (half - KERB_W / 2), (zTop + zEnd) / 2, zTop - zEnd, KERB_W, false, 2);
  }
  const geo = mergeGeometries(parts, false);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  ctx.assets.applyPbr(m, { map: asph.map, normalMap: asph.normalMap, roughnessMap: asph.roughnessMap, aoMap: null }, { normalScale: 0.9 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uSideMap = { value: conc.map }; s.uniforms.uSideRough = { value: conc.roughnessMap || conc.map };
    s.vertexShader = WP_VERT(s.vertexShader)
      .replace('varying vec3 vAuW;', 'varying vec3 vAuW; attribute float aKind; attribute float aAlong; varying float vKind; varying float vAlong; varying vec2 vRoad;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvKind = aKind; vAlong = aAlong; vRoad = uv;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform sampler2D uSideMap; uniform sampler2D uSideRough; varying float vKind; varying float vAlong; varying vec2 vRoad; varying vec3 vAuW;\n${HASH}`)
      .replace('#include <map_fragment>', `
        vec2 w = vAuW.xz;
        float dist = length(vViewPosition);
        if (vKind > 1.5) {
          // kerb: pale precast concrete, slightly lighter top, joints every 1 m
          vec4 c = texture2D(uSideMap, w / 1.3);
          float j = vAlong > 0.5 ? w.x : w.y;
          float joint = 1.0 - 0.25 * (1.0 - smoothstep(0.02, 0.05, abs(fract(j) - 0.5) - 0.45));
          diffuseColor.rgb *= c.rgb * vec3(1.02, 1.0, 0.96) * 1.18 * joint;
        } else if (vKind > 0.5) {
          // sidewalk: 1.5 m slabs with 1.5 cm joints, per-slab tone, grime toward the kerb
          vec4 c = texture2D(uSideMap, w / 2.6);
          vec2 p = w / 1.5;
          vec2 f = abs(fract(p) - 0.5);
          float joint = 1.0 - 0.32 * (1.0 - smoothstep(0.478, 0.495, max(f.x, f.y))) * (1.0 - smoothstep(60.0, 220.0, dist));
          float tone = 0.9 + 0.16 * auHash(floor(p));
          diffuseColor.rgb *= c.rgb * vec3(0.97, 0.96, 0.93) * 1.05 * joint * tone;
        } else {
          // asphalt: two rotated photo samples picked by a 40 m mask, 3 m cell tone noise
          vec2 uvA = w / 5.0;
          vec2 uvB = vec2(uvA.x * 0.766 - uvA.y * 0.643, uvA.x * 0.643 + uvA.y * 0.766) * 0.9 + vec2(0.5, 0.2);
          float sel = texture2D(map, w * 0.011).g;
          vec4 a = mix(texture2D(map, uvA), texture2D(map, uvB), smoothstep(0.35, 0.65, sel));
          float cell = 0.86 + 0.16 * auHash(floor(w / 3.0));
          float patchK = 0.92 + 0.16 * texture2D(map, w * 0.021 + vec2(0.7, 0.3)).r;
          vec3 col = a.rgb * vec3(0.96, 0.97, 1.0) * cell * patchK;
          float v = vRoad.y, u = vRoad.x;
          // wheel tracks: lighter, smoother at v = 0.25/0.75 +- 0.09; darker oil strip at lane centre; kerb gutter grime
          float track = 0.0;
          for (int k = 0; k < 4; k++) { float tc = (k < 2) ? 0.25 : 0.75; float off = (k == 0 || k == 2) ? -0.095 : 0.095; track += 1.0 - smoothstep(0.02, 0.05, abs(v - tc - off)); }
          track = clamp(track, 0.0, 1.0);
          float oil = (1.0 - smoothstep(0.02, 0.055, abs(v - 0.25))) + (1.0 - smoothstep(0.02, 0.055, abs(v - 0.75)));
          float gutter = 1.0 - smoothstep(0.0, 0.05, min(v, 1.0 - v));
          col *= 1.0 + 0.16 * track - 0.12 * oil - 0.26 * gutter;
          // markings: double yellow centre, white edge lines, crosswalk zebra, stop line at the junction mouth
          float dbl = (1.0 - smoothstep(0.004, 0.008, abs(abs(v - 0.5) - 0.012)));
          float edge = (1.0 - smoothstep(0.004, 0.008, abs(v - 0.035))) + (1.0 - smoothstep(0.004, 0.008, abs(v - 0.965)));
          float wearP = 0.55 + 0.45 * smoothstep(0.35, 0.65, texture2D(map, w * 0.13).b);
          float zebra = 0.0, stop = 0.0;
          if (vAlong > 0.5) {
            float cx = w.x - ${CROSSWALK_X.toFixed(1)};
            zebra = step(-2.2, cx) * step(cx, 2.2) * step(0.06, v) * step(v, 0.94) * step(0.5, fract((v - 0.06) * 8.8));
          } else {
            float dz = ${(ROAD_Z - ROAD_W / 2).toFixed(1)} - w.y;
            stop = step(1.2, dz) * step(dz, 1.7) * step(0.03, v) * step(v, 0.5);
            zebra = step(3.0, dz) * step(dz, 6.0) * step(0.06, v) * step(v, 0.94) * step(0.5, fract((v - 0.06) * 8.8));
          }
          float dashMain = vAlong > 0.5 ? 1.0 : step(0.5, fract(u / 6.0));
          float yellow = dbl * dashMain * (1.0 - zebra);
          float white = clamp(edge * (1.0 - zebra) + zebra + stop, 0.0, 1.0);
          col = mix(col, vec3(0.86, 0.66, 0.16), yellow * 0.85 * wearP);
          col = mix(col, vec3(0.86, 0.85, 0.80), white * 0.9 * wearP);
          diffuseColor.rgb *= col;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        if (vKind > 0.5) roughnessFactor = 0.86 + 0.1 * texture2D(uSideRough, vAuW.xz / 2.6).g;
        else { float v2 = vRoad.y; float tr = 0.0; for (int k = 0; k < 4; k++) { float tc = (k < 2) ? 0.25 : 0.75; float off = (k == 0 || k == 2) ? -0.095 : 0.095; tr += 1.0 - smoothstep(0.02, 0.06, abs(v2 - tc - off)); } roughnessFactor = mix(roughnessFactor, 0.55, clamp(tr, 0.0, 1.0) * 0.5); }`)
      .replace('#include <normal_fragment_maps>', `
        #ifdef USE_NORMALMAP
          vec3 mapN = texture2D(normalMap, vAuW.xz / 5.0).xyz * 2.0 - 1.0;
          mapN.xy *= normalScale * (vKind > 0.5 ? 0.25 : 1.0) * (1.0 - smoothstep(80.0, 300.0, length(vViewPosition)));
          normal = normalize(tbn * mapN);
        #endif`);
  };
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true; mesh.castShadow = false; mesh.renderOrder = RENDER_ORDER.ROADS; mesh.name = 'audio-roads';
  return mesh;
}

// ---------------------------------------------------------------- gravel paths (ring around the bandstand + spur to the sidewalk)
async function makePaths(ctx) {
  const set = lowAniso(await ctx.assets.pbr('gravel_floor_02', {}));
  const parts = [];
  const ring = new THREE.RingGeometry(22, 25.5, 48, 1);
  const ruv = ring.attributes.uv, rp = ring.attributes.position;
  for (let i = 0; i < ruv.count; i++) { const r = Math.hypot(rp.getX(i), rp.getY(i)); ruv.setXY(i, Math.atan2(rp.getY(i), rp.getX(i)) * 8, (r - 22) / 3.5); }
  ring.rotateX(-Math.PI / 2); ring.translate(BAND.x, 0.035, BAND.z); parts.push(ring);
  const strip = (x, z, len, w, ang) => {
    const g = new THREE.PlaneGeometry(len, w, 1, 1);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 3, uv.getY(i));
    g.rotateX(-Math.PI / 2); g.rotateY(ang); g.translate(x, 0.035, z); parts.push(g);
  };
  strip(BAND.x + 20, (ROAD_Z - ROAD_W / 2 - SIDE_W + BAND.z + 24) / 2 + 1, ROAD_Z - ROAD_W / 2 - SIDE_W - (BAND.z + 24) + 2, 3.2, Math.PI / 2);   // spur to the road
  strip(BAND.x - 60, BAND.z, 76, 3, 0);                                   // west spur
  strip(BAND.x, BAND.z - 90, 132, 3, Math.PI / 2);                        // north spur
  const geo = mergeGeometries(parts, false);
  const m = new THREE.MeshStandardMaterial({ color: 0xb9ae9a, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, transparent: true, depthWrite: false });
  ctx.assets.applyPbr(m, { map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap }, { normalScale: 0.7 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = WP_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vAuW;')
      .replace('#include <map_fragment>', `
        vec4 c = texture2D(map, vAuW.xz / 2.2);
        float e = smoothstep(0.0, 0.2, min(vMapUv.y, 1.0 - vMapUv.y));
        diffuseColor *= c * vec4(1.0, 0.97, 0.9, 1.0);
        diffuseColor.a *= 0.3 + 0.6 * e;`);
  };
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true; mesh.renderOrder = RENDER_ORDER.ROADS + 1; mesh.name = 'audio-paths';
  return mesh;
}

// ---------------------------------------------------------------- trees
function makeFoliageTexture(rng) {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  g.clearRect(0, 0, N, N);
  g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, 40, 40);
  g.fillStyle = '#626262'; for (let i = 0; i < 14; i++) g.fillRect(rng.int(0, 36), rng.int(0, 36), 2, rng.int(4, 16));
  for (let i = 0; i < 260; i++) {
    const x = rng.range(0, N), y = rng.range(0, N), r = rng.range(4.5, 12), a = rng.range(0, Math.PI);
    const l = 0.5 + 0.55 * rng.float();
    g.fillStyle = `rgb(${Math.round(118 * l)},${Math.round(160 * l)},${Math.round(66 * l)})`;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
      g.save(); g.translate(x + ox, y + oy); g.rotate(a); g.beginPath(); g.ellipse(0, 0, r, r * 0.5, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function foliageMaterial(tex, alphaTest) {
  const m = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.94, metalness: 0, alphaTest, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time; s.uniforms.uWind = U.wind;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTint; attribute float aLeaf; varying float vTint; varying float vLeaf; uniform float uTime; uniform float uWind;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING\nvTint = aTint;\n#else\nvTint = 0.0;\n#endif\nvLeaf = aLeaf;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        // wind sway: whole-crown lean plus leaf flutter, phase from the instance position
        #ifdef USE_INSTANCING
          vec2 ip = instanceMatrix[3].xz;
        #else
          vec2 ip = vec2(0.0);
        #endif
        float ph = ip.x * 0.11 + ip.y * 0.07;
        float h = clamp(transformed.y / 7.0, 0.0, 1.0);
        float sway = sin(uTime * 1.1 + ph) * 0.6 + sin(uTime * 2.3 + ph * 1.7) * 0.25;
        transformed.x += sway * uWind * h * h * 0.9;
        transformed.z += cos(uTime * 0.9 + ph) * uWind * h * h * 0.35;
        transformed.y += sin(uTime * 3.7 + ph + transformed.x) * uWind * aLeaf * 0.06;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTint; varying float vLeaf;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 yellow = vec3(0.88, 0.72, 0.20), orange = vec3(0.86, 0.44, 0.12);
        vec3 leaf = diffuseColor.rgb;
        leaf = mix(leaf, leaf * 1.15 * yellow / vec3(0.47, 0.65, 0.27), smoothstep(0.58, 0.8, vTint));
        leaf = mix(leaf, leaf * orange / max(leaf, vec3(0.05)) * 0.9, smoothstep(0.82, 0.97, vTint));
        diffuseColor.rgb = mix(diffuseColor.rgb, leaf, vLeaf);`)
      .replace('#include <lights_fragment_begin>', '#include <lights_fragment_begin>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * 0.08 * vLeaf;');
  };
  return m;
}
function trunkGeo(rng, h, r0, r1) {
  const t = new THREE.CylinderGeometry(r0, r1, h, 7, 1, true).toNonIndexed(); t.translate(0, h / 2, 0);
  const uv = t.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.06 + 0.04 * uv.getX(i), 0.06 + 0.04 * uv.getY(i));
  colourGeo(t, rng, 0x86705a, 0.25, [1.25, 1.8, h]); withAttr(t, 'aLeaf', 0); return t;
}
function oakGeo(rng, detail = 1) {
  const parts = [trunkGeo(rng, 3.8, 0.24, 0.5)];
  const clusters = detail ? [[0, 6.0, 0, 3.4], [1.6, 4.8, 1.0, 2.4], [-1.5, 5.1, -0.9, 2.3], [0.4, 4.2, -1.8, 2.0], [-0.6, 7.4, 0.8, 1.9]] : [[0, 6.0, 0, 3.6], [1.5, 4.9, 1.0, 2.5], [-1.4, 5.0, -1.0, 2.4]];
  clusters.forEach(([ox, oy, oz, r], k) => {
    const g = new THREE.IcosahedronGeometry(r, detail);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const j = 1 + (rng.float() - 0.5) * 0.32; pos.setXYZ(i, pos.getX(i) * j * 1.1 + ox, pos.getY(i) * j * 0.82 + oy, pos.getZ(i) * j + oz); }
    g.computeVertexNormals();
    planarUv(g, 0.42, k * 0.23, k * 0.31, k & 1);
    colourGeo(g, rng, 0x4f9a3c, 0.35, [0.55, 1.05, 8.5]); withAttr(g, 'aLeaf', 1);
    parts.push(g);
  });
  // opaque shaded core so the crown never shows sky through it
  const core = new THREE.IcosahedronGeometry(2.9, detail); core.scale(1.15, 0.9, 1.05); core.translate(0, 5.6, 0);
  const cuv = core.attributes.uv; for (let i = 0; i < cuv.count; i++) cuv.setXY(i, 0.06 + 0.04 * cuv.getX(i), 0.06 + 0.04 * cuv.getY(i));
  colourGeo(core, rng, 0x2f5a22, 0.3, [1.3, 2.1, 8.5]); withAttr(core, 'aLeaf', 1); parts.push(core);
  return mergeGeometries(parts, false);
}
function pineGeo(rng) {
  const parts = [trunkGeo(rng, 10, 0.17, 0.38)];
  const tiers = [[2.8, 3.1, 4.4], [5.2, 2.5, 3.8], [7.4, 1.8, 3.1], [9.4, 1.05, 2.3]];
  tiers.forEach(([y, r, h], k) => {
    const g = new THREE.ConeGeometry(r, h, 8, 1, true).toNonIndexed(); g.translate(0, y + h / 2, 0);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const j = 1 + (rng.float() - 0.5) * 0.22; pos.setXYZ(i, pos.getX(i) * j, pos.getY(i), pos.getZ(i) * j); }
    g.computeVertexNormals();
    planarUv(g, 0.55, k * 0.37, k * 0.19, k & 1);
    colourGeo(g, rng, 0x2e5c33, 0.3, [0.6, 1.0, 11]); withAttr(g, 'aLeaf', 1);
    parts.push(g);
  });
  const core = new THREE.ConeGeometry(2.3, 8.6, 8, 1, false); core.translate(0, 2.4 + 4.3, 0);
  const cuv = core.attributes.uv; for (let i = 0; i < cuv.count; i++) cuv.setXY(i, 0.06 + 0.04 * cuv.getX(i), 0.06 + 0.04 * cuv.getY(i));
  colourGeo(core, rng, 0x1f3d22, 0.25, [1.2, 2.0, 11]); withAttr(core, 'aLeaf', 1); parts.push(core.toNonIndexed());
  return mergeGeometries(parts, false);
}
function instanceTrees(geo, mat, list, name) {
  const n = list.length;
  const tint = new Float32Array(n); list.forEach((t, i) => { tint[i] = t.t; });
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const { m4, q, v, sc } = S;
  list.forEach((t, i) => { q.setFromAxisAngle(v.set(0, 1, 0), t.r); sc.set(t.s, t.s * (0.92 + t.t * 0.25), t.s); m4.compose(v.set(t.x, (t.y || 0) - 0.15, t.z), q, sc); mesh.setMatrixAt(i, m4); });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.renderOrder = RENDER_ORDER.PROPS; mesh.name = name;
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------- lamps (street + park) with halos and ground pools
function lampGeo(rng, kind) {
  const parts = [];
  const metal = (g) => { colourGeo(g, rng, 0x3a3d40, 0.08); withAttr(g, 'aEmit', 0); return g; };
  if (kind === 'street') {
    const post = new THREE.CylinderGeometry(0.09, 0.14, 8.5, 8, 1); post.translate(0, 4.25, 0); parts.push(metal(post));
    const base = new THREE.CylinderGeometry(0.2, 0.24, 0.5, 8, 1); base.translate(0, 0.25, 0); parts.push(metal(base));
    const arm = new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6, 1); arm.rotateZ(Math.PI / 2 - 0.22); arm.translate(1.2, 8.55, 0); parts.push(metal(arm));
    const head = new THREE.BoxGeometry(0.9, 0.16, 0.34); head.translate(2.35, 8.7, 0); parts.push(metal(head));
    const glass = new THREE.BoxGeometry(0.7, 0.05, 0.26); glass.translate(2.35, 8.6, 0); colourGeo(glass, rng, 0xfff2d0, 0); withAttr(glass, 'aEmit', 1); parts.push(glass);
  } else {
    const post = new THREE.CylinderGeometry(0.06, 0.1, 3.6, 8, 1); post.translate(0, 1.8, 0); parts.push(metal(post));
    const base = new THREE.CylinderGeometry(0.16, 0.2, 0.3, 8, 1); base.translate(0, 0.15, 0); parts.push(metal(base));
    const cap = new THREE.ConeGeometry(0.42, 0.28, 8, 1); cap.translate(0, 4.32, 0); parts.push(metal(cap));
    const globe = new THREE.SphereGeometry(0.3, 10, 8); globe.translate(0, 3.95, 0); colourGeo(globe, rng, 0xfff0cc, 0); withAttr(globe, 'aEmit', 1); parts.push(globe);
  }
  return mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
}
function lampMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.5, metalness: 0.55 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uNight = U.night;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aEmit; varying float vEmit;').replace('#include <color_vertex>', '#include <color_vertex>\nvEmit = aEmit;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; varying float vEmit;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - vEmit; roughnessFactor = mix(roughnessFactor, 0.3, vEmit);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmit * uNight * vec3(1.0, 0.78, 0.5) * 3.0;');
  };
  return m;
}
function layoutLamps() {
  const street = [], park = [];
  for (let x = -404; x <= 420; x += 28) {
    if (Math.abs(x - SIDE_X) < 12) continue;
    street.push({ x, z: ROAD_Z + ROAD_W / 2 + SIDE_W - 0.6, r: Math.PI / 2 });           // south side, arm points north over the road
    street.push({ x: x + 14, z: ROAD_Z - ROAD_W / 2 - SIDE_W + 0.6, r: -Math.PI / 2 });  // north side, staggered
  }
  for (let z = ROAD_Z - ROAD_W / 2 - 20; z > ROAD_Z - 440; z -= 28) {
    street.push({ x: SIDE_X - ROAD_W / 2 - SIDE_W + 0.6, z, r: 0 });
    street.push({ x: SIDE_X + ROAD_W / 2 + SIDE_W - 0.6, z: z - 14, r: Math.PI });
  }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; park.push({ x: BAND.x + Math.cos(a) * 27.5, z: BAND.z + Math.sin(a) * 27.5, r: 0 }); }
  for (let k = 0; k < 3; k++) park.push({ x: BAND.x + 22.5, z: BAND.z + 32 + k * 9, r: 0 });
  return { street, park };
}
function instanceSimple(geo, mat, list, name, cast = true) {
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  const { m4, q, v, sc } = S;
  list.forEach((t, i) => { q.setFromAxisAngle(v.set(0, 1, 0), t.r || 0); sc.set(1, 1, 1); m4.compose(v.set(t.x, t.y || 0, t.z), q, sc); mesh.setMatrixAt(i, m4); });
  mesh.castShadow = cast; mesh.receiveShadow = true; mesh.renderOrder = RENDER_ORDER.PROPS; mesh.name = name; mesh.frustumCulled = false;
  return mesh;
}
function makeGlowTexture() {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, N, N);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Halos (billboards at the lamp head) and warm ground pools in one instanced draw; aFlat picks the mode. */
function makeGlow(street, park) {
  const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
  const items = [];
  for (const l of street) { const hx = l.x + Math.cos(l.r) * 2.35, hz = l.z - Math.sin(l.r) * 2.35; items.push({ x: hx, y: 8.6, z: hz, s: 5, flat: 0 }); items.push({ x: hx, y: 0.06, z: hz, s: 22, flat: 1 }); }
  for (const l of park) { items.push({ x: l.x, y: 3.95, z: l.z, s: 3.2, flat: 0 }); items.push({ x: l.x, y: 0.06, z: l.z, s: 11, flat: 1 }); }
  const flat = new Float32Array(items.length), size = new Float32Array(items.length);
  items.forEach((it, i) => { flat[i] = it.flat; size[i] = it.s; });
  geo.setAttribute('aFlat', new THREE.InstancedBufferAttribute(flat, 1));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));
  const m = new THREE.MeshBasicMaterial({ map: S.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb870, fog: false });
  m.onBeforeCompile = (s) => {
    s.uniforms.uNight = U.night;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFlat; attribute float aSize; varying float vFlat;')
      .replace('#include <project_vertex>', `
        vFlat = aFlat;
        vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec4 mvPosition;
        if (aFlat > 0.5) {
          mvPosition = viewMatrix * vec4(centre + vec3(position.x, 0.0, -position.y) * aSize, 1.0);
        } else {
          mvPosition = viewMatrix * vec4(centre, 1.0);
          mvPosition.xy += position.xy * aSize;
        }
        gl_Position = projectionMatrix * mvPosition;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; varying float vFlat;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= uNight * mix(0.55, 0.28, vFlat);');
  };
  const mesh = new THREE.InstancedMesh(geo, m, items.length);
  const { m4, q, v, sc } = S;
  items.forEach((it, i) => { q.identity(); sc.set(1, 1, 1); m4.compose(v.set(it.x, it.y, it.z), q, sc); mesh.setMatrixAt(i, m4); });
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = RENDER_ORDER.TRANSPARENT; mesh.name = 'audio-glow'; mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------- benches
function benchGeo(rng) {
  const parts = [];
  const wood = (g) => { colourGeo(g, rng, 0x8a6a48, 0.18); return g; };
  const iron = (g) => { colourGeo(g, rng, 0x2c2e30, 0.06); return g; };
  for (let k = 0; k < 4; k++) { const s = new THREE.BoxGeometry(1.8, 0.04, 0.09); s.translate(0, 0.46, -0.2 + k * 0.13); parts.push(wood(s)); }
  for (let k = 0; k < 3; k++) { const s = new THREE.BoxGeometry(1.8, 0.09, 0.04); s.translate(0, 0.62 + k * 0.13, -0.3); parts.push(wood(s)); }
  for (const x of [-0.75, 0.75]) {
    const leg = new THREE.BoxGeometry(0.06, 0.44, 0.5); leg.translate(x, 0.22, 0); parts.push(iron(leg));
    const back = new THREE.BoxGeometry(0.06, 0.5, 0.05); back.translate(x, 0.7, -0.3); parts.push(iron(back));
  }
  return mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
}
function layoutBenches() {
  const list = [];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.6; list.push({ x: BAND.x + Math.cos(a) * 20.2, z: BAND.z + Math.sin(a) * 20.2, r: -a + Math.PI / 2 }); }
  for (const x of [-10, 70, 96, 150]) list.push({ x, z: ROAD_Z - ROAD_W / 2 - SIDE_W - 1.3, r: Math.PI });
  return list;
}

// ---------------------------------------------------------------- bandstand
async function makeBandstand(ctx, rng) {
  const conc = lowAniso(await ctx.assets.pbr('concrete_floor_worn_001', {}));
  const x = BAND.x, z = BAND.z;
  // plinth + two steps (concrete)
  const stone = [];
  for (const [r, h] of [[7.6, 0.16], [7.0, 0.32], [6.4, 0.5]]) { const g = new THREE.CylinderGeometry(r, r, h, 8, 1); g.rotateY(Math.PI / 8); g.translate(x, h / 2, z); stone.push(g.toNonIndexed()); }
  const stoneGeo = mergeGeometries(stone, false);
  const sp = stoneGeo.attributes.position, suv = stoneGeo.attributes.uv;
  for (let i = 0; i < sp.count; i++) suv.setXY(i, sp.getX(i) / 2.5, (sp.getZ(i) + sp.getY(i) * 3.0) / 2.5);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  ctx.assets.applyPbr(stoneMat, { map: conc.map, normalMap: conc.normalMap, roughnessMap: conc.roughnessMap }, { normalScale: 0.5 });
  stoneMat.onBeforeCompile = (s) => {
    s.vertexShader = WP_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vAuW;\n${HASH}`)
      .replace('#include <map_fragment>', `
        vec4 c = texture2D(map, vMapUv);
        vec2 f = abs(fract(vAuW.xz / 1.25) - 0.5);
        float joint = 1.0 - 0.25 * (1.0 - smoothstep(0.47, 0.49, max(f.x, f.y))) * step(0.45, vAuW.y);
        diffuseColor.rgb *= c.rgb * vec3(0.9, 0.89, 0.86) * joint * (0.92 + 0.12 * auHash(floor(vAuW.xz / 1.25)));`);
  };
  const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
  stoneMesh.castShadow = true; stoneMesh.receiveShadow = true; stoneMesh.name = 'audio-bandstand-plinth'; stoneMesh.renderOrder = RENDER_ORDER.BUILDINGS;

  // painted wood: columns, capitals, railing, fascia, ceiling
  const wood = [];
  const paint = (g, hex = 0xf1ece2, j = 0.05) => { colourGeo(g, rng, hex, j); wood.push(g.toNonIndexed()); };
  const R = 5.3, TOP = 3.6;
  const colPos = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8, cx = x + Math.cos(a) * R, cz = z + Math.sin(a) * R;
    colPos.push([cx, cz, a]);
    const col = new THREE.CylinderGeometry(0.17, 0.2, TOP - 0.5, 10, 1); col.translate(cx, 0.5 + (TOP - 0.5) / 2, cz); paint(col);
    const capB = new THREE.CylinderGeometry(0.3, 0.2, 0.22, 10, 1); capB.translate(cx, TOP - 0.11, cz); paint(capB);
    const capL = new THREE.CylinderGeometry(0.22, 0.3, 0.16, 10, 1); capL.translate(cx, 0.58, cz); paint(capL);
  }
  // railing between columns (leave the two south-east bays open for the steps)
  for (let k = 0; k < 8; k++) {
    if (k === 1 || k === 2) continue;
    const [ax, az] = colPos[k], [bx, bz] = colPos[(k + 1) % 8];
    const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    for (const [y, h] of [[1.08, 0.08], [0.66, 0.05]]) { const rail = new THREE.BoxGeometry(len - 0.4, h, 0.08); rail.rotateY(-ang); rail.translate(mx, y, mz); paint(rail, 0xe8e2d6); }
    const nb = Math.floor((len - 0.5) / 0.32);
    for (let i = 0; i < nb; i++) {
      const t = (i + 0.5) / nb; const bx2 = ax + (bx - ax) * t, bz2 = az + (bz - az) * t;
      const b = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 5, 1); b.translate(bx2, 0.87, bz2); paint(b, 0xe8e2d6, 0.03);
    }
  }
  // fascia ring under the roof edge and the ceiling disc
  const fascia = new THREE.CylinderGeometry(6.0, 6.0, 0.36, 8, 1, true); fascia.rotateY(Math.PI / 8); fascia.translate(x, TOP + 0.18, z); paint(fascia, 0xe9e3d8);
  const ceiling = new THREE.CircleGeometry(6.0, 8); ceiling.rotateX(Math.PI / 2); ceiling.rotateY(Math.PI / 8); ceiling.translate(x, TOP + 0.02, z); paint(ceiling, 0xcfc6b8, 0.03);
  const woodGeo = mergeGeometries(wood, false);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.55, metalness: 0 });
  const woodMesh = new THREE.Mesh(woodGeo, woodMat);
  woodMesh.castShadow = true; woodMesh.receiveShadow = true; woodMesh.name = 'audio-bandstand-wood'; woodMesh.renderOrder = RENDER_ORDER.BUILDINGS;

  // standing-seam metal roof + finial
  const roofParts = [];
  const roof = new THREE.ConeGeometry(6.6, 2.9, 8, 1, false); roof.rotateY(Math.PI / 8); roof.translate(x, TOP + 0.36 + 1.45, z);
  const rp = roof.attributes.position, ruv = roof.attributes.uv;
  for (let i = 0; i < rp.count; i++) { const dx = rp.getX(i) - x, dz = rp.getZ(i) - z; ruv.setXY(i, Math.atan2(dz, dx) * 6.6, Math.hypot(dx, dz)); }
  roofParts.push(roof.toNonIndexed());
  const fin = new THREE.SphereGeometry(0.22, 10, 8); fin.translate(x, TOP + 0.36 + 2.9 + 0.3, z); roofParts.push(fin.toNonIndexed());
  const finRod = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6, 1); finRod.translate(x, TOP + 0.36 + 2.9 + 0.05, z); roofParts.push(finRod.toNonIndexed());
  const roofGeo = mergeGeometries(roofParts, false);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3f5b4f, roughness: 0.48, metalness: 0.35 });
  roofMat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRoofUv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoofUv = uv;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 vRoofUv;\n${HASH}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // standing seams every 0.55 m along the panel, slight panel tone variation, weathering toward the eave
        float seam = 1.0 - 0.28 * (1.0 - smoothstep(0.02, 0.05, abs(fract(vRoofUv.x / 0.55) - 0.5) - 0.44));
        float tone = 0.94 + 0.1 * auHash(floor(vec2(vRoofUv.x / 0.55, 0.0)));
        float eave = 1.0 - 0.12 * smoothstep(4.0, 6.6, vRoofUv.y);
        diffuseColor.rgb *= seam * tone * eave;`);
  };
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.castShadow = true; roofMesh.receiveShadow = true; roofMesh.name = 'audio-bandstand-roof'; roofMesh.renderOrder = RENDER_ORDER.BUILDINGS;
  return [stoneMesh, woodMesh, roofMesh];
}

// ---------------------------------------------------------------- public
export async function setupScene(ctx) {
  const rng = ctx.rng.fork('scene');
  const trees = layoutTrees(rng.fork('trees'));
  S.foliageTex = makeFoliageTexture(rng.fork('foliage'));
  S.glowTex = makeGlowTexture();
  const [grounds, roads, paths, bandstand] = await Promise.all([makeGround(ctx, trees), makeRoads(ctx), makePaths(ctx), makeBandstand(ctx, rng.fork('bandstand'))]);
  // near oaks (within 260 m of the bandstand) get the 5-cluster crown; far ones a 3-blob crown at icosahedron detail 0
  const nearOaks = trees.oaks.filter((t) => Math.hypot(t.x - BAND.x, t.z - BAND.z) < 260), farOaks = trees.oaks.filter((t) => Math.hypot(t.x - BAND.x, t.z - BAND.z) >= 260);
  const foliage = foliageMaterial(S.foliageTex, 0.5);
  const oaks = instanceTrees(oakGeo(rng.fork('oak'), 1), foliage, nearOaks, 'audio-oaks');
  const oaksFar = instanceTrees(oakGeo(rng.fork('oakfar'), 0), foliage, farOaks, 'audio-oaks-far');
  const pines = instanceTrees(pineGeo(rng.fork('pine')), foliageMaterial(S.foliageTex, 0.42), trees.pines, 'audio-pines');
  const lamps = layoutLamps();
  const lampMat = lampMaterial();
  const streetLamps = instanceSimple(lampGeo(rng.fork('lamp'), 'street'), lampMat, lamps.street, 'audio-lamps-street');
  const parkLamps = instanceSimple(lampGeo(rng.fork('parklamp'), 'park'), lampMat, lamps.park, 'audio-lamps-park');
  const glow = makeGlow(lamps.street, lamps.park);
  const benchMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.7, metalness: 0.1 });
  const benches = instanceSimple(benchGeo(rng.fork('bench')), benchMat, layoutBenches(), 'audio-benches');
  for (const o of [...grounds, roads, paths, oaks, oaksFar, pines, streetLamps, parkLamps, glow, benches, ...bandstand]) { ctx.group.add(o); S.objects.push(o); }
  return { trees: trees.oaks.length + trees.pines.length, lamps: lamps.street.length + lamps.park.length };
}

/** Per-frame: wind sway strength from the weather, lamp night factor from the environment. */
export function updateScene(ctx, dt) {
  const w = ctx.world.weather;
  U.time.value += dt;
  U.wind.value = 0.12 + Math.min(1, (w.wind?.speed || 0) / 9) * 0.55;
  U.night.value = w.night ?? (ctx.clock.isNight() ? 1 : 0);
}

export function disposeScene(ctx) {
  for (const o of S.objects) { ctx.group.remove(o); o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose()); else o.material?.dispose?.(); }
  S.objects.length = 0;
  S.floorTex?.dispose(); S.foliageTex?.dispose(); S.glowTex?.dispose();
  S.floorTex = S.foliageTex = S.glowTex = null;
}
