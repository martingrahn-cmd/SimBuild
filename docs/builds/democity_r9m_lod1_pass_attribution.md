# Democity R9m — LOD1 selector and render-pass attribution

## Local decision

**Accept the selector/submission diagnosis and reject an immediate LOD1 performance edit. Make no product or score change; Democity and whole-game remain 6.0/10, FAIL.**

R9l measures a large local response when all matched LOD1 objects are hidden at the interchange night view, but that mask combines color, depth and shadows and its prewarm inventory does not record the active selector state. R9m repairs those evidence gaps before selecting a product candidate.

## Selector census

`tools/r9m-lod1-census.mjs` routes only a disposable pointer to the accepted `PropField`, waits for the named camera flight and Props queue to finish, then wraps the real `_copy` path for one forced same-update observation. It reconstructs the real ordered source buckets to record species and shader-active cross-fade membership. Current `chunks.js` remains SHA-256 `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`.

| Camera | Pitch / selector | LOD0 / LOD1 / impostor submitted | Active LOD1 | LOD1 shadow state |
|---|---|---:|---:|---:|
| interchange | 0.7043 / top-down | 0 / 2,540 / 0 | 2,540 | 0 casting chunks / 0 submitted |
| street | 0.18 / normal | 30 / 247 / 1,037 | 221 | 1 casting chunk / 119 submitted |
| park | 0.4512 / normal | 0 / 204 / 2,127 | 184 | 0 / 0 |
| aerial | 0.85 / top-down | 0 / 1,939 / 0 | 1,939 | 0 / 0 |

All four cameras include all eight species and are actual Chrome/Metal at 1920×1080 with zero engine/browser/HTTP errors. For street, submitted species are oak78, birch43, maple39, poplar32, blossom22, spruce19, fir10 and willow4; 26 transition copies have negative `iFade` and are shader-discarded. The census's submitted count exactly equals the public LOD1 histogram in every view.

This explains R9l's scene-specific scale: interchange deliberately crosses the `pitch > 0.62` top-down selector and uses LOD1 across the in-frustum field, bypassing normal CAP1. Its LOD1 chunks do not satisfy the separate 120 m chunk-shadow threshold, so the measured component submission there is color/depth rather than tree shadow geometry. R9l's 2,630-object inventory was taken before warmup while the camera could still be flying; it is not the settled 2,540 census.

The first census file is superseded because its code waited a fixed 24 frames rather than explicitly checking flight/queue settlement. The repaired census adds those checks. Its values happen to reproduce the first file exactly, but only the repaired record carries the intended synchronization contract.

## Ordinary-view pass split

`tools/r9m-lod1-pass-profile.mjs` waits for camera flight plus 30 further rendered frames before selecting the four real visible street-camera LOD1 meshes. Thirty frames exceeds the seven frames needed to drain the current maximum 64-chunk queue at ten chunks per update when no rebuild is pending, but the profiler does not inspect the private queue; exact queue settlement comes from the separate routed census. It leaves reflection off, uses the complete headless-on and uncapped diagnostic policy, warms 240 frames, then runs five A/B cycles of 240 measured frames with a 30-frame settle after every state switch. It retains every block's elapsed time and all individual frame intervals.

Three fresh pages test:

- total: normal LOD1 versus matched objects hidden;
- color: LOD1 shadows locked off in both controls, then matched objects hidden in B;
- shadow: normal LOD1 versus only `castShadow` locked false.

The aggregate record passes its declared inventory/stability/error gate. All rows have at least four stable adjacent-control cycles and zero errors. The record separately contains an actual Apple M4 Metal renderer and 1920×1080 framebuffer for all three pages; those identity fields are inspected evidence but are not operands in the tool's aggregate boolean.

| Mode | Stable cycles | Conventional stable response median | Exact median submission delta |
|---|---:|---:|---:|
| total | 4/5 | +3.907531% | -7 draws / -101,472 triangles |
| color without LOD1 shadows | 4/5 | +1.679768% | -4 draws / -41,496 triangles |
| LOD1 shadows only | 5/5 | -0.807294% | -3 draws / -59,976 triangles |

