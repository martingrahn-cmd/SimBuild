# Zoning round 3 — independent critique

8.0/10, FAIL. Grid registration, sunset control and staging improved, but every signed night ratio fails, some close-view lines exceed 2.5px, sparse hillside temporal outliers remain, and one wide-view contrast crop narrowly misses its ceiling. API and rendering budgets pass.

All eight CS2 reference images were opened individually before scoring. All 52 final PNGs listed below were independently captured and individually viewed: 32 matrix views, 15 required extras, four diagnostic line-isolation frames and one declared-river-run view. Read the full CRITIC role and zoning spec, ARCHITECTURE §§3/4/9/12/13/14, CS2-LOOK, residual decisions, previous critic report, builder staging record and relevant source. No source or STATUS edits. Seed1337, Chromium/Metal, SIM_URL=http://127.0.0.1:5174, SIMBUILD_REF=/Users/martingrahn/.simbuild/ref; 1920×1080 except the two 1280×720 Session F frames. HMR was isolated. Other modules changed during this shared workflow; paired evidence is from the same loaded page.

## Evidence and method

Raw evidence and reproduction scripts are under `shots/zoning/r3/critic-probe/`: apicheck, extra-probe, imgstats, detailstats, targeted and line-isolation. The 32 independent gauntlet results are in `shots/zoning/r3/summary.json`. Full-resolution Rec.709-weighted sRGB luminance uses 0–255 units. Required A/B/C crop locations come from the recorded API projections. Between-hatch color sampling uses captured cell triangles and world phase. Stipple exhaustively checks eligible sliding 100px squares within one projected zone class; cameras with no eligible whole square are not treated as failures. Temporal region boundaries are rasterized with a seven-pixel stroke, excluding approximately three pixels on each side. This detects a composite failure, not a proven zoning shader root cause.

The first targeted diagnostic attempt froze before the camera had rendered and then used direct renderer calls, producing stale-camera/background frames. Those invalid captures were replaced using normal frame updates, settled cameras and freeze-after-render. They are not grading evidence. The final five targeted frames were re-viewed. The optional direct-render all-budget experiment was rejected as confounded by renderer state; the required apicheck all session measures the correct 0/0 difference. A second asynchronous extra-probe all difference of -3 calls likewise reflects neighbor rendering and is not evidence of negative zoning cost. The amplitude reader in apicheck selected the empty-band material (0); all four painted materials independently report 0.30 in extra-probe.

## Measurements

| Metric | Independent result |
|---|---|
| Scene maximum | 72 calls / 769,300 triangles |
| Zoning group difference | 5 calls / 19,376 triangles |
| Errors / status | 0 / ready in all 32 matrix and all required extra frames |
| Painted / zonable / lots / claimed | 1,728 / 2,423 / 143 / 1,269 (73.4375%) |
| Rebuild / idle geometry / init | Showcase19ms, event9–11ms; zero geometry growth over60frames; init1–2ms |
| Frontage | 5,347 vertices; 1.5478698–1.5500000m clearance; max median deviation0.0020025m |
| Session E max / mean / count above12 | 21 / 0.0428607 / 22 of436,083 pixels |
| Session F max / mean / count above12 | 12 / 0.2165095 / 0 of187,535 pixels |
| Spatial stipple worst | 0.13% at zoneslope dawn/noon [1012,647,100,100], limit2% |
| Noon class separation | Minimum42.70649, commercial-high versus office-high; all28 pairs pass |
| Night zones p99 | 85.5026, limit200; brightest pixel outside overlay |
| Whole matrix luminance | Minimum p1=18.9358; largest whole-frame p99=246.7662 in sunset sky; no broad255 clipping |
| Sunset zoned-area p99 | Maximum187.1628; visual review shows former blown outline is gone |
| Empty-band RGB distances | 47.4315 to bare ground; 58.8304 to nearest class; alpha0.13 |
| Pinned far/near saturation | 0.1874174 / 0.2901837 =0.6458577 |

