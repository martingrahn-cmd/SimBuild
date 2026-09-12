# Democity r8k — independent silo review

**ACCEPT the bounded visual change. Democity and whole-game remain 6.0/10 — FAIL against 8.5. Whole-game rank 5 remains OPEN.**

The three Northbank silos now have readable vertical seams/access fittings, a small landing and roof vent. The directed close and wide day/night pairs show a modest net improvement over the blank banded cylinders. Their basic volume, pale material, four circumferential bands and placement are preserved. These are static details on existing saved landmarks; this review rejects any claim of actual silo storage, production, cargo handling or port operation.

## Visual judgment

All **24 original PNGs were inspected individually**, including all eight day controls in the final matrix, followed by the derived contact sheet. The ladders provide a useful dark vertical accent in the directed views and remain legible at the wider directed distance. Night detailing does not introduce new emission or broad light pools. No material new silhouette, scene-occlusion or day/night regression is visible in this bounded set. Standard bridge views benefit slightly; most other final views receive little or no visible change.

Construction detail remains schematic. The source places rungs **1.45 m apart**, so the tall fittings read as coarse ribs rather than a credible human maintenance ladder. The repeated vessels still stand on isolated pads/lawns without a connected handling yard or transport infrastructure. The r8j hardstand repair is retained and acknowledged, but neither change closes rank 5. Broad lawn around the arena, simplified landmark materials, sparse city blocks, planar foliage and shallow night composition still dominate full frames. This small improvement does not meet a higher scoring anchor.

## Ownership and exact attribution

Read current STATUS/HANDOFF, the independent whole-game r2 ranking, r8j review and democity ownership/industrial-port clauses. The spec explicitly permits democity-owned landmark meshes and requires saved-plan rebuilding on deserialize. The existing index deserialize path clones the plan and rebuilds its meshes; r8k does not alter that path.

The r8j candidate landmark profile and r8k candidate profile contain **exactly the same 13 plan records**, including IDs, positions, dimensions and headings. The three silo records remain 14 × 18 m. Only the silo rendering branch adds fixed boxes/cylinder detail inside those horizontal footprints. There are no new RNG calls, world records, public API changes, materials, camera/showcase conditions or fleets. The existing renderer still samples terrain to update landmark base height; that pre-existing behavior is not a new r8k state mutation.

I executed the actual renderer read-only in Node, first with the supplied preceding silo branch reconstructed by removing the fixed-detail block, then with current source. Full owner geometry is **6,760 → 7,912 triangles (+1,152), 8 → 8 draws**. Each silo including its unchanged pad is **408 → 792 triangles (+384)**. Three times 384 exactly explains the owner delta. Unchanged cylinders/bands are included in the baseline. The renderer is historically untracked, so an empty git diff alone is not proof of scope. Reviewed SHA-256: `6cfda177bc2b0b03f5da51316196499a1660ea7b5a8b22c880b17ab2d7cb45d7`.

## Supplied contracts independently checked

All expected API entries are functions; both deserialize calls return true and the census is identical afterward: 468 road nodes, 604 edges, 9,964 zone cells, 612 lots/buildings, 31 services and one line/eight stops. Eight tour stops succeed; invalid tour selection is rejected. The 32 mixed-use entries preserve linked building IDs and retail flags, with complete recorded before/after objects exactly equal after both restores. Restage JSON verifies the selected buildings/services/transit digest for 1337 → 7 → 1337 → 7. Both error arrays are empty in each contract. These are independently verified **supplied probe results**, not new browser runs or whole-world bitwise proofs.

## Sidecars and performance

All 24 sidecars report ready modules and zero recorded errors. Both directed summaries exactly match their four sidecars. The directed camera poses match between baseline and candidate; the close position contains only a ~1.4e−14 floating-point representation difference from its requested x coordinate. The custom capture uses Metal/system Chrome, a 1920 × 1080 viewport, seed 1337, paused democity, an applied public camera and 60 settled engine frames. Its stats endpoint precedes freeze/screenshot and is not a controlled repeated performance benchmark.

Every final summary row was checked against its sidecar and the aggregate values recomputed:

| Final 16-frame metric | Verified result |
| --- | --- |
| Ready / recorded errors | 16/16 / 0 |
| Maximum draw calls | 469 — park_12 |
| Maximum triangles | 2,814,092 — night_downtown_22 |
| Minimum FPS | 46.5 — interchange_22 |
| Below 50 FPS | 2/16 — interchange_12 and interchange_22 |
| Maximum raw endpoint heap | 732.4 MB — park_12 |
| Raw heap above 512 MB | 10/16 |
| Sampled measurement frames | 70–91 per final sidecar |
| Maximum observed democity update endpoint | approximately 0.1 ms |

Draw/triangle maxima stay below 1,500/3M, but these snapshots do not establish an overall performance pass. The direct close pair adds 4,608 reported scene triangles, reflecting render passes rather than a fourfold owner asset increase. Timing/heap differences between independently launched pages do not isolate this detail's cost. Raw heap is not forced-GC retained memory or a leak finding. Existing warnings about deferred road furniture and no valid reserved university site are distinct from zero recorded errors.

