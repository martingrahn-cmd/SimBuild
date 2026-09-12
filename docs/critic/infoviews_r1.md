# Infoviews round 1 — 5.8/10, FAIL

5.8/10 FAIL: functional deterministic information layer with major terrain/street conformance, night-colour, building-film and staged-distribution weaknesses. The prior live category-mapping allegation is withdrawn on current actualservices evidence. API false because pinned densityface projection is invalid.

Independent critic: no production edits. Read CRITIC, module specification, architecture, residual exclusions and all eight CS2 references. Captured through shared5174devserver usingSystemChrome152/MetalAppleM4.44fresh images viewed individually (28officialmatrix,14maskframes,2UIframes). The builder’s self-score was not used as evidence.

## Evidence and limits

Maximum official frame: 182 draws, 1280838 triangles; zero errors, infoviews ready in every capture. FPS [48.3, 60.3]; all_street_22=48.3 is retained under concurrent work, not labelled SwiftShader and not used as an infoviews-only failure. All-mode remains an empty democity stub.

All12formula comparisons use actual public records and an independent pre-implementation reference. The current services module supports facility kinds: a real wind turbine gives positive supply-limitedpower. The stale claim that allrealutilitymaps necessarily readzero is withdrawn. Do not introduce an aggregatecategoryadapter that would change the specifiedmax-per-kindformula.

## Ranked issues

1. **major: Ground film cuts through relief and erases street geometry** — The prescribed 2000-vertex lift probe passes (570 flat samples, 100% in band;1430 steeper samples,max1.480011m). Nevertheless the confirming aerial/skyline frames visibly expose triangular hillside holes and dashed road wedges. Independent triangle-centre diagnostic finds56/1565 dry samples below actual terrain,min−6.808326m. A coarse lifted mesh can pass its vertices while failing between them. Preserve kerb relief and fix interior conformance within the declared260k-triangle budget. Evidence: `shots/infoviews/r1/critic-matrix/skyline_12.png; shots/infoviews/r1/critic-probe/supplement-live.json`.

2. **major: Night data colours drift beyond the8/255 ceiling** — Fresh native1080p on/off masks: top2000-value pollution mean channel deltas14.6780/20.1605/15.2615;landvalue9.8140/12.1820/12.4845. Night p99 stays below235, so this is changing colour rather than a bloom/clipping accusation. Non-overlay luma drops58.95%/38.59% (diagnostic only). Evidence: `shots/infoviews/r1/critic-probe/pixel-analysis.json`.

3. **major: Building films flatten volumes; density face crops are invalid** — All10 pinned landvalue roof/wall mean-luma differences are below25/255:0.4076–21.0477. Callback coverage246/246 withalpha.70 passes, but compositing fails the face-separation requirement. In density,7roof/wall pairs expand to the full1920×1080 frame because behind-camera projections are accepted; these0delta values are invalid measurements and are explicitly ungraded. Fix cropRects near-plane rejection and camera-facing wall selection. Evidence: `shots/infoviews/r1/critic-matrix/iv_density_12.crops.json; shots/infoviews/r1/critic-probe/pixel-analysis.json`.

4. **major: Pollution, garbage and density fail the fixed-domain histogram gate** — Over the exact21671-cell city mask, pollution p95−p5=.186521;garbage0 and97.5313% within±.02ofmean;density.029940 and94.7487%flat. Independent derivation of all12fullgrids agrees within2.4e−7, so do not renormalise or manufacture values to conceal this. Stage legitimate stock/occupancy and identify simulation or specification limits if the mandated3-day pre-roll cannot produce the distribution. Evidence: `shots/infoviews/r1/critic-probe/data-api.json`.

5. **major: Full synchronous grid recompute exceeds12ms** — Independent api.recompute() measured28.8ms. Average active update.005ms,inactive.001667ms,3idle game hours delta3 and20-event burst delta1 pass. Whole-page300frame heap changed−1.83MiB;that is a passing observation,not proof of zero allocation. Optimize full rebuild without delaying synchronous active legend publication. Evidence: `shots/infoviews/r1/critic-probe/api.json; shots/infoviews/r1/critic-probe/contracts.json`.

6. **minor: Shore fade has a hard waterline jump** — 200water samplesalpha0 and200dry inland samplesalpha.92 pass. All10one-metre transects are monotonic, but exact sea-level discard jumps from0to as much.398008 at the waterline;this is a partial failure of the no-hard-cut8mtransition. Transects not aligned with shoreline normals cannot establish exact fade width;no invented width threshold is applied. Evidence: `shots/infoviews/r1/critic-probe/settled-probe.json`.

