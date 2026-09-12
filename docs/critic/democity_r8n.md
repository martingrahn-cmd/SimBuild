# Democity R8n — independent sunset NaN review

**ACCEPT the bounded correction. Democity 6.0/10; whole-game 6.0/10 — FAIL against 8.5.** The nearly black sunset failure recorded in R8m is absent in all supplied corrected boundary samples and the three fresh browser starts. This restores a usable scene at sunset; it does not move the complete city into a higher visual band.

## What was verified

I individually inspected **all 39 required original PNGs** listed below, including all sixteen noon/night controls. I read their nineteen individual sidecars, both shared sweep records, diagnosis/state probes, contracts, builder report and actual source. The twenty sweep originals have shared records rather than individual CLI sidecars. This is an independent critique of supplied evidence, with independent pixel and numerical replays; I did not claim authorship of these browser captures.

The current environment source SHA256 is `14f0b2be0e8d76a61fcd4d43429a625ab2ef049e8678da3ed944bf63676d105f`. Reversing only the solar clamp and normalization hunks in memory exactly reconstructs the previously recorded R8m hash `472d268dd461c2f913b440ef5e2f6bac93dd70883b53b0d28f0d0b23aef05c4f`. Thus the broader git diff's earlier exposure/view-direction/night-uniform changes are not R8n changes. Environment shaders, sky and terrain water hashes still match R8m.

R8n changes the solar sample minimum y from .004 to .008 and normalizes solar colour only when the actual transmittance maximum exceeds 1e-6. The old guard examined a light intensity containing a nonzero artificial horizon floor, then divided by zero transmittance. An independent Node replay using the actual `transmittance` function at altitude 150 produces `[0,0,0]` with the old .004 direction and `[NaN,NaN,NaN]` under its normalization. The new zero guard remains finite; .008 produces `[0.05366642187483889,0.007184884288864744,0.0001028875551982396]`.

A precision correction to the causal narrative matters: the baseline probe already chooses finite **moon** light at exactly 18. Its solar colour still becomes nonfinite and is copied into shared `fogSunCol`. The transition probe identifies nonfinite solar/fog values at 17.98, 17.99, 18, 18.01, 18.02 and 18.05. The candidate has finite solar/fog values at all fifteen sampled times from 17.5 to 18.5, and every recorded diagnostic value is finite at 17.999/18/18.001. The failure is not contingent on active sunlight at exactly 18.

No RNG, world/save identity, geometry, public gameplay API or camera branch is added. The moon path is unchanged. The raised clamp also influences solar transmittance/intensity and cloud-sun sampling close to the horizon, so this is not strictly a chromaticity-only change. The numerical guard covers the demonstrated zero denominator; it is not a universal sanitizer for arbitrary nonfinite inputs.

## Visual evidence and tool correction

Every required frame renders the actual city. The 17.99/18/18.01 candidate images and fresh starts show terrain, buildings and water instead of a nearly black 3D viewport. The noon controls retain their previous grade, and the night controls retain readable city lights. No new geometric, compositional or day/night material regression is apparent in this set.

There is still a visible warm-red sun to cooler moon handoff between 17.99 and 18. The unchanged `sunIntensity >= moonIntensity` light selection explains why finite output need not mean a perfectly smooth artistic transition. This does not justify rejecting the NaN repair. Continuous real-time handoff quality remains untested.

Both corrected `sweep.mjs` files call public `environment.refreshEnvironment()` after every clock jump and settle 24 frames. Without this, the angular/timed LUT and PMREM caches could retain the previous sample. The corrected results establish settled states, not natural update-cadence continuity. Three fresh CLI boots at 17.99, 18 and 18.01 corroborate the boundary independently of sweep ordering. Debug transition probes measure per-frame solar/fog values and do not need a refreshed LUT for those particular fields; they cannot establish settled full-image colour on their own.

I recomputed every stored image metric from all twenty original sweep PNGs with Pillow: RGB luma `.2126R + .7152G + .0722B`, sampled every eight pixels from x=220 to1919 and y=0 to979, nonblack threshold >3. Every mean and nonblack fraction agrees with its stored value to <1e-9. Close-sweep means at 17.99/18/18.01 are **26.118128318 / 27.877738830 / 28.055248002**. Minimum close nonblack fraction is **0.956372381**. Broad-sweep means range **24.181841895–99.431617298**, with minimum nonblack fraction **0.963319211**. These measures corroborate absence of the blackout; they are not visual quality scores or evidence of a perfectly smooth curve.

## Contracts and performance

I replayed equality of the supplied API census before/after two successful deserializations: 612 buildings, 9964 cells/612 lots, 31 services and one eight-stop line. Eight valid tour checks succeed and invalid tour returns false. All 32 recorded mixed-use building snapshots agree across both restores, with mixed-use/plan/retail flags and zone back-links intact. The 1337→7→1337→7 selected building/service/transit digests match exactly for repeated seeds. This does not prove equality of every save field. Shared sun vectors agree across environment/world/water/sky/fog and water-night agrees with environment-night. Water reflection counts are 15/30/120 per120 frames for paused-fixed/active-fixed/moving-camera cases.

