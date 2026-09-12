# Props round 4 — independent critic

**6.4 / 10 — FAIL.** Functional repair is real, but planar foliage and abrupt distant tree representations remain obviously synthetic beside CS2. Excessive speckle, two crushed night views and debug API defects prevent acceptance.

## Scope and calibration

Request 026, CRITIC role, complete props specification, relevant ARCHITECTURE contracts/budgets, CS2-LOOK, prior props r3 critique, builder r4 report and recorded residual decisions were read. All eight `/Users/martingrahn/.simbuild/ref/cs2_1.jpg` through `cs2_8.jpg` were freshly opened with the image reader before grading. Reference 1 informs planting gaps; 2 and 7 coherent distant crowns; 3 overlay context; 4 varied volumetric foliage, dappled shadows and slim lamps; 5 grounded contacts; 6 seasonal canopy massing; 8 compact luminaire sources and modeled signal assemblies. No old score or builder screenshot substitutes for fresh evidence.

Captured independently: 35 main views (all 34 enumerated views plus the required forest_22 1080p baseline), 25 probe views and seven derived masks. **All 67 images were actually viewed.** Probe scripts were audited and adapted from existing reproducible tests, then executed against the frozen current source; results below are these executions. No production code or STATUS edits were made. Other modules have concurrent authorized edits; a shared dirty git status is not evidence that the props builder edited them.

