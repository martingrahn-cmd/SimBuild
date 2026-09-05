// tools — the player's hands: road drawing (straight / curved / freehand, node + edge + angle
// snapping, terrain-conforming ghost with live length/angle/grade/price chips, red when invalid),
// the zoning brush, service placement with footprint + coverage circle + road-frontage check,
// terrain sculpting, bulldozing, click-to-select with a highlight cage, an undo/redo stack,
// keyboard shortcuts and cursor feedback.
//
// Owns world.selection. Emits tool:changed, tool:preview and selection:changed; listens to
// ui:action {action:'selectTool'|'undo'|'redo'|...}. Everything it changes in another module's world
// section goes through that section's published API, and everything it spends is charged to
// world.economy.money.
import { Gizmos, GIZMO_COLORS as GC } from './gizmos.js';
import { Chips, ICON } from './chips.js';
import { UndoStack } from './undo.js';
import { roadTool, zoneTool, terrainTool, serviceTool, propTool, bulldozeTool, selectTool } from './tools.js';
import { DEMOLISH, ROAD_COST, serviceDef, money } from './costs.js';
import { stage, CAMERAS } from './showcase.js';

const DEFAULTS = {
  road: { type: 'street', mode: 'straight', elevation: 0, snap: ['magnet'] },
  zone: { type: 'residential', density: 'low', brush: 'paint', size: 24 },
  terrain: { mode: 'raise', size: 40, strength: 50 },
  prop: { kind: 'tree_oak', mode: 'single', spacing: 12 },
  service: { kind: 'park_small' },
  bulldoze: { mode: 'single' },
  select: {},
};

const S = {
  ctx: null, giz: null, chips: null, undo: null, tools: null,
  toolName: 'select', tool: null, options: {},
  hover: null, mods: { shift: false, alt: false, ctrl: false },
  pointer: { down: false, button: -1, moved: 0, sx: 0, sy: 0 },
  _dirty: true, _toast: null, _bound: null, _showcase: false, _showcaseDraw: null,
  dirty() { S._dirty = true; },
  afford(n) { return (S.ctx.world.economy?.money ?? 0) >= n; },
  spend(n, why) {
    const e = S.ctx.world.economy;
    if (!e || !n) return;
    e.money -= n;
    S.ctx.events.emit('tool:spend', { amount: n, reason: why || '', money: e.money });
  },
  refund(n) { const e = S.ctx.world.economy; if (e && n) e.money += n; },
  toast(text) { S._toast = { text, t: 2.2 }; S.dirty(); },
  setOption(k, v) {
    S.options[k] = v;
    if (DEFAULTS[S.toolName]) DEFAULTS[S.toolName][k] = v;
    S.dirty();
    S.ctx.events.emit('tool:changed', { tool: S.toolName, options: { ...S.options } });
  },
  select(name, opts) { selectTool_(name, opts); },
  selectObject(kind, id) { setSelection(kind, id); },
  pick(x, z) { return pick(x, z); },
  pickArea(x0, z0, x1, z1) { return pickArea(x0, z0, x1, z1); },
  demolish(t) { return demolish(t); },
  refundOf(t) { return refundOf(t); },
  edgePath(id) { return edgePath(id); },
};

// ------------------------------------------------------------------------------------- selection

function setSelection(kind, id) {
  const sel = S.ctx.world.selection;
  if (sel.kind === kind && sel.id === id) return;
  sel.kind = kind ?? null;
  sel.id = id ?? null;
  S.dirty();
  S.ctx.events.emit('selection:changed', { kind: sel.kind, id: sel.id, data: selectionData() });
}

function selectionData() {
  const w = S.ctx.world, sel = w.selection;
  if (!sel.kind || sel.id === null || sel.id === undefined) return null;
  switch (sel.kind) {
    case 'building': return w.buildings.items.get(sel.id) || null;
    case 'road': return w.roads.edges.get(sel.id) || null;
    case 'node': return w.roads.nodes.get(sel.id) || null;
    case 'prop': return w.props.items.get(sel.id) || null;
    case 'vehicle': return w.traffic.vehicles.get(sel.id) || null;
    case 'service': return w.services.items.get(sel.id) || null;
    default: return null;
  }
}

