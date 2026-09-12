Traffic round 2 — **6.5/10, FAIL**

FAIL, 6.5/10. The API, density, lane following, shadows and lighting are substantially functional, but simplified fleet art, discontinuous motion, missing demonstrated roundabout yields, the absent visible peak queue and excessive night congestion remain below the CS2 bar.

API surface contract: **satisfied**. Acceptance behaviour is **not** fully satisfied. Console errors: **0**. Maximum whole-frame draw calls: **159** across prescribed captures, **183** including the independent full-density budget probe.
Calibration and scope

Read CRITIC.md, the traffic specification, ARCHITECTURE §§3/4/9/12/13/14, CS2-LOOK.md, traffic_r1, and the current traffic core-request decision. Viewed all eight cs2_1.jpg–cs2_8.jpg reference images before scoring. Reference cars have more convincing class silhouettes, glazing, wheel detail and shadow integration at the same zoom. Missing buildings or trees in the traffic-only showcase and inherited road/bridge shape are excluded from this grade. Shared working-tree edits belong to concurrent builders; git status alone cannot attribute them to traffic. No Math.random occurs in the traffic module.

All captures and browser probes used SIM_URL=http://127.0.0.1:5174, SIM_GL=metal, SIMBUILD_REF=/Users/martingrahn/.simbuild/ref. Browser pages blocked Vite HMR. The capture interruption was host ENOSPC, not an application exception; missing/corrupt captures were completed after central cache cleanup. Two earlier probe assumptions were corrected: raw nodeInfo arms are not the public intersections() records, and camera projection needs the camera matrix refreshed. verify.json supersedes the zero-skyline and null-props observations in extra.json.
Numbers and controlled image measurements

28 prescribed captures plus 27 controlled plate/LOD/step images = **55 images**, all individually viewed. Every completed capture reports traffic ready and errors=[]. Whole-frame triangles peak at **1,187,075** (street_6p5); that inherited whole-frame figure is recorded, not used as the traffic triangle budget. Traffic init peaks at **35 ms**, module time **1.2 ms** (skyline_17p5), and night module time **0.6 ms**. The independent full-density street probe reports **25 owned draws / 22,207 triangles**, 0.1 ms step time, zero textures, and a **179,927** full-frame triangle delta against density zero. Plate step times peak at 0.7 ms. Thirty seconds at clock speed 4 gives **0 MB** measured heap drift.

All 55 full-resolution frame p1 values are above zero (minimum **12.1576**) and maximum frame p99 is **246.7662**. Traffic-only captures and plates contain **zero all-channel 255 pixels**. Integrated HUD white text produces 0.07547% full-white pixels in all_22; that is not vehicle clipping.

The four plate states are A=all, B=vehicles off, C=shadows off, D=pools off, taken in one frozen page per camera/time. Masks use >12 channel difference exactly as specified. At junction noon, fleet/vehicle/shadow/pool masks contain 51,561 / 43,151 / 8,986 / 0 pixels; at night 2,076 / 1,026 / 486 / 911. In the exact cropRects lead landmark, mean chroma is **7.0391 at noon** and **28.1155 at night**, ratio **3.9942 ≥0.6**. Night vehicle luma p1/p50/p99 is 21.8676 / 102.8034 / 207.4. Golden-hour closeup has **77,222 shadow-mask pixels**: real casts, not just contact decals. No CSM dead-zone claim is carried forward.

Bright vehicle pixels >245 occupy **0%** of the frame in aerial_12, aerial_17p5 and skyline_12. LOD0→1 global mean absolute difference is **0.47981/255**; the pinned aerial four-step change outside the fleet mask is **0.02901/255**. The skyline/aerial cameras have no in-frame asphalt landmark 200–400 m from camera, so cropRects correctly omits that conditional landmark; no speckle failure is invented there. An ancillary junction-noon asphalt rectangle measures 0.3534% neighbour speckle, but junction is not an item-11 graded speckle camera, so it is not a failure.

