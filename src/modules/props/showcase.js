// Showcase staging for props: a small grid town around the origin (so the standard aerial/street/
// skyline/closeup presets all land on something), one signalised avenue crossroads, and everything
// outside the built-up area left to the forest scatter.
import { CLEAR_ZONES } from './place.js';

export const CAMERAS = {
  // a low view straight down the lamp-lit avenue
  lamps_night: { position: [-104, 8.0, 47], target: [140, 4.0, 41] },
  forest: { position: [-320, 46, -230], target: [-400, 24, -320] },
  // the signalised crossroads at (40, 40) from the diagonal
  crossing: { position: [96, 22, 98], target: [40, 3, 40] },
  // eye level on the verge, looking east along the avenue pavement
  bench: { position: [4, 2.5, 25], target: [96, 1.7, 29] },
  canopy: { position: [150, 16, 150], target: [110, 12, 110] },
};

/** Camera eye points that must not have a tree planted on top of them. */
export const EYES = [
  [96, 98], [4, 25], [150, 150], [-104, 47], [140, 41],
  [86, 77], [78, 105], [46, 84], [40, 40], [-40, 60], [20, 20],
];

export function stage(ctx) {
  const R = ctx.world.roads;
  const node = (x, z) => R.addNode(x, z);
  const edge = (a, b, type = 'street', opts) => R.addEdge(a, b, type, opts);
  const chain = (pts, type, opts) => {
    const ids = pts.map(([x, z]) => node(x, z));
    for (let i = 1; i < ids.length; i++) edge(ids[i - 1], ids[i], type, opts);
    return ids;
  };

  // avenue east-west through the middle of the frame
  const AVE_Z = 40;
  chain([[-300, AVE_Z], [-200, AVE_Z], [-120, AVE_Z], [-40, AVE_Z], [40, AVE_Z], [120, AVE_Z], [200, AVE_Z], [300, AVE_Z]], 'avenue');
  // north-south streets
  for (const x of [-120, -40, 40, 120, 200]) chain([[x, -110], [x, -40], [x, AVE_Z], [x, 120], [x, 200]], 'street');
  // east-west streets
  for (const z of [-110, -40, 120, 200]) {
    chain([[-120, z], [-40, z], [40, z], [120, z], [200, z]], 'street');
  }
  // a couple of alleys through the blocks
  chain([[0, 120], [0, 200]], 'alley');
  chain([[80, -40], [80, AVE_Z]], 'alley');
  // a lane curving away into the woods on the east side
  {
    const a = node(200, 120), b = node(320, 176);
    edge(a, b, 'street', { ctrl: { x: 226, z: 186 } });
    const c = node(-120, -110), d = node(-260, -70);
    edge(c, d, 'street', { ctrl: { x: -206, z: -128 } });
  }
  for (const [k, v] of Object.entries(CAMERAS)) ctx.camera.registerPreset(k, v);
  CLEAR_ZONES.length = 0;
  for (const [x, z] of EYES) CLEAR_ZONES.push({ x, z, r: 15 });
}
