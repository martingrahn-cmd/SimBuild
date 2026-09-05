// Terrain splat material: MeshStandardMaterial + onBeforeCompile so sun/sky/shadows/fog/tonemapping stay
// consistent with the rest of the scene. Vertex: heights from the R32F texture (instanced chunks + skirts).
// Fragment: slope/height/land-cover-driven blend of grass, dirt, scree, rock (triplanar) and sand; the colour of
// the grass is built from a controlled palette (meadow / straw / forest floor, driven by the land-cover map at
// 20 m and 200 m scales) modulated by the photo textures' luminance, so the plains read like CS2's patchwork
// from 500 m instead of a single green carpet. Detail normals near the camera, cavity AO from the heightfield,
// wet/underwater shore treatment.
import * as THREE from 'three';

export const VERTEX_PARS = /* glsl */`
attribute vec4 aChunk;   // originX, originZ, size, lod
attribute vec4 aNbr;     // lod of the -x, +x, -z, +z neighbour chunks (edge stitching)
uniform highp sampler2D uHeightTex;
uniform sampler2D uNormalTex;
uniform float uWorldMin;
uniform float uCell;
uniform float uLodDrop;   // metres the surface is lowered (shadow pass: hides coarse-vs-fine acne)
uniform float uSkirt;     // skirt depth scale (0 in the shadow pass: skirt walls of coarse chunks must not cast lines)
varying vec3 vWPos;
`;

// used by both the lit material and the depth (shadow) material
export const VERTEX_BEGIN = /* glsl */`
vec2 tWxz = aChunk.xy + position.xz * aChunk.z;
ivec2 tOi = ivec2((aChunk.xy - uWorldMin) / uCell + 0.5);   // chunk origin texel
vec2 tRel = position.xz * 32.0;                              // texel offset inside the chunk (chunk = 32 cells)
float tH;
// edge vertices that face a coarser neighbour are snapped onto that neighbour's (linear) edge: crack-free seams
float tNb = -1.0;
bool tEx = position.x < 0.001 || position.x > 0.999;
bool tEz = position.z < 0.001 || position.z > 0.999;
if (tEx) tNb = position.x < 0.5 ? aNbr.x : aNbr.y;
else if (tEz) tNb = position.z < 0.5 ? aNbr.z : aNbr.w;
if (tNb > aChunk.w + 0.5) {
  float tS = exp2(tNb);                                      // texels per coarse cell
  float tA = tEx ? tRel.y : tRel.x;
  float t0 = floor(tA / tS + 1e-4) * tS;
  float tF = clamp((tA - t0) / tS, 0.0, 1.0);
  float t1 = min(t0 + tS, 32.0);
  ivec2 i0 = tEx ? ivec2(int(tRel.x + 0.5), int(t0 + 0.5)) : ivec2(int(t0 + 0.5), int(tRel.y + 0.5));
  ivec2 i1 = tEx ? ivec2(int(tRel.x + 0.5), int(t1 + 0.5)) : ivec2(int(t1 + 0.5), int(tRel.y + 0.5));
  tH = mix(texelFetch(uHeightTex, tOi + i0, 0).r, texelFetch(uHeightTex, tOi + i1, 0).r, tF);
} else {
  tH = texelFetch(uHeightTex, tOi + ivec2(tRel + 0.5), 0).r;
}
tH -= position.y * 0.8 * uSkirt + uLodDrop;   // token skirt (seams are stitched); constant drop = no caster step at LOD seams
vec3 transformed = vec3(tWxz.x, tH, tWxz.y);
vWPos = transformed;
`;

const VERTEX_NORMAL = /* glsl */`
#ifdef T_NO_VNORMAL
vec3 objectNormal = vec3(0.0, 1.0, 0.0);
#else
vec2 nWxz = aChunk.xy + position.xz * aChunk.z;
ivec2 nGi = ivec2((nWxz - uWorldMin) / uCell + 0.5);
vec4 nTex = texelFetch(uNormalTex, nGi, 0);
vec3 objectNormal = vec3(nTex.r * 2.0 - 1.0, 0.0, nTex.g * 2.0 - 1.0);
objectNormal.y = sqrt(max(0.0, 1.0 - dot(objectNormal.xz, objectNormal.xz)));
#endif
`;