/** Screen/world pick: buildings first, then services, vehicles, props, and finally roads. */
function pick(x, z) {
  const w = S.ctx.world;
  const b = w.buildings.at?.(x, z);
  if (b) {
    return {
      kind: 'building', id: b.id, x: b.x, z: b.z, heading: b.heading || 0,
      w: b.footprint?.w || 16, d: b.footprint?.d || 16, height: b.height || 10,
      label: `${b.type || 'building'} · L${b.level || 1}`,
    };
  }
  for (const s of w.services.items.values()) {
    const def = serviceDef(s.kind);
    const c = Math.cos(-(s.heading || 0)), si = Math.sin(-(s.heading || 0));
    const dx = x - s.x, dz = z - s.z;
    const u = dx * c - dz * si, v = dx * si + dz * c;
    if (Math.abs(u) <= def.w / 2 && Math.abs(v) <= def.d / 2) {
      return { kind: 'service', id: s.id, x: s.x, z: s.z, heading: s.heading || 0, w: def.w, d: def.d, height: def.h, label: def.label };
    }
  }
  if (w.traffic.vehicles.size && w.traffic.vehicles.size < 20000) {
    for (const v of w.traffic.vehicles.values()) {
      if (Math.abs(v.x - x) < 2.4 && Math.abs(v.z - z) < 2.4) {
        return { kind: 'vehicle', id: v.id, x: v.x, z: v.z, heading: v.heading || 0, w: 2.2, d: 4.8, height: 1.8, label: String(v.kind || 'vehicle') };
      }
    }
  }
  if (w.props.items.size && w.props.items.size < 40000) {
    let best = null, bd = 2.6;
    for (const p of w.props.items.values()) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) return { kind: 'prop', id: best.id, x: best.x, z: best.z, heading: best.heading || 0, w: 2.2, d: 2.2, height: /tree/.test(best.kind) ? 9 : 3.4, label: String(best.kind).replace(/_/g, ' ') };
  }
  const ne = w.roads.nearestEdge?.(x, z, 40);
  if (ne && ne.edge && ne.dist <= (ne.edge.width || 16) / 2 + 3) {
    const e = ne.edge;
    return { kind: 'road', id: e.id, x: ne.point.x, z: ne.point.z, heading: 0, w: e.width || 16, d: 6, height: 3, width: e.width || 16, label: `${e.type} · ${Math.round(e.length)} m` };
  }
  return null;
}

function pickArea(x0, z0, x1, z1) {
  const w = S.ctx.world, out = [];
  const inside = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
  for (const b of w.buildings.items.values()) { if (inside(b.x, b.z)) { const t = pick(b.x, b.z); if (t) out.push(t); } }
  const seen = new Set();
  const res = [];
  for (const t of out) if (!seen.has(t.kind + ':' + t.id)) { seen.add(t.kind + ':' + t.id); res.push(t); }
  for (const e of w.roads.edges.values()) {
    const a = w.roads.nodes.get(e.a), b2 = w.roads.nodes.get(e.b);
    if (a && b2 && inside(a.x, a.z) && inside(b2.x, b2.z)) res.push({ kind: 'road', id: e.id, x: (a.x + b2.x) / 2, z: (a.z + b2.z) / 2, width: e.width, label: e.type });
  }
  return res.slice(0, 200);
}

function refundOf(t) {
  if (!t) return 0;
  const w = S.ctx.world;
  if (t.kind === 'road') {
    const e = w.roads.edges.get(t.id);
    if (!e) return 0;
    return Math.round((ROAD_COST[e.type] ?? ROAD_COST.street) * (e.length || 0) * DEMOLISH.roadRefund / 10) * 10;
  }
  if (t.kind === 'service') {
    const s = w.services.items.get(t.id);
    return s ? Math.round(serviceDef(s.kind).cost * DEMOLISH.serviceRefund) : 0;
  }
  return 0;
}

