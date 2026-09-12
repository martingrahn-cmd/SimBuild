# Democity r5r street-activity diagnosis — 2026-09-08

The reusable [activity probe](../../tools/democity-activity-probe.mjs) counts only live `world.traffic` vehicles and pedestrians within 150 m of the ordinary street camera target `[40, 40]`. It does not use scenery instances, static props or a second fleet.

| Time | Nearby vehicles | Vehicle kinds | Nearby pedestrians | Whole native fleet |
| --- | ---: | --- | ---: | ---: |
| 12:00 | 6 | 5 | 8 | 157 |
| 17:30 | 9 | 4 | 7 | 240 |
| 22:00 | 3 | 3 | 0 | 39 |

All three fresh Chrome Metal pages are zero-error. The required 12 local vehicles is not met at any tested time. Raw evidence: [activity.json](../../shots/democity/r5r/activity.json).

## Decision

No production change is accepted. The traffic owner already supplies one deterministic native fleet across the real road graph. Raising its global target enough to force a local count would raise whole-city simulation and render work against already failed performance gates; planting a camera-local explicit loop would be showcase-only traffic. A valid future fix needs measured routable frontage/demand distribution through the traffic and road owners, with whole-fleet performance and save/restore evidence.
