# roads → core / other-module requests

None of these block the module; they are notes for the integrator and neighbouring builders. Updated in round 2.

## 1. terrain: an official batched cut/fill (`world.terrain.writeHeights` / `flattenStrip`)
Round 1 conformed terrain with thousands of `modify({mode:'flatten'})` brushes (1.6 s, non-convergent on slopes,
sheer disc-shaped cuts around nodes). Round 2 computes the exact target height for every heightfield vertex under
the road corridor (asphalt + sidewalk + 0.8 m verge → `profile − 0.25 m`) and clamps the vertices outside it to a
1:1.5 cut/fill slope, then writes those values **directly into `world.terrain.heights`** and calls
`world.terrain.modify({x, z, radius, strength: 0, mode: 'raise'})` once over the bounding box so terrain rebuilds
its derived normal/AO texture, chunk bounds and water, and emits a single `terrain:changed`. This relies on
`heights` being the live array behind `heightTex` (it is, today). Proposed terrain-owned API so this contract is
explicit instead of implied:

```js
world.terrain.writeHeights(ix0, iz0, ix1, iz1)   // "I changed heights in this cell rect" → derived rebuild + event
// or
world.terrain.flattenStrip(pts /*[{x,z,y,halfWidth}]*/, { drop: 0.25, grade: 1.5 })
```

Roads keep *design heights* (terrain sampled when an edge was drawn) so `rebuild()` is idempotent; an external
`terrain:changed` (sculpt tool) re-samples the design heights of the edges inside the region and rebuilds.

## 2. terrain: `world.roads.coverage` / `isRoad` — integrated, thanks
Terrain now hides blades/tufts on the mask. The node part of the mask is the real paved region (arm rectangles +
corner sidewalks) instead of a disc, so no bald grass discs around intersections. `coverage.version` is bumped on
every rebuild.

## 3. tools/screenshot.mjs / gauntlet: Vite full reloads during a capture
Any builder saving a file under `src/` while another builder's capture is between `ready` and `page.screenshot`
yields a boot-overlay PNG (`ok:true`, 0 errors). Suggest the tool re-check `window.__sim.ready` right before the
screenshot and retry once if it went false. `--timeout 240` was needed for every 1080p shot on the shared box.

## 4. ARCHITECTURE §3: extra road fields (unchanged from round 1, plus ring data)
`world.roads.types` carries `asphaltHalf, cornerR, laneW, shoulder, median, oneWay` and a `ramp` type. Edges carry
`trimA/trimB`, `bridge`, `ring` (member of a one-way cycle = roundabout), and for merges `merge`/`accel`.
`api.intersections()` entries have `roundabout: bool` and per-arm `ring: bool`; traffic should treat ring arms as
yield-on-entry, not signalised. `api.serialize()/deserialize()` exist for the save system.
