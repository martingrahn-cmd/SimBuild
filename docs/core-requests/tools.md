# core-requests: tools

Nothing in `src/core/` blocks the tools module today; these are the gaps it works around.

## 1. `world.terrain.writeHeights(ix0, iz0, ix1, iz1)` (already noted in ARCHITECTURE §3)

Undoing a sculpt stroke means restoring a saved rectangle of `world.terrain.heights` and then asking
terrain to refresh its derived data (normals, chunk bounds, textures, water). There is no API for
that, so `tools` does what `roads/build.js` already does: write into `heights` directly and then call
`terrain.modify({x, z, radius, strength: 0, mode: 'raise'})` purely for the refresh side effect.
An explicit `writeHeights(...)` (or `refresh(region)`) would make this a contract instead of a trick.

## 2. `world.roads.splitEdge(edgeId, x, z) -> nodeId`

Snapping a new road into the middle of an existing one needs the existing edge split at that point.
`tools` implements it with the public API (read the endpoints, `removeEdge`, re-`addNode` the two ends,
`addEdge` twice) — which works because `addNode` de-duplicates within 1 m, but it loses the edge id and
cannot split a bezier edge exactly, so T-junctions onto curved roads fall back to a plain crossing.

## 3. `props` module: `place(kind, x, z, heading) -> id` / `remove(id)`

`world.props` has no mutation API, so the prop tool is preview-only: it draws the ghost and the price
but cannot place anything. It calls `ctx.modules.props.place(...)` when that method appears.

## 4. `services` module (still a stub)

The service tool drives `world.services.place/remove/kinds` from the contract and degrades gracefully
(it reports "Service placement unavailable" when `place()` returns null). Footprint, cost, coverage
radius and road-frontage requirement per kind currently live in `src/modules/tools/costs.js`; once
`services` ships its own table, `tools` should read it from `world.services.kinds`/`api.def(kind)`
instead. A `world.services.def(kind)` accessor would remove the duplication.
