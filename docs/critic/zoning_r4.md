# Zoning r4 — independent critic

**8.0 / 10 — FAIL.** Independent 8.0/10, FAIL. Night attenuation still fails three classes and sparse temporal maxima exceed 12 at both resolutions. Wide-view aliasing and prior thick close lattice are corrected; API, lot validity, identities, dependency degradation and budgets pass. All 52 independently captured images were viewed; 32 matrix shots ready with zero errors.

## Calibration and method

Read the CRITIC role, complete zoning acceptance contract, architecture, CS2-LOOK, prior r3 critique and all zoning residual notes. Freshly opened all eight cs2_1.jpg–cs2_8.jpg with the image reader before scoring. Their restrained aerial texture, clean near geometry, atmospheric distance and dark-night hierarchy remain the bar; this is a deliberately unbuilt zoning showcase, so missing buildings are not charged to zoning.

Captured an independent 8-camera × 4-time matrix and all 15 mandatory additional images, plus five diagnostic images. **All 52 full frames were individually opened with the image reader.** Production files and builder r4 captures were untouched. The evidence directory is `shots/zoning/r4/critic-probe`; scripts are auditable beside outputs. Runs used 127.0.0.1:5174, SIM_GL=metal, the installed system Chrome executable, reference directory /Users/martingrahn/.simbuild/ref, and external TMPDIR /Volumes/ExtDrive/SimBuild-verification-2026-09-06/tmp. Python analysis used external PIL/numpy dependencies. Existing r4 evidence storage resolves through its preserved external symlink. No browser download; each probe closes its browser in finally.

ABC are same-page overlay-off/on pairs. E/F have speed 1, fixed cameras and a 500ms unfrozen interval. Pixel analysis uses native PNG resolution and API-projected triangles, not thumbnails: 200px crops for translucency/night, 40px class patches excluding hatch, 100px wide contrast, helper-produced crop rectangles for empty/fog, and rasterized zoned regions excluding a 3px boundary band for motion. The lattice diagnostic suppresses only uLineLift in an isolated page. It changes no production source.

## Results and limits

Matrix: 32/32 ready, errors 0, maximum 73 draws / 769300 triangles, minimum observed FPS 52.2. FPS is host Metal performance, not a SwiftShader claim or a pass gate. All mandatory extra and diagnostic sessions reported zero runtime errors. Zoning contribution 5 draws / 19376 triangles; idle 60-frame geometry delta 0; maximum sampled moduleMs.zoning 0.10ms. Initial measured rebuild total 21ms, subsequent observed totals 9–16ms, within 45ms. Settled all-mode group difference 0 draws / 0 triangles.

| Class | Noon std on/off | Signed noon ΔL | Night/noon ΔL ratio | Wide std on/off |
|---|---:|---:|---:|---:|
| residential-low | 1.925380 | 21.686228 | 0.379895 | 1.439648 |
| residential-high | 1.199326 | 6.117474 | 0.378251 | 1.031878 |
| commercial-low | 1.671097 | 14.104131 | 0.399637 | 1.327077 |
| commercial-high | 1.057636 | -3.139060 | 0.244227 | 1.012333 |
| industrial-low | 1.958402 | 28.811684 | 0.302415 | 1.567542 |
| industrial-high | 1.116758 | 4.180952 | 0.388440 | 0.994873 |
| office-low | 1.265597 | 7.115413 | 0.443751 | 1.103292 |
| office-high | 1.095089 | -4.453712 | 0.607723 | 0.976490 |

All 28 between-hatch colour distances exceed 40 (minimum 42.581104, commercial-high vs office-high). Night zones p1/p50/p99 = 27.302 / 51.9314 / 88.7794; brightest pixel is outside the zoned mask. None of the 32 frames has crushed p1=0 or large clipped p99 (matrix p99 maximum 246.8 in backlit skyline sunset). Worst eligible 100px spatial stipple window is 0.52%, below 2%.

E temporal max/mean = 14.0722 / 0.030226 over 436083 pixels, 4 over 12. F = 13.9278 / 0.208099 over 187535 pixels, 1 over 12. Literal composite tests fail; animation of underlying terrain/grass has not been isolated, so these numbers do not prove a zoning-only depth conflict.

