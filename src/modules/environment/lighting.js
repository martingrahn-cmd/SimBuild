// Cascaded shadow maps (sun/moon), automatic material hook-up (CSM defines + shared env uniforms),
// PMREM environment lighting from the sky's ambient LUT.
import * as THREE from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { QUALITY } from '../../core/constants.js';
import { installShaderChunks, addEnvUniforms } from './shaders.js';

const LIT = (m) => !!(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial);

export class Lighting {
  constructor(ctx) {
    this.ctx = ctx;
    const q = QUALITY[ctx.quality] || QUALITY.high;
    this.cascades = Math.max(2, Math.min(4, q.cascades || 3));
    this.mapSize = q.shadowMap || 2048;
    this.maxFar = 1400;
    this.camera = ctx.camera.camera;
    this.csm = new CSM({
      camera: this.camera, parent: ctx.group, cascades: this.cascades, maxFar: this.maxFar, mode: 'practical',
      shadowMapSize: this.mapSize, shadowBias: -0.00012, lightDirection: new THREE.Vector3(0.3, -0.8, 0.5).normalize(),
      lightIntensity: 3, lightNear: 1, lightFar: 4000, lightMargin: 400,
    });
    this.csm.fade = true;
    for (const l of this.csm.lights) {
      l.shadow.normalBias = 0.35;
      l.shadow.radius = 1.6;
      l.name = 'sun-cascade';
    }
    installShaderChunks(); // after CSM installed its own chunk overrides
    this._camKey = '';
    this._seen = new WeakSet();
    this.envRT = null;
    this.pmrem = new THREE.PMREMGenerator(ctx.renderer);
    this.pmrem.compileEquirectangularShader();

    // Material hook-up is event driven (no per-frame scene traversal): sweep when a module comes up,
    // whenever any world section changes (new meshes), and when the top-level object count changes.
    this._sweepPending = true;
    this._shape = -1;
    this._settleFrames = 0;
    const ev = ctx.events;
    const owner = 'environment';
    ev.on('module:ready', () => { this._sweepPending = true; }, owner);
    ev.on('app:ready', () => { this._sweepPending = true; this._settleFrames = 30; }, owner);
    ev.on('*', (_p, name) => { if (name.endsWith(':changed')) this._sweepPending = true; }, owner);
  }

  /** Per-frame: point the cascades along dir (direction light travels), set colour/intensity. */
  setLight(dirToLight, color, intensity) {
    this.csm.lightDirection.copy(dirToLight).negate();
    for (const l of this.csm.lights) { l.color.copy(color); l.intensity = intensity; }
  }

  update(distance) {
    const cam = this.camera;
    const maxFar = THREE.MathUtils.clamp(distance * 3.2, 900, 3200);
    const key = `${cam.near.toFixed(3)}|${cam.far}|${cam.aspect.toFixed(4)}|${cam.fov}`;
    if (key !== this._camKey || Math.abs(maxFar - this.maxFar) > this.maxFar * 0.12) {
      this._camKey = key; this.maxFar = maxFar; this.csm.maxFar = maxFar;
      this.csm.updateFrustums();
    }
    this.csm.update();
    // cheap shape check: direct children of the scene and of each module group (O(#modules), no traversal)
    const scene = this.ctx.scene;
    let shape = scene.children.length;
    for (let i = 0; i < scene.children.length; i++) shape += scene.children[i].children.length * 131;
    if (shape !== this._shape) { this._shape = shape; this._sweepPending = true; }
    if (this._settleFrames > 0) { this._settleFrames--; this._sweepPending = true; }
    if (this._sweepPending) { this._sweepPending = false; this.sweep(); }
  }

  sweep() {
    this.ctx.scene.traverse((o) => {
      const m = o.material;
      if (!m) return;
      if (Array.isArray(m)) { for (const mm of m) this.setupMaterial(mm); } else this.setupMaterial(m);
    });
  }

  /** Hook a material: CSM cascades (lit materials) + shared fog/cloud uniforms. Idempotent, chain-safe. */
  setupMaterial(material) {
    if (!material || this._seen.has(material) || material.userData?.envSkip) return;
    this._seen.add(material);
    if (material.isShaderMaterial || material.isRawShaderMaterial) {
      // custom shaders: hand them the shared uniforms; lit ones also get the CSM defines/uniforms so that
      // `#include <lights_fragment_begin>` takes the cascaded path instead of summing all cascade lights.
      if (!material.uniforms) return;
      addEnvUniforms({ uniforms: material.uniforms });
      if (material.lights) {
        material.defines = material.defines || {};
        material.defines.USE_CSM = 1;
        material.defines.CSM_CASCADES = this.cascades;
        if (this.csm.fade) material.defines.CSM_FADE = '';
        const breaks = [];
        this.csm._getExtendedBreaks(breaks);
        material.uniforms.CSM_cascades = { value: breaks };
        material.uniforms.cameraNear = { value: this.camera.near };
        material.uniforms.shadowFar = { value: Math.min(this.camera.far, this.csm.maxFar) };
        this.csm.shaders.set(material, { uniforms: material.uniforms });
        material.needsUpdate = true;
      }
      return;
    }
    const lit = LIT(material);
    const prevHook = material.onBeforeCompile;
    const prevHasKey = Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey');
    const prevKey = prevHasKey ? material.customProgramCacheKey.bind(material) : null;
    let csmHook = null;
    if (lit) {
      this.csm.setupMaterial(material);   // sets defines + replaces onBeforeCompile
      csmHook = material.onBeforeCompile;
    }
    material.onBeforeCompile = (shader, renderer) => {
      if (prevHook) prevHook.call(material, shader, renderer);
      if (csmHook) csmHook.call(material, shader, renderer);
      addEnvUniforms(shader);
    };
    material.customProgramCacheKey = () => (prevKey ? prevKey() : (prevHook ? prevHook.toString() : '')) + '|env2';
    material.needsUpdate = true;
  }

  /** Rebuild the PMREM environment from an equirect radiance texture. */
  updateEnvironment(equirectTexture) {
    if (!this.pmrem) return;
    const rt = this.pmrem.fromEquirectangular(equirectTexture);
    const scene = this.ctx.scene;
    const old = this.envRT;
    scene.environment = rt.texture;
    this.envRT = rt;
    if (old) old.dispose();
  }

  dispose() {
    this.csm.remove();
    this.csm.dispose();
    if (this.envRT) { this.envRT.dispose(); this.ctx.scene.environment = null; }
    if (this.pmrem) this.pmrem.dispose();
  }
}
