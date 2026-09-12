# Democity R9m — independent selector and render-pass audit

**ACCEPT the qualified diagnosis; do not change product source. Democity and whole-game remain 6.0/10, FAIL against 8.5.** The ordinary street profiling gate passes. Failed interchange timing remains failed and does not close the top-down performance question.

## Independent verification

I parsed all four JSON files in full and reviewed both tools, the revised builder report, relevant Props allocation/selector/material contracts, High-quality cascade configuration and the R9l critic. I recomputed 4,512 census calls containing 9,860 copied source entries across both census versions, all 24 A/B pairs in 54 blocks, and all 11,700 retained frame intervals. All stored derived arithmetic agrees. No screenshots were requested or inspected.

| Settled census | LOD0 / LOD1 / impostor | Fade-active LOD1 | LOD1 chunks | Casting chunks / submitted |
|---|---:|---:|---:|---:|
| interchange | 0 / 2,540 / 0 | 2,540 | 34 | 0 / 0 |
| street | 30 / 247 / 1,037 | 221 | 4 | 1 / 119 |
| park | 0 / 204 / 2,127 | 184 | 4 | 0 / 0 |
| aerial | 0 / 1,939 / 0 | 1,939 | 25 | 0 / 0 |

For every call I checked source and chunk distance against the recorded camera, species sums, active-species bounds, and unique `(chunk, source index)` membership. I independently reimplemented the integer source-index hash and cross-fade inversion: active totals match every call. Per-chunk call sums match retained buffer counts and active counts, and total LOD1 submission matches the public histogram. Casting flags match the strict 120 m chunk-center threshold. Both census versions have identical camera, calls, chunks, histogram and summaries; runtime statistics differ. V1 remains superseded for synchronization provenance despite its numerical agreement.

All views contain all eight species. Street submitted species are oak78, birch43, maple39, poplar32, blossom22, spruce19, fir10, willow4; active counts are respectively68,39,35,28,21,16,10,4. Thus26 submitted street entries are fade-disabled. Its casting chunk36 lies67.892326 m from the field camera and contains119 submitted /112 active entries. The shadow ledger must use119 submitted, not112 active.

Interchange pitch0.704323 and aerial0.85 take the deliberate `pitch > 0.62` LOD1 path; street0.18 and park0.451153 use normal selection. Interchange selected bucket-center distances span311.543149–1,849.384010 m, directly confirming that normal205 m range and CAP1=520 do not constrain this top-down path. This is not a cap defect. It also shows why the prewarm R9l inventory of2,630 is not interchangeable with the settled2,540 census. Camera flight is a plausible source of that difference, not a separately traced per-frame causal proof.

## Pass split and exact geometry ledger

| Street mode | Stable pairs | Conventional stable FPS response median | Draw / triangle difference |
|---|---:|---:|---:|
| Total LOD1 hide | 4/5 | +3.907531% | −7 / −101,472 |
| Color/depth with LOD1 shadows off | 4/5 | +1.679768% | −4 / −41,496 |
| LOD1 shadows off | 5/5 | −0.807294% | −3 / −59,976 |

These geometry deltas hold in **every** street pair, including timing-unstable pairs. Four meshes submit247×168=41,496 color triangles. One casting mesh contains119 entries; High quality configures three cascades, yielding119×168×3=59,976 shadow triangles and three draws. Sum:101,472 triangles and seven draws, exactly matching the total mask. The counters and current source support this local submission ledger; they are not a GPU trace proving per-cascade pixel work.

Total stable responses are +9.858172%, +6.528223%, +1.286839%, −5.689801%. Color stable responses are +1.247988%, −1.721654%, +2.111548%, +3.425066%. Shadow responses are −0.807294%, −2.652945%, −0.484160%, +0.170684%, −4.377107%. There is no reproducible beneficial shadow result and no compelling safe edit from the smaller color result. Modes use fresh pages and different baselines, so timing medians do not add like triangle counts.

I reconstructed each block FPS from `sampledFrames / elapsedMs`, verified the requested frame/sample/interval counts and every adjacent-control drift. Interval sums differ from block elapsed time by at most0.2 ms in the failed run and0.1 ms in street, consistent with the tool's separately sampled timing boundaries. These are observer intervals, not GPU timestamps. Street contains7,920 measured frames; failed interchange contains3,780.