/**
 * Shared grass palette (terrain surface AND the near-camera blades use it, so they match at every hour).
 * land: land-cover texel (r dirt, g dry, b lush, a fine); returns linear albedo.
 */
export const GRASS_PALETTE_GLSL = /* glsl */`
vec3 terrainGrassTint(vec4 land, vec4 mac2, vec4 mac3, float alt) {
  float dry = clamp(land.g + (mac2.a - 0.5) * 0.18 + alt * 0.8, 0.0, 1.0);
  float lush = land.b;
  vec3 tint = mix(vec3(0.038, 0.090, 0.018), vec3(0.235, 0.200, 0.082), dry);   // meadow green -> straw
  tint = mix(tint, vec3(0.011, 0.028, 0.006), lush * 0.9);                       // forest floor / lush hollows
  tint *= 0.74 + 0.52 * land.a;                                                  // 8-25 m grain
  tint *= 0.90 + 0.20 * mac3.g;
  return tint;
}
`;

const FRAG_PARS = /* glsl */`
uniform sampler2D uNormalTex;
uniform sampler2D uMacro;
uniform sampler2D uLandTex;
uniform sampler2D uGrassMap; uniform sampler2D uGrassFine; uniform sampler2D uGrassFineNor;
uniform sampler2D uDirtMap;  uniform sampler2D uDirtNor;
uniform sampler2D uRockMap;  uniform sampler2D uRockNor;
uniform sampler2D uSandMap;  uniform sampler2D uSandNor;
uniform sampler2D uScreeMap;
uniform float uWorldMin;
uniform float uWorldSize;
uniform float uCell;
uniform float uRes;
uniform float uSeaLevel;
uniform float uNormalFlip;
varying vec3 vWPos;
const vec3 LUMW = vec3(0.30, 0.55, 0.15);
vec3 tNor(sampler2D t, vec2 uv) { return texture2D(t, uv).xyz * 2.0 - 1.0; }
${GRASS_PALETTE_GLSL}
`;

