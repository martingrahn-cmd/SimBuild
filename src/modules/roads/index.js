// roads module: road network data model (world.roads), terrain-conforming road geometry with proper
// intersections, kerbs/sidewalks, lane markings, bridges and highway barriers; lamp positions and the
// intersection list for props/traffic.
import { Network } from './network.js';
import { RoadBuilder } from './build.js';
import { createMaterials } from './materials.js';
import { stage, CAMERAS } from './showcase.js';

const S = { ctx: null, net: null, builder: null, mats: null, pending: false, settle: 0 };

function rebuildNow() {
  if (!S.builder) return;
  S.pending = false; S.settle = 0;
  try { S.builder.rebuild(); }
  catch (e) { S.ctx.log.error(`rebuild failed: ${e?.message || e}`, e); }
  const st = S.builder.stats;
  S.ctx.log.info(`rebuilt ${st.edges} edges / ${st.nodes} nodes -> ${st.meshes} meshes, ${st.tris} tris, ${st.bridges} bridge edges, ${st.flattenCalls} terrain brushes, ${st.ms.toFixed(0)} ms`);
}

export default {
  name: 'roads',
  dependencies: ['terrain'],
  budget: { drawCalls: 80, triangles: 600_000 },

  async init(ctx) {
    S.ctx = ctx;
    S.net = new Network(ctx.world, ctx.events, ctx.log);
    S.net.install();
    S.mats = await createMaterials(ctx);
    S.builder = new RoadBuilder(S.net, ctx.world, S.mats, ctx.group, ctx.log);
    ctx.events.on('roads:changed', () => { S.pending = true; S.settle = 0; }, 'roads');
    ctx.events.on('terrain:changed', () => { if (S.builder?.flattening) return; if (S.net.edges.size) { S.pending = true; S.settle = 0; } }, 'roads');
  },

  update(dt) {
    if (!S.pending) return;
    // coalesce bursts of edits (tools drag) into one rebuild
    S.settle += dt;
    if (S.settle >= 0.05) rebuildNow();
  },

  dispose(ctx) {
    S.builder?.dispose();
    S.mats?.dispose();
    S.builder = null; S.mats = null; S.net = null;
  },

  api: {
    /** Rebuild all road meshes now (also flattens terrain under roads). */
    rebuild() { rebuildNow(); },
    /** Street-lamp anchor points along an edge: [{x,y,z,heading,side,edgeId,t}] */
    lampPositions(edgeId) { return S.builder ? S.builder.lampPositions(edgeId) : []; },
    /** Signalised-intersection candidates: [{id,x,y,z,arms:[{edgeId,dir,trim,stopT,lanesIn,width,type}]}] */
    intersections() { return S.builder ? S.builder.intersections() : []; },
    /** Node analysis record (arms, corners, trims) for a node id. */
    nodeInfo(id) { return S.builder?.nodeInfo.get(id) || null; },
    stats() { return S.builder ? { ...S.builder.stats } : null; },
    types() { return S.ctx?.world.roads.types; },
    /** dev: per-row debug samples along an edge */
    edgeDebug(edgeId, step = 8) {
      const c = S.net?.poly(edgeId); if (!c) return null;
      const e = S.net.edges.get(edgeId); const T = S.ctx.world.terrain; const out = [];
      for (let i = 0; i < c.n; i += Math.max(1, Math.round(step / 4))) out.push({ i, s: +c.s[i].toFixed(1), x: +c.xs[i].toFixed(1), z: +c.zs[i].toFixed(1), y: +c.ys[i].toFixed(2), terr: +c.terrain[i].toFixed(2), terrNow: +T.getHeight(c.xs[i], c.zs[i]).toFixed(2), water: c.water[i], bridge: c.bridge[i] });
      return { id: e.id, type: e.type, len: +c.len.toFixed(1), trimA: e.trimA, trimB: e.trimB, rows: out };
    },
    edges() { return S.net ? [...S.net.edges.values()].map((e) => ({ id: e.id, a: e.a, b: e.b, type: e.type, len: +e.length.toFixed(1), bridge: e.bridge })) : []; },
  },

  showcase: {
    description: 'Street grid + avenue with a crosswalk crossroads, alleys, a one-way loop, a curved highway with median barrier and an on-ramp, and a street bridge over the river.',
    cameras: CAMERAS,
    async setup(ctx) {
      stage(ctx);
      rebuildNow();
    },
  },
};
