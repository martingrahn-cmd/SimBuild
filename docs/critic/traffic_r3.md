# Traffic r3 — independent critic

6.7/10 FAIL. Normal-route motion, seeded density and night colour improved, but merge collisions, a stalled explicit loop, empty-graph shader errors, excessive trim coverage, coarse tyre clearance and undischarged queues remain. Independent 28-shot matrix plus 31 frozen plates inspected; unmeasured subcriteria are explicitly retained as limits.

## Scope and evidence
Read the full CRITIC role, traffic specification, architecture contracts/budgets, CS2-LOOK and previous critic2; freshly viewed all eight CS2 references before grading. Art calibration: ref1 has composed queues and articulated freight; ref5 has restrained glazing/pillars, believable body/tyre/plate detail; ref8 retains coloured bodies and pedestrians under night lamps. The fleet is stronger than r2 but remains between competent synthetic and good indie rather than AAA. Score is not an average of checked API boxes.

No production source was changed. The shared working tree contains other agents’ changes and is not evidence of traffic ownership violations. Traffic source was read in full. Parent held production globals frozen through this review. Same live Vite5174, seed1337/high, explicit system Chrome152.0.7977.76, ANGLE Metal Apple M4, 1920×1080 except street_12_720. Every final image listed below was personally opened with the image reader. Browser processes ran singly and closed in finally.

Storage: shots/traffic/r3 is a symlink to /Volumes/ExtDrive/SimBuild-verification-2026-09-06/traffic/r3 because internal disk was full; all critic-owned evidence is under critic-probe and builder evidence is preserved. TMPDIR points at the external verification tmp directory. PIL/numpy were loaded with external PYTHONPATH. The infrastructure interruption did not rerun completed evidence.

28 regular official-helper captures (8-camera/time gauntlet plus declared/extra/720/integrated captures); 31 frozen plates. The required junction12/22 and final skyline12 captures have official --crops files. Controlled same-page plates store the direct __sim.cropRects() producer result in .metadata.json; no landmarks are fabricated or transferred between separate page loads. For each plate set traffic.freeze(true), fixed agent stepping, three settling render frames per feature toggle and global screenshot freeze keep poses matched. Native PNG analysis uses max-channel A/B differences >12, A/C shadow and A/D pool subtraction to isolate vehicle masks. The initial fading-boot plate diagnostic was corrected and overwritten at the same owned filenames before final inspection; only final plates are graded.

Full-resolution p1/p50/p99 and clipping for every regular shot, mask areas and chroma are in pixels.json. For graded far cameras the far_asphalt rectangle is conditionally absent; this is not treated as an API defect or a measured speckle pass. Precise contact/shadow ratios, five perfectly isolated LOD boxes, exhaustive external lifecycle visibility, and integrated three-cycle moving-agent compliance remain limits. These unmeasured clauses do not become invented passes or independent failures.

Reproduction scripts: capture-matrix.mjs (official helper orchestration), plates.mjs, pixels.py, probe.mjs, extra.mjs and follow.mjs, with matching JSON. Use SIM_URL=http://127.0.0.1:5174 SIM_GL=metal SIMBUILD_REF=/Users/martingrahn/.simbuild/ref SIM_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" TMPDIR=/Volumes/ExtDrive/SimBuild-verification-2026-09-06/tmp. Scripts run from project root with node --preserve-symlinks-main. Do not compare agent poses between fresh loads before applying the specified freeze/reseed pin.

## Ranked issues

### 1. major: Merging and ring traffic still interpenetrate
At fixed hour 17.5, 20 Hz sampling over 30 agent seconds records 114 negative-gap pair samples, minimum −10.961729883 m on edge 74, rear id 883/front id 893 at step 146. Fixed noon records 15, minimum −3.759685716 m on edge 74 at step 411. Peak also has a negative gap on ramp edge 92 at step 55. Phase-advancing traces independently show 442 peak and 72 noon overlapping pair samples. Reconcile entry reservations and insertion into the next lane with the receiving lane leader before a turning vehicle becomes lane-owned; do not teleport vehicles backward or hide them from edgeId to conceal collisions. Noon produces only two completed yield-then-enter events in the first 20 s, below three.

