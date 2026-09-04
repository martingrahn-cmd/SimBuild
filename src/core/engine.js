import * as THREE from 'three';
import { QUALITY } from './constants.js';

// Renderer + scene + frame loop + stats. Modules never call renderer.render; `effects` may install a composer.
export class Engine {
  constructor(canvas, { quality = 'high', headless = false } = {}) {
    this.canvas = canvas;
    this.quality = quality;
    this.q = QUALITY[quality] || QUALITY.high;
    this.headless = headless;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: false,
      preserveDrawingBuffer: headless, stencil: false,
    });
    this.renderer.setPixelRatio(headless ? 1 : Math.min(window.devicePixelRatio || 1, this.q.pixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x0a0d14, 1);
    this.scene = new THREE.Scene();
    this.composer = null;
    this._before = []; this._after = [];
    this.stats = { fps: 0, frameMs: 0, drawCalls: 0, triangles: 0, programs: 0, textures: 0, geometries: 0, frames: 0, updateMs: 0, moduleMs: {} };
    this._fpsAcc = 0; this._fpsFrames = 0;
    this.width = 1; this.height = 1;
    this._resizeHandlers = [];
  }
  setSize(w, h) {
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false);
    if (this.composer && this.composer.setSize) this.composer.setSize(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
    for (const fn of this._resizeHandlers) { try { fn(w, h); } catch (e) { console.error(e); } }
  }
  onResize(fn) { this._resizeHandlers.push(fn); return () => { this._resizeHandlers = this._resizeHandlers.filter((f) => f !== fn); }; }
  onBeforeRender(fn) { this._before.push(fn); return () => { this._before = this._before.filter((f) => f !== fn); }; }
  onAfterRender(fn) { this._after.push(fn); return () => { this._after = this._after.filter((f) => f !== fn); }; }
  /** effects module only: object with render(dt) and setSize(w,h). Pass null to restore direct rendering. */
  setComposer(composer) { this.composer = composer; if (composer?.setSize) composer.setSize(this.width * this.renderer.getPixelRatio(), this.height * this.renderer.getPixelRatio()); }
  render(camera, dt) {
    const t0 = performance.now();
    for (const fn of this._before) { try { fn(dt, camera); } catch (e) { console.error('[engine:before]', e); } }
    const info = this.renderer.info;
    info.reset();
    info.autoReset = false;
    try {
      if (this.composer) this.composer.render(dt);
      else this.renderer.render(this.scene, camera);
    } catch (e) {
      console.error('[engine:render]', e);
      if (this.composer) { this.composer = null; }
    }
    for (const fn of this._after) { try { fn(dt, camera); } catch (e) { console.error('[engine:after]', e); } }
    const ms = performance.now() - t0;
    const s = this.stats;
    s.frameMs = ms; s.drawCalls = info.render.calls; s.triangles = info.render.triangles;
    s.programs = info.programs?.length || 0; s.textures = info.memory.textures; s.geometries = info.memory.geometries;
    s.frames++;
    this._fpsAcc += dt; this._fpsFrames++;
    if (this._fpsAcc >= 0.5) { s.fps = this._fpsFrames / this._fpsAcc; this._fpsAcc = 0; this._fpsFrames = 0; }
    info.autoReset = true;
  }
}
