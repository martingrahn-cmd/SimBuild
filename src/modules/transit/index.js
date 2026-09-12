import { snapStop, solve, timetable, sampleSchedule, catchment } from './graph.js';
import { TransitRender } from './render.js';
import { stage, CAMERAS } from './showcase.js';

export const PALETTE = Object.freeze(['#2f8ff5', '#e5484d', '#4cc25a', '#f5c542', '#a66cf5', '#34c3c7', '#f28c28', '#ff6fb1']);
const S = { ctx: null, world: null, render: null, nextStop: 1, nextLine: 1, tables: new Map(), fleet: [], draft: null,
  overlay: null, selected: null, pending: false, visualDirty: false, routeMs: 0, stepMs: 0, catchments: new Map(), showcaseWeights: new Map(), showcaseDock: null };
const copy = s => ({ ...s, ...(s.lines ? { lines: [...s.lines] } : {}), ...(s.stops ? { stops: [...s.stops], route: [...s.route] } : {}) });
const nameOf = (v, fallback) => typeof v === 'string' && v.trim() ? v.trim().slice(0, 24) : fallback;
function plan(stops) { const t = performance.now(), p = solve(S.world, stops); S.routeMs = performance.now() - t; return p; }
function relink() {
  for (const s of S.world.transit.stops.values()) s.lines.length = 0;
  for (const l of S.world.transit.lines.values()) for (const id of l.stops) { const s = S.world.transit.stops.get(id); if (s) s.lines.push(l.id); }
}
function adopt() {
  let changed = false;
  for (const stop of S.world.transit.stops.values()) {
    let id = null, best = 36;
    for (const p of S.world.props.items.values()) if (p.kind === 'bus_stop') {
      const d = (stop.x - p.x) ** 2 + (stop.z - p.z) ** 2;
      if (d < best) { best = d; id = p.id; }
    }
    if (stop.propId !== id) { stop.propId = id; changed = true; }
  }
  if (changed) S.visualDirty = true;
  return changed;
}
function demand(line) {
  let weight = 0;
  const stops = line.stops.map(id => S.world.transit.stops.get(id)).filter(Boolean);
  if (!S.catchments.has(line.id)) S.catchments.set(line.id, catchment(S.world, stops));
  const sim = S.ctx.modules.simulation;
  for (const id of S.catchments.get(line.id)) {
    const b = S.world.buildings.items.get(id); if (!b) continue;
    const people = typeof sim?.building === 'function' ? sim.building(id) : b;
    const occupants = Number.isFinite(people?.occupants) ? Math.max(0, people.occupants) : 0;
    const jobs = Number.isFinite(people?.jobs) ? Math.max(0, people.jobs) : 0;
    weight += (occupants + jobs) * 0.1;
  }
  if (S.world.flags.showcase === 'transit' && !S.world.buildings.items.size) for (const s of stops) weight += S.showcaseWeights.get(s.id) || 0;
  line.ridership = line.active && line.vehicles ? Math.round(weight * Math.min(1, line.vehicles / 4)) : 0;
  line.balance = 30 * (line.ridership * line.fare - line.vehicles * 900);
}
function rebuildFleet() {
  S.fleet.length = 0;
  for (const l of S.world.transit.lines.values()) {
    demand(l); const table = S.tables.get(l.id);
    l.headway = l.vehicles && table ? table.cycle / l.vehicles : Infinity;
    if (!l.active || !table) continue;
    for (let i = 0; i < l.vehicles; i++) S.fleet.push({ id: l.id * 100 + i + 1, lineId: l.id, ordinal: i,
      x: 0, y: 0, z: 0, heading: 0, edgeId: 0, lane: 0, t: 0, speed: 0, occupancy: 0, capacity: 70, doorsOpen: false, atStop: null, phaseSeconds: 0 });
  }
  // The transit fixture has one real scheduled bus timed to dwell at its featured stop at 22:00.
  // It remains a normal timetable vehicle at every other time; no second display-only bus is added.
  if (S.showcaseDock && S.world.flags.showcase === 'transit') {
    const stop = S.world.transit.stops.get(S.showcaseDock.stopId), line = stop && S.world.transit.lines.get(stop.lines[0]), table = line && S.tables.get(line.id);
    const segment = table?.segments.find(s => s.stop === stop.id), vehicle = line && S.fleet.find(v => v.lineId === line.id && v.ordinal === 0);
    if (segment && vehicle) vehicle.phaseSeconds = segment.start + (segment.end - segment.start) * 0.5 - S.showcaseDock.hour * 3600 - vehicle.ordinal * table.cycle / line.vehicles;
  }
  step(); S.visualDirty = true;
}
function changed(lines = {}, stops = {}) {
  S.world.transit.version++; relink(); adopt(); rebuildFleet();
  S.ctx.events.emit('transit:changed', { lines: { added: [], removed: [], updated: [], ...lines }, stops: { added: [], removed: [], ...stops } });
}
function applyPlan(line, p) {
  S.catchments.delete(line.id);
  line.route = [...p.route]; line.length = p.length;
  if (p.valid) S.tables.set(line.id, timetable(S.world, p));
  else { S.tables.delete(line.id); line.active = false; }
}
function preferredColor(color, except = null) {
  const used = new Set([...S.world.transit.lines.values()].filter(l => l.active && l.id !== except).map(l => l.color));
  if (PALETTE.includes(color) && (!used.has(color) || used.size >= 8)) return color;
  return PALETTE.find(c => !used.has(c)) || PALETTE[0];
}
function newLine(mode, ids, opts = {}, staged = S.world.transit.stops) {
  if (mode !== 'bus' || !Array.isArray(ids) || !ids.every(id => staged.has(id))) return null;
  const p = plan(ids.map(id => staged.get(id))); if (!p.valid) return null;
  const vehicles = opts.vehicles ?? 4, fare = opts.fare ?? 2;
  if (!Number.isInteger(vehicles) || vehicles < 0 || vehicles > 20 || !Number.isInteger(fare) || fare < 0 || fare > 1000) return null;
  const id = S.nextLine++, l = { id, name: nameOf(opts.name, `Bus line ${id}`), color: preferredColor(opts.color), mode,
    stops: [...ids], route: [...p.route], vehicles, ridership: 0, length: p.length, fare, balance: 0, headway: Infinity, active: true };
  applyPlan(l, p); return l;
}
function draftPlan() { return S.draft ? plan(S.draft.stops) : { valid: false, reason: 'No line draft', length: 0, route: [] }; }
function renderNow() {
  let lines = S.world.transit.lines, tables = S.tables;
  const p = S.draft ? draftPlan() : null;
  if (p?.valid) { lines = new Map(lines); tables = new Map(tables); lines.set(0, { id: 0, route: p.route, color: '#f5c542', active: true }); tables.set(0, true); }
  S.render.rebuild(S.world.transit.stops, lines, tables); S.visualDirty = false;
}
function step() {
  if (!S.world) return;
  const hour = S.world.time.hour, seconds = hour * 3600;
  for (const v of S.fleet) {
    const l = S.world.transit.lines.get(v.lineId), table = S.tables.get(v.lineId);
    sampleSchedule(table, seconds + v.ordinal * table.cycle / l.vehicles + v.phaseSeconds, v);
    const peak = hour >= 7 && hour <= 9 || hour >= 16 && hour <= 19;
    v.riders = Math.min(v.capacity, Math.round(l.ridership / Math.max(1, l.vehicles) * (peak ? 0.18 : 0.08)));
    v.occupancy = v.riders / v.capacity;
  }
  for (const s of S.world.transit.stops.values()) {
    let r = 0; for (const id of s.lines) r += S.world.transit.lines.get(id)?.ridership || 0;
    s.waiting = Math.round(r * (hour >= 7 && hour < 9 || hour >= 16 && hour < 19 ? 0.02 : 0.008));
  }
}
function refreshRoads() {
  const updated = [];
  for (const s of S.world.transit.stops.values()) {
    const p = S.world.roads.sample(s.edgeId, s.t); if (p) s.y = p.y + 0.2;
  }
  for (const l of S.world.transit.lines.values()) { applyPlan(l, plan(l.stops.map(id => S.world.transit.stops.get(id)).filter(Boolean))); updated.push(l.id); }
  S.pending = false; changed({ updated });
}
function editNumber(id, value, key, max) {
  const l = S.world.transit.lines.get(Number(id)); if (!l || !Number.isInteger(value) || value < 0 || value > max) return false;
  if (l[key] === value) return true; l[key] = value; changed({ updated: [l.id] }); return true;
}
const api = {
  addStop(x, z, opts = {}) { const s = snapStop(S.world, x, z, opts); if (!s) return null; s.id = S.nextStop++; S.world.transit.stops.set(s.id, s); changed({}, { added: [s.id] }); return s.id; },
  createLine(mode, ids, opts = {}) { const l = newLine(mode, ids, opts); if (!l) return null; S.world.transit.lines.set(l.id, l); changed({ added: [l.id] }); return l.id; },
  removeLine(id) { id = Number(id); if (!S.world.transit.lines.delete(id)) return false; S.tables.delete(id); S.catchments.delete(id); if (S.selected === id) S.selected = null; changed({ removed: [id] }); return true; },
  removeStop(id) {
    id = Number(id); if (!S.world.transit.stops.has(id)) return false;
    const updated = [], removed = [];
    for (const l of S.world.transit.lines.values()) if (l.stops.includes(id)) {
      l.stops = l.stops.filter(s => s !== id);
      if (l.stops.length < 2) { S.world.transit.lines.delete(l.id); S.tables.delete(l.id); removed.push(l.id); }
      else { applyPlan(l, plan(l.stops.map(s => S.world.transit.stops.get(s)))); updated.push(l.id); }
    }
    S.world.transit.stops.delete(id); changed({ updated, removed }, { removed: [id] }); return true;
  },
  route(ids) { if (Number.isInteger(ids)) return [...(S.world.transit.lines.get(ids)?.route || [])]; if (!Array.isArray(ids) || !ids.every(id => S.world.transit.stops.has(id))) return []; return plan(ids.map(id => S.world.transit.stops.get(id))).route; },
  stopsNear(x, z, radius = 400) { if (![x, z, radius].every(Number.isFinite)) return []; return [...S.world.transit.stops.values()].filter(s => Math.hypot(s.x - x, s.z - z) <= radius).map(copy); },
  setVehicles(id, n) { return Number.isInteger(n) && editNumber(id, Math.max(0, Math.min(20, n)), 'vehicles', 20); }, setFare(id, n) { return editNumber(id, n, 'fare', 1000); },
  setColor(id, color) { const l = S.world.transit.lines.get(Number(id)); if (!l || !PALETTE.includes(color) || preferredColor(color, l.id) !== color) return false; l.color = color; changed({ updated: [l.id] }); return true; },
  setActive(id, on) { const l = S.world.transit.lines.get(Number(id)); if (!l || typeof on !== 'boolean' || (on && !S.tables.has(l.id))) return false; l.active = on; changed({ updated: [l.id] }); return true; },
  focus(id) { const l = S.world.transit.lines.get(Number(id)); if (!l) return false; const stops = l.stops.map(id => S.world.transit.stops.get(id));
    const xs = stops.map(s => s.x), zs = stops.map(s => s.z), x = (Math.min(...xs) + Math.max(...xs)) / 2, z = (Math.min(...zs) + Math.max(...zs)) / 2;
    S.ctx.camera.flyTo({ target: [x, S.world.terrain.getHeight(x, z), z], pitch: 0.8, distance: Math.max(100, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))) }, 1.5); return true; },
  lines() { return [...S.world.transit.lines.values()].map(copy); }, line(id) { const l = S.world.transit.lines.get(Number(id)); return l ? copy(l) : null; },
  setShowcaseDock(stopId, hour = 22) {
    const stop = S.world.transit.stops.get(Number(stopId));
    if (!stop || !Number.isFinite(hour) || hour < 0 || hour >= 24) return false;
    S.showcaseDock = { stopId: stop.id, hour }; rebuildFleet(); return true;
  },
  stops() { return [...S.world.transit.stops.values()].map(copy); }, vehicles() { step(); return S.fleet.map(v => ({ ...v })); },
  beginLine(opts = {}) {
    const kind = opts.kind || 'bus', lineId = opts.lineId == null ? null : Number(opts.lineId);
    if (kind !== 'bus' || opts.mode && opts.mode !== 'line' || lineId !== null && !S.world.transit.lines.has(lineId)) return false;
    if (S.draft && S.draft.kind === kind && S.draft.lineId === lineId) return true;
    S.draft = { kind, lineId, stops: lineId === null ? [] : S.world.transit.lines.get(lineId).stops.map(id => copy(S.world.transit.stops.get(id))), hovered: null };
    S.visualDirty = true; return true;
  },
  draftState() { const p = draftPlan(); return { active: !!S.draft, mode: 'line', kind: S.draft?.kind || 'bus', lineId: S.draft?.lineId ?? null,
    stops: S.draft?.stops.map(copy) || [], valid: p.valid, reason: p.reason, length: p.length, route: [...p.route], hovered: S.draft?.hovered ? { ...S.draft.hovered } : null }; },
  previewDraft(x, z) { if (S.draft) { const s = Number.isFinite(x) && Number.isFinite(z) ? snapStop(S.world, x, z) : null;
    S.draft.hovered = s ? { ...s, valid: true, reason: '' } : null; } return api.draftState(); },
  addStopToDraft(x, z) {
    if (!S.draft) return null; const s = snapStop(S.world, x, z); if (!s) return null;
    const existing = [...S.world.transit.stops.values()].find(p => p.side === s.side && Math.hypot(p.x - s.x, p.z - s.z) < 6);
    const stop = existing ? copy(existing) : { ...s, id: S.nextStop++ };
    if (S.draft.stops.some(p => p.id === stop.id || Math.hypot(p.x - stop.x, p.z - stop.z) < 3)) return null;
    S.draft.stops.push(stop); S.draft.hovered = null; S.visualDirty = true; return stop.id;
  },
  commitLine() {
    if (!S.draft) return null; const p = draftPlan(); if (!p.valid) return null;
    const staged = new Map(S.world.transit.stops); for (const s of S.draft.stops) staged.set(s.id, s);
    const previous = S.draft.lineId === null ? null : S.world.transit.lines.get(S.draft.lineId);
    if (S.draft.lineId !== null && !previous) return null;
    const l = previous || newLine('bus', S.draft.stops.map(s => s.id), {}, staged); if (!l) return null;
    const added = []; for (const s of S.draft.stops) if (!S.world.transit.stops.has(s.id)) { S.world.transit.stops.set(s.id, s); added.push(s.id); }
    l.stops = S.draft.stops.map(s => s.id); applyPlan(l, p); S.world.transit.lines.set(l.id, l); S.draft = null; S.selected = l.id;
    changed(previous ? { updated: [l.id] } : { added: [l.id] }, { added }); return l.id;
  },
  cancelLine() { S.draft = null; S.visualDirty = true; },
  setOverlay(on = null) { if (on !== null && typeof on !== 'boolean') return false; S.overlay = on; return on ?? (S.selected !== null || !!S.draft); },
  stats() {
    const lines = [...S.world.transit.lines.values()], ridership = lines.reduce((a, l) => a + l.ridership, 0), hour = S.world.time.hour;
    let fraction = 0, norm = 0;
    for (let h = 0; h < 24; h++) { const w = h >= 7 && h < 9 || h >= 16 && h < 19 ? 3 : h < 6 ? 0.3 : 1; norm += w; fraction += Math.max(0, Math.min(1, hour - h)) * w; }
    const adoptedStops = [...S.world.transit.stops.values()].filter(s => s.propId !== null).length;
    return { lines: lines.length, stops: S.world.transit.stops.size, vehicles: S.fleet.length, source: 'own', shelters: adoptedStops ? adoptedStops === S.world.transit.stops.size ? 'props' : 'mixed' : 'own', adoptedStops,
      ridership, boardings: Math.floor(ridership * fraction / norm), riders: S.fleet.reduce((a, v) => a + v.riders, 0),
      occupancy: S.fleet.length ? S.fleet.reduce((a, v) => a + v.occupancy, 0) / S.fleet.length : 0,
      routeArcLengths: Object.fromEntries([...S.tables].map(([id, t]) => [id, t.physicalLength])),
      meanSpeed: S.fleet.length ? S.fleet.reduce((a, v) => a + S.tables.get(v.lineId).meanSpeed, 0) / S.fleet.length : 0,
      ...S.render.stats(), stepMs: S.stepMs, routeMs: S.routeMs, overlay: S.overlay ?? (S.selected !== null || !!S.draft) };
  },
  cropRects(args) { return S.render.cropRects(args, S.fleet, S.world.transit.stops, S.world.transit.lines); },
  serialize() { return { version: 1, nextStop: S.nextStop, nextLine: S.nextLine, overlay: S.overlay, lines: api.lines().map(l => ({ ...l, headway: Number.isFinite(l.headway) ? l.headway : null })), stops: api.stops() }; },
  deserialize(data) {
    // Pre-wave-3 core saves contain the transit stub's exact empty object. Restore it as empty stock.
    if (data && Object.getPrototypeOf(data) === Object.prototype && Object.keys(data).length === 0) data = { version: 1, lines: [], stops: [], overlay: null };
    if (!data || data.version !== 1 || !Array.isArray(data.lines) || !Array.isArray(data.stops)) return false;
    const stops = new Map(), lines = new Map(), tables = new Map();
    for (const s of data.stops) {
      if (!Number.isInteger(s.id) || s.id < 1 || stops.has(s.id) || ![s.x, s.y, s.z, s.heading, s.t].every(Number.isFinite) || s.t < 0 || s.t > 1 || !['left', 'right'].includes(s.side)) return false;
      stops.set(s.id, { ...s, name: nameOf(s.name, 'Bus stop'), lines: [], waiting: 0, propId: null });
    }
    for (const raw of data.lines) {
      if (!Number.isInteger(raw.id) || raw.id < 1 || lines.has(raw.id) || raw.mode !== 'bus' || !Array.isArray(raw.stops) || raw.stops.length < 2 || !raw.stops.every(id => stops.has(id)) || !Number.isInteger(raw.vehicles) || raw.vehicles < 0 || raw.vehicles > 20 || !Number.isInteger(raw.fare) || raw.fare < 0 || raw.fare > 1000 || !PALETTE.includes(raw.color)) return false;
      const p = solve(S.world, raw.stops.map(id => stops.get(id))), l = { ...raw, name: nameOf(raw.name, 'Bus line'), stops: [...raw.stops], route: p.route, length: p.length, active: !!raw.active && p.valid };
      lines.set(l.id, l); if (p.valid) tables.set(l.id, timetable(S.world, p));
    }
    const removedLines = [...S.world.transit.lines.keys()], removedStops = [...S.world.transit.stops.keys()];
    S.world.transit.lines.clear(); S.world.transit.stops.clear(); for (const [id, s] of stops) S.world.transit.stops.set(id, s); for (const [id, l] of lines) S.world.transit.lines.set(id, l);
    S.tables = tables; S.catchments.clear(); S.nextStop = Math.max(Number.isInteger(data.nextStop) ? data.nextStop : 1, ...[...stops.keys()].map(id => id + 1));
    S.nextLine = Math.max(Number.isInteger(data.nextLine) ? data.nextLine : 1, ...[...lines.keys()].map(id => id + 1));
    S.overlay = typeof data.overlay === 'boolean' ? data.overlay : null; S.draft = null; S.selected = null;
    changed({ added: [...lines.keys()], removed: removedLines }, { added: [...stops.keys()], removed: removedStops }); return true;
  },
};
function uiAction({ action, args = [] }) {
  if (action === 'transitLines') { S.ctx.modules.ui?.showLines?.(S.selected); return; }
  if (action === 'transitLine') { api.beginLine({ kind: 'bus' }); return; }
  if (action === 'transitEdit') { api.beginLine({ kind: 'bus', lineId: args[0] }); return; }
  if (action === 'transitDelete') { api.removeLine(args[0]); return; }
  if (action === 'transitBuses') { api.setVehicles(args[0], Number(args[1])); return; }
  if (action !== 'transit') return;
  const [verb, id, value] = args;
  if (verb === 'newLine') api.beginLine({ kind: 'bus' });
  else if (verb === 'select') { S.selected = Number(id); S.ctx.modules.ui?.showLines?.(Number(id)); }
  else if (verb === 'edit') api.beginLine({ kind: 'bus', lineId: id });
  else if (verb === 'delete') api.removeLine(id);
  else if (verb === 'setVehicles') api.setVehicles(id, Number(value));
  else if (verb === 'setColor') api.setColor(id, value);
  else if (verb === 'focus') api.focus(id);
}
export default {
  name: 'transit', dependencies: ['roads', 'traffic', 'props', 'ui'], budget: { drawCalls: 20, triangles: 140000 },
  async init(ctx) {
    S.ctx = ctx; S.world = ctx.world; S.render = new TransitRender(ctx);
    for (const key of ['createLine', 'removeLine', 'addStop', 'removeStop', 'route', 'stopsNear']) ctx.world.transit[key] = api[key];
    ctx.world.transit.modes = Object.freeze(['bus', 'tram']);
    ctx.events.on('roads:changed', () => { S.pending = true; }, 'transit');
    ctx.events.on('terrain:changed', () => { S.pending = true; }, 'transit');
    ctx.events.on('props:changed', () => { if (adopt()) changed({ updated: [...S.world.transit.lines.keys()] }); }, 'transit');
    ctx.events.on('buildings:changed', () => { S.catchments.clear(); if (S.world.transit.lines.size) changed({ updated: [...S.world.transit.lines.keys()] }); }, 'transit');
    ctx.events.on('sim:reconciled', () => { S.catchments.clear(); if (S.world.transit.lines.size) changed({ updated: [...S.world.transit.lines.keys()] }); }, 'transit');
    ctx.events.on('sim:tick', ({ tick }) => {
      if (tick % 20 || S.pending || !S.world.transit.lines.size) return;
      const updated = [];
      for (const l of S.world.transit.lines.values()) { const previous = l.ridership, balance = l.balance; demand(l); if (l.ridership !== previous || l.balance !== balance) updated.push(l.id); }
      if (updated.length) { S.world.transit.version++; step(); ctx.events.emit('transit:changed', { lines: { added: [], removed: [], updated }, stops: { added: [], removed: [], updated: [] } }); }
    }, 'transit');
    ctx.events.on('save:loaded', () => { S.pending = true; S.draft = null; }, 'transit');
    ctx.events.on('ui:action', uiAction, 'transit');
  },
  update() { const t = performance.now(); if (S.pending) refreshRoads(); if (S.visualDirty) renderNow(); step(); S.render.update(S.fleet, S.world.transit.lines, S.overlay ?? (S.selected !== null || !!S.draft)); S.stepMs = performance.now() - t; },
  dispose() { S.render?.dispose(); S.tables.clear(); S.catchments.clear(); S.fleet.length = 0; }, api,
  showcase: { description: 'Three real bus loops on a connected road network, owned scheduled buses, adopted and fallback shelters, a live line panel and route overlay.', cameras: CAMERAS,
    async setup(ctx) { await stage(ctx, api, S.showcaseWeights); S.pending = false; adopt(); S.visualDirty = true; S.selected = S.world.transit.lines.keys().next().value ?? null; S.overlay = true; renderNow(); step(); S.render.update(S.fleet, S.world.transit.lines, true); ctx.modules.ui?.showLines?.(S.selected); } },
};
