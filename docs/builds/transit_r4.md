# Transit r4 builder record — 2026-09-08

## Scope

W3's bus close-up showed a bright gray roof and side panels at 22:00. R4 adds a `transitNight` shader uniform to the existing paint material. At night it darkens paint only; transparent window geometry, interior lights, destination display and headlight geometry keep their existing behavior. Routes, vehicle poses, schedules, fleet ownership, transit economics and save data are unchanged.

## Verification

- `npm run build` passed: 163 modules transformed.
- Eight fresh Metal captures in `shots/transit/rdev4/` all completed with zero errors and the transit module ready. They cover aerial, bus, street and night-stop views at noon and 22:00; recorded fps is 57.3–60.0 and the largest frame is 1,763,252 triangles.
- Viewed final `bus_22.png`: the roof and unlit body are darker than the road-lit cabin while warm windows and destination display remain readable. Noon bus appearance remains readable in `bus_12.png`.
- Final API/render check reports 3 lines, 24 stops, 12 buses, 17 owner draw calls and 140,294/137,464 owner triangles at noon/night. It has zero browser errors.
- A full `castShadow` experiment was measured then reverted: it raised the owner's self-reported work to 29–37 draw calls, above the 20-call requirement. The production r4 source therefore retains the existing structural-only shadow setup.

## Result and limits

The night body brightness problem is visibly improved without raising the final owner draw count. The r3 independent score remains 6.8/10 until a new independent critic examines W4. The shelter still has no docked bus in the night-stop view; foliage/pole obstruction, synthetic body detail, transparent/secondary shadow flags, traffic collision coordination and the absent tram remain open.

Evidence: `shots/transit/rdev4/summary.json`, `shots/transit/rdev4/bus_12.png`, `shots/transit/rdev4/bus_22.png`, and `shots/transit/rdev4/verification-final.json`.
