// The individual tools. Each one is a plain object with the same small interface, sharing one state
// bag `S` (ctx, gizmos, chips, undo stack, current options, virtual cursor, modifier keys):
//
//   activate(opts) / deactivate()
//   pointer(pt)                 move the virtual cursor and rebuild the preview
//   click(button) -> {ok,...}   primary action at the cursor
//   rightClick()  -> {ok,...}   cancel one node / erase / deselect
//   commit()      -> {ok, ids, cost, reason?} | null
//   cancel()      void
//   evalDraft(d)  -> evaluation (pure: no state touched — this is what the showcase poses use)
//   draw(d)                     rebuild gizmo geometry and queue chips for a draft
//   state()       -> {phase, points, cursor, valid, reason, cost, refund, snap, metrics}
//
// Rules of the house: all randomness through ctx.rng (none needed here), every mutation of another
// module's world section goes through that section's published API, every charge goes through
// ctx.modules.simulation.spend / .earn, and every mutation that costs money pushes an undo entry.
import {
  roadPerMetre, ROAD_MULT, RULES, REASON, DEMOLISH, TERRAIN_COST_PER_M3, ZONE_COST,
  PROP_COST, serviceDef, money,
} from './costs.js';
import { ICON } from './chips.js';
import { GIZMO_COLORS as GC } from './gizmos.js';
import { ZONE_RGB_LINEAR } from './zonecolors.js';

const deg = (r) => (r * 180) / Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ANGLE_STEP = (RULES.angleStepDeg * Math.PI) / 180;
const ANGLE_ENGAGE = (RULES.angleEngageDeg * Math.PI) / 180;

const TERRAIN_COL = { raise: GC.raise, lower: GC.lower, flatten: GC.flatten, smooth: GC.smooth };
const TERRAIN_LABEL = { raise: 'Raise', lower: 'Lower', flatten: 'Level', smooth: 'Smooth' };

// ------------------------------------------------------------------------------------- shared maths

