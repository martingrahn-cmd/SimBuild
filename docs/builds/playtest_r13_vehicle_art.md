# R13 close vehicle art — 2026-09-12

## Problem

Human finding PT-2026-09-12-26 showed the close-range box truck as a single swollen white body. Source and directed evidence confirmed that LOD0 was loaded correctly; this was authored geometry and material quality, not an asset-loading failure.

## Accepted bounded change

Traffic now authors the rigid box truck as separate cab, cargo box and chassis volumes while retaining its authoritative 8.4 m length, 1.26 m half-width, axle positions, class, routing and save ownership. Close LOD adds mirrors, grille, lamps, plate, rear door framing and side reflectors. The cargo-panel material retains more of each deterministic vehicle paint colour instead of washing most trucks nearly white. No fleet, route, purpose, collision, simulation or serialization behavior changed.

## Verification

- Production build: PASS, Vite 8.2.2, 164 modules.
- Traffic causality probe: PASS, zero browser/simulation errors.
- Empty isolated road: 0 vehicles.
- 22-person residential fixture: 7 passenger vehicles, no heavy vehicles.
- Mixed-use fixture: 26 vehicles; heavy vehicles are freight; exact deterministic replay and Traffic restore pass.
- Dead-end U-turn and outside-portal turnover: PASS.
- Matched traffic showcase: 112 draws unchanged; peak triangles 875,398 before and 874,678 after (-720); errors=0.
- Inspected evidence: `shots/playtest-fixes-r13/vehicles-before-fleet.png`, `vehicles-after-fleet.png`, and `vehicles-after-front.png`.

## Decision

Accept the box-truck repair as a visible local improvement. PT-26 remains partially open because vans, buses, semis and passenger-car variety still fall short of the final visual bar. Traffic stays **7.2/10 FAIL** and the whole game stays **6.0/10 FAIL**.
