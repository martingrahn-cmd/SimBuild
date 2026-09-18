# R18 close-range fleet detail

## Scope

R18 changes only Traffic-owned LOD0 geometry for the existing panel van and semi-trailer. It adds rear-door, lamp, bumper, rail and hinge cues without changing vehicle dimensions, routing, spawning, simulation state, serialization, LOD1/LOD2 or materials owned by another module.

## Evidence

- Matched before: `shots/playtest-fixes-r18/fleet-before.png` — 60.2fps, 112 draws, 874,678 triangles, errors=0.
- Matched after: `shots/playtest-fixes-r18/fleet-after.png` — 59.9fps, 112 draws, 875,698 triangles, errors=0.
- Delta: +1,020 triangles in the close fleet showcase, unchanged draw calls. The van rear and semi-trailer rear are more legible at the inspected distance.
- `npm run build`: PASS, Vite 8.2.2, 164 modules.
- `SIM_URL=http://127.0.0.1:5180 node tools/playtest-traffic-causality.mjs`: PASS. Empty isolated road remains empty; the small-city fleet remains activity-driven; mixed-use trip purposes and heavy-vehicle purpose gating remain valid; ordinary dead-end U-turns and outside portals remain valid; Traffic restore remains exact and deterministic.

## Decision

Accept the bounded LOD0 detail change. It improves two weak close-range silhouettes at negligible measured scene cost and preserves all tested contracts. This is a local art improvement, not proof that the complete fleet reaches the final quality bar.