Evidence: shots/traffic/r3/critic-probe/extra.json fixedHour; probe.json traces; roundabout_12.png

### 2. major: Close vehicle finish remains synthetic and trim coverage exceeds the material limit
The fleet has the required detail counts, panes, wheels and distinct classes, yet broad slab-like dark side panels, plain pale far-LOD bodies and oversized simple rear lamps still read below CS2 refs 1/5. Actual LOD0 triangle surface area assigned to chrome/trim is 11.798% sedan, 7.195% hatchback, 11.646% taxi, 5.100% pickup, 5.439% van, 7.816% box truck, 6.758% bus, 23.910% motorbike and 10.493% police, versus ≤4%. Material roughness/metalness is now correct (.32/.86); narrow the trim regions and improve pane/pillar proportions and local body detail, preserving distinct paint/glass/tyre responses. Area calculation includes all mesh triangles, including hidden faces; it is not a visible-pixel coverage estimate.

Evidence: shots/traffic/r3/critic-probe/extra.json geometry; fleet_12.png; queue_12.png; queue_17p5.png; street_12.png

### 3. blocker: Empty road graph compiles an invalid traffic-owned fallback lens shader
Fresh showcase=traffic, wait ready, freeze, remove every world.roads edge through removeEdge(), call roads.rebuild(), traffic.step(1), then allow render frames for 500 ms. Vehicles/pedestrians become zero, but two console error events report traffic:mast:lens: instanceColor undeclared, dimension mismatch, cannot convert float to vec3. src/modules/traffic/masts.js:16 injects vTrafficSignal=instanceColor unconditionally; a zero-head mesh has no colour attribute initialized. This is traffic fallback ownership, not props. Handle the zero-head material/mesh or always initialize the attribute. Preserve the one intentional empty-graph warning without WebGL error spam.

Evidence: shots/traffic/r3/critic-probe/follow.mjs; follow.json zeroHeads/errors; src/modules/traffic/masts.js:16

### 4. major: Explicit bus loop stalls before starting its second lap
Fresh isolated graph made through the public API: four one-way, one-lane, 150 m street edges in a rectangle at (−450,−450), (−300,−450), (−300,−300), (−450,−300). spawnVehicle(bus,{edges:[102,103,104,105],loop:true}) returns id350 and visits the four edges in order at steps 0/291/571/851, but over 4000 fixed steps (200 s) never re-enters edge102 and stays alive on its final route entry. Source sim.js only appends the loop after s>=rec.len, while its no-next-edge stop logic brakes the nonexternal bus before that condition. Prepare the loop successor before lookahead/turn construction.

Evidence: shots/traffic/r3/critic-probe/follow.json route; follow.mjs; src/modules/traffic/sim.js:298 and :380

### 5. major: Queue discharge and advancing-clock night congestion miss their requirements
Three independent 90 s traces advance the game clock by .004 h per .1 agent second while stepping at 20 Hz (speed1 equivalent). After the specified 30 s pinned warm state, peak queued count ranges 11–142 across all three cycles and never falls below two. At the 30 s night mark congestion is .351906696 with 11 queued of 36 vehicles, above .10; peak is .829237580. Mean speed and congestion recomputation agree with published values, so this is a flow outcome, not fabricated stats. Preserve the honest formula; resolve route/stop bottlenecks or request a precise change to the criterion if necessary.

Evidence: shots/traffic/r3/critic-probe/probe.json traces[].queue; probe.mjs; queue_17p5.png

### 6. major: Coarse rotating LOD1 tyres leave more than 2 cm of road-local clearance
For 26 live non-null-edge vehicle instances, matching each slot position to its live vehicle and applying the actual aSpin shader rotation to tyre vertices gives maximum road-aligned local bottom clearance .064165749 m (SUV id439 LOD1). Ten saved examples exceed .02 m, including hatchback .043844793 and sedan .037756655. The physics origin itself tracks lane height accurately; the remaining gap comes from the rendered polygonal tyre shape. This is road-local vertex clearance, not a separate world-space terrain-height estimate; pitch/contact on the obscured merge deck remains visually unverified. Preserve tyre support at all rotations and LODs.