// replaces <map_fragment>: computes splatAlbedo / splatRough / splatAO / splatN (world)
const FRAG_SPLAT = /* glsl */`
vec2 wp = vWPos.xz;
vec2 nuv = ((wp - uWorldMin) / uCell + 0.5) / uRes;
vec4 ntex = texture2D(uNormalTex, nuv);
vec3 gN = vec3(ntex.r * 2.0 - 1.0, 0.0, ntex.g * 2.0 - 1.0);
gN.y = sqrt(max(0.0, 1.0 - dot(gN.xz, gN.xz)));
float cavAO = ntex.b;
float flow = ntex.a;
float th = vWPos.y - uSeaLevel;
float camD = distance(cameraPosition, vWPos);
float far = smoothstep(80.0, 700.0, camD);
float veryFar = smoothstep(600.0, 2200.0, camD);

vec4 land = texture2D(uLandTex, (wp - uWorldMin) / uWorldSize);
vec4 mac  = texture2D(uMacro, wp / 760.0);
const mat2 rotC0 = mat2(0.809, -0.588, 0.588, 0.809);
#ifdef T_NO_MACRO
vec4 mac2 = vec4(0.5), mac3 = vec4(0.5);
#else
vec4 mac2 = texture2D(uMacro, wp / 170.0 + 0.37);
vec4 mac3 = texture2D(uMacro, wp / 41.0 + 0.71);
#endif
vec4 macF = texture2D(uMacro, rotC0 * wp / 11.0 + 0.19);
float fine = clamp(land.a + (macF.r - 0.5) * 0.7, 0.0, 1.0);
// land-cover edges: re-threshold the 4 m/texel map with the fine noise so patch borders are organic, not blocky
float landDirt = smoothstep(0.22, 0.78, land.r + (macF.g - 0.5) * 0.55 + (mac3.r - 0.5) * 0.25);
float landLush = smoothstep(0.15, 0.85, land.b + (macF.b - 0.5) * 0.4);
land.r = landDirt; land.b = landLush;

float slope = 1.0 - gN.y;
float alt = smoothstep(140.0, 330.0, th);
// rock -> scree -> grass over a wide, noisy band (30-60 m on the hillsides), never a hard skirt line
float slopeN = slope + (mac2.g - 0.5) * 0.12 + (mac3.b - 0.5) * 0.07 + (fine - 0.5) * 0.03 + alt * 0.05;
float wRock = smoothstep(0.11, 0.27, slopeN);
float wScree = smoothstep(0.055, 0.13, slopeN) * (1.0 - wRock);
float wDirt = smoothstep(0.035, 0.10, slope + (mac3.r - 0.5) * 0.04) * 0.5;
wDirt = max(wDirt, land.r);
wDirt = max(wDirt, smoothstep(0.15, 0.7, flow) * 0.8);
wDirt = max(wDirt, alt * 0.35);
// shore: sand where the ground is low and gentle (width follows slope + noise); some banks are mud/reeds instead
float sandLim = 1.5 + (mac2.b - 0.5) * 1.4 + (fine - 0.5) * 0.5 - slope * 9.0;
float beachy = smoothstep(0.30, 0.55, mac.b * 0.7 + mac2.a * 0.3);
float wSand = smoothstep(sandLim + 0.5, sandLim - 0.5, th) * beachy;
float wMud = smoothstep(2.4, 0.3, th) * (1.0 - beachy) * 0.8;
wDirt = max(wDirt, wMud);
wDirt *= (1.0 - wRock) * (1.0 - wSand);
wScree *= (1.0 - wSand) * (1.0 - wDirt * 0.6);
wSand *= (1.0 - wRock);
float wGrass = max(0.0, 1.0 - wRock - wScree - wDirt - wSand);

// tiling: a fine layer near the camera (fades out by ~450 m) over two rotated coarse layers (aperiodic blend)
float nearK = 1.0 - smoothstep(250.0, 480.0, camD);
mat2 rotC = mat2(0.809, -0.588, 0.588, 0.809);         // 36 deg
mat2 rotD = mat2(0.559, 0.829, -0.829, 0.559);         // -56 deg
vec2 wpR = rotC * wp;
vec3 albedo = vec3(0.0);
vec3 pert = vec3(0.0);       // world-space normal perturbation (xz tilt)
float rough = 0.0;
float detAO = 0.0;
float nStr = nearK * 0.9;

if (wGrass > 0.02) {
  // the photo texture only supplies luminance detail (its olive hue is replaced by the palette)
  vec2 uvB = (wpR + (mac.rg - 0.5) * 9.0) / 61.0;
  vec2 uvC = (rotD * wp + (mac.ba - 0.5) * 11.0) / 47.0;
  float lB = dot(texture2D(uGrassMap, uvB).rgb, LUMW), lC = dot(texture2D(uGrassMap, uvC).rgb, LUMW);
  float lum = min(1.7, mix(lB, lC, smoothstep(0.3, 0.7, mac2.g)) / 0.125);
  float det = mix(1.0, lum, 0.55 - 0.15 * far);
  // aerial grain: a third, unwarped coarse sample at 23 m keeps 0.5-3 m texture alive where the fine layer is gone
  float lD = dot(texture2D(uGrassMap, (rotD * wpR) / 23.0 + 0.41).rgb, LUMW) / 0.125;
  det *= mix(1.0, 0.7 + 0.3 * lD, (1.0 - nearK) * 0.8 + 0.2);
  float grassAO = 1.0;
  vec3 hue = vec3(1.0);
  #ifndef T_NO_FINE
  if (nearK > 0.001) {
    // fine ground-level layer (leafy grass, 4 m repeat): luminance detail + normals
    vec2 uvA = wp / 4.0;
    vec3 cf = texture2D(uGrassFine, uvA).rgb;
    float lf = dot(cf, LUMW) / 0.24;
    det *= mix(1.0, 0.22 + 0.9 * lf, nearK * 0.9);
    hue = mix(hue, normalize(cf + 0.02) * 1.55, nearK * 0.45);         // leaf-litter / blade hue variation
    vec3 n2 = tNor(uGrassFineNor, uvA);
    pert += vec3(n2.x, 0.0, n2.y * uNormalFlip) * wGrass * 0.9;
    grassAO = mix(1.0, 0.6 + 0.45 * lf, nearK * 0.75);
    // micro layer (< 140 m): 1.7 m repeat, rotated; blade-level grain at street level
    float microK = 1.0 - smoothstep(60.0, 140.0, camD);
    if (microK > 0.001) {
      vec2 uvM = (rotC * wp) / 1.7 + 0.13;
      vec3 cm = texture2D(uGrassFine, uvM).rgb;
      det *= mix(1.0, 0.4 + 0.65 * dot(cm, LUMW) / 0.24, microK * 0.65);
      vec3 n3 = tNor(uGrassFineNor, uvM);
      pert += vec3(n3.x, 0.0, n3.y * uNormalFlip) * wGrass * 0.6 * microK;
    }
  }
  #endif
  vec3 tint = terrainGrassTint(land, mac2, mac3, alt);
  // dry blades bleach the highlights, lush grass keeps them saturated
  vec3 c = tint * det * hue;
  c = mix(c, c * vec3(1.06, 1.0, 0.9), land.g * 0.5);
  albedo += c * wGrass;
  rough += 0.92 * wGrass;
  detAO += grassAO * wGrass;
}
if (wDirt > 0.02) {
  vec2 uvB = (wpR + (mac.ba - 0.5) * 14.0) / 38.0;
  vec3 cd = texture2D(uDirtMap, uvB).rgb;
  float dl = dot(cd, LUMW) / 0.09;
  vec3 c = mix(vec3(0.092, 0.082, 0.062), vec3(0.185, 0.165, 0.125), mac2.b) * mix(1.0, dl, 0.45 - 0.15 * far) * (0.85 + 0.3 * fine);
  if (nearK > 0.001) {
    vec2 uvA = wp / 6.0;
    vec3 cn = texture2D(uDirtMap, uvA).rgb;
    c = mix(c, c * normalize(cn + 0.02) * 1.6 * (0.5 + 0.5 * dot(cn, LUMW) / 0.09), nearK * 0.3);
    vec3 n2 = tNor(uDirtNor, uvA);
    pert += vec3(n2.x, 0.0, n2.y * uNormalFlip) * wDirt * 0.8;
  }
  c = mix(c, c * vec3(0.55, 0.5, 0.42), wMud * 0.7);      // wet mud is darker
  albedo += c * wDirt;
  rough += 0.93 * wDirt;
  detAO += (0.85 + 0.15 * mac3.r) * wDirt;
}
if (wSand > 0.02) {
  vec2 uvB = wpR / 30.0;
  vec3 c = texture2D(uSandMap, uvB).rgb;
  if (nearK > 0.001) {
    vec2 uvA = wp / 5.0;
    c = mix(c, texture2D(uSandMap, uvA).rgb, nearK * 0.6);
    vec3 n2 = tNor(uSandNor, uvA);
    pert += vec3(n2.x, 0.0, n2.y * uNormalFlip) * wSand * 0.5;
  }
  // grey-tan shingle/sand instead of the pink source; darker pebbly patches from the fine channel
  c *= vec3(0.74, 0.74, 0.66) * (0.8 + 0.35 * fine);
  c = mix(c, c * vec3(0.7, 0.7, 0.68), smoothstep(0.6, 0.85, mac3.r) * 0.5);
  albedo += c * wSand;
  rough += 0.82 * wSand;
  detAO += 0.95 * wSand;
}
if (wScree > 0.02) {
  vec3 c = texture2D(uScreeMap, (rotD * wp) / 14.0).rgb * 0.5;
  c *= mix(vec3(0.82, 0.8, 0.76), vec3(1.0, 0.94, 0.84), mac3.a) * (0.8 + 0.4 * fine);
  c = mix(c, c * vec3(0.85, 1.0, 0.7), smoothstep(0.3, 0.8, land.b) * 0.4);   // moss between the stones
  albedo += c * wScree;
  rough += 0.9 * wScree;
  detAO += (0.75 + 0.25 * mac3.b) * wScree;
}
#ifndef T_NO_ROCK
if (wRock > 0.05) {
  vec3 bw = abs(gN); bw = bw * bw * bw * bw; bw /= (bw.x + bw.y + bw.z);
  float s = mix(12.0, 58.0, 0.35 + 0.65 * far);
  vec2 uvx = vWPos.zy / s, uvy = vWPos.xz / s, uvz = vWPos.xy / s;
  vec3 c = texture2D(uRockMap, uvx).rgb * bw.x + texture2D(uRockMap, uvy).rgb * bw.y + texture2D(uRockMap, uvz).rgb * bw.z;
  c *= mix(vec3(0.62, 0.68, 0.74), vec3(0.95, 0.9, 0.84), mac2.r) * (0.8 + 0.4 * mac3.b);
  c = mix(c, vec3(dot(c, vec3(0.33))), 0.65);   // grey, not orange
  // lichen / moss tint on gentler rock, pale at altitude, strata banding
  c = mix(c, c * vec3(0.8, 0.95, 0.6), smoothstep(0.35, 0.12, slope) * (1.0 - alt) * 0.5);
  c = mix(c, c * vec3(1.2, 1.18, 1.15), alt * 0.5);
  c *= 0.9 + 0.2 * smoothstep(0.4, 0.6, fract(vWPos.y / 23.0 + mac3.g * 0.4));
  // mid-scale erosion relief from the macro noise via screen-space derivatives (no extra samples); fades out
  // with distance so far rock never sparkles
  float bumpK = 1.0 - smoothstep(250.0, 1000.0, camD);
  if (bumpK > 0.01) {
    float hb = mac3.b * 8.0 * bumpK;
    vec2 dH = vec2(dFdx(hb), dFdy(hb));
    vec3 vSigmaX = dFdx(vWPos), vSigmaY = dFdy(vWPos);
    vec3 R1 = cross(vSigmaY, gN), R2 = cross(gN, vSigmaX);
    float fDet = dot(vSigmaX, R1);
    vec3 vGrad = sign(fDet) * (dH.x * R1 + dH.y * R2);
    float gl = length(vGrad);
    if (gl > 1e-5) pert += (vGrad / max(abs(fDet), 1e-5)) * (wRock / max(1.0, gl * 0.35));
  }
  {
    vec3 tnx = tNor(uRockNor, uvx), tnz = tNor(uRockNor, uvz);
    vec3 rp = vec3(0.0, tnx.y, tnx.x) * bw.x + vec3(tnz.x, tnz.y, 0.0) * bw.z;
    if (bw.y > 0.2) { vec3 tny = tNor(uRockNor, uvy); rp += vec3(tny.x, 0.0, tny.y * uNormalFlip) * bw.y; }
    pert += rp * wRock * mix(1.1, 0.8, far) / max(nStr, 0.12) * mix(nStr, 0.6, far) ;
  }
  albedo += c * wRock;
  rough += 0.88 * wRock;
  detAO += (0.8 + 0.2 * mac3.a) * wRock;
}
#endif
// renormalise for skipped faint layers
float wsum = max(1e-3, (wGrass > 0.02 ? wGrass : 0.0) + (wDirt > 0.02 ? wDirt : 0.0) + (wSand > 0.02 ? wSand : 0.0) + (wScree > 0.02 ? wScree : 0.0) + (wRock > 0.05 ? wRock : 0.0));
albedo /= wsum; rough /= wsum; detAO /= wsum;

// shore: wet band just above the water line (edge broken by the fine channel), darker + glossier;
// underwater darkening + blue-green tint
float wet = smoothstep(0.9 + (fine - 0.5) * 0.6, 0.1, th);
albedo *= mix(1.0, 0.68, wet);
rough = mix(rough, 0.35, wet * 0.8);
float under = smoothstep(0.2, -6.0, th);
albedo = mix(albedo, albedo * vec3(0.45, 0.62, 0.62), under);

// far distance: fade detail normals (aerial perspective is added by the environment's fog)
vec3 splatN = normalize(gN + pert * max(nStr, 0.12));
float splatAO = cavAO * mix(1.0, detAO, 0.7 * (1.0 - far));
vec3 splatAlbedo = albedo * (0.82 + 0.18 * cavAO);
float splatRough = clamp(rough + (0.5 - mac3.a) * 0.1, 0.25, 1.0);
diffuseColor.rgb *= splatAlbedo;
`;