| Class | Noon std on/off | Noon signed mean rise | Night signed delta ratio | Wide std on/off |
|---|---:|---:|---:|---:|
| residential-low | 1.881287 | 21.088497 | 0.271627 | 1.488593 |
| residential-high | 1.196931 | 6.026387 | 0.089483 | 1.030699 |
| commercial-low | 1.608197 | 13.333645 | 0.261256 | 1.349552 |
| commercial-high | 1.034293 | -3.561758 | 0.806890 | 1.016507 |
| industrial-low | 1.957674 | 28.748557 | 0.204843 | 1.615181 |
| industrial-high | 1.070297 | 3.552825 | -0.053876 | 1.002749 |
| office-low | 1.240783 | 6.787686 | 0.152979 | 1.103115 |
| office-high | 1.056853 | -4.882268 | 0.880881 | 0.985705 |

## Acceptance checklist

| Item | Result and evidence |
|---|---|
| 1 Translucency | PASS. All eight std ratios≥1.0343 and mean rise≤28.7486; fill0.52. Ground detail survives. |
| 2 Eight classes | PASS. Fixed palette, all28 between-hatch distances≥42.70649; all hue families recognizable. |
| 3 Density pattern | FAIL narrow wide-crop clause. World hatch45°, period3m, darkening18%; high-density projected periods8.31–11.51px in zones and4.55–34.65px in zonesclose, all four probes in frame. Industrial-low wide std1.615181>1.6. |
| 4 Night | FAIL all eight signed crop ratios. Shader night multiplier0.42 is correct and dim whole-frame/brightest-pixel clauses pass; those do not substitute for signed paired contribution. |
| 5 Lattice/outline widths | FAIL confirmed close-view lattice widths3.10–3.25px. Grid now aligned at true8m borders. Generic full-composite medians street3.0, closeup3.0, zonesclose4.2, wide2.0 include lot/terrain ridges and are not clean isolated width verdicts. Independent isolation removes ambiguity for three close-view samples. |
| 6 Region outline | PASS checked staged mixed-class boundary. Native local ridge peaks versus brighter adjacent fill are1.398–1.459 on interior samples; bilinear profiles versus the average of both sides are1.73–1.78. The bilinear sampled peak at one point underestimates the native-pixel peak, so its1.339 brighter-side ratio is not a confirmed failure. Glow2.6m, shared time advances1.0139 in1s, painted uPulseAmp0.30. No global contrast guarantee is inferred beyond the prescribed staged boundary. |
| 7 Road-parallel frontage | PASS all runs, including diagonal/curve. Maximum deviation0.0020025m, no8m stairs. |
| 8 Kerb setback | PASS geometric/visual clauses. All5,347 vertices at1.54787–1.55m. Road mask nonzero5,247 including336 asphalt classifications is advisory under the explicit coarse-mask residual; screenshots keep actual pavement/markings clear. |
| 9 Contact/stability | FAIL temporal max21>12; mean passes. Spatial stipple≤0.13%, surface follows terrain visually. Cells lifted0.16m, 4m tessellation, depthWrite false, polygonOffset. Lot ink is incorporated into cell shader rather than separate0.26m ribbons, same disclosed construction as prior round. Curvature0 is mathematically vacuous per residual. |
| 10 Lots/coverage | PASS1,728 cells/143lots/73.44% claimed; depths24/32m, preferred widths or one-slot corner extensions, no illegal slivers. |
| 11 Lot dimensions | PASS zero mismatches for all143 lots against all eight preferred dimensions and allowed+8m corners. |
| 12 Corner claims | PASS no recorded junction has more than2 unclaimed zoned cells within12m. Actual staging lists45 junctions. |
| 13 Slope/water/contours | PASS zero prohibited cells at center/corners/slope/relief. Exact declared forward river run71,81→70,82 contains21cells/14direction changes; hillside169,109→169,110 contains58cells/33changes. The river run includes its inland return, openly disclosed; the literal declared-run rule is applied. Its dedicated image shows the subject, which is outside the eastern zoneslope camera. |
| 14 Highway/ramp | PASS two staged highway edges, zero painted cell/lot references to them; source frontage exclusion covers the zonable band. |
| 15 Lot identity | PASS all143 ids and sentinel buildingIds retained after unrelated road and refresh, zero spurious added/removed ids. |
| 16 Off outside tool | PASS visibility: own all group difference0calls/0triangles, tool zone reaches opacity1, road reaches0 and hidden. Fade0.22s source; crossing samples delayed by scheduling, advisory per residual. |
| 17 Brush | WITHDRAWN. Owned by tools. |
| 18 Empty band | PASS alpha0.13, four pinned rectangles present; color-distance thresholds satisfied. |
| 19 Shared fog/tone | PASS shader fog/tone/colorspace chunks and material flags; pinned saturation ratio0.645858. Pinned true camera distances are not the nominal150/600m pair; camera height makes150m impossible. Distance/model ambiguity treated as advisory, not a fabricated failure. |
| 20 Budget | PASS own5draws/19,376tris, scene max72≤130, sampled zoning time≤0.1ms, observed rebuild≤19ms, idle geometry delta0, init≤2ms. Heap contribution/texture MB not inferred from whole-scene counts; residuals advisory. |
| 21 Determinism/persistence | PASS identical fresh counts/histogram/id sets and serialized cells restored with143lots. No Math.random matches in source. |
| 22 Dependency degradation | PASS no roads:0cells/0lots/0zonable, hidden/ready; expected empty fog frame. No terrain:1,977cells/174lots, visible/ready, every geometry vertex y0.1599999964. Both error-free. |
| 23 720p/crawl | PASS sampled width/continuity and temporal clauses: lattice sample1.75px, no visible boundary dropout, max12 and mean0.21651. Full every-line width conformance is not claimed. Builder’s isolated720p overrun did not reproduce. |
| 24 Console | PASS zero errors in complete32matrix+15required extras and own probe pages. Optional diagnostic page also errors[]. |
| 25 Lot frame | PASS all143: fields present, orthonormal vectors tolerance0.001, heading tolerance0.02rad, approach hits road, y tolerance0.05m; lotAt(center) returns same lot. |
| 26 Events/coalescing | PASS bulk20 emits1, separatepaint5 emits5, payload and version increment correct; independent ten-edge burst yields4band rebuilds. |
| §8 Staging/sunset | PASS measured1,728 floor, class layout/empty blocks/mixed boundary/probe staging and controlled sunset. All four high probes are visible in both required pattern views. Direction endpoints and45junctions are now specified. |

