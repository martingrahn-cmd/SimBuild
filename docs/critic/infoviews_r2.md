# Infoviews round 2 — 6.0/10, FAIL

6.0/10 FAIL. Correct deterministic data, improved mesh conformance and crop bounds, but default terrain/street integration, night colour and building readability remain visibly synthetic. Cold recompute and three distribution gates still fail.

Independent critic, no production edits. Role, specification, architecture, residual exclusions and all eight CS2 references reviewed. All 44 fresh PNG individually viewed through the image reader (28 matrix, 14 frozen mask frames, two UI frames). System Chrome 152, actual Metal Apple M4, shared port 5174.

Official matrix maximum 182 draw calls, 1385748 triangles; FPS range [52.6, 60.3]. All captures ready with zero errors. Measurements were made during concurrent work and are not labelled software rendering. Empty all-mode does not prove full-game performance or playability.

## Ranked issues

1. **major: Ground colour still hides streets and breaks against rendered terrain** — The new mesh passes the prescribed vertex test: 235 flat samples, all within band; 1765 steep samples, maximum lift 0.703997 m. Independent 1964 dry triangle-centre samples now have zero below the actual heightfield, fixing the r1 interior defect. Nevertheless default aerial/skyline captures retain conspicuous hillside holes, dashed road wedges and lost kerbs. Builder diagnostic attributes hillside gaps to the host terrain LOD surface; that is a core integration request, not evidence that the default visual passes. Keep the conformance fix and solve the rendered-surface/road integration without forcing all terrain to maximum detail. Evidence: `shots/infoviews/r2/critic-matrix/skyline_12.png; shots/infoviews/r2/critic-matrix/degraded_roads.png; shots/infoviews/r2/critic-probe/supplement-live.json; docs/core-requests/infoviews.md`.

2. **major: Night data colours still exceed the 8/255 drift ceiling** — Fresh 1080p frozen on/off masks yield top-2000 pollution channel deltas 14.1265/19.0800/14.6780 and landvalue 8.7940/11.0920/11.0970. Night p99 luma is 197.123 and 214.117, below 235. Preserve readable nights while stabilizing data colour; do not brighten the global environment to satisfy this. Evidence: `shots/infoviews/r2/critic-probe/pixel-analysis.json`.

3. **major: Building films flatten roof and wall separation** — All ten pinned landvalue roof/wall mean-luma differences remain below 25/255, ranging 0.941668–20.656981. Callback coverage is 246/246 with alpha 0.70, but visual film is weakly shaded. Density crops no longer expand to the full frame; its measured 1.39–13.20 differences are confirming only because foreground occlusion and untinted equipment can contaminate projected rectangles. The clear landvalue evidence alone fails the required contrast. Evidence: `shots/infoviews/r2/critic-masks/iv_landvalue_12.png; shots/infoviews/r2/critic-probe/pixel-analysis.json`.

4. **major: Three fixed-domain distributions remain degenerate** — Over the exact 21671-cell mask, pollution p95−p5 is 0.186521; garbage range is 0 with 97.5313% near its mean; density range is 0.029940 with 94.7487% near its mean. All twelve grids match an independent derivation within 2.3842e−7. Do not fabricate populations, rescale grids or change source formulas. Preserve honest staged simulation data and document any mandated pre-roll/specification conflict. Evidence: `shots/infoviews/r2/critic-probe/data-api.json`.

5. **major: Cold synchronous recompute still exceeds budget** — First explicit recompute measured 21.2 ms, above 12 ms. Ten subsequent calls take 4.5–8.4 ms, a substantial real improvement. Average active update is 0.005 ms and inactive 0.001667 ms; three idle game hours trigger three rebuilds and a 20-event burst triggers one. Preserve caching and synchronous publication; investigate the remaining cold path without hiding the first sample. Evidence: `shots/infoviews/r2/critic-probe/api.json; shots/infoviews/r2/critic-probe/contracts.json`.

