# Democity r5n rejected terrain LOD experiment — 2026-09-08

## Question

The stable r5j aerial-night main pass attributed 695,017 triangles and 117 draws to terrain. The existing terrain renderer already owns deterministic 128 m chunks with three render LODs, so this experiment tested its public debug scale before changing production thresholds.

## Evidence

`shots/democity/r5n/terrain-effects-profile.json` is a three-page Chrome Metal diagnostic at the identical frozen aerial-night scene. All pages sampled 40 rendered frames with zero runtime and browser errors.

| Terrain LOD scale | Peak draws | Peak triangles | Change from baseline |
| --- | ---: | ---: | ---: |
| existing high (0.8) | 623 | 3,238,326 | — |
| 0.7 | 623 | 3,220,278 | -18,048 triangles |
| 0.6 | 622 | 3,200,054 | -1 draw, -38,272 triangles |

Hiding effects independently produced no own geometry in that pass. The terrain attribution includes material/shadow work whose triangle cost does not fall proportionally with a small distance-threshold adjustment.

## Decision

Reject without production source changes. The tested threshold reductions save at most 1.18% of the pass and do not materially change draw cost; lowering terrain detail further would spend visible ground and shadow fidelity without addressing the 3M/50fps gate. Terrain height, road/lot/service exclusions, seed restoration and existing LOD contract remain unchanged.
