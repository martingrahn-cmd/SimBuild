# Democity R8q — independent hidden-mast audit

**ACCEPT the one-line CPU change. Democity 6.0/10 — FAIL; whole-game 6.0/10 — FAIL.** The 8.5 quality threshold is not reached.

The optimization skips matrix/color work for Traffic fallback masts that were already hidden under Props ownership. Both interleaved A/B series reproduce a Traffic callback reduction of roughly 55%. All 18 supplied original images were inspected individually, including day controls and the visible Traffic fallback. No new missing geometry or obvious lighting regression is evident; none of this earns a higher visual score.

## Exact source scope

I verified the two snapshot byte lengths and SHA-256 values, compared current snapshot bytes with production, and reconstructed the pre-state by deleting only ` if(!m.g.visible)return;`. It matches exactly.

- Current `src/modules/traffic/masts.js`: `3ae0971c7b379aead1db0ecaadba73adce16f26e2d849f0c90e759d78d2f2d4c` (4226 bytes).
- Supplied pre-R8q: `d01fb7ba1355f6ebcb2f7ffc52f897857f79a63bf38ce317116366d453ccc043` (4201 bytes).
- Snapshot evidence: `shots/democity/r8q-hidden-masts/source/source-hashes.json`, `masts-pre-r8q.js`, `masts-current.js`.

The return is after `mastGate()` and zero draw/triangle accounting. The visible update body is unchanged, so it still writes matrices/colors and applies the current shadow flag on a visible frame. The next call reevaluates the gate before returning; this supports correct hidden-to-visible behavior by inspection. No simulation, signal timing, public API, RNG, save data, geometry or Props changes are introduced. The group and buffers still exist; this is not a retained-geometry memory optimization. Whitespace checks pass. The builder records a successful 163-module build, which this critic did not rerun.

## Recomputed measurements

| Traffic callback series | Legacy mean ms | Candidate mean ms | Reduction | Reported p95 ms |
|---|---:|---:|---:|---|
| Static A/B median, 3 runs each × 360 frames |0.885278|0.390278|55.914653%|1.3→0.7|
| Moving A/B median, 3 runs each × 240 frames |0.610000|0.272500|55.327869%|1.3→0.7|
| Separate direct traces, 1200 frames each |0.736333|0.318333|56.767768%|1.3→0.7|

Every run mean was recomputed from total/count, every FPS from elapsed time/frame count, and both A/B medians and percentage deltas were recalculated. Legacy pages remove only the early return from the served source. All legacy hidden buffers increment their versions by the sample count; all candidate hidden buffers leave versions unchanged. All have 2067 hidden lenses and zero errors. Within-run quantiles are stored aggregates, not independently reconstructible without individual samples.

Static median whole-frame FPS is 48.896435→48.102619 (−1.623463%). Moving is 50.507176→52.349169 (+3.646992%). Static draws are exactly 281 throughout. Moving averages range slightly (legacy 391.045833–391.066667; candidate 391.025–391.045833), so moving submission counts are not exactly identical even though the product change creates no geometry. These short runs do not establish a general FPS gain.

The separate 900-frame profiler records `updateMasts` self-sampled time 193264→1019 µs (−99.472742%) and a previous 59091528-byte allocation sample absent from the candidate list. This supports the removed work, but sample time is not inclusive callback time and a missing sampled allocation entry is not a proof of zero bytes. Total sampled allocations are 334812640→278206328 bytes; neither total measures retained heap. The CDP tool samples CPU at 100 µs and allocations at 32768-byte intervals, includes collected objects, aggregates leaf/self data and discards the original trees.

## Hidden and visible contract

In Democity, the 2067-lens hidden group retains both matrix/color version 0 and its two buffer hashes across 120 frozen frames. In the separate Traffic showcase, both variants expose 180 lenses for 16 signals and increment both buffer versions from 8 to 128. Their final matrix hash is 3571273628 and color hash 2995140163, with 55 measured draws and 669756 triangles in each record. All errors are empty.

This is stronger than a screenshot-only check, but “bit-exact buffers” overstates what the persisted evidence allows this critic to verify: it stores equal 32-bit hashes, not arrays. It covers one frozen 22:00 configuration and does not execute a hidden-to-visible transition, clock sweep or topology change. Source identity makes acceptance reasonable within that boundary. The directed Traffic original visibly retains signal heads; its different 82-draw/766868-triangle capture should not be confused with the frozen probe counters.

