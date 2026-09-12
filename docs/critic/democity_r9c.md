# Democity R9c — independent synchronized LOD ledger audit

**ACCEPT the qualified verification-tool repair. NO PRODUCT CHANGE. Democity remains 6.0/10 FAIL; the 8.5 whole-game gate is not met.**

This report was re-audited against the latest retained rerun and replaces its earlier R9c measurements. All five supplied latest images were re-inspected. The retained evidence repairs the principal R9b accounting and camera-synchronization limitations. The exact endpoint ledger reproduces the earlier synchronized endpoint, and the forced cap result now has a same-update partition. Neither result establishes a product defect requiring a range, band, cap or movement-threshold change. This is an independent source/evidence audit, not an independently rerun browser experiment or new whole-game assessment.

## Source and instrumentation

Independently hashed current `src/modules/props/chunks.js`: `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`. It equals both ledger hashes and the accepted R9a/R9b hash. The retained build log records success: 163 modules, 298 ms. I reviewed that log rather than running another build.

The tool routes one constructor assignment, `globalThis.__R9C_FIELD = this`, into the served module. Its runtime wrappers call the bound original `update` and `_copy`, preserve their arguments/results and record observations afterwards. Camera/debug state changes occur in a disposable page; the tool restores automatic selection and closes that page. There is no product-source write. The raw disk hash does not independently authenticate the full transformed HTTP response, and no whole-world before/after serialized digest is supplied.

`setCameraSettled` waits three rendered frames, then explicitly updates projection/world/inverse matrices. `captureForced` repeats the matrix refresh before the exact selection. I recomputed the camera/world-matrix translation equality, inverse multiplication, evaluated-camera equality, bucket distances and output accounting. Matrix inverse residuals are below 1e-10; distance residuals are at most 4.55e-13 m. This is materially stronger evidence than R9b's immediate camera-set/force path.

## Independently recomputed automatic ledger

| Orbit distance m | Unique copied buckets | Unique copied entries | LOD0 / LOD1 / impostor submissions | Fade buckets | Extra fade submissions |
|---:|---:|---:|---:|---:|---:|
| 155 | 1059 | 2295 | 0 / 204 / 2127 | 15 | 36 |
| 193 | 1145 | 2472 | 0 / 175 / 2325 | 12 | 28 |
| 205 | 1145 | 2472 | 0 / 171 / 2346 | 18 | 45 |
| 217 | 1176 | 2535 | 0 / 163 / 2423 | 22 | 51 |
| 255 | 1192 | 2564 | 0 / 114 / 2477 | 13 | 27 |

All 5,717 membership records have unique chunk/offset/count keys and non-overlapping source offset intervals within each chunk. All source/submission totals, fade-bucket totals and histogram values reproduce from membership rather than relying on `pass:true`. Every sampled output tier, blend and inversion matches installed source logic, including complementary outer-band copies. All five queues are zero.

Coverage is narrower than the phrase “all boundaries” can imply: the records contain **266 stable LOD1 buckets at 72–193 m, 80 outer-transition buckets at 193–217 m, and 5,371 impostor buckets at or above 217 m**. None exercises below-48 m LOD0 or the 48–72 m blend. Camera orbit distances named 193/205/217 are not bucket `sd` distances, and these observations are not exact-equality unit tests at the boundary constants.

The tool's “source” census is deduplicated from actual `_copy` output records. It correctly counts source entries represented in that update and partitions their submissions; it is **not an independent census of every eligible input bucket**, so it cannot expose a bucket omitted before `_copy`. Likewise, blend/inversion arguments do not directly read back the per-instance `iFade` buffers, species masks or GPU-visible tree membership. Submitted counts include fade copies; they are not unique visible trees. Source inspection confirms the existing deterministic hash-based complementary fade logic, but this round supplies no independent per-instance buffer oracle.

## Moving path and exact endpoint

The moving start summary exactly equals synchronized static 155 m. There are 175 contiguous frame indices, 1–175, with monotonically increasing orbit distance 155.0268229300618→255 m and no reversal. Queue is nonzero in 75 samples, peaks at 44 and ends at zero.

I reconstructed every histogram across the 177 ordinary update events and 17,498 `_copy` calls. There are 15 camera-distance resets above 6 m. Each reset leaves queue 44 after the ten-chunk budget; other calls drain by ten or to zero. All output-offset increments equal bucket counts, all recorded distances are finite and match evaluated-camera distances, and all recorded tier/blend/inversion decisions satisfy the sampled distance rules. At most eight chunks in an event produce tree copies; this does not mean the ten-chunk budget changed, since hidden/empty chunks need not call `_copy`.

The final camera is **5.19778626064147 m** from Props' last evaluated camera. The retained ordinary histogram is 0/117/2475. The synchronized exact refresh produces 0/114/2477, 2,564 unique copied entries and 2,591 submissions. Its complete summary, including source membership and output order, **exactly equals** synchronized static 255 m. Queue drainage is not exact current-camera convergence, but the retained difference is explained consistently by the existing movement threshold. Intermediate histograms remain partial while already rendered meshes persist during amortized rebuilding.

The endpoint PNG comparison independently gives normalized RGB MAE **0.0005800124061970467**, **19,418 changed pixels**, and changed fraction **0.009364390432098765** (0.9364390432098765%). Both retained image hashes match `analysis-summary.json`:

