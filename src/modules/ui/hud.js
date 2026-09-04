// HUD: DOM construction + behaviour. Bottom toolbar with category sub-panels, status strip
// (clock/speed, weather, population, happiness, money), RCI demand, info panel, notifications,
// dev corner (fps/draws/tris + showcase/camera switchers). Emits `ui:action` for every interaction.
import { ICONS, PALETTE } from './icons.js';
import { CSS } from './styles.js';
import { MODULE_NAMES } from '../../core/constants.js';
import { hash2 } from '../../core/rng.js';

const fmtInt = new Intl.NumberFormat('en-US');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEASONS = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter'];
const ZONE_COL = { residential: '#4fc65d', commercial: '#3b9cf5', industrial: '#f4892b', office: '#a56ff0' };
const NAME_A = ['Maple', 'Cedar', 'Harbor', 'Willow', 'Granite', 'Sterling', 'Oakridge', 'Riverside', 'Linden', 'Aurora', 'Pinewood', 'Meridian', 'Castle', 'Fenwick', 'Northgate', 'Sunset'];
const NAME_B = {
  residential: ['Court', 'Heights', 'Terrace', 'Residences', 'Gardens', 'Lofts', 'House', 'Villas'],
  commercial: ['Plaza', 'Market', 'Arcade', 'Galleria', 'Emporium', 'Store', 'Bistro', 'Exchange'],
  industrial: ['Works', 'Foundry', 'Depot', 'Logistics', 'Mill', 'Fabrication', 'Yard', 'Assembly'],
  office: ['Tower', 'Centre', 'Offices', 'Group', 'Partners', 'Holdings', 'Systems', 'Labs'],
};
const ROAD_NAMES = { street: 'Two-Lane Street', avenue: 'Four-Lane Avenue', highway: 'Highway', alley: 'Alley', gravel: 'Gravel Road' };

