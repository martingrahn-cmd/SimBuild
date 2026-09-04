// Terrain splat material: MeshStandardMaterial + onBeforeCompile so sun/sky/shadows/fog/tonemapping stay
// consistent with the rest of the scene. Vertex: heights from the R32F texture (instanced chunks + skirts).
// Fragment: slope/height/noise-driven blend of grass, dirt, rock (triplanar) and sand, two-scale tiling break-up,
// macro colour variation, detail normal maps, cavity AO from the heightfield, wet/underwater shore treatment.
import * as THREE from 'three';

export const VERTEX_PARS = /* glsl */`
attribute vec4 aChunk;
uniform highp sampler2D uHeightTex;
uniform sampler2D uNormalTex;
uniform float uWorldMin;
uniform float uCell;
uniform float uLodDrop;   // metres per LOD level the surface is lowered (shadow proxies: hides coarse-vs-fine acne)
varying vec3 vWPos;
`;

// used by both the lit material and the depth (shadow) material
export const VERTEX_BEGIN = /* glsl */`
vec2 tWxz = aChunk.xy + position.xz * aChunk.z;
ivec2 tGi = ivec2((tWxz - uWorldMin) / uCell + 0.5);
float tH = texelFetch(uHeightTex, tGi, 0).r;
tH -= position.y * (5.0 + aChunk.w * 7.0) + uLodDrop * aChunk.w;
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

const FRAG_PARS = /* glsl */`
uniform sampler2D uNormalTex;
uniform sampler2D uMacro;
uniform sampler2D uGrassMap; uniform sampler2D uGrassFine; uniform sampler2D uGrassFineNor;
uniform sampler2D uDirtMap;  uniform sampler2D uDirtNor;
uniform sampler2D uRockMap;  uniform sampler2D uRockNor;
uniform sampler2D uSandMap;  uniform sampler2D uSandNor;
uniform float uWorldMin;
uniform float uCell;
uniform float uRes;
uniform float uSeaLevel;
uniform float uNormalFlip;
varying vec3 vWPos;

vec3 tNor(sampler2D t, vec2 uv) { return texture2D(t, uv).xyz * 2.0 - 1.0; }
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

vec4 mac  = texture2D(uMacro, wp / 760.0);
#ifndef T_NO_MACRO
vec4 mac2 = texture2D(uMacro, wp / 170.0 + 0.37);
#endif
#ifdef T_NO_MACRO
vec4 mac3 = vec4(0.5), mac2 = vec4(0.5);
#else
vec4 mac3 = texture2D(uMacro, wp / 41.0 + 0.71);
#endif

float slope = 1.0 - gN.y;
float alt = smoothstep(140.0, 330.0, th);
float wRock = smoothstep(0.085, 0.21, slope + (mac2.g - 0.5) * 0.09 + (mac3.b - 0.5) * 0.03 + alt * 0.05);
float wDirt = smoothstep(0.035, 0.10, slope + (mac3.r - 0.5) * 0.04) * 0.8;
wDirt = max(wDirt, smoothstep(0.68, 0.80, mac.r * 0.6 + mac2.r * 0.4 + (mac3.g - 0.5) * 0.12) * 0.6);
wDirt = max(wDirt, smoothstep(0.15, 0.7, flow));
wDirt = max(wDirt, alt * 0.35);
float wSand = smoothstep(1.7 + (mac2.b - 0.5) * 1.6 + (mac3.r - 0.5) * 0.9 + slope * 6.0, 0.5, th);
wDirt *= (1.0 - wRock) * (1.0 - wSand);
wSand *= (1.0 - wRock);
float wGrass = max(0.0, 1.0 - wRock - wDirt - wSand);

// tiling: a fine layer near the camera (fades out by ~450 m) over a coarse, rotated layer (breaks repetition)
float kFar = 0.35 + 0.65 * far;
float nearK = 1.0 - smoothstep(250.0, 480.0, camD);   // fine-scale contribution
mat2 rotC = mat2(0.809, -0.588, 0.588, 0.809);         // 36° rotation for the coarse layer
vec2 wpR = rotC * wp;
vec3 albedo = vec3(0.0);
vec3 pert = vec3(0.0);       // world-space normal perturbation (xz tilt)
float rough = 0.0;
float detAO = 0.0;
float nStr = nearK * 0.9;

