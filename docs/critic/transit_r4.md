# Transit r4 — local critical audit

**Score: 6.8 / 10 — FAIL.** W4 makes the bus paint visibly darker at night while retaining warm interior light. The deterministic transit system remains playable and stable, but the vehicle is still a plainly boxy game prop, the dedicated night-stop frame has no docked bus, and required shadow coverage remains incomplete. The score is deliberately unchanged from r3.

This is a local critical audit, not a claim of a separate independent reviewer. The complete W4 standard matrix and ten directed views were captured through the active SimBuild server and every image was viewed. The r3 independent verdict remains historical evidence until an independent W4 recheck repeats the process.

## Evidence

- Standard matrix: all 16 frames are `ready` with zero console errors. It peaks at 192 draws, 1,763,252 triangles and 57.3 FPS (`shots/transit/r4/summary.json`).
- Directed W4 captures cover the required stop, bus, line, overlay, night-stop and lines presets, plus two 1280×720 views. All have zero errors. The slowest directed view is `line_12.png` at 55.4 FPS; the 720p overlay is 272 draws / 1,852,534 triangles.
- Final owner verification still reports 3 lines, 24 stops, 12 buses, 17 own draws and 140,294 noon / 137,464 night own triangles, with zero errors (`shots/transit/rdev4/verification-final.json`).
- Literal shadow inspection remains incomplete: shelter glass and lamps do not cast, and fleet batches 2–4 do not cast. The prior full-shadow attempt exceeded the 20-own-draw budget and was reverted.

## Ranked issues

1. **major — The bus model remains visibly synthetic.** `bus_12.png` and `bus_22.png` show a readable hollow cabin, glazing and night interior, but the large rectangular body, block seats, flat wheel treatment and roof details still look like a simple prop rather than a convincing vehicle. Evidence: `shots/transit/r4/bus_12.png`.
2. **major — The night-stop scenario is incomplete.** The paint attenuation fixes the prior bright broad body panels in `bus_22.png`, but `stop_22.png` and `night_stop_22.png` show an empty shelter with a weak floor pool and no nearby docked bus. Evidence: `shots/transit/r4/night_stop_22.png`.
3. **major — Literal shadow acceptance still fails.** Required secondary shelter/lamp and fleet shadow flags are false. This is a real acceptance failure even though the low-draw fallback protects the renderer budget. Evidence: `shots/transit/rdev4/verification-final.json`.
4. **minor — Framing and landscape obscure the transit presentation.** Street and skyline shots are dominated by repeated foliage and empty grass plots; route loops and approaching vehicles frequently lose visual priority. Evidence: `shots/transit/r4/street_12.png`, `shots/transit/r4/skyline_12.png`.
5. **minor — The route network reads functionally but not as a developed city system.** Overlay and line views clearly show three coloured routes, 24 stops and working rider values, while the surrounding low-density grid makes the service feel staged. Evidence: `shots/transit/r4/overlay_12_720p.png`.
6. **minor — Tram stretch is absent.** There is no articulated tram, rail, catenary or platform implementation. Evidence: `shots/transit/r4/line_12.png`.

## Strengths to preserve

- Three real lines, 24 stops and 12 buses are visible in the live panel, with ridership, vehicle and route controls.
- The route overlay has separated blue, red and green service paths and legible 720p UI.
- The night paint change materially improves the dark-scene read: the body recedes while warm cabin lights remain visible.
- Every W4 matrix and directed capture is ready with zero console errors.
- The owner’s 17-draw transit render budget remains intact.

## Per-shot notes

| Files | Observation |
| --- | --- |
| `aerial_{6p5,12,17p5,22}.png` | Three routes and the live line panel are clear; routes pass through a sparse, foliage-heavy terrain grid. |
| `street_{6p5,12,17p5,22}.png` | Shelter, roads and buses read, but leaves and poles repeatedly take foreground priority. |
| `skyline_{6p5,12,17p5,22}.png` | The network remains present but has little skyline identity; forest and low-density terrain dominate. |
| `closeup_{6p5,12,17p5,22}.png` | Bus cabin, glazing and lighting are legible, while the simple body proportions and wheel treatment remain exposed. |
| `stop_12.png`, `stop_22.png`, `night_stop_22.png` | Timetable, bench, glass and stop marker are readable; the night scene has no docked bus and limited light pool. |
| `bus_12.png`, `bus_22.png` | The dark night paint is a visible W4 improvement; form detail remains below the reference bar. |
| `line_12.png`, `overlay_12.png`, `lines_12.png` | Service colours, stops and rider panel are working and readable across the road grid. |
| `overlay_12_720p.png`, `lines_12_720p.png` | The panel and chips fit at 1280×720; empty blocks remain visually dominant. |

## Next step

Do not start W5. An independent reviewer must repeat the W4 capture and critic workflow for both Democity and Transit rather than copying either local verdict. Prioritise a better bus/shelter scene and shadow solution that stays within the owner draw budget before extending the transit feature set.
