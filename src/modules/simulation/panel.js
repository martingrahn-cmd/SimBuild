// Live economy panel (DOM inside #ui, CS2-style dark glass). Numbers refresh every 5 ticks, canvases
// only when a new history sample arrives. No per-frame allocations beyond the formatted strings.
import { FINE_KEYS } from './economy.js';
import { commute, traffic } from './activity.js';

const FONT_DIR = new URL('../ui/fonts/', import.meta.url).href;   // Aileron (CC0), bundled by the ui module
const CSS = /* css */`
@font-face { font-family: 'Aileron'; font-weight: 400; font-display: block; src: url(${FONT_DIR}aileron-latin-400-normal.woff2) format('woff2'); }
@font-face { font-family: 'Aileron'; font-weight: 600; font-display: block; src: url(${FONT_DIR}aileron-latin-600-normal.woff2) format('woff2'); }
@font-face { font-family: 'Aileron'; font-weight: 700; font-display: block; src: url(${FONT_DIR}aileron-latin-700-normal.woff2) format('woff2'); }
.sim-panel {
  --bg: rgba(14, 19, 28, 0.84); --line: rgba(255,255,255,0.08); --line2: rgba(255,255,255,0.16);
  --text: #eaf0f7; --text2: #b3bfcf; --muted: #7d8a9c; --accent: #3a95f5;
  --green: #4cc25a; --blue: #3a95f5; --orange: #f28c28; --purple: #a66cf5; --amber: #f5c542; --red: #e5484d; --teal: #33c1c4;
  position: absolute; left: 18px; top: 18px; width: 356px;
  font-family: 'Aileron', 'Inter', 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
  font-size: 13px; line-height: 1.25; color: var(--text); -webkit-font-smoothing: antialiased;
  background: var(--bg); -webkit-backdrop-filter: blur(16px) saturate(1.25); backdrop-filter: blur(16px) saturate(1.25);
  border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 12px 34px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
  user-select: none; overflow: hidden; pointer-events: auto;
}
.sim-panel * { box-sizing: border-box; }
.sim-num { font-variant-numeric: tabular-nums; }
.sim-head { display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 12px 0 14px; background: linear-gradient(180deg, rgba(58,149,245,0.16), rgba(58,149,245,0.04)); border-bottom: 1px solid var(--line2); }
.sim-head .sim-ico { width: 20px; height: 20px; flex: none; }
.sim-head .sim-title { font-weight: 700; letter-spacing: 0.12em; font-size: 12px; text-transform: uppercase; color: #dbe8f8; flex: 1; }
.sim-head .sim-clock { font-size: 12px; color: var(--text2); font-weight: 600; }
.sim-head .sim-speed { font-size: 10px; font-weight: 700; color: #0b1320; background: var(--amber); border-radius: 4px; padding: 3px 6px; letter-spacing: 0.06em; }
.sim-head .sim-speed.is-paused { background: #7d8a9c; }
.sim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--line); border-bottom: 1px solid var(--line); }
.sim-kpi { background: rgba(255,255,255,0.025); padding: 10px 14px 9px; min-height: 64px; }
.sim-kpi .sim-l { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 6px; }
.sim-kpi .sim-l i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.sim-kpi .sim-v { font-size: 21px; font-weight: 700; margin-top: 3px; letter-spacing: -0.01em; }
.sim-kpi .sim-d { font-size: 11px; color: var(--text2); margin-top: 2px; white-space: nowrap; }
.sim-kpi .up { color: var(--green); } .sim-kpi .down { color: var(--red); } .sim-kpi .flat { color: var(--muted); }
.sim-sec { padding: 9px 14px 10px; border-bottom: 1px solid var(--line); }
.sim-sec .sim-st { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); display: flex; justify-content: space-between; margin-bottom: 7px; }
.sim-sec .sim-st b { color: var(--text2); font-weight: 600; letter-spacing: 0; text-transform: none; }
.sim-rci { display: grid; grid-template-columns: 14px 1fr 38px; column-gap: 8px; row-gap: 6px; align-items: center; }
.sim-rci .sim-rl { font-size: 11px; font-weight: 700; color: var(--text2); text-align: center; }
.sim-rci .sim-rb { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.08); overflow: hidden; position: relative; }
.sim-rci .sim-rb > i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 4px; transition: width 300ms ease; }
.sim-rci .sim-rp { font-size: 11px; color: var(--text2); text-align: right; }
.sim-rci .r > i { background: linear-gradient(90deg, #3fb84f, #86e493); }
.sim-rci .c > i { background: linear-gradient(90deg, #2f8ff5, #86c8ff); }
.sim-rci .i > i { background: linear-gradient(90deg, #f28c28, #ffc878); }
.sim-rci .o > i { background: linear-gradient(90deg, #8f5cf0, #cfb0ff); }
.sim-canvas { display: block; width: 100%; height: 66px; border-radius: 4px; }
.sim-canvas.sim-act { height: 44px; }
.sim-budget { display: grid; grid-template-columns: auto 1fr auto; gap: 4px 10px; font-size: 11px; color: var(--text2); align-items: center; }
.sim-budget .sim-bb { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; }
.sim-budget .sim-bb > i { display: block; height: 100%; width: 0; border-radius: 3px; }
.sim-budget .inc > i { background: var(--green); } .sim-budget .exp > i { background: var(--red); }
.sim-foot { padding: 7px 14px; font-size: 10.5px; color: var(--muted); display: flex; justify-content: space-between; letter-spacing: 0.02em; }
`;