All sixteen final sidecars match the summary: **ready, zero errors, max469 draws, max2,814,092 triangles, min47.2 FPS**. Four fail the local 50 FPS target: downtown22=49.3, interchange12=49.0, interchange22=47.2 and park22=48.1. Raw endpoint heap reaches **682.5 MB**, with **8/16 above512 MB**. Props reaches **2.1 ms** at the park12 update endpoint. Draw/triangle gates pass; these FPS/raw-memory/CPU observations do not. Summary `pass:true` must not be read as a whole-game gate pass.

Fresh boundary starts report 60.0/59.3/59.0 FPS and no errors. These short Apple M4 Metal samples do not establish sustained performance, GTX1660 performance, stalls, leak freedom or an optimization versus R8m. Raw heap is not forced-GC retained heap. Build163-module success is builder-reported and was not rerun here. Existing university-site and deferred road-furniture warnings remain despite zero errors.

## Remaining priority

The previous P1 sunset blackout is resolved within the supplied tested states. **The next highest-priority verified visual bottleneck is still sparse, repetitive city fabric**: broad lawns around detached towers and weak continuous street frontage dominate downtown12 and park12. This is owned by Democity with zoning/buildings/roads/services. A local numerical repair does not close the eight previously ranked whole-game weaknesses:

1. **democity, zoning, buildings, roads, services:** Sparse repetitive city fabric: detached towers and repeated blocks sit in broad lawns with limited continuous street frontage.
2. **props:** Planar leaf cards and repeated rounded crown silhouettes remain prominent.
3. **buildings, props, services, effects:** Night window grids and local light pools still lack convincing depth and variation.
4. **terrain, roads, democity, services:** Abrupt road grades, pads and site-to-landscape transitions remain visible.
5. **democity, services, props:** Landmark and industrial grounds remain schematic despite accepted local asset detailing.
6. **environment, terrain, effects:** Straight geometric horizon and coarse/stretched mountain material remain; warm-sun/cool-moon handoff near 18 is visibly abrupt. Weather/cloud-reflection artistry remains previously open and was not rerun here.
7. **democity, traffic, transit, simulation:** Limited visible human use and activity; static paused images do not establish native gameplay quality.
8. **core, props, traffic, environment, terrain, buildings:** Four of sixteen FPS samples below 50; raw heap exceeds 512 MB in eight; props update endpoint exceeds 2 ms. No causal regression or retained leak demonstrated.

For a subsequent bounded environment task, the observed sun/moon colour handoff deserves a natural-time continuity check; straight horizon geometry and mountain material also remain open. That narrower suggestion does not outrank city fabric in the whole-game judgment. Existing weather/reflection weaknesses were not newly tested this round. No functional silo/port activity or expanded gameplay follows from this lighting change.

## Inspection register

Every PNG below was viewed individually; derived contact sheets were not substituted.

### r8n-sunset-nan-candidate

- `shots/democity/r8n-sunset-nan-candidate/riverfront_17p5.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_17p75.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_17p95.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_17p98.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_17p99.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_18.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_18p01.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_18p02.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_18p05.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_18p1.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_18p25.png`
- `shots/democity/r8n-sunset-nan-candidate/riverfront_18p5.png`

### r8n-sunset-nan-final-sweep

- `shots/democity/r8n-sunset-nan-final-sweep/riverfront_15.png`
- `shots/democity/r8n-sunset-nan-final-sweep/riverfront_16.png`
- `shots/democity/r8n-sunset-nan-final-sweep/riverfront_17.png`
- `shots/democity/r8n-sunset-nan-final-sweep/riverfront_17p5.png`
- `shots/democity/r8n-sunset-nan-final-sweep/riverfront_18.png`
- `shots/democity/r8n-sunset-nan-final-sweep/riverfront_18p5.png`
- `shots/democity/r8n-sunset-nan-final-sweep/riverfront_19.png`
- `shots/democity/r8n-sunset-nan-final-sweep/riverfront_20.png`

### r8n-sunset-nan-fresh

- `shots/democity/r8n-sunset-nan-fresh/riverfront_17p99.png`
- `shots/democity/r8n-sunset-nan-fresh/riverfront_18.png`
- `shots/democity/r8n-sunset-nan-fresh/riverfront_18p01.png`

### r8n-sunset-nan-final

