// tools — the player's hands: road drawing (straight / curved / freehand, node + edge + angle + grid
// snapping, a terrain-conforming opaque ghost ribbon with live length / angle / grade / price chips,
// red when invalid), the zoning brush, terrain sculpting, bulldozing, service placement with a
// filled footprint and a coverage annulus, click-to-select, an undo/redo stack and a virtual cursor
// so a headless probe or the showcase can drive every one of them without a mouse.
//
// Owns world.selection. Emits tool:changed (de-duplicated), tool:preview (≤ 20 Hz) and
// selection:changed. Everything it changes in another module's world section goes through that
// section's published API; every charge goes through ctx.modules.simulation.spend / .earn.
// It creates no DOM: every readout is 3D geometry in ctx.group on LAYERS.HELPERS.
import { Gizmos, GIZMO_COLORS as GC } from './gizmos.js';
import { Chips, ICON } from './chips.js';
import { UndoStack, UNDO_CAPACITY } from './undo.js';
import { roadTool, zoneTool, terrainTool, serviceTool, propTool, bulldozeTool, forwardTool, sampleCurve } from './tools.js';
import { DEMOLISH, RULES, roadPerMetre, ROAD_MULT, TERRAIN_COST_PER_M3, ZONE_COST, PROP_COST, serviceDef, money } from './costs.js';
import { ZONE_PREVIEW_ALPHA } from './zonecolors.js';
import { stage, CAMERAS, POSES, DESCRIPTION } from './showcase.js';

export const ACCEPTED = ['road', 'zone', 'terrain', 'prop', 'bulldoze', 'service', 'transit', 'infoview'];

const DEFAULTS = {
  road: { type: 'street', oneWay: false, junction: 'crossing', mode: 'straight', elevation: 0, snap: ['magnet'] },
  zone: { type: 'residential', density: 'low', brush: 'paint', size: 24 },
  terrain: { mode: 'raise', size: 40, strength: 50 },
  prop: { kind: 'tree_oak', mode: 'single', spacing: 12 },
  bulldoze: { mode: 'single' },
  service: { kind: 'clinic' },
  transit: {},
  infoview: {},
};

const S = {
  ctx: null, giz: null, chips: null, undo: null, tools: null,
  toolName: null, tool: null, options: {},
  cursor: null, mods: { shift: false, alt: false, ctrl: false },
  poses: [], poseSpec: null,
  landmark: { ribbon: null, wash: null },
  clock: 0, previewAt: -1, previewDirty: false, _emitting: false,
  _dirty: true, _bound: null, _visible: true, _ms: 0, _freeBuild: false,
  lastEmit: { tool: undefined, options: '' },

  dirty() { S._dirty = true; S.previewDirty = true; },

  // ---- money: always through simulation, never world.economy (spec §7)
  afford(n) {
    if (S._freeBuild) return true;
    const sim = S.ctx.modules.simulation;
    if (typeof sim?.canAfford !== 'function') return true;      // no simulation ⇒ affordable
    return sim.canAfford(Math.max(0, Math.round(n || 0)));
  },
  spend(n, why) {
    const a = Math.max(0, Math.round(n || 0));
    if (!a || S._freeBuild) return;          // the staged demo district is authored, not purchased
    const sim = S.ctx.modules.simulation;
    if (typeof sim?.spend === 'function') sim.spend(a);
    S.ctx.events.emit('tool:spend', { amount: a, reason: why || '' });
  },
  refund(n) {
    const a = Math.max(0, Math.round(n || 0));
    if (!a || S._freeBuild) return;
    const sim = S.ctx.modules.simulation;
    if (typeof sim?.earn === 'function') sim.earn(a);
  },

  pushUndo(e) { return S.undo.push(e, S.clock); },
  beginGroup(label) { S.undo.beginGroup(label); },
  endGroup() { S.undo.endGroup(); },
  setSelection(kind, id) { return setSelection(kind, id); },
  clearSelection() { setSelection(null, null); },
  pick(x, z) { return pick(x, z); },
  pickArea(x0, z0, x1, z1) { return pickArea(x0, z0, x1, z1); },
  demolish(t) { return demolish(t); },
  refundOf(t) { return refundOf(t); },
  edgePath(id) { return edgePath(id); },
  snapshotHeights(points) { return snapshotHeights(points); },
  restoreHeights(s) { return restoreHeightRect(s); },
  snapshotHeightRect(x, z, r) { return snapshotHeightRect(x, z, r); },
  restoreHeightRect(s) { return restoreHeightRect(s); },
};

