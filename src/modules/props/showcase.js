// Showcase staging for props: a small grid town with a signalised crossroads and a tree-lined
// avenue, an empty hedged/fenced lot in the block the core `closeup` preset targets, a 96 x 96 m
// hedged park with lantern posts south-west of it, and a mixed forest on the ground beyond.
//
// Road coordinates are chosen so the 4 m `roads.coverage` cells that mark asphalt never swallow the
// sidewalk band the kerbside furniture stands in (a street centreline at 4k+3 puts the last
// asphalt-marked cell strictly inside the carriageway).

export const SCENE = new Map();

// Placeholders so the router knows the eight preset names before setup() computes the real ones.
export const CAMERAS = {
  forest: { yaw: 0.70, pitch: 0.30, distance: 120, target: [0, 10, -220] },
  avenue: { yaw: -Math.PI / 2, pitch: 0.20, distance: 45, target: [83, 3, 40] },
  signal: { yaw: 0.85, pitch: 0.22, distance: 25, target: [43, 4, 40] },
  lamp: { position: [50, 2.4, 52], target: [78, 4.0, 48] },
  park: { yaw: 0.75, pitch: 0.28, distance: 60, target: [-150, 3, 140] },
  treecloseup: { position: [78, 4.6, 58], target: [72, 6.5, 52] },
  busstop: { position: [60, 4.4, 60], target: [50, 1.6, 50] },
  canopy: { yaw: 0.30, pitch: 0.95, distance: 90, target: [53, 6, 40] },
};

const AVE_Z = 40;
const NS = [-1, 43, 131];        // north-south street centrelines (x = 4k+3)
const EW = [-45, 91];            // east-west street centrelines (z = 4k+3)

export function stage(ctx) {
  const R = ctx.world.roads;
  const T = ctx.world.terrain;
  const node = (x, z) => R.addNode(x, z);
  const chain = (pts, type, opts) => {
    const ids = pts.map(([x, z]) => node(x, z));
    for (let i = 1; i < ids.length; i++) R.addEdge(ids[i - 1], ids[i], type, opts);
    return ids;
  };

  // avenue east-west through (43, 40)
  chain([[-300, AVE_Z], [-200, AVE_Z], [-120, AVE_Z], [-1, AVE_Z], [43, AVE_Z], [131, AVE_Z], [220, AVE_Z], [300, AVE_Z]], 'avenue');
  // north-south streets crossing it
  for (const x of NS) chain([[x, -120], [x, EW[0]], [x, AVE_Z], [x, EW[1]], [x, 190]], 'street');
  // east-west streets
  chain([[NS[0], EW[0]], [NS[1], EW[0]], [NS[2], EW[0]]], 'street');
  chain([[NS[0], EW[1]], [NS[1], EW[1]]], 'street');
  // an alley through one block and a lane curving off into the woods
  chain([[20, EW[0]], [20, AVE_Z]], 'alley');
  {
    const a = node(NS[2], 190), b = node(300, 250);
    R.addEdge(a, b, 'street', { ctrl: { x: 215, z: 258 } });
  }

  const scene = {
    cross: { x: NS[1], z: AVE_Z },
    lot: { x0: 6, z0: 4, x1: 34, z1: 26 },
    park: { cx: -150, cz: 140, w: 96, d: 96 },
    // two woodland regions: the ridge north of the grid (the `forest` preset) and a stand out to the
    // south-west that the `skyline` camera looks across
    forest: { x0: -430, z0: -530, x1: 350, z1: -60 },
    forest2: { x0: -620, z0: 40, x1: -230, z1: 430 },
    // clipped hedge runs along the avenue verge (cs2_4) so item 11's `hedge` rect is in frame at
    // `avenue` as well as `park`
    hedges: [
      [56, AVE_Z + 16, 104, AVE_Z + 16],
      [116, AVE_Z + 16, 168, AVE_Z + 16],
      [58, AVE_Z - 16, 108, AVE_Z - 16],
      [-30, AVE_Z + 16, 16, AVE_Z + 16],
    ],
  };
  // keep the forest out of the town block and off the park lawn
  const town = { x0: -110, z0: -160, x1: 200, z1: 230 };
  const pk = scene.park;
  scene.forestAvoid = (x, z) => {
    if (x > town.x0 && x < town.x1 && z > town.z0 && z < town.z1) return false;
    if (Math.abs(x - pk.cx) < pk.w * 0.5 + 12 && Math.abs(z - pk.cz) < pk.d * 0.5 + 12) return false;
    return true;
  };
  SCENE.set(ctx.world.seed, scene);
  for (const [k, v] of Object.entries(CAMERAS)) ctx.camera.registerPreset(k, v);
  return scene;
}