export function createTerrainMaterial(data, tex, opts = {}) {
  const uniforms = {
    uHeightTex: { value: data.heightTex },
    uNormalTex: { value: data.normalTex },
    uMacro: { value: tex.macro },
    uLandTex: { value: tex.land },
    uGrassMap: { value: tex.grass.map }, uGrassFine: { value: tex.grassFine.map }, uGrassFineNor: { value: tex.grassFine.normalMap },
    uDirtMap: { value: tex.dirt.map }, uDirtNor: { value: tex.dirt.normalMap },
    uRockMap: { value: tex.rock.map }, uRockNor: { value: tex.rock.normalMap },
    uSandMap: { value: tex.sand.map }, uSandNor: { value: tex.sand.normalMap },
    uScreeMap: { value: tex.scree.map },
    uWorldMin: { value: -data.half },
    uWorldSize: { value: data.size },
    uCell: { value: data.cell },
    uRes: { value: data.res },
    uSeaLevel: { value: data.seaLevel },
    uNormalFlip: { value: opts.normalFlip ?? 1.0 },
    uLodDrop: { value: 0.0 },
    uSkirt: { value: 1.0 },
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, side: THREE.FrontSide });
  mat.name = 'terrain-splat';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERTEX_PARS)
      .replace('#include <beginnormal_vertex>', VERTEX_NORMAL)
      .replace('#include <begin_vertex>', VERTEX_BEGIN);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <map_fragment>', FRAG_SPLAT)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = splatRough;')
      .replace('#include <normal_fragment_begin>', 'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\nvec3 normal = normalize((viewMatrix * vec4(splatN, 0.0)).xyz);\nvec3 nonPerturbedNormal = normal;')
      .replace('#include <normal_fragment_maps>', '')
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= splatAO;\nreflectedLight.directDiffuse *= mix(1.0, splatAO, 0.5);\nreflectedLight.indirectSpecular *= splatAO;');
    mat.userData.shader = shader;
  };
  mat.customProgramCacheKey = () => 'terrain-splat-v3:' + Object.keys(mat.defines || {}).join(',');
  mat.userData.uniforms = uniforms;
  return mat;
}