/** Resample a straight or quadratic segment at ≤ RULES.ghostSample metres (spec item 2). */
export function sampleCurve(a, b, ctrl, step = RULES.ghostSample) {
  const pts = [];
  const approx = ctrl
    ? Math.hypot(ctrl.x - a.x, ctrl.z - a.z) + Math.hypot(b.x - ctrl.x, b.z - ctrl.z)
    : Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.ceil(approx / step));
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
  const draft = { points: [], ctrl: null, cursorSnap: null, free: [] };
  const ROUNDABOUT_RADIUS = 28;
  const ROUNDABOUT_SEGMENTS = 8;

  const R = () => S.ctx.world.roads;
  const T = () => S.ctx.world.terrain;
  const type = (o = S.options) => o.type || 'street';
  const mode = (o = S.options) => o.mode || 'straight';
  const widthOf = (t) => (R().types[t] || R().types.street).width;
  const isRoundabout = (o = S.options) => o.junction === 'roundabout';

  function roundaboutAt(cx, cz) {
    const r = ROUNDABOUT_RADIUS, rc = r / Math.cos(Math.PI / ROUNDABOUT_SEGMENTS);
    const points = Array.from({ length: ROUNDABOUT_SEGMENTS }, (_, i) => {
      const a = i / ROUNDABOUT_SEGMENTS * Math.PI * 2;
      return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r };
    });
    const segments = points.map((a, i) => {
      const b = points[(i + 1) % points.length];
      const m = (i + 0.5) / ROUNDABOUT_SEGMENTS * Math.PI * 2;
      return { a, b, ctrl: { x: cx + Math.cos(m) * rc, z: cz + Math.sin(m) * rc } };
    });
    return { cx, cz, r, points, segments };
  }

  /** Snap a raw world point. `from` is the previous point (for angle snapping). */
  function snap(x, z, from, o = S.options) {
    const rd = R();
    const snaps = Array.isArray(o.snap) ? o.snap : ['magnet'];
    const magnet = snaps.includes('magnet');
    const gridOn = snaps.includes('snap');
    if (magnet && !S.mods.alt) {
      let best = null, bd = RULES.nodeSnap;
      for (const n of rd.nodes.values()) {
        const d = Math.hypot(n.x - x, n.z - z);
        if (d < bd) { bd = d; best = n; }
      }
      if (best) return { kind: 'node', id: best.id, x: best.x, z: best.z, node: best.id, edge: null };
      const ne = rd.nearestEdge(x, z, RULES.edgeSnap);
      if (ne && ne.edge) {
        const e = ne.edge;
        const dA = ne.t * e.length, dB = (1 - ne.t) * e.length;
        if (dA < RULES.nodeSnap) { const n = rd.nodes.get(e.a); if (n) return { kind: 'node', id: n.id, x: n.x, z: n.z, node: n.id, edge: null }; }
        if (dB < RULES.nodeSnap) { const n = rd.nodes.get(e.b); if (n) return { kind: 'node', id: n.id, x: n.x, z: n.z, node: n.id, edge: null }; }
        return { kind: 'edge', id: e.id, x: ne.point.x, z: ne.point.z, node: null, edge: e.id, t: ne.t };
      }
    }
    if (from && !S.mods.shift) {
      const dx = x - from.x, dz = z - from.z;
      const len = Math.hypot(dx, dz);
      if (len > 1) {
        const ang = Math.atan2(dz, dx);
        const cands = [Math.round(ang / ANGLE_STEP) * ANGLE_STEP];
        const rd2 = R();
        const n = from.node != null ? rd2.nodes.get(from.node) : null;
        if (n) {
          for (const eid of n.edges) {
            const e = rd2.edges.get(eid); if (!e) continue;
            const other = rd2.nodes.get(e.a === n.id ? e.b : e.a); if (!other) continue;
            const base = Math.atan2(other.z - n.z, other.x - n.x);
            cands.push(base + Math.round((ang - base) / ANGLE_STEP) * ANGLE_STEP);
          }
        }
        let bestA = cands[0], bd = Infinity;
        for (const c of cands) {
          const d = Math.abs(Math.atan2(Math.sin(c - ang), Math.cos(c - ang)));
          if (d < bd) { bd = d; bestA = c; }
        }
        if (bd < ANGLE_ENGAGE) {
          return {
            kind: 'angle', id: Math.round(deg(bestA)), x: from.x + Math.cos(bestA) * len, z: from.z + Math.sin(bestA) * len,
            node: null, edge: null,
          };
        }
      }
    }
    if (gridOn && !S.mods.shift) {
      const gx = Math.round(x / RULES.gridSnap) * RULES.gridSnap;
      const gz = Math.round(z / RULES.gridSnap) * RULES.gridSnap;
      return { kind: 'grid', id: `${gx}:${gz}`, x: gx, z: gz, node: null, edge: null };
    }
    return { kind: null, id: null, x, z, node: null, edge: null };
  }

  /** The angle (deg) between a new direction and every road already at node `nodeId`; min. */
  function sharedAngle(nodeId, dirRad) {
    const rd = R();
    const n = nodeId != null ? rd.nodes.get(nodeId) : null;
    if (!n || !n.edges || !n.edges.size) return null;
    let best = 999;
    for (const eid of n.edges) {
      const e = rd.edges.get(eid); if (!e) continue;
      const o = rd.nodes.get(e.a === n.id ? e.b : e.a); if (!o) continue;
      const base = Math.atan2(o.z - n.z, o.x - n.x);
      const d = Math.abs(deg(Math.atan2(Math.sin(dirRad - base), Math.cos(dirRad - base))));
      if (d < best) best = d;
    }
    return best;
  }

  /**
   * Evaluate a road draft. Pure — reads the world, writes nothing. Used identically by the live
   * tool, by the showcase poses and by costOf().
   * d = {type, mode, elevation, oneWay, points:[{x,z,node,edge}], cursor:{x,z}|null, ctrl}
   */
  function evalDraft(d) {
    const t = d.type || 'street';
    const el = d.elevation || 0;
    const last = d.points[d.points.length - 1];
    const includeCursor = d.cursor && (!last || Math.hypot(last.x - d.cursor.x, last.z - d.cursor.z) > 0.01);
    const pts = includeCursor ? [...d.points, d.cursor] : [...d.points];
    const out = {
      type: t, width: widthOf(t), path: [], segs: [], ok: true, reason: null, cost: 0,
      length: 0, grade: 0, angle: 0, points: pts,
    };
    if (pts.length < 2) { out.ok = false; out.reason = REASON.empty; return out; }
    const Tr = T();
    let cost = 0;
    const path = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const ctrl = (i === pts.length - 1 && d.ctrl) ? d.ctrl : null;
      const sub = sampleCurve(a, b, ctrl);
      const len = pathLength(sub);
      const yA = Tr.getHeight(a.x, a.z), yB = Tr.getHeight(b.x, b.z);
      const grade = len > 0.5 ? (yB - yA) / len : 0;
      let water = 0, cut = 0, s = 0, outside = false;
      for (let k = 0; k < sub.length; k++) {
        const p = sub[k];
        if (k > 0) s += Math.hypot(p.x - sub[k - 1].x, p.z - sub[k - 1].z);
        const design = yA + (yB - yA) * (len > 0 ? s / len : 0) + el;
        const g = Tr.getHeight(p.x, p.z);
        cut = Math.max(cut, Math.abs(design - g));
        if (Tr.isWater(p.x, p.z)) water++;
        if (Math.abs(p.x) > RULES.mapBound || Math.abs(p.z) > RULES.mapBound) outside = true;
      }
      const waterFrac = sub.length ? water / sub.length : 0;
      let c = roadPerMetre(t, d.oneWay) * len;
      if (waterFrac > 0.02) c *= 1 + (ROAD_MULT.bridge - 1) * waterFrac;
      const ag = Math.abs(grade);
      if (ag > 0.04) c *= 1 + ROAD_MULT.slope * (ag - 0.04);
      if (Math.abs(el) > 1) c *= ROAD_MULT.elevated;
      cost += c;
      const seg = { a, b, sub, len, grade, waterFrac, cut, outside, mid: pathPoint(sub, 0.5) };
      out.segs.push(seg);
      out.length += len;
      if (Math.abs(grade) > Math.abs(out.grade)) out.grade = grade;
      for (let k = (i === 1 ? 0 : 1); k < sub.length; k++) path.push(sub[k]);
    }
    out.path = path;
    out.cost = Math.max(0, Math.round(cost));

    // interior corners
    out.corners = [];
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i - 1], q = pts[i], r = pts[i + 1];
      const a1 = Math.atan2(q.z - p.z, q.x - p.x), a2 = Math.atan2(r.z - q.z, r.x - q.x);
      const turn = deg(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
      out.corners.push({ at: q, deg: 180 - Math.abs(turn) });
    }
    // the angle metric: the corner at the anchor against the roads already there
    const dir0 = Math.atan2(pts[1].z - pts[0].z, pts[1].x - pts[0].x);
    const sa = sharedAngle(pts[0].node, dir0);
    out.angle = out.corners.length ? out.corners[0].deg : (sa != null ? sa : ((deg(dir0) + 360) % 360));

    // rules, in the spec's order
    const maxGrade = t === 'highway' ? RULES.maxGradeHighway : RULES.maxGrade;
    for (const seg of out.segs) {
      if (seg.outside) { out.ok = false; out.reason = REASON.bounds; break; }
      if (seg.len < RULES.minSegment) { out.ok = false; out.reason = `Too short — ${RULES.minSegment} m minimum`; break; }
      if (Math.abs(seg.grade) > maxGrade) {
        out.ok = false;
        out.reason = `Grade ${(Math.abs(seg.grade) * 100).toFixed(0)} % > ${(maxGrade * 100).toFixed(0)} %`;
        break;
      }
      if (seg.waterFrac > 0.02 && el < RULES.waterElevation) { out.ok = false; out.reason = REASON.crossWater; break; }
      if (seg.cut > RULES.maxCut && seg.waterFrac < 0.2) { out.ok = false; out.reason = REASON.uneven; break; }
    }
    if (out.ok && (Tr.isWater(pts[0].x, pts[0].z) || Tr.isWater(pts[pts.length - 1].x, pts[pts.length - 1].z)) && el < RULES.waterElevation) {
      out.ok = false; out.reason = REASON.water;
    }
    if (out.ok && sa != null && sa < RULES.minSharedAngle) {
      out.ok = false; out.reason = `Angle ${sa.toFixed(0)} ° < ${RULES.minSharedAngle} °`;
    }
    if (out.ok) {
      const lastDir = Math.atan2(pts[pts.length - 1].z - pts[pts.length - 2].z, pts[pts.length - 1].x - pts[pts.length - 2].x);
      const sb = sharedAngle(pts[pts.length - 1].node, lastDir + Math.PI);
      if (sb != null && sb < RULES.minSharedAngle) { out.ok = false; out.reason = `Angle ${sb.toFixed(0)} ° < ${RULES.minSharedAngle} °`; }
    }
    if (out.ok && !S.afford(out.cost)) { out.ok = false; out.reason = REASON.funds; }
    return out;
  }

  function evalRoundabout(cx, cz) {
    const ring = roundaboutAt(cx, cz);
    const out = { ...ring, ok: true, reason: null, cost: 0, length: 0, grade: 0, path: [] };
    // A prefab is placed on open ground. Existing streets can then snap to any of its eight real
    // nodes; silently laying a ring across an existing graph would create crossings without graph
    // ownership, so reject that pose instead.
    const near = R().nearestEdge?.(cx, cz, ring.r + widthOf('street'));
    if (near && near.dist < ring.r + widthOf('street') * 0.7) {
      out.ok = false; out.reason = 'Move away from existing roads';
    }
    for (let i = 0; i < ring.segments.length; i++) {
      const seg = ring.segments[i];
      const ev = evalDraft({ type: 'street', mode: 'curve', elevation: 0, oneWay: true,
        points: [seg.a, seg.b], cursor: null, ctrl: seg.ctrl });
      if (!out.path.length) out.path.push(...ev.path); else out.path.push(...ev.path.slice(1));
      out.cost += ev.cost; out.length += ev.length;
      if (Math.abs(ev.grade) > Math.abs(out.grade)) out.grade = ev.grade;
      if (out.ok && !ev.ok) { out.ok = false; out.reason = ev.reason; }
    }
    if (out.path.length) out.path.push({ ...out.path[0] });
    if (out.ok && !S.afford(out.cost)) { out.ok = false; out.reason = REASON.funds; }
    return out;
  }

  function currentDraft() {
    return {
      tool: 'road', type: type(), mode: mode(), elevation: S.options.elevation || 0, oneWay: !!S.options.oneWay,
      points: draft.points, cursor: draft.cursorSnap, ctrl: draft.ctrl,
    };
  }

  function refresh() {
    const c = S.cursor;
    if (!c) { draft.cursorSnap = null; return; }
    const from = draft.points.length ? draft.points[draft.points.length - 1] : null;
    draft.cursorSnap = snap(c.x, c.z, from);
  }

  // -------------------------------------------------------------------- committing
  function splitEdge(edgeId, x, z, journal) {
    const rd = R();
    const e = rd.edges.get(edgeId);
    if (!e || e.ctrl) return null;
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

  function descOf(rd, id) {
    const e = rd.edges.get(id); if (!e) return null;
    const a = rd.nodes.get(e.a), b = rd.nodes.get(e.b);
    if (!a || !b) return null;
    return { ax: a.x, az: a.z, bx: b.x, bz: b.z, type: e.type, lanes: e.lanes, oneWay: e.oneWay, elevation: e.elevation, ctrl: e.ctrl ? { x: e.ctrl.x, z: e.ctrl.z } : null };
  }
  function reAdd(rd, d) {
    const a = rd.addNode(d.ax, d.az), b = rd.addNode(d.bx, d.bz);
    return rd.addEdge(a, b, d.type, { lanes: d.lanes, oneWay: d.oneWay, elevation: d.elevation, ctrl: d.ctrl });
  }

  function commitRoad() {
    const d = currentDraft();
    const last = d.points[d.points.length - 1];
    if (d.cursor && last && Math.hypot(last.x - d.cursor.x, last.z - d.cursor.z) > 0.01) d.points = [...d.points, d.cursor];
    // Finish the displayed path, including an unclicked live endpoint.
    if (d.points.length < 2) {
      const ev = evalDraft(d);
      return { ok: false, ids: [], cost: 0, reason: ev.reason || REASON.empty };
    }
    const ev = evalDraft({ ...d, cursor: null });
    if (!ev.ok) return { ok: false, ids: [], cost: ev.cost, reason: ev.reason };
    const rd = R();
    const clone = (value) => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
    const roadsApi = S.ctx.modules.roads, zoningApi = S.ctx.modules.zoning, buildingsApi = S.ctx.modules.buildings;
    // A previous road edit may still be inside Zoning's 60 ms coalescing window. Settle its owner
    // journal before this transaction captures a pre-image, otherwise two fast commits can pair the
    // current road graph with the previous lot table.
    if (zoningApi?.settleForHistory?.() === false) {
      return { ok: false, ids: [], cost: 0, reason: 'Road history unavailable' };
    }
    const roadsBefore = clone(roadsApi?.serialize?.());
    const zoningBefore = clone(zoningApi?.serialize?.());
    const buildingsBefore = clone(buildingsApi?.serialize?.());
    if (!roadsBefore || !zoningBefore || !buildingsBefore ||
        typeof roadsApi?.restoreTransaction !== 'function' || typeof buildingsApi?.restoreTransaction !== 'function') {
      return { ok: false, ids: [], cost: 0, reason: 'Road history unavailable' };
    }
    const journal = { added: [], removed: [] };
    const ids = [];
    const heights = S.snapshotHeights(d.points);
    let prevId = null;
    for (let i = 0; i < d.points.length; i++) {
      const p = d.points[i];
      let id = p.node;
      if (id == null && p.edge != null) id = splitEdge(p.edge, p.x, p.z, journal);
      if (id == null) id = rd.addNode(p.x, p.z);
      if (prevId != null && id !== prevId) {
        const opts = { oneWay: d.oneWay, elevation: d.elevation };
        if (i === d.points.length - 1 && d.ctrl) opts.ctrl = { x: d.ctrl.x, z: d.ctrl.z };
        const eid = rd.addEdge(prevId, id, d.type, opts);
        if (eid > 0) { journal.added.push(eid); ids.push(eid); }
      }
      prevId = id;
    }
    if (!ids.length) return { ok: false, ids: [], cost: 0, reason: REASON.empty };
    S.ctx.modules.roads?.rebuild?.();
    const roadsAfter = clone(roadsApi.serialize());
    const heightsAfter = S.snapshotHeights(d.points);
    S.spend(ev.cost, `road ${d.type}`);
    const rec = {
      added: journal.added.map((id) => descOf(rd, id)).filter(Boolean),
      removed: journal.removed.slice(),
      ids: journal.added.slice(),
    };
    const changedLotIds = (target, current) => {
      const a = new Map((target?.lots || []).map(row => [row.key, row.id]));
      const b = new Map((current?.lots || []).map(row => [row.key, row.id]));
      const ids = new Set();
      for (const key of new Set([...a.keys(), ...b.keys()])) {
        if (a.get(key) === b.get(key)) continue;
        if (Number.isInteger(a.get(key))) ids.add(a.get(key));
        if (Number.isInteger(b.get(key))) ids.add(b.get(key));
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
      // Undo/redo can be requested in the same frame as a road commit. Close the current graph's
      // deferred lot journal before capturing the compensation image so rollback never pairs that
      // graph with the previous lot table.
      try {
        if (zoningApi.settleForHistory?.() === false) return false;
      } catch (error) {
        S.ctx.log.warn(`road history settlement rejected: ${error?.message || error}`);
        return false;
      }
      const rollback = {
        roads: clone(roadsApi.serialize()), heights: S.snapshotHeights(d.points),
        zoning: clone(zoningApi.serialize()), buildings: clone(buildingsApi.serialize()),
      };
      try {
        if (!roadsApi.restoreTransaction(roads)) throw new Error('roads rejected transaction restore');
        if (!S.restoreHeights(terrain)) throw new Error('terrain rejected transaction restore');
        if (zoning) {
          const affected = new Set(changedLotIds(zoning, rollback.zoning));
          // The saved envelope predates any later construction/demolition. Preserve the current
          // building link on unchanged stable lot identities; Buildings restores only affected IDs.
          const currentByKey = new Map((rollback.zoning.lots || []).map(row => [row.key, row]));
          const targetZoning = clone(zoning);
          for (const row of targetZoning.lots || []) {
            const current = currentByKey.get(row.key);
            if (current?.id === row.id && !affected.has(row.id)) row.buildingId = current.buildingId;
          }
          if (zoningApi.deserialize(targetZoning) === false) throw new Error('zoning rejected transaction restore');
          if (buildingsApi.restoreTransaction(buildings, [...affected]) === false) throw new Error('buildings rejected transaction restore');
          if (S.ctx.modules.simulation?.reconcileWorld?.() === false) throw new Error('simulation rejected transaction reconcile');
        }
        return true;
      } catch (error) {
        if (!rollbackOwners(rollback)) S.ctx.log.error('road history compensation failed', error);
        else S.ctx.log.warn(`road history change rejected and compensated: ${error?.message || error}`);
        return false;
      }
    };
    S.pushUndo({
      label: `road:${d.type}`, cost: ev.cost, key: 'road', fromDrag: false,
      undo() {
        if (!restoreOwners({ roads: roadsBefore, terrain: heights, zoning: zoningBefore, buildings: buildingsBefore })) return false;
        S.refund(ev.cost);
        return true;
      },
      redo() {
        if (!restoreOwners({ roads: roadsAfter, terrain: heightsAfter })) return false;
        S.spend(ev.cost, 'redo');
        return true;
      },
    });
    draft.points.length = 0; draft.ctrl = null;
    refresh();
    S.dirty();
    return { ok: true, ids, cost: ev.cost };
  }

  function placeRoundabout() {
    if (!S.cursor) return { ok: false, ids: [], cost: 0, reason: 'No cursor' };
    const ev = evalRoundabout(S.cursor.x, S.cursor.z);
    if (!ev.ok) return { ok: false, ids: [], cost: ev.cost, reason: ev.reason };
    const rd = R(), roadsApi = S.ctx.modules.roads, zoningApi = S.ctx.modules.zoning, buildingsApi = S.ctx.modules.buildings;
    const clone = (value) => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
    try { if (zoningApi?.settleForHistory?.() === false) throw new Error('Road history unavailable'); }
    catch (error) { return { ok: false, ids: [], cost: 0, reason: error?.message || 'Road history unavailable' }; }
    const roadsBefore = clone(roadsApi?.serialize?.()), zoningBefore = clone(zoningApi?.serialize?.()), buildingsBefore = clone(buildingsApi?.serialize?.());
    const heightsBefore = S.snapshotHeights(ev.points);
    if (!roadsBefore || !zoningBefore || !buildingsBefore || !heightsBefore ||
        typeof roadsApi?.restoreTransaction !== 'function' || typeof buildingsApi?.restoreTransaction !== 'function') {
      return { ok: false, ids: [], cost: 0, reason: 'Road history unavailable' };
    }
    const ids = [], nodeIds = ev.points.map(p => rd.addNode(p.x, p.z));
    for (let i = 0; i < ev.segments.length; i++) {
      const eid = rd.addEdge(nodeIds[i], nodeIds[(i + 1) % nodeIds.length], 'street',
        { oneWay: true, elevation: 0, ctrl: ev.segments[i].ctrl });
      if (eid > 0) ids.push(eid);
    }
    if (ids.length !== ROUNDABOUT_SEGMENTS || roadsApi.rebuild?.() === false) {
      roadsApi.restoreTransaction(roadsBefore); S.restoreHeights(heightsBefore);
      zoningApi.deserialize(zoningBefore); buildingsApi.deserialize(buildingsBefore); S.ctx.modules.simulation?.reconcileWorld?.();
      return { ok: false, ids: [], cost: 0, reason: 'Roundabout placement failed' };
    }
    const roadsAfter = clone(roadsApi.serialize()), heightsAfter = S.snapshotHeights(ev.points);
    S.spend(ev.cost, 'road roundabout');
    const changedLotIds = (target, current) => {
      const a = new Map((target?.lots || []).map(row => [row.key, row.id]));
      const b = new Map((current?.lots || []).map(row => [row.key, row.id]));
      const ids = new Set();
      for (const key of new Set([...a.keys(), ...b.keys()])) {
        if (a.get(key) === b.get(key)) continue;
        if (Number.isInteger(a.get(key))) ids.add(a.get(key));
        if (Number.isInteger(b.get(key))) ids.add(b.get(key));
      }
      return [...ids];
    };
    const rollbackOwners = (snap) => roadsApi.restoreTransaction(snap.roads) !== false &&
      S.restoreHeights(snap.heights) !== false && zoningApi.deserialize(snap.zoning) !== false &&
      buildingsApi.deserialize(snap.buildings) !== false && S.ctx.modules.simulation?.reconcileWorld?.() !== false;
    const restoreOwners = ({ roads, terrain, zoning = null, buildings = null }) => {
      try { if (zoningApi.settleForHistory?.() === false) return false; }
      catch (error) { S.ctx.log.warn(`roundabout history settlement rejected: ${error?.message || error}`); return false; }
      const rollback = { roads: clone(roadsApi.serialize()), heights: S.snapshotHeights(ev.points),
        zoning: clone(zoningApi.serialize()), buildings: clone(buildingsApi.serialize()) };
      try {
        if (!roadsApi.restoreTransaction(roads)) throw new Error('roads rejected roundabout restore');
        if (!S.restoreHeights(terrain)) throw new Error('terrain rejected roundabout restore');
        if (zoning) {
          const affected = new Set(changedLotIds(zoning, rollback.zoning));
          const currentByKey = new Map((rollback.zoning.lots || []).map(row => [row.key, row]));
          const targetZoning = clone(zoning);
          for (const row of targetZoning.lots || []) {
            const current = currentByKey.get(row.key);
            if (current?.id === row.id && !affected.has(row.id)) row.buildingId = current.buildingId;
          }
          if (zoningApi.deserialize(targetZoning) === false) throw new Error('zoning rejected roundabout restore');
          if (buildingsApi.restoreTransaction(buildings, [...affected]) === false) throw new Error('buildings rejected roundabout restore');
          if (S.ctx.modules.simulation?.reconcileWorld?.() === false) throw new Error('simulation rejected roundabout reconcile');
        }
        return true;
      } catch (error) {
        if (!rollbackOwners(rollback)) S.ctx.log.error('roundabout history compensation failed', error);
        else S.ctx.log.warn(`roundabout history change rejected and compensated: ${error?.message || error}`);
        return false;
      }
    };
    S.pushUndo({ label: 'road:roundabout', cost: ev.cost, key: 'road:roundabout', fromDrag: false,
      undo() { if (!restoreOwners({ roads: roadsBefore, terrain: heightsBefore, zoning: zoningBefore, buildings: buildingsBefore })) return false; S.refund(ev.cost); return true; },
      redo() { if (!restoreOwners({ roads: roadsAfter, terrain: heightsAfter })) return false; S.spend(ev.cost, 'redo roundabout'); return true; },
    });
    draft.points = []; draft.ctrl = null; draft.cursorSnap = null; S.cursor = null; refresh(); S.dirty();
    return { ok: true, ids, cost: ev.cost };
  }

  return {
    name: 'road',
    evalDraft,
    snapAt: snap,
    activate() { draft.points.length = 0; draft.ctrl = null; draft.cursorSnap = null; refresh(); },
    deactivate() { this.cancel(); },
    cancel() { draft.points.length = 0; draft.ctrl = null; refresh(); S.dirty(); },
    pointer() { refresh(); S.dirty(); },

    click(button = 0) {
      if (button === 2) return this.rightClick();
      if (!S.cursor) return { ok: false, cost: 0, reason: 'No cursor' };
      if (isRoundabout()) return placeRoundabout();
      refresh();
      const sn = draft.cursorSnap;
      if (!sn) return { ok: false, cost: 0, reason: 'No cursor' };
      if (mode() === 'curve' && draft.points.length === 1 && !draft.ctrl) {
        draft.ctrl = { x: sn.x, z: sn.z };
        S.dirty();
        return { ok: true, cost: 0 };
      }
      draft.points.push({ x: sn.x, z: sn.z, node: sn.node, edge: sn.edge });
      // Retain the snapped click until another pointer event. Re-snapping the same raw cursor
      // against this new anchor invents a short tail when an angle snap moved the endpoint.
      draft.cursorSnap = sn;
      S.dirty();
      const ev = evalDraft({ ...currentDraft(), cursor: null });
      return { ok: true, cost: ev.cost };
    },
    rightClick() {
      if (draft.ctrl) { draft.ctrl = null; refresh(); S.dirty(); return { ok: true }; }
      if (draft.points.length) { draft.points.pop(); refresh(); S.dirty(); return { ok: true }; }
      return { ok: false, reason: 'Nothing to cancel' };
    },
    commit() { return isRoundabout() ? placeRoundabout() : commitRoad(); },

    state() {
      if (isRoundabout()) {
        const ev = S.cursor ? evalRoundabout(S.cursor.x, S.cursor.z) : null;
        return { phase: 'placing', points: S.cursor ? [{ x: S.cursor.x, y: T().getHeight(S.cursor.x, S.cursor.z), z: S.cursor.z }] : [],
          valid: !!ev?.ok, reason: ev?.reason || (S.cursor ? null : 'No cursor'), cost: ev?.cost || 0, refund: 0, snap: null,
          metrics: { length: +(ev?.length || 0).toFixed(2), angle: 0, grade: +((ev?.grade || 0) * 100).toFixed(2), cells: 0, volume: 0, items: ROUNDABOUT_SEGMENTS } };
      }
      const ev = evalDraft(currentDraft());
      const Tr = T();
      const pts = ev.points.map((p) => ({ x: p.x, y: Tr.getHeight(p.x, p.z), z: p.z }));
      return {
        phase: draft.points.length ? 'drawing' : 'idle',
        points: pts,
        valid: ev.ok, reason: ev.reason, cost: ev.cost, refund: 0,
        snap: draft.cursorSnap && draft.cursorSnap.kind
          ? { kind: draft.cursorSnap.kind, id: draft.cursorSnap.id, x: draft.cursorSnap.x, z: draft.cursorSnap.z }
          : null,
        metrics: {
          length: +ev.length.toFixed(2), angle: +ev.angle.toFixed(1), grade: +(ev.grade * 100).toFixed(2),
          cells: 0, volume: 0, items: ev.segs.length,
        },
      };
    },

    // ------------------------------------------------------------------ drawing
    draw(d = currentDraft()) {
      const g = S.giz;
      if (isRoundabout(d) || isRoundabout()) {
        const c = d.cursor || S.cursor;
        if (!c) return;
        const ring = evalRoundabout(c.x, c.z);
        g.setGhost(ring.path, widthOf('street'), ring.ok ? 'valid' : 'invalid',
          ring.ok ? { fill: GC.wash, fillA: 0.46, opacity: 0.88 } : {});
        const col = ring.ok ? GC.validEdge : GC.invalidEdge;
        for (const p of ring.points) g.marker(p.x, p.z, 2.2, col, 0.30);
        S.chips.add(c.x, T().getHeight(c.x, c.z) + 3, c.z, ring.ok ? ICON.cost : ICON.bad,
          ring.ok ? `Roundabout · ${money(ring.cost)}` : ring.reason, ring.ok ? 'cost' : 'bad', 0, -26, '8 connection points', 6);
        return;
      }
      const ev = evalDraft(d);
      if (!ev.path.length) {
        if (S.cursor && d.points.length === 0) {
          const sn = d.cursor || snap(S.cursor.x, S.cursor.z, null, d);
          g.marker(sn.x, sn.z, sn.kind === 'node' ? 3.0 : 2.2, GC.validEdge, 0.30, sn.kind === 'node' ? 1.6 : 0);
        }
        return;
      }
      const w = ev.width;
      if (d.slot === 'alt') g.setGhostAlt(ev.path, w, ev.ok ? 'valid' : 'invalid');
      else {
        g.setGhost(ev.path, w, ev.ok ? 'valid' : 'invalid');
        // Keep the rendered path for the on-demand measurement API. Searching the road network
        // for a crop anchor is not rendering work and must not run on every pointer frame.
        S.landmark.path = ev.path;
        S.landmark.width = w;
      }

      // alignment guide: a dashed white centre stripe continuing past the cursor (cs2_1.jpg)
      if (ev.path.length >= 2 && ev.ok) {
        const a = ev.path[ev.path.length - 2], b = ev.path[ev.path.length - 1];
        let dx = b.x - a.x, dz = b.z - a.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        g.groundLine(b.x + dx * 8, b.z + dz * 8, b.x + dx * 96, b.z + dz * 96, 1.5, GC.validEdge, 0.72, true, 0.26);
      }
      // affected-area wash over the junction this action changes
      const anchor = ev.points[0];
      if (d.wash !== false && anchor && (anchor.node != null || anchor.edge != null)) {
        g.wash(anchor.x, anchor.z, Math.max(14, w * 0.85));
        // Sample the wash interior away from the snap disc and its chip anchor.
        S.landmark.wash = { x: anchor.x, z: anchor.z, radius: Math.max(14, w * 0.85) };
      }
      // node discs: flat white filled circles; the live cursor node is larger with a cyan halo
      const col = ev.ok ? GC.validEdge : GC.invalidEdge;
      for (let i = 0; i < ev.points.length; i++) {
        const p = ev.points[i];
        const live = i === ev.points.length - 1 && d.cursor;
        g.marker(p.x, p.z, live ? 3.2 : 2.4, col, 0.30, live ? 1.65 : 0);
      }
      if (d.ctrl) g.marker(d.ctrl.x, d.ctrl.z, 1.8, GC.cyan);

      // ---- chips: one length per segment, one angle per interior corner, grade where it matters
      const Tr = T();
      const chip = (p, icon, text, tone, dy, sub, pri) => S.chips.add(p.x, Tr.getHeight(p.x, p.z) + 2, p.z, icon, text, tone, 0, dy, sub || '', pri || 0);
      for (const seg of ev.segs) chip(seg.mid, ICON.length, `${Math.round(seg.len)} m`, '', -20, '', 3);
      for (const c of ev.corners) chip(c.at, ICON.angle, `${Math.round(c.deg)} °`, '', -20, '', 2);
      for (const seg of ev.segs) {
        if (Math.abs(seg.grade) >= 0.005) {
          chip(pathPoint(seg.sub, 0.72), ICON.grade, `${(seg.grade * 100).toFixed(1)} %`, '', -20, '', 2);
          break;
        }
      }
      const end = ev.points[ev.points.length - 1];
      if (ev.ok) chip(end, ICON.cost, money(ev.cost), 'cost', -38, '', 5);
      else chip(end, ICON.bad, ev.reason, 'bad', -38, '', 6);
      const sn = d.cursor?.kind ? d.cursor : anchor?.node != null ? { ...anchor, kind:'node', id:anchor.node } : d.cursor;
      if (sn && sn.kind) chip({ x: sn.x, z: sn.z }, ICON.snap, sn.kind === 'angle' ? `angle ${sn.id} °` : `snap ${sn.kind}`, 'snap', 22, '', 4);
    },

    // showcase / probe hooks
    _draft() { return currentDraft(); },
    _setPoints(pts, ctrl) { draft.points = pts.slice(); draft.ctrl = ctrl || null; refresh(); },
  };
}

// ---------------------------------------------------------------------------------------- zone tool

export function zoneTool(S) {
  const st = { marquee: null, painting: 0, snapshot: null, changed: 0 };
  const cellSize = () => S.ctx.world.zones.cellSize || 8;
  const half = () => S.ctx.world.size / 2;
  const idx = (v) => Math.floor((v + half()) / cellSize());
  const ctr = (i) => i * cellSize() - half() + cellSize() * 0.5;
  const zoning = () => S.ctx.modules.zoning || null;
  const radiusOf = (o = S.options) => clamp(o.size ?? 24, 8, 96) * 0.5;

  function zonable(x, z) {
    const Z = S.ctx.world.zones;
    return typeof Z.zonableAt === 'function' ? Z.zonableAt(x, z) : null;
  }

  function collect(cx, cz, r, out) {
    out.length = 0;
    const r2 = r * r;
    for (let iz = idx(cz - r); iz <= idx(cz + r); iz++) {
      for (let ix = idx(cx - r); ix <= idx(cx + r); ix++) {
        const x = ctr(ix), z = ctr(iz);
        if ((x - cx) ** 2 + (z - cz) ** 2 > r2) continue;
        if (!zonable(x, z)) continue;
        out.push(x, z);
        if (out.length > 1400) return out;
      }
    }
    return out;
  }

  function collectRect(x0, z0, x1, z1, out) {
    out.length = 0;
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), az = Math.min(z0, z1), bz = Math.max(z0, z1);
    for (let iz = idx(az); iz <= idx(bz); iz++) {
      for (let ix = idx(ax); ix <= idx(bx); ix++) {
        const x = ctr(ix), z = ctr(iz);
        if (x < ax || x > bx || z < az || z > bz) continue;
        if (!zonable(x, z)) continue;
        out.push(x, z);
        if (out.length > 2400) return out;
      }
    }
    return out;
  }

  function snapshotArea(x0, z0, x1, z1) {
    const Z = S.ctx.world.zones;
    const snap = [];
    for (let iz = idx(Math.min(z0, z1)) - 1; iz <= idx(Math.max(z0, z1)) + 1; iz++) {
      for (let ix = idx(Math.min(x0, x1)) - 1; ix <= idx(Math.max(x0, x1)) + 1; ix++) {
        const c = Z.cells.get(ix + ',' + iz);
        snap.push(ctr(ix), ctr(iz), c ? c.type : null, c ? c.density : null);
      }
    }
    return snap;
  }

  function restore(snap) {
    const z1 = zoning();
    if (z1?.bulk) {
      z1.bulk(({ rect, erase }) => {
        for (let i = 0; i < snap.length; i += 4) {
          const x = snap[i], z = snap[i + 1], t = snap[i + 2], d = snap[i + 3];
          if (t) rect(x, z, x, z, t, d); else erase(x, z, 0.1);
        }
      });
      return;
    }
    const Z = S.ctx.world.zones;
    for (let i = 0; i < snap.length; i += 4) {
      const x = snap[i], z = snap[i + 1], t = snap[i + 2], d = snap[i + 3];
      if (t) Z.paint(x, z, 0.1, t, d); else Z.erase(x, z, 0.1);
    }
  }

  const scratch = [];

  function draftOf() {
    return {
      tool: 'zone', type: S.options.type || 'residential', density: S.options.density || 'low',
      brush: S.options.brush || 'paint', size: S.options.size ?? 24,
      cursor: S.cursor ? { x: S.cursor.x, z: S.cursor.z } : null, marquee: st.marquee, erasing: st.painting === 2,
    };
  }

  function cellsFor(d, out) {
    if (d.brush === 'marquee' && d.marquee) return collectRect(d.marquee.x0, d.marquee.z0, d.marquee.x1, d.marquee.z1, out);
    if (!d.cursor) { out.length = 0; return out; }
    return collect(d.cursor.x, d.cursor.z, radiusOf(d), out);
  }

  /** Apply a whole stroke through zoning.bulk so one lot regeneration fires per commit (§7). */
  function applyStroke(d, cells) {
    const z1 = zoning();
    const n = cells.length / 2;
    if (!n) return 0;
    if (z1?.bulk) {
      z1.bulk(({ rect, circle, erase }) => {
        if (d.erasing) { for (let i = 0; i < cells.length; i += 2) erase(cells[i], cells[i + 1], 1); return; }
        if (d.brush === 'marquee' && d.marquee) rect(d.marquee.x0, d.marquee.z0, d.marquee.x1, d.marquee.z1, d.type, d.density);
        else if (circle) circle(d.cursor.x, d.cursor.z, radiusOf(d), d.type, d.density);
        else rect(d.cursor.x - radiusOf(d), d.cursor.z - radiusOf(d), d.cursor.x + radiusOf(d), d.cursor.z + radiusOf(d), d.type, d.density);
      });
      return n;
    }
    const Z = S.ctx.world.zones;
    if (d.erasing) Z.erase(d.cursor.x, d.cursor.z, radiusOf(d));
    else Z.paint(d.cursor.x, d.cursor.z, radiusOf(d), d.type, d.density);
    return n;
  }

  function doStroke(d, fromDrag) {
    const cells = cellsFor(d, []);
    if (!cells.length) return { ok: false, ids: [], cost: 0, reason: 'Nothing zonable here' };
    const box = d.brush === 'marquee' && d.marquee
      ? [Math.min(d.marquee.x0, d.marquee.x1) - 10, Math.min(d.marquee.z0, d.marquee.z1) - 10,
        Math.max(d.marquee.x0, d.marquee.x1) + 10, Math.max(d.marquee.z0, d.marquee.z1) + 10]
      : [d.cursor.x - radiusOf(d) - 10, d.cursor.z - radiusOf(d) - 10, d.cursor.x + radiusOf(d) + 10, d.cursor.z + radiusOf(d) + 10];
    const quoted = d.erasing ? 0 : cells.length / 2 * (ZONE_COST[d.density] ?? ZONE_COST.low);
    if (!S.afford(quoted)) return { ok: false, ids: [], cost: quoted, reason: REASON.funds };
    const before = snapshotArea(box[0], box[1], box[2], box[3]);
    const n = applyStroke(d, cells);
    const after = snapshotArea(box[0], box[1], box[2], box[3]);
    const cost = d.erasing ? 0 : n * (ZONE_COST[d.density] ?? ZONE_COST.low);
    if (!d.erasing) S.spend(cost, 'zone');
    S.pushUndo({
      label: `zone:${d.erasing ? 'erase' : `${d.type}/${d.density}`}`, cost, key: `zone:${d.type}:${d.density}:${d.erasing}`,
      fromDrag: !!fromDrag,
      undo() { restore(before); S.refund(cost); },
      redo() { restore(after); S.spend(cost, 'redo'); },
    });
    st.marquee = null;
    S.dirty();
    return { ok: true, ids: [], cost, cells: n };
  }

  return {
    name: 'zone',
    activate() { st.marquee = null; st.painting = 0; },
    deactivate() { st.marquee = null; },
    cancel() { st.marquee = null; st.painting = 0; S.dirty(); },
    pointer() { if (st.marquee && S.cursor) { st.marquee.x1 = S.cursor.x; st.marquee.z1 = S.cursor.z; } S.dirty(); },
    click(button = 0) {
      if (!S.cursor) return { ok: false, cost: 0, reason: 'No cursor' };
      const d = draftOf();
      d.erasing = button === 2;
      if (d.brush === 'marquee') {
        if (!st.marquee) { st.marquee = { x0: S.cursor.x, z0: S.cursor.z, x1: S.cursor.x, z1: S.cursor.z }; S.dirty(); return { ok: true, cost: 0 }; }
        st.marquee.x1 = S.cursor.x; st.marquee.z1 = S.cursor.z;
        d.marquee = st.marquee;
        const r = doStroke(d, false);
        return { ok: r.ok, cost: r.cost, reason: r.reason };
      }
      const r = doStroke(d, false);
      return { ok: r.ok, cost: r.cost, reason: r.reason };
    },
    rightClick() {
      if (st.marquee) { st.marquee = null; S.dirty(); return { ok: true }; }
      if (!S.cursor) return { ok: false, reason: 'No cursor' };
      const d = draftOf(); d.erasing = true;
      const r = doStroke(d, false);
      return { ok: r.ok, reason: r.reason };
    },
    commit() {
      const d = draftOf();
      if (d.brush === 'marquee' && st.marquee) { d.marquee = st.marquee; const r = doStroke(d, false); return { ok: r.ok, ids: [], cost: r.cost, reason: r.reason }; }
      const r = doStroke(d, false);
      return { ok: r.ok, ids: [], cost: r.cost, reason: r.reason };
    },
    state() {
      const d = draftOf();
      const cells = cellsFor(d, scratch);
      const n = cells.length / 2;
      return {
        phase: st.marquee ? 'dragging' : 'placing',
        points: d.cursor ? [{ x: d.cursor.x, y: S.ctx.world.terrain.getHeight(d.cursor.x, d.cursor.z), z: d.cursor.z }] : [],
        valid: n > 0, reason: n > 0 ? null : 'Nothing zonable here',
        cost: n * (ZONE_COST[d.density] ?? ZONE_COST.low), refund: 0, snap: null,
        metrics: { length: 0, angle: 0, grade: 0, cells: n, volume: 0, items: n },
      };
    },
    draw(d = draftOf()) {
      const g = S.giz;
      const cells = cellsFor(d, scratch);
      const col = (ZONE_RGB_LINEAR[d.type] || ZONE_RGB_LINEAR.residential)[d.density] || ZONE_RGB_LINEAR.residential.low;
      const c = d.erasing ? GC.bulldoze : col;
      const cs = cellSize();
      for (let i = 0; i < cells.length; i += 2) g.cell(cells[i], cells[i + 1], cs - 0.6, c, 0.45);
      const n = cells.length / 2;
      if (d.brush === 'marquee' && d.marquee) {
        g.rectOutline((d.marquee.x0 + d.marquee.x1) / 2, (d.marquee.z0 + d.marquee.z1) / 2,
          Math.abs(d.marquee.x1 - d.marquee.x0), Math.abs(d.marquee.z1 - d.marquee.z0), 0, 0.3, GC.validEdge, 0.9);
      } else if (d.cursor) {
        // white 0.3 m brush outline (criterion 10)
        g.disc(d.cursor.x, d.cursor.z, radiusOf(d), { colour: c, rim: GC.validEdge, fill: 0, rimA: 0.9, rimIn: 0.975, dashes: Math.max(14, Math.round(radiusOf(d) * 0.8)), dashMin: 0.25 });
      }
      const p = d.cursor || (d.marquee ? { x: (d.marquee.x0 + d.marquee.x1) / 2, z: (d.marquee.z0 + d.marquee.z1) / 2 } : null);
      if (!p) return;
      const y = S.ctx.world.terrain.getHeight(p.x, p.z);
      const label = d.erasing ? 'De-zone' : `${d.type[0].toUpperCase()}${d.type.slice(1)} · ${d.density}`;
      S.chips.add(p.x, y + 2, p.z, ICON.cells, label, '', 0, -42, '', 3);
      S.chips.add(p.x, y + 2, p.z, ICON.area, `${n} cells`, '', 0, -20, `${(n * 64 / 1000).toFixed(1)} k m²`, 2);
    },
    /** For criterion 10's probe: the exact linear colour the preview fills with. */
    previewColour(type, density) { return (ZONE_RGB_LINEAR[type] || ZONE_RGB_LINEAR.residential)[density]; },
    drag() { return doStroke(draftOf(), true); },
    _setMarquee(m) { st.marquee = m; },
  };
}

