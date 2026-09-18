// The single PBR material every building surface uses, plus the night-window shader injection.
//
// Window state is BAKED, never hashed in the fragment shader: `win` is a per-vertex vec4 that is
// constant across a window quad — (rand, tier, cool, bias) — drawn from ctx.rng at geometry build
// time. A hash of an interpolated varying produces per-pixel static at range; this cannot.
//   win.x  uniform random 0..1, compared against the lit threshold
//   win.y  baked brightness tier (three discrete values)
//   win.z  0 = warm lamp, 1 = cool white
//   win.w  how readily this building lights up (zone bias), 0 on non-window surfaces
// `bidx` is the building's slot index, used to look its info-view tint out of a 512×1 data texture.

import * as THREE from 'three';
import { RENDER_ORDER } from '../../core/constants.js';
import { WIN_TIER_SCALE, WIN_BIAS_SCALE } from './geom.js';

export const TINT_SLOTS = 512;

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
    envMapIntensity: 0.65,
    dithering: true,
  });
  // item 15: facade normals stay shallow (≤ 0.6) and fade with distance so mid-range facades
  // cannot sparkle; the roughness floors live in the atlas ORM channel.
  m.normalScale.set(0.55, 0.55);
  m.userData.buildings = true;

  m.onBeforeCompile = (shader) => {
    for (const k of Object.keys(uniforms)) if (k[0] !== '_') shader.uniforms[k] = uniforms[k];

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 win;
attribute float bidx;
varying vec4 vWin;
varying float vBIdx;
varying float vDist;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
	vWin = vec4( win.x, win.y * ${WIN_TIER_SCALE.toFixed(1)}, win.z, win.w * ${WIN_BIAS_SCALE.toFixed(1)} );
	vBIdx = bidx;
	vDist = length( ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz );`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vWin;
varying float vBIdx;
varying float vDist;
uniform float uNight;
uniform float uLit;
uniform float uEmis;
uniform float uNightDark;
uniform float uInfo;
uniform float uNormalFar;
uniform sampler2D uTintTex;`);

    // distance fade on the tangent-space normal (item 15: ≤ 0.25 of full strength beyond 150 m)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * mix( 1.0, uNormalFar, smoothstep( 60.0, 150.0, vDist ) );'));

    // night: the facade mass itself goes dark so the windows are the only bright thing (cs2_8).
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
	diffuseColor.rgb *= mix( 1.0, uNightDark, uNight );
	// info-view tint: an unconditional fetch (a texture read inside a branch is undefined behaviour
	// on some drivers, and cost us every shaded facade in an earlier build of this round)
	vec4 ivTint = texture2D( uTintTex, vec2( ( floor( vBIdx + 0.5 ) + 0.5 ) / ${TINT_SLOTS}.0, 0.5 ) );
	diffuseColor.rgb = mix( diffuseColor.rgb, ivTint.rgb, 0.88 * uInfo * ivTint.a );`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <emissivemap_fragment>', `
#ifdef USE_EMISSIVEMAP
	// Fade subpixel interior contrast as panes recede; the baked on/off state stays constant.
	float winMask = texture2D( emissiveMap, vEmissiveMapUv, 2.0 * smoothstep( 200.0, 320.0, vDist ) ).r;
	float on = step( 1.0 - clamp( uLit * vWin.w, 0.0, 0.96 ), vWin.x );
	vec3 warm = vec3( 1.0, 0.58, 0.22 );
	vec3 cool = vec3( 0.74, 0.86, 1.0 );
	vec3 tint = mix( warm, cool, vWin.z );
	// Preserve the established dim/mid tiers, but roll the rare brightest tier off before it clips
	// into a flat white panel under the night exposure.
	float displayTier = vWin.y <= 0.86 ? vWin.y : 0.86 + ( vWin.y - 0.86 ) * 0.35;
	totalEmissiveRadiance = vec3( 0.0 );
	if ( uNight > 0.0 ) totalEmissiveRadiance = winMask * on * uNight * uEmis * tint * displayTier * mix( 1.0, 0.07, smoothstep( 200.0, 300.0, vDist ) );
	// a whisper of interior behind unlit glass — 2 % of the lit tier, inside window cells only
	totalEmissiveRadiance += winMask * vWin.w * uNight * uEmis * 0.02 * vec3( 0.30, 0.34, 0.46 );
	totalEmissiveRadiance *= ( 1.0 - uInfo * ivTint.a );
#endif
`);
  };
  m.customProgramCacheKey = () => 'buildings-night-v4';
  return m;
}

export function createUniforms() {
  const data = new Uint8Array(TINT_SLOTS * 4);
  const tintTex = new THREE.DataTexture(data, TINT_SLOTS, 1, THREE.RGBAFormat);
  tintTex.magFilter = THREE.NearestFilter;
  tintTex.minFilter = THREE.NearestFilter;
  tintTex.generateMipmaps = false;
  tintTex.needsUpdate = true;
  return {
    uNight: { value: 0 },
    uLit: { value: 0.5 },
    uEmis: { value: 1.0 },
    uNightDark: { value: 0.10 },
    uInfo: { value: 0 },
    uNormalFar: { value: 0.40 },
    uTintTex: { value: tintTex },
    _tintData: data,
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
