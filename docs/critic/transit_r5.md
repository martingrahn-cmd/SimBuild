# Transit r5 — local evidence review

**Score: 6.8 / 10 — FAIL.** W5 resolves the specific empty-night-stop evidence gap with a real route-table scheduled bus, but the overall visual system does not reach a higher quality tier. The score is held.

## Evidence reviewed

- All 16 standard matrix frames and ten directed W5 captures were captured under Metal and inspected. They are ready with zero errors. The matrix peaks at **229 draws / 1,927,692 triangles**, with **58.8 fps** minimum (`shots/transit/r5/summary.json`).
- At 22:00 the selected live vehicle dwells at the featured real stop, with `doorsOpen` provided by the normal schedule. The final night-stop view shows bus, open doors, shelter, timetable and panel in one frame (`shots/transit/r5/night_stop_22_final.png`).
- The fresh public probe validates all 20 expected methods; it retains 3 lines, 24 stops, 12 vehicles, 1,417 riders/day, and passes save/load, invalid-color, vehicle-clamp and overlay checks with zero browser/runtime errors (`shots/transit/r5/apicheck.json`).

## Ranked remaining issues

1. **major — bus art remains one tier below the target.** The vehicle has glazing, seats, destination display, lighting, doors, roof kit and wheels, but its long slab sides, block-like wheel treatment and simplified door joins still read as a game prop. Evidence: `shots/transit/r5/bus_12.png`, `shots/transit/r5/bus_22.png`.
2. **major — the docked night-stop is now functional but not polished.** The scene proves the relationship, yet the front-biased composition and sparse surroundings do not provide a convincing boarding moment. Evidence: `shots/transit/r5/night_stop_22_final.png`.
3. **major — shadow acceptance remains unproven.** W5 did not change the W4 shadow-batch limitation because the previous all-shadow test exceeded the owner draw budget. Evidence: `shots/transit/r4i/apicheck.json`, `shots/transit/r5/summary.json`.
4. **minor — the transit fixture still occupies an unfinished, sparse grid.** Line and aerial views make route colours readable, but green empty lots and tree scatter dominate instead of urban trip generators. Evidence: `shots/transit/r5/line_12.png`, `shots/transit/r5/lines_12.png`.
5. **minor — tram remains absent.** The module remains bus-only; no rail, articulated vehicle, catenary or platforms exist. Evidence: `shots/transit/r5/lines_12.png`.

## Strengths to preserve

- The fleet is real, deterministic and keeps normal schedule semantics at all times.
- Three routes, 24 stops, service controls, line overlay and 1280×720 panel remain legible and functional.
- Draw, triangle and fps readings remain well controlled in this isolated fixture.

## Decision

Hold at **6.8 FAIL**. Transit’s W5 checkpoint is complete. Do not add a tram or another fleet until the existing bus presentation and stop composition materially improve inside the established owner budget. The next ranked work returns to Democity’s source-level geometry/heap failure and measured golden-hour exposure investigation.
