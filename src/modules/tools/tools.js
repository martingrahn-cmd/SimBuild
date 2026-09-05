// The individual tools. Each one is a plain object with the same small interface, sharing one state
// bag `S` (ctx, gizmos, chips, undo stack, current options, hovered ground point, modifier keys):
//
//   activate(opts) / deactivate()   hover(pt)   down(pt, button)   drag(pt)   up(pt, button)
//   key(e)   cancel()   draw()      // draw() rebuilds gizmo geometry and queues chips
//
// Rules of the house: all randomness through ctx.rng (none needed here), every mutation of another
// module's world section goes through that section's published API, and every mutation that costs
// money pushes an undo entry.
import { ROAD_COST, ROAD_MULT, DEMOLISH, TERRAIN_COST_PER_M3, PROP_COST, serviceDef, money } from './costs.js';
import { ICON } from './chips.js';
import { GIZMO_COLORS as GC } from './gizmos.js';

const NODE_SNAP = 16;      // metres: magnet radius for existing nodes
const EDGE_SNAP = 10;      // metres: magnet radius for road centrelines (T junctions)
const ANGLE_STEP = Math.PI / 12;   // 15°
const MIN_ROAD = 12;       // metres
const MAX_GRADE = 0.13;    // 13 %
const MAX_CUT = 16;        // metres of cut/fill before a segment is rejected

const ZONE_HEX = {
  residential: { low: [0.37, 0.84, 0.20], high: [0.05, 0.56, 0.24] },
  commercial: { low: [0.18, 0.71, 0.96], high: [0.07, 0.25, 0.79] },
  industrial: { low: [0.97, 0.71, 0.08], high: [0.82, 0.33, 0.06] },
  office: { low: [0.78, 0.37, 0.96], high: [0.42, 0.11, 0.72] },
};
const TERRAIN_COL = { raise: GC.raise, lower: GC.lower, flatten: GC.flatten, smooth: GC.smooth };

const deg = (r) => (r * 180) / Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ------------------------------------------------------------------------------------- shared maths

function sampleCurve(a, b, ctrl, step = 6) {
  const pts = [];
  const approx = ctrl
    ? Math.hypot(ctrl.x - a.x, ctrl.z - a.z) + Math.hypot(b.x - ctrl.x, b.z - ctrl.z)
    : Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.min(220, Math.ceil(approx / step)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (ctrl) {
      const mt = 1 - t;
      pts.push({ x: mt * mt * a.x + 2 * mt * t * ctrl.x + t * t * b.x, z: mt * mt * a.z + 2 * mt * t * ctrl.z + t * t * b.z });
    } else {
      pts.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return pts;
}

function pathLength(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return s;
}

function pathPoint(pts, frac) {
  const total = pathLength(pts);
  let want = total * frac, s = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    if (s + d >= want) {
      const k = d > 0 ? (want - s) / d : 0;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, z: pts[i - 1].z + (pts[i].z - pts[i - 1].z) * k };
    }
    s += d;
  }
  return pts[pts.length - 1];
}

// ---------------------------------------------------------------------------------------- road tool