6. **minor: A small exact-waterline alpha discontinuity remains** — The coast inset improves the old maximum sampled jump from 0.3980 to 0.027570. Ten transects remain monotonic, water samples are exactly zero and inland samples reach one. One transect is already 0.02757 immediately landward of the exact water boundary, so the literal no-hard-cut clause is only partially met. Transects are not shore-normal and cannot establish the exact eight-metre width. Evidence: `shots/infoviews/r2/critic-probe/settled-probe.json`.

## Acceptance and API

- 1 PASS: all 12 IDs synchronously publish 65536 Float32 data, legend and one activation event; invalid selection is a no-op.
- 2 FAIL: pollution, garbage and density distributions above. All grids finite in [0,1], independently derived formulas agree.
- 3 FAIL: both night channel-drift tests exceed 8/255; night p99 clipping gate passes.
- 4 PARTIAL/FAIL: prescribed vertex/material and independent native-heightfield interior tests pass; default rendered terrain/road confirming images fail. Host LOD request remains unresolved.
- 5 PASS: pollution top-decile saturation 0.522157; power 0.531446. Non-overlay saturation ratios are diagnostics, not grounds to penalize external modules.
- 6 PASS: adjacent ramp-stop max channel differences 60/125/129/224; landvalue deciles occupy 5 of 8 L* buckets.
- 7 FAIL: all 246 callback tints alpha 0.70; all ten landvalue face contrasts fail. Previous full-frame density crop API defect is fixed.
- 8 PARTIAL: callback directly follows fixed ramp and sample. Inverse-ramp Spearman not separately measured; no penalty for residual-unmeasurable colour count.
- 9 PASS: 65 arms at the first 20 ID-ordered intersections, 4 m strip geometry, maximum uncovered gap zero.
- 10 PARTIAL: water alpha zero, inland one, monotonic ten transects; small exact-waterline jump remains. Exact shore-normal width unmeasured.
- 11 UNMEASURED: iv_power and fallback skyline each supply zero near ≤200 m overlay pixels; required 2000/2000 near/far comparison cannot be formed. fog:true; no failure assigned.
- 12 PASS: specified fallback service fields remain populated and unchanged; independent live wind turbine gives real supply-limited coverage, not a fictitious radial result.
- 13 PASS: legend 316×211.4375 px, 12 px font; within 380×300.
- 14 PASS: twelve tiles, 316×134 px picker, 12 px font; no 720p overflow.
- 15 PASS: actual play toolbar click publishes active/data/legend synchronously, zero module panels and one HUD legend; all-mode also one legend.
- 16 PASS for owned state: two frames after deactivation all owned meshes hidden, draws zero, active/data/legend null, desaturation zero and callback cleared. Cached terrain water reflections can linger: external integration issue.
- 17 PASS: settled landvalue 2 draws/238934 triangles, power 3/238998, traffic 2/6864. Some raw deltas mix host CSM/LOD changes and are retained, not attributed to overlay cost. Maximum owned triangles remain below 260000.
- 18 PASS: both required reduced-dependency captures ready, zero errors, visible fallback maps.
- 19 PASS: two fresh same-seed runs agree for all twelve sums to six decimals; no Math.random or Date.now in module.
- 20 PARTIAL/FAIL: frame averages, coalescing and observed heap pass; cold 21.2 ms recompute fails. Warm 4.5–8.4 ms calls pass. Whole-page 300-frame heap change −1.287 MiB is an observation, not zero-allocation proof.
- 21 PASS in sampled API trace: monotonic 0→1 transition reaches one at 316.6 ms, no overshoot. No separate per-frame white-flash PNG measurement claimed.
- 22 PASS: fresh-page crime deserialization restores full grid and Crime legend within two frames; unknown value leaves selection unchanged.
- 23 PASS: all 28 official captures ready with zero errors; all 44 independent PNG viewed individually. All-mode remains an empty democity stub.

