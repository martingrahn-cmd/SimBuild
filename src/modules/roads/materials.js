// Road materials: asphalt (PBR + procedural lane markings, wheel-track wear and macro colour noise in the
// shader), concrete (kerbs, sidewalks, barriers, bridge structure), gravel (embankment skirts) and paint
// (decal markings: crosswalks, stop lines, arrows) with world-space wear.
import * as THREE from 'three';
import { RENDER_ORDER } from '../../core/constants.js';

const WORLD_VARYING_VS = /* glsl */`
attribute vec4 aRoad;
varying vec4 vRoad;
varying vec3 vRoadW;
varying vec2 vRoadUv;
`;
const WORLD_VARYING_FS = /* glsl */`
uniform sampler2D uRoadNoise;
varying vec4 vRoad;
varying vec3 vRoadW;
varying vec2 vRoadUv;
`;
const WORLD_ASSIGN_VS = /* glsl */`
vRoad = aRoad;
vRoadUv = uv;
vRoadW = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

// Lane markings + wear. Runs after map_fragment (diffuseColor holds albedo * map).
const ASPHALT_FS = /* glsl */`
{
  float wa = vRoad.x;
  int flags = int(vRoad.z + 0.5);
  float dEnd = vRoad.w;
  bool oneWay = (flags & 1) != 0;
  bool hw = (flags & 2) != 0;
  bool dbl = (flags & 4) != 0;
  bool noLineL = (flags & 8) != 0;
  bool noLineR = (flags & 16) != 0;
  int lanes = (flags >> 5) & 15;
  float ext = float((flags >> 9) & 255) / 32.0;
  bool extLeft = (flags & (1 << 17)) != 0;
  float u = vRoadUv.x, v = vRoadUv.y;
  vec4 nz = texture2D(uRoadNoise, vRoadW.xz * 0.0131);
  vec4 nz2 = texture2D(uRoadNoise, vRoadW.xz * 0.00271 + vec2(0.37, 0.61));
  vec4 nz3 = texture2D(uRoadNoise, vRoadW.xz * 0.061 + vec2(0.71, 0.13));
  // macro tone variation (patches of older / newer asphalt) + fine speckle
  float tone = 1.0 + (nz2.r - 0.5) * 0.30 + (nz.g - 0.5) * 0.14 + (nz3.r - 0.5) * 0.06;
  diffuseColor.rgb *= tone;
  diffuseColor.rgb *= mix(vec3(1.0, 0.985, 0.96), vec3(0.97, 0.985, 1.02), nz2.g);
  float wearDark = 0.0, wearLight = 0.0;
  float paint = 0.0;
  vec3 paintCol = vec3(0.92, 0.91, 0.86);
  if (lanes > 0) {
    float medianHalf = hw ? 1.2 : 0.0;
    float shoulder = hw ? 1.9 : (oneWay ? vRoad.y : 0.0);
    float px = fwidth(u) * 0.8 + 0.012;
    float pv = fwidth(v) * 0.8 + 0.012;
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
      // extra (acceleration) lane centre
      float c = (extLeft ? -1.0 : 1.0) * (wa - shoulder + lw * 0.5);
      float du = abs(u - c); float t1 = abs(du - 0.86);
      wearDark += exp(-t1 * t1 * 9.0) * 0.6; wearLight += exp(-du * du * 3.5) * 0.6;
    }
    float trackStrength = 0.11 * (0.6 + 0.4 * nz.b) * (0.7 + 0.6 * nz2.b);
    diffuseColor.rgb *= 1.0 - trackStrength * min(1.0, wearDark);
    diffuseColor.rgb *= 1.0 + 0.09 * min(1.0, wearLight) * (0.5 + nz2.r);
    // ---- markings
    float dashL = mod(v, 6.0);
    float dash = smoothstep(-pv, pv, dashL) * (1.0 - smoothstep(2.0 - pv, 2.0 + pv, dashL));
    float solidNear = 1.0 - smoothstep(16.0, 19.0, dEnd);
    float dashOrSolid = max(dash, solidNear);
    float ew = hw ? 0.075 : 0.06;
    float edgeIn = hw ? shoulder : (oneWay ? shoulder : 0.35);
    // edge lines (per side; an acceleration lane moves the solid line outward and leaves a dashed one)
    for (int sd = 0; sd < 2; sd++) {
      float sg = sd == 0 ? -1.0 : 1.0;
      if ((sd == 0 && noLineL) || (sd == 1 && noLineR)) continue;
      float su = u * sg;                 // distance from the axis toward this side
      bool extHere = ext > 0.05 && ((sg < 0.0) == extLeft);
      if (extHere) {
        paint += (1.0 - smoothstep(ew - px, ew + px, abs(su - (wa - edgeIn)))) * dash;
        paint += 1.0 - smoothstep(ew - px, ew + px, abs(su - (wa + ext - edgeIn)));
      } else {
        paint += 1.0 - smoothstep(ew - px, ew + px, abs(su - (wa - edgeIn)));
      }
    }
    if (!oneWay) {
      if (hw) {
        float ie = 1.0 - smoothstep(ew - px, ew + px, abs(abs(u) - (medianHalf + 0.3)));
        paint += ie;
        paintCol = mix(paintCol, vec3(0.95, 0.75, 0.22), clamp(ie * 4.0, 0.0, 1.0));
      } else if (dbl) {
        paint += 1.0 - smoothstep(0.06 - px, 0.06 + px, abs(abs(u) - 0.16));
      } else {
        paint += (1.0 - smoothstep(0.06 - px, 0.06 + px, abs(u))) * dashOrSolid;
      }
      for (int j = 1; j < 3; j++) {
        if (float(j) >= per) break;
        float off = medianHalf + usable - lw * float(j);
        paint += (1.0 - smoothstep(0.06 - px, 0.06 + px, abs(abs(u) - off))) * dashOrSolid;
      }
    } else {
      for (int j = 1; j < 6; j++) {
        if (float(j) >= per) break;
        float off = usable * 0.5 - lw * float(j);
        paint += (1.0 - smoothstep(0.06 - px, 0.06 + px, abs(u - off))) * dashOrSolid;
      }
    }
    paint = clamp(paint, 0.0, 1.0);
    float wear = smoothstep(0.28, 0.62, nz.r * 0.55 + nz3.g * 0.45) * 0.75 + 0.25;
    paint *= wear;
    paint *= 1.0 - smoothstep(0.25, 0.9, px);
  }
  if (lanes == 0) diffuseColor.rgb *= 0.94 + (nz.b - 0.5) * 0.12;
  diffuseColor.rgb = mix(diffuseColor.rgb, paintCol * (0.85 + 0.3 * nz3.b), paint);
  vRoadWearL = min(1.0, wearLight);
  vRoadWearD = min(1.0, wearDark);
  vRoadPaint = paint;
  vRoadNz = nz2.b;
}
`;

const ASPHALT_ROUGH_FS = /* glsl */`
roughnessFactor = clamp(roughnessFactor - vRoadWearL * 0.16 - vRoadWearD * 0.04 + (vRoadNz - 0.5) * 0.12 - vRoadPaint * 0.08, 0.35, 1.0);
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