// ------------------------------------------------------------------------------------- terrain tool

export function terrainTool(S) {
  const st = { moved: 0, lastCentre: null };
  const T = () => S.ctx.world.terrain;
  const radiusOf = (o = S.options) => clamp(o.size ?? 40, 10, 200) * 0.5;
  const strengthOf = (o = S.options) => clamp((o.strength ?? 50) / 100, 0.05, 1);
  const mode = (o = S.options) => o.mode || 'raise';

  function draftOf() {
    return {
      tool: 'terrain', mode: mode(), size: S.options.size ?? 40, strength: S.options.strength ?? 50,
      cursor: S.cursor ? { x: S.cursor.x, z: S.cursor.z } : null,
    };
  }

  function dab(d) {
    const t = T();
    const r = radiusOf(d), s = strengthOf(d);
    // flatten/smooth are target-seeking (modify() already clamps w*strength to 1), so they use the
    // full strength; raise/lower deposit strength·w metres per dab.
    const brush = { x: d.cursor.x, z: d.cursor.z, radius: r, mode: d.mode, strength: d.mode === 'raise' || d.mode === 'lower' ? s * 1.1 : s };
    if (d.mode === 'flatten') brush.target = d.target ?? t.getHeight(d.cursor.x, d.cursor.z);
    t.modify(brush);
    // volume moved: strength × mean falloff (0.3) × disc area, damped for flatten/smooth
    const k = d.mode === 'raise' || d.mode === 'lower' ? 1 : 0.35;
    return 0.3 * Math.PI * r * r * brush.strength * k;
  }

  function stroke(d, dabs, fromDrag) {
    if (!d.cursor) return { ok: false, ids: [], cost: 0, reason: 'No cursor' };
    const r = radiusOf(d);
    const estimate = Math.round(0.3 * Math.PI * r * r * strengthOf(d) * (d.mode === 'raise' || d.mode === 'lower' ? 1.1 : 0.35) * dabs * TERRAIN_COST_PER_M3);
    if (!S.afford(estimate)) return { ok: false, ids: [], cost: estimate, reason: REASON.funds };
    // A sculpt can resample road designs and cut/fill the whole network. Include that derived
    // terrain in the same transaction, before recording the post-action image for redo.
    const hasRoads = S.ctx.world.roads.edges.size > 0;
    const snapshot = () => hasRoads ? S.snapshotHeights([d.cursor]) : S.snapshotHeightRect(d.cursor.x, d.cursor.z, r * 1.6);
    const before = snapshot();
    let vol = 0;
    for (let i = 0; i < dabs; i++) vol += dab(d);
    if (hasRoads) S.ctx.modules.roads?.rebuild?.();
    const after = snapshot();
    const cost = Math.max(0, Math.round(vol * TERRAIN_COST_PER_M3));
    S.spend(cost, 'terraform');
    st.moved += vol;
    S.pushUndo({
      label: `terrain:${d.mode}`, cost, key: `terrain:${d.mode}:${Math.round(d.cursor.x / 40)}:${Math.round(d.cursor.z / 40)}`,
      fromDrag: !!fromDrag,
      undo() { S.restoreHeightRect(before); S.refund(cost); },
      redo() { S.restoreHeightRect(after); S.spend(cost, 'redo'); },
    });
    S.dirty();
    return { ok: true, ids: [], cost, volume: vol };
  }

  return {
    name: 'terrain',
    activate() { st.moved = 0; },
    deactivate() {},
    cancel() { S.dirty(); },
    pointer() { S.dirty(); },
    /** click(button, dabs, target) — `target` is the flatten height (showcase corridor levelling). */
    click(button = 0, dabs = 1, target) {
      if (button === 2) return this.rightClick();
      const d = draftOf();
      if (target !== undefined) d.target = target;
      const r = stroke(d, dabs, false);
      return { ok: r.ok, cost: r.cost, reason: r.reason };
    },
    rightClick() {
      const d = draftOf();
      d.mode = d.mode === 'raise' ? 'lower' : d.mode === 'lower' ? 'raise' : d.mode;
      const r = stroke(d, 1, false);
      return { ok: r.ok, reason: r.reason };
    },
    commit() { const d = draftOf(); const r = stroke(d, 1, false); return { ok: r.ok, ids: [], cost: r.cost, reason: r.reason }; },
    state() {
      const d = draftOf();
      const y = d.cursor ? T().getHeight(d.cursor.x, d.cursor.z) : 0;
      const r = radiusOf(d);
      const vol = 0.3 * Math.PI * r * r * strengthOf(d) * 1.1;
      return {
        phase: 'placing',
        points: d.cursor ? [{ x: d.cursor.x, y, z: d.cursor.z }] : [],
        valid: !!d.cursor, reason: d.cursor ? null : 'No cursor',
        cost: Math.round(vol * TERRAIN_COST_PER_M3), refund: 0, snap: null,
        metrics: { length: 0, angle: 0, grade: 0, cells: 0, volume: +vol.toFixed(1), items: 1 },
      };
    },
    draw(d = draftOf()) {
      const g = S.giz;
      if (!d.cursor) return;
      const r = radiusOf(d);
      const col = TERRAIN_COL[d.mode] || GC.flatten;
      // two concentric ground rings: outer = options.size, inner = 0.5× (criterion 17)
      g.disc(d.cursor.x, d.cursor.z, r, {
        colour: col, rim: GC.validEdge, fill: 0.10, rimA: 0.45, rimIn: 0.972, ring2: 0.5, ring2W: 0.014, dashMin: 1.0,
      });
      const Tr = T();
      const y = Tr.getHeight(d.cursor.x, d.cursor.z);
      const delta = (d.mode === 'raise' ? 1 : d.mode === 'lower' ? -1 : 0) * strengthOf(d) * 1.1;
      S.chips.add(d.cursor.x, y + 2, d.cursor.z, ICON.height, `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} m`, '', 0, -42, TERRAIN_LABEL[d.mode] || d.mode, 3);
      S.chips.add(d.cursor.x, y + 2, d.cursor.z, ICON.radius, `${Math.round(r * 2)} m`, '', 0, -20, `${d.strength} %`, 2);
    },
    drag() { return stroke(draftOf(), 1, true); },
    _stroke: stroke,
  };
}