export function roadTool(S) {
  const st = {
    anchor: null,      // {x, z, node|null, edge|null}
    ctrl: null,        // curve control point
    phase: 0,          // 0 idle, 1 anchor placed, 2 control placed (curve)
    free: [],          // freehand polyline
    preview: null,
    lastSnap: null,
  };

  const R = () => S.ctx.world.roads;
  const type = () => S.options.type || 'street';
  const mode = () => S.options.mode || 'straight';
  const width = () => (R().types[type()] || R().types.street).width;

  function snap(x, z, from) {
    const rd = R();
    const gridOn = Array.isArray(S.options.snap) ? S.options.snap.includes('snap') : !!S.options.grid;
    const magnet = Array.isArray(S.options.snap) ? S.options.snap.includes('magnet') : true;
    if (!S.mods.alt && magnet) {
      let best = null, bd = NODE_SNAP;
      for (const n of rd.nodes.values()) {
        const d = Math.hypot(n.x - x, n.z - z);
        if (d < bd) { bd = d; best = n; }
      }
      if (best) return { x: best.x, z: best.z, node: best.id, edge: null, kind: 'node' };
      const ne = rd.nearestEdge(x, z, EDGE_SNAP);
      if (ne && ne.edge) {
        const e = ne.edge;
        const dA = ne.t * e.length, dB = (1 - ne.t) * e.length;
        if (dA < 14) { const n = rd.nodes.get(e.a); if (n) return { x: n.x, z: n.z, node: n.id, edge: null, kind: 'node' }; }
        if (dB < 14) { const n = rd.nodes.get(e.b); if (n) return { x: n.x, z: n.z, node: n.id, edge: null, kind: 'node' }; }
        return { x: ne.point.x, z: ne.point.z, node: null, edge: e.id, t: ne.t, kind: 'edge' };
      }
    }
    if (gridOn && !S.mods.shift) {
      return { x: Math.round(x / 8) * 8, z: Math.round(z / 8) * 8, node: null, edge: null, kind: 'grid' };
    }
    if (from && !S.mods.shift) {
      const dx = x - from.x, dz = z - from.z;
      const len = Math.hypot(dx, dz);
      if (len > 1) {
        let ang = Math.atan2(dz, dx);
        // candidate angles: absolute 15° steps, plus 15° steps off every road already at the anchor
        const cands = [Math.round(ang / ANGLE_STEP) * ANGLE_STEP];
        const rd2 = R();
        const n = from.node != null ? rd2.nodes.get(from.node) : null;
        if (n) {
          for (const eid of n.edges) {
            const e = rd2.edges.get(eid); if (!e) continue;
            const o = rd2.nodes.get(e.a === n.id ? e.b : e.a); if (!o) continue;
            const base = Math.atan2(o.z - n.z, o.x - n.x);
            cands.push(base + Math.round((ang - base) / ANGLE_STEP) * ANGLE_STEP);
          }
        }
        let bestA = cands[0], bd = Infinity;
        for (const c of cands) {
          const d = Math.abs(Math.atan2(Math.sin(c - ang), Math.cos(c - ang)));
          if (d < bd) { bd = d; bestA = c; }
        }
        if (bd < ANGLE_STEP * 0.55) ang = bestA;
        const L = Math.max(1, Math.round(len));
        return { x: from.x + Math.cos(ang) * L, z: from.z + Math.sin(ang) * L, node: null, edge: null, kind: 'angle' };
      }
    }
    return { x, z, node: null, edge: null, kind: '' };
  }

  function evaluate(path) {
    const T = S.ctx.world.terrain;
    const t = type();
    const len = pathLength(path);
    const out = { len, cost: 0, grade: 0, cut: 0, water: 0, ok: true, reason: '' };
    if (path.length < 2 || len < 1) { out.ok = false; out.reason = 'Drag to draw'; return out; }
    const yA = T.getHeight(path[0].x, path[0].z), yB = T.getHeight(path[path.length - 1].x, path[path.length - 1].z);
    out.grade = len > 0 ? (yB - yA) / len : 0;
    let s = 0, water = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (i > 0) s += Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z);
      const design = yA + (yB - yA) * (len > 0 ? s / len : 0);
      const g = T.getHeight(p.x, p.z);
      out.cut = Math.max(out.cut, Math.abs(design - g));
      if (T.isWater(p.x, p.z)) water++;
      if (Math.abs(p.x) > 1010 || Math.abs(p.z) > 1010) { out.ok = false; out.reason = 'Outside the map'; }
    }
    out.water = path.length ? water / path.length : 0;
    // a road may bridge water, but it cannot start or finish in it
    if (out.ok && (T.isWater(path[0].x, path[0].z) || T.isWater(path[path.length - 1].x, path[path.length - 1].z))) {
      out.ok = false; out.reason = 'Cannot end in water';
    }
    let cost = (ROAD_COST[t] ?? ROAD_COST.street) * len;
    if (out.water > 0.02) cost *= 1 + (ROAD_MULT.bridge - 1) * out.water;
    const ag = Math.abs(out.grade);
    if (ag > 0.04) cost *= 1 + ROAD_MULT.slope * (ag - 0.04);
    if (Math.abs(S.options.elevation || 0) > 1) cost *= ROAD_MULT.elevated;
    out.cost = Math.round(cost / 10) * 10;
    if (out.ok && len < MIN_ROAD) { out.ok = false; out.reason = `Too short — ${Math.round(MIN_ROAD)} m minimum`; }
    if (out.ok && ag > MAX_GRADE) { out.ok = false; out.reason = `Too steep — ${(ag * 100).toFixed(0)} % grade`; }
    if (out.ok && out.cut > MAX_CUT && out.water < 0.2) { out.ok = false; out.reason = 'Terrain too uneven'; }
    if (out.ok && !S.afford(out.cost)) { out.ok = false; out.reason = 'Not enough funds'; }
    return out;
  }

  function buildPreview() {
    const h = S.hover;
    if (!h) { st.preview = null; return; }
    const m = mode();
    if (m === 'free') {
      if (st.phase !== 1 || st.free.length === 0) { st.preview = null; return; }
      const pts = st.free.slice();
      if (Math.hypot(h.x - pts[pts.length - 1].x, h.z - pts[pts.length - 1].z) > 2) pts.push({ x: h.x, z: h.z });
      st.preview = { path: pts, ...evaluate(pts), end: pts[pts.length - 1], angle: null };
      return;
    }
    if (st.phase === 0) { st.preview = null; return; }
    const a = st.anchor;
    if (m === 'curve' && st.phase === 2) {
      const b = snap(h.x, h.z, null);
      st.lastSnap = b;
      const path = sampleCurve(a, b, st.ctrl, 5);
      const ev = evaluate(path);
      st.preview = { path, ...ev, end: b, ctrl: st.ctrl, angle: cornerAngle(a, st.ctrl) };
      return;
    }
    const b = snap(h.x, h.z, a);
    st.lastSnap = b;
    const path = sampleCurve(a, b, null, 6);
    const ev = evaluate(path);
    st.preview = { path, ...ev, end: b, angle: cornerAngle(a, b) };
  }

  /** Angle between the new segment and the road already at the anchor (CS2 shows this while drawing). */
  function cornerAngle(a, b) {
    const rd = R();
    const n = a.node != null ? rd.nodes.get(a.node) : null;
    const dir = Math.atan2(b.z - a.z, b.x - a.x);
    if (!n || !n.edges.size) return { deg: ((deg(dir) + 450) % 360), absolute: true };
    let best = 999;
    for (const eid of n.edges) {
      const e = rd.edges.get(eid); if (!e) continue;
      const o = rd.nodes.get(e.a === n.id ? e.b : e.a); if (!o) continue;
      const base = Math.atan2(o.z - n.z, o.x - n.x);
      let d = Math.abs(deg(Math.atan2(Math.sin(dir - base), Math.cos(dir - base))));
      if (d < best) best = d;
    }
    return { deg: best, absolute: false };
  }

  /** Split a straight edge at a point so a new road can T into it. Returns the new node id. */
  function splitEdge(edgeId, x, z, journal) {
    const rd = R();
    const e = rd.edges.get(edgeId);
    if (!e || e.ctrl) return null;   // curved edges are left alone (no exact split available)
    const na = rd.nodes.get(e.a), nb = rd.nodes.get(e.b);
    if (!na || !nb) return null;
    const desc = { ax: na.x, az: na.z, bx: nb.x, bz: nb.z, type: e.type, lanes: e.lanes, oneWay: e.oneWay };
    rd.removeEdge(edgeId);
    journal.removed.push(desc);
    const aId = rd.addNode(desc.ax, desc.az), bId = rd.addNode(desc.bx, desc.bz), mId = rd.addNode(x, z);
    const e1 = rd.addEdge(aId, mId, desc.type, { lanes: desc.lanes, oneWay: desc.oneWay });
    const e2 = rd.addEdge(mId, bId, desc.type, { lanes: desc.lanes, oneWay: desc.oneWay });
    journal.added.push(e1, e2);
    return mId;
  }

  function commit() {
    const p = st.preview;
    if (!p || !p.ok) { if (p && p.reason) S.toast(p.reason); return false; }
    const rd = R();
    const journal = { added: [], removed: [] };
    const a = st.anchor, b = p.end;
    let aId = a.node;
    if (aId == null && a.edge != null) aId = splitEdge(a.edge, a.x, a.z, journal);
    if (aId == null) aId = rd.addNode(a.x, a.z);
    let bId = b.node;
    if (bId == null && b.edge != null) bId = splitEdge(b.edge, b.x, b.z, journal);
    if (bId == null) bId = rd.addNode(b.x, b.z);
    if (aId === bId) return false;
    const opts = { oneWay: S.options.oneWay, elevation: S.options.elevation || 0 };
    if (p.ctrl) opts.ctrl = { x: p.ctrl.x, z: p.ctrl.z };
    if (mode() === 'free') {
      // chain the freehand polyline as short straight segments
      let prev = aId;
      for (let i = 1; i < p.path.length; i++) {
        const q = p.path[i];
        const id = rd.addNode(q.x, q.z);
        if (id === prev) continue;
        const eid = rd.addEdge(prev, id, type(), opts);
        if (eid > 0) journal.added.push(eid);
        prev = id;
      }
    } else {
      const eid = rd.addEdge(aId, bId, type(), opts);
      if (eid > 0) journal.added.push(eid);
    }
    if (!journal.added.length) return false;
    S.spend(p.cost, `road ${type()}`);
    pushRoadUndo(journal, p.cost, `Build ${type()} (${Math.round(p.len)} m)`);
    S.ctx.events.emit('tool:preview', { kind: 'road', points: p.path.map((q) => [q.x, q.z]), cost: p.cost, committed: true });
    return true;
  }

  function pushRoadUndo(journal, cost, label) {
    const rd = R();
    const rec = {
      added: journal.added.map((id) => descOf(rd, id)).filter(Boolean),
      removed: journal.removed.slice(),
      ids: journal.added.slice(),
    };
    S.undo.push({
      label,
      undo() {
        for (const id of rec.ids) rd.removeEdge(id);
        rec.ids = [];
        for (const d of rec.removed) reAdd(rd, d);
        S.refund(cost);
      },
      redo() {
        for (const d of rec.removed) {
          const ne = rd.nearestEdge((d.ax + d.bx) / 2, (d.az + d.bz) / 2, 3);
          if (ne) rd.removeEdge(ne.edge.id);
        }
        rec.ids = rec.added.map((d) => reAdd(rd, d)).filter((v) => v > 0);
        S.spend(cost, 'redo');
      },
    });
  }

  function descOf(rd, id) {
    const e = rd.edges.get(id); if (!e) return null;
    const a = rd.nodes.get(e.a), b = rd.nodes.get(e.b);
    if (!a || !b) return null;
    return { ax: a.x, az: a.z, bx: b.x, bz: b.z, type: e.type, lanes: e.lanes, oneWay: e.oneWay, ctrl: e.ctrl ? { x: e.ctrl.x, z: e.ctrl.z } : null };
  }
  function reAdd(rd, d) {
    const a = rd.addNode(d.ax, d.az), b = rd.addNode(d.bx, d.bz);
    return rd.addEdge(a, b, d.type, { lanes: d.lanes, oneWay: d.oneWay, ctrl: d.ctrl });
  }

  return {
    name: 'road',
    cursor: 'crosshair',
    activate() { st.phase = 0; st.anchor = null; st.ctrl = null; st.free.length = 0; st.preview = null; },
    deactivate() { this.cancel(); },
    cancel() { st.phase = 0; st.anchor = null; st.ctrl = null; st.free.length = 0; st.preview = null; S.dirty(); },
    hover() { buildPreview(); S.dirty(); },
    down(pt, button) {
      if (button === 2) { this.cancel(); return; }
      const m = mode();
      if (m === 'free') {
        st.anchor = snap(pt.x, pt.z, null);
        st.free = [{ x: st.anchor.x, z: st.anchor.z }];
        st.phase = 1;
        return;
      }
      if (st.phase === 0) { st.anchor = snap(pt.x, pt.z, null); st.phase = 1; buildPreview(); return; }
      if (m === 'curve' && st.phase === 1) { st.ctrl = { x: pt.x, z: pt.z }; st.phase = 2; buildPreview(); return; }
      // commit and chain from the new end (CS2 keeps drawing)
      const p = st.preview;
      if (commit() && p) {
        const rd = R();
        let nid = p.end.node ?? null;
        if (nid == null) {
          for (const n of rd.nodes.values()) if (Math.hypot(n.x - p.end.x, n.z - p.end.z) < 1.5) { nid = n.id; break; }
        }
        st.anchor = { x: p.end.x, z: p.end.z, node: nid, edge: null };
        st.ctrl = null; st.phase = 1;
      }
      buildPreview();
    },
    drag(pt) {
      if (mode() === 'free' && st.phase === 1) {
        const last = st.free[st.free.length - 1];
        if (Math.hypot(pt.x - last.x, pt.z - last.z) > 14) st.free.push({ x: pt.x, z: pt.z });
      }
      buildPreview(); S.dirty();
    },
    up(pt, button) {
      if (button === 2) return;
      if (mode() === 'free' && st.phase === 1) {
        buildPreview();
        if (st.preview && pathLength(st.free) > MIN_ROAD) commit();
        this.cancel();
      }
    },
    key(e) {
      if (e.code === 'KeyR') {
        const order = ['straight', 'curve', 'free', 'grid'];
        S.setOption('mode', order[(order.indexOf(mode()) + 1) % order.length]);
        this.cancel();
        return true;
      }
      return false;
    },
    draw() {
      const g = S.giz;
      const p = st.preview;
      g.beginFlat();
      if (!p) {
        g.clearGhost();
        if (S.hover && st.phase === 0) {
          const sn = snap(S.hover.x, S.hover.z, null);
          g.marker(sn.x, sn.z, sn.kind === 'node' ? 3.1 : 2.2, sn.kind ? [0.55, 0.9, 1] : [1, 1, 1]);
        }
        g.endFlat();
        return;
      }
      const w = width();
      g.setGhost(p.path, w, p.ok ? 'valid' : 'invalid');
      // alignment guide beyond the cursor, CS2 style
      if (p.path.length >= 2 && p.ok) {
        const a = p.path[p.path.length - 2], b = p.path[p.path.length - 1];
        let dx = b.x - a.x, dz = b.z - a.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        g.groundLine(b.x + dx * 7, b.z + dz * 7, b.x + dx * 105, b.z + dz * 105, 1.4, [1, 1, 1], 0.45, true);
      }
      const col = p.ok ? [1, 1, 1] : [1, 0.45, 0.38];
      g.marker(st.anchor.x, st.anchor.z, 2.8, col);
      if (st.ctrl) g.marker(st.ctrl.x, st.ctrl.z, 1.9, [0.6, 0.86, 1]);
      g.marker(p.end.x, p.end.z, 2.8, col);
      g.endFlat();

      const T = S.ctx.world.terrain;
      const mid = pathPoint(p.path, 0.5);
      const yMid = T.getHeight(mid.x, mid.z) + 2;
      S.chips.add(mid.x, yMid, mid.z, ICON.length, `${Math.round(p.len)} m`, '', 0, -18);
      if (p.angle) {
        const q = pathPoint(p.path, 0.16);
        S.chips.add(q.x, T.getHeight(q.x, q.z) + 2, q.z, ICON.angle, `${p.angle.deg.toFixed(0)}°`, '', 0, -18);
      }
      if (Math.abs(p.grade) > 0.005) {
        const q = pathPoint(p.path, 0.72);
        S.chips.add(q.x, T.getHeight(q.x, q.z) + 2, q.z, ICON.grade, `${(p.grade * 100).toFixed(1)} %`, '', 0, -18);
      }
      const e = p.end;
      const yEnd = T.getHeight(e.x, e.z) + 2;
      if (p.ok) S.chips.add(e.x, yEnd, e.z, ICON.cost, money(p.cost), 'cost', 0, -34);
      else S.chips.add(e.x, yEnd, e.z, ICON.bad, p.reason, 'bad', 0, -34);
    },
    state() { return { phase: st.phase, preview: st.preview }; },
    // showcase / dev hooks
    _begin(x, z) { st.anchor = snap(x, z, null); st.phase = 1; buildPreview(); },
    /** Evaluate an arbitrary segment without touching the draft (showcase/dev). */
    _eval(a, b, ctrl) { const path = sampleCurve(a, b, ctrl || null, 6); return { path, ...evaluate(path) }; },
    _control(x, z) { st.ctrl = { x, z }; st.phase = 2; buildPreview(); },
    _refresh() { buildPreview(); },
  };
}

