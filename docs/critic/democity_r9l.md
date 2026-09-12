# Democity R9l — independent Props attribution audit

**ACCEPT the qualified diagnosis and verifier fail-exit repair. No product candidate is accepted. Democity and whole-game remain 6.0/10, FAIL against 8.5.** All three aggregate measurement records remain failed; acceptance here concerns the bounded conclusion, not a performance gate.

## Verified result

I read the complete three JSON series, the current profiler and revised builder report, relevant Props geometry/material/chunk contracts, and prior R9k/R8h/R8z/R8s evidence. I independently recomputed all **40 A/B pairs, 92 blocks and 14,040 sampled frames**. Adjacent-control means, percentage responses, control drift, draw/triangle differences, full-series medians and stable counts agree with the records. All retained engine/browser error lists are empty. Each sampled block has the requested number of frames and samples. No screenshots were requested or inspected in this diagnosis.

| Series / component | Reflection | Stable cycles | Conventional median of stable FPS responses | Interpretation |
|---|---|---:|---:|---|
| Initial / LOD1 | off | 2/3 | +6.494949% | Earlier local attribution, not a matched estimate of final magnitude |
| Final-v2 / LOD1 | off | 3/3 | **+12.925882%** | Accepted bounded local cost attribution |
| Final-v2 / lamp pools | off | 2/3 | +0.220051% | Opposing responses, no useful positive timing result |
| Final-v2 / lenses | off | 0/3 | unavailable | Failed timing row |
| Final-v2 / halos | off | 2/3 | −4.613091% | Opposing responses, no optimization conclusion |
| Final-v3 / LOD1 | on | 1/5 | +12.180289% | Failed row; no accepted replication |
| Final-v3 / lamp pools | on | 4/5 | −0.262846% | Near-zero response under a separate policy |

Final-v2 LOD1 responses are +12.190711%, +12.925882%, +13.025200%, with control drifts 4.437447%, 4.516309%, 3.993104%. The median submitted change is −28 draws and −405,048 triangles. The fixed selected inventory is 37 meshes / 2,630 instances / 441,840 source triangles (168 each). This supports investigating LOD1 render cost at this particular view; it does not identify main-pass shading as the cause or predict a 12.93% shipping improvement.

The pools are **lamp ground-light decals**, not foliage pools. Their inventory is one mesh / 1,325 instances / 381,600 source triangles, with 288 triangles each. Final-v2 median submission changes are −1 draw / −381,600 triangles; final-v3 changes are approximately −0.244444 draws / −379,101.916667 triangles. With reflection enabled, whole-frame pass cadence affects averaged submission deltas. The reflection-on series is not a longer matched replication of the reflection-off series. The revised builder correctly preserves this distinction. Neither policy gives evidence to prioritize pool geometry from triangle count alone.

Lenses contain 3,858 instances / 46,296 source triangles (12 each); all three final-v2 control pairs fail the drift screen. Halos contain 1,325 point vertices. The profiler's `441.666... sourceTriangles` is vertex-count/3 bookkeeping, not actual triangle geometry. Its two stable final-v2 responses (+0.966992%, −10.193173%) oppose each other.

The initial six-class aggregate fails because impostors and furniture match zero objects. Final-v2 fails because lenses have zero stable cycles. Final-v3 fails because LOD1 has only one stable cycle. Zero-object masks are also useful noise controls: initial apparent responses reach −6.689257% to +3.804411% for impostors and −9.592367% to +2.875945% for furniture despite stable adjacent controls. Stability of endpoints alone does not eliminate intra-block noise.

## Source, restoration and ownership

The tool uses fresh disposable pages, locks selected objects' `visible` getters false for B, restores their saved descriptors for A/finally, and leaves owner updates running. Reflection-off pages are returned to reflection-on before disposal. Selection uses runtime mesh/material types and base triangle counts and is fixed before warmup. It does not mutate product files, world records, RNG or saves. It does temporarily change rendering in the disposable runtime, which must not be described as an unchanged rendered scene.

