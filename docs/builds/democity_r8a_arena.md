# Democity r8a — real arena articulation

## Bounded change

The whole-game review's remaining first-ranked visual defect includes primitive Democity landmarks. The park camera makes the arena the dominant foreground landmark. Its prior geometry was a closed cylinder under a hemisphere, with seven dark entrance boxes; it read as a smooth mushroom rather than a civic venue.

The same authored `arena` landmark now builds a tapered lower bowl, open upper shell, flat panelled roof ring, outer roof edge, inner lip, visible field with markings, 20 facade piers, entrance bays and a canopy. The plan record, pose, footprint, terrain seating, chunk ownership and material contract are unchanged. This is normal Democity landmark geometry visible in every applicable camera, not a showcase-only object.

## Review iterations

The first generated candidate used a thick torus roof and was rejected after inspecting noon, golden-hour and night park frames: it read as a soft doughnut. A thinner torus still appeared to hover. Those images remain in `shots/democity/r8a-arena` as `park_12.png` through `park_12_v3.png`. The accepted v5 replaces the roof with a flat architectural ring, fascia, inner lip and radial panel seams; `park_12_v4.png` records the pre-seam step.

## Verification

- Production build passes 163 modules.
- Accepted `park_12_v5.png`, `park_22_final.png` and `interchange_12_final.png` were inspected at 1920x1080; all report zero errors. The arena remains legible at night and in the wide interchange composition.
- The directed 480×300 crop changes 7.7355% normalized MAE against the prior arena. Full park noon changes 0.6062%, which also includes accepted r7z distant service silhouettes and normal live-agent pose differences.
- The Democity-owned landmark pass remains eight draws and rises 3,600→4,076 triangles (+476). The exact serialized 13-landmark plan is unchanged.
- Park noon remains far below the 3M geometry gate at 1,801,028 peak triangles. The 48.8fps sample versus prior51.0 is not treated as a regression or a gain; the whole matrix50fps gate remains failed and timing varies between captures.
- Public Democity API, double deserialize and eight-stop tour pass with zero errors. Counts remain 468/604 road nodes/edges, 9,964 cells, 612 lots/buildings, 31 services and one eight-stop line.
- Exact 1337→7→1337→7 restage passes. Raw endpoint heaps remain variable and are not substituted for the accepted forced-GC memory evidence.

## Decision

Accept the final arena geometry. It replaces a measured foreground primitive with a recognizable open stadium for 476 landmark triangles, without changing authored state. Democity and whole-game remain 6.0 FAIL because the arena is still procedural, other landmarks remain simple, its surrounding site is sparse, and the independent scale, foliage, grounding, night-depth and50fps failures remain.
