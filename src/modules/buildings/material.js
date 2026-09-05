// The single PBR material every building surface uses, plus the night-window shader injection.
// `win` (a per-vertex window-grid coordinate) lets the fragment shader hash each window cell to a
// deterministic on/off state and a warm/cool tint, so a whole city lights up window by window.

import * as THREE from 'three';
import { RENDER_ORDER } from '../../core/constants.js';

export function createBuildingMaterial(tex, uniforms) {
  const m = new THREE.MeshStandardMaterial({
    map: tex.map,
    normalMap: tex.normalMap,
    roughnessMap: tex.ormMap,
    metalnessMap: tex.ormMap,
    emissiveMap: tex.emissiveMap,
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: 1,
    roughness: 1,
    metalness: 1,
    vertexColors: true,
    envMapIntensity: 1.0,
    dithering: true,
  });
  m.normalScale.set(1.0, 1.0);
  m.userData.buildings = true;

  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = uniforms.uNight;
    shader.uniforms.uLit = uniforms.uLit;
    shader.uniforms.uEmis = uniforms.uEmis;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 win;\nvarying vec2 vWinCell;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvWinCell = win;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec2 vWinCell;
uniform float uNight;
uniform float uLit;
uniform float uEmis;
float bHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }`)
      .replace('#include <emissivemap_fragment>', `
#ifdef USE_EMISSIVEMAP
	float winMask = texture2D( emissiveMap, vEmissiveMapUv ).r;
	vec2 cell = floor( vWinCell );
	float h1 = bHash( cell );
	float h2 = bHash( cell + 37.13 );
	float h3 = bHash( cell + 91.71 );
	float on = step( 1.0 - uLit * (0.45 + 1.1 * h3), h1 );
	vec3 warm = vec3( 1.0, 0.68, 0.34 );
	vec3 cool = vec3( 0.74, 0.85, 1.0 );
	vec3 tint = mix( warm, cool, smoothstep( 0.68, 0.82, h2 ) );
	totalEmissiveRadiance = winMask * on * uNight * uEmis * tint * (0.45 + 0.75 * h2 * h2);
	// a touch of interior glow behind unlit glass so night facades are not pure black
	totalEmissiveRadiance += winMask * uNight * uEmis * 0.03 * vec3( 0.5, 0.55, 0.72 );
#endif
`);
  };
  m.customProgramCacheKey = () => 'buildings-night';
  return m;
}

export function createUniforms() {
  return {
    uNight: { value: 0 },
    uLit: { value: 0.5 },
    uEmis: { value: 1.25 },
  };
}

export function applyMeshDefaults(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.renderOrder = RENDER_ORDER.BUILDINGS;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}
