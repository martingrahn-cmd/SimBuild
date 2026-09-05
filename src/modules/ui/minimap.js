// Canvas minimap: terrain colour (height ramp + hillshade + water) from world.terrain.heights, roads from
// world.roads, camera ground footprint; click to fly the camera. Terrain/roads are cached in offscreen
// canvases and redrawn on terrain:changed / roads:changed; the composite refreshes at 5 Hz.
import { ICONS } from './icons.js';

const MAP = 256;       // backing resolution (px)
const TER = 128;       // terrain raster resolution
const NDC = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const ROAD_STYLE = { highway: ['#f0d9a0', 2.2], avenue: ['#e8e8e8', 1.6], street: ['#d0d4d8', 1.1], alley: ['#a9adb2', 0.8], gravel: ['#b9a98a', 0.8] };

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

export class Minimap {
  constructor(hud, ctx) {
    this.hud = hud; this.ctx = ctx;
    this.sample = null;
    this.collapsed = false;
    this._acc = 1; this._terrainDirty = true; this._roadsDirty = true; this._terrainCooldown = 0;
    this._pts = NDC.map(() => ({ x: 0, z: 0, ok: false }));
    this.el = el('div', 'sb-minimap sb-glass sb-pe');
    const head = el('div', 'sb-minimap-head', '<span>Map</span>');
    this.coordEl = el('span', 'sb-num', ''); this.coordEl.style.cssText = 'margin-left:6px;font-weight:600;color:var(--text-2);letter-spacing:0;text-transform:none;font-size:10px';
    const tog = el('button', 'sb-btn sb-mm-btn', ICONS.chevronDown()); tog.type = 'button'; tog.title = 'Collapse (M)';
    tog.addEventListener('click', () => this.toggle());
    this.togBtn = tog;
    head.append(this.coordEl, tog);
    this.canvas = el('canvas'); this.canvas.width = MAP; this.canvas.height = MAP;
    this.canvas.addEventListener('click', (e) => this._click(e));
    this.el.append(head, this.canvas);
    this.terrainCv = el('canvas'); this.terrainCv.width = TER; this.terrainCv.height = TER;
    this.roadsCv = el('canvas'); this.roadsCv.width = MAP; this.roadsCv.height = MAP;
    this.img = this.terrainCv.getContext('2d').createImageData(TER, TER);
    const ev = ctx.events;
    this._unsub = [
      ev.on('terrain:changed', () => { this._terrainDirty = true; }, 'ui'),
      ev.on('roads:changed', () => { this._roadsDirty = true; }, 'ui'),
    ];
  }
  toggle(force) {
    this.collapsed = force === undefined ? !this.collapsed : !force;
    this.el.classList.toggle('is-collapsed', this.collapsed);
    this.togBtn.innerHTML = this.collapsed ? ICONS.chevronUp() : ICONS.chevronDown();
    this.hud.root.classList.toggle('has-minimap', !this.collapsed);
    this.hud.action('minimap', !this.collapsed);
  }
  /** Showcase staging: {n, heights: Float32Array(n*n), roads: [[x1,z1,x2,z2,type], …]} */
  setSample(sample) { this.sample = sample; this._terrainDirty = this._roadsDirty = true; }
  _click(e) {
    const r = this.canvas.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    const size = this.ctx.world.size, x = (u - 0.5) * size, z = (v - 0.5) * size;
    const y = this.ctx.world.terrain.getHeight(x, z);
    this.ctx.camera.flyTo({ target: [x, y, z] }, 1.0);
    this.hud.action('minimapGoto', Math.round(x), Math.round(z));
  }

