# Traffic — independent critic, round 4

7.2/10 FAIL. Traffic r4 materially repairs r3 collisions, night congestion, route looping, trim, tyre clearance and the empty-graph shader error. It still misses first-cycle queue discharge, update/step/heap budgets, stopped-wheel correctness and two published data contracts. LOD1 glazing remains visibly below the CS2 quality bar. Zero console errors; all captures ready; maximum whole-frame draws 143.

## Evidence and scope

All eight CS2 reference images (cs2_1.jpg through cs2_8.jpg) were freshly inspected this round, together with CRITIC, the full traffic spec, CS2-LOOK and the required ARCHITECTURE sections. The score uses the reference at comparable zoom/time. Compared with r3 (6.7), the repairs are substantive, but the current fleet still reads as good indie work rather than AAA. No production files were edited by this critic.

The critic independently ran the standard 8-shot gauntlet, every extra required camera/time, integrated noon/night, the 720p capture, and seven same-load frozen plate sets: 28 unique regular PNGs plus 31 diagnostic PNGs. Every one of those 59 images was opened with the image reader. The final skyline noon capture includes official crops. Probe scripts are independent adaptations of this critic’s previous methods; builder results are treated only as claims.

All evidence is under `shots/traffic/r4/critic-probe/`. `shots/traffic/r4` is a symlink to `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/traffic/r4` to avoid the internal ENOSPC condition; builder evidence in `probe/` was preserved. System Chrome 152 / Metal on M4, port 5174, seed 1337, SIMBUILD_REF set; temporary profiles were external. Browsers ran sequentially and closed in finally blocks. No infrastructure stalls or discarded failed screenshots occurred in this round. `source-before.sha256` and `source-after.sha256` match every traffic source file.

The ordinary `all` screenshots contain no authored roads because democity is still a stub. Separate integration probes use the public roads API and traffic showcase setup to stage the deterministic populated graph under `all`: 157 vehicles/186 pedestrians at noon and 39/35 at night. The populated noon compliance trace runs 90 agent seconds. Its results are explicitly distinguished from the empty integrated screenshots.

## Ranked findings

### 1. major — Traffic misses the update, fixed-step and heap budgets

Fresh regular captures reach 2.9 ms at aerial_17p5 versus 1.6 ms, and 1.1 ms at aerial_22 versus 0.6 ms. The independent live speed-4 run reaches stepMs 2.4 versus 1.2 and heap drift +19.613941 MB over 30 seconds versus <4 MB. Geometry and draw budgets pass. Heap is a whole-page end-to-end measurement, not proof of a permanent traffic-only leak; nevertheless the exact specified test misses. Reduce per-frame work and allocation before claiming the budget met.

Evidence: `shots/traffic/r4/critic-probe/extra.json`.

### 2. major — Peak queues do not clear during the first signal cycle

After the required pin and 600 warm steps, advance the clock at speed-1 equivalence for the 1.2-hour / 30-agent-second cycle starting at 17.5. The minimum published queued count is 47, never below 2. It reaches 1 only later across the 90-second trace as activity falls toward night; that does not satisfy the first-cycle criterion. Noon minimum is 15. Preserve the repaired bumper gaps while resolving the queue requirement.

Evidence: `shots/traffic/r4/critic-probe/probe.json`.

### 3. major — LOD1 loses the glazing that makes the close vehicles convincing

The same-pose L0/L1 plates show separate dark windows in L0 turning into smooth, nearly featureless coloured cabins in L1. This is conspicuous in closeup_12 and closeup_17p5 on middle-distance cars and buses. Whole-frame LOD meanAbs is only 0.284539/255, so this is a visible quality weakness against the CS2 calibration, not a fabricated failure of the mean-difference threshold. Retain a readable window band and pillars through the switch. Exact five-vehicle mask-box parity remains inconclusive because the proxy ROIs include shadows and overlaps.

Evidence: `shots/traffic/r4/critic-probe/plate_junction_12_L1.png`.

### 4. minor — Fully stopped queued vehicles still rotate their wheels

stationary.mjs pins noon, warms 600 steps, then records each 50 ms step while advancing phase. It finds 690 samples with speed zero before and after, displacement <1e-10 m, and spin increasing. Maximum increment is 0.011904762 rad/step. Van 415 on edge 94 stays at x=38,z=-143.6 while spin rises 973.899041 to 973.909156. sim.js:358–365 integrates spin from moved computed before the lead/stop clamp; use actual committed path distance after that clamp.

