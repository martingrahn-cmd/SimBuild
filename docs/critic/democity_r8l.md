# Democity r8l — independent night horizon review

**ACCEPT the bounded visual correction. Democity and whole-game remain 6.0/10 — FAIL against 8.5. Rank 6 remains OPEN.**

The glaring blue-grey water horizon strip at 22:00 is substantially suppressed without changing the visible sky or flattening the readable city foreground. This is a visible net improvement in the riverfront pair and is retained in the final and rainy/cloudy controls. It fixes a specific mismatch between sky display brightness and consumers of the raw sky lookup texture. It does not implement new gameplay, weather simulation or port operation, and it does not raise the complete city above its existing visual anchor.

## Diagnosis and visual evidence

I individually inspected **all 29 original PNGs**: two baseline, four component-probe, three directed candidate, sixteen standard final and four added weather views. No derived image substituted for an original. I read STATUS/HANDOFF, both prior independent report pairs, the relevant architecture ownership/colour/fog/water contracts, current shader source and its broader git diff.

In the component diagnosis, hiding water removes the conspicuous strip; hiding only the dome leaves the water-plane boundary visible against the brighter background. Hiding both reveals the underlying terrain/background. This supports water/display mismatch attribution, though these debug masks are not production performance evidence. The probe script changes visibility only in its temporary page and reports no engine/browser errors at completion.

At 22:00 the candidate joins far water to the dark sky much more convincingly. The near river still carries visible reflections and bank shape, and the city retains its prior lit windows and road pools. Day controls show no material new regression. **The 17:30 strip is still visible**: the current night factor is zero then, and the existing low-sun display transform is outside this correction. The straight geometric horizon also remains discernible at night. Mountain texture, large cloud-sheet reflections and oversized rain streaks remain synthetic. Under cloudy/rainy night, the former bright strip stays suppressed, but this does not constitute realistic weather art or a performance pass. Broad shared fog changes warrant the bounded qualification below; no extensive fog-transition sweep was supplied.

## Independently recomputed pixel check

The supplied unobstructed region is x=[220,380), with sky rows [150,160), horizon [168,178), water [181,191), on the original 1920 × 1080 riverfront_22 PNGs. I recomputed RGB means using Pillow and Rec.709 coefficients on encoded RGB:

| Display luma | Baseline | Candidate |
| --- | ---: | ---: |
| Sky | 49.40996 | 49.40996 |
| Horizon | 97.11873 | 47.25482 |
| Water below horizon | 81.70271 | 48.62514 |
| Horizon minus sky | +47.70878 | −2.15514 |

The excess drops **49.86391**, supporting the supplied rounded **49.86**. Supplied horizon 47.26 / difference −2.15 are within 0.006 of recomputation; this is insignificant precision/rounding, not a fabricated failure. This pinned region demonstrates removal of excess brightness, not a whole-frame score or physical radiance measurement.

## Source scope and ownership

The r8l delta is three files: environment index publishes its already-computed S.night into shared U.night; environment shaders bind/decorate the shared fog sky sample; terrain water applies the same **mix(1.0, 0.25, night)** gain to sky reflection and horizon samples. Environment already owns sky/weather/shared fog, and terrain already owns the water material. The existing terrain setup hands that material to environment setupMaterial, which attaches the same uniform wrapper. I imported the actual shader module read-only in Node and verified both independently created shader objects reference U.night and the installed fog GLSL declares/uses it.

The raw LUT and PMREM input remain unchanged. The visible dome's prior factor remains unchanged. The new consumer multiplication occurs before tone/output mapping; it does not dim rendered reflection geometry a second time. There are no new camera branches, geometry, RNG calls, world-generation, save or gameplay changes in this bounded delta. The full git diff also contains older exposure and reflection-cadence edits; those are not credited to r8l. Source hashes are in the JSON companion.

## Contracts and measured limits

The supplied night contract agrees across API, world, shared wrapper, water and sky at 12 → 17:30 → 22 → 12 → 22, with factors 0/0/1/0/1 and shared object identity. The cadence arrays independently yield **15/30/120 reflections per 120 frames**, intervals 8/4/1 for paused-fixed, active-fixed and active-moving. API/double-deserialize census is unchanged; eight tour stops succeed and invalid selection is rejected. All 32 recorded mixed-use buildings keep linked IDs/retail flags and exact recorded objects across both restores. Restage digests match 1337 → 7 → 1337 → 7 for their selected buildings/services/transit fields. All supplied contract error arrays are empty.

All **25 ordinary sidecars** report ready modules and zero errors; the four component images share one final probe record. Every final summary row matches its sidecar. Recomputed final metrics are **469 draws, 2,814,092 triangles, 46.1 FPS minimum, 2/16 below 50**, and **741.5 MB maximum raw endpoint heap**. The failing FPS frames are downtown_12 (49.4) and interchange_22 (46.1). Peak triangles are night_downtown_22; peak draws park_12; peak heap suburb_12. Seven of sixteen raw heaps exceed 512 MB.

The added weather views all fail 50 FPS: riverfront cloudy **43.2**, riverfront rain **44.5**, aerial cloudy **32.8**, aerial rain **42.8**. They remain zero-error with a weather-only maximum of 418 draws / 2,465,796 triangles / 720.4 MB raw heap. Directed candidate timing is also retained: noon 42.7, 17:30 32.1 and night 38.0 FPS, versus baseline 50.4/36.3 at 17:30/night. These short samples vary substantially between runs; neither an improvement nor a causal shader regression is established. The sixteen-frame geometry ceiling passes, but 50 FPS and raw memory margins remain open. No new forced-GC memory test was run.

## Remaining ranking

1. **democity** (support: zoning, buildings, roads, services): Sparse blocks and repeated building forms still dominate; silo detail does not alter frontage or density.