  // ---------------------------------------------------------------- terrain raster
  _heightSource() {
    const t = this.ctx.world.terrain;
    if (t.heights && t.heights.length >= 4) return { n: t.resolution || Math.round(Math.sqrt(t.heights.length)), h: t.heights, sea: t.seaLevel || 0 };
    if (this.sample?.heights) return { n: this.sample.n, h: this.sample.heights, sea: 0 };
    return null;
  }
  _drawTerrain() {
    const src = this._heightSource();
    const d = this.img.data;
    if (!src) {
      for (let i = 0; i < TER * TER; i++) { const x = i % TER, y = (i / TER) | 0; const v = 0.94 + 0.06 * (((x * 7 + y * 13) % 11) / 11); d[i * 4] = 92 * v; d[i * 4 + 1] = 122 * v; d[i * 4 + 2] = 70 * v; d[i * 4 + 3] = 255; }
    } else {
      const { n, h, sea } = src;
      const at = (ix, iy) => h[Math.min(n - 1, Math.max(0, iy)) * n + Math.min(n - 1, Math.max(0, ix))];
      const step = n / TER;
      for (let py = 0; py < TER; py++) for (let px = 0; px < TER; px++) {
        const ix = Math.floor(px * step), iy = Math.floor(py * step);
        const v = at(ix, iy) - sea;
        const dx = at(ix + 2, iy) - at(ix - 2, iy), dy = at(ix, iy + 2) - at(ix, iy - 2);
        let r, g, b;
        if (v < 0) { const k = Math.min(1, -v / 25); r = 70 - 30 * k; g = 130 - 45 * k; b = 175 - 40 * k; }
        else if (v < 1.5) { r = 201; g = 187; b = 149; }
        else if (v < 60) { const k = Math.min(1, (v - 1.5) / 58); r = 104 + 60 * k; g = 136 + 32 * k; b = 76 + 34 * k; }
        else if (v < 120) { const k = Math.min(1, (v - 60) / 60); r = 164 - 30 * k; g = 168 - 40 * k; b = 110 + 10 * k; }
        else { const k = Math.min(1, (v - 120) / 60); r = 134 + 100 * k; g = 128 + 105 * k; b = 120 + 115 * k; }
        const shade = v < 0 ? 1 : Math.max(0.55, Math.min(1.35, 1 + (dx - dy) * 0.035));   // light from the north-west
        const i = (py * TER + px) * 4;
        d[i] = Math.min(255, r * shade); d[i + 1] = Math.min(255, g * shade); d[i + 2] = Math.min(255, b * shade); d[i + 3] = 255;
      }
    }
    this.terrainCv.getContext('2d').putImageData(this.img, 0, 0);
    this._terrainDirty = false;
  }
  _drawRoads() {
    const g = this.roadsCv.getContext('2d');
    g.clearRect(0, 0, MAP, MAP);
    const size = this.ctx.world.size, k = MAP / size, off = MAP / 2;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const seg = (x1, z1, x2, z2, type) => { const s = ROAD_STYLE[type] || ROAD_STYLE.street; g.strokeStyle = s[0]; g.lineWidth = s[1]; g.beginPath(); g.moveTo(x1 * k + off, z1 * k + off); g.lineTo(x2 * k + off, z2 * k + off); g.stroke(); };
    const roads = this.ctx.world.roads;
    let any = false;
    if (roads.edges.size && roads.nodes.size) {
      for (const e of roads.edges.values()) {
        const a = roads.nodes.get(e.a), b = roads.nodes.get(e.b); if (!a || !b) continue;
        any = true;
        if (e.ctrl) { const c = e.ctrl; let px = a.x, pz = a.z; for (let i = 1; i <= 6; i++) { const t = i / 6, u = 1 - t; const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x, z = u * u * a.z + 2 * u * t * c.z + t * t * b.z; seg(px, pz, x, z, e.type); px = x; pz = z; } }
        else seg(a.x, a.z, b.x, b.z, e.type);
      }
    }
    if (!any && this.sample?.roads) for (const [x1, z1, x2, z2, type] of this.sample.roads) seg(x1, z1, x2, z2, type);
    this._roadsDirty = false;
  }

  // ---------------------------------------------------------------- composite (5 Hz)
  update(dt) {
    if (this.collapsed || this.hud.photo) return;
    this._acc += dt; this._terrainCooldown -= dt;
    if (this._acc < 0.2) return;
    this._acc = 0;
    if (this._terrainDirty && this._terrainCooldown <= 0) { this._drawTerrain(); this._terrainCooldown = 1.0; }
    if (this._roadsDirty) this._drawRoads();
    const g = this.canvas.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(this.terrainCv, 0, 0, MAP, MAP);
    g.drawImage(this.roadsCv, 0, 0);
    // camera footprint
    const cam = this.ctx.camera, size = this.ctx.world.size, k = MAP / size, off = MAP / 2;
    const pts = this._pts;
    for (let i = 0; i < 4; i++) {
      const hit = cam.screenToGround(NDC[i][0], NDC[i][1]);
      const p = pts[i];
      if (hit) {
        p.x = hit.x; p.z = hit.z; p.ok = true;
        const dx = p.x - cam.target.x, dz = p.z - cam.target.z, d = Math.hypot(dx, dz), lim = cam.distance * 2.5;   // far corners near the horizon: keep the footprint readable
        if (d > lim) { p.x = cam.target.x + (dx / d) * lim; p.z = cam.target.z + (dz / d) * lim; }
      } else { // ray missed the ground (looking at the sky): push the corner far along the view direction
        const dx = cam.target.x - cam.camera.position.x, dz = cam.target.z - cam.camera.position.z, l = Math.hypot(dx, dz) || 1;
        const side = NDC[i][0] * cam.distance * 1.2;
        p.x = cam.target.x + (dx / l) * cam.distance * 2.5 - (dz / l) * side; p.z = cam.target.z + (dz / l) * cam.distance * 2.5 + (dx / l) * side; p.ok = false;
      }
    }
    g.beginPath();
    for (let i = 0; i < 4; i++) { const x = pts[i].x * k + off, y = pts[i].z * k + off; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.2; g.stroke();
    const tx = cam.target.x * k + off, tz = cam.target.z * k + off;
    g.beginPath(); g.arc(tx, tz, 3, 0, Math.PI * 2); g.fillStyle = '#2f8ff5'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke();
    // compass
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('N', MAP - 12, 14);
    g.beginPath(); g.moveTo(MAP - 12, 18); g.lineTo(MAP - 9, 26); g.lineTo(MAP - 15, 26); g.closePath(); g.fill();
    const cx = Math.round(cam.target.x), cz = Math.round(cam.target.z);
    if (cx !== this._cx || cz !== this._cz) { this._cx = cx; this._cz = cz; this.coordEl.textContent = `${cx}, ${cz}`; }
  }
  dispose() { for (const u of this._unsub) { try { u(); } catch (e) { /* ignore */ } } }
}
