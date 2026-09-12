# Democity builder r1 — 5.5/10, FAIL

Lindham now stages a real owner-backed city rather than the former stub: roads, zones, buildings, paid services and a native transit loop all exist in public world records. This bounded first round does **not** meet the full visual or gameplay population specification. The most consequential gaps are insufficient buildable lots, service capacity and coverage, terrain-following road placement, whole-scene rendering cost, and weak street framing. No inherited exemption is claimed without a matching owner-showcase reproduction.

Implementation is confined to `src/modules/democity/{index,plan,landmarks}.js`; reproducible probes are in its `tools/` directory. Parent owns core integration and independent scoring. Production source was frozen before final evidence; the final two capture operations were `all` at12 and22, after all other PNG captures. Every one of37 required PNGs, two development smokes and two road-mask PNGs was viewed individually; all8 CS2 references were read fresh. This is actual System Chrome152 on Apple M4 Metal through shared5174, not SwiftShader.

The plan samples3,969 terrain points at32m, authors roads in one rebuild and paints zones in one bulk operation after refreshing native frontage. Buildings are created via requestSpawn/level/flush, not private record mutation. Public service validation reserves14 feasible plots and native placement charges124,000; a deterministic240-step real simulation pre-roll preserves positive funds but reaches only3 residents. No fake population, cash, capacity, coverage or HUD override is used. Current transit signature is `addStop(x,z,opts)` then `createLine('bus',ids,{name,color,vehicles,fare})`, with an implicit closed final leg; older spec examples are stale. All fallback capability tests resolve to real owners and no duplicate owned props/fleet are emitted.

Exact copies of the scene serialize via owner APIs. Two own deserialize calls, two same-seed restages, awaited native save/load and all tour targets were verified. Cross-seed restage deliberately does not write world.seed or terrain internals and is not equivalent to a new page. Read `docs/core-requests/democity.md` for the narrow reset/load/camera/API seams, including the real legacy404 save missing modules.democity.

The authored layer uses8 merged128m chunks and3,600 geometry triangles. Instrumenting renderer.renderBufferDirect over every engine pass measured a maximum38 owned draws/17,616 submitted triangles (main8). Whole37-shot maximum is855 draws/7,258,518 triangles/930.1MB heap/74 textures, minimum14.6fps. The default16-shot gauntlet alone is max855 draws/4,835,222tri, min14.6fps; night_downtown extends triangles to7.259M. These failures are preserved rather than excused by ownership or selecting faster repeat frames. Screenshot runtime includes other concurrent shared-GPU work; no corrected fps is fabricated.

## Acceptance evidence

Statuses qualify their exact scope; missing evidence is ungraded, never a fabricated pass. Literal failures cap the score at6 and the visible composition supports only5.5.

### 1. FAIL

401 nodes, 533 edges, 40.798 km roads, all six types, 11,383 cells/60.09% residential, 13 landmarks and 2.187 km² built area pass their scale thresholds; 684 lots and 684 buildings fail 1,400/1,200 minima. Fresh seed7 has750 buildings, also insufficient.

### 2. FAIL

23 buildings >60m within260m; tallest182.27m. Aerial dry-ground city fraction95.57%, hard built57.38%. Street target is on-road but only1 building within45m (0/1 sides), closeup5 within80m, night anchor9 towers>40m within120m. Required3/side,6,12 fail. Ground-grid omitted separate sky/water counts; no inference from combined excluded157 samples.

### 3. FAIL

Night means/p50/contrast pass in the four specified frames, but aerial/skyline above180 fractions0.535%/0.498% fall below0.8%. Aerial full-resolution314 bright clusters pass300; built-tile distribution is not established because per-camera grid mapping is absent. The pinned lamp_pool crop is missing while lamp_head exists: builder crop defect, no invented peak comparison.

### 4. FAIL

Noon aerial p1/p50/p99=12.58/66.29/158.92, std33.00, saturation0.314 pass. Street p1=.072/p50=39.16 and closeup p1=.361 fail. Named full-resolution 40px crops mean79.065/73.742 give1.072:1, below2.5; crop locations do not isolate a strong sun/shadow contrast.

