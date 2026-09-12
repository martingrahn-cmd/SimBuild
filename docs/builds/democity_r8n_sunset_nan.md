# Democity r8n — finite sunset lighting at the 18:00 boundary

**Builder decision: candidate is ready for independent review. Democity and whole-game remain 6.0/10 FAIL pending that review.**

## Diagnosis and bounded change

The r8m time sweep exposed a full black 3D scene at exactly 18:00 while HUD and minimap remained visible. A matched exact-18:00 capture with the r8m product changes temporarily removed was also black, proving that this defect predated r8m.

State probes at 17.999, 18.000 and 18.001 found a finite sun direction but zero atmospheric transmittance. The existing near-horizon intensity floor kept the old normalization guard open, and normalising solar colour by `max(sunTransmittance) == 0` produced `NaN` RGB values. At exactly 18:00 the finite moon was already selected as the direct scene light, but the non-finite solar colour still propagated into shared fog state without a browser or engine error.

The bounded repair raises the solar transmittance sample's minimum elevation from 0.004 to 0.008, above the coarse atmosphere integrator's measured zero-transmittance band, and guards colour normalisation with the actual transmittance maximum. This slightly changes near-horizon solar colour, intensity and cloud-sun sampling. Moon sampling, time state, weather, geometry, world generation, gameplay, cameras, RNG, persistence and module ownership are unchanged.

## Verification

- Production build passes with 163 transformed modules; source diff checks pass.
- Transition probes from 17.50 through 18.50 report finite sun, light and fog values at every sample. The exact 17.999/18.000/18.001 probe is finite and has zero browser errors.
- The corrected 12-point close sunset sweep passes at every sample. At 17.99, 18.00 and 18.01 its mean frame luminance is 26.118, 27.878 and 28.055 respectively, with more than 95% non-black pixels.
- The corrected 15:00–20:00 eight-point sweep passes at every sample. Mean luminance stays between 24.18 and 99.43 and the non-black share stays above 96.3%.
- Three independent fresh-browser captures at 17.99, 18.00 and 18.01 are zero-error, render at 59–60 FPS and preserve continuous sunset imagery.
- Public API, double deserialize, valid and invalid tour contracts, all 32 mixed-use records and exact 1337→7→1337→7 restage digests pass. Water reflection cadence remains exactly 15/30/120 submissions per 120 frames.
- All 39 supplied original screenshots were inspected locally: 12 close sunset frames, eight broad sweep frames, three fresh-browser controls and the 16-frame standard matrix. None contains the black-scene failure.
- The 16-frame standard matrix is zero-error at 469 maximum draws, 2,814,092 maximum triangles and 47.2 minimum FPS; 4/16 frames miss 50 FPS. Maximum raw heap is 682.5 MB and is recorded only as volatile diagnostic evidence.

## Verification-tool correction

The first in-page sweeps changed clock time without forcing the environment's dirty-update path, so LUT and PMREM state could depend on the previous sample. Both r8n sweep scripts now call the public `environment.refreshEnvironment()` contract after every clock change. The reported sweeps are fresh results from the corrected scripts, and the three independent CLI captures provide a separate browser-level control.

## Limits

R8n removes the non-finite sunset failure and makes the exact 18:00 frame renderable. It does not justify a score increase or resolve the remaining repeated mountain material, foliage planes, sparse city fabric, traffic life, raw-memory margin or frame-rate gate. The near-horizon sun chromaticity used by direct light and the sky disc changes slightly by design; actual time, weather and service simulation behavior are unchanged. No whole-game rerun, blind comparison or human playtest is claimed.

Evidence:

- `shots/democity/r8n-sunset-black-diagnosis/`
- `shots/democity/r8n-sunset-nan-candidate/`
- `shots/democity/r8n-sunset-nan-final-sweep/`
- `shots/democity/r8n-sunset-nan-fresh/`
- `shots/democity/r8n-sunset-nan-contract/`
- `shots/democity/r8n-sunset-nan-final/`