// ------------------------------------------------------------------------------- terrain snapshots
// Reading world.terrain.heights to snapshot is sanctioned (spec §7). Writing it back is legal on the
// undo path only, because modify()'s radial 1-r²(3-2r) falloff cannot restore recorded heights to
// 1e-3 m; roads already sets that precedent (roads/build.js:645-661). It goes away the day the
// setHeights core request lands (docs/core-requests/tools.md).

function snapshotHeightRect(cx, cz, r) {
  const t = S.ctx.world.terrain;
  if (!t.heights) return null;
  const res = t.resolution, cell = t.cellSize, half = (res - 1) * cell / 2;
  const m = 12;
  const cl = (v) => Math.max(0, Math.min(res - 1, v));
  const ix0 = cl(Math.floor((cx - r + half) / cell) - m), ix1 = cl(Math.ceil((cx + r + half) / cell) + m);
  const iz0 = cl(Math.floor((cz - r + half) / cell) - m), iz1 = cl(Math.ceil((cz + r + half) / cell) + m);
  const w = ix1 - ix0 + 1, h = iz1 - iz0 + 1;
  if (w <= 0 || h <= 0) return null;
  const data = new Float32Array(w * h);
  for (let iz = 0; iz < h; iz++) data.set(t.heights.subarray((iz0 + iz) * res + ix0, (iz0 + iz) * res + ix1 + 1), iz * w);
  return { ix0, iz0, w, h, data, res, cell, half };
}

function snapshotHeights(points) {
  if (!points || !points.length) return null;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of points) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const r = Math.max(x1 - x0, z1 - z0) / 2 + 40;
  return snapshotHeightRect(cx, cz, r);
}

function restoreHeightRect(snap) {
  const t = S.ctx.world.terrain;
  if (!snap || !t.heights) return false;
  for (let iz = 0; iz < snap.h; iz++) {
    t.heights.set(snap.data.subarray(iz * snap.w, (iz + 1) * snap.w), (snap.iz0 + iz) * snap.res + snap.ix0);
  }
  const cx = (snap.ix0 + snap.w / 2) * snap.cell - snap.half;
  const cz = (snap.iz0 + snap.h / 2) * snap.cell - snap.half;
  const r = Math.hypot(snap.w, snap.h) * 0.5 * snap.cell + snap.cell * 2;
  t.modify({ x: cx, z: cz, radius: r, strength: 0, mode: 'raise' });   // bump version + emit terrain:changed
  return true;
}

// ------------------------------------------------------------------------------------- selection

function setSelection(kind, id) {
  const sel = S.ctx.world.selection;
  const k = kind ?? null, i = (k === null ? null : (id ?? null));
  if (sel.kind === k && sel.id === i) return false;
  sel.kind = k;
  sel.id = i;
  S.dirty();
  S.ctx.events.emit('selection:changed', { kind: sel.kind, id: sel.id });
  return true;
}

function selectionData() {
  const w = S.ctx.world, sel = w.selection;
  if (!sel.kind || sel.id === null || sel.id === undefined) return null;
  switch (sel.kind) {
    case 'building': return w.buildings.items.get(sel.id) || null;
    case 'road': return w.roads.edges.get(sel.id) || null;
    case 'node': return w.roads.nodes.get(sel.id) || null;
    case 'prop': return w.props.items.get(sel.id) || null;
    case 'service': return w.services.items.get(sel.id) || null;
    case 'lot': return w.zones.lots?.get(sel.id) || null;
    case 'zone': return w.zones.cells?.get(sel.id) || null;
    default: return null;
  }
}

/** World pick: buildings first, then services, props, and finally roads. */
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
    const def = serviceDef(s.kind, S.ctx.modules);
    const c = Math.cos(-(s.heading || 0)), si = Math.sin(-(s.heading || 0));
    const dx = x - s.x, dz = z - s.z;
    const u = dx * c - dz * si, v = dx * si + dz * c;
    if (Math.abs(u) <= def.w / 2 && Math.abs(v) <= def.d / 2) {
      return { kind: 'service', id: s.id, x: s.x, z: s.z, heading: s.heading || 0, w: def.w, d: def.d, height: def.h, label: def.label };
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
  if (ne && ne.edge && ne.dist <= (ne.edge.width || 16) / 2 + 2) {
    const e = ne.edge;
    return { kind: 'road', id: e.id, x: ne.point.x, z: ne.point.z, heading: 0, w: e.width || 16, d: 6, height: 3, width: e.width || 16, label: `${e.type} · ${Math.round(e.length)} m` };
  }
  return null;
}

