// Materials for traffic. One shared MeshStandardMaterial drives every vehicle class: per-vertex `aMat`
// selects paint / glass / tyre / rim / lens / trim, per-instance attributes carry the paint colour, the
// wheel spin angle (wheels are rotated in the vertex shader so a car is still ONE draw call) and the
// head/brake light intensities.
import * as THREE from 'three';

const VEH_VERT_PARS = /* glsl */`
attribute float aMat;
attribute vec4 aWheel;
attribute vec3 aPaint;
attribute vec2 aLights;
attribute float aSpin;
varying float vMat;
varying vec3 vPaint;
varying vec2 vLights;
`;

const VEH_BEGIN = /* glsl */`
vMat = aMat;
vPaint = aPaint;
vLights = aLights;
vec3 transformed = vec3( position );
if ( aWheel.w > 0.5 ) {
  vec3 rel = transformed - aWheel.xyz;
  float cs = cos( aSpin ), sn = sin( aSpin );
  transformed = aWheel.xyz + vec3( rel.x, rel.y * cs - rel.z * sn, rel.y * sn + rel.z * cs );
}
`;

const VEH_NORMAL = /* glsl */`
vec3 objectNormal = vec3( normal );
if ( aWheel.w > 0.5 ) {
  float cs = cos( aSpin ), sn = sin( aSpin );
  objectNormal = vec3( objectNormal.x, objectNormal.y * cs - objectNormal.z * sn, objectNormal.y * sn + objectNormal.z * cs );
}
`;

const VEH_FRAG_PARS = /* glsl */`
varying float vMat;
varying vec3 vPaint;
varying vec2 vLights;
`;

const VEH_COLOR = /* glsl */`
float vm = vMat;
vec3 tCol = vPaint;
float tRgh = 0.30;
float tMtl = 0.62;
vec3 tEmi = vec3( 0.0 );
if ( vm < 0.5 ) {
  tCol = vPaint;
} else if ( vm < 1.5 ) {           // glass
  tCol = vec3( 0.030, 0.036, 0.044 );
  tRgh = 0.06; tMtl = 0.80;
} else if ( vm < 2.5 ) {           // tyre
  tCol = vec3( 0.031, 0.031, 0.033 );
  tRgh = 0.88; tMtl = 0.0;
} else if ( vm < 3.5 ) {           // rim
  tCol = vec3( 0.58, 0.59, 0.61 );
  tRgh = 0.26; tMtl = 0.92;
} else if ( vm < 4.5 ) {           // headlight lens
  tCol = vec3( 0.78, 0.81, 0.86 );
  tRgh = 0.09; tMtl = 0.20;
  tEmi = vec3( 1.0, 0.95, 0.84 ) * vLights.x * 2.3;
} else if ( vm < 5.5 ) {           // tail lens
  tCol = vec3( 0.26, 0.028, 0.022 );
  tRgh = 0.14; tMtl = 0.12;
  tEmi = vec3( 1.0, 0.075, 0.030 ) * ( vLights.x * 0.70 + vLights.y * 2.0 );
} else if ( vm < 6.5 ) {           // bumper / trim
  tCol = vec3( 0.082, 0.085, 0.090 );
  tRgh = 0.50; tMtl = 0.28;
} else if ( vm < 7.5 ) {           // cargo panel
  tCol = mix( vPaint, vec3( 0.86, 0.86, 0.85 ), 0.74 );
  tRgh = 0.44; tMtl = 0.06;
} else if ( vm < 8.5 ) {           // underbody
  tCol = vec3( 0.020, 0.020, 0.022 );
  tRgh = 0.95; tMtl = 0.0;
} else {                           // lit sign
  tCol = vec3( 0.90, 0.76, 0.16 );
  tRgh = 0.36; tMtl = 0.0;
  tEmi = vec3( 1.0, 0.80, 0.26 ) * ( 0.15 + vLights.x * 0.85 );
}
diffuseColor.rgb *= tCol;
`;

