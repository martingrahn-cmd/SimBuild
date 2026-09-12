# Zoning round 2 — independent critique

8.0/10, FAIL. Functional zoning and a major improvement over round 1, but the half-cell lattice offset, excessive outline peaks and inconsistent night attenuation keep it below the 8.5 visual gate. API, console, stability and runtime budgets pass.

All 47 newly captured PNGs were viewed individually at full resolution, including the 32-frame matrix, both 720p frames, both crop captures, full-game view, both degradation views and all paired sessions. All eight CS2 reference images were opened again. Reviewed CRITIC.md, the zoning specification, ARCHITECTURE §§3/4/9/12/13/14, CS2-LOOK.md, residual.json, round 1 verdict, builder round 2 record and zoning source. Server: http://127.0.0.1:5174, seed 1337, Chromium/Metal, 1920×1080 except session F. No source changed by this critic.

## Evidence and measurements

All pixel luminance is Rec.709-weighted sRGB in 0–255 units. Paired crops use the exact full-resolution frame and required probe projections. Colors exclude high-density hatch pixels using the captured world-to-pixel geometry. Stipple is checked over every eligible sliding 100×100 crop entirely inside a single projected zone class. Temporal masks exclude approximately 3 px around region edges (7-px raster stroke). Projected cell triangles supply the zone masks; affine world interpolation within their small triangles is used for hatch phase. Distant cameras with no entire 100×100 block have no eligible stipple window; that is not a failure.

Raw evidence: [shots/zoning/r2/summary.json](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/summary.json), [shots/zoning/r2/apicheck.json](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/apicheck.json), [shots/zoning/r2/extra-probe.json](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/extra-probe.json), [shots/zoning/r2/imgstats.json](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/imgstats.json), [shots/zoning/r2/detailstats.json](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/detailstats.json), [shots/zoning/r2/finalcheck.json](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/finalcheck.json). Reproduction scripts are adjacent. The early apicheck `all` sub-result accidentally retained a duplicate showcase parameter; it is excluded. The corrected `extra-probe.all` uses the explicit full-game URL. The early amplitude sample selected the empty-band material; the four painted materials all expose 0.30, independently confirmed in extra-probe.

| Metric | Independent result |
|---|---|
| Scene maximum | 72 draws / 759,884 triangles |
| Zoning group-toggle delta | 5 draws / 17,896 triangles |
| Errors / status | 0 / zoning ready in every required matrix and extra capture |
| Per-frame zoning time | 0–0.1 ms in the 32-frame matrix |
| Band + lot + overlay rebuild | Showcase 19 ms; refresh 11 ms; event burst 9–13 ms |
| Idle geometries / init | Delta 0 over 60 idle frames / 1 ms |
| Painted / zonable / lots | 1,757 / 2,238 / 142 |
| Claimed | 1,246 = 70.916% of painted cells |
| Frontage vertices | 5,129; clearance 1.548006–1.550000 m; max run deviation 0.001625 m |
| Night whole-frame p1 / p50 / p99 | 27.302 / 52.594 / 113.580 |
| Stipple worst eligible 100px square | 0.40%, below 2%; zoneslope noon/dawn at [1013,663,100,100] |
| Session E max / mean absolute delta | 9.8516 / 0.031740, 465,437 pixels |
| Session F max / mean absolute delta | 1.9278 / 0.208149, 208,623 pixels |
| Empty band distance to bare / nearest class | 45.23 / 58.73 RGB units; empty fill 0.13 |
| Pinned far / near saturation | 0.19081 / 0.28974 = 0.65855 (distance caveat below) |

| Class | Noon std on/off | Noon mean rise | Night delta ratio | Wide std on/off |
|---|---:|---:|---:|---:|
| residential-low | 1.986 | 22.185 | 0.509 | 1.900 |
| residential-high | 2.222 | 14.755 | 0.317 | 2.015 |
| commercial-low | 1.735 | 14.612 | 0.534 | 1.653 |
| commercial-high | 0.975 | -20.724 | 0.440 | 1.014 |
| industrial-low | 2.044 | 30.362 | 0.430 | 2.068 |
| industrial-high | 1.455 | 5.855 | 0.274 | 1.438 |
| office-low | 1.416 | 8.042 | 0.621 | 1.333 |
| office-high | 1.327 | -3.128 | 0.723 | 1.380 |

