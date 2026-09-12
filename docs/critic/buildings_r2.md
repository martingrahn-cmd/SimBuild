# Buildings — independent critic, round 2

**Score: 6.2/10 — FAIL.** 6.2/10, FAIL: stronger crowns, relief and lot coverage than round 1, but black daylight facade quads, coarse overbright night windows and repetitive material/LOD treatment remain far below the CS2 bar; terrain reseating, growth origin and diagnostic contracts also fail.

## Scope and calibration

Read the CRITIC role, full buildings spec, ARCHITECTURE required sections, CS2-LOOK, previous round and residual.json. Viewed all eight cs2_1.jpg–cs2_8.jpg references: the distant urban layers and roofscape of 1–3, residential variety of 4, coherent transport/urban detail in 5–7, and individual luminous interiors against dark architectural masses in 8 set the bar. Round 1 was 6.0: missing diagnostics, single crowns and flat facade geometry are substantially addressed; material and night-lighting defects keep the gain small.

All 28 required captures plus 14 A/B/growth captures were taken independently at SIM_URL=http://127.0.0.1:5174, SIM_GL=metal, seed 1337 unless explicitly testing seed 7. Every one of the 42 PNGs was opened with the image reader. No source files changed. Server was not restarted. HMR was disabled on capture pages to avoid reload contamination. Performance measurements are Metal, not SwiftShader; FPS is not scored. Required-shot summaries were read per batch; summary.json contains only the last batch, so aggregate numbers below are taken from all 28 per-shot JSON files.

The terrain sampler fix preceded this round. The integrator was informed only after the final capture/probe completed that the lot-clutter-mask patch could proceed. This report evaluates the saved pre-patch evidence. Full-game captures render landscape/HUD because democity is a stub this wave; they prove readiness and clean rendering, not occupied-lot collision integration.

## Every captured image