// ------------------------------------------------------------------------------------- service tool

export function serviceTool(S) {
  const st = { heading: 0 };
  const def = (o = S.options) => serviceDef(o.kind || (S.ctx.world.services.kinds || [])[0] || 'clinic', S.ctx.modules);

  function headingFor(x, z) {
    const ne = S.ctx.world.roads.nearestEdge?.(x, z, 160);
    // Services use a +Y rotation with the entrance facing local -Z.
    return ne ? Math.atan2(x - ne.point.x, z - ne.point.z) : 0;
  }

  function evalDraft(d) {
    const T = S.ctx.world.terrain;
    const dd = d.def;
    const out = { ok: true, reason: null, cost: dd.cost, frontage: null, slope: 0, def: dd };
    if (!S.poses.length && S.failure) { out.ok = false; out.reason = S.failure; }
    if (!d.cursor) { out.ok = false; out.reason = 'No cursor'; return out; }
    const { x, z } = d.cursor;
    const owner = S.ctx.modules.services;
    if (typeof owner?.validate === 'function') {
      const v = owner.validate(d.kind, x, z, d.heading);
      const reasons = {water: REASON.onWater, slope: REASON.uneven, overlap: 'Footprint occupied', no_frontage: REASON.noRoad};
      out.ok = out.ok && v.ok;
      if (!v.ok) out.reason = reasons[v.reason] || v.reason || REASON.service;
      out.slope = v.slope || 0;
      const point = v.frontage?.point || (v.frontage && S.ctx.world.roads.sample?.(v.frontage.edgeId, v.frontage.t));
      out.frontage = point ? {...v.frontage, point} : null;
      if (out.ok && !S.afford(dd.cost)) { out.ok = false; out.reason = REASON.funds; }
      return out;
    }
    // Road access is checked FIRST: a cursor dropped anywhere away from the network must report
    // exactly 'No road access' (criterion 18), not whatever else happens to be wrong out there.
    const ne = S.ctx.world.roads.nearestEdge?.(x, z, RULES.serviceRoadReach);
    out.frontage = ne || null;
    if (!ne) { out.ok = false; out.reason = REASON.noRoad; return out; }
    const s = Math.sin(d.heading), c = Math.cos(d.heading);
    let minY = Infinity, maxY = -Infinity;
    for (const [u, v] of [[-dd.w / 2, -dd.d / 2], [dd.w / 2, -dd.d / 2], [dd.w / 2, dd.d / 2], [-dd.w / 2, dd.d / 2], [0, 0]]) {
      const px = x + u * c - v * s, pz = z + u * s + v * c;
      const y = T.getHeight(px, pz);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      if (T.isWater(px, pz)) { out.ok = false; out.reason = REASON.onWater; }
      if (Math.abs(px) > RULES.mapBound || Math.abs(pz) > RULES.mapBound) { out.ok = false; out.reason = REASON.bounds; }
    }
    out.slope = maxY - minY;
    if (out.ok && out.slope > Math.max(4, Math.min(dd.w, dd.d) * 0.22)) { out.ok = false; out.reason = REASON.uneven; }
    if (out.ok && !S.afford(dd.cost)) { out.ok = false; out.reason = REASON.funds; }
    return out;
  }

  function draftOf() {
    const c = S.cursor ? { x: S.cursor.x, z: S.cursor.z } : null;
    const heading = c && !S.mods.shift ? headingFor(c.x, c.z) : st.heading;
    return { tool: 'service', kind: S.options.kind || 'clinic', def: def(), cursor: c, heading };
  }

  return {
    name: 'service',
    evalDraft,
    activate() { st.heading = 0; },
    deactivate() {},
    cancel() { S.dirty(); },
    pointer() { if (S.cursor && !S.mods.shift) st.heading = headingFor(S.cursor.x, S.cursor.z); S.dirty(); },
    click(button = 0) {
      if (button === 2) return this.rightClick();
      const r = this.commit();
      return { ok: r.ok, id: r.ids?.[0], cost: r.cost, reason: r.reason };
    },
    rightClick() { S.clearSelection(); return { ok: true }; },
    commit() {
      const d = draftOf();
      const ev = evalDraft(d);
      if (!ev.ok) return { ok: false, ids: [], cost: 0, reason: ev.reason };
      const sv = S.ctx.world.services;
      let id = null;
      try { id = sv.place?.(d.kind, d.cursor.x, d.cursor.z, d.heading); } catch (e) { S.ctx.log.warn(`services.place failed: ${e?.message}`); }
      if (id === null || id === undefined || id === -1) {
        // `services` is a stub whose world.services.place() is a no-op returning null (spec §7/19)
        S.failure = REASON.service;
        return { ok: false, ids: [], cost: 0, reason: REASON.service };
      }
      // Services owns the placement debit. Its pad is geometry; place/remove do not edit terrain.
      const item = sv.items.get(id);
      const pos = { x: item.x, z: item.z, heading: item.heading, kind: item.kind };
      let cur = id;
      S.pushUndo({
        label: `service:${d.kind}`, cost: d.def.cost, key: `service:${d.kind}`, fromDrag: false,
        undo() {
          if (!sv.items.has(cur) || sv.remove(cur) === false) return false;
          S.refund(d.def.cost);
          return true;
        },
        redo() {
          if (!S.afford(d.def.cost)) return false;
          const next = sv.restore({ ...pos, id: cur });
          if (!Number.isInteger(next) || next < 1 || !sv.items.has(next)) return false;
          cur = next;
          return true;
        },
      });
      S.setSelection('service', id);
      return { ok: true, ids: [id], cost: d.def.cost };
    },
    state() {
      const d = draftOf();
      const ev = evalDraft(d);
      return {
        phase: 'placing',
        points: d.cursor ? [{ x: d.cursor.x, y: S.ctx.world.terrain.getHeight(d.cursor.x, d.cursor.z), z: d.cursor.z }] : [],
        valid: ev.ok, reason: ev.reason, cost: ev.ok ? d.def.cost : 0, refund: 0, snap: null,
        metrics: { length: 0, angle: +deg(d.heading).toFixed(1), grade: 0, cells: 0, volume: 0, items: 1 },
      };
    },
    draw(d = draftOf()) {
      const g = S.giz;
      if (!d.cursor) return;
      const ev = evalDraft(d);
      const dd = d.def;
      const col = ev.ok ? GC.cyan : GC.invalid;
      // filled footprint rectangle at the kind's true size (criterion 18)
      g.rectFill(d.cursor.x, d.cursor.z, dd.w, dd.d, -d.heading, col, ev.ok ? 0.42 : 0.55);
      if (dd.coverage > 0) {
        g.disc(d.cursor.x, d.cursor.z, dd.coverage, {
          colour: ev.ok ? GC.cyan : GC.invalid, rim: ev.ok ? GC.validEdge : GC.invalidEdge,
          fill: 0, rimA: 0.26, rimIn: 0.985, dashes: 64, dashMin: 0.15,
        });
      }
      if (ev.frontage) {
        const p = ev.frontage.point;
        g.groundLine(d.cursor.x, d.cursor.z, p.x, p.z, 1.0, GC.validEdge, 0.7, true, 0.28);
        g.marker(p.x, p.z, 1.6, GC.validEdge);
      }
      const T = S.ctx.world.terrain;
      const y = T.getHeight(d.cursor.x, d.cursor.z);
      S.chips.add(d.cursor.x, y + 2, d.cursor.z, ICON.info, dd.label, '', 0, -42, '', 3);
      if (dd.coverage > 0) S.chips.add(d.cursor.x, y + 2, d.cursor.z, ICON.radius, `${dd.coverage} m`, '', 0, 24, '', 1);
      if (ev.ok) S.chips.add(d.cursor.x, y + 2, d.cursor.z, ICON.cost, money(dd.cost), 'cost', 0, -20, '', 4);
      else S.chips.add(d.cursor.x, y + 2, d.cursor.z, ICON.bad, ev.reason, 'bad', 0, -20, '', 5);
    },
    _setHeading(a) { st.heading = a; },
  };
}

