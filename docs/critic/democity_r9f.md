# Democity R9f — independent top-cell containment review

**ACCEPT the corrected final-v2 verification-only closure. Keep the installed R9e product unchanged. Democity and whole-game remain 6.0/10 — FAIL against the 8.5 gate.** The corrected test demonstrates a small rendered effect from the cell7 change, but the originals do not show a seam, missing crown or objectionable silhouette that warrants a production containment change. This closes the bounded follow-up from R9e, not whole-game foliage quality.

## Evidence and corrected method

The decision uses `shots/democity/r9f-top-containment/final-v2/summary.json` and its twelve original screen captures, four differences and live atlas. I inspected every one individually at original resolution, parsed all frame records and recomputed all twelve RGB pair metrics and four 8× difference images. The initial twelve originals and four differences were also inspected, but are superseded evidence. The intermediate source-over run is excluded from the visual decision.

I read current STATUS/HANDOFF, the revised R9f builder report, R9e critic pair, R8y critic, whole-game r2 ranking and relevant Props source. The source and retained atlas hashes match R9e:

| File | SHA-256 |
| --- | --- |
| textures.js | `6090fe11d3104bcda0d9729f250e856153ebad69c1c55f083e122ed89dedf039` |
| chunks.js | `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834` |
| trees.js | `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17` |
| Accepted atlas | `3c2ff34dc47dcacd3ad76ae181d1bd67e53863eac6661f17eb5d50ea4b86ac71` |
| Product/live atlas | `4d846cdaaf8380af089f89b6349f08435a7b8f46397b0639b5710a482326517f` |

The verifier now installs the retained product PNG through the same decode/draw path used for accepted pixels. It clears the destination cell before copying accepted cell7, then reinstalls product for replay. The live product PNG is byte-identical to the retained product. Independently reconstructing the cell patch from the original atlases gives exactly **142 RGBA changes, 135 alpha changes and 63 nominal alpha0.42 crossings**, global bounds **[861,500,917,511]**, local **[93,244,149,255]**. Every recorded contained canvas agrees with these values; product and replay have zero atlas delta. The clear-before-copy source and oracle repair the actual compositing fault. A full patched canvas PNG/hash is not retained, so the live-patch verification is source plus aggregate oracle, not a separately hashed full output image.

Both earlier completed methods are rejected as precise containment proofs. The first swapped the entire atlas, including changed side cells, and did not hash the live pixels it replayed. Its exact600m replay established a swap-associated effect, not unique cell7 attribution. The intermediate method drew accepted cell7 over product with source-over blending and increased common semi-transparent coverage. Its larger changes are a harness defect, not evidence of a game defect. The revised builder report correctly supersedes both. Earlier freeze/post-processing incidents are described by the builder; complete incident logs were not independently reproduced here.

## Independently recomputed final result

MAE is mean absolute RGB-channel difference divided by255 over1920×1080. Strong pixels have maximum channel delta≥8. These are image differences, not quality scores.

| Forced view | Product–contained MAE | Changed / strong pixels | Product–replay MAE | Replay changed / strong |
| --- | ---: | ---: | ---: | ---: |
| Actual distribution150m | 0.000074853874 | 3,565 /1,271 | 0.000051108110 | 1,048 /967 |
| Actual distribution300m | 0.000101786291 | 115,602 /559 | 0.000074404402 | 109,701 /130 |
| Actual distribution600m | 0.000053949306 | 18,704 /1,085 | 0 | 0 /0 |
| All-narrow diagnostic300m | 0.000082765346 | 20,284 /1,375 | 0 | 0 /0 |

Contained–replay MAE/changed/strong are respectively **0.000023745764/2,517/304**, **0.000028231663/7,208/432**, and equal to product–contained for the two exact-replay cases. All reported maxima and four derived differences also match independent pixel arithmetic.

The600m and amplified cases now support a rendered effect of the isolated cell7 patch: the input change is bounded by the atlas oracle and the product replay is exact. This does not establish that every one of142 pixels contributes, identify the sampled mip levels or assign each screen pixel to a narrow tree. Global mip filtering can spread an isolated cell change. It does establish that the change is not entirely inert in these forced views.

No meaningful visual improvement appears when restoring cell7. The enhanced differences reveal small canopy flecks, while original-scale crown shape and overall coverage remain effectively indistinguishable. Near and mid views include replay drift; the near minimap highlight visibly changes, and the mid difference contains widespread low-level scene noise. Their raw counts cannot be assigned exclusively to cell7 or corrected by subtracting scalar MAEs.

## Scope, state and performance

**Every case is a debug-forced top-impostor view.** “Actual” means the retained species distribution, not ordinary automatic LOD selection. At pitch0.86 the existing automatic steep-view path selects LOD1; public debug LOD2 overrides it. The flat radial crowns seen here are an existing forced representation and must not be promoted to normal aerial rendering by this review. The amplified case changes only the disposable class attribute to narrow; original positions, sizes, cap heights and tints remain. It is not a naturally authored all-narrow forest.

The reported class bins sum to3,022 records, including822 narrow. Per-instance source records are not retained, so this independently verifies the sum and census method, not a second full-field enumeration. All triplet cameras match exactly, and histograms are0/0/1,203,0/0/1,932,0/0/2,555 and0/0/1,932. All twelve records report16 ready modules and zero errors; warnings retain deferred road furniture and no valid reserved university site.

Speed zero is not a frozen renderer. Traffic/Transit visibility is suppressed but updates continue. At least three frames render after swaps; captures span many more frames. Draw/triangle samples vary with settling and render-pass cadence, including near166/216/171 draws and1,030,787/1,381,008/1,037,289 triangles. Far's first sampled frame is240 draws/933,665 triangles versus216/898,553 later despite exact screen replay; the pre-screenshot stats are not an exact synchronized screenshot-frame oracle. Amplified samples alone are stable165 draws/846,241 triangles. None supports a performance comparison.

The twelve debug samples span48.5–61.5FPS, with one below50, and484.9–542.3MB raw heap, with seven above512. These are neither sustained performance nor forced-GC retained-memory measurements. The retained build log records a successful163-module build in308ms. I did not rerun the build. Product hashes are unchanged, so carrying prior R9e API/restage/ledger evidence is appropriate, but those are not fresh R9f contracts. No new save, RNG, full-state, gameplay, shadow, reflection or temporal-pop proof is claimed. Impostors currently do not cast shadows even though the shared colour/depth map is updated.

## Decision and next priority

Accept **verification-only closure with no product edit**. The restored-cell comparison does not demonstrate a visible gain worth changing atlas-border behavior. One seed, noon, a fixed yaw/pitch and three distances cannot certify every mip, weather, night, device or ordinary moving transition. The score stays6.0 FAIL, and no whole-game rank is closed.

Return next to **whole-game rank1: sparse real block fabric**, owned by Democity with roads, zoning, buildings and simulation. R8y tested conservative proxies, not actual road-owner yield. A bounded diagnostic may test one localized missing link through the real road owner while preserving existing IDs/order, then compare actual slots, lots, building/economy state and restoration across seeds1337 and7. Do not infer that an appended road automatically preserves junction/frontage identities, or that one link can solve the scale deficit. Require useful real yield and intact state/terrain/visual behavior before advancing any product candidate. Broader foliage mismatch, night depth, site/terrain quality and performance remain ranked open issues; this result does not justify another speculative foliage retune.

The JSON companion lists every final original and difference path, all comparisons, source hashes, frame statistics and evidence limits. Only this critic report pair was written; product source, STATUS, HANDOFF and builder documents were not edited.