/** Category definitions: toolbar buttons, their sub-panel cards and tool options. */
export const CATEGORIES = [
  { id: 'roads', label: 'Roads', icon: 'roads', tool: 'road', hint: [['LMB', 'Place node'], ['RMB', 'Cancel'], ['U', 'Undo'], ['Esc', 'Close']],
    options: [
      { kind: 'modes', id: 'mode', label: 'Tool Mode', items: [['straight', 'Straight'], ['curve', 'Curved'], ['free', 'Continuous'], ['grid', 'Grid']], value: 'straight' },
      { kind: 'stepper', id: 'elevation', label: 'Elevation', value: 0, step: 5, min: -20, max: 60, unit: ' m' },
      { kind: 'toggles', id: 'snap', label: 'Snapping', items: [['snap', 'Snap to grid'], ['parallel', 'Parallel mode'], ['magnet', 'Snap to roads']], value: ['magnet'] },
    ],
    cards: [
      { id: 'street', label: 'Two-Lane Street', cost: 240, icon: () => ICONS.roadCard({ lanes: 2 }), opts: { type: 'street' } },
      { id: 'avenue', label: 'Four-Lane Avenue', cost: 520, icon: () => ICONS.roadCard({ lanes: 4, median: true }), opts: { type: 'avenue' } },
      { id: 'highway', label: 'Highway', cost: 1180, icon: () => ICONS.roadCard({ lanes: 6, median: true, sidewalk: false, barrier: true }), opts: { type: 'highway' } },
      { id: 'alley', label: 'Alley', cost: 120, icon: () => ICONS.roadCard({ lanes: 1 }), opts: { type: 'alley' } },
      { id: 'gravel', label: 'Gravel Road', cost: 80, icon: () => ICONS.roadCard({ lanes: 2, gravel: true, sidewalk: false }), opts: { type: 'gravel' } },
    ] },
  { id: 'zoning', label: 'Zoning', icon: 'zoning', tool: 'zone', hint: [['LMB', 'Paint'], ['RMB', 'Erase'], ['Esc', 'Close']],
    options: [
      { kind: 'modes', id: 'brush', label: 'Brush', items: [['fill', 'Fill block'], ['paint', 'Paint'], ['marquee', 'Marquee']], value: 'paint' },
      { kind: 'stepper', id: 'size', label: 'Brush size', value: 24, step: 8, min: 8, max: 96, unit: ' m' },
    ],
    cards: [
      { id: 'residential_low', label: 'Low-density Residential', icon: () => ICONS.zoneCard(ZONE_COL.residential, 'low'), opts: { type: 'residential', density: 'low' } },
      { id: 'residential_high', label: 'High-density Residential', icon: () => ICONS.zoneCard(ZONE_COL.residential, 'high'), opts: { type: 'residential', density: 'high' } },
      { id: 'commercial_low', label: 'Low-density Commercial', icon: () => ICONS.zoneCard(ZONE_COL.commercial, 'low'), opts: { type: 'commercial', density: 'low' } },
      { id: 'commercial_high', label: 'High-density Commercial', icon: () => ICONS.zoneCard(ZONE_COL.commercial, 'high'), opts: { type: 'commercial', density: 'high' } },
      { id: 'industrial_low', label: 'Industrial', icon: () => ICONS.zoneCard(ZONE_COL.industrial, 'low'), opts: { type: 'industrial', density: 'low' } },
      { id: 'office_high', label: 'Office', icon: () => ICONS.zoneCard(ZONE_COL.office, 'high'), opts: { type: 'office', density: 'high' } },
    ] },
  { id: 'terrain', label: 'Landscaping', icon: 'terrain', tool: 'terrain', hint: [['LMB', 'Apply brush'], ['Wheel', 'Brush size'], ['Esc', 'Close']],
    options: [
      { kind: 'stepper', id: 'size', label: 'Brush size', value: 40, step: 10, min: 10, max: 200, unit: ' m' },
      { kind: 'stepper', id: 'strength', label: 'Strength', value: 50, step: 10, min: 10, max: 100, unit: ' %' },
    ],
    cards: [
      { id: 'raise', label: 'Raise', icon: () => ICONS.terrainCard('raise'), opts: { mode: 'raise' } },
      { id: 'lower', label: 'Lower', icon: () => ICONS.terrainCard('lower'), opts: { mode: 'lower' } },
      { id: 'flatten', label: 'Level', icon: () => ICONS.terrainCard('flatten'), opts: { mode: 'flatten' } },
      { id: 'smooth', label: 'Smooth', icon: () => ICONS.terrainCard('smooth'), opts: { mode: 'smooth' } },
    ] },
  { id: 'props', label: 'Props & Trees', icon: 'props', tool: 'prop', hint: [['LMB', 'Place'], ['R', 'Rotate'], ['Esc', 'Close']],
    options: [
      { kind: 'modes', id: 'mode', label: 'Placement', items: [['single', 'Single'], ['line', 'Line'], ['brush', 'Brush']], value: 'single' },
      { kind: 'stepper', id: 'spacing', label: 'Spacing', value: 12, step: 2, min: 2, max: 40, unit: ' m' },
    ],
    cards: [
      { id: 'tree_oak', label: 'Oak', cost: 60, icon: () => ICONS.propCard('tree_oak'), opts: { kind: 'tree_oak' } },
      { id: 'tree_pine', label: 'Pine', cost: 60, icon: () => ICONS.propCard('tree_pine'), opts: { kind: 'tree_pine' } },
      { id: 'streetlamp', label: 'Street Lamp', cost: 180, icon: () => ICONS.propCard('streetlamp'), opts: { kind: 'streetlamp' } },
      { id: 'bench', label: 'Bench', cost: 90, icon: () => ICONS.propCard('bench'), opts: { kind: 'bench' } },
      { id: 'bin', label: 'Waste Bin', cost: 40, icon: () => ICONS.propCard('bin'), opts: { kind: 'bin' } },
      { id: 'sign', label: 'Road Sign', cost: 50, icon: () => ICONS.propCard('sign'), opts: { kind: 'sign' } },
      { id: 'bus_stop', label: 'Bus Stop', cost: 320, icon: () => ICONS.propCard('bus_stop'), opts: { kind: 'bus_stop' } },
      { id: 'hydrant', label: 'Hydrant', cost: 70, icon: () => ICONS.propCard('hydrant'), opts: { kind: 'hydrant' } },
      { id: 'fence', label: 'Fence', cost: 30, icon: () => ICONS.propCard('fence'), opts: { kind: 'fence' } },
    ] },
  { id: 'bulldoze', label: 'Bulldoze', icon: 'bulldoze', tool: 'bulldoze', hint: [['LMB', 'Demolish'], ['Drag', 'Area demolish'], ['Esc', 'Close']],
    options: [{ kind: 'modes', id: 'mode', label: 'Mode', items: [['single', 'Single'], ['marquee', 'Marquee']], value: 'single' }],
    cards: [
      { id: 'bulldoze', label: 'Demolish', icon: () => ICONS.bulldozeCard(), opts: {} },
    ] },
  { sep: true },
  { id: 'electricity', label: 'Electricity', icon: 'electricity', tool: 'service', locked: true, cards: [
    { id: 'wind_turbine', label: 'Wind Turbine', cost: 8000, icon: () => ICONS.electricity(), locked: true }, { id: 'coal_plant', label: 'Coal Power Plant', cost: 32000, icon: () => ICONS.factory(), locked: true }] },
  { id: 'water', label: 'Water & Sewage', icon: 'water', tool: 'service', locked: true, cards: [
    { id: 'water_tower', label: 'Water Tower', cost: 6000, icon: () => ICONS.water(), locked: true }, { id: 'sewage', label: 'Sewage Outlet', cost: 9000, icon: () => ICONS.water(), locked: true }] },
  { id: 'health', label: 'Healthcare', icon: 'health', tool: 'service', locked: true, cards: [{ id: 'clinic', label: 'Medical Clinic', cost: 12000, icon: () => ICONS.health(), locked: true }] },
  { id: 'fire', label: 'Fire & Rescue', icon: 'fire', tool: 'service', locked: true, cards: [{ id: 'firehouse', label: 'Fire House', cost: 10000, icon: () => ICONS.fire(), locked: true }] },
  { id: 'police', label: 'Police', icon: 'police', tool: 'service', locked: true, cards: [{ id: 'police_station', label: 'Police Station', cost: 11000, icon: () => ICONS.police(), locked: true }] },
  { id: 'education', label: 'Education', icon: 'education', tool: 'service', locked: true, cards: [{ id: 'school', label: 'Elementary School', cost: 14000, icon: () => ICONS.education(), locked: true }] },
  { id: 'transit', label: 'Transportation', icon: 'transit', tool: 'service', locked: true, cards: [{ id: 'bus_depot', label: 'Bus Depot', cost: 18000, icon: () => ICONS.transit(), locked: true }] },
  { id: 'parks', label: 'Parks & Recreation', icon: 'parks', tool: 'service', locked: true, cards: [{ id: 'small_park', label: 'Small Park', cost: 3000, icon: () => ICONS.parks(), locked: true }] },
  { sep: true },
  { id: 'info', label: 'Info Views', icon: 'info', tool: 'infoview', hint: [['LMB', 'Select'], ['Esc', 'Close']],
    cards: [
      { id: 'none', label: 'Default', icon: () => ICONS.layers(), opts: { view: 'none' } },
      { id: 'zones', label: 'Zones', icon: () => ICONS.zoning(), opts: { view: 'zones' } },
      { id: 'traffic', label: 'Traffic', icon: () => ICONS.roads(), opts: { view: 'traffic' } },
      { id: 'landvalue', label: 'Land Value', icon: () => ICONS.money(), opts: { view: 'landvalue' } },
      { id: 'population', label: 'Population', icon: () => ICONS.people(), opts: { view: 'population' } },
      { id: 'happiness', label: 'Happiness', icon: () => ICONS.face(0.8), opts: { view: 'happiness' } },
    ] },
];

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function btn(cls, html, tip) {
  const b = el('button', 'sb-btn ' + cls, html);
  b.type = 'button';
  if (tip) b.setAttribute('data-tip', tip);
  return b;
}
const pad2 = (n) => (n < 10 ? '0' : '') + n;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp01 = (v) => Math.max(0, Math.min(1, v || 0));
function buildingName(b) {
  const h = hash2(b.id | 0, 17, 3);
  const a = NAME_A[Math.floor(h * NAME_A.length)];
  const list = NAME_B[b.type] || NAME_B.residential;
  return `${a} ${list[Math.floor(hash2(b.id | 0, 29, 5) * list.length)]}`;
}