Evidence: `shots/traffic/r4/critic-probe/stationary.json`.

### 5. major — The junction exclusion exceeds its every-sample ceiling during phase advance

All four pinned-hour probes and their fixed-hour 30-second runs remain below 12%. However, the required advancing-clock traces reach edgeId=null fractions 16.666667% from noon and 16.260163% from 17.5; the populated integrated noon trace repeats 16.666667%. This report applies §2’s every-sample ceiling to those samples too, and explicitly distinguishes this from the passing fixed-hour results. Do not mask the excess by changing agent identities or counting those agents as lane-valid.

Evidence: `shots/traffic/r4/critic-probe/probe.json`.

### 6. minor — Empty-graph stats report an emissive mast that is not drawn

The zero-head render now succeeds without the r3 traffic:mast:lens shader error. After deleting every road edge and allowing a real render, vehicles, own draws and own triangles are all zero, but stats().emissive.mast remains 7.5 instead of null. §2 says this field is null whenever no mast is drawn. The normal props takeover is correct (7.5 to null; 20 to 18 draws).

Evidence: `shots/traffic/r4/critic-probe/follow.json`.

## Numeric results

- Regular 28-shot maximum: 143 draws, 1,173,935 whole-frame triangles; diagnostic forced-LOD maximum: 1,223,990 triangles. No capture exceeds 200 draws or 3,000,000 triangles. Whole-frame triangles include roads and render passes.
- Sampled own traffic maxima across plates: 26 draws and 88,612 triangles (forced LOD0). Normal peak budget probe: 26 draws/21,840 triangles. Full-density minus empty-fleet delta: 64,952 submitted whole-frame triangles, below 320,000. Declared budget is exactly 60 draws/300,000 triangles. Added textures: 0. Maximum regular traffic init: 14 ms.
- Regular update maxima: 2.9 ms daytime and 1.1 ms night. The separate 30-second speed-4 run records 2.1 ms update and 2.4 ms fixed-step maxima. Heap bytes 130,067,182 → 150,633,890 (+19.613941 MiB); performance.memory is available, so the prescribed skip does not apply. This test observes page heap, with GC timing and neighbour work included; it does not establish a permanent isolated leak.
- Zero captured console errors and traffic ready in all 59 images. The empty-graph probe logs exactly one expected traffic warning. Populated all setup also records expected props-before-roads and unavailable junction-preset warnings while staging, not missing-road-API errors.
- Native-resolution regular luma p1 minimum 12.5828; p99 maximum 246.7662. Maximum all-white fraction 0.075473% is in the integrated HUD, not a traffic lamp. Relevant night traffic frames stay below the 0.05% white-pixel limit. All percentiles per image are in pixels.json.
- Junction noon lead rect [1651,707,173,114], masked vehicle pixels 2913, mean chroma 8.749399; junction night rect [675,457,84,55], 821 pixels, mean chroma 24.191230. Night/noon ratio 2.764902 ≥ 0.60.
- Frozen graded aerial12/aerial17.5/skyline12 vehicle-mask bright-luma fraction: 0% of frame for each. Exact far-asphalt speckle cannot be graded at those three cameras: the conditional landmark is absent there. cropRects is implemented and produces the lead landmark; auxiliary eligible far boxes yield 0.354004% junction12, 0.329590% junction6.5, and 0.018311% closeup17.5. The two auxiliary exceedances are not falsely assigned to the three named-camera gate.
- Junction forced LOD0/1 meanAbs 0.284539/255 (<4). Approximate five-ROI mask-box edge differences 4,4,4,1,2 px include shadows/overlapping vehicles and are not the specified isolated vehicle-mask measurement; exact ≤2-px certification is unresolved. Aerial12 step4 outside-fleet meanAbs 0.011130/255 (<3).
- Trim triangle-area maximum: 3.009784% (hatchback LOD0), below 4%. LOD0 per-class triangles range 1,296–1,964; all class minima pass. LOD1 fractions and LOD2 counts pass the source/geometry checks. Rotating tyre vertices on 29 matched visible instances have maximum lowest-vertex clearance 0.016584429 m, below 0.02 m. This is the actual shader-rotation geometry in local road coordinates, not a complete rendered front/rear bridge contact proof.