if (wGrass > 0.02) {
  // coarse layer with a smooth macro-driven UV warp (kills the visible period), fine layer near the camera
  // coarse layer: two rotated/scaled copies blended by macro noise (aperiodic), then the fine layer near the camera
  vec2 uvB = (wpR + (mac.rg - 0.5) * 38.0) / 61.0;
  vec2 uvC = (rotC * wp + (mac.ba - 0.5) * 50.0) / 83.0;
  vec3 c = mix(texture2D(uGrassMap, uvB).rgb, texture2D(uGrassMap, uvC).rgb, smoothstep(0.3, 0.7, mac2.g));
  vec3 arm = vec3(0.95, 0.88, 0.0);
  #ifndef T_NO_FINE
  if (nearK > 0.001) {
    // fine ground-level layer (leafy grass, 4 m repeat): luminance detail + normals
    vec2 uvA = wp / 4.0;
    vec3 cf = texture2D(uGrassFine, uvA).rgb;
    float lf = dot(cf, vec3(0.3, 0.55, 0.15)) / 0.36;
    c = c * mix(1.0, 0.45 + 0.6 * lf, nearK * 0.7);
    c = mix(c, c * normalize(cf + 0.05) * 1.6, nearK * 0.2);
    vec3 n2 = tNor(uGrassFineNor, uvA);
    pert += vec3(n2.x, 0.0, n2.y * uNormalFlip) * wGrass * 0.4;
    arm.r = mix(1.0, 0.75 + 0.35 * lf, nearK * 0.6);
    // micro layer (< 140 m): 1.3 m repeat, rotated; blade-level detail at street level
    float microK = 1.0 - smoothstep(60.0, 140.0, camD);
    if (microK > 0.001) {
      vec2 uvM = (rotC * wp) / 1.7 + 0.13;
      vec3 cm = texture2D(uGrassFine, uvM).rgb;
      c = mix(c, c * (0.6 + 0.45 * dot(cm, vec3(0.3, 0.55, 0.15)) / 0.36), microK * 0.4);
      vec3 n3 = tNor(uGrassFineNor, uvM);
      pert += vec3(n3.x, 0.0, n3.y * uNormalFlip) * wGrass * 0.3 * microK;
    }
  }
  #endif
  c = mix(vec3(dot(c, vec3(0.3, 0.55, 0.15))), c, 0.9 - 0.4 * far);   // far: less stone speckle
  c = min(c, vec3(0.62));                                                // tame the bright stones
  // recolour: pull the olive source toward its luminance, then tint lush green <-> straw by macro noise
  float lum = dot(c, vec3(0.3, 0.55, 0.15));
  c = mix(vec3(lum), c, 0.45);
  float dry = clamp(mac.g * 0.75 + mac2.a * 0.25 - 0.42 + alt * 0.9, 0.0, 1.0);
  vec3 tint = mix(vec3(0.42, 0.78, 0.24), vec3(0.86, 0.80, 0.42), dry);
  // lush / meadow patches (deeper, more saturated green where the macro noise is high and the ground is low)
  float lush = smoothstep(0.55, 0.8, mac.r * 0.6 + mac2.b * 0.4) * (1.0 - alt);
  tint = mix(tint, vec3(0.30, 0.62, 0.17), lush * 0.7);
  tint *= 0.90 + 0.20 * mac2.r;
  c = c * tint * 1.22;
  albedo += c * wGrass;
  rough += mix(arm.g, 0.95, 0.4) * wGrass;
  detAO += arm.r * wGrass;
}
if (wDirt > 0.02) {
  vec2 uvB = (wpR + (mac.ba - 0.5) * 30.0) / 38.0;
  vec3 c = texture2D(uDirtMap, uvB).rgb;
  if (nearK > 0.001) {
    vec2 uvA = wp / 6.0;
    c = mix(c, texture2D(uDirtMap, uvA).rgb, nearK * 0.6);
    vec3 n2 = tNor(uDirtNor, uvA);
    pert += vec3(n2.x, 0.0, n2.y * uNormalFlip) * wDirt * 0.8;
  }
  c *= mix(vec3(0.72, 0.72, 0.64), vec3(0.92, 0.90, 0.80), mac2.b) * (0.9 + 0.25 * mac3.a);
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
  c *= vec3(1.02, 0.94, 0.78) * (0.9 + 0.2 * mac3.g);
  albedo += c * wSand;
  rough += 0.8 * wSand;
  detAO += 0.95 * wSand;
}
#ifndef T_NO_ROCK
if (wRock > 0.05) {
  vec3 bw = abs(gN); bw = bw * bw * bw * bw; bw /= (bw.x + bw.y + bw.z);
  float s = mix(12.0, 58.0, kFar);
  vec2 uvx = vWPos.zy / s, uvy = vWPos.xz / s, uvz = vWPos.xy / s;
  vec3 c = texture2D(uRockMap, uvx).rgb * bw.x + texture2D(uRockMap, uvy).rgb * bw.y + texture2D(uRockMap, uvz).rgb * bw.z;
  c *= mix(vec3(0.78, 0.78, 0.78), vec3(1.05, 0.98, 0.9), mac2.r) * (0.8 + 0.4 * mac3.b);
  c = mix(c, vec3(dot(c, vec3(0.33))), 0.35);   // greyer, less orange
  // lichen / moss tint on gentler rock, pale at altitude
  c = mix(c, c * vec3(0.8, 0.95, 0.6), smoothstep(0.35, 0.12, slope) * (1.0 - alt) * 0.5);
  c = mix(c, c * vec3(1.15, 1.12, 1.1), alt * 0.5);
  // mid-scale erosion relief from the macro noise via screen-space derivatives (no extra samples)
  {
    float hb = mac3.b * 9.0 * (1.0 - veryFar * 0.7);
    vec2 dH = vec2(dFdx(hb), dFdy(hb));
    vec3 vSigmaX = dFdx(vWPos), vSigmaY = dFdy(vWPos);
    vec3 R1 = cross(vSigmaY, gN), R2 = cross(gN, vSigmaX);
    float fDet = dot(vSigmaX, R1);
    vec3 vGrad = sign(fDet) * (dH.x * R1 + dH.y * R2);
    float gl = length(vGrad);
    if (gl > 1e-5) pert += (vGrad / max(abs(fDet), 1e-5)) * (wRock / max(1.0, gl * 0.35));
  }
  if (nearK > 0.001) {
    vec3 tnx = tNor(uRockNor, uvx), tnz = tNor(uRockNor, uvz);
    vec3 rp = vec3(0.0, tnx.y, tnx.x) * bw.x + vec3(tnz.x, tnz.y, 0.0) * bw.z;
    if (bw.y > 0.2) { vec3 tny = tNor(uRockNor, uvy); rp += vec3(tny.x, 0.0, tny.y * uNormalFlip) * bw.y; }
    pert += rp * wRock * 1.1;
  }
  albedo += c * wRock;
  rough += 0.88 * wRock;
  detAO += (0.8 + 0.2 * mac3.a) * wRock;
}
#endif
// renormalise for skipped faint layers
float wsum = max(1e-3, (wGrass > 0.02 ? wGrass : 0.0) + (wDirt > 0.02 ? wDirt : 0.0) + (wSand > 0.02 ? wSand : 0.0) + (wRock > 0.05 ? wRock : 0.0));
albedo /= wsum; rough /= wsum; detAO /= wsum;

