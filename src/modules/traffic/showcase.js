// Traffic showcase: stage the roads module's own demo network (grid + avenue + roundabout + highway
// with an on-ramp + river bridge) and let the traffic module populate it. Reusing the roads staging
// keeps the two modules honest about the same lane geometry.
import { stage as stageRoads } from '../roads/showcase.js';

export const CAMERAS = {
  // the signalised crossroads where the avenue meets the x=40 street: queues, turns, crosswalks
  junction: { position: [76, 21, 88], target: [40, 1.2, 44] },
  // dual carriageway sweep + on-ramp merge, framed low for headlight cones at night
  highway_night: { position: [318, 19, 264], target: [168, 9, 277] },
  // eye level on the avenue
  boulevard: { position: [-22, 9, 62], target: [90, 2, 40] },
  // roundabout from above
  circle: { position: [-152, 46, 12], target: [-200, 2, -40] },
};

export async function stage(ctx) {
  const R = ctx.world.roads;
  if (R.edges.size === 0) {
    try {
      stageRoads(ctx);
    } catch (e) {
      ctx.log.warn(`roads staging failed (${e?.message || e}); falling back to a simple grid`);
      fallbackGrid(ctx);
    }
  }
  try { ctx.modules.roads?.rebuild?.(); } catch (e) { ctx.log.warn(`roads rebuild failed: ${e?.message || e}`); }
  for (const [name, p] of Object.entries(CAMERAS)) ctx.camera.registerPreset(name, p);
}

function fallbackGrid(ctx) {
  const R = ctx.world.roads;
  const node = (x, z) => R.addNode(x, z);
  const XS = [-160, -80, 0, 80, 160], ZS = [-160, -80, 0, 80, 160];
  for (const x of XS) { let prev = node(x, ZS[0]); for (let i = 1; i < ZS.length; i++) { const n = node(x, ZS[i]); R.addEdge(prev, n, 'street'); prev = n; } }
  for (const z of ZS) { let prev = node(XS[0], z); for (let i = 1; i < XS.length; i++) { const n = node(XS[i], z); R.addEdge(prev, n, 'street'); prev = n; } }
}
