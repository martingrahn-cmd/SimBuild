// traffic module: vehicles driving world.roads lanes with A* routing, IDM car-following, lane
// assignment, traffic-light phases and junction yielding; instanced procedural vehicle classes with
// rotating wheels and night lighting; pedestrians on sidewalks; outside connections; congestion grid.
import { LaneGraph } from './graph.js';
import { Traffic, MIX, setShadowCasting } from './sim.js';
import { stage, CAMERAS } from './showcase.js';

const S = {
  ctx: null, graph: null, traffic: null, dirty: true, settle: 0,
  showcase: false, targetVeh: 0, targetPed: 0, simApi: null, ready: false,
};

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Fallback activity curve when the simulation module is not running (showcase). */
function activityCurve(h) {
  const g = (c, w, a) => a * Math.exp(-((h - c) * (h - c)) / (2 * w * w));
  return Math.min(1, 0.08 + g(8, 1.7, 0.88) + g(12.5, 2.2, 0.42) + g(17.5, 2.0, 0.98) + g(21, 2.0, 0.22));
}

function activity(hour) {
  try {
    const a = S.simApi?.activity?.(hour);
    if (typeof a === 'number' && Number.isFinite(a)) return Math.max(0, Math.min(1, a));
  } catch { /* fall through */ }
  return activityCurve(hour);
}

function rebuildGraph() {
  if (!S.graph) return;
  const t0 = performance.now();
  S.graph.build();
  S.dirty = false;
  // vehicles whose edge disappeared must go
  if (S.traffic) {
    const dead = [];
    for (const v of S.traffic.vehicles.values()) {
      const rec = S.graph.edges.get(v.edgeId);
      if (!rec) { dead.push(v.id); continue; }
      v.rec = rec;
      v.s = Math.min(v.s, rec.len - 1);
      v.route.length = v.ri + 1;
      v.route[v.ri] = { edgeId: rec.id, dir: v.dir };
    }
    for (const id of dead) S.traffic.despawn(id);
    for (const p of S.traffic.peds) {
      const rec = S.graph.edges.get(p.rec.id);
      if (rec) { p.rec = rec; p.s = Math.min(p.s, rec.len - 1); }
    }
    S.traffic.peds = S.traffic.peds.filter((p) => S.graph.edges.has(p.rec.id));
  }
  S.ctx.log.info(`lane graph: ${S.graph.edges.size} edges, ${S.graph.nodes.size} nodes, ${S.graph.signals.size} signals, ${S.graph.portals.length} outside connections (${(performance.now() - t0).toFixed(0)} ms)`);
}

function targets() {
  const w = S.ctx.world;
  const hour = w.time.hour;
  const act = activity(hour);
  if (S.showcase) {
    return [Math.round(S.targetVeh * (0.55 + 0.45 * act)), Math.round(S.targetPed * (0.30 + 0.70 * act))];
  }
  const pop = w.economy.population || 0;
  const base = Math.max(12, Math.min(240, 18 + pop * 0.05));
  return [Math.round(base * (0.35 + 0.75 * act)), Math.round(base * 0.7 * (0.15 + 0.85 * act))];
}

