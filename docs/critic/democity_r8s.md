# Democity R8s — independent rejection and restoration audit

**Accept the rejection record and restoration. Reject the Lambert LOD1 candidate. Democity and whole-game remain 6.0/10 — FAIL.**

The candidate does not meet its targeted performance validation. The first series has a negative median and only one stable control cycle; the replication has a small positive median, two negative responses and one cycle outside the predefined drift limit. I independently verified those calculations and exact restoration of all three declared product files. No higher visual score or general FPS improvement is justified.

## Source restoration

All nine entries in `source/hashes.json` reproduce exactly. Current production files equal the supplied pre-candidate bytes:

| File | Restored SHA-256 |
|---|---|
| `src/modules/props/trees.js` | `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17` |
| `src/modules/props/chunks.js` | `123bd2b7d723899efcac8e882ad81e6a8f59efeb9efd60b4382c4d876c1ca3ba` |
| `src/modules/props/index.js` | `be80cb25874c65a14b90f50702ae2e544850ee430e7f6af7c7400e6062b2156b` |

The supplied corrected candidate diff added a separate `MeshLambertMaterial`, hooked the existing tree shader into it, bound it only to LOD1, and copied the accepted tree material’s time-dependent color. LOD0 and impostors retained their previous materials; geometry construction, LOD/culling rules and custom depth material were untouched. The candidate-local shader edit undefines `ENV_WORLDPOS` after the environment-map include before the shared fog declares it again. Every one of those candidate changes is absent from current production. Source whitespace checks pass.

This is an exact audit of the supplied pre/candidate snapshots and declared restored files, not a claim that the entire repository equals an old commit. The builder reports candidate and restored builds passing with163 modules; I did not rerun them.

## Recomputed A/B evidence

| Series | Candidate response median | Max control drift | Stable cycles | Median draw/triangle delta |
|---|---:|---:|---:|---|
| Initial,3 cycles ×180 frames |−0.261270%|8.347783%|1/3|−0.377778 /−1245.941667|
| Replication,5 cycles ×240 frames |+1.618821%|5.168269%|4/5|0 /0|

Initial cycle responses are−0.261270%,−1.055658%,+7.845658%; the only stable cycle is negative. Replication responses are−0.804520%,+7.777738%,+5.267543%,+1.618821%,−0.351987%. Its stable-only median is+0.633417%, but this is diagnostic information, not a replacement for the predefined all-cycle rule. Both files correctly remain `pass:false`.

I recalculated each adjacent legacy mean, candidate percentage, control drift, draw/triangle delta and median directly from the blocks. All arithmetic matches. Every block has2540 recorded visible LOD1 instances, matched frame/observation counts and zero errors. Overall inventory is51 meshes/2683 instances/450744 source triangles, including instances not locally visible. The replication’s later blocks have exactly281 draws and1800789.875 average triangles; earlier blocks vary with scene/render phase. Equal later counts make the comparison cleaner but do not rescue the failed timing gate.

The test changes only the material pointer for the selected LOD1 set, compares Standard versus Lambert with the same map, alphaTest0.45 and double-sided setting, and restores original pointers in `finally`. Its `sameGeometry:true` flag is asserted by implementation rather than measured from hashes. The source supports that bounded scope, but it is not a full shader/geometry/state contract. Adjacent pairs share controls; two post-swap frames and the initial warmup do not prove identical compilation/cache conditions. Raw elapsed/frame samples are not persisted, so original FPS cannot be independently reconstructed beyond pairing the stored values.

## Original images and shader failure

All four R8s originals were individually inspected; the accepted R8q interchange12 original was additionally reopened for comparison.

| Original | Time | Errors | FPS | Draws | Triangles | Raw heap MB |
|---|---:|---:|---:|---:|---:|---:|
| `shots/democity/r8s-lod1-material/smoke.png` |12|2|57.3|388|1812476|511.9|
| `shots/democity/r8s-lod1-material/smoke-toon.png` |12|0|47.5|388|1812476|512.3|
| `shots/democity/r8s-lod1-material/smoke-lambert.png` |12|0|49.4|388|1812476|549.8|
| `shots/democity/r8s-lod1-material/restored-smoke.png` |22|0|53.7|400|2194778|477.8|

`smoke.png` has conspicuously absent vegetation and `ok:false`. Its sidecar retains a Lambert fragment compilation failure: `ENV_WORLDPOS` macro redefinition, followed by invalid `useProgram`. All modules being ready and unchanged triangle counters do not make that image valid. Its57.3FPS must not be used as a successful optimization result.

`smoke-toon.png` visibly brightens foliage and makes the scattered crowns read flatter in this view. Abandoning it is justified, but one daytime view does not establish a comprehensive Toon comparison. The exact Toon intermediate source is not archived separately.