function demolish(t) {
  if (!t) return false;
  const w = S.ctx.world;
  if (t.kind === 'road') {
    const e = w.roads.edges.get(t.id);
    if (!e) return false;
    const a = w.roads.nodes.get(e.a), b = w.roads.nodes.get(e.b);
    const desc = { ax: a.x, az: a.z, bx: b.x, bz: b.z, type: e.type, lanes: e.lanes, oneWay: e.oneWay, ctrl: e.ctrl ? { ...e.ctrl } : null };
    const refund = refundOf(t);
    w.roads.removeEdge(t.id);
    S.refund(refund);
    let cur = t.id;
    S.undo.push({
      label: `Demolish ${e.type}`,
      undo() {
        const na = w.roads.addNode(desc.ax, desc.az), nb = w.roads.addNode(desc.bx, desc.bz);
        cur = w.roads.addEdge(na, nb, desc.type, { lanes: desc.lanes, oneWay: desc.oneWay, ctrl: desc.ctrl });
        S.spend(refund, 'undo demolish');
      },
      redo() { w.roads.removeEdge(cur); S.refund(refund); },
    });
    if (w.selection.kind === 'road' && w.selection.id === t.id) setSelection(null, null);
    return true;
  }
  if (t.kind === 'building') {
    const b = w.buildings.items.get(t.id);
    const lot = b?.lot || (b?.lotId != null ? w.zones.lots.get(b.lotId) : null);
    w.buildings.demolish?.(t.id);
    S.spend(DEMOLISH.building, 'demolish');
    S.undo.push({
      label: 'Demolish building',
      undo() { if (lot) S.ctx.modules.buildings?.requestSpawn?.(lot); S.refund(DEMOLISH.building); },
      redo() { const nb = w.buildings.at?.(t.x, t.z); if (nb) w.buildings.demolish?.(nb.id); S.spend(DEMOLISH.building, 'demolish'); },
    });
    if (w.selection.kind === 'building' && w.selection.id === t.id) setSelection(null, null);
    return true;
  }
  if (t.kind === 'service') {
    const s = w.services.items.get(t.id);
    if (!s) return false;
    const kind = s.kind, x = s.x, z = s.z, heading = s.heading || 0;
    const refund = refundOf(t);
    w.services.remove?.(t.id);
    S.refund(refund);
    let cur = t.id;
    S.undo.push({
      label: 'Demolish service',
      undo() { cur = w.services.place?.(kind, x, z, heading); S.spend(refund, 'undo'); },
      redo() { w.services.remove?.(cur); S.refund(refund); },
    });
    if (w.selection.kind === 'service' && w.selection.id === t.id) setSelection(null, null);
    return true;
  }
  S.toast(`Cannot demolish ${t.kind}`);
  return false;
}

function edgePath(id) {
  const w = S.ctx.world;
  const e = w.roads.edges.get(id);
  if (!e) return null;
  const n = Math.max(2, Math.min(80, Math.round((e.length || 20) / 6)));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = w.roads.sample?.(id, i / n);
    if (p) out.push({ x: p.x, z: p.z });
  }
  return out.length >= 2 ? out : null;
}

// --------------------------------------------------------------------------------- tool selection

function selectTool_(name, opts) {
  const wanted = name || 'select';
  const key = S.tools[wanted] ? wanted : 'select';
  if (S.tool && S.toolName !== key) { try { S.tool.deactivate(); } catch (e) { /* isolated */ } }
  const prev = S.toolName;
  S.toolName = key;
  S.tool = S.tools[key];
  S.options = { ...(DEFAULTS[key] || {}), ...(opts || {}) };
  for (const [k, v] of Object.entries(opts || {})) if (DEFAULTS[key]) DEFAULTS[key][k] = v;
  if (prev !== key || opts) { try { S.tool.activate(S.options); } catch (e) { S.ctx.log.error(`${key}.activate failed`, e); } }
  S.chips.setCursor(S.tool.cursor || 'default');
  S.dirty();
  S.ctx.events.emit('tool:changed', { tool: key === 'select' ? null : key, options: { ...S.options } });
}

