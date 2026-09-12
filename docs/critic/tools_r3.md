# Tools critic — round 3

8.0/10, FAIL. The major round-2 functional and visual defects are fixed. Continuous road dragging remains over its frame-time target, and the raw-terrain lift requirement conflicts with the elevated pavement it must cover. No console errors; API passes.

## Method and limits

Independent root critic; no production edits. Read CRITIC, module spec, architecture sections, previous verdict and residual decisions; viewed all eight CS2 references this round. Captured and actually viewed all 35 images below. Runtime: shared 127.0.0.1:5174, System Chrome 152, ANGLE Metal Apple M4. Evidence lives through the shots/tools/r3 symlink on ExtDrive.

The module-owned maxDrawCalls field is 8, not the whole scene. The 35 captures peak at 201 scene calls and 1,771,104 scene triangles, minimum observed FPS 49.7; tools is ready throughout and console errors are zero. Two comparable group toggles give exactly 8 calls/8940 triangles. A third toggle coincides with a scheduled reflection and is invalid; its negative delta is retained in follow.json and excluded. No whole-scene budget is attributed to this helper module.

Source review found no Math.random use in tools. Shared-tree changes include other workers and documented root integration fixes; git status is not attributed wholesale to this builder. Raw lift stats are honest. apiContractOk means the public functional API works; the separate literal rendering limit still fails.

Numeric residuals are not invented as passes: exact <=3 px edge transition and actual all-mode tool bloom differential were not isolated. The requested linear cap .7 on every overlay conflicts with the exact industrial palette (linear .93); ribbon uses .7 and the shared flat shader .96 preserves the palette. Occluded wash landmarks are declined. Adjacent ground at street night includes foliage; the required median ratio still passes. A skyline pair overlaps 10.72%, but the <=10% overlap requirement is explicitly for roadtool/closeup, so it is not listed as a failure.

## Acceptance and API evidence

| Item | Result and evidence |
|---|---|
| 1 | Pass: 41 edges/36 nodes/440 cells/34 buildings; 28 history entries, all eight zone combinations. |
| 2 | Literal FAIL: raw lift 0.149999142–0.560679765; pavement support lift consistently .15. Prior penetration fixed. |
| 3–5 | Six simultaneous poses; 26 px chips, correct measured lengths/angle/grade/cost, required-view bounds pass. |
| 6 | Required night ribbon medians 201.8596/202.0722/202.0722, p99 218/203.0722/203; ratios 3.50048/3.80603/3.90042 for street/closeup/roadtool. Cap conflict disclosed above. |
| 7–8 | Actual node commit adds one edge/node; edge branch adds two edges/nodes. Angle/grid snap work. Invalid commit rejected, no road delta. |
| 9 | Pass: two fresh eight-action full-height-field traces undo/redo exactly; road, zone, sculpt, demolition and prop. Prop substitutes unavailable service per residual. |
| 10 | Exact zone palette is reused, four posed high-density cells. |
| 11 | Pass: exact 18 victims (4 buildings +14 props), all removed; kind-sized volumes. |
| 12 | In-place selection object, actual building pick, one set and one clear event; serialization hooks present. |
| 13 | FAIL continuous pointer average 1.771666667 ms; static/idle pass; 8 calls/8940 triangles; allocation delta0 on 200-pointer burst. |
| 14–16 | Helpers layers, no cast/receive shadows; cancel/select-null clears every ghost/chip. Duplicate selection/option and reentrant selection emit one event. 200 pointers produce2 previews. Real HUD card and option each one event; Escape idle. Owned listeners removed on dispose. |
| 17 | Pass: largest sampled 2 m terrain step1.316046119; repeated raises monotonic, no NaNs; three consecutive brush drags coalesce to one history entry. |
| 18–19 | Nearby clinic position valid; remote invalid No road access. Unavailable service/prop return exact reasons, cost0 and retain preview. Missing simulation keeps finite cost/affordable. |
| 20 | Two seed1337 runs byte-identical; seed99 preserves required district counts. |
| 21 | Four fresh roadtool/closeup 720p captures: legible26 px chips, bounds/no overflow; ribbon width43/64=.671875. |
| 22 | Dawn ribbons low saturation (~.0049), no clipped pixels. Declared wash hue205.05/204.52/205.63 at roadtool6.5/12/22. |

API checked: select, setOption, current, options, pointer, pointerNdc, click, rightClick, commit, cancel, state, undo, redo, history, costOf, setSelection, clearSelection, pickAt, setPreviewVisible, stats, cropRects, _showcasePoses, serialize and deserialize; live behavior and source inspected as above. Unknown/degraded paths do not throw. Every fresh probe has errors:[]. Full measurements: apicheck.json, follow.json, supplement.json, dynamic-repeat.json and pixels.json in shots/tools/r3/critic-probe. Whole-frame p1 minimum5.2166; p99 maximum246.7662.

