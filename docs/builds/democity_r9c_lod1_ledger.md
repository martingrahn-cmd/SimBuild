# Democity R9c — synchronized Props LOD ledger

**Local decision: accept the verification-tool repair and make no product change. Democity remains 6.0/10 FAIL.**

## Why R9c was required

R9b found finite bounded LOD work but could not support an exact source/output census. Its camera setter immediately forced Props selection before a final world-matrix refresh, its forced histogram reused a source count from a different update, and queue zero at the end of a flight did not equal an explicitly refreshed endpoint.

`tools/lod1-transition-ledger.mjs` fixes those evidence defects on a disposable actual-Chrome/Metal page. It waits for rendered camera state, explicitly refreshes the projection/world/inverse matrices, then wraps the real Props `update()` and `_copy()` methods in the page. Every captured output retains its actual chunk, source offset/count, world position, evaluated `sd`, selected tier, fade and inverted-copy flag from the same update. This is a census deduplicated from actual `_copy()` outputs; it does not independently enumerate input buckets omitted by the frustum or hidden-kind exits. Only a constructor observability hook is routed into Vite's served module. Product source is not written.

Current, starting and final `src/modules/props/chunks.js` SHA256 all equal `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`. The production build passes with 163 transformed modules in 298 ms. The final probe is `pass:true`, all recorded `sd` values are finite, and browser/engine errors are zero. The warnings are the established deferred road-furniture and unavailable university-site messages.

## Synchronized automatic states

Five exact automatic evaluations reproduce the R9b histograms while adding source membership and fade accounting from the same update:

| Orbit distance | Source buckets / entries | Submitted LOD0/LOD1/impostor | Fade buckets / duplicated entries |
|---:|---:|---:|---:|
| 155 m | 1,059 / 2,295 | 0 / 204 / 2,127 | 15 / 36 |
| 193 m | 1,145 / 2,472 | 0 / 175 / 2,325 | 12 / 28 |
| 205 m | 1,145 / 2,472 | 0 / 171 / 2,346 | 18 / 45 |
| 217 m | 1,176 / 2,535 | 0 / 163 / 2,423 | 22 / 51 |
| 255 m | 1,192 / 2,564 | 0 / 114 / 2,477 | 13 / 27 |

All 5,717 retained automatic membership rows match the installed rules applicable to the observed population:266 stable LOD1 rows,80 outer LOD1/impostor-fade rows and5,371 stable impostor rows, with zero boundary mismatches. These camera states contain no source row below72 m, so R9c does not test stable LOD0 or the48–72 m inner fade. Every histogram equals the sum of its actual `_copy()` outputs. Orbit distance remains a camera setting rather than any one bucket's `sd`.

## Moving endpoint and six-metre threshold

The final run records 175 monotonically increasing rendered movement samples from 155.026823 m to 255 m. The ordinary rebuild queue peaks at 44 and reports zero at the end. The ledger retains 177 ordinary update calls and 17,498 exact `_copy()` calls.

At the final camera pose, Props' last evaluated camera position is 5.197786 m away. This is below the existing six-metre update threshold. The retained ordinary histogram is 0/117/2,475; a matrix-synchronized forced automatic refresh at the same final camera yields 0/114/2,477 from 2,564 unique source entries and 2,591 fade-inclusive submissions. The mismatch is therefore reproduced and bounded. It is consistent with the documented camera threshold, not a queue-drain or source-partition failure.

The ordinary and exact endpoint originals were captured with the scene frozen around the selection change and three rendered frames allowed before the second capture. They differ by normalized full-frame MAE 0.000580012 and 19,418 pixels, 0.936439% of the frame. The visual diff localizes most strong changes to several tree regions. Three render frames separate the captures, and Traffic has established real-time independence from `?speed=0`, so the metric is not foliage-only attribution.

The retained WebM marks the moving interval. A32-frame contact sheet samples it every0.2 seconds. At original endpoint resolution and in the sampled motion sheet I see no definite whole-tree disappearance, black geometry, opacity wall or material failure. The exact refresh does visibly alter a few localized crowns in the diff, so this evidence does not certify that brief temporal popping is absent. It also does not establish that reducing the six-metre threshold would improve the played result enough to offset more frequent chunk work.

## Exact cap stress

After the same synchronization, the disposable harness directly sets the field's existing `forceLod=1` debug state and calls the real full-update path at the non-top-down park camera. It records1,059 unique copied source buckets and2,295 source entries in that exact forced update. They produce exactly520 LOD1 plus1,775 impostor entries, with no fade copies and no missing partition:

`2,295 source = 2,295 submitted = 520 LOD1 + 1,775 impostor`.

This closes R9b's2,051/2,295 evidence discrepancy and verifies the real normal-tier guard under forced diagnostic load. It remains `ordinaryView:false`; the prior ordinary search maximum261 is still the correct observed ordinary-demand limit, not a global ceiling.

## Failed evidence and decision

The first R9c launch stopped before page creation because Playwright's local ffmpeg component was absent; the required Playwright component was installed and the probe rerun. An early endpoint pair was byte-identical because the second screenshot preceded a rendered frame after buffer mutation. That pair is discarded. The final tool explicitly unfreezes, renders three frames, freezes and captures, and its distinct hashes and non-zero image metrics are retained.

No product defect is reproduced strongly enough to justify changing `LOD1_R`, `BAND`, `CAP1` or the six-metre movement threshold. A threshold reduction would increase rebuild frequency under a still-failed performance gate, while the current endpoint delta is bounded and no definite severe pop was identified in sampled motion evidence. R9c accepts the corrected verification path, keeps R9a installed and makes no product edit or score claim.

Limits remain: the contact sheet samples rather than exhaustively judges every video frame; no multi-seed/species, night/weather, top-down transition, naturally saturated ordinary camera, sustained timing, forced-GC memory, save/restore or subjective playtest is included. City fabric, crown/impostor coherence, night readability and the50FPS/512MB gates remain open.

Evidence:

- `shots/democity/r9c-lod1-ledger/ledger.json`
- `shots/democity/r9c-lod1-ledger/analysis-summary.json`
- `shots/democity/r9c-lod1-ledger/session.webm`
- `shots/democity/r9c-lod1-ledger/motion_contact_final.png`
- `shots/democity/r9c-lod1-ledger/moving_end_auto.png`
- `shots/democity/r9c-lod1-ledger/moving_end_exact.png`
- `shots/democity/r9c-lod1-ledger/moving_end_diff.png`
- `shots/democity/r9c-lod1-ledger/cap_stress_synced.png`
- `shots/democity/r9c-lod1-ledger/build.log`
