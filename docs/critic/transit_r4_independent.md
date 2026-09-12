# Transit r4 — independent evidence re-review

**Score: 6.8 / 10 — FAIL.** Fresh W4 evidence confirms the local result. Transit is a stable, usable system with a readable panel and routes, but the presentation remains far below the reference: it runs through a mostly empty grid, the bus is visibly boxy, and the dedicated night-stop scene does not show a bus docked at its shelter.

This review independently recaptured and inspected the evidence within the shared workspace. It does not claim a separate human reviewer.

## Fresh evidence

- 26 newly captured PNGs were inspected: the complete 16-frame time/camera matrix and ten directed stop, bus, line, overlay, night-stop and 1280×720 views. Every capture is ready and reports zero console errors (`shots/transit/r4i/`).
- The standard matrix peaks at **230 draws / 1,763,252 triangles** and its minimum measured frame rate is **59.8 FPS**. The directed 720p overlay reaches 272 draws / 1,852,534 triangles and remains ready.
- The fresh public API probe exposes all 20 expected methods. It confirms three bus lines, 24 stops, 12 fleet vehicles, 1,417 riders/day, 3 adopted stops, and a 15-draw / 137,198-triangle owner cost in its captured view. Two serializations restore successfully; invalid colour is rejected and vehicle counts clamp at 20. There are zero runtime and browser errors (`shots/transit/r4i/apicheck.json`).

## Ranked issues

1. **major — the bus still looks like a boxy game prop.** It has readable glazing, interior seats, a destination display and wheels, but slab body panels, rectangular wheel arches and rudimentary roof kit dominate close view. Evidence: `shots/transit/r4i/bus_12.png`, `shots/transit/r4i/bus_22.png`.
2. **major — the dedicated night-stop scene is empty.** The shelter, timetable and warm road lamp are legible, but no bus is docked in the scene. The visual test therefore cannot show boarding, the relationship of bus to shelter, or a convincing localized arrival light. Evidence: `shots/transit/r4i/night_stop_22.png`.
3. **major — literal shadow acceptance remains unresolved.** The new public probe confirms owner cost is controlled but does not change the recorded W4 render flag evidence: shelter glass/lamps and fleet batches 2–4 do not cast because the all-shadow experiment exceeded the draw budget. Evidence: `shots/transit/rdev4/verification-final.json`.
4. **minor — foliage and empty lots dominate the transport views.** The near-stop frame is partly blocked by a foreground tree; aerial, line and skyline views show a small network across unfinished green blocks rather than a developed city. Evidence: `shots/transit/r4i/street_12.png`, `shots/transit/r4i/line_12.png`, `shots/transit/r4i/skyline_12.png`.
5. **minor — tram remains absent.** The system ships bus-only routes; no rail, articulated vehicle, catenary or platforms exist. Evidence: `shots/transit/r4i/line_12.png`.

## Strengths to preserve

- Three coloured, independent routes and 24 stops are functional and legible in the live panel.
- The deterministic fleet, route overlay, panel controls and save restore pass the fresh public API probe.
- Night paint remains controlled: the vehicle body is darker while cabin light and the destination display stay readable.
- The 1280×720 overlay and line panel remain readable (`shots/transit/r4i/overlay_12_720p.png`, `lines_12_720p.png`).

## Decision

The score stays at **6.8**, with no unverified credit. The next transit round should first stage a deterministic, docked bus for the night-stop camera using the existing fleet contract, then improve bus silhouette/wheel/door detail without expanding draw budget. Transit should not add a tram while its base bus and stop scene still miss their visual gate.