## Acceptance/API check

- 1 PASS — all12 ids, same section object,65536Float32, immediate data/legend/desaturation/version;one event per activation,0errors.
- 2 FAIL — pollution/garbage/density distributions above;all gridsfinite[0,1]. Independent formula check is diagnostic and does not replace directapi.stats grading.
- 3 FAIL — night deltas above8;nightp99<235 passes. Environment luma diagnostics are not module failures.
- 4 PARTIAL/FAIL — prescribed vertex/material probes pass; confirming images and56submerged triangle centres establish interior conformance failure.
- 5 PASS — pollution top-decile saturation.516665;power.514105. Non-overlay ratios1.8073and2.6397 are diagnostics only;no penalty for unhonoured external desaturation.
- 6 PASS — adjacent ramp-stop maxchannel differences60/125/129/224;landvalue deciles occupy5of8CIE L* buckets.
- 7 FAIL —246/246 callbacktintsalpha.70 pass;all10landvaluefacecontrasts fail. Density full-frame crop contamination is an API defect,not a valid zero-contrast measurement.
- 8 PARTIAL — tint callback directly follows fixed ramp and sampled value;continuous distinctness has no spec threshold. Numeric inverse-ramp Spearman not separately measured;do not fail the residual-unmeasurable colour-count clause.
- 9 PASS —65arms at first20id-ordered intersections,4mstrip geometry,0maximum uncovered gap. Spec camera is building-occluded but that is confirming evidence,not the numeric gate.
- 10 PARTIAL —200water0,200inland.92;10transects170points monotonic. Hardwaterline jump up to.398008 remains.
- 11 UNMEASURED —iv_power and fallbackskyline both supply0near≤200moverlaypixels;cannot compute required2000/2000near/far ratio. Materials fog:true;no failure assigned solely for absent camera bands.
- 12 PASS —coverage fractions:power.146186,water.170412,garbage.150293,education.168659,health.185271,fire.651747,crime.635458.
- 13 PASS —legend316×211.4375,font12px;within380×300. Icon/colour subjective residual clauses not independent failures.
- 14 PASS —12tiles,316×134picker,font12px;no720pDOMoverflow.
- 15 PASS —realplaytoolbarclicks showactive/data/legend synchronously;0ownpanels,1HUDlegend. All-mode also1HUDlegend.
- 16 PASS for owned geometry/state —after2framesallownedmesheshidden,overlayDraws0,active/data/legendnull,desaturation0,callbacknull. Cached terrain water reflections can linger;external integration follow-up.
- 17 PASS —settled exacton/off pairs2/3/2draws;134024/134088/6864triangles forlandvalue/power/traffic. Some earlier pairs mixed53–55hostCSM/LODdraws and are retained as contaminated,not counted as overlaycost. Core declared8andfiledrequest agree. Source allocates26textures≈5.12MiB including nativeheight/coast;not a peakGPU-memory measurement.
- 18 PASS —both requiredreduceddependency capturesready,0errors,nonemptyheatmap/legend.
- 19 PASS —two freshsame-seedruns all12sums identicalto6decimals. NoMath.randomorDate.nowmatches inmodule.
- 20 PARTIAL/FAIL —averageframecost/rate/coalescing/observedheap pass;28.8msfullrecompute fails12ms.
- 21 PASS in sampledAPItrace —monotonictransition0→1settles326.3ms≤400ms;noovershoot. No per-frame PNGwhite-flashmeasurement claimed.
- 22 PASS —serializecrime, freshpage deserializecrime gives65536grid+Crimelegend within2frames;null/unknown warn andnoop.
- 23 PASS —all28officialindependentcaptures0errorsandready;all14maskframes and2UIframesviewed. Allmodeemptydemocity limitationexplicit.

## Every captured image