export function createVehicleMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.6 });
  m.name = 'traffic:vehicle';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = VEH_VERT_PARS + sh.vertexShader;
    sh.vertexShader = sh.vertexShader
      .replace('#include <begin_vertex>', VEH_BEGIN)
      .replace('#include <beginnormal_vertex>', VEH_NORMAL);
    sh.fragmentShader = VEH_FRAG_PARS + sh.fragmentShader;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + VEH_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = tRgh;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = tMtl;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += tEmi;');
  };
  m.customProgramCacheKey = () => 'traffic-vehicle-1';
  return m;
}

/** Depth material so shadows use the spun-wheel positions (and don't crash on the custom attributes). */
export function createVehicleDepthMaterial() {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = `
attribute vec4 aWheel;
attribute float aSpin;
` + sh.vertexShader.replace('#include <begin_vertex>', `
vec3 transformed = vec3( position );
if ( aWheel.w > 0.5 ) {
  vec3 rel = transformed - aWheel.xyz;
  float cs = cos( aSpin ), sn = sin( aSpin );
  transformed = aWheel.xyz + vec3( rel.x, rel.y * cs - rel.z * sn, rel.y * sn + rel.z * cs );
}
`);
  };
  m.customProgramCacheKey = () => 'traffic-vehicle-depth-1';
  return m;
}

// ---------------------------------------------------------------- headlight glow / ground cone
const LIGHT_VERT = /* glsl */`
attribute vec2 aUv;
attribute float aLamp;
attribute vec2 aLights;
varying vec2 vLUv;
varying float vLamp;
varying vec2 vLInt;
`;

const LIGHT_FRAG = /* glsl */`
varying vec2 vLUv;
varying float vLamp;
varying vec2 vLInt;
`;

export function createLightMaterial() {
  const m = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  m.name = 'traffic:lights';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = LIGHT_VERT + sh.vertexShader.replace('#include <begin_vertex>', `
#include <begin_vertex>
vLUv = aUv; vLamp = aLamp; vLInt = aLights;
`);
    sh.fragmentShader = LIGHT_FRAG + sh.fragmentShader.replace('#include <color_fragment>', `
vec2 q = vLUv;
float a; vec3 c;
if ( vLamp < 0.5 ) {
  float across = 1.0 - abs( q.x * 2.0 - 1.0 );
  float near = smoothstep( 0.0, 0.10, q.y );
  a = pow( max( across, 0.0 ), 2.1 ) * pow( max( 1.0 - q.y, 0.0 ), 2.4 ) * near * 0.115 * vLInt.x * vLInt.x;
  c = vec3( 1.0, 0.93, 0.76 );
} else if ( vLamp < 1.5 ) {
  float r = length( q - 0.5 ) * 2.0;
  a = pow( max( 0.0, 1.0 - r ), 2.8 ) * vLInt.x * 0.42;
  c = vec3( 1.0, 0.96, 0.87 );
} else {
  float r = length( q - 0.5 ) * 2.0;
  a = pow( max( 0.0, 1.0 - r ), 3.0 ) * ( vLInt.x * 0.26 + vLInt.y * 0.85 );
  c = vec3( 1.0, 0.12, 0.05 );
}
diffuseColor = vec4( c * a, 1.0 );
`);
  };
  m.customProgramCacheKey = () => 'traffic-lightrig-1';
  return m;
}

// ---------------------------------------------------------------- pedestrians
const PED_VERT = /* glsl */`
attribute float aMat;
attribute float aLimb;
attribute vec3 aPivot;
attribute vec3 aShirt;
attribute vec3 aPants;
attribute vec2 aTone;
attribute vec2 aWalk;
varying float pMat;
varying vec3 pShirt;
varying vec3 pPants;
varying vec2 pTone;
`;

