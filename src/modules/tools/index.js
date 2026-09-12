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
import { LAYERS } from '../../core/constants.js';
import { Gizmos, GIZMO_COLORS as GC } from './gizmos.js';
import { Chips, ICON } from './chips.js';
import { UndoStack, UNDO_CAPACITY } from './undo.js';
import { roadTool, zoneTool, terrainTool, serviceTool, propTool, bulldozeTool, forwardTool, sampleCurve } from './tools.js';
import { DEMOLISH, RULES, roadPerMetre, ROAD_MULT, TERRAIN_COST_PER_M3, ZONE_COST, PROP_COST, serviceDef, money } from './costs.js';
import { ZONE_PREVIEW_ALPHA } from './zonecolors.js';
import { stage, CAMERAS, POSES, DESCRIPTION } from './showcase.js';
import { propBounds, propVictim } from './footprints.js';
import { washCrop, ribbonLandmark } from './landmarks.js';

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
  cursor: null, failure: null, _cameraHadHelpers: false, mods: { shift: false, alt: false, ctrl: false },
  poses: [], poseSpec: null,
  landmark: { ribbon: null, wash: null, path: null, width: 0 },
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
// Read snapshots through the published height field; restore through terrain.setHeights so all
// derived data and road geometry are refreshed without applying cut/fill again.

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
  if (!points?.length) return null;
  // Road rebuilds cut/fill the entire network, so capture the full height field rather than only
  // the new segment. A 513² Float32 snapshot is ~1 MiB; retained only with the bounded undo entry.
  return snapshotHeightRect(0, 0, S.ctx.world.size);
}

