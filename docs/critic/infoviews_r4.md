# Infoviews round4 —6.4/10, FAIL

6.4/10 FAIL. Geometry-aware building films and street clearance improve legibility; land-value night parity now passes. Terrain integration, roof/wall contrast, pollution parity and three data distribution gates remain below target.

Independent critic, no production edits. Role, all acceptance criteria, architecture and residual exclusions reviewed; all eight CS2 references viewed freshly this round. All44 independent PNGs individually viewed:28 official-tool captures,14 on/off mask frames,2 UI frames. Chrome152, actual ANGLE Metal Apple M4, shared server5174. Measurements are independent of builder claims.

Required matrix maximum182 scene draws/1401000 triangles, fps range[44.1, 60.2], all ready/zero errors. Several frames fall below50fps during concurrent builder/critic/gameplay browsers; these values are retained and are not isolated full-game performance results. Diagnostic startup API snapshots reach224 scene draws/1568384 triangles; early UI probes show15.3/33.6fps. The empty all-mode democity stub proves neither whole-game quality nor playability.

## Ranked issues

1. **major: Ground colour still hides streets and breaks against rendered terrain** — New public-road clearance reveals many straight street corridors, but wide avenue centres, curved wedges and bridges still receive colour and kerb/lane detail is lost. Default skyline retains conspicuous hillside perforations. Numeric conformance remains correct: 235 flat and 1765 steep samples pass, maximum lift 0.703997 m, zero samples below the native heightfield; 1964 dry triangle centres also have no penetration. Resolve host display-LOD/overlay topology without forcing maximum terrain LOD as a hidden prerequisite. Evidence: `shots/infoviews/r4/critic-matrix/skyline_12.png; shots/infoviews/r4/critic-matrix/degraded_roads.png; shots/infoviews/r4/critic-probe/supplement-live.json; docs/core-requests/infoviews.md`.

2. **major: Pollution night colours still exceed the 8/255 drift ceiling** — Independent frozen on/off masks measure pollution RGB day/night drift 10.9555/11.3210/10.5285, failing all three channels. Land value now passes at 5.1560/7.2115/7.1280. Night p99 luma 195.4166 and 211.5418 passes. Non-overlay luma drops 55.5865% and 38.8083%; composited native surfaces remain influential. Evidence: `shots/infoviews/r4/critic-probe/pixel-analysis.json`.

3. **major: Building films flatten roof and wall separation** — Building film now follows native pitched roofs, retail sections, podium setbacks and crowns through public plan geometry. This is a visible improvement over the old boxes. All 246 callbacks retain valid alpha 0.75, but all ten prescribed land-value roof/wall contrast crops remain below25/255: 1.821611–19.579271. Density confirming crops range0.095512–11.505802, with foreground occlusion and untinted equipment caveats. These are prescribed screen regions, not pure isolated-face radiometry; visually weak face separation supports the finding. Evidence: `shots/infoviews/r4/critic-masks/iv_landvalue_12.png; shots/infoviews/r4/critic-probe/pixel-analysis.json`.

4. **major: Three fixed-domain distributions remain degenerate** — Over the exact 21671-cell mask, pollution p95−p5 is 0.186521; garbage p95−p5 is 0 with 97.5313% near its mean; density p95−p5 is 0.029940 with 94.7487% near its mean. All twelve grids match an independent derivation within 2.3842e−7. Do not fabricate populations, rescale grids or change source formulas. Preserve honest staged simulation data and document any mandated pre-roll/specification conflict. Evidence: `shots/infoviews/r4/critic-probe/data-api.json`.

## Acceptance and API