The failed interchange record has zero stable pairs for all three modes, with maximum control drift23.239936%,17.399826%,39.246205%. Its shadow mask changes zero draw calls and near-zero whole-frame triangles, consistent with the separate no-casting census, but it supplies no accepted timing estimate. All retained engine, browser and HTTP-error collections are empty; all recorded renderers are actual ANGLE/Apple M4 Metal and all framebuffers1920×1080.

## Source and tool limits

The census routes a disposable pointer into the actual PropField, reproduces collection/bucket iteration order, wraps real `_copy`, and restores that method in `finally`. It explicitly waits for flight and queue before a forced complete current-camera owner update. That updates temporary LOD buffers and bypasses ordinary amortization/hysteresis; it does not alter product/world/save/RNG source. The public histogram is from the same update, so equality is a valuable consistency check, not an independent completeness oracle for omitted input buckets. Per-species active distributions are aggregate records; individual species-to-fade assignments cannot be independently rebuilt from saved per-entry data because those arrays are not retained. Source ordering and aggregate bounds agree.

The pass profiler waits for flight plus30 frames, selects four own-visible168-triangle Standard-material instanced meshes, then warms240 frames and settles30 frames after switches. It does not explicitly assert a private queue is empty, and the census is a separate page. The current ten-chunk-per-frame update policy and exact submission ledger support this bounded run, but do not create a recorded per-block identity/cast-state oracle. Objects' original visibility/castShadow descriptors are restored, and reflection is restored to on before disposable-page close. Color mode locks shadow casting off in both controls. Owner callbacks continue.

The pass gate enforces inventory presence, at least two stable pairs per mode and empty errors; renderer and framebuffer are recorded but not enforced by that expression. I checked their actual values independently. An empty mode list would also vacuously pass; all three requested modes are present here. Both tools set nonzero process exit on false, but JSON does not itself retain shell exit status.

Local accepted product hashes are unchanged: chunks `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`, trees `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17`, index `be80cb25874c65a14b90f50702ae2e544850ee430e7f6af7c7400e6062b2156b`, textures `6090fe11d3104bcda0d9729f250e856153ebad69c1c55f083e122ed89dedf039`. The census tool hash matches `6f00ee2e69be44931e28fa43656f9b8a0ed38f060c42657d60d0382b98be2105`. Current pass tool hash is `7d364db1cc355eace2f23632d8dc58b42274335285b2ddb6275dcf4d15b08fd0`; the latest builder correctly labels `80de397d20ffb5a5300fa126349594a0c564288642cfedacb1c010e99d2d3023` as evidence-producing. I independently reconstructed that exact hash by replacing only the current method description with the retained JSON method string. The change is wording-only, correcting its overstatement of Props queue settlement; sampled behavior is unchanged. Complete evidence hashes and recomputations are in the companion JSON. Fetched transformed route bytes and complete source manifests are not retained per run.

## Judgment and next priority

The builder's revised wording correctly supports **no immediate LOD1 edit**, rather than claiming all LOD1 performance hypotheses are closed. No shadows are submitted in the two captured top-down presets; this does not mean every possible top-down camera has zero LOD1 shadows. Settled top-down color/depth timing still needs a stable matched replication if that line of work resumes. Ordinary street measurements do not answer that question.

One seed/night/host, shared adjacent controls, fixed order, uncapped rendering and the full headless capture policy limit timing inference. Masking changes complete color/depth/shadow submissions and dependent effects; it does not isolate shader cost, GPU versus CPU, bandwidth or fill. Fade-active entries need not produce visible pixels. No visual, gameplay, API/save/restage, moving-transition, forced-GC memory or official sustained50fps gate is passed here. The163-module build is builder-reported; the four supplied JSONs contain no build log, and this audit did not rerun the build.

Keep accepted72-card/168-triangle crowns, normal205 m range, ±12 m transition, normal CAP1 and120 m chunk shadow condition. Returning to unresolved **city-fabric rank1** is reasonable: any coordinated/non-cardinal design should use actual owner allocation and road legality, retained identity/economy/save checks, and matched images before advancing. R9m adds no proof that such a layout will succeed. It also raises no score and closes no whole-game visual issue.

## Inspected evidence

- Revised `docs/builds/democity_r9m_lod1_pass_attribution.md`; both R9m tools; R9l critic.
- Complete `census-v1.json`, `census-v2.json`, `final-v1.json`, `street-final-v2.json` under `shots/democity/r9m-lod1-passes/`.
- Relevant Props chunks/trees/index contracts and current textures hash; `src/core/constants.js` and environment lighting CSM configuration.
- No screenshot inspection or new product tests in this diagnosis-only review.