export class Hud {
  constructor(ctx, { cityName = 'New Dollarton', dev = true } = {}) {
    this.ctx = ctx;
    this.events = ctx.events;
    this.cityName = cityName;
    this.source = { eco: ctx.world.economy, dayOffset: 0, income: 0, popDelta: 0, milestone: 1, milestoneName: 'Tiny Village', xp: 0.2 };
    this.activeCategory = null;
    this.activeCard = {};
    this.optionValues = {};
    this.notes = [];
    this._noteSeq = 0;
    this._lastMin = -1; this._lastDay = -1; this._lastPaused = null; this._lastSpeed = null; this._lastMoney = null; this._lastPop = null; this._lastHappy = -1;
    this._devAcc = 0; this._wKind = -1; this._wTemp = null; this._wMonth = -1; this._disposers = [];
    this._build(dev);
  }

  // ----------------------------------------------------------------------------------------- build
  _build(dev) {
    const host = document.getElementById('ui') || document.body;
    this.style = el('style'); this.style.textContent = CSS; document.head.appendChild(this.style);
    const root = this.root = el('div', 'sb-root');
    host.appendChild(root);

    // dev corner
    if (dev) {
      const devBox = el('div', 'sb-dev sb-pe');
      this.statsEl = el('div', 'sb-stats', '<b>0</b> fps  <b>0.0</b> ms  draws <b>0</b>  tris <b>0</b>  tex <span>0</span>');
      this.statsSpans = [...this.statsEl.querySelectorAll('b, span')];
      this._statsLast = [null, null, null, null, null];
      devBox.appendChild(this.statsEl);
      const row = el('div', 'sb-devrow');
      const showcase = this.ctx.world.flags.showcase || 'democity';
      this.showcaseSel = el('select', 'sb-select');
      for (const n of MODULE_NAMES) { const o = el('option', '', n); o.value = n; if (n === showcase) o.selected = true; this.showcaseSel.appendChild(o); }
      this.showcaseSel.title = 'Showcase (dev)';
      this.showcaseSel.addEventListener('change', () => this._switchShowcase(this.showcaseSel.value));
      this.cameraSel = el('select', 'sb-select');
      const ph = el('option', '', 'camera'); ph.value = ''; this.cameraSel.appendChild(ph);
      for (const n of Object.keys(this.ctx.camera.presets)) { const o = el('option', '', n); o.value = n; this.cameraSel.appendChild(o); }
      this.cameraSel.addEventListener('change', () => { if (this.cameraSel.value) { this.ctx.camera.flyTo(this.cameraSel.value, 1.2); this.action('camera', this.cameraSel.value); this.cameraSel.value = ''; } });
      row.append(el('span', '', 'dev'), this.showcaseSel, this.cameraSel);
      devBox.appendChild(row);
      root.appendChild(devBox);
    }

    // top right: round buttons + notifications
    const tr = el('div', 'sb-topright');
    const topBtns = el('div', 'sb-topbtns sb-pe');
    const bHelp = btn('sb-round sb-tip-below', ICONS.help(), 'Help'); bHelp.addEventListener('click', () => this.action('help'));
    const bGear = btn('sb-round sb-tip-below', ICONS.gear(), 'Options'); bGear.addEventListener('click', () => this.action('options'));
    topBtns.append(bHelp, bGear);
    this.notesEl = el('div', 'sb-notes sb-pe');
    tr.append(topBtns, this.notesEl);
    root.appendChild(tr);

    // info panel (hidden until a selection)
    this.infoEl = el('div', 'sb-info sb-glass sb-pe sb-hidden');
    root.appendChild(this.infoEl);

    // tool hint
    this.hintEl = el('div', 'sb-hint sb-hidden');
    root.appendChild(this.hintEl);

    // sub panel
    this.subEl = el('div', 'sb-subpanel sb-glass sb-pe sb-hidden');
    root.appendChild(this.subEl);

    // dock
    const dock = el('div', 'sb-dock sb-pe');
    dock.append(this._buildToolbar(), this._buildStatus());
    root.appendChild(dock);

    this._onKey = (e) => {
      if (e.code === 'Escape') { if (this.activeCategory) this.setCategory(null); else if (!this.infoEl.classList.contains('sb-hidden')) this.hideInfo(); }
      else if (e.code === 'Space' && !e.target.closest('input,select,textarea,button')) this._togglePause();
    };
    window.addEventListener('keydown', this._onKey);
    this.refreshDemand();
  }

