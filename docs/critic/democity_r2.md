# Democity r2 — independent critic

**5.8/10 — FAIL.** Noon lighting, street enclosure and genuine democity population improved. The shipped `all` startup still produces only one resident, and scale, geometry budgets, terrain seating, civic coverage and seed contracts remain incomplete. A score above 6 is barred by measured blockers; the references remain visibly denser and more convincing at the same zoom/time.

## Independence and scope

I reread the CRITIC role, full democity specification, ARCHITECTURE sections 3/4/9/12/13/14, CS2 look calibration, residual notes and prior critic. All eight CS2 reference images were individually viewed anew before scoring. These are **37 fresh official captures plus 3 supplemental images**, and I viewed all 40. Scripts reuse my own r1 instruments but run against frozen r2 source; no builder screenshot, score or probe is treated as independent evidence.

Actual server `http://127.0.0.1:5174`, System Chrome152.0.7977.76, ANGLE Metal Apple M4, high quality; standard seed 1337, alternate7. The GPU was shared with other agents; FPS12.3–31.2 is retained and not a pass/fail metric. The required historical SwiftShader host is unavailable in this established local workflow. Official `--measure 12 --crops --timeout240` allows native notifications to expire; no toast DOM hiding, money edits or history destruction. This duration includes normal renderer updates, explaining occasional HUD8043 instead of the initial8041.

All 37 have zero errors and 16 ready modules. Source hashes before/after are identical. Owned files only were reviewed for attribution; root integration candidates remained unapplied. Democity 13 methods exist, but API contract is false because cross-seed restage mismatches fresh loading and all-mode initialization depends on a different showcase's stock seeding. No fabricated failure for stale tree enums, zero own-prop sample requests, missing segmentation or unmeasured branches.

## What changed since r1

Noon p1/median and shadow ratio now pass, closeup reaches 6 nearby buildings, ring heights decrease monotonically, flyTo tour transition exists, park landfill removed, and actual democity reaches 8041 via public simulation with 23 paid facilities. Full native save→empty world reload→load twice is independently verified. Those improvements do not cure 652 lots/buildings, insufficient schools, whole-scene cost, seed invariance or glare. Some measures regress: central tower count 23→10, industry 63→32, golden bright wash11.79%→21.69%, bridge clearance now2.32 m, larger seating gaps. These are actual final composition outcomes, not a claim that all r2 changes are regressions.

## Numbers and acceptance

The table grades the24 exact items. PARTIAL means its unmeasured branch is not assumed passed or failed. Item23 passes its numeric democity URL population check but separately fails the required whole-game setup alias; `acceptanceFailed` lists only clearly failed item statuses and `startupContractFailed:true` preserves that additional integration defect.