/** Cheap variant used while rendering the water reflection: same displacement, 3 samples, palette colour ramp. */
export function createTerrainLiteMaterial(data, macro, land) {
  const uniforms = {
    uHeightTex: { value: data.heightTex }, uNormalTex: { value: data.normalTex }, uMacro: { value: macro }, uLandTex: { value: land },
    uWorldMin: { value: -data.half }, uWorldSize: { value: data.size }, uCell: { value: data.cell }, uRes: { value: data.res }, uSeaLevel: { value: data.seaLevel },
    uLodDrop: { value: 0.0 }, uSkirt: { value: 1.0 },
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  mat.name = 'terrain-lite';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERTEX_PARS)
      .replace('#include <beginnormal_vertex>', VERTEX_NORMAL)
      .replace('#include <begin_vertex>', VERTEX_BEGIN);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uNormalTex; uniform sampler2D uMacro; uniform sampler2D uLandTex; uniform float uWorldMin; uniform float uWorldSize; uniform float uCell; uniform float uRes; uniform float uSeaLevel; varying vec3 vWPos;\n' + GRASS_PALETTE_GLSL)
      .replace('#include <map_fragment>', /* glsl */`
vec2 wp = vWPos.xz;
vec4 ntex = texture2D(uNormalTex, ((wp - uWorldMin) / uCell + 0.5) / uRes);
vec3 gN = vec3(ntex.r * 2.0 - 1.0, 0.0, ntex.g * 2.0 - 1.0);
gN.y = sqrt(max(0.0, 1.0 - dot(gN.xz, gN.xz)));
vec4 land = texture2D(uLandTex, (wp - uWorldMin) / uWorldSize);
vec4 mac2 = texture2D(uMacro, wp / 170.0 + 0.37);
float th = vWPos.y - uSeaLevel;
float slope = 1.0 - gN.y;
float alt = smoothstep(140.0, 330.0, th);
vec3 grass = terrainGrassTint(land, mac2, vec4(0.5), alt);
vec3 rock = mix(vec3(0.10, 0.095, 0.09), vec3(0.16, 0.15, 0.14), alt) * (0.85 + 0.3 * mac2.b);
vec3 dirt = vec3(0.13, 0.095, 0.05);
vec3 sand = vec3(0.21, 0.18, 0.14);
float wRock = smoothstep(0.11, 0.27, slope + (mac2.g - 0.5) * 0.12);
vec3 c = mix(grass, dirt, land.r * (1.0 - wRock));
c = mix(c, rock, wRock);
c = mix(c, sand, smoothstep(1.7, 0.5, th) * (1.0 - wRock));
c *= 0.82 + 0.18 * ntex.b;
diffuseColor.rgb *= c;
vec3 splatN = gN;`)
      .replace('#include <normal_fragment_begin>', 'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\nvec3 normal = normalize((viewMatrix * vec4(splatN, 0.0)).xyz);\nvec3 nonPerturbedNormal = normal;')
      .replace('#include <normal_fragment_maps>', '');
  };
  mat.customProgramCacheKey = () => 'terrain-lite-v3';
  return mat;
}

