# Democity r1 — independent critic

5.5/10 FAIL. A visible textured city and real public-owner services/transit exist, but sparse camera neighbourhoods, three residents, weak civic coverage, crushed/blown lighting, seed adaptation and whole-scene triangle/heap budgets prevent a playable-city showcase at the required bar.

Score is calibrated from all eight freshly viewed CS2 references: the river/tower silhouette and roof/material variety exceed empty-box massing, but the streets, industrial siting, lighting and density are obviously synthetic. Several blocker failures cap the score at6; 5.5 is the visual result, not a checklist average or the builder’s score. First round, no previous democity verdict.

## Evidence and scope

37 required PNGs were freshly captured through official tools/screenshot.mjs via an independent sequential runner (run.mjs), plus two same-page road-visibility captures. All39 were individually viewed. The complete required matrix is retained; --showcase all noon then night were the last matrix captures. Additional read-only probes followed. All eight reference images were viewed anew before scoring. No production source was edited. SHA256 for the three frozen democity JS files stayed identical before/after. Shared git status includes root and other owners’ pending work; no unsupported blast-radius accusation is made.

Host: system Chrome152 / actual Apple M4 ANGLE Metal through127.0.0.1:5174. FPS is recorded under shared GPU load and is not a pass/fail metric. The old SwiftShader setup is not misrepresented as measured. Summary max668 draws,7,114,730 triangles,919.5MB,74 textures,17.2–41.2FPS; all16ready/errors0. Own all-pass rendering max38 draws/17,616triangles, independent of the reported8-draw/3,600-triangle base geometry.

Saved scripts: run.mjs, apicheck.mjs, cityfill-fixed.mjs, supplement.mjs and images.py beside the evidence. cityfill-fixed.mjs waits two animation frames after each camera apply; this replaces an initial synchronous multi-camera grid whose later views used stale camera matrices. Pinned crop files come only from the official screenshot producer. Full-resolution versus480px measurements follow the spec. Flat-patch area is the union of windows, not a count of overlapping window areas.

## Acceptance — all24 items