// ---------------------------------------------------------------------------------------- zone tool

export function zoneTool(S) {
  const st = { painting: 0, snapshot: null, changed: 0, marquee: null, cells: [] };
  const cell = () => S.ctx.world.zones.cellSize || 8;
  const half = () => S.ctx.world.size / 2;
  const idx = (v) => Math.floor((v + half()) / cell());
  const ctr = (i) => i * cell() - half() + cell() * 0.5;
  const zoning = () => S.ctx.modules.zoning || null;
  const radius = () => clamp(S.options.size ?? 24, 8, 96) * 0.5 + 4;

  function zonable(x, z) {
    const z1 = zoning();
    if (z1?.zonableAt) return z1.zonableAt(x, z);
    return null;
  }

  function collect(cx, cz, r) {
    const out = st.cells; out.length = 0;
    const c = cell(), r2 = r * r;
    for (let iz = idx(cz - r); iz <= idx(cz + r); iz++) {
      for (let ix = idx(cx - r); ix <= idx(cx + r); ix++) {
        const x = ctr(ix), z = ctr(iz);
        const dx = x - cx, dz = z - cz;
        if (dx * dx + dz * dz > r2) continue;
        if (!zonable(x, z)) continue;
        out.push(x, z);
        if (out.length > 1200) return out;
      }
    }
    return out;
  }

  function collectRect(x0, z0, x1, z1) {
    const out = st.cells; out.length = 0;
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), az = Math.min(z0, z1), bz = Math.max(z0, z1);
    for (let iz = idx(az); iz <= idx(bz); iz++) {
      for (let ix = idx(ax); ix <= idx(bx); ix++) {
        const x = ctr(ix), z = ctr(iz);
        if (x < ax || x > bx || z < az || z > bz) continue;
        if (!zonable(x, z)) continue;
        out.push(x, z);
        if (out.length > 1600) return out;
      }
    }
    return out;
  }

  function snapshotArea(x0, z0, x1, z1) {
    const Z = S.ctx.world.zones;
    const snap = [];
    for (let iz = idx(Math.min(z0, z1)) - 1; iz <= idx(Math.max(z0, z1)) + 1; iz++) {
      for (let ix = idx(Math.min(x0, x1)) - 1; ix <= idx(Math.max(x0, x1)) + 1; ix++) {
        const key = ix + ',' + iz;
        const c = Z.cells.get(key);
        snap.push(ctr(ix), ctr(iz), c ? c.type : null, c ? c.density : null);
      }
    }
    return snap;
  }

  function restore(snap) {
    const z1 = zoning();
    if (!z1?.bulk) return;
    z1.bulk(({ rect, erase }) => {
      for (let i = 0; i < snap.length; i += 4) {
        const x = snap[i], z = snap[i + 1], t = snap[i + 2], d = snap[i + 3];
        if (t) rect(x, z, x, z, t, d); else erase(x, z, 0.1);
      }
    });
  }

  function strokeStart(pt, erasing) {
    const r = radius();
    st.snapshot = { box: [pt.x - r, pt.z - r, pt.x + r, pt.z + r], data: null, erasing };
    st.changed = 0;
  }
  function expand(pt) {
    const r = radius(), b = st.snapshot.box;
    b[0] = Math.min(b[0], pt.x - r); b[1] = Math.min(b[1], pt.z - r);
    b[2] = Math.max(b[2], pt.x + r); b[3] = Math.max(b[3], pt.z + r);
  }
  function apply(pt, erasing) {
    const z1 = zoning(); if (!z1) return;
    const r = radius();
    const n = erasing ? z1.erase(pt.x, pt.z, r) : z1.paint(pt.x, pt.z, r, S.options.type || 'residential', S.options.density || 'low');
    st.changed += n || 0;
  }
  return {
    name: 'zone',
    cursor: 'cell',
    activate() { st.painting = 0; st.marquee = null; zoning()?.setOverlayVisible?.(true); },
    deactivate() { st.painting = 0; st.marquee = null; zoning()?.setOverlayVisible?.(false); },
    cancel() { st.painting = 0; st.marquee = null; S.dirty(); },
    hover() { S.dirty(); },
    down(pt, button) {
      const brush = S.options.brush || 'paint';
      if (brush === 'marquee') { st.marquee = { x0: pt.x, z0: pt.z, x1: pt.x, z1: pt.z, erasing: button === 2 }; return; }
      st.painting = button === 2 ? 2 : 1;
      strokeStart(pt, st.painting === 2);
      st.snapshot.data = snapshotArea(pt.x - 120, pt.z - 120, pt.x + 120, pt.z + 120);
      apply(pt, st.painting === 2);
    },
    drag(pt) {
      if (st.marquee) { st.marquee.x1 = pt.x; st.marquee.z1 = pt.z; S.dirty(); return; }
      if (!st.painting) return;
      expand(pt);
      apply(pt, st.painting === 2);
      S.dirty();
    },
    up(pt) {
      if (st.marquee) {
        const m = st.marquee;
        const before = snapshotArea(m.x0 - 8, m.z0 - 8, m.x1 + 8, m.z1 + 8);
        const z1 = zoning();
        let n = 0;
        z1?.bulk(({ rect, erase }) => {
          if (m.erasing) erase((m.x0 + m.x1) / 2, (m.z0 + m.z1) / 2, Math.hypot(m.x1 - m.x0, m.z1 - m.z0) / 2);
          else { rect(m.x0, m.z0, m.x1, m.z1, S.options.type || 'residential', S.options.density || 'low'); n = 1; }
        });
        const after = snapshotArea(m.x0 - 8, m.z0 - 8, m.x1 + 8, m.z1 + 8);
        if (n) S.undo.push({ label: 'Zone area', undo: () => restore(before), redo: () => restore(after) });
        st.marquee = null;
        S.dirty();
        return;
      }
      if (!st.painting) return;
      const b = st.snapshot?.box;
      const before = st.snapshot?.data;
      const erasing = st.painting === 2;
      const changed = st.changed;
      st.painting = 0; st.snapshot = null;
      if (changed && before && b) {
        const after = snapshotArea(b[0] - 8, b[1] - 8, b[2] + 8, b[3] + 8);
        S.undo.push({
          label: `${erasing ? 'De-zone' : 'Zone'} (${changed} cells)`,
          undo: () => restore(before), redo: () => restore(after),
        });
      }
    },
    key(e) {
      if (e.code === 'BracketLeft') { S.setOption('size', clamp((S.options.size ?? 24) - 8, 8, 96)); return true; }
      if (e.code === 'BracketRight') { S.setOption('size', clamp((S.options.size ?? 24) + 8, 8, 96)); return true; }
      return false;
    },
    draw() {
      const g = S.giz, h = S.hover;
      g.clearGhost();
      if (!h) { g.hideBrush(); g.clearFlat(); return; }
      const t = S.options.type || 'residential', d = S.options.density || 'low';
      const col = (ZONE_HEX[t] || ZONE_HEX.residential)[d] || ZONE_HEX.residential.low;
      const erasing = st.painting === 2 || (st.marquee && st.marquee.erasing);
      const c = erasing ? GC.bulldoze : col;
      const brush = S.options.brush || 'paint';
      g.beginFlat();
      let n = 0;
      if (brush === 'marquee' && st.marquee) {
        const m = st.marquee;
        const list = collectRect(m.x0, m.z0, m.x1, m.z1);
        for (let i = 0; i < list.length; i += 2) g.cell(list[i], list[i + 1], cell() - 0.7, c, 0.42);
        n = list.length / 2;
        g.rectOutline((m.x0 + m.x1) / 2, (m.z0 + m.z1) / 2, Math.abs(m.x1 - m.x0), Math.abs(m.z1 - m.z0), 0, 1.1, [1, 1, 1], 0.8);
        g.hideBrush();
      } else {
        const r = radius();
        const list = collect(h.x, h.z, r);
        for (let i = 0; i < list.length; i += 2) g.cell(list[i], list[i + 1], cell() - 0.7, c, 0.42);
        n = list.length / 2;
        g.showBrush(h.x, h.z, r, 'flatten', { fill: 0.10, grid: 0.0, rimIn: 0.93 });
        g.brush.mesh.material.uniforms.uColor.value.setRGB(c[0], c[1], c[2]);
        g.brush.mesh.material.uniforms.uRim.value.setRGB(Math.min(1, c[0] + 0.4), Math.min(1, c[1] + 0.4), Math.min(1, c[2] + 0.4));
      }
      g.endFlat();
      const T = S.ctx.world.terrain;
      const y = T.getHeight(h.x, h.z);
      const label = erasing ? 'De-zone' : `${t[0].toUpperCase()}${t.slice(1)} · ${d === 'high' ? 'high' : 'low'}`;
      S.chips.add(h.x, y + 2, h.z, ICON.cells, label, '', 0, -46);
      S.chips.add(h.x, y + 2, h.z, ICON.area, `${n} cells`, '', 0, -26, `${(n * 64 / 1000).toFixed(1)} k m²`);
    },
    state() { return { painting: st.painting }; },
  };
}

