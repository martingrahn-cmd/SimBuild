// Screen-space chips for the tool overlay: the little dark pills CS2 floats next to a ghost road
// showing length, angle, grade and price, plus the red "why is this invalid" pill.
// One pooled DOM node per chip, positioned with a transform; no layout thrash, no per-frame garbage.
import * as THREE from 'three';

const CSS = `
#sbt-hud { position: fixed; inset: 0; pointer-events: none; overflow: hidden;
  font-family: "Aileron", Inter, "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
#sbt-hud .sbt-chip {
  position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 5px;
  padding: 3px 8px 3px 6px; border-radius: 6px; white-space: nowrap;
  background: rgba(11, 15, 22, 0.84); border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.45), 0 0 0 0.5px rgba(0,0,0,.5);
  color: #eaf0f8; font-size: 12px; font-weight: 600; letter-spacing: .01em;
  line-height: 15px; will-change: transform; backdrop-filter: blur(3px);
}
#sbt-hud .sbt-chip svg { display: block; width: 13px; height: 13px; opacity: .82; flex: none; }
#sbt-hud .sbt-chip.t-cost { background: rgba(10, 20, 14, 0.86); border-color: rgba(120, 220, 150, .28); }
#sbt-hud .sbt-chip.t-cost svg { opacity: 1; }
#sbt-hud .sbt-chip.t-bad { background: rgba(46, 11, 12, 0.9); border-color: rgba(235, 90, 80, .45); color: #ffd9d5; }
#sbt-hud .sbt-chip.t-bad svg { opacity: 1; }
#sbt-hud .sbt-chip.t-key { background: rgba(11, 15, 22, 0.7); color: #b9c5d4; font-weight: 500; }
#sbt-hud .sbt-chip .sbt-sub { color: #93a1b4; font-weight: 500; margin-left: 1px; }
`;

const FADE_DIST = 400;   // metres: chips start shrinking beyond this
const MAX_DIST = 640;    // metres: past this they are clutter, not information

const SVG = (d, extra = '') => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

export const ICON = {
  length: SVG('<path d="M2 8h12"/><path d="M4.6 5.4 2 8l2.6 2.6"/><path d="M11.4 5.4 14 8l-2.6 2.6"/>'),
  angle: SVG('<path d="M3 13h10"/><path d="M3 13 11 3"/><path d="M6.6 13a4.6 4.6 0 0 0 .9-2.7"/>'),
  grade: SVG('<path d="M2 13h12"/><path d="M3 12 13 5"/><path d="M13 5v3"/>'),
  cost: SVG('<circle cx="8" cy="8" r="5.6"/><path d="M10.2 6.2A3 3 0 1 0 10.2 9.8"/>', 'stroke="#7ee2a0"'),
  bad: SVG('<path d="M8 2.6 1.9 13.2h12.2z"/><path d="M8 6.6v3.1"/><path d="M8 11.4h.01"/>', 'stroke="#ff8a80"'),
  radius: SVG('<circle cx="8" cy="8" r="5.6" stroke-dasharray="2.2 2"/><path d="M8 8h5.6"/>'),
  area: SVG('<rect x="2.6" y="2.6" width="10.8" height="10.8" rx="1.4"/><path d="M2.6 8h10.8M8 2.6v10.8"/>'),
  height: SVG('<path d="M8 2.6v10.8"/><path d="M5.4 5.2 8 2.6l2.6 2.6"/><path d="M5.4 10.8 8 13.4l2.6-2.6"/>'),
  cells: SVG('<rect x="2.4" y="2.4" width="4.6" height="4.6" rx=".8"/><rect x="9" y="2.4" width="4.6" height="4.6" rx=".8"/><rect x="2.4" y="9" width="4.6" height="4.6" rx=".8"/><rect x="9" y="9" width="4.6" height="4.6" rx=".8"/>'),
  people: SVG('<circle cx="8" cy="5.4" r="2.2"/><path d="M3.6 13.2a4.4 4.4 0 0 1 8.8 0"/>'),
  info: SVG('<circle cx="8" cy="8" r="5.8"/><path d="M8 7.2v3.6"/><path d="M8 5.2h.01"/>'),
};