const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtMoney = (n) => (n < 0 ? '−¢' : '¢') + Math.abs(Math.round(n)).toLocaleString('en-US');
const fmtSigned = (n) => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('en-US');
const pad2 = (n) => String(n).padStart(2, '0');

const ICON = `<svg class="sim-ico" viewBox="0 0 24 24" fill="none" stroke="#7cc3ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20V7"/><path d="M2 20h20" stroke="#3a95f5"/></svg>`;

export class Panel {
  constructor(ctx) {
    this.ctx = ctx;
    this.root = document.getElementById('ui') || document.body;
    this.style = document.createElement('style'); this.style.textContent = CSS; document.head.appendChild(this.style);
    const el = this.el = document.createElement('div');
    el.className = 'sim-panel'; el.id = 'sim-panel';
    el.innerHTML = `
      <div class="sim-head">${ICON}<div class="sim-title">City statistics</div><div class="sim-clock sim-num" data-k="clock">Day 1 · 00:00</div><div class="sim-speed" data-k="speed">×20</div></div>
      <div class="sim-grid">
        <div class="sim-kpi"><div class="sim-l"><i style="background:var(--teal)"></i>Population</div><div class="sim-v sim-num" data-k="pop">0</div><div class="sim-d sim-num" data-k="popd"></div></div>
        <div class="sim-kpi"><div class="sim-l"><i style="background:var(--amber)"></i>Treasury</div><div class="sim-v sim-num" data-k="money">¢0</div><div class="sim-d sim-num" data-k="moneyd"></div></div>
        <div class="sim-kpi"><div class="sim-l"><i style="background:var(--green)"></i>Jobs</div><div class="sim-v sim-num" data-k="jobs">0</div><div class="sim-d sim-num" data-k="jobsd"></div></div>
        <div class="sim-kpi"><div class="sim-l"><i style="background:var(--blue)"></i>Happiness</div><div class="sim-v sim-num" data-k="happy">50%</div><div class="sim-d sim-num" data-k="happyd"></div></div>
      </div>
      <div class="sim-sec"><div class="sim-st"><span>Zone demand</span><b data-k="dem"></b></div>
        <div class="sim-rci">
          <div class="sim-rl">R</div><div class="sim-rb r"><i data-k="bR"></i></div><div class="sim-rp sim-num" data-k="pR">0%</div>
          <div class="sim-rl">C</div><div class="sim-rb c"><i data-k="bC"></i></div><div class="sim-rp sim-num" data-k="pC">0%</div>
          <div class="sim-rl">I</div><div class="sim-rb i"><i data-k="bI"></i></div><div class="sim-rp sim-num" data-k="pI">0%</div>
          <div class="sim-rl">O</div><div class="sim-rb o"><i data-k="bO"></i></div><div class="sim-rp sim-num" data-k="pO">0%</div>
        </div></div>
      <div class="sim-sec"><div class="sim-st"><span>Population · 3 days</span><b class="sim-num" data-k="spop"></b></div><canvas class="sim-canvas" data-k="cpop"></canvas></div>
      <div class="sim-sec"><div class="sim-st"><span>Treasury · 3 days</span><b class="sim-num" data-k="smoney"></b></div><canvas class="sim-canvas" data-k="cmoney"></canvas></div>
      <div class="sim-sec"><div class="sim-st"><span>Daily budget</span><b class="sim-num" data-k="net"></b></div>
        <div class="sim-budget"><span>Income</span><div class="sim-bb inc"><i data-k="bInc"></i></div><span class="sim-num" data-k="inc"></span>
        <span>Expenses</span><div class="sim-bb exp"><i data-k="bExp"></i></div><span class="sim-num" data-k="exp"></span></div></div>
      <div class="sim-sec"><div class="sim-st"><span>Activity · 24 h</span><b class="sim-num" data-k="act"></b></div><canvas class="sim-canvas sim-act" data-k="cact"></canvas></div>
      <div class="sim-foot"><span class="sim-num" data-k="tick">tick 0</span><span>4 Hz fixed-step · seed ${ctx.world.seed} · deterministic</span></div>`;
    this.root.appendChild(el);
    this.k = {};
    for (const n of el.querySelectorAll('[data-k]')) this.k[n.dataset.k] = n;
    this.lastTick = -1; this.lastFine = -1; this.lastHour = -1;
    this.range = [0, 0];
    this._resize();
  }
  _resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [this.k.cpop, this.k.cmoney, this.k.cact]) {
      const r = c.getBoundingClientRect();
      const w = Math.max(10, Math.round(r.width || 328)), h = Math.max(10, Math.round(r.height || 66));
      c.width = w * dpr; c.height = h * dpr; c._w = w; c._h = h; c._dpr = dpr;
    }
  }
  update(eco, hour, speed) {
    if (!eco) return;
    const e = eco.econ;
    const tick = eco.tick;
    if (tick !== this.lastTick && (tick % 5 === 0 || this.lastTick < 0)) { this.lastTick = tick; this._numbers(e, eco, speed); }
    if (eco.fine.count !== this.lastFine || (eco.fine.count && tick % 10 === 0 && tick !== this._lastDraw)) {
      this.lastFine = eco.fine.count; this._lastDraw = tick;
      this._spark(this.k.cpop, eco.fine, FINE_KEYS.indexOf('population'), '#33c1c4', this.k.spop, fmtInt);
      this._spark(this.k.cmoney, eco.fine, FINE_KEYS.indexOf('money'), '#f5c542', this.k.smoney, fmtMoney);
    }
    const hq = Math.round(hour * 12) / 12;
    if (hq !== this.lastHour) { this.lastHour = hq; this._activity(hour); }
  }
  _numbers(e, eco, speed) {
    const k = this.k;
    const h = Math.floor(e.hour), m = Math.floor((e.hour - h) * 60);
    k.clock.textContent = `Day ${e.day} · ${pad2(h)}:${pad2(m)}`;
    k.speed.textContent = speed > 0 ? `×${speed % 1 ? speed.toFixed(1) : speed}` : 'PAUSED';
    k.speed.classList.toggle('is-paused', !(speed > 0));
    k.pop.textContent = fmtInt(e.population);
    const f = eco.fine, n = f.count;
    const iPop = FINE_KEYS.indexOf('population');
    const dPop = n > 240 ? f.last(iPop) - f.get(n - 241, iPop) : (n > 1 ? (f.last(iPop) - f.get(0, iPop)) * (240 / (n - 1)) : 0);
    k.popd.innerHTML = `<span class="${dPop > 0.5 ? 'up' : dPop < -0.5 ? 'down' : 'flat'}">${dPop > 0.5 ? '▲' : dPop < -0.5 ? '▼' : '•'} ${fmtSigned(dPop)}/day</span> · ${fmtInt(e.households)} households`;
    k.money.textContent = fmtMoney(e.money);
    k.money.style.color = e.money < 0 ? 'var(--red)' : '';
    k.moneyd.innerHTML = `<span class="${e.net >= 0 ? 'up' : 'down'}">${e.net >= 0 ? '▲' : '▼'} ${fmtSigned(e.net)}/day</span> · tax ${Math.round(e.taxRate * 100)}%`;
    k.jobs.textContent = fmtInt(e.jobs);
    k.jobsd.textContent = `${fmtInt(e.employed)} employed · ${(e.unemployment * 100).toFixed(1)}% unemployed`;
    const hp = Math.round(e.happiness * 100);
    k.happy.textContent = `${hp}%`;
    k.happy.style.color = hp >= 65 ? 'var(--green)' : hp >= 45 ? 'var(--amber)' : 'var(--red)';
    k.happyd.textContent = hp >= 75 ? 'Thriving' : hp >= 65 ? 'Content' : hp >= 50 ? 'Neutral' : hp >= 35 ? 'Unhappy' : 'Miserable';
    const d = e.demand;
    for (const [key, L] of [['residential', 'R'], ['commercial', 'C'], ['industrial', 'I'], ['office', 'O']]) {
      const v = Math.round(d[key] * 100);
      k['b' + L].style.width = `${v}%`; k['p' + L].textContent = `${v}%`;
    }
    const cnt = eco.buildingCount;
    k.dem.textContent = `${fmtInt(cnt.residential + cnt.commercial + cnt.industrial + cnt.office)} buildings · vacancy ${fmtInt(e.housingVacancy)}`;
    const mx = Math.max(1, e.income, e.expenses);
    k.bInc.style.width = `${(e.income / mx) * 100}%`; k.bExp.style.width = `${(e.expenses / mx) * 100}%`;
    k.inc.textContent = fmtMoney(e.income); k.exp.textContent = fmtMoney(e.expenses);
    k.net.textContent = `${e.net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(e.net)).replace('¢', '¢')}/day`;
    k.net.style.color = e.net >= 0 ? 'var(--green)' : 'var(--red)';
    k.tick.textContent = `tick ${fmtInt(eco.tick)}`;
  }
  _spark(c, ring, key, color, label, fmt) {
    const g = c.getContext('2d'); if (!g) return;
    const w = c._w, h = c._h, dpr = c._dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const n = ring.count;
    const N = ring.len;
    const r = ring.range(key, N, this.range);
    let lo = r[0], hi = r[1];
    if (hi - lo < 1e-6) { hi = lo + 1; }
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    if (lo > 0 && key === FINE_KEYS.indexOf('population')) lo = Math.max(0, lo - pad);
    // grid
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1;
    for (let i = 1; i < 3; i++) { const y = Math.round((h * i) / 3) + 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    if (lo < 0 && hi > 0) { const y = h - ((0 - lo) / (hi - lo)) * h; g.strokeStyle = 'rgba(229,72,77,0.5)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); g.setLineDash([]); }
    if (n < 2) { label.textContent = ''; return; }
    const x = (i) => ((N - n + i) / (N - 1)) * (w - 2) + 1;
    const y = (v) => h - 1 - ((v - lo) / (hi - lo)) * (h - 4);
    g.beginPath();
    for (let i = 0; i < n; i++) { const px = x(i), py = y(ring.get(i, key)); if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + 'aa'); grad.addColorStop(1, color + '05');
    g.lineTo(x(n - 1), h); g.lineTo(x(0), h); g.closePath();
    g.fillStyle = grad; g.fill();
    g.beginPath();
    for (let i = 0; i < n; i++) { const px = x(i), py = y(ring.get(i, key)); if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
    g.strokeStyle = color; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
    const lx = x(n - 1), ly = y(ring.get(n - 1, key));
    g.fillStyle = '#fff'; g.beginPath(); g.arc(lx, ly, 2.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = color + '66'; g.beginPath(); g.arc(lx, ly, 5, 0, Math.PI * 2); g.fill();
    // day ticks (every 240 samples)
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.font = '9px Aileron, Inter, sans-serif'; g.textBaseline = 'bottom';
    for (let s = N - 1; s >= N - n; s -= 240) { const px = x(s - (N - n)); g.fillRect(px, h - 5, 1, 5); }
    label.textContent = `${fmt(r[0])} – ${fmt(r[1])}`;
  }
  _activity(hour) {
    const c = this.k.cact, g = c.getContext('2d'); if (!g) return;
    const w = c._w, h = c._h, dpr = c._dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    // night shading
    g.fillStyle = 'rgba(58,110,200,0.14)';
    g.fillRect(0, 0, (6.3 / 24) * w, h); g.fillRect((18.6 / 24) * w, 0, w - (18.6 / 24) * w, h);
    const draw = (fn, color, fill) => {
      g.beginPath();
      for (let i = 0; i <= 96; i++) { const hh = (i / 96) * 24, px = (i / 96) * w, py = h - 2 - fn(hh) * (h - 6); if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
      if (fill) { g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = fill; g.fill(); }
      else { g.strokeStyle = color; g.lineWidth = 1.5; g.stroke(); }
    };
    draw(traffic, null, 'rgba(58,149,245,0.22)');
    draw(commute, '#7cc3ff');
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.font = '9px Aileron, Inter, sans-serif'; g.textBaseline = 'top';
    for (const hh of [0, 6, 12, 18]) { g.fillText(pad2(hh), (hh / 24) * w + 2, 1); }
    const px = ((hour % 24) / 24) * w;
    g.strokeStyle = '#f5c542'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, h); g.stroke();
    g.fillStyle = '#f5c542'; g.beginPath(); g.arc(px, h - 2 - commute(hour) * (h - 6), 3, 0, Math.PI * 2); g.fill();
    this.k.act.textContent = `${pad2(Math.floor(hour))}:${pad2(Math.floor((hour % 1) * 60))} · commute ${Math.round(commute(hour) * 100)}% · traffic ${Math.round(traffic(hour) * 100)}%`;
  }
  dispose() {
    this.el?.remove(); this.style?.remove(); this.el = null; this.style = null;
  }
}