| Item | Result | Evidence |
|---|---|---|
| 1. The city is at the scale of §12 | FAIL | 468 nodes,604 edges, 36,485.985 m roads; street 433/avenue 85/highway 32/alley 41/gravel 10/ramp 3 meet road minima. 10,397 cells (7,607 residential, 73.16%),652 lots and 652 buildings fail 11,000/1,400/1,200; 13 landmarks pass. Sampled union of 64 m cells gives 442 cells/1.810432 km², below 2.0; roads sampled every≤4 m, lots/landmarks by centre, so this is an approximation rather than exact footprint supercover. Scale failure is independently certain from actual counts. Water exclusions not exhaustively re-probed. |
| 2. The four default cameras frame the city | FAIL | Aerial 40×40 NDC public screenToGround grid after camera matrices settle: sky 0, water 154(9.625%), dry 1446; city 1405/1446=97.1646%, hard 1197/1446=82.7801%, both pass. Seed 1337 has 10 towers>60 m within 260 m (<12); street distance 0, one building each side within 45 m (<3 each); closeup 6 plus visible signalised intersection passes; night_street 8 towers>40 m within 120 m (<12). Exact skyline width percentage unmeasured. Night street composition is dominated by foreground trees. |
| 3. Night is night, and the city is drawn by its own lights | FAIL | Aerial/skyline/night_street/night_downtown at 480 px mean 40.386/59.646/36.037/44.695, p50 32.025/48.595/23.809/27.378, p99:p50 5.557/3.434/7.321/7.029, above 180 .9267%/.6019%/.8287%/1.6782%. Skyline fails all four requirements; other three pass. Full-resolution aerial 573 qualifying bright clusters, at least 11 in each 4×4 tile, passes distribution. Pinned night_street lamp_head/pool peaks 47.1254/42.815 give 4.3104≤60. Rects are present now, though foliage obscures their surface context; no unsupported pixel classification substituted. |
| 4. Noon is neither washed out nor crushed | PASS | All four noon frames now pass every whole-frame threshold. Aerial p1/p50/p99=11.511/81.042/164.161, std 36.423, saturation.2685. Street10.351/82.009/177.466; skyline 13.583/93.433/192.285; closeup 7.953/79.558/176.770. Each clipped-channel fraction<.084%. Official closeup repeat pinned sun/shadow means94.064663/5.655279 give 16.63307:1 (>2.5), measured full resolution. This is a real correction to r1. |
| 5. Golden hour is not milky | FAIL | Skyline 17.5 has 21.6921% above 235 and largest connected low-std 24 px-window union28.0%, far above 1.5%/5%; clipped channels 18.3681%. Full-resolution horizon band y329..448 std 81.840 passes. Other three required golden frames pass bright/flat tests. Same-session road toggle difference204,075 px, eroded59,007 px, shadow 23,601 px: arithmetic hue214.0076° passes 200–250, saturation.31870 fails≤.28. Weather/grade selection is composition-owned. |
| 6. District structure, readable from the air | FAIL | Nine districts with all required kinds. First five150 m ring median heights50.9723, 32.9541, 13.18, 9.06615, 5.67158 now monotonic (r1 was not). Industry/suburb mean footprints342.3376/159.7625=2.14279 (<2.2). Mean nearest-neighbour spacing suburb24.3836/downtown33.3586=.73095 (<2). Twenty districtAt points returned a containing declared polygon; overlap priority checked against code, not a separately authored designer map. |
| 7. Highway with an interchange | PARTIAL | 32 highway edges total2,376.414 m; connected authored corridor and three oneWay one-lane ramps. Within-edge≤4 m curvature sampling max.134381°/m (<.9); median/barriers visible. Join curvature is not separately measured. Hillside road terraces still look physically implausible in skyline/interchange and should be avoided through siting. Grade separation is explicitly ungraded under the public road API exception. |
| 8. River with two bridges, no floating decks | FAIL | Two designated river bridges avenue 982 at x=-40 and street 983 at x=440,480 m apart. Forty samples each: channel deck clearance minima2.320576/4.317209 m; avenue fails 3.5 m. Both endpoint terrain gaps~.250 m pass. Seed 7 designated bridges1048/1049 have3.877824/3.727394 m clearance and~.250 m endpoints, pass. Aggregate16 bridge flags include non-river spans. Exact60% developed bank length unmeasured; no invented full-bank verdict. |
| 9. Everything is seated in the ground | FAIL | Deterministic hashed-ID sample 200 buildings, four corners each: seed 1337 ids 89/421/633/146 have highest-corner gaps.280715/.271476/.711996/.386521 m (> .25). Hospital landmark gap.488396 m (base 19.516615, highest corner19.028219); other 12 pass. Seed 7 six buildings fail, max 2.285597 m id426; its 12 landmarks pass. None of sampled building gaps negative. Zero democity-owned props when real props active makes the request for 100 such samples inapplicable; not fabricated. Public layout/seating composition requirement. |
| 10. Suburbs read as suburbs | FAIL | 208 low residential buildings across two suburbs (<250), increased from 122. All 208 have driveway and hedge/fence; seven roof tiles and 12 styles pass variety.15 pairs within 25 m share footprint±1 m and roof tile, fails repetition clause. Seed 7 has 192 low residential. Probe reports 0 lots with two garden trees; the historical props garden-pass contract is obsolete, so this branch is disclosed/ungraded, not another democity penalty. |
| 11. Industrial park and port | FAIL | 32 industrial buildings inside industry (<40), down from 63; seed 7 has 30. There are39 eligible street/gravel edges,697.573 m from downtown, 3 silos, 2 stacks, 2 cranes, 1 apron. Crane water distance 44/26 m via 2 m radial sampling at 5° intervals passes 80 m. Main industry is across river; nearest-residential/downwind predicate not exhaustively instrumented. Big paid power facilities now dominate the industrial frame; fixture silhouettes remain simple. |
| 12. Park, waterfront and the green edge | PARTIAL / CONTRACT CORRECTION | Park38,400m²,126 actual trees across eight species, 5 lamps, zero heading/scale near-duplicate pairs; native alley and arena/plaza setting. Actual species are oak, birch, spruce, poplar, blossom, fir, maple, willow, represented by only tree_oak/tree_pine kinds: obsolete three-kind enum is not a failure. Two lot centres lie inside park despite requested unlotted layout; record this bounded layout blemish, not a fabricated tree-count failure. Declared measured promenade1,003.195 m (>350), visible beach edge; continuity and complete forest wrap not exhaustively quantified. Landfill no longer occupies the park. |
| 13. Services placed and covering | FAIL | Real services lane independently verified:23 facilities across11 kinds, all required categories, nearestRoad distance max 38 m≤60. Residential 545: power 541, water 541, both 541=99.2661% passes 85%. Health 388(71.19%), education 129(23.67%), both 84(15.4128%) fails 60%. Supply power 2040/water 1600/sewage1600/garbage1400 vs demand 2665/2132/2132/1113.5 contextual capacity limits; do not substitute a magnitude threshold for nonzero coverage. Separate all URL has only1 pump, zero power/health/education; see ranked startup issue. |
| 14. One bus line running | PARTIAL | Real native line1, colour #2f8ff5, eight stops, 3,305.298 m closed road route, four managed buses. Actual accepted createLine(type, stopIds, options) used, not stale object-form example. Own buses 0; no duplicate fallback fleet. Kerb shelters visible and a bus clearly appears in suburb12. Required exact street 12/downtown12 bus visibility was not confidently identified; that narrow branch remains ungraded. Ridership 1183 is native line model output, not measured human boarding; transit finance is still outside city cash in this frozen source, an integration crosscut. |
| 15. The fallback layer is correct and self-disabling | PASS current owners / ungraded absent owners | All four exact function-presence tests resolve real. Fallbacks props/traffic/services/transit all false and own trees/lamps/parked/vehicles/buses all 0. Democity does use current public props.setDensity/place/remove for landscaping, which does not constitute private fallback geometry. No absent-owner injection; dormant fallback budgets not claimed passed. |
| 16. Street level is alive | FAIL | Within 150 m of street target actual 10 vehicles (<12), 8 pedestrians (passes 8), five kinds pickup/hatchback/sedan/van/motorbike (passes 5). No private fleet inserted for criticism. Public road-network composition is the relevant lever; lane-side or light behaviour belongs to traffic and is not newly scored here. |
| 17. No z-fighting, no flicker, no seams | PASS measured stability / partial surfaces | Identical closeup URL repeat full-frame RGB mean absolute difference0.0000094843 on0..255 scale (<1.5), no excluded rectangles. Camera drift0 over 3 s, tour off. No visible coplanar flicker in all viewed images. Ground plates and every possible district seam not exhaustively isolated; seating counted under 9 only. |
| 18. No tiling, no specular sparkle at city scale | PARTIAL | All three full-resolution detrended row/column autocorrelation measurements pass≤.55: aerial 12 col.503782/row.362180; overview.228353/.312598; aerial 17.5 .271299/.361624.101 px edge-padded moving mean, overlap Pearson lags24..400. Own materials roughness.88, normalScale .18,256² texture pass. Non-window pixel segmentation unavailable; that distinct glare threshold ungraded rather than substituting whole-frame pixels. |
| 19. Budget, whole scene | FAIL | 37 required captures max 703 draws, 7,068,796 triangles(closeup 22), 1,075.4 MB heap(industry 12), 74 textures. Overview2,774,417 triangles (>2.2M), aerial 12 3,212,899 (>3M), multiple other views>3M; heap>512 MB. Draw/texture budgets pass. Idle democity0 ms in all official frame samples. Independent renderBufferDirect instrumentation 20 frames: own max 37 all-pass draws/17,472 triangles; own geometry stats 8 draws/3,600 triangles. Own≤50 draws passes. Sustained tour CPU unmeasured. Actual shared Apple M4 Metal fps12.3–31.2 retained, not a pass/fail. |
| 20. Zero console errors, everything ready, and 720p | PASS readiness and framing | All 37 required independent captures have errors[] and all 16 modules ready, including final all 12/22. Supplemental all probe and API browser errors also zero.1280×720 fills viewport, HUD fits. Whole-game startup content mismatch is functional failure despite ready status, recorded separately; do not relabel it as a console error. |
| 21. Deterministic, and it round-trips | FAIL | Own deserialize twice and restage twice preserve same-seed 652 buildings/10,397 cells/3,600 own triangles. Actual native save→navigate empty play page→load→load again preserves 8041 population, cash 25865.286694, loan,652 building positions, 23 services, 13 landmarks, one line, with all 3 save/load events ok:true and zero errors (roundtrip.json). Fresh seed 7:683 buildings, 10,529 cells; restage({seed:7}) on original terrain 654 buildings/10,466 cells, mismatch. Public terrain seed/reset seam remains. Fresh seed centroids move0/0/40/40/8/8/0/0/32 m:0 of 9>50 m (<30%). Seed 7 also fails scale/seating/cameras. No Math.random/Date.now; performance.now is profiling only. |
| 22. Camera tour exists and never moves during a capture | PASS measured API / partial full tour | Eight named stops, 7 s dwell, explicit startTour true and stop work, gotoStop(100)false. Source now uses camera.flyTo(camera, 2) when advancing a running tour; immediate gotoStop retains apply. Headless camera identical after 3 s, tour false. Brief native start probe shows running index0 then stop; complete 56 s loop and prolonged tour budget not timed. r1 missing-flyTo defect fixed. |
| 23. The simulation is running a real city | PARTIAL democity / FAIL whole-game startup | Fresh required democity speed1 independently has 8041 population, 17813 jobs(capacity; 4422.68 employed), cash 25870.2986, positive daily net, valid demand and happiness. Deterministic public simulation.step pre-roll 120340 steps, then final 1200 public ticks: census 8041/cash 25865.286694/net 12028.186/day 51; retained native 136,000 principal loan with 146,863.233 remaining. No direct population/cash writes found. Two demand channels>.15; industry pollution.23518, grids present. Global land-value maximum within 250 m unmeasured: sampled waterfront.62634 exceeds centre.59951 alone is not proof of failure. However all URL routes to same demo setup with original flag all; it has population 1, cash 428.813885, net−10553.643076, only one pump. Startup observer in buildings seeds400 only for flag democity, but settlement growth relies on that stock before explicit spawn. This is an actual composition/init dependency failure. |
| 24. Staging cost | PASS measured Metal / partial other paths | Independent fresh stage 7,163.3 ms at 1337, 7,472.4 ms at 7, democity init 0 ms. Required elapsed max 28,083 ms includes12 s official measurement/notification settling and browser overhead, not a25 s setup measurement. No assets.settle errors. Actual Metal M4 replaces historical SwiftShader environment by orchestration; no claimed SwiftShader benchmark. Play mode has zero staged roads/lots/buildings/landmarks and idle0 ms. Missing-dependency/caught-exception branches not injected. |

