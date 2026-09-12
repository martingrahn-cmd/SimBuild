# Tools critic — round 4

8.0/10, FAIL. Continuous-drag average is fixed and functional contracts pass. A single2.3ms sample, occluded declared street pixel crops and the raw-terrain/pavement lift conflict remain. All35 fresh captures were viewed; zero errors.

## Method and limits

Independent root critic; no production edits during review. Read CRITIC, full tools spec, architecture, previous verdict and residual decisions; viewed all eight CS2 reference images afresh. Captured and actually viewed all35 PNGs listed below. Pixel statistics use full source resolution. Shared Vite5174, System Chrome152, ANGLE Metal Apple M4. Evidence uses the ExtDrive-backed shots/tools/r4/critic-probe directory.

All35 captures ready/errors0, maximum207 scene draws/1549160 scene triangles, minimum59.7fps. The module-owned maxDrawCalls field is8: three settled same-frame visibility pairs agree on8calls/8940triangles. An earlier unsynchronized pair has a negative triangle delta because neighbouring LOD/reflection work changed; it is retained in apicheck.json and excluded. Do not attribute the whole scene to tools.

Source review confirms the on-demand landmark search and no Math.random or new per-frame geometry allocation. All independent API probes have errors:[]. Final-seams was freshly rerun after the props worker fixed generated-ID reuse; the35-image matrix spans that identity-only change, which does not alter tool rendering.

The raw-terrain lift requirement conflicts with paved surface height; measured support lift is consistently0.15m. This is a literal contract miss, not visible floating over pavement. Exact <=3px transition and live-tool all-mode bloom differential were not isolated; all-mode presently has no staged ghost because democity is a stub. Linear output cap0.70 conflicts with exact industrial palette linear0.93; ribbon uses0.70 and shared flat shader0.96 preserves the required palette. These residuals are disclosed rather than invented as passes. Crop failures identify occluded instrument landmarks, not amber/dark white material. Functional apiContractOk is separate from those pixel limits.

## Acceptance and API evidence

| Item | Result and evidence |
|---|---|
| 1 | Pass: 41 edges/36 nodes/440 cells/34 buildings; 28 history entries, all eight zone combinations. |
| 2 | Literal FAIL: raw lift 0.149999142–0.560679765; pavement support lift consistently .15. Prior penetration fixed. |
| 3–5 | Six simultaneous poses; 26 px chips, correct measured lengths/angle/grade/cost, required-view bounds pass. |
| 6 | Literal FAIL street crop: p50 20.7456, ratio0.359753; foliage/chip occlusion. Roadtool/closeup p50 202.0722, ratios3.905864/3.826560 pass. Cap conflict disclosed above. |
| 7–8 | Actual node commit adds one edge/node; edge branch adds two edges/nodes. Angle/grid snap work. Invalid commit rejected, no road delta. |
| 9 | Pass: two fresh eight-action full-height-field traces undo/redo exactly; road, zone, sculpt, demolition and prop. Prop substitutes unavailable service per residual. |
| 10 | Exact zone palette is reused, four posed high-density cells. |
| 11 | Pass: exact 18 victims (4 buildings +14 props), all removed; kind-sized volumes. Final-seams probe: no retired prop IDs reappear and no surviving IDs alias after regeneration. |
| 12 | In-place selection object, actual building pick, one set and one clear event; serialization hooks present. |
| 13 | Average0.99ms PASS; single maximum2.300000001ms exceeds architecture ceiling; static/idle pass; 8 calls/8940 triangles; allocation delta0 on 200-pointer burst. |
| 14–16 | Helpers layers, no cast/receive shadows; cancel/select-null clears every ghost/chip. Duplicate selection/option and reentrant selection emit one event. 200 pointers produce2 previews. Real HUD card and option each one event; Escape idle. Owned listeners removed on dispose. |
| 17 | Pass: largest sampled 2 m terrain step1.316046119; repeated raises monotonic, no NaNs; three consecutive brush drags coalesce to one history entry. |
| 18–19 | Nearby clinic position valid; remote invalid No road access. Unavailable service/prop return exact reasons, cost0 and retain preview. Missing simulation keeps finite cost/affordable. |
| 20 | Two seed1337 runs byte-identical; seed99 preserves required district counts. |
| 21 | Four fresh roadtool/closeup 720p captures: legible26 px chips, bounds/no overflow; ribbon width43/64=.671875. |
| 22 | Literal FAIL street crop saturation0.328244 due to occlusion; actual exposed ribbon and declared roadtool crop neutral(~.0049), no clipped pixels. Declared wash hue205.05/204.52/205.63 at roadtool6.5/12/22. |

