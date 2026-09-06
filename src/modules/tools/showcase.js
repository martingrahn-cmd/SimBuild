// Showcase staging for the tools module.
//
// The district is BUILT BY THE TOOLS (module spec §4 item 1): every road, zone, terrain edit and
// demolition below goes through api.select / pointer / click / commit. There is not one direct call
// to world.roads.addEdge, world.zones.paint or world.terrain.modify in this file — grep it.
//
// Then six poses are pinned at once through api._showcasePoses(true) — the showcase-only multi
// preview mode select() can never reach — so a single still frame shows the road drag, the zone
// brush, the terrain brush, the bulldoze marquee, the service footprint with its coverage annulus
// and the red invalid ghost.
import { serviceDef } from './costs.js';

export const DESCRIPTION =
  'Rivermouth Fields: a tool-built district of an avenue spine, four cross streets, a curved '
  + 'east street and four zoned blocks with 30+ buildings, holding six tool poses at once — an '
  + 'avenue mid-drag with live length / angle / grade / price chips, the residential zone brush, '
  + 'the terrain sculpt brush on a raised knoll, a bulldoze marquee over four doomed houses, a '
  + 'clinic footprint with its coverage annulus, and the red invalid ghost up the knoll.';

export const CAMERAS = {
  roadtool: { position: [74, 44, 96], target: [52, 2, 22] },
  zonetool: { position: [-52, 40, 104], target: [-90, 1, 60] },
  sculpt: { position: [210, 58, -48], target: [150, 10, -120] },
  bulldoze: { position: [-72, 52, -12], target: [-140, 4, -84] },
  service: { position: [176, 66, 190], target: [120, 4, 110] },
  invalid: { position: [214, 40, -96], target: [152, 10, -96] },
};

// ---------------------------------------------------------------------------------- the district
//
// Site: the flat shelf north of the river at seed 1337 (see the height map in the round-2 probe —
// z ≥ −100 runs 12–20 m, z ≤ −120 falls into the river). The tools LEVEL that shelf to a 15 m plane
// first, exactly as a player grades a site before laying roads, and every road then sits on ≤ 2 %
// ground. Two deviations from the spec's §8 sketch, forced by the map and stated rather than asked:
// the N–S streets run z ∈ [−100, 180] instead of ±180, and the E–W streets sit at z = −60 / +120
// instead of ±120, because z = −120 crosses open water at x ∈ [−180, 20].
const AVE_Z = 0;
const AVE_X = [-240, -160, -80, 0, 80, 160, 240];
const NS_X = [-160, -80, 80, 160];
const NS_Z = [-100, -60, 0, 60, 120, 180];
const EW_Z = [-60, 120];
const EW_X = [-240, -160, -80, 0, 80, 160, 240];

const SITE = { x0: -250, x1: 250, z0: -100, z1: 200, level: 15, step: 70, brush: 200 };
const KNOLL = { x: 150, z: -120, size: 120, peak: 30 };
const PAD = { x: 0, z: 0, size: 120 };

/** Drive the road tool over a polyline: select, click every point, commit. */
function drawRoad(ctx, api, type, mode, pts, opts = {}) {
  const { ctrl, ...rest } = opts;
  api.select('road', { type, mode, elevation: 0, oneWay: false, snap: ['magnet'], ...rest });
  // In curve mode the second click places the control point, so a curve is start → ctrl → end.
  const clicks = mode === 'curve' && ctrl ? [pts[0], [ctrl.x, ctrl.z], pts[pts.length - 1]] : pts;
  for (const [x, z] of clicks) { api.pointer(x, z); api.click(0); }
  const r = api.commit();
  if (!r || !r.ok) ctx.log.warn(`road ${type} ${pts[0]}→${pts[pts.length - 1]} rejected: ${r?.reason}`);
  api.cancel();
  return r;
}

function paintZone(ctx, api, type, density, x0, z0, x1, z1) {
  api.select('zone', { type, density, brush: 'marquee', size: 24 });
  api.pointer(x0, z0); api.click(0);
  api.pointer(x1, z1);
  const r = api.commit();
  if (!r || !r.ok) ctx.log.warn(`zone ${type}/${density} rejected: ${r?.reason}`);
  api.cancel();
  return r;
}