function restoreHeightRect(snap) {
  const t = S.ctx.world.terrain;
  if (!snap || !t.heights) return false;
  if (typeof t.setHeights !== 'function') return false;
  const result = t.setHeights(snap.ix0, snap.iz0, snap.ix0 + snap.w - 1, snap.iz0 + snap.h - 1, snap.data, { restore: true });
  const roads = S.ctx.modules.roads;
  const rebuilt = typeof roads?.rebuild === 'function' ? roads.rebuild({ preserveTerrain: true }) : true;
  return result !== false && rebuilt !== false;
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
    const c = Math.cos(s.heading || 0), si = Math.sin(s.heading || 0);
    const dx = x - s.x, dz = z - s.z;
    const u = dx * c - dz * si, v = dx * si + dz * c;
    if (Math.abs(u) <= def.w / 2 && Math.abs(v) <= def.d / 2) {
      return { kind: 'service', id: s.id, x: s.x, z: s.z, heading: -(s.heading || 0), w: def.w, d: def.d, height: def.h, label: def.label };
    }
  }
  if (w.props.items.size && w.props.items.size < 40000) {
    let best = null, bd = 2.6;
    for (const p of w.props.items.values()) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) return propVictim(best, S.ctx.modules);
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
    res.push({ kind: 'service', id: s.id, x: s.x, z: s.z, heading: -(s.heading || 0), w: def.w, d: def.d, height: def.h, label: def.label });
  }
  for (const p of w.props.items.values()) {
    if (!inside(p.x, p.z)) continue;
    res.push(propVictim(p, S.ctx.modules));
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
    const clone = (value) => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
    const roadsApi = S.ctx.modules.roads, zoningApi = S.ctx.modules.zoning, buildingsApi = S.ctx.modules.buildings;
    try {
      if (zoningApi?.settleForHistory?.() === false) return null;
    } catch (error) {
      S.ctx.log.warn(`road demolition settlement rejected: ${error?.message || error}`);
      return null;
    }
    const roadsBefore = clone(roadsApi?.serialize?.());
    const zoningBefore = clone(zoningApi?.serialize?.());
    const buildingsBefore = clone(buildingsApi?.serialize?.());
    const heightsBefore = S.snapshotHeights([{ x: a.x, z: a.z }, { x: b.x, z: b.z }]);
    if (!roadsBefore || !zoningBefore || !buildingsBefore || !heightsBefore ||
        typeof roadsApi?.restoreTransaction !== 'function' || typeof roadsApi?.rebuild !== 'function' ||
        typeof buildingsApi?.restoreTransaction !== 'function') return null;
    const refund = refundOf(t);
    w.roads.removeEdge(t.id);
    if (roadsApi.rebuild() === false) {
      // The graph changed, but the owner could not complete its derived geometry. Restore the
      // exact graph/profile/allocator, terrain and dependent owner snapshots before exposing a
      // failed demolition. The temporary roads:changed event has already dirtied Zoning even
      // though no successful action will exist to settle it later.
      const repaired = roadsApi.restoreTransaction(roadsBefore) !== false &&
        S.restoreHeights(heightsBefore) !== false &&
        zoningApi.deserialize(zoningBefore) !== false &&
        buildingsApi.deserialize(buildingsBefore) !== false &&
        S.ctx.modules.simulation?.reconcileWorld?.() !== false;
      if (!repaired) S.ctx.log.error('road demolition commit compensation failed');
      return null;
    }
    const roadsAfter = clone(roadsApi.serialize());
    const heightsAfter = S.snapshotHeights([{ x: a.x, z: a.z }, { x: b.x, z: b.z }]);
    S.refund(refund);
    const changedLotIds = (target, current) => {
      const left = new Map((target?.lots || []).map(row => [row.key, row.id]));
      const right = new Map((current?.lots || []).map(row => [row.key, row.id]));
      const ids = new Set();
      for (const key of new Set([...left.keys(), ...right.keys()])) {
        if (left.get(key) === right.get(key)) continue;
        if (Number.isInteger(left.get(key))) ids.add(left.get(key));
        if (Number.isInteger(right.get(key))) ids.add(right.get(key));
      }
      return [...ids];
    };
    const rollbackOwners = (snap) => {
      if (!roadsApi.restoreTransaction(snap.roads)) return false;
      if (!S.restoreHeights(snap.heights)) return false;
      if (zoningApi.deserialize(snap.zoning) === false) return false;
      if (buildingsApi.deserialize(snap.buildings) === false) return false;
      return S.ctx.modules.simulation?.reconcileWorld?.() !== false;
    };
    const restoreOwners = ({ roads, terrain, zoning = null, buildings = null }) => {
      try {
        if (zoningApi.settleForHistory?.() === false) return false;
      } catch (error) {
        S.ctx.log.warn(`road demolition history settlement rejected: ${error?.message || error}`);
        return false;
      }
      const rollback = {
        roads: clone(roadsApi.serialize()), heights: S.snapshotHeights([{ x: a.x, z: a.z }, { x: b.x, z: b.z }]),
        zoning: clone(zoningApi.serialize()), buildings: clone(buildingsApi.serialize()),
      };
      try {
        if (!roadsApi.restoreTransaction(roads)) throw new Error('roads rejected demolition restore');
        if (!S.restoreHeights(terrain)) throw new Error('terrain rejected demolition restore');
        if (zoning) {
          const affected = new Set(changedLotIds(zoning, rollback.zoning));
          const currentByKey = new Map((rollback.zoning.lots || []).map(row => [row.key, row]));
          const targetZoning = clone(zoning);
          for (const row of targetZoning.lots || []) {
            const current = currentByKey.get(row.key);
            if (current?.id === row.id && !affected.has(row.id)) row.buildingId = current.buildingId;
          }
          if (zoningApi.deserialize(targetZoning) === false) throw new Error('zoning rejected demolition restore');
          if (buildingsApi.restoreTransaction(buildings, [...affected]) === false) throw new Error('buildings rejected demolition restore');
          if (S.ctx.modules.simulation?.reconcileWorld?.() === false) throw new Error('simulation rejected demolition reconcile');
        }
        return true;
      } catch (error) {
        if (!rollbackOwners(rollback)) S.ctx.log.error('road demolition history compensation failed', error);
        else S.ctx.log.warn(`road demolition history change rejected and compensated: ${error?.message || error}`);
        return false;
      }
    };
    S.pushUndo({
      label: `demolish:road`, cost: -refund, key: 'demolish', fromDrag: false,
      undo() {
        if (!restoreOwners({ roads: roadsBefore, terrain: heightsBefore, zoning: zoningBefore, buildings: buildingsBefore })) return false;
        S.spend(refund, 'undo demolish');
        return true;
      },
      redo() {
        if (!restoreOwners({ roads: roadsAfter, terrain: heightsAfter })) return false;
        S.refund(refund);
        return true;
      },
    });
    if (w.selection.kind === 'road' && w.selection.id === t.id) setSelection(null, null);
    return { refund, cost: 0 };
  }
  if (t.kind === 'building') {
    const b = w.buildings.items.get(t.id);
    const sourceLot = b?.lotId != null ? w.zones.lots?.get(b.lotId) : null;
    const lot = b ? { ...(sourceLot || b.lot), type: b.type, density: b.density, level: b.level, buildingId: null } : null;
    const x = t.x, z = t.z;
    w.buildings.demolish?.(t.id);
    S.ctx.modules.buildings?.flush?.();
    S.spend(DEMOLISH.building, 'demolish');
    S.pushUndo({
      label: 'demolish:building', cost: DEMOLISH.building, key: 'demolish', fromDrag: false,
      undo() { if (lot) S.ctx.modules.buildings?.requestSpawn?.(lot); S.ctx.modules.buildings?.flush?.(); S.refund(DEMOLISH.building); },
      redo() { const nb = w.buildings.at?.(x, z); if (nb) w.buildings.demolish?.(nb.id); S.ctx.modules.buildings?.flush?.(); S.spend(DEMOLISH.building, 'demolish'); },
    });
    if (w.selection.kind === 'building' && w.selection.id === t.id) setSelection(null, null);
    return { refund: 0, cost: DEMOLISH.building };
  }
  if (t.kind === 'prop') {
    const P = S.ctx.modules.props, item = w.props.items.get(t.id);
    if (!item || typeof P?.remove !== 'function' || typeof P?.place !== 'function') return null;
    const saved = { ...item }, refund = refundOf(t);
    if (!P.remove(t.id)) return null;
    S.refund(refund);
    let currentId = t.id;
    S.pushUndo({ label: 'demolish:prop', cost: -refund, key: 'demolish', fromDrag: false,
      undo() { currentId = P.place(saved.kind, saved.x, saved.z, saved); S.spend(refund, 'undo demolish'); },
      redo() { P.remove(currentId); S.refund(refund); },
    });
    if (w.selection.kind === 'prop' && w.selection.id === t.id) setSelection(null, null);
    return { refund, cost: 0 };
  }
  if (t.kind === 'service') {
    const s = w.services.items.get(t.id);
    if (!s) return null;
    const kind = s.kind, x = s.x, z = s.z, heading = s.heading || 0;
    const refund = refundOf(t), cost = serviceDef(kind, S.ctx.modules).cost;
    if (w.services.remove?.(t.id) === false || w.services.items.has(t.id)) return null;
    S.refund(refund);
    let cur = t.id;
    S.pushUndo({
      label: 'demolish:service', cost: -refund, key: 'demolish', fromDrag: false,
      undo() {
        if (!S.afford(refund)) return false;
        // Recreating charges full price in the owner. Credit only its non-refunded portion first,
        // so restoring a demolition costs exactly the refund, even when that is the entire balance.
        const credit = Math.max(0, cost - refund);
        S.refund(credit);
        let next;
        try { next = w.services.restore({ id: cur, kind, x, z, heading }); }
        catch (error) {
          if (!S._freeBuild) S.ctx.modules.simulation?.spend?.(credit, true);
          throw error;
        }
        if (!Number.isInteger(next) || next < 1 || !w.services.items.has(next)) {
          if (!S._freeBuild) S.ctx.modules.simulation?.spend?.(credit, true);
          return false;
        }
        cur = next;
        return true;
      },
      redo() {
        if (!w.services.items.has(cur) || w.services.remove(cur) === false) return false;
        S.refund(refund);
        return true;
      },
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

function normalizeOptions(name, options = {}) {
  const o = { ...DEFAULTS[name], ...options };
  const choice = (key, values) => { if (!values.includes(o[key])) o[key] = DEFAULTS[name][key]; };
  const range = (key, min, max, step = 1) => { const n = Number(o[key]); o[key] = Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n / step) * step)) : DEFAULTS[name][key]; };
  if (name === 'road') {
    choice('type', ['street','avenue','highway','alley','gravel']); choice('mode', ['straight','curve','free','grid']);
    choice('junction', ['crossing','lights','roundabout']); range('elevation', -20, 60, 5);
    o.oneWay = !!o.oneWay; o.snap = ['snap','parallel','magnet'].filter(v => Array.isArray(o.snap) && o.snap.includes(v));
  } else if (name === 'zone') {
    choice('type', S.ctx.world.zones.types); choice('density', S.ctx.world.zones.densities); choice('brush', ['fill','paint','marquee']); range('size', 8, 96, 8);
  } else if (name === 'terrain') {
    choice('mode', ['raise','lower','flatten','smooth']); range('size', 10, 200, 10); range('strength', 10, 100);
  } else if (name === 'prop') {
    choice('kind', S.ctx.world.props.kinds); choice('mode', ['single','line','brush']); range('spacing', 2, 40);
  } else if (name === 'service') choice('kind', S.ctx.world.services.kinds);
  else if (name === 'bulldoze') choice('mode', ['single','marquee']);
  return o;
}
function optionKey(value) {
  if (Array.isArray(value)) return '[' + value.map(optionKey).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + optionKey(value[k])).join(',') + '}';
  return JSON.stringify(value);
}