export default {
  name: 'traffic',
  dependencies: ['roads'],
  budget: { drawCalls: 170, triangles: 1_600_000 },

  async init(ctx) {
    S.ctx = ctx;
    S.showcase = ctx.world.flags.showcase === 'traffic';
    S.simApi = ctx.modules?.simulation || null;
    S.graph = new LaneGraph(ctx.world, ctx.log);
    S.traffic = new Traffic(ctx, S.graph);
    const maxV = S.showcase ? 230 : 260;
    S.traffic.buildMeshes(maxV, S.showcase ? 190 : 200);
    S.targetVeh = 175; S.targetPed = 140;
    ctx.events.on('roads:changed', () => { S.dirty = true; S.settle = 0; }, 'traffic');
    ctx.log.info(`vehicle classes: ${MIX.map((m) => m[0]).join(', ')} — ${S.traffic.tris} tris of source geometry`);
    S.ready = true;
  },

  update(dt, ctx) {
    if (!S.traffic) return;
    if (S.dirty || S.graph.dirty) {
      S.settle += dt;
      if (S.settle >= 0.06) rebuildGraph();
      else return;
    }
    if (!S.graph.edges.size) return;
    const w = ctx.world;
    const speed = w.time.paused ? (ctx.headless ? 1 : 0) : Math.max(0.5, Math.min(3, w.time.speed));
    const sdt = Math.min(0.1, dt) * speed;
    const elev = ctx.clock.sunElevation();
    S.traffic.lightsOn = 1 - smoothstep(0.03, 0.22, elev);
    const [tv, tp] = targets();
    S.traffic.target = tv; S.traffic.pedTarget = tp;
    if (sdt > 0) {
      S.traffic.balance(sdt);
      S.traffic.step(sdt);
      S.traffic.stepPeds(sdt);
    }
    S.traffic.render(Math.min(0.1, dt));
  },

  dispose() {
    S.traffic?.dispose();
    S.traffic = null; S.graph = null; S.ctx = null; S.ready = false;
  },

  api: {
    /** Spawn a vehicle. kind = one of the vehicle classes; route = [{edgeId,dir}] (optional). */
    spawnVehicle(kind, route) {
      if (!S.traffic) return null;
      const ci = MIX.findIndex((m) => m[0] === kind);
      const opts = { ci: ci >= 0 ? ci : undefined };
      if (route && route.length) {
        const rec = S.graph.edges.get(route[0].edgeId);
        if (!rec) return null;
        opts.rec = rec; opts.dir = route[0].dir || 1; opts.s = 0; opts.route = route.slice();
      }
      const v = S.traffic.spawn(opts);
      return v ? v.id : null;
    },
    despawn(id) { return S.traffic ? S.traffic.despawn(id) : false; },
    /** 256² congestion grid for infoviews. */
    flowGrid() {
      if (!S.traffic) return null;
      const size = 256, cell = S.ctx.world.size / size, half = S.ctx.world.size / 2;
      const data = S.traffic.flow;
      return {
        size, cellSize: cell, data,
        sample(x, z) {
          const gx = ((x + half) / cell) | 0, gz = ((z + half) / cell) | 0;
          if (gx < 0 || gz < 0 || gx >= size || gz >= size) return 0;
          return Math.min(1, data[gz * size + gx]);
        },
      };
    },
    /** Traffic-signal state at a node: {phase, state, arms:[{edgeId,dir,state}]} or null. */
    lightState(nodeId) {
      const s = S.graph?.signals.get(nodeId);
      if (!s) return null;
      return {
        nodeId, phase: s.phase, state: s.state, t: s.t, green: s.green, yellow: s.yellow,
        arms: s.arms.map((a) => ({
          edgeId: a.edgeId, dir: a.dir,
          state: a.phase === s.phase ? s.state : 'red',
        })),
      };
    },
    /** All signalised intersections: [{id,x,y,z,arms}] */
    signals() {
      if (!S.graph) return [];
      return [...S.graph.signals.values()].map((s) => ({ id: s.id, x: s.x, y: s.y, z: s.z, arms: s.arms.length }));
    },
    /** Outside connections (map-border / dead-end highway portals). */
    outsideConnections() { return S.graph ? S.graph.portals.map((p) => ({ nodeId: p.nodeId, x: p.x, z: p.z, highway: p.big })) : []; },
    kinds() { return MIX.map((m) => m[0]); },
    /** Real CSM shadow casting for vehicles/pedestrians. Off by default — see docs/core-requests/traffic.md. */
    setShadowCasting(on) { return setShadowCasting(on, S.traffic); },
    stats() { return S.traffic ? { ...S.traffic.stats, pedestrians: S.traffic.peds.length, signals: S.graph.signals.size } : null; },
    /** dev: force the population targets (showcase / democity staging) */
    setTargets(vehicles, pedestrians) {
      if (vehicles !== undefined) S.targetVeh = vehicles;
      if (pedestrians !== undefined) S.targetPed = pedestrians;
      S.showcase = true;
    },
    /** Run the simulation forward without rendering, so a fresh scene is already "in motion". */
    preroll(seconds = 40, stepSize = 0.06) {
      if (!S.traffic) return 0;
      if (S.dirty || S.graph.dirty) rebuildGraph();
      if (!S.graph.edges.size) return 0;
      const n = Math.round(seconds / stepSize);
      for (let i = 0; i < n; i++) {
        S.traffic.balance(stepSize);
        S.traffic.step(stepSize);
        S.traffic.stepPeds(stepSize);
      }
      return n;
    },
    serialize() {
      if (!S.traffic) return null;
      return {
        vehicles: [...S.traffic.vehicles.values()].map((v) => ({
          kind: v.kind, edgeId: v.edgeId, dir: v.dir, lane: v.lane, s: +v.s.toFixed(2),
          v: +v.v.toFixed(2), paint: v.paint, external: v.external,
        })),
        peds: S.traffic.peds.map((p) => ({ edgeId: p.rec.id, side: p.side, dir: p.dir, s: +p.s.toFixed(2) })),
        targets: [S.targetVeh, S.targetPed],
      };
    },
    deserialize(data) {
      if (!S.traffic || !data) return;
      if (S.dirty || S.graph.dirty) rebuildGraph();
      for (const id of [...S.traffic.vehicles.keys()]) S.traffic.despawn(id);
      S.traffic.peds.length = 0;
      S.ctx.world.traffic.pedestrians.clear();
      for (const d of data.vehicles || []) {
        const rec = S.graph.edges.get(d.edgeId);
        if (!rec) continue;
        const ci = MIX.findIndex((m) => m[0] === d.kind);
        const v = S.traffic.spawn({ rec, dir: d.dir, s: d.s, ci: ci >= 0 ? ci : undefined, external: d.external });
        if (v) { v.v = d.v || 0; v.lane = Math.min(d.lane, rec.lanes - 1); v.prevLane = v.lane; if (d.paint) v.paint = d.paint; }
      }
      for (const d of data.peds || []) {
        const rec = S.graph.edges.get(d.edgeId);
        if (!rec || !rec.swR) continue;
        const p = S.traffic.spawnPed({ w: { id: d.edgeId, side: d.side }, s: d.s });
        if (p) p.dir = d.dir;
      }
      if (data.targets) { S.targetVeh = data.targets[0]; S.targetPed = data.targets[1]; }
    },
    _debug() { return S; },
  },

  showcase: {
    description: 'The roads showcase network alive: ~150 instanced vehicles of 8 classes routed with A* and IDM car-following, queueing at signalised crossroads, merging onto the highway, plus pedestrians on every sidewalk.',
    cameras: CAMERAS,
    async setup(ctx) {
      S.showcase = true;
      await stage(ctx);
      rebuildGraph();
      S.targetVeh = 190; S.targetPed = 155;
      const [tv, tp] = targets();
      S.traffic.target = tv; S.traffic.pedTarget = tp;
      const t0 = performance.now();
      const steps = 750, dt = 0.06;   // fixed count: the staged scene must be deterministic
      for (let i = 0; i < steps; i++) {
        S.traffic.balance(dt);
        S.traffic.step(dt);
        S.traffic.stepPeds(dt);
      }
      ctx.log.info(`pre-rolled ${steps} steps (${(steps * dt).toFixed(0)} s) in ${(performance.now() - t0).toFixed(0)} ms; ${S.traffic.vehicles.size} vehicles, ${S.traffic.peds.length} pedestrians`);
    },
  },
};