| Item | Verdict | Evidence and limits |
|---|---|---|
| 1. The city is at the scale of §12 | FAIL | 401 nodes, 533 edges, 40,798.07 m roads; byType street334/avenue96/highway32/alley48/gravel20/ramp3. 11,383 cells, 6,840 residential (60.09%), all four zone types, 13 landmarks. Only 684 lots and 684 buildings, below 1,400/1,200. Built union 542 64m cells =2.220032 km² (roads sampled every <=4m, lots/landmark centres; approximate rather than exact edge supercover). Whole-map water exclusion not exhaustively checked. |
| 2. The four default cameras frame the city | FAIL | Aerial 40x40 grid: sky0/1600, water157/1600 (9.81%), dry ground1443; city1409/1443=97.64%, hard built1112/1443=77.06% pass. 23 towers >60m within260m pass count and skyline silhouette is clearly visible above river. Street target distance0 but only one building within45m, all on one side (needs3 each); closeup5 within80m (needs6); night target9 towers (needs12). Exact skyline width percentage unmeasured. |
| 3. Night is night, and the city is drawn by its own lights | FAIL | At480px aerial/skyline/night_street/night_downtown mean33.848/49.293/38.939/44.408, p50 27.743/38.956/25.815/29.819, p99:p50 5.855/4.067/7.177/6.320 all pass. Above180 fractions .5347%/.4977%/1.0818%/1.3025%: first two fail .8% minimum. Full-resolution aerial has314 qualifying clusters, with at least4 in every one of16 tiles, so built-tile distribution passes. lamp_pool pinned rect missing: API/crop defect, peak comparison ungraded, never invented. |
| 4. Noon is neither washed out nor crushed | FAIL | Noon street p1=.0722 and p50=39.1632 fail; closeup p1=.361 fails. Aerial p1/p50/p99=12.583/66.286/158.924, std32.996, saturation.314 pass. Other frame statistics saved in imgstats.json. Official full-resolution closeup repeat sun/shadow crops means79.0651/73.7419 give1.07219:1, below2.5. Rects are author-pinned; their weak separation is not repaired by critic-selected crops. |
| 5. Golden hour is not milky | FAIL | Skyline17.5 above235=11.7870%, largest union of connected low-std24px windows=26.4444%, failing1.5%/5%. Horizon band y329..448 std61.409 passes. Other three golden frames pass their bright/flat tests. One-session road diff has196,782 pixels, eroded68,926, darkest40%=27,520 pixels: hue200.109°, saturation.27309 pass. This is an available environment/effects preset composition choice. |
| 6. District structure, readable from the air | FAIL | Nine districts with required kinds and two suburbs. First five150m ring medians about downtown(0,20):90.30295,31.60714,13.18,5.67369,5.75374; last rises. Industry/suburb district-filtered mean footprint378.129/147.204=2.569 passes. Mean nearest-neighbour centre spacing suburb20.722m/downtown35.927m=.577, below2.0. Twenty districtAt queries return a containing declared polygon; overlapping-polygon priority checked against source, not an independent designer map. |
| 7. Highway with an interchange | PARTIAL | 32 highway edges total2200.336m, connected authored corridor; maximum sampled within-edge turning .04827°/m (<=4m intervals), three real oneWay single-lane ramps. Median/barriers visible. Sharp join curvature not separately measured. Severe hillside cuts and vertical ribbons in interchange are a siting/composition concern. Grade separation remains explicitly ungraded under the roads capability exception. |
| 8. River with two bridges, no floating decks | PARTIAL | Designated avenue844 and street845 are distinct bridges near x=-80/400 (>300m apart). Forty samples each: channel clearance minima4.25691/4.45274m above water, endpoint terrain gaps approximately.250m, pass. Aggregate175 bridge flags include hillside spans, not175 river crossings. Exact 60% in-city developed riverbank length not measured. Seed7 probe and bridge image saved; no unsupported full bank pass. |
| 9. Everything is seated in the ground | FAIL | Independent deterministic hashed-ID sample of200 buildings, four corners each: one counterexample id395 has base38.67261, highest ground38.25925, gap.41336m >.25. All other sampled building gaps0..25cm, none negative. All13 landmark four-corner highest-ground gaps.045..21842m pass. 852 terrain coordinates total; there are zero democity-owned props with real props active, so100 own-prop objects are inapplicable rather than fabricated. Seating is composition-owned under this item. |
| 10. Suburbs read as suburbs | FAIL | District-filtered low residential count122 across both suburbs, below250. All122 have driveway plus hedge/fence (passes70%); seven roof tiles and12 style IDs pass variety. Nine nearby pairs within25m share roof tile and footprint within1m (fails). Probe reports0 lots with two garden trees; current props no longer matches the spec historical garden-pass assumption, so that cross-owner branch is ungraded here, not an additional democity failure. |
| 11. Industrial park and port | PARTIAL | 63 industrial buildings in industry,73 street/gravel edge midpoints there, district704.716m from centre; three silos/two stacks/two cranes/one apron. Both crane sites find water within44/26m via2m radial samples at5° intervals, passing80m. Water separates the main industrial lobe visually; exact nearest-residential/downwind predicate not fully instrumented. Fixture silhouettes are readable but simple. |
| 12. Park, waterfront and the green edge | PARTIAL / CONTRACT CORRECTION | Park38,400m², zero lots,142 trees, five lamps, native alley. Actual seven species (spruce,oak,fir,birch,maple,blossom,poplar) are represented by two kind classes. The spec says three kind values including tree_birch, but current props/species.js exposes birch under tree_oak. Do not fail democity for this obsolete enum. One heading/scale near-duplicate pair is reported; inherited scatter attribution not independently reproduced, so no score penalty for that branch. Promenade and forested edge visible, exact length/plaza predicates not independently measured. Landfill inside the park and coal close to centre harm authored composition. |
| 13. Services placed and covering | FAIL | Real services lane:14 placements across9 kinds, each nearestRoad within60m. All499 residential centres have nonzero power AND water, passes85%; no invented .5 magnitude requirement. Health39/499=7.82%, education88/499=17.64%, both39/499=7.82%, below60%. Supply power600/water140 vs demand2626/2100.8 is contextual evidence of inadequate capacity, not a substitute threshold. |
| 14. One bus line running | PARTIAL | Real transit lane: one coloured native line, eight stops,3739.423m closed road route, four actual buses; democity owns zero buses. Correct actual createLine(type,stopIds,options) signature used rather than the stale object example. Kerb shelters present; a bus in the required1337 street/downtown view was not identified confidently, so the precise visibility branch remains ungraded (a bus clearly appears in park/seed7 closeup). |
| 15. The fallback layer is correct and self-disabling | PASS current owners / ungraded absent owners | All four specified function-presence tests resolve real; flags allfalse; own trees/lamps/parked/vehicles/buses all0, public props8168. No duplicate fallback fleet. Absent-owner injection and fallback render budgets not exercised; do not claim those branches pass. |
| 16. Street level is alive | FAIL | Within150m ofstreet target: five actual vehicles, five kinds (van,hatchback,police,sedan,semi), five pedestrians. Kind diversity passes5; vehicle12 and pedestrian8 minima fail. No invented residents or private fleet spawning used. Native traffic visual/material behaviour not independently scored as democity. |
| 17. No z-fighting, no flicker, no seams | PASS measured stability / partial surfaces | Identical closeup URL repeat full-frame RGB mean absolute difference .00372042 on0..255 scale, below1.5; no rectangles excluded. Camera drift0 over3s with tour off. No visible coplanar flicker in viewed shots. Small ground-plate offsets and all material seams not exhaustively isolated; building seating handled once under9. |
| 18. No tiling, no specular sparkle at city scale | PARTIAL | All three required full-resolution frames pass both detrended autocorrelation signals: aerial12 col/row.26094/.45111; overview.35532/.43066; aerial17.5 .42724/.42852, all<=.55.101px edge-padded moving mean and overlap Pearson lags24..400. Own material roughness.88/normalScale.18 pass. Non-window bright-pixel segmentation absent, ungraded rather than substituting whole-frame glare. |
| 19. Budget, whole scene | FAIL | 37 captures: max668 draws (passes bothdraw budgets),7,114,730 triangles(closeup22),919.5MB heap,74 textures. Overview2,880,816 triangles exceeds2.2M; multiple views exceed3M; heap exceeds512MB. Idle democity max.100000009ms passes1ms. Independent renderBufferDirect instrumentation over36frames gives own max38 all-pass draws/17,616 triangles; own geometry8 draws/3,600 triangles. Own layer passes50draws. Sustained tour CPU unmeasured. M4 Metal fps17.2..41.2 recorded, no fps failure. |
| 20. Zero console errors, everything ready, and 720p | PASS | All37 fresh official captures have errors[] and16ready modules, including final whole-game aerial12/22.1280x720 scene fills viewport, HUD remains within it. Both same-session extra road-mask images reviewed. Browser probe errors alsozero. |
| 21. Deterministic, and it round-trips | FAIL | Two own deserialize calls and two same-seed restages preserve counts and own3,600 triangles. Fresh seed7 has750 buildings vs restage({seed:7})733 on original terrain. All nine declared district centroids move0m, below30% moving>50m. Seed7 still fails scale. Full serialize→page reload→deserialize was not independently executed; no borrowed builder save verdict. No Math.random/Date.now in module; performance.now is timing only. |
| 22. Camera tour exists and never moves during a capture | FAIL minor | Eight named stops, seven-second dwell, explicit start/stop work, invalid100 rejected, headless3s no movement. Source startTour/update call gotoStop which always camera.apply; no camera.flyTo exists in module, so tour jumps between stops rather than smooth flights. Full56s loop not timed; no headless failure counted again. |
| 23. The simulation is running a real city | FAIL | Actual speed1 fresh page population3, jobs44,478(capacity, not employment), cash24,646.69. Speed0 census after240 genuine steps: population3,cash24,652.30,happiness.501675, all four demand values>.15, grids present. Industry centre pollution.200878; sampled waterfront land value.5612 exceeds centre.4448, but global250m maximum unmeasured.8,000 population requirement fails; no fabricated cash/population or claim longer preroll would safely solve it. |
| 24. Staging cost | PASS measured Metal / partial other paths | Fresh independent stage3528.5ms at1337,3404.1ms at7; democity init0ms. All37 elapsed ready+capture <=13,970ms. Actual M4 Metal, not requested legacy SwiftShader baseline; no claim of measured SwiftShader CPU. Play mode stageszero roads/lots/buildings/landmarks and idle0ms. Missing dependencies/catch branches not injected. |