// ---------------------------------------------------------------------------------------- drawing

function drawSelection() {
  const g = S.giz;
  const w = S.ctx.world, sel = w.selection;
  if (!sel.kind || sel.id === null || sel.id === undefined) { if (S.toolName !== 'bulldoze') g.clearSelectionRibbon(); return; }
  const data = selectionData();
  if (!data) { g.clearSelectionRibbon(); return; }
  if (sel.kind === 'road') {
    const path = edgePath(sel.id);
    if (path) g.setSelectionRibbon(path, data.width || 16);
    const T = w.terrain;
    const mid = path ? path[Math.floor(path.length / 2)] : { x: data.x || 0, z: data.z || 0 };
    S.chips.add(mid.x, T.getHeight(mid.x, mid.z) + 3, mid.z, ICON.info, `${data.type} · ${Math.round(data.length || 0)} m`, '', 0, -26, `${data.lanes || 2} lanes`);
    return;
  }
  g.clearSelectionRibbon();
  let x = data.x ?? 0, z = data.z ?? 0, wd = 12, dp = 12, h = 8, heading = data.heading || 0, label = sel.kind;
  if (sel.kind === 'building') { wd = data.footprint?.w || 16; dp = data.footprint?.d || 16; h = data.height || 12; label = `${data.type} · level ${data.level || 1}`; }
  else if (sel.kind === 'service') { const d = serviceDef(data.kind); wd = d.w; dp = d.d; h = d.h; label = d.label; }
  else if (sel.kind === 'node') { wd = dp = 16; h = 3; label = 'Intersection'; }
  else if (sel.kind === 'vehicle') { wd = 2.4; dp = 5; h = 2; label = String(data.kind || 'vehicle'); }
  else if (sel.kind === 'prop') { wd = dp = 2.6; h = /tree/.test(data.kind) ? 9 : 3; label = String(data.kind).replace(/_/g, ' '); }
  g.selectionCage(x, z, wd + 1.5, dp + 1.5, heading, h, GC.selectEdge);
  if (sel.kind === 'service') {
    const d = serviceDef(data.kind);
    if (d.coverage > 0) g.showCoverage(x, z, d.coverage, [0.4, 0.9, 1.0]);
  }
  const y = S.ctx.world.terrain.getHeight(x, z);
  S.chips.add(x, y + h + 1, z, ICON.info, label, '', 0, -22);
}

function rebuild() {
  S._dirty = false;
  S.chips.reset();
  try {
    if (S._showcaseDraw) S._showcaseDraw();
    else S.tool?.draw();
  } catch (e) { S.ctx.log.error(`${S.toolName}.draw failed: ${e?.message || e}`, e); }
  drawSelection();
  S.giz.endFlat();
  if (S._toast && S.hover) {
    S.chips.add(S.hover.x, S.ctx.world.terrain.getHeight(S.hover.x, S.hover.z) + 2, S.hover.z, ICON.bad, S._toast.text, 'bad', 0, 26);
  }
}

// ------------------------------------------------------------------------------------------ input

function groundAt(clientX, clientY) {
  const el = S.ctx.renderer.domElement;
  const r = el.getBoundingClientRect();
  const nx = ((clientX - r.left) / r.width) * 2 - 1;
  const ny = -(((clientY - r.top) / r.height) * 2 - 1);
  return S.ctx.camera.screenToGround(nx, ny);
}