## Public API contract, item by item

- `plan`: Required fields, 9 districts, 13 landmarks, corridors, promenade and native transit plan present.
- `districtAt`: 20publicqueries return containing declared polygons; overlappingpriority agreeswithsource.
- `stats`: Road/zone/building/service counts match public maps; stageMs and own geometry costs present.
- `fallbacks`: Four real function tests all false fallbacks; no own fleet or forest.
- `tour`: Eight required named stops, 7 seconds each, hour and camera fields valid.
- `startTour`: true for native start; camera.flyTo now used, running state and democity:tour emission read incode; complete loop unmeasured.
- `stopTour`: Stops native brief tour; camera remains stable when idle.
- `gotoStop`: Invalid100false; source valid indices apply camera/hour immediately.
- `tourState`: Correct running/index/stop/t before start, during brief start and after stop.
- `restage`: Twice same-seed counts stable; cross-seed 654 vs fresh 683 fails. Density extremes not tested.
- `cropRects`: Required lamp head/pool and sun/shadow crops now present in required views; full-resolution stats used. Occluded night surfaces limit semantic confidence.
- `serialize`: Nativefull save includes democity plan and owner data; actual reload roundtrip passes.
- `deserialize`: True twice, idempotent same counts and own geometry; native world reload and load again also passes.