- Auto: `af19777a2db19a2b8c1a044dfbb450e8112b9bb93b38695d2e6e36f34e2dd820`.
- Exact: `a752e4565c75d9dc6f464175eca165cf62ea175b6c915ee5c798f95c427fcef7`.

The exact image visibly changes several localized tree crowns. The derived difference image emphasizes those areas; it is not a third independent scene capture. This must not be described as invisible change or foliage-only attribution. The tool allows three rendered frames before the second capture, and real-time Traffic can change despite `speed=0`. Other rendered state is not independently held equivalent by a per-module digest.

## Forced cap and visual evidence

At the synchronized non-top-down park pose, the forced update has 1,059 unique copied buckets and **2,295 source entries = 2,295 submissions = 520 LOD1 + 1,775 impostors**, with no fade copies. Replaying the membership order and `running LOD1 + bucket count > 520` guard reproduces every decision. This closes R9b's mismatched-update source-partition problem for the copied membership.

The implementation directly assigns `field.forceLod = 1` and calls `field.update(..., true)`; it does not invoke the public `debug.setLod(1)` wrapper. The wrapper's source uses the same assignment/update for valid level 1, so the mechanism is representative, but this is not a fresh public-API invocation test. It is diagnostic, not an ordinary camera state. R9b's ordinary direct-demand maximum 261 remains a bounded prior observation. CAP1 is not a global ceiling: top-down and near-LOD blend paths retain their documented exceptions.

The latest cap still shows more coarse multi-card crowns, consistent with the forced state. The latest tool now explicitly waits three rendered frames after the forced update and before freeze/screenshot, closing the earlier capture-ordering concern. This repair strengthens image/update correspondence; it does not convert the forced diagnostic state into ordinary demand or a fresh public API test.

All requested images were individually inspected at original resolution:

- `shots/democity/r9c-lod1-ledger/moving_end_auto.png` — 1920×1080.
- `shots/democity/r9c-lod1-ledger/moving_end_exact.png` — 1920×1080.
- `shots/democity/r9c-lod1-ledger/moving_end_diff.png` — 1920×1080, derived difference.
- `shots/democity/r9c-lod1-ledger/cap_stress_synced.png` — 1920×1080.
- `shots/democity/r9c-lod1-ledger/motion_contact_final.png` — 3104×880, derived 32-tile contact sheet.

I see no definite black geometry, material failure or major scene loss in these samples. Coarse separated leaf clumps, flat tree silhouettes and sparse park fabric remain. The contact sheet shows the marked outward movement plus surrounding states; its small sampled tiles cannot certify temporal continuity or exclude brief whole-tree popping. I did not exhaustively play/inspect every video frame. Independent `ffprobe` on the current `session.webm` reports **17.160 seconds, 1920×1080, 25 fps**; the current builder appropriately omits a fixed duration. The retained `ffmpeg.log` describes an older 16.96-second input and failed `framestep` extraction; it is not authoritative metadata for the final file. The stated 0.2-second contact sampling is an extraction claim, not synchronized timestamps retained in the ledger.

## Errors, limits and next priority

All seven full module-stat snapshots have all 16 modules ready, zero module errors and empty simErrors; aggregate errors are empty. Warnings are deferred road furniture and unavailable reserved university site. `pass:true` checks only a subset of assertions; the membership, monotonicity, queue and image checks above were independently recomputed.

Recorded endpoint FPS spans 13.4–52.3 and raw heap 471.4–497.8 MB. These are instrumented shared-page snapshots, some sampled before the next render. Wrappers allocate thousands of records and video capture adds work. They establish neither a causal FPS improvement nor a 2 ms ordinary-update bound, sustained 50 FPS gate or forced-GC 512 MB memory pass. No product candidate exists to attribute a regression to. No new full matrix, multi-seed/species, weather/night, top-down crossing, naturally saturated ordinary view, save/restore, long playtest, reference calibration or blind judgment was performed.

**Next owner-safe priority: Props crown/impostor appearance continuity, with existing distance/cap rules held fixed.** The endpoint comparison identifies concrete crown regions to examine at full resolution and through a matched continuous traversal. First isolate their tier silhouette/opacity mismatch with a synchronized render and controlled unrelated motion; only a reproducible visible problem should advance to a bounded owner change. The current evidence does not justify spending more geometry or increasing update frequency. The cap capture now has the required post-force render wait. Preserve that ordering in future matched visual tests.

City fabric remains the higher-ranked whole-game issue; crown/impostor coherence, night quality and sustained performance/memory remain open. This verification repair closes the specific R9b accounting gap, not those quality issues, and leaves **6.0 FAIL** unchanged.

Additional files inspected in full: `docs/builds/democity_r9c_lod1_ledger.md`, `tools/lod1-transition-ledger.mjs`, `shots/democity/r9c-lod1-ledger/ledger.json`, `analysis-summary.json`, `build.log`, `ffmpeg.log`, `src/modules/props/chunks.js`, and `docs/critic/democity_r9b.md/.json`; relevant public `setLod`/reflection handlers in `src/modules/props/index.js` were also checked. Only this critic report pair was written. The builder's previously stale moving figures were corrected and rechecked before finalization; this report uses the current raw ledger: 155.0268229300618 m and 17,498 copies.
