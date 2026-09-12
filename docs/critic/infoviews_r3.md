# Infoviews round 3 — 6.2/10, FAIL

6.2/10 FAIL. Correct deterministic data and faster recompute, with continuous shore fade; default terrain and street integration, building volumes, night colour and three distribution gates remain visibly below the target.

Independent critic; no production edits. Role, full acceptance checklist, architecture, residual exclusions and all eight CS2 references reviewed. All 44 fresh PNGs individually viewed: 28 official-tool matrix images, 14 native on/off frames, two UI frames. Shared port 5174; Chrome 152 and actual Metal Apple M4. Measurements are independent of builder claims.

Official matrix maximum 182 scene draws / 1385748 triangles; fps [50.2, 60.3]. All ready with zero errors. Early diagnostic API snapshots can show 224 scene draws, 1537880 triangles and lower startup fps; these remain in raw evidence. All-mode is an empty democity stub and proves neither full-game performance nor playability.

## Ranked issues

1. **major: Ground colour still hides streets and breaks against rendered terrain** — The unchanged r2 mesh passes 235 flat samples and 1765 steep samples, with maximum lift 0.703997 m and zero samples below the native heightfield. Another 1964 dry triangle centres have zero penetrations. Fresh default skyline still shows large hillside perforations; aerial and reduced-road scenes retain road wedges, erased asphalt and lost kerbs. Native terrain display LOD differs from the overlay surface. Keep the numeric conformance fix and resolve the rendered-surface integration without forcing maximum terrain LOD as a hidden prerequisite. Evidence: `shots/infoviews/r3/critic-matrix/skyline_12.png; shots/infoviews/r3/critic-matrix/degraded_roads.png; shots/infoviews/r3/critic-probe/supplement-live.json; docs/core-requests/infoviews.md`.

2. **major: Night data colours still exceed the 8/255 drift ceiling** — Frozen 1080p on/off masks independently measure pollution RGB drift 10.4990/10.7575/9.9915 and land value 6.8005/8.8380/8.4565, exceeding the 8/255 ceiling. Both improve from r2, but neither pair passes. Night p99 luma 196.4756 and 212.3292 passes. The owned achromatic haze removes sun-colour contamination, but composited native surfaces remain influential. Evidence: `shots/infoviews/r3/critic-probe/pixel-analysis.json`.

3. **major: Building films flatten roof and wall separation** — All ten pinned land-value roof/wall luma steps are below 25/255, ranging 0.704652–22.376740. All 246 callbacks have valid alpha 0.75 and front-facing shells, but the visible broad boxes do not follow native crowns, setbacks and equipment. Density confirming crops range 2.880810–12.838700; their foreground occlusion and untinted equipment remain a measurement caveat. Land-value evidence independently establishes the failure. Evidence: `shots/infoviews/r3/critic-masks/iv_landvalue_12.png; shots/infoviews/r3/critic-probe/pixel-analysis.json`.

4. **major: Three fixed-domain distributions remain degenerate** — Over the exact 21671-cell mask, pollution p95−p5 is 0.186521; garbage p95−p5 is 0 with 97.5313% near its mean; density p95−p5 is 0.029940 with 94.7487% near its mean. All twelve grids match an independent derivation within 2.3842e−7. Do not fabricate populations, rescale grids or change source formulas. Preserve honest staged simulation data and document any mandated pre-roll/specification conflict. Evidence: `shots/infoviews/r3/critic-probe/data-api.json`.

## Acceptance and API