  _buildToolbar() {
    const bar = el('div', 'sb-toolbar');
    const left = el('div', 'sb-toolbar-left');
    // milestone chip
    const ms = btn('sb-milestone', '', 'City progress');
    const badge = el('div', 'sb-badge', `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#1d2a3a" stroke="#4fc65d" stroke-width="3"/><circle cx="18" cy="18" r="16" fill="none" stroke="#2f9a3c" stroke-width="3" stroke-dasharray="100" stroke-dashoffset="30" opacity=".6"/></svg><span class="sb-badge-num">1</span>`);
    this.badgeNum = badge.querySelector('.sb-badge-num');
    const mt = el('div', 'sb-milestone-text');
    this.msName = el('div', 'sb-t1', 'Tiny Village');
    this.msSub = el('div', 'sb-t2', 'Next: Small Village');
    this.xpEl = el('div', 'sb-xp', '<i></i>');
    mt.append(this.msName, this.msSub, this.xpEl);
    ms.append(badge, mt);
    ms.addEventListener('click', () => this.action('milestones'));
    // RCI
    const rci = el('div', 'sb-rci');
    rci.setAttribute('data-tip', 'Zone demand: Residential · Commercial · Industrial · Office');
    this.rciBars = {};
    for (const [k, l] of [['residential', 'R'], ['commercial', 'C'], ['industrial', 'I'], ['office', 'O']]) {
      rci.appendChild(el('div', 'sb-rci-l', l));
      const b = el('div', 'sb-rci-b ' + l.toLowerCase(), '<i></i>');
      this.rciBars[k] = b.firstChild; rci.appendChild(b);
    }
    left.append(ms, rci);

    // tools
    const tools = el('div', 'sb-tools');
    this.toolBtns = {};
    for (const c of CATEGORIES) {
      if (c.sep) { tools.appendChild(el('div', 'sb-sep')); continue; }
      const b = btn('sb-tool' + (c.locked ? ' is-dim' : ''), ICONS[c.icon](), c.label + (c.locked ? ' (locked)' : ''));
      b.addEventListener('click', () => this.setCategory(this.activeCategory === c.id ? null : c.id, true));
      this.toolBtns[c.id] = b; tools.appendChild(b);
    }

    const right = el('div', 'sb-toolbar-right');
    for (const [icon, tip, act] of [['layers', 'Map overlays', 'overlays'], ['stats', 'Statistics', 'statistics'], ['camera', 'Photo mode', 'photomode']]) {
      const b = btn('sb-round', ICONS[icon](), tip); b.addEventListener('click', () => this.action(act)); right.appendChild(b);
    }
    bar.append(left, tools, right);
    return bar;
  }

  _buildStatus() {
    const s = el('div', 'sb-status');
    // clock chip
    const clock = el('div', 'sb-chip sb-clock');
    this.playBtn = btn('sb-ctl', ICONS.pause(), 'Pause / resume (Space)');
    this.playBtn.addEventListener('click', () => this._togglePause());
    this.timeEl = el('span', 'sb-time sb-num', '00:00');
    this.dateEl = el('span', 'sb-date sb-num', '—');
    const speed = el('div', 'sb-speed');
    this.speedBtns = [];
    [[1, 1], [2, 2], [4, 3]].forEach(([sp, n]) => {
      const b = btn('sb-ctl', ICONS.chevrons(n), `Speed ${sp}×`);
      b.addEventListener('click', () => this.setSpeed(sp));
      this.speedBtns.push([sp, b]); speed.appendChild(b);
    });
    clock.append(this.playBtn, this.timeEl, this.dateEl, speed);
    // weather chip
    const weather = btn('sb-chip sb-chip-btn', '', 'Weather & season');
    this.weatherIcon = el('span', '', ICONS.sun());
    this.tempEl = el('span', 'sb-v sb-num', '18°C');
    this.seasonEl = el('span', 'sb-k', 'Spring');
    weather.append(this.weatherIcon, this.tempEl, this.seasonEl);
    weather.addEventListener('click', () => this.action('weather'));
    // city name
    const city = btn('sb-chip sb-chip-btn sb-cityname', this.cityName, 'City info');
    city.addEventListener('click', () => this.action('cityinfo'));
    this.cityEl = city;
    // population chip
    const pop = btn('sb-chip sb-chip-btn', '', 'Population');
    this.popEl = el('span', 'sb-v sb-num', '0');
    this.popTrend = el('span', 'sb-trend up sb-num', ICONS.trendUp() + '<span>0</span>');
    pop.append(el('span', '', ICONS.people()), this.popEl, this.popTrend);
    pop.addEventListener('click', () => this.action('population'));
    // happiness chip
    const hap = btn('sb-chip sb-chip-btn', '', 'Happiness');
    const faces = el('div', 'sb-faces');
    this.faceEls = [0.1, 0.5, 0.9].map((m) => { const w = el('span', '', ICONS.face(m)); faces.appendChild(w); return w.firstChild; });
    this.hapEl = el('span', 'sb-v sb-num', '—');
    hap.append(faces, this.hapEl);
    hap.addEventListener('click', () => this.action('happiness'));
    // money chip
    const money = btn('sb-chip sb-chip-btn sb-money', '', 'Budget');
    this.moneyEl = el('span', 'sb-v sb-num', '¢0');
    this.moneyTrend = el('span', 'sb-trend up sb-num', ICONS.trendUp() + '<span>¢0</span>');
    money.append(el('span', '', ICONS.money()), this.moneyEl, this.moneyTrend);
    money.addEventListener('click', () => this.action('budget'));

    s.append(clock, weather, el('div', 'sb-spacer'), city, el('div', 'sb-spacer'), pop, hap, money);
    return s;
  }

  // ----------------------------------------------------------------------------------------- actions
  action(action, ...args) { this.events.emit('ui:action', { action, args }); }
  _switchShowcase(name) {
    this.action('showcase', name);
    const p = new URLSearchParams(window.location.search);
    p.set('showcase', name);
    window.location.search = p.toString();
  }
  _togglePause() {
    const c = this.ctx.clock;
    if (c.paused || c.speed === 0) { c.resume(); if (c.speed === 0) c.setSpeed(1); this.action('resume'); }
    else { c.pause(); this.action('pause'); }
    this._syncSpeed();
  }
  setSpeed(n) {
    const c = this.ctx.clock;
    c.setSpeed(n); if (c.paused) c.resume();
    this.action('setSpeed', n);
    this._syncSpeed();
  }
  _syncSpeed() {
    const c = this.ctx.clock;
    const paused = c.paused || c.speed === 0;
    if (paused === this._lastPaused && c.speed === this._lastSpeed) return;
    this._lastPaused = paused; this._lastSpeed = c.speed;
    this.playBtn.innerHTML = paused ? ICONS.play() : ICONS.pause();
    this.playBtn.classList.toggle('is-active', !paused);
    for (const [sp, b] of this.speedBtns) b.classList.toggle('is-active', !paused && c.speed === sp);
  }

