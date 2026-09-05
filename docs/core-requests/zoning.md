# Core requests — zoning

Nothing blocking; the module works against core as-is. Two small, additive requests:

1. **`world.zones` default stub** (`src/core/world.js`) — zoning installs three extra query helpers on the
   section in place, and other modules (tools, buildings, infoviews) will want to call them even when
   zoning failed to init. Please add safe defaults next to the existing `paint/erase/lotsFor/freeLots`:
   ```js
   cellAt: () => null,      // cell record at a world position
   lotAt: () => null,       // lot whose rectangle contains a world position
   zonableAt: () => null,   // {edgeId, side, depth, lat} if the point is inside a road's buildable band
   maxDepth: 4,
   ```
2. **Lot record fields** — the generated lots carry a few fields beyond the ARCHITECTURE sketch, all additive:
   `y` (terrain height at the lot centre), `nx,nz` (unit outward normal, i.e. away from the road),
   `ax,az` (unit vector along the road), `t` (parameter of the lot centre along the edge), `corner`
   (true when the lot was extended to fit a junction corner). `heading` is the direction a building on the
   lot should face — pointing **at** the road, in the world convention (0 = north = −Z, clockwise).
   Worth folding into §3 of ARCHITECTURE.md so buildings/props/traffic can rely on them.

No changes needed to `world.roads.frontage`; zoning subdivides its spans itself with `roads.sample`.
