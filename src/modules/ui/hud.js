// HUD: DOM construction + behaviour. Bottom toolbar (categories incl. services from world.services.kinds,
// milestone-gated), status strip, RCI, sub-panels with isometric asset cards, info panel, transit line
// panel, infoview legend, notifications + journal, statistics, milestone toast, minimap, dev corner,
// photo mode, menus (main / pause / save / load / settings). Emits `ui:action` for every interaction.
import { ICONS, PALETTE } from './icons.js';
import * as CARDS from './cards.js';
import { CSS } from './styles.js';
import { MODULE_NAMES } from '../../core/constants.js';
import { hash2 } from '../../core/rng.js';
import { Minimap } from './minimap.js';
import { Menus } from './panels.js';

import { el, btn, esc, fmtInt, pad2, clamp01 } from './dom.js';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEASONS = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter'];
export const ZONE_COL = { residential: '#4fc65d', commercial: '#3b9cf5', industrial: '#f4892b', office: '#a56ff0' };
const NAME_A = ['Maple', 'Cedar', 'Harbor', 'Willow', 'Granite', 'Sterling', 'Oakridge', 'Riverside', 'Linden', 'Aurora', 'Pinewood', 'Meridian', 'Castle', 'Fenwick', 'Northgate', 'Sunset'];
const NAME_B = {
  residential: ['Court', 'Heights', 'Terrace', 'Residences', 'Gardens', 'Lofts', 'House', 'Villas'],
  commercial: ['Plaza', 'Market', 'Arcade', 'Galleria', 'Emporium', 'Store', 'Bistro', 'Exchange'],
  industrial: ['Works', 'Foundry', 'Depot', 'Logistics', 'Mill', 'Fabrication', 'Yard', 'Assembly'],
  office: ['Tower', 'Centre', 'Offices', 'Group', 'Partners', 'Holdings', 'Systems', 'Labs'],
};
const ROAD_NAMES = { street: 'Two-Lane Street', avenue: 'Four-Lane Avenue', highway: 'Highway', alley: 'Alley', gravel: 'Gravel Road' };
const LINE_COLOURS = ['#2f8ff5', '#e5484d', '#4cc25a', '#f5c542', '#a66cf5', '#34c3c7', '#f28c28', '#ff6fb1'];

/** Milestone ladder (mirrors simulation/economy.js; used for "Unlocks at …" tooltips when the simulation is absent). */
export const MILESTONES = [
  { name: 'Hamlet', unlocks: ['roads', 'zoning'] }, { name: 'Tiny Village', unlocks: ['power', 'water'] }, { name: 'Small Village', unlocks: ['garbage', 'healthcare'] },
  { name: 'Large Village', unlocks: ['education', 'police'] }, { name: 'Grand Village', unlocks: ['fire', 'parks'] }, { name: 'Tiny Town', unlocks: ['high_density', 'avenues'] },
  { name: 'Boom Town', unlocks: ['highways', 'transit'] }, { name: 'Busy Town', unlocks: ['university', 'plazas'] }, { name: 'Big Town', unlocks: ['large_parks', 'hospital'] },
  { name: 'Small City', unlocks: ['office_high', 'incinerator'] }, { name: 'Big City', unlocks: ['landmarks'] }, { name: 'Metropolis', unlocks: ['monuments'] }, { name: 'Megalopolis', unlocks: [] },
];

/** Service building kinds (world.services.kinds) → toolbar category, label, cost, milestone unlock key. */
export const SERVICE_KINDS = {
  power_coal: { cat: 'electricity', label: 'Coal Power Plant', cost: 32000, unlock: 'power' },
  power_wind: { cat: 'electricity', label: 'Wind Turbine', cost: 8000, unlock: 'power' },
  power_solar: { cat: 'electricity', label: 'Solar Plant', cost: 24000, unlock: 'power' },
  water_pump: { cat: 'water', label: 'Water Pump Station', cost: 9000, unlock: 'water' },
  sewage: { cat: 'water', label: 'Sewage Outlet', cost: 7000, unlock: 'water' },
  landfill: { cat: 'garbage', label: 'Landfill Site', cost: 11000, unlock: 'garbage' },
  incinerator: { cat: 'garbage', label: 'Incinerator', cost: 38000, unlock: 'incinerator' },
  clinic: { cat: 'health', label: 'Medical Clinic', cost: 12000, unlock: 'healthcare' },
  hospital: { cat: 'health', label: 'Hospital', cost: 45000, unlock: 'hospital' },
  school: { cat: 'education', label: 'Elementary School', cost: 14000, unlock: 'education' },
  high_school: { cat: 'education', label: 'High School', cost: 26000, unlock: 'education' },
  university: { cat: 'education', label: 'University', cost: 60000, unlock: 'university' },
  police: { cat: 'police', label: 'Police Station', cost: 11000, unlock: 'police' },
  fire: { cat: 'fire', label: 'Fire House', cost: 10000, unlock: 'fire' },
  park_small: { cat: 'parks', label: 'Small Park', cost: 3000, unlock: 'parks' },
  park_large: { cat: 'parks', label: 'Large Park', cost: 12000, unlock: 'large_parks' },
  plaza: { cat: 'parks', label: 'Plaza', cost: 8000, unlock: 'plazas' },
};
const SERVICE_CATS = [
  { id: 'electricity', label: 'Electricity', icon: 'electricity', unlock: 'power', hint: [['LMB', 'Place'], ['R', 'Rotate'], ['Esc', 'Close']] },
  { id: 'water', label: 'Water & Sewage', icon: 'water', unlock: 'water' },
  { id: 'garbage', label: 'Garbage', icon: 'garbage', unlock: 'garbage' },
  { id: 'health', label: 'Healthcare', icon: 'health', unlock: 'healthcare' },
  { id: 'education', label: 'Education', icon: 'education', unlock: 'education' },
  { id: 'police', label: 'Police', icon: 'police', unlock: 'police' },
  { id: 'fire', label: 'Fire & Rescue', icon: 'fire', unlock: 'fire' },
  { id: 'parks', label: 'Parks & Recreation', icon: 'parks', unlock: 'parks' },
  { id: 'transit', label: 'Transportation', icon: 'transit', unlock: 'transit' },
];
/** Info views (world.infoview.active names). */
export const INFOVIEWS = [
  { id: 'traffic', label: 'Traffic Flow', icon: 'vehicle', desc: 'Congestion on every road segment.', lo: 'Free flow', hi: 'Gridlock', grad: ['#3fbf5a', '#f2c230', '#e5484d'] },
  { id: 'landvalue', label: 'Land Value', icon: 'money', desc: 'Value of land from services, parks, water and pollution.', lo: 'Low', hi: 'High', grad: ['#3a4b6b', '#4fa3e0', '#ffd76a'] },
  { id: 'pollution', label: 'Pollution', icon: 'smog', desc: 'Ground, air and noise pollution from industry and traffic.', lo: 'Clean', hi: 'Polluted', grad: ['#3fbf5a', '#c9b03a', '#7a4a3a'] },
  { id: 'happiness', label: 'Happiness', icon: 'face', desc: 'How satisfied citizens are with their neighbourhood.', lo: 'Unhappy', hi: 'Happy', grad: ['#e5484d', '#f2c230', '#3fbf5a'] },
  { id: 'education', label: 'Education', icon: 'mortar', desc: 'School coverage and citizen education level.', lo: 'None', hi: 'University', grad: ['#40496b', '#7f7fd8', '#e0c3ff'] },
  { id: 'health', label: 'Health', icon: 'cross', desc: 'Healthcare coverage and citizen health.', lo: 'Poor', hi: 'Excellent', grad: ['#e5484d', '#f2c230', '#5fd76c'] },
  { id: 'fire', label: 'Fire Risk', icon: 'flame', desc: 'Fire hazard and fire station coverage.', lo: 'Safe', hi: 'Hazard', grad: ['#3fbf5a', '#f2a230', '#ff4a2a'] },
  { id: 'crime', label: 'Crime', icon: 'badge', desc: 'Crime rate and police coverage.', lo: 'Safe', hi: 'Crime', grad: ['#3fbf5a', '#f2c230', '#8f2fbf'] },
  { id: 'power', label: 'Electricity', icon: 'bolt', desc: 'Powered buildings and grid coverage.', lo: 'No power', hi: 'Powered', grad: ['#2b3140', '#f7c948', '#fff4b0'] },
  { id: 'water', label: 'Water & Sewage', icon: 'drop', desc: 'Water supply and sewage coverage.', lo: 'No water', hi: 'Supplied', grad: ['#2b3140', '#3b9cf5', '#bfe3ff'] },
  { id: 'garbage', label: 'Garbage', icon: 'garbage', desc: 'Garbage accumulation and collection coverage.', lo: 'Clean', hi: 'Piling up', grad: ['#3fbf5a', '#c9b03a', '#8a5a34'] },
  { id: 'density', label: 'Population Density', icon: 'density', desc: 'Residents per hectare.', lo: 'Low', hi: 'High', grad: ['#2b3140', '#3b9cf5', '#ffffff'] },
];