## Contract, scope and residuals

The callable module/world contract passes: paint, erase, bulk, cellAt, lotAt, zonableAt, lotsFor, freeLots, visibility controls, refresh, stats, probePoints, frontEdge, cropRects, serialize and deserialize. Events, identity, spatial queries, round-trip state and absent dependencies were exercised. Visual acceptance failures remain separate from apiContractOk=true. Git status contains concurrent authorized edits across many modules/core/docs; it cannot attribute those files to this zoning builder. The zoning change itself is in index/overlay/palette/showcase. This critic changed only own probes/reports/evidence.

Residual rules applied explicitly: no heap-contribution or texture-MB failure from aggregate counts; no extra0.4ms steady-state gate; fade sampling cannot certify the narrow crossing band; road-mask bleed does not override geometric clearance; aligned bilinear curvature cannot prove contact; fog model/distance ambiguity does not create a failure. The invalid sixteen-block arithmetic does not waive the actual1,700-cell floor. Night paired contribution has no residual waiver.

Round2 comparison: half-cell registration, excessive sunset outline peaks, missing visible high-density probes, recorded junction coverage and declared river turn count improved. Wide contrast changed from several failures to one marginal failure. Signed night attenuation regressed from mixed passing/failing classes to all eight failing. The new hillside temporal max is reproducible in this round’s pair. The images are cleaner and more legible, but score8.0 remains warranted by these remaining systemic weaknesses. Against refs1/4, ground texture and orderly lot rows are much closer; the foreground lattice remains heavier than the subtle reference treatment. Ref7’s flat infoview is not the target. Absence of buildings/traffic in the zoning showcase is not scored against zoning; raised road geometry at the hill is a neighbor issue.

