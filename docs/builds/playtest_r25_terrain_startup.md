# R25 byte-exact Terrain startup kernels

## Scope

R25 optimizes the measured Terrain cold-start path without reducing texture resolution or changing generated content. The land-cover generator caches the five repeated height-sampling coordinates per axis, and its common 2x/0.5 fBm calls use exact unrolled 2/3/4-octave kernels. The generic noise API remains available and unchanged for non-matching parameters. `Noise2D.noise` reads identical gradient components from flat arrays instead of nested pairs.

The first coordinate-cache implementation used a Map lookup inside every sample. It was byte exact but measured slightly slower in the first paired run and was rejected. The accepted implementation binds the five sample axes once and removes that lookup.

The land-cover contract probe now accepts `TERRAIN_LANDCOVER_OUT`; its default path and assertions remain unchanged.

## Evidence

- Six interleaved seed-1337 pairs: baseline median 1,099.9ms; candidate 1,004.3ms; **8.692% reduction**. Every 4,194,304-byte output has the established SHA-256 `7f837a…d8ef`.
- Established seed hashes pass: seed1337 `7f837a…d8ef`, seed7 `f86a45…505`.
- Height/flow arrays for seeds1337 and7 are byte exact against R24; 1,681 direct simplex samples are number-exact.
- Three production cold starts are zero-error. Land-cover logs are 909/901/905ms versus the retained R19 1,006–1,016ms range. Terrain total is 1,733/1,678/1,681ms and menu ready 2,772/2,643/2,659ms; those totals overlap prior variance, so the overall loading gate remains open.
- Matched R24/R25 building-aerial captures both report 183 draws and 1,029,476 triangles, errors=0. ImageMagick MAE is 0.295471 intensity units (`4.50859e-06` normalized), consistent with frame-level render noise; the generated height, flow and land-cover buffers themselves are byte exact.
- `npm run build`: PASS, Vite8.2.2, 164 modules, canonical public assets.
- `node src/modules/simulation/selftest.mjs 90 1337`: PASS, deterministic repeat and exact mid-run save/load.

Evidence: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r25/`.

## Decision

Accept the owner-local exact optimization. It reproducibly removes about 96ms from the dominant land-cover stage without changing generated world data, rendering budgets, simulation or save state. It does not prove a visibly faster end-to-end load and does not raise a score.