- `shots/infoviews/r1/critic-matrix/aerial_12.png` — Broad value bands and water remain legible; long straight road/kerb strips disappear under the ground overlay and curved edges break into wedges. 155draws/712666triangles,60.1fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/aerial_22.png` — Broad value bands and water remain legible; long straight road/kerb strips disappear under the ground overlay and curved edges break into wedges. Night stays readable but differs measurably from noon. 160draws/724066triangles,60.3fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/skyline_12.png` — Tinted building volumes are weak and the mountain has many exposed triangular holes; far landscape is a broad orange sheet. 171draws/1037586triangles,59.9fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/skyline_22.png` — Tinted building volumes are weak and the mountain has many exposed triangular holes; far landscape is a broad orange sheet. Night stays readable but differs measurably from noon. 165draws/1020718triangles,60fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/street_12.png` — Window lines remain visible through the film, but the foreground road and kerb relief disappear into a smooth colour field; grass breaks through. 120draws/1265922triangles,59.9fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/street_22.png` — Window lines remain visible through the film, but the foreground road and kerb relief disappear into a smooth colour field; grass breaks through. Night stays readable but differs measurably from noon. 127draws/1280838triangles,60fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/closeup_12.png` — Repeated pale building masses, faint face separation, large smooth field and exposed bases diminish spatial readability. 120draws/1018046triangles,60fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/closeup_22.png` — Repeated pale building masses, faint face separation, large smooth field and exposed bases diminish spatial readability. Night stays readable but differs measurably from noon. 126draws/1027004triangles,60.2fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/skyline_17p5.png` — Tinted building volumes are weak and the mountain has many exposed triangular holes; far landscape is a broad orange sheet. 182draws/1058292triangles,60.1fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/street_6p5.png` — Window lines remain visible through the film, but the foreground road and kerb relief disappear into a smooth colour field; grass breaks through. 129draws/1278486triangles,58.2fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_pollution_12.png` — Industrial hotspot is clearly distinguishable; much of the rest is a single cyan field. Road edge fragments and wedges persist. 166draws/761600triangles,60fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_pollution_22.png` — Industrial hotspot is clearly distinguishable; much of the rest is a single cyan field. Road edge fragments and wedges persist. Night stays readable but differs measurably from noon. 165draws/756046triangles,60fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_traffic_12.png` — The specified close framing is dominated by purple facades; only slivers of traffic ribbons are visible. Geometric arm coverage passes independently. 115draws/1192080triangles,60.1fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_traffic_22.png` — The specified close framing is dominated by purple facades; only slivers of traffic ribbons are visible. Geometric arm coverage passes independently. Night stays readable but differs measurably from noon. 122draws/1206452triangles,59.9fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_landvalue_12.png` — Five LUT luminance bands exist but roof/wall separation is weak; mountain and street gaps are conspicuous. 169draws/1016134triangles,60.2fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_landvalue_22.png` — Five LUT luminance bands exist but roof/wall separation is weak; mountain and street gaps are conspicuous. Night stays readable but differs measurably from noon. 161draws/996352triangles,60.2fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_density_12.png` — Almost uniform purple field; a near-camera building clips across the foreground. Its pinned face rectangles can cover the whole frame. 123draws/887084triangles,60fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_density_22.png` — Almost uniform purple field; a near-camera building clips across the foreground. Its pinned face rectangles can cover the whole frame. Night stays readable but differs measurably from noon. 130draws/900160triangles,60.2fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_power_12.png` — Distinct supplied plateau and unpainted river; sharp dark road/intersection fragments stand out against the broad utility field. 181draws/760506triangles,59.9fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_power_22.png` — Distinct supplied plateau and unpainted river; sharp dark road/intersection fragments stand out against the broad utility field. Night stays readable but differs measurably from noon. 181draws/760506triangles,59.9fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_legend_12.png` — Compact readable picker and legend; jagged field boundary, exposed road slivers and featureless box tint remain. 135draws/907242triangles,59.9fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_legend_22.png` — Compact readable picker and legend; jagged field boundary, exposed road slivers and featureless box tint remain. Night stays readable but differs measurably from noon. 134draws/903012triangles,59.8fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_legend_12_720.png` — Compact readable picker and legend; jagged field boundary, exposed road slivers and featureless box tint remain. Panel fits at 1280×720. 135draws/907242triangles,60.1fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/iv_power_22_720.png` — Distinct supplied plateau and unpainted river; sharp dark road/intersection fragments stand out against the broad utility field. Night stays readable but differs measurably from noon. Panel fits at 1280×720. 181draws/760506triangles,60.2fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/all_aerial_12.png` — Default all-mode is still the empty democity stub: HUD and terrain, no populated-city integration claim. 32draws/163894triangles,60fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/all_street_22.png` — Default all-mode remains empty terrain at night with a bright blue sky; 48.3 fps in this one concurrent capture is retained, not hidden. Night stays readable but differs measurably from noon. 38draws/998686triangles,48.3fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/degraded_terrain.png` — Ready fallback heatmap and legend without buildings/simulation/roads, no runtime errors. 11draws/294944triangles,60fps,0errors,ready.
- `shots/infoviews/r1/critic-matrix/degraded_roads.png` — Ready fallback heatmap and legend; same prominent road masking remains without other dependencies. 40draws/494278triangles,60.2fps,0errors,ready.
- `shots/infoviews/r1/critic-masks/iv_density_12.png` — Almost uniform purple field; a near-camera building clips across the foreground. Its pinned face rectangles can cover the whole frame. Fresh paired active frame, measured with max RGB delta >6 mask.
- `shots/infoviews/r1/critic-masks/iv_density_12_off.png` — Off plate: normal materials and road detail return; distant water reflections can retain prior overlay colour after two frames.
- `shots/infoviews/r1/critic-masks/iv_landvalue_12.png` — Five LUT luminance bands exist but roof/wall separation is weak; mountain and street gaps are conspicuous. Fresh paired active frame, measured with max RGB delta >6 mask.
- `shots/infoviews/r1/critic-masks/iv_landvalue_12_off.png` — Off plate: normal materials and road detail return; distant water reflections can retain prior overlay colour after two frames.
- `shots/infoviews/r1/critic-masks/iv_landvalue_22.png` — Five LUT luminance bands exist but roof/wall separation is weak; mountain and street gaps are conspicuous. Night stays readable but differs measurably from noon. Fresh paired active frame, measured with max RGB delta >6 mask.
- `shots/infoviews/r1/critic-masks/iv_landvalue_22_off.png` — Off plate: normal materials and road detail return; distant water reflections can retain prior overlay colour after two frames.
- `shots/infoviews/r1/critic-masks/iv_pollution_12.png` — Industrial hotspot is clearly distinguishable; much of the rest is a single cyan field. Road edge fragments and wedges persist. Fresh paired active frame, measured with max RGB delta >6 mask.
- `shots/infoviews/r1/critic-masks/iv_pollution_12_off.png` — Off plate: normal materials and road detail return; distant water reflections can retain prior overlay colour after two frames.
- `shots/infoviews/r1/critic-masks/iv_pollution_22.png` — Industrial hotspot is clearly distinguishable; much of the rest is a single cyan field. Road edge fragments and wedges persist. Night stays readable but differs measurably from noon. Fresh paired active frame, measured with max RGB delta >6 mask.
- `shots/infoviews/r1/critic-masks/iv_pollution_22_off.png` — Off plate: normal materials and road detail return; distant water reflections can retain prior overlay colour after two frames.
- `shots/infoviews/r1/critic-masks/iv_power_12.png` — Distinct supplied plateau and unpainted river; sharp dark road/intersection fragments stand out against the broad utility field. Fresh paired active frame, measured with max RGB delta >6 mask.
- `shots/infoviews/r1/critic-masks/iv_power_12_off.png` — Off plate: normal materials and road detail return; distant water reflections can retain prior overlay colour after two frames.
- `shots/infoviews/r1/critic-masks/skyline_12.png` — Tinted building volumes are weak and the mountain has many exposed triangular holes; far landscape is a broad orange sheet. Fresh paired active frame, measured with max RGB delta >6 mask.
- `shots/infoviews/r1/critic-masks/skyline_12_off.png` — Off plate: normal materials and road detail return; distant water reflections can retain prior overlay colour after two frames.
- `shots/infoviews/r1/critic-probe/play_ui_landvalue_12.png` — Actual ordinary-play Info Views → Land Value clicks show exactly one HUD legend over an empty city; no gameplay-growth claim.
- `shots/infoviews/r1/critic-probe/all_aerial_12.png` — All-mode activation shows exactly one HUD legend, no module panel; underlying city is still empty.

## Preserve

- All12fixed-domain grids agree with an independently implemented derivation.
- Synchronous12-view dispatch, deterministic sums and freshcrime restore work.
- Readable compact720p panel and exactlyone full-game HUD legend.
- Useful industrial hotspot, fixedramp bands and unpaintedwater.
- Owned overlay budget2–3draws,134088maxtriangles;intersection coverage continuous.
- Current realservice facility-kind queries work; do not replace them with aggregate categories.

No unrelated working-tree modifications were attributed to this builder; the workspace contains earlier waves and concurrent services work. Whole-gameplay and visual parity remain separate future gates.