  /** Toolbar category. `fromUser` → also tells the tools module and emits ui:action. */
  setCategory(id, fromUser = false) {
    this.activeCategory = id;
    for (const [k, b] of Object.entries(this.toolBtns)) b.classList.toggle('is-active', k === id);
    const cat = CATEGORIES.find((c) => c.id === id);
    if (!cat) {
      this.subEl.classList.add('sb-hidden'); this.hintEl.classList.add('sb-hidden');
      if (fromUser) { this.action('category', null); this._toolsSelect(null); }
      return;
    }
    this._renderSubpanel(cat);
    if (fromUser) {
      this.action('category', id);
      const cardId = this.activeCard[id] || cat.cards[0]?.id;
      const card = cat.cards.find((c) => c.id === cardId);
      if (card && !card.locked) this._toolsSelect(cat.tool, { ...card.opts, ...this._options(cat) });
    }
  }
  selectCard(catId, cardId, fromUser = false) {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    this.activeCard[catId] = cardId;
    if (this.activeCategory === catId && this.cardEls) for (const [k, e] of Object.entries(this.cardEls)) e.classList.toggle('is-active', k === cardId);
    if (fromUser) {
      const card = cat.cards.find((c) => c.id === cardId);
      this.action('selectAsset', catId, cardId);
      if (card?.locked) this.notify({ type: 'warning', title: 'Not yet unlocked', body: `${card.label} requires the "${this.source.milestoneName === 'Tiny Village' ? 'Small Village' : 'next'}" milestone.`, ttl: 5 });
      else this._toolsSelect(cat.tool, { ...(card?.opts || {}), ...this._options(cat) });
    }
  }
  _options(cat) {
    const o = {};
    for (const opt of cat.options || []) o[opt.id] = this.optionValues[cat.id + ':' + opt.id] ?? opt.value;
    return o;
  }
  _toolsSelect(name, opts) {
    const tools = this.ctx.modules?.tools;
    try { if (name === null) tools?.api?.select?.(null); else tools?.api?.select?.(name, opts); } catch (e) { this.ctx.log.warn('tools.select failed', e); }
  }
  _renderSubpanel(cat) {
    const sub = this.subEl; sub.innerHTML = '';
    const head = el('div', 'sb-subpanel-head');
    head.appendChild(el('div', 'sb-title', ICONS[cat.icon]() + `<span>${cat.label}</span>`));
    if (cat.id === 'roads') {
      for (const [id, l] of [['roads', 'Roads'], ['intersections', 'Intersections'], ['services', 'Road services']]) {
        const t = btn('sb-tab' + (id === 'roads' ? ' is-active' : ''), l);
        t.addEventListener('click', () => { this.action('tab', cat.id, id); head.querySelectorAll('.sb-tab').forEach((x) => x.classList.toggle('is-active', x === t)); });
        head.appendChild(t);
      }
    }
    const close = btn('sb-close', ICONS.close()); close.addEventListener('click', () => this.setCategory(null, true));
    head.appendChild(close);
    const body = el('div', 'sb-subpanel-body');
    if (cat.options?.length) body.appendChild(this._renderOptions(cat));
    const cards = el('div', 'sb-cards');
    this.cardEls = {};
    const active = this.activeCard[cat.id] || cat.cards[0]?.id;
    this.activeCard[cat.id] = active;
    for (const c of cat.cards) {
      const b = btn('sb-card' + (c.id === active ? ' is-active' : '') + (c.locked ? ' is-locked' : ''), c.icon() + `<div class="sb-cn">${c.label}</div>` + (c.cost ? `<div class="sb-cc">¢${fmtInt.format(c.cost)}</div>` : ''));
      b.addEventListener('click', () => this.selectCard(cat.id, c.id, true));
      this.cardEls[c.id] = b; cards.appendChild(b);
    }
    body.appendChild(cards);
    sub.append(head, body);
    sub.classList.remove('sb-hidden');
    // hint pill above the panel
    if (cat.hint) {
      this.hintEl.innerHTML = cat.hint.map(([k, v]) => `<span><span class="sb-key">${k}</span>${v}</span>`).join('');
      this.hintEl.classList.remove('sb-hidden');
      this.hintEl.style.bottom = (112 + sub.offsetHeight + 10) + 'px';
    } else this.hintEl.classList.add('sb-hidden');
  }
  _renderOptions(cat) {
    const box = el('div', 'sb-toolmodes');
    for (const opt of cat.options) {
      const key = cat.id + ':' + opt.id;
      const row = el('div', 'sb-tm-row');
      row.appendChild(el('span', 'sb-k', opt.label));
      if (opt.kind === 'modes' || opt.kind === 'toggles') {
        const g = el('div', 'sb-tm-group');
        const cur = this.optionValues[key] ?? opt.value;
        for (const [id, label] of opt.items) {
          const on = opt.kind === 'modes' ? cur === id : cur.includes(id);
          const b = btn('sb-tm' + (on ? ' is-active' : ''), ICONS.modeIcon(id), label);
          b.addEventListener('click', () => {
            if (opt.kind === 'modes') { this.optionValues[key] = id; g.querySelectorAll('.sb-tm').forEach((x) => x.classList.toggle('is-active', x === b)); }
            else { const set = new Set(this.optionValues[key] ?? opt.value); set.has(id) ? set.delete(id) : set.add(id); this.optionValues[key] = [...set]; b.classList.toggle('is-active', set.has(id)); }
            this.action('toolOption', cat.id, opt.id, this.optionValues[key]);
            try { this.ctx.modules?.tools?.api?.setOption?.(opt.id, this.optionValues[key]); } catch (e) { /* tools optional */ }
          });
          g.appendChild(b);
        }
        row.appendChild(g);
      } else if (opt.kind === 'stepper') {
        const st = el('div', 'sb-stepper');
        const val = el('span', 'sb-val sb-num');
        const show = () => { val.textContent = (this.optionValues[key] ?? opt.value) + opt.unit; };
        const change = (d) => {
          const v = Math.max(opt.min, Math.min(opt.max, (this.optionValues[key] ?? opt.value) + d * opt.step));
          this.optionValues[key] = v; show();
          this.action('toolOption', cat.id, opt.id, v);
          try { this.ctx.modules?.tools?.api?.setOption?.(opt.id, v); } catch (e) { /* tools optional */ }
        };
        const dn = btn('sb-tm', ICONS.chevronDown()); dn.addEventListener('click', () => change(-1));
        const up = btn('sb-tm', ICONS.chevronUp()); up.addEventListener('click', () => change(1));
        show(); st.append(dn, val, up); row.appendChild(st);
      }
      box.appendChild(row);
    }
    return box;
  }