export class Chips {
  constructor(ctx) {
    this.ctx = ctx;
    this.pool = [];
    this.used = 0;
    this._v = new THREE.Vector3();
    this._items = [];
    if (!document.getElementById('sbt-style')) {
      const st = document.createElement('style');
      st.id = 'sbt-style';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    let host = document.getElementById('sbt-hud');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sbt-hud';
      const ui = document.getElementById('ui');
      if (ui && ui.parentNode) ui.parentNode.insertBefore(host, ui); // paint under the game HUD
      else document.body.appendChild(host);
    }
    this.host = host;
    this.canvas = ctx.renderer?.domElement || null;
    this._cursor = '';
  }

  /** Queue a chip anchored at a world point. dx/dy are pixel offsets, tone: ''|'cost'|'bad'|'key'. */
  add(x, y, z, icon, text, tone = '', dx = 0, dy = 0, sub = '') {
    this._items.push({ x, y, z, icon, text, tone, dx, dy, sub });
  }

  /** Drop the queued chips; the tool re-queues them whenever its preview changes. */
  reset() { this._items.length = 0; }

  /**
   * Re-project and lay out the queued chips (every frame — the camera may have moved).
   * Chips fade out with distance the way CS2's measurements do (they are unreadable clutter from
   * 900 m up), and a greedy vertical nudge keeps a cluster of them from stacking on one another.
   */
  flush() {
    const cam = this.ctx.camera.camera;
    const W = window.innerWidth, H = window.innerHeight;
    const cp = cam.position;
    const placed = this._placed || (this._placed = []);
    let np = 0;
    let n = 0;
    for (const it of this._items) {
      const dist = Math.hypot(it.x - cp.x, it.y - cp.y, it.z - cp.z);
      if (dist > MAX_DIST) continue;
      this._v.set(it.x, it.y, it.z).project(cam);
      if (this._v.z > 1 || this._v.z < -1) continue;
      const k = dist > FADE_DIST ? Math.max(0.74, 1 - (dist - FADE_DIST) / 1500) : 1;
      let px = (this._v.x * 0.5 + 0.5) * W + it.dx * k;
      let py = (-this._v.y * 0.5 + 0.5) * H + it.dy * k;
      // a chip whose anchor is off-screen would be clipped in half at the edge — drop it instead
      if (px < 4 || px > W - 4 || py < 4 || py > H - 4) continue;
      const cw = (44 + 6.9 * (it.text.length + it.sub.length * 0.95)) * k;
      const ch = 23 * k;
      for (let tries = 0; tries < 5; tries++) {
        let hit = false;
        for (let i = 0; i < np; i++) {
          const r = placed[i];
          if (Math.abs(px - r[0]) < (cw + r[2]) * 0.5 - 2 && Math.abs(py - r[1]) < (ch + r[3]) * 0.5 - 1) { hit = true; break; }
        }
        if (!hit) break;
        py += ch + 3;
      }
      if (py > H - 4) continue;
      const rect = placed[np] || (placed[np] = [0, 0, 0, 0]);
      rect[0] = px; rect[1] = py; rect[2] = cw; rect[3] = ch;
      np++;
      const el = this._get(n++);
      const key = `${it.icon}|${it.text}|${it.tone}|${it.sub}`;
      if (el._key !== key) {
        el._key = key;
        el.className = 'sbt-chip' + (it.tone ? ' t-' + it.tone : '');
        el.innerHTML = `${it.icon || ''}<span>${it.text}</span>${it.sub ? `<span class="sbt-sub">${it.sub}</span>` : ''}`;
      }
      el.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0) translate(-50%, -50%)`
        + (k < 0.999 ? ` scale(${k.toFixed(3)})` : '');
      el.style.display = '';
    }
    for (let i = n; i < this.used; i++) this.pool[i].style.display = 'none';
    this.used = n;
  }

  _get(i) {
    let el = this.pool[i];
    if (!el) {
      el = document.createElement('div');
      el.className = 'sbt-chip';
      el._key = '';
      this.host.appendChild(el);
      this.pool[i] = el;
    }
    return el;
  }

  clear() {
    this._items.length = 0;
    for (let i = 0; i < this.used; i++) this.pool[i].style.display = 'none';
    this.used = 0;
  }

  setCursor(c) {
    if (!this.canvas || this._cursor === c) return;
    this._cursor = c;
    this.canvas.style.cursor = c;
  }

  dispose() {
    this.clear();
    this.setCursor('');
    this.host?.remove();
    document.getElementById('sbt-style')?.remove();
  }
}