// ------------------------------------------------------------------------------------- terrain tool

export function terrainTool(S) {
  const st = { active: false, acc: 0, target: 0, box: null, before: null, moved: 0 };
  const T = () => S.ctx.world.terrain;
  const radius = () => clamp(S.options.size ?? 40, 10, 200) * 0.5;
  const strength = () => clamp((S.options.strength ?? 50) / 100, 0.05, 1);
  const mode = () => S.options.mode || 'raise';

  function snapshot(x, z, r) {
    const t = T();
    if (!t.heights) return null;
    const res = t.resolution, cellS = t.cellSize, halfW = (res - 1) * cellS / 2;
    const m = 12;
    const ix0 = clamp(Math.floor((x - r + halfW) / cellS) - m, 0, res - 1);
    const ix1 = clamp(Math.ceil((x + r + halfW) / cellS) + m, 0, res - 1);
    const iz0 = clamp(Math.floor((z - r + halfW) / cellS) - m, 0, res - 1);
    const iz1 = clamp(Math.ceil((z + r + halfW) / cellS) + m, 0, res - 1);
    const w = ix1 - ix0 + 1, hgt = iz1 - iz0 + 1;
    const data = new Float32Array(w * hgt);
    for (let iz = 0; iz < hgt; iz++) data.set(t.heights.subarray((iz0 + iz) * res + ix0, (iz0 + iz) * res + ix1 + 1), iz * w);
    return { ix0, iz0, w, h: hgt, data, res, cellS, halfW };
  }

  function writeBack(snap) {
    const t = T();
    if (!snap || !t.heights) return;
    for (let iz = 0; iz < snap.h; iz++) t.heights.set(snap.data.subarray(iz * snap.w, (iz + 1) * snap.w), (snap.iz0 + iz) * snap.res + snap.ix0);
    const cx = (snap.ix0 + snap.w / 2) * snap.cellS - snap.halfW;
    const cz = (snap.iz0 + snap.h / 2) * snap.cellS - snap.halfW;
    const r = Math.hypot(snap.w, snap.h) * 0.5 * snap.cellS + snap.cellS * 2;
    t.modify({ x: cx, z: cz, radius: r, strength: 0, mode: 'raise' });   // refresh derived data + event
  }

  return {
    name: 'terrain',
    cursor: 'crosshair',
    activate() { st.active = false; },
    deactivate() { this.cancel(); },
    cancel() { st.active = false; st.before = null; S.dirty(); },
    hover() { S.dirty(); },
    down(pt, button) {
      if (button === 2) return;
      st.active = true;
      st.acc = 0.02;
      st.target = T().getHeight(pt.x, pt.z);
      st.moved = 0;
      st.before = snapshot(pt.x, pt.z, radius() * 2.2);
      st.box = { x: pt.x, z: pt.z, r: radius() };
    },
    drag(pt) { if (st.active) { st.box.x = pt.x; st.box.z = pt.z; } S.dirty(); },
    up() {
      if (!st.active) return;
      st.active = false;
      const before = st.before; st.before = null;
      if (!before || st.moved <= 0) return;
      const after = snapshot(st.box.x, st.box.z, radius() * 2.2);
      const cost = Math.round(st.moved);
      S.spend(cost, 'terraform');
      S.undo.push({
        label: `${mode()[0].toUpperCase()}${mode().slice(1)} terrain`,
        undo() { writeBack(before); S.refund(cost); },
        redo() { writeBack(after); S.spend(cost, 'terraform'); },
      });
    },
    tick(dt) {
      if (!st.active || !S.hover) return;
      st.acc += dt;
      const period = 0.05;
      while (st.acc >= period) {
        st.acc -= period;
        const r = radius();
        const s = strength();
        const brush = { x: S.hover.x, z: S.hover.z, radius: r, mode: mode(), strength: mode() === 'raise' || mode() === 'lower' ? s * 1.1 : s * 0.5 };
        if (mode() === 'flatten') brush.target = st.target;
        T().modify(brush);
        const vol = Math.PI * r * r * (mode() === 'raise' || mode() === 'lower' ? s * 1.1 : s * 0.25) * 0.5;
        st.moved += vol * TERRAIN_COST_PER_M3;
      }
    },
    key(e) {
      if (e.code === 'BracketLeft') { S.setOption('size', clamp((S.options.size ?? 40) - 10, 10, 200)); return true; }
      if (e.code === 'BracketRight') { S.setOption('size', clamp((S.options.size ?? 40) + 10, 10, 200)); return true; }
      return false;
    },
    draw() {
      const g = S.giz, h = S.hover;
      g.clearGhost(); g.clearFlat();
      if (!h) { g.hideBrush(); return; }
      const r = radius();
      g.showBrush(h.x, h.z, r, mode(), { fill: 0.17, grid: 0.10, gridSize: 16, rimIn: 0.925 });
      const y = S.ctx.world.terrain.getHeight(h.x, h.z);
      const label = { raise: 'Raise', lower: 'Lower', flatten: 'Level', smooth: 'Smooth' }[mode()] || mode();
      S.chips.add(h.x, y + 2, h.z, ICON.height, `${y.toFixed(1)} m`, '', 0, -46, label);
      S.chips.add(h.x, y + 2, h.z, ICON.radius, `${Math.round(r * 2)} m`, '', 0, -26, `${S.options.strength ?? 50} %`);
      if (st.moved > 1) S.chips.add(h.x, y + 2, h.z, ICON.cost, money(st.moved), 'cost', 0, -66);
    },
    state() { return { active: st.active }; },
  };
}

