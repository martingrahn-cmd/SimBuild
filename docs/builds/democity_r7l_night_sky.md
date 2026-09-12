# Democity r7l night-sky presentation — 2026-09-09

## Measured problem

The accepted r7h 22:00 skyline still read as blue-grey daylight. At the mandated 480 px measurement it had mean luminance 59.4418, median 49.6882 and p99/median 3.3278, failing the night limits of 55, 42 and 4.0. The nearby street and closeup views already retained real building windows, street lamps and road markings, so a global exposure or synthetic light was not justified.

## Bounded change

`src/modules/environment/sky.js` now applies a 0.25 display factor to the completed visible sky dome at full night. The radiance LUT and its PMREM use are unchanged, so terrain, facade and water environment lighting retain the established physical input. The factor includes visible clouds and horizon fog, because an earlier LUT-only 0.65 prototype left those layers bright and lowered the skyline mean only to 55.6916. No light, emissive object, scene content, geometry, simulation or owner contract changed.

## Verification

- The final skyline measures mean 41.0132, median 39.0372 and p99/median 4.2382. Those three failed bounds now pass.
- Skyline bright pixels above luma 180 remain 0.6636%, below the required 0.8%. Aerial remains 0.6381%. The complete night-light clause therefore remains failed.
- Directed `night_street` and `night_downtown` measure 1.0725% and 1.5764% bright pixels, with 5.5459 and 6.2427 p99/median. Both inspected images retain real lit facades, lamps, roads and foliage.
- All 16 standard dawn/noon/golden/night captures are ready with zero errors on Chrome/ANGLE Metal. Peak geometry remains 2,997,270 triangles, maximum draws 532 and the variable minimum is 46.6 fps.
- `npm run build` passes with 163 modules. The public API/double-deserialize/tour probe and exact 1337→7→1337→7 restage cycle pass.
- Dawn, noon, golden-hour and all six night views were inspected. The change does not repair the already recorded golden-hour washout.

Evidence is under `shots/democity/r7l-night-exposure/`, especially `baseline-stats.json`, `official-night-stats.json`, `summary.json`, `apicheck.json`, `restage-cycle.json`, and the final standard and directed PNGs.

## Decision

Accept the final visible-dome factor as a measured presentation improvement. Reject the earlier LUT-only placements retained in the evidence directory. Hold Democity at **6.0 FAIL**: two wide night views still lack the required bright-source density, the matrix remains below 50 fps, and scale, golden light, seating, grain, activity and seed variation remain open.