Ownership source audit: no `Math.random`/`Date.now` in democity; `performance.now` is profiling. Public roads/zoning/buildings/service/simulation/transit APIs stage the world. The pre-roll uses real daily cash flow and a retained loan; it is deterministic bootstrap, **not proof of a player organically earning8000 residents**. The frozen city cash also does not yet include native bus-line income/cost; root is auditing that distinct simulation adapter. Line ridership is its model estimate, not a measured passenger simulation.

Known source/spec conflicts are explicit: actual createLine has the accepted positional signature; props species supersede the stale tree-kind enum and garden helper premise; services/transit are bothreal; current propspublic place/remove are real public APIs; terrain has no shared public reset matching restage seed. Grade-separation remains expressly ungraded. No synthetic absence-injection test or global land-value search was added to inflate failure counts.

## Ranked issues

1. **major — Whole-game startup has 1 resident and virtually no services.** all resolves to demo setup but keeps the all flag. buildings observer seeds400 only for democity; the pre-roll occurs before the later explicit stock spawn. Own all census 1 population, cash 428.81, only 1 pump, zero power vs8041/23 facilities in democity. Make required initial stock explicit through public buildings API before pre-roll, and rerun both aliases; never patch the HUD or fabricate cash. Evidence: `shots/democity/r2/critic/all-probe.json`.

