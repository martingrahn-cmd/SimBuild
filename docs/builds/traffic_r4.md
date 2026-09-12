# Traffic round 4 builder completion

Traffic round 4 fixes receiving-lane/ring overlap, portal deadlock, empty fallback lens shader, explicit long bus-loop continuation, rotating LOD1 tyre support and excessive trim coverage. Three 90 s behavioral regressions are clean and night congestion is below .10; the first peak queue cycle, some temporal/LOD limits and AAA body finish remain incomplete.

Self-score: **7.1/10**, below acceptance.

## Changes and verification

1/4 measured lane contract: all fixed-hour non-null-edge vehicles within .001455 m of laneCenter.y+.08, lateral <.000049 m and heading <.011888 rad; no wrong-direction samples. Actual rotated LOD0/1 tyre vertices: 29 matched live instances, max clearance .01658443 m. Fixed-hour 30 s turning fraction max .104652.

3 fleet: 11 named kinds and two liveries visible in fleet_12; LOD0 1296–1964 triangles per kind. At peak 20 paint colours and 60% achromatic in visible instance buffer. Dawn freight 21.1765%, peak 3.75%.

5/6/13 measured traffic flow: three 90 s advancing-clock traces and four 30 s fixed-hour scans have zero negative-gap, minimum-gap, displacement, heading-rate or strict-red-entry violations. Heading-rate maximum2.4 rad/s; yield-then-enter events first 20 s noon7/peak9. Source lane occupancy persists through departure and receiving-lane insertion is guarded.

6/22 signals: all16 signalized nodes change opposing phase; every arm gets green. Integrated public graph probe checks60 props arms at12 and22, no mismatch, source traffic; no traffic masts. Publishing trafficlight removes fallback, reducing own draws20 to18. Empty graph has one intentional warning and zero shader errors.

7 lighting: 100% vehicles lit at22 and0% at12. Head/tail/brake radiance4/1.6/4.2 below6.5; fallback mast7.5. Frozen junction body-mask night/day chroma ratio2.76490. Day controlled vehicle-mask luma>245 coverage0%; night junction .0004823% frame; visible paired pools.

8 density: pinned counts85/157/240/39 and peds63/186/260/35 across6.5/12/17.5/22; simulation-profile fallback exact counts86/157/240/39 matches normal fresh-seed mode.

9 measured pedestrians: heights agree with sample offsets within .000749 m, walking speed1.10–1.50 m/s, nearest phase variance>.05; figures and crossings visible. No full lateral/crosswalk temporal certification claimed.

10 shadow features: all live vehicle/ped meshes cast/receive on layer5/order50; controlled warm-closeup shadows alter43481 pixels at threshold12, aerial peak21950. Exact contact-ring ratios remain unmeasured.

11 material numeric contract: actual LOD0 trim surface fractions all <=3.009785%; paint/glass/tyre/trim material ranges preserved. Six frozen feature comparisons and full-resolution pixel statistics archived.

12 measured LOD budgets: LOD1 max498 and <=35% LOD0; LOD2<=45. Frozen LOD full-frame meanAbs .284539/255; step4 aerial outside-fleet meanAbs .0111303/255. Individual vehicle box parity is not certified.

14 visible traffic: skyline projected count132 noon/195 peak; maximum sampled per-edge occupancy22.305%; street noon46 vehicles103 pedestrians, street night2/18, night_street5/17. Full matrix viewed.

15 explicit 150 m four-edge bus route visits every edge, repeats first edge at step1131,2251,3371; route buffer bounded4–8 entries and zero motion violations over4000 steps. Peak external share45.4167%; four published outside connections. Spawn/despawn visibility gate not newly fully logged.

16 measured capture/render budgets: all 32 main captures ready, zero errors; max 172 whole-frame draws,1173935 triangles,59–60.4 fps on Metal. Main max traffic1.5ms/night.5ms/init17ms. Own peak26 draws21840 tris; traffic triangle delta64952; zero traffic textures;30s speed4 heap drift2.86198MB.

17 all12/all22/1280x720 and every required preset ready with errors[]. Integrated default world is empty; separate public graph probe establishes live props/traffic interoperability.

18/20/21 API: spawn/despawn, reference identity, density empty/refill, freeze/step, count/byKind serialization and seeded position repeat pass; removed occupied edge leaves0 stale vehicles; new edge drivable; empty graph0 vehicles/peds and0 errors. Seed1337 repeated identical, seed7 different.

19 honest stats: counts/means/congestion recompute exactly. Advancing first 30 s peak congestion mean .4912463225; night mean .0806692470,30s endpoint .0904720560. Formula unchanged.

## Remaining misses and limits

5 peak queue fails discharge during the first complete30s cycle: minimum47, although minimum1 occurs across90s. This remains a literal miss, not waived by later discharge.

1/4 turning-fraction ceiling is not universal: fixed-hour30s scans stay below12%, but advancing90s traces reach16.6667% noon/16.2602% peak. Vehicles follow actual curves and are not hidden to conceal overlap; all-time ceiling remains unmet.

2/11/14 visual finish remains below CS2 refs1/5: plain slab bodies, weak reduced-detail panes/pillars, simple rear lamps and plates; night avenue strings are sparse. Self-score7.1 is not an8.5 pass.

12 LOD per-vehicle box gate unproven and concerning: generous nearest-five ROI A/B masks report4/4/4/1/2px edge deltas versus2px. These ROIs include nearby shadows/agents; no isolated vehicle-only certification. Visible LOD glazing loss is definite.

16 live30s speed4 profiling includes traffic module2.2ms and step1.7ms transients. Main still captures meet their module timing limits, but strict step<=1.2ms is not consistently met.

15 explicit bus spawn on the showcase eight short ring segments returns-1 because the first trimmed segment lacks spawn clearance. The long 150 m rectangle loop fix does not certify every valid short explicit route.

1/10 cross-owner/unmeasured: merge camera remains obscured by bridge support; actual deck pitch/contact cannot be visually certified. LaneCenter+.08 vs actual pavement discrepancy remains unresolved upstream. Exact contact-darkening annulus/core thresholds are unmeasured, not asserted failed or passed.

11 measured auxiliary junction far-asphalt ROI speckle .3540% exceeds.2%; required skyline/aerial far-asphalt rectangles are null. That missing required-region instrument remains unmeasured; global no-sparkle cannot be certified from the auxiliary ROI.

## Evidence

`shots/traffic/r4/probe/aggregate.json` contains runtime,32-capture aggregate, exact trace results, final geometry and pixel measurements, source hashes. `probe.json`, `extra.json`, `follow.json`, `plates.json` retain raw evidence; `viewed.json` records actual image inspection. All files live on external storage through the canonical r4 symlink. All eight CS2 reference images were freshly viewed before building.

Behavior probe is a fresh builder rerun of critic 3 regression, not an independent review. It predates the last two-triangle rear-window addition; final geometry, empty-graph, wheel and bus probes and all main/controlled captures include that addition. Two early diagnostic images are explicitly pre-final.
