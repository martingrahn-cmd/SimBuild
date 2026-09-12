# Democity r7y — explicit weather ownership

## Finding

The whole-game critic's `?weather=rain` and `?weather=cloudy` images were almost identical because Democity staging unconditionally replaced environment's requested preset with `{cloudiness:.38,rain:0,fogDensity:.00004}`. The rain/cloudy RGB MAE was only 0.746/255 even though the URL flags were present.

## Change

Democity still applies its established custom default when no weather was requested. When `world.flags.weather` is explicit, it leaves the already-initialized preset with the environment owner. No weather constants, shaders, rain geometry, city state, simulation behavior, camera, or standard composition value changed.

## Evidence

- Build passes 163 modules.
- `tools/democity-weather-probe.mjs` passes: default is exactly `.38/0/.00004`, cloudy `.74/0/.0003`, and rain `.96/.85/.00065`; all owners ready, zero errors.
- Four 1920×1080 Metal captures were inspected under `shots/democity/r7y-weather/`. Cloudy now reads as overcast; rain has visible streaks, fog, reduced contrast and wet response in aerial and street views.
- New default→cloudy/rain image MAE is 14.969/22.401 of 255 over more than83%/85% of pixels. The accepted default→new default comparison has p95=0 and 0.084/255 MAE; changed outliers are moving scene elements.
- Rain aerial remains under geometry/draw limits at433 draws/1,957,702 triangles with zero errors. Its46.2fps remains below the50fps whole-frame gate.
- Public Democity API/double deserialize/tour passes. Exact1337→7→1337→7 restage passes. Raw sequential heaps are retained as observed and are not substituted for the established forced-GC memory result.

## Decision

Accept. This repairs an explicit composition contract and makes the existing real weather systems reachable in the whole city. Democity remains **6.0 FAIL** and whole-game remains **6.0 FAIL**; weather art itself was not rescored and the performance gate remains failed.
