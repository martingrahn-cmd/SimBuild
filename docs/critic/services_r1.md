# Services round1 — independent critic

**5.6/10 · FAIL · API contract not satisfied.** real services and power consequences work, but detached plumes, terraced grounds, repetitive detail, night aliasing, stale civic loads and dirty-work overruns remain well below the 8.5 CS2 bar.

Fresh evidence uses the shared dev server on 5174, System Chrome 152 with ANGLE Metal Apple M4, seed 1337, high quality and frozen clock. All 34 required matrix images and 19 diagnostic images were freshly captured and individually viewed; all eight CS2 reference images were viewed this round. The score is calibrated against their coherent ground treatment, material detail, service yards and restrained lighting, rather than against the builder’s self-score. There is no prior services critic round.

`critic-matrix/run.mjs` invokes the official screenshot tool. The API and seam instruments were reviewed, copied from the builder’s instrument and independently executed into critic-owned files; their outputs are fresh, not claimed as independently authored tests. `supplement.mjs` adds independently authored world-field,32-point persistence, actual-tick load and public-terrain-mutation probes. `image-metrics.py` was adapted from the reviewed owner instrument and rerun on the full-resolution critic PNGs. Source audit confirms all six services hashes match the frozen build report. No production source changed.

## Measured results

| Measurement | Independent result |
|---|---|
| Required matrix |34 images; errors 0; services ready in every image |
| Scene draw calls / triangles |matrix max 158 /1,524,634; aerial max 857,615 |
| Additional populated full-module integration |268 draws,1,305,143 triangles,67 textures;103 overlapping tree centers |
| Own baseline geometry |17 draws;124,274 triangles;3 textures;128 plume quads |
| Matrix service idle / init |max 0.1000001ms /86ms |
| Matrix fps |minimum 58.9 on Metal; not a SwiftShader timing claim |
| Fresh grid rebuild |12.4ms seed 1337;12.8ms seed 7;10.4ms supplemental repeat |
| Dirty geometry rebuild |94.8ms in update; whole next-frame wait 119ms is not isolated module CPU |
| Query |20,000 per gridded key: max 1.5ms, gridMs unchanged |
| Fixed coverage arrays |1,146,880 bytes before graph records |
| Night toggle meanAbs |0.00366840814 =0.935444/255; required >8/255 |
| Noon toggle meanAbs |0 exactly; required <0.5/255 |
| Pinned civic night isolated edges |0.006933911 =0.693391%; required <0.2% |
| Night civic frame luma |p1=.0291592; p99=.939709; clipped channel fraction 0 |
| Electricity info-view diff |.00396748306 =1.011708/255; required >20/255 |
| Info-view clear / API equivalence |both meanAbs 0 exactly |
| Brownout |240/252=.95238095238; max sample error 2.84e−9 |
| Numeric pad samples |22×12; max high error.075948m; four sloped pads |

Pixel luma uses normalized source RGB and Rec.709 display-luminance weights on the original 1920×1080 PNGs. Diff is mean absolute RGB difference. No downscaled image statistic is substituted. The civic_22 pinned facade is 73×65 pixels at [454,623,73,65]. Raw invalid plume ratios remain in the evidence file for traceability, but are not graded.

## Ranked issues

### 1. Detached, hard-cut plumes dominate the skyline (major)

The plume becomes a separate patch with a straight lower edge above the plant, white by day and nearly black at night. Correct emitter-space attachment, particle bounds/order and age fading; retain wind movement. Source has radial sprite alpha but no lifetime fade or opaque-depth intersection fade. A safe depth contract is explicitly deferred by the integrator: do not read an active composer attachment. Fix the independently visible seam now and keep the deferred depth requirement disclosed.

Evidence: /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/skyline_12.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/skyline_22.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/plant_close_12.png

### 2. Showcase grades form cliffs and facility parking intersects walls (major)

All 22 pads pass the sampled height subset, but the district has steep black road-corridor walls and projecting triangular corners. Replace abrupt showcase grading with a bounded batter or visible retaining construction and coherent road-to-yard access. At the clinic four cars meet/intersect the front wall; move parking and its markings clear of the facade and canopy. This is separate from the accepted external forest/clutter exclusion handoff.