Limits of the measurements: the exact tyre-contact annulus ratio, five per-vehicle LOD-mask edge movements, full explicit looping bus route, free-flow speed distribution and every conflict-pair gap were not established by the aggregate plates. They are not represented as quantitative passes or used to manufacture failures. The redEntries arrays in verify.json identify non-green crossings and include amber; they are **not** a count of confirmed red-light violations. The earlier apicheck zero-red result used the wrong raw-arm shape and is withdrawn.
API and acceptance checks

| Item | Independent result |
|---|---|
| 1 | FAIL: pedestrian crossing-transition y error 0.129746 m. Vehicle road-height max <0.0012 m. |
| 2 | Detail pieces and 1,248–1,564 LOD0 triangles are present; the visual finish remains well below CS2. |
| 3 | FAIL: rigid non-articulated semi and insufficient distinct catalogue silhouettes. Eleven kinds, 16 sampled colours and 61.11% achromatic pass. |
| 4 | Pass sampled lane/heading/side checks at all four hours; null-edge fraction 5.13–11.46%, under 12%. |
| 5 | FAIL visible four-car queue guarantee. No negative or undersized sampled same-lane gaps; phase advance reaches queued=0 and rises again. |
| 6 | FAIL: zero completed radial yield events in 20 s at noon and peak, versus ≥3. Phase structure, half-cycle swap and integrated direction/source pass. Strict red-entry count not claimed. |
| 7 | Lights 0/157 at noon, 39/39 at night. Head 4, tail 1.6, brake about 4.2, mast 7.5; pools and chroma pass measured checks. |
| 8 | Vehicle counts 86/157/240/39; dawn freight 18.60%, peak freight 5%; clear/refill works. |
| 9 | Sidewalk band scans pass; full figure and gait attributes present. Crossing-transition height defect is item 1. |
| 10 | Cast/receive flags, layer 5, order 50 and contact offset settings pass; real shadows observed. Exact per-vehicle darkening/length thresholds not fully measured. |
| 11 | FAIL trim shader band. Paint/glass/tyre/rim and measured bright-pixel checks pass. |
| 12 | Three LODs and triangle reductions pass; aggregate LOD and pinned step image changes pass. No origin pile. Individual bbox limits not fully measured. |
| 13 | FAIL position/heading discontinuities and missing render interpolation. |
| 14 | Corrected skyline frustum counts 132/207 at noon/peak; street vehicles/pedestrians present at both times and night_street. No road carpet seen. |
| 15 | Four valid border portals, peak external fraction 27.08%. Explicit bus spawn/despawn API works. Full looping-route and external lifecycle guarantees not established. |
| 16 | Measured owned/whole-frame budgets and heap probe pass. |
| 17 | Pass: all 28 prescribed captures traffic ready/errors empty, including integrated and 720. |
| 18 | Pass exercised API shapes, controls, reference identity, grid and serialization. |
| 19 | FAIL night congestion mean 0.340792; peak 0.504069. Counts and mean speed match live agents. |
| 20 | Pass: zero dangling after occupied-edge removal, new edge drivable within one second, empty graph zero fleet/one warning/no errors. |
| 21 | Pass: seeded first-20 poses and kind counts match for 1337; seed 7 changes all eleven kind counts. |
| 22 | Mast gate passes: 12→10 draws on trafficlight insertion; integrated mast=null, no duplicate traffic masts. Physical heads/poles present. |

Every specified callable exists: spawnVehicle, despawn, vehicle, flowGrid, outsideConnections, signalState, signals, setDensity, density, stats, forceLod, step, freeze, cropRects, serialize, deserialize, debug.setVisible and debug.lodHistogram. step(7) increments exactly seven; freeze preserves positions across 30 frames. Density zero empties, null refills. Serialization retains 39 vehicles and identical byKind; vehicle(id) is the world Map reference. flowGrid is a 65,536-entry Float32Array at size 256 and cellSize 8, and sample agrees with index. Non-intersection signalState is null. Invalid kind returns -1, explicit bus spawn returns a valid bus id, and despawn succeeds. Feature plates visibly remove the requested contributions.