// ------------------------------------------------------------------------------------- service tool

export function serviceTool(S) {
  const st = { heading: 0, valid: null };
  const def = () => serviceDef(S.options.kind || (S.ctx.world.services.kinds || [])[0] || 'park_small');

  function evaluate(d, x, z, heading) {
    const T = S.ctx.world.terrain;
    const out = { ok: true, reason: '', frontage: null, slope: 0, cost: d.cost };
    const s = Math.sin(heading), c = Math.cos(heading);
    let minY = Infinity, maxY = -Infinity;
    for (const [u, v] of [[-d.w / 2, -d.d / 2], [d.w / 2, -d.d / 2], [d.w / 2, d.d / 2], [-d.w / 2, d.d / 2], [0, 0]]) {
      const px = x + u * c - v * s, pz = z + u * s + v * c;
      const y = T.getHeight(px, pz);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      if (T.isWater(px, pz)) { out.ok = false; out.reason = 'Cannot build on water'; }
      if (Math.abs(px) > 1010 || Math.abs(pz) > 1010) { out.ok = false; out.reason = 'Outside the map'; }
    }
    out.slope = maxY - minY;
    if (out.ok && out.slope > Math.max(4, Math.min(d.w, d.d) * 0.18)) { out.ok = false; out.reason = 'Ground too uneven'; }
    const ne = S.ctx.world.roads.nearestEdge?.(x, z, d.frontage + Math.max(d.w, d.d) * 0.6);
    out.frontage = ne || null;
    if (out.ok && !ne) { out.ok = false; out.reason = 'Needs road access'; }
    if (out.ok && !S.afford(d.cost)) { out.ok = false; out.reason = 'Not enough funds'; }
    return out;
  }

  return {
    name: 'service',
    cursor: 'copy',
    activate() { st.heading = 0; },
    deactivate() { st.valid = null; },
    cancel() { S.select(null); },
    hover() {
      const h = S.hover; if (!h) { st.valid = null; return; }
      const d = def();
      // face the nearest road
      const ne = S.ctx.world.roads.nearestEdge?.(h.x, h.z, 120);
      if (ne && !S.mods.shift) st.heading = Math.atan2(ne.point.z - h.z, ne.point.x - h.x) + Math.PI / 2;
      st.valid = evaluate(d, h.x, h.z, st.heading);
      S.dirty();
    },
    down(pt, button) {
      if (button === 2) { S.select(null); return; }
      const d = def();
      const ev = evaluate(d, pt.x, pt.z, st.heading);
      if (!ev.ok) { S.toast(ev.reason); return; }
      const sv = S.ctx.world.services;
      let id = null;
      try { id = sv.place?.(d.kind, pt.x, pt.z, st.heading); } catch (e) { S.ctx.log.warn(`services.place failed: ${e?.message}`); }
      if (id === null || id === undefined || id === -1) { S.toast('Service placement unavailable'); return; }
      S.spend(d.cost, `service ${d.kind}`);
      S.undo.push({
        label: `Build ${d.label}`,
        undo() { try { sv.remove?.(id); } catch (e) { /* stub */ } S.refund(d.cost); },
        redo() { try { id = sv.place?.(d.kind, pt.x, pt.z, st.heading); } catch (e) { /* stub */ } S.spend(d.cost, 'redo'); },
      });
      S.selectObject('service', id);
    },
    drag() {},
    up() {},
    key(e) {
      if (e.code === 'KeyR') { st.heading += (e.shiftKey ? -1 : 1) * Math.PI / 8; S.dirty(); return true; }
      return false;
    },
    draw() {
      const g = S.giz, h = S.hover;
      g.clearGhost();
      if (!h) { g.clearFlat(); g.hideCoverage(); return; }
      const d = def();
      const ev = st.valid || evaluate(d, h.x, h.z, st.heading);
      const col = ev.ok ? [0.55, 0.82, 1.0] : GC.invalid;
      if (d.coverage > 0) g.showCoverage(h.x, h.z, d.coverage, ev.ok ? [0.35, 0.85, 1.0] : GC.invalid);
      else g.hideCoverage();
      g.beginFlat();
      g.footprint(h.x, h.z, d.w, d.d, st.heading, d.h, col, ev.ok ? 0.18 : 0.26);
      if (ev.frontage) {
        const p = ev.frontage.point;
        g.groundLine(h.x, h.z, p.x, p.z, 1.2, ev.ok ? [0.4, 1, 0.55] : GC.invalid, 0.8, true);
        g.marker(p.x, p.z, 1.8, ev.ok ? [0.45, 1, 0.6] : GC.invalid);
      }
      g.endFlat();
      const T = S.ctx.world.terrain;
      const y = T.getHeight(h.x, h.z);
      S.chips.add(h.x, y + d.h + 2, h.z, ICON.info, d.label, '', 0, -20);
      if (d.coverage > 0) S.chips.add(h.x, y + 1, h.z, ICON.radius, `${d.coverage} m`, '', 0, 26);
      if (ev.ok) S.chips.add(h.x, y + d.h + 2, h.z, ICON.cost, money(d.cost), 'cost', 0, -40);
      else S.chips.add(h.x, y + d.h + 2, h.z, ICON.bad, ev.reason, 'bad', 0, -40);
    },
    state() { return { heading: st.heading, valid: st.valid }; },
    _setHeading(a) { st.heading = a; },
  };
}

