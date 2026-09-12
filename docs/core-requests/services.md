# Core requests — services

Prepared 2026-09-06 before the wave 2b builder request. This records owner handoffs and implementation assumptions; services production code remains the stub. The integrator already owns the adapters below. No neighboring source was changed.

## 1. Props forest exclusion (binding services acceptance item 22)

Please update `src/modules/props/place.js` beside the existing `inLot` guard used by `forestInLot` so automatically scattered forest candidates skip cells covered by any live `world.services.items` oriented footprint. Resolve dimensions from the item footprint or the ready services `footprint(kind)` / `catalog()[kind].footprint` contract; use item x/z and heading, with entrance local −Z. Do not assume that service pads are zoned lots or use only the center point.

Include `world.services.version` in relevant placement caches and invalidate on `services:changed`, including removal and deserialization. Preserve manually placed props and stable surviving IDs. Services owns its park trees, hedges, benches, bins, lamps, parked vehicles and markings; automatic props must not duplicate that kit.

The integrator also plans equivalent service-footprint exclusion for terrain ground clutter. Verification should include clinic and park placement/removal with current caches, plus the integrated aerial. The services build report will count trees inside service footprints from the fresh integrated scene and disclose any overlaps under `remainingWeaknesses`; this request is not evidence that the overlap is fixed.

## 2. Placement, finance, inspector and simulation adapters

The current services spec requires `catalog()` keyed by the 17 fixed kinds, `footprint(kind)`, strict owner `validate(kind,x,z,heading)`, and service-owned `simulation.spend(cost)` exactly once per successful placement. Utilities have literal `radius:null`. Please adapt tools away from stale `footprintOf`, `coverageOf`, `costOf` and center-distance frontage assumptions; use the owner's entrance-side 40 m frontage result and physical failure reasons.

Placement undo/redo and demolition undo/redo must use inverse `earn`/`spend` operations without a second placement debit or whole-economy rollback. Preserve history when a redo fails funds or validation. If placement grades terrain, record pre/post terrain through existing public owner APIs and restore it exactly. Services will grade only during a guarded placement/setup operation if required, never from update or a terrain event; terrain events re-seat geometry without recursively grading.

Inspector capacity is an object, not a number. Incinerator primary load is garbage; civic load is covered population. Use catalog upkeep and meaningful category labels. The simulation integrator should preserve bootstrap before the first managed service, then serialize a managed-services latch so deleting the last facility cannot silently restore bootstrap utility supply. Probe failed placement, unaffordable redo, all undo directions, last-producer deletion plus 110 ticks, and save/load with zero facilities.

## 3. Plume depth fade needs an owner contract

The engine/effects public APIs expose no usable opaque-scene depth texture to a services material. Effects is not a services dependency. Its internal composer depth attachment cannot safely be read while that same target is being rendered; exposing the private attachment alone does not establish a valid soft-particle pass.

Please consider a bounded public contract only if the owner can supply current-camera opaque depth before transparent service plumes, with viewport/depth parameters and a defined unavailable state, without recursive scene rendering or changing services dependencies implicitly. Until such a contract is available and measured, services will implement wind-driven, soft-alpha plume geometry and disclose the missing depth-intersection fade. Soft sprite edges are not a pass for the depth-fade requirement.

## 4. Integration and grading decisions to preserve

Utility coverage must remain the actual per-connected-component supply/demand ratio. It can be flat on a connected served network; the requested source-to-edge gradient must not be manufactured with a false radius. Isolated-producer removal tests must isolate all other producers rather than deleting only coal from the all-kinds stage.

The residual review records that civic/park covered-population load can exceed nominal people capacity (parks have an empty capacity object), while the normative formula requires reporting that population. Services will preserve the formula and report that literal acceptance tension. Keep the update work slice below the stricter 2 ms target where feasible rather than treating the permitted 4 ms rebuild slice as an automatic budget waiver.

Infoview active/data publication and world-only desaturation are owned by the integrator/infoviews/effects. Services will react to the published active field and change only its own materials. It will not add a global veil, fake coverage gradients, or call obsolete `setActive` aliases.

## Preparation design (not implemented)

Use separate catalog, placement, coverage, geometry/material and showcase code within `src/modules/services` only. Mutate the existing world services object in place; preserve monotonic IDs across rebuilds. Cache road topology, nearest segment projections and connected components; derive civic distances over the road graph. Maintain the prescribed fourteen 128×128 Float32 coverage grids and component map, with allocation-free query reads, dirty jobs separated from topology work, and a synchronous `flush()` for deterministic probes. Refresh live demand, wind/solar supply and loads without rebuilding static geometry each tick.

