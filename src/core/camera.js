import * as THREE from 'three';
import { WORLD_SIZE } from './constants.js';

// City camera: orbit around a ground target with pan/zoom/rotate + tilt, presets and fly-to.
export class CityCamera {
  constructor(world, events, domElement) {
    this.world = world;
    this.events = events;
    this.dom = domElement;
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 6000);
    this.target = new THREE.Vector3(0, 0, 0);
    this.distance = 400;
    this.yaw = Math.PI * 0.25;   // radians around Y
    this.pitch = 0.9;            // radians above the ground plane (0 = horizon, PI/2 = top-down)
    this.minDistance = 8; this.maxDistance = 3000;
    this.minPitch = 0.08; this.maxPitch = 1.5; // relaxed by ?pitch= (debug) so critics can inspect the sky
    this.enabled = true;
    this._fly = null;
    this._lastEmit = 0;
    this._drag = null;
    this._keys = new Set();
    this.presets = {
      aerial:       { yaw: 0.6,  pitch: 0.85, distance: 520, target: [0, 0, 0] },
      overview:     { yaw: 0.2,  pitch: 1.35, distance: 1400, target: [0, 0, 0] },
      skyline:      { yaw: 2.2,  pitch: 0.16, distance: 900, target: [0, 40, 0] },
      street:       { yaw: 0.9,  pitch: 0.18, distance: 60, target: [40, 0, 40] },
      closeup:      { yaw: 0.6,  pitch: 0.35, distance: 110, target: [20, 6, 20] },
      night_street: { yaw: 1.3,  pitch: 0.14, distance: 90, target: [-40, 0, 60] },
    };
    this._bind();
    this.apply('aerial');
    this.updateCamera();
  }
  get position() { return this.camera.position; }
  setViewport(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  registerPreset(name, preset) { this.presets[name] = preset; }
  apply(preset) {
    const p = typeof preset === 'string' ? this.presets[preset] : preset;
    if (!p) return false;
    this._fly = null;
    if (p.position && p.target) {
      this.target.fromArray(p.target);
      const pos = new THREE.Vector3().fromArray(p.position);
      this._fromPosition(pos);
    } else {
      if (p.target) this.target.fromArray(p.target);
      if (p.yaw !== undefined) this.yaw = p.yaw;
      if (p.pitch !== undefined) this.pitch = p.pitch;
      if (p.distance !== undefined) this.distance = p.distance;
    }
    this._clamp();
    this.updateCamera();
    return true;
  }
  _fromPosition(pos) {
    const d = pos.clone().sub(this.target);
    this.distance = d.length();
    this.pitch = Math.asin(THREE.MathUtils.clamp(d.y / this.distance, -1, 1));
    this.yaw = Math.atan2(d.x, d.z);
  }
  flyTo(preset, seconds = 2) {
    const p = typeof preset === 'string' ? this.presets[preset] : preset;
    if (!p) return;
    const to = { yaw: p.yaw ?? this.yaw, pitch: p.pitch ?? this.pitch, distance: p.distance ?? this.distance, target: new THREE.Vector3().fromArray(p.target || this.target.toArray()) };
    if (p.position) {
      const d = to.target.clone().sub(new THREE.Vector3().fromArray(p.position)).negate();
      to.distance = d.length(); to.pitch = Math.asin(d.y / to.distance); to.yaw = Math.atan2(d.x, d.z);
    }
    this._fly = { from: { yaw: this.yaw, pitch: this.pitch, distance: this.distance, target: this.target.clone() }, to, t: 0, dur: seconds };
  }
  enableControls(v) { this.enabled = v; }
  _clamp() {
    this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance);
    this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
    const lim = WORLD_SIZE / 2 + 200;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -lim, lim);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -lim, lim);
  }
  updateCamera() {
    const groundY = this.world.terrain.getHeight(this.target.x, this.target.z);
    const ty = Math.max(this.target.y, groundY);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const px = this.target.x + Math.sin(this.yaw) * cp * this.distance;
    const pz = this.target.z + Math.cos(this.yaw) * cp * this.distance;
    let py = ty + sp * this.distance;
    const g = this.world.terrain.getHeight(px, pz) + 2.0;
    if (py < g) py = g;
    this.camera.position.set(px, py, pz);
    this.camera.lookAt(this.target.x, ty, this.target.z);
    this.camera.near = Math.max(0.5, this.distance * 0.002);
    this.camera.far = Math.max(6000, this.distance * 8);
    this.camera.updateProjectionMatrix();
  }
  update(dt) {
    if (this._fly) {
      const f = this._fly; f.t += dt;
      const k = THREE.MathUtils.smoothstep(Math.min(1, f.t / f.dur), 0, 1);
      this.yaw = THREE.MathUtils.lerp(f.from.yaw, f.to.yaw, k);
      this.pitch = THREE.MathUtils.lerp(f.from.pitch, f.to.pitch, k);
      this.distance = THREE.MathUtils.lerp(f.from.distance, f.to.distance, k);
      this.target.lerpVectors(f.from.target, f.to.target, k);
      if (f.t >= f.dur) this._fly = null;
    }
    if (this.enabled && this._keys.size) {
      const sp = this.distance * 0.8 * dt;
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      if (this._keys.has('KeyW') || this._keys.has('ArrowUp')) { this.target.x -= fx * sp; this.target.z -= fz * sp; }
      if (this._keys.has('KeyS') || this._keys.has('ArrowDown')) { this.target.x += fx * sp; this.target.z += fz * sp; }
      if (this._keys.has('KeyA') || this._keys.has('ArrowLeft')) { this.target.x -= fz * sp; this.target.z += fx * sp; }
      if (this._keys.has('KeyD') || this._keys.has('ArrowRight')) { this.target.x += fz * sp; this.target.z -= fx * sp; }
      if (this._keys.has('KeyQ')) this.yaw += dt * 1.2;
      if (this._keys.has('KeyE')) this.yaw -= dt * 1.2;
    }
    this._clamp();
    this.updateCamera();
    this._lastEmit += dt;
    if (this._lastEmit > 0.1) {
      this._lastEmit = 0;
      this.events.emit('camera:changed', { position: this.camera.position, target: this.target, distance: this.distance });
    }
  }
  /** Ray from NDC to the terrain. */
  screenToGround(ndcX, ndcY) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = this.world.terrain.raycast(ray.ray);
    return hit ? { x: hit.point.x, y: hit.point.y, z: hit.point.z, normal: hit.normal } : null;
  }
  _bind() {
    const el = this.dom;
    if (!el) return;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
        this._drag = { mode: e.button === 1 || e.ctrlKey ? 'pan' : 'orbit', x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!this._drag || !this.enabled) return;
      const dx = e.clientX - this._drag.x, dy = e.clientY - this._drag.y;
      this._drag.x = e.clientX; this._drag.y = e.clientY;
      if (this._drag.mode === 'orbit') { this.yaw -= dx * 0.005; this.pitch += dy * 0.005; }
      else {
        const sp = this.distance * 0.0015;
        const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
        this.target.x -= (fz * dx - fx * dy) * sp; this.target.z += (fx * dx + fz * dy) * sp;
      }
      this._clamp(); this.updateCamera();
    });
    el.addEventListener('pointerup', () => { this._drag = null; });
    el.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.distance *= Math.exp(e.deltaY * 0.0012);
      this._clamp(); this.updateCamera();
    }, { passive: false });
    window.addEventListener('keydown', (e) => { if (!e.target.closest('input,textarea')) this._keys.add(e.code); });
    window.addEventListener('keyup', (e) => this._keys.delete(e.code));
    window.addEventListener('blur', () => this._keys.clear());
  }
}
