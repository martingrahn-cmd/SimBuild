# Democity r5o rejected golden-hour exposure experiment — 2026-09-08

## Candidate

The existing environment-owned, camera-facing low-sun exposure compensation is capped at 13%. The bounded candidate raised that cap to 20% and changed no lighting, post-processing ownership, world state or simulation contract.

## Verification

`npm run build` passed with 163 transformed modules. Directed Chrome Metal captures at 17:30 were zero-error:

| View | Existing | Candidate |
| --- | ---: | ---: |
| skyline | 39.7 fps, 784 draws, 2,367,106 triangles | 39.3 fps, 784 draws, 2,367,106 triangles |
| street | 37.4 fps, 565 draws, 3,628,270 triangles | 37.4 fps, 565 draws, 3,628,270 triangles |

The inspected pairs are `shots/democity/r5o/skyline_17p5_{baseline,candidate}.png` and `shots/democity/r5o/street_17p5_{baseline,candidate}.png`. The city/water skyline stays sun-washed while the city-side separation does not visibly improve enough to justify a darker exposure policy.

## Decision

Reject and revert the 20% cap to the verified 13% source value. A stronger global reduction would darken local detail while leaving the direct solar/water disc as the dominant issue. Do not add a competing light or post chain to solve this composition.