All 28 between-hatch RGB separations pass: minimum 44.177 (commercial low/high), next 50.517 (commercial-high/office-high). This corrects the builder’s hatch-contaminated 37.2 estimate. Whole-frame p1 across the 32 matrix frames is always positive (minimum 18.936). The largest whole-frame p99 is 246.766 in the sunset skyline sky; no broad 255 clipping. The localized zoning sunset failure is explicitly identified rather than treated as a scene hard fail.

## Acceptance checklist

| Item | Result and evidence |
|---|---|
| 1 Translucency | PASS. Eight std ratios ≥0.9749; maximum mean rise 30.362; fill 0.52. Ground remains visible. |
| 2 Eight separable classes | PASS. All 28 pairs ≥44.177 between hatch lines, fixed hue families distinguishable in wide view. |
| 3 Density pattern | FAIL. Physical hatch 3.0 m, 45°, 18% darkening is correct; all four zones projected periods 10.72–17.31 px. Visible zonesclose high-density periods 9.69 and 34.65 px. Two high-density probes lie behind/outside zonesclose and cannot be sampled there. Four wide std ratios exceed 1.6; temporal aliasing was not observed. |
| 4 Night | FAIL. Four of eight required contribution ratios outside 0.35–0.55; coefficient 0.53 instead of 0.42. Full-frame p99 and brightest-pixel tests pass. |
| 5 Cell lattice | FAIL. A 4 m phase error puts the light lattice through cell centres. Representative measured ridge FWHM: street 1.55 px at (1534,562), closeup 1.65 at (529,445), wide sample 1.4 at (622,151), 720p 1.25 at (1019,641). Automated profiles near unrelated roads/horizon are contaminated and not grounds for additional width failures. Full width conformance is not claimed. |
| 6 Region outline | PASS at the staged internal boundary. Across five x=-120 boundary samples, peak/fill ratios 2.10–3.39, FWHM 2.50–3.40 px; falloff uniform 2.6 m. Shared uTime advances 1.0008 in 1 s; painted uPulseAmp=0.30. Sunset peak ceiling is a separate failure. |
| 7 Road-parallel edge | PASS. All inspected runs, including diagonal and curve, deviate by at most 0.001625 m, far below 1.5 m. |
| 8 Kerb setback | PASS geometric/visual clauses; contradictory road-mask clause advisory per residual. All 5,129 vertices have 1.548–1.550 m clearance. Coarse isRoad is nonzero at 5,047 (334 asphalt classifications); screenshots show no actual paint over road markings. |
| 9 Contact and stability | PASS visual/stipple/temporal checks. Cells use 0.16 m lift, 4 m subdivision, polygonOffset, depthWrite=false. Lot ink is merged into the cell shader, so it shares that surface rather than using separate 0.26 m ribbons; record this construction difference. No visible detachment. The curvature probe returns 0 but is mathematically vacuous per residual, so it is not the evidence for contact. |
| 10 Lots and coverage | PASS. 1,757 cells, 142 lots, 70.916% claimed; all preferred widths or one-slot corner extensions, depths 24/32, no sliver lots. Same-class width difference ≤8 m follows from the verified dimensions. |
| 11 Per-class lot dimensions | PASS. Zero mismatches against all eight preferred dimensions and permitted corner extension. |
| 12 Corner lots | Geometric check passes for the actual 44 staged junctions: no >2 unclaimed cells within 12 m. Build record lists only 39 ids while claiming 44; finalcheck finds 23 of the 39 recorded ids absent; all 16 existing recorded nodes pass the notch check. Documentation coverage is incomplete and must be refreshed; no invented corner failure. |
| 13 Organic water/slope boundaries | FAIL contour count only. Zero prohibited cells at centre/corners, slope or relief. Recorded 20-cell river run has 8 turns (<12); 57-cell hillside run has 30 (≥8). The river endpoint repeats; use its last occurrence to reproduce the builder’s full declared run, not the two-cell short arc. |
| 14 Highway/ramp frontage | PASS. Two staged highway edges; zero painted cells/lots reference highway or ramp. Full-grid zonable scan and source NO_FRONTAGE guard independently cover unpainted cells. |
| 15 Stable identity | PASS. All 142 ids and sentinel buildingIds unchanged after unrelated road addition/refresh; no spurious added/removed ids. |
| 16 Off outside zoning tool | PASS visibility: corrected all-view toggle difference 0 draws/0 triangles; zone event fades in, road event fades to hidden. Timing advisory per residual; actual 50 ms callbacks were delayed 326–407 ms and do not resolve the crossing interval. |
| 17 Brush | WITHDRAWN. No zoning-owned brush or setBrushPreview. |
| 18 Empty band | PASS. Alpha 0.13 and RGB distances 45.23 to bare, 58.73 to nearest class. Four required crop rectangles present. |
| 19 Shared fog/tonemapping | PASS material clauses and visual fog continuity; saturation ratio 0.65855 passes on pinned rectangles. Required near distance cannot be realized by this camera (see caveats). No distance-based failure. |
| 20 Budget | PASS. Five zoning draws, 17,896 triangles, scene max72, worst measured module0.1 ms, maximum measured rebuild19 ms, geometry delta0. Unmeasurable heap/texture-MB rows advisory. |
| 21 Determinism/persistence | PASS. Two seed1337 loads agree in cell/lot counts, histogram and ids; serialization restored identical cells and142 lots on a fresh load. No Math.random source matches. |
| 22 Degradation | PASS. No roads: cells/lots/zonable0, hidden, ready. No terrain:2,086 cells/185 lots, all vertices y=0.1599999964, ready. Both error-free. |
| 23 720p/crawl | Temporal/visual PASS: no new visible region dropout, max1.9278 and mean0.20815. Lattice registration failure in item5 persists at both resolutions; full width conformance is not separately claimed. |
| 24 Console errors | PASS. All32 matrix frames, all15 extras and independent page error collectors are empty. |
| 25 Building lot frame | PASS all142. Required fields present, orthonormal axes within0.001, heading faces road within0.02 rad, front approach hits road, y agrees within0.05 m. lotAt returns each lot at its centre. |
| 26 Events/coalescing | PASS. Bulk20 emits1, five paint calls emit5; exact payload shape and one version increment per emission; ten-edge burst produces3 band rebuilds. |
| §8 Sunset crop ceiling | FAIL. zoneslope_17p5 crop [1013,663,100,100] p99=247.8556 >235. |