Stage all 17 kinds plus the required extra turbines/parks and residential demand inside the prescribed district; retain the clinic/civic avenue landmarks and all four core camera presets. Use graded pads with sampled skirts/retaining details, actual recessed civic facades, and distinct industrial geometry. Keep park kit services-owned using the current props oak/spruce/birch silhouettes and tint palette as visual references. Batch static opaque geometry with a shared atlas; budget foliage, rotors, plume instances, contact/light pools and overlay explicitly within 60 draws.

Readiness: full BUILDER/services spec, current dependency APIs, all eight CS2 reference images, CS2LOOK, services residual entries and integrator seam notes reviewed. No services captures or production edits started. Await the generated wave 2b builder request before implementation and fresh evidence.


## Integrator decision (wave 2 final, 2026-09-06)

Accepted the concrete owner handoffs for wave2b integration, deferred until the real services implementation exists: forest/ground-clutter oriented footprint exclusion with version/event invalidation, catalog/footprint/validate tools adapters, one placement debit and exact finance/terrain/history inverses, capacity-object inspector and persistent simulation-managed-services latch. Do not interpret this preparation as implemented. Deferred opaque-scene depth publication: exposing the active composer depth attachment would create an invalid read/write feedback loop; services should use soft alpha plumes and disclose the missing depth-intersection fade. Preserve real component utility ratios and the specified civic covered-population load even where numeric acceptance bands conflict; do not manufacture radial gradients or fake capacity.


## Round1 implementation and measured handoff (2026-09-06)

Services production implementation now exists and is frozen for independent criticism; earlier preparation/stub statements above are historical. Exact19-function API and keyed17-kind catalog are live. Ordinary place validates and spends once, samples/reseats its pad without modifying terrain; only showcase setup grades terrain through the public terrain API. Fresh populated all-module services evidence has22 facilities,126 buildings,2,981 props trees and **103 tree centers inside oriented service footprints**. The exact all showcase currently stages0 services via stub democity, so its0 overlap count is not a populated pass. See `shots/services/r1/final-probe/seams.json`, `integrated_services_12.png`, and `docs/builds/services_r1.json`. Please execute the accepted masks/consumer adapters after critique freeze. Soft-depth fade remains deferred and unclaimed. Ordinary-UI new-city playability remains the integrator gate.

## Round 2 handoff (2026-09-06)

The live civic load defect is fixed. Each facility caches its own road-reachable building references when the network changes, then reads current occupants on the simulation tick. An independent public-road all-pairs oracle agrees with all 12 civic facilities; duplicate small parks report distinct loads. Utility loads still use their primary category; civic loads remain covered population and may exceed nominal capacity. The actual 110 tick regression reaches zero civic load when actual occupants reach zero.

Services version now advances for changed facility loads and live supply/demand as well as placement, removal and changed terrain seating. Events remain coalesced per frame. Consumers doing expensive footprint work should compare oriented footprint geometry before rebuilding forests or clutter; a version change alone no longer implies moved geometry. The existing accepted root adapters and external economy, upkeep, save management and input candidates remain unapplied by this builder.

Fresh populated all-module diagnostics contain 22 facilities, 160 buildings, 168 lots and 2,981 props trees, with 101 tree centers inside oriented facility footprints. The exact all showcase still contains no facilities. Apply the accepted owner masks after critic freeze; this round does not claim that integration seam fixed.

Plume render order now preserves attachment across the transparent water pass while depth testing stays enabled. Particle age fades and wind displacement are retained. Safe opaque-depth intersection fading is still deferred. The utilities camera points downward and contains no actual sky, so cropRects now omits sky_ref there instead of labeling terrain or water as sky. The transformed emitter plume pin is supplied. The new park grass reference is in frame but vegetation and shadow contamination still limits its color measurement.

Known round 2 staging limits: the continuous grade removes interior road cliffs but the water intake cut remains abrupt. The pump currently detects no nearby water and honestly produces groundwater capacity 140 against district demand 256; the sewage facility remains within 28 m of water. Three pads, rather than the requested four, retain a sampled range above 1.5 m. These are explicit owner follow-up items, not core requests or hidden changes to the capacity rule. Synchronous geometry rebuilding and initial coverage work also remain above their strict CPU budgets. See docs/builds/services_r2.json and shots/services/r2/probe.


## Round 3 handoff (2026-09-06)

Owned services source is frozen for independent criticism. Public API remains the same nineteen functions and current save schema is unchanged. This round changes render.js, showcase.js and the roads changed listener in index.js; root consumer candidates remain external. Rebase against the source hashes in shots/services/r3/probe/source-hashes.json.