function pickArea(x0, z0, x1, z1) {
  const w = S.ctx.world, res = [];
  const inside = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
  for (const b of w.buildings.items.values()) {
    if (!inside(b.x, b.z)) continue;
    res.push({
      kind: 'building', id: b.id, x: b.x, z: b.z, heading: b.heading || 0,
      w: b.footprint?.w || 16, d: b.footprint?.d || 16, height: b.height || 10,
      label: `${b.type || 'building'} · L${b.level || 1}`,
    });
  }
  for (const s of w.services.items.values()) {
    if (!inside(s.x, s.z)) continue;
    const def = serviceDef(s.kind, S.ctx.modules);
    res.push({ kind: 'service', id: s.id, x: s.x, z: s.z, heading: s.heading || 0, w: def.w, d: def.d, height: def.h, label: def.label });
  }
  for (const p of w.props.items.values()) {
    if (!inside(p.x, p.z)) continue;
    res.push({ kind: 'prop', id: p.id, x: p.x, z: p.z, heading: p.heading || 0, w: 2.2, d: 2.2, height: 6, label: String(p.kind) });
    if (res.length > 180) break;
  }
  return res.slice(0, 200);
}

function refundOf(t) {
  if (!t) return 0;
  const w = S.ctx.world;
  if (t.kind === 'road') {
    const e = w.roads.edges.get(t.id);
    if (!e) return 0;
    return Math.round(roadPerMetre(e.type, e.oneWay) * (e.length || 0) * DEMOLISH.roadRefund);
  }
  if (t.kind === 'service') {
    const s = w.services.items.get(t.id);
    return s ? Math.round(serviceDef(s.kind, S.ctx.modules).cost * DEMOLISH.serviceRefund) : 0;
  }
  if (t.kind === 'prop') return Math.round((PROP_COST[t.label?.replace(/ /g, '_')] ?? 50) * DEMOLISH.propRefund);
  return 0;
}

function demolish(t) {
  if (!t) return null;
  const w = S.ctx.world;
  if (t.kind === 'road') {
    const e = w.roads.edges.get(t.id);
    if (!e) return null;
    const a = w.roads.nodes.get(e.a), b = w.roads.nodes.get(e.b);
    if (!a || !b) return null;
    const desc = { ax: a.x, az: a.z, bx: b.x, bz: b.z, type: e.type, lanes: e.lanes, oneWay: e.oneWay, ctrl: e.ctrl ? { ...e.ctrl } : null };
    const refund = refundOf(t);
    w.roads.removeEdge(t.id);
    S.refund(refund);
    let cur = t.id;
    S.pushUndo({
      label: `demolish:road`, cost: -refund, key: 'demolish', fromDrag: false,
      undo() {
        const na = w.roads.addNode(desc.ax, desc.az), nb = w.roads.addNode(desc.bx, desc.bz);
        cur = w.roads.addEdge(na, nb, desc.type, { lanes: desc.lanes, oneWay: desc.oneWay, ctrl: desc.ctrl });
        S.spend(refund, 'undo demolish');
      },
      redo() { w.roads.removeEdge(cur); S.refund(refund); },
    });
    if (w.selection.kind === 'road' && w.selection.id === t.id) setSelection(null, null);
    return { refund, cost: 0 };
  }
  if (t.kind === 'building') {
    const b = w.buildings.items.get(t.id);
    const lot = b?.lot || (b?.lotId != null ? w.zones.lots?.get(b.lotId) : null);
    const x = t.x, z = t.z;
    w.buildings.demolish?.(t.id);
    S.spend(DEMOLISH.building, 'demolish');
    S.pushUndo({
      label: 'demolish:building', cost: DEMOLISH.building, key: 'demolish', fromDrag: false,
      undo() { if (lot) S.ctx.modules.buildings?.requestSpawn?.(lot); S.ctx.modules.buildings?.flush?.(); S.refund(DEMOLISH.building); },
      redo() { const nb = w.buildings.at?.(x, z); if (nb) w.buildings.demolish?.(nb.id); S.ctx.modules.buildings?.flush?.(); S.spend(DEMOLISH.building, 'demolish'); },
    });
    if (w.selection.kind === 'building' && w.selection.id === t.id) setSelection(null, null);
    return { refund: 0, cost: DEMOLISH.building };
  }
  if (t.kind === 'service') {
    const s = w.services.items.get(t.id);
    if (!s) return null;
    const kind = s.kind, x = s.x, z = s.z, heading = s.heading || 0;
    const refund = refundOf(t);
    w.services.remove?.(t.id);
    S.refund(refund);
    let cur = t.id;
    S.pushUndo({
      label: 'demolish:service', cost: -refund, key: 'demolish', fromDrag: false,
      undo() { cur = w.services.place?.(kind, x, z, heading); S.spend(refund, 'undo'); },
      redo() { w.services.remove?.(cur); S.refund(refund); },
    });
    if (w.selection.kind === 'service' && w.selection.id === t.id) setSelection(null, null);
    return { refund, cost: 0 };
  }
  return null;
}