  /** tool:changed → highlight. Accepts {tool, options}. */
  onToolChanged({ tool, options } = {}) {
    if (!tool) { this.setCategory(null); return; }
    const t = String(tool).toLowerCase();
    const cat = /road/.test(t) ? 'roads' : /zone/.test(t) ? 'zoning' : /terrain|sculpt|landscap/.test(t) ? 'terrain' : /bulldoz|demolish/.test(t) ? 'bulldoze' : /prop|tree|lamp/.test(t) ? 'props' : /info|view/.test(t) ? 'info' : null;
    if (!cat) return;
    if (this.activeCategory !== cat) this.setCategory(cat);
    const def = CATEGORIES.find((c) => c.id === cat);
    const o = options || {};
    const card = def.cards.find((c) => Object.keys(c.opts || {}).length && Object.entries(c.opts).every(([k, v]) => o[k] === v));
    if (card) this.selectCard(cat, card.id);
  }

  // ----------------------------------------------------------------------------------------- data
  setSource(src) { Object.assign(this.source, src); this._lastMoney = this._lastPop = null; this._lastHappy = -1; this._lastMin = -1; this._lastDay = -1; this.refreshDemand(); this._refreshMilestone(); }
  _refreshMilestone() {
    const s = this.source;
    this.badgeNum.textContent = String(s.milestone);
    this.msName.textContent = s.milestoneName;
    this.msSub.textContent = s.milestoneNext ? `Next: ${s.milestoneNext}` : 'Max milestone reached';
    this.xpEl.firstChild.style.width = (clamp01(s.xp) * 100).toFixed(0) + '%';
  }
  refreshDemand(d) {
    const dem = d || this.source.eco?.demand || {};
    for (const [k, bar] of Object.entries(this.rciBars)) bar.style.width = (clamp01(dem[k]) * 100).toFixed(0) + '%';
  }
  _refreshWeather() {
    const w = this.ctx.world.weather, night = this.ctx.clock.isNight();
    const kind = w.rain > 0.3 ? 3 : w.cloudiness > 0.6 ? 2 : night ? 1 : 0;
    const temp = Math.round(w.temperature ?? 18);
    const month = this._month();
    if (kind === this._wKind && temp === this._wTemp && month === this._wMonth) return;
    this._wKind = kind; this._wTemp = temp; this._wMonth = month;
    this.weatherIcon.innerHTML = ICONS[['sun', 'moon', 'cloud', 'rain'][kind]]();
    this.tempEl.textContent = `${temp}°C`;
    this.seasonEl.textContent = SEASONS[month];
  }
  _month() { return ((this.ctx.clock.day - 1 + (this.source.dayOffset | 0)) % 12 + 12) % 12; }

