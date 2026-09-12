# Democity R8z — LOD1 primary branches rejected

## Decision

**Reject the candidate and retain accepted R8h tree source exactly. No product or score change.** Three low-poly primary branches are technically visible in LOD1, but the change is too small in the complete park and riverfront frames to justify its geometry cost. Democity and whole-game remain 6.0/10 FAIL.

## Bounded candidate

Current LOD1 has a three-ring stem and 72 leaf cards but no branch whorl. The disposable R8z source gives only LOD1 one whorl at normalized height0.42. Existing skeleton rules produce three primary branches with three longitudinal segments and four sides each.

The candidate preserves tree records, placement, eight species, material, atlas, 72 leaf cards, LOD thresholds, chunks, wind and the separate `skel1`/`can1` RNG forks. It changes canonical LOD1 geometry from308 vertices/168 triangles to368 vertices/240 triangles per submitted tree. Product `src/modules/props/trees.js` remains SHA256 `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17`; the disposable candidate hashes to `7a5e6155c8872fb0408d9911f0bb88a8e02a415b6a7112737156e34ee2bbdce6`.

## Evidence

All six valid 1920×1080 actual-Chrome Metal pages are ready with zero browser/simulation errors:

| View | Accepted draws / tris / fps | Candidate draws / tris / fps | Triangle delta |
|---|---:|---:|---:|
| Park noon |335 /1,344,979 /46.8|335 /1,356,499 /45.7|+11,520|
| Park 22:00 |314 /1,715,331 /46.9|314 /1,726,851 /49.5|+11,520|
| Riverfront noon |204 /1,154,224 /53.6|204 /1,182,736 /50.6|+28,512|

Park keeps0 LOD0/160 LOD1/2,175 impostors; riverfront keeps18/135/546. The park delta is exactly160×72 triangles. The larger riverfront submission delta includes the active render/reflection composition and must not be inferred from the visible135 LOD1 count alone. Short sampled FPS and raw heap move in both directions and are not performance evidence.

All six originals and the three crop pairs were inspected. Branches can be found around some exposed trunks, especially in the foreground riverfront trees, but they do not materially repair the flat separated leaf clusters, cut-out distant conifers, sparse park composition or dark night crowns. Full-frame normalized MAE is0.000190549/0.000243906/0.0000600585 for park noon/night and riverfront noon; separate fresh pages include moving traffic, so those values show changed frames rather than isolated foliage quality.

## Tooling correction

The first routed attempt served raw `trees.js`, leaving the bare `three` import unresolved and omitting Props. Its six frames were invalid and were overwritten. The final tool uses `route.fetch()` so Vite resolves package imports before the single whorl marker is replaced. All accepted and candidate sidecars then contain the Props API, expected LOD census and zero errors.

## Limits and next direction

This rejects one sparse branch-whorl geometry, not every branch treatment. It does not test impostor atlas shape, placement distribution or a coupled leaf/branch redesign. No product build, API/restore contract, full matrix, independent critic or save test is required for a candidate that does not advance. The unchanged accepted source remains the only product state.

Evidence: `shots/democity/r8z-lod1-branches/`, `tools/lod1-branch-visual.mjs`.