function edgePath(id) {
  const w = S.ctx.world;
  const e = w.roads.edges.get(id);
  if (!e) return null;
  const n = Math.max(2, Math.min(120, Math.round((e.length || 20) / RULES.ghostSample)));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = w.roads.sample?.(id, i / n);
    if (p) out.push({ x: p.x, z: p.z });
  }
  return out.length >= 2 ? out : null;
}

// --------------------------------------------------------------------------------- tool selection

function sameOptions(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    const va = a[k], vb = b[k];
    if (Array.isArray(va) && Array.isArray(vb)) { if (va.length !== vb.length || va.some((v, i) => v !== vb[i])) return false; }
    else if (va !== vb) return false;
  }
  return true;
}

function emitChanged() {
  // de-duplicated: identical tool + deep-equal options emits nothing (spec §2)
  const key = JSON.stringify(S.options);
  if (S.lastEmit.tool === S.toolName && S.lastEmit.options === key) return;
  S.lastEmit.tool = S.toolName;
  S.lastEmit.options = key;
  if (S._emitting) return;            // re-entrancy is banned (spec item 16)
  S._emitting = true;
  try { S.ctx.events.emit('tool:changed', { tool: S.toolName, options: { ...S.options } }); }
  finally { S._emitting = false; }
}

function selectTool_(name, opts) {
  if (name === null || name === undefined) {
    if (S.tool) { try { S.tool.deactivate(); } catch (e) { /* isolated */ } }
    S.toolName = null; S.tool = null; S.options = {};
    S.giz.hideAll(); S.chips.reset();
    S.dirty();
    emitChanged();
    return null;
  }
  const key = String(name);
  if (!ACCEPTED.includes(key)) {
    S.ctx.log.warn(`select("${key}") — not one of ${ACCEPTED.join('/')}`);
    return null;
  }
  const prev = S.toolName;
  if (prev !== key && S.tool) { try { S.tool.deactivate(); } catch (e) { /* isolated */ } }
  S.toolName = key;
  S.tool = S.tools[key];
  S.options = { ...(DEFAULTS[key] || {}), ...(opts || {}) };
  try { S.tool.activate(S.options); } catch (e) { S.ctx.log.error(`${key}.activate failed`, e); }
  S.dirty();
  emitChanged();
  return { tool: S.toolName, options: { ...S.options } };
}

// ---------------------------------------------------------------------------------------- drawing

function drawSelection() {
  const g = S.giz;
  const w = S.ctx.world, sel = w.selection;
  if (!sel.kind || sel.id === null || sel.id === undefined) return;
  const data = selectionData();
  if (!data) return;
  if (sel.kind === 'road') {
    const path = edgePath(sel.id);
    if (path) g.selectionPath(path, data.width || 16);
    const mid = path ? path[Math.floor(path.length / 2)] : { x: data.x || 0, z: data.z || 0 };
    S.chips.add(mid.x, w.terrain.getHeight(mid.x, mid.z) + 3, mid.z, ICON.info, `${data.type} · ${Math.round(data.length || 0)} m`, '', 0, -22, '', 1);
    return;
  }
  let x = data.x ?? 0, z = data.z ?? 0, wd = 12, dp = 12, h = 8, heading = data.heading || 0, label = sel.kind;
  if (sel.kind === 'building') { wd = data.footprint?.w || 16; dp = data.footprint?.d || 16; h = data.height || 12; label = `${data.type} · level ${data.level || 1}`; }
  else if (sel.kind === 'service') { const d = serviceDef(data.kind, S.ctx.modules); wd = d.w; dp = d.d; h = d.h; label = d.label; }
  else if (sel.kind === 'node') { wd = dp = 14; h = 3; label = 'Intersection'; }
  else if (sel.kind === 'prop') { wd = dp = 2.6; h = 6; label = String(data.kind).replace(/_/g, ' '); }
  g.selectionOutline(x, z, wd, dp, heading);
  S.chips.add(x, w.terrain.getHeight(x, z) + h + 1, z, ICON.info, label, '', 0, -20, '', 1);
}

