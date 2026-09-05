// Shared GLSL: cloud density (used by the sky dome AND by the cloud-shadow term injected into every
// lit material), plus the global ShaderChunk overrides (height fog with sun in-scatter, cloud shadows).
import * as THREE from 'three';
import { CSMShader } from 'three/examples/jsm/csm/CSMShader.js';

// Shared uniform objects: the SAME object is handed to every compiled program, so one write per
// frame updates all materials (this is also how CSM shares its cascade breaks).
export const U = {
  noise:     { value: null },                          // RGBA 4-octave tileable noise
  cloudA:    { value: new THREE.Vector4(0, 0, 1 / 9000, 0.6) }, // offsetX, offsetZ, 1/scale, coverage threshold
  cloudB:    { value: new THREE.Vector4(0, 0, 1500, 0) },       // sun proj dx, dz (per metre of height), cloud height, shadow strength
  fogA:      { value: new THREE.Vector4(1 / 260, 0, 0.9, 1) },   // height falloff, base height, sun glow strength, unused
  fogSun:    { value: new THREE.Vector3(0, 1, 0) },
  fogSunCol: { value: new THREE.Color(0, 0, 0) },              // in-scatter colour (linear radiance)
  sky:       { value: null },                                  // equirect sky radiance LUT
  cloudMap:  { value: null },                                  // 256² cloud thickness map (world xz at cloud altitude)
  cloudC:    { value: new THREE.Vector4(0, 0, 1 / 6000, 0) },   // map centre x, z, 1/size
};

export const CLOUD_GLSL = /* glsl */`
uniform sampler2D uEnvNoise;
uniform vec4 uEnvCloudA;
uniform vec4 uEnvCloudB;
float envCloudDensity(vec2 wp) {
  vec2 uv = (wp + uEnvCloudA.xy) * uEnvCloudA.z;
  float macro = texture2D(uEnvNoise, uv * 0.45 + vec2(0.37, 0.61)).r;
  vec4 n1 = texture2D(uEnvNoise, uv);
  vec4 n2 = texture2D(uEnvNoise, uv * 3.1 + vec2(0.29, 0.73));
  const vec4 w = vec4(0.5333, 0.2667, 0.1333, 0.0667);
  float shape = dot(n1, w) * 0.72 + dot(n2, w) * 0.28;
  float th = uEnvCloudA.w + (macro - 0.5) * 0.30;
  float d = smoothstep(th, th + 0.26, shape - (n2.a - 0.5) * 0.12);
  return d;
}
`;

// Lit materials sample the pre-rendered cloud map (one tap) instead of evaluating the noise (three taps).
export const CLOUD_SHADOW_GLSL = /* glsl */`
uniform sampler2D uEnvCloudMap;
uniform vec4 uEnvCloudB;
uniform vec4 uEnvCloudC;
float envCloudShadow(vec3 wpos) {
  if (uEnvCloudB.w <= 0.0) return 1.0;
  vec2 p = wpos.xz + uEnvCloudB.xy * (uEnvCloudB.z - wpos.y);
  vec2 uv = (p - uEnvCloudC.xy) * uEnvCloudC.z + 0.5;
  vec2 b = abs(uv - 0.5);
  float inMap = 1.0 - smoothstep(0.42, 0.5, max(b.x, b.y));
  return 1.0 - uEnvCloudB.w * texture2D(uEnvCloudMap, uv).r * inMap;
}
`;