Close-view isolated lattice: 7 samples, 1.15–2.25px, median 1.9px. Prior failing positions now 2.25, 1.95, 2.10px. Street: 11 samples, median 1.2px, range 0.65–2.0px; the sole 0.65px stroke is weak (peak 5.93 versus local baseline 1.90). Full-image mixed-ridge widths are not treated as isolated cell widths. The three clean mixed-boundary samples have brighter-fill ratios 1.4018, 1.3886, 1.4093 and widths 3.10, 3.05, 3.30px; the junction-contaminated first sample is excluded.

## Acceptance checklist

- **1 Translucency: PASS.** Fill uniform 0.52; eight std ratios 1.0576–1.9584 ≥0.45, maximum signed rise 28.8117 ≤55.
- **2 Eight classes: PASS.** Fixed eight hex colours; all 28 between-hatch colour pairs ≥40.
- **3 Density pattern: PASS.** 45° / 3m shader hatch, dark multiplier 0.82. Four high probes in frame in zones and zonesclose; projected periods 8.31–11.51px and 4.55–34.65px. All eight C ratios ≤1.6.
- **4 Night: FAIL.** Three signed attenuation ratios outside 0.35–0.55; shared night multiplier 0.42 and p99/brightness hierarchy otherwise pass.
- **5 Lattice: FAIL, minor.** Prior close-view width failures corrected, but one isolated faint street sample 0.65px remains below 1px. Near clean strokes 1.1–2.25px and wide visual continuity acceptable.
- **6 Region outline: PASS in measured staged boundary.** Three clean mixed-boundary samples ≥1.35, widths 3.05–3.30px; glow 2.6m; painted pulse amplitude 0.30 and shared time advances 1.009s per wall second. Optional session D unnecessary with uniform amplitude probe.
- **7 Front edge: PASS.** 5347 vertices, max spacing 1.8772m; max within-run median distance deviation 0.002003m.
- **8 Kerb setback: PASS geometric / residual advisory.** Clearance 1.54787–1.55m. Coarse isRoad reports nonzero at 5247 vertices, including 336 carriageway-labelled vertices; not evidence of actual asphalt overlap. The documented mask/geometry contradiction makes geometric clearance authoritative.
- **9 Depth and temporal stability: FAIL temporal.** 4m subdivision, terrain lift 0.16, polygon offset and depthWrite=false. Lot ink shares the cell shader surface rather than a separate 0.26m mesh. Spatial stipple passes; temporal maximum fails E. Curvature calculation is zero by the documented 4m-grid identity and is not independent proof of conformity.
- **10 Lots in rows: PASS.** 1728 painted cells, 143 lots, 1269 claimed =73.4375%; 2–5-slot lot widths and preferred depths; no one-slot slivers.
- **11 Dimensions: PASS.** All 143 preferred widths/depths valid; corner additions at most 8m.
- **12 Corners: PASS.** 45 declared junctions, no unclaimed set larger than two cells within 12m.
- **13 Terrain exclusion: PASS with declaration caveat.** Zero painted cell centres/corners wet, excessive-slope or excessive-relief. R4 staging preserves full ordered loops rather than named run fields: river 71,81→70,82 has 21 cells/14 turns; hill 169,109→169,110 has 58/33. These match the prior explicitly named runs and fresh API. Counts include the loop return, not only the shore-facing side; river diagnostic discloses actual subject.
- **14 Highway frontage: PASS.** Zero painted-cell/lot references on two staged highway edges; code excludes highway and ramp when building zonable band.
- **15 Stable identity: PASS.** 143/143 lot IDs and synthetic building IDs preserved after unrelated road + refresh; no false delta event.
- **16 Off outside tool: PASS behavior / timing advisory.** Settled extra-probe reads 0/0 contribution. Tool events expose/hide the overlay. 50ms requested samples are delayed by host rendering, so exact 10–90% crossing cannot be certified; source uses 0.22s. Initial apicheck negative draw difference was transient renderer activity, superseded by settled extra-probe 0/0.
- **17 Brush: WITHDRAWN.** Owned by tools.
- **18 Empty band: PASS.** Empty fill 0.13; pinned RGB distance 47.2466 from bare ground and 58.7150 from nearest painted patch.
- **19 Shared atmosphere: PASS named crops / distance advisory.** Materials use scene fog plus tone/colour-space chunks. Helper far/near saturation ratio 0.654935 ≤0.75. Actual selected block distances differ from literal 150/600m targets; no false claim that those target distances were achieved.
- **20 Budget: PASS measured.** Attributable 5 draws/19376 triangles, zero idle geometry growth, moduleMs max 0.10ms; rebuild total max observed 21ms. Aggregate heap/texture counts cannot attribute module MB and are not claimed.
- **21 Persistence: PASS.** Fresh seed replay matches cell count, lot count, per-type histogram and sorted lot IDs; deserialize restores identical cells and 143 lots.
- **22 Degrade: PASS.** No roads: cells/zonable/lots/draws zero, overlay hidden, ready. No terrain: 1977 cells/174 lots, all vertex y=0.1599999964, ready.
- **23 720p: FAIL temporal.** Same patterned overlay and continuous lattice; F maximum 13.9278 >12 despite mean 0.208099 <2.
- **24 Errors: PASS.** All 47 mandatory captures plus 5 diagnostic images: zero console/page/module errors, ready when applicable.
- **25 Lot frame: PASS.** All 143 lots have required frame fields, unit perpendicular basis, correct heading and ground y; 3m beyond front hits road; lotAt centre matches every lot.
- **26 Events/coalescing: PASS settled test.** 20-call bulk emits one event; five paint calls emit five, proper payload and versions. Actual erase/paint changes one cell each and keeps world/Map identities. Initial overlapping probe counted five rebuilds while a prior refresh event was pending; clean settled run emits ten edges over 152.8ms and produces one rebuild. Both traces preserved, not averaged.