Evidence: shots/traffic/r3/critic-probe/follow.json wheelContact; follow.mjs; extra.json geometry; plate_junction_12_L1.png

## Console and attribution
consoleErrors=2 counts the two fresh follow-up console error events in one reproduction (the same two strings were also observed in extra.json; those repeats are not added as independent defects). All regular screenshots have zero errors. WebGL warnings repeat after the invalid program. The traffic module still reports zero agents; that does not excuse an invalid rendering program. Exact shader excerpt:

```text
Material Name: traffic:mast:lens
Material Type: MeshStandardMaterial
ERROR: 0:565: 'instanceColor' : undeclared identifier
ERROR: 0:565: '=' : dimension mismatch
ERROR: 0:565: 'assign' : cannot convert from 'const highp float' to 'out highp 3-component vector of float'
> 565: vTrafficSignal=instanceColor;
```

This points directly at traffic/masts.js, not a neighbour material. The camera/deck occlusion in merge_12 is a separate integration limitation and is not scored as a traffic terrain failure.

## Acceptance and API results
Each numbered row refers to the exact module acceptance item. PASS measured does not certify the explicitly excluded subclauses.

**1. FAIL (rendered contact); physics PASS.** Non-null-edge vehicle origin max lane-height error .001620 m; lateral max .000053 m; pedestrian max sampled error .000749 m, all well below .03. Actual rotating LOD1 tyre bottom exceeds .02 m in road-local coordinates (issue6). merge_12 hides the deck behind piers, so its pitch clause is not visually certified.

**2. PARTIAL / visual weakness.** LOD0 counts: sedan1322, hatch1340, SUV1360, taxi1326, pickup1330, van1296, box1484, bus1596, semi1820, motorbike1462, police1382. Required numeric detail counts pass; distinct panes, hubs, plates, lamps/grilles and roof planes exist. Fleet/queue inspection still shows synthetic proportions and broad dark panels, reflected in the art score. No invented missing-triangle failure.

**3. PASS measured; dimension/queue limits.** All eleven kinds and both police/taxi liveries exist; silhouette identifies the nine required kinds. Per-instance paint at noon has 16 colours and 69.81% achromatic, peak19/61.33%. Nominal body dimensions are near targets. Full mesh bounding boxes include mirrors (e.g. sedan2.13m versus target body1.82m); that ambiguity is not silently graded as a body-width failure. No fresh 12-consecutive-queue adjacency proof; the peak shot shows four stopped cars. Semi cab/trailer articulation is present.

**4. PASS measured.** Correct direction/lane rule, no bad lateral/heading/direction entries in four pinned-hour snapshots. Max heading-vs-lane error .01113 rad. Fixed-hour 30 s scan max null-edge fractions 9.41%,7.64%,7.50%,2.63%, all below12%. Both carriageways carry opposing traffic. Clock-advancing max null fractions are separately recorded and not substituted for the four fixed-hour gate.

**5. FAIL.** Negative same-edge/lane gaps at noon/peak, including −10.96173m. Peak queue_17p5 visibly has ≥4 stopped cars and stats queued≥6, but queue discharge fails (issue5). Speed maxima ≤1.05×limit pass. Free-flow mean/standard deviation not isolated. Endpoint zero-speed/spin differences alone do not prove a stationary wheel-spin bug and are not graded as one.

**6. FAIL ring behaviour; signal machine PASS.** 16 signalised nodes; all60 arms checked against public arm.dir. Half-cycle changes every green set; twelve samples give every arm green. Pure 4320-game-second cycle/amber transition verified from source and API. Integrated all12/all22 staging via public roads API, explicit roads+props rebuild:60/60 mirrored arms, source traffic, zero traffic mast. Three traffic-showcase cycles record zero red entries. Noon ring probe yields only two completed events in20s, peak four, and ring spacing fails. Full integrated moving-agent three-cycle compliance and every-green-arm wait duration were not independently measured.

