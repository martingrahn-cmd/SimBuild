# Tools — independent critic, round 2

**7.0/10 — FAIL.** The previews are now coherent and usable, but their contact with existing roads and exact undo/redo behaviour are not production-ready. API contract: **fail**. Console errors: **0** in completed captures and valid probes. Tools status: **ready in all 43 shots**. Maximum measured tools contribution: **8 calls / 5,802 triangles**; declared budget 20 / 40,000, measured target 12 / 20,000.

Calibrated on all eight `/Users/martingrahn/.simbuild/ref/cs2_*.jpg`, individually viewed this round. Read the CRITIC contract, module acceptance checklist, architecture and residual review decisions. Compared against `tools_r1.md`: missing poses/API, DOM chip rendering, unreadable sizing and neighbour failure handling are substantially fixed. Reference-level restraint and clean surface contact are still absent at the crossing. Surrounding terrain/tree/building style is not charged to the tools module.

All evidence here was independently captured/probed against `SIM_URL=http://127.0.0.1:5174 SIM_GL=metal SIMBUILD_REF=/Users/martingrahn/.simbuild/ref`; seed 1337, high quality, Metal. The shared HMR client was isolated. The base gauntlet covers 4 cameras x 4 times, the six module presets noon/night, plus 15 direct crop/integration/720p captures. A disk-full interruption was recovered by replacing only missing/corrupt outputs. At report assembly macOS marked some completed evidence dataless; this report uses already-read measurements and already-viewed images, without attempting further captures. Every final image listed below was viewed. Whole-frame counts include dependencies and are not tools-budget measurements.

## Measurements

| Measurement | Independent result |
|---|---|
| Tools render contribution | Three frozen-shadow on/off pairs: 8 calls, 5,802 triangles each |
| Whole frame maximum across 43 shots | 201 calls, 1,496,009 triangles |
| Pose / idle update average, 60 frames | 0.0267 ms / 0.00667 ms (Metal; informative, not a software-renderer FPS grade) |
| Geometry allocation after 200 pointers | 0 additional geometries |
| Roadtool night ribbon p1 / p50 / p99 | 201.860 / 202.072 / 203.000; ground p50 51.808; ratio 3.900 |
| Closeup night ribbon p50 / p99 | 202.072 / 203.072; ground p50 53.093; ratio 3.806 |
| Street night ribbon p50 / p99 | 201.860 / 218.000; ratio 3.500 (crop partly occluded, p1 4.791) |
| Dawn ribbon median saturation | Roadtool 0.00490; street 0.00490; zero pixels above 250 in each declared crop |
| 720p ribbon crop scale | 43/64 = 0.671875 in all four required noon/night roadtool/closeup pairs |
| Chips | 7 in roadtool and closeup; 12 aerial/skyline; measured height 26 px, no rectangle overlaps or clipping in checked layouts |
| 8-action undo / redo | Undo all counters and full height field exact; redo counters exact, height error 0.499928474 m at 668 vertices |
| Sculpt worst permitted-ray step | 1.728453636 m, exceeding 1.5 m |

Pixels use full-resolution PNGs and only module-declared crop rectangles, luminance 0.2126R + 0.7152G + 0.0722B. `critic-pixels.py/.json` retain measurements. The initial asynchronous group visibility measurement in `critic-apicheck.json` was confounded by neighbour shadow refresh and is superseded by three synchronous, shadow-frozen pairs in `critic-follow.json`; it is not a budget failure. Harness mistakes (a duplicate Vite module import, an attempted data-URL package import, and calling dispose while the registry still scheduled the module) were corrected; they are not application console errors.

## Acceptance and API checks

