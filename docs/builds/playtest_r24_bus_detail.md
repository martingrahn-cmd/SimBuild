# R24 close-range bus detail

## Scope

R24 changes only Traffic-owned LOD0 geometry for the existing bus. It adds a rear route display, engine hatch/grille, split line and bumper plus close-range side entry-door and rub-rail cues. Vehicle dimensions, axle placement, road use, route selection, spawning, real-time stepping, materials, LOD1/LOD2 and save state are unchanged.

The Traffic causality verifier now accepts `SIM_TRAFFIC_CAUSALITY_OUT`, so its result can be written outside the iCloud-backed `shots` tree. Its default path and test assertions are unchanged.

## Evidence

- Retained matched reference: `shots/playtest-fixes-r18/fleet-after.png` — 59.9fps, 112 draws, 875,698 triangles, errors=0.
- R24 candidate: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r24/fleet-after.png` — 59.5fps, 112 draws, 876,298 triangles, errors=0.
- Scene delta: +600 triangles, unchanged draw calls. The inspected rear view now reads as a transit bus through a destination panel and functional rear treatment instead of one blank painted capsule.
- Geometry probe: bus LOD0 is 1,716 finite triangles; farther LOD1/LOD2 remain exactly 254/36 triangles.
- Traffic causality: PASS with zero errors. Empty isolated roads remain empty; the 22-person fixture has 7 real vehicles and no heavy freight; land-use purposes, heavy-vehicle gating, dead-end U-turns, outside portals, deterministic repeat and exact Traffic restore all pass. Evidence: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r24/traffic-causality.json`.
- `npm run build`: PASS, Vite 8.2.2, 164 modules, canonical public assets, output on ExtDrive.
- `node src/modules/simulation/selftest.mjs 90 1337`: PASS, deterministic repeat and exact mid-run save/load.

The first canonical build attempt failed while macOS tried to hydrate an iCloud placeholder texture. The unchanged tracked public assets were restored byte-for-byte from the pushed GitHub revision, after which the canonical build completed in 215ms. This is recorded as an environment failure, not product evidence.

## Decision

Accept the bounded LOD0 bus repair. It materially improves the weakest fleet specimen at negligible measured scene cost and preserves every tested simulation contract. It does not close the broader fleet-art or whole-game quality gate.