`smoke-lambert.png` restores vegetation and reports zero errors after the local macro repair. It is closer to the accepted Standard image than Toon, with material differences still visible; no full visual equivalence, crown-depth improvement or nighttime quality claim follows from this one view. Rejection does not require inventing a universal visual failure when its targeted performance validation already fails.

`restored-smoke.png` has the accepted night scene, zero errors and53.7FPS /400 draws /2194778 triangles. The two known Democity startup/site warnings remain. This verifies a clean sampled restored render, not sustained FPS or a memory pass. Daytime candidate49.4FPS, Toon47.5FPS and differing raw heap endpoints are finite unpaired samples; no causal performance conclusion is drawn from them.

## Appropriate stopping boundary

A full16-view matrix, API/restage suite or forced-GC run is not necessary to accept this rejection: the targeted experiment failed, the three declared rendering files are restored byte-for-byte, and a clean restored smoke plus builder build record exist. Such omissions would block acceptance of the candidate; they do not require retaining or expanding a rejected experiment. No omitted gate is marked passed.

The retained A/B tool deliberately requires Lambert LOD1 meshes and will fail its inventory match on restored Standard production. It is an experiment-specific verifier, not a current-production test. Future use must deliberately recreate and revalidate a candidate; its failure now is expected.

Retain accepted Standard foliage. R8r’s whole-mesh gain measures combined mesh work and must not be presented as evidence for a successful cheaper color shader. Further optimization should follow owner-local attribution of remaining raster/submission/geometry/shadow costs or another separately justified hypothesis. This result does not prove all LOD1 shading improvements impossible. Global city-fabric rank1 and all other visual, gameplay, sustained-performance and memory limitations remain open.

## Evidence and limitations

Read: the builder report; both A/B JSONs; all four PNGs and sidecars; all six pre/candidate JavaScript snapshots; the hash manifest; all three restored production files; `tools/lod1-material-ab-profile.mjs`; and the accepted R8q daytime comparison original. No product, STATUS or HANDOFF edits were made.

- Independent reading of both A/B records, all four originals and sidecars, supplied pre/candidate source, current restored files and tool implementation. No new browser captures, timed runs, build or live API/gameplay tests were run by this critic. Candidate/restored 163-module build passes are builder results.
- No full visual matrix or reference/blind recalibration. Toon is visibly brighter/flatter in the supplied directed view, but one view does not establish behavior everywhere. Corrected Lambert is recognizable and closer to the accepted image; it has no independently established broad visual improvement or regression-free contract. Rejection rests primarily on failed targeted performance validation.
- The initial shader failure is real and its screenshot is invalid evidence for rendering quality/performance acceptance. All modules reporting ready does not override the two shader/useProgram errors or visibly missing trees. Corrected Lambert later compiles in its supplied smoke; the initial failure is not misrepresented as persisting in that later candidate.
- The source archive retains corrected Lambert and pre-state snapshots, not separate exact failed-Lambert/Toon intermediate source trees. Their compile/visual evidence is retained, but exact historical intermediate code attribution is limited to the builder record and error log.
- Interleaved block comparisons use neighboring shared controls, are correlated, short and not randomized. Per-block elapsed times and raw frame samples are absent, so pairing arithmetic can be reproduced but original FPS cannot be independently reconstructed. Failed stability filters stay failed; stable-only medians are diagnostic and cannot replace predefined all-cycle results.
- The tool changes only material pointers on the selected LOD1 mesh set and restores them in finally. Its sameGeometry flag is hardcoded, not a measured digest; inspected source supports identical geometry and alpha/map checks, but the record is not a full geometry/shadow/wind/save contract. Inventory contains51 meshes/2683 instances overall, while all recorded blocks have2540 locally visible instances.
- Legacy material lookup chooses the first matching Standard material with alphaTest0.45 and the same map; it does not independently assert a single legacy material identity. It agrees with the inspected accepted tree material in this source. New layouts/materials would require revalidation.
- Two frames follow each pointer swap; the shared initial warmup is primarily on candidate material. Shader compilation/cache effects and live Traffic/render cadence may contaminate early blocks. The later replication has exact later draw/triangle counts but remains an unstable timing result.
- The retained A/B tool intentionally depends on temporary Lambert LOD1 inventory and cannot run unchanged on restored Standard production. This is an experiment-specific tool limitation, not a product regression.
- Current trees.js/chunks.js/index.js match supplied pre-state byte-for-byte and all9 hash manifest entries verify. This establishes restoration of the three declared product files, not a full-repository historical provenance audit or a guarantee against unrelated concurrent changes.
- No full matrix, API/restage or forced-GC rerun is required to accept rejection of an already reverted rendering-only experiment when exact source restoration and a clean restored smoke are available. Their omission is appropriate here, not evidence that those acceptance gates passed for the rejected candidate.
- Raw heap endpoints and short synchronized FPS are not retained-memory or sustained50FPS measurements. Previous visual/gameplay/memory/performance limits remain. No visual score increase, overall FPS gain, or claim that all LOD1 shading optimizations are impossible is warranted.
