# Democity r8h — independent foliage review

**ACCEPT the bounded candidate. Score remains 6.0/10; whole-game FAIL remains against 8.5.** Moving part of the LOD1 foliage into the crown gives a small visible improvement in central leaf overlap. It does not resolve planar foliage or move the complete image into a higher score band.

All **21 original PNGs** were inspected individually: two baseline, three directed candidate and sixteen final standard frames. I also inspected both comparison images, all three crops and the contact sheet, every image sidecar, the summary, tree-distance diagnosis, both profiles and all three contract reports. I read the requested r8f reports, whole-game r2 review and current tree source. Reference calibration comes from the preceding eight-reference whole-game review; no new reference inspection or live capture is claimed here.

## Visual result

The park crop around the light-green cluster left of the arena and the orange/green group beside the road shows slightly more central overlap, with fewer completely empty core patches. The riverfront foreground pair has a similarly more connected interior. The improvement is small, but visible in the original images as well as the crops. Some outer gaps move or widen: this is redistribution, not added foliage. Overall crowns remain airy, species colours remain distinct, and I do not see a new opaque black core, conspicuously shrunken envelope or increased repeated silhouette that outweighs the benefit.

The dominant limitations survive: visible flat leaf lobes, exposed stems, sparse conifer branches and far conifers resembling cut-outs. Park morning and evening keep those defects clearly visible; night collapses many clusters into dark separated shapes. The final downtown, suburb and industry frames retain coherent trees and lighting without an obvious new colour or material seam. These stills cannot establish temporal stability, wind quality, rotation-wide opacity or absence of LOD popping.

## What the source and profiles establish

The canonical LOD1 geometry retains 72 two-triangle cards plus a 24-triangle stem: **168 triangles per tree**. The first 24 cards use an inner radial distribution and the other 48 an outer distribution. LOD0 retains its 230-card path; materials, impostor implementation and LOD selection are outside the stated change. The edit consumes the existing radial random draw rather than adding another world-generation RNG operation. It does not add a game-state mutation path.

“Outer shell retained” is not “48 outer vertices unchanged”: their current distribution is `0.46 + 0.54 × radial^0.42`. Radial distance also enters the existing per-vertex AO formula, so local shading can change despite unchanged materials. Those consequences are consistent with the observed inward overlap.

The distance diagnosis places the nearest park tree centre at 70.855 m, while its measured rendered tiers are 0 LOD0 / 160 LOD1 / 2,175 impostors. Riverfront is 18 / 135 / 546. The current profiles reproduce those tiers; LOD1 totals are 26,880 and 22,680 triangles. Profile category totals independently sum to their reported visible-triangle totals. The 12-triangle ground foliage batch is not an extra tree LOD. These are visible/submitted tier counts, not the 3,022-tree world census.

One qualification is material: `chunks.js` forces top-down rendering to LOD1. Leaving that rule unchanged does **not** establish unchanged top-down imagery when LOD1 geometry changes. No fresh top-down pair is supplied for r8h. The prior r8f aerial result tested a different step and cannot certify this one.

## State and contract evidence

The supplied API report has all expected methods, two successful deserializations, eight successful tour stops and 612 buildings retained. The mixed-use report retains 32 selected records and its three stored digests independently compare equal. That harness still ignores restore return values and does not perturb state first, so matching digests alone are not universal restore proof.

Both stored seed-cycle comparisons independently match: original→restored 1337 and first→second 7. Their digest contains **buildings, services and transit**; it is not an exhaustive world/props serialization comparison. The source scope and bounded reports support no introduced gameplay-state mutation, but I do not certify all world state or pixel determinism. Build success with 163 modules is builder-reported, not re-executed by this critic.

## Sidecars and performance

All 21 original-image sidecars are `ok`, have zero errors and show all sixteen modules ready. Every final summary row was recomputed against its sidecar. Existing deferred-props and missing-reserved-university warnings remain disclosed.