## API contract — each declared entry

| API | Result |
|---|---|
| plan | Object returned with nine districts, corridors and13 landmarks; cross-seed centroids remain fixed, contract failure under21. |
| districtAt | Function;20 points yield containing declared polygon, source overlap priority inspected. |
| stats | Honest live owner counts and timing, population3 retained. |
| fallbacks | Allfalse for four real owners; zero own duplicate content. |
| tour | Eight named seven-second stops with hour/camera. |
| startTour | Starts running; no smooth flyTo transition (minor). |
| stopTour | Stops running after explicit start. |
| gotoStop | Invalid100 returnsfalse; valid immediate apply through start observed/source checked. |
| tourState | Reports running/index/stop/t; off in headless drift test. |
| restage | Two same-seed count-identical calls; seed7 mismatch733 vs fresh750 is a behavioural contract failure. |
| cropRects | Function produces sun/shadow/head official rects; required lamp_pool missing. Head/pool peak measurement ungraded. |
| serialize | Produces data consumed twice by own deserialize; complete save/reload was not independently exercised. |
| deserialize | Two same-page calls returntrue and preserve counts; full reload path and malformed payload robustness ungraded. |

`apiContractOk=false`: required crop output and cross-seed restage behaviour fail despite all13 functions existing. Calling actual transit.createLine(type, stopIds, options) is correct for the landed public API; the obsolete object signature in the democity prose is not a failure. props now has a public placement entry point and eight species sharing two tree kind classes; historical no-place/three-kind assumptions are not silently graded as current facts. No owner-private writes or fabricated economy values found in source review.