1. **Pass.** Source staging calls tools; 40 road edges, 35 nodes, 434 cells, all eight zone combinations, 33 buildings, multiple terrain-labelled history entries.
2. **Fail.** Prescribed material flags and reported 0.15 m lift exist; longitudinal sampling is at most 2 m. Actual asphalt/kerb penetration remains visible at 1080p.
3. **Pass.** Six poses simultaneously visible in aerial; API reports six.
4. **Pass for measured layout.** Seven roadtool/closeup chips, all 26 px. No overlap or bottom-150 reserve infringement. Skyline culls behind-camera anchors in source. Text visually readable at full resolution; exact cap-height remains the residual's manual advisory.
5. **Pass for staged readouts.** Roadtool shows 62 m, 50 m, 133 degrees, 0.6 percent and one 587 cost at the cursor; metrics and draft inspection agree. Costs finite with simulation removed (test cost 144, affordable true). This is not exhaustive validation of every possible curved 3D length.
6. **Measured luminance/contrast pass; integration advisory.** Night numeric bands pass. Tone mapping is off on overlay materials and linear channels are capped at 0.70. Edges visually crisp; no independent <=3 px edge-transition scalar was extracted. All-showcase screenshots have no staged tools ribbon and no tools crop, so bloom difference is unmeasured under the residual decision; do not claim a numeric bloom pass.
7. **Pass.** Node snap (1,1) selects node 6 at (0,0), successful commit adds one edge/one endpoint node. Edge snap (-120,1) splits edge 5 and commits a branch: net +2 edges/+2 nodes. Angle snap 15 degrees and grid snap to (304,304) verified; source applies documented engagement conditions.
8. **Pass.** Fully filled red invalid ghost; exact reason `Grade 17 % > 12 %`, metrics 17.22 percent. Commit false and edge delta zero. Read source for highway grade, minimum length, bounds, water/elevation and shared-angle guards.
9. **Fail.** The retained eight-action trace reproduces the 0.499928474 m redo drift twice. Full-field undo exact. Capacity 64; three consecutive terrain drag strokes create one entry. Service is stubbed, so one prop action replaces it, explicitly following the residual decision.
10. **Source/visual pass.** Preview palette values are shared exact values, alpha 0.45, cells filtered by zonableAt and placed on the 8 m grid. Zoned preview is visible at noon/night. No claim of pixel equality against zoning's different compositing alpha.
11. **Fail in victim-volume sizing; mutation passes.** 17 victims, exactly those 17 IDs returned; building count drops three. All prop volumes use one generic 2.2 x 2.2 x 6 shape. Only three staged buildings are in the marquee, below the section 8 recipe's four.
12. **Pass.** world.selection identity preserved; building ID picked correctly; one selection event and one clear event; footprint outline appears/removes.
13. **Pass.** 8 calls / 5,802 triangles stable differential, low update means, zero geometry delta after 200 pointers.
14. **Pass.** Probe finds zero helper-layer/shadow violations; no reflected preview observed.
15. **Pass.** Pinned poses disabled before tests. cancel, select(null), successful bulldoze commit and real Escape in the all showcase each yield idle, zero chips and zero ghost vertices.
16. **Pass.** Duplicate select emits one event; setOption one; reentrant callback one; short 200-pointer burst emitted two previews. In all showcase an actual HUD card click and option click each emit one. Dispose removes each tools-owned listener and preserves the preexisting time:tick count; registry scheduling is stopped for disposal probe.
17. **Fail.** Two rings/height chip present and repeated raise is monotonic (15.000123 -> 15.55 -> 16.10 -> 16.65), no NaNs. Required rays exceed slope limit at the precise coordinates in issue 3.
18. **Pass.** Clinic near (120,110) valid; (800,800) invalid with exact `No road access`. Filled footprint/dashed coverage circle visible; source uses 64 dashes and 0.26 opacity.
19. **Pass.** Temporarily missing props.place yields exact `props placement unavailable`; null service placement yields exact `service placement unavailable`; no charge, ghost retained, no errors. Simulation absent retains finite costs/affordability.
20. **Pass.** Two seed-1337 history/count/metrics outputs byte-identical; seed 99 same structural counts (40/35/434).
21. **Pass.** Four own 720p shots viewed; chips remain 26 px, within viewport/reserve, world-space crop scales 0.671875.
22. **Neutral ribbon pass; wash measurement blocked by crop defect.** Dawn saturation/clipping pass. Wash crop sometimes contains foliage or red pill, so out-of-band hue is not honestly attributable to wash colour. Report cropRects defect rather than failing the unmeasured hue requirement.

