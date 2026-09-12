# Democity r7o/r7p golden-hour composition — 2026-09-09

## Attribution

r7o used one frozen page to hide the visible sky, water and environment direct-light groups separately. At 17:30 the 480 px skyline baseline had 12.0201% of pixels above luma 235. Hiding the sky reduced the fraction to 3.2315%; hiding direct light only reached 11.3688%, and hiding water did not improve it. The visible sun/horizon dome was therefore the dominant owner, while lit city and water pixels remained a smaller contributor. Evidence is under `shots/democity/r7o-golden-components/`.

## Bounded r7p change

The environment owner now compresses only the completed visible dome toward the low sun. Its LUT, PMREM radiance, direct light, weather state and all simulation data are unchanged. The existing camera-facing low-sun exposure compensation is capped at 22% instead of 13%. The below-horizon far-plane fallback also gains a gentle vertical ground-haze gradient instead of extending one horizon sample as a constant strip.

No scene object, light, emissive sprite, service, traffic agent, route, coverage value or save payload was added or removed.

## Evidence reliability and rejected experiments

The first JavaScript metric prototype decoded PNGs through separate headless-Chrome canvases. Re-reading the same PNG changed its luminance and connected-window result, so those readings were rejected. `tools/democity-golden-stats.py` now implements the established Pillow Lanczos, BT.709 luminance and 24×24/stride-12 four-connected test used by the earlier Democity critic. Exact repeated output compares byte-for-byte.

A later prototype compressed the atmospheric base before cloud composition. It eliminated the flat-patch statistic, but produced harsh cut-out cloud plates. That prototype was rejected and reverted; `candidate10` through `candidate14` remain only as failed evidence under `shots/democity/r7p-golden-dome/`.

## Final verification

The final four required captures are in `shots/democity/r7p-final/`, all ready with zero errors:

| Frame | Above luma 235 | Largest flat patch | Verdict |
| --- | ---: | ---: | --- |
| aerial 06:30 | 0.1150% | 1.1111% | pass |
| skyline 17:30 | 1.4606% | 6.1111% | **flat-patch fail** |
| street 17:30 | 0.7130% | 0.6667% | pass |
| closeup 06:30 | 0.1142% | 0.6667% | pass |

The skyline's blown-pixel fraction falls from 12.0201% to 1.4606% and the largest flat patch from 21.7778% to 6.1111%. The residual connected patch is the smooth upper sky at 480 px (`x=144, y=0, 168×84` bounding box), not a reason to add noise or accept the visually broken cloud prototype.

`npm run build` passes with 163 modules. The public API, double deserialize, eight-stop tour, invalid-stop rejection and exact 1337→7→1337→7 restage pass without browser or simulation errors. The four-shot minimum is 46.8 fps; visible geometry remains unchanged and peaks at 2,657,124 triangles in this set.

## Decision

Accept the owner-safe visible-dome and exposure adjustment as a large verified improvement, but keep golden hour and Democity failed. Further work must add plausible upper-sky/cloud structure or revise the cloud rendering itself; metric-targeted noise and the harsh pre-cloud compression are rejected.