function bindInput(ctx) {
  const el = ctx.renderer.domElement;
  const call = (fn, ...a) => { try { return fn?.(...a); } catch (e) { ctx.log.error(`${S.toolName} input failed: ${e?.message || e}`, e); return undefined; } };

  const onMove = (e) => {
    const p = groundAt(e.clientX, e.clientY);
    if (!p) return;
    S.hover = p;
    S.pointer.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    if (S.pointer.down && S.pointer.button === 0) call(() => S.tool.drag(p));
    else call(() => S.tool.hover(p));
  };
  const onDown = (e) => {
    if (e.button === 0 && e.shiftKey) return;      // shift+LMB is the camera's orbit
    if (e.button === 1) return;                    // MMB pans
    const p = groundAt(e.clientX, e.clientY);
    if (!p) return;
    S.hover = p;
    S.pointer.down = true; S.pointer.button = e.button; S.pointer.moved = 0;
    if (e.button === 0) { call(() => S.tool.down(p, 0)); e.preventDefault(); }
  };
  const onUp = (e) => {
    const p = groundAt(e.clientX, e.clientY) || S.hover;
    if (S.pointer.down && S.pointer.button === 0 && p) call(() => S.tool.up(p, 0));
    else if (e.button === 2 && S.pointer.moved < 6 && p) call(() => S.tool.down(p, 2));   // RMB tap = cancel
    S.pointer.down = false; S.pointer.button = -1;
  };
  const onLeave = () => { S.hover = null; S.dirty(); };
  const onKey = (e) => {
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('input,textarea,select')) return;
    S.mods.shift = e.shiftKey; S.mods.alt = e.altKey; S.mods.ctrl = e.ctrlKey || e.metaKey;
    if (e.ctrlKey || e.metaKey) {
      if (e.code === 'KeyZ' && !e.shiftKey) { api.undo(); e.preventDefault(); return; }
      if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { api.redo(); e.preventDefault(); return; }
      return;
    }
    if (e.code === 'Escape') { call(() => S.tool.cancel()); if (S.toolName !== 'select') selectTool_(null); setSelection(null, null); return; }
    if (e.code === 'KeyU') { api.undo(); return; }
    if (S.tool && call(() => S.tool.key(e))) return;
    const map = { Digit1: ['road', null], Digit2: ['zone', null], Digit3: ['terrain', null], Digit4: ['prop', null], Digit5: ['service', null], Digit6: ['bulldoze', null], Digit0: ['select', null], KeyB: ['bulldoze', null] };
    const m = map[e.code];
    if (m) { selectTool_(m[0], m[1]); return; }
    S.dirty();
  };
  const onKeyUp = (e) => { S.mods.shift = e.shiftKey; S.mods.alt = e.altKey; S.mods.ctrl = e.ctrlKey || e.metaKey; S.dirty(); };

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  el.addEventListener('pointerleave', onLeave);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  S._bound = () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKeyUp);
  };
}

// -------------------------------------------------------------------------------------------- api

const api = {
  /** UI entry point: tools.api.select('road', {type:'avenue', mode:'curve'}) — null clears the tool. */
  select(name, opts) { selectTool_(name, opts); return S.toolName; },
  setOption(k, v) { S.setOption(k, v); },
  options() { return { ...S.options }; },
  current() { return S.toolName === 'select' ? null : S.toolName; },
  cancel() { try { S.tool?.cancel(); } catch (e) { /* isolated */ } },
  undo() { const e = S.undo.undo(); S.dirty(); if (e) S.ctx.events.emit('tool:undo', { label: e.label }); return e?.label || null; },
  redo() { const e = S.undo.redo(); S.dirty(); if (e) S.ctx.events.emit('tool:redo', { label: e.label }); return e?.label || null; },
  history() { return S.undo.labels(); },
  /** Programmatic selection (also what a click does). */
  selectObject(kind, id) { setSelection(kind, id); },
  pick(x, z) { return pick(x, z); },
  /** Dev/showcase: move the virtual cursor and drive a draft without a mouse. */
  setHover(x, z) {
    const y = S.ctx.world.terrain.getHeight(x, z);
    S.hover = { x, y, z };
    try { S.tool?.hover(S.hover); } catch (e) { /* isolated */ }
    S.dirty();
    return S.hover;
  },
  beginAt(x, z) { S.tools.road._begin(x, z); S.dirty(); },
  controlAt(x, z) { S.tools.road._control(x, z); S.dirty(); },
  state() { return { tool: S.toolName, options: { ...S.options }, hover: S.hover, selection: { ...S.ctx.world.selection }, history: S.undo.labels(), tool_state: S.tool?.state?.() || null }; },
  cropRects({ project }) {
    const out = {};
    const p = S.tools.road?.state?.().preview;
    if (p && p.path?.length) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const T = S.ctx.world.terrain;
      for (const q of p.path) {
        const [px, py] = project(q.x, T.getHeight(q.x, q.z) + 1, q.z);
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      out.ghost = [Math.round(x0) - 12, Math.round(y0) - 12, Math.round(x1 - x0) + 24, Math.round(y1 - y0) + 24];
    }
    const sel = S.ctx.world.selection;
    if (sel.kind && sel.id != null) {
      const d = selectionData();
      if (d && d.x !== undefined) {
        const [px, py] = project(d.x, S.ctx.world.terrain.getHeight(d.x, d.z) + 4, d.z);
        out.selection = [px - 90, py - 60, 180, 120];
      }
    }
    return out;
  },
  serialize() { return { selection: { ...S.ctx.world.selection } }; },
  deserialize(data) { if (data?.selection) setSelection(data.selection.kind, data.selection.id); },
};