`rg Math.random src/modules/tools` found no usages. Git status was inspected; this is a shared multi-builder working tree, so unrelated concurrent module changes cannot be attributed to the tools builder. This critic changed only own reports/probes/evidence.

## Ranked issues

1. **MAJOR — Existing roads punch through the white preview.** At 1080p the posed avenue crossing has deep triangular asphalt/kerb intrusions, especially at the lower right. This fails acceptance 2 despite the prescribed transparent/depthWrite:false/-6/-6 material settings and reported 0.15 m vertex lift. Inspect actual rendered road heights and interpolation across the ribbon width; the statistics report requested lift, not continuity over road surfaces. The defect shrinks at 720p, so only checking the smaller render hides it. Evidence: `shots/tools/r2/critic_roadtool_12.png; shots/tools/r2/critic_roadtool_22.png; shots/tools/r2/closeup_22.png; comparison shots/tools/r2/critic_roadtool_12_720.png`.

2. **MAJOR — Redo fails to restore the post-action terrain.** Two independent clean loads reproduced the same eight committed actions with three animation frames after each action, undo and redo. All eight succeed; undo restores every terrain vertex and all four counters exactly. Redo restores counters but differs by up to 0.49992847442626953 m across 668 terrain vertices, exceeding the 0.001 m tolerance. Trace: alley roads (-40,155) to (40,155) and (-40,170) to (40,170); two size-16 high-density zone strokes at (-200,-30) office and (-120,50) commercial; size-30 strength-50 sculpt raise (0,170), lower (40,170); demolish building 11; place tree_oak (60,160). A prop replaces the unavailable service per the residual decision. Do not sample only remote terrain points: compare the complete height field. Evidence: `shots/tools/r2/critic-apicheck.mjs and .json history; shots/tools/r2/critic-follow.mjs and .json history`.

3. **MINOR — Sculpt showcase exceeds the permitted terrain step.** The required 16-ray, 2 m sampling probe finds a 1.728453636 m adjacent step at (150,-172) to (150,-174): heights 7.043300629 and 5.314846992 m. Both endpoints pass the 20 m road exclusion. Acceptance 17 permits at most 1.5 m. The brush does raise monotonically and has no NaN heights, but the staged dome needs more smoothing at its outer slope. Evidence: `shots/tools/r2/critic-follow.json metrics.sculpt; shots/tools/r2critic_presets/sculpt_12.png`.

4. **MINOR — Bulldoze prop volumes do not match their victims.** The marquee correctly reports/removes 17 items, including three buildings and 14 props, and the building counter drops by three. However every prop is rendered as the same 2.2 x 2.2 x 6 m volume, regardless of its kind or actual footprint; the tall narrow red boxes visibly fail to hug small objects. Acceptance 11 requires object-sized volumes. The showcase also contains only three doomed buildings against the four required by the section 8 pose recipe. Evidence: `src/modules/tools/index.js:199; shots/tools/r2critic_presets/bulldoze_12.png; shots/tools/r2/critic-follow.json metrics.victims and demolition`.

5. **MINOR — Pinned wash crops are contaminated by foliage and chips.** The wash landmark returns visible rectangles that do not isolate wash pixels. Street dawn yields median hue 72.775 degrees and street night 140 degrees from foreground foliage; skyline evening samples the red reason pill (6.486 degrees). Roadtool noon is also contaminated (184.615 degrees). This is a cropRects measurement-contract defect, not evidence that the wash material itself turns green/red. Keep landmarks clear of occluders and overlay pills, or decline an occluded landmark. Acceptance 22 wash hue is not failed unmeasured. Evidence: `shots/tools/r2/critic-pixels.json; shots/tools/r2/critic_street_6p5.crops.json and .png; shots/tools/r2/critic_skyline_17p5.crops.json and .png`.

## Strengths to preserve