API checked: select, setOption, current, options, pointer, pointerNdc, click, rightClick, commit, cancel, state, undo, redo, history, costOf, setSelection, clearSelection, pickAt, setPreviewVisible, stats, cropRects, _showcasePoses, serialize and deserialize; live behavior and source inspected as above. Unknown/degraded paths do not throw. Every fresh probe has errors:[]. Full measurements: apicheck.json, follow.json, supplement.json, dynamic-repeat.json and pixels.json in shots/tools/r4/critic-probe. Whole-frame p1 minimum5.008; p99 maximum246.7662.

## Ranked issues

1. **minor: The declared street ribbon landmark samples foreground foliage and a chip** — The required unmodified street crop [1029,474,64,64] has night p50 20.7456 and ribbon/ground ratio 0.359753 (required190–225 and >=2.5); dawn median saturation0.328244 (>0.10). These literal failed samples are caused by visible tree/chip occlusion. Actual exposed white paint stays neutral. Roadtool/closeup night medians202.0722 and ratios3.905864/3.826560 pass. Make the declared surface landmark robust to occlusion without selecting pixels by brightness or hand-cropping. Evidence: shots/tools/r4/critic-probe/pixels.json; street_22.png; street_6p5.png

2. **minor: A single drag frame still exceeds the architecture ceiling** — Fresh identical 60-frame avenue drag now averages0.99ms, improving from1.771667ms and passing the <=1.2ms target. Maximum2.300000001ms exceeds the2ms hard ceiling. A second path averages0.806667ms/max1.0. Static six-pose0.021667ms and idle0.010ms pass; geometry delta0. Timing is from concurrent host verification, not a universal latency guarantee; retain the measured outlier instead of hiding it. Evidence: shots/tools/r4/critic-probe/dynamic-repeat.json; supplement.json

3. **minor: The literal raw-terrain lift band remains unmet over pavement** — Every unique indexed live ghost vertex was sampled. Raw terrain lift is 0.149999142–0.560679765 m, with 2718 vertices outside 0.10–0.20 m; stats report the actual range. Lift above max(terrain,pavement) is 0.149999137–0.150000869 m, and the roadtool/closeup images show continuous previews without prior asphalt holes. At (73,10), pavement is 0.408883079 m above terrain: these two vertical constraints cannot both hold there. Acceptance 2 is literally unmet, but this is not evidence of visible floating above pavement. Preserve the penetration fix; resolve the contract with the integrator instead of returning to the broken terrain-only geometry. Evidence: shots/tools/r4/critic-probe/supplement.json; roadtool_12.png; docs/core-requests/roads.md

## Strengths

- The expensive landmark nearest-edge search now runs on demand; the previously failing continuous path averages0.99ms.
- All six previews and functional public APIs work. Two independent eight-action traces restore all263169 terrain heights and four world counters exactly.
- 18 demolition victims are removed; a final fresh probe confirms zero reappearing retired prop IDs and zero aliases of surviving IDs after regeneration.
- Continuous white preview covers elevated pavement without asphalt holes; 720p chips remain26px and world ribbon crop scales43/64.
- Three stable visibility pairs attribute8calls/8940triangles; event deduplication, HUD controls, cancellation, clean disposal, snapping and unavailable-neighbour handling pass.

## Every captured image inspected