- `shots/democity/r8n-sunset-nan-final/bridge_12.png`
- `shots/democity/r8n-sunset-nan-final/bridge_22.png`
- `shots/democity/r8n-sunset-nan-final/downtown_12.png`
- `shots/democity/r8n-sunset-nan-final/downtown_22.png`
- `shots/democity/r8n-sunset-nan-final/industry_12.png`
- `shots/democity/r8n-sunset-nan-final/industry_22.png`
- `shots/democity/r8n-sunset-nan-final/interchange_12.png`
- `shots/democity/r8n-sunset-nan-final/interchange_22.png`
- `shots/democity/r8n-sunset-nan-final/night_downtown_12.png`
- `shots/democity/r8n-sunset-nan-final/night_downtown_22.png`
- `shots/democity/r8n-sunset-nan-final/park_12.png`
- `shots/democity/r8n-sunset-nan-final/park_22.png`
- `shots/democity/r8n-sunset-nan-final/riverfront_12.png`
- `shots/democity/r8n-sunset-nan-final/riverfront_22.png`
- `shots/democity/r8n-sunset-nan-final/suburb_12.png`
- `shots/democity/r8n-sunset-nan-final/suburb_22.png`

### JSON evidence read and checked

- `shots/democity/r8n-sunset-nan-candidate/state-probe.json`
- `shots/democity/r8n-sunset-nan-candidate/sweep.json`
- `shots/democity/r8n-sunset-nan-candidate/transition-probe.json`
- `shots/democity/r8n-sunset-nan-final-sweep/sweep.json`
- `shots/democity/r8n-sunset-nan-fresh/riverfront_17p99.json`
- `shots/democity/r8n-sunset-nan-fresh/riverfront_18.json`
- `shots/democity/r8n-sunset-nan-fresh/riverfront_18p01.json`
- `shots/democity/r8n-sunset-nan-final/bridge_12.json`
- `shots/democity/r8n-sunset-nan-final/bridge_22.json`
- `shots/democity/r8n-sunset-nan-final/downtown_12.json`
- `shots/democity/r8n-sunset-nan-final/downtown_22.json`
- `shots/democity/r8n-sunset-nan-final/industry_12.json`
- `shots/democity/r8n-sunset-nan-final/industry_22.json`
- `shots/democity/r8n-sunset-nan-final/interchange_12.json`
- `shots/democity/r8n-sunset-nan-final/interchange_22.json`
- `shots/democity/r8n-sunset-nan-final/night_downtown_12.json`
- `shots/democity/r8n-sunset-nan-final/night_downtown_22.json`
- `shots/democity/r8n-sunset-nan-final/park_12.json`
- `shots/democity/r8n-sunset-nan-final/park_22.json`
- `shots/democity/r8n-sunset-nan-final/riverfront_12.json`
- `shots/democity/r8n-sunset-nan-final/riverfront_22.json`
- `shots/democity/r8n-sunset-nan-final/suburb_12.json`
- `shots/democity/r8n-sunset-nan-final/suburb_22.json`
- `shots/democity/r8n-sunset-nan-final/summary.json`
- `shots/democity/r8n-sunset-nan-contract/apicheck.json`
- `shots/democity/r8n-sunset-nan-contract/display-contract.json`
- `shots/democity/r8n-sunset-nan-contract/mixed-use.json`
- `shots/democity/r8n-sunset-nan-contract/restage-cycle.json`
- `shots/democity/r8n-sunset-nan-contract/water-cadence.json`
- `shots/democity/r8n-sunset-black-diagnosis/baseline_17p999.json`
- `shots/democity/r8n-sunset-black-diagnosis/baseline_18p001.json`
- `shots/democity/r8n-sunset-black-diagnosis/state-probe.json`
- `shots/democity/r8n-sunset-black-diagnosis/transition-probe.json`

### Limits

- Independent review of supplied captures and data, with independent original-pixel recomputation and actual atmosphere-function replay; no new browser captures or gameplay run by this critic.
- All 39 required original PNGs were individually inspected. Twenty sweep originals have shared sweep.json records, not individual screenshot sidecars. Nineteen fresh/final originals have individual sidecars.
- No fresh eight-reference calibration, full 32-frame whole-game matrix, blind A/B judging, native playtest, all-weather sunset sweep, dawn sweep, or continuous real-time sunset recording in this bounded round. Existing whole-game anchors/ranking retained.
- Corrected sweeps explicitly refresh environment after clock jumps and settle 24 frames. They establish clean settled samples, not natural LUT/PMREM cadence continuity. Fresh CLI boots independently confirm 17.99/18/18.01.
- Transition debug probes inspect internal environment state for diagnosis only; they do not add or validate a gameplay API. These probes do not refresh the LUT, but the observed sunColor/fogSunCol are assigned per frame.
- Raw endpoint heap is not forced-GC retained memory. Short M4 Metal windows are not sustained or target-GTX1660 proof. Fewer slow samples than R8m do not establish a performance improvement.
- API restoration checks cover recorded census and mixed-use fields; restage equality covers serialized selected buildings/services/transit digests, not every world field or arbitrary save migration.
- Build 163-module pass is builder-reported, not rerun by this critic. Existing university-site and deferred road-furniture warnings remain, despite zero errors.