- The district is authored through tools: 40 edges, 35 nodes, 434 zone cells across all eight type/density combinations, 33 buildings and 24 undo entries.
- All six preview poses render; neutral white ribbon, cyan snap cue, red invalid state and dark 26 px instanced chips establish a coherent visual language.
- Night ribbon luminance and contrast meet the numerical bands without clipping; chip sizes remain constant at 720p.
- Measured tools cost is 8 draw calls and 5802 triangles; 200 pointer calls allocate no geometry.
- Actual node and edge commits, in-place selection, clean unavailable-neighbour failures, deterministic staging, preview cleanup and HUD event deduplication work.

## Per-shot notes

- `shots/tools/r2/aerial_6p5.png` — All six poses read in the district overview; clinic coverage, red invalid run and demolition marquee are distinct. Dawn light preserves neutral overlay white. (ready, 0 errors.)
- `shots/tools/r2/aerial_12.png` — All six poses read in the district overview; clinic coverage, red invalid run and demolition marquee are distinct. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2/aerial_17p5.png` — All six poses read in the district overview; clinic coverage, red invalid run and demolition marquee are distinct. Evening light preserves overlay neutrality. (ready, 0 errors.)
- `shots/tools/r2/aerial_22.png` — All six poses read in the district overview; clinic coverage, red invalid run and demolition marquee are distinct. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2/street_6p5.png` — White road band and dark pills remain legible; foreground foliage crosses the road and wash, and the cursor extends outside the composition. Dawn light preserves neutral overlay white. (ready, 0 errors.)
- `shots/tools/r2/street_12.png` — White road band and dark pills remain legible; foreground foliage crosses the road and wash, and the cursor extends outside the composition. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2/street_17p5.png` — White road band and dark pills remain legible; foreground foliage crosses the road and wash, and the cursor extends outside the composition. Evening light preserves overlay neutrality. (ready, 0 errors.)
- `shots/tools/r2/street_22.png` — White road band and dark pills remain legible; foreground foliage crosses the road and wash, and the cursor extends outside the composition. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2/skyline_6p5.png` — Distant district retains distinguishable white/red/blue tool states, but the screen-sized chip cluster dominates the small district. Dawn light preserves neutral overlay white. (ready, 0 errors.)
- `shots/tools/r2/skyline_12.png` — Distant district retains distinguishable white/red/blue tool states, but the screen-sized chip cluster dominates the small district. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2/skyline_17p5.png` — Distant district retains distinguishable white/red/blue tool states, but the screen-sized chip cluster dominates the small district. Evening light preserves overlay neutrality. (ready, 0 errors.)
- `shots/tools/r2/skyline_22.png` — Distant district retains distinguishable white/red/blue tool states, but the screen-sized chip cluster dominates the small district. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2/closeup_6p5.png` — Road angle and grade pills read clearly; broad white ribbon has asphalt/kerb intrusions at the lower-right crossing and cursor extends beyond frame. Dawn light preserves neutral overlay white. (ready, 0 errors.)
- `shots/tools/r2/closeup_12.png` — Road angle and grade pills read clearly; broad white ribbon has asphalt/kerb intrusions at the lower-right crossing and cursor extends beyond frame. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2/closeup_17p5.png` — Road angle and grade pills read clearly; broad white ribbon has asphalt/kerb intrusions at the lower-right crossing and cursor extends beyond frame. Evening light preserves overlay neutrality. (ready, 0 errors.)
- `shots/tools/r2/closeup_22.png` — Road angle and grade pills read clearly; broad white ribbon has asphalt/kerb intrusions at the lower-right crossing and cursor extends beyond frame. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2critic_presets/roadtool_12.png` — White multi-segment ribbon, cyan snap ring, guide dashes and price/length/angle/grade pills read clearly; asphalt/kerb punctures spoil the lower crossing. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2critic_presets/roadtool_22.png` — White multi-segment ribbon, cyan snap ring, guide dashes and price/length/angle/grade pills read clearly; asphalt/kerb punctures spoil the lower crossing. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2critic_presets/zonetool_12.png` — Green zone footprint follows cell blocks; road and service previews remain visible behind it. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2critic_presets/zonetool_22.png` — Green zone footprint follows cell blocks; road and service previews remain visible behind it. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2critic_presets/sculpt_12.png` — Two white rings and signed height pill mark the knoll; slope is visually steep toward the river and fails the ray test. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2critic_presets/sculpt_22.png` — Two white rings and signed height pill mark the knoll; slope is visually steep toward the river and fails the ray test. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2critic_presets/bulldoze_12.png` — Red marquee and refund/item pills are readable; three building volumes and multiple uniformly tall narrow prop boxes are visible. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2critic_presets/bulldoze_22.png` — Red marquee and refund/item pills are readable; three building volumes and multiple uniformly tall narrow prop boxes are visible. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2critic_presets/service_12.png` — Clinic footprint and large dashed cyan coverage circle read clearly, with a legible service label/cost. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2critic_presets/service_22.png` — Clinic footprint and large dashed cyan coverage circle read clearly, with a legible service label/cost. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2critic_presets/invalid_12.png` — Solid red invalid road, endpoint circles and grade-reason pill remain distinct against the hillside. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2critic_presets/invalid_22.png` — Solid red invalid road, endpoint circles and grade-reason pill remain distinct against the hillside. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2/critic_roadtool_6p5.png` — White multi-segment ribbon, cyan snap ring, guide dashes and price/length/angle/grade pills read clearly; asphalt/kerb punctures spoil the lower crossing. Dawn light preserves neutral overlay white. (ready, 0 errors.)
- `shots/tools/r2/critic_roadtool_12.png` — White multi-segment ribbon, cyan snap ring, guide dashes and price/length/angle/grade pills read clearly; asphalt/kerb punctures spoil the lower crossing. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2/critic_roadtool_17p5.png` — White multi-segment ribbon, cyan snap ring, guide dashes and price/length/angle/grade pills read clearly; asphalt/kerb punctures spoil the lower crossing. Evening light preserves overlay neutrality. (ready, 0 errors.)
- `shots/tools/r2/critic_roadtool_22.png` — White multi-segment ribbon, cyan snap ring, guide dashes and price/length/angle/grade pills read clearly; asphalt/kerb punctures spoil the lower crossing. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2/critic_closeup_12.png` — Road angle and grade pills read clearly; broad white ribbon has asphalt/kerb intrusions at the lower-right crossing and cursor extends beyond frame. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2/critic_closeup_22.png` — Road angle and grade pills read clearly; broad white ribbon has asphalt/kerb intrusions at the lower-right crossing and cursor extends beyond frame. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2/critic_street_6p5.png` — White road band and dark pills remain legible; foreground foliage crosses the road and wash, and the cursor extends outside the composition. Dawn light preserves neutral overlay white. (ready, 0 errors.)
- `shots/tools/r2/critic_street_22.png` — White road band and dark pills remain legible; foreground foliage crosses the road and wash, and the cursor extends outside the composition. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2/critic_skyline_17p5.png` — Distant district retains distinguishable white/red/blue tool states, but the screen-sized chip cluster dominates the small district. Evening light preserves overlay neutrality. (ready, 0 errors.)
- `shots/tools/r2/critic_all_night_street_22.png` — All-showcase terrain and HUD render, but the tools district/poses are not staged; no tools ribbon/wash crop is available. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2/critic_all_aerial_12.png` — All-showcase terrain and HUD render, but the tools district/poses are not staged; no tools ribbon/wash crop is available. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2/critic_roadtool_12_720.png` — 720p: pills remain readable and screen-sized with no clipping; ground geometry shrinks correctly. Crossing punctures are much less visible than at 1080p. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2/critic_roadtool_22_720.png` — 720p: pills remain readable and screen-sized with no clipping; ground geometry shrinks correctly. Crossing punctures are much less visible than at 1080p. Night remains legible without a bright halo. (ready, 0 errors.)
- `shots/tools/r2/critic_closeup_12_720.png` — 720p: pills remain readable and screen-sized with no clipping; ground geometry shrinks correctly. Crossing punctures are much less visible than at 1080p. Noon overlay contrast is clear. (ready, 0 errors.)
- `shots/tools/r2/critic_closeup_22_720.png` — 720p: pills remain readable and screen-sized with no clipping; ground geometry shrinks correctly. Crossing punctures are much less visible than at 1080p. Night remains legible without a bright halo. (ready, 0 errors.)