## API contract

All required API methods are present: paint, erase, bulk, cellAt, lotAt, zonableAt, lotsFor, freeLots, setOverlayVisible, overlayVisible, refresh, stats, probePoints, frontEdge, cropRects, serialize, deserialize. The world.zones facade remains the same object; its cells/lots Maps are retained. Paint/erase query correctness was exercised on a real cell (one erased, null query, one restored, version +2), with valid added/removed lot payloads. bulk/events and stable-road refresh were tested independently. lotAt matches every generated lot centre. zonableAt returns the expected served cell. freeLots returns 143 unoccupied lots. lotsFor(edgeId) was checked by source implementation over byEdge; the throwaway settled-check mistakenly passes a type string and returns an expected empty list, so that field is not treated as an edge-query test. Visibility, refresh, stats, probe points, front edges, helper crop rectangles, fresh determinism and persistence all have runtime evidence. No Math.random or DOM/window access in zoning source.

Git status shows broad concurrent work in other modules/core/docs; this shared checkout cannot attribute those changes to the zoning builder. No source ownership violation is asserted from that aggregate listing. This critic made no production/STATUS edits.

## Ranked issues

### 1. MAJOR — Three classes miss the signed night attenuation range

The required 200px paired on/off crops reproduce commercial-high 0.244227, industrial-low 0.302415 and office-high 0.607723 for L22/L12, outside 0.35–0.55. The other five pass. Keep the shared night multiplier, but account for the terrain/background contribution without erasing class differences. Commercial-high and office-high have negative signed noon contributions; the signed ratios are retained exactly as specified.

Evidence: `shots/zoning/r4/critic-probe/imgstats.json; sessionA_on/off.png; sessionB_on/off.png`

### 2. MAJOR — Sparse temporal outliers remain at both resolutions

At speed 1 with a fixed camera, the prescribed zoned-region mask excludes a 3px boundary band. Session E has maximum 14.0722 > 12 at 4 of 436083 pixels (mean 0.030226). Session F has maximum 13.9278 > 12 at 1 of 187535 pixels (mean 0.208099). These are sparse composite-image failures, not proof that the zoning shader alone causes z-fighting. Preserve the average stability while locating and eliminating the outliers or documenting an accepted external cause.

Evidence: `shots/zoning/r4/critic-probe/sessionE_0.png; sessionE_1.png; sessionF_0.png; sessionF_1.png; imgstats.py/json`