| Pinned hour | Vehicles / pedestrians | Max road-plane error m | Max lateral error m | Max heading error rad | Minimum same-lane gap m | Null-edge % | Freight % | Outside-origin % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 6.5 | 85 / 63 | 0.001454 | 0.000036 | 0.000164 | 1.944934 | 2.353 | 21.176 | 50.588 |
| 12 | 157 / 186 | 0.001213 | 0.000028 | 0.011887 | 1.942162 | 3.822 | 10.191 | 45.860 |
| 17.5 | 240 / 260 | 0.001225 | 0.000049 | 0.005111 | 1.938484 | 2.917 | 3.750 | 45.417 |
| 22 | 39 / 35 | 0.000013 | 0.000035 | 0.000270 | 32.959941 | 0.000 | 10.256 | 84.615 |

At all four pinned samples: zero lane, direction, heading, gap or overlap violations; maximum speed ratio 1.05. Pedestrian road-plane error is sub-millimetre; stride variance exceeds 0.05 at every hour. The additional fixed-hour 30-second runs have max null fractions 10.4651%, 7.6433%, 8.3333%, 5.1282%, respectively, with zero overlap and ≤12% pedestrian crossings.

| Showcase / start | Duration | Gap / overlap / jump / yaw / red-entry violations | First-cycle minimum queued | Full-trace minimum queued | First 30 s mean congestion | Max null % |
|---|---:|---|---:|---:|---:|---:|
| traffic / 12 | 90 s | 0 / 0 / 0 / 0 / 0 | 15 | 15 | 0.477575329 | 16.666667 |
| traffic / 17.5 | 90 s | 0 / 0 / 0 / 0 / 0 | 47 | 1 | 0.491246322 | 16.260163 |
| traffic / 22 | 90 s | 0 / 0 / 0 / 0 / 0 | 0 | 0 | 0.080669247 | 8.333333 |
| all / 12 | 90 s | 0 / 0 / 0 / 0 / 0 | 15 | 15 | 0.477575329 | 16.666667 |

The three traffic traces use 100 ms samples / two 50 ms fixed steps and explicit world-clock advancement equivalent to speed 1. The r3 large merge overlaps and heading jumps do not recur. Recorded radial wait/entry rows are not all independent events: after deduplicating agent IDs there are two at noon and three at peak in the first 20 seconds (raw rows 7/9). Do not claim seven/nine distinct yields. This provides partial peak evidence, not a complete independent geometric ring-pair clearance proof.

## API contract, item by item

- **world.traffic ownership and record fields:** Source preserves maps/section and publishes required fields. Sampled lane/heading/height/count/speed records are coherent. The every-sample null-edge ceiling fails during clock advance; pinned hours pass. Lifetime ID uniqueness is source-reviewed, not exhaustively stress-tested.
- **spawnVehicle(kind, route):** Valid IDs and invalid input behaviour verified. Explicit authored four-edge 150 m rectangular bus route [102,103,104,105] loops three laps over 200 s; first-edge returns at steps 1131/2251/3371, route history remains bounded. This replaces the invalid short-ring route used during r3 investigation.
- **despawn(id):** Returns true and removes the record; invalid lookup returns null. Separate same-frame per-instance removal was not exhaustively asserted for all classes.
- **vehicle(id):** Matches world.traffic.vehicles.get(id) by reference.
- **flowGrid():** Correct keys, size 256, cellSize 8, Float32Array length 65536 and live version verified. Exact off-road zeros, busiest-cell positivity and sample/index equality remain unmeasured here.
- **outsideConnections():** Four portal records at (-980,-40), (-1000,340), (1000,140), (40,-1000), with valid avenue/highway types and border positions. Full camera/frustum spawn/despawn audit remains unmeasured.
- **signalState(nodeId), signals():** All 16 signalised nodes return states; half-cycle changes and every-arm-green over twelve phase samples pass. Source owns phase without reading props. Integrated 60-arm checks at both 12/22 match props green state and source=traffic. Non-signalised-null behaviour source-reviewed; not a separately recorded invalid-node assertion.
- **setDensity(v), density():** Zero empties both maps after 60 fixed steps, null refills; source getter and clamping reviewed. Fallback profile yields exactly the same targets at all four hours.
- **stats():** Counts/class counts, mean speed and congestion formula match sampled maps. Geometry, texture and emissive data recorded. Fails null mast reporting when empty. Required time and heap limits fail; not concealed by lower isolated samples.
- **forceLod(n|null):** Works in fresh same-page plates; LOD histogram and geometry change as requested. Mean-frame parity passes; exact isolated five-box parity unresolved.
- **step(n=1):** Synchronous stepping moves frozen agents deterministically and supports all traces. Exact integer returned step-counter increment was source-reviewed but not saved as a separate runtime assertion.
- **freeze(v):** Every vehicle position remains unchanged over 30 animation frames; step still moves them while frozen.
- **debug.setVisible / lodHistogram:** Vehicles, shadows and pools tested by seven plate sets; masts tested via ownership event. Histogram available. Exact isolation of the separate pedestrians and lamps debug layers is source-reviewed, not independently pixel-certified.
- **cropRects:** Implemented, with official named regular crops and direct __sim.cropRects plate metadata. Lead vehicle rects present. Conditional far-asphalt landmark absent in the three named distant cameras; no fabricated replacement region is graded.
- **serialize / deserialize:** Return shape reviewed; deserialize true and 157 vehicles plus identical byKind counts preserved. Record identity roundtrip is not required.
- **roads:changed / props:changed:** Occupied edge 81 removal leaves staleVehicles=0 after one frame; new edge 100 receives vehicle 358 within 20 fixed steps. Empty graph renders without errors and logs once. Pedestrian stale references specifically were not asserted after the occupied-edge deletion. Fake trafficlight item removes fallback masts within one frame.
- **determinism / events / time:** Seed 1337 pinned insertion-order first20 and all byKind counts identical across fresh loads; seed7 changes 10/11 counts. No Math.random in traffic. Wall clock is used for profiling; agent/time integration is source-reviewed. Per-frame event-rate instrumentation was not added.