- 1 PASS: all 12 IDs synchronously publish 65536 Float32 data, legend and one activation event; invalid selection is a no-op.
- 2 FAIL: pollution, garbage and density distributions above. All grids finite in [0,1], independently derived formulas agree.
- 3 PARTIAL/FAIL: pollution RGB night drift10.9555/11.3210/10.5285 exceeds8; landvalue5.1560/7.2115/7.1280 now passes. Both night p99 clipping gates pass.
- 4 PARTIAL/FAIL: prescribed vertex/material and independent native-heightfield interior tests pass; default rendered terrain/road confirming images fail. Host LOD request remains unresolved.
- 5 PASS: pollution top-decile saturation0.541461 and power0.556840. Diagnostic non-overlay saturation ratios2.187204 and2.909307.
- 6 PASS: adjacent ramp-stop max channel differences 60/125/129/224; landvalue deciles occupy 5 of 8 L* buckets.
- 7 FAIL: all246 callback tints alpha0.75. Geometry-aware crowns, setbacks and pitches improve shape fit, but ten landvalue screen-region face contrasts range1.821611–19.579271, all below25.
- 8 PARTIAL: callback directly follows fixed ramp and sample. Inverse-ramp Spearman not separately measured; no penalty for residual-unmeasurable colour count.
- 9 PASS: 65 arms at the first 20 ID-ordered intersections, 4 m strip geometry, maximum uncovered gap zero.
- 10 PASS for measured clauses:200 water alpha samples zero,200 prescribed inland samples one, ten1m transects monotonic. Boundary maximum1.66628e−8. Exact shore-normal eight-metre width unmeasured. Road-clearance mask intentionally also lowers alpha over roads; the prescribed inland samples do not cover every road location.
- 11 UNMEASURED: iv_power and fallback skyline each supply zero near ≤200 m overlay pixels; required 2000/2000 near/far comparison cannot be formed. fog:true; no failure assigned.
- 12 PASS: specified fallback service fields remain populated and unchanged; independent live wind turbine gives real supply-limited coverage, not a fictitious radial result.
- 13 PASS: legend 316×211.4375 px, 12 px font; within 380×300.
- 14 PASS: twelve tiles, 316×134 px picker, 12 px font; no 720p overflow.
- 15 PASS: actual play toolbar click publishes active/data/legend synchronously, zero module panels and one HUD legend; all-mode also one legend.
- 16 PASS for owned state: two frames after deactivation all owned meshes hidden, draws zero, active/data/legend null, desaturation zero and callback cleared. Cached terrain water reflections can linger: external integration issue.
- 17 PASS: settled landvalue +2 draws/+254186 triangles, power +3/+254250, traffic +2/+22116; matching API within8 draws/260000 triangles. Film contains74 padded triangles per instance;246 instances render18204 triangles, rather than counting only5610 nondegenerate triangles.
- 18 PASS: both required reduced-dependency captures ready, zero errors, visible fallback maps.
- 19 PASS: two fresh same-seed runs agree for all twelve sums to six decimals; no Math.random or Date.now in module.
- 20 PASS in sampled trace: cold full recompute4.7ms, ten warm2.5–3.1ms; active60-frame mean0.006667ms, inactive0.003333ms. Three idle hours produce3 recomputes,20-event burst1. Whole-page300-frame heap delta-1.955742MiB includes GC and does not prove zero allocation.
- 21 PASS in sampled API trace: monotonic transition reaches1 at314.7ms without overshoot. No separate per-frame white-flash pixel test claimed.
- 22 PASS: fresh-page crime deserialization restores full grid and Crime legend within two frames; unknown value leaves selection unchanged.
- 23 PASS: all 28 official captures ready with zero errors; all 44 independent PNG viewed individually. All-mode remains an empty democity stub.

## Every captured image

