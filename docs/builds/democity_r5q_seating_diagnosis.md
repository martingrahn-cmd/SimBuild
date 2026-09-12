# Democity r5q ground-seating diagnosis — 2026-09-08

## Fresh evidence

The reusable [seating probe](../../tools/democity-seating-probe.mjs) measures each live building's real base against the current terrain at its four footprint corners, plus each real landmark. It does not substitute screen-space geometry or props.

| Seed | Buildings | Worst building base gap | Buildings over 0.25 m | Landmark result |
| --- | ---: | ---: | ---: | --- |
| 1337 | 612 | 0.711996 m (ID 595) | 8 | Hospital 0.488396 m over; 12 other landmarks at 0.045–0.25 m |
| 7 | 648 | 2.319087 m (ID 414) | 9 | all 12 landmarks at 0.045–0.073 m |

Both pages have zero browser and runtime errors. Raw results: [1337](../../shots/democity/r5q/seating.json) and [7](../../shots/democity/r5q/seating-seed7.json).

## Diagnosis and decision

`buildings.terrainPad` samples all four corners **and four edge midpoints**, then sets the flat building base to the highest of those eight support points. The critic measurement samples four corners. The high gap is therefore a real mismatch between the intended no-penetration pad and the explicit four-corner seating rule: lowering the base to satisfy corners would put terrain through a wall wherever an edge midpoint is higher. The building geometry already has its physical skirt sized from this full support range.

Do not make a false fix by lowering records, attaching decorative props, or creating showcase-only pads. A genuine solution needs a terrain-owner-supported graded foundation/retaining contract for real lots, with road/zoning/terrain lifecycle verification. No production change is accepted in r5q; the existing deterministic support contract is retained and the Democity score remains 6.0 FAIL.