apiContractOk is false because the observed §2 null-edge ceiling and empty-graph mast-stat contract miss; it is not a claim that the whole API is absent or broken.

## Acceptance checklist

PASS below means the stated measured subchecks passed; PARTIAL explicitly withholds certification of unmeasured subclauses. Unmeasured limits are not converted into invented failures. FAIL items correspond to acceptanceFailed.

1. **Wheels on the road, nothing floating, nothing sunk. — PARTIAL.** Road-plane and rotating-tyre contact checks pass; no gross float in close views. Merge columns obstruct the required bridge-pitch visual verification.
2. **Vehicles read as vehicles at close range. — PASS measured / visual.** All per-class minima pass, and near catalogue/queue vehicles have identifiable panes, tyres/hubs, lamps, plates and roof planes. LOD1 visual weakness is recorded separately at farther distances.
3. **Fleet variety. — PARTIAL.** All eleven silhouettes and two liveries are present. Visible noon body-buffer subset has 15 colours and 70.909% achromatic (39/55); this culled subset cannot certify the full-fleet 55–70% distribution. No uninterrupted 12-vehicle noon queue was available. Per-body dimensions versus protruding mirrors were not exhaustively isolated.
4. **Lane discipline, correct side, correct direction. — FAIL §2 exclusion ceiling.** All tested non-null vehicles satisfy lane/direction/heading. Fixed-hour exclusion cap passes, advancing-clock cap does not; see issue 5 and the explicit scope interpretation.
5. **Car-following: no interpenetration, real queues. — FAIL.** Gap and speed ceilings pass; a four-car stopped peak queue is visible. First-cycle global queued never falls below 2, and zero-speed spin persists.
6. **Traffic-light compliance and intersection behaviour. — PARTIAL.** Three-cycle traffic and populated-all noon traces show no red-entry violations; phase and integrated mirroring pass. Three unique peak radial wait/entry agents are recorded. Green-stop >2 s and clearing already-entered vehicles within all-red time were not separately asserted; no universal compliance certificate is claimed.
7. **Night is headlights, taillights and pools — not glowing toys. — PASS measured / PARTIAL subclauses.** Night head/tail values 4.0/1.6; brake maximum 4.2; mast 7.5 where live. Lights/chroma/night white pixels and readable body checks pass. Pool exact dimensions/falloff/lens ratio and placement of every white pixel are not independently quantified.
8. **Density follows the hour, not a constant. — PASS measured / PARTIAL distribution.** Hour counts, freight shares and fallback targets pass. Exact per-100 m alley/gravel occupancy and highest highway density remain source/visual rather than exhaustive numeric certification.
9. **Pedestrians on the sidewalk. — PARTIAL.** Sidewalk figures, limb structure, speed range, phase variance and height checks are satisfactory. Exact band occupancy, child proportion, every crossing’s 3 m crosswalk distance and six-colour distribution are not fully re-probed.
10. **Shadows and contact. — PARTIAL.** Long directional shadows and contact patches are visible; shadow toggles work. Exact per-vehicle 1.8× long-axis, 15–35% contact-darkening annulus and ≤0.45 shadow-core ratios are unmeasured. Static plates alone do not prove flicker absence during camera motion.
11. **Materials: paint, not plastic; no sparkle; no clipping. — PARTIAL.** Source material ranges and measured trim ≤4% pass. Named-camera masked bright fractions are zero. Conditional far-asphalt landmark absent in those cameras prevents the precise speckle statistic there; auxiliary results are reported without silently substituting their cameras.
12. **LOD, culling, and no pile at the origin. — PARTIAL.** LOD geometry/culling and no-origin-pile checks pass; meanAbs and outside-fleet step diff pass. Exact five isolated vehicle-mask boxes remain unresolved. LOD1 glazing visibly loses quality.
13. **Motion is continuous. — PASS measured / PARTIAL dispersion.** All sampled motion/jump/yaw checks pass across three 90-second traffic traces and populated integration. Independent free-flow speed dispersion was not separately measured.
14. **Reads correctly at every zoom. — PASS measured / visual.** Required network/zoom captures contain readable traffic, opposed directions and density changes. Low-sun haze, empty democity and obstructing merge columns are attributed to neighbours/staging rather than fabricated traffic faults.
15. **Outside connections (ARCHITECTURE §15). — PARTIAL.** Four valid portals, >15% outside-origin peak share and looping bus route pass. Exact spawn/despawn visibility over a 20-second frustum log remains unmeasured.
16. **Budget — traffic is graded on what traffic owns. — FAIL.** Draw/geometry/init/texture budgets pass; update time, step time and specified heap drift fail with concrete own measurements.
17. **`ready` in the integrated shots. — PASS.** All 28 regular and 31 plate captures ready, errors empty. Integrated named screenshots show the legitimate empty democity state. No missing-road-API warning.
18. **API contract. — FAIL.** API functions and many runtime behaviours work; §2 data contracts fail as recorded. Remaining exact API subchecks are disclosed above.
19. **`stats` is live and honest. — PASS measured.** Count and mean speed agree with records. First-cycle congestion peak mean .491246 and night mean .080669; night endpoint .090472. This repairs r3 night congestion; queue failure is still separate.
20. **Reacts to the road graph. — PARTIAL.** Removed-edge vehicle invalidation, new-edge one-second usability and empty-graph robustness pass. Specific removed-edge pedestrian references were not asserted; zero-head mast-stat defect is recorded under API.
21. **Determinism, graded from a pinned state. — PASS.** Pinned first20/byKind determinism and seed7 10/11 changed class counts pass. No Math.random or simulation wall-clock integration found.
22. **Fallback signal masts, only where `props` is not live. — PASS measured ownership / PARTIAL geometry.** Traffic-only mast rendering and real props mirror pass; adding trafficlight item drops draws 20→18 in one frame and emissive mast→null. Integrated mast is null. Exact mast physical dimensions are source-reviewed; empty no-head statistics still violate §2.