| Final 16-frame matrix | Value | Frame |
| --- | ---: | --- |
| Maximum draws | 469 | park_12 |
| Maximum triangles | 2,264,630 | downtown_22 |
| Minimum FPS | 46.2 | downtown_17p5 |
| Below 50 FPS | 9/16 | matrix |
| Maximum raw heap | 689.7 MB | suburb_12 |
| Maximum module endpoint | traffic 2.2 ms | park_17p5 |

Geometry passes 1,500 draws/3 million triangles in this evidence set. FPS remains below target; five matrix samples exceed 512 MB raw heap. No forced-GC retained-memory measurement or leak claim is made. The 2.2 ms traffic endpoint exceeds the 2 ms module target at that instant, without proving a sustained or foliage-caused regression.

Directed park baseline/candidate counters are exactly 469 draws and 1,816,782 triangles, with 48.5→48.1 FPS. Riverfront is 246→241 draws, 1,307,400→1,305,872 triangles and 59.5→51.5 FPS; changed submitted totals do not imply the tree geometry became cheaper. Independent profiling windows record 38.6 FPS in park and 42.6 in riverfront; they are retained as separate instrumented samples, not substituted for matrix timing. Host conditions and short samples prevent causal performance claims.

The 2.264-million maximum is not proof that the earlier whole-game 2.809-million close-night maximum disappeared: **night_downtown is absent from this four-camera final matrix**. This assignment is a bounded review, not whole-game performance recertification.

## Retained ranking

1. **Sparse and repeated city fabric remains dominant** — owner: democity; supporting owners: zoning, buildings, roads, services. Downtown towers still stand on broad lawns and repeated parcels; the foliage change does not close whole-game r2 rank 1.

2. **Crown cores improve slightly, but planar foliage and tier mismatch remain** — owner: props; supporting owners: terrain, democity. Interior leaf overlap is more coherent in directed park/riverfront comparisons. Exposed sticks, separated flat lobes and opaque distant conifers remain obvious. No clear increase in silhouette repetition or unacceptable solid opacity was observed. The former foliage issue is partially improved, not closed.

3. **Night depth and lighting cohesion remain weak** — owner: cross-cutting; supporting owners: buildings, props, services, effects. Dark leaf clusters, shallow window grids and regular lamp pools still dominate. Candidate park night is readable but does not establish a night-quality breakthrough.

4. **Road grades and site boundaries remain abrupt** — owner: cross-cutting; supporting owners: terrain, roads, democity, buildings, services. Opposite-bank ramps and flat service pads remain visibly schematic; no new numeric grade/collision failure is invented.

5. **Landmarks lack convincing site detail and use** — owner: cross-cutting; supporting owners: democity, services, buildings, props. The repaired stadium/hospital/water-tower silhouettes remain, but blank grounds and simple site materials are still conspicuous.

6. **Terrain and water still read as separate graphic layers** — owner: cross-cutting; supporting owners: terrain, environment, effects. Stippled industrial slopes and broad cloud reflections remain. Weather quality and the earlier horizon issue are carried as prior ranking context, not freshly weather-tested here.

7. **Limited visible human use remains a presentation issue** — owner: cross-cutting; supporting owners: democity, traffic, transit, simulation. Cars and buses are present; quiet park grounds still read as an asset layout. Paused stills do not prove flow, boarding, enjoyable gameplay or their failure.

8. **Local FPS, raw memory and an update endpoint remain outside targets** — owner: cross-cutting; supporting owners: core, props, traffic, environment, effects. Nine of sixteen standard frames below 50 FPS, minimum 46.2; raw heap peaks 689.7 MB (five matrix frames above 512). Traffic endpoint reaches 2.2 ms. Geometry fits. These do not establish candidate-caused regression or a retained leak.

The supplied matrix covers downtown, suburb, industry and park at 06:30, noon, 17:30 and 22:00, plus directed riverfront noon. It does not freshly test close-night, interchange, bridge, top-down, weather, 720p or ordinary interactive play. The candidate earns acceptance for a modest local visual gain at unchanged canonical geometry cost. Foliage remains rank 2, the primary city-fabric issue remains rank 1, and the honest whole-game score remains 6.0 FAIL. Only these two critic reports were written.