  // ----------------------------------------------------------------------------------------- per frame
  update(dt) {
    const c = this.ctx.clock;
    const mins = Math.floor(c.hour * 60);
    if (mins !== this._lastMin) {
      this._lastMin = mins;
      this.timeEl.textContent = `${pad2(Math.floor(mins / 60) % 24)}:${pad2(mins % 60)}`;
    }
    if (c.day !== this._lastDay) {
      this._lastDay = c.day;
      const m = this._month(), y = 2031 + Math.floor((c.day - 1 + (this.source.dayOffset | 0)) / 12);
      this.dateEl.textContent = `${MONTHS[m]} ${y}`;
      this._wMonth = -1;
    }
    this._syncSpeed();
    this._refreshWeather();
    const eco = this.source.eco;
    if (eco) {
      const money = Math.round(eco.money), pop = Math.round(eco.population);
      if (money !== this._lastMoney) {
        this._lastMoney = money; this.moneyEl.textContent = '¢' + fmtInt.format(money);
        const inc = Math.round(this.source.income || 0);
        this.moneyTrend.className = 'sb-trend sb-num ' + (inc >= 0 ? 'up' : 'down');
        this.moneyTrend.innerHTML = (inc >= 0 ? ICONS.trendUp() : ICONS.trendDown()) + `<span>${inc >= 0 ? '+' : '−'}¢${fmtInt.format(Math.abs(inc))}</span>`;
      }
      if (pop !== this._lastPop) {
        this._lastPop = pop; this.popEl.textContent = fmtInt.format(pop);
        const d = Math.round(this.source.popDelta || 0);
        this.popTrend.className = 'sb-trend sb-num ' + (d >= 0 ? 'up' : 'down');
        this.popTrend.innerHTML = (d >= 0 ? ICONS.trendUp() : ICONS.trendDown()) + `<span>${d >= 0 ? '+' : '−'}${fmtInt.format(Math.abs(d))}</span>`;
      }
      const hap = Math.round(clamp01(eco.happiness) * 100);
      if (hap !== this._lastHappy) {
        this._lastHappy = hap; this.hapEl.textContent = hap + '%';
        const idx = hap > 66 ? 2 : hap > 33 ? 1 : 0;
        this.faceEls.forEach((f, i) => f.classList.toggle('on', i === idx));
      }
    }
    // notifications
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      if (n.ttl > 0) { n.ttl -= dt; if (n.ttl <= 0) this._dismiss(n); }
    }
    // dev stats
    if (this.statsEl) {
      this._devAcc += dt;
      if (this._devAcc >= 0.25) {
        this._devAcc = 0;
        const s = this.ctx.engine.stats, sp = this.statsSpans, last = this._statsLast;
        // real wall-clock fps (profiling only): engine.stats.fps is derived from dt clamped at 0.1 s
        const now = performance.now();
        const fps = this._devT ? Math.round(((s.frames - this._devF) * 1000) / Math.max(1, now - this._devT)) : 0;
        this._devT = now; this._devF = s.frames;
        const ms = Math.round(s.frameMs * 10), tris = s.triangles;
        if (fps !== last[0]) { last[0] = fps; sp[0].textContent = String(fps); }
        if (ms !== last[1]) { last[1] = ms; sp[1].textContent = (ms / 10).toFixed(1); }
        if (s.drawCalls !== last[2]) { last[2] = s.drawCalls; sp[2].textContent = String(s.drawCalls); }
        if (tris !== last[3]) { last[3] = tris; sp[3].textContent = tris >= 1e6 ? (tris / 1e6).toFixed(2) + 'M' : tris >= 1e3 ? (tris / 1e3).toFixed(1) + 'k' : String(tris); }
        if (s.textures !== last[4]) { last[4] = s.textures; sp[4].textContent = String(s.textures); }
      }
    }
  }

  // ----------------------------------------------------------------------------------------- notifications
  /** notify({type:'info'|'success'|'warning'|'error'|'money'|'building', title, body, ttl}) → id. ttl<=0 → persistent. */
  notify({ type = 'info', title = '', body = '', ttl = 8, when } = {}) {
    const colour = { info: PALETTE.blue, success: PALETTE.green, warning: PALETTE.yellow, error: PALETTE.red, money: PALETTE.green, building: PALETTE.blueL }[type] || PALETTE.blue;
    const icon = { info: 'noteInfo', success: 'noteOk', warning: 'noteWarn', error: 'noteErr', money: 'noteMoney', building: 'noteBuilding' }[type] || 'noteInfo';
    const c = this.ctx.clock;
    const stamp = when || `${pad2(Math.floor(c.hour))}:${pad2(Math.floor((c.hour % 1) * 60))}`;
    const e = el('div', 'sb-note sb-glass');
    e.style.setProperty('--nc', colour);
    e.innerHTML = `<div class="sb-nic">${ICONS[icon]()}</div><div class="sb-nt"><div class="sb-n1"><span>${esc(title)}</span><span class="sb-when sb-num">${esc(stamp)}</span></div><div class="sb-n2">${esc(body)}</div></div>`;
    const n = { id: ++this._noteSeq, el: e, ttl, type };
    e.addEventListener('click', () => { this.action('dismissNotification', n.id); this._dismiss(n); });
    this.notes.push(n);
    this.notesEl.appendChild(e);
    while (this.notes.length > 5) this._dismiss(this.notes[0]);
    return n.id;
  }
  _dismiss(n) {
    const i = this.notes.indexOf(n);
    if (i >= 0) this.notes.splice(i, 1);
    n.el.classList.add('is-leaving');
    setTimeout(() => n.el.remove(), 220);
  }
  clearNotifications() { for (const n of this.notes.slice()) this._dismiss(n); }

  // ----------------------------------------------------------------------------------------- info panel
  /** selection:changed → build the panel from world data. */
  onSelection({ kind, id } = {}) {
    if (!kind || id === null || id === undefined) { this.hideInfo(); return; }
    const w = this.ctx.world;
    if (kind === 'building') { const b = w.buildings.items.get(id); if (b) this.showInfo({ kind, data: b }); else this.hideInfo(); }
    else if (kind === 'road' || kind === 'edge') { const e = w.roads.edges.get(id); if (e) this.showInfo({ kind: 'road', data: e }); else this.hideInfo(); }
    else if (kind === 'node') { const n = w.roads.nodes.get(id); if (n) this.showInfo({ kind, data: n }); else this.hideInfo(); }
    else if (kind === 'prop') { const p = w.props.items.get(id); if (p) this.showInfo({ kind, data: p }); else this.hideInfo(); }
    else if (kind === 'vehicle') { const v = w.traffic.vehicles.get(id); if (v) this.showInfo({ kind, data: v }); else this.hideInfo(); }
    else this.hideInfo();
  }
  hideInfo() { this.infoEl.classList.add('sb-hidden'); this.infoEl.innerHTML = ''; }
  showInfo({ kind, data, extra = {} }) {
    const p = this.infoEl; p.innerHTML = '';
    const rows = [], bars = [];
    let title = '', sub = '', icon = ICONS.house(), pill = null, level = 0;
    if (kind === 'building') {
      const b = data;
      title = b.name || buildingName(b);
      icon = { residential: b.density === 'high' ? ICONS.office() : ICONS.house(), commercial: ICONS.shop(), industrial: ICONS.factory(), office: ICONS.office() }[b.type] || ICONS.house();
      pill = [b.type, ZONE_COL[b.type] || PALETTE.grey];
      sub = `${b.density === 'high' ? 'High' : 'Low'} density · Level ${b.level || 1}`;
      level = b.level || 1;
      const occ = b.occupants ?? 0, jobs = b.jobs ?? 0;
      if (b.type === 'residential') rows.push(['Households', fmtInt.format(extra.households ?? Math.max(1, Math.round(occ / 2.4)))], ['Residents', fmtInt.format(occ)]);
      else rows.push(['Workers', `${fmtInt.format(extra.workers ?? Math.round(jobs * 0.83))} / ${fmtInt.format(jobs)}`]);
      rows.push(['Floors', String(b.floors ?? 1)], ['Height', `${Math.round(b.height ?? 0)} m`], ['Footprint', `${Math.round(b.footprint?.w ?? 0)} × ${Math.round(b.footprint?.d ?? 0)} m`]);
      if (extra.landValue !== undefined) rows.push(['Land value', `¢${fmtInt.format(extra.landValue)}/m²`]);
      if (extra.rent !== undefined) rows.push(['Rent', `¢${fmtInt.format(extra.rent)}/month`]);
      if (extra.upkeep !== undefined) rows.push(['Upkeep', `¢${fmtInt.format(extra.upkeep)}/month`, 'bad']);
      if (extra.age !== undefined) rows.push(['Built', extra.age]);
      bars.push(['Happiness', clamp01(extra.happiness ?? 0.7), 'green'], ['Well-being', clamp01(extra.wellbeing ?? 0.6), ''], ['Level progress', clamp01(extra.levelProgress ?? 0.4), 'yellow']);
    } else if (kind === 'road') {
      const e = data, t = this.ctx.world.roads.types[e.type] || {};
      title = extra.name || `${ROAD_NAMES[e.type] || e.type}`;
      icon = ICONS.roads(); pill = ['road', PALETTE.grey];
      sub = `Segment #${e.id} · ${e.oneWay ? 'One-way' : 'Two-way'}`;
      rows.push(['Lanes', String(e.lanes ?? t.lanes ?? 2)], ['Width', `${e.width ?? t.width ?? 16} m`], ['Length', `${Math.round(e.length ?? 0)} m`], ['Speed limit', `${t.speed ?? 50} km/h`], ['Elevation', `${Math.round(e.elevation ?? 0)} m`]);
      if (extra.volume !== undefined) rows.push(['Traffic volume', `${fmtInt.format(extra.volume)} / h`]);
      if (extra.upkeep !== undefined) rows.push(['Upkeep', `¢${fmtInt.format(extra.upkeep)}/month`, 'bad']);
      bars.push(['Traffic flow', clamp01(extra.flow ?? 0.8), 'green'], ['Condition', clamp01(extra.condition ?? 0.9), '']);
    } else if (kind === 'node') {
      title = 'Intersection'; icon = ICONS.roads(); pill = ['junction', PALETTE.grey];
      sub = `Node #${data.id}`;
      rows.push(['Connected roads', String(data.edges?.size ?? 0)], ['Elevation', `${Math.round(data.y ?? 0)} m`], ['Traffic lights', extra.lights ? 'Yes' : 'No']);
    } else if (kind === 'prop') {
      title = String(data.kind || 'Prop').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); icon = ICONS.props(); pill = ['prop', PALETTE.green];
      sub = `Prop #${data.id}`;
      rows.push(['Position', `${Math.round(data.x)}, ${Math.round(data.z)}`], ['Elevation', `${Math.round(data.y ?? 0)} m`], ['Heading', `${Math.round(((data.heading || 0) * 180) / Math.PI)}°`]);
    } else if (kind === 'vehicle') {
      title = String(data.kind || 'Vehicle').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); icon = ICONS.vehicle(); pill = ['vehicle', PALETTE.red];
      sub = `Vehicle #${data.id}`;
      rows.push(['Speed', `${Math.round((data.speed || 0) * 3.6)} km/h`], ['Lane', String(data.lane ?? 0)], ['Lights', data.lightsOn ? 'On' : 'Off']);
    }
    const head = el('div', 'sb-info-head');
    head.innerHTML = `<div class="sb-ic">${icon}</div><div class="sb-ht"><div class="sb-h1">${esc(title)}</div><div class="sb-h2">${pill ? `<span class="sb-pill" style="background:${pill[1]}">${esc(pill[0])}</span>` : ''}<span>${esc(sub)}</span></div></div>`;
    const close = btn('sb-close', ICONS.close()); close.addEventListener('click', () => { this.action('closeInfo'); this.hideInfo(); });
    head.appendChild(close);
    const body = el('div', 'sb-info-body');
    if (level) {
      const lv = el('div', 'sb-barrow');
      lv.innerHTML = `<span class="sb-k">Level</span><span class="sb-level">${[1, 2, 3, 4, 5].map((i) => ICONS.star().replace('<svg', `<svg class="${i <= level ? '' : 'off'}"`)).join('')}</span><span class="sb-v sb-num">${level} / 5</span>`;
      body.appendChild(lv);
    }
    if (rows.length) {
      body.appendChild(el('div', 'sb-section', 'Details'));
      const g = el('div', 'sb-rows');
      for (const [k, v, cls] of rows) { g.appendChild(el('span', 'sb-k', esc(k))); g.appendChild(el('span', 'sb-v sb-num' + (cls ? ' ' + cls : ''), esc(v))); }
      body.appendChild(g);
    }
    if (bars.length) {
      body.appendChild(el('div', 'sb-section', 'Status'));
      for (const [k, v, cls] of bars) {
        const r = el('div', 'sb-barrow');
        r.innerHTML = `<span class="sb-k">${k}</span><div class="sb-bar ${cls}"><i style="width:${(v * 100).toFixed(0)}%"></i></div><span class="sb-v sb-num">${(v * 100).toFixed(0)}%</span>`;
        body.appendChild(r);
      }
    }
    const actions = el('div', 'sb-actions');
    const mk = (cls, icon, label, act) => { const b = btn('sb-action ' + cls, icon + `<span>${label}</span>`); b.addEventListener('click', () => this.action(act, kind, data.id)); return b; };
    actions.appendChild(mk('primary', ICONS.focus(), 'Focus', 'focus'));
    if (kind === 'building' || kind === 'road') actions.appendChild(mk('', ICONS.document(), 'Policies', 'policies'));
    actions.appendChild(mk('danger', ICONS.bulldoze(), 'Demolish', 'demolish'));
    p.append(head, body, actions);
    p.classList.remove('sb-hidden');
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    this.root?.remove(); this.style?.remove();
  }
}
