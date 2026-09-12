# Democity R9a — independent LOD1 range review

**ACCEPT the bounded 175 → 205 m product change. Democity remains 6.0/10, FAIL; the 8.5 whole-game gate is not met.**

I independently inspected all eight accepted/candidate original PNGs, all four crop pairs and all sixteen final-matrix originals. In the park daylight pair, trees beside the arena and along the right park edge visibly change from flat silhouettes into the established multi-card crowns. The foreground-to-middle-distance foliage reads more consistently in depth. Riverfront gains are smaller and concentrated around the left foreground buildings and right vegetation edge. Night gains are weaker. The replacement crowns themselves still have conspicuous separated, coarse leaf clumps and some thinner silhouettes; this is a modest local improvement, not a foliage redesign. I see no definite new opacity wall, missing scene content or material failure in the supplied views.

The final matrix retains repeated towers and houses, large empty grassy parcels, weak industrial ground detail, coarse mountain materials, distant cutout trees and dark night crowns. None warrants a score increase or closure of the whole-game foliage issue.

## Source, ownership and actual LOD semantics

Current `src/modules/props/chunks.js` hashes to `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`. Replacing its single `LOD1_R = 205` occurrence with `175` reconstructs `123bd2b7d723899efcac8e882ad81e6a8f59efeb9efd60b4382c4d876c1ca3ba`, exactly matching both recorded pre-source hashes. This establishes the stated one-line Props-owned scope. There is no geometry/material/atlas/record/save/RNG edit in that delta, nor any Democity-only camera branch.

The range is applied to a 32 m sub-bucket's mean x/z and chunk-derived y, not independently to each tree centre. `BAND=12` is a half-width: the complete outer transition interval changes from **163–187 m to 193–217 m**, each 24 m wide. Stable index hashing chooses complementary visible instances; both meshes receive copied instances in a transition band. `lodHistogram()` exposes these copied counts, including fade-hidden copies, rather than unique visible-tree identities. Consequently “+44 LOD1 entries” is verified, but “exactly 44 distinct trees become visible LOD1” is not.

The existing top-down branch (`pitch > 0.62`, no forced debug LOD) overrides ordinary distance selection with LOD1/blend1. It also bypasses CAP1, explaining the unchanged aerial 1,939 LOD1 entries. The normal tier1 check retains `CAP1=520`; it is not an unconditional global ceiling because LOD0-transition secondary copies bypass that check too. No cap saturation was tested. These are inherited semantics, not regressions introduced by R9a.

Camera updates remain movement/pitch-triggered and amortized across chunks. No moving-camera traversal proves how the shifted boundary looks over time. The static shots do not certify absence of popping or pitch-boundary discontinuity.

## Independent recomputation

All twelve census rows and all eight directed rows exactly match their individual sidecars. Each is ready, has a real Props API, all sixteen modules ready and zero recorded engine/browser/module errors.

| Range | Park LOD0/LOD1/impostor | Riverfront LOD0/LOD1/impostor | Aerial LOD0/LOD1/impostor |
|---:|---:|---:|---:|
| 175 | 0/160/2,175 | 18/135/546 | 0/1,939/0 |
| 190 | 0/178/2,158 | 18/156/533 | 0/1,939/0 |
| 205 | 0/204/2,127 | 18/179/507 | 0/1,939/0 |
| 220 | 0/223/2,106 | 18/200/477 | 0/1,939/0 |

The 205 m setting is a bounded choice, not a demonstrated optimum: 190/220 were censused but not subjected to matched visual judgment. Aerial census geometry remains exactly 321 draws/1,548,741 submitted triangles across all four ranges; no aerial image equivalence test was supplied.

| Directed pair | LOD1 delta | Impostor delta | Submitted triangle delta | Draw delta |
|---|---:|---:|---:|---:|
| Park 12 | +44 | −48 | +6,092 | −1 |
| Park 22 | +44 | −48 | +6,092 | −1 |
| Riverfront 12 | +44 | −39 | +11,732 | −1 |
| Riverfront 22 | +44 | −39 | +11,732 | −1 |

The park count total is 2,335→2,331; riverfront is 699→704. These are compatible with changed overlapping transition copies, not evidence of tree creation/deletion. The geometry deltas are aggregate renderer values; multiplying histogram deltas by canonical tree triangles does not isolate the full result because culling, hidden copies and render passes intervene. No per-pass ledger is retained.

I decoded all eight originals and independently recomputed every field in `comparison-metrics.json`:

| Pair | Normalized RGB MAE | Changed pixels % | Pixels with max-channel delta >16 % | Max channel delta |
|---|---:|---:|---:|---:|
| Park 12 | 0.0061824984366 | 17.70495756 | 2.35479360 | 215 |
| Park 22 | 0.0019312231451 | 6.96387924 | 1.52155671 | 196 |
| Riverfront 12 | 0.0017731393226 | 1.58232060 | 0.73017940 | 203 |
| Riverfront 22 | 0.0006784456195 | 3.94405864 | 0.45780285 | 193 |

All saved values match. These fresh pages include traffic/frame differences; these metrics measure image change rather than foliage-only quality. Fixed accepted-then-candidate ordering and single endpoint FPS values do not establish a causal performance improvement or regression.