Static geometry now caches 128 m spatial chunks. Cache signatures include facility pose and the actual frontage road and sampled access-strip terrain, so unrelated version updates do not invalidate geometry. Road changes mark geometry dirty to update real access strips. Actual browser checks confirm that removing the clinic rebuilds only one chunk, live supply changes replace no static mesh, and loading identical facilities rebuilds no chunks. Initial geometry remains synchronous. Two removals now cost 51.1 ms instead of the previous critic 113.4 ms; a changed clinic pad costs 42.3 ms in one chunk. These improvements do not satisfy the strict CPU budget.

All twenty-two facilities are staged again, and four retain more than 1.5 m sampled terrain range. A shallow intake bank gives the pump actual nearby water and capacity 400 against demand 256. Adjacent bank roads still have steep transitions, so this is not a claim that the district grading is finished. Each pad now has a perimeter band and an entrance access strip; owned yard pools are centered beneath real mast geometry.

The independent public-road Floyd-Warshall load oracle still agrees with all twelve civic instances, including small park loads 30, 58 and 102. Current save restoration preserves all items and coverage. Existing accepted root consumer and exclusion adapters still need integration after criticism. The populated all-module diagnostic counts 22 services, 160 buildings, 168 lots and 2,981 props trees, with 97 tree centers inside oriented service footprints. Exact all-showcase still stages no facilities and is only a zero-error compatibility check.

Safe plume depth fading remains deferred by the prior owner decision. The plume is still too smooth and its noon pin is about 170/255. The civic night pin remains above the horizontal speckle limit and the night service-only toggle changes only 1.657/255 across the full frame. Noon emission toggle, infoview reset and field/API parity are pixel-exact. Missing plume sky/apex, clean lawn and paired contact measurements are disclosed as unmeasured. See docs/builds/services_r3.json for the 6.6 self-score and exact limitations.


## Round 4 frozen owner handoff

Only services/render.js and services/coverage.js changed. The public API, catalog, placement, showcase and index.js remain unchanged, preserving the root candidate guards. Final hashes and complete evidence are in docs/builds/services_r4.json. The last standard gauntlet reports 213 total scene draws, 1748656 triangles, 54.4 minimum FPS on Apple M4 Metal and zero errors. Owned service geometry is 22 draws and 180820 triangles. All 59 generated images and eight references were individually viewed.

Material-specific relief, roughness and seeded glazing, rooftop/process equipment, entrance planters, leaf cards and fountain water detail are implemented. Plume noon luminance is 192.409/255, now within range; night/noon ratio is 0.304. Night facade speckle is 0.281690% and the emissive full-frame difference is 1.440/255, both still outside the required limits. No camera pin or global light was changed to improve these metrics. The safe opaque-depth dependency remains deferred and no feedback render was introduced.

Primitive reuse and direct indexed transforms reduce geometry allocation. Coverage skips cells outside reachable road bounds and yields every 256 active cells. Four exact full-grid oracle comparisons pass, as do the independent civic-load oracle and actual chunk UUID tests. Nevertheless, initial geometry costs 108 ms, two dirty chunks 22.5 ms and one terrain reseat chunk 20.9 ms. Initial coverage costs 15.9 ms. These do not meet the CPU budgets.

Actual utility removal, brownout, per-facility population loads, save round trips and terrain events remain correct. Root adapters are still unapplied. The populated diagnostic still reports 97 props tree centers overlapping service footprints; exact all showcase remains an empty democity staging path. Neither is represented as a populated gameplay pass. Photographic art, night alias filtering and asynchronous chunk work remain follow-up needs. Self score is 6.9, below the required 8.5.


## Integrator decision (wave 2b final, 2026-09-08)

Applied authoritative catalog/footprint/validate adapters, entrance-facing placement, exact single debit and stable service IDs across undo/redo. Oriented footprints now exclude automatic props and terrain clutter while preserving manual props and avoiding live-load vegetation regeneration. Simulation retains a saved servicesManaged latch after final removal; catalog daily upkeep is charged once. Deferred opaque-scene depth publication: the active composer attachment is unsafe to sample while writing; keep soft-alpha plumes and disclose missing depth-intersection fade. Real component ratios and covered-population loads remain unchanged. Independent round-4 failures are retained, without an integration rescore.

## Integrator decision (wave 3 final, 2026-09-08)

Retained authoritative paid catalog placement, masks, upkeep and validated footprint/ID contracts from wave2b. Independent democity civic coverage59.10% still fails60%; placement/layout belongs to democity and may not be hidden by fake coverage or cheaper facilities. Deferred optional depth-fade contract and lighting polish. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.