- 1 PASS: all 12 IDs synchronously publish 65536 Float32 data, legend and one activation event; invalid selection is a no-op.
- 2 FAIL: pollution, garbage and density distributions above. All grids finite in [0,1], independently derived formulas agree.
- 3 FAIL: both night channel-drift tests exceed 8/255; night p99 clipping gate passes.
- 4 PARTIAL/FAIL: prescribed vertex/material and independent native-heightfield interior tests pass; default rendered terrain/road confirming images fail. Host LOD request remains unresolved.
- 5 PASS: pollution top-decile saturation 0.553358 and power 0.567785. Diagnostic non-overlay saturation ratios 2.015078 and 2.882854.
- 6 PASS: adjacent ramp-stop max channel differences 60/125/129/224; landvalue deciles occupy 5 of 8 L* buckets.
- 7 FAIL: all 246 callback tints alpha 0.75; all ten land-value face contrasts fail, range 0.704652–22.376740. Native crown/equipment and broad shell mismatch remain visible.
- 8 PARTIAL: callback directly follows fixed ramp and sample. Inverse-ramp Spearman not separately measured; no penalty for residual-unmeasurable colour count.
- 9 PASS: 65 arms at the first 20 ID-ordered intersections, 4 m strip geometry, maximum uncovered gap zero.
- 10 PASS for measured clauses: 200 water alpha samples zero, 200 inland one, ten 1 m transects monotonic. Maximum alpha at the numerically resolved boundary 1.66628e−8, eliminating the old 0.027570 jump. Exact shore-normal eight-metre width remains unmeasured; no false width claim.
- 11 UNMEASURED: iv_power and fallback skyline each supply zero near ≤200 m overlay pixels; required 2000/2000 near/far comparison cannot be formed. fog:true; no failure assigned.
- 12 PASS: specified fallback service fields remain populated and unchanged; independent live wind turbine gives real supply-limited coverage, not a fictitious radial result.
- 13 PASS: legend 316×211.4375 px, 12 px font; within 380×300.
- 14 PASS: twelve tiles, 316×134 px picker, 12 px font; no 720p overflow.
- 15 PASS: actual play toolbar click publishes active/data/legend synchronously, zero module panels and one HUD legend; all-mode also one legend.
- 16 PASS for owned state: two frames after deactivation all owned meshes hidden, draws zero, active/data/legend null, desaturation zero and callback cleared. Cached terrain water reflections can linger: external integration issue.
- 17 PASS: independent settled landvalue +2 draws/+238934 triangles, power +3/+238998, traffic +2/+6864; matching API and within declared budget 8 and 260000 triangles.
- 18 PASS: both required reduced-dependency captures ready, zero errors, visible fallback maps.
- 19 PASS: two fresh same-seed runs agree for all twelve sums to six decimals; no Math.random or Date.now in module.
- 20 PASS in sampled trace: cold full recompute 8.3 ms and next ten 2.4–3.2 ms. Active and inactive 60-frame means both zero at the instrument resolution; three idle hours trigger three rebuilds, 20-event burst one. Whole-page 300-frame heap delta -29.858006 MiB includes GC and is not proof of zero allocation.
- 21 PASS in sampled API trace: monotonic transition reaches one at 313.8 ms, no overshoot. No separate per-frame white-flash pixel measurement claimed.
- 22 PASS: fresh-page crime deserialization restores full grid and Crime legend within two frames; unknown value leaves selection unchanged.
- 23 PASS: all 28 official captures ready with zero errors; all 44 independent PNG viewed individually. All-mode remains an empty democity stub.

## Every captured image

