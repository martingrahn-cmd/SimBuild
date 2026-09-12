# Democity r8h — LOD1 crown-core distribution

**Decision: accepted as a bounded foliage improvement. Democity and whole-game remain 6.0/10 FAIL.**

## Diagnosis

The r8f change reduced individual LOD1 card size and varied distant silhouettes, but the fresh whole-game critic still found sparse flat lobes on exposed trunks in the park. A new read-only camera/profile run finds 3,022 real tree records. At the elevated park camera, the nearest tree centre is about 70.9 m away and none is inside the 60 m LOD0 threshold; the visible tiers are `LOD0/LOD1/impostor = 0/160/2175`. The riverfront camera uses `18/135/546`.

LOD1 already stays at 72 cards and 168 triangles per tree. Its radial rule placed every card centre in the outer 40% of the canonical crown and biased most even farther outward. That produces a readable outer silhouette but leaves an empty core around the three-ring trunk.

## Bounded change

r8h preserves the props owner, real tree records, eight species, tints, wind, materials, shadows, 256 m chunks, distance thresholds, cross-fade, caps and impostor atlas. It keeps exactly 72 LOD1 leaf cards and 168 triangles per tree. The first 24 cards now occupy a deterministic inner radial band; the remaining 48 keep a deterministic outer shell. Existing random orientations provide depth cues in both layers.

This is not a new tree population or decorative showcase layer. It does not change simulation, placement, service coverage or save payloads. Top-down rendering still chooses LOD1, so moving LOD1 cards can change the top-down image even though the tier rule is unchanged; this round does not claim pixel-identical aerial output.

## Verification

- Production build passes with 163 transformed modules.
- The public Democity API, double module deserialize, all eight tour stops and invalid-stop rejection pass with zero errors. Counts remain 468 road nodes, 604 edges, 9,964 cells, 612 lots/buildings, 31 services and one eight-stop line.
- The mixed-use whole-save digest remains exact twice for all 32 selected lots, their owner building plans and live lot links.
- The existing authored restage digest repeats for seed 1337 and seed 7. That digest covers buildings, services and Transit; it is not a full-world or independent props-state proof.
- Park and riverfront owner profiles retain `0/160/2175` and `18/135/546`. LOD1 remains 308 vertices / 168 triangles per tree.
- All 16 standard 1920×1080 High/Metal images are ready and zero-error. They peak at 469 draws and 2,264,630 triangles. Minimum sampled FPS is 46.2 and 9/16 frames are below 50, so the performance gate stays failed. Maximum raw endpoint heap is 689.7 MB and is not a retained-memory or leak measurement. `park_17p5` records a 2.2 ms traffic endpoint; this is not caused by or attributed to the foliage geometry.
- All 21 original baseline, directed candidate and final matrix PNGs were independently inspected, together with six derived comparison/crop/contact images. The inner crown is modestly more continuous and no definite new opacity, lighting or silhouette defect appears in the supplied views.

Baseline-to-candidate whole-frame normalized mean absolute error is 0.006234 for park noon and 0.002076 for riverfront noon. Moving traffic and independently regenerated city details also contribute to those full-frame differences; they are evidence of a changed render, not an isolated foliage-quality score.

## Limits

The change improves the core of LOD1 crowns but does not repair distant planar impostors, repetitive hillside conifer distribution, sparse park placement, weak night foliage depth or the overall city fabric. No fresh aerial before/after pair, temporal LOD popping test, long-duration performance trace, full-world props restore proof or subjective playtest is supplied. Score remains 6.0/10 and whole-game rank 2 remains only partially addressed.

Evidence:

- `shots/democity/r8h-foliage-diagnosis/tree-distance.json`
- `shots/democity/r8h-foliage-baseline/`
- `shots/democity/r8h-foliage-candidate/`
- `shots/democity/r8h-foliage-final/`
- `docs/critic/democity_r8h.md`
- `docs/critic/democity_r8h.json`