// ---------------------------------------------------------------------------------------- prop tool

export function propTool(S) {
  const st = { heading: 0, warned: false };
  const kind = () => S.options.kind || 'tree_oak';
  return {
    name: 'prop',
    cursor: 'copy',
    activate() { st.heading = 0; },
    deactivate() {},
    cancel() { S.select(null); },
    hover() { S.dirty(); },
    down(pt, button) {
      if (button === 2) { S.select(null); return; }
      const api = S.ctx.modules.props;
      const cost = PROP_COST[kind()] ?? 50;
      if (typeof api?.place !== 'function') {
        if (!st.warned) { st.warned = true; S.ctx.log.info('props module exposes no place() API — prop tool is preview only'); }
        S.toast('Prop placement not available yet');
        return;
      }
      const id = api.place(kind(), pt.x, pt.z, st.heading);
      if (id == null || id < 0) return;
      S.spend(cost, `prop ${kind()}`);
      S.undo.push({ label: `Place ${kind()}`, undo() { api.remove?.(id); S.refund(cost); }, redo() { api.place(kind(), pt.x, pt.z, st.heading); S.spend(cost, 'redo'); } });
    },
    drag() {}, up() {},
    key(e) { if (e.code === 'KeyR') { st.heading += Math.PI / 6; S.dirty(); return true; } return false; },
    draw() {
      const g = S.giz, h = S.hover;
      g.clearGhost(); g.hideCoverage();
      if (!h) { g.clearFlat(); g.hideBrush(); return; }
      const k = kind();
      const big = /tree|bus_stop/.test(k);
      const w = big ? 5 : 2.4, ht = /tree_pine/.test(k) ? 14 : /tree/.test(k) ? 10 : /streetlamp|trafficlight/.test(k) ? 7 : 1.6;
      g.beginFlat();
      g.footprint(h.x, h.z, w, w, st.heading, ht, [0.55, 0.9, 0.65], 0.16);
      g.endFlat();
      g.showBrush(h.x, h.z, Math.max(4, w * 1.6), 'raise', { fill: 0.05, rimIn: 0.94 });
      const y = S.ctx.world.terrain.getHeight(h.x, h.z);
      S.chips.add(h.x, y + ht, h.z, ICON.info, k.replace(/_/g, ' '), '', 0, -20);
      S.chips.add(h.x, y + ht, h.z, ICON.cost, money(PROP_COST[k] ?? 50), 'cost', 0, -40);
    },
    state() { return { heading: st.heading }; },
  };
}