## Ranked issues

1. **major: A continuous road drag exceeds the live-frame target** — Fresh 60-frame avenue drag from (0,0) to (96+i*0.02,34+i*0.01), aerial, averages 1.771666667 ms, maximum 2.300000001 ms against acceptance 13 average <=1.2 ms and architecture 2 ms hard ceiling. A shorter different path averages 1.001666667 ms, so this is geometry/path dependent, not every frame. Static six-pose average 0.0216667 ms and idle 0.0083333 ms pass; geometry allocation delta is zero. Cache/precompute repeated paved-surface sampling or reduce invalidated work without hiding the cost or changing the metric. Evidence: shots/tools/r3/critic-probe/dynamic-repeat.mjs; dynamic-repeat.json; supplement.json; apicheck.json

2. **minor: The literal raw-terrain lift band remains unmet over pavement** — Every unique indexed live ghost vertex was sampled. Raw terrain lift is 0.149999142–0.560679765 m, with 2718 vertices outside 0.10–0.20 m; stats report the actual range. Lift above max(terrain,pavement) is 0.149999137–0.150000869 m, and the roadtool/closeup images show continuous previews without prior asphalt holes. At (73,10), pavement is 0.408883079 m above terrain: these two vertical constraints cannot both hold there. Acceptance 2 is literally unmet, but this is not evidence of visible floating above pavement. Preserve the penetration fix; resolve the contract with the integrator instead of returning to the broken terrain-only geometry. Evidence: shots/tools/r3/critic-probe/supplement.json pose; roadtool_12.png; closeup_12.png; docs/core-requests/roads.md

## Strengths

- All six previews and the full tools API are present; 41 edges, 36 nodes, 440 zoned cells, 34 buildings and 28 history entries are staged through command surfaces.
- Two fresh eight-action traces restore every one of 263169 terrain heights and all four counters exactly through undo and redo.
- Neutral white road paint remains continuous over pavement at 1080p; night luminance/contrast and dawn saturation pass, with readable 26 px chips at 720p.
- Bulldoze now removes exactly four buildings and fourteen props and marks victims with kind-sized volumes; sculpt maximum 2 m step is 1.316046119 m.
- Tools attribution is 8 calls and 8940 triangles, well below target. No geometry growth, clean cancellation, in-place selection, event deduplication, actual HUD operation and unavailable-neighbour failures pass.

## Every captured image, inspected