verify.json uses the authoritative roads.intersections() arms and explicitly rebuilds staged integrated roads/props. At 12 and 22 green arms 7/9 mirror as green source=traffic while 5/3 are red; at 12.6 the sets reverse. The 20 Hz clock-stepped cycle probe uses the same 0.04 game-hours/real-second rate as setSpeed(1), retaining deterministic sampling under host load.
Ranked issues

1. **MAJOR — The catalogue remains visibly synthetic and the semi is not articulated**

At fleet_12 the hatchback/sedan/SUV silhouettes share the same rounded fastback construction, flat rectangular lamps and plate, simple circular wheel faces, and nearly identical roof treatment. The 18.5 m semi is one rigid stretched box-truck mesh; geometry.js has no separate 6.2 m tractor, 13.6 m trailer or fifth-wheel articulation. The police catalogue model shares the taxi-style yellow roof block. These are large, immediately visible differences from the reference vehicles at comparable zoom. Preserve the working pane and wheel separation while rebuilding the class-specific silhouettes and articulated rig. Item 3 fails.

Evidence: fleet_12.png; queue_12.png; src/modules/traffic/geometry.js.

2. **MAJOR — Vehicle motion jumps at edge transitions**

A 30-second pinned run sampled all live vehicles every 100 ms (two fixed steps) produced 15 position-jump failures and six heading-rate failures. The largest displacement was 11.45346 m in 100 ms and the largest angular rate 31.38215 rad/s, against speed × 0.1 + 0.5 m and 2.5 rad/s limits. Examples include highway edge 89↔91 transitions. index.js also renders the current fixed-step state with render(0), without the required render interpolation. Item 13 fails.

Evidence: apicheck.json: motion; apicheck.mjs; src/modules/traffic/index.js.

3. **MAJOR — Roundabout traffic does not demonstrate the required yield behaviour**

The corrected probe identifies the four non-ring radial arms through roads.intersections(): edges 81, 83, 86 and 80. At noon, six radial entries occurred during the first 20 seconds, but zero entering vehicles had first dropped below 1 m/s within 12 m of the ring and then entered. The peak run also recorded six entries and zero completed yield events. The requirement is at least three. Source uses a generic first-claim node reservation rather than a ring-priority decision. Item 6 fails on this measured subcriterion; integrated phase ownership and props read-through pass.

Evidence: verify.json: traffic.radials and traffic.cycles; verify.mjs; roundabout_12.png.

4. **MAJOR — The peak queue camera does not show the required stopped queue**

queue_17p5 is dominated by a bus immediately beside the camera, with one sedan clearly ahead at the stop line. It does not show four stopped vehicles in one evenly spaced queue. This is a showcase guarantee required by item 5, independent of the global queued counter. Same-edge gap checks pass and advancing the phase does discharge queues; preserve those fixes while staging a queue that is actually visible from the prescribed camera.

Evidence: queue_17p5.png; queue_17p5.json; apicheck.json: cycles.

5. **MAJOR — Night congestion remains above the acceptance ceiling**

The mean congestion over the first 30 seconds starting at 22:00 is 0.340792, compared with the required ≤0.10. This is a phase-advancing run, not a permanently red pinned-time capture: the probe advances 0.004 game hours per 0.1 agent seconds, matching Clock.dayLengthSeconds=600 at speed 1. Peak mean is 0.504069, and queues discharge to zero in the longer run. Count and average speed are honest; the night traffic behaviour/metric still misses item 19.

Evidence: verify.json: traffic.cycles; apicheck.json: cycles; src/core/clock.js.

6. **MINOR — Pedestrian crossing transition retains sidewalk height for one step**

At noon the independent scan finds a crossing pedestrian on edge 43, t=0.17375, at y=9.011711 when roads.sample(edge,t).y+0.08 is 8.881965: 0.129746 m too high. stepPeds changes state to cross without updating y in that branch; the next fixed step applies the crossing height. Update the pose at the state transition. Vehicle height residuals are under 0.0012 m; this is a narrow pedestrian item 1 failure.