**7. PASS measured; limits below.** All39 night vehicles lightsOn; zero at noon. Head4, tail1.6, brake≤4.2, fallback mast7.5; all vehicle radiance below6.5. Sources provide14×4m forward and7×3m rear pools. Frozen vehicle-mask lead chroma noon9.01255/night24.10433 ratio2.67453≥.60; junction night white pixels .00154321%<.05%, p1=27.1616,p99=114.5226. Exact attribution of every white pixel to mast/vehicle and brake-onset transient/pool falloff not separately quantified.

**8. PASS measured; road-type mix partial.** Pinned counts dawn85/noon157/peak240/night39, targets86/157/240/39; peds63/186/260/35. Dawn freight20%, peak4.167%, night≤.35×peak. Synchronous/3s refill and missing-profile fallback counts pass. Peak aerial visibly busier than night. Highway-highest-density and alley/gravel per100m ceilings not independently quantified.

**9. PARTIAL.** Sidewalk/crossing height errors pass, walking speeds1.1–1.5m/s, nearest phase variance .0673–.0861>.05, multiple clothing colours (source12). Crosswalk walkers visible. Source routes use sidewalks and intersection crossings, but every pedestrian lateral band/crosswalk3m distance/wait-state duration was not freshly measured. Pedestrian forms remain blocky compared with refs4/8.

**10. PARTIAL.** Vehicle/pedestrian flags castShadow/receiveShadow true, layer5/renderOrder50. Frozen A/C comparisons show directional long shadows, particularly closeup17.5 and junction6.5. Contact is an instanced decal rather than literally baked into each body geometry. Exact per-vehicle shadow long-axis1.8×, contact-darkening15–35%, and darkest20% core≤.45 were not isolated and are not claimed as passes.

**11. FAIL trim surface area; radiance PASS.** Paint roughness.30/metalness.10/clearcoat.65, glass roughness.08/metalness0/linear albedo .030,.036,.044, tyre.88, rims.26/.92, trim.32/.86. Trim area exceeds4% for9 classes (issue2). Frozen vehicle-mask pixels with luma>245 at skyline12/aerial12/aerial17.5 are0%, below.05%. traffic.far_asphalt is conditionally absent in those views; far speckle is unmeasured there, not misreported as a crop bug. Junction diagnostic speckle .3479% is not a failure at an ungraded camera.

**12. PARTIAL, measured deltas PASS.** LOD1 tris204–462 and ≤.35×each LOD0; LOD2≤36 (semi24)≤45. Frozen forceLod0/1 full-frame meanAbs .2934714<4. Five nearest projected ROI mask-box edge deltas5,4,4,1,2px, but first is partly clipped and generous ROIs can include neighbours; cannot certify five isolated boxes or call that proxy an exact failure. Four fixed-step aerial change outside fleet meanAbs .0133201<3. No origin pile visible. Source switch/cull distances conform; every instance-count assignment not independently reconciled.

**13. PASS canonical motion; limits.** Three90s traces at .1s snapshots and fixed.05s stepping: max heading rates2.36477/2.07562/1.84058rad/s, zero >2.5 violations; zero displacement-bound violations. Curved node motion replaces the previous snaps. Explicit bus route has no measured jump but stalls before its loop (item15). Raw-dt20Hz/interpolation verified in source, not a new 30Hz-vs60Hz numerical equivalence run. Free-flow speed coefficient of variation unmeasured.

**14. PASS measured.** Skyline frustum count132 at12 and195 at17.5, both≥40; street12 vehicles46/peds103; street22 vehicles2/peds18; night_street22 vehicles5/peds17. Frustum counts are not claimed as exact rendered-visible pedestrian counts beyond culling. Peak max lane occupancy .2293125<.35, day .141375. Required nearby pedestrians/cars are visibly present.

