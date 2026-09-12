# Democity R8p — independent signal-key CPU audit

**ACCEPT the bounded CPU change. Democity 6.0/10 — FAIL; whole-game 6.0/10 — FAIL.** The 8.5 acceptance threshold and existing visual ranking remain unchanged.

The callback reduction is substantial and reproducible in both interleaved A/B series. The source keeps signal ownership in Traffic and uses a public scalar from Props. All 21 supplied original PNGs were individually inspected, and every sidecar was read; none exposes an obvious new geometry, material or lighting regression. Tiny signal heads in full-scene images are not a visual oracle for every lens. No visual score increase is justified.

## Recomputed CPU evidence

| Series | Legacy Props mean ms | Candidate mean ms | Reduction | Reported p95 ms |
|---|---:|---:|---:|---|
| Direct 1200-frame callbacks |1.647417|0.030167|98.168850%|2.3→0.1|
| Static A/B median,3 runs each ×360 frames |1.565000|0.044167|97.177849%|median2.6→0.1|
| Moving A/B median,3 runs each ×240 frames |1.495000|0.059583|96.014493%|median2.3→0.2|

I independently divided every callback total by its count and recomputed each run FPS and both series medians/deltas. The static whole-frame median is25.603459→27.567195FPS (+7.669806%); moving is23.221612→22.290125FPS (−4.011294%). This is evidence for a CPU callback optimization, not a demonstrated general FPS improvement. The JSON stores quantile aggregates rather than individual samples: within-run p95 is verified against the records and tool, not reconstructed from raw sample arrays.

The legacy route renames only the scalar method, leaving Props to use its retained fallback; the candidate exposes the new method. Runs alternate legacy/candidate/candidate/legacy/legacy/candidate on fresh pages, using the same scene, camera policy and rendering content. All run errors are empty. Timing drift is visible even within each variant.

## Source and signal contract

`traffic/index.js:81` refreshes the existing graph once, then hashes phase, yellow/green aspect and green-arm IDs. `props/index.js:458` takes that scalar when available; its old loop remains. Previously every Props signal query refreshed the complete graph and returned an object with a copied array. Full lens-color calculation still uses the existing detailed accessor when a change is detected. There is no new gameplay, RNG, save-data, geometry or camera logic in these additions. The graph refresh writes derived signal fields, so “read-only” describes the public access pattern, not literally zero internal writes.

I replayed all 16 keys from the189-signal public digests using the inspected graph clock formula and32-bit hash. Every recorded key and repeat read matches. Across the15 observed intervals, six change state, key and lens-buffer digest together; the second sweep is identical. All 3858 expected lens instances are found. These are 16 sampled hour values from0 through1.2, not 16 continuous hours. The copy probe mutates `signals()` output and checks `signalState()`; the latter also visibly uses `.slice()` in source.

The probe is a repeatability/transition test, not an independent expected-color test for all lenses or a legacy/candidate lens-buffer comparison. A32-bit hash is not collision-proof, and topology edits are not explicitly exercised. No observed collision or stale-lens failure warrants rejecting this bounded change. Existing rebuild/deserialize paths force lens refresh.

Current source hashes:

- `src/modules/traffic/index.js`: `32406d9f7eba3a71ec55b6c9b96cb51104647fb17d7d584463628523fcb24cf2`
- `src/modules/props/index.js`: `be80cb25874c65a14b90f50702ae2e544850ee430e7f6af7c7400e6062b2156b`

The supplied reconstructed pre-R8p/current snapshots in `shots/democity/r8p-signal-key-candidate/source/` were checked byte-for-byte and all four hashes match `source-hashes.json`. Current snapshots equal production. Their exact diff adds only the 13-line Traffic comment/method block and one Props consumer line. Pre-R8p hashes: Traffic `12e26088699da457d27aa03b66c892ee4c3b06f65dc8e9a4f3894c00050a7684`; Props `d4c8ddfa3fdc5890e12c616f320edcd7ad7bb18d6c2f56b4a309b177834f5525`. These are reconstructed baselines, not independent contemporaneous historical snapshots. Diff whitespace checks pass. Production build with 163 modules is a builder result; I did not rerun it.

## State, pixels and performance

The API record retains468 road nodes,604 edges,9964 cells,612 buildings and31 services after two successful deserializations;8 tour calls succeed and the invalid tour is rejected. Selected authored building/service/transit digests match exactly for1337→7→1337→7. This does not establish byte-exact whole-save identity or general gameplay coverage.