function hookWorld(material, noiseTex, fragmentInsert, roughInsert = null, key = 'road') {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRoadNoise = { value: noiseTex };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + WORLD_VARYING_VS)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WORLD_ASSIGN_VS);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + WORLD_VARYING_FS + '\nfloat vRoadWearL = 0.0, vRoadWearD = 0.0, vRoadPaint = 0.0, vRoadNz = 0.5;\n')
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + fragmentInsert);
    if (roughInsert) shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + roughInsert);
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

  const asphalt = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.40, 0.395, 0.385), roughness: 0.9, metalness: 0.0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  asphalt.name = 'roads/asphalt';
  if (asphaltSet.map) asphalt.map = asphaltSet.map;
  if (asphaltSet.normalMap) { asphalt.normalMap = asphaltSet.normalMap; asphalt.normalScale.set(0.7, 0.7); }
  if (asphaltSet.roughnessMap) asphalt.roughnessMap = asphaltSet.roughnessMap;
  if (asphaltSet.aoMap) { asphalt.aoMap = asphaltSet.aoMap; asphalt.aoMapIntensity = 0.6; }
  hookWorld(asphalt, noise, ASPHALT_FS, ASPHALT_ROUGH_FS, 'road-asphalt');

  const concrete = new THREE.MeshStandardMaterial({
    color: new THREE.Color(1.75, 1.72, 1.66), roughness: 0.95, metalness: 0.0, vertexColors: true,
  });
  concrete.name = 'roads/concrete';
  if (concreteSet.map) concrete.map = concreteSet.map;
  if (concreteSet.normalMap) { concrete.normalMap = concreteSet.normalMap; concrete.normalScale.set(0.6, 0.6); }
  if (concreteSet.roughnessMap) concrete.roughnessMap = concreteSet.roughnessMap;
  if (concreteSet.aoMap) { concrete.aoMap = concreteSet.aoMap; concrete.aoMapIntensity = 0.5; }
  hookWorld(concrete, noise, /* glsl */`
{
  vec4 nz2 = texture2D(uRoadNoise, vRoadW.xz * 0.0091 + vec2(0.11, 0.83));
  vec4 nz = texture2D(uRoadNoise, vRoadW.xz * 0.043);
  diffuseColor.rgb *= 1.0 + (nz2.r - 0.5) * 0.22 + (nz.g - 0.5) * 0.10;
  diffuseColor.rgb *= mix(vec3(1.0, 0.99, 0.965), vec3(0.965, 0.98, 1.0), nz2.b);
}`, null, 'road-concrete');

  const gravel = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.66, 0.66, 0.60), roughness: 1.0, metalness: 0.0, vertexColors: true, side: THREE.DoubleSide,
  });
  gravel.name = 'roads/gravel';
  if (gravelSet.map) gravel.map = gravelSet.map;
  if (gravelSet.normalMap) { gravel.normalMap = gravelSet.normalMap; gravel.normalScale.set(0.8, 0.8); }
  if (gravelSet.roughnessMap) gravel.roughnessMap = gravelSet.roughnessMap;
  if (gravelSet.aoMap) { gravel.aoMap = gravelSet.aoMap; gravel.aoMapIntensity = 0.6; }
  hookWorld(gravel, noise, /* glsl */`
{
  vec4 nz2 = texture2D(uRoadNoise, vRoadW.xz * 0.017 + vec2(0.51, 0.23));
  diffuseColor.rgb *= 1.0 + (nz2.r - 0.5) * 0.3;
}`, null, 'road-gravel');

  const paint = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.72, metalness: 0.0, vertexColors: true, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6,
  });
  paint.name = 'roads/paint';
  hookWorld(paint, noise, PAINT_FS, null, 'road-paint');

  return {
    asphalt, concrete, gravel, paint, noise,
    order: { asphalt: RENDER_ORDER.ROADS, concrete: RENDER_ORDER.ROADS, gravel: RENDER_ORDER.ROADS - 1, paint: RENDER_ORDER.MARKINGS },
    dispose() { asphalt.dispose(); concrete.dispose(); gravel.dispose(); paint.dispose(); },
  };
}
