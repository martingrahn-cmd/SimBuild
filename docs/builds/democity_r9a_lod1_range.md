# Democity R9a — bounded Props LOD1 range

**Local decision: accept the 175 m → 205 m LOD1 range change for independent review. Democity remains 6.0/10 FAIL.**

## Diagnosis and selection

R8z showed that adding branch geometry to every LOD1 tree produced too little visible return. R9a instead asks whether the already accepted 308-vertex / 168-triangle LOD1 crown can replace the closest planar impostors without changing records, placement, materials, geometry, atlas ownership or simulation.

`tools/lod1-range-census.mjs` routes only Vite's transformed `src/modules/props/chunks.js` on disposable actual-Chrome/Metal pages. It samples 175, 190, 205 and 220 m at the accepted park, riverfront and aerial cameras. All 12 pages are ready with a real Props API and zero engine/browser errors.

| Range | Park LOD0/LOD1/impostor | Riverfront LOD0/LOD1/impostor | Aerial LOD0/LOD1/impostor |
|---:|---:|---:|---:|
| 175 m | 0 / 160 / 2,175 | 18 / 135 / 546 | 0 / 1,939 / 0 |
| 190 m | 0 / 178 / 2,158 | 18 / 156 / 533 | 0 / 1,939 / 0 |
| 205 m | 0 / 204 / 2,127 | 18 / 179 / 507 | 0 / 1,939 / 0 |
| 220 m | 0 / 223 / 2,106 | 18 / 200 / 477 | 0 / 1,939 / 0 |

The 205 m option is the bounded midpoint advanced to visual evidence. It adds 44 submitted LOD1 histogram entries in both directed non-top-down views and remains below the existing normal-tier selection guard `CAP1 = 520`. Histogram entries include complementary fade-hidden copies, so this does not prove that exactly 44 distinct visible trees changed tier. The aerial camera is unchanged across every tested range because the established top-down path already forces LOD1 and bypasses the normal range boundary.

## Product change

One Props-owned constant changes in `src/modules/props/chunks.js`:

```js
const LOD0_R = 60, LOD1_R = 205, BAND = 12;
```

Accepted-source SHA256 was `123bd2b7d723899efcac8e882ad81e6a8f59efeb9efd60b4382c4d876c1ca3ba`. The installed source SHA256 is the pre-reviewed candidate `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`.

This changes only the normal-camera distance at which an existing sub-bucket selects the existing LOD1 mesh instead of the existing impostor. `LOD0_R`, the deterministic ±12 m transition half-width (a 24 m interval), `CAP0`, `CAP1`, top-down behavior, shadow range, all geometry/material/atlas construction, tree records, world placement, chunks, owner API, saves and RNG remain unchanged. `CAP1` guards normal tier-1 selection; it is not an unconditional global ceiling because top-down and LOD0 transition copies bypass that check.

## Directed visual evidence

`tools/lod1-range-visual.mjs` captured eight fresh 1920×1080 High/Metal originals: accepted and candidate park/riverfront at noon and 22:00. Every sidecar reports ready, all 16 modules ready and zero engine/browser errors. All eight originals and four side-by-side crop pairs were inspected.

At noon the 205 m park view clearly replaces flat, sparse impostor silhouettes around the arena and right park edge with the accepted multi-card crowns. The riverfront change is smaller and occurs mainly at the near-left and far-right vegetation edges. At night the difference is visible but weaker; the broader dark-crown problem remains. No new definite opacity wall, silhouette break, lighting discontinuity or missing scene content appears in these views.

| View | Accepted → candidate LOD1 | Accepted → candidate impostor | Submitted triangles | Draws |
|---|---:|---:|---:|---:|
| Park 12 | 160 → 204 | 2,175 → 2,127 | 1,344,979 → 1,351,071 (+6,092) | 335 → 334 |
| Park 22 | 160 → 204 | 2,175 → 2,127 | 1,715,331 → 1,721,423 (+6,092) | 314 → 313 |
| Riverfront 12 | 135 → 179 | 546 → 507 | 1,154,224 → 1,165,956 (+11,732) | 204 → 203 |
| Riverfront 22 | 135 → 179 | 546 → 507 | 1,532,706 → 1,544,438 (+11,732) | 180 → 179 |

Full-frame normalized RGB MAE is 0.00618250 / 0.00193122 for park noon/night and 0.00177314 / 0.00067845 for riverfront noon/night. Fresh-page traffic and frame state also contribute, so these are change magnitudes rather than foliage-only attribution or quality scores. Single-page FPS and raw heap differences are likewise not used as causal evidence.

## Product verification

- Production build passes with 163 transformed modules.
- Public Democity API, double deserialize, all eight tour stops and invalid-stop rejection pass with zero browser/engine errors. Counts remain 468 road nodes, 604 edges, 9,964 cells, 612 lots/buildings, 31 services and one eight-stop Transit line.
- Exact authored 1337→7→1337→7 restage passes for both repeated seeds within the established building/service/Transit digest. Its raw heap endpoints rise 481.1 → 899.4 → 931.7 → 1,024.8 MB; this remains a failed and volatile project gate.
- Both full-save restores preserve all 32 mixed-use building-owner records, live lot links, IDs and plans exactly.
- All 16 final standard 1920×1080 High/Metal originals are ready and zero-error. They peak at **468 draws / 2,275,778 triangles / 730.2 MB raw heap** and bottom at **49.5 FPS**. One of 16 frames is below 50 FPS, so the strict sustained-performance and memory gates still fail.
- All 16 final originals were individually inspected. The broader sparse fabric, repeated forms, flat distant foliage, weak night vegetation and existing terrain/material limitations remain visible.

## Limits

R9a improves only the nearest part of the impostor transition. The directed park view still contains 2,127 impostors, so it does not repair distant planar foliage or rank 2 as a whole. No temporal boundary traversal, multi-seed/species LOD census, weather matrix, forced-GC retained-memory run, long-duration timing trace, fresh CS2 calibration, blind comparison or subjective playtest is supplied. The normal-tier 520-instance guard and deterministic 24 m transition interval remain, but motion across the new 205 m boundary has not been visually judged.

The 50 FPS and 512 MB gates remain failed, and no critic score increase is requested.

Evidence:

- `shots/democity/r9a-lod1-range/census.json`
- `shots/democity/r9a-lod1-range/visual-summary.json`
- `shots/democity/r9a-lod1-range/comparison-metrics.json`
- `shots/democity/r9a-lod1-range/accepted_*.png`
- `shots/democity/r9a-lod1-range/candidate_*.png`
- `shots/democity/r9a-lod1-range/*_crop_pair.png`
- `shots/democity/r9a-lod1-range/contracts/`
- `shots/democity/r9a-lod1-range/restage/restage-cycle.json`
- `shots/democity/r9a-lod1-range/final-matrix/`
