# Democity R9b — LOD1 transition and cap diagnosis

**Local decision: accept the diagnosis for independent review with no product change. Democity remains 6.0/10 FAIL.**

## Scope and source integrity

R9b verifies the moving-camera and selection behavior around R9a's installed Props LOD1 boundary before any further foliage range or geometry change. `tools/lod1-transition-probe.mjs` routes only an observability hook into Vite's transformed `src/modules/props/chunks.js` on one disposable actual-Chrome/Metal page. It does not modify the source file. The starting, final and actual source SHA256 all match `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`, containing the accepted `LOD1_R = 205` and `BAND = 12` contract.

The production build passes with 163 transformed modules. The probe reports `pass: true`, all modules ready, zero engine/browser errors, and only the two established deferred-road warnings.

## Settled boundary states

Eleven forced-refresh park-camera states cover camera orbit distances 155–255 m, including five requested distances numerically inside 193–217 m. Every state drains the Props queue to zero and has finite, non-negative counters. Camera orbit distance is not the `sd` of any one 32 m tree sub-bucket, so these rows sample different bucket populations around the boundary rather than tracing one tree through its fade interval.

| Camera distance | LOD1 entries | Impostor entries | Direct tier-1 demand | Transition-source entries |
|---:|---:|---:|---:|---:|
| 155 | 204 | 2,127 | 204 | 36 |
| 175 | 185 | 2,255 | 185 | 41 |
| 185 | 192 | 2,322 | 192 | 42 |
| 193 | 175 | 2,325 | 175 | 28 |
| 199 | 175 | 2,331 | 175 | 34 |
| 205 | 171 | 2,346 | 171 | 45 |
| 211 | 164 | 2,359 | 164 | 51 |
| 217 | 163 | 2,423 | 163 | 51 |
| 225 | 154 | 2,429 | 154 | 48 |
| 235 | 134 | 2,464 | 134 | 34 |
| 255 | 114 | 2,477 | 114 | 27 |

These are submitted, fade-inclusive histogram entries rather than unique visible trees. The varying world-space frustum and complementary fade copies mean the columns need not change monotonically at every discrete camera distance. Single-frame FPS, heap and render counters also vary substantially on the shared page and are not used as performance evidence.

Five fresh 1920×1080 High/Metal originals at 175, 193, 205, 217 and 235 m were inspected at original resolution. They remain visually coherent across the sampled settled states: no definite black object, missing geometry, new opacity wall or material failure is visible. The stills do not record the continuous traversal, so they cannot certify the absence of brief temporal LOD popping.

## Moving traversal

The real camera moves monotonically from 155.006727 m to 255 m over 168 sampled rendered frames. There are zero distance reversals, zero non-finite or negative samples and zero engine/browser errors. The amortized Props rebuild queue is non-zero in 75 samples, peaks at 44 and reports zero at the final state.

The moving histograms begin at 0/204/2,127 LOD0/LOD1/impostor and finish at 0/117/2,475. A separately forced static refresh at requested 255 m records 0/114/2,477. During motion `update()` resets the diagnostic counters for each camera change while processing at most ten queued chunks per call; old chunk meshes remain installed until their rebuild. The existing movement threshold can also retain the last evaluated camera state even when the reported queue is zero. Therefore these intermediate histograms are partial accounting, not whole-frame visible-population censuses, and final queue zero does not prove exact endpoint-state convergence. The data verifies finite execution and bounded queued work. It does not by itself prove temporal visual smoothness.

## Normal demand and diagnostic cap stress

A 60-configuration non-top-down camera search across park, downtown and suburb does not naturally saturate `CAP1 = 520`. Its highest direct demand is 261 in the downtown camera at pitch 0.55 and distance 80 m. R9b therefore makes no ordinary-view cap-saturation claim.

The separate diagnostic uses Props' existing public debug `setLod(1)` while retaining an ordinary non-top-down park camera. Its copied pre-force `consideredSource` field is 2,051, while the forced histogram is 520 LOD1 plus 1,775 impostor entries. Those two totals are not the same census and cannot prove a partition of 2,051 source records. The histogram does show that forced LOD1 stops exactly at 520 while later submitted buckets appear as impostors, with queue zero and no error. This verifies the numerical guard path under forced stress, but the probe needs a force-specific source census before it can quantify exact demotion. It is not representative ordinary-camera demand. The inspected stress original contains the expected denser multi-card crowns and no definite missing or black geometry, while retaining the known separated-card and flat-crown weaknesses.

## Decision and limits

R9b finds no reproduced crash, missing-geometry or material defect that requires reverting R9a's 205 m range and existing 193–217 m fade interval. It supplies no evidence for extending the range, changing `CAP1`, changing geometry or raising the critic score. No product source is changed.

Temporal popping remains visually unverified because no continuous video or human playtest is supplied. Multi-seed/species traversal, weather/night traversal, forced-GC retained memory, sustained timing and a naturally saturated ordinary camera also remain unverified. The established distant impostor, crown coherence, city-fabric, strict 50 FPS and 512 MB gates remain open.

Evidence:

- `shots/democity/r9b-lod1-transition/probe.json`
- `shots/democity/r9b-lod1-transition/static_175.png`
- `shots/democity/r9b-lod1-transition/static_193.png`
- `shots/democity/r9b-lod1-transition/static_205.png`
- `shots/democity/r9b-lod1-transition/static_217.png`
- `shots/democity/r9b-lod1-transition/static_235.png`
- `shots/democity/r9b-lod1-transition/cap_stress.png`
- `shots/democity/r9b-lod1-transition/build.log`