Evidence: /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/civic_6p5.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/utilities_12.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/closeup_12.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/aerial_12.png

### 3. Facades, grounds and plans remain visibly procedural (major)

Industrial walls are largely blank slabs with coarse mottling; campuses repeat the same window grid and generic roof kit; park hedges are flat bars and curved-path segment joins make notches. Preserve recessed clinic openings and the recognizable silhouettes, but refine material scale, facade articulation, paving edges and plan-specific details. School lacks the specified fenced yard. Solar has 95 rack segments in only 19 long rows, rather than the literal 40 rows. Do not inflate panel-segment count into row count.

Evidence: /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/plant_close_12.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/civic_12.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/park_12.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/utilities_12.png

### 4. Live civic loads and terrain mutation versions are stale (major)

After actual simulation.step(110), sum of building occupants is zero while clinic/hospital and other civic loads remain 85/126/etc. refreshLive refreshes producers but not civic loads. Grid rebuild also counts coverage(item.kind) as a union for every duplicate park, so per-facility loads use the whole kind network. Independently, public terrain.setHeights moves clinic y from 15.04 to 15.2399998093 and emits updated IDs but services.version remains 24. Refresh each facility against its own covered population, update it as population changes, and invalidate the owned world version when reseating changes items.

Evidence: /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/supplement.json; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/api-probe.json; src/modules/services/coverage.js:17,21; src/modules/services/index.js:13

### 5. Night window response fails both quantitative gates (major)

Noon emissive on/off difference is exactly zero. At 22:00 it is real but only 0.935444/255 full-frame meanAbs, below >8/255. The full-resolution pinned civic_22 facade has 0.693391% horizontally isolated edges above 40/255 versus <0.2%. Baked attributes avoid the forbidden fragment hash but do not remove the visible white window chains. Improve coherent window size/filtering and localized yard/entrance light; do not lift the entire wall or exposure just to satisfy a frame statistic.

Evidence: /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/toggle_night_on.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/toggle_night_off.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/civic_22.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/image-metrics.json

### 6. Dirty work exceeds the per-frame budget (major)

Idle update is at most 0.1ms, but two same-frame removals trigger a 94.8ms owned geometry rebuild executed synchronously by update(). The 119ms observed next-frame delay includes neighbors and is not claimed as module CPU. Initial grid rebuild is 12.4ms (seed 7 12.8ms), above 12ms, and source has no once-per-0.25s throttle. All fixed coverage cache arrays total 1,146,880 bytes (1.09375MiB) before graph records. Reuse/batch geometry, slice dirty work with a measured budget, and reduce auxiliary cache memory.

Evidence: /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/seams.json; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/api-probe.json; src/modules/services/index.js:13; src/modules/services/coverage.js:5

### 7. Pinned API and desaturation leave acceptance unprovable or missed (major)

park_12 omits grass_ref. The coal plume pin ignores the facility heading and sky_ref intersects a neighboring plume, so raw plume ratios are not valid physical measurements. Supply correct in-frame owner landmarks before recoloring against those numbers. world.infoview.active=electricity and setInfoview produce exactly equal images and clear restores exactly, but meanAbs is only 1.011708/255 versus >20/255; owned foliage stays green because its material lacks the desaturation path. Apply the same category-aware treatment to all owned meshes.

Evidence: /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/park_12.crops.json; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/utilities_12.crops.json; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/info_field.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/info_api.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/image-metrics.json

### 8. Coverage overlay has terrain intersections; staging remains undersized (minor)

The overlay follows roads correctly and starts disabled, but its surface has holes and hard intersection patches across terrain/courts. Improve geometric seating and edge filtering without replacing real connected-component ratios with fictitious radial falloff. Three camera-move frames were inspected; whole-frame differences include parallax and do not prove the requested overlay-region flicker threshold. The stage has 126 buildings and 126 lots; buildings meet 120, but the 140–180 free-lot staging requirement is not met.

