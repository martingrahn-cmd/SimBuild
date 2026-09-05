// Road materials: asphalt (PBR + procedural lane markings, wheel-track wear, kerb-side AO and macro colour noise
// in the shader), concrete (kerbs, sidewalks, barriers, bridge structure), gravel (embankment skirts) and paint
// (decal markings: crosswalks, stop/yield lines, arrows, gore hatching) with world-space wear.
import * as THREE from 'three';
import { RENDER_ORDER } from '../../core/constants.js';

const WORLD_VARYING_VS = /* glsl */`
attribute vec4 aRoad;
varying vec4 vRoad;
flat varying float vRoadFlags;
varying vec3 vRoadW;
varying vec2 vRoadUv;
`;
const WORLD_VARYING_FS = /* glsl */`
uniform sampler2D uRoadNoise;
varying vec4 vRoad;
flat varying float vRoadFlags;
varying vec3 vRoadW;
varying vec2 vRoadUv;
// box-filtered coverage of a line of half width hw by a pixel footprint px centred at distance d from the line
float roadLine(float d, float hw, float px) {
  float lo = max(d - px * 0.5, -hw), hi = min(d + px * 0.5, hw);
  return clamp((hi - lo) / px, 0.0, 1.0);
}
`;
const WORLD_ASSIGN_VS = /* glsl */`
vRoad = aRoad;
vRoadFlags = aRoad.z;
vRoadUv = uv;
vRoadW = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

// Replaces map_fragment for the asphalt: two-scale albedo (kills the 4 m tiling), macro tone variation,
// wheel tracks, lane markings, kerb-side AO. Also derives the distance fade used by the normal/roughness hooks.
const ASPHALT_FS = /* glsl */`
{
  vec4 nz = texture2D(uRoadNoise, vRoadW.xz * 0.0131);
  vec4 nz2 = texture2D(uRoadNoise, vRoadW.xz * 0.00271 + vec2(0.37, 0.61));
  vec4 nz3 = texture2D(uRoadNoise, vRoadW.xz * 0.061 + vec2(0.71, 0.13));
  vRoadFar = smoothstep(70.0, 320.0, length(vViewPosition));
  vRoadMid = smoothstep(30.0, 140.0, length(vViewPosition));
  #ifdef USE_MAP
  {
    // second sample of the same texture at a different scale and rotation in world space; blended by macro noise
    mat2 rot = mat2(0.802, 0.597, -0.597, 0.802);
    vec2 uvB = (rot * vRoadW.xz) * (1.0 / 6.7);
    vec4 ta = texture2D(map, vMapUv);
    vec4 tb = texture2D(map, uvB);
    float kmix = smoothstep(0.3, 0.7, nz2.g * 0.6 + nz.r * 0.4);
    diffuseColor *= mix(ta, tb, kmix);
  }
  #endif
  float wa = vRoad.x;
  int flags = int(vRoadFlags + 0.5);   // flat: packed ints must never be interpolated between rows
  float dEnd = vRoad.w;
  bool oneWay = (flags & 1) != 0;
  bool hw = (flags & 2) != 0;
  bool dbl = (flags & 4) != 0;
  bool noLineL = (flags & 8) != 0;
  bool noLineR = (flags & 16) != 0;
  int lanes = (flags >> 5) & 15;
  float ext = ((flags & 1) != 0) ? 0.0 : vRoad.y;   // acceleration-lane width rides in .y on two-way roads
  bool extLeft = (flags & (1 << 17)) != 0;
  bool kerbL = (flags & (1 << 18)) != 0;
  bool kerbR = (flags & (1 << 19)) != 0;
  float u = vRoadUv.x, v = vRoadUv.y;
  // macro tone variation (patches of older / newer asphalt) + fine speckle
  float tone = 1.0 + (nz2.r - 0.5) * 0.34 + (nz.g - 0.5) * 0.16 + (nz3.r - 0.5) * 0.06;
  diffuseColor.rgb *= tone;
  diffuseColor.rgb *= mix(vec3(1.0, 0.985, 0.96), vec3(0.97, 0.985, 1.02), nz2.g);
  float wearDark = 0.0, wearLight = 0.0;
  float paint = 0.0;
  vec3 paintCol = vec3(0.90, 0.89, 0.84);
  if (lanes > 0) {
    float medianHalf = hw ? 1.2 : 0.0;
    float shoulder = hw ? 1.9 : (oneWay ? vRoad.y : 0.0);
    float px = max(fwidth(u), 0.006);
    float pv = max(fwidth(v), 0.006);
    float per = oneWay ? float(lanes) : float(max(1, lanes / 2));
    float usable = oneWay ? (wa * 2.0 - shoulder * 2.0) : (wa - shoulder - medianHalf);
    float lw = usable / per;
    // wheel tracks + polished lane centres
    for (int i = 0; i < 6; i++) {
      if (i >= lanes) break;
      float c;
      if (oneWay) c = usable * 0.5 - lw * (float(i) + 0.5);
      else {
        int ip = int(per);
        if (i < ip) c = medianHalf + usable - lw * (float(i) + 0.5);
        else c = -(medianHalf + usable - lw * (float(i - ip) + 0.5));
      }
      float du = abs(u - c);
      float t1 = abs(du - 0.86);
      wearDark += exp(-t1 * t1 * 9.0);
      wearLight += exp(-du * du * 3.5);
    }
    if (ext > 0.05) {
      float c = (extLeft ? -1.0 : 1.0) * (wa - shoulder + lw * 0.5);
      float du = abs(u - c); float t1 = abs(du - 0.86);
      wearDark += exp(-t1 * t1 * 9.0) * 0.6; wearLight += exp(-du * du * 3.5) * 0.6;
    }
    float trackStrength = 0.13 * (0.6 + 0.4 * nz.b) * (0.7 + 0.6 * nz2.b);
    diffuseColor.rgb *= 1.0 - trackStrength * min(1.0, wearDark);
    diffuseColor.rgb *= 1.0 + 0.10 * min(1.0, wearLight) * (0.5 + nz2.r);
    // gutter grime + kerb-side ambient occlusion
    float eL = u + wa, eR = wa - u;
    float grime = 0.10 * (exp(-eL * eL / 0.9) + exp(-eR * eR / 0.9)) * (0.5 + nz.g);
    float ao = 0.0;
    if (kerbL) ao += 0.24 * exp(-eL * eL / 0.35);
    if (kerbR) ao += 0.24 * exp(-eR * eR / 0.35);
    diffuseColor.rgb *= 1.0 - grime - ao;
    // ---- markings
    float dashL = mod(v, 6.0);
    float dash = smoothstep(-pv * 0.5, pv * 0.5, dashL) * (1.0 - smoothstep(2.0 - pv * 0.5, 2.0 + pv * 0.5, dashL));
    // far away a pixel spans several dash periods: blend to the mean coverage instead of aliasing into sparkle
    dash = mix(dash, 0.33, smoothstep(0.35, 1.6, pv));
    float solidNear = 1.0 - smoothstep(16.0, 19.0, dEnd);
    float dashOrSolid = max(dash, solidNear);
    float ew = hw ? 0.075 : 0.06;
    float edgeIn = hw ? shoulder : (oneWay ? shoulder : 0.35);
    for (int sd = 0; sd < 2; sd++) {
      float sg = sd == 0 ? -1.0 : 1.0;
      if ((sd == 0 && noLineL) || (sd == 1 && noLineR)) continue;
      float su = u * sg;
      bool extHere = ext > 0.05 && ((sg < 0.0) == extLeft);
      if (extHere) {
        paint += roadLine(su - (wa - edgeIn), ew, px) * dash;
        paint += roadLine(su - (wa + ext - edgeIn), ew, px);
      } else {
        paint += roadLine(su - (wa - edgeIn), ew, px);
      }
    }
    if (!oneWay) {
      if (hw) {
        float ie = roadLine(abs(u) - (medianHalf + 0.3), ew, px);
        paint += ie;
        paintCol = mix(paintCol, vec3(0.95, 0.75, 0.22), clamp(ie * 4.0, 0.0, 1.0));
      } else if (dbl) {
        paint += roadLine(abs(u) - 0.16, 0.06, px);
      } else {
        paint += roadLine(u, 0.06, px) * dashOrSolid;
      }
      for (int j = 1; j < 3; j++) {
        if (float(j) >= per) break;
        float off = medianHalf + usable - lw * float(j);
        paint += roadLine(abs(u) - off, 0.06, px) * dashOrSolid;
      }
    } else {
      for (int j = 1; j < 6; j++) {
        if (float(j) >= per) break;
        float off = usable * 0.5 - lw * float(j);
        paint += roadLine(u - off, 0.06, px) * dashOrSolid;
      }
    }
    paint = clamp(paint, 0.0, 1.0);
    float wear = smoothstep(0.28, 0.62, nz.r * 0.55 + nz3.g * 0.45) * 0.75 + 0.25;
    paint *= wear;
    paint *= 1.0 - 0.55 * vRoadFar;
  }
  if (lanes == 0) diffuseColor.rgb *= 0.94 + (nz.b - 0.5) * 0.12;
  diffuseColor.rgb = mix(diffuseColor.rgb, paintCol * (0.85 + 0.3 * nz3.b), paint);
  vRoadWearL = min(1.0, wearLight);
  vRoadWearD = min(1.0, wearDark);
  vRoadPaint = paint;
  vRoadNz = nz2.b;
}
`;

// Roughness: polished lane centres and micro variation fade with distance; a floor of 0.55 (0.8 far) keeps the
// normal-mapped asphalt from sparkling at grazing angles / mid distance.
const ASPHALT_ROUGH_FS = /* glsl */`
{
  float near = 1.0 - vRoadMid;
  roughnessFactor = clamp(roughnessFactor - (vRoadWearL * 0.13 + vRoadWearD * 0.03) * near + (vRoadNz - 0.5) * 0.10 * near - vRoadPaint * 0.06, mix(0.58, 0.9, vRoadMid), 1.0);
}
`;

const PAINT_FS = /* glsl */`
{
  vec4 nz = texture2D(uRoadNoise, vRoadW.xz * 0.0131);
  vec4 nz3 = texture2D(uRoadNoise, vRoadW.xz * 0.071 + vec2(0.71, 0.13));
  float wear = smoothstep(0.26, 0.66, nz.r * 0.5 + nz3.g * 0.5) * 0.7 + 0.3;
  diffuseColor.a *= wear;
  diffuseColor.rgb *= 0.86 + 0.28 * nz3.b;
}
`;

function hookWorld(material, noiseTex, fragmentInsert, opts = {}) {
  const { roughInsert = null, key = 'road', replaceMap = false, fadeNormal = false } = opts;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRoadNoise = { value: noiseTex };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + WORLD_VARYING_VS)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WORLD_ASSIGN_VS);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + WORLD_VARYING_FS + '\nfloat vRoadWearL = 0.0, vRoadWearD = 0.0, vRoadPaint = 0.0, vRoadNz = 0.5, vRoadFar = 0.0, vRoadMid = 0.0;\n')
      .replace('#include <map_fragment>', replaceMap ? fragmentInsert : '#include <map_fragment>\n' + fragmentInsert);
    if (roughInsert) shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + roughInsert);
    if (fadeNormal) {
      const chunk = THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * (1.0 - 0.92 * vRoadMid);');
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', chunk);
    }
  };
  material.customProgramCacheKey = () => key;
  return material;
}

function fixSet(set, repeat) {
  for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap', 'armMap']) {
    const t = set[k]; if (!t) continue;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.needsUpdate = true;
  }
  if (set.aoMap) set.aoMap.channel = 0;
}

export async function createMaterials(ctx) {
  const { assets } = ctx;
  const [asphaltSet, concreteSet, gravelSet] = await Promise.all([
    assets.pbr('asphalt_02', { repeat: [1 / 4.2, 1 / 4.2] }),
    assets.pbr('concrete_floor_worn_001', { repeat: [1 / 2.6, 1 / 2.6] }),
    assets.pbr('gravel_floor_02', { repeat: [1 / 2.2, 1 / 2.2] }),
  ]);
  fixSet(asphaltSet, 1 / 4.2); fixSet(concreteSet, 1 / 2.6); fixSet(gravelSet, 1 / 2.2);
  const noise = assets.procedural.noiseTexture({ size: 256, seed: 4171, octaves: 5, scale: 4, lo: 0, hi: 1 });
  noise.wrapS = noise.wrapT = THREE.RepeatWrapping;

  // Albedos are deliberately on the dark side of measured values: the noon rig (sun 3-4 + sky, AgX) pushes
  // anything above ~0.12 linear toward white. Asphalt lands near sRGB 90-100 in full sun, sidewalks ~150.
  const asphalt = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.29, 0.284, 0.276), roughness: 0.9, metalness: 0.0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  asphalt.name = 'roads/asphalt';
  if (asphaltSet.map) asphalt.map = asphaltSet.map;
  if (asphaltSet.normalMap) { asphalt.normalMap = asphaltSet.normalMap; asphalt.normalScale.set(0.65, 0.65); }
  if (asphaltSet.roughnessMap) asphalt.roughnessMap = asphaltSet.roughnessMap;
  if (asphaltSet.aoMap) { asphalt.aoMap = asphaltSet.aoMap; asphalt.aoMapIntensity = 0.6; }
  hookWorld(asphalt, noise, ASPHALT_FS, { roughInsert: ASPHALT_ROUGH_FS, key: 'road-asphalt', replaceMap: true, fadeNormal: true });

  const concrete = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.93, 0.92, 0.89), roughness: 0.95, metalness: 0.0, vertexColors: true,
  });
  concrete.name = 'roads/concrete';
  if (concreteSet.map) concrete.map = concreteSet.map;
  if (concreteSet.normalMap) { concrete.normalMap = concreteSet.normalMap; concrete.normalScale.set(0.55, 0.55); }
  if (concreteSet.roughnessMap) concrete.roughnessMap = concreteSet.roughnessMap;
  if (concreteSet.aoMap) { concrete.aoMap = concreteSet.aoMap; concrete.aoMapIntensity = 0.5; }
  hookWorld(concrete, noise, /* glsl */`
{
  vRoadFar = smoothstep(70.0, 320.0, length(vViewPosition));
  vRoadMid = smoothstep(30.0, 140.0, length(vViewPosition));
  vec4 nz2 = texture2D(uRoadNoise, vRoadW.xz * 0.0091 + vec2(0.11, 0.83));
  vec4 nz = texture2D(uRoadNoise, vRoadW.xz * 0.043);
  diffuseColor.rgb *= 1.0 + (nz2.r - 0.5) * 0.24 + (nz.g - 0.5) * 0.12;
  diffuseColor.rgb *= mix(vec3(1.0, 0.99, 0.965), vec3(0.965, 0.98, 1.0), nz2.b);
}`, { key: 'road-concrete', fadeNormal: true });

  const gravel = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.62, 0.62, 0.56), roughness: 1.0, metalness: 0.0, vertexColors: true, side: THREE.DoubleSide,
  });
  gravel.name = 'roads/gravel';
  if (gravelSet.map) gravel.map = gravelSet.map;
  if (gravelSet.normalMap) { gravel.normalMap = gravelSet.normalMap; gravel.normalScale.set(0.8, 0.8); }
  if (gravelSet.roughnessMap) gravel.roughnessMap = gravelSet.roughnessMap;
  if (gravelSet.aoMap) { gravel.aoMap = gravelSet.aoMap; gravel.aoMapIntensity = 0.6; }
  hookWorld(gravel, noise, /* glsl */`
{
  vRoadFar = smoothstep(70.0, 320.0, length(vViewPosition));
  vRoadMid = smoothstep(30.0, 140.0, length(vViewPosition));
  vec4 nz2 = texture2D(uRoadNoise, vRoadW.xz * 0.017 + vec2(0.51, 0.23));
  vec4 nz = texture2D(uRoadNoise, vRoadW.xz * 0.09 + vec2(0.31, 0.77));
  diffuseColor.rgb *= 1.0 + (nz2.r - 0.5) * 0.3 + (nz.g - 0.5) * 0.12;
  // a little green creep from the surrounding grass where the skirt meets the ground
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.78, 0.95, 0.62), smoothstep(0.55, 0.85, nz2.b) * 0.5);
}`, { key: 'road-gravel', fadeNormal: true });

  const paint = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.72, metalness: 0.0, vertexColors: true, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6,
  });
  paint.name = 'roads/paint';
  hookWorld(paint, noise, PAINT_FS, { key: 'road-paint' });

  return {
    asphalt, concrete, gravel, paint, noise,
    order: { asphalt: RENDER_ORDER.ROADS, concrete: RENDER_ORDER.ROADS, gravel: RENDER_ORDER.ROADS - 1, paint: RENDER_ORDER.MARKINGS },
    dispose() { asphalt.dispose(); concrete.dispose(); gravel.dispose(); paint.dispose(); },
  };
}
