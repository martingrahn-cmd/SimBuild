// Audio showcase panel (DOM inside #ui, CS2-style glass): enable button + status, master volume / mute,
// live ambient-mix meters with the factors driving them (time, zoom, wind, rain, traffic), scenario
// chips, the scheduler's recent events, and every sound with a play button and a waveform drawn from
// its Float32 buffer (pure canvas 2D, so it renders headless).
const CSS = /* css */`
.au-root { position: absolute; inset: 0; pointer-events: none; overflow: hidden;
  --bg: rgba(14, 19, 28, 0.84); --line: rgba(255,255,255,0.075); --line-2: rgba(255,255,255,0.14);
  --text: #e9eef5; --text-2: #b5c0cf; --muted: #7f8c9d; --accent: #2f8ff5; --accent-2: #62b2ff;
  --green: #4cc25a; --teal: #34c3c7; --yellow: #f5c542; --orange: #f28c28; --purple: #a66cf5; --red: #e5484d;
  font-family: 'Aileron', 'Inter', 'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', sans-serif;
  font-size: 12.5px; line-height: 1.25; color: var(--text); -webkit-font-smoothing: antialiased; user-select: none; }
.au-root * { box-sizing: border-box; }
.au-panel { pointer-events: auto; position: absolute; left: 18px; top: 18px; width: 412px; max-height: calc(100vh - 36px);
  display: flex; flex-direction: column; background: var(--bg); -webkit-backdrop-filter: blur(16px) saturate(1.25); backdrop-filter: blur(16px) saturate(1.25);
  border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,.42), 0 1px 0 rgba(255,255,255,.04) inset; overflow: hidden; }
.au-head { display: flex; align-items: center; gap: 10px; padding: 8px 12px 7px; border-bottom: 1px solid var(--line); background: rgba(255,255,255,0.025); }
.au-head .au-ico { width: 30px; height: 30px; border-radius: 6px; background: linear-gradient(160deg, #2f8ff5, #1d5fb4); display: grid; place-items: center; box-shadow: 0 2px 8px rgba(47,143,245,.35); flex: none; }
.au-head .au-title { font-weight: 700; font-size: 13px; letter-spacing: .08em; }
.au-head .au-sub { color: var(--text-2); font-size: 11.5px; margin-top: 2px; }
.au-pill { margin-left: auto; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 999px; border: 1px solid var(--line-2); color: var(--text-2); white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.au-pill i { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); display: inline-block; }
.au-pill.live { color: #b8f0c0; border-color: rgba(76,194,90,.45); background: rgba(76,194,90,.12); } .au-pill.live i { background: var(--green); box-shadow: 0 0 6px var(--green); }
.au-pill.susp { color: #ffe2a8; border-color: rgba(245,197,66,.4); } .au-pill.susp i { background: var(--yellow); }
.au-body { overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.18) transparent; }
.au-enable { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--line); }
.au-btn { appearance: none; border: 0; font: inherit; color: inherit; cursor: pointer; border-radius: 6px; }
.au-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.au-primary { background: linear-gradient(180deg, #3d9bff, #2678d8); color: #fff; font-weight: 700; padding: 9px 14px; font-size: 13px; letter-spacing: .02em; box-shadow: 0 3px 10px rgba(47,143,245,.35), 0 1px 0 rgba(255,255,255,.18) inset; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.au-primary:hover { filter: brightness(1.08); } .au-primary:active { transform: translateY(1px); }
.au-primary.on { background: rgba(255,255,255,.06); color: var(--text-2); box-shadow: none; border: 1px solid var(--line-2); font-weight: 600; }
.au-master { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.au-mute { width: 28px; height: 28px; display: grid; place-items: center; background: rgba(255,255,255,.06); border: 1px solid var(--line); }
.au-mute:hover { background: rgba(255,255,255,.1); } .au-mute.muted { color: var(--red); border-color: rgba(229,72,77,.45); }
.au-master input[type=range] { flex: 1; min-width: 0; accent-color: var(--accent); height: 4px; cursor: pointer; }
.au-master .au-pct { width: 34px; text-align: right; font-variant-numeric: tabular-nums; color: var(--text-2); font-size: 11.5px; }
.au-sec { padding: 6px 12px 5px; border-bottom: 1px solid var(--line); }
.au-sec-h { display: flex; align-items: center; gap: 8px; font-size: 10.5px; font-weight: 700; letter-spacing: .12em; color: var(--muted); text-transform: uppercase; margin-bottom: 6px; }
.au-sec-h .au-n { margin-left: auto; font-weight: 600; letter-spacing: 0; color: var(--muted); text-transform: none; font-size: 10.5px; }
.au-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 7px; }
.au-chip { font-size: 11px; font-weight: 600; padding: 3px 7px; border-radius: 4px; background: rgba(255,255,255,.06); border: 1px solid var(--line); color: var(--text-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
.au-chip b { color: var(--text); font-weight: 700; }
.au-chip.btn { cursor: pointer; } .au-chip.btn:hover { background: rgba(47,143,245,.22); border-color: rgba(47,143,245,.5); color: #fff; }
.au-meter { display: grid; grid-template-columns: 74px 1fr 46px; align-items: center; gap: 8px; height: 18px; }
.au-meter .au-lab { font-size: 11.5px; color: var(--text-2); font-weight: 600; }
.au-meter .au-bar { height: 7px; border-radius: 3px; background: rgba(255,255,255,.07); overflow: hidden; position: relative; }
.au-meter .au-bar i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 3px; background: var(--c, var(--accent)); box-shadow: 0 0 8px color-mix(in srgb, var(--c, var(--accent)) 55%, transparent); transition: width 160ms linear; }
.au-meter .au-val { text-align: right; font-variant-numeric: tabular-nums; font-size: 11px; color: var(--text-2); }
.au-log { font-size: 11px; color: var(--muted); margin-top: 5px; font-variant-numeric: tabular-nums; min-height: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.au-log b { color: var(--text-2); font-weight: 600; }
.au-row { display: grid; grid-template-columns: 22px 120px 1fr 36px; align-items: center; gap: 8px; height: 23px; border-radius: 4px; padding: 0 2px; }
.au-row:hover { background: rgba(255,255,255,.05); }
.au-row.flash { background: rgba(47,143,245,.22); }
.au-play { width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,.08); border: 1px solid var(--line-2); display: grid; place-items: center; color: var(--text); padding: 0; }
.au-play:hover { background: var(--accent); border-color: var(--accent); }
.au-row .au-name { font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.au-row .au-name small { color: var(--muted); font-weight: 400; font-size: 9.5px; letter-spacing: .03em; margin-left: 5px; }
.au-row canvas { width: 100%; height: 18px; display: block; border-radius: 2px; background: rgba(0,0,0,.28); }
.au-row .au-dur { text-align: right; font-variant-numeric: tabular-nums; font-size: 10.5px; color: var(--muted); }
.au-foot { padding: 6px 12px 7px; font-size: 10.5px; color: var(--muted); display: flex; gap: 10px; font-variant-numeric: tabular-nums; }
.au-foot b { color: var(--text-2); font-weight: 600; }
`;