### 5. FAIL

Golden skyline above235=11.786%, flat patch21.11% fail. Correct45° FOV full-resolution120px far band std61.41 passes. Same-session road diff/3px erosion/lowest40% yields27,170 pixels, mean hue200.049°, saturation.27283, passing this shadow submeasurement.

### 6. FAIL

Nine districts and two suburb polygons exist. First five ring median heights54.069,32.979,13.180,5.695,5.743 are not monotone. Whole-type median industrial area417.50 vs low residential112.06 is descriptive only; it is not the required district-filtered mean/spacing probe. Twenty districtAt cases unmeasured.

### 7. PARTIAL / UNGRADED

32 connected highway edges and3 real one-way single-lane ramp edges authored; actual16-node roundabout. Severe terrain-following highway/grid cuts are plainly visible and a next-round layout defect. Source curve is continuous but exact public road-length/curvature probe is missing. Grade separation is ungraded under the residual because roads has no design-height setter; narrow request filed.

### 8. PARTIAL / UNGRADED

Two designated river bridges are different avenue/street edges near x-80/400.40 samples each: minimum water-channel deck4.257/4.453m and endpoint terrain differences~.250m. API aggregate175 bridge flags also includes native hillside spans and is not claimed as175 river crossings. In-city bank development percentage and seed7 bridge seating are unmeasured.

### 9. FAIL

Deterministic first200 public building records sampled, not a randomized400 sample. Highest-corner base gap0..0.319707m; one exceeds.25m. All13 landmark highest-corner gaps.045..21842m and centres dry. No democity-owned props exist with real props owner;100 own-prop samples are inapplicable under residual, never fabricated.

### 10. PARTIAL / UNGRADED

388 low residential houses overall, all with driveways, visibly distinct garden/roof patterns in both suburb frames. Required subset must be district-filtered; exact hedge/fence+two-tree proportions, roof/style variety and nearby duplicate matrix not measured, so full item is not asserted.

### 11. PARTIAL / UNGRADED

76 industrial buildings overall; authored3 silos,2 stacks,2 cranes,1 apron near sampled dry riverbank. Industry preset shows industrial roofs but excludes much of port and exposes hill cuts. Exact district membership,6 servicing edges and all crane water distances are unmeasured.

### 12. FAIL

Park38,400m², zero lots,142 actual owner trees and real alley, but only oak/pine (2 species) versus3 required. Promenade polyline length1,003.20m. Landfill in the park and generic arena placement are composition defects, not inherited excuses.

### 13. FAIL

14 native placed services across9 kinds, ordinary validation and124,000 total cost. Power/water nonzero at100% residential centres but magnitude below.5 everywhere; supply600/140 vs demand2626/2100.8. Clinic coverage nonzero7.82%, school17.64%, below60%. Coal too close to downtown and landfill in park need deliberate siting.

### 14. PASS measured route; visual caveats

Actual native line1,8 stops,4 owned-transit buses, closed implicit return, route3,739.42m, teal colour. One existing shelter adopted; no democity duplicate fleet. Stops and shelters visible; transit uses own fleet backend because managed traffic capability is absent. Owner ridership is ambient/profile output, not evidence of the demo population travelling.

### 15. PASS actual owners; absent branches UNGRADED

Feature-detected props.rebuild, traffic.spawnVehicle, services.place and transit.createLine are real. All four fallback flags false; own trees/lamps/parked/vehicles/buses0. Props capture count8168. Stub/degradation combinations were not injected and fallback mesh completeness is not claimed.

### 16. FAIL

Actual street-radius150m probe has5 vehicles,4 kinds and5 pedestrians, below12/5/8. Traffic is real ambient owner traffic; democity does not invent resident trips or duplicate cars. Vehicle headlight pixel comparison unmeasured.

### 17. PASS

Identical frozen noon closeup URLs give full-frame RGB MAE0.00459555<1.5 with no excluded animated rectangles; camera does not drift.