function sculpt(ctx, api, mode, x, z, size, strength, dabs, target) {
  api.select('terrain', { mode, size, strength });
  api.pointer(x, z);
  const r = api.click(0, dabs, target);
  if (!r || !r.ok) ctx.log.warn(`terrain ${mode} at ${x},${z} rejected: ${r?.reason}`);
  api.cancel();
  return r;
}

/** Grade the whole building shelf to one plane with the flatten brush — one undo entry. */
function levelSite(ctx, api) {
  api._undoGroup('terrain:level site', () => {
    api.select('terrain', { mode: 'flatten', size: SITE.brush, strength: 100 });
    for (let z = SITE.z0; z <= SITE.z1; z += SITE.step) {
      for (let x = SITE.x0; x <= SITE.x1; x += SITE.step) {
        api.pointer(x, z);
        api.click(0, 3, SITE.level);
      }
    }
    api.cancel();
  });
}

// ------------------------------------------------------------------------------------- the poses

/**
 * Six drafts, drawn simultaneously by api._showcasePoses(true). Each is exactly the descriptor the
 * matching tool's draw() takes, so nothing here is a special rendering path — the poses go through
 * the same code the live tool does.
 */
export function POSES(ctx, S, api) {
  const road = S.tools.road;
  const snap = (x, z, from, o) => road.snapAt(x, z, from, o || { snap: ['magnet'] });
  const out = [];

  // 1 — roadtool: an avenue mid-drag off the spine node at (0,0), curving away to the cursor
  // It leaves the spine node at ~40°, not along it: two roads meeting at under 25° is exactly what
  // the shared-node rule rejects, so the spec's literal (0,0)→(60,0) would pose the *invalid* ghost.
  const a0 = snap(0, 0, null);
  const a1 = snap(48, 40, a0, { snap: [] });
  const cur = snap(96, 34, a1, { snap: [] });
  out.push({
    tool: 'road', type: 'avenue', mode: 'curve', elevation: 0, oneWay: false,
    points: [{ x: a0.x, z: a0.z, node: a0.node, edge: a0.edge }, { x: a1.x, z: a1.z, node: a1.node, edge: a1.edge }],
    cursor: cur, ctrl: { x: 80, z: 48 }, wash: true,
  });

  // 2 — zonetool: the residential/high brush over the western block
  out.push({ tool: 'zone', type: 'residential', density: 'high', brush: 'paint', size: 24, cursor: { x: -90, z: 60 }, marquee: null, erasing: false });

  // 3 — sculpt: the raise brush on the knoll it built
  out.push({ tool: 'terrain', mode: 'raise', size: 60, strength: 70, cursor: { x: KNOLL.x, z: KNOLL.z } });

  // 4 — bulldoze: a marquee over the north-west block
  out.push({ tool: 'bulldoze', mode: 'marquee', marquee: { x0: -176, z0: -116, x1: -104, z1: -52 }, cursor: { x: -140, z: -84 } });

  // 5 — service: a clinic ghost with its coverage annulus
  const kind = 'clinic';
  const ne = ctx.world.roads.nearestEdge?.(120, 110, 160);
  const heading = ne ? Math.atan2(ne.point.z - 110, ne.point.x - 120) + Math.PI / 2 : 0;
  out.push({ tool: 'service', kind, def: serviceDef(kind, ctx.modules), cursor: { x: 120, z: 110 }, heading });

  // 6 — invalid: a street straight up the knoll, rejected on grade by the real evaluator
  const b0 = snap(150, -60, null, { snap: [] });
  const b1 = snap(150, -120, b0, { snap: [] });
  out.push({
    tool: 'road', type: 'street', mode: 'straight', elevation: 0, oneWay: false,
    points: [{ x: b0.x, z: b0.z, node: b0.node, edge: b0.edge }],
    cursor: { ...b1, kind: null, id: null }, ctrl: null, slot: 'alt', wash: false,
  });
  return out;
}

// ------------------------------------------------------------------------------------- staging