let installed = false;
/** Override three's ShaderChunk entries. Must run AFTER `new CSM()` (which installs its own overrides). */
export function installShaderChunks() {
  if (installed) return;
  installed = true;
  const SC = THREE.ShaderChunk;

  SC.fog_pars_vertex = /* glsl */`
varying vec3 vEnvWorldPos;
#ifdef USE_FOG
  varying float vFogDepth;
#endif
`;
  SC.fog_vertex = /* glsl */`
vEnvWorldPos = cameraPosition + mvPosition.xyz * mat3(viewMatrix);
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
#endif
`;
  SC.fog_pars_fragment = /* glsl */`
varying vec3 vEnvWorldPos;
#define ENV_WORLDPOS 1
uniform vec4 uEnvFogA;
uniform vec3 uEnvFogSun;
uniform vec3 uEnvFogSunCol;
uniform sampler2D uEnvSky;
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif
`;
  SC.fog_fragment = /* glsl */`
#ifdef USE_FOG
  #ifdef FOG_EXP2
    vec3 envFogRay = vEnvWorldPos - cameraPosition;
    float envFogDist = length(envFogRay);
    vec3 envFogDir = envFogRay / max(envFogDist, 1e-4);
    float envK = uEnvFogA.x;
    float envDy = envFogRay.y;
    float envHI = (abs(envDy * envK) > 1e-4) ? (1.0 - exp(-envDy * envK)) / (envDy * envK) : 1.0;
    float envAmt = fogDensity * exp(-max(cameraPosition.y - uEnvFogA.y, 0.0) * envK) * envHI * envFogDist;
    float fogFactor = 1.0 - exp(-envAmt);
    float envSunMu = max(dot(envFogDir, uEnvFogSun), 0.0);
    vec3 envFd = envFogDir;
    envFd.y = max(envFd.y, 0.004);
    envFd = normalize(envFd);
    vec2 envSkyUv = vec2(atan(envFd.z, envFd.x) * 0.15915494309 + 0.5, asin(clamp(envFd.y, -1.0, 1.0)) * 0.31830988618 + 0.5);
    vec3 envSkyCol = texture2D(uEnvSky, envSkyUv).rgb;
    vec3 envFogLin = mix(fogColor, envSkyCol, uEnvFogA.w) + uEnvFogSunCol * (pow(envSunMu, 8.0) * uEnvFogA.z + envSunMu * envSunMu * 0.08);
    #ifdef TONE_MAPPING
      envFogLin = toneMapping(envFogLin);
    #endif
    vec3 envFogOut = linearToOutputTexel(vec4(envFogLin, 1.0)).rgb;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, envFogOut, fogFactor);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
  #endif
#endif
`;

  // Cloud shadows: modulate the CSM directional light by the cloud layer projected along the sun.
  SC.lights_pars_begin = CSMShader.lights_pars_begin + /* glsl */`
#if defined( USE_CSM ) && defined( CSM_CASCADES )
${CLOUD_SHADOW_GLSL}
#endif
`;
  let frag = CSMShader.lights_fragment_begin;
  const marker = '#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && defined( USE_CSM ) && defined( CSM_CASCADES )';
  if (!frag.includes(marker)) throw new Error('environment: CSM shader layout changed');
  frag = frag.replace(marker, marker + `
	#ifdef ENV_WORLDPOS
	float envCS = envCloudShadow( vEnvWorldPos );
	#else
	float envCS = 1.0;
	#endif
`);
  // every directional-light evaluation inside the CSM block gets the cloud factor
  const csmStart = frag.indexOf(marker);
  const csmEnd = frag.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && !defined( USE_CSM )');
  const block = frag.slice(csmStart, csmEnd)
    .replaceAll('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= envCS;')
    .replaceAll('getDirectionalLightInfo( directionalLights[0], directLight );', 'getDirectionalLightInfo( directionalLights[0], directLight ); directLight.color *= envCS;');
  SC.lights_fragment_begin = frag.slice(0, csmStart) + block + frag.slice(csmEnd);
}

/** Add the shared environment uniforms to a compiled shader (called from onBeforeCompile hooks). */
export function addEnvUniforms(shader) {
  shader.uniforms.uEnvNoise = U.noise;
  shader.uniforms.uEnvCloudA = U.cloudA;
  shader.uniforms.uEnvCloudB = U.cloudB;
  shader.uniforms.uEnvFogA = U.fogA;
  shader.uniforms.uEnvFogSun = U.fogSun;
  shader.uniforms.uEnvFogSunCol = U.fogSunCol;
  shader.uniforms.uEnvSky = U.sky;
  shader.uniforms.uEnvCloudMap = U.cloudMap;
  shader.uniforms.uEnvCloudC = U.cloudC;
}