2. **blocker — The staged city is still below scale and default camera density.** 652 buildings/652 lots/10,397 cells fail 1,200/1,400/11,000; 10 central towers, one building eachside of street target and 8night towers fail local camera thresholds. Closeup is improved, but overview still exposes vacant blocks. Solve lot yield and local layout with genuine public zoning/buildings, while respecting whole-scene budget. Evidence: `shots/democity/r2/critic/probe.json`.

3. **blocker — Whole-scene triangle and memory budgets fail.** Overview2.774Mtriangles, aerialnoon3.213M, closeupnight7.069M, maxheap1,075.4 MB. Own landmark layer8 geometry draws/3,600 triangles is small; placement/density and chosen surrounding assets still produce an over-budget composition.703maximumdraws and 74 textures pass. Evidence: `shots/democity/r2/critic/summary.json`.

4. **blocker — Bridge clearance and terrain seating regress.** Avenue river bridge minimum2.3206 m<3.5 m; seed 1337 sampled building gapmax.712 m andhospital.488 m. Seed 7 worstbuilding gap2.286 m. Choose flatter valid sites or correct staging integration through public APIs, retaining seed 7 bridge success. Evidence: `shots/democity/r2/critic/probe.json`.

5. **blocker — Night skyline is too bright overall and too weakly lit as a city.** Skyline 22 mean 59.65>55, p50 48.59>42, ratio3.43<4, brightfraction.602%<.8%. Near night scenes improve but night_street mostly frames trees. Retune available weather/grade and authored camera surroundings without making daylight crush again. Evidence: `shots/democity/r2/critic/imgstats.json`.

6. **major — Golden skyline wash is worse and shadow asphalt too saturated.** Skyline 17.5 above 235 area21.69%, flatpatch28%; shadow road mask saturation.3187>.28. Existing public weather/effects choices are the module lever. Keep now-correct noon exposures. Evidence: `shots/democity/r2/critic/imgstats.json`.

7. **major — Civic coverage still misses most homes.** Only84/545 residential centres have bothhealth and education coverage, 15.41%vs60%.23 paid facilities and 99.27%nonzero utility coverage are real improvements; school placement/reach remains the bottleneck. Evidence: `shots/democity/r2/critic/probe.json`.

8. **major — District grain and suburb/industrial targets remain unmet.** 208 suburbhouses<250, 32 industrialbuildings<40; industry footprint/suburb2.143<2.2, suburb/downtown spacing.731<2, and 15matchingnearby house pairs. Height rings are now monotonic and should be preserved. Evidence: `shots/democity/r2/critic/probe.json`.

9. **major — Seed variation and cross-seed restage contract fail.** 0 of 9 centroids move>50 m; fresh seed 7 gives 683 buildings but restage 7 gives 654 on original terrain. Separate public terrain lifecycle seam from owner layout variation; neither is solved by repeated same-seed success. Full native saved-city roundtrip is now independently passing. Evidence: `shots/democity/r2/critic/contracts.json`.