const PED_BEGIN = /* glsl */`
pMat = aMat; pShirt = aShirt; pPants = aPants; pTone = aTone;
vec3 transformed = vec3( position );
float swing = sin( aWalk.x ) * aWalk.y;
float ang = 0.0;
if ( aLimb > 0.5 ) {
  if ( aLimb < 1.5 ) ang = swing;
  else if ( aLimb < 2.5 ) ang = -swing;
  else if ( aLimb < 3.5 ) ang = -swing * 0.7;
  else ang = swing * 0.7;
  vec3 rel = transformed - aPivot;
  float cs = cos( ang ), sn = sin( ang );
  transformed = aPivot + vec3( rel.x, rel.y * cs - rel.z * sn, rel.y * sn + rel.z * cs );
}
transformed.y += aWalk.y * 0.055 * ( cos( aWalk.x * 2.0 ) * 0.5 - 0.5 );
`;

const PED_NORMAL = /* glsl */`
vec3 objectNormal = vec3( normal );
if ( aLimb > 0.5 ) {
  float sw = sin( aWalk.x ) * aWalk.y;
  float an = aLimb < 1.5 ? sw : ( aLimb < 2.5 ? -sw : ( aLimb < 3.5 ? -sw * 0.7 : sw * 0.7 ) );
  float cs = cos( an ), sn = sin( an );
  objectNormal = vec3( objectNormal.x, objectNormal.y * cs - objectNormal.z * sn, objectNormal.y * sn + objectNormal.z * cs );
}
`;

const PED_COLOR = /* glsl */`
vec3 pc;
float pr = 0.78;
if ( pMat < 0.5 ) pc = pShirt;
else if ( pMat < 1.5 ) pc = pPants;
else if ( pMat < 2.5 ) pc = mix( vec3( 0.84, 0.66, 0.53 ), vec3( 0.30, 0.19, 0.13 ), pTone.x );
else if ( pMat < 3.5 ) { pc = mix( vec3( 0.055, 0.045, 0.040 ), vec3( 0.46, 0.32, 0.16 ), pTone.y ); pr = 0.62; }
else { pc = vec3( 0.045, 0.045, 0.050 ); pr = 0.70; }
diffuseColor.rgb *= pc;
`;

export function createPedestrianMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 });
  m.name = 'traffic:pedestrian';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = PED_VERT + sh.vertexShader
      .replace('#include <begin_vertex>', PED_BEGIN)
      .replace('#include <beginnormal_vertex>', PED_NORMAL);
    sh.fragmentShader = `
varying float pMat;
varying vec3 pShirt;
varying vec3 pPants;
varying vec2 pTone;
` + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + PED_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = pr;');
  };
  m.customProgramCacheKey = () => 'traffic-ped-1';
  return m;
}

// ---------------------------------------------------------------- paint palettes
export const PAINTS = [
  [0.72, 0.73, 0.75], [0.78, 0.79, 0.80], [0.055, 0.058, 0.065], [0.10, 0.11, 0.13],
  [0.22, 0.24, 0.27], [0.36, 0.38, 0.41], [0.52, 0.09, 0.08], [0.30, 0.05, 0.05],
  [0.06, 0.13, 0.30], [0.10, 0.22, 0.42], [0.05, 0.19, 0.16], [0.42, 0.36, 0.24],
  [0.60, 0.45, 0.12], [0.14, 0.30, 0.44], [0.46, 0.47, 0.50], [0.86, 0.86, 0.85],
];
export const PAINT_WEIGHTS = [10, 9, 9, 8, 7, 6, 4, 3, 4, 4, 3, 3, 2, 3, 6, 7];

export const SHIRTS = [
  [0.62, 0.20, 0.18], [0.20, 0.30, 0.52], [0.16, 0.36, 0.30], [0.72, 0.66, 0.52],
  [0.10, 0.11, 0.14], [0.78, 0.78, 0.80], [0.52, 0.32, 0.14], [0.34, 0.18, 0.40],
  [0.80, 0.56, 0.16], [0.24, 0.48, 0.56], [0.55, 0.56, 0.58], [0.14, 0.24, 0.20],
];
export const PANTS = [
  [0.14, 0.17, 0.26], [0.10, 0.11, 0.13], [0.24, 0.22, 0.20], [0.34, 0.30, 0.26],
  [0.18, 0.19, 0.22], [0.42, 0.40, 0.36], [0.20, 0.26, 0.34],
];