function rebuild() {
  S._dirty = false;
  S.chips.reset();
  S.giz.beginLift();
  S.giz.beginFlat();
  S.giz.beginDiscs();
  S.giz.clearGhost();
  S.giz.clearGhostAlt();
  S.landmark.ribbon = null; S.landmark.wash = null;
  if (S._visible) {
    try {
      if (S.poses.length) { for (const p of S.poses) S.tools[p.tool]?.draw(p); }
      else if (S.tool) S.tool.draw();
    } catch (e) { S.ctx.log.error(`${S.toolName || 'pose'}.draw failed: ${e?.message || e}`, e); }
    try { drawSelection(); } catch (e) { S.ctx.log.error(`selection draw failed: ${e?.message || e}`, e); }
  }
  S.giz.endFlat();
  S.giz.endDiscs();
}

/** tool:preview, throttled to ≤ 20 Hz of game time (spec §2). Called eagerly so a synchronous
 *  probe loop still sees exactly one emission for 200 pointer() calls, and again from update(). */
function maybeEmitPreview() {
  if (!S.previewDirty || !S.toolName) return;
  if (S.previewAt >= 0 && S.clock - S.previewAt < 0.05) return;
  S.previewDirty = false;
  S.previewAt = S.clock;
  const st = api.state();
  S.ctx.events.emit('tool:preview', { kind: S.toolName, points: st.points });
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
  const guard = (fn) => { try { return fn(); } catch (e) { ctx.log.error(`${S.toolName} input failed: ${e?.message || e}`, e); return undefined; } };
  let down = false, moved = 0;

  const onMove = (e) => {
    const p = groundAt(e.clientX, e.clientY);
    if (!p) return;
    moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    guard(() => api.pointer(p.x, p.z));
  };
  const onDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) return;   // camera owns MMB / shift-LMB
    const p = groundAt(e.clientX, e.clientY);
    if (!p) return;
    down = true; moved = 0;
    guard(() => api.pointer(p.x, p.z));
    if (e.button === 0) { guard(() => api.click(0)); e.preventDefault(); }
  };
  const onUp = (e) => {
    if (e.button === 2 && moved < 6) guard(() => api.rightClick());
    down = false;
  };
  const onLeave = () => { S.cursor = null; S.dirty(); };
  const onKey = (e) => {
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('input,textarea,select')) return;
    S.mods.shift = e.shiftKey; S.mods.alt = e.altKey; S.mods.ctrl = e.ctrlKey || e.metaKey;
    if (e.ctrlKey || e.metaKey) {
      if (e.code === 'KeyZ' && !e.shiftKey) { api.undo(); e.preventDefault(); return; }
      if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { api.redo(); e.preventDefault(); return; }
      return;
    }
    if (e.code === 'Escape') { api.cancel(); api.select(null); api.clearSelection(); return; }
    if (e.code === 'Enter') { api.commit(); return; }
    const map = { Digit1: 'road', Digit2: 'zone', Digit3: 'terrain', Digit4: 'prop', Digit5: 'service', Digit6: 'bulldoze', KeyB: 'bulldoze' };
    if (map[e.code]) api.select(map[e.code]);
    else if (e.code === 'Digit0') api.select(null);
  };
  const onKeyUp = (e) => { S.mods.shift = e.shiftKey; S.mods.alt = e.altKey; S.mods.ctrl = e.ctrlKey || e.metaKey; };

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
    void down;
  };
}

// -------------------------------------------------------------------------------------------- api

const EMPTY_STATE = () => ({
  tool: null, options: {}, phase: 'idle', points: [], cursor: null, valid: false, reason: null,
  cost: 0, refund: 0, affordable: true, snap: null,
  metrics: { length: 0, angle: 0, grade: 0, cells: 0, volume: 0, items: 0 },
});