Current source contains `if(!result.pass)process.exitCode=1` after persisting results. This verifies the repaired failure path by inspection. The JSON alone does not retain the shell exit code, so the reported historical exit-1 run is builder provenance rather than a separately reproduced critic process test. No unnecessary browser rerun was performed. All existing JSON `pass` values independently recompute false.

Current geometry remains R8h's 72 two-triangle cards plus a 24-triangle stem. Normal LOD1 range is 205 m with ±12 m transition (24 m total), and CAP1=520 is a normal-selection guard. Top-down explicitly selects LOD1 and bypasses that cap. The recorded 2,630 selected instances therefore do not establish cap failure or that all trees lie inside the normal range. This profiler records neither the top-down flag nor a selector-distance census. LOD1 shadow casting uses the separate 120 m chunk-distance condition; color and shadow cost cannot be inferred from visibility masking alone.

Verified unchanged accepted product hashes:

- `src/modules/props/trees.js`: `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17`
- `src/modules/props/chunks.js`: `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`
- `src/modules/props/textures.js`: `6090fe11d3104bcda0d9729f250e856153ebad69c1c55f083e122ed89dedf039`
- Verifier: `5ec28987a6d4f93e77eaf029911583cb9ebd733a881c9f119ec897dffcabf16d`

## Limitations and next priority

The inventory means matched objects whose own visibility property is true at a prewarm snapshot. It is not a per-frame, ancestor-visible or frustum-tested census. A fixed predicate can miss later-visible objects. The furniture predicate is broad enough to match noninstanced Standard-material glass/alpha foliage too; this scene's zero count does not prove no furniture exists. The component list also omits LOD0 and does not exhaust Props.

One seed, camera, night time, host and fixed component order are covered. Controls are correlated and shared between neighboring pairs. Block FPS is retained, but raw timing denominators/per-frame timestamps are absent, so I recomputed derived arithmetic rather than reconstructing original FPS. Headless-on changes the full capture policy; uncapped behavior is diagnostic. Visibility masks affect color, depth, shadows and dependent effects; they do not isolate CPU versus GPU or a single pass. There is no general FPS, memory, allocation, visual quality, API/save, restage or full-matrix gate claim. No new product source warrants such a gate rerun here.

**Next bounded priority: Props LOD1 contribution diagnosis.** Record actual bucket distance, species, top-down selection and `castShadow` state in the measured scene, then separate color and shadow/depth contributions under the same reflection-off policy with stable paired controls and an ordinary-view check. Keep current 168-triangle crowns, range, transitions, atlas and state intact until a specific quality-preserving candidate is supported. R8z's rejected branch addition and R8s's rejected Lambert experiment do not justify an immediate alternative simplification.

The whole-game visual ranking remains open, including city fabric/density and foliage quality. This round narrows a performance investigation; it closes none of those visual issues and raises no score.

## Evidence register

- `docs/builds/democity_r9l_props_component_attribution.md` — latest revised reflection-policy interpretation reviewed.
- `tools/r9l-props-component-profile.mjs` — complete source inspected.
- `shots/democity/r9l-props-components/sync-on-uncapped.json` — all six rows; SHA-256 `417be46110db12c6cc95dee7010e1ac2f25ccb27a9623e16d3144467febe1cef`.
- `shots/democity/r9l-props-components/final-v2.json` — all four rows; SHA-256 `7f0ad97c8b2e336c1fece36c9479fdc0f8415f9fe1cc01f48fbc90019f9081ef`.
- `shots/democity/r9l-props-components/final-v3.json` — both rows; SHA-256 `21f2dad201145d253680ca81777be3914593345c0c159de25781a4953e98f7ff`.
- Relevant `src/modules/props/{index,chunks,trees,textures}.js` and prior R9k/R8h/R8z/R8s reports; detailed recomputed rows are retained in the companion critic JSON.