function emitChanged() {
  // de-duplicated: identical tool + deep-equal options emits nothing (spec §2)
  const key = optionKey(S.options);
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
    S.toolName = null; S.tool = null; S.options = {}; S.cursor = null; S.failure = null;
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
  const nextOptions = normalizeOptions(key, opts);
  if (S.toolName === key && optionKey(S.options) === optionKey(nextOptions)) return api.current();
  const prev = S.toolName;
  if (prev !== key && S.tool) { try { S.tool.deactivate(); } catch (e) { /* isolated */ } }
  S.toolName = key;
  S.tool = S.tools[key];
  S.options = nextOptions;
  S.failure = null;
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
  else if (sel.kind === 'service') { const d = serviceDef(data.kind, S.ctx.modules); wd = d.w; dp = d.d; h = d.h; label = d.label; heading = -heading; }
  else if (sel.kind === 'node') { wd = dp = 14; h = 3; label = 'Intersection'; }
  else if (sel.kind === 'prop') { const b = propBounds(data, S.ctx.modules); x = b.x; z = b.z; wd = b.w; dp = b.d; h = b.height; heading = b.heading; label = String(data.kind).replace(/_/g, ' '); }
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
  S.landmark.ribbon = null; S.landmark.wash = null; S.landmark.path = null;
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
  let down = false, moved = 0, lastDab = -1, pressButton = -1, pressPointer = null, pressX = 0, pressY = 0;
  const resetGesture = () => { down = false; moved = 0; pressButton = -1; pressPointer = null; };
  const clearPointer = () => { S.cursor = null; guard(() => S.tool?.pointer(null)); S.dirty(); };
  const onInterrupted = (e) => { if (e.type === 'blur' || e.pointerId === pressPointer) { resetGesture(); clearPointer(); } };

  const onMove = (e) => {
    if (ctx.modules.ui?.hud?.menus?.isOpen?.()) { resetGesture(); clearPointer(); return; }
    if (down && e.pointerId !== pressPointer) return;
    moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    const p = groundAt(e.clientX, e.clientY);
    if (!p) { clearPointer(); return; }
    guard(() => api.pointer(p.x, p.z));
    if (!S._restoring && !S.undo.recovery && down && pressButton === 0 && moved > 2 && S.clock - lastDab >= 0.05 && S.tool?.drag) {
      guard(() => S.tool.drag()); lastDab = S.clock;
    }
  };
  const onDown = (e) => {
    if (down || ctx.modules.ui?.hud?.menus?.isOpen?.()) return;
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) return;   // camera owns MMB / shift-LMB
    const p = groundAt(e.clientX, e.clientY);
    if (!p) return;
    down = true; moved = 0; pressButton = e.button; pressPointer = e.pointerId; pressX = e.clientX; pressY = e.clientY;
    guard(() => api.pointer(p.x, p.z));
    if (e.button === 0) {
      // A world click transfers keyboard ownership from the previously focused HUD control.
      // tabindex=-1 permits programmatic focus without adding a new tab stop.
      if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
      if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) el.setAttribute('aria-label', 'City view');
      el.focus({ preventScroll: true });
      guard(() => {
        if (S.tool) return api.click(0);
        const hit = pick(p.x, p.z);
        setSelection(hit?.kind ?? null, hit?.id ?? null);
      });
      e.preventDefault();
    }
  };
  const onUp = (e) => {
    if (!down || e.pointerId !== pressPointer || e.button !== pressButton) return;
    const travelled = Math.abs(e.clientX - pressX) + Math.abs(e.clientY - pressY);
    if (pressButton === 2 && e.target === el && moved < 6 && travelled < 6 && !ctx.modules.ui?.hud?.menus?.isOpen?.()) guard(() => api.rightClick());
    resetGesture();
  };
  const onLeave = () => { resetGesture(); clearPointer(); };
  const onKey = (e) => {
    const target = e.target && typeof e.target.closest === 'function' ? e.target : null;
    if (e.defaultPrevented || target?.closest('input,textarea,select') || target?.isContentEditable || ctx.modules.ui?.hud?.menus?.isOpen?.()) return;
    const enter = e.code === 'Enter' || e.code === 'NumpadEnter';
    if (enter && target?.closest('button,[role="button"]')) return;
    S.mods.shift = e.shiftKey; S.mods.alt = e.altKey; S.mods.ctrl = e.ctrlKey || e.metaKey;
    if (e.ctrlKey || e.metaKey) {
      if (e.code === 'KeyZ' && !e.shiftKey) { api.undo(); e.preventDefault(); return; }
      if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { api.redo(); e.preventDefault(); return; }
      return;
    }
    if (e.code === 'Escape') {
      // Let the HUD own Escape while already in the neutral inspect state so it can open
      // the pause/save menu. A first Escape from an active tool still exits cleanly without
      // also opening the menu on the same key press.
      if (!S.toolName) return;
      api.cancel(); api.select(null); api.clearSelection();
      e.preventDefault(); e.stopImmediatePropagation();
      return;
    }
    if (e.altKey) return;
    if (enter) { api.commit(); e.preventDefault(); return; }
    // Numeric keys belong to the HUD's simulation speed controls; the toolbar selects tools.
    if (e.code === 'KeyB') api.select('bulldoze');
  };
  const onKeyUp = (e) => { S.mods.shift = e.shiftKey; S.mods.alt = e.altKey; S.mods.ctrl = e.ctrlKey || e.metaKey; };

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onInterrupted);
  el.addEventListener('lostpointercapture', onInterrupted);
  window.addEventListener('blur', onInterrupted);
  el.addEventListener('pointerleave', onLeave);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  S._bound = () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onInterrupted);
    el.removeEventListener('lostpointercapture', onInterrupted);
    window.removeEventListener('blur', onInterrupted);
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
    const next = normalizeOptions(S.toolName, { ...S.options, [id]: value });
    if (optionKey(next) === optionKey(S.options)) return { ...S.options };
    S.options = next; S.failure = null;
    if (S.cursor) S.tool.pointer(S.cursor);
    S.dirty();
    emitChanged();
    return { ...S.options };
  },
  current() { return S.toolName ? { tool: S.toolName, options: { ...S.options } } : null; },
  options() { return { ...S.options }; },

  // ---- virtual cursor
  pointer(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return api.state();
    S.failure = null;
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
    if (S._restoring) return {ok:false,cost:0,reason:'City is loading'};
    if (S.undo.recovery) return {ok:false,cost:0,reason:'Retry Undo to recover the previous action'};
    if (!S.tool) return { ok: false, cost: 0, reason: 'No tool' };
    try {
      const r = S.tool.click(button, ...rest) || { ok: false, cost: 0 };
      S.failure = r.ok ? null : (r.reason || null);
      if (r.ok && ['service', 'prop'].includes(S.toolName)) api.cancel();
      S.dirty();
      return { ok: !!r.ok, id: r.id, cost: Math.max(0, Math.round(r.cost || 0)), reason: r.reason ?? undefined };
    } catch (e) { S.ctx.log.error(`${S.toolName}.click failed`, e); return { ok: false, cost: 0, reason: 'error' }; }
  },
  rightClick() {
    if (S._restoring) return {ok:false,reason:'City is loading'};
    if (S.undo.recovery) return {ok:false,reason:'Retry Undo to recover the previous action'};
    if (!S.tool) return { ok: false, reason: 'No tool' };
    try { const r = S.tool.rightClick() || { ok: false }; S.dirty(); return { ok: !!r.ok, reason: r.reason ?? undefined }; }
    catch (e) { S.ctx.log.error(`${S.toolName}.rightClick failed`, e); return { ok: false, reason: 'error' }; }
  },
  commit() {
    if (S._restoring) return {ok:false,ids:[],cost:0,reason:'City is loading'};
    if (S.undo.recovery) return {ok:false,ids:[],cost:0,reason:'Retry Undo to recover the previous action'};
    if (!S.tool) return null;
    try {
      const r = S.tool.commit() || { ok: false, ids: [], cost: 0 };
      S.failure = r.ok ? null : (r.reason || null);
      if (r.ok) api.cancel();
      S.dirty();
      return { ok: !!r.ok, ids: r.ids || [], cost: Math.max(0, Math.round(r.cost || 0)), reason: r.reason ?? undefined };
    } catch (e) { S.ctx.log.error(`${S.toolName}.commit failed`, e); return { ok: false, ids: [], cost: 0, reason: 'error' }; }
  },
  cancel() { S.cursor = null; S.failure = null; try { S.tool?.cancel(); S.tool?.pointer(null); } catch (e) { /* isolated */ } S.dirty(); },

  state() {
    if (!S.tool && S.poses.length) {
      const d = S.poses[0], ev = S.tools.road.evalDraft(d), T = S.ctx.world.terrain;
      return { ...EMPTY_STATE(), tool: d.tool, options: { type: d.type, mode: d.mode, elevation: d.elevation, oneWay: d.oneWay }, phase: 'drawing',
        points: ev.points.map(p => ({ x:p.x, y:T.getHeight(p.x,p.z), z:p.z })), cursor: { ...d.cursor, y:T.getHeight(d.cursor.x,d.cursor.z) },
        valid:ev.ok, reason:ev.reason, cost:ev.cost, affordable:S.afford(ev.cost),
        snap: d.cursor.kind ? { ...d.cursor } : null,
        metrics: { length:+ev.length.toFixed(2), angle:+ev.angle.toFixed(1), grade:+(ev.grade*100).toFixed(2), cells:0, volume:0, items:ev.segs.length } };
    }
    if (!S.tool) return { ...EMPTY_STATE(), cursor: S.cursor ? { ...S.cursor } : null };
    let s;
    try { s = S.tool.state(); } catch (e) { S.ctx.log.error(`${S.toolName}.state failed`, e); s = null; }
    const base = EMPTY_STATE();
    const cost = Math.max(0, Math.round(s?.cost || 0));
    return {
      tool: S.toolName,
      options: { ...S.options },
      phase: S.cursor ? (s?.phase || 'idle') : 'idle',
      points: s?.points || [],
      cursor: S.cursor ? { x: S.cursor.x, y: S.cursor.y, z: S.cursor.z } : null,
      valid: !!s?.valid && !S.failure,
      reason: S.failure || s?.reason || null,
      cost,
      refund: Math.max(0, Math.round(s?.refund || 0)),
      affordable: S.afford(cost),
      snap: s?.snap ?? null,
      metrics: { ...base.metrics, ...(s?.metrics || {}) },
    };
  },

  // ---- history
  undo() { if (S._restoring) return false; const e = S.undo.undo(); if (e) { S.dirty(); S.ctx.events.emit('tool:undo', { label: e.label }); } return !!e; },
  redo() { if (S._restoring) return false; const e = S.undo.redo(); if (e) { S.dirty(); S.ctx.events.emit('tool:redo', { label: e.label }); } return !!e; },
  history() { return S.undo.report(); },

  /** Integer ¢, never NaN/Infinity, with or without simulation. */
  costOf(tool, options = {}, geometry = {}) {
    const fin = (v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
    try {
      if (tool === 'road') {
        const pts = geometry.points || geometry.path || [];
        return fin(S.tools.road.evalDraft({ ...options, points: pts, cursor: null, ctrl: geometry.ctrl || options.ctrl }).cost);
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
      ghostSurfaceLiftMin: Number.isFinite(L.surfaceMin) ? L.surfaceMin : 0,
      ghostSurfaceLiftMax: Number.isFinite(L.surfaceMax) ? L.surfaceMax : 0,
      ghostSurfaceSource: typeof S.ctx.modules.roads?.surfaceHeightAt === 'function' ? 'terrain+pavement' : 'terrain',
      zonePreviewAlpha: ZONE_PREVIEW_ALPHA,
      undoCapacity: UNDO_CAPACITY,
    };
  },

  /**
   * Named landmark rects (ARCHITECTURE §8): a 64×64 box inside the ghost ribbon, the same box one
   * ribbon-width to the side of it on plain ground, and a 32×32 box on the affected-area wash.
   * The boxes scale with viewport height and shrink if the ribbon is narrower, so every sample stays *inside*
   * the thing it claims to measure.
   */
  cropRects({ project, width, height }) {
    const out = {};
    const T = S.ctx.world.terrain;
    const rb = ribbonLandmark(S);
    const fits = (r) => r && r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= width && r[1] + r[3] <= height;
    if (rb) {
      const c = project(rb.x, T.getHeight(rb.x, rb.z) + RULES.ghostLift, rb.z);
      const e = project(rb.x + rb.nx * rb.width * 0.5, T.getHeight(rb.x + rb.nx * rb.width * 0.5, rb.z + rb.nz * rb.width * 0.5) + RULES.ghostLift, rb.z + rb.nz * rb.width * 0.5);
      if (c && e && c[2] <= 1 && e[2] <= 1) {
        const halfPx = Math.hypot(e[0] - c[0], e[1] - c[1]);
        const size = Math.max(8, Math.min(Math.round(64 * height / 1080), Math.round(halfPx * 1.1)));
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
    const wash = washCrop(S, project, width, height);
    if (wash) out.wash = wash;
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
    S._cameraHadHelpers = ctx.camera.camera.layers.isEnabled(LAYERS.HELPERS);
    ctx.camera.camera.layers.enable(LAYERS.HELPERS);
    S.giz = new Gizmos(ctx);
    S.chips = new Chips(ctx);
    ctx.group.add(S.chips.mesh);
    S.undo = new UndoStack(ctx.log, UNDO_CAPACITY, S.afford);
    S._restoring = 0;
    ctx.events.on('save:restoring', () => {
      S._restoring++;
      api.cancel(); api.select(null); api.clearSelection();
      // Abandon the old world's closures and recovery journal without replaying compensation
      // against incoming IDs. Ordinary UndoStack.clear() still refuses pending recovery.
      S.undo = new UndoStack(ctx.log, UNDO_CAPACITY, S.afford);
    }, 'tools');
    ctx.events.on('save:restore-finished', () => { S._restoring = Math.max(0, S._restoring - 1); }, 'tools');
    S.tools = {
      road: roadTool(S), zone: zoneTool(S), terrain: terrainTool(S), service: serviceTool(S),
      prop: propTool(S), bulldoze: bulldozeTool(S),
      transit: forwardTool(S, 'transit'), infoview: forwardTool(S, 'infoview'),
    };
    S.toolName = null; S.tool = null; S.options = {}; S.cursor = null; S.failure = null;
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
    ctx.events.on('props:changed', () => S.dirty(), 'tools');
    ctx.events.on('services:changed', () => S.dirty(), 'tools');

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
    if (!S._cameraHadHelpers) ctx.camera.camera.layers.disable(LAYERS.HELPERS);
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