10. **major — Street simulation remains sparsely populated.** 10 actualvehicles within 150mvs12; 8 pedestrians andfivekinds pass. Build sufficient routable street frontage around the standard view; do not create a duplicate unmanaged fleet. Evidence: `shots/democity/r2/critic/probe.json`.

## Strengths to preserve

- Noon exposure and full-resolution pinned shadow contrast now pass.
- Actual democity URL reaches 8041 native inhabitants using120340 public ticks, retains its real loan, paid services andpositive cash.
- Full native save/reload/loadagain preserves cash, population, loan, building positions, services, landmarks and managed line.
- Closeup street canyon has 6 nearby buildings andvisible signalised junction; height ring medians now decrease monotonically.
- All 37 requiredcaptures zero errors/all 16 ready, stablecamera/repeat andclean 720p HUD.
- Real four-bus/eight-stop line; zero duplicate fallback fleet; small own landmark render layer.
- Park landfill removed,126trees/eightspecies, industry now mostly across river.

## Every image viewed

| Image | Observation |
|---|---|
| `shots/democity/r2/critic/aerial_12.png` | Clearer graded centre and varied façades, but many vacant grassy plots keep the city sparse. |
| `shots/democity/r2/critic/aerial_12_720p.png` | Scene fills1280×720, compact HUD remains within viewport; same sparse block interiors. |
| `shots/democity/r2/critic/aerial_17p5.png` | Warm buildings and long road shadows; bright distant wash and repeated crowns remain. |
| `shots/democity/r2/critic/aerial_22.png` | Readable street grid from uniform lamp discs; dark façades and repetitive window patterns weaken occupied-city feel. |
| `shots/democity/r2/critic/aerial_6p5.png` | Warm stepped crowns, river and far-bank industry; large green block interiors remain. |
| `shots/democity/r2/critic/all_aerial_12.png` | Geometry looks staged but HUD shows1 resident/429cash/negative10,554 daily balance and locked services. |
| `shots/democity/r2/critic/all_aerial_22.png` | Dark city grid with bright discs; same broken1-resident whole-game startup remains in HUD. |
| `shots/democity/r2/critic/all_probe_12.png` | Independent all URL confirmation: geometric city exists, but population 1 and nearly empty cash. |
| `shots/democity/r2/critic/bridge_12.png` | Both bridge directions and industrial fixtures readable; blocky cranes, apron and cooling towers dominate near bank. |
| `shots/democity/r2/critic/closeup_12.png` | Readable façades and signalised junction, hard contact shadows; sparse small cars and open corner plots. |
| `shots/democity/r2/critic/closeup_12_repeat.png` | Same geometry/light as original closeup with negligible full-frame difference. |
| `shots/democity/r2/critic/closeup_17p5.png` | Warm retail and balcony faces; two shelters and marked intersection, broad vacant grass pockets. |
| `shots/democity/r2/critic/closeup_22.png` | Lit windows and ground floors frame junction; artificial pools and glowing lamp heads remain. |
| `shots/democity/r2/critic/closeup_6p5.png` | Much better street canyon and intersection; truck, balconies, kerbs and trees visible, empty grass corner persists. |
| `shots/democity/r2/critic/downtown_12.png` | Tall varied roofs and river context, but numerous bare grassy blocks; coal towers now across river. |
| `shots/democity/r2/critic/industry_12.png` | Paid cooling towers and plumes dominate; smaller sheds and tree-filled grassy yards read less like a dense industrial estate. |
| `shots/democity/r2/critic/interchange_12.png` | Three ramp shapes and broad highway, central dome/park; abrupt mountain approach and closely spaced house lots. |
| `shots/democity/r2/critic/night_downtown_22.png` | Close illuminated window walls, glimpsed kerb shelter and distant junction; little visible street activity. |
| `shots/democity/r2/critic/night_street_22.png` | Foreground tree wall obscures most of the nominal downtown canyon; windows visible around its edges. |
| `shots/democity/r2/critic/overview_12.png` | Both banks populated, highway continuous, park and landmarks legible; grid contains many empty block interiors. |
| `shots/democity/r2/critic/park_12.png` | Dome, alley and mixed trees; large open lawn and nearby houses, landfill removed. |
| `shots/democity/r2/critic/roadmask-off.png` | Same session with roads group hidden, revealing green underneath for literal shadow-asphalt mask. |
| `shots/democity/r2/critic/roadmask-on.png` | Golden street with roads visible, grass and trees around signalised intersection. |
| `shots/democity/r2/critic/seed7/aerial_12.png` | More towers and slightly shifted outer layout; vacant grass block interiors remain. |
| `shots/democity/r2/critic/seed7/bridge_12.png` | Two crossings with port fixtures and neighbouring homes; foreground tower partly blocks water. |
| `shots/democity/r2/critic/seed7/closeup_12.png` | Coherent street canyon, signalised junction and small van; grass corner and regular façade grids remain. |
| `shots/democity/r2/critic/seed7/interchange_12.png` | Highway ramps and curved local streets, extreme uphill approach, readable green park and dome. |
| `shots/democity/r2/critic/seed7/skyline_12.png` | River/towers strongly legible, large power plume at right, steep terraced road at left. |
| `shots/democity/r2/critic/seed7/street_12.png` | Signalised crossing with white van behind tall trees and large foreground grass patch. |
| `shots/democity/r2/critic/skyline_12.png` | Clear city/river silhouette with sky above; dim repeated towers and unnatural hillside cuts. |
| `shots/democity/r2/critic/skyline_17p5.png` | Severe white glare washes out the right half; far-city detail disappears into the wash. |
| `shots/democity/r2/critic/skyline_22.png` | Blue sky over dim regular façade grids and small lamp dots; weak urban light compared with the reference. |
| `shots/democity/r2/critic/skyline_6p5.png` | River crossings and coherent tower cluster; extreme terraced hillside road remains at left. |
| `shots/democity/r2/critic/street_12.png` | Readable asphalt and shadows, glass/balconies/kerb shelter; almost empty intersection behind foreground grass. |
| `shots/democity/r2/critic/street_17p5.png` | Pale distant glow and lifted foliage, same large grassy foreground and sparse traffic. |
| `shots/democity/r2/critic/street_22.png` | Window and retail bands, isolated lamp pools; trees conceal much of the human-scale street. |
| `shots/democity/r2/critic/street_6p5.png` | Improved enclosing façades, small shelter, foreground grass and tree wall dominate. |
| `shots/democity/r2/critic/suburb_12.png` | Detached houses, varied roofs, driveways and hedges; native blue-white bus visible by shelter. |
| `shots/democity/r2/critic/suburb_6p5.png` | Warm façades/roofs and long shadows; readable bus and garden boundaries, oversized plain landmark wall. |
| `shots/democity/r2/critic/waterfront_17p5.png` | River reflection and bank promenade visible; large foreground crowns and extreme sloping roads on opposite bank. |

