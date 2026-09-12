// roads module: road network data model (world.roads), terrain-conforming road geometry with proper
// intersections, kerbs/sidewalks, lane markings, bridges and highway barriers; lamp positions and the
// intersection list for props/traffic.
import { Network } from './network.js';
import { RoadBuilder } from './build.js';
import { createMaterials } from './materials.js';
import { stage, CAMERAS } from './showcase.js';

const S = { ctx: null, net: null, builder: null, mats: null, pending: false, settle: 0, preserveTerrain: false };

function rebuildNow(options = {}) {
  if (!S.builder) return false;
  if (options.preserveTerrain !== undefined) S.preserveTerrain = options.preserveTerrain === true;
  S.pending = false; S.settle = 0;
  let ok = true;
  try { S.builder.rebuild({ preserveTerrain: S.preserveTerrain }); }
  catch (e) { ok = false; S.ctx.log.error(`rebuild failed: ${e?.message || e}`, e); }
  const st = S.builder.stats;
  // Graph mutation events can fire before derived curve lengths and merge profiles are final.
  // Consumers of those derived values synchronize from this owner-complete boundary.
  S.ctx.events.emit('roads:rebuilt', { edges: st.edges, nodes: st.nodes });
  S.ctx.log.info(`rebuilt ${st.edges} edges / ${st.nodes} nodes -> ${st.meshes} meshes, ${st.tris} tris, ${st.bridges} bridge edges, ${st.terrainVerts} terrain vertices cut/filled, ${st.ms.toFixed(0)} ms`);
  return ok;
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
    ctx.events.on('roads:changed', () => { S.pending = true; S.settle = 0; S.preserveTerrain = false; }, 'roads');
    // someone else sculpted the terrain (our own cut/fill is flagged): refresh the design heights of the
    // edges in that region and rebuild
    ctx.events.on('terrain:changed', (region) => {
      if (S.builder?.flattening || !S.net.edges.size) return;
      if (region?.restore === true) {
        // A restore replays authoritative terrain and road snapshots. Sampling that restored,
        // already-conformed terrain back into the immutable road design profile changes the
        // transaction on every undo/redo cycle.
        S.preserveTerrain = true;
        S.pending = true; S.settle = 0;
        return;
      }
      S.preserveTerrain = false;
      if (S.net.resampleDesign(region || { all: true }) > 0) { S.pending = true; S.settle = 0; }
    }, 'roads');
  },

  update(dt) {
    S.builder?.updateLod(S.ctx.camera.camera);
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
    /** Rebuild all road meshes now (also conforms the terrain under roads). Idempotent. */
    rebuild(options = {}) { return rebuildNow(options); },
    /** Street-lamp anchor points along an edge: [{x,y,z,heading,side,edgeId,t}] */
    lampPositions(edgeId) { return S.builder ? S.builder.lampPositions(edgeId) : []; },
    /** Signalised-intersection candidates: [{id,x,y,z,roundabout,arms:[{edgeId,dir,trim,stopT,lanesIn,width,type,ring}]}] */
    intersections() { return S.builder ? S.builder.intersections() : []; },
    /** Node analysis record (arms, corners, trims) for a node id. */
    nodeInfo(id) { return S.builder?.nodeInfo.get(id) || null; },
    /** Highest generated asphalt/kerb/sidewalk height, including bridges; null off pavement.
     * Reflects the last rebuild. Excludes barriers, piers, decals and terrain. */
    surfaceHeightAt(x, z) { return S.builder?.pavement.heightAt(x, z) ?? null; },
    surfaceStats() { return S.builder?.pavement.stats() ?? null; },
    stats() { return S.builder ? { ...S.builder.stats } : null; },
    /** dev: the geometry builder (probes only) */
    _builder() { return S.builder; },
    types() { return S.ctx?.world.roads.types; },
    /** dev: per-row debug samples along an edge */
    edgeDebug(edgeId, step = 8) {
      const c = S.net?.poly(edgeId); if (!c) return null;
      const e = S.net.edges.get(edgeId); const T = S.ctx.world.terrain; const out = [];
      for (let i = 0; i < c.n; i += Math.max(1, Math.round(step / 4))) out.push({ i, s: +c.s[i].toFixed(1), x: +c.xs[i].toFixed(1), z: +c.zs[i].toFixed(1), y: +c.ys[i].toFixed(2), design: +c.design[i].toFixed(2), terrNow: +T.getHeight(c.xs[i], c.zs[i]).toFixed(2), water: c.water[i], bridge: c.bridge[i] });
      return { id: e.id, type: e.type, len: +c.len.toFixed(1), trimA: e.trimA, trimB: e.trimB, ring: !!e.ring, rows: out };
    },
    edges() { return S.net ? [...S.net.edges.values()].map((e) => ({ id: e.id, a: e.a, b: e.b, type: e.type, len: +e.length.toFixed(1), bridge: e.bridge, ring: !!e.ring })) : []; },
    serialize() {
      if (!S.net) return null;
      return {
        version: 2, nextId: S.net._nextId, preserveTerrain: true,
        nodes: [...S.net.nodes.values()].map((n) => ({ id: n.id, x: n.x, y: n.y, z: n.z, designY: n.designY })),
        edges: [...S.net.edges.values()].map((e) => ({ id: e.id, a: e.a, b: e.b, type: e.type, lanes: e.lanes, oneWay: e.oneWay, ctrl: e.ctrl, elevation: e.elevation, design: Array.from(S.net.poly(e.id).design) })),
      };
    },
    deserialize(data) {
      if (!S.net || !data) return;
      S.net.restore(data);
      rebuildNow({ preserveTerrain: data.preserveTerrain === true });
    },
    /** Exact graph/profile restore for one Tools history entry, including the allocator cursor. */
    restoreTransaction(data) {
      if (!S.net || !data) return false;
      S.net.restore(data, { resetIds: true });
      return rebuildNow({ preserveTerrain: true });
    },
    /** Authoring reset for a newly seeded world; ordinary deserialize keeps monotonic IDs. */
    reset(data) {
      if (!S.net || !data) return false;
      S.builder?.resetTerrainBasis();
      S.net.restore(data, { resetIds: true });
      rebuildNow({ preserveTerrain: data.preserveTerrain === true });
      return true;
    },
  },

  showcase: {
    description: 'Street grid + avenue with a crosswalk crossroads, alleys, a roundabout, a curved highway with median barrier and an on-ramp, and a street bridge over the river.',
    cameras: CAMERAS,
    async setup(ctx) {
      stage(ctx);
      rebuildNow();
    },
  },
};
