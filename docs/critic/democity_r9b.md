# Democity R9b — independent transition/cap diagnostic audit

**ACCEPT the qualified diagnosis only. No product change. Democity remains6.0/10 FAIL; the8.5 whole-game gate is not met.**

The revised builder report is supported as a finite-execution and bounded numerical-guard observation. It does not complete visual verification of moving LOD transitions, prove exact endpoint convergence, or establish an ordinary-view capacity ceiling. None of the supplied evidence requires reverting R9a, extending its range, increasing CAP1 or raising the score.

## Source and probe scope

Independent hashing of current `src/modules/props/chunks.js` gives `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`, matching the recorded start/end hashes and accepted R9a source. The routed source adds only `globalThis.__R9B_FIELD = this` at the unique constructor marker. The exactly reconstructed raw hooked source hashes to `e1dbf6df27da86d813cf8a8608fee177408d6e7baab30ec7a4fed2609c81d6ce`; this is my reconstruction, not a saved served-response hash. Vite-transformed imports are preserved. The hook exposes private renderer state for diagnosis; it does not change selection logic. The script changes camera/debug state on its disposable page, resets forced LOD at the end and closes the browser. It does not write product source.

The retained build log records a successful163-module Vite build in285ms. I inspected the log rather than rerunning the build. Current STATUS/HANDOFF retains6.0 and the R9b verification requirement; their completion state was not edited by this audit.

## Static and moving arithmetic

All eleven static rows have finite counters, topDown0, queue0 and LOD0=0. The complete saved table independently reproduces:

| Orbit distance m | LOD1 | Impostor | Direct demand | Outer transition copies | Considered source |
|---:|---:|---:|---:|---:|---:|
| 155 | 204 | 2127 | 204 | 36 | 2295 |
| 175 | 185 | 2255 | 185 | 41 | 2399 |
| 185 | 192 | 2322 | 192 | 42 | 2472 |
| 193 | 175 | 2325 | 175 | 28 | 2472 |
| 199 | 175 | 2331 | 175 | 34 | 2472 |
| 205 | 171 | 2346 | 171 | 45 | 2472 |
| 211 | 164 | 2359 | 164 | 51 | 2472 |
| 217 | 163 | 2423 | 163 | 51 | 2535 |
| 225 | 154 | 2429 | 154 | 48 | 2535 |
| 235 | 134 | 2464 | 134 | 34 | 2564 |
| 255 | 114 | 2477 | 114 | 27 | 2564 |

For every static row, LOD1 equals recorded direct demand and the histogram total equals consideredSource+transitionSource. These identities support complementary fade-copy accounting. They are not unique visible-tree counts. The actual source uses a32m bucket mean and chunk y in `sd`; camera orbit distance193,199,205,211 or217 is not that bucket distance. No individual tree/bucket is tracked across its complete193–217m fade interval.

Moving evidence contains168 unique, contiguous rendered frame indices, distance155.00672707033937→255m, zero reversals, no non-finite values and no negative counters. Queue is nonzero in75 samples, maximum44, final0. LOD histogram begins0/204/2127 and ends0/117/2475. Its last change is frame149 at orbit distance251.661331290379m; it stays unchanged through frame168/255m. The independently forced static255m state is0/114/2477. Therefore queue drainage is **not exact endpoint-state convergence**.

The source rebuilds at most ten chunks per ordinary update and resets counters when movement exceeds6m or pitch differs by more than0.02. Existing meshes remain while later chunks are pending. Partial moving histograms are not whole-frame populations. The retained last histogram after251.66m is consistent with the movement threshold, but raw evidence lacks `_lastCam` and per-bucket snapshots to prove the complete cause. A forced debug refresh processes the full queue, so it also does not validate ordinary amortized cost. No2ms timing bound is established.

## Ordinary search and forced guard

The search is exactly **3 targets ×4 pitches ×5 distances =60 configurations**: park, downtown and suburb; no riverfront. All saved queues and topDown flags are0. The maximum direct demand is261 at downtown,pitch0.55,distance80. The maximum submitted LOD1 histogram is separately266 at downtown,pitch0.25,distance80. Near-LOD blend copies explain why these measures need not coincide: in all60 records the residual `sum(lod)−consideredSource−outerTransition` equals `lod1−directDemand`. The saved maximum record matches an independent maximum search.

