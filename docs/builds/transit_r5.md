# Transit r5 builder record — 2026-09-08

## Scope

W5 addresses the W4 night-stop finding without adding a presentation-only object. The existing showcase fleet keeps its twelve scheduled vehicles. One vehicle on the featured stop's real route receives a phase derived from its route-table dwell segment, causing it to stop with doors open at that actual stop at 22:00. At other times it continues through the same normal timetable. The existing stop camera is moved back enough to frame the live bus and shelter together.

## Verification

- `npm run build` passes with 163 transformed modules.
- The complete 16-frame Metal standard matrix is ready with zero errors: **229 max draws, 1,927,692 max triangles, 58.8 minimum fps** (`shots/transit/r5/summary.json`).
- Directed stop, bus, line, overlay, night-stop and 1280×720 captures are ready with zero errors. The final night-stop capture is **106 draws / 1,471,542 triangles / 60.1 fps** and visibly shows the bus, opened doors, shelter, timetable and route panel (`shots/transit/r5/night_stop_22_final.png`).
- The public contract probe exposes all 20 expected Transit methods. It preserves three active lines, 24 stops, 12 vehicles and 1,417 riders/day; serializes/deserializes twice, rejects invalid colours, clamps vehicle count at 20 and restores it, toggles the overlay, and reports no runtime or browser errors (`shots/transit/r5/apicheck.json`).

## Result and limits

The missing night-stop relationship is now shown by an actual scheduled fleet vehicle rather than a duplicate. This does not repair the remaining visual bar: close views still read as a comparatively boxy bus with simple wheels/door treatment; the fixture is a sparse grid with foliage obstruction; shadow-batch coverage and the absent tram remain unresolved. The builder result does not imply a score increase.