| File | Observed result |
|---|---|
| `shots/buildings/r2/aerial_12.png` | Good height distribution; pale striped facades and simplified roof surfaces dominate. |
| `shots/buildings/r2/aerial_17p5.png` | Side light distinguishes crowns, but conspicuous black rectangular facade patches remain. |
| `shots/buildings/r2/aerial_22.png` | Dark masses with coarse white panels; p99=252 exceeds the night limit. |
| `shots/buildings/r2/aerial_6p5.png` | Warm layered skyline and varied crowns; fine facade frequencies remain repetitive. |
| `shots/buildings/r2/all_12.png` | Clean landscape and HUD; democity is still a stub, so no staged building/props collision comparison. |
| `shots/buildings/r2/all_22.png` | Clean dark landscape and HUD; no staged demo city. This is not a buildings empty-frame failure. |
| `shots/buildings/r2/block_12.png` | Correct mixed-use corridor with wrapped signs and balconies; repeated glass, black quads and paving tufts. |
| `shots/buildings/r2/block_22.png` | Illuminated fascia and blade signs; overbright panes suppress interior detail. |
| `shots/buildings/r2/catalog_12.png` | All 40 cells fit at 57 m pitch, with varied classes; sparse roofs and visibly sloped terrain. |
| `shots/buildings/r2/closeup_12.png` | Geometric jambs/bands visible; painted reflection repetition and rectangular black voids. |
| `shots/buildings/r2/closeup_17p5.png` | Warmer glazing, repeated triangle-like reflection sweeps and black patches. |
| `shots/buildings/r2/closeup_22.png` | Stark white panels over dark slabs; facade lacks layered interiors. |
| `shots/buildings/r2/closeup_6p5.png` | Thin piers and trim now resolve, but identical diagonal pane reflections dominate. |
| `shots/buildings/r2/crops_nightdt_22.png` | Same night view with pinned rectangles; farTower points to the near tower, invalidating the far-distance test. |
| `shots/buildings/r2/day_exact0.png` | Controlled noon setLit(0) baseline with buildings.update held solely during the toggle. |
| `shots/buildings/r2/day_exact1.png` | Controlled noon setLit(1) turns large facade areas black; difference 27.60112/255. |
| `shots/buildings/r2/day_lit0.png` | Ordinary noon setter baseline; default update immediately continues controlling window fraction. |
| `shots/buildings/r2/day_lit1.png` | Ordinary updating A/B changes 2.08844/255; black panel state changes. |
| `shots/buildings/r2/downtown_12.png` | Distinct large masses and crowns; coarse LOD glass becomes stretched broad stripes. |
| `shots/buildings/r2/growth_1.png` | Building 105 is a small pitched-roof townhouse, 8.7 m high. |
| `shots/buildings/r2/growth_2.png` | Taller townhouse, 12.01 m, centre still at z=274.9. |
| `shots/buildings/r2/growth_3.png` | Apartment with stepped top, 20.955 m; centre has shifted 3.6946 m. |
| `shots/buildings/r2/growth_4.png` | Taller apartment with spire, 30.005 m. |
| `shots/buildings/r2/growth_5.png` | More floors and height, 45.055 m; no visible orphan geometry. |
| `shots/buildings/r2/industry_12.png` | Long low sheds are distinct, but most silo/dock/roof detail is absent at this LOD; dark boundary skirts. |
| `shots/buildings/r2/info_off.png` | Untinted block baseline. |
| `shots/buildings/r2/info_on.png` | Strong coherent red building tint; mean difference 27.14827/255. |
| `shots/buildings/r2/info_restored.png` | Returns exactly to the untinted baseline; mean difference 0. |
| `shots/buildings/r2/lod0.png` | Finer window rhythm, roof equipment and industrial detail visible. |
| `shots/buildings/r2/lod1.png` | Broad facade divisions and lost small roof/industrial objects; whole-frame difference nevertheless passes. |
| `shots/buildings/r2/night_downtown_22.png` | Dark navy masses and white/tan panes; lighting remains panel-like instead of room-like. |
| `shots/buildings/r2/skyline_12.png` | Spire, barrel and stepped silhouettes are distinct; repeated glass patterns and black quads persist. |
| `shots/buildings/r2/skyline_17p5.png` | Strongest silhouette variety; dark facade holes interrupt otherwise coherent warm lighting. |
| `shots/buildings/r2/skyline_22.png` | Night tower panels span multiple apparent floors; insufficient per-window scale. |
| `shots/buildings/r2/skyline_6p5.png` | Crown and height variety reads; tower surfaces repeat pale bands. |
| `shots/buildings/r2/street_12.png` | Visible geometric bands and cool shadows; black glass quads and foreground tufts. |
| `shots/buildings/r2/street_17p5.png` | Large black rectangle on the left building; sunlit face clips 0.39511% of the frame. |
| `shots/buildings/r2/street_22.png` | Broad uniform luminous panels, dark central entrance and little readable room depth. |
| `shots/buildings/r2/street_6p5.png` | Piers and bands catch morning light; identical diagonal glass marks and grass through paving. |
| `shots/buildings/r2/suburb_12.png` | Gable/hip and roof-colour variety, garages and dressed lots; repeated white lawn/parking marks. |
| `shots/buildings/r2/suburb_6p5.png` | House massing and morning shadows read; lot markings remain conspicuously procedural. |
| `shots/buildings/r2_720/block_12.png` | Clean 1280×720 block framing, no UI overflow; same paving and facade weaknesses. |

## Measurements

| Metric | Result |
|---|---|
| Required frames / errors / module status | 28 / 0 / buildings ready in all 28 |
| Scene draws | max 240, skyline_17p5; declared budget 400 |
| Scene triangles | max 1,786,458, closeup_6p5; aerial max 832,650 |
| Scene textures | buildings showcase 37; all-showcase 42; limit 60 |
| update / init | max 0.100000000093 ms / 23 ms |
| Module geometry | LOD0 812,768; LOD1 107,292; ratio 0.13201 |
| Chunks and reported draws | 52 / 52; diagnostics overcount actual rendered calls (issue 8) |
| Setup / observed dirty rebuild | 543.4 ms (repeat 442.8); 1 chunk in 1.2 ms |
| Atlas | 4 textures: albedo/normal/ORM 2048², emissive 1024²; colour spaces correct |
| Day toggle | ordinary 2.088440/255; exact held-state 27.601121/255; limit <0.5 |
| LOD A/B | 2.693392/255; limit <4 |
| Info tint / restoration | 27.148271/255 / exactly 0 |
| nightFacade returned rectangle contrast | bright10 median 253.7874 / dark50 median 32.0894 = 7.90876× |
| farTower returned rectangle | 0.564236% horizontal isolated bright differences; NOT graded because wrong distance |
| street_17p5 clipping | 0.39510995% any-channel 255; limit <0.3% |
| Night p99 | aerial 252; street/closeup/night_downtown 253.7152; block 254; skyline 246.357 |
| Standard-frame p1 | all >0; no black standard frame |
| Seating | 13/347 >0.25 m above highest perimeter sample; max +0.707009 m |

