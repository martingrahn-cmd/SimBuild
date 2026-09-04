import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { makeNoise2D } from './rng.js';

// CC0 asset loader. Every loader resolves even on failure (procedural fallback + warning).
// PBR sets live in public/assets/<name>/ and are described by public/assets/manifest.json.
export class Assets {
  constructor(renderer, log) {
    this.renderer = renderer;
    this.log = log;
    this.manifest = null;
    this.cache = new Map();
    this.pending = 0;
    this.maxAnisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    this.anisotropy = Math.min(8, this.maxAnisotropy);
    this._tex = new THREE.TextureLoader();
    this._gltf = new GLTFLoader();
    this._hdr = new RGBELoader();
    this.procedural = new Procedural(this);
  }
  async loadManifest() {
    try {
      const r = await fetch('/assets/manifest.json');
      this.manifest = r.ok ? await r.json() : { assets: [] };
    } catch (e) { this.manifest = { assets: [] }; }
    this._byName = new Map((this.manifest.assets || []).map((a) => [a.name, a]));
    return this.manifest;
  }
  _track(p) {
    this.pending++;
    return p.finally(() => { this.pending--; });
  }
  /** Load a single texture. opts: {srgb, repeat:[x,y], wrap, anisotropy, flipY} */
  texture(url, opts = {}) {
    const key = `tex:${url}:${JSON.stringify(opts)}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = this._track(new Promise((resolve) => {
      this._tex.load(url, (t) => {
        this._setup(t, opts); resolve(t);
      }, undefined, (err) => {
        this.log?.warn(`texture failed: ${url}`);
        const t = opts.srgb ? this.procedural.solid(0x808080) : this.procedural.solid(opts.fallback ?? 0x8080ff);
        this._setup(t, opts); resolve(t);
      });
    }));
    this.cache.set(key, p);
    return p;
  }
  _setup(t, opts) {
    t.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = opts.wrap === 'clamp' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
    t.anisotropy = opts.anisotropy ?? this.anisotropy;
    if (opts.flipY !== undefined) t.flipY = opts.flipY;
    t.needsUpdate = true;
  }
  /**
   * Load a PBR set by manifest name. Returns {map, normalMap, roughnessMap, aoMap, displacementMap, metalnessMap}
   * with missing maps as null. Falls back to a procedural set if the manifest entry is missing.
   */
  async pbr(name, opts = {}) {
    const key = `pbr:${name}:${JSON.stringify(opts)}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = this._track((async () => {
      if (!this.manifest) await this.loadManifest();
      const entry = this._byName.get(name);
      if (!entry) {
        this.log?.warn(`pbr set "${name}" not in manifest; using procedural fallback`);
        return this.procedural.pbrFallback(name, opts);
      }
      const base = `/assets/${entry.name}/`;
      const files = entry.files || {};
      const load = (k, srgb) => files[k] ? this.texture(base + files[k], { ...opts, srgb }) : Promise.resolve(null);
      const [map, normalMap, roughnessMap, aoMap, displacementMap, metalnessMap, armMap] = await Promise.all([
        load('diffuse', true), load('normal', false), load('roughness', false), load('ao', false),
        load('displacement', false), load('metalness', false), load('arm', false),
      ]);
      const set = { map, normalMap, roughnessMap, aoMap, displacementMap, metalnessMap, armMap, entry };
      // ARM (ao/rough/metal packed) -> use the same texture for all three channels; three reads
      // aoMap from R, roughnessMap from G, metalnessMap from B, which matches the ARM packing.
      if (armMap) { set.aoMap = set.aoMap || armMap; set.roughnessMap = set.roughnessMap || armMap; set.metalnessMap = set.metalnessMap || armMap; }
      return set;
    })());
    this.cache.set(key, p);
    return p;
  }
  /** Apply a PBR set to a MeshStandardMaterial. */
  applyPbr(material, set, { normalScale = 1, aoIntensity = 1, displacementScale = 0 } = {}) {
    if (!set) return material;
    if (set.map) material.map = set.map;
    if (set.normalMap) { material.normalMap = set.normalMap; material.normalScale.set(normalScale, normalScale); }
    if (set.roughnessMap) material.roughnessMap = set.roughnessMap;
    if (set.aoMap) { material.aoMap = set.aoMap; material.aoMapIntensity = aoIntensity; }
    if (set.metalnessMap) material.metalnessMap = set.metalnessMap;
    if (set.displacementMap && displacementScale > 0) { material.displacementMap = set.displacementMap; material.displacementScale = displacementScale; }
    material.needsUpdate = true;
    return material;
  }
  hdri(name) {
    const key = `hdri:${name}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = this._track(new Promise((resolve) => {
      this._hdr.load(`/assets/${name}.hdr`, (t) => { t.mapping = THREE.EquirectangularReflectionMapping; resolve(t); }, undefined, () => {
        this.log?.warn(`hdri failed: ${name}`); resolve(null);
      });
    }));
    this.cache.set(key, p);
    return p;
  }
  gltf(url) {
    const key = `gltf:${url}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = this._track(new Promise((resolve) => {
      this._gltf.load(url, (g) => resolve(g), undefined, () => { this.log?.warn(`gltf failed: ${url}`); resolve(null); });
    }));
    this.cache.set(key, p);
    return p;
  }
  /** Resolves when every pending load has settled. */
  async settle(timeoutMs = 20000) {
    const start = performance.now();
    while (this.pending > 0 && performance.now() - start < timeoutMs) await new Promise((r) => setTimeout(r, 50));
    return this.pending === 0;
  }
}

