# roads → core / other-module requests

None of these block the module; they are notes for the integrator and neighbouring builders.

## 1. terrain: batched cut/fill (`world.terrain.flattenStrip` or `modifyBatch`)
Roads conform terrain to the road surface with `world.terrain.modify({mode:'flatten', target})`. Because a brush has a
single target height, a sloped road needs many small brushes (one per 4 m cell across and along the road) so the
staircase error stays below the 0.3 m the road is lifted above the ground. Each `modify` call rebuilds derived
normals/AO with a fixed 10-cell margin + 8-cell blur, so ~9 000 brushes (66 edges) cost ~1.6 s; a 300-edge city
would be ~7 s at init. Proposed API (terrain-owned, small):

```js
// flatten the heightfield to a piecewise-linear centreline: pts = [{x, z, y, halfWidth}], blend = metres of falloff
world.terrain.flattenStrip(pts, { blend: 4, drop: 0.3 })   // one derived rebuild over the union bbox, one terrain:changed
// or generic batching:
world.terrain.modifyBatch([brush, brush, ...])               // applies all, rebuilds derived data once
```
Workaround in place: dense 6 m brushes, skipped when the cell is already within 4 cm of the target (so re-flattening an
unchanged network is nearly free); one `terrain:changed` per brush is emitted (roads ignores its own).

## 2. terrain: hide grass / detail instances on roads (`world.roads.coverage`)
Terrain's grass tufts are placed on the heightfield and poke through the asphalt (the flattened terrain sits 0.3 m
below the road). Roads publishes a coverage mask after every rebuild, on the terrain grid:

```js
world.roads.coverage = { res: 512, cell: 4, data: Uint8Array(res*res) /* 0 none, 1 asphalt, 2 sidewalk/verge */, version }
world.roads.isRoad(x, z) -> 0 | 1 | 2
```
Please skip grass/detail instances where `isRoad(x, z) !== 0` (re-run placement on `roads:changed`). Zoning/props can use
the same mask to keep lots and trees off the carriageway.

## 3. tools/screenshot.mjs: `page.screenshot` 30 s timeout under SwiftShader
With `terrain` in the scene a frame can take several seconds in SwiftShader; `page.screenshot` then times out
(30 s) and the PNG is missing while the JSON still reports `ok:false` with no console errors. A retry (or
`page.screenshot({ timeout: 120000 })`) would make the gauntlet deterministic. Also the boot overlay capture when Vite
full-reloads mid-capture (environment's note 2) hit roads several times because other builders were saving files.

## 4. ARCHITECTURE §3: extra road fields
`world.roads.types` gained per-type geometry fields (`asphaltHalf, cornerR, laneW, shoulder, median, oneWay`) plus a
`ramp` type (one-way, 1 lane, merges into highways with an acceleration lane). Edges carry `trimA/trimB` (metres of the
edge inside the intersection polygon at each end), `bridge` (bool) and, for merges, `merge`/`accel`. The module api
exposes `lampPositions(edgeId)`, `intersections()`, `nodeInfo(id)`, `rebuild()`, `stats()`. Consider adding these to the
schema so props/traffic builders know they exist.