Pixel luminance uses 0.2126R + 0.7152G + 0.0722B on full-resolution RGB PNGs. RGB A/B is mean absolute channel difference. measurements.json supersedes the early A/B entries in pixels.json; day_exact0/1 are the final isolating test and their 27.601121 value is directly reproducible from the PNGs. The exact toggle temporarily holds the buildings update function because its normal update overwrites setLit before capture; no repository code is changed. Both exact images use the downtown preset at noon after a clean reload.

## Named facade samples

| Preset | ID | Class | Distance to target, m |
|---|---:|---|---:|
| block | 105 | residential/high/4 | 20.0946 |
| block | 101 | commercial/high/3 | 23.9270 |
| block | 106 | residential/high/3 | 39.7352 |
| block | 102 | commercial/high/5 | 41.5079 |
| block | 109 | residential/high/3 | 44.0928 |
| closeup | 121 | office/high/5 | 13.4053 |
| closeup | 124 | office/high/5 | 15.8014 |
| closeup | 123 | office/high/4 | 22.9262 |
| closeup | 122 | office/high/5 | 26.0112 |
| closeup | 156 | office/high/4 | 65.4092 |

Block selection (60 m): 8 buildings, 6 level≥3 non-industrial, tris0=27,144, literal quotient=4,524. Closeup: 4 buildings, 4 qualifying, tris0=20,324, quotient=5,081. Reported relief minima in each are reveal 0.14 m, band 0.07 m, cornice 0.20 m. This is the specified arithmetic, not an invented per-building average. Real piers/bands and separate balcony planes are visible; some named crowns are above the frame or occluded, so the strict 5/5 head/jamb/cap visual assertion cannot honestly be certified. features returns plan depths, not independently measured generated minima. This diagnostic limitation is reported under API correctness rather than converted into an unmeasured geometric failure.

## Acceptance checklist