- `shots/infoviews/r3/critic-matrix/aerial_12.png` — Broad orange field retains overall districts but erases road surfaces; dark intersection islands and triangular gaps remain. 155 draws, 817576 triangles, 59.9 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/aerial_22.png` — Broad orange field retains overall districts but erases road surfaces; dark intersection islands and triangular gaps remain. Night remains readable but data colours drift. 160 draws, 828976 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/skyline_12.png` — Hill perforations remain conspicuous and the broad orange landscape dominates weakly separated building forms. 171 draws, 1142496 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/skyline_22.png` — Hill perforations remain conspicuous and the broad orange landscape dominates weakly separated building forms. Night remains readable but data colours drift. 165 draws, 1125628 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/street_12.png` — Pale olive film leaves window lines visible, but kerbs disappear and grass protrudes through the colour surface. 120 draws, 1370832 triangles, 59.8 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/street_22.png` — Pale olive film leaves window lines visible, but kerbs disappear and grass protrudes through the colour surface. Night remains readable but data colours drift. 127 draws, 1385748 triangles, 60.3 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/closeup_12.png` — Building film flattens repeated volumes; rooftop equipment stays conspicuously untinted. 120 draws, 1122956 triangles, 59.8 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/closeup_22.png` — Building film flattens repeated volumes; rooftop equipment stays conspicuously untinted. Night remains readable but data colours drift. 126 draws, 1131914 triangles, 59.8 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/skyline_17p5.png` — Hill perforations remain conspicuous and the broad orange landscape dominates weakly separated building forms. 182 draws, 1163202 triangles, 58.2 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/street_6p5.png` — Pale olive film leaves window lines visible, but kerbs disappear and grass protrudes through the colour surface. 129 draws, 1383396 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_pollution_12.png` — Clear industrial hotspot surrounded by broad cyan field; road fringes and terrain gaps remain. 166 draws, 866510 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_pollution_22.png` — Clear industrial hotspot surrounded by broad cyan field; road fringes and terrain gaps remain. Night remains readable but data colours drift. 165 draws, 860956 triangles, 57.5 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_traffic_12.png` — Purple facades occlude most of the prescribed ribbon framing; separate intersection geometry probe passes. 115 draws, 1192080 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_traffic_22.png` — Purple facades occlude most of the prescribed ribbon framing; separate intersection geometry probe passes. Night remains readable but data colours drift. 122 draws, 1206452 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_landvalue_12.png` — Legible value gradient with weak roof/wall distinction, hard dark intersections and hillside gaps. 169 draws, 1121044 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_landvalue_22.png` — Legible value gradient with weak roof/wall distinction, hard dark intersections and hillside gaps. Night remains readable but data colours drift. 161 draws, 1101262 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_density_12.png` — Almost uniform magenta field and protruding grass; foreground roof remains visually untinted. Near-plane crop explosion is fixed. 123 draws, 991994 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_density_22.png` — Almost uniform magenta field and protruding grass; foreground roof remains visually untinted. Near-plane crop explosion is fixed. Night remains readable but data colours drift. 130 draws, 1005070 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_power_12.png` — Supplied region clearly distinguishable against broad unpowered magenta; exposed intersection fragments and hillside holes persist. 181 draws, 865416 triangles, 60.2 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_power_22.png` — Supplied region clearly distinguishable against broad unpowered magenta; exposed intersection fragments and hillside holes persist. Night remains readable but data colours drift. 181 draws, 865416 triangles, 50.2 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_legend_12.png` — Readable picker and crime legend, stepped grid boundaries and one floating fallback marker. 135 draws, 1012152 triangles, 59.8 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_legend_22.png` — Readable picker and crime legend, stepped grid boundaries and one floating fallback marker. Night remains readable but data colours drift. 134 draws, 1007922 triangles, 59.9 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_legend_12_720.png` — Readable picker and crime legend, stepped grid boundaries and one floating fallback marker. Panel fits at 1280×720. 135 draws, 1012152 triangles, 60.1 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/iv_power_22_720.png` — Supplied region clearly distinguishable against broad unpowered magenta; exposed intersection fragments and hillside holes persist. Night remains readable but data colours drift. Panel fits at 1280×720. 181 draws, 865416 triangles, 59.8 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/all_aerial_12.png` — Empty democity stub, terrain and HUD only; this is not a populated whole-game check. 32 draws, 163894 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/all_street_22.png` — Empty democity stub at night; no populated-city claim. Night remains readable but data colours drift. 38 draws, 998686 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/degraded_terrain.png` — Nonempty fallback heatmap and readable legend; no buildings or roads, a few terrain fragments remain. 11 draws, 398135 triangles, 60 fps, ready, zero errors.
- `shots/infoviews/r3/critic-matrix/degraded_roads.png` — Fallback remains ready; strongly visible road masking and wedges remain. 40 draws, 599188 triangles, 59.9 fps, ready, zero errors.
- `shots/infoviews/r3/critic-masks/iv_density_12.png` — Almost uniform magenta field and protruding grass; foreground roof remains visually untinted. Near-plane crop explosion is fixed. Fresh frozen on/off measurement pair.
- `shots/infoviews/r3/critic-masks/iv_density_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r3/critic-masks/iv_landvalue_12.png` — Legible value gradient with weak roof/wall distinction, hard dark intersections and hillside gaps. Fresh frozen on/off measurement pair.
- `shots/infoviews/r3/critic-masks/iv_landvalue_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r3/critic-masks/iv_landvalue_22.png` — Legible value gradient with weak roof/wall distinction, hard dark intersections and hillside gaps. Night remains readable but data colours drift. Fresh frozen on/off measurement pair.
- `shots/infoviews/r3/critic-masks/iv_landvalue_22_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r3/critic-masks/iv_pollution_12.png` — Clear industrial hotspot surrounded by broad cyan field; road fringes and terrain gaps remain. Fresh frozen on/off measurement pair.
- `shots/infoviews/r3/critic-masks/iv_pollution_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r3/critic-masks/iv_pollution_22.png` — Clear industrial hotspot surrounded by broad cyan field; road fringes and terrain gaps remain. Night remains readable but data colours drift. Fresh frozen on/off measurement pair.
- `shots/infoviews/r3/critic-masks/iv_pollution_22_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r3/critic-masks/iv_power_12.png` — Supplied region clearly distinguishable against broad unpowered magenta; exposed intersection fragments and hillside holes persist. Fresh frozen on/off measurement pair.
- `shots/infoviews/r3/critic-masks/iv_power_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r3/critic-masks/skyline_12.png` — Hill perforations remain conspicuous and the broad orange landscape dominates weakly separated building forms. Fresh frozen on/off measurement pair.
- `shots/infoviews/r3/critic-masks/skyline_12_off.png` — Off plate: normal road and facade detail returns. Distant water reflections retain some previous overlay colour after two frames.
- `shots/infoviews/r3/critic-probe/play_ui_landvalue_12.png` — Ordinary toolbar clicks show one HUD legend and the Info Views picker over an empty play city; green foliage protrudes through purple land.
- `shots/infoviews/r3/critic-probe/all_aerial_12.png` — All-mode activation shows one HUD legend over an empty city, without duplicate module panel.

## Preserve and limits

- All twelve grids match independent formulas within 2.384185791e−7, with zero mismatches above 1e−5; real utility kind queries work.
- Cold and warm recompute now pass; shore continuity improves while native-heightfield conformance remains correct.
- Synchronous dispatch, deterministic sums, persistence and readable 720p legends work.
- Useful industrial hotspot and utility fields, with water excluded from ground paint.
- Owned two or three draws and 238998 maximum triangles remain within budget.

The source remains frozen at builder r3. Native water reflection cache retains colour in some two-frame off plates although owned objects and callbacks clear. Required far/near haze framing has zero near pixels, so no failure is invented. Criterion 8 inverse-ramp Spearman remains unmeasured. Shader alpha discard at 0.002 remains; the public shoreline function is continuous, and this is not an exact eight-metre width certification. Root integration still owns terrain topology, road relief, native building-film support and reflection invalidation.