## Ranked issues

1. **major — Night attenuation remains inconsistent across every class**. Item 4 specifies the signed mean (on minus off) in each 200px probe crop. All eight L22/L12 ratios fail 0.35–0.55: 0.2716, 0.0895, 0.2613, 0.8069, 0.2048, -0.0539, 0.1530, 0.8809. The shader multiplier is correctly 0.42, but the composite does not preserve the specified contribution. Industrial-high changes sign; blue and violet darkening contributions retain over 80% while bright classes lose most of theirs. Tune against paired composites for all classes, preserving the dim whole-frame appearance. Evidence: `shots/zoning/r3/critic-probe/sessionA_on.png; sessionA_off.png; sessionB_on.png; sessionB_off.png; imgstats.json`.

2. **major — Close-view lattice exceeds the 2.5px width ceiling**. The four-view composite scan alone mixes lattice, lot ink and terrain ridges and is not sufficient to establish a failure. A same-session uLineLift=0 diagnostic isolates the lattice contribution: zonesclose cells 121,131 / 122,131 / 121,132 have perpendicular FWHM 3.10 / 3.15 / 3.25px at (187.28,925.29), (206.33,1000.26), (31.05,972.87). The shipped full composite also measures 3.15px at the last location. The source fwidth metric is an L1 derivative and its stated clamp does not guarantee the physical perpendicular pixel width. Correct that screen-space metric without restoring the old half-cell offset. Evidence: `shots/zoning/r3/zonesclose_12.png; shots/zoning/r3/critic-probe/line_zonesclose_on.png; line_zonesclose_off.png; line-isolation.json; detailstats.json`.

3. **major — Sparse hillside temporal outliers exceed the no-flicker threshold**. Session E uses a static zoneslope camera at noon, speed 1, two captures separated by 500ms after unfreezing. After masking 3px around projected region boundaries, max absolute luminance change is 21/255, exceeding 12; 22 of 436,083 tested pixels exceed 12. Mean 0.042861 passes. This is sparse and not visually obvious in the full frame, but item 9 explicitly imposes a per-pixel maximum and the critic contract forbids flicker. Investigate edge coverage outside the mask and underlying temporal detail before changing the threshold. The independent 720p pair passes; do not carry forward the builder’s single-pixel 720p failure as reproduced evidence. Evidence: `shots/zoning/r3/critic-probe/sessionE_0.png; sessionE_1.png; imgstats.json; apicheck.mjs`.

4. **minor — One wide-view probe narrowly exceeds the alias metric**. Industrial-low at the exact 100×100 probe crop has overlay-on/off luminance standard-deviation ratio 1.615181 versus the 1.6 ceiling. The other seven ratios are 0.9857–1.4886. This crop includes structural contrast and is not proof that the low-density material has a hatch; nevertheless it is the explicit item 3 measurement. The broad distant-hatch failure from round 2 is substantially improved. Evidence: `shots/zoning/r3/critic-probe/sessionC_on.png; sessionC_off.png; imgstats.json`.

## Strengths to preserve

- Correct 8m grid registration, ground texture preserved, and eight distinct color classes; minimum between-hatch RGB distance 42.706.
- 143 correctly framed lots, 73.44% cell coverage, stable identities/buildingIds and deterministic persistence.
- Clean geometric road setback of 1.54787–1.55000m, zero prohibited cells, and declared contour counts now meet the thresholds.
- Five zoning draw calls, 19,376 triangles, zero idle geometry growth, zero console errors and ready status throughout.
- Sunset peaks are controlled; the 720p temporal pair passes and the overlay is hidden in the ordinary all view.

## Per-shot visual notes