All three R8n-directed image-difference records were recomputed from the original RGB pixels with zero residual: night_downtown22 mean absolute RGB0.000104327 and0.001012731% pixels above2; park22 mean0.018622364 and0.113811728%; interchange22 mean0.127415284 and0.826485340%. Traffic and render phase are not pixel-locked, particularly at interchange. These small differences and visual inspection support no visible regression; they do not prove identical animated behavior.

All 16 final summary rows match their authoritative sidecars:16 ready, zero errors, max469 draws,2,814,092 triangles, min34.0FPS,2/16 below50 and max raw endpoint heap672.4MB. Bridge22 is39.9FPS and downtown12 is34.0; their repeats are55.0/54.5. The repeat downtown12 heap is692.9MB, above the matrix-only maximum. The directed candidate night_downtown22 records29.2FPS. None of these failures is erased by a better later capture. The sustained 50FPS gate remains failed/unresolved; forced-GC memory is unverified. All 21 carry the known startup furniture-defer and missing university-site warnings, despite zero errors.

## Next measured owner-safe priority

Props render-side attribution is the next bounded investigation. Recomputed same-page A-B-A owner masks yield Props+21.592388% with0.515212% control drift, buildings+17.429812% and roads+17.050947%. Terrain has9.293739% drift and is excluded. Props-pools alone yields only+1.992836% while removing about381692.55 average submitted triangles. Hiding owners leaves their update callbacks running: those gains concern render-side sensitivity and cannot be cited as signal CPU attribution.

At interchange, the inventory reports2540LOD1 trees and no visible furniture. Its generic “trees” bucket includes other instanced meshes such as pools and lenses; its854616 triangles must not be labelled all foliage. Use accepted-source component masks and controlled reflection cadence to distinguish canopy overdraw/shading from other Props passes before choosing an optimization. Do not remove foliage, lower density or retessellate pools solely because their counts are high. Traffic is the largest remaining measured callback in the direct candidate trace (0.736333 ms mean,1.3ms p95), but that alone does not identify the whole-frame bottleneck.

Global visual ranks remain open in their existing order: city fabric; foliage; night depth; site integration; landmark grounds; environment/landscape; human activity; performance. This CPU change closes none of those quality findings.

## Inspection register

Every PNG below was viewed individually with its original sidecar; no contact sheet substituted for an original.

| Original | FPS | Draws | Triangles | Raw heap MB |
|---|---:|---:|---:|---:|
| `shots/democity/r8p-signal-key-final/bridge_12.png` |50.1|301|1583059|647.3|
| `shots/democity/r8p-signal-key-final/bridge_22.png` |39.9|294|1983739|493.3|
| `shots/democity/r8p-signal-key-final/downtown_12.png` |34|425|1892580|481.8|
| `shots/democity/r8p-signal-key-final/downtown_22.png` |57.2|410|2271574|489.8|
| `shots/democity/r8p-signal-key-final/industry_12.png` |58|204|1155506|479.7|
| `shots/democity/r8p-signal-key-final/industry_22.png` |60|202|1550180|637.6|
| `shots/democity/r8p-signal-key-final/interchange_12.png` |54.2|388|1812476|517.1|
| `shots/democity/r8p-signal-key-final/interchange_22.png` |58.7|400|2194778|657.6|
| `shots/democity/r8p-signal-key-final/night_downtown_12.png` |55.6|418|2460494|500.8|
| `shots/democity/r8p-signal-key-final/night_downtown_22.png` |57.9|343|2814092|672.4|
| `shots/democity/r8p-signal-key-final/park_12.png` |50.2|469|1822002|612.1|
| `shots/democity/r8p-signal-key-final/park_22.png` |50.9|443|2189364|536.9|
| `shots/democity/r8p-signal-key-final/riverfront_12.png` |57.5|246|1312596|622.7|
| `shots/democity/r8p-signal-key-final/riverfront_22.png` |59.5|212|1681158|614.5|
| `shots/democity/r8p-signal-key-final/suburb_12.png` |52.2|364|1756810|504.8|
| `shots/democity/r8p-signal-key-final/suburb_22.png` |58.2|329|2137674|484.6|
| `shots/democity/r8p-signal-key-controls/bridge_22_repeat1.png` |55|299|1983919|466.6|
| `shots/democity/r8p-signal-key-controls/downtown_12_repeat1.png` |54.5|425|1892940|692.9|
| `shots/democity/r8p-signal-key-candidate/interchange_22.png` |36.4|400|2194778|513.9|
| `shots/democity/r8p-signal-key-candidate/night_downtown_22.png` |29.2|343|2814092|641.1|
| `shots/democity/r8p-signal-key-candidate/park_22.png` |50.3|443|2189364|624.6|