// shore: wet band just above the water line, darker + glossier; underwater darkening + blue-green tint
float wet = smoothstep(1.2, 0.15, th);
albedo *= mix(1.0, 0.62, wet);
rough = mix(rough, 0.32, wet * 0.85);
float under = smoothstep(0.2, -6.0, th);
albedo = mix(albedo, albedo * vec3(0.45, 0.62, 0.62), under);

// far distance: fade detail normals, unify colour a touch (aerial perspective is added by fog)
vec3 splatN = normalize(gN + pert * max(nStr, 0.35));
float splatAO = mix(1.0, cavAO, 0.9) * mix(1.0, detAO, 0.6 * (1.0 - far));
vec3 splatAlbedo = albedo * mix(1.0, 0.86 + 0.14 * cavAO, 0.8);
float splatRough = clamp(rough + (0.5 - mac3.a) * 0.1, 0.25, 1.0);
diffuseColor.rgb *= splatAlbedo;
`;

export function createTerrainMaterial(data, tex, opts = {}) {
  const uniforms = {
    uHeightTex: { value: data.heightTex },
    uNormalTex: { value: data.normalTex },
    uMacro: { value: tex.macro },
    uGrassMap: { value: tex.grass.map }, uGrassFine: { value: tex.grassFine.map }, uGrassFineNor: { value: tex.grassFine.normalMap },
    uDirtMap: { value: tex.dirt.map }, uDirtNor: { value: tex.dirt.normalMap },
    uRockMap: { value: tex.rock.map }, uRockNor: { value: tex.rock.normalMap },
    uSandMap: { value: tex.sand.map }, uSandNor: { value: tex.sand.normalMap },
    uWorldMin: { value: -data.half },
    uCell: { value: data.cell },
    uRes: { value: data.res },
    uSeaLevel: { value: data.seaLevel },
    uNormalFlip: { value: opts.normalFlip ?? 1.0 },
    uLodDrop: { value: 0.0 },
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
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= splatAO;\nreflectedLight.directDiffuse *= mix(1.0, splatAO, 0.45);\nreflectedLight.indirectSpecular *= splatAO;');
    mat.userData.shader = shader;
  };
  mat.customProgramCacheKey = () => 'terrain-splat-v1:' + Object.keys(mat.defines || {}).join(',');
  mat.userData.uniforms = uniforms;
  return mat;
}

/** Cheap variant used while rendering the water reflection: same displacement, 2 samples, slope/height colour ramp. */
export function createTerrainLiteMaterial(data, macro) {
  const uniforms = {
    uHeightTex: { value: data.heightTex }, uNormalTex: { value: data.normalTex }, uMacro: { value: macro },
    uWorldMin: { value: -data.half }, uCell: { value: data.cell }, uRes: { value: data.res }, uSeaLevel: { value: data.seaLevel },
    uLodDrop: { value: 0.0 },
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
      .replace('#include <common>', '#include <common>\nuniform sampler2D uNormalTex; uniform sampler2D uMacro; uniform float uWorldMin; uniform float uCell; uniform float uRes; uniform float uSeaLevel; varying vec3 vWPos;')
      .replace('#include <map_fragment>', /* glsl */`