## Every captured image

- `shots/infoviews/r2/critic-matrix/aerial_12.png` — Broad orange field retains overall districts but erases road surfaces; dark intersection islands and triangular gaps remain. 155 draws, 817576 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/aerial_22.png` — Broad orange field retains overall districts but erases road surfaces; dark intersection islands and triangular gaps remain. Night remains readable but data colours drift. 160 draws, 828976 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/skyline_12.png` — Hill perforations remain conspicuous and the broad orange landscape dominates weakly separated building forms. 171 draws, 1142496 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/skyline_22.png` — Hill perforations remain conspicuous and the broad orange landscape dominates weakly separated building forms. Night remains readable but data colours drift. 165 draws, 1125628 triangles, 59.8 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/street_12.png` — Pale olive film leaves window lines visible, but kerbs disappear and grass protrudes through the colour surface. 120 draws, 1370832 triangles, 59.9 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/street_22.png` — Pale olive film leaves window lines visible, but kerbs disappear and grass protrudes through the colour surface. Night remains readable but data colours drift. 127 draws, 1385748 triangles, 59.9 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/closeup_12.png` — Building film flattens repeated volumes; rooftop equipment stays conspicuously untinted. 120 draws, 1122956 triangles, 59.8 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/closeup_22.png` — Building film flattens repeated volumes; rooftop equipment stays conspicuously untinted. Night remains readable but data colours drift. 126 draws, 1131914 triangles, 60.3 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/skyline_17p5.png` — Hill perforations remain conspicuous and the broad orange landscape dominates weakly separated building forms. 182 draws, 1163202 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/street_6p5.png` — Pale olive film leaves window lines visible, but kerbs disappear and grass protrudes through the colour surface. 129 draws, 1383396 triangles, 60.3 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_pollution_12.png` — Clear industrial hotspot surrounded by broad cyan field; road fringes and terrain gaps remain. 166 draws, 866510 triangles, 60.2 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_pollution_22.png` — Clear industrial hotspot surrounded by broad cyan field; road fringes and terrain gaps remain. Night remains readable but data colours drift. 165 draws, 860956 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_traffic_12.png` — Purple facades occlude most of the prescribed ribbon framing; separate intersection geometry probe passes. 115 draws, 1192080 triangles, 59.9 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_traffic_22.png` — Purple facades occlude most of the prescribed ribbon framing; separate intersection geometry probe passes. Night remains readable but data colours drift. 122 draws, 1206452 triangles, 59.7 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_landvalue_12.png` — Legible value gradient with weak roof/wall distinction, hard dark intersections and hillside gaps. 169 draws, 1121044 triangles, 60.2 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_landvalue_22.png` — Legible value gradient with weak roof/wall distinction, hard dark intersections and hillside gaps. Night remains readable but data colours drift. 161 draws, 1101262 triangles, 59.9 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_density_12.png` — Almost uniform magenta field and protruding grass; foreground roof remains visually untinted. Near-plane crop explosion is fixed. 123 draws, 991994 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_density_22.png` — Almost uniform magenta field and protruding grass; foreground roof remains visually untinted. Near-plane crop explosion is fixed. Night remains readable but data colours drift. 167 draws, 1362860 triangles, 55.7 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_power_12.png` — Supplied region clearly distinguishable against broad unpowered magenta; exposed intersection fragments and hillside holes persist. 181 draws, 865416 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_power_22.png` — Supplied region clearly distinguishable against broad unpowered magenta; exposed intersection fragments and hillside holes persist. Night remains readable but data colours drift. 181 draws, 865416 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_legend_12.png` — Readable picker and crime legend, stepped grid boundaries and one floating fallback marker. 135 draws, 1012152 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_legend_22.png` — Readable picker and crime legend, stepped grid boundaries and one floating fallback marker. Night remains readable but data colours drift. 134 draws, 1007922 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_legend_12_720.png` — Readable picker and crime legend, stepped grid boundaries and one floating fallback marker. Panel fits at 1280×720. 135 draws, 1012152 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/iv_power_22_720.png` — Supplied region clearly distinguishable against broad unpowered magenta; exposed intersection fragments and hillside holes persist. Night remains readable but data colours drift. Panel fits at 1280×720. 181 draws, 865416 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/all_aerial_12.png` — Empty democity stub, terrain and HUD only; this is not a populated whole-game check. 35 draws, 182390 triangles, 55.5 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/all_street_22.png` — Empty democity stub at night; no populated-city claim. Night remains readable but data colours drift. 38 draws, 998686 triangles, 52.6 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/degraded_terrain.png` — Nonempty fallback heatmap and readable legend; no buildings or roads, a few terrain fragments remain. 11 draws, 398135 triangles, 59.7 fps, ready, zero errors.
- `shots/infoviews/r2/critic-matrix/degraded_roads.png` — Fallback remains ready; strongly visible road masking and wedges remain. 40 draws, 599188 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r2/critic-masks/iv_density_12.png` — Almost uniform magenta field and protruding grass; foreground roof remains visually untinted. Near-plane crop explosion is fixed. Fresh frozen on/off measurement pair.
- `shots/infoviews/r2/critic-masks/iv_density_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r2/critic-masks/iv_landvalue_12.png` — Legible value gradient with weak roof/wall distinction, hard dark intersections and hillside gaps. Fresh frozen on/off measurement pair.
- `shots/infoviews/r2/critic-masks/iv_landvalue_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r2/critic-masks/iv_landvalue_22.png` — Legible value gradient with weak roof/wall distinction, hard dark intersections and hillside gaps. Night remains readable but data colours drift. Fresh frozen on/off measurement pair.
- `shots/infoviews/r2/critic-masks/iv_landvalue_22_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r2/critic-masks/iv_pollution_12.png` — Clear industrial hotspot surrounded by broad cyan field; road fringes and terrain gaps remain. Fresh frozen on/off measurement pair.
- `shots/infoviews/r2/critic-masks/iv_pollution_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r2/critic-masks/iv_pollution_22.png` — Clear industrial hotspot surrounded by broad cyan field; road fringes and terrain gaps remain. Night remains readable but data colours drift. Fresh frozen on/off measurement pair.
- `shots/infoviews/r2/critic-masks/iv_pollution_22_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r2/critic-masks/iv_power_12.png` — Supplied region clearly distinguishable against broad unpowered magenta; exposed intersection fragments and hillside holes persist. Fresh frozen on/off measurement pair.
- `shots/infoviews/r2/critic-masks/iv_power_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r2/critic-masks/skyline_12.png` — Hill perforations remain conspicuous and the broad orange landscape dominates weakly separated building forms. Fresh frozen on/off measurement pair.
- `shots/infoviews/r2/critic-masks/skyline_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r2/critic-probe/play_ui_landvalue_12.png` — Ordinary toolbar clicks show one HUD legend and the Info Views picker over an empty play city; green foliage protrudes through purple land.
- `shots/infoviews/r2/critic-probe/all_aerial_12.png` — All-mode activation shows one HUD legend over an empty city, without duplicate module panel.

## Preserve

- All twelve data grids match independent formulas; real utility kind queries work.
- Native-heightfield conformance, near-plane crop bounds and warm recompute are improved.
- Synchronous dispatch, deterministic sums, persistence and readable 720p legends work.
- Useful industrial hotspot and utility coverage fields, no water fill.
- Owned 2–3 draw calls and 238998 maximum triangles remain within budget.

Builder LOD-forcing diagnostic is identified as builder evidence; this critic independently confirms remaining holes and zero native-heightfield interior penetrations. No new allegation is made that supported facility-kind queries always return zero. No score is awarded for replacing the default render configuration with a costly diagnostic.