Evidence: extra.json: extra.worstPed; apicheck.json: hours; src/modules/traffic/sim.js: stepPeds.

7. **MINOR — Trim material is outside its explicit material band**

The custom vehicle shader labels material slot 6 bumper / trim and assigns roughness 0.50 and metalness 0.28. Item 11 specifies trim roughness 0.25–0.4 and metalness ≥0.8. The rim branch is compliant at 0.26/0.92; paint, glass and tyres also satisfy their numeric bands. Correct the trim branch or separate nonmetallic bumpers from the specified trim surface.

Evidence: src/modules/traffic/materials.js:69–71; apicheck.json: api.meshes.

Strengths to preserve

- All 28 required/preset/integrated/720 captures are ready and error-free; all 55 captured images including controlled plates were viewed.
- Density reaches 86/157/240/39 vehicles at 6.5/12/17.5/22, with correct freight weighting and four real border portals.
- Lane/heading/speed-limit scans and same-lane minimum gaps pass at all four graded hours; world records have the required fields.
- Frozen-state determinism, density clear/refill, exact step count, live references, serialization, and road removal/addition/empty-graph behaviour pass.
- Vehicle shadows really render: 77,222 changed shadow pixels in the golden-hour plate. The historical claim that traffic casts no CSM shadow is not reproduced.
- Night headlights, taillights and pools work with the correct radiance bands; masked night/day lead-vehicle chroma ratio is 3.994.
- Traffic owns the 4,320-second phase, opposing arms change at the half-cycle, and rebuilt integrated props mirrors traffic with source=traffic and zero duplicate traffic masts.
- Low owned geometry and texture cost; the tested whole-frame traffic triangle delta is 179,927, and measured 30-second heap drift is 0 MB.

Per-shot notes

All paths below are under shots/traffic/r2. Each controlled plate was actually viewed; these are not file-existence checks.