export async function stage(ctx, S, api) {
  const t0 = performance.now();
  // A staged demo district is built without an affordability gate; the live game is not.
  S._freeBuild = true;
  const T = ctx.world.terrain;

  // 1 — grade the site: the flatten brush levels the shelf, then a 120 m pad at the spine junction
  levelSite(ctx, api);
  sculpt(ctx, api, 'flatten', PAD.x, PAD.z, PAD.size, 100, 3, SITE.level);

  // 2 — the avenue spine
  drawRoad(ctx, api, 'avenue', 'straight', AVE_X.map((x) => [x, AVE_Z]));

  // 3 — four N–S streets, each snapping onto the avenue at z = 0 (a real T-junction split)
  for (const x of NS_X) drawRoad(ctx, api, 'street', 'straight', NS_Z.map((z) => [x, z]));
  // …and two E–W streets, each snapping onto all four N–S streets
  for (const z of EW_Z) drawRoad(ctx, api, 'street', 'straight', EW_X.map((x) => [x, z]));

  // 4 — a curved street off the east side, and an alley behind the centre block
  drawRoad(ctx, api, 'street', 'curve', [[160, 120], [232, 8]], { ctrl: { x: 228, z: 96 } });
  drawRoad(ctx, api, 'alley', 'straight', [[-40, 60], [40, 60]]);

  ctx.modules.roads?.rebuild?.();
  ctx.modules.zoning?.refresh?.();

  // 5 — zone eight blocks: all four types in both densities
  paintZone(ctx, api, 'residential', 'low', -232, -96, -88, -8);
  paintZone(ctx, api, 'residential', 'high', -152, 8, -88, 112);
  paintZone(ctx, api, 'commercial', 'high', 8, -52, 72, 112);
  paintZone(ctx, api, 'commercial', 'low', -72, -52, -8, -8);
  paintZone(ctx, api, 'industrial', 'low', 88, -52, 152, -8);
  paintZone(ctx, api, 'industrial', 'high', 168, -52, 232, -8);
  paintZone(ctx, api, 'office', 'high', 88, 8, 152, 112);
  paintZone(ctx, api, 'office', 'low', 168, 8, 232, 112);
  ctx.modules.zoning?.refresh?.();

  // 6 — let the buildings module fill the lots, so bulldoze has real victims
  const spawned = ctx.modules.buildings?.spawnFreeLots?.(80) ?? 0;
  ctx.modules.buildings?.flush?.();
  if (spawned < 30) ctx.log.error(`showcase: spawnFreeLots returned ${spawned} (want ≥ 30) — the district will read as empty`);

  // 7 — raise a knoll south-east of the spine and smooth its skirt
  let dabs = 0;
  while (T.getHeight(KNOLL.x, KNOLL.z) < KNOLL.peak - 1 && dabs < 60) {
    sculpt(ctx, api, 'raise', KNOLL.x, KNOLL.z, KNOLL.size, 70, 4);
    dabs += 4;
  }
  sculpt(ctx, api, 'smooth', KNOLL.x, KNOLL.z, KNOLL.size * 1.3, 60, 3);

  // 8 — leave one building selected so the white footprint outline is on screen (criterion 12)
  let sel = null;
  for (const b of ctx.world.buildings.items.values()) {
    if (b.x > 0 && b.x < 80 && b.z > 20 && b.z < 120) { sel = b; break; }
  }
  if (sel) api.setSelection('building', sel.id);

  // 9 — pin the six poses
  api.select(null);
  const n = api._showcasePoses(true);
  S._freeBuild = false;

  const h = api.history();
  const terrainEntries = h.entries.filter((e) => e.label.startsWith('terrain:')).length;
  ctx.log.info(
    `showcase: ${ctx.world.roads.edges.size} edges / ${ctx.world.roads.nodes.size} nodes / `
    + `${ctx.world.zones.cells.size} zone cells / ${ctx.world.buildings.items.size} buildings, `
    + `knoll ${T.getHeight(KNOLL.x, KNOLL.z).toFixed(1)} m, ${h.entries.length} history entries `
    + `(${terrainEntries} terrain:), ${n} poses, ${((performance.now() - t0) / 1000).toFixed(1)} s`,
  );
}