## Remaining ranking

1. **democity** (support: zoning, buildings, roads, services): Sparse blocks and repeated building forms still dominate; silo detail does not alter frontage or density.

2. **props** (support: terrain, democity): Foliage remains planar with inconsistent crown density across distances despite accepted r8h improvement.

3. **cross-cutting** (support: buildings, props, services, effects, democity): Accepted r8i window depth remains local; repetitive luminous windows and schematic street/service pools persist.

4. **cross-cutting** (support: terrain, roads, democity, buildings, services): Abrupt grades, flat pads and untreated shore/site boundaries remain visible.

5. **cross-cutting** (support: democity, services, buildings, props): R8j hardstand and r8k silo details improve existing landmarks locally; materials, site connections and construction credibility remain schematic. The silo rung spacing is 1.45 m, so the access fittings should not be described as realistic maintenance infrastructure.

6. **cross-cutting** (support: terrain, environment, effects): Water/cloud reflection, night horizon band and mountain material remain graphic; rain/cloud modes not retested in this bounded matrix.

7. **cross-cutting** (support: democity, traffic, transit, simulation, buildings): Limited communicated human/site use. Static silo fittings add no storage, cargo, production, workers, loading or port-operation simulation.

8. **cross-cutting** (support: core, props, traffic, environment, effects, buildings): Current geometry remains within 1500 draws/3M triangles, but two of sixteen final FPS endpoints are below 50 and raw heap is not retained-memory validation.

## Inspection register and limits

- `shots/democity/r8k-silo-diagnosis/baseline/silos-close_12.png`
- `shots/democity/r8k-silo-diagnosis/baseline/silos-close_22.png`
- `shots/democity/r8k-silo-diagnosis/baseline/silos-wide_12.png`
- `shots/democity/r8k-silo-diagnosis/baseline/silos-wide_22.png`
- `shots/democity/r8k-silo-diagnosis/candidate/silos-close_12.png`
- `shots/democity/r8k-silo-diagnosis/candidate/silos-close_22.png`
- `shots/democity/r8k-silo-diagnosis/candidate/silos-wide_12.png`
- `shots/democity/r8k-silo-diagnosis/candidate/silos-wide_22.png`
- `shots/democity/r8k-silo-final/bridge_12.png`
- `shots/democity/r8k-silo-final/bridge_22.png`
- `shots/democity/r8k-silo-final/downtown_12.png`
- `shots/democity/r8k-silo-final/downtown_22.png`
- `shots/democity/r8k-silo-final/industry_12.png`
- `shots/democity/r8k-silo-final/industry_22.png`
- `shots/democity/r8k-silo-final/interchange_12.png`
- `shots/democity/r8k-silo-final/interchange_22.png`
- `shots/democity/r8k-silo-final/night_downtown_12.png`
- `shots/democity/r8k-silo-final/night_downtown_22.png`
- `shots/democity/r8k-silo-final/park_12.png`
- `shots/democity/r8k-silo-final/park_22.png`
- `shots/democity/r8k-silo-final/riverfront_12.png`
- `shots/democity/r8k-silo-final/riverfront_22.png`
- `shots/democity/r8k-silo-final/suburb_12.png`
- `shots/democity/r8k-silo-final/suburb_22.png`

Derived image also viewed: `shots/democity/r8k-silo-final/contact-sheet.png`. It was not used instead of originals. Detailed metric rows and evidence associations are retained in the JSON companion.

- Independent source/evidence review and read-only Node geometry execution; supplied browser captures and contract probes were parsed, not rerun by this critic.
- 24 original stills plus one derived contact sheet; eight final cameras at 12 and 22 only. No new full 32-frame whole-game matrix, weather series, 720p comparison or blind A/B round. Prior reference calibration and whole-game r2 judgment are retained, not freshly rerun.
- Static speed=0 images do not establish temporal flicker, animation, ordinary UI gameplay, traffic flow, silo use or long-term save stability.
- Custom capture waits 60 engine frames after camera application and takes a stats endpoint, then freezes/screenshots. This is not the final screenshot tool sample protocol. Timing differences do not isolate causal r8k performance.
- Final sidecars sample 70–91 frames and report endpoint module timing. Raw heap is not forced-GC retained heap, a leak diagnosis, total process/GPU memory, or a fresh memory-gate pass.
- Exact restage digest covers selected buildings/services/transit fields. It does not prove bitwise identity of the entire world, terrain, economy or all render buffers.
- landmarks.js is historically untracked. Exact preceding silo branch attribution relies on the provided pre-state, reproduced by removing only the new fixed-detail block; actual renderer execution independently confirms the profile delta.
- Geometry verification used the actual renderer with flat terrain for counts. It does not establish real-world ladder safety, terrain foundations or operational connectivity.