// ---------------------------------------------------------------------------------------- prop tool

export function propTool(S) {
  const st = { heading: 0, warned: false };
  const kind = (o = S.options) => o.kind || 'tree_oak';
  const spacing = (o = S.options) => clamp(o.spacing ?? 12, 2, 40);

  function draftOf() {
    return {
      tool: 'prop', kind: kind(), mode: S.options.mode || 'single', spacing: spacing(),
      cursor: S.cursor ? { x: S.cursor.x, z: S.cursor.z } : null, heading: st.heading,
    };
  }
  function points(d) {
    if (!d.cursor) return [];
    if (d.mode === 'single') return [{ x: d.cursor.x, z: d.cursor.z }];
    const out = [];
    const n = d.mode === 'line' ? 5 : 7;
    for (let i = 0; i < n; i++) out.push({ x: d.cursor.x + Math.cos(d.heading) * d.spacing * i, z: d.cursor.z + Math.sin(d.heading) * d.spacing * i });
    return out;
  }

  return {
    name: 'prop',
    activate() { st.heading = 0; },
    deactivate() {},
    cancel() { S.dirty(); },
    pointer() { S.dirty(); },
    click(button = 0) { if (button === 2) return this.rightClick(); const r = this.commit(); return { ok: r.ok, id: r.ids?.[0], cost: r.cost, reason: r.reason }; },
    rightClick() { return { ok: true }; },
    commit() {
      const d = draftOf();
      const P = S.ctx.modules.props;
      // the test is on the function, never on a version flag or a module name (spec §7/19)
      if (typeof P?.place !== 'function') {
        if (!st.warned) { st.warned = true; S.ctx.log.info('props exposes no place() — the prop tool is preview only'); }
        S.failure = REASON.props;
        return { ok: false, ids: [], cost: 0, reason: REASON.props };
      }
      const pts = points(d);
      const quoted = (PROP_COST[d.kind] ?? 50) * pts.length;
      if (!S.afford(quoted)) return { ok: false, ids: [], cost: quoted, reason: REASON.funds };
      // props.place is (kind, x, z, opts) with the heading inside opts (src/modules/props/index.js:580);
      // the extra positional heading keeps the spec's (kind,x,z,heading,opts) form working too.
      const put = (p) => P.place(d.kind, p.x, p.z, { heading: d.heading });
      const ids = [];
      for (const p of pts) { const id = put(p); if (id != null && id >= 0) ids.push(id); }
      if (!ids.length) return { ok: false, ids: [], cost: 0, reason: REASON.props };
      const cost = (PROP_COST[d.kind] ?? 50) * ids.length;
      S.spend(cost, `prop ${d.kind}`);
      S.pushUndo({
        label: `prop:${d.kind}`, cost, key: `prop:${d.kind}`, fromDrag: false,
        undo() { for (const id of ids) P.remove?.(id); S.refund(cost); },
        redo() { ids.length = 0; for (const p of pts) { const id = put(p); if (id != null && id >= 0) ids.push(id); } S.spend(cost, 'redo'); },
      });
      return { ok: true, ids, cost };
    },
    state() {
      const d = draftOf();
      const pts = points(d);
      return {
        phase: 'placing',
        points: pts.map((p) => ({ x: p.x, y: S.ctx.world.terrain.getHeight(p.x, p.z), z: p.z })),
        valid: !!d.cursor, reason: d.cursor ? null : 'No cursor',
        cost: (PROP_COST[d.kind] ?? 50) * pts.length, refund: 0, snap: null,
        metrics: { length: d.spacing * Math.max(0, pts.length - 1), angle: +deg(d.heading).toFixed(1), grade: 0, cells: 0, volume: 0, items: pts.length },
      };
    },
    draw(d = draftOf()) {
      const g = S.giz;
      if (!d.cursor) return;
      const pts = points(d);
      const big = /tree|bus_stop/.test(d.kind);
      const w = big ? 4.5 : 2.4;
      const T = S.ctx.world.terrain;
      for (const p of pts) {
        g.rectFill(p.x, p.z, w, w, d.heading, GC.cyan, 0.40);
        g.marker(p.x, p.z, w * 0.35, GC.validEdge, 0.30);
      }
      const y = T.getHeight(d.cursor.x, d.cursor.z);
      S.chips.add(d.cursor.x, y + 2, d.cursor.z, ICON.info, d.kind.replace(/_/g, ' '), '', 0, -42, '', 3);
      S.chips.add(d.cursor.x, y + 2, d.cursor.z, S.failure ? ICON.bad : ICON.cost, S.failure || money((PROP_COST[d.kind] ?? 50) * pts.length), S.failure ? 'bad' : 'cost', 0, -20, '', 4);
    },
  };
}