## Ranked issues

1. **blocker — Build dense inhabited neighbourhoods around the fixed cameras**. 684 buildings/684 lots miss the scale requirement; only one street-anchor building and nine night-anchor towers leave grass and tree gaps. Create viable frontage around the fixed targets, then enlarge suburbs (122 low residential now) without multiplying costly visible ornament. A plausible centre exists but the street experience is not a dense city. Evidence: `shots/democity/r1/probe.json; street_12.png; night_street_22.png; downtown_12.png`.

2. **blocker — The authored city exceeds triangle and memory budgets**. Whole-scene peak7,114,730 triangles and919.5MB; overview2,880,816 triangles also fails. Own landmark layer is small (38 actual all-pass draws), so density/visibility and owner integration must be budgeted together. Do not solve the sparse neighbourhoods by indiscriminate additions. Evidence: `shots/democity/r1/summary.json; supplement.json; closeup_22.png`.

3. **major — The pre-roll produces only three residents and poor civic coverage**. 240 real ticks end at population3. Health AND education reaches39/499 residential centres. Redistribute/size actual services and make the native simulation viable; retain honest population and the existing payment path. More tick calls alone are not proven sufficient. Evidence: `shots/democity/r1/probe.json; speed1.json; all_aerial_12.png`.

4. **blocker — Noon near views are crushed and golden skyline washes out**. Street p1=.0722/p50=39.163; closeup p1=.361 and pinned light ratio1.072. Golden skyline has11.787% above235 and26.444% connected flat patch. Tune the public environment/effects choice and framing, and provide useful pinned physical patches. Evidence: `shots/democity/r1/imgstats.json; street_12.png; closeup_12_repeat.png; skyline_17p5.png`.

5. **blocker — Night city light is sparse and the lamp-pool probe is absent**. Aerial/skyline bright fractions.5347%/.4977% fail.314 clusters and alltile distribution do pass: do not increase undifferentiated glowing pools just to raise cluster count. Supply the missing physical lamp_pool crop and strengthen believable occupied facades/retail at night anchors. Evidence: `shots/democity/r1/aerial_22.png; night_street_22.crops.json; imgstats.json`.

