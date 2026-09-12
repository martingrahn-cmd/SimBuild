# Democity r8l — shared night horizon display contract

**Decision: accepted as a bounded visual correction. Democity and whole-game remain 6.0/10 FAIL.**

## Diagnosis and change

Fresh matched riverfront images reproduced the 22:00 blue-grey horizontal strip. A destructive, evidence-only component probe showed that the strip disappears when the terrain-owned water plane is hidden and remains when only the visible sky dome is hidden. Source inspection found the mismatch: the visible dome applies a 0.25 night display factor after sky, cloud and horizon composition, while water reflection, water horizon and shared distance fog sampled the brighter raw environment sky LUT.

Environment now publishes its existing deterministic night factor through the shared shader-uniform contract. Shared fog and the terrain water LUT consumers apply the same existing `mix(1.0, 0.25, night)` display gain. The raw LUT, PMREM, visible dome, reflection geometry, weather state, world generation, gameplay, cameras, RNG and save data remain unchanged.

## Verification

- Production build passes with 163 transformed modules.
- The independent pixel replay on the unobstructed riverfront region measures horizon-minus-sky display luminance at +47.70878 before and -2.15514 after, reducing the excess by 49.86391.
- The night contract cycles 12→17:30→22→12→22 as 0/0/1/0/1 and confirms API, world, visible sky and water all use the same shared value.
- Public API, double deserialize, eight valid tour stops, invalid-tour rejection, all 32 mixed-use records and exact recorded 1337→7→1337→7 restage digests pass with zero errors.
- The existing reflection cadence contract remains 15/30/120 submissions per 120 frames for paused fixed, active fixed and active moving-camera cases.
- All 29 supplied original images were independently inspected. The 16-frame final matrix is ready and zero-error at 469 maximum draws, 2,814,092 maximum triangles and 46.1 minimum FPS; 2/16 frames miss 50 FPS and raw endpoint heap peaks at 741.5 MB.
- Four cloudy/rainy 22:00 controls are zero-error and retain the corrected horizon, but all miss 50 FPS at 32.8–44.5.
- Independent review accepts the local correction without increasing the 6.0 FAIL score.

## Limits

The geometric ocean horizon remains straight and the separate 17:30 low-sun seam remains because the existing night factor is zero at that time. Mountain material, broad daytime cloud reflection, graphic rain, 50 FPS and raw memory margins remain open. No continuous dawn/dusk sweep, new forced-GC memory test, fresh whole-game matrix, blind comparison or human playtest is claimed.

Evidence:

- `shots/democity/r8l-night-horizon-baseline/`
- `shots/democity/r8l-night-horizon-diagnosis/`
- `shots/democity/r8l-night-horizon-candidate/`
- `shots/democity/r8l-night-horizon-contract/`
- `shots/democity/r8l-night-horizon-final/`
- `shots/democity/r8l-night-horizon-weather/`
- `docs/critic/democity_r8l.md`
- `docs/critic/democity_r8l.json`