Evidence: /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_12.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_clinic_12.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_move_0.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_move_1.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_move_2.png; /Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/seams.json

## Acceptance checklist

Partial or unverified clauses are not a complete pass. Missing instruments are distinguished from measured failures.

1. **The four hero silhouettes exist and are unmistakable — partial/fail.** All four recognizable. Cooling towers are 64m, 40 segments, waist ratio 0.561 at 0.55 height; hub 49.5m, rotor 52m, water tower 28m. Solar 19 long rows × 5 segments fails literal ≥40 rows.

2. **Steam and smoke plumes — fail.** Visible attachment/clipping defect and source lacks soft depth/age fade. 128 quads = 32 per emitter passes counts. Wrong plume/sky pins invalidate the prescribed luma and wind-apex numeric comparisons; no fabricated ratio failure.

3. **coverage() is correct, fast and allocation-free — pass with scoped probe limits.** All 20 valid keys and nonsense/constructor/__proto__ finite 0–1; 14 Float32Array(16384) grids and six ungridded nulls. 20,000 reads per gridded key max 1.5ms, gridMs unchanged, allocation-free bilinear source. Isolated coal covers 100% ≥0.9, off-road zero, remove+flush zero. Coal-removal cannot literally zero unrelated clinic/water keys; interpreted per category as residual requires.

4. **Road-distance coverage, not a euclidean circle — pass.** Independent rerun of disconnected real-road fixture: power 1/0, link →1, unlink →0; clinic accessible point 0.90972, long detour 0; 80m off-road utility zero. Road-following overlay visible. Empty-road fallback warns once and returns finite values. This is a diagnostic fixture, not an ordinary UI test.

5. **Parks and plazas are designed ground, not green rectangles — partial / numeric unverified.** 70 trees, three species, 26 benches, 13 bins, 26 lamps, hedge fraction .78. Two curved 3m paths, water feature, patterned plaza and internal lamps exist. Flat hedge strips/path notches remain below reference quality. Missing grass_ref prevents the required lawn separation comparison; do not call the missing statistic a measured color failure.

6. **Every facility is seated in the ground on a graded pad — fail.** 12 samples ×22, four sloped pads; max high-sample error .075948m and skirts ≥.35m below lowest pass. Required visual batter/retaining construction fails on sheer black grades.

7. **Civic buildings match the buildings module’s material quality — partial/fail.** Clinic openings have real .32m recess/head shadows and .325m cap, canopied signed entrance; wings and roof kit exist. Repeated window sheets and coarse simple wall treatments still fall short of the visual quality target. Do not label these literally untextured: procedural atlas/material exists.

8. **Distinct plan per civic kind — partial/fail.** 22 facilities cover 17 kinds. Small L clinic, H helipad hospital, track high school, quad university, fire doors/tower and police mast distinguish many plans. School fence is absent; generic canopy/mast details do not resolve all prescribed plan cues.

9. **Parking and service yards, marked — fail.** Regular bay lines and vehicles exist, but clinic parking intersects the facade and marked kerb access is incomplete. No assertion of an isolated measured line-shimmer failure.

10. **Night: lit, not glowing — fail.** Noon toggle 0; night toggle .935444/255 <8/255. Pinned facade isolated-edge fraction .693391% >.2%. Night frame p1 7.4356/255, p99 239.6258/255, clipped-channel fraction 0 pass. Sixfold lit-window/wall comparison remains unverified; do not infer from frame percentiles.

11. **Solar panels do not sparkle or blow out — pass.** Utilities 12/17.5 have zero pixels above245 luma and no clipped channels. Source: dark blue glass, roughness .84, linear albedo components <.09, no normal map; roughness bounds satisfied. No sparkle visible.

12. **Placement validation is real and deterministic — pass.** Water/slope/overlap/no_frontage reproduced; invalid and poor placements null without mutation; small park debit3000 exactly once. Same-seed repeat preserves count/tris/supply/treeHash; seed 7 preserves all id/kind/x/z/heading placements but treeHash2129119487→238951765. Same-frame removals combine events and increment version twice. Separate terrain-version API failure noted below.