// ----------------------------------------------------------------------------------- bulldoze tool

export function bulldozeTool(S) {
  const st = { marquee: null, target: null };
  return {
    name: 'bulldoze',
    cursor: 'crosshair',
    activate() { st.target = null; },
    deactivate() { st.marquee = null; },
    cancel() { st.marquee = null; S.dirty(); },
    hover() { st.target = S.hover ? S.pick(S.hover.x, S.hover.z) : null; S.dirty(); },
    down(pt, button) {
      if (button === 2) { this.cancel(); return; }
      if ((S.options.mode || 'single') === 'marquee') { st.marquee = { x0: pt.x, z0: pt.z, x1: pt.x, z1: pt.z }; return; }
      const t = st.target || S.pick(pt.x, pt.z);
      if (t) S.demolish(t);
    },
    drag(pt) { if (st.marquee) { st.marquee.x1 = pt.x; st.marquee.z1 = pt.z; S.dirty(); } },
    up() {
      if (!st.marquee) return;
      const m = st.marquee; st.marquee = null;
      const x0 = Math.min(m.x0, m.x1), x1 = Math.max(m.x0, m.x1);
      const z0 = Math.min(m.z0, m.z1), z1 = Math.max(m.z0, m.z1);
      if (x1 - x0 < 2 || z1 - z0 < 2) return;
      const hits = S.pickArea(x0, z0, x1, z1);
      for (const t of hits) S.demolish(t);
      S.dirty();
    },
    key() { return false; },
    draw() {
      const g = S.giz, h = S.hover;
      g.clearGhost(); g.hideCoverage(); g.hideBrush();
      g.beginFlat();
      if (st.marquee) {
        const m = st.marquee;
        g.rectOutline((m.x0 + m.x1) / 2, (m.z0 + m.z1) / 2, Math.abs(m.x1 - m.x0), Math.abs(m.z1 - m.z0), 0, 1.2, GC.bulldoze, 0.9);
      }
      const t = st.target;
      if (t) {
        if (t.kind === 'road') {
          g.setGhost(S.edgePath(t.id), t.width || 16, 'invalid', { noArrows: true, fillA: 0.3 });
        } else {
          g.selectionCage(t.x, t.z, t.w, t.d, t.heading || 0, t.height || 6, GC.bulldoze);
        }
        const y = S.ctx.world.terrain.getHeight(t.x, t.z);
        const refund = S.refundOf(t);
        S.chips.add(t.x, y + (t.height || 4) + 1, t.z, ICON.bad, t.label || t.kind, 'bad', 0, -22);
        if (refund) S.chips.add(t.x, y + (t.height || 4) + 1, t.z, ICON.cost, `+${money(refund)}`, 'cost', 0, -42);
      } else if (h) {
        g.marker(h.x, h.z, 2.4, GC.bulldoze);
      }
      g.endFlat();
    },
    state() { return { target: st.target }; },
  };
}

// ------------------------------------------------------------------------------------- select tool

export function selectTool(S) {
  return {
    name: 'select',
    cursor: 'default',
    activate() {}, deactivate() {}, cancel() { S.selectObject(null, null); },
    hover() { S.dirty(); },
    down(pt, button) {
      if (button === 2) { S.selectObject(null, null); return; }
      const t = S.pick(pt.x, pt.z);
      if (t) S.selectObject(t.kind, t.id); else S.selectObject(null, null);
    },
    drag() {}, up() {}, key() { return false; },
    draw() {
      const g = S.giz;
      g.clearGhost(); g.hideBrush(); g.hideCoverage();
      g.beginFlat();
      if (S.hover) {
        const t = S.pick(S.hover.x, S.hover.z);
        if (t && !(S.ctx.world.selection.kind === t.kind && S.ctx.world.selection.id === t.id)) {
          g.rectOutline(t.x, t.z, t.w, t.d, t.heading || 0, 0.8, [1, 1, 1], 0.5);
        }
      }
      g.endFlat();
    },
    state() { return {}; },
  };
}