**15. FAIL explicit loop; portals PASS.** Four outside connections at border avenues/highways; peak external share32.92%≥15. Explicit bus id valid and edge order exact, but no second lap in200s (issue4). Despawn removes id; no fresh exhaustive20s external spawn/despawn distance/frustum log, so that lifecycle clause remains unverified.

**16. PASS measured steady state; startup limit.** 28 official shots max whole draws184, triangles1,209,859, traffic moduleMs1.10; night max.30≤.60. Own peak26draws/23,702tris, traffic-attributable whole-frame triangle delta72,384≤320,000.30s speed4 warmed trace maxmodule1.10/step.90ms; heap drift−12.90883MB, zero traffic textures. Init15ms; declared budget60/300000. Some fresh early probes reported stepMs up to1.5 before the warmed measurement; no claim that all cold transients satisfy1.2ms. Heap drift does not prove literally zero allocations.

**17. PASS regular matrix.** All28 final official captures ready, errors[], no missing-road-API warnings, including all12/all22/720. Mutated empty-graph console errors are separately included in the verdict hard fail, not concealed by this regular-matrix pass.

**18. PARTIAL methods; overall API false.** vehicle(id) same map reference; invalid spawn−1; valid spawn and despawn; serialize/deserialize exact157 count/byKind; setDensity0 empties both sets and null refills157/186; freeze positions stable across250ms and steps move them. Freeze30 rendered-frame duration not separately timed. flowGrid256² Float32Array/8m cells/version/index/sample checks pass. All API shapes present by source. Operational loop/empty-graph contracts fail, hence apiContractOk=false.

**19. FAIL night outcome, honesty PASS.** Count/map size and byKind reconcile; mean speed and congestion formula match (no fake stats). Advancing-clock30s peak .82923758≥.25, night .35190670>.10 (issue5). Vehicle fields available for selection.

**20. FAIL empty graph; mutations mostly PASS.** Removed occupied edge81 leaves zero stale vehicle references after two RAFs; strict one-frame bound and every pedestrian reference were not separately certified. New edge100 accepts live sedan358 and is drivable by20 fixed steps (1s). Empty graph has zero vehicles/peds and one intended warning, but two traffic:mast:lens shader errors (issue3).

**21. PASS.** Two independent seed1337 runs from specified flush/reseed/600-step pin have exactly equal first20 kind/x/z/heading and byKind. Seed7 changes9 of11 counts (81.82%≥30%). Source scan has no Math.random; clocks used for profiling only.

**22. PASS measured gate; empty-head robustness issue20.** Fallback mast source/geometry exists when props absent;7.5 radiance. Correct fake trafficlight item + props:changed removes fallback, mast7.5→null anddraws20→18 aftertwo RAFs. Integrated mastnull bothhours. Strict one-frame gate timing not separately certified; this successful correct-kind probe supersedes the discarded traffic_light spelling attempt.

## Render and pixel numbers
Regular captures: 28, all ready, zero errors; maximum 184 draws and 1,209,859 triangles. Each row below retains its own draw/triangle count. fps is recorded by the helper and is not a pass/fail criterion.

| Frozen plate | Fleet pixels | Shadow pixels | Pool pixels | Vehicle pixels | Lead chroma |
|---|---:|---:|---:|---:|---:|
| junction12 | 24852 | 5226 | 0 | 20386 | 9.01255 |
| junction22 | 3210 | 517 | 2237 | 786 | 24.10433 |
| aerial12 | 6467 | 885 | 0 | 5835 | 11.12346 |
| aerial17.5 | 27817 | 21651 | 0 | 7265 | 36.08974 |
| skyline12 | 2488 | 525 | 0 | 1981 | 8.93103 |
| closeup17.5 | 67198 | 48187 | 0 | 27617 | 27.75511 |
| junction6.5 | 28032 | 18456 | 0 | 15689 | 21.78825 |

Lead mask includes the producer landmark intersection; small far vehicles have few pixels and some nearest ROIs are partially clipped. Mean chroma is over vehicle-mask pixels only. Full-frame white percentage is not confused with percentage within the vehicle mask. Frozen A/B/C/D subtraction follows the same-page requirement.