### 3. MINOR — A faint street lattice sample falls below the pixel-width floor

Same-session isolated lattice contribution at cell 130,131, projected (900.56,477.50), measures 0.65px FWHM against the 1px floor. Its peak contribution is only 5.93/255 and local baseline 1.90, so this is a low-contrast edge case, not the previous broad-line defect. Street median is 1.2px; all seven measured zonesclose samples are 1.15–2.25px. Previously excessive positions now measure 2.25/1.95/2.10px.

Evidence: `shots/zoning/r4/critic-probe/line_street_on.png; line_street_off.png; line-isolation.py/json`

## Strengths to preserve

- Eight distinct classes retain ground texture; minimum between-hatch RGB distance 42.5811 across all 28 pairs.
- All eight wide-view contrast ratios pass, maximum 1.567542; corrected close-view lattice widths remove the prior excessive thickness.
- 1728 painted cells and 143 valid framed lots, with 1269 cells claimed (73.4375%); unrelated-road refresh preserves all 143 IDs and building IDs.
- 5347 road-frontage samples maintain 1.54787–1.55m geometric clearance with at most 0.002003m within-run deviation.
- Five attributable draws and 19376 triangles, zero idle geometry growth, zero console errors, deterministic replay and graceful missing-dependency behavior.

## Every captured image — visual notes