## State, geometry and visual findings

The public API record preserves the selected census after two successful deserializations: 468 road nodes, 604 edges, 9964 cells, 612 buildings, 31 services, one transit line and eight stops. All eight valid tour calls succeed and an invalid call fails. I compared the stored restage digests directly: both 1337 and 7 return exactly within selected building/service/transit fields. These checks do not cover arbitrary whole-save or gameplay state.

All 16 R8q/R8p camera/time pairs have identical draw and triangle counters; camera state, seed, dimensions and quality also match. Both summary files reproduce the sidecars. Final evidence: 16 ready, zero errors, 469 maximum draws, 2814092 maximum triangles, 54.4 FPS minimum, no samples below 50, and 708.3 MB maximum raw endpoint heap. All Democity sidecars retain the known startup furniture-defer and missing university-site warnings.

The final FPS sample is good, but prior low runs and current static A/B remain unresolved; sustained 50 FPS is not certified. Raw heap exceeds 512 MB and is not a forced-GC retained-memory measurement. The images retain sparse lawn-filled parcels, planar/open foliage crowns, repetitive facades and night windows, artificial mountain patches and limited street activity. Signal CPU savings repair none of those visual findings.

## Next measured owner-safe priority

Resolve the remaining render/GPU-wait attribution on accepted source using controlled warmed traces and matched component masks, keeping scene content, LOD, density, lighting and camera policy unchanged. Compare normal interactive and required headless capture paths; retain the headless synchronization when evaluating the established capture gate.

Candidate sampled readPixels time is 14222556 of16605759 microseconds (85.648334%). engine.js55–60 explicitly synchronizes the GPU in headless mode. This may charge GPU completion wait to readback; it is not proof of a 14-second application CPU algorithm. Prior stable Props visibility masks give the strongest owner-render sensitivity, while current Traffic.render is the highest remaining sampled project function at89549 microseconds and updateSignals leads sampled project allocation at23620344 bytes.

Do not remove readback to manufacture a gate pass or simplify foliage/pools solely from counts. Determine an actual owner-local bottleneck before another optimization. Sparse city fabric remains the global visual priority.

The native `readPixels` time may include waiting for prior GPU work. `src/core/engine.js:55–60` documents deliberate headless synchronization to prevent long GPU queues during captures. It is not evidence that the readback itself is a removable gameplay defect. A controlled distinction between render cost, GPU wait and capture synchronization is more justified than immediately optimizing another small callback. Existing Props render-mask sensitivity remains a useful owner-local lead; it must be rechecked on accepted source.

Global ranks stay open in their existing order: city fabric; foliage; night depth; site integration; landmark grounds; environment/landscape; human activity; performance.

## Original-image inspection register

Each original below was viewed individually and its complete sidecar checked.

| Original | FPS | Draws | Triangles | Raw heap MB |
|---|---:|---:|---:|---:|
| `shots/democity/r8q-hidden-masts-final/bridge_12.png` |58.3|301|1583059|708.3|
| `shots/democity/r8q-hidden-masts-final/bridge_22.png` |57.3|294|1983739|469.6|
| `shots/democity/r8q-hidden-masts-final/downtown_12.png` |54.4|425|1892580|463.9|
| `shots/democity/r8q-hidden-masts-final/downtown_22.png` |54.6|410|2271574|474.9|
| `shots/democity/r8q-hidden-masts-final/industry_12.png` |60|204|1155506|488.8|
| `shots/democity/r8q-hidden-masts-final/industry_22.png` |60|202|1550180|691.9|
| `shots/democity/r8q-hidden-masts-final/interchange_12.png` |55.1|388|1812476|464.9|
| `shots/democity/r8q-hidden-masts-final/interchange_22.png` |56.5|400|2194778|608.2|
| `shots/democity/r8q-hidden-masts-final/night_downtown_12.png` |56.8|418|2460494|498.9|
| `shots/democity/r8q-hidden-masts-final/night_downtown_22.png` |55.2|343|2814092|638.3|
| `shots/democity/r8q-hidden-masts-final/park_12.png` |55.9|469|1822002|629|
| `shots/democity/r8q-hidden-masts-final/park_22.png` |55.9|443|2189364|475.1|
| `shots/democity/r8q-hidden-masts-final/riverfront_12.png` |60|246|1312596|667.2|
| `shots/democity/r8q-hidden-masts-final/riverfront_22.png` |59.8|212|1681158|507|
| `shots/democity/r8q-hidden-masts-final/suburb_12.png` |57.4|364|1756810|481.2|
| `shots/democity/r8q-hidden-masts-final/suburb_22.png` |57.9|329|2137674|464.6|
| `shots/democity/r8q-hidden-masts/democity_interchange_22.png` |53.3|400|2194778|498.3|
| `shots/democity/r8q-hidden-masts/traffic_fallback_22.png` |60|82|766868|131.2|