- `shots/infoviews/r4/critic-matrix/aerial_12.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes. 155 draws,832828 triangles,59.9fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/aerial_22.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes. 160 draws,844228 triangles,60.1fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/skyline_12.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes. 171 draws,1157748 triangles,57.3fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/skyline_22.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes. 165 draws,1140880 triangles,44.1fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/street_12.png` — Pitched and stepped building film improves silhouette fit. Weak face separation, native equipment and road/terrain intersections remain visible. 120 draws,1386084 triangles,54.1fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/street_22.png` — Pitched and stepped building film improves silhouette fit. Weak face separation, native equipment and road/terrain intersections remain visible. 127 draws,1401000 triangles,47.2fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/closeup_12.png` — Pitched and stepped building film improves silhouette fit. Weak face separation, native equipment and road/terrain intersections remain visible. 120 draws,1138208 triangles,55.2fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/closeup_22.png` — Pitched and stepped building film improves silhouette fit. Weak face separation, native equipment and road/terrain intersections remain visible. 126 draws,1147166 triangles,51fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/skyline_17p5.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes. 182 draws,1178454 triangles,60fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/street_6p5.png` — Pitched and stepped building film improves silhouette fit. Weak face separation, native equipment and road/terrain intersections remain visible. 129 draws,1398648 triangles,59.8fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_pollution_12.png` — Industrial hotspot and fixed ramp are readable; broad colour remains dominant and day/night drift fails measured ceiling. 166 draws,881762 triangles,45.5fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_pollution_22.png` — Industrial hotspot and fixed ramp are readable; broad colour remains dominant and day/night drift fails measured ceiling. 165 draws,876208 triangles,57.2fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_traffic_12.png` — Continuous thin traffic ribbons join roads; muted city remains legible, with ground-film masking limits nearby. 151 draws,1345026 triangles,57.7fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_traffic_22.png` — Continuous thin traffic ribbons join roads; muted city remains legible, with ground-film masking limits nearby. 122 draws,1221704 triangles,60.2fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_landvalue_12.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes. 169 draws,1136296 triangles,52.4fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_landvalue_22.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes. 161 draws,1116514 triangles,59.8fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_density_12.png` — Native roof outlines now follow pitches, setbacks and retail volumes. Foreground tinted roof still has weak wall contrast; untinted equipment remains. 123 draws,1007246 triangles,56.5fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_density_22.png` — Native roof outlines now follow pitches, setbacks and retail volumes. Foreground tinted roof still has weak wall contrast; untinted equipment remains. 130 draws,1020322 triangles,60.1fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_power_12.png` — Supply region contrasts with unpowered magenta; street clearance improves but hillside holes and road fragments remain. 181 draws,880668 triangles,59.8fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_power_22.png` — Supply region contrasts with unpowered magenta; street clearance improves but hillside holes and road fragments remain. 181 draws,880668 triangles,60fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_legend_12.png` — Readable picker and legend; no clipping in this captured viewport. Ground and volume integration limits remain. 135 draws,1027404 triangles,60.2fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_legend_22.png` — Readable picker and legend; no clipping in this captured viewport. Ground and volume integration limits remain. 134 draws,1023174 triangles,59.9fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_legend_12_720.png` — Readable picker and legend; no clipping in this captured viewport. Ground and volume integration limits remain. 135 draws,1027404 triangles,59.9fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/iv_power_22_720.png` — Supply region contrasts with unpowered magenta; street clearance improves but hillside holes and road fragments remain. 181 draws,880668 triangles,59.8fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/all_aerial_12.png` — Empty democity stub with one HUD legend. This does not establish full-game performance or playability. 32 draws,163894 triangles,49.8fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/all_street_22.png` — Empty democity stub with one HUD legend. This does not establish full-game performance or playability. 38 draws,998686 triangles,46.3fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/degraded_terrain.png` — Fallback field visible without roads or buildings; shoreline fades but small terrain perforations remain. 11 draws,398135 triangles,60fps, ready, zero errors.
- `shots/infoviews/r4/critic-matrix/degraded_roads.png` — New clearance mask preserves long narrow street corridors; wide centres, bridge surfaces and curved wedges still receive colour. 40 draws,599188 triangles,60fps, ready, zero errors.
- `shots/infoviews/r4/critic-masks/iv_density_12.png` — Native roof outlines now follow pitches, setbacks and retail volumes. Foreground tinted roof still has weak wall contrast; untinted equipment remains.
- `shots/infoviews/r4/critic-masks/iv_density_12_off.png` — Native off plate restores street and facade detail; cached water reflections can retain overlay colour after two frames.
- `shots/infoviews/r4/critic-masks/iv_landvalue_12.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes.
- `shots/infoviews/r4/critic-masks/iv_landvalue_12_off.png` — Native off plate restores street and facade detail; cached water reflections can retain overlay colour after two frames.
- `shots/infoviews/r4/critic-masks/iv_landvalue_22.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes.
- `shots/infoviews/r4/critic-masks/iv_landvalue_22_off.png` — Native off plate restores street and facade detail; cached water reflections can retain overlay colour after two frames.
- `shots/infoviews/r4/critic-masks/iv_pollution_12.png` — Industrial hotspot and fixed ramp are readable; broad colour remains dominant and day/night drift fails measured ceiling.
- `shots/infoviews/r4/critic-masks/iv_pollution_12_off.png` — Native off plate restores street and facade detail; cached water reflections can retain overlay colour after two frames.
- `shots/infoviews/r4/critic-masks/iv_pollution_22.png` — Industrial hotspot and fixed ramp are readable; broad colour remains dominant and day/night drift fails measured ceiling.
- `shots/infoviews/r4/critic-masks/iv_pollution_22_off.png` — Native off plate restores street and facade detail; cached water reflections can retain overlay colour after two frames.
- `shots/infoviews/r4/critic-masks/iv_power_12.png` — Supply region contrasts with unpowered magenta; street clearance improves but hillside holes and road fragments remain.
- `shots/infoviews/r4/critic-masks/iv_power_12_off.png` — Native off plate restores street and facade detail; cached water reflections can retain overlay colour after two frames.
- `shots/infoviews/r4/critic-masks/skyline_12.png` — Street corridors and tower crowns improve; hillside perforations and weak roof/wall separation persist. Land-value day/night drift now passes.
- `shots/infoviews/r4/critic-masks/skyline_12_off.png` — Native off plate restores street and facade detail; cached water reflections can retain overlay colour after two frames.
- `shots/infoviews/r4/critic-probe/play_ui_landvalue_12.png` — Ordinary toolbar selects land value with one HUD legend; empty play landscape and some untinted foliage.
- `shots/infoviews/r4/critic-probe/all_aerial_12.png` — Empty democity stub with one HUD legend. This does not establish full-game performance or playability.

## Strengths and limits

- All twelve grids agree with independent formulas within2.384185791e−7, zero mismatches above1e−5; actual placed wind-turbine kind coverage remains live.
- Geometry-aware film follows roofs, setbacks and crowns; road clearance improves street visibility.
- Landvalue day/night parity now passes, and recomputation remains below cold/warm ceilings.
- Deterministic sums, synchronous dispatch, persistence, actual toolbar activation and readable720p legend work.
- Owned maximum3 draws/254250 triangles passes budget; zero errors across required matrix and reduced dependencies.

Source frozen at builder r4. The startup traffic draw delta57 is retained in supplement-live.json as unsettled neighbouring terrain/building LOD work; repeated settled on/off/on yields the owned2 draws/22116 triangles. Film supports public plans and is capped at1200 instances; crowd/city-scale coverage is not proved by246 buildings. Water reflection cache can retain overlay colour after deactivation although owned meshes/callbacks clear. Required power/skyline haze captures contain no near≤200m pixels, so criterion11 is unmeasured. Inverse-ramp Spearman criterion8 remains unmeasured. Shader alpha discard0.002 persists; shoreline continuity is measured but exact eight-metre normal width is not certified. Root integration owns terrain display topology, bridge/road relief and water reflection invalidation. No fabricated populations or normalized source fields are proposed to satisfy distribution thresholds.