function buildingName(b) {
  const h = hash2(b.id | 0, 17, 3);
  const a = NAME_A[Math.floor(h * NAME_A.length)];
  const list = NAME_B[b.type] || NAME_B.residential;
  return `${a} ${list[Math.floor(hash2(b.id | 0, 29, 5) * list.length)]}`;
}
const thumb = (svg) => `<div class="sb-thumb">${svg}</div>`;

export class Hud {
  constructor(ctx, { cityName = 'New Dollarton', dev = false } = {}) {
    this.ctx = ctx;
    this.events = ctx.events;
    this.cityName = cityName;
    this.source = { eco: ctx.world.economy, dayOffset: 0, income: 0, popDelta: 0, milestone: null, milestoneName: null, milestoneNext: null, xp: null, unlocked: null };
    this.activeCategory = null; this.activeTab = {}; this.activeCard = {}; this.optionValues = {};
    this.notes = []; this.journal = []; this._noteSeq = 0;
    this.infoview = null; this.transitSel = null; this.transitSource = null; this.leftKind = null; this.sideKind = null; this.photo = false;
    this._lastMin = -1; this._lastDay = -1; this._lastPaused = null; this._lastSpeed = null; this._lastMoney = null; this._lastPop = null; this._lastHappy = -1;
    this._devAcc = 0; this._sideAcc = 0; this._wKind = -1; this._wTemp = null; this._wMonth = -1; this._msKey = '';
    this.categories = this.buildCategories();
    this._build(dev);
    this.menus = new Menus(this);
  }