export function createTerrainDepthMaterial(data) {
  const uniforms = {
    uHeightTex: { value: data.heightTex },
    uNormalTex: { value: data.normalTex },
    uWorldMin: { value: -data.half },
    uCell: { value: data.cell },
    uLodDrop: { value: 0.3 },
    uSkirt: { value: 0.0 },
  };
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERTEX_PARS)
      .replace('#include <begin_vertex>', VERTEX_BEGIN);
  };
  mat.customProgramCacheKey = () => 'terrain-depth-v3';
  return mat;
}

/** RGBA tileable fbm noise (4 independent channels) for macro variation. */
export function makeMacroNoiseTexture(noises, size = 256) {
  const data = new Uint8Array(size * size * 4);
  const scales = [3, 5, 4, 7];
  for (let c = 0; c < 4; c++) {
    const nz = noises[c];
    const sc = scales[c];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const a = 0.5 + 0.5 * nz.fbm(u * sc, v * sc, 5);
      const b = 0.5 + 0.5 * nz.fbm((u + 1) * sc, (v + 1) * sc, 5);
      const w = Math.min(1 - Math.abs(u * 2 - 1), 1 - Math.abs(v * 2 - 1));
      const wk = w * w * (3 - 2 * w);
      let n = a * wk + b * (1 - wk);
      n = Math.min(1, Math.max(0, (n - 0.5) * 1.6 + 0.5));
      data[(y * size + x) * 4 + c] = Math.round(n * 255);
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** Land-cover RGBA8 texture from gen/landcover.js (world-aligned, clamped, mipmapped). */
export function makeLandTexture(lc) {
  const t = new THREE.DataTexture(lc.data, lc.size, lc.size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