const api = {
  // ---- tool selection
  select(name, options) { return selectTool_(name, options); },
  setOption(id, value) {
    if (!S.tool || !id) return { ...S.options };
    S.options[id] = value;
    if (DEFAULTS[S.toolName]) DEFAULTS[S.toolName][id] = value;
    S.dirty();
    emitChanged();
    return { ...S.options };
  },
  current() { return S.toolName ? { tool: S.toolName, options: { ...S.options } } : null; },
  options() { return { ...S.options }; },

  // ---- virtual cursor
  pointer(x, z) {
    const y = S.ctx.world.terrain.getHeight(x, z);
    S.cursor = { x, y, z };
    try { S.tool?.pointer(S.cursor); } catch (e) { S.ctx.log.error(`${S.toolName}.pointer failed`, e); }
    S.dirty();
    maybeEmitPreview();
    return api.state();
  },
  pointerNdc(ndcX, ndcY) {
    const p = S.ctx.camera.screenToGround(ndcX, ndcY);
    if (!p) return api.state();
    return api.pointer(p.x, p.z);
  },
  click(button = 0, ...rest) {
    if (!S.tool) return { ok: false, cost: 0, reason: 'No tool' };
    try {
      const r = S.tool.click(button, ...rest) || { ok: false, cost: 0 };
      S.dirty();
      return { ok: !!r.ok, id: r.id, cost: Math.max(0, Math.round(r.cost || 0)), reason: r.reason ?? undefined };
    } catch (e) { S.ctx.log.error(`${S.toolName}.click failed`, e); return { ok: false, cost: 0, reason: 'error' }; }
  },
  rightClick() {
    if (!S.tool) return { ok: false, reason: 'No tool' };
    try { const r = S.tool.rightClick() || { ok: false }; S.dirty(); return { ok: !!r.ok, reason: r.reason ?? undefined }; }
    catch (e) { S.ctx.log.error(`${S.toolName}.rightClick failed`, e); return { ok: false, reason: 'error' }; }
  },
  commit() {
    if (!S.tool) return null;
    try {
      const r = S.tool.commit() || { ok: false, ids: [], cost: 0 };
      S.dirty();
      return { ok: !!r.ok, ids: r.ids || [], cost: Math.max(0, Math.round(r.cost || 0)), reason: r.reason ?? undefined };
    } catch (e) { S.ctx.log.error(`${S.toolName}.commit failed`, e); return { ok: false, ids: [], cost: 0, reason: 'error' }; }
  },
  cancel() { try { S.tool?.cancel(); } catch (e) { /* isolated */ } S.dirty(); },

  state() {
    if (!S.tool) return { ...EMPTY_STATE(), cursor: S.cursor ? { ...S.cursor } : null };
    let s;
    try { s = S.tool.state(); } catch (e) { S.ctx.log.error(`${S.toolName}.state failed`, e); s = null; }
    const base = EMPTY_STATE();
    const cost = Math.max(0, Math.round(s?.cost || 0));
    return {
      tool: S.toolName,
      options: { ...S.options },
      phase: s?.phase || 'idle',
      points: s?.points || [],
      cursor: S.cursor ? { x: S.cursor.x, y: S.cursor.y, z: S.cursor.z } : null,
      valid: !!s?.valid,
      reason: s?.reason ?? null,
      cost,
      refund: Math.max(0, Math.round(s?.refund || 0)),
      affordable: S.afford(cost),
      snap: s?.snap ?? null,
      metrics: { ...base.metrics, ...(s?.metrics || {}) },
    };
  },

  // ---- history
  undo() { const e = S.undo.undo(); if (e) { S.dirty(); S.ctx.events.emit('tool:undo', { label: e.label }); } return !!e; },
  redo() { const e = S.undo.redo(); if (e) { S.dirty(); S.ctx.events.emit('tool:redo', { label: e.label }); } return !!e; },
  history() { return S.undo.report(); },

  /** Integer ¢, never NaN/Infinity, with or without simulation. */
  costOf(tool, options = {}, geometry = {}) {
    const fin = (v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
    try {
      if (tool === 'road') {
        const pts = geometry.points || geometry.path || [];
        if (pts.length < 2) return 0;
        let c = 0;
        for (let i = 1; i < pts.length; i++) {
          const sub = sampleCurve(pts[i - 1], pts[i], null);
          let len = 0;
          for (let k = 1; k < sub.length; k++) len += Math.hypot(sub[k].x - sub[k - 1].x, sub[k].z - sub[k - 1].z);
          let seg = roadPerMetre(options.type || 'street', options.oneWay) * len;
          if (Math.abs(options.elevation || 0) > 1) seg *= ROAD_MULT.elevated;
          c += seg;
        }
        return fin(c);
      }
      if (tool === 'zone') return fin((geometry.cells || 0) * (ZONE_COST[options.density || 'low'] ?? ZONE_COST.low));
      if (tool === 'terrain') {
        const r = Math.max(1, (options.size ?? 40) / 2);
        const s = Math.max(0.05, (options.strength ?? 50) / 100);
        return fin(0.3 * Math.PI * r * r * s * 1.1 * TERRAIN_COST_PER_M3 * (geometry.dabs || 1));
      }
      if (tool === 'service') return fin(serviceDef(options.kind || 'clinic', S.ctx.modules).cost);
      if (tool === 'prop') return fin((PROP_COST[options.kind] ?? 50) * (geometry.count || 1));
      if (tool === 'bulldoze') return fin((geometry.count || 0) * DEMOLISH.building);
      return 0;
    } catch (e) { return 0; }
  },

  // ---- selection
  setSelection(kind, id) { setSelection(kind, id); const s = S.ctx.world.selection; return s.kind === (kind ?? null); },
  clearSelection() { setSelection(null, null); },
  pickAt(x, z) { const t = pick(x, z); return t ? { kind: t.kind, id: t.id } : null; },

  setPreviewVisible(v) { S._visible = !!v; S.dirty(); },

  /** Showcase helper: fold everything `fn` commits into one undo entry. Drives no world section. */
  _undoGroup(label, fn) { S.beginGroup(label); try { fn(); } finally { S.endGroup(); } },

  // ---- introspection
  stats() {
    const rects = S.chips.rects();
    const L = S.giz.lift;
    return {
      drawCalls: S.giz.visibleMeshes() + (S.chips.count > 0 ? 1 : 0),
      triangles: S.giz.triangles() + S.chips.count * 2,
      chips: S.chips.count,
      chipRects: rects,
      ghostVerts: S.giz.ghostVerts(),
      poses: S.poses.length,
      ms: +S._ms.toFixed(3),
      ghostLiftMin: Number.isFinite(L.min) ? L.min : 0,
      ghostLiftMax: Number.isFinite(L.max) ? L.max : 0,
      zonePreviewAlpha: ZONE_PREVIEW_ALPHA,
      undoCapacity: UNDO_CAPACITY,
    };
  },

  /**
   * Named landmark rects (ARCHITECTURE §8): a 64×64 box inside the ghost ribbon, the same box one
   * ribbon-width to the side of it on plain ground, and a 32×32 box on the affected-area wash.
   * The boxes shrink if the ribbon is narrower than 64 px on screen, so every sample stays *inside*
   * the thing it claims to measure.
   */
  cropRects({ project, width, height }) {
    const out = {};
    const T = S.ctx.world.terrain;
    const rb = S.landmark.ribbon;
    const fits = (r) => r && r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= width && r[1] + r[3] <= height;
    if (rb) {
      const c = project(rb.x, T.getHeight(rb.x, rb.z) + RULES.ghostLift, rb.z);
      const e = project(rb.x + rb.nx * rb.width * 0.5, T.getHeight(rb.x + rb.nx * rb.width * 0.5, rb.z + rb.nz * rb.width * 0.5) + RULES.ghostLift, rb.z + rb.nz * rb.width * 0.5);
      if (c && e && c[2] <= 1 && e[2] <= 1) {
        const halfPx = Math.hypot(e[0] - c[0], e[1] - c[1]);
        const size = Math.max(8, Math.min(64, Math.round(halfPx * 1.1)));
        const h = size >> 1;
        const r1 = [Math.round(c[0]) - h, Math.round(c[1]) - h, size, size];
        if (fits(r1)) out.ribbon = r1;
        // the ground box: one ribbon-width to the side, on whichever side is farther from a road
        let bestG = null, bestD = -1;
        for (const s of [1, -1]) {
          const gx = rb.x + rb.nx * rb.width * s, gz = rb.z + rb.nz * rb.width * s;
          const ne = S.ctx.world.roads.nearestEdge?.(gx, gz, 60);
          const d = ne ? ne.dist : 60;
          const p = project(gx, T.getHeight(gx, gz), gz);
          if (!p || p[2] > 1) continue;
          const r2 = [Math.round(p[0]) - h, Math.round(p[1]) - h, size, size];
          if (!fits(r2)) continue;
          if (d > bestD) { bestD = d; bestG = r2; }
        }
        if (bestG) out.ground = bestG;
      }
    }
    const wsh = S.landmark.wash;
    if (wsh) {
      const p = project(wsh.x, T.getHeight(wsh.x, wsh.z) + 0.19, wsh.z);
      if (p && p[2] <= 1) {
        const r = [Math.round(p[0]) - 16, Math.round(p[1]) - 16, 32, 32];
        if (fits(r)) out.wash = r;
      }
    }
    return out;
  },

  /** Showcase/probe only: pin (or tear down) the six poses. Never reachable from select(). */
  _showcasePoses(on) {
    if (!on) {
      const n = S.poses.length;
      S.poses = [];
      setSelection(null, null);      // the staged selection is part of the pose set
      S.dirty();
      rebuild();
      S.chips.flush();
      return n;
    }
    if (!S.poseSpec) return 0;
    S.poses = S.poseSpec();
    S.dirty();
    rebuild();
    S.chips.flush();
    return S.poses.length;
  },

  serialize() { return { options: { ...S.options }, selection: { ...S.ctx.world.selection } }; },
  deserialize(d) {
    if (!d) return;
    if (d.options && S.toolName) S.options = { ...S.options, ...d.options };
    if (d.selection) setSelection(d.selection.kind, d.selection.id);
  },
};

// ----------------------------------------------------------------------------------------- module

export default {
  name: 'tools',
  dependencies: ['terrain', 'roads', 'zoning', 'buildings', 'props', 'services', 'simulation'],
  budget: { drawCalls: 20, triangles: 40_000 },

  async init(ctx) {
    S.ctx = ctx;
    S.giz = new Gizmos(ctx);
    S.chips = new Chips(ctx);
    ctx.group.add(S.chips.mesh);
    S.undo = new UndoStack(ctx.log);
    S.tools = {
      road: roadTool(S), zone: zoneTool(S), terrain: terrainTool(S), service: serviceTool(S),
      prop: propTool(S), bulldoze: bulldozeTool(S),
      transit: forwardTool(S, 'transit'), infoview: forwardTool(S, 'infoview'),
    };
    S.toolName = null; S.tool = null; S.options = {};
    S.poses = []; S.poseSpec = null; S._visible = true; S._freeBuild = false;
    S.clock = 0; S.previewAt = -1;
    S.lastEmit.tool = undefined; S.lastEmit.options = '';
    ctx.world.selection.kind = null; ctx.world.selection.id = null;

    ctx.events.on('ui:action', (p) => {
      if (!p || !p.action) return;
      const a = p.action, args = p.args || [];
      if (a === 'selectTool') api.select(args[0], args[1]);
      else if (a === 'undo') api.undo();
      else if (a === 'redo') api.redo();
      else if (a === 'cancelTool') api.cancel();
      else if (a === 'closeInfo') api.clearSelection();
      else if (a === 'toolOption' && args.length >= 3) api.setOption(args[1], args[2]);
    }, 'tools');
    ctx.events.on('roads:changed', (p) => {
      S.dirty();
      const sel = ctx.world.selection;
      if (sel.kind === 'road' && p?.removed?.includes(sel.id)) setSelection(null, null);
    }, 'tools');
    ctx.events.on('terrain:changed', () => S.dirty(), 'tools');
    ctx.events.on('buildings:changed', () => S.dirty(), 'tools');

    if (!ctx.headless) bindInput(ctx);
    ctx.log.info(`ready — ${ACCEPTED.length} tools, budget ${this.budget.drawCalls} draws / ${this.budget.triangles} tris`);
  },

  update(dt, ctx) {
    const t0 = performance.now();
    S.clock += dt;
    S.giz.update(dt);
    if (S._dirty) rebuild();
    S.chips.flush();
    maybeEmitPreview();
    S._ms = performance.now() - t0;
    void ctx;
  },

  dispose(ctx) {
    S._bound?.(); S._bound = null;
    ctx.events.offOwner?.('tools');
    S.chips?.dispose();
    S.giz?.dispose();
    S.undo?.clear();
    S.tool = null; S.tools = null; S.giz = null; S.chips = null; S.poses = []; S.poseSpec = null; S.ctx = null;
  },

  api,

  showcase: {
    description: DESCRIPTION,
    cameras: CAMERAS,
    async setup(ctx) {
      S.poseSpec = () => POSES(ctx, S, api);
      await stage(ctx, S, api);
    },
  },
};

export { S as _state, GC as _colors, money as _money };