  // ----------------------------------------------------------------------------------------- categories
  buildCategories() {
    const kinds = Array.isArray(this.ctx.world.services?.kinds) ? this.ctx.world.services.kinds : Object.keys(SERVICE_KINDS);
    const services = SERVICE_CATS.map((c) => ({ ...c, tool: 'service', cards: [] }));
    const byId = Object.fromEntries(services.map((c) => [c.id, c]));
    for (const kind of kinds) {
      const def = SERVICE_KINDS[kind] || { cat: 'parks', label: kind.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), cost: 10000, unlock: null };
      const cat = byId[def.cat] || byId.parks;
      cat.cards.push({ id: kind, label: def.label, cost: def.cost, unlock: def.unlock, icon: () => CARDS.serviceTile(kind), opts: { kind } });
    }
    byId.transit.cards.push(
      { id: 'bus_line', label: 'Bus Line', cost: 2500, icon: () => CARDS.lineTile('#2f8ff5'), opts: { mode: 'line', kind: 'bus' }, tool: 'transit' },
      { id: 'bus_stop', label: 'Bus Stop', cost: 320, icon: () => CARDS.propTile('bus_stop'), opts: { kind: 'bus_stop' }, tool: 'prop' },
    );
    byId.transit.tabs = [{ id: 'lines', label: 'Lines', icon: 'transitLines', open: 'lines' }];
    return [
      { id: 'roads', label: 'Roads', icon: 'roads', tool: 'road', hint: [['LMB', 'Place node'], ['RMB', 'Cancel'], ['U', 'Undo'], ['Esc', 'Close']],
        options: [
          { kind: 'modes', id: 'mode', label: 'Tool Mode', items: [['straight', 'Straight'], ['curve', 'Curved'], ['free', 'Continuous'], ['grid', 'Grid']], value: 'straight' },
          { kind: 'stepper', id: 'elevation', label: 'Elevation', value: 0, step: 5, min: -20, max: 60, unit: ' m' },
          { kind: 'toggles', id: 'snap', label: 'Snapping', items: [['snap', 'Snap to grid'], ['parallel', 'Parallel mode'], ['magnet', 'Snap to roads']], value: ['magnet'] },
        ],
        tabs: [
          { id: 'roads', label: 'Roads', icon: 'roads', cards: [
            { id: 'street', label: 'Two-Lane Street', cost: 240, icon: () => CARDS.roadTile({ lanes: 2 }), opts: { type: 'street' } },
            { id: 'oneway', label: 'One-Way Street', cost: 220, icon: () => CARDS.roadTile({ lanes: 2, oneWay: true }), opts: { type: 'street', oneWay: true } },
            { id: 'avenue', label: 'Four-Lane Avenue', cost: 520, unlock: 'avenues', icon: () => CARDS.roadTile({ lanes: 4, median: true }), opts: { type: 'avenue' } },
            { id: 'highway', label: 'Highway', cost: 1180, unlock: 'highways', icon: () => CARDS.roadTile({ lanes: 6, median: true, sidewalk: false, barrier: true }), opts: { type: 'highway' } },
            { id: 'alley', label: 'Alley', cost: 120, icon: () => CARDS.roadTile({ lanes: 1 }), opts: { type: 'alley' } },
            { id: 'gravel', label: 'Gravel Road', cost: 80, icon: () => CARDS.roadTile({ lanes: 2, gravel: true, sidewalk: false }), opts: { type: 'gravel' } },
          ] },
          { id: 'intersections', label: 'Intersections', icon: 'plus', cards: [
            { id: 'crossing', label: 'Crosswalk', cost: 60, icon: () => CARDS.junctionTile('cross'), opts: { junction: 'crossing' } },
            { id: 'lights', label: 'Traffic Lights', cost: 900, icon: () => CARDS.junctionTile('lights'), opts: { junction: 'lights' } },
            { id: 'roundabout', label: 'Roundabout', cost: 1600, unlock: 'avenues', icon: () => CARDS.junctionTile('roundabout'), opts: { junction: 'roundabout' } },
          ] },
        ] },
      { id: 'zoning', label: 'Zoning', icon: 'zoning', tool: 'zone', hint: [['LMB', 'Paint'], ['RMB', 'Erase'], ['Esc', 'Close']],
        options: [
          { kind: 'modes', id: 'brush', label: 'Brush', items: [['fill', 'Fill block'], ['paint', 'Paint'], ['marquee', 'Marquee']], value: 'paint' },
          { kind: 'stepper', id: 'size', label: 'Brush size', value: 24, step: 8, min: 8, max: 96, unit: ' m' },
        ],
        cards: [
          { id: 'residential_low', label: 'Low Residential', icon: () => CARDS.zoneTile(ZONE_COL.residential, 'low'), opts: { type: 'residential', density: 'low' } },
          { id: 'residential_high', label: 'High Residential', unlock: 'high_density', icon: () => CARDS.zoneTile(ZONE_COL.residential, 'high'), opts: { type: 'residential', density: 'high' } },
          { id: 'commercial_low', label: 'Low Commercial', icon: () => CARDS.zoneTile(ZONE_COL.commercial, 'low'), opts: { type: 'commercial', density: 'low' } },
          { id: 'commercial_high', label: 'High Commercial', unlock: 'high_density', icon: () => CARDS.zoneTile(ZONE_COL.commercial, 'high'), opts: { type: 'commercial', density: 'high' } },
          { id: 'industrial_low', label: 'Industrial', icon: () => CARDS.zoneTile(ZONE_COL.industrial, 'low'), opts: { type: 'industrial', density: 'low' } },
          { id: 'office_high', label: 'Office', unlock: 'office_high', icon: () => CARDS.zoneTile(ZONE_COL.office, 'high'), opts: { type: 'office', density: 'high' } },
        ] },
      { id: 'terrain', label: 'Landscaping', icon: 'terrain', tool: 'terrain', hint: [['LMB', 'Apply brush'], ['Wheel', 'Brush size'], ['Esc', 'Close']],
        options: [
          { kind: 'stepper', id: 'size', label: 'Brush size', value: 40, step: 10, min: 10, max: 200, unit: ' m' },
          { kind: 'stepper', id: 'strength', label: 'Strength', value: 50, step: 10, min: 10, max: 100, unit: ' %' },
        ],
        cards: ['raise', 'lower', 'flatten', 'smooth'].map((m) => ({ id: m, label: { raise: 'Raise', lower: 'Lower', flatten: 'Level', smooth: 'Smooth' }[m], icon: () => CARDS.terrainTile(m), opts: { mode: m } })) },
      { id: 'props', label: 'Props & Trees', icon: 'props', tool: 'prop', hint: [['LMB', 'Place'], ['R', 'Rotate'], ['Esc', 'Close']],
        options: [
          { kind: 'modes', id: 'mode', label: 'Placement', items: [['single', 'Single'], ['line', 'Line'], ['brush', 'Brush']], value: 'single' },
          { kind: 'stepper', id: 'spacing', label: 'Spacing', value: 12, step: 2, min: 2, max: 40, unit: ' m' },
        ],
        cards: [['tree_oak', 'Oak', 60], ['tree_pine', 'Pine', 60], ['bush', 'Bush', 25], ['streetlamp', 'Street Lamp', 180], ['trafficlight', 'Traffic Light', 700], ['bench', 'Bench', 90], ['bin', 'Waste Bin', 40], ['sign', 'Road Sign', 50], ['bus_stop', 'Bus Stop', 320], ['hydrant', 'Hydrant', 70], ['fence', 'Fence', 30], ['planter', 'Planter', 55]]
          .map(([k, l, c]) => ({ id: k, label: l, cost: c, icon: () => CARDS.propTile(k), opts: { kind: k } })) },
      { id: 'bulldoze', label: 'Bulldoze', icon: 'bulldoze', tool: 'bulldoze', hint: [['LMB', 'Demolish'], ['Drag', 'Area demolish'], ['Esc', 'Close']],
        options: [{ kind: 'modes', id: 'mode', label: 'Mode', items: [['single', 'Single'], ['marquee', 'Marquee']], value: 'single' }],
        cards: [{ id: 'bulldoze', label: 'Demolish', icon: () => CARDS.bulldozeTile(), opts: {} }] },
      { sep: true },
      ...services,
      { sep: true },
      { id: 'info', label: 'Info Views', icon: 'info', tool: 'infoview', hint: [['LMB', 'Select view'], ['Esc', 'Close']],
        cards: [{ id: 'none', label: 'Default View', icon: () => CARDS.infoTile('none'), opts: { view: null } }, ...INFOVIEWS.map((v) => ({ id: v.id, label: v.label, icon: () => CARDS.infoTile(v.id), opts: { view: v.id } }))] },
    ];
  }
  /** Set of milestone unlock keys, or null when everything is available (no simulation, no showcase data). */
  unlockedSet() {
    const m = this.ctx.world.economy?.milestone;
    if (m && Array.isArray(m.unlocked)) return new Set(m.unlocked);
    if (Array.isArray(this.source.unlocked)) return new Set(this.source.unlocked);
    return null;
  }
  isUnlocked(key, set = this._unlocked) { return !key || !set || set.has(key); }
  unlockLabel(key) {
    const list = this.ctx.modules?.simulation?.milestones || MILESTONES;
    const m = list.find((x) => x.unlocks?.includes(key));
    return m ? `Unlocks at ${m.name}` : 'Locked';
  }
  cardsOf(cat) { return cat.tabs ? cat.tabs.find((t) => t.id === (this.activeTab[cat.id] || cat.tabs[0].id))?.cards || cat.tabs[0].cards : cat.cards; }

  // ----------------------------------------------------------------------------------------- build
  _build(dev) {
    const host = document.getElementById('ui') || document.body;
    this.style = el('style'); this.style.textContent = CSS; document.head.appendChild(this.style);
    const root = this.root = el('div', 'sb-root');
    host.appendChild(root);

    // dev corner (hidden unless ?dev=1 or backtick)
    const devBox = this.devBox = el('div', 'sb-dev sb-pe' + (dev ? '' : ' sb-hidden'));
    this.statsEl = el('div', 'sb-stats', '<b>—</b> fps  <b>—</b> ms  draws <b>0</b>  tris <b>0</b>  tex <span>0</span>');
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

    // top left: minimap + infoview legend
    const tl = el('div', 'sb-topleft');
    this.minimap = new Minimap(this, this.ctx);
    this.legendEl = el('div', 'sb-legend sb-glass sb-pe sb-hidden');
    tl.append(this.minimap.el, this.legendEl);
    root.appendChild(tl);
    root.classList.add('has-minimap');

    // top right: round buttons + notifications + side panels (statistics / journal)
    const tr = el('div', 'sb-topright');
    const topBtns = el('div', 'sb-topbtns sb-pe');
    const bHelp = btn('sb-round sb-tip-below', ICONS.help(), 'Help'); bHelp.addEventListener('click', () => { this.action('help'); this.notify({ type: 'info', title: 'Controls', body: 'Right-drag to orbit, middle-drag or WASD to pan, wheel to zoom. Space pauses, 1–3 set speed, P photo mode, Esc menu.', ttl: 9 }); });
    const bGear = btn('sb-round sb-tip-below', ICONS.gear(), 'Settings'); bGear.addEventListener('click', () => { this.action('options'); this.menus.open('settings'); });
    topBtns.append(bHelp, bGear);
    this.notesEl = el('div', 'sb-notes sb-pe');
    this.sideEl = el('div', 'sb-side sb-glass sb-pe sb-hidden');
    tr.append(topBtns, this.notesEl, this.sideEl);
    root.appendChild(tr);

    // left column: info panel / transit lines (mutually exclusive)
    this.infoEl = el('div', 'sb-info sb-glass sb-pe sb-hidden');
    this.linesEl = el('div', 'sb-lines sb-glass sb-pe sb-hidden');
    root.append(this.infoEl, this.linesEl);

    // tool hint + sub panel
    this.hintEl = el('div', 'sb-hint sb-hidden');
    this.subEl = el('div', 'sb-subpanel sb-glass sb-pe sb-hidden');
    root.append(this.hintEl, this.subEl);

    // dock
    const dock = el('div', 'sb-dock sb-pe');
    dock.append(this._buildToolbar(), this._buildStatus());
    root.appendChild(dock);

    this._onKey = (e) => this._key(e);
    window.addEventListener('keydown', this._onKey);
    this._unlocked = this.unlockedSet();
    this._syncLocks();
    this.refreshDemand();
    this._refreshMilestone();
  }
  _key(e) {
    const tgt = e.target && typeof e.target.closest === 'function' ? e.target : document.body;
    if (tgt.closest('input,select,textarea')) return;
    if (e.code === 'Escape') {
      if (this.menus.isOpen()) this.menus.close();
      else if (this.photo) this.setPhotoMode(false);
      else if (this.activeCategory) this.setCategory(null, true);
      else if (this.leftKind) this.hideLeft(true);
      else if (this.sideKind) this.hideSide();
      else this.menus.open('pause');
      e.preventDefault();
    } else if (this.menus.isOpen()) return;
    else if (e.code === 'Space' && !tgt.closest('button')) { this._togglePause(); e.preventDefault(); }
    else if (e.code === 'KeyP' && !e.ctrlKey && !e.metaKey) this.setPhotoMode(!this.photo);
    else if (e.code === 'Backquote') this.devBox.classList.toggle('sb-hidden');
    else if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') this.setSpeed([1, 2, 4][+e.code.slice(5) - 1]);
    else if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) this.minimap.toggle();
  }

  _buildToolbar() {
    const bar = el('div', 'sb-toolbar');
    const left = el('div', 'sb-toolbar-left');
    const ms = btn('sb-milestone', '', 'City progress');
    const badge = el('div', 'sb-badge', `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#1d2a3a" stroke="#2a3b4f" stroke-width="3"/><circle class="sb-ring" cx="18" cy="18" r="16" fill="none" stroke="#ffd76a" stroke-width="3" stroke-dasharray="100.5" stroke-dashoffset="60" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg><span class="sb-badge-num">1</span>`);
    this.badgeNum = badge.querySelector('.sb-badge-num'); this.badgeRing = badge.querySelector('.sb-ring');
    const mt = el('div', 'sb-milestone-text');
    this.msName = el('div', 'sb-t1', 'Hamlet');
    this.msSub = el('div', 'sb-t2', 'Next: Tiny Village');
    this.xpEl = el('div', 'sb-xp', '<i></i>');
    mt.append(this.msName, this.msSub, this.xpEl);
    ms.append(badge, mt);
    ms.addEventListener('click', () => { this.action('milestones'); this.showSide('milestones'); });
    const rci = el('div', 'sb-rci');
    rci.setAttribute('data-tip', 'Zone demand: Residential · Commercial · Industrial · Office');
    this.rciBars = {};
    for (const [k, l] of [['residential', 'R'], ['commercial', 'C'], ['industrial', 'I'], ['office', 'O']]) {
      rci.appendChild(el('div', 'sb-rci-l', l));
      const b = el('div', 'sb-rci-b ' + l.toLowerCase(), '<i></i>');
      this.rciBars[k] = b.firstChild; rci.appendChild(b);
    }
    left.append(ms, rci);

    const tools = this.toolsEl = el('div', 'sb-tools');
    this.toolBtns = {};
    for (const c of this.categories) {
      if (c.sep) { tools.appendChild(el('div', 'sb-sep')); continue; }
      const b = btn('sb-tool', ICONS[c.icon]() + '<span class="sb-lockbadge sb-hidden">' + ICONS.lockBadge() + '</span>', c.label);
      b.addEventListener('click', () => this.setCategory(this.activeCategory === c.id ? null : c.id, true));
      this.toolBtns[c.id] = b; tools.appendChild(b);
    }

    const right = el('div', 'sb-toolbar-right');
    this.rightBtns = {};
    for (const [id, icon, tip, fn] of [
      ['lines', 'transitLines', 'Transit lines', () => { this.action('transitLines'); this.leftKind === 'lines' ? this.hideLeft(true) : this.showLines(); }],
      ['stats', 'stats', 'Statistics', () => { this.action('statistics'); this.sideKind === 'stats' ? this.hideSide() : this.showSide('stats'); }],
      ['journal', 'journal', 'Journal', () => { this.action('journal'); this.sideKind === 'journal' ? this.hideSide() : this.showSide('journal'); }],
      ['map', 'map', 'Minimap (M)', () => { this.action('minimap'); this.minimap.toggle(); }],
      ['photo', 'camera', 'Photo mode (P)', () => this.setPhotoMode(true)],
    ]) { const b = btn('sb-round', ICONS[icon](), tip); b.addEventListener('click', fn); this.rightBtns[id] = b; right.appendChild(b); }
    bar.append(left, tools, right);
    return bar;
  }
  _syncLocks() {
    const set = this._unlocked;
    for (const c of this.categories) {
      if (c.sep) continue;
      const b = this.toolBtns[c.id], locked = !this.isUnlocked(c.unlock, set);
      b.classList.toggle('is-locked', locked);
      b.querySelector('.sb-lockbadge').classList.toggle('sb-hidden', !locked);
      b.setAttribute('data-tip', locked ? `${c.label} · ${this.unlockLabel(c.unlock)}` : c.label);
    }
    for (const [id, on] of [['lines', this.isUnlocked('transit', set)]]) this.rightBtns[id].classList.toggle('is-locked', !on);
    if (this.activeCategory) this._renderSubpanel(this.categories.find((c) => c.id === this.activeCategory));
  }

  _buildStatus() {
    const s = el('div', 'sb-status');
    const clock = el('div', 'sb-chip sb-clock');
    this.playBtn = btn('sb-ctl', ICONS.pause(), 'Pause / resume (Space)');
    this.playBtn.addEventListener('click', () => this._togglePause());
    this.timeEl = el('span', 'sb-time sb-num', '00:00');
    this.dateEl = el('span', 'sb-date sb-num', '—');
    const speed = el('div', 'sb-speed');
    this.speedBtns = [];
    [[1, 1], [2, 2], [4, 3]].forEach(([sp, n]) => {
      const b = btn('sb-ctl', ICONS.chevrons(n), `Speed ${sp}× (${n})`);
      b.addEventListener('click', () => this.setSpeed(sp));
      this.speedBtns.push([sp, b]); speed.appendChild(b);
    });
    clock.append(this.playBtn, this.timeEl, this.dateEl, speed);
    const weather = btn('sb-chip sb-chip-btn', '', 'Weather & season');
    this.weatherIcon = el('span', '', ICONS.sun());
    this.tempEl = el('span', 'sb-v sb-num', '18°C');
    this.seasonEl = el('span', 'sb-k', 'Spring');
    weather.append(this.weatherIcon, this.tempEl, this.seasonEl);
    weather.addEventListener('click', () => this.action('weather'));
    const city = btn('sb-chip sb-chip-btn sb-cityname', esc(this.cityName), 'City info');
    city.addEventListener('click', () => { this.action('cityinfo'); this.showSide('stats'); });
    this.cityEl = city;
    const pop = btn('sb-chip sb-chip-btn', '', 'Population');
    this.popEl = el('span', 'sb-v sb-num', '0');
    this.popTrend = el('span', 'sb-trend up sb-num', ICONS.trendUp() + '<span>0</span>');
    pop.append(el('span', '', ICONS.people()), this.popEl, this.popTrend);
    pop.addEventListener('click', () => { this.action('population'); this.showSide('stats'); });
    const hap = btn('sb-chip sb-chip-btn', '', 'Happiness');
    this.faceEl = el('span', 'sb-face', ICONS.face(0.8));
    this.hapEl = el('span', 'sb-v sb-num', '—');
    hap.append(this.faceEl, this.hapEl);
    hap.addEventListener('click', () => { this.action('happiness'); this.setInfoview('happiness'); });
    const money = btn('sb-chip sb-chip-btn sb-money', '', 'Budget');
    this.moneyEl = el('span', 'sb-v sb-num', '¢0');
    this.moneyTrend = el('span', 'sb-trend up sb-num', ICONS.trendUp() + '<span>¢0</span>');
    money.append(el('span', '', ICONS.money()), this.moneyEl, this.moneyTrend);
    money.addEventListener('click', () => { this.action('budget'); this.showSide('stats'); });
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
    const cat = this.categories.find((c) => c.id === id);
    if (cat && !this.isUnlocked(cat.unlock)) {
      this.notify({ type: 'warning', title: `${cat.label} locked`, body: `${this.unlockLabel(cat.unlock)}. Grow the city to unlock this category.`, ttl: 5 });
      this.action('lockedCategory', id);
      return;
    }
    this.activeCategory = id;
    for (const [k, b] of Object.entries(this.toolBtns)) b.classList.toggle('is-active', k === id);
    if (!cat) {
      this.subEl.classList.add('sb-hidden'); this.hintEl.classList.add('sb-hidden');
      if (fromUser) { this.action('category', null); this._toolsSelect(null); }
      return;
    }
    this._renderSubpanel(cat);
    if (fromUser) {
      this.action('category', id);
      const cards = this.cardsOf(cat);
      const cardId = this.activeCard[id] || cards[0]?.id;
      const card = cards.find((c) => c.id === cardId);
      if (card && this.isUnlocked(card.unlock)) this._selectTool(cat, card);
    }
  }
  _selectTool(cat, card) {
    if (cat.id === 'info') { this.setInfoview(card.opts.view); return; }
    this._toolsSelect(card.tool || cat.tool, { ...(card.opts || {}), ...this._options(cat) });
  }
  selectCard(catId, cardId, fromUser = false) {
    const cat = this.categories.find((c) => c.id === catId);
    if (!cat) return;
    this.activeCard[catId] = cardId;
    if (this.activeCategory === catId && this.cardEls) for (const [k, e] of Object.entries(this.cardEls)) e.classList.toggle('is-active', k === cardId);
    if (fromUser) {
      const card = this.cardsOf(cat).find((c) => c.id === cardId);
      this.action('selectAsset', catId, cardId);
      if (card && !this.isUnlocked(card.unlock)) this.notify({ type: 'warning', title: 'Not yet unlocked', body: `${card.label}: ${this.unlockLabel(card.unlock)}.`, ttl: 5 });
      else if (card) this._selectTool(cat, card);
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
    head.appendChild(el('div', 'sb-title', ICONS[cat.icon]() + `<span>${esc(cat.label)}</span>`));
    if (cat.tabs) {
      const cur = this.activeTab[cat.id] || cat.tabs[0].id;
      for (const t of cat.tabs) {
        const b = btn('sb-tab' + (t.id === cur && !t.open ? ' is-active' : ''), (ICONS[t.icon] ? ICONS[t.icon]() : '') + `<span>${esc(t.label)}</span>`);
        b.addEventListener('click', () => {
          this.action('tab', cat.id, t.id);
          if (t.open === 'lines') { this.showLines(); return; }
          this.activeTab[cat.id] = t.id; this._renderSubpanel(cat);
        });
        head.appendChild(b);
      }
    }
    const close = btn('sb-close', ICONS.close()); close.addEventListener('click', () => this.setCategory(null, true));
    head.appendChild(close);
    const body = el('div', 'sb-subpanel-body');
    if (cat.options?.length) body.appendChild(this._renderOptions(cat));
    const cards = el('div', 'sb-cards');
    this.cardEls = {};
    const list = this.cardsOf(cat);
    const active = cat.id === 'info' ? (this.infoview || 'none') : (this.activeCard[cat.id] || list[0]?.id);
    this.activeCard[cat.id] = active;
    for (const c of list) {
      const locked = !this.isUnlocked(c.unlock);
      const b = btn('sb-card' + (c.id === active ? ' is-active' : '') + (locked ? ' is-locked' : ''), thumb(c.icon()) + `<div class="sb-cn">${esc(c.label)}</div>` + (c.cost ? `<div class="sb-cc">¢${fmtInt.format(c.cost)}</div>` : ''), locked ? this.unlockLabel(c.unlock) : (c.label.length > 15 ? c.label : undefined));
      b.addEventListener('click', () => this.selectCard(cat.id, c.id, true));
      this.cardEls[c.id] = b; cards.appendChild(b);
    }
    body.appendChild(cards);
    sub.append(head, body);
    sub.classList.remove('sb-hidden');
    if (cat.hint) {
      this.hintEl.innerHTML = cat.hint.map(([k, v]) => `<span><span class="sb-key">${k}</span>${v}</span>`).join('');
      this.hintEl.classList.remove('sb-hidden');
      const r = sub.getBoundingClientRect(), rr = this.root.getBoundingClientRect();
      this.hintEl.style.left = (r.left - rr.left + r.width / 2) + 'px';
      this.hintEl.style.bottom = (rr.bottom - r.top + 10) + 'px';
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
    if (!tool) { if (this.activeCategory) this.setCategory(null); return; }
    const t = String(tool).toLowerCase();
    const o = options || {};
    let cat = /road/.test(t) ? 'roads' : /zone/.test(t) ? 'zoning' : /terrain|sculpt|landscap/.test(t) ? 'terrain' : /bulldoz|demolish/.test(t) ? 'bulldoze' : /transit|line/.test(t) ? 'transit' : /prop|tree|lamp/.test(t) ? 'props' : /info|view/.test(t) ? 'info' : null;
    if (/service/.test(t)) cat = SERVICE_KINDS[o.kind]?.cat || 'electricity';
    if (!cat) return;
    if (this.activeCategory !== cat) this.setCategory(cat);
    const def = this.categories.find((c) => c.id === cat);
    if (!def) return;
    const card = this.cardsOf(def).find((c) => Object.keys(c.opts || {}).length && Object.entries(c.opts).every(([k, v]) => o[k] === v));
    if (card) this.selectCard(cat, card.id);
  }

  // ----------------------------------------------------------------------------------------- data
  setSource(src) { Object.assign(this.source, src); this._lastMoney = this._lastPop = null; this._lastHappy = -1; this._lastMin = -1; this._lastDay = -1; this._unlocked = this.unlockedSet(); this._syncLocks(); this.refreshDemand(); this._refreshMilestone(); }
  _milestoneInfo() {
    const list = this.ctx.modules?.simulation?.milestones || MILESTONES;
    const m = this.ctx.world.economy?.milestone;
    if (m && typeof m.level === 'number') return { level: m.level, name: m.name || list[m.level]?.name || '—', next: m.next || list[m.level + 1]?.name || null, xp: clamp01(m.progress ?? 0) };
    const s = this.source;
    if (s.milestoneName) return { level: s.milestone ?? 0, name: s.milestoneName, next: s.milestoneNext, xp: clamp01(s.xp ?? 0) };
    return { level: 0, name: list[0].name, next: list[1].name, xp: 0 };
  }
  _refreshMilestone() {
    const m = this._milestoneInfo();
    const key = `${m.level}|${m.name}|${m.next}|${m.xp.toFixed(2)}`;
    if (key === this._msKey) return;
    this._msKey = key;
    this.badgeNum.textContent = String(m.level);
    this.badgeRing.setAttribute('stroke-dashoffset', (100.5 * (1 - m.xp)).toFixed(1));
    this.msName.textContent = m.name;
    this.msSub.textContent = m.next ? `Next: ${m.next}` : 'Max milestone reached';
    this.xpEl.firstChild.style.width = (m.xp * 100).toFixed(0) + '%';
  }
  /** sim:milestone {level, name, unlocks, reward, population} */
  onMilestone(p = {}) {
    this._unlocked = this.unlockedSet();
    if (this._unlocked && Array.isArray(p.unlocks)) for (const u of p.unlocks) this._unlocked.add(u);
    this._syncLocks(); this._msKey = ''; this._refreshMilestone();
    const names = (p.unlocks || []).map((u) => SERVICE_CATS.find((c) => c.unlock === u)?.label || Object.values(SERVICE_KINDS).find((k) => k.unlock === u)?.label || u.replace(/_/g, ' ')).join(', ');
    this.toast({ title: p.name || 'Milestone', kicker: `Milestone ${p.level ?? ''} reached`, body: (names ? `Unlocked: ${names}` : 'New possibilities await') + (p.reward ? ` · <b>+¢${fmtInt.format(p.reward)}</b>` : '') });
    this.notify({ type: 'success', title: `Milestone: ${p.name || ''}`, body: names ? `New services unlocked: ${names}.` : 'Your city keeps growing.', ttl: 10 });
  }
  toast({ title, kicker = 'Milestone reached', body = '', sticky = false }) {
    this.toastEl?.remove();
    const t = this.toastEl = el('div', 'sb-toast sb-glass' + (sticky ? ' is-sticky' : ''), `<div class="sb-tic">${ICONS.trophy()}</div><div class="sb-tt"><div class="sb-t0">${esc(kicker)}</div><div class="sb-t1">${esc(title)}</div><div class="sb-t2">${body}</div></div>`);
    this.root.appendChild(t);
    if (!sticky) t.addEventListener('animationend', () => { if (this.toastEl === t) this.toastEl = null; t.remove(); });
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
  dateString() { const c = this.ctx.clock; const m = this._month(), y = 2031 + Math.floor((c.day - 1 + (this.source.dayOffset | 0)) / 12); return `${MONTHS[m]} ${y}`; }

  // ----------------------------------------------------------------------------------------- per frame
  update(dt) {
    const c = this.ctx.clock;
    const mins = Math.floor(c.hour * 60);
    if (mins !== this._lastMin) {
      this._lastMin = mins;
      this.timeEl.textContent = `${pad2(Math.floor(mins / 60) % 24)}:${pad2(mins % 60)}`;
    }
    if (c.day !== this._lastDay) { this._lastDay = c.day; this.dateEl.textContent = this.dateString(); this._wMonth = -1; }
    this._syncSpeed();
    this._refreshWeather();
    this._refreshMilestone();
    const eco = this.source.eco;
    if (eco) {
      const money = Math.round(eco.money), pop = Math.round(eco.population);
      if (money !== this._lastMoney) {
        this._lastMoney = money; this.moneyEl.textContent = '¢' + fmtInt.format(money);
        const inc = Math.round(this.source.income || eco.income || 0);
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
      if (hap !== this._lastHappy) { this._lastHappy = hap; this.hapEl.textContent = hap + '%'; this.faceEl.innerHTML = ICONS.face(hap / 100); }
    }
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      if (n.ttl > 0) { n.ttl -= dt; if (n.ttl <= 0) this._dismiss(n); }
    }
    this.minimap.update(dt);
    if (this.sideKind === 'stats') { this._sideAcc += dt; if (this._sideAcc > 2) { this._sideAcc = 0; this._drawSparks(); } }
    if (!this.devBox.classList.contains('sb-hidden')) {
      this._devAcc += dt;
      if (this._devAcc >= 0.25) {
        this._devAcc = 0;
        const s = this.ctx.engine.stats, sp = this.statsSpans, last = this._statsLast;
        const now = performance.now();   // wall-clock fps (profiling only): engine.stats.fps derives from dt clamped at 0.1 s
        const frames = this._devT ? s.frames - this._devF : 0;
        const fps = this._devT && frames > 0 ? Math.round((frames * 1000) / Math.max(1, now - this._devT)) : null;
        this._devT = now; this._devF = s.frames;
        const ms = Math.round(s.frameMs * 10), tris = s.triangles;
        if (fps !== last[0]) { last[0] = fps; sp[0].textContent = fps === null ? '—' : String(fps); }
        if (ms !== last[1]) { last[1] = ms; sp[1].textContent = ms ? (ms / 10).toFixed(1) : '—'; }
        if (s.drawCalls !== last[2]) { last[2] = s.drawCalls; sp[2].textContent = String(s.drawCalls); }
        if (tris !== last[3]) { last[3] = tris; sp[3].textContent = tris >= 1e6 ? (tris / 1e6).toFixed(2) + 'M' : tris >= 1e3 ? (tris / 1e3).toFixed(1) + 'k' : String(tris); }
        if (s.textures !== last[4]) { last[4] = s.textures; sp[4].textContent = String(s.textures); }
      }
    }
  }

  // ----------------------------------------------------------------------------------------- notifications + journal
  /** notify({type:'info'|'success'|'warning'|'error'|'money'|'building', title, body, ttl}) → id. ttl<=0 → persistent. */
  notify({ type = 'info', title = '', body = '', ttl = 8, when } = {}) {
    const colour = { info: PALETTE.blue, success: PALETTE.green, warning: PALETTE.yellow, error: PALETTE.red, money: PALETTE.green, building: PALETTE.blueL }[type] || PALETTE.blue;
    const icon = { info: 'noteInfo', success: 'noteOk', warning: 'noteWarn', error: 'noteErr', money: 'noteMoney', building: 'noteBuilding' }[type] || 'noteInfo';
    const c = this.ctx.clock;
    const stamp = when || `${pad2(Math.floor(c.hour))}:${pad2(Math.floor((c.hour % 1) * 60))}`;
    const e = el('div', 'sb-note sb-glass');
    e.style.setProperty('--nc', colour);
    e.innerHTML = `<div class="sb-nic">${ICONS[icon]()}</div><div class="sb-nt"><div class="sb-n1"><span>${esc(title)}</span><span class="sb-when sb-num">${esc(stamp)}</span></div><div class="sb-n2">${esc(body)}</div></div>`;
    const n = { id: ++this._noteSeq, el: e, ttl, type, title, body, stamp, colour, day: c.day };
    e.addEventListener('click', () => { this.action('dismissNotification', n.id); this._dismiss(n); });
    this.notes.push(n);
    this.journal.push(n); while (this.journal.length > 40) this.journal.shift();
    this.notesEl.appendChild(e);
    while (this.notes.length > 5) this._dismiss(this.notes[0]);
    if (this.sideKind === 'journal') this._renderJournal();
    return n.id;
  }
  _dismiss(n) {
    const i = this.notes.indexOf(n);
    if (i >= 0) this.notes.splice(i, 1);
    n.el.classList.add('is-leaving');
    setTimeout(() => n.el.remove(), 220);
  }
  clearNotifications() { for (const n of this.notes.slice()) this._dismiss(n); }

  // ----------------------------------------------------------------------------------------- side panels (right column)
  _sideFrame(icon, title, sub) {
    const p = this.sideEl; p.innerHTML = '';
    const head = el('div', 'sb-info-head', `<div class="sb-ic">${icon}</div><div class="sb-ht"><div class="sb-h1">${esc(title)}</div><div class="sb-h2"><span>${esc(sub)}</span></div></div>`);
    const close = btn('sb-close', ICONS.close()); close.addEventListener('click', () => this.hideSide());
    head.appendChild(close);
    const body = el('div', 'sb-info-body');
    p.append(head, body); p.classList.remove('sb-hidden');
    return body;
  }
  hideSide() { this.sideKind = null; this.sideEl.classList.add('sb-hidden'); this.sideEl.innerHTML = ''; this.root.classList.remove('has-side'); for (const k of ['stats', 'journal']) this.rightBtns[k].classList.remove('is-active'); }
  showSide(kind) {
    this.sideKind = kind; this.root.classList.add('has-side');
    for (const k of ['stats', 'journal']) this.rightBtns[k].classList.toggle('is-active', k === kind);
    if (kind === 'stats') this._renderStats();
    else if (kind === 'journal') this._renderJournal();
    else if (kind === 'milestones') this._renderMilestones();
  }
  _renderStats() {
    const eco = this.source.eco || {};
    const body = this._sideFrame(ICONS.stats(), 'Statistics', `${esc(this.cityName)} · ${this.dateString()}`);
    const g = el('div', 'sb-rows');
    const rows = [['Population', fmtInt.format(Math.round(eco.population || 0))], ['Jobs', fmtInt.format(Math.round(eco.jobs || 0))], ['Happiness', `${Math.round(clamp01(eco.happiness) * 100)}%`], ['Treasury', `¢${fmtInt.format(Math.round(eco.money || 0))}`], ['Monthly balance', `${(this.source.income || 0) >= 0 ? '+' : '−'}¢${fmtInt.format(Math.abs(Math.round(this.source.income || 0)))}`, (this.source.income || 0) >= 0 ? 'good' : 'bad'], ['Tax rate', `${Math.round((eco.taxRate ?? 0.1) * 100)}%`]];
    for (const [k, v, cls] of rows) { g.appendChild(el('span', 'sb-k', k)); g.appendChild(el('span', 'sb-v sb-num' + (cls ? ' ' + cls : ''), v)); }
    body.appendChild(el('div', 'sb-section', 'Overview')); body.appendChild(g);
    body.appendChild(el('div', 'sb-section', 'Trends'));
    const sp = el('div', 'sb-spark');
    this.sparks = [];
    for (const [k, key, col, fmt] of [['Money', 'money', '#7ee089', (v) => '¢' + fmtInt.format(Math.round(v))], ['Population', 'population', '#7cc3ff', (v) => fmtInt.format(Math.round(v))], ['Jobs', 'jobs', '#ffd76a', (v) => fmtInt.format(Math.round(v))]]) {
      const r = el('div', 'sb-spark-row'); const cv = el('canvas'); cv.width = 380; cv.height = 68;
      const v = el('span', 'sb-v sb-num', '—');
      r.append(el('span', 'sb-k', k), cv, v); sp.appendChild(r);
      this.sparks.push({ key, cv, v, col, fmt });
    }
    body.appendChild(sp);
    const tax = el('div', 'sb-barrow'); tax.innerHTML = `<span class="sb-k">Tax rate</span>`;
    const st = el('div', 'sb-stepper'); const val = el('span', 'sb-val sb-num', `${Math.round((eco.taxRate ?? 0.1) * 100)} %`);
    const dn = btn('sb-tm', ICONS.chevronDown()), up = btn('sb-tm', ICONS.chevronUp());
    const setTax = (d) => { const t = Math.max(0.01, Math.min(0.3, (eco.taxRate ?? 0.1) + d)); this.action('setTaxRate', +t.toFixed(2)); val.textContent = `${Math.round(t * 100)} %`; };
    dn.addEventListener('click', () => setTax(-0.01)); up.addEventListener('click', () => setTax(0.01));
    st.append(dn, val, up); tax.append(st, el('span', 'sb-v', '')); body.appendChild(el('div', 'sb-section', 'Budget')); body.appendChild(tax);
    const loan = btn('sb-action small', ICONS.money() + '<span>Take loan ¢50,000</span>'); loan.addEventListener('click', () => { this.action('takeLoan', 50000, 30); this.notify({ type: 'money', title: 'Loan requested', body: '¢50,000 over 30 days.', ttl: 5 }); });
    body.appendChild(loan);
    this._drawSparks();
  }
  _drawSparks() {
    if (!this.sparks) return;
    const hist = this.source.history || this.source.eco?.history || [];
    for (const s of this.sparks) {
      const g = s.cv.getContext('2d'); const w = s.cv.width, h = s.cv.height;
      g.clearRect(0, 0, w, h);
      const data = hist.length > 1 ? hist.map((x) => +x[s.key] || 0) : null;
      const cur = data ? data[data.length - 1] : (this.source.eco?.[s.key] || 0);
      s.v.textContent = s.fmt(cur);
      if (!data) { g.fillStyle = 'rgba(255,255,255,.25)'; g.font = '13px sans-serif'; g.fillText('no history yet', 10, h / 2 + 5); continue; }
      let lo = Math.min(...data), hi = Math.max(...data); if (hi - lo < 1e-6) { hi = lo + 1; }
      g.beginPath();
      data.forEach((v, i) => { const x = (i / (data.length - 1)) * (w - 8) + 4, y = h - 6 - ((v - lo) / (hi - lo)) * (h - 14); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.strokeStyle = s.col; g.lineWidth = 2.5; g.lineJoin = 'round'; g.stroke();
      g.lineTo(w - 4, h); g.lineTo(4, h); g.closePath(); g.fillStyle = s.col + '33'; g.fill();
    }
  }
  _renderJournal() {
    const body = this._sideFrame(ICONS.journal(), 'Journal', `${this.journal.length} entries`);
    const list = el('div', 'sb-journal');
    if (!this.journal.length) list.appendChild(el('div', 'sb-empty', 'Nothing has happened yet.'));
    for (const n of this.journal.slice().reverse()) {
      const r = el('div', 'sb-jrow', `<i></i><div><div class="sb-jt">${esc(n.title)}</div><div class="sb-jb">${esc(n.body)}</div></div><span class="sb-when sb-num">${esc(n.stamp)}</span>`);
      r.style.setProperty('--nc', n.colour); list.appendChild(r);
    }
    body.appendChild(list);
  }
  _renderMilestones() {
    const m = this._milestoneInfo();
    const list = this.ctx.modules?.simulation?.milestones || MILESTONES;
    const body = this._sideFrame(ICONS.trophy(), 'Milestones', `Level ${m.level} · ${m.name}`);
    const g = el('div', 'sb-rows');
    list.forEach((ms, i) => {
      const done = i <= m.level;
      g.appendChild(el('span', 'sb-k', `${done ? '✓ ' : ''}${esc(ms.name)}${ms.pop ? ` · ${fmtInt.format(ms.pop)}` : ''}`));
      g.appendChild(el('span', 'sb-v' + (done ? ' good' : ''), esc((ms.unlocks || []).map((u) => u.replace(/_/g, ' ')).join(', ') || '—')));
    });
    body.appendChild(g);
  }

  // ----------------------------------------------------------------------------------------- left column: info panel / transit lines
  _setLeft(kind) {
    this.leftKind = kind;
    this.infoEl.classList.toggle('sb-hidden', kind !== 'info');
    this.linesEl.classList.toggle('sb-hidden', kind !== 'lines');
    this.root.classList.toggle('has-left', !!kind);
    this.rightBtns.lines.classList.toggle('is-active', kind === 'lines');
    if (this.activeCategory) { const cat = this.categories.find((c) => c.id === this.activeCategory); if (cat?.hint) this._renderSubpanel(cat); }
  }
  hideLeft(fromUser = false) { if (this.leftKind === 'info') { if (fromUser) this.action('closeInfo'); this.hideInfo(); } else if (this.leftKind === 'lines') { if (fromUser) this.action('closeLines'); this._setLeft(null); } }
  /** selection:changed → build the panel from world data. */
  onSelection({ kind, id } = {}) {
    if (!kind || id === null || id === undefined) { this.hideInfo(); return; }
    const w = this.ctx.world;
    if (kind === 'building') { const b = w.buildings.items.get(id); if (b) this.showInfo({ kind, data: b, extra: this._simExtra(id) }); else this.hideInfo(); }
    else if (kind === 'road' || kind === 'edge') { const e = w.roads.edges.get(id); if (e) this.showInfo({ kind: 'road', data: e }); else this.hideInfo(); }
    else if (kind === 'node') { const n = w.roads.nodes.get(id); if (n) this.showInfo({ kind, data: n }); else this.hideInfo(); }
    else if (kind === 'prop') { const p = w.props.items.get(id); if (p) this.showInfo({ kind, data: p }); else this.hideInfo(); }
    else if (kind === 'vehicle') { const v = w.traffic.vehicles.get(id); if (v) this.showInfo({ kind, data: v }); else this.hideInfo(); }
    else if (kind === 'service') { const s = w.services.items.get(id); if (s) this.showInfo({ kind, data: s }); else this.hideInfo(); }
    else if (kind === 'line') { this.showLines(id); }
    else this.hideInfo();
  }
  _simExtra(id) {
    try { const r = this.ctx.modules?.simulation?.building?.(id); if (!r) return {}; return { happiness: r.happiness, wellbeing: r.health, levelProgress: r.levelProgress, landValue: r.landValue, education: r.education, crime: r.crime, power: r.power, water: r.water }; } catch (e) { return {}; }
  }
  hideInfo() { if (this.leftKind === 'info') this._setLeft(null); this.infoEl.innerHTML = ''; }
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
      if (extra.landValue !== undefined) rows.push(['Land value', `¢${fmtInt.format(Math.round(extra.landValue))}/m²`]);
      if (extra.rent !== undefined) rows.push(['Rent', `¢${fmtInt.format(extra.rent)}/month`]);
      if (extra.upkeep !== undefined) rows.push(['Upkeep', `¢${fmtInt.format(extra.upkeep)}/month`, 'bad']);
      if (extra.age !== undefined) rows.push(['Built', extra.age]);
      if (extra.power !== undefined) rows.push(['Electricity', extra.power > 0.5 ? 'Connected' : 'No power', extra.power > 0.5 ? 'good' : 'bad']);
      if (extra.water !== undefined) rows.push(['Water', extra.water > 0.5 ? 'Connected' : 'No water', extra.water > 0.5 ? 'good' : 'bad']);
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
    } else if (kind === 'service') {
      const def = SERVICE_KINDS[data.kind] || {}; const cat = SERVICE_CATS.find((c) => c.id === def.cat);
      title = data.name || def.label || String(data.kind); icon = ICONS[cat?.icon || 'parks'](); pill = [cat?.label || 'service', PALETTE.teal];
      sub = `Service #${data.id} · Level ${data.level ?? 1}`; level = data.level || 1;
      rows.push(['Capacity', fmtInt.format(data.capacity ?? 0)], ['Load', fmtInt.format(data.load ?? 0)], ['Upkeep', `¢${fmtInt.format(Math.round((def.cost || 10000) * 0.04))}/month`, 'bad']);
      bars.push(['Utilisation', clamp01(data.capacity ? (data.load || 0) / data.capacity : 0), '']);
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
    const focus = mk('primary', ICONS.focus(), 'Focus', 'focus');
    if (data.x !== undefined && data.z !== undefined) focus.addEventListener('click', () => this.ctx.camera.flyTo({ target: [data.x, data.y || 0, data.z], distance: Math.min(this.ctx.camera.distance, 160) }, 1.2));
    actions.appendChild(focus);
    if (kind === 'building' || kind === 'road' || kind === 'service') actions.appendChild(mk('', ICONS.document(), 'Policies', 'policies'));
    actions.appendChild(mk('danger', ICONS.bulldoze(), 'Demolish', 'demolish'));
    p.append(head, body, actions);
    this._setLeft('info');
  }

  /** Transit line panel: reads world.transit.lines (or a staged Map). Line: {id, name, color, stops:[id], vehicles, ridership, length}. */
  setTransitSource(map) { this.transitSource = map; if (this.leftKind === 'lines') this._renderLines(); }
  _lines() { const m = this.transitSource || this.ctx.world.transit?.lines; return m instanceof Map ? [...m.values()] : Array.isArray(m) ? m : []; }
  showLines(selectId) {
    if (selectId !== undefined) this.transitSel = selectId;
    this._renderLines();
    this._setLeft('lines');
  }
  onTransitChanged() { if (this.leftKind === 'lines') this._renderLines(); }
  _renderLines() {
    const p = this.linesEl; p.innerHTML = '';
    const lines = this._lines();
    const sel = lines.find((l) => l.id === this.transitSel) || lines[0] || null;
    if (sel) this.transitSel = sel.id;
    const head = el('div', 'sb-info-head', `<div class="sb-ic">${ICONS.transitLines()}</div><div class="sb-ht"><div class="sb-h1">Transit Lines</div><div class="sb-h2"><span>${lines.length} line${lines.length === 1 ? '' : 's'} · ${fmtInt.format(lines.reduce((a, l) => a + (l.ridership || 0), 0))} passengers / day</span></div></div>`);
    const add = btn('sb-action small primary', ICONS.plus() + '<span>New line</span>'); add.addEventListener('click', () => { this.action('transit', 'newLine'); this._toolsSelect('transit', { mode: 'line', kind: 'bus' }); this.setCategory('transit'); });
    const close = btn('sb-close', ICONS.close()); close.addEventListener('click', () => this.hideLeft(true));
    head.append(add, close);
    const list = el('div', 'sb-linelist');
    if (!lines.length) list.appendChild(el('div', 'sb-empty', 'No transit lines yet.<br>Create a bus line by placing stops along a road.'));
    for (const l of lines) {
      const b = btn('sb-line' + (sel && l.id === sel.id ? ' is-active' : ''), `<span class="sb-dot" style="background:${esc(l.color || LINE_COLOURS[0])}"></span><span class="sb-ln">${esc(l.name || `Line ${l.id}`)}</span><span class="sb-ls">${(l.stops?.length ?? 0)} stops</span><span class="sb-lr sb-num">${fmtInt.format(l.ridership || 0)}</span>`);
      b.addEventListener('click', () => { this.transitSel = l.id; this.action('transit', 'select', l.id); this._renderLines(); });
      list.appendChild(b);
    }
    p.append(head, list);
    if (sel) {
      const body = el('div', 'sb-info-body');
      body.appendChild(el('div', 'sb-section', 'Line details'));
      const g = el('div', 'sb-rows');
      const cap = (sel.vehicles || 0) * 60 * 8;
      for (const [k, v, cls] of [['Vehicles', String(sel.vehicles ?? 0)], ['Length', `${((sel.length || 0) / 1000).toFixed(1)} km`], ['Ridership', `${fmtInt.format(sel.ridership || 0)} / day`], ['Ticket price', `¢${sel.fare ?? 2}`], ['Monthly balance', `${(sel.balance || 0) >= 0 ? '+' : '−'}¢${fmtInt.format(Math.abs(Math.round(sel.balance || 0)))}`, (sel.balance || 0) >= 0 ? 'good' : 'bad']]) { g.appendChild(el('span', 'sb-k', k)); g.appendChild(el('span', 'sb-v sb-num' + (cls ? ' ' + cls : ''), v)); }
      body.appendChild(g);
      const util = el('div', 'sb-barrow'); const u = clamp01(cap ? (sel.ridership || 0) / cap : 0);
      util.innerHTML = `<span class="sb-k">Utilisation</span><div class="sb-bar ${u > 0.85 ? 'yellow' : 'green'}"><i style="width:${(u * 100).toFixed(0)}%"></i></div><span class="sb-v sb-num">${(u * 100).toFixed(0)}%</span>`;
      body.appendChild(util);
      const veh = el('div', 'sb-barrow'); veh.innerHTML = '<span class="sb-k">Buses</span>';
      const st = el('div', 'sb-stepper'); const val = el('span', 'sb-val sb-num', String(sel.vehicles ?? 0));
      const dn = btn('sb-tm', ICONS.chevronDown()), up = btn('sb-tm', ICONS.chevronUp());
      const setV = (d) => { const n = Math.max(0, Math.min(20, (sel.vehicles || 0) + d)); this.action('transit', 'setVehicles', sel.id, n); if (this.transitSource) { sel.vehicles = n; val.textContent = String(n); } };
      dn.addEventListener('click', () => setV(-1)); up.addEventListener('click', () => setV(1));
      st.append(dn, val, up); veh.append(st, el('span', 'sb-v', '')); body.appendChild(veh);
      const col = el('div', 'sb-barrow'); col.innerHTML = '<span class="sb-k">Colour</span>';
      const sw = el('div', 'sb-swatches');
      for (const c of LINE_COLOURS) { const b = btn('sb-swatch' + (c === sel.color ? ' is-active' : '')); b.style.background = c; b.addEventListener('click', () => { this.action('transit', 'setColor', sel.id, c); if (this.transitSource) { sel.color = c; this._renderLines(); } }); sw.appendChild(b); }
      col.append(sw, el('span', 'sb-v', '')); body.appendChild(col);
      body.appendChild(el('div', 'sb-section', `Stops (${sel.stops?.length ?? 0})`));
      const stops = el('div', 'sb-stops'); stops.style.setProperty('--lc', sel.color || LINE_COLOURS[0]);
      const stopMap = this.ctx.world.transit?.stops;
      (sel.stops || []).forEach((sid, i) => { const s = stopMap?.get?.(sid); const nm = (typeof sid === 'object' ? sid.name : s?.name) || `Stop ${i + 1}`; stops.appendChild(el('span', 'sb-stop', `<i></i>${esc(nm)}`)); });
      body.appendChild(stops);
      const actions = el('div', 'sb-actions');
      const focus = btn('sb-action primary', ICONS.focus() + '<span>Focus</span>'); focus.addEventListener('click', () => this.action('transit', 'focus', sel.id));
      const edit = btn('sb-action', ICONS.roads() + '<span>Edit route</span>'); edit.addEventListener('click', () => { this.action('transit', 'edit', sel.id); this._toolsSelect('transit', { mode: 'line', lineId: sel.id }); });
      const del = btn('sb-action danger', ICONS.trash() + '<span>Delete</span>'); del.addEventListener('click', () => { this.action('transit', 'delete', sel.id); if (this.transitSource) { this.transitSource.delete(sel.id); this.transitSel = null; this._renderLines(); } });
      actions.append(focus, edit, del);
      p.append(body, actions);
    }
  }

  // ----------------------------------------------------------------------------------------- info views
  setInfoview(name) {
    const v = name && name !== 'none' ? name : null;
    this.infoview = v;
    this.action('infoview', v);
    if (this.activeCategory === 'info' && this.cardEls) for (const [k, e] of Object.entries(this.cardEls)) e.classList.toggle('is-active', k === (v || 'none'));
    this.activeCard.info = v || 'none';
    this._renderLegend();
  }
  _renderLegend() {
    const p = this.legendEl;
    const v = this.infoview, def = INFOVIEWS.find((x) => x.id === v);
    if (!v || !def) { p.classList.add('sb-hidden'); p.innerHTML = ''; return; }
    const wl = this.ctx.world.infoview?.legend;
    const grad = Array.isArray(wl?.colors) && wl.colors.length ? wl.colors : def.grad;
    p.innerHTML = '';
    const head = el('div', 'sb-legend-head', (ICONS[def.icon] ? (def.icon === 'face' ? ICONS.face(0.8) : ICONS[def.icon]()) : ICONS.info()) + `<span>${esc(wl?.title || def.label)}</span>`);
    const close = btn('sb-close', ICONS.close()); close.addEventListener('click', () => this.setInfoview(null));
    head.appendChild(close);
    const body = el('div', 'sb-legend-body');
    body.appendChild(el('div', 'sb-d', esc(wl?.description || def.desc)));
    const g = el('div', 'sb-grad'); g.style.background = `linear-gradient(90deg, ${grad.join(', ')})`;
    body.appendChild(g);
    body.appendChild(el('div', 'sb-grad-l', `<span>${esc(wl?.min ?? def.lo)}</span><span>${esc(wl?.max ?? def.hi)}</span>`));
    const stats = wl?.stats || this.source.infoStats?.[v];
    if (stats) { const r = el('div', 'sb-rows'); for (const [k, val] of Object.entries(stats)) { r.appendChild(el('span', 'sb-k', esc(k))); r.appendChild(el('span', 'sb-v sb-num', esc(val))); } body.appendChild(r); }
    p.append(head, body);
    p.classList.remove('sb-hidden');
  }

  // ----------------------------------------------------------------------------------------- photo mode
  setPhotoMode(on) {
    on = !!on;
    if (on === this.photo) return;
    this.photo = on;
    this.root.classList.toggle('is-photo', on);
    this.photoHint?.remove(); this.photoHint = null;
    if (on) {
      this.photoHint = el('div', 'sb-photohint', `Photo mode · press <span class="sb-key">P</span> to show the interface`);
      this.root.appendChild(this.photoHint);
    }
    this.action('photomode', on);
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    this.minimap?.dispose();
    this.root?.remove(); this.style?.remove();
  }
}
