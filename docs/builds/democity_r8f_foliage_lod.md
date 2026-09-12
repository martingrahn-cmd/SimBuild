# Democity r8f — foliage LOD distribution and far-silhouette variation

## Bounded change

The independent whole-game review identifies large isolated leaf fans in the park/riverfront and repeated conifer cutouts on the hillside. Fresh profiling shows that the park camera renders 160 LOD1 trees and 2,175 existing distance impostors; waterfront renders 18 LOD0, 135 LOD1 and 546 impostors.

r8f keeps the existing props owner, chunks, species shapes, tints, wind, shadows, LOD distances and top-down rules. LOD1 redistributes nearly the same projected leaf area from 40 large 1.90-unit cards to 72 smaller 1.42-unit cards. Its canonical geometry rises from 104 to 168 triangles per tree. The five unused atlas cells now hold a second deterministic side silhouette for each of the five impostor classes; a stable coordinate-derived instance bit selects the variant. Top-down cells and behavior are unchanged.

## Rejected experiments

- A 48-card bowed variant was visibly too close to the baseline for its cost and was superseded before verification.
- Opaque tetrahedral crown lobes produced black angular clusters and were reverted immediately.
- Camera-facing impostor normals made waterfront vegetation unnaturally bright yellow-green and were reverted immediately.

The failed evidence remains in `shots/democity/r8f-foliage-candidate`, `r8f-foliage-lobes` and `r8f-foliage-normals`.

## Verification

- Production build passes 163 modules.
- The final 16-frame 1920×1080 High/Metal matrix is 16/16 ready with zero errors: 473 maximum draws, 2,264,008 maximum triangles and 47.7 minimum sampled fps. The 50fps gate remains failed.
- All 16 final frames plus directed park day/night, waterfront and aerial captures were inspected. LOD1 leaf fans are smaller, far stands have two silhouettes per class, species colour remains visible, and no new seam or lighting defect was found.
- The directed park crop changes 1.91311% normalized MAE from the production baseline. The silhouette-variant step alone changes the full park frame by 0.47178%. A top-down aerial repeat across that step changes only 0.003936%, with identical 430 draws and 2,053,764 triangles.
- Main-pass tree profiling measures park `0/160/2175` and waterfront `18/135/546` for LOD0/LOD1/impostor. The park LOD1 cost is +10,240 triangles; distance impostors stay at four triangles each.
- Public API, double deserialize, all eight tour stops and exact 1337→7→1337→7 authored restage pass with zero errors and unchanged city counts/coverage.
- A fresh-process park repeat differs by 888 pixels and 0.000854% normalized MAE; no exact-pixel claim is made.

Evidence: `shots/democity/r8f-foliage-baseline`, `r8f-foliage-variants`, `r8f-foliage-final` and `r8f-foliage-final/profiles`.

## Decision

Accept r8f. It repairs the measured leaf-card scale and repeated distance-silhouette defects inside the real props owner without altering game state, LOD boundaries, top-down volume or the maximum composed geometry/draw budget. Democity and whole-game remain 6.0 FAIL because the park is still sparse, distance impostors remain planar by design, night depth and ground contact remain weak, city scale fails and the 50fps gate still fails.