13. **Supply, demand and load are live and drive growth — fail.** Coal-only supply600/demand252; no-power economy and actual building power0 within 110 real ticks. Brownout240/252 sampled error 2.84e−9; wind/solar/incinerator formulas correct. Civic loads fail to refresh when occupants change; source uses union-of-kind coverage for duplicate facilities. Do not enforce contradictory capacity bounds against parks’ empty capacity objects.

14. **Coverage overlay reads like CS2 and is off by default — partial/fail.** Explicit-only overlay, one draw/512 texture, depthWrite false, UI3D order, polygonOffset false and alpha135 satisfy state/render subset. Surface intersection patches fail visual seating. Three 1m move frames show no obvious random flash, but global diffs3.478/3.495 per255 are not an isolated-region temporal measure. No numerical flicker fail is asserted. Utility components correctly stay flat.

15. **Budget — fail.** Matrix render/idle/init/query budgets pass. Initial grids12.4/12.8ms exceed12; no .25s throttle; mutation static rebuild94.8ms exceeds update budget. Cache fixed arrays1.09375MiB before graph. SwiftShader setup bound unmeasured on Metal; no claimed pass.

16. **Catalogue matches the UI contract exactly — pass.** Programmatic UI diff label/cost/unlock/category: zero differences. Independent parser of spec table vs catalog capacity/radius/footprint/cost/upkeep: zero differences, stronger than ±10%. All 17 output/other required fields exist.

17. **Save/load round-trips — pass for shipped level1 items.** Double deserialize preserves 22 items,32 power samples maxdelta0,124274 tris and17 draws, no money charge. Source always creates level1 and serialized records omit level: arbitrary future upgraded levels are not covered by this pass and require preservation when supported.

18. **Info view desaturation honoured — fail.** Electricity field and explicit API images exactly equal, clear exactly restores. Literal frame diff1.011708/255 <20/255; foliage remains saturated though opaque materials use .8 desaturation. Category exemptions must remain.

19. **No tiling, no seams on service ground — fail.** Hard lawn/pad/terrain edges and repetitive flat paving/hedge treatments remain apparent at aerial/civic scale. Pad y+.04 is within height band, but it does not provide required kerb/band/blended boundary.

20. **Wind turbine blades read at every distance — pass for inspected views/source.** Three tapered blades remain recognizable at utilities distance. Source root chord1m >.88, four ID phases separated by1.7 radians, clock/wind-speed rotation. No automated temporal alias sweep was performed.

21. **Contact darkening — partial / numeric unverified.** Contact pools and small shadows exist; clinic parked-car collision compromises wall_base. No valid supplied comparison column at midheight/5m out, so the paired 25% test is unmeasured. Do not turn an unprovided calibration into a numeric failure.

22. **The props overlap at --showcase all is not left silent — pass handoff.** Core request names inLot/footprint exclusion and event/version invalidation. Builder explicitly reports empty all 0 facilities/0 overlap limitation and populated 103 tree overlaps under remainingWeaknesses. Independent populated integration probe reproduces103 of2981 trees. This passes disclosure, not integration; exclusion is root-owned and deferred.

## API and engineering contract