// Procedural textures (CC0 by construction). Cached by parameter string.
class Procedural {
  constructor(assets) { this.assets = assets; this.cache = new Map(); }
  _canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
  _finish(c, opts = {}) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = this.assets.anisotropy;
    if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
    return t;
  }
  solid(hex, size = 4) {
    const key = `solid:${hex}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = this._canvas(size); const g = c.getContext('2d');
    g.fillStyle = '#' + hex.toString(16).padStart(6, '0'); g.fillRect(0, 0, size, size);
    const t = this._finish(c); this.cache.set(key, t); return t;
  }
  /** fbm noise texture. opts: {size, seed, octaves, scale, lo, hi, srgb, colorA, colorB} */
  noiseTexture(opts = {}) {
    const { size = 256, seed = 1, octaves = 5, scale = 4, lo = 0, hi = 1, srgb = false, colorA = null, colorB = null } = opts;
    const key = `noise:${JSON.stringify(opts)}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const { fbm } = makeNoise2D(seed);
    const c = this._canvas(size); const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const ca = colorA ? new THREE.Color(colorA) : null, cb = colorB ? new THREE.Color(colorB) : null;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      // tileable via 4D-ish trick: sample on a torus by blending two offsets
      const u = x / size, v = y / size;
      let n = 0.5 + 0.5 * fbm(u * scale, v * scale, octaves);
      const n2 = 0.5 + 0.5 * fbm((u + 1) * scale, (v + 1) * scale, octaves);
      const wx = 1 - Math.abs(u * 2 - 1), wy = 1 - Math.abs(v * 2 - 1);
      const w = Math.min(wx, wy);
      n = n * w + n2 * (1 - w);
      const k = lo + (hi - lo) * Math.min(1, Math.max(0, n));
      const i = (y * size + x) * 4;
      if (ca && cb) {
        img.data[i] = (ca.r + (cb.r - ca.r) * k) * 255; img.data[i + 1] = (ca.g + (cb.g - ca.g) * k) * 255; img.data[i + 2] = (ca.b + (cb.b - ca.b) * k) * 255;
      } else { img.data[i] = img.data[i + 1] = img.data[i + 2] = k * 255; }
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = this._finish(c, { srgb }); this.cache.set(key, t); return t;
  }
  gradient({ size = 256, stops = [[0, '#000'], [1, '#fff']], horizontal = false, srgb = true } = {}) {
    const key = `grad:${size}:${JSON.stringify(stops)}:${horizontal}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = this._canvas(size); const g = c.getContext('2d');
    const gr = horizontal ? g.createLinearGradient(0, 0, size, 0) : g.createLinearGradient(0, 0, 0, size);
    for (const [p, col] of stops) gr.addColorStop(p, col);
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    const t = this._finish(c, { srgb }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; this.cache.set(key, t); return t;
  }
  /** Normal map derived from a height noise. */
  noiseNormal({ size = 256, seed = 2, scale = 6, strength = 2 } = {}) {
    const key = `nnorm:${size}:${seed}:${scale}:${strength}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const { fbm } = makeNoise2D(seed);
    const h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const n = fbm(u * scale, v * scale, 5), n2 = fbm((u + 1) * scale, (v + 1) * scale, 5);
      const w = Math.min(1 - Math.abs(u * 2 - 1), 1 - Math.abs(v * 2 - 1));
      h[y * size + x] = n * w + n2 * (1 - w);
    }
    const c = this._canvas(size); const g = c.getContext('2d'); const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
      const u = h[((y - 1 + size) % size) * size + x], d = h[((y + 1) % size) * size + x];
      const nx = (l - r) * strength, ny = (u - d) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      img.data[i] = (nx / len * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = this._finish(c); this.cache.set(key, t); return t;
  }
  pbrFallback(name, opts = {}) {
    const seed = [...name].reduce((a, ch) => a + ch.charCodeAt(0), 7);
    const base = /grass/.test(name) ? ['#3f5a22', '#6b7f2e'] : /asphalt|road/.test(name) ? ['#26282a', '#3a3c3e'] :
      /rock|cliff/.test(name) ? ['#5a544c', '#8a8378'] : /sand/.test(name) ? ['#b8a77a', '#d6c9a2'] :
      /concrete|sidewalk|pav/.test(name) ? ['#8d8b86', '#aaa8a2'] : /brick/.test(name) ? ['#7a3f2e', '#a0553f'] :
      /metal/.test(name) ? ['#777', '#999'] : ['#777', '#999'];
    return {
      map: this.noiseTexture({ size: 256, seed, scale: 5, colorA: base[0], colorB: base[1], srgb: true, repeat: opts.repeat }),
      normalMap: this.noiseNormal({ size: 256, seed: seed + 1, scale: 8, strength: 1.5 }),
      roughnessMap: this.noiseTexture({ size: 128, seed: seed + 2, scale: 3, lo: 0.6, hi: 0.95 }),
      aoMap: null, displacementMap: null, metalnessMap: null, entry: null, procedural: true,
    };
  }
}