- `shots/tools/r4/critic-probe/aerial_6p5.png` — All six posed previews visible; white bend, green zone, sculpt rings, red victims and clinic cue remain readable. Time 6.5.
- `shots/tools/r4/critic-probe/aerial_12.png` — All six posed previews visible; white bend, green zone, sculpt rings, red victims and clinic cue remain readable. Time 12.
- `shots/tools/r4/critic-probe/aerial_17p5.png` — All six posed previews visible; white bend, green zone, sculpt rings, red victims and clinic cue remain readable. Time 17.5.
- `shots/tools/r4/critic-probe/aerial_22.png` — All six posed previews visible; white bend, green zone, sculpt rings, red victims and clinic cue remain readable. Time 22.
- `shots/tools/r4/critic-probe/street_6p5.png` — Main white curve is partially offscreen; foreground tree and133-degree chip obscure the declared ribbon crop. Exposed paint stays neutral. Time 6.5.
- `shots/tools/r4/critic-probe/street_12.png` — Main white curve is partially offscreen; foreground tree and133-degree chip obscure the declared ribbon crop. Exposed paint stays neutral. Time 12.
- `shots/tools/r4/critic-probe/street_17p5.png` — Main white curve is partially offscreen; foreground tree and133-degree chip obscure the declared ribbon crop. Exposed paint stays neutral. Time 17.5.
- `shots/tools/r4/critic-probe/street_22.png` — Main white curve is partially offscreen; foreground tree and133-degree chip obscure the declared ribbon crop. Exposed paint stays neutral. Time 22.
- `shots/tools/r4/critic-probe/skyline_6p5.png` — Distant tool pills cluster above the district; preview geometry becomes thin. No helper reflection visible. Time 6.5.
- `shots/tools/r4/critic-probe/skyline_12.png` — Distant tool pills cluster above the district; preview geometry becomes thin. No helper reflection visible. Time 12.
- `shots/tools/r4/critic-probe/skyline_17p5.png` — Distant tool pills cluster above the district; preview geometry becomes thin. No helper reflection visible. Time 17.5.
- `shots/tools/r4/critic-probe/skyline_22.png` — Distant tool pills cluster above the district; preview geometry becomes thin. No helper reflection visible. Time 22.
- `shots/tools/r4/critic-probe/closeup_6p5.png` — Broad white bend remains continuous over pavement; dark length/grade pills and cyan cue legible. Some anchors extend outside this tight composition. Time 6.5.
- `shots/tools/r4/critic-probe/closeup_12.png` — Broad white bend remains continuous over pavement; dark length/grade pills and cyan cue legible. Some anchors extend outside this tight composition. Time 12.
- `shots/tools/r4/critic-probe/closeup_17p5.png` — Broad white bend remains continuous over pavement; dark length/grade pills and cyan cue legible. Some anchors extend outside this tight composition. Time 17.5.
- `shots/tools/r4/critic-probe/closeup_22.png` — Broad white bend remains continuous over pavement; dark length/grade pills and cyan cue legible. Some anchors extend outside this tight composition. Time 22.
- `shots/tools/r4/critic-probe/roadtool_12.png` — Continuous two-part white curve with62/50m,133-degree,0.6percent and cost/snap cues. Foreground foliage occludes portions naturally. Time 12.
- `shots/tools/r4/critic-probe/roadtool_22.png` — Continuous two-part white curve with62/50m,133-degree,0.6percent and cost/snap cues. Foreground foliage occludes portions naturally. Time 22.
- `shots/tools/r4/critic-probe/zonetool_12.png` — Four green cell previews with white grid/outline and readable type cue. Time 12.
- `shots/tools/r4/critic-probe/zonetool_22.png` — Four green cell previews with white grid/outline and readable type cue. Time 22.
- `shots/tools/r4/critic-probe/sculpt_12.png` — Two concentric brush rings on rounded knoll,60m/70percent and+0.8m Raise cues; nearby invalid road is red. Time 12.
- `shots/tools/r4/critic-probe/sculpt_22.png` — Two concentric brush rings on rounded knoll,60m/70percent and+0.8m Raise cues; nearby invalid road is red. Time 22.
- `shots/tools/r4/critic-probe/bulldoze_12.png` — Four houses and fourteen props have differently sized red victim volumes,18-item/+843 readout, red ground marquee. Time 12.
- `shots/tools/r4/critic-probe/bulldoze_22.png` — Four houses and fourteen props have differently sized red victim volumes,18-item/+843 readout, red ground marquee. Time 22.
- `shots/tools/r4/critic-probe/service_12.png` — Clinic footprint and cost18000/130m labels visible; circle extends beyond frame and scene objects partly occlude footprint. Neighbour unavailable at wave2. Time 12.
- `shots/tools/r4/critic-probe/service_22.png` — Clinic footprint and cost18000/130m labels visible; circle extends beyond frame and scene objects partly occlude footprint. Neighbour unavailable at wave2. Time 22.
- `shots/tools/r4/critic-probe/invalid_12.png` — Whole road preview red, Grade14percent>12percent reason clear. Time 12.
- `shots/tools/r4/critic-probe/invalid_22.png` — Whole road preview red, Grade14percent>12percent reason clear. Time 22.
- `shots/tools/r4/critic-probe/roadtool_6p5.png` — Continuous two-part white curve with62/50m,133-degree,0.6percent and cost/snap cues. Foreground foliage occludes portions naturally. Time 6.5.
- `shots/tools/r4/critic-probe/roadtool_12_720.png` — Continuous two-part white curve with62/50m,133-degree,0.6percent and cost/snap cues. Foreground foliage occludes portions naturally. At720p chips remain legible26px; world preview shrinks. Time 12.
- `shots/tools/r4/critic-probe/roadtool_22_720.png` — Continuous two-part white curve with62/50m,133-degree,0.6percent and cost/snap cues. Foreground foliage occludes portions naturally. At720p chips remain legible26px; world preview shrinks. Time 22.
- `shots/tools/r4/critic-probe/closeup_12_720.png` — Broad white bend remains continuous over pavement; dark length/grade pills and cyan cue legible. Some anchors extend outside this tight composition. At720p chips remain legible26px; world preview shrinks. Time 12.
- `shots/tools/r4/critic-probe/closeup_22_720.png` — Broad white bend remains continuous over pavement; dark length/grade pills and cyan cue legible. Some anchors extend outside this tight composition. At720p chips remain legible26px; world preview shrinks. Time 22.
- `shots/tools/r4/critic-probe/all_aerial_12.png` — HUD and empty terrain; democity is still a stub. No complete-game or tool bloom claim. Time 12.
- `shots/tools/r4/critic-probe/all_night_street_22.png` — HUD and empty terrain; democity is still a stub. No complete-game or tool bloom claim. Time 22.