- `shots/zoning/r4/critic-probe/aerial_6p5.png` → Morning district bands remain translucent; setbacks and unpainted cores read clearly.
- `shots/zoning/r4/critic-probe/aerial_12.png` → Noon hue families and density hatch remain distinct over terrain.
- `shots/zoning/r4/critic-probe/aerial_17p5.png` → Warm light changes the ground while the overlay remains legible.
- `shots/zoning/r4/critic-probe/aerial_22.png` → Night bands dim substantially; blue and purple high density are harder to separate visually.
- `shots/zoning/r4/critic-probe/street_6p5.png` → Near lilac frontage shows ground texture, thin lattice and a clear kerb gap.
- `shots/zoning/r4/critic-probe/street_12.png` → Cell strokes read thin at grazing angle; isolated weak stroke needs the numeric floor check.
- `shots/zoning/r4/critic-probe/street_17p5.png` → Strong low sun affects road/ground; frontage tint remains stable.
- `shots/zoning/r4/critic-probe/street_22.png` → Lilac frontage stays visible and dim; road markings remain brighter.
- `shots/zoning/r4/critic-probe/skyline_6p5.png` → Small district merges into the hazy terrain with muted class colours.
- `shots/zoning/r4/critic-probe/skyline_12.png` → Distant overlay recedes; no bright floating paint impression.
- `shots/zoning/r4/critic-probe/skyline_17p5.png` → Backlit water and horizon are bright; district overlay stays subdued.
- `shots/zoning/r4/critic-probe/skyline_22.png` → District is very subdued but present; no overlay glow dominating the scene.
- `shots/zoning/r4/critic-probe/closeup_6p5.png` → Near office-low cells show terrain and retained back-garden core.
- `shots/zoning/r4/critic-probe/closeup_12.png` → Near lattice and kerb separation are coherent; distant density hatching visible.
- `shots/zoning/r4/critic-probe/closeup_17p5.png` → Warm side lighting leaves the purple frontage legible.
- `shots/zoning/r4/critic-probe/closeup_22.png` → Purple front block dims and keeps a faint continuous grid.
- `shots/zoning/r4/critic-probe/zones_6p5.png` → All eight class landmarks are available; mixed boundary and small lot rhythm read.
- `shots/zoning/r4/critic-probe/zones_12.png` → Colour and density separation are clear; terrain remains visible within fill.
- `shots/zoning/r4/critic-probe/zones_17p5.png` → Sunset keeps vivid but translucent bands; no white flood.
- `shots/zoning/r4/critic-probe/zones_22.png` → Clearly darker than noon, with measured three-class signed attenuation failure.
- `shots/zoning/r4/critic-probe/zonesclose_6p5.png` → Four high-density examples visible; near purple hatch is broad and orderly.
- `shots/zoning/r4/critic-probe/zonesclose_12.png` → Close cell strokes are thinner than r3; clipped region outlines follow block edges.
- `shots/zoning/r4/critic-probe/zonesclose_17p5.png` → Warm oblique light keeps the close hatch legible and the super-block core bare.
- `shots/zoning/r4/critic-probe/zonesclose_22.png` → Density hatch remains visible; purple tint is dim and grounded.
- `shots/zoning/r4/critic-probe/zoneswide_6p5.png` → Thin distant detail and muted fill reduce district-scale contrast.
- `shots/zoning/r4/critic-probe/zoneswide_12.png` → All eight paired contrast ratios pass; garden cores and frontage bands remain readable.
- `shots/zoning/r4/critic-probe/zoneswide_17p5.png` → Wide overlay remains soft against the evening ground.
- `shots/zoning/r4/critic-probe/zoneswide_22.png` → District colours recede into night; no neon patch dominating terrain.
- `shots/zoning/r4/critic-probe/zoneslope_6p5.png` → Steep exposed patches cut the zoned bands; contiguous cells bend over buildable ground.
- `shots/zoning/r4/critic-probe/zoneslope_12.png` → Cyan/yellow bands stop around steep cut ground; no visible whole-patch stipple.
- `shots/zoning/r4/critic-probe/zoneslope_17p5.png` → Long shadows cross the slope scene while zone boundaries remain readable.
- `shots/zoning/r4/critic-probe/zoneslope_22.png` → Hillside exclusions still read in the dim cyan/yellow/purple patches.
- `shots/zoning/r4/critic-probe/sessionA_off.png` → Noon terrain baseline; all paint and empty-band tint hidden.
- `shots/zoning/r4/critic-probe/sessionA_on.png` → Same-page noon overlay restored; paired texture and colour measurements.
- `shots/zoning/r4/critic-probe/sessionB_off.png` → Night terrain baseline at unchanged framing.
- `shots/zoning/r4/critic-probe/sessionB_on.png` → Same-page night overlay restored; three signed attenuation ratios fail.
- `shots/zoning/r4/critic-probe/sessionC_off.png` → Wide noon terrain baseline.
- `shots/zoning/r4/critic-probe/sessionC_on.png` → Wide overlay restored with softer composite contrast; all eight ratios pass.
- `shots/zoning/r4/critic-probe/sessionE_0.png` → 1080p fixed slope frame at speed 1; terrain exclusions remain coherent.
- `shots/zoning/r4/critic-probe/sessionE_1.png` → Second slope frame appears stable at normal scale; four masked pixels exceed temporal maximum.
- `shots/zoning/r4/critic-probe/sessionF_0.png` → 720p zones view retains class patterns and continuous visible lattice.
- `shots/zoning/r4/critic-probe/sessionF_1.png` → Second 720p frame appears stable; one masked pixel exceeds temporal maximum.
- `shots/zoning/r4/critic-probe/crops_zones_12.png` → Pinned empty-band and bare-ground comparison; empty band visibly lighter.
- `shots/zoning/r4/critic-probe/crops_zoneswide_12.png` → Pinned near/far class crops; far block is less saturated.
- `shots/zoning/r4/critic-probe/all12.png` → All-mode HUD and terrain, zoning overlay off; city is not staged by this module.
- `shots/zoning/r4/critic-probe/degrade_noroads.png` → Expected empty grey environment with no terrain/roads selected; zoning hidden and ready.
- `shots/zoning/r4/critic-probe/degrade_noterrain.png` → Expected flat floating-in-background district; all overlay vertices at y=0.16.
- `shots/zoning/r4/critic-probe/river_run_12.png` → Additional waterfront view exposes actual curved frontage and stepped bank-side cells; loop count includes inland return.
- `shots/zoning/r4/critic-probe/line_street_on.png` → Production street lattice enabled; very faint far strokes.
- `shots/zoning/r4/critic-probe/line_street_off.png` → Same street with only lattice lift suppressed for contribution isolation.
- `shots/zoning/r4/critic-probe/line_zonesclose_on.png` → Production close lattice enabled; formerly excessive stroke positions are visibly restrained.
- `shots/zoning/r4/critic-probe/line_zonesclose_off.png` → Close lattice lift suppressed; density hatch and region ink remain for isolation.