// ----------------------------------------------------------------------------------------- module

export default {
  name: 'tools',
  dependencies: ['terrain', 'roads', 'zoning'],
  budget: { drawCalls: 12, triangles: 90_000 },

  async init(ctx) {
    S.ctx = ctx;
    S.giz = new Gizmos(ctx);
    S.chips = new Chips(ctx);
    S.undo = new UndoStack(ctx.log);
    S.tools = {
      road: roadTool(S), zone: zoneTool(S), terrain: terrainTool(S), service: serviceTool(S),
      prop: propTool(S), bulldoze: bulldozeTool(S), select: selectTool(S),
    };
    S.toolName = 'select'; S.tool = S.tools.select; S.options = { ...DEFAULTS.select };
    ctx.world.selection.kind = null; ctx.world.selection.id = null;

    ctx.events.on('ui:action', (p) => {
      if (!p || !p.action) return;
      const a = p.action, args = p.args || [];
      if (a === 'selectTool') selectTool_(args[0], args[1]);
      else if (a === 'undo') api.undo();
      else if (a === 'redo') api.redo();
      else if (a === 'cancelTool' || a === 'closeInfo') { if (a === 'closeInfo') setSelection(null, null); else api.cancel(); }
      else if (a === 'toolOption' && args.length >= 3) S.setOption(args[1], args[2]);
    }, 'tools');
    // a road or building disappearing under the selection invalidates it
    ctx.events.on('roads:changed', (p) => {
      S.dirty();
      const sel = ctx.world.selection;
      if (sel.kind === 'road' && p?.removed?.includes(sel.id)) setSelection(null, null);
    }, 'tools');
    ctx.events.on('terrain:changed', () => S.dirty(), 'tools');
    ctx.events.on('buildings:changed', () => S.dirty(), 'tools');

    if (!ctx.headless) bindInput(ctx);
    ctx.log.info(`ready — ${Object.keys(S.tools).length} tools, budget ${this.budget.drawCalls} draws`);
  },

  update(dt, ctx) {
    S.giz.update(dt);
    if (S._toast) { S._toast.t -= dt; if (S._toast.t <= 0) { S._toast = null; S.dirty(); } }
    try { S.tool?.tick?.(dt); } catch (e) { ctx.log.error(`${S.toolName}.tick failed: ${e?.message}`, e); }
    if (S._dirty) rebuild();
    S.chips.flush();
  },

  dispose(ctx) {
    S._bound?.(); S._bound = null;
    S.chips?.dispose();
    S.giz?.dispose();
    S.undo?.clear();
    S.tool = null; S.tools = null; S.giz = null; S.chips = null; S.ctx = null;
  },

  api,

  showcase: {
    description: 'A ghost avenue being drawn across a street grid with live length / angle / grade / price chips, the zoning brush over a block, a service ghost with its coverage circle, and a highlighted road selection.',
    cameras: CAMERAS,
    async setup(ctx) {
      S._showcase = true;
      await stage(ctx, S, api);
    },
  },
};