Additional raw JSON records read and audited:

- `shots/democity/r8p-current-owner-profile/interchange22-module-static.json`
- `shots/democity/r8p-current-owner-profile/interchange22-paired.json`
- `shots/democity/r8p-current-owner-profile/interchange22-pools-paired.json`
- `shots/democity/r8p-current-owner-profile/park22.json`
- `shots/democity/r8p-current-owner-profile/props-visible/interchange_22.json`
- `shots/democity/r8p-current-owner-profile/props-visible/park_22.json`
- `shots/democity/r8p-signal-key-candidate/apicheck.json`
- `shots/democity/r8p-signal-key-candidate/interchange22-ab.json`
- `shots/democity/r8p-signal-key-candidate/interchange22-module-static.json`
- `shots/democity/r8p-signal-key-candidate/interchange22-moving-ab.json`
- `shots/democity/r8p-signal-key-candidate/matched-r8n-diff.json`
- `shots/democity/r8p-signal-key-candidate/restage-cycle.json`
- `shots/democity/r8p-signal-key-candidate/signal-key-contract.json`
- `shots/democity/r8p-signal-key-candidate/source/source-hashes.json`
- `shots/democity/r8p-signal-key-final/summary.json`

Verification tools inspected: `tools/traffic-signal-key-probe.mjs`, `tools/signal-key-ab-profile.mjs`, `tools/module-update-profile.mjs`, `tools/paired-owner-profile.mjs`.

Additional source evidence: `shots/democity/r8p-signal-key-candidate/source/source-hashes.json` and all four referenced JavaScript snapshots.

## Limits

- Independent review of supplied original images, sidecars, aggregate timing records, probe implementation and current source. No new browser captures, build, gameplay, save or live signal tests were run by this critic. Build163 is a builder result, not independently rerun.
- Profile JSON retains total/count and quantiles, not individual callback samples. Means, FPS arithmetic, run medians and deltas were independently recomputed; within-run p95 values cannot be reconstructed from absent samples. Timings near 0.1 ms reflect timer granularity.
- The signal probe samples 16 hour values between 0 and 1.2, twice, on one189-signal layout. It does not cover every topology, edit event, clock boundary or hash collision. Lens buffer hashes prove deterministic changes and instance presence, not an independent expected color for each lens or exact legacy/candidate color equality.
- The defensive-copy probe mutates traffic.signals()[0].greenArms, then checks signalState. It directly verifies no leaked mutation through signals(), while source inspection verifies signalState also uses slice().
- The 32-bit aggregate hash is not collision-proof and omits node IDs. No collision failure is observed. Existing Props rebuild and deserialize paths force lens refresh; topology mutation is not specifically tested by this probe.
- The supplied reconstructed pre-R8p/current source snapshots differ only by the13-line Traffic block and one Props line. All four hashes and byte lengths verify, and current snapshots equal production. This checks the reconstruction and exact bounded diff; it is not independent historical provenance of a contemporaneous pre-change snapshot.
- Public API double-deserialize verifies selected census equality, and restage compares selected building/service/transit fields. Neither is a byte-exact whole-save or arbitrary gameplay determinism proof.
- Owner visibility masks leave update callbacks running and alter reflections/render work. Their FPS deltas are sensitivity evidence, not pure GPU timings or additive costs. The Props visible inventory classifies every instanced mesh as trees, including lenses/pools; its total is not a tree-only triangle count.
- Fresh-page A/B runs are interleaved but use short samples and show host/run-order drift. Static and moving whole-frame FPS disagree; repeat screenshots do not cancel original low samples. No sustained 50FPS gate pass is granted.
- Raw endpoint heap is not forced-GC retained heap or measured allocation rate. Removing explicit public return-object/array copies does not prove literally zero JavaScript allocations, including engine iterator behavior.
- No fresh full32-frame day/night/weather whole-game matrix, eight-reference recalibration or blind A/B judging. Existing6.0 FAIL and visual ranking remain unchanged. No gameplay improvement is claimed.