const ICON_SPEAKER = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M2.5 6h2.6L9 3v10L5.1 10H2.5z" fill="#fff" stroke="none"/><path d="M11 5.4a3.5 3.5 0 0 1 0 5.2"/><path d="M12.8 3.4a6 6 0 0 1 0 9.2"/></svg>`;
const ICON_PLAY = `<svg width="8" height="9" viewBox="0 0 8 9"><path d="M0.5 0.5 L7.5 4.5 L0.5 8.5z" fill="currentColor"/></svg>`;
const ICON_MUTE = (m) => m
  ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6h2.6L9 3v10L5.1 10H2.5z" fill="currentColor" stroke="none"/><path d="M11 6l3.5 4M14.5 6L11 10"/></svg>`
  : `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6h2.6L9 3v10L5.1 10H2.5z" fill="currentColor" stroke="none"/><path d="M11 5.4a3.5 3.5 0 0 1 0 5.2"/><path d="M12.8 3.4a6 6 0 0 1 0 9.2"/></svg>`;
const GROUP_COLOR = { ambient: '#34c3c7', world: '#4cc25a', ui: '#62b2ff' };
const GROUPS = [['ambient', 'Ambience beds', 'looping, mixed by time / zoom / weather'], ['world', 'World', 'positional one-shots, scheduled'], ['ui', 'Interface', 'ui:action and world-change feedback']];
const LAYERS = [
  ['wind', 'Wind', '#7fb8ff'], ['leaves', 'Leaves', '#8fd67a'], ['traffic', 'Traffic', '#f2b632'], ['birds', 'Birds', '#4cc25a'], ['crickets', 'Crickets', '#a66cf5'], ['rain', 'Rain', '#34c3c7'],
];
const fmtHour = (h) => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export class Panel {
  /** host: { sounds: Map, api, getMix(), getEvents(), state() } */
  constructor(ctx, host) {
    this.ctx = ctx; this.host = host;
    this.root = null; this.meters = {}; this.rows = new Map(); this.acc = 0; this._last = {};
    this._built = false; this.stats = host.stats || {};
  }
  mount() {
    const ui = document.getElementById('ui');
    if (!ui || this._built) return;
    if (!document.getElementById('au-style')) { const st = document.createElement('style'); st.id = 'au-style'; st.textContent = CSS; document.head.appendChild(st); }
    const root = this.root = el('div', 'au-root');
    const panel = el('div', 'au-panel');
    root.appendChild(panel);
    // header
    const head = el('div', 'au-head');
    head.appendChild(el('div', 'au-ico', ICON_SPEAKER));
    const tt = el('div'); tt.appendChild(el('div', 'au-title', 'AUDIO')); tt.appendChild(el('div', 'au-sub', 'Procedural WebAudio soundscape · no samples, no clips'));
    head.appendChild(tt);
    this.pill = el('div', 'au-pill', '<i></i><span>Idle</span>'); head.appendChild(this.pill);
    panel.appendChild(head);
    const body = el('div', 'au-body'); panel.appendChild(body);
    // enable + master
    const en = el('div', 'au-enable');
    this.enableBtn = el('button', 'au-btn au-primary', `${ICON_PLAY}<span>Enable audio</span>`);
    this.enableBtn.title = 'Browsers only start sound after a click or key press';
    this.enableBtn.addEventListener('click', () => this.host.api.enable());
    en.appendChild(this.enableBtn);
    const master = el('div', 'au-master');
    this.muteBtn = el('button', 'au-btn au-mute', ICON_MUTE(false)); this.muteBtn.title = 'Mute';
    this.muteBtn.addEventListener('click', () => this.host.api.mute(!this.host.api.isMuted()));
    const range = this.range = document.createElement('input'); range.type = 'range'; range.min = '0'; range.max = '100'; range.value = String(Math.round(this.host.api.getMasterVolume() * 100));
    range.addEventListener('input', () => this.host.api.setMasterVolume(+range.value / 100));
    this.pct = el('span', 'au-pct', `${range.value}%`);
    master.appendChild(this.muteBtn); master.appendChild(range); master.appendChild(this.pct);
    en.appendChild(master);
    body.appendChild(en);
    // mix
    const mix = el('div', 'au-sec');
    mix.appendChild(el('div', 'au-sec-h', 'Ambient mix <span class="au-n">time · zoom · weather</span>'));
    this.chips = el('div', 'au-chips'); mix.appendChild(this.chips);
    for (const [key, label, color] of LAYERS) {
      const m = el('div', 'au-meter');
      m.appendChild(el('span', 'au-lab', label));
      const bar = el('div', 'au-bar', '<i></i>'); bar.firstChild.style.setProperty('--c', color); m.appendChild(bar);
      const val = el('span', 'au-val', '0%'); m.appendChild(val);
      mix.appendChild(m);
      this.meters[key] = { fill: bar.firstChild, val, last: -1 };
    }
    this.log = el('div', 'au-log', 'scheduler idle'); mix.appendChild(this.log);
    const sc = el('div', 'au-chips'); sc.style.marginTop = '7px'; sc.style.marginBottom = '0';
    const scen = [
      ['Dawn', () => this.ctx.clock.set(6.5)], ['Noon', () => this.ctx.clock.set(12)], ['Dusk', () => this.ctx.clock.set(17.5)], ['Night', () => this.ctx.clock.set(22)],
      ['Rain', () => this.ctx.modules.environment?.setWeather?.('rain')], ['Clear', () => this.ctx.modules.environment?.setWeather?.('partly')],
      ['Aerial', () => this.ctx.camera.flyTo('aerial', 1.5)], ['Street', () => this.ctx.camera.flyTo('street', 1.5)],
    ];
    for (const [label, fn] of scen) { const c = el('button', 'au-btn au-chip btn', label); c.addEventListener('click', () => { fn(); this.host.api.play('ui_click'); }); sc.appendChild(c); }
    mix.appendChild(sc);
    body.appendChild(mix);
    // library
    let total = 0;
    for (const [group, title, sub] of GROUPS) {
      const sec = el('div', 'au-sec');
      const list = [...this.host.sounds.values()].filter((s) => s.group === group);
      sec.appendChild(el('div', 'au-sec-h', `<span style="color:${GROUP_COLOR[group]}">${title}</span> <span class="au-n">${sub} · ${list.length}</span>`));
      for (const s of list) {
        const row = el('div', 'au-row');
        row.title = s.desc;
        const play = el('button', 'au-btn au-play', ICON_PLAY);
        play.addEventListener('click', () => { if (!this.host.api.play(s.name, { volume: 1 })) this.host.api.enable(); });
        row.appendChild(play);
        row.appendChild(el('div', 'au-name', `${s.label}<small>${s.channels.length > 1 ? 'stereo' : 'mono'}${s.loop ? ' · loop' : ''}</small>`));
        const canvas = document.createElement('canvas'); row.appendChild(canvas);
        row.appendChild(el('span', 'au-dur', s.seconds >= 1 ? `${s.seconds.toFixed(1)}s` : `${Math.round(s.seconds * 1000)}ms`));
        sec.appendChild(row);
        this.rows.set(s.name, { row, canvas, sound: s });
        total += s.channels[0].length * s.channels.length;
      }
      body.appendChild(sec);
    }
    const st = this.stats;
    body.appendChild(el('div', 'au-foot', `<span><b>${this.host.sounds.size}</b> sounds</span><span><b>${(total / 1e6).toFixed(2)} M</b> samples</span><span><b>${st.sampleRate || 24000} Hz</b></span><span>rendered in <b>${Math.round(st.renderMs || 0)} ms</b></span><span>seed <b>${this.ctx.world.seed}</b></span>`));
    ui.appendChild(root);
    this._built = true;
    // waveforms after layout so canvas sizes are known
    requestAnimationFrame(() => this.drawAll());
    this.refresh(true);
  }
  drawAll() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const { canvas, sound } of this.rows.values()) drawWave(canvas, sound, GROUP_COLOR[sound.group], dpr);
  }
  flash(name) {
    const r = this.rows.get(name); if (!r) return;
    r.row.classList.add('flash');
    clearTimeout(r.t); r.t = setTimeout(() => r.row.classList.remove('flash'), 260);
  }
  update(dt) {
    if (!this._built) return;
    this.acc += dt;
    if (this.acc < 0.1) return;
    this.acc = 0;
    this.refresh(false);
  }
  refresh(force) {
    const api = this.host.api, mix = this.host.getMix(), f = mix.factors;
    // status
    const st = api.state();
    const key = `${st}|${api.isMuted()}|${Math.round(api.getMasterVolume() * 100)}`;
    if (force || key !== this._last.status) {
      this._last.status = key;
      const live = st === 'running', susp = st === 'suspended';
      this.pill.className = `au-pill ${live ? 'live' : susp ? 'susp' : ''}`;
      this.pill.lastChild.textContent = live ? `Live · ${Math.round(api.sampleRate() / 1000)} kHz` : susp ? 'Suspended' : this.ctx.headless ? 'Idle · headless' : 'Idle · click to enable';
      this.enableBtn.classList.toggle('on', live);
      this.enableBtn.lastChild.textContent = live ? 'Audio enabled' : susp ? 'Resume audio' : 'Enable audio';
      this.muteBtn.classList.toggle('muted', api.isMuted()); this.muteBtn.innerHTML = ICON_MUTE(api.isMuted());
      const pct = Math.round(api.getMasterVolume() * 100); this.pct.textContent = `${pct}%`; if (+this.range.value !== pct) this.range.value = String(pct);
    }
    // chips
    const chips = `<span class="au-chip"><b>${fmtHour(f.hour)}</b> ${f.night > 0.5 ? 'night' : f.dawnChorus > 0.35 ? (f.hour < 12 ? 'dawn chorus' : 'dusk chorus') : 'day'}</span>` +
      `<span class="au-chip"><b>${Math.round(f.dist)} m</b> ${f.near > 0.66 ? 'street' : f.near > 0.25 ? 'block' : 'aerial'}</span>` +
      `<span class="au-chip">wind <b>${f.windSpeed.toFixed(1)} m/s</b></span><span class="au-chip">rain <b>${Math.round(f.rain * 100)}%</b></span>` +
      `<span class="au-chip">traffic <b>${Math.round(f.traffic * 100)}%</b></span>`;
    if (force || chips !== this._last.chips) { this._last.chips = chips; this.chips.innerHTML = chips; }
    // meters
    for (const [key] of LAYERS) {
      const m = this.meters[key];
      const v = key === 'birds' ? Math.min(1, mix.birdRate / 1.2) : mix[key];
      const pct = Math.round(v * 100);
      if (pct !== m.last) { m.last = pct; m.fill.style.width = `${pct}%`; m.val.textContent = key === 'birds' ? `${mix.birdRate.toFixed(2)}/s` : `${pct}%`; }
    }
    const ev = this.host.getEvents();
    const txt = ev.length ? ev.map((e) => `<b>${fmtHour(e.hour)}</b> ${e.name}${e.volume < 0.98 ? ` ${Math.round(e.volume * 100)}%` : ''}`).join(' · ') : 'scheduler idle';
    if (force || txt !== this._last.log) { this._last.log = txt; this.log.innerHTML = txt; }
  }
  dispose() { this.root?.remove(); this.root = null; this._built = false; this.rows.clear(); }
}