All sixteen final sidecars independently reproduce the entire saved summary: **16 ready, zero errors, maximum468 draws, 2,275,778 triangles, minimum49.5FPS, one below50, maximum730.2MB raw endpoint heap.** The miss is `suburb_12`. Triangle maximum is `downtown_22`; draw maximum is `park_12`; heap maximum is `suburb_17p5`. These final draw/triangle values are maxima sampled over the screenshot tool's short measurement window, whereas the directed/census values are endpoints. They must not be directly equated. The strict50FPS gate remains unpassed; this is not sustained gameplay timing. Raw heap is not forced-GC retained memory and does not establish a leak, but the512MB project gate is also unpassed.

## Contracts and their actual scope

The API record has all thirteen expected functions, two true module-deserialize returns and identical before/after census:468 nodes,604 edges,9,964 cells,612 lots/buildings,31 services, one line/eight stops. Residential coverage is503/507 power+water and306/507 health+education. Eight `gotoStop` calls return true and the invalid index returns false; no settled visual tour traversal is recorded.

I independently compared all three mixed-use projections:32 unique selected IDs/records,612 total buildings, matching building-to-lot ownership, mixedUse/planMixedUse/retail true, and exact recorded fields after each full-save restore. The tool records selected plan fields, not complete plan objects, and ignores restore return values. This supports the stated sampled identity/link preservation, not universal save atomicity or full-world equivalence.

Both stored restage digest strings independently match for1337→7→1337→7. Their projections contain612/648 buildings,31 services and the authored Transit plan. The digest covers building IDs/positions/level/type, service IDs/kinds/positions and the plan, with repeated seeds restored from cache. It omits Props records, RNG, complete plans, economy, full road topology and the broader simulation. Heap endpoints481.1→899.4→931.7→1,024.8MB remain disclosed; no retained-memory or candidate-causal claim is justified.

The retained `shots/democity/r9a-lod1-range/build.log` was independently inspected: Vite completed successfully with163 transformed modules in323ms. I did not personally rerun that build. The current builder report also incorporates the corrected fade-inclusive histogram, transition half-width and CAP1 scope wording. Routed census/visual tools preserve Vite-transformed imports and replace only the marker, but require the old175 source marker and will fail unchanged on the now-installed205 source. Raw hashes are checked; individual transformed response bodies and full-repository source manifests are not archived.

## Inspection register

Originals individually viewed:

- `shots/democity/r9a-lod1-range/accepted_park_12.png`
- `shots/democity/r9a-lod1-range/accepted_park_22.png`
- `shots/democity/r9a-lod1-range/accepted_riverfront_12.png`
- `shots/democity/r9a-lod1-range/accepted_riverfront_22.png`
- `shots/democity/r9a-lod1-range/candidate_park_12.png`
- `shots/democity/r9a-lod1-range/candidate_park_22.png`
- `shots/democity/r9a-lod1-range/candidate_riverfront_12.png`
- `shots/democity/r9a-lod1-range/candidate_riverfront_22.png`
- `shots/democity/r9a-lod1-range/final-matrix/downtown_12.png`
- `shots/democity/r9a-lod1-range/final-matrix/downtown_17p5.png`
- `shots/democity/r9a-lod1-range/final-matrix/downtown_22.png`
- `shots/democity/r9a-lod1-range/final-matrix/downtown_6p5.png`
- `shots/democity/r9a-lod1-range/final-matrix/industry_12.png`
- `shots/democity/r9a-lod1-range/final-matrix/industry_17p5.png`
- `shots/democity/r9a-lod1-range/final-matrix/industry_22.png`
- `shots/democity/r9a-lod1-range/final-matrix/industry_6p5.png`
- `shots/democity/r9a-lod1-range/final-matrix/park_12.png`
- `shots/democity/r9a-lod1-range/final-matrix/park_17p5.png`
- `shots/democity/r9a-lod1-range/final-matrix/park_22.png`
- `shots/democity/r9a-lod1-range/final-matrix/park_6p5.png`
- `shots/democity/r9a-lod1-range/final-matrix/suburb_12.png`
- `shots/democity/r9a-lod1-range/final-matrix/suburb_17p5.png`
- `shots/democity/r9a-lod1-range/final-matrix/suburb_22.png`
- `shots/democity/r9a-lod1-range/final-matrix/suburb_6p5.png`

Derived pairs also viewed:

- `shots/democity/r9a-lod1-range/park_12_crop_pair.png`
- `shots/democity/r9a-lod1-range/park_22_crop_pair.png`
- `shots/democity/r9a-lod1-range/riverfront_12_crop_pair.png`
- `shots/democity/r9a-lod1-range/riverfront_22_crop_pair.png`

All JSON evidence under this round was parsed, including every original sidecar, all twelve census sidecars, both summaries, image metrics and all three contract/restage files. The companion JSON lists every exact path.

## Remaining priority

**Props:** check moving-camera behavior across193–217m and cap-stressed views before extending the range further. Continue addressing crown coherence and distant impostors within the current rendering budget; this change only improves the nearest part of that problem. **Democity/roads/zoning/buildings:** the established higher-ranked sparse urban fabric issue remains. **Core/rendering:** retain unresolved sustained FPS and memory gates and investigate them using appropriate measurements.

There is no fresh CS2 calibration, blind judgment, weather/quality/species sweep, multi-seed LOD census, forced-GC test or long playtest in this local audit. No gameplay, city state or simulation improvement is claimed. This bounded visual acceptance leaves Democity and whole-game quality at6.0FAIL.