## Per-shot inspection notes

- `aerial_12.png` → Individually separated small cars occupy both highways and the grid; mid density is readable, with no origin pile. Draws 109; triangles 533,152; ready; errors0.

- `aerial_17p5.png` → Clearly more vehicles and visible queues than aerial_22, with long shadows. Draws 83; triangles 438,522; ready; errors0.

- `aerial_22.png` → Sparse local traffic and faint lights; most local carriageway is empty, without a black frame. Draws 55; triangles 424,314; ready; errors0.

- `all_12.png` → Ready integrated baseline shows empty terrain and the HUD; the all showcase intentionally starts with no authored city. Draws 32; triangles 163,894; ready; errors0.

- `all_22.png` → Ready integrated night baseline and HUD; empty authored-city state is intentional and is not a failed traffic frame. Draws 32; triangles 163,894; ready; errors0.

- `closeup_12.png` → Several vehicle classes cross the junction; distant LOD vehicles lose glazing and read as pale blobs. Draws 107; triangles 960,004; ready; errors0.

- `closeup_17p5.png` → Four-car queue on the right arm, bus at left, and long vehicle shadows; distant vehicle sides remain plain. Draws 184; triangles 1,119,396; ready; errors0.

- `closeup_22.png` → A lone white car, its pools, and pedestrians remain readable at the junction. Draws 61; triangles 929,176; ready; errors0.

- `crossing_12.png` → Walker occupies the crosswalk and a white car crosses the central view. Draws 115; triangles 931,034; ready; errors0.

- `crossing_6p5.png` → Single foreground pedestrian has a head, torso and limbs but reads as a blocky peg figure; vans pass at left. Draws 111; triangles 902,314; ready; errors0.

- `fleet_12.png` → Eleven named silhouettes can be identified, including articulated semi and police light bar. Plain body panels, large dark glazing strips, and simple oversized rear clusters remain below the reference finish. Draws 152; triangles 1,171,986; ready; errors0.

- `headlights_22.png` → Clear oncoming headlight pair, visible white body and a projected forward pool. Draws 97; triangles 798,076; ready; errors0.

- `junction_12.png` → Right-hand white sedan and yellow SUV at the stop line while the crossing direction carries vehicles. Draws 119; triangles 947,602; ready; errors0.

- `junction_22.png` → One left-hand car and its pools; sparse night scene with no right-arm queue in this instant. Draws 61; triangles 895,722; ready; errors0.

- `junction_6p5.png` → Warm SUV/van queue and cross traffic; pronounced diagonal shadows. Draws 123; triangles 927,074; ready; errors0.

- `merge_12.png` → Tall bridge piers dominate and obscure the drivable deck; this shot cannot visually certify wheel pitch. Road/camera integration limitation, not evidence that traffic itself floats. Draws 106; triangles 1,176,231; ready; errors0.

- `night_street_22.png` → Sparse street, a clipped right-edge tail and distant left car with scattered pedestrians; no black crush. Draws 88; triangles 904,444; ready; errors0.

- `overview_12.png` → Wide highway connections contain a sparse, distributed fleet; no cluster at world origin. Draws 39; triangles 416,314; ready; errors0.

- `queue_12.png` → Eye-level car crossing and side queues; lead rear has red lamp clusters and a pale plate, but exaggerated black glazing bands. Draws 118; triangles 938,744; ready; errors0.

- `queue_17p5.png` → Four stopped vehicles are visible in the right lane; a very large cropped taxi in the foreground exposes simple rear lamps and slab-like dark side panels. Draws 177; triangles 1,076,962; ready; errors0.

- `roundabout_12.png` → Approach and circulating cars are visible on the ring, with sparse pedestrians; a still image cannot certify yield gaps. Draws 112; triangles 663,439; ready; errors0.