Every final image was opened. Diagnostic images are labeled and are not mistaken for the shipped configuration.

- `shots/zoning/r3/aerial_6p5.png` → district reads as coherent colored plan, distant texture retained; dawn hues remain separate.
- `shots/zoning/r3/aerial_12.png` → district reads as coherent colored plan, distant texture retained; noon texture and palette clear.
- `shots/zoning/r3/aerial_17p5.png` → district reads as coherent colored plan, distant texture retained; warm surroundings with controlled zoning highlights.
- `shots/zoning/r3/aerial_22.png` → district reads as coherent colored plan, distant texture retained; dim colored plan, high-density fill markedly subdued.
- `shots/zoning/r3/street_6p5.png` → ground-level violet lots keep grass texture and clean kerb gap; close lattice is visibly strong; dawn hues remain separate.
- `shots/zoning/r3/street_12.png` → ground-level violet lots keep grass texture and clean kerb gap; close lattice is visibly strong; noon texture and palette clear.
- `shots/zoning/r3/street_17p5.png` → ground-level violet lots keep grass texture and clean kerb gap; close lattice is visibly strong; warm surroundings with controlled zoning highlights.
- `shots/zoning/r3/street_22.png` → ground-level violet lots keep grass texture and clean kerb gap; close lattice is visibly strong; dim colored plan, high-density fill markedly subdued.
- `shots/zoning/r3/skyline_6p5.png` → grazing overlay recedes into fog without an obvious moiré sheet; dawn hues remain separate.
- `shots/zoning/r3/skyline_12.png` → grazing overlay recedes into fog without an obvious moiré sheet; noon texture and palette clear.
- `shots/zoning/r3/skyline_17p5.png` → grazing overlay recedes into fog without an obvious moiré sheet; warm surroundings with controlled zoning highlights.
- `shots/zoning/r3/skyline_22.png` → grazing overlay recedes into fog without an obvious moiré sheet; dim colored plan, high-density fill markedly subdued.
- `shots/zoning/r3/closeup_6p5.png` → cell/lot ink remains attached to ground; road markings unobscured; dawn hues remain separate.
- `shots/zoning/r3/closeup_12.png` → cell/lot ink remains attached to ground; road markings unobscured; noon texture and palette clear.
- `shots/zoning/r3/closeup_17p5.png` → cell/lot ink remains attached to ground; road markings unobscured; warm surroundings with controlled zoning highlights.
- `shots/zoning/r3/closeup_22.png` → cell/lot ink remains attached to ground; road markings unobscured; dim colored plan, high-density fill markedly subdued.
- `shots/zoning/r3/zones_6p5.png` → eight-class pattern visible across regular frontage rows and empty interior bands; dawn hues remain separate.
- `shots/zoning/r3/zones_12.png` → eight-class pattern visible across regular frontage rows and empty interior bands; noon texture and palette clear.
- `shots/zoning/r3/zones_17p5.png` → eight-class pattern visible across regular frontage rows and empty interior bands; warm surroundings with controlled zoning highlights.
- `shots/zoning/r3/zones_22.png` → eight-class pattern visible across regular frontage rows and empty interior bands; dim colored plan, high-density fill markedly subdued.
- `shots/zoning/r3/zonesclose_6p5.png` → curve/diagonal setback reads cleanly; foreground hatch and lattice strong; dawn hues remain separate.
- `shots/zoning/r3/zonesclose_12.png` → curve/diagonal setback reads cleanly; foreground hatch and lattice strong; noon texture and palette clear.
- `shots/zoning/r3/zonesclose_17p5.png` → curve/diagonal setback reads cleanly; foreground hatch and lattice strong; warm surroundings with controlled zoning highlights.
- `shots/zoning/r3/zonesclose_22.png` → curve/diagonal setback reads cleanly; foreground hatch and lattice strong; dim colored plan, high-density fill markedly subdued.
- `shots/zoning/r3/zoneswide_6p5.png` → district colors fade coherently; faint empty lattice remains visible; dawn hues remain separate.
- `shots/zoning/r3/zoneswide_12.png` → district colors fade coherently; faint empty lattice remains visible; noon texture and palette clear.
- `shots/zoning/r3/zoneswide_17p5.png` → district colors fade coherently; faint empty lattice remains visible; warm surroundings with controlled zoning highlights.
- `shots/zoning/r3/zoneswide_22.png` → district colors fade coherently; faint empty lattice remains visible; dim colored plan, high-density fill markedly subdued.
- `shots/zoning/r3/zoneslope_6p5.png` → cell overlay follows uneven terrain and leaves exclusion holes; distorted roadway is a neighbor issue; dawn hues remain separate.
- `shots/zoning/r3/zoneslope_12.png` → cell overlay follows uneven terrain and leaves exclusion holes; distorted roadway is a neighbor issue; noon texture and palette clear.
- `shots/zoning/r3/zoneslope_17p5.png` → cell overlay follows uneven terrain and leaves exclusion holes; distorted roadway is a neighbor issue; warm surroundings with controlled zoning highlights.
- `shots/zoning/r3/zoneslope_22.png` → cell overlay follows uneven terrain and leaves exclusion holes; distorted roadway is a neighbor issue; dim colored plan, high-density fill markedly subdued.
- `shots/zoning/r3/critic-probe/all12.png` → Ordinary game view shows terrain/HUD and no zoning overlay.
- `shots/zoning/r3/critic-probe/crops_zones_12.png` → Pinned empty and bare landmarks present; neutral band distinct from color classes.
- `shots/zoning/r3/critic-probe/crops_zoneswide_12.png` → Pinned far block loses saturation relative to near block.
- `shots/zoning/r3/critic-probe/degrade_noroads.png` → Expected fog-only empty scene; zero band and lots, ready.
- `shots/zoning/r3/critic-probe/degrade_noterrain.png` → Populated flat zoning and roads against background, with no missing-dependency error.
- `shots/zoning/r3/critic-probe/line_street_off.png` → uLineLift disabled only; grid contribution reduced while lot outlines persist.
- `shots/zoning/r3/critic-probe/line_street_on.png` → Diagnostic baseline at correct street camera, strong lot ink visible.
- `shots/zoning/r3/critic-probe/line_zonesclose_off.png` → Only lattice brightness removed; same camera lets differential widths isolate cell ink.
- `shots/zoning/r3/critic-probe/line_zonesclose_on.png` → Diagnostic baseline preserves high-density hatch and close grid.
- `shots/zoning/r3/critic-probe/river_run_12.png` → Actual declared northern river extension: irregular green ribbon follows curved frontage, includes inland return in loop.
- `shots/zoning/r3/critic-probe/sessionA_off.png` → Noon baseline, untreated grass and road network.
- `shots/zoning/r3/critic-probe/sessionA_on.png` → Noon tint leaves the grass/grit visible and high-density hatch readable.
- `shots/zoning/r3/critic-probe/sessionB_off.png` → Dark baseline with blue river/landscape.
- `shots/zoning/r3/critic-probe/sessionB_on.png` → Colored night plan is dim, with disproportionately weak bright-class contribution.
- `shots/zoning/r3/critic-probe/sessionC_off.png` → Wide ground baseline with natural patch variation.
- `shots/zoning/r3/critic-probe/sessionC_on.png` → Wide zoning subdued and mostly stable; marginal industrial-low contrast test.
- `shots/zoning/r3/critic-probe/sessionE_0.png` → Hillside first frame: cyan foreground conforms, exclusion gaps exposed.
- `shots/zoning/r3/critic-probe/sessionE_1.png` → Hillside second frame appears stable at full-frame scale; sparse differences require numeric mask.
- `shots/zoning/r3/critic-probe/sessionF_0.png` → 720p zoning remains legible with continuous region outlines.
- `shots/zoning/r3/critic-probe/sessionF_1.png` → 720p second frame shows no obvious crawl and passes numeric maximum.
