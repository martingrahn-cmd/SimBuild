# Democity R8q — hidden Traffic fallback-mast update

**Candidate for independent acceptance at unchanged 6.0/10 — FAIL.** This round removes frame work for a renderer that is already hidden under Props signal ownership. It does not change the visible fallback path, signal state, simulation, scene geometry, save data or module ownership.

## Measured diagnosis

Post-R8p callback profiling left Traffic as the largest measured module callback at0.736333ms mean and1.3ms p95 over1,200 fixed-camera frames. A separate900-frame CPU/allocation sample attributes193,264 sampled microseconds and59,091,528 sampled bytes to `traffic/masts.js:updateMasts`.

Traffic builds its own fallback mast group for showcases or configurations without Props signals. In Democity, `mastGate()` hides that group because Props owns643 traffic-light records and its public `signalFor()` contract. Despite `m.g.visible === false`, the old path still recalculated and uploaded matrices and colors for2,067 hidden lenses on every frame.

## Bounded change

`updateMasts()` now returns after `mastGate()` and zero draw/triangle accounting when the Traffic fallback group is hidden. The one product-code line is:

```js
if(!m.g.visible)return;
```

When the fallback group is visible, the existing matrix, color, signal-aspect and shadow code runs unchanged. Source control flow makes a later visible frame enter that same update path, but this round does not exercise an actual hidden→visible runtime transition. No Props code, signal timing, Traffic simulation, RNG, geometry, material, persisted state or public API changes.

## Verification

- Production build passes with163 transformed modules; source and documentation diff checks pass.
- The six-run static interleaved legacy/candidate A/B removes only the early return in legacy pages. Median Traffic callback time falls0.885278→0.390278ms (−55.914653%); p95 falls1.3→0.7ms. Draw calls are exactly281 in all runs and average triangles differ only with the unmatched Traffic render phase. Median FPS moves−1.623463%, so no whole-frame improvement is claimed.
- The six-run moving-camera A/B records0.610000→0.272500ms (−55.327869%) and p951.3→0.7ms. Median FPS moves+3.646992%; the disagreement with the static series makes this supporting evidence rather than a general FPS claim.
- The direct1,200-frame candidate profile records Traffic at0.318333ms mean and0.7ms p95, versus the preceding accepted-source0.736333ms/1.3ms profile. The separate sampled attribution falls193,264→1,019 microseconds for `updateMasts`, and the prior59,091,528-byte sample no longer appears. Sampling is statistical and is not a retained-memory measurement.
- The dedicated gate probe shows that Democity's2,067 hidden lens instances keep matrix/color buffer versions unchanged for120 frozen frames. In the independent Traffic showcase, both legacy and candidate update all180 visible fallback lenses for120 frames; their stored32-bit matrix and color hashes are equal, with16 signals,55 measured draws,669,756 measured triangles and zero errors. The raw arrays were not persisted, so this is strong matching evidence rather than a critic-side byte comparison.
- Public Democity API, double deserialize and eight valid/one invalid tour calls pass. Exact authored 1337→7→1337→7 restage digests pass within the established selected-state probe scope.
- All16 final matrix originals were inspected. Every sidecar is ready with zero errors; the matrix records469 maximum draws,2,814,092 maximum triangles,54.4fps minimum and708.3MB maximum raw endpoint heap. Every camera/time draw/triangle pair exactly matches R8p. The good FPS sample does not erase prior low runs or establish sustained50fps; raw endpoint heap remains above the512MB gate and is not forced-GC retained memory.
- The directed Democity interchange and Traffic fallback originals were inspected. Visible fallback signal heads remain present in the Traffic image, and the Democity image shows no new missing scene content.

## Decision boundary

Accept only if independent review verifies the exact one-line scope, the hidden/visible gate contract, callback reduction, geometry equality and all supplied originals. Hold Democity and whole-game at6.0 FAIL. This round does not solve city fabric, foliage form, night composition, mountain art, human activity, sustained50fps or memory compliance.

## Evidence

- `shots/democity/r8q-hidden-masts/source/source-hashes.json`
- `shots/democity/r8q-runtime-attribution/interchange22-static.json`
- `shots/democity/r8q-hidden-masts/interchange22-attribution-candidate.json`
- `shots/democity/r8q-hidden-masts/interchange22-ab.json`
- `shots/democity/r8q-hidden-masts/interchange22-moving-ab.json`
- `shots/democity/r8q-hidden-masts/interchange22-module-static.json`
- `shots/democity/r8q-hidden-masts/mast-gate-contract.json`
- `shots/democity/r8q-hidden-masts/contract-api/apicheck.json`
- `shots/democity/r8q-hidden-masts/contract-restage/restage-cycle.json`
- `shots/democity/r8q-hidden-masts/traffic_fallback_22.png`
- `shots/democity/r8q-hidden-masts/democity_interchange_22.png`
- `shots/democity/r8q-hidden-masts-final/summary.json`
- `shots/democity/r8q-hidden-masts-final/audit-summary.json`
- `shots/democity/r8q-hidden-masts-final/r8p-geometry-compare.json`

## Limits

- Fresh-page timing shows host and run-order drift. The callback change is reproducible; total FPS is not certified by these short series.
- Chrome allocation sampling is probabilistic and does not prove a byte-exact allocation rate or retained heap reduction.
- CPU attribution is dominated by deliberate headless `readPixels` synchronization, so it cannot be used as a native interactive renderer timing or a reason to remove verifier readback.
- The visible fallback contract covers one16-signal Traffic showcase at22:00 for120 frozen frames and compares32-bit hashes rather than retained raw arrays. It does not test an actual hidden→visible transition, every topology or clock transition, although the visible code path is source-identical.
- Restage compares selected authored building/service/transit state, not a byte-exact arbitrary whole save.
- No fresh32-frame whole-game matrix, reference recalibration, blind A/B judging or subjective playtest was performed. Existing scores and global visual rankings remain unchanged.