- `skyline_12.png` → Tiny coloured vehicles distributed across both bridges and the grid; no visible sparkle in this final crop-enabled capture. Draws 87; triangles 721,284; ready; errors0.

- `skyline_17p5.png` → Warm small vehicles on both bridges with long structural shadows; traffic is distributed rather than carpeted. Draws 92; triangles 738,318; ready; errors0.

- `skyline_22.png` → Thin, sparse light points against dark roads; the frame remains exposed, though the avenue light string is weak. Draws 67; triangles 710,148; ready; errors0.

- `street_12.png` → Distinct cars and pedestrians at the crossroads; broad dark side-window/door bands still make the close vehicles synthetic. Draws 174; triangles 1,209,859; ready; errors0.

- `street_12_720.png` → Street content fits 1280×720; no overflow. Headless traffic view has no interactive HUD to assess. Draws 131; triangles 1,099,566; ready; errors0.

- `street_22.png` → Foreground white car has a warm forward pool and red rear pool; pedestrians remain legible. Draws 65; triangles 1,056,322; ready; errors0.

- `street_6p5.png` → Warm freight van and SUV with two visible pedestrians; daylight surfaces retain detail. Draws 127; triangles 1,080,946; ready; errors0.

- `plate_aerial_12_A.png` → Mid-density lane-aligned fleet over the full network, no origin pile. Normal frozen plate.

- `plate_aerial_12_B.png` → Mid-density lane-aligned fleet over the full network, no origin pile. Vehicle geometry and its associated features removed; pedestrians and signal poles remain.

- `plate_aerial_12_C.png` → Mid-density lane-aligned fleet over the full network, no origin pile. Shadows removed; vehicles remain and the loss of directional grounding is visible.

- `plate_aerial_12_D.png` → Mid-density lane-aligned fleet over the full network, no origin pile. Light pools removed; daylight sets look unchanged, while the night set loses road illumination.

- `plate_aerial_12_step4.png` → Mid-density lane-aligned fleet over the full network, no origin pile. Same page after four fixed steps: cars shift slightly; terrain and road background remain stable.

- `plate_aerial_17p5_A.png` → Dense queues at several local signals and long, distinct vehicle shadows. Normal frozen plate.

- `plate_aerial_17p5_B.png` → Dense queues at several local signals and long, distinct vehicle shadows. Vehicle geometry and its associated features removed; pedestrians and signal poles remain.

- `plate_aerial_17p5_C.png` → Dense queues at several local signals and long, distinct vehicle shadows. Shadows removed; vehicles remain and the loss of directional grounding is visible.

- `plate_aerial_17p5_D.png` → Dense queues at several local signals and long, distinct vehicle shadows. Light pools removed; daylight sets look unchanged, while the night set loses road illumination.

- `plate_closeup_17p5_A.png` → Right-arm queue, foreground green sedan, left bus and long cast shadows; far white LOD bodies look simplified. Normal frozen plate.

- `plate_closeup_17p5_B.png` → Right-arm queue, foreground green sedan, left bus and long cast shadows; far white LOD bodies look simplified. Vehicle geometry and its associated features removed; pedestrians and signal poles remain.

- `plate_closeup_17p5_C.png` → Right-arm queue, foreground green sedan, left bus and long cast shadows; far white LOD bodies look simplified. Shadows removed; vehicles remain and the loss of directional grounding is visible.

- `plate_closeup_17p5_D.png` → Right-arm queue, foreground green sedan, left bus and long cast shadows; far white LOD bodies look simplified. Light pools removed; daylight sets look unchanged, while the night set loses road illumination.

- `plate_junction_12_A.png` → Two nearest right-side cars, other crossing traffic and pedestrians; dry asphalt and clear daytime silhouettes. Normal frozen plate.

- `plate_junction_12_B.png` → Two nearest right-side cars, other crossing traffic and pedestrians; dry asphalt and clear daytime silhouettes. Vehicle geometry and its associated features removed; pedestrians and signal poles remain.

- `plate_junction_12_C.png` → Two nearest right-side cars, other crossing traffic and pedestrians; dry asphalt and clear daytime silhouettes. Shadows removed; vehicles remain and the loss of directional grounding is visible.