Additional JSON evidence read:

- `shots/democity/r8q-hidden-masts-final/audit-summary.json`
- `shots/democity/r8q-hidden-masts-final/r8p-geometry-compare.json`
- `shots/democity/r8q-hidden-masts-final/summary.json`
- `shots/democity/r8q-hidden-masts/contract-api/apicheck.json`
- `shots/democity/r8q-hidden-masts/contract-restage/restage-cycle.json`
- `shots/democity/r8q-hidden-masts/interchange22-ab.json`
- `shots/democity/r8q-hidden-masts/interchange22-attribution-candidate.json`
- `shots/democity/r8q-hidden-masts/interchange22-module-static.json`
- `shots/democity/r8q-hidden-masts/interchange22-moving-ab.json`
- `shots/democity/r8q-hidden-masts/mast-gate-contract.json`
- `shots/democity/r8q-hidden-masts/source/source-hashes.json`
- `shots/democity/r8q-runtime-attribution/interchange22-static.json`

Source/probe tools inspected: `src/modules/traffic/masts.js`, Traffic update call ordering in `src/modules/traffic/index.js`, `src/core/engine.js`, `tools/hidden-mast-ab-profile.mjs`, `tools/traffic-mast-gate-probe.mjs`, `tools/runtime-attribution-profile.mjs`. The accepted R8p direct profile supplies the separate direct baseline.

## Verification limits

- All 18 supplied original PNGs were individually inspected and every sidecar was read. Arithmetic and source checks were independently performed on the supplied records. This critic did not rerun browser captures, gameplay, build, API or live fallback probes; the 163-module build pass is the builder record.
- Timing records contain totals/counts and within-run quantiles rather than individual callback samples. Means, run FPS, A/B medians and deltas were independently recomputed. Within-run p95 cannot be reconstructed from absent raw samples; timer quantization is material at sub-millisecond values.
- CPU attribution is sampled leaf/self time, not inclusive callback time. Chrome heap sampling is probabilistic at a 32768-byte interval and includes collected objects. The output discards original CPU nodes/samples and heap call trees, so this audit checks the extraction tool and aggregate records, not a reconstruction of absent raw profiler data. An absent mast allocation row does not prove zero allocation or retained-memory savings.
- The visible fallback probe covers one 16-signal Traffic showcase at 22:00 for 120 frozen frames. It compares 32-bit hashes of buffers, not stored raw arrays. Equal hashes strongly support matching output but are not a critic-side byte-for-byte comparison. No actual hidden-to-visible transition, dynamic clock sweep, topology edit or Props enable/disable cycle is exercised.
- The source places the return after the gate and accounting, preserving first-visible-frame updates by inspection. Changes in shadow flags are deferred while hidden and applied on the visible path. This is source reasoning, not an independently executed transition test.
- API double deserialize verifies selected census equality. Restage compares selected authored building/service/transit fields across 1337→7→1337→7; it does not prove arbitrary whole-save identity or general gameplay determinism.
- Exact R8p/R8q draw and triangle counters are peak/per-capture metrics, not complete scene hashes or pixel-locked animated equivalence. Moving A/B draw averages vary slightly with render phase despite matching frame counts. The directed fallback screenshot has 82 draws/766868 triangles, while the frozen gate record has 55/669756; these are distinct capture conditions.
- Short interleaved fresh-page timings show order/host variation. Static FPS decreases while moving FPS increases. Final matrix samples all exceed 50 FPS but cannot replace previous low runs or certify sustained interactive performance. Headless GPU synchronization affects timing and attribution.
- Maximum raw endpoint heap is 708.3 MB, above the 512 MB target. Raw heap is not forced-GC retained heap; neither memory compliance nor retained-memory reduction is established.
- No fresh 32-frame whole-game/weather matrix, eight-reference recalibration, blind A/B judging or subjective playtest. Democity and whole-game remain 6.0 FAIL with unchanged global visual ranks. No gameplay or visual quality improvement is claimed.