- catalog/footprint: all 17 numeric and UI table values match; no stale aliases added.
- place/validate/remove: real rejection reasons, owner-only single debit, monotonic IDs, event coalescing and missing-spend free fallback pass the controlled probes.
- coverage/coverageGrid: bounded finite queries, connectivity, shapes and allocation-free read path pass the scoped probes.
- at/get/count/stats: return staged items/count 22 and current kinds; stats exposes the stated fields. Live civic load content is wrong as documented.
- setCoverageOverlay: explicit on/off and road-following data work; visual intersections remain.
- setInfoview: field/API parity and reset pass, foliage/category completeness fails.
- setNight: override and null reset exist in source; clock-based night was exercised, not a separate override-only runtime test. setEmissive was independently toggled.
- flush: removal changes coverage synchronously; dirty static rebuild is too expensive.
- cropRects: required lawn reference absent and plume/sky landmarks are misregistered; API not fully satisfied.
- serialize/deserialize: double default-item roundtrip and 32-point coverage pass; arbitrary upgraded levels untested and omitted by source.
- world object is mutated in place in source, but terrain-driven item mutation does not bump services.version in the independent probe.
- No Math.random, fract(sin hash, new lights, composer mutation or renderer.render calls were found in services. Shared working-tree changes span the ongoing wave, so git status alone cannot attribute all non-services modifications to this owner; no unsupported ownership violation is asserted.

## Hard fails, scope and contradictions

All matrix frames render, retain nonzero low luminance and show no broad clipping (matrix maximum clipped-channel fraction 0.0001664); there is no whole-frame black/empty result, missing entire night lighting or console error. The conspicuous repeated surface treatment and hard ground/plume discontinuities prevent a visual pass. Existing procedural texture material is not called “missing texture.” No isolated numerical z-fighting/flicker verdict is invented. The720p headless shot tests the canvas, not a full HUD.

The all-kinds scene has several power producers, so sole-coal removal explicitly removes other producers first. The literal “all keys” coal-removal phrasing cannot correctly mean deleting health or water coverage; evaluate relevant service categories. Covered population may exceed nominal civic capacity and parks have no people capacity: the residual decision preserves the population formula, while the separately reproduced stale-load/union bug remains a failure. Use the stricter 2ms update bound despite the 4ms grid-slice wording;94.8ms exceeds both. The coverage budget totals 14 grids plus component map to.90625MiB; including the necessary auxiliary arrays yields 1.09375MiB. If only exposed grids were intended, that narrower subset passes; dirty CPU already independently fails item 15.

Flat utility coverage on a served road component is the correct supply/demand ratio, so no fake radial gradient is demanded. Standard screenshot JSON omits stats.overlay; source and separate probe prove explicit-only/default null, not a nonexistent per-shot field. The safe opaque-depth API is deferred by the integrator and must not be bypassed. Contact paired-reference and lawn/plume landmark defects leave their numeric tests unverified.

The root owns the 103-tree forest/ground-clutter exclusion, tools placement/undo finance adapters, capacity-object inspector and persistent managed-services simulation latch. Their concrete handoff passes item 22; it does not claim those seams are integrated. The API mode=play fixture proves real service consequences but is deliberately prepared with public road/terrain APIs. Ordinary-UI new-city playability, whole-game integration and blind A/B remain later root gates.

## Strengths to preserve

- Real connected utility coverage and road-distance civic reach; fast precomputed grid reads.
- Actual power loss propagates to economy and buildings within 110 ticks; brownout is proportional.
- Exact 17-kind catalog, guarded charging, deterministic placements and decor, repeatable default-item persistence.
- Recognizable cooling towers, wind turbines, civic plans and real recessed clinic geometry; owned park kit and lighting exist.
- Zero console errors and ready throughout 34 independent matrix shots; render and idle budgets have substantial headroom.
- Owner honestly documented the 103-tree integration seam and deferred depth contract; preserve this distinction.

## Per-shot observations

Every PNG below was individually viewed at capture review; none is merely listed from a file glob.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/utilities_6p5.png` → Cooling towers, wind field, dark solar racks and water tower read clearly; plain industrial slabs and abrupt pad/road grades remain. Morning side lighting exposes edge and seating defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/utilities_12.png` → Cooling towers, wind field, dark solar racks and water tower read clearly; plain industrial slabs and abrupt pad/road grades remain. Noon view stays unclipped and readable.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/utilities_17p5.png` → Cooling towers, wind field, dark solar racks and water tower read clearly; plain industrial slabs and abrupt pad/road grades remain. Warm evening light and long shadows add depth without hiding the geometry defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/utilities_22.png` → Cooling towers, wind field, dark solar racks and water tower read clearly; plain industrial slabs and abrupt pad/road grades remain. Night retains a readable scene; small bright window chains contrast with weakly lit yard masses.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/plant_close_6p5.png` → Hyperboloid towers and boiler house are recognizable; coarse concrete mottling, blank walls and sparse generic yard detail remain. Morning side lighting exposes edge and seating defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/plant_close_12.png` → Hyperboloid towers and boiler house are recognizable; coarse concrete mottling, blank walls and sparse generic yard detail remain. Noon view stays unclipped and readable.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/plant_close_17p5.png` → Hyperboloid towers and boiler house are recognizable; coarse concrete mottling, blank walls and sparse generic yard detail remain. Warm evening light and long shadows add depth without hiding the geometry defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/plant_close_22.png` → Hyperboloid towers and boiler house are recognizable; coarse concrete mottling, blank walls and sparse generic yard detail remain. Night retains a readable scene; small bright window chains contrast with weakly lit yard masses.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/civic_6p5.png` → Helipad, running track and quad distinguish campuses; repeated window grids and large terraced road corridors dominate the image. Morning side lighting exposes edge and seating defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/civic_12.png` → Helipad, running track and quad distinguish campuses; repeated window grids and large terraced road corridors dominate the image. Noon view stays unclipped and readable.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/civic_17p5.png` → Helipad, running track and quad distinguish campuses; repeated window grids and large terraced road corridors dominate the image. Warm evening light and long shadows add depth without hiding the geometry defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/civic_22.png` → Helipad, running track and quad distinguish campuses; repeated window grids and large terraced road corridors dominate the image. Night retains a readable scene; small bright window chains contrast with weakly lit yard masses.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/park_6p5.png` → Curved paths, fountain/court and owned furniture are present; flat hedge bars, notched segment joins and ground clutter weaken the designed garden. Morning side lighting exposes edge and seating defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/park_12.png` → Curved paths, fountain/court and owned furniture are present; flat hedge bars, notched segment joins and ground clutter weaken the designed garden. Noon view stays unclipped and readable.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/park_17p5.png` → Curved paths, fountain/court and owned furniture are present; flat hedge bars, notched segment joins and ground clutter weaken the designed garden. Warm evening light and long shadows add depth without hiding the geometry defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/park_22.png` → Curved paths, fountain/court and owned furniture are present; flat hedge bars, notched segment joins and ground clutter weaken the designed garden. Night retains a readable scene; small bright window chains contrast with weakly lit yard masses.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/aerial_6p5.png` → The full22-facility district and housing demand are legible; black terrace strips and projecting road/pad junction corners remain. Morning side lighting exposes edge and seating defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/aerial_12.png` → The full22-facility district and housing demand are legible; black terrace strips and projecting road/pad junction corners remain. Noon view stays unclipped and readable.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/aerial_17p5.png` → The full22-facility district and housing demand are legible; black terrace strips and projecting road/pad junction corners remain. Warm evening light and long shadows add depth without hiding the geometry defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/aerial_22.png` → The full22-facility district and housing demand are legible; black terrace strips and projecting road/pad junction corners remain. Night retains a readable scene; small bright window chains contrast with weakly lit yard masses.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/street_6p5.png` → Clinic recesses and canopy cast readable shadows; parking cars meet its wall and large nearby leaf cards obscure the foreground. Morning side lighting exposes edge and seating defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/street_12.png` → Clinic recesses and canopy cast readable shadows; parking cars meet its wall and large nearby leaf cards obscure the foreground. Noon view stays unclipped and readable.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/street_17p5.png` → Clinic recesses and canopy cast readable shadows; parking cars meet its wall and large nearby leaf cards obscure the foreground. Warm evening light and long shadows add depth without hiding the geometry defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/street_22.png` → Clinic recesses and canopy cast readable shadows; parking cars meet its wall and large nearby leaf cards obscure the foreground. Night retains a readable scene; small bright window chains contrast with weakly lit yard masses.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/skyline_6p5.png` → Industrial silhouettes remain recognizable, but a detached plume patch with a straight lower edge floats above the plant; island-grade corners look artificial. Morning side lighting exposes edge and seating defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/skyline_12.png` → Industrial silhouettes remain recognizable, but a detached plume patch with a straight lower edge floats above the plant; island-grade corners look artificial. Noon view stays unclipped and readable.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/skyline_17p5.png` → Industrial silhouettes remain recognizable, but a detached plume patch with a straight lower edge floats above the plant; island-grade corners look artificial. Warm evening light and long shadows add depth without hiding the geometry defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/skyline_22.png` → Industrial silhouettes remain recognizable, but a detached plume patch with a straight lower edge floats above the plant; island-grade corners look artificial. Night retains a readable scene; small bright window chains contrast with weakly lit yard masses.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/closeup_6p5.png` → Clinic L massing, eave and recessed openings resolve; generic cars intersect its facade and clutter penetrates the apron. Morning side lighting exposes edge and seating defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/closeup_12.png` → Clinic L massing, eave and recessed openings resolve; generic cars intersect its facade and clutter penetrates the apron. Noon view stays unclipped and readable.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/closeup_17p5.png` → Clinic L massing, eave and recessed openings resolve; generic cars intersect its facade and clutter penetrates the apron. Warm evening light and long shadows add depth without hiding the geometry defects.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/closeup_22.png` → Clinic L massing, eave and recessed openings resolve; generic cars intersect its facade and clutter penetrates the apron. Night retains a readable scene; small bright window chains contrast with weakly lit yard masses.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/night_civic_22.png` → Individual white windows and small lamp pools are real, but the white window chains and black plume streak look synthetic. Night retains a readable scene; small bright window chains contrast with weakly lit yard masses.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/civic_12_720.png` → Helipad, running track and quad distinguish campuses; repeated window grids and large terraced road corridors dominate the image. Noon view stays unclipped and readable. The1280×720 headless canvas is intact; no HUD is loaded, so this is not a full-game UI overflow test.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/probe_coverage_off.png` → Normal top-down service district; no coverage decal enabled.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_12.png` → Power color ramp follows the streets/component, with court/terrain holes and hard patches; flat interior ratio is correct.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_clinic_12.png` → Clinic warm-to-green falloff follows road reach rather than a disk; surface holes remain.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_move_0.png` → First power-overlay camera frame; road mask and surface holes visible.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_move_1.png` → One-meter camera move retains the overlay structure; geometry/parallax changes make global pixel diff unsuitable for flicker grading.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/coverage_move_2.png` → Second one-meter move shows the same intersection pattern; no obvious random flash, no isolated-overlay numerical pass claimed.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/toggle_noon_on.png` → Noon civic district with emissive enabled; no visible night glow.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/toggle_noon_off.png` → Noon image is exactly identical with emissive disabled.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/toggle_night_on.png` → Night windows and pools appear; facade resolves as white repeated window chains.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/toggle_night_off.png` → Windows disappear as expected, but whole-frame response remains below required threshold.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/wind_plus.png` → Wind fixture changes plume arrangement and much of the surrounding lighting; isolated apex shift is not established.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/wind_minus.png` → Opposite-wind fixture has a major environmental change, confounding full-frame plume measurement.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/infoview_power.png` → Opaque service geometry is grayed while foliage remains green; this legacy power-key image is not the formal electricity-field test.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/probe_play_fixture.png` → Two real facilities in an API-prepared play page after road removal; diagnostic placement/connectivity evidence, not ordinary UI gameplay.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/seed 7_park.png` → Park vegetation redistributes while the facility arrangement remains fixed.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/info_off.png` → Baseline civic shot before the official electricity-field desaturation comparison.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/info_field.png` → Electricity field grays civic opaque meshes but leaves service foliage saturated.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/info_clear.png` → Clearing the field exactly restores the baseline civic image.

- `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/info_api.png` → Explicit setInfoview gives exactly the same image as the world electricity field.


## Calibration and reproducible evidence

All eight references viewed: `/Users/martingrahn/.simbuild/ref/cs2_1.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_2.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_3.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_4.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_5.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_6.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_7.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_8.jpg`.

- matrix: `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-matrix/summary.json`
- api: `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/api-probe.json`
- supplement: `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/supplement.json`
- seams: `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/seams.json`
- pixels: `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/image-metrics.json`
- sourceAudit: `/Users/martingrahn/Documents/SimBuild/shots/services/r1/critic-probe/source-audit.json`
