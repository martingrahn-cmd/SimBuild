# Democity r5t city-scale and district census — 2026-09-08

This is an evidence and tooling round, not a production city change. It adds
`tools/democity-cityscale-probe.mjs`, which opens the real staged city through
the public runtime and records roads, zoned cells, lots, actual occupied lots,
building type/density, and the plan district that owns each building and lot.
It runs at both required seeds and does not mutate world state.

## Verified evidence

`shots/democity/r5t/cityscale.json` is zero-error for both seeds and passes its
ownership invariant: every existing lot is occupied by one real building and
there are no free lots to grow into.

| Seed | zoned cells | lots / occupied | buildings | unassigned buildings |
| --- | ---: | ---: | ---: | ---: |
| 1337 | 9,964 | 612 / 612 | 612 | 202 |
| 7 | 10,113 | 648 / 648 | 648 | 209 |

The staged city remains below the documented 11,000-cell, 1,400-lot and
1,200-building scale gates. The unassigned buildings span the whole outer
ring, not one discrete missing district: seed 1337 spans x −917.68..930.27 m
and z −888..938.32 m; seed 7 spans x −930.32..921.55 m and z
−884..938.32 m. Adding a huge fallback district rectangle would classify open
land rather than create a distinct built district, so that candidate is
rejected as a label-only solution.

The zoning owner still enforces its documented real lot dimensions: 16–32 m
frontage and 24–32 m depth. Reducing those values to create counts would break
that contract. Every available real lot is already built, so a genuine scale
increase requires additional valid street frontage and a concurrent measured
whole-scene render budget solution. The accepted r5j baseline still has a
3.909M-triangle peak and 33.5 minimum fps, outside the 3M/50fps gate; adding
building mass before resolving that bottleneck would make the known failure
worse.

`shots/democity/r5t/aerial_12.png` was inspected. It is a zero-error 1080p
Metal capture at 635 draws, 2,848,916 triangles and 35.2 fps. It confirms a
real, built central cluster and exposes the remaining grid repetition and
outer-ring district-grain weakness. `npm run build` passes all 163 modules.

No critic score changes: Democity remains **6.0 FAIL**. The next bounded
investigation remains the buildings owner's visible LOD1 geometry, which is
the last measured 562,080-triangle main-pass contribution after the rejected
LOD2 colour experiment. Any candidate must retain atlas-backed facades,
deterministic plans, real shadows, persistence and the current central-city
silhouette.
