# Democity r5 — local evidence review

**Score: 6.0 / 10 — FAIL.** W5 makes a measured local improvement to night-light presentation and composed performance, but it does not clear any final Democity quality gate. The score is therefore held, rather than inferred upward from the narrower fix.

## Evidence reviewed

- 16 standard frames, 11 directed district frames, 6 seed-7 frames, whole-game noon/night, 1280×720 and repeat/crop captures were taken and visually inspected under Metal. The standard matrix and seed-7 matrix are all ready with zero errors (`shots/democity/r5/`, `shots/democity/r5s7/`).
- Standard peak cost is **751 draws / 4,473,160 triangles / 35.6 fps**, compared with W4’s 751 / 5,075,465 / 27. The full scene still exceeds the 3M-triangle and 50-fps targets.
- The fresh runtime probe passes all 13 public API methods, serializes/deserializes twice, tours all eight stops, rejects an invalid stop, and records no browser/runtime errors. It retains 612 buildings and 31 services on the primary seed (`shots/democity/r5/apicheck.json`).
- Night aerial and street views show smaller, less intrusive lamp pools. The former repeated white-disc failure is reduced, not eliminated as a systemic visual pass.

## Ranked remaining issues

1. **blocker — composed geometry and memory remain over budget.** The matrix is still 4.47M triangles at peak and the probe heap is 934.8 MB before the seed-7 restage, 1,108.3 MB after it. Evidence: `shots/democity/r5/summary.json`, `shots/democity/r5/apicheck.json`.
2. **major — golden-hour skyline remains washed out.** The new curve improves the centre/left-side reading, but `skyline_17p5.png` still has a broad bright sun-facing field that removes water and building form. Evidence: `shots/democity/r5/skyline_17p5.png`.
3. **major — visual density and asset variation are still below the reference bar.** The directed overview exposes sparse blocks, repeated tower language, broad lawns and simplified foliage. Evidence: `shots/democity/r5/overview_12.png`, `shots/democity/r5/street_12.png`, `shots/democity/r5/suburb_12.png`.
4. **major — waterfront, bridge and industrial transitions remain schematic.** District identity is present but terrain joins, empty margins and industrial forms lack the material/structural detail seen in the references. Evidence: `shots/democity/r5/bridge_12.png`, `shots/democity/r5/industry_12.png`, `shots/democity/r5/waterfront_17p5.png`.
5. **major — ground seating, bridge clearance, cross-seed lifecycle and street activity retain their earlier failed clauses.** W5 did not touch these systems, so the W4 evidence remains controlling until they are re-tested after a relevant change.

## Strengths to preserve

- The city is still functional: roads, services, transit, save/load/restage and tour contracts remain intact with zero observed runtime errors.
- Night lighting is more localized and no longer overwhelms the aerial composition in the same way.
- Daytime close-ups retain readable roads, traffic, facades, street furniture and basic district separation.

## Decision

Hold at **6.0 FAIL**. The next Democity change must remove geometry at the source and bring heap under control before any density expansion. The exposure curve should be addressed with a measured, view-aware solution in the established environment/effects path; another broad scalar reduction is not justified by the present evidence. Transit’s W5 docked night-stop/bus-art work can proceed in parallel with that later Democity investigation because its architecture is isolated.