2. **props** (support: terrain, democity): Foliage remains planar with inconsistent crown density across distances despite accepted r8h improvement.

3. **cross-cutting** (support: buildings, props, services, effects, democity): Accepted r8i window depth remains local; repetitive luminous windows and schematic street/service pools persist.

4. **cross-cutting** (support: terrain, roads, democity, buildings, services): Abrupt grades, flat pads and untreated shore/site boundaries remain visible.

5. **cross-cutting** (support: democity, services, buildings, props): R8j hardstand and r8k silo details improve existing landmarks locally; materials, site connections and construction credibility remain schematic. The silo rung spacing is 1.45 m, so the access fittings should not be described as realistic maintenance infrastructure.

6. **cross-cutting** (support: terrain, environment, effects): R8l substantially suppresses the specific night LUT/display-brightness seam. The straight geometric horizon, 17:30 low-sun colour seam, broad daytime cloud reflection, mountain material and graphic rain still need work.

7. **cross-cutting** (support: democity, traffic, transit, simulation, buildings): Limited communicated human/site use. Static silo fittings add no storage, cargo, production, workers, loading or port-operation simulation.

8. **cross-cutting** (support: core, props, traffic, environment, effects, buildings): 16-frame geometry passes 1500/3M, but two matrix frames and all four weather frames miss 50 FPS. Raw heap is not retained-memory validation.

## Inspection register

- `shots/democity/r8l-night-horizon-baseline/riverfront_17p5.png`
- `shots/democity/r8l-night-horizon-baseline/riverfront_22.png`
- `shots/democity/r8l-night-horizon-diagnosis/baseline.png`
- `shots/democity/r8l-night-horizon-diagnosis/sky-hidden.png`
- `shots/democity/r8l-night-horizon-diagnosis/water-and-sky-hidden.png`
- `shots/democity/r8l-night-horizon-diagnosis/water-hidden.png`
- `shots/democity/r8l-night-horizon-candidate/riverfront_12.png`
- `shots/democity/r8l-night-horizon-candidate/riverfront_17p5.png`
- `shots/democity/r8l-night-horizon-candidate/riverfront_22.png`
- `shots/democity/r8l-night-horizon-final/bridge_12.png`
- `shots/democity/r8l-night-horizon-final/bridge_22.png`
- `shots/democity/r8l-night-horizon-final/downtown_12.png`
- `shots/democity/r8l-night-horizon-final/downtown_22.png`
- `shots/democity/r8l-night-horizon-final/industry_12.png`
- `shots/democity/r8l-night-horizon-final/industry_22.png`
- `shots/democity/r8l-night-horizon-final/interchange_12.png`
- `shots/democity/r8l-night-horizon-final/interchange_22.png`
- `shots/democity/r8l-night-horizon-final/night_downtown_12.png`
- `shots/democity/r8l-night-horizon-final/night_downtown_22.png`
- `shots/democity/r8l-night-horizon-final/park_12.png`
- `shots/democity/r8l-night-horizon-final/park_22.png`
- `shots/democity/r8l-night-horizon-final/riverfront_12.png`
- `shots/democity/r8l-night-horizon-final/riverfront_22.png`
- `shots/democity/r8l-night-horizon-final/suburb_12.png`
- `shots/democity/r8l-night-horizon-final/suburb_22.png`
- `shots/democity/r8l-night-horizon-weather/aerial_cloudy_22.png`
- `shots/democity/r8l-night-horizon-weather/aerial_rain_22.png`
- `shots/democity/r8l-night-horizon-weather/riverfront_cloudy_22.png`
- `shots/democity/r8l-night-horizon-weather/riverfront_rain_22.png`

## Evidence limits

- Independent review of supplied images and browser-probe results. No new browser captures, build or gameplay run was performed by this critic. Builder reports a successful 163-module build; final sidecars independently evidence successful rendering.
- 29 original images individually viewed: 2 baseline, 4 destructive component-diagnosis views, 3 directed candidate, 16 standard final and 4 additional weather controls. The component diagnosis has one end-of-probe JSON, not four per-image error/performance sidecars.
- 25 ordinary capture sidecars parsed; all report ready modules and zero errors. Component probe reports zero engine/browser errors at completion. Destructive debug visibility changes are diagnosis-only and are absent from production.
- The 16-frame final matrix covers eight cameras at noon/night; this is not a fresh complete whole-game four-time matrix, CS2 reference calibration, 720p visual comparison or blind A/B round. Previous 6.0 calibration remains unchanged.
- Pixel region was supplied/pinned rather than independently selected. I independently recomputed Rec.709-weighted encoded RGB means from original pixels; these are display luma, not scene-linear radiance or whole-image realism metrics. Last-decimal differences in supplied metrics are rounding/precision only.
- Final FPS measures 70–91 frames per capture, weather 50–67; directed candidates use different short windows. Host conditions and sample durations do not support a causal performance gain/regression attribution to the shader change.
- Raw endpoint heap is not forced-GC retained heap, GPU memory or proof of a memory leak. Existing earlier memory results were not rerun.
- Night uniform contract tests day and full-night endpoints, including 17:30 with night=0. It does not sample the full continuous dusk/dawn transition or quantify every fogged surface under all weather states.
- API restores verify the recorded census, mixed-use restores compare their complete recorded subset, and exact seed digests cover selected buildings/services/transit fields. These are not bitwise whole-world/save or GPU-buffer proofs.
- Current git diff includes earlier accepted exposure and water cadence work. R8l attribution is limited to the shared night uniform and three LUT-consumer gain expressions; PMREM/visible dome, geometry, world generation and save logic are unchanged by this bounded delta.

Only this report and its JSON companion were written.