6. **blocker — Terrain siting and district spacing remain artificial**. Industry/suburb area contrast passes, but suburbs are closer-spaced than downtown and outer-ring median height rises. Interchange/industry cameras expose abrupt mountain road cuts; landfill occupies park scenery beside a stark arena. Choose buildable corridors and coherent civic/industrial sites through supported APIs; grade separation itself is not required. Evidence: `shots/democity/r1/probe.json; interchange_12.png; industry_12.png; park_12.png; shots/democity/r1s7/interchange_12.png`.

7. **blocker — A sampled building base exceeds the seating tolerance**. Hashed sample building395 highest-corner base gap.413362m, exceeding.25m; all13 landmark samples pass. Keep deliberate cuts within valid terrain support and use the owner ground-support contract. Evidence: `shots/democity/r1/probe.json#seating`.

8. **major — Cross-seed restaging and district adaptation do not meet contract**. Same-seed restage counts pass, but seed7 restage gives733 buildings versus750 on a fresh seed7 page; all9 district centroids are fixed. Coordinated terrain seed reset needs an owner API, while moving/adapting district centres is a democity responsibility. Evidence: `shots/democity/r1/contracts.json; seed7-probe.json; src/modules/democity/plan.js`.

9. **major — Street activity and suburban layout are below the required levels**. Only5 vehicles and5 pedestrians near street target; five distinct vehicle kinds already pass. Suburbs have122 low homes and9 nearby duplicate footprint/roof pairs; driveway/hedge122/122 and style variety pass. Improve routable local neighbourhoods without uncontrolled extra fleets. Evidence: `shots/democity/r1/probe.json#traffic; #suburb; suburb_12.png`.

10. **minor — Tour cuts instantly between stops**. startTour and update invoke gotoStop, which uses camera.apply exclusively; required camera.flyTo transitions absent. Preserve immediate gotoStop and headless immobility while giving running tours smooth transitions. Evidence: `src/modules/democity/index.js:89; shots/democity/r1/contracts.json; supplement.json`.

## Per-shot observations — all39 viewed