vec2 wp = vWPos.xz;
vec4 ntex = texture2D(uNormalTex, ((wp - uWorldMin) / uCell + 0.5) / uRes);
vec3 gN = vec3(ntex.r * 2.0 - 1.0, 0.0, ntex.g * 2.0 - 1.0);
gN.y = sqrt(max(0.0, 1.0 - dot(gN.xz, gN.xz)));
vec4 mac = texture2D(uMacro, wp / 170.0 + 0.37);
float th = vWPos.y - uSeaLevel;
float slope = 1.0 - gN.y;
float alt = smoothstep(140.0, 330.0, th);
vec3 grass = mix(vec3(0.16, 0.30, 0.08), vec3(0.36, 0.33, 0.14), clamp(mac.g * 0.9 + alt, 0.0, 1.0)) * (0.8 + 0.4 * mac.r);
vec3 rock = vec3(0.30, 0.28, 0.25) * (0.85 + 0.3 * mac.b);
vec3 sand = vec3(0.55, 0.48, 0.35);
vec3 c = mix(grass, rock, smoothstep(0.085, 0.21, slope + (mac.g - 0.5) * 0.09));
c = mix(c, sand, smoothstep(1.7, 0.5, th) * (1.0 - smoothstep(0.085, 0.21, slope)));
c *= 0.86 + 0.14 * ntex.b;
diffuseColor.rgb *= c;
vec3 splatN = gN;`)
      .replace('#include <normal_fragment_begin>', 'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\nvec3 normal = normalize((viewMatrix * vec4(splatN, 0.0)).xyz);\nvec3 nonPerturbedNormal = normal;')
      .replace('#include <normal_fragment_maps>', '');
  };
  mat.customProgramCacheKey = () => 'terrain-lite-v1';
  return mat;
}

export function createTerrainDepthMaterial(data) {
  const uniforms = {
    uHeightTex: { value: data.heightTex },
    uNormalTex: { value: data.normalTex },
    uWorldMin: { value: -data.half },
    uCell: { value: data.cell },
    uLodDrop: { value: 0.9 },
  };
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERTEX_PARS)
      .replace('#include <begin_vertex>', VERTEX_BEGIN);
  };
  mat.customProgramCacheKey = () => 'terrain-depth-v1';
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