Runtime: `SIM_URL=http://127.0.0.1:5174`, `SIM_GL=metal`, `SIMBUILD_REF=/Users/martingrahn/.simbuild/ref`, explicit `SIM_CHROME=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Installed Chrome 152.0.7977.76, ANGLE Metal on Apple M4; no SwiftShader FPS grading. `TMPDIR=/Volumes/ExtDrive/SimBuild-verification-2026-09-06/tmp`. Evidence is physically stored under `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/props/r4/critic-probe`, reached through the existing shots symlink. Builder evidence was preserved. An isolated Chrome startup stalled before navigation; only that owned browser was terminated, then the missing probe was retried successfully. This was not an application console error. Browsers close in finally; no server was stopped.

## Measurements

`summary.json`: 35/35 props ready, errors 0, maximum scene draws **150**, maximum scene triangles **1,719,556**, both in street_22. No standard boot overlay, black/empty render, or large clipped white area. The all-module aerial is an empty initialized city; it cannot establish populated integration performance.

Attribution is a fresh group-visible toggle with five rendered settling frames per state. Day/night camera results:

| Camera | Noon props draws / triangles | Night props draws / triangles |
|---|---:|---:|
| avenue | 50 / 401,850 | 52 / 505,530 |
| lamp | 51 / 424,350 | 53 / 528,030 |
| park | 29 / 276,024 | 31 / 379,704 |
| street | 56 / 447,362 | 39 / 515,584 |
| forest | 36 / 609,526 | 29 / 586,374 |
| skyline | 51 / 75,906 | 55 / 283,266 |
| aerial | 27 / 546,534 | 10 / 616,292 |

Tested attribution peaks: **56 draws**, **616,292 triangles**, below 120/700,000. Scene 150/1,719,556 is below 200/1,800,000. Per-frame renderer statistics include varying shadow-pass work; one-page attribution and isolated main capture scene totals are therefore not interchangeable. `api.stats().tris` is model geometry, not rendered scene triangles. Thirty independently bracketed idle update calls each quantized to 0 ms; median/max 0 ms at browser timer precision, not proof of literally zero CPU. Full build 153.7 ms; observed module initialization 386 ms in the contract capture. GPU texture ownership and added heap were not independently isolated, so the entire memory budget is not certified.

Fixed masks are calculated once from full-resolution noon props-on/off luminance difference >6, saved, and reused unchanged. Images are Lanczos resized to 480×270 for whole-region tests; masks use nearest-neighbour resize. Luminance is 0.2126R+0.7152G+0.0722B, blackPct uses max RGB<8, whitePct min RGB>247. Speckle uses an exact floating-point 3×3 neighbourhood median. Crop statistics use native PNG resolution.

| Night camera | Fixed-mask pixels at 480 | blackPct | Result <=3% | Mean B-R including pools |
| avenue | 39751 | 2.8175% | PASS | 10.467 |
| lamp | 29868 | 3.4050% | FAIL | 11.800 |
| park | 44668 | 1.1306% | PASS | 10.455 |
| street | 30799 | 7.3801% | FAIL | 13.844 |

The last column is descriptive, not certification of the required **non-pool** colour statistic: valid pool exclusion pins are absent. Noon forest/avenue/park fixed regions all have whitePct 0, blackPct <1.5%, std 30.06/39.81/33.30. Golden-hour street_6p5, forest_17p5 and park_17p5 have blackPct 0 and whitePct 0.

| Noon camera | Speckle >=35 L | Limit |
| forest | 1.7252% | 0.05% |
| skyline | 1.6905% | 0.05% |
| aerial | 3.0411% | 0.05% |

Valid pinned trunk `[928,853,64,64]` at treecloseup: std **8.6607**, p50 36.996. The nearest trunk is visibly roughly 70 px wide with at least three branch bifurcations; bark is now material rather than flat fill. Valid lamp-head night p99 **209.107**, bus-stop head p99 **212.967**, below 250; whole-frame white clipping is absent. The pool geometry probe reads geometry extent times instance matrix scale, yielding 82 arterial pools of **13.4 m** and eight lantern pools of **11 m**. Pool material is additive, depthWrite false, polygonOffset true/factor -4, renderOrder 100. No previous triangular pavement pool holes are visible in the fresh frames. Missing pool pins block the prescribed brightness, warmth, radial-edge and seam measurements; these are not silently declared passing or failing.

Raw canopy boxes include trunk, shade and/or background; e.g. broadleaf noon medians forest 63.069, avenue 75.054, park 67.878 are **not valid foliage-only albedo tests**. The avenue hedge box `[4,922,256,64]` crosses grass. Park omits its hedge pin. The treecloseup crown box `[572,210,200,200]` does not isolate a complete crown with the required sky boundary. No substitute hand crop is used to fail crown holes, halo edges, foliage albedo or hedge NCC. At 720p, undersized pins violate the stated minimum dimensions. These are one API finding, not invented numeric failures.

Dolly raw >=40 L change **21.1508%**, wind pair **4.0924%**, zero-wind pair **0.00198%** (33.982% of RGB pixels differ by any amount). Per recorded residual decisions, dolly parallax is not isolated popping, and a change of world time also changes sunlight even at wind speed zero. Neither raw figure is used to fail items 14/16. Item 14 instead fails the plainly visible fixed-camera representation line. After resizing 1080 to 720, avenue/forest mean delta L is **2.486 / 1.480**, >=40 L change **0.4607 / 0.03885%**. Visual parity is good; this is not temporal crawl measurement.

## Contracts and edits

| Contract | Fresh result |
|---|---|
| world.props identity, exact kinds, stats/count | PASS: object retained, exact twelve strings, all kinds populated; 3,742 items, 3,176 trees, eight species |
| place/remove/at and completed events | PASS: bench id 1,000,000,000 appears in spatial lookup; added event version 14/count 3,743, removed event version 15/count 3,742 |
| radius table and placement | PASS tested: exact radii, zero ground errors >0.05 m, zero forbidden asphalt/water origins, zero non-exempt circle overlaps across full set |
| lamp anchors/lampsFor | PASS: every eligible edge agrees in count and positions; no independently invented anchors |
| signals/signalFor | PASS: eight nodes, arm states agree; standalone phase 0→2→0; shared traffic stub changes source/phase/arms within direct update and restores after deletion |
| signal geometry stability | PASS: handover keeps draws/tris stable and changes lens colours; second same-phase stub with different arms also updates colours |
| stops | Present with staged four bus-stop assemblies; detailed route-consumer behavior not exercised |
| rebuild/serialization/manual survival | PASS: no-op counts/tris stable, manual bench retained, serialize/deserialize reproduces counts |
| generated ID retirement | PASS: 14 deleted IDs stay absent after rebuild and save roundtrip, zero surviving ID aliases; new procedural candidates can legitimately change total count |
| road edit on dry forest | PASS: new road removes target tree and every forbidden asphalt origin; 42.8 ms props build, new edge lamps present |
| terrain edit | PASS for height correctness: manual bench y 18.373765→20.034178, exactly new ground; source still full-rebuilds non-road changes rather than proving region-only work |
| density and responsive edit | PASS sampled timing: density .25 tree count 1,497, edit 45.5 ms; density 1 count 3,176, edit 41.9 ms, ratio .9181 <=1.25; requested multipliers are 4× but realized Poisson tree counts are not literally 4× |
| debug LOD/sway/pools | Callable without errors; forest histogram 33/519/1,790, forced LOD2 produces 2,286 impostors; caps keep mixed tiers even under forced LOD0, so do not infer perfect isolation from method presence |
| debug per-kind visibility | FAIL: bench hides entire hard-furniture class and leaves lenses floating |
| cropRects | FAIL: missing pool and invalid material/crown/hedge landmarks, undersized 720p returns |
| ownership and RNG | No production edits by critic; source has no Math.random or wall-clock animation, no owned Light, no renderer/composer/fog mutation; road staging uses road APIs in showcase |

Two fresh initial loads and two rebuilds keep items 3,742 / instances 3,176 / model tris 130,812 / chunks 6. The simplistic init probe reports one overlap between a sign and its own bus-stop assembly; the specification explicitly exempts that pair, and the full exempt-aware contract probe reports zero. This is not a regression.

Heading bins over nearest 200 trees: `[17,17,16,17,18,13,12,21,23,11,19,16]`, max 11.5% <15%. Scale range .78258–1.31623, std .15547. Forest nearest-neighbour mean over 500 samples is 5.0250 m. A 1 m histogram has a 45.2% peak, but bin width is unspecified; that contingent statistic is not used as an acceptance failure. No layout lattice is visible top-down. Twelve independently valid single-crown 128×128 samples and all six palette deltas were not established; palette variety is a visual observation, not a completed numeric certification.

Reflection limitation: props-off aerial/park/skyline images retain cached tree reflections. Terrain water code caches identical camera/time renders. The toggle therefore does not isolate a newly rendered reflection and cannot certify item 15's >=0.5% response, nor support blaming props for the cache. Source uses the real-camera uniform for its selection and top-down LOD fallback is visible. Existing reflected trees are recognizable and do not look like water confetti.

## Acceptance checklist

PASS means the stated evidence supports the tested requirement. PARTIAL explicitly withholds unmeasured subtests; it is not a fabricated failure. All four numbered failures below are reproducible without relying on bad pins.

| # | Requirement | Verdict / evidence |
|---|---|---|
| 1 | Trees are trees, not lollipops | PARTIAL: modeled wide branching trunk, valid bark std and litter visible; card-like crowns remain visually weak; invalid crown pin blocks numeric holes/edge tests, litter L not isolated |
| 2 | Species, silhouette and colour variety | PARTIAL: eight species, several clearly different forms, heading/scale pass; twelve pure-canopy sample deltas/lean-neighbour tuple checks not fully established |
| 3 | Nothing floats/sinks/stands in road | PASS tested: complete placement set and actual road/terrain edits, grounded visual contacts |
| 4 | Lamps modeled on roads anchors | PASS tested anchors and visible tapered/ornamental bodies and long shadows; every dimensional subpart not independently ruler-measured |
| 5 | Night is lamplight | FAIL: street/lamp fixed-mask blackPct 7.3801/3.4050%; foliage/non-pool pin-dependent clauses ungraded |
| 6 | Lamp lights ground | PARTIAL: geometry axes/material flags/head clipping pass, soft fitted pools visible; missing pool pins block remaining quantitative clauses |
| 7 | Noon albedo and contrast | PARTIAL: whole-region clipping/std pass; invalid pure-canopy pins prevent albedo/shaded ratio certification |
| 8 | Dappled tree shadows | PARTIAL: broken shadows visible, alphaTest .45/.42 and nontransparent foliage correct; isolated shadow leak percentage not established |
| 9 | No halos/glow/sparkle | FAIL: all three required spatial speckle tests fail; invalid crown edge and same-depth comparison ungraded |
| 10 | Working traffic signals | PASS tested standalone/handover/state agreement/visible assembly; exact lens/housing crop photometry not independently isolated |
| 11 | Hedge/fence volumes | PARTIAL: closed modeled hedge top and two fence variants; planar side appearance weak, invalid hedge pin blocks NCC/contrast, metre gap residual respected |
| 12 | Twelve kinds identifiable | PASS: exact counts and observed named frames show all twelve; modeled shelter components present |
| 13 | Rule-driven placement | PARTIAL: source rules, all-origin safety, varied layout and 5.025 m NN mean; unspecified bin width and every placement interval not fully numerically certified |
| 14 | LOD without visible switch line | FAIL: fixed forest image shows the tier representation line; all tiers nonzero, top-down fallback passes; dolly raw threshold not misused |
| 15 | Foreign-camera reflections | PARTIAL: visible reflections, camera-uniform source correct; cached reflection prevents valid group-toggle response measurement |
| 16 | Deterministic gentle wind | PARTIAL: time-derived shader sway and zero-wind geometry visibly stable; pixel amplitude not optical-flow measured, sunlight residual respected |
| 17 | Golden hour | PASS tested visual warm rims/long shadows and zero clipping; full twelve-crown hue-spread numeric subtest not certified |
| 18 | Aerial and skyline coherence | FAIL: required skyline speckle inherited from #9; fragmented aerial crowns and repetitive distant massing observed; no invented woodland std measurement |
| 19 | Determinism/idempotence | PASS: repeated initial loads, rebuild/roundtrip, time-driven phases and stable ID retirement |
| 20 | Budget | PARTIAL: all measured scene/attribution/CPU caps pass, 256 m deviation recorded; heap/GPU allocation not independently isolated |
| 21 | Whole matrix | PASS: 34 specified + extra forest_22 baseline, all ready/errors zero |
| 22 | Stay in lane | PASS source review; shared neighbour changes not attributed to props |
| 23 | Responsive edits | PASS sampled CPU and event/data effects; localized added-road ratio .9181; no broader terrain dirty-region performance claim |
| 24 | 720p parity | PASS visual paired content/LOD/pools, small image differences; no moving-camera aliasing certification |

## Ranked issues

### 1. Tree detail tiers form a visible representation boundary — major

Forest noon and golden-hour views divide into fine foreground branches with large planar leaf fans and a background wall of repeated dark flat conifer silhouettes. The 33/519/1790 LOD histogram confirms all tiers are active. The model change is obvious at a fixed camera, independently of the ambiguous 3 m dolly pixel threshold. Match crown volume, colour and silhouette between adjacent tiers, and reduce the near-tree fan-card appearance before tuning the fade. CS2 references 2, 4 and 7 retain organic individual crowns at corresponding scales.

Evidence: shots/props/r4/critic-probe/forest_12.png; shots/props/r4/critic-probe/forest_17p5.png; shots/props/r4/critic-probe/treecloseup_12.png; shots/props/r4/critic-probe/probe/contract.json

### 2. Foliage fails the fixed-mask speckle limit at every required distant view — major

At 480 px width, the fixed noon props masks produce median-neighbour deviations >=35 L well above the 0.05% limit: forest 1.725%, skyline 1.691%, aerial 3.041%. The aerial forest reads as fragmented bright leaf confetti; skyline trees have repetitive hard edges. Improve coverage and filtered impostor shading, then rerun the same saved masks. This is a spatial metric, not a claim that static screenshots measure temporal crawl.

Evidence: shots/props/r4/critic-probe/probe/measurements.json; shots/props/r4/critic-probe/aerial_12.png; shots/props/r4/critic-probe/skyline_12.png

### 3. Night street and lamp views crush too much of the props region — major

Using the unchanged noon |delta L|>6 masks at 480 px, street_22 blackPct is 7.3801% and lamp_22 is 3.4050%, both above 3%. Avenue 2.8175% and park 1.1306% pass this subtest. Hedges and shaded furniture lose readable surface detail despite visible pools and a cool overall cast. Raise the darkest material response without brightening foliage into self-lit daytime leaves.

Evidence: shots/props/r4/critic-probe/street_22.png; shots/props/r4/critic-probe/lamp_22.png; shots/props/r4/critic-probe/street_mask.png; shots/props/r4/critic-probe/probe/measurements.json

### 4. Pinned crop landmarks cannot support the required material and pool tests — major

cropRects returns mixed foliage/branches/background for canopy_broad, a treecloseup crown that does not isolate a complete sky-backed crown, and a diagonal hedge/grass mixture at avenue [4,922,256,64]. Park has no hedge rect and lamp/avenue have no pool rect although their pools are visible. At 720p it also returns undersized 85x85 canopy, 133x133 crown and 32x32 head rects. Pin valid in-frame material interiors and omit genuinely undersized landmarks. Raw statistics of these boxes are diagnostic only; missing/invalid pins do not constitute measured failures of the associated acceptance thresholds.

Evidence: shots/props/r4/critic-probe/avenue_12.crops.json; shots/props/r4/critic-probe/treecloseup_12.crops.json; shots/props/r4/critic-probe/park_12.crops.json; shots/props/r4/critic-probe/lamp_22.crops.json; shots/props/r4/critic-probe/avenue_12_720.crops.json

### 5. setKindVisible hides unrelated furniture and leaves signal lenses suspended — minor

A fresh call debug.setKindVisible("bench",false) removes lamp poles, signal housings, bins, signs and shelter geometry along with benches. Signal lens instances remain floating. index.js maps ten logical kinds onto shared class visibility; batching does not satisfy the documented per-kind isolation API. Preserve merged rendering while filtering the requested kind, including dependent lens and halo geometry.

Evidence: shots/props/r4/critic-probe/probe/bench_hidden.png; shots/props/r4/critic-probe/probe/avenue_on_12.png; src/modules/props/index.js:908

## Strengths to preserve

- All 35 fresh main captures render with props ready and zero console errors; tested scene and attributed draw/triangle caps pass.
- Generated IDs survive rebuild and serialization without aliasing: 14 demolished IDs remain retired and zero surviving IDs change identity.
- Road-through-forest invalidation removes asphalt conflicts; a manual bench follows raised terrain exactly; initial placement has zero non-exempt footprint overlaps.
- All twelve kinds and eight species are present; road lamp anchors match, traffic clock handover changes lenses without geometry rebuild, and props emits completed mutation events.
- Bark now has measurable texture (valid trunk std 8.6607); hedge end caps close; modeled lamp/signal/bus-stop parts and pavement-fitted warm pools are worth preserving.

## Per-image review

All paths below are relative to `/Users/martingrahn/Documents/SimBuild`. Main matrix first, independent probes next, then all seven viewed masks.

- `shots/props/r4/critic-probe/aerial_6p5.png` — Warm forest patches and long street-tree shadows; individual crowns remain fragmented.
- `shots/props/r4/critic-probe/aerial_12.png` — Road layout is legible; woodland is bright fragmented foliage rather than cohesive small crowns.
- `shots/props/r4/critic-probe/aerial_17p5.png` — Golden warm crowns remain varied, with thin avenue lamp shadows and granular woodland.
- `shots/props/r4/critic-probe/aerial_22.png` — Pools trace the roads; cool woodland remains visible at low contrast.
- `shots/props/r4/critic-probe/street_6p5.png` — Long pole and tree shadows, green/yellow crowns and modeled intersection furniture.
- `shots/props/r4/critic-probe/street_12.png` — Benches, signal assemblies and columns read; foreground birch/oak foliage is visibly planar.
- `shots/props/r4/critic-probe/street_17p5.png` — Warm angled light and long shadows; broadleaf clumps retain flat fan silhouettes.
- `shots/props/r4/critic-probe/street_22.png` — Colored lenses and pools remain clear, but hedges and shaded props turn nearly black.
- `shots/props/r4/critic-probe/skyline_6p5.png` — Warm repeated tree silhouettes distinguish two main masses but lack natural crown shading.
- `shots/props/r4/critic-probe/skyline_12.png` — Flat dark forest cutouts and small hard-edged street-tree crowns; reflections visible in water.
- `shots/props/r4/critic-probe/skyline_17p5.png` — Warm palette improves separation without removing repeated impostor shapes.
- `shots/props/r4/critic-probe/skyline_22.png` — Cool small forest silhouettes remain legible; road pools and signal dots are restrained.
- `shots/props/r4/critic-probe/closeup_6p5.png` — Low angled light catches foliage sheets and long shadows; furniture stays grounded.
- `shots/props/r4/critic-probe/closeup_12.png` — Large planar leaf clusters dominate the close range; useful fine trunk and street details.
- `shots/props/r4/critic-probe/closeup_17p5.png` — Warm crown faces and long shadows; canopy construction remains exposed.
- `shots/props/r4/critic-probe/closeup_22.png` — Cool foliage and warm local lights; darker hard surfaces lose detail.
- `shots/props/r4/critic-probe/forest_12.png` — Strong foreground-versus-background representation line, with fan leaves against flat conifer stacks.
- `shots/props/r4/critic-probe/forest_17p5.png` — Golden illumination changes colour but leaves the tier boundary obvious.
- `shots/props/r4/critic-probe/forest_22.png` — Cool forest with low internal contrast; conifers remain darker than broadleaf masses.
- `shots/props/r4/critic-probe/avenue_12.png` — Slim lamps, detailed benches/bins/signs and trees line the road; closed hedges have flat sides.
- `shots/props/r4/critic-probe/avenue_22.png` — Warm pavement pools and small heads; dark hedges and tree silhouettes dominate the edges.
- `shots/props/r4/critic-probe/signal_12.png` — Three visored lenses, backplates, mast arms, collars and pedestrian panels are modeled.
- `shots/props/r4/critic-probe/signal_22.png` — One red/green lens per head is visible; no giant blown-out signal discs.
- `shots/props/r4/critic-probe/lamp_12.png` — Tapered column, arm and hard luminaire are distinct; neighbouring broadleaf sheets remain synthetic.
- `shots/props/r4/critic-probe/lamp_22.png` — Warm soft pavement patch and restrained luminaire; shadowed hedge/body detail is too dark.
- `shots/props/r4/critic-probe/park_12.png` — Eight-species mix, lanterns, benches, planters, bushes and two fence forms; canopies are disconnected sheets.
- `shots/props/r4/critic-probe/park_17p5.png` — Warm tree faces and long shadows retain colour variety; hedge perimeter stays visually simple.
- `shots/props/r4/critic-probe/park_22.png` — Lantern pools locate the park furniture; foliage is cool, hedge faces nearly featureless.
- `shots/props/r4/critic-probe/treecloseup_12.png` — Wide branching textured trunk and litter ring; giant fern-like leaf fans expose card construction.
- `shots/props/r4/critic-probe/busstop_12.png` — Shelter roof, glass side panel, seat and timetable panel are identifiable and contact the pavement.
- `shots/props/r4/critic-probe/busstop_22.png` — Shelter and nearby light remain legible; restrained hot pixels, dark non-lit surfaces.
- `shots/props/r4/critic-probe/canopy_12.png` — Top-down crowns show no edge-on impostor slivers or obvious planting lattice; foliage is coarse and patchy.
- `shots/props/r4/critic-probe/all_aerial_12.png` — Initialized all-module city is empty with HUD visible; confirms boot readiness, not populated integration load.
- `shots/props/r4/critic-probe/avenue_12_720.png` — Same avenue contents and composition; leaf-card weakness persists, no UI overflow.
- `shots/props/r4/critic-probe/forest_22_720.png` — Same cool forest massing as the extra 1080 baseline; no new missing layer.
- `shots/props/r4/critic-probe/probe/identity_after_rebuild.png` — Procedural forest remains after deletion/rebuild; identity assertions confirm no retired or aliased ID.
- `shots/props/r4/critic-probe/probe/road_through_land_forest.png` — New road cuts through dry forest with asphalt-clear origins; remaining overhead crowns are normal overhang.
- `shots/props/r4/critic-probe/probe/manual_after_terrain_raise_repeat.png` — Manual bench remains on the raised terrain; numeric height error is zero.
- `shots/props/r4/critic-probe/probe/dolly_a.png` — Forest baseline shows detailed near foliage and flat distant cutouts.
- `shots/props/r4/critic-probe/probe/dolly_b.png` — Three-metre dolly changes ordinary parallax and tier distribution; raw difference is not an isolated pop measure.
- `shots/props/r4/critic-probe/probe/wind_12.png` — Textured central trunk and adjacent lamp are stationary anchors beneath broad fan cards.
- `shots/props/r4/critic-probe/probe/wind_12p004.png` — Leaf sheets move relative to those anchors; static pair alone does not measure optical-flow amplitude.
- `shots/props/r4/critic-probe/probe/wind_zero_12.png` — Zero-wind baseline preserves trunk, hard furniture and still leaf positions.
- `shots/props/r4/critic-probe/probe/wind_zero_12p004.png` — Geometry appears fixed; small lighting changes remain because world time also moves the sun.
- `shots/props/r4/critic-probe/probe/signal_traffic_stub_12.png` — Stub handover changes visible front lenses to red while retaining identical assemblies.
- `shots/props/r4/critic-probe/probe/bench_hidden.png` — Bench-only hide also removes poles, signal bodies and other hard props, leaving free-floating lens discs.
- `shots/props/r4/critic-probe/probe/avenue_on_12.png` — Slim lamps, detailed benches/bins/signs and trees line the road; closed hedges have flat sides. Fresh props-on mask baseline.
- `shots/props/r4/critic-probe/probe/avenue_off_12.png` — Props geometry and its ground shadows removed for the fixed noon mask; underlying roads/terrain remain.
- `shots/props/r4/critic-probe/probe/lamp_on_12.png` — Tapered column, arm and hard luminaire are distinct; neighbouring broadleaf sheets remain synthetic. Fresh props-on mask baseline.
- `shots/props/r4/critic-probe/probe/lamp_off_12.png` — Props geometry and its ground shadows removed for the fixed noon mask; underlying roads/terrain remain.
- `shots/props/r4/critic-probe/probe/park_on_12.png` — Eight-species mix, lanterns, benches, planters, bushes and two fence forms; canopies are disconnected sheets. Fresh props-on mask baseline.
- `shots/props/r4/critic-probe/probe/park_off_12.png` — Props geometry and its ground shadows removed for the fixed noon mask; underlying roads/terrain remain. Cached water reflections persist, limiting this toggle as a reflection test.
- `shots/props/r4/critic-probe/probe/street_on_12.png` — Benches, signal assemblies and columns read; foreground birch/oak foliage is visibly planar. Fresh props-on mask baseline.
- `shots/props/r4/critic-probe/probe/street_off_12.png` — Props geometry and its ground shadows removed for the fixed noon mask; underlying roads/terrain remain.
- `shots/props/r4/critic-probe/probe/forest_on_12.png` — Strong foreground-versus-background representation line, with fan leaves against flat conifer stacks. Fresh props-on mask baseline.
- `shots/props/r4/critic-probe/probe/forest_off_12.png` — Props geometry and its ground shadows removed for the fixed noon mask; underlying roads/terrain remain.
- `shots/props/r4/critic-probe/probe/skyline_on_12.png` — Flat dark forest cutouts and small hard-edged street-tree crowns; reflections visible in water. Fresh props-on mask baseline.
- `shots/props/r4/critic-probe/probe/skyline_off_12.png` — Props geometry and its ground shadows removed for the fixed noon mask; underlying roads/terrain remain. Cached water reflections persist, limiting this toggle as a reflection test.
- `shots/props/r4/critic-probe/probe/aerial_on_12.png` — Road layout is legible; woodland is bright fragmented foliage rather than cohesive small crowns. Fresh props-on mask baseline.
- `shots/props/r4/critic-probe/probe/aerial_off_12.png` — Props geometry and its ground shadows removed for the fixed noon mask; underlying roads/terrain remain. Cached water reflections persist, limiting this toggle as a reflection test.
- `shots/props/r4/critic-probe/avenue_mask.png` — Viewed full-resolution binary noon |delta L|>6 mask; captures props and their ground-shadow contribution, reused unchanged at other hours.
- `shots/props/r4/critic-probe/lamp_mask.png` — Viewed full-resolution binary noon |delta L|>6 mask; captures props and their ground-shadow contribution, reused unchanged at other hours.
- `shots/props/r4/critic-probe/park_mask.png` — Viewed full-resolution binary noon |delta L|>6 mask; captures props and their ground-shadow contribution, reused unchanged at other hours.
- `shots/props/r4/critic-probe/street_mask.png` — Viewed full-resolution binary noon |delta L|>6 mask; captures props and their ground-shadow contribution, reused unchanged at other hours.
- `shots/props/r4/critic-probe/forest_mask.png` — Viewed full-resolution binary noon |delta L|>6 mask; captures props and their ground-shadow contribution, reused unchanged at other hours.
- `shots/props/r4/critic-probe/skyline_mask.png` — Viewed full-resolution binary noon |delta L|>6 mask; captures props and their ground-shadow contribution, reused unchanged at other hours.
- `shots/props/r4/critic-probe/aerial_mask.png` — Viewed full-resolution binary noon |delta L|>6 mask; captures props and their ground-shadow contribution, reused unchanged at other hours.

## Reproduction and integrity

`critic-probe/capture.mjs` captures the main matrix. `probe/contract.mjs`, `identity.mjs`, `edits-land.mjs`, `dirty-region.mjs`, `init.mjs` and `evidence.mjs` run the independent contracts/captures. `probe/measure.py` computes the full-resolution pins and 480px fixed-mask metrics. Use the explicit runtime environment above and `PYTHONPATH=/Volumes/ExtDrive/SimBuild-verification-2026-09-06/python-deps /usr/bin/python3` for measurement. `source-hashes.json` records the nine props sources captured at start; all nine match at report generation. No source edits were needed or made.