## Contract and limitations

Module and world API methods are present: paint, erase, cellAt, lotAt, zonableAt, lotsFor, freeLots; module bulk, overlay controls, refresh, stats, probePoints, frontEdge, cropRects, serialize and deserialize. Paint/event, spatial lot queries, road refresh, persistence, overlay visibility and both missing-dependency paths were exercised. Stable cell/lot records and building-facing frame geometry satisfy the consumer contract. apiContractOk is true; visual failures and incomplete showcase documentation remain separate.

Residual adjudication: heap MB and texture MB cannot be derived from the named stats fields, so neither fails. Source uses procedural colors and no helper/PBR texture; texture-count/memory claims are not conflated. The steady-state 0.4 ms row has no independent sampler; the graded ≤1.0 ms per-shot row passes. Fade timing is advisory due the recorded resolution limitation and actual scheduling stalls. Geometric kerb clearance is authoritative over the coarse bleeding road mask. Bilinear curvature is identically zero on aligned terrain nodes and does not establish no floating by itself. The fixed-palette floor and actual 1,757-cell staging are checked directly, not using the residual’s invalid 16-block derivation.

The fog crop record reports approximately583 m near and862 m far at zoneswide, while the camera itself is around572 m above the target. The requested150±30 m near sample is impossible in that framing. The emitted API crop-distance diagnostic was queried after a different camera in the initial probe and is excluded; the frozen wide crop record is the applicable one. The observed ratio and shared shader fog pass, but no claim is made that the impossible distance pair was achieved.