The geometry ledger closes exactly. Street submits `247 × 168 = 41,496` LOD1 color triangles. The one casting chunk has 119 submitted entries across three cascades: `119 × 168 × 3 = 59,976`. Their sum is 101,472 and seven draw calls, exactly the total mask delta in every accepted pair.

Timing does not support an optimization. The four stable total responses span -5.69% to +9.86%; color includes -1.72%, +1.25%, +2.11% and +3.43%; shadow has five stable controls but a negative median and only one small positive response. These short local medians are diagnostic and non-additive. In particular, eliminating the exact 59,976 shadow triangles does not show a positive frame-time return, and the existing 120 m radius already limits them to one near chunk.

The first R9m interchange pass record remains failed: all total/color/shadow rows have zero stable cycles. Its counters directionally show no interchange shadow submissions, but timing from that record is rejected. It is retained rather than overwritten.

## Product state and verification

No product source, geometry, material, population, LOD range, selector, transition, cap, shadow radius, atlas, RNG, records, save, simulation or gameplay behavior changes. Production build passes with 163 transformed modules. Current LOD1 remains 72 two-triangle cards plus a 24-triangle stem, range205 m, transition band12 m, CAP1 520 for normal selection and LOD1 shadow radius120 m. Top-down's deliberate LOD1 path remains unchanged.

Evidence:

- `shots/democity/r9m-lod1-passes/census-v1.json` — superseded fixed-frame census
- `shots/democity/r9m-lod1-passes/census-v2.json` — accepted settled census, SHA-256 `04b08a0c28be2da35180f01cbd2a95f4dcef672c13f72d24a3e4ba2b0558d601`
- `shots/democity/r9m-lod1-passes/final-v1.json` — retained failed interchange pass split
- `shots/democity/r9m-lod1-passes/street-final-v2.json` — accepted ordinary-view pass split, SHA-256 `0ae5059935fa9b95bdb9ce9db319eca47f8b2fdd0e0098d888e64cab4c1c289a`
- `tools/r9m-lod1-census.mjs` — SHA-256 `6f00ee2e69be44931e28fa43656f9b8a0ed38f060c42657d60d0382b98be2105`
- `tools/r9m-lod1-pass-profile.mjs` — evidence-producing SHA-256 `80de397d20ffb5a5300fa126349594a0c564288642cfedacb1c010e99d2d3023`; current post-run wording-only correction `7d364db1cc355eace2f23632d8dc58b42274335285b2ddb6275dcf4d15b08fd0`

## Limits and next step

This covers one seed, time, host and four fixed camera presets; timed attribution covers only the ordinary street view. Adjacent pairs share controls and fixed mode order retains host drift. Disabling visibility or shadow casting changes complete render passes and does not isolate CPU, GPU, fill, shader or bandwidth. The pass gate screens adjacent controls but is not a confidence interval. No screenshot, moving visual transition, API/save/restage, sustained50fps, forced-GC memory or subjective quality gate is passed by this no-product-change diagnosis.

The accepted JSON's human-readable `method` string says “Props settling”, although the producing source actually implemented camera-flight wait plus a fixed 30-frame delay. The current tool corrects only that string; sampling behavior is unchanged. The report and critic must use the implemented fixed-wait contract.

The evidence does not support an immediate LOD1 product edit: ordinary shadow geometry has no measured positive timing response, and ordinary color cost is too small/noisy to justify weakening already-failed foliage quality. The settled census establishes that top-down LOD1 has no shadow submissions, but the failed interchange timing rows do not quantify a stable color-pass gain. Any later top-down optimization needs a stable matched replication and must preserve foliage quality. Continue with the highest-ranked visual/gameplay issue that has a broader owner-safe path; sparse city fabric remains rank1 and requires a coordinated or non-cardinal layout design rather than another isolated existing-node cardinal link.
