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

## Integrator decision (wave 1 → 2)

Applied to core (commit "Integrator: apply wave-1 core requests"):
- `tools/screenshot.mjs`: capture timeout raised to `max(--timeout, 180 s)`; before capture the tool re-checks
  `window.__sim.ready` **and** that the boot overlay is hidden, and re-waits once if a Vite full reload happened
  mid-capture (fixes boot-overlay PNGs reported with `ok:true`).
- `tools/gauntlet.mjs`: forwards `--timeout` (default 240 s) to every shot.
- `src/main.js`: in showcase mode only the wanted module + its transitive dependencies (+ environment) are imported,
  so another builder's broken module can no longer put errors in your screenshot JSON.
- `src/core/clock.js`: `sunAzimuth` fixed — 06:00 east, 12:00 south, 18:00 west. Modules should still prefer
  `world.weather.sunDir`.
- `src/core/engine.js`: `PCFShadowMap` (r185 deprecation), and in headless a 1×1 `readPixels` after each frame so the
  GPU queue cannot run several multi-second frames ahead of the capture.
- `src/core/assets.js`: `HDRLoader` replaces the deprecated `RGBELoader`.
- ARCHITECTURE §6 now documents that `composer.setSize` receives **physical** pixels, and §3 the extra
  `world.weather` fields (`moonDir`, `lightDir`, `lightIntensity`, `sunColor`, `exposure`, `night`, `wetness`,
  `preset`, `moonPhase`) and the extra `world.roads` fields.

Not applied:
- `?pitch=` to let the camera look up: `CityCamera.minPitch` stays 0.08 for gameplay; critics can use a probe script
  or a module-declared preset. Cheap to add later if a critic needs it routinely.
- `server.hmr = false` for `?headless=1`: the screenshot tool's re-check above solves the same problem without
  changing dev-server behaviour for humans.
- `world.terrain.writeHeights` / `flattenStrip`: this is a **terrain-module** API, not core. Terrain should expose it
  (documented as a request in ARCHITECTURE §3 note); roads may keep writing `heights` + a zero-strength `modify()`
  until then, since that contract now holds by documentation.

## Integrator decision (local wave 2, preserving restored terrain)

Added `roads.rebuild({preserveTerrain:true})`. The visual rebuild skips cut/fill and retains that mode across subsequent rebuild calls until a real road mutation or non-restoration terrain edit. A restoration event resamples the road geometry while preserving the restored heightfield. This supports exact tools undo despite props requesting another road rebuild. Normal road construction keeps its existing cut/fill behavior.

## Integrator resolution — preserve network identity on load, 2026-09-06
`Network.restore` validates and preserves serialized node/edge IDs, design heights and next-ID state, then emits one change event. Version-2 road saves request terrain-preserving rebuild; legacy data can still sample ground. This prevents vehicle routes and references from pointing at renumbered edges after loading. `shots/integration/w2_roundtrip_after.json` and its probe verify all network and related entity IDs match and terrain is byte-exact after load.

## Integrator: authoritative pavement height for overlays (2026-09-06)

Added `ctx.modules.roads.surfaceHeightAt(x,z) -> number|null`. It returns the highest generated asphalt, kerb or sidewalk triangle at XZ (including bridge pavement), excluding terrain, barriers, piers and paint decals. The query reflects the last road rebuild; it returns null off pavement or for invalid coordinates. A 32 m spatial index is rebuilt with geometry and cleared on disposal. Surface heights interpolate the same Float32 vertex positions that Three renders, with concrete pavement vertices explicitly tagged during emission rather than guessed from colour.

The tools ghost can sit 0.15 m above `max(terrain.getHeight(x,z), surfaceHeightAt(x,z) ?? -Infinity)`. A strict 0.10–0.20 m lift above the *bare heightfield* is incompatible with existing road cut/fill: the pavement at (73,10) is 0.408883 m above terrain. Keep both measurements explicit in the tools report; do not claim the original bare-terrain bound passes on that road.

Validation: `shots/integration/w2_pavement_probe.mjs/json` compares 176 pavement samples to an independent downward Three raycast, maximum difference 5.84e-13 m, zero missing hits or console errors. A preserving rebuild keeps the sample identical; off-network and invalid queries return null. No road rendering geometry or materials changed.


## Integrator decision (wave 2 final, 2026-09-06)

Retained the validated terrain.setHeights API, exact network ID/profile restoration, preserveTerrain semantics and authoritative surfaceHeightAt query. Existing straight-edge tools splits remain the workaround. Deferred a new graded node/profile authoring API and exact curved-edge split: these require a roads-owned design change and a dedicated geometry/traffic regression, not a minimal integration patch. surfaceHeightAt returns the highest paved surface and must not be substituted for lane height on overlapping bridges. Documented residual laneCenter/profile vs pavement mismatch without adjusting traffic to a different deck.


## Integrator decision (wave 2b final, 2026-09-08)

Retained authoritative placement/frontage and exact road/terrain restoration. Deferred curved-edge splits, graded profile authoring and lane-specific surface reconciliation to roads. Highest paved surface must not be substituted for the intended deck on overlapping bridges. Service entrance validation consumes the current published road API.

## Integrator decision (wave 3 final, 2026-09-08)

Retained actual authoritative graph/lane/profile APIs and existing identity-preserving restore. Deferred graded-node/design-height authoring and curved split to roads-owned geometry/traffic regressions. Transit uses public lanes and explicitly marked interior junction connectors; highest-surface rays do not identify stacked lanes. Bridge and slope quality failures remain. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.

## Integrator decision — R9s2 transaction restore (2026-09-10)

Added `roads.restoreTransaction(data) -> bool` for exact Tools history restoration of graph IDs, allocator and saved design profiles. Restoration rebuilds with terrain preservation and propagates rebuild failure. `roads:rebuilt` marks the derived profile/length completion boundary. Normal road construction and non-restoration terrain sculpting retain cut/fill and design resampling. Straight split transactions pass exact two-seed undo/redo; curved-edge splitting remains unsupported and road demolition has not yet migrated to this transaction path.
## R9u verified candidate — synchronous demolition rebuild

The public `rebuild(options)` API returns the owner completion boolean. Transactional terrain replay propagates a secondary rebuild refusal, and exact demolition restore uses `restoreTransaction()` so graph IDs, allocator cursor and design profiles remain authoritative.