| File under shots/democity | Observation |
|---|---|
| `r1/aerial_12.png` | Tall towers and river read clearly; uniform green setbacks weaken continuous blocks. |
| `r1/aerial_12_720p.png` | Scene fills1280x720 and HUD stays in bounds; same sparse block interiors remain. |
| `r1/aerial_17p5.png` | Gold-lit roofs reveal a rigid grid and open interiors. |
| `r1/aerial_22.png` | Dim window grids and repeated large lamp pools trace towers and roads; the city lacks occupied-street brightness. |
| `r1/aerial_6p5.png` | Warm roofs and long shadows define the centre, but repeated crowns and large grass interiors dominate. |
| `r1/all_aerial_12.png` | Whole-game tower/river composition works at overview distance, with repetitive crowns, isolated grass lots and sparse street activity. |
| `r1/all_aerial_22.png` | Whole-game windows appear as subtle grids, while circular lamp pools and very dark trees dominate ground lighting. |
| `r1/bridge_12.png` | River crossing, banks and port fixtures visible; cranes and silos remain simple isolated objects among trees. |
| `r1/closeup_12.png` | Clock tower and crossing are visible; dark foliage and generic empty setbacks weaken human scale. |
| `r1/closeup_12_repeat.png` | Visually the same noon junction; full-frame difference is negligible. |
| `r1/closeup_17p5.png` | Warm facades and several cars bring some life, but not a continuous urban block. |
| `r1/closeup_22.png` | Visible windows and bright pool discs illuminate an otherwise sparse junction. |
| `r1/closeup_6p5.png` | Warm mixed roofscape and traffic intersection, surrounded by oversized lawns/tree clumps. |
| `r1/downtown_12.png` | Tall glass slabs have some roof variety, but isolated grass plots and quiet roads break urban continuity. |
| `r1/industry_12.png` | Long sheds and varied roof materials read as industry; background roads cut harsh vertical terraces. |
| `r1/interchange_12.png` | Highway and ramps exist, but dramatic cliff cuts and vertical terrain ribbons are visually dominant. |
| `r1/night_downtown_22.png` | Warm/cool window wall behind leafy low foreground; lamp pools are disproportionately conspicuous. |
| `r1/night_street_22.png` | Low facade and trees interrupt the intended canyon; windows and pools remain distinguishable. |
| `r1/overview_12.png` | Rigid block grid and large vacant interiors; tower centre and river read, coal/landfill sit awkwardly by park. |
| `r1/park_12.png` | Green trees and a bus are visible, but the stark arena, landfill and nearby coal detract from park identity. |
| `r1/roadmask-off.png` | Same page after hiding roads: road surfaces/markings disappear, exposing green ground; used only for road mask. |
| `r1/roadmask-on.png` | Frozen golden street with road layer visible, vegetation and foreground shadow intact. |
| `r1/skyline_12.png` | Cool river and tower cluster are legible against mountain forest. |
| `r1/skyline_17p5.png` | A large milky white wash consumes the right skyline and distant detail. |
| `r1/skyline_22.png` | Blue sky and dark masses remain readable, while dotted hillside lamps look artificial. |
| `r1/skyline_6p5.png` | Distinct core beside river; coal plume and roads climbing steep terrain compromise the silhouette. |
| `r1/street_12.png` | Deep near-black foliage/shadows and sparse buildings obscure the street. |
| `r1/street_17p5.png` | Warm light brightens towers, with haze and large gaps still prominent. |
| `r1/street_22.png` | Tree silhouettes, a low building and lamp pools dominate; only fragments of a night canyon. |
| `r1/street_6p5.png` | Leafy foreground and a clock tower face open grass rather than a continuous street wall. |
| `r1/suburb_12.png` | Detached roof variety and driveways appear, backed by very repetitive commercial rows and a plain water tower. |
| `r1/suburb_6p5.png` | Low sun improves house roofs and gardens; repetitive flat rear blocks still stand out. |
| `r1/waterfront_17p5.png` | Broad reflective river and developed banks work; background roads traverse severe cliffs and sewage pools occupy foreground. |
| `r1s7/aerial_12.png` | Same grid form with a different tower mix, still open blocks and nearby coal. |
| `r1s7/bridge_12.png` | Bridge piers and river present; primitive port fixtures and trees crowd the bank. |
| `r1s7/closeup_12.png` | Bus and traffic provide some activity, but a large green gap persists. |
| `r1s7/interchange_12.png` | Enormous tan triangular cuts dominate the road junction and surrounding hillside. |
| `r1s7/skyline_12.png` | River and core still read, with power plume behind towers and harsh mountain-road terraces. |
| `r1s7/street_12.png` | Large blank grass patch, foliage and one corner bus; weak enclosure. |

## Strengths to preserve

- Zero errors and all16 modules ready in all37 independent required captures, including720p and both final whole-game frames.
- Clear tower/river silhouette, distinct low roofs and industrial fixtures; real textured geometry and visible warm/cool night windows.
- Real paid services and native8-stop/4-bus transit use public owners; no fabricated population or duplicated democity fleet.
- Two designated bridge samples clear water and meet abutment tolerance; all13 landmark highest-corner samples pass.
- Same-seed restage counts and repeated closeup stability pass; no headless camera drift; own rendering comfortably within50 draws.
- 142 park trees represent seven actual species; keep this variety, and update the stale three-kind grading assumption.

## Unmeasured and cross-owner limits

No numerical failure is invented for missing bank-development segmentation, non-window specular pixels, full-world reload, absent-owner combinations, sustained-tour CPU, exact bus visibility in the named1337 frames, or the obsolete tree kind enum. Native foliage repetition/garden placement and lamp sprite material quality would need owner-showcase reproduction for inherited attribution; they are disclosed but not independently penalised as new democity defects. Composition siting, fixed-camera population, chosen lighting preset and whole-scene budgets are explicitly democity responsibilities. The road design-height limitation is recorded in the existing core request and does not excuse steep-corridor siting or create a grade-separation failure.