Current shared-workspace git status includes integration and other module edits outside zoning, known concurrent parent/sibling work. Zoning source has no new dirty files; this critic wrote only evidence/probe files under shots/zoning/r2 and the two verdicts. Do not attribute unrelated core, terrain, UI or props changes to zoning. The all-view democity stub and elevated road bridge geometry are dependencies/outside zoning; they do not reduce this score. Early stored fps values predate the integrator’s wall-time fix and are excluded from grading.

Compared with round1, opacity, missing terrain read, night brightness, pavement overpaint, sliver sizes, corner extensions, dark disappearing lattice and order-dependent tint have materially improved. The current specification requires0.52 alpha and0.16 m cell lift; obsolete round1 suggested values are not used as new requirements. No generic hard-fail for intentional periodic zoning grid/hatch, expected no-road emptiness, or hidden full-game overlay is applied.

## Ranked issues

1. **MAJOR — The visible cell lattice is displaced four metres from the cell data**

Item 5 requires the 8 m cell borders. overlay.js computes abs(fract(worldXZ/8)-0.5), which draws at x/z=4+8k; the actual cell borders are x/z=8k. Thus the light lattice crosses cell centres and disagrees with lot and region edges by half a cell. For example the residential-low probe (-20,28), pixel (814,569) in zones_12, lies on a lattice intersection while its true cell corners are (-24,24) and (-16,32). Align the lattice phase with aCell/the world grid before retuning widths. This is a visual/data registration defect, not a lot API failure.

Evidence: src/modules/zoning/overlay.js:92-100; shots/zoning/r2/zones_12.png; shots/zoning/r2/zonesclose_12.png; shots/zoning/r2/extra-probe.json.

2. **MAJOR — Sunset region outlines exceed the luminance ceiling**

The bright-white perimeter is too dominant against the translucent fill. In zoneslope_17p5, the wholly zoned 100x100 rectangle [1013,663,100,100] has p99 luminance 247.86/255, above the section 8 limit of 235. Overlay-mask p99 is 242.78 in zones_17p5, 246.14 in zonesclose_17p5 and 246.00 in zoneslope_17p5. Reduce the near-white outline/pulse peak while preserving the measured boundary contrast and dark-hour read. This is a localized outline ceiling failure, not a whole-frame clipped-area hard fail.

Evidence: shots/zoning/r2/zoneslope_17p5.png, rect [1013,663,100,100]; shots/zoning/r2/imgstats.json; src/modules/zoning/overlay.js:136-142.

3. **MAJOR — Night attenuation remains uneven across the eight classes**

Using the required 200x200 mean(on-off) estimator, L22/L12 is 0.509, 0.317, 0.534, 0.440, 0.430, 0.274, 0.621, 0.723 in residential/commercial/industrial/office low/high order. Residential-high and industrial-high fall below 0.35; both office classes exceed 0.55. The night coefficient is 0.53, not the required 0.42. The full night scene is now convincingly dark (p99 113.58 and brightest pixel outside the overlay), so preserve that improvement while matching the per-class attenuation.

Evidence: shots/zoning/r2/sessionA_on.png; shots/zoning/r2/sessionA_off.png; shots/zoning/r2/sessionB_on.png; shots/zoning/r2/sessionB_off.png; shots/zoning/r2/imgstats.json.

4. **MINOR — Wide-view line contrast exceeds the density criterion in four probe crops**

At zoneswide noon, the eight required 100x100 on/off luminance-std ratios are 1.900, 2.015, 1.653, 1.014, 2.068, 1.438, 1.333, 1.380. Four exceed 1.6. Inspection shows structural lattice/outline contrast rather than temporal static: the two temporal tests pass. Reduce minified line/outline contrast without erasing the hatch. High-density hatch is correctly 3 m at 45 degrees with 18% darkening; visible projected periods are at least 9.69 px. Residential-high and commercial-high probes are outside zonesclose, so those requested close-crop measurements have no visible subject; move the probe/staging selections into both prescribed views.

Evidence: shots/zoning/r2/zoneswide_12.png; shots/zoning/r2/sessionC_off.png; shots/zoning/r2/imgstats.json; shots/zoning/r2/detailstats.json.

5. **MINOR — The declared river boundary run misses the contour-complexity floor**