- `shots/tools/r3/critic-probe/aerial_6p5.png` → All six poses read clearly over the compact district: white curve, green zone cells, rings, demolition and clinic/invalid pills. Warm low-sun scene; ribbon has no white-out.
- `shots/tools/r3/critic-probe/aerial_12.png` → All six poses read clearly over the compact district: white curve, green zone cells, rings, demolition and clinic/invalid pills. Noon contrast is clear.
- `shots/tools/r3/critic-probe/aerial_17p5.png` → All six poses read clearly over the compact district: white curve, green zone cells, rings, demolition and clinic/invalid pills. Warm evening backdrop; tool colours stay restrained.
- `shots/tools/r3/critic-probe/aerial_22.png` → All six poses read clearly over the compact district: white curve, green zone cells, rings, demolition and clinic/invalid pills. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/street_6p5.png` → Broad white preview remains continuous behind foreground foliage; several anchors leave the tight frame. No asphalt punctures. Warm low-sun scene; ribbon has no white-out.
- `shots/tools/r3/critic-probe/street_12.png` → Broad white preview remains continuous behind foreground foliage; several anchors leave the tight frame. No asphalt punctures. Noon contrast is clear.
- `shots/tools/r3/critic-probe/street_17p5.png` → Broad white preview remains continuous behind foreground foliage; several anchors leave the tight frame. No asphalt punctures. Warm evening backdrop; tool colours stay restrained.
- `shots/tools/r3/critic-probe/street_22.png` → Broad white preview remains continuous behind foreground foliage; several anchors leave the tight frame. No asphalt punctures. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/skyline_6p5.png` → The tool pills cluster over the small district and dominate at this distance; no tool geometry appears in water reflections. Warm low-sun scene; ribbon has no white-out.
- `shots/tools/r3/critic-probe/skyline_12.png` → The tool pills cluster over the small district and dominate at this distance; no tool geometry appears in water reflections. Noon contrast is clear.
- `shots/tools/r3/critic-probe/skyline_17p5.png` → The tool pills cluster over the small district and dominate at this distance; no tool geometry appears in water reflections. Warm evening backdrop; tool colours stay restrained.
- `shots/tools/r3/critic-probe/skyline_22.png` → The tool pills cluster over the small district and dominate at this distance; no tool geometry appears in water reflections. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/closeup_6p5.png` → Continuous white curved band, cyan cue and legible segment/angle/grade pills; cursor/cost extend beyond the tight right edge. Warm low-sun scene; ribbon has no white-out.
- `shots/tools/r3/critic-probe/closeup_12.png` → Continuous white curved band, cyan cue and legible segment/angle/grade pills; cursor/cost extend beyond the tight right edge. Noon contrast is clear.
- `shots/tools/r3/critic-probe/closeup_17p5.png` → Continuous white curved band, cyan cue and legible segment/angle/grade pills; cursor/cost extend beyond the tight right edge. Warm evening backdrop; tool colours stay restrained.
- `shots/tools/r3/critic-probe/closeup_22.png` → Continuous white curved band, cyan cue and legible segment/angle/grade pills; cursor/cost extend beyond the tight right edge. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/roadtool_12.png` → Clean two-segment white bend, cyan node wash and seven dark pills (lengths, 133-degree angle, grade, cost and snap); no pavement intrusion. Noon contrast is clear.
- `shots/tools/r3/critic-probe/roadtool_22.png` → Clean two-segment white bend, cyan node wash and seven dark pills (lengths, 133-degree angle, grade, cost and snap); no pavement intrusion. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/zonetool_12.png` → Four green high-density cell previews, painted footprint and two pills; some edges are naturally hidden by scene objects. Noon contrast is clear.
- `shots/tools/r3/critic-probe/zonetool_22.png` → Four green high-density cell previews, painted footprint and two pills; some edges are naturally hidden by scene objects. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/sculpt_12.png` → Rounded terrain knoll with two concentric rings and raise-volume readout; invalid-road preview remains visible nearby. Noon contrast is clear.
- `shots/tools/r3/critic-probe/sculpt_22.png` → Rounded terrain knoll with two concentric rings and raise-volume readout; invalid-road preview remains visible nearby. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/bulldoze_12.png` → Four houses and fourteen props marked, 18-item/refund readout; trees, lamp poles and small objects use visibly different volumes. Noon contrast is clear.
- `shots/tools/r3/critic-probe/bulldoze_22.png` → Four houses and fourteen props marked, 18-item/refund readout; trees, lamp poles and small objects use visibly different volumes. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/service_12.png` → Filled clinic footprint and dashed coverage circle with placement pill; the services neighbour is still unavailable at this wave. Noon contrast is clear.
- `shots/tools/r3/critic-probe/service_22.png` → Filled clinic footprint and dashed coverage circle with placement pill; the services neighbour is still unavailable at this wave. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/invalid_12.png` → Entire road preview is red with a legible excessive-grade reason. Noon contrast is clear.
- `shots/tools/r3/critic-probe/invalid_22.png` → Entire road preview is red with a legible excessive-grade reason. Night white remains neutral and readable.
- `shots/tools/r3/critic-probe/roadtool_6p5.png` → Clean two-segment white bend, cyan node wash and seven dark pills (lengths, 133-degree angle, grade, cost and snap); no pavement intrusion. Warm low-sun scene; ribbon has no white-out.
- `shots/tools/r3/critic-probe/roadtool_12_720.png` → Clean two-segment white bend, cyan node wash and seven dark pills (lengths, 133-degree angle, grade, cost and snap); no pavement intrusion. Noon contrast is clear. 1280×720: chip height and viewport bounds preserved.
- `shots/tools/r3/critic-probe/roadtool_22_720.png` → Clean two-segment white bend, cyan node wash and seven dark pills (lengths, 133-degree angle, grade, cost and snap); no pavement intrusion. Night white remains neutral and readable. 1280×720: chip height and viewport bounds preserved.
- `shots/tools/r3/critic-probe/closeup_12_720.png` → Continuous white curved band, cyan cue and legible segment/angle/grade pills; cursor/cost extend beyond the tight right edge. Noon contrast is clear. 1280×720: chip height and viewport bounds preserved.
- `shots/tools/r3/critic-probe/closeup_22_720.png` → Continuous white curved band, cyan cue and legible segment/angle/grade pills; cursor/cost extend beyond the tight right edge. Night white remains neutral and readable. 1280×720: chip height and viewport bounds preserved.
- `shots/tools/r3/critic-probe/all_aerial_12.png` → Live HUD over terrain and roads; democity remains a stub, so no populated whole-city claim is made. Noon contrast is clear.
- `shots/tools/r3/critic-probe/all_night_street_22.png` → Night terrain and HUD render without errors; no staged tools ribbon is present to measure bloom. Noon contrast is clear.