## Reproduction and manifests

`shots/democity/r2/critic/run.mjs` contains all 37 official arguments; `capture.log` and `summary.json` record outcomes. The final two matrix captures are `all_aerial_12` and `all_aerial_22`, after every own probe/capture setup was completed. `apicheck.mjs`,`all-check.mjs`,`supplement.mjs`,`roundtrip.mjs`,`images.py` and `roadmask.py` retain exact independent probes. `imgstats.json` has 40 image entries plus repeat diff. Per-frame JSON keeps draw calls, triangles, module timings, status, errors, heap and renderer. Road-mask pair was one session; the literal luma erosion mask is documented in `roadmask.json`.

Freshly viewed references: `/Users/martingrahn/.simbuild/ref/cs2_1.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_2.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_3.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_4.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_5.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_6.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_7.jpg`, `/Users/martingrahn/.simbuild/ref/cs2_8.jpg`.

Source SHA256 (unchanged before/after):

- `landmarks.js`: `ad30a2f66faccff21e9d4af1bb882b16cf01cf67f7884001ddd28c11b36a3a23`
- `plan.js`: `c439a6e88f87f40aac5182698d4406540e21f04ce659975b2b0e8cb4e4d26bd6`
- `index.js`: `55f93c56897ab6032cd6ef60c9f1ce40cf90f5d0c6248162ee6e08ddaa28d11d`

Formal request `shots/workflows/w3/009-critic-democity-r2.request.json` read in full before result publication. Builder sourceFreeze hashes match the independent before/after manifest exactly. `acceptanceFailed` uses number-and-title strings as required.
