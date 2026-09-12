# Traffic builder round 3

Self-score **8.0/10**, below the 8.5 pass threshold. Source is frozen. All eight CS 2 reference images were individually inspected before building. All 64 captured PNGs were individually viewed:33 final matrix views,4 preserved pre-local-night frames,2 early development frames,11 feature diagnostics and 14 final controlled plates. No screenshots were cosmetically altered.

## Changes

The fleet now has distinct sedan/hatch/SUV roofs and rear glass, van lamps, spoke rims, bevelled lamp lenses and separate taxi/police liveries. A 6.2 m tractor and 13.6 m trailer rotate about a shared fifth wheel in both color and depth shaders. The live semi probe measured 0.237113 rad articulation; the instance shader value matched. Roofs, windows and vehicle detail remain simplified compared with CS 2.

Turns now connect lane endpoints with arc-length-sampled cubic paths. Fixed steps retain previous poses and render with accumulator interpolation. A 4 m steering chord removes a road-polyline heading kink without moving lane positions. Ring-priority braking replaces generic reservation on roundabouts. The peak queue showcase stages four real passenger vehicles on a red arm. Terminal portal edges are valid routes; night traffic primarily uses outgoing motorway journeys while preserving two local avenue trips. Pedestrian crossing transitions now update height immediately; metallic trim is within its required band.

## Final measured evidence

| Check | Result |
|---|---|
| Four-hour vehicles |86 /157 /240 /39|
| Four-hour pedestrians |63 /186 /260 /35|
| Worst vehicle profile-height error |0.0014501 m|
| Worst pedestrian height error |0.0002313 m|
| Lateral, heading, speed-limit, same-lane gap failures |0 at all four hours|
|30 s at 100 ms motion intervals |0 position jumps,0 angular failures; max 2.694697 m and 2.199390 rad/s|
| Render interpolation |3.08 e-6 m maximum matrix error; authoritative world unchanged|
| Noon roundabout first 20 s |5 completed yields /8 radial entries|
| Peak roundabout first 20 s |2 completed yields /5 entries (noon is the named gate)|
| Red entries,90 s phase-advancing scans |0 at noon,peak,night|
| First 30 s congestion peak /night |0.457921 /0.082406|
|90 s queued min /max peak |2 /75 — minimum misses<2|
|90 s queued min /max night |0 /4|
| Golden-hour shadow mask |74,329 changed pixels|
| Night pool mask |2,237 changed pixels|
| Masked night/day lead chroma |2.675×|
| Night white clipping /p 1 /p 99 |0.001543% /27.16 /114.52|
| LOD 0/1 full-frame mean absolute diff |0.278/255|
| Far-asphalt horizontal speckle |0.2790% at junction; named-camera gate not established|
| Traffic triangle delta |71,167|
|30 s heap at speed 4 |124.1→126.3 MB, +2.2 MB|

The API probes cover exact stepping, freezing, live references, serialization, clear/refill, flow grids, four border portals, occupied-road removal, added roads, empty-graph warning and pinned determinism. Integrated props reads traffic's 4320-second phase and traffic draws no duplicate masts. The API hour scan intentionally holds the engine frozen while changing clock time, so its lightsOn field has stale environment values; it is not used as a lighting test. Final lighting plates load each hour independently.

## Captures and runtime

The 16-view gauntlet is ready/error-free: maximum 147 draws,1,127,066 whole-frame triangles, minimum 47.5 fps. Four 22:00 frames were refreshed after the final night edit; their previous files remain as`*_preLocal`. All 17 additional views are also ready/error-free. Across 33 matrix captures maximum triangles are 1,174,479 and minimumfps 39.7 (integrated empty-world view). Maximum measured traffic update is 1.2 ms. Measurements use installed Chrome 152.0.7977.76, ANGLE Metal AppleM 4, server 5174. These are Metal figures, not SwiftShader.

A custom frozen diagnostic rendered 184 whole-frame draws with altered camera/shadow state; this is below 200 but is separate from the 147 gauntlet maximum. Frozen diagnosticfps is not a real-time performance sample. Traffic owns at most 25 draws in the four-hour API scan and no textures.

## Limits and evidence hygiene

The peak queue discharge gate still misses. The junction sparkle diagnostic exceeds the numerical band, but it is not the named skyline/aerial measurement; the skyline crop lacks a far-asphalt landmark. Do not call that a proven named-camera failure. class-specific detailing remains below the visual reference bar. Night central streets remain sparse. The prescribed merge camera is obstructed by giant bridge supports inherited from the current road/terrain elevation profile. The new pavement-height cross-check reaches 0.107126 m difference while the binding laneCenter test passes; this contract discrepancy is documented in the traffic core request.

Final`plate_*`images use fresh hour-specific page loads, wait beyond loading, and freeze both traffic and the engine for each A/B/C/D group. Earlier`feature_*`time-swap plates are preserved but excluded from pixel conclusions because the first caught a loading overlay and subsequent lighting was incompletely synchronized. Their independent interpolation, articulation, geometry-budget and heap probes remain useful. The LOD bbox-per-vehicle and exact shadow/contact ratios were not fully quantified; no blanket 22/22 pass is claimed. Residual unmeasurable pool extents/silhouette/flicker clauses are not invented numerical failures.

One Chrome newContext stall happened before navigation (no renderer process), and was bounded by terminating only the builder's observed browser processes. Missing capture was retried successfully. This infrastructure event is separate from zero app console/runtime errors. External evidence storage preserves all valid files:`shots/traffic/r3`symlinks to`/Volumes/ExtDrive/SimBuild-verification-2026-09-06/traffic/r3`; Chrome temp profiles use the external tmp directory. The external drive must remain mounted to resolve these evidence links.

All source edits are confined to`src/modules/traffic`. Final syntax checks for all six edited modules and`git diff --check -- src/modules/traffic`pass. No commits, STATUS changes or neighbor source edits were made. Source hashes and reproducible scripts are alongside the evidence.