Walking the recorded river run from 118,112 through the final occurrence of 119,112 reproduces 20 cells and 8 direction changes, below item 13’s 12. The hillside run is 57 cells and 30 changes and passes. Retain correct water/slope exclusion and stage a longer genuinely shoreline-following run with at least 12 changes; do not fill excluded terrain merely to alter the count. Also refresh the build record: junctionCount is 44 but junctionNodeIds contains 39 stale ids, so it cannot fully identify the claimed 44-node coverage set.

Evidence: docs/builds/zoning_r2.json:staging; shots/zoning/r2/apicheck.json:api.loops; shots/zoning/r2/detailstats.json:boundaryRuns; shots/zoning/r2/zoneslope_12.png.

## Strengths to preserve

- All eight palette classes remain identifiable; all 28 between-hatch RGB distances pass (minimum 44.18). Terrain detail survives alpha 0.52 fill.
- Road-parallel frontage geometry has a consistent 1.548–1.550 m geometric setback; lane markings and crosswalks remain readable.
- 142 lots have valid preferred dimensions and road-facing frames; 1,246 of 1,757 painted cells are claimed (70.92%). Lot IDs and buildingId survive refresh and persistence.
- No zoning console errors, observed temporal flicker or overlay detachment. Five attributable draws and 17,896 triangles; measured rebuilds at most 19 ms.
- Correctly hidden in the full-game view; graceful empty-road and flat-terrain degradation. Night is substantially darker than noon.

## Per-shot inspection