## Every captured image

All paths below are relative to the project and inside the independent critic-probe directory. Regular rows also provide the official capture stats.

| File | Draws | Triangles | Traffic ms | What was seen |
|---|---:|---:|---:|---|
| `shots/traffic/r4/critic-probe/aerial_12.png` | 79 | 434634 | 1.800 | Coloured individual vehicles occupy both travel directions across the grid; no pile at the origin. |
| `shots/traffic/r4/critic-probe/aerial_22.png` | 55 | 424314 | 1.100 | Sparse traffic and small night points; the road grid stays dark without a black frame. |
| `shots/traffic/r4/critic-probe/aerial_17p5.png` | 83 | 438666 | 2.900 | Substantially denser queues and long shadows; body colours remain distinguishable. |
| `shots/traffic/r4/critic-probe/street_12.png` | 131 | 1097994 | 1.000 | Crossing sedan and queued white/yellow cars show wheels, glazing and lamps; broad smooth panels still look synthetic. |
| `shots/traffic/r4/critic-probe/street_22.png` | 65 | 1056330 | 0.700 | A nearby white vehicle casts a forward pool; pedestrian figures and body colour remain readable. |
| `shots/traffic/r4/critic-probe/street_6p5.png` | 127 | 1080434 | 0.500 | White van/SUV and bronze wagon cast warm long shadows; the farther bus loses its glazing detail. |
| `shots/traffic/r4/critic-probe/street_12_720.png` | 131 | 1097994 | 0.900 | The junction remains readable at 1280×720 without UI overflow. |
| `shots/traffic/r4/critic-probe/skyline_12.png` | 87 | 721284 | 0.900 | Tiny coloured traffic dashes are distributed over the grid and bridges; no origin stack or white sparkle visible. |
| `shots/traffic/r4/critic-probe/skyline_22.png` | 67 | 710148 | 1.000 | Very sparse, faint light points at this zoom; traffic is hard to read but the image is not crushed. |
| `shots/traffic/r4/critic-probe/skyline_17p5.png` | 124 | 851756 | 2.300 | Low-sun haze reduces distant contrast; this is substantially environment lighting rather than vehicle clipping. |
| `shots/traffic/r4/critic-probe/closeup_12.png` | 107 | 958988 | 0.600 | Nearby white and yellow cars have recognisable details; middle-distance LOD1 cabins become smooth blobs. |
| `shots/traffic/r4/critic-probe/closeup_22.png` | 61 | 929184 | 1.000 | An isolated white vehicle has small red rear lights and a forward pool without a giant glowing lens. |
| `shots/traffic/r4/critic-probe/closeup_17p5.png` | 143 | 994440 | 1.300 | Foreground queue contains varied classes with long shadows; farther buses and cars lose window bands. |
| `shots/traffic/r4/critic-probe/overview_12.png` | 59 | 520684 | 2.200 | The whole network has distributed traffic and no pile of unused instances at the origin. |
| `shots/traffic/r4/critic-probe/junction_6p5.png` | 123 | 925894 | 0.700 | Near bronze SUV has visible details and directional contact; west-side van is simplified at LOD1. |
| `shots/traffic/r4/critic-probe/junction_12.png` | 119 | 945654 | 0.900 | Silver car in the box, short approach queues, small mast heads; both stopped and moving arms are legible. |
| `shots/traffic/r4/critic-probe/junction_22.png` | 61 | 895634 | 0.200 | Sparse white car and soft light pool; headlights do not dominate the frame. |
| `shots/traffic/r4/critic-probe/queue_12.png` | 118 | 938440 | 0.700 | The camera-facing approach is largely clear while another car crosses; no continuous 12-vehicle queue is available for adjacency grading. |
| `shots/traffic/r4/critic-probe/queue_17p5.png` | 130 | 954904 | 1.100 | Four stopped vehicles on the right approach, a foreground taxi and opposing van; broad plastic panels remain evident. |
| `shots/traffic/r4/critic-probe/crossing_6p5.png` | 111 | 903406 | 0.600 | Foreground waiting pedestrian has head, torso, arms and legs with a foot-level shadow; white van opposite. |
| `shots/traffic/r4/critic-probe/crossing_12.png` | 115 | 930298 | 0.400 | Blue pedestrian walks near the crossing with a car in the box; limbs are legible but blocky. |
| `shots/traffic/r4/critic-probe/merge_12.png` | 102 | 1173935 | 0.900 | Bridge columns obscure the intended merge view; distant highway cars are visible, but body pitch cannot be visually certified here. |
| `shots/traffic/r4/critic-probe/fleet_12.png` | 116 | 1080563 | 1.100 | Eleven catalogue classes include identifiable bus, truck, articulated semi, motorbike, taxi and police; plates/lamps read, cargo panels remain flat. |
| `shots/traffic/r4/critic-probe/roundabout_12.png` | 112 | 663335 | 2.700 | Vehicles occupy the ring and fed radial roads; smooth LOD1 bodies dominate this scale. |
| `shots/traffic/r4/critic-probe/headlights_22.png` | 97 | 797988 | 0.400 | Two oncoming white vehicles have soft pools on the crosswalks; bodies remain readable. |
| `shots/traffic/r4/critic-probe/night_street_22.png` | 121 | 1005396 | 0.800 | Sparse avenue traffic, a partial foreground red pool and distant oncoming vehicle; pedestrians remain visible. |
| `shots/traffic/r4/critic-probe/all_12.png` | 32 | 163894 | 0.300 | Undeveloped map and HUD: democity is still a stub with no authored network. This validates ready/empty-state behaviour only. |
| `shots/traffic/r4/critic-probe/all_22.png` | 32 | 163894 | 0.100 | Same empty integrated map at night with a readable HUD; this is not populated-city visual evidence. |