// ----------------------------------------------------------------------------------- bulldoze tool

export function bulldozeTool(S) {
  const st = { marquee: null };

  function draftOf() {
    return {
      tool: 'bulldoze', mode: S.options.mode || 'single', marquee: st.marquee,
      cursor: S.cursor ? { x: S.cursor.x, z: S.cursor.z } : null,
    };
  }

  function victims(d) {
    if (d.mode === 'marquee' && d.marquee) {
      const m = d.marquee;
      return S.pickArea(Math.min(m.x0, m.x1), Math.min(m.z0, m.z1), Math.max(m.x0, m.x1), Math.max(m.z0, m.z1));
    }
    if (!d.cursor) return [];
    const t = S.pick(d.cursor.x, d.cursor.z);
    return t ? [t] : [];
  }

  return {
    name: 'bulldoze',
    activate() { st.marquee = null; },
    deactivate() { st.marquee = null; },
    cancel() { st.marquee = null; S.dirty(); },
    pointer() { if (st.marquee && S.cursor) { st.marquee.x1 = S.cursor.x; st.marquee.z1 = S.cursor.z; } S.dirty(); },
    click(button = 0) {
      if (button === 2) return this.rightClick();
      if (!S.cursor) return { ok: false, cost: 0, reason: 'No cursor' };
      if ((S.options.mode || 'single') === 'marquee' && !st.marquee) {
        st.marquee = { x0: S.cursor.x, z0: S.cursor.z, x1: S.cursor.x, z1: S.cursor.z };
        S.dirty();
        return { ok: true, cost: 0 };
      }
      const r = this.commit();
      return { ok: r.ok, cost: r.cost, reason: r.reason };
    },
    rightClick() { if (st.marquee) { st.marquee = null; S.dirty(); return { ok: true }; } return { ok: false, reason: 'Nothing to cancel' }; },
    commit() {
      const d = draftOf();
      const list = victims(d);
      if (!list.length) { st.marquee = null; return { ok: false, ids: [], cost: 0, reason: 'Nothing to demolish' }; }
      const ids = [];
      let refund = 0, cost = 0;
      S.beginGroup(`bulldoze:${list.length}`);
      try {
        for (const t of list) {
          const r = S.demolish(t);
          if (r) { ids.push(t.id); refund += r.refund || 0; cost += r.cost || 0; }
        }
      } finally { S.endGroup(); }
      st.marquee = null;
      S.dirty();
      return { ok: ids.length > 0, ids, cost, refund };
    },
    state() {
      const d = draftOf();
      const list = victims(d);
      let refund = 0;
      for (const t of list) refund += S.refundOf(t);
      return {
        phase: st.marquee ? 'dragging' : 'placing',
        points: d.cursor ? [{ x: d.cursor.x, y: S.ctx.world.terrain.getHeight(d.cursor.x, d.cursor.z), z: d.cursor.z }] : [],
        valid: list.length > 0, reason: list.length ? null : 'Nothing to demolish',
        cost: list.length * DEMOLISH.building * 0, refund, snap: null,
        metrics: { length: 0, angle: 0, grade: 0, cells: 0, volume: 0, items: list.length },
      };
    },
    draw(d = draftOf()) {
      const g = S.giz;
      const list = victims(d);
      if (d.mode === 'marquee' && d.marquee) {
        const m = d.marquee;
        g.rectOutline((m.x0 + m.x1) / 2, (m.z0 + m.z1) / 2, Math.abs(m.x1 - m.x0), Math.abs(m.z1 - m.z0), 0, 1.0, GC.bulldoze, 0.95);
      }
      // every object inside the marquee gets its own red volume (criterion 11)
      for (const t of list) {
        if (t.kind === 'road') {
          const path = S.edgePath(t.id);
          if (path) g.setGhostAlt(path, t.width || 16, 'invalid');
        } else {
          g.doomVolume(t.x, t.z, t.w, t.d, t.heading || 0, t.height || 6, GC.bulldoze, 0.35, t.baseY);
        }
      }
      const T = S.ctx.world.terrain;
      const anchor = d.marquee
        ? { x: (d.marquee.x0 + d.marquee.x1) / 2, z: (d.marquee.z0 + d.marquee.z1) / 2 }
        : (list[0] ? { x: list[0].x, z: list[0].z } : d.cursor);
      if (!anchor) return;
      let refund = 0;
      for (const t of list) refund += S.refundOf(t);
      const y = T.getHeight(anchor.x, anchor.z);
      S.chips.add(anchor.x, y + 6, anchor.z, ICON.minus, `${list.length} items`, 'bad', 0, -40, '', 5);
      S.chips.add(anchor.x, y + 6, anchor.z, ICON.cost, `+${money(refund)}`, 'cost', 0, -18, '', 4);
    },
    _setMarquee(m) { st.marquee = m; },
  };
}