| File | Observed |
|---|---|
| [shots/zoning/r2/aerial_6p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/aerial_6p5.png) | A readable district of green, cyan, amber and violet bands; dawn retains hue. |
| [shots/zoning/r2/aerial_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/aerial_12.png) | Terrain texture remains visible; distant cell and lot structure is fine but readable. |
| [shots/zoning/r2/aerial_17p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/aerial_17p5.png) | Warm terrain under the same identifiable class families; white perimeter remains conspicuous. |
| [shots/zoning/r2/aerial_22.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/aerial_22.png) | District dims into the terrain; no neon-bright night overlay. |
| [shots/zoning/r2/street_6p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/street_6p5.png) | Clean kerb setback and visible markings under low morning light. |
| [shots/zoning/r2/street_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/street_12.png) | Ground texture reads through the foreground bands; bright crossing lattices expose the phase mismatch. |
| [shots/zoning/r2/street_17p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/street_17p5.png) | Warm ground and cool class hues remain separate; inset markings are unobscured. |
| [shots/zoning/r2/street_22.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/street_22.png) | Dim colored ground plan with clear region edges and dark streets. |
| [shots/zoning/r2/skyline_6p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/skyline_6p5.png) | Grazing view fades toward the horizon without a sheet of per-pixel static. |
| [shots/zoning/r2/skyline_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/skyline_12.png) | Distant blocks soften into the terrain; no saturated fog seam. |
| [shots/zoning/r2/skyline_17p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/skyline_17p5.png) | Warm bright sky dominates; zoning remains distinguishable on the ground. |
| [shots/zoning/r2/skyline_22.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/skyline_22.png) | Horizon and terrain stay visible in darkness; zoning is a subdued colored plan. |
| [shots/zoning/r2/closeup_6p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/closeup_6p5.png) | Road, crosswalk and green/cyan frontage remain separated. |
| [shots/zoning/r2/closeup_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/closeup_12.png) | Translucent fill and clean geometric kerb gap; two differently phased line systems. |
| [shots/zoning/r2/closeup_17p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/closeup_17p5.png) | Inset tint stays clear of the road markings; strong white borders remain. |
| [shots/zoning/r2/closeup_22.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/closeup_22.png) | Ground and grid dim together; no apparent detached zoning edge. |
| [shots/zoning/r2/zones_6p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zones_6p5.png) | All classes readable with bright region perimeters; thin lattice covers the interiors. |
| [shots/zoning/r2/zones_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zones_12.png) | Regular lots and open block cores; grid intersections fall on actual cell centres. |
| [shots/zoning/r2/zones_17p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zones_17p5.png) | Some outlines approach white despite warm terrain; overlay-mask p99 242.78. |
| [shots/zoning/r2/zones_22.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zones_22.png) | Convincingly dark overall, with office colors retaining too much relative contribution. |
| [shots/zoning/r2/zonesclose_6p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zonesclose_6p5.png) | Foreground purple hatch is broad but resolved; white contour outlines dominate. |
| [shots/zoning/r2/zonesclose_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zonesclose_12.png) | Slope-clipped purple bands and clear pavement; offset lattice meets true lot lines. |
| [shots/zoning/r2/zonesclose_17p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zonesclose_17p5.png) | White perimeters are too bright; overlay-mask p99 246.14. |
| [shots/zoning/r2/zonesclose_22.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zonesclose_22.png) | High-density purple bands stay legible over dark terrain; no visible z-fighting. |
| [shots/zoning/r2/zoneswide_6p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zoneswide_6p5.png) | Whole district is readable with a quiet neutral unpainted band. |
| [shots/zoning/r2/zoneswide_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zoneswide_12.png) | Class families separate, but several 100px probe crops exceed the std ceiling. |
| [shots/zoning/r2/zoneswide_17p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zoneswide_17p5.png) | Warm district remains chromatic; no apparent distant shimmer. |
| [shots/zoning/r2/zoneswide_22.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zoneswide_22.png) | District recedes into night haze with clear but dim class areas. |
| [shots/zoning/r2/zoneslope_6p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zoneslope_6p5.png) | Zoning follows the ground and stops at excluded terrain; road bridge geometry is separate. |
| [shots/zoning/r2/zoneslope_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zoneslope_12.png) | Contour cuts and neutral zonable cells visible; overlay itself stays on the slope. |
| [shots/zoning/r2/zoneslope_17p5.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zoneslope_17p5.png) | White boundary peaks exceed 235 in the measured cyan crop; terrain remains readable. |
| [shots/zoning/r2/zoneslope_22.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/zoneslope_22.png) | Dim cyan and purple band contours remain visible against the slope. |
| [shots/zoning/r2/crops_zones_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/crops_zones_12.png) | Pinned neutral band and bare-ground patches are present; neutral band visibly differs from both ground and painted classes. |
| [shots/zoning/r2/crops_zoneswide_12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/crops_zoneswide_12.png) | Pinned far block is less saturated; the declared near-distance geometry is not achievable at this elevated camera. |
| [shots/zoning/r2/all12.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/all12.png) | No zoning overlay; full-game HUD is contained and the base scene is visible. Democity is currently a separate stub. |
| [shots/zoning/r2/degrade_noroads.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/degrade_noroads.png) | Expected empty environment background: no roads means no zonable cells or overlay. |
| [shots/zoning/r2/degrade_noterrain.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/degrade_noterrain.png) | Flat road grid with a populated, level zoning overlay and readable colors. |
| [shots/zoning/r2/sessionA_off.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionA_off.png) | Noon ground and roads without zoning, used as the exact translucency baseline. |
| [shots/zoning/r2/sessionA_on.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionA_on.png) | Matching noon frame with all eight classes and their grid/outline structure. |
| [shots/zoning/r2/sessionB_off.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionB_off.png) | Night ground baseline without zoning; landscape remains visible. |
| [shots/zoning/r2/sessionB_on.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionB_on.png) | Night zoning is markedly dimmer; uneven class attenuation remains measurable. |
| [shots/zoning/r2/sessionC_off.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionC_off.png) | Wide-view terrain baseline without the zoning line structure. |
| [shots/zoning/r2/sessionC_on.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionC_on.png) | Wide-view overlay adds appreciable lattice and perimeter variance to four probe crops. |
| [shots/zoning/r2/sessionE_0.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionE_0.png) | Static slope view with clean terrain-conforming zoning before the live-time interval. |
| [shots/zoning/r2/sessionE_1.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionE_1.png) | Same slope composition after the interval; no visible crawl outside pulsing boundaries. |
| [shots/zoning/r2/sessionF_0.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionF_0.png) | 1280x720 district keeps the same visible region boundaries; no UI overflow. |
| [shots/zoning/r2/sessionF_1.png](/Users/martingrahn/Documents/SimBuild/shots/zoning/r2/sessionF_1.png) | 720p lattice remains visually still after the live-time interval. |
