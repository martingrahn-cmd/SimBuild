# Democity r8m — low-sun horizon display contract

**Builder decision: candidate is ready for independent review. Democity and whole-game remain 6.0/10 FAIL pending that review.**

## Diagnosis and bounded change

The 17:30 riverfront baseline reproduced a bright cream horizontal band where the distant water converged with the displayed sky. An evidence-only component probe showed the band disappears when the terrain-owned water is hidden and remains when only the sky dome is hidden. In the unobstructed x=220–380 sample, the baseline horizon was +82.864 display-luminance units above the nearby sky; with water hidden it was -0.897.

The visible sky dome already compresses the sunward sky when the sun is low, while the water reflection, water horizon and shared distance fog sampled the raw physical LUT without that camera-facing display transform. Those consumers now apply the dome's existing directional low-sun formula before the already accepted night display factor. The raw LUT, PMREM, direct lighting, weather state, water geometry, reflection geometry, world generation, gameplay, cameras, RNG and save data are unchanged.

## Verification

- Production build passes with 163 transformed modules; targeted source diff check passes.
- The matched 17:30 candidate measures horizon-minus-sky at -1.612 and water-minus-sky at -0.838, reducing the baseline excess by 84.476 and 61.298 display-luminance units respectively.
- The display-input contract cycles 12→17→17:30→17:45→18:15→22→12→17:30 and confirms API, world, water, sky and shared fog use identical sun vectors; water and environment also retain identical night values.
- Public API, double deserialize, eight valid tour stops, invalid-tour rejection, all 32 mixed-use records and exact 1337→7→1337→7 restage digests pass with zero engine/browser errors.
- Water reflection cadence remains 15/30/120 submissions per 120 frames for paused fixed, active fixed and active moving-camera cases.
- All 39 supplied original images were inspected locally. The 16-frame standard matrix is ready and zero-error at 469 maximum draws, 2,814,092 maximum triangles and 41.6 minimum FPS; 3/16 frames miss 50 FPS.
- Four cloudy/rainy 17:30 controls are zero-error and retain horizon continuity. Their aerial views miss 50 FPS at 46.0 and 45.3.

## Newly exposed pre-existing defect

The continuous time sweep exposed a full black 3D scene at exactly 18:00 while HUD and minimap remain visible. Fresh 17:45 and 18:15 controls render normally. A second exact-18:00 capture made with all r8m product edits temporarily removed is identically black, proving this defect predates and is independent of the candidate. The r8m edits were restored afterward. The sweep's initial `pass` field only checked browser/engine errors and therefore did not detect the black frame; visual inspection did. This is the next critical issue if r8m is accepted.

## Limits

R8m corrects the low-sun LUT/display mismatch but does not improve the straight geometric water boundary, repeated mountain material, broad overcast reflection, graphic rain, sparse city fabric, foliage planes, traffic life, raw memory margin or frame-rate gate. No score increase, whole-game rerun, blind comparison or human playtest is claimed.

Evidence:

- `shots/democity/r8m-low-sun-diagnosis/`
- `shots/democity/r8m-low-sun-candidate/`
- `shots/democity/r8m-low-sun-sweep/`
- `shots/democity/r8m-low-sun-boundary/`
- `shots/democity/r8m-low-sun-contract/`
- `shots/democity/r8m-low-sun-final/`
- `shots/democity/r8m-low-sun-weather-cloudy/`
- `shots/democity/r8m-low-sun-weather-rain/`