Same-page frozen diagnostic plates (A normal; B fleet hidden; C shadows hidden; D pools hidden):

- `shots/traffic/r4/critic-probe/plate_junction_12_A.png` — junction 12: Frozen normal fleet, body positions, shadows and applicable light pools visible.
- `shots/traffic/r4/critic-probe/plate_junction_12_B.png` — junction 12: Vehicles, their shadows and pools removed; pedestrians and masts remain.
- `shots/traffic/r4/critic-probe/plate_junction_12_C.png` — junction 12: Vehicle/pedestrian cast shadows and contact darkening removed while body positions remain fixed.
- `shots/traffic/r4/critic-probe/plate_junction_12_D.png` — junction 12: Pools removed; body and lens positions remain fixed. At daylight this matches A because headlight pools are off.
- `shots/traffic/r4/critic-probe/plate_junction_12_L0.png` — junction 12: Forced LOD0 restores readable separate dark panes on the same five nearby vehicles.
- `shots/traffic/r4/critic-probe/plate_junction_12_L1.png` — junction 12: Forced LOD1 visibly removes most glazing, leaving smooth coloured cabins at identical poses.
- `shots/traffic/r4/critic-probe/plate_junction_22_A.png` — junction 22: Frozen normal fleet, body positions, shadows and applicable light pools visible.
- `shots/traffic/r4/critic-probe/plate_junction_22_B.png` — junction 22: Vehicles, their shadows and pools removed; pedestrians and masts remain.
- `shots/traffic/r4/critic-probe/plate_junction_22_C.png` — junction 22: Vehicle/pedestrian cast shadows and contact darkening removed while body positions remain fixed.
- `shots/traffic/r4/critic-probe/plate_junction_22_D.png` — junction 22: Pools removed; body and lens positions remain fixed. At daylight this matches A because headlight pools are off.
- `shots/traffic/r4/critic-probe/plate_aerial_12_A.png` — aerial 12: Frozen normal fleet, body positions, shadows and applicable light pools visible.
- `shots/traffic/r4/critic-probe/plate_aerial_12_B.png` — aerial 12: Vehicles, their shadows and pools removed; pedestrians and masts remain.
- `shots/traffic/r4/critic-probe/plate_aerial_12_C.png` — aerial 12: Vehicle/pedestrian cast shadows and contact darkening removed while body positions remain fixed.
- `shots/traffic/r4/critic-probe/plate_aerial_12_D.png` — aerial 12: Pools removed; body and lens positions remain fixed. At daylight this matches A because headlight pools are off.
- `shots/traffic/r4/critic-probe/plate_aerial_12_step4.png` — aerial 12: Four fixed steps produce only small agent motion; outside-fleet mean absolute difference is 0.011130/255.
- `shots/traffic/r4/critic-probe/plate_aerial_17p5_A.png` — aerial 17.5: Frozen normal fleet, body positions, shadows and applicable light pools visible.
- `shots/traffic/r4/critic-probe/plate_aerial_17p5_B.png` — aerial 17.5: Vehicles, their shadows and pools removed; pedestrians and masts remain.
- `shots/traffic/r4/critic-probe/plate_aerial_17p5_C.png` — aerial 17.5: Vehicle/pedestrian cast shadows and contact darkening removed while body positions remain fixed.
- `shots/traffic/r4/critic-probe/plate_aerial_17p5_D.png` — aerial 17.5: Pools removed; body and lens positions remain fixed. At daylight this matches A because headlight pools are off.
- `shots/traffic/r4/critic-probe/plate_skyline_12_A.png` — skyline 12: Frozen normal fleet, body positions, shadows and applicable light pools visible.
- `shots/traffic/r4/critic-probe/plate_skyline_12_B.png` — skyline 12: Vehicles, their shadows and pools removed; pedestrians and masts remain.
- `shots/traffic/r4/critic-probe/plate_skyline_12_C.png` — skyline 12: Vehicle/pedestrian cast shadows and contact darkening removed while body positions remain fixed.
- `shots/traffic/r4/critic-probe/plate_skyline_12_D.png` — skyline 12: Pools removed; body and lens positions remain fixed. At daylight this matches A because headlight pools are off.
- `shots/traffic/r4/critic-probe/plate_closeup_17p5_A.png` — closeup 17.5: Frozen normal fleet, body positions, shadows and applicable light pools visible.
- `shots/traffic/r4/critic-probe/plate_closeup_17p5_B.png` — closeup 17.5: Vehicles, their shadows and pools removed; pedestrians and masts remain.
- `shots/traffic/r4/critic-probe/plate_closeup_17p5_C.png` — closeup 17.5: Vehicle/pedestrian cast shadows and contact darkening removed while body positions remain fixed.
- `shots/traffic/r4/critic-probe/plate_closeup_17p5_D.png` — closeup 17.5: Pools removed; body and lens positions remain fixed. At daylight this matches A because headlight pools are off.
- `shots/traffic/r4/critic-probe/plate_junction_6p5_A.png` — junction 6.5: Frozen normal fleet, body positions, shadows and applicable light pools visible.
- `shots/traffic/r4/critic-probe/plate_junction_6p5_B.png` — junction 6.5: Vehicles, their shadows and pools removed; pedestrians and masts remain.
- `shots/traffic/r4/critic-probe/plate_junction_6p5_C.png` — junction 6.5: Vehicle/pedestrian cast shadows and contact darkening removed while body positions remain fixed.
- `shots/traffic/r4/critic-probe/plate_junction_6p5_D.png` — junction 6.5: Pools removed; body and lens positions remain fixed. At daylight this matches A because headlight pools are off.