// ------------------------------------------------------- pass-through tools (transit / infoview)

// Candidate tools-owned adapter. Integrator applies after transit owner freeze.
function transitTool(S) {
  const owner = () => S.ctx.modules.transit;
  const empty = () => ({ active: false, stops: [], valid: false, reason: 'Transit unavailable', length: 0, hovered: null });
  const snapshot = () => owner()?.draftState?.() || empty();
  let intent = {}, failure = null;
  const begin = () => {
    if (snapshot().active) return true;
    const ok = owner()?.beginLine?.(intent) === true;
    failure = ok ? null : 'Cannot start this line';
    return ok;
  };
  const cancel = () => { owner()?.cancelLine?.(); failure = null; S.dirty(); };
  const marker = (p, radius, color) => {
    const ground = S.ctx.world.terrain.getHeight(p.x, p.z);
    S.giz.marker(p.x, p.z, radius, color, (Number.isFinite(p.y) ? p.y - ground : 0) + 0.18);
  };
  return {
    name: 'transit',
    activate(opts) {
      intent = { ...opts }; failure = null;
      if (owner()?.beginLine?.(intent) !== true) failure = 'Cannot start this line';
      S.dirty();
    },
    deactivate: cancel,
    cancel,
    pointer(point) {
      // Hover never starts a new draft or publishes stops.
      if (snapshot().active) owner()?.previewDraft?.(point?.x ?? NaN, point?.z ?? NaN);
      failure = null; S.dirty();
    },
    click(button = 0) {
      if (button === 2) return this.rightClick();
      if (button !== 0 || !S.cursor) return { ok: false, cost: 0, reason: 'Click a roadside to add a stop' };
      if (!begin()) return { ok: false, cost: 0, reason: failure };
      const id = owner()?.addStopToDraft?.(S.cursor.x, S.cursor.z);
      const ok = Number.isInteger(id) && id > 0;
      const d = snapshot();
      failure = ok ? null : (d.hovered?.reason || d.reason || 'No valid stop here');
      S.dirty();
      return { ok, id: ok ? id : null, cost: 0, reason: failure };
    },
    rightClick() { const active = snapshot().active; cancel(); return { ok: active, cost: 0, reason: active ? null : 'No line draft' }; },
    commit() {
      const id = owner()?.commitLine?.();
      const ok = Number.isInteger(id) && id > 0;
      failure = ok ? null : (snapshot().reason || 'Add at least two connected stops');
      if (ok) intent = { mode: 'line', kind: intent.kind || 'bus' };
      S.dirty();
      return { ok, ids: ok ? [id] : [], cost: 0, reason: failure };
    },
    state() {
      const d = snapshot();
      return {
        phase: d.active ? 'drawing' : 'idle', points: d.stops, valid: d.valid,
        reason: failure || d.reason, cost: 0, refund: 0, snap: d.hovered,
        metrics: { length: d.length, angle: 0, grade: 0, cells: 0, volume: 0, items: d.stops.length },
      };
    },
    draw() {
      const d = snapshot();
      if (!d.active) return;
      for (let i = 0; i < d.stops.length; i++) {
        const p = d.stops[i];
        marker(p, 2.1, GC.cyan);
        S.chips.add(p.x, p.y + 2, p.z, ICON.info, `Stop ${i + 1}`, '', 0, -18, '', 1);
      }
      const p = d.hovered || d.stops[d.stops.length - 1];
      if (!p) return;
      if (d.hovered) marker(p, 2.6, p.valid ? GC.validEdge : GC.invalidEdge);
      const reason = failure || (d.hovered && !d.hovered.valid ? d.hovered.reason : (!d.valid ? d.reason : null));
      S.chips.add(p.x, p.y + 4, p.z, ICON.info, 'Click: stop · Enter: finish · ESC/right-click: cancel', '', 0, -58, '', 5);
      if (reason) S.chips.add(p.x, p.y + 4, p.z, ICON.bad, reason, 'bad', 0, -34, '', 6);
    },
  };
}

export function forwardTool(S, name) {
  if (name === 'transit') return transitTool(S);
  return {
    name,
    activate(opts) {
      try {
        if (name === 'transit') S.ctx.modules.transit?.beginLine?.(opts);
        else S.ctx.modules.infoviews?.setView?.(opts?.view ?? null);
      } catch (e) { S.ctx.log.warn(`${name} forward failed: ${e?.message}`); }
      S.ctx.log.info(`${name}: activation forwarded to its module`);
    },
    deactivate() {}, cancel() {}, pointer() {},
    click() { return { ok: false, cost: 0, reason: `${name} unavailable` }; },
    rightClick() { return { ok: false, reason: `${name} unavailable` }; },
    commit() { return { ok: false, ids: [], cost: 0, reason: `${name} unavailable` }; },
    state() {
      return {
        phase: 'idle', points: [], valid: false, reason: `${name} unavailable`, cost: 0, refund: 0, snap: null,
        metrics: { length: 0, angle: 0, grade: 0, cells: 0, volume: 0, items: 0 },
      };
    },
    draw() {},
  };
}