No ordinary sample approaches520. This does not exhaust all normal cameras or prove a global population bound. `CAP1=520` gates normal tier1 selection; top-down bypasses it, and LOD0 blend copies are not intercepted by that check.

Forced `setLod(1)` is correctly marked `ordinaryView:false`, with topDown0, queue0, LOD1=520 and impostor=1775. Its histogram sums to2295, **244 more than the copied pre-force consideredSource2051**. There is no valid2051→520+1775 partition. The result supports observing the existing numerical guard at520, but exact source demotion needs a force-specific census. The forced histogram total happens to equal the initial static155m consideredSource2295; that is not a substitute for recording the actual forced inputs.

A source-based synchronization risk remains in `applyAndRead`: `setCamera` is immediately followed by forced Props update. `camera.apply/updateCamera` changes position/lookAt rotation; Three's `lookAt` updates world matrices before setting the new quaternion, without another final world-matrix update there. Props immediately reads `matrixWorldInverse` for its frustum. Waiting three frames after that forced update does not necessarily force a new Props evaluation when the camera stops moving. This can leave the evaluation associated with a prior orientation. It is a concrete harness ordering risk, **not a reproduced explanation** of the2051/2295 discrepancy or proof of a product rendering defect. A future exact census should settle the camera, refresh matrices, force selection, then capture evaluated camera/frustum and source/output membership together.

## Images and error evidence

All six original PNGs were inspected individually at original1920×1080 resolution:

- `shots/democity/r9b-lod1-transition/static_175.png`
- `shots/democity/r9b-lod1-transition/static_193.png`
- `shots/democity/r9b-lod1-transition/static_205.png`
- `shots/democity/r9b-lod1-transition/static_217.png`
- `shots/democity/r9b-lod1-transition/static_235.png`
- `shots/democity/r9b-lod1-transition/cap_stress.png`
The five static views preserve the scene while changing distance-dependent crown representations. No definite black object, material failure, new opacity wall or missing major scene content is visible in these samples. Known coarse isolated leaf clumps, flat conifer silhouettes and sparse park fabric remain. The forced stress image shows more multi-card crowns and is a diagnostic view, not a proposed art improvement. Stills cannot establish the absence of brief temporal popping during the recorded flight.

This round has no separate PNG sidecars; corresponding staticPath/capSelected measurements live in `probe.json` and precede screenshot freezing. All72 recorded full module-stat snapshots (11static+60search+1forced) contain all16 ready modules with zero module errors; their simErrors and the aggregate browser/engine errors are empty. Moving rows contain counters, not individual module/error snapshots. The two warnings are deferred road furniture and **no valid reserved university site**; they are not both road warnings.

The probe's `pass` checks counts, unchanged source, some cap bounds and aggregate errors. It does not itself assert exact endpoint convergence, source partition consistency, monotonicity, every queue value or visual smoothness; those must not be inferred from the boolean. My independent arithmetic checks establish the finite/monotonic/queue observations above.

Static endpoint FPS ranges23.3–43.6 and raw heap488.6–514.3MB; search endpoints45.9–56.1FPS and488.5–520.2MB; forced endpoint51.4FPS/501.1MB. These volatile shared-page endpoints are not sustained performance, causal comparison or forced-GC retained memory. They do not clear the50FPS/512MB gates and do not prove a new candidate-caused regression. There is no new candidate.

## Next evidence-based priority

**Verification tools / Props:** correct capture synchronization and retain a same-update source/tier/fade ledger, including the evaluated camera state. Record continuous ordinary traversal and compare its endpoint against an explicitly synchronized forced refresh. Only a reproduced visible discontinuity should trigger an owner code fix. The present evidence supports no further range or CAP1 increase.

Multi-seed/species, weather/night, top-down boundary and naturally saturated ordinary-view behavior remain untested. No new save/restore/state digest, forced-GC memory, long-duration gameplay, reference calibration or blind comparison was run. The established higher-ranked city fabric, crown/impostor coherence, night quality and performance issues remain open. This qualified diagnostic acceptance leaves6.0FAIL unchanged.