/** Min/max envelope waveform of channel 0 (or the L/R average) with a soft gradient fill. */
function drawWave(canvas, sound, color, dpr) {
  const cw = canvas.clientWidth || 150, ch = canvas.clientHeight || 18;
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);
  const data = sound.channels[0], n = data.length, mid = ch / 2;
  const cols = Math.max(1, Math.floor(cw));
  const grad = g.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, color); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, color);
  g.fillStyle = grad; g.globalAlpha = 0.9;
  g.beginPath();
  const mins = new Float32Array(cols), maxs = new Float32Array(cols);
  for (let c = 0; c < cols; c++) {
    const i0 = Math.floor((c / cols) * n), i1 = Math.max(i0 + 1, Math.floor(((c + 1) / cols) * n));
    let lo = 1, hi = -1;
    const step = Math.max(1, Math.floor((i1 - i0) / 400));
    for (let i = i0; i < i1; i += step) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    mins[c] = lo; maxs[c] = hi;
  }
  for (let c = 0; c < cols; c++) { const y = mid - maxs[c] * (mid - 1); c === 0 ? g.moveTo(c, y) : g.lineTo(c, y); }
  for (let c = cols - 1; c >= 0; c--) g.lineTo(c, mid - mins[c] * (mid - 1));
  g.closePath(); g.fill();
  g.globalAlpha = 0.35; g.fillStyle = color; g.fillRect(0, mid - 0.5, cw, 1);
  g.globalAlpha = 1;
}