### 18. PASS measured autocorrelation; remaining UNGRADED

Full-resolution101px detrend/max|r| lags24..400: aerial .4266/.2619, overview .4103/.3465, night street .4313/.3750, each<=.55. Own standard material has linear normal map and roughness.88. Non-window democity-only specular pixel mask is not supplied, so that branch ungraded.

### 19. FAIL

Own true rendered all-pass maximum38 draws/17,616 triangles (main maximum8; geometry8 meshes/3,600 triangles) is within own budget. Whole37 captures max855 draws,7,258,518 triangles,930.1MB heap,74 textures; overview2,880,816tri exceeds2.2M and whole night exceeds3M. Actual Apple M4 Metal fps range14.6..41.6; not SwiftShader. Democity idle reported0ms; sustained tour timing unmeasured.

### 20. PASS

All37 required fresh PNGs read individually, all companion metadata errors[] and16 modules ready.720p HUD stays inside viewport. Final capture actions were all aerial12 then22, both read;511/487draws,2,949,518/4,584,964tri,30.0/28.8fps,0errors.

### 21. FAIL cross-seed; same-seed PASS

Two own deserialize calls and two same-seed restages preserve all counts and exact building centroids. Restages each217 resident GPU geometries; two own-deserializes each310 (initial250 was different camera/cache state, no invalid baseline comparison). Awaited native IDB save/load succeeds and preserves centroids. Restage seed7 on original terrain yields733 buildings vs fresh seed7 terrain750; missing coordinated terrain seed-reset API filed. Fresh seed7 fails density again;30% centroid shift unmeasured.

### 22. PASS API; timed run UNGRADED

Exactly8 seven-second stops. gotoStop rejects100, applies each target/hour immediately and emits correct democity:tour events. Starts/stops explicitly; no headless/autostart tour. Full56s progression not timed.

### 23. FAIL

Real deterministic240-step pre-roll reaches population3, jobs44,478 (capacity, not actual employment), money24,652.30, happiness.501675, four demands>.15. No added cash or private economic writes. Native daily net-13,473.31 makes extending pre-roll unsustainable; requirement8,000 actual residents remains unmet. Pollution/land-value regional histogram unmeasured.

### 24. PASS measured path; degradation UNGRADED

Democity init0ms; stage2,948.1ms seed1337 and3,136.8ms seed7, well below25s. Deterministic step cap, no wall-clock-dependent simulation branch; stage promise settles/errors0. Play-mode probe has0roads/0buildings/0landmarks and democity idle0ms. Catch/warn guard exists; absent-owner combinations not injected.

## Next round priorities

1. Replace the sparse120m frontage plan with a compact terrain-aware street pattern that produces1,400 actual lots, encloses the core street camera, and keeps industrial/service sites outside the civic park. Do not increase skyscraper counts to disguise empty blocks.
2. Plan a service mix and affordable pre-roll that supports real residents before extending simulation steps. Expose any necessary game balance integration through public owners; do not force grants or population.
3. Keep highways on feasible land slopes, improve ramps and bridge approaches, and make the industrial camera include its real port fixtures.
4. Reduce composed night and overview costs using owner profiling, improve public weather/effects preset selection, and choose useful pinned sun/shadow/lamp-pool regions.
5. Complete the remaining district/riverbank/seed/fallback measurements, refine civic shapes and register coordinated reset/legacy-load seams.

The cold/normal source path is loadable and ordinary play mode stays empty until the user builds. The staged demo's three residents must not be confused with the separately earned400+ ordinary-play city verified by the root integration task.

## Evidence files

`shots/democity/rdev1/{probe,contracts,cityfill,imgstats,tiling,play-init}.json`, `shots/democity/rdev1s7/{probe,cityfill,imgstats,tiling}.json`, all companion screenshot JSONs, and the complete absolute viewed manifest in `docs/builds/democity_r1.json`. Extra roadmask captures contain transient save/load toasts, but the same-session diff only grades road visibility pixels. No democity-only specular or omitted lamp-pool values are inferred.