## Strengths to preserve

- Fresh fixed-hour checks and three 90-second traffic traces have zero sampled negative gaps, gap-threshold violations, jumps, excessive yaw or red-stop-line entries; a populated integrated noon trace repeats those results.
- Night congestion is repaired: first 30-second mean 0.080669 and endpoint 0.090472, with all 39 vehicles lit; noon headlights are all off. Masked night body chroma is 2.764902 times noon.
- The explicit four-edge bus loop completes three laps without unbounded route growth, jumps or heading violations. New road edges become usable within one agent second and removed occupied edges leave no stale vehicle references after one frame.
- Actual rotating tyre geometry stays within 0.016585 m of the contact plane in the sampled visible instances. Trim area now tops out at 3.009784%, fixing the prior excessive trim.
- The 11-class catalogue, procedural paint variation, restrained lamps, visible pedestrian limbs and directional shadows should be preserved. All 59 captures are ready and error-free; traffic source hashes remain unchanged.
- Pinned seed 1337 repeats exactly for the first 20 insertion-order records and all class counts; seed 7 changes 10 of 11 class counts. Props mirrors all 60 checked signal arms at both noon and night, and traffic masts correctly yield to props.

## Reproduction and limits

Use `SIM_URL=http://127.0.0.1:5174 SIM_GL=metal SIMBUILD_REF=/Users/martingrahn/.simbuild/ref SIM_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" TMPDIR=/Volumes/ExtDrive/simbuild-tmp`. Python pixel analysis uses `PYTHONPATH=/Volumes/ExtDrive/SimBuild-verification-2026-09-06/python-deps`. Run own `probe.mjs`, `extra.mjs`, `follow.mjs`, `stationary.mjs`, and `plates.mjs` one browser process at a time, with Node `--preserve-symlinks-main`. The saved `follow.json` predates a later stationary block appended to follow.mjs; authoritative stationary evidence is the separately executed stationary.mjs/stationary.json. No extra future run is claimed.

The report deliberately retains unresolved precise pixel/API clauses. It does not turn builder measurements into independent evidence or declare a full acceptance pass from partial coverage. Timing is actual System Chrome Metal measurement, not an FPS score; runtime load can influence timing, but the binding measured misses remain recorded. Heap drift is an end-to-end test, not leak attribution. The empty all screenshots are not populated-city evidence; only the explicitly staged all probes are. Existing neighbour/source work was shared and frozen: broad git status cannot establish which agent authored each earlier change. No production changes, no new core request and no neighbour repairs were made during this review.