| Item | Finding |
|---|---|
| 1. Geometric facade relief | Numeric quotients and reported depths pass. Real relief visible; strict 5/5 visual corroboration limited by framing/occlusion and plan-based diagnostic. No invented depth failure. |
| 2. Silhouette variety | PASS: 9 crown keys including all 6 required; 22 greedily separated heights ≥4 m; tallest 182.793 m / median 33.9 m =5.392; adjacentTwins=0 in downtown 250 m. |
| 3. Night windows | FAIL: baked LOD0 data passes, but LOD1 combines multiple windows/floors into coarse state quads. Whole-set 21,152/54,842 lit=38.57%; night120m 4,222/12,304, 93 tiers, warm3,253 and cool969 (22.95% cool). Returned near contrast=7.91×. Required landmark choice is defective; far-static clause remains unverified, not failed by its 0.564% number. No fract(sin noise found. |
| 4. Lit ground floor | Numeric PASS: commercialOrMixed=14, groundFloorDistinct=14, litInterior=14, signs=14 in night120m. Signs/retail bases visible at block; interior richness still weak visually. |
| 5. Class/level distinction | PASS: all40 classes; ≥3 styles per class; floors listed below satisfy progression. |
| 6. Roofscape | Counts PASS: flat clutter0=0,1=0,2=43,3=74,4+=89; clutterTwins=0 under flat-roof interpretation; house chimney/dormer72/82=87.8%. Pitched variety corroborated in both suburb shots. Much small roof clutter is lost at ordinary LOD; visual advisory, no invented count failure. |
| 7. Lot surfaces/boundaries | Publication PASS:347/347, type-specific paving/paths/boundaries present. Grass-through-paving visual issue5 awaits integration; no props-owned duplicate-boundary failure assigned. Actual occupied-lot props integration unavailable in the stub demo. |
| 8. Seating | FAIL measurable base tolerance:13/347. Skirt depth and slab-height clauses advisory under residual. |
| 9. Contact darkening | ADVISORY per residual: no pinned columns or projection method. Did not invent pixel x positions/medians or fail this item. |
| 10. Facade repetition | Macro PASS:32 tall buildings,32 unique styles. Nearby facades contain signs/ground treatments and trim, but recurring diagonal glass marks remain a major art weakness. As with item1, out-of-frame tops prevent honest 5/5 visual certification; no fabricated numerical failure. |
| 11. Non-box massing | PASS:73/105=69.5% at levels4/5; office/high35/37=94.6%; residential/high29/37=78.4%; seven archetype kinds. |
| 12. Corners | PASS:85 qualifying corner treatments; wrapped block shopfront visible. |
| 13. Balconies | PASS:22/29=75.9% qualifying high-residential level3+; stacked projecting slabs and dark undersides visible. |
| 14. Day emission/clipping | FAIL both daylight toggle and specified clipping/night percentile bounds; see measurement table. |
| 15. Material roughness/normals | FAIL measurable glass roughness0.06<0.30. normalScale0.55 passes. Distance fade replacement targets text inside a Three include and needs correction/verification; not independently claimed as a measured failure. Surface-only sparkle clause advisory; no forbidden renderer/light mutations found. |
| 16. LOD parity | Measurable PASS:meanAbs2.69339<4; tris ratio0.13201<0.35. Unspecified 2px silhouette procedure advisory under residual. Loss of detail documented visually. |
| 17. Budget | PASS: declared400/2,000,000, all measured scene limits,4 textures,52 reported chunks, setup/rebuild bounds. Incorrect own-draw telemetry is an API defect, not a budget overrun. |
| 18. Errors/readiness | PASS:zero console errors, ready in all28 including all noon/night and720p. |
| 19. API/events | FAIL broader required contract:terrain:changed does not reseat; crops and render diagnostics wrong. Spawn/level/demolish/version/payload/roundtrip tests all pass. |
| 20. Determinism | PASS:two seed1337 runs have byte-identical styles and tris0; seed7 changes29/40 class counts=72.5%. No Math.random; timing reads are profiling/setup measurements only. |
| 21. Info tint | PASS:weight0.88, emissive suppression in shader; diff27.14827>20; removal0exact. |
| 22. Live lit | PASS:night347/347=true,day0/347=true. features litCells noon count is separately wrong (issue8). |
| 23. Growth | FAIL same-origin clause:building105 moves3.694611 m at level2→3. Five distinct states and required height increments pass; restore812,768→812,678 (0.0111%) passes. |

Catalog floors by level1→5: residential/low [1,1,2,2,4]; residential/high [2,3,7,8,17]; commercial/low [1,1,2,2,3]; commercial/high [3,4,5,7,8]; office/low [2,3,4,5,7]; office/high [9,13,20,31,37]; industrial/low [1,1,2,2,3]; industrial/high [2,3,4,5,7]. The showcase has347 buildings/52chunks,110houses,54industrial,22mixed-use,85corners and74 footprints with >1.5 m perimeter relief. All40 catalog cells fit at57m pitch, but the catalog follows uneven terrain rather than the requested flat grid (minor staging advisory).

Seating failure IDs:17,47,49,85,90,119,120,153,231,274,322,327,342. Probe uses the module heading convention and all four corners/four side midpoints. Positive errors are above the highest sample; no assertion that all13 show an exposed visual gap is made.

## API contract, entry by entry

| Entry | Result |
|---|---|
| `requestSpawn` | Present; world.spawn uses it; isolated lot produces id348 and +2,158 triangles after flush. |
| `setLevel` | Present and changes geometry/floors, but does not preserve centre across archetype changes (issue7). |
| `demolish` | Pass: item removed, lot.buildingId=null, original triangle count restored. |
| `at` | Pass:returns348 inside footprint,null1m outside. |
| `get` | Returns live item, used throughout probe. |
| `count` | 347 staged items. |
| `flush` | Queued mutations become geometry; used spawn/level/demolish/roundtrip. |
| `spawnFreeLots` | Present; source enforces limit and skips occupied lots. |
| `stats` | Selection counts/tris available; rendered visible/draws definition fails (issue8). |
| `styleCounts` | All classes and scoped counts verified; deterministic. |
| `features` | Counts available; noon litCells and geometry-derived depth semantics not satisfied (issue8). |
| `forceLod` | Both forced levels and restoration exercised; image and ratio test pass. |
| `lotSurface` | 347/347 return footprint and paved list. |
| `cropRects` | Present with both names, but required visible landmarks wrong (issue8). |
| `material` | Shared PBR material; info tint works; daylight state/roughness failures in issues1/9. |
| `atlasTextures` | Four correctly sized/maps/colour-space textures. |
| `setNight` | Present; environment-controlled update resets to current world night as intended for normal operation. |
| `setLit` | Present, but controlled daylight A/B fails issue1. |
| `serialize` | Captures state,nextId and stable styles. |
| `deserialize` | Exact styleCounts and tris0 roundtrip; nextId349 preserved. |

World data:347 items pass required id/style/floors/level/lit/capacity checks. World wrappers spawn, demolish, levelUp and at operate. Each isolated mutation bumps version by1; payloads are respectively {added:[348]}, {updated:[348]}, {removed:[348]} with other arrays empty. levelUp grows floors8→12 and height33.7663→51.7363. Source consumes zones/time/terrain events; terrain reseating specifically fails. Serialization restores 812,768 triangles exactly and does not reset nextId. No ownership/global renderer violation attributed to the builder; git status showed concurrent integrator edits outside buildings, not unauthorized building-agent changes.

## Ranked issues

### 1. BLOCKER — Window state corrupts daylight facades

At noon, holding buildings.update only during the prescribed downtown setLit(0)/setLit(1) A/B gives mean absolute RGB difference 27.6011/255, versus <0.5 required. setLit(1) produces large black facade quads. The ordinary closeup_12 also contains conspicuous black rectangles (0.20081% of the whole frame has all RGB channels <=2). Gate all window-state contributions correctly in daylight and remove the black-quad artifact. The ordinary updating A/B also fails at 2.08844/255; it is less diagnostic because update overwrites the setter.

Evidence: `shots/buildings/r2/day_exact0.png; shots/buildings/r2/day_exact1.png; shots/buildings/r2/extra.mjs; shots/buildings/r2/closeup_12.png`

### 2. MAJOR — Night lighting becomes large flat luminous panels

Night street and tower views show many adjacent bays/floors lighting as one flat panel, losing the individual interior-window read in cs2_8. LOD1 maps the facade through ceil(bays/3) columns and at most 10 vertical divisions, baking a state per coarse quad rather than per actual window. Keep pane-level state and dark mullion/spandrel separation through LOD1. Bright panels also exceed the specified p99<250: night_downtown_22=253.7152 and block_22=254. Late-afternoon street clipping is 0.39511% of pixels with a 255 channel, exceeding 0.3%.

Evidence: `shots/buildings/r2/night_downtown_22.png; shots/buildings/r2/street_22.png; shots/buildings/r2/block_22.png; shots/buildings/r2/measurements.json; src/modules/buildings/generate.js`

### 3. MAJOR — Repeated painted reflections and early LOD erase architectural texture

The same diagonal reflection sweeps repeat down nearly every glazed bay in closeup and block. At the 64 m chunk LOD switch, the facade changes into stretched broad stripes, and much of the industrial and roof detail disappears. This keeps the image visibly synthetic against the reference material variety and layered architecture despite much better massing. Preserve readable material and floor frequency farther from the camera. The whole-frame LOD metric passes (2.69339/255); this is a visual-quality finding, not a fabricated failure of its unpinned 2 px clause.

Evidence: `shots/buildings/r2/closeup_12.png; shots/buildings/r2/block_12.png; shots/buildings/r2/lod0.png; shots/buildings/r2/lod1.png; shots/buildings/r2/industry_12.png`

### 4. MAJOR — Terrain changes rebuild geometry without reseating the item

For building 105, temporarily raising terrain.getHeight by 1 m, emitting terrain:changed around the building, and flushing leaves y=16.318078489 instead of 17.318078489. The consumed event contract explicitly requires reseating. Recompute the affected base and skirt before rebuilding. The test restores terrain and reloads before subsequent image comparisons.

Evidence: `shots/buildings/r2/extra.json; shots/buildings/r2/extra.mjs; src/modules/buildings/index.js`

### 5. MAJOR — Lot paving still intersects terrain clutter

Grass tufts visibly pierce the foreground paving in street and block views, and lawn/parking surfaces carry conspicuous repeated pale marks. Published surfaces exist for 347/347 buildings, so preserve them and integrate the terrain/props consumers. Parent integrator was notified after every capture and probe completed and is applying the lot-clutter-mask fix after this evidence; that later patch is not judged here. This visual issue is not treated as missing lotSurface publication or as a props-owned boundary failure.

Evidence: `shots/buildings/r2/street_12.png; shots/buildings/r2/block_12.png; shots/buildings/r2/suburb_12.png; shots/buildings/r2/apicheck.json`

### 6. MINOR — Thirteen bases miss the specified perimeter seating tolerance

13/347 staged building bases are more than 0.25 m above the highest of the eight specified footprint perimeter samples. Maximum error is +0.707009 m on building 327; building 47 is +0.483505 m. Use the required perimeter basis consistently. Skirts largely conceal the gap visually; their private depth and slab height are advisory per residual.json and are not failed.

Evidence: `shots/buildings/r2/apicheck.json: day.seat`

### 7. MINOR — Growth moves the footprint origin

At the block preset, building 105 grows visibly and monotonically, but its z changes from 274.900000 to 278.594611 between levels 2 and 3, a 3.694611 m translation. Keep the building centre fixed across level changes. Heights [8.7,12.01,20.955,30.005,45.055] pass every high-density increment; restored geometry differs by only 0.0111%, within tolerance.

Evidence: `shots/buildings/r2/apicheck.json: growth; shots/buildings/r2/growth_2.png; shots/buildings/r2/growth_3.png`

### 8. MINOR — Diagnostics do not describe the rendered landmarks and meshes

farTower points into building 124 only 101.681 m from the camera instead of 250–400 m; nightFacade also hits 124 although the tallest selected building is 122. Thus the reported far-crop static statistic is not a valid measurement of the required far tower. stats.draws/visible report all 52 allocated visible-flag chunks while onBeforeRender records 11 ordinary building draws (one observed auxiliary pass gives 21). features.litCells reports 2954 lit cells at noon despite 0/347 items lit. Return actual rendered draw counts, current lighting, and visible required landmark rectangles. Relief minima are taken from plan parameters rather than independently derived generated geometry.

Evidence: `shots/buildings/r2/extra.json; shots/buildings/r2/apicheck.json; shots/buildings/r2/crops_nightdt_22.crops.json; src/modules/buildings/index.js`

### 9. MINOR — Plain glass is below the required roughness floor

paintGlassPlain writes roughness 0.06 (metalness 0.85) into glass_plain, used for entrances, glazed railings and roof elements. Glass must be at least 0.30. Fix that atlas tile and audit every material class; normalScale 0.55 itself passes. Building-surface sparkle segmentation remains advisory under residual.json, so no whole-frame bright-pixel estimate is substituted for it.

Evidence: `src/modules/buildings/tiles.js:379; src/modules/buildings/generate.js; shots/buildings/r2/block_12.png`

## Strengths to preserve

- Nine downtown crown keys, 22 roof heights separated by at least 4 m, zero downtown adjacent twins and 32 unique tall-building styles give a much stronger skyline than round 1.
- Real piers, floor bands, projecting balconies, wrapped retail signs and varied pitched roofs are visible; preserve this geometry while fixing materials.
- All 40 classes are populated, catalogue floor progression passes, 347 buildings span 52 chunks, and lotSurface publishes every staged building.
- Spawn, level-up, demolition, version/event payloads and serialization round-trip pass; seed determinism and info-view restoration pass.
- Zero console errors and ready status in all 28 required captures; the complete scene remains within draw, triangle, texture and timing budgets.

## Residual handling

No acceptance failure was inferred from unpinned contact-darkening columns, unsegmented facade sparkle, private skirt/slab measurements or the unspecified 2px silhouette calculation. Pitched empty clutter multisets were excluded as directed. The literal scoped triangle quotient is reported without inventing a corrected denominator. Invalid crop landmarks are an API defect; they do not justify failing the unmeasured far-distance pixel criterion. Full-game staging limitations are explicitly separated from building rendering.