| File | Observed content |
|---|---|
| aerial_12.png | Individual lane-bound coloured dashes; sparse occupied roads, no origin pile. |
| aerial_17p5.png | Rush-hour fleet is denser; long shadows remain individually distinguishable. |
| aerial_22.png | Sparse traffic and small light marks on a readable dark road grid. |
| all_12.png | Integrated baseline is an empty road graph with terrain and HUD; traffic is ready, and draws no duplicate masts. |
| all_22.png | Same empty integrated baseline under night light with HUD; no traffic error. |
| closeup_12.png | Vehicle panes, tyres and body separation are present, but surfaces and shapes remain simplified. |
| closeup_17p5.png | Strong vehicle shadows and warm paint response; simple smooth vehicle shapes remain evident. |
| closeup_22.png | Dark road and small cars retain coloured bodies and restrained light accents. |
| crossing_12.png | Full articulated stick-like figures are visible; clothing/hair shape remains very simple. |
| crossing_6p5.png | Pedestrian silhouettes occupy sidewalk/crossing area in dawn light. |
| fleet_12.png | All eleven catalogue instances visible; repeated passenger silhouettes, rigid long semi, yellow roof blocks on taxi/police. |
| headlights_22.png | Nearest foreground is mostly empty roadway; distant headlights and pools are present. |
| junction_12.png | Vehicles in multiple approaches, separate black mast heads and visible pedestrians. |
| junction_22.png | Small fleet under dark blue ambience; signal and vehicle lights visible without white-frame clipping. |
| junction_6p5.png | Dawn junction shows real shadows, sparse freight and readable crossings. |
| merge_12.png | Prescribed camera is obscured by inherited bridge/support geometry, so visual merge behaviour is not assessable here. |
| night_street_22.png | Nearby pedestrians and a small number of vehicles visible with head/tail lighting. |
| overview_12.png | Network and vehicles distribute across the map, without a pile at (0,0). |
| plate_aerial_12_A.png | Full frozen scene; bodies, shadows and applicable pools visible. |
| plate_aerial_12_B.png | Vehicle contributions removed; pedestrians, road, masts and background remain. |
| plate_aerial_12_C.png | Shadows/contact contributions removed; vehicle bodies remain and lose their grounding. |
| plate_aerial_12_D.png | Light pools removed; bodies remain; daytime image is visually unchanged. |
| plate_aerial_12_step4.png | Same aerial state after four fixed steps: small traffic displacement, stable surrounding scene. |
| plate_aerial_17p5_A.png | Golden-hour full scene has clearly visible long vehicle shadows. |
| plate_aerial_17p5_B.png | Vehicle contributions removed; pedestrians, road, masts and background remain. |
| plate_aerial_17p5_C.png | Shadows/contact contributions removed; vehicle bodies remain and lose their grounding. |
| plate_aerial_17p5_D.png | Light pools removed; bodies remain; daytime image is visually unchanged. |
| plate_closeup_17p5_A.png | Golden-hour full scene has clearly visible long vehicle shadows. |
| plate_closeup_17p5_B.png | Vehicle contributions removed; pedestrians, road, masts and background remain. |
| plate_closeup_17p5_C.png | Shadows/contact contributions removed; vehicle bodies remain and lose their grounding. |
| plate_closeup_17p5_D.png | Light pools removed; bodies remain; daytime image is visually unchanged. |
| plate_junction_12_A.png | Full frozen scene; bodies, shadows and applicable pools visible. |
| plate_junction_12_B.png | Vehicle contributions removed; pedestrians, road, masts and background remain. |
| plate_junction_12_C.png | Shadows/contact contributions removed; vehicle bodies remain and lose their grounding. |
| plate_junction_12_D.png | Light pools removed; bodies remain; daytime image is visually unchanged. |
| plate_junction_12_lod0.png | Forced detailed LOD: visible panes, mirrors, wheel faces and sharper cab details. |
| plate_junction_12_lod1.png | Same frozen layout at reduced LOD: body silhouettes soften and glazing detail reduces; global diff remains small. |
| plate_junction_22_A.png | Full frozen scene; bodies, shadows and applicable pools visible. |
| plate_junction_22_B.png | Vehicle contributions removed; pedestrians, road, masts and background remain. |
| plate_junction_22_C.png | Shadows/contact contributions removed; vehicle bodies remain and lose their grounding. |
| plate_junction_22_D.png | Night light pools removed while small vehicle bodies and lens lights remain. |
| plate_skyline_12_A.png | Full frozen scene; bodies, shadows and applicable pools visible. |
| plate_skyline_12_B.png | Vehicle contributions removed; pedestrians, road, masts and background remain. |
| plate_skyline_12_C.png | Shadows/contact contributions removed; vehicle bodies remain and lose their grounding. |
| plate_skyline_12_D.png | Light pools removed; bodies remain; daytime image is visually unchanged. |
| queue_12.png | Large truck occludes the left foreground; one sedan ahead, flat rear-lamp rectangles and pale wheel faces. |
| queue_17p5.png | Bus dominates the left foreground, one sedan clearly ahead; required four-car stopped queue absent. |
| roundabout_12.png | Ring and fed radial roads carry traffic; the still frame alone does not prove yielding. |
| skyline_12.png | Small coloured vehicles remain on roads, with no obvious sparkle or origin cluster. |
| skyline_17p5.png | Denser warm-hour fleet reads as dashes; inherited bridge geometry dominates the composition. |
| skyline_22.png | Dim traffic marks remain visible on distant carriageways. |
| street_12.png | Close vehicle and multiple pedestrians present; simple smooth shells and flat rear details. |
| street_12_720.png | Traffic remains visible at 1280×720; no UI overflow. |
| street_22.png | Cars and pedestrians remain visible in blue night ambience, with light pools. |
| street_6p5.png | Dawn fleet has freight vehicles and long directional shadows. |

Evidence files: apicheck.mjs/json (API, determinism, motion and graph edits), plates.mjs/json (frozen landmarks and feature isolation), extra.mjs/json (lights/material palette/budget), verify.mjs/json (corrected public-arm roundabout/integrated checks), pixels.py/json (full-resolution measurements), and summary.json (eight-view gauntlet). No module source, STATUS or other agent report was edited by this critic.