- `plate_junction_12_D.png` → Two nearest right-side cars, other crossing traffic and pedestrians; dry asphalt and clear daytime silhouettes. Light pools removed; daylight sets look unchanged, while the night set loses road illumination.

- `plate_junction_12_L0.png` → Two nearest right-side cars, other crossing traffic and pedestrians; dry asphalt and clear daytime silhouettes. Forced LOD0: detailed wheels and body trim remain.

- `plate_junction_12_L1.png` → Two nearest right-side cars, other crossing traffic and pedestrians; dry asphalt and clear daytime silhouettes. Forced LOD1: wheel/body detail reduces and some silhouettes contract; quantified ROI test is qualified below.

- `plate_junction_22_A.png` → Sparse left-side car with forward/rear pools; body retains colour under night lighting. Normal frozen plate.

- `plate_junction_22_B.png` → Sparse left-side car with forward/rear pools; body retains colour under night lighting. Vehicle geometry and its associated features removed; pedestrians and signal poles remain.

- `plate_junction_22_C.png` → Sparse left-side car with forward/rear pools; body retains colour under night lighting. Shadows removed; vehicles remain and the loss of directional grounding is visible.

- `plate_junction_22_D.png` → Sparse left-side car with forward/rear pools; body retains colour under night lighting. Light pools removed; daylight sets look unchanged, while the night set loses road illumination.

- `plate_junction_6p5_A.png` → Left-arm queue, right-side SUVs and long dawn shadows; no clipping or black crush. Normal frozen plate.

- `plate_junction_6p5_B.png` → Left-arm queue, right-side SUVs and long dawn shadows; no clipping or black crush. Vehicle geometry and its associated features removed; pedestrians and signal poles remain.

- `plate_junction_6p5_C.png` → Left-arm queue, right-side SUVs and long dawn shadows; no clipping or black crush. Shadows removed; vehicles remain and the loss of directional grounding is visible.

- `plate_junction_6p5_D.png` → Left-arm queue, right-side SUVs and long dawn shadows; no clipping or black crush. Light pools removed; daylight sets look unchanged, while the night set loses road illumination.

- `plate_skyline_12_A.png` → Small coloured dashes across distant bridges and local roads; no bright white sparkle visible. Normal frozen plate.

- `plate_skyline_12_B.png` → Small coloured dashes across distant bridges and local roads; no bright white sparkle visible. Vehicle geometry and its associated features removed; pedestrians and signal poles remain.

- `plate_skyline_12_C.png` → Small coloured dashes across distant bridges and local roads; no bright white sparkle visible. Shadows removed; vehicles remain and the loss of directional grounding is visible.

- `plate_skyline_12_D.png` → Small coloured dashes across distant bridges and local roads; no bright white sparkle visible. Light pools removed; daylight sets look unchanged, while the night set loses road illumination.

## Strengths to preserve
- Canonical-route displacement and heading regression is fixed: zero threshold violations over all three 90 s traces; zero red-entry violations in those traffic-showcase traces.
- Eleven identifiable vehicle kinds, articulated semi and police/taxi liveries; LOD0 per-kind detail and LOD1/2 triangle budgets pass.
- Night body-mask chroma ratio is 2.67453 against a .60 minimum, with readable pools and low clipping.
- Fixed-hour fleet density, freight mix, seeded reproducibility and simulation-profile fallback all meet their measured targets.
- All 28 regular captures are ready with zero errors, maximum 184 whole-frame draws; own peak rendering and warmed update budgets have headroom.
- Traffic owns signal phases; integrated props reads traffic for all 60 checked arms at both hours. Correct trafficlight publication removes fallback masts.

## Verdict
FAIL at6.7. API method shapes are mostly sound, but looping route behaviour and empty-graph rendering are not. No source fix was made by this independent critic. The next builder can fix the six bounded ranked issues from the saved probes; unresolved measurement limits above remain visible rather than being replaced with a pass claim.
