# Democity R9j — independent legal-alley rejection audit

**ACCEPT the qualified rejection record; REJECT advancing this alley as a density candidate. Democity and whole-game remain 6.0/10, FAIL against the unchanged 8.5 gate.**

The public draft is valid on both seeds, but actual owner staging yields zero additional lots on seed 1337 and one on seed 7. This fails the predeclared requirement of positive net frontage on both seeds. No product change is warranted by this experiment.

## Inspected evidence and source

Read the full builder report, both verifier scripts, the complete 13,083,739-byte owner `final-v1/summary.json`, accepted screen `final-v3/tool-validity.json`, superseded screen root JSON, and the R8y opportunities data. Checked the relevant current Tools grade/validation contract and prior R9h/R9i conclusions. Independently viewed all eight owner originals, four ×4 differences and two final-v3 draft screenshots individually at original 1920×1080 resolution. The exact register is below and in the JSON; contact sheets were not used as substitutes.

Reconstructed baseline/candidate plan responses from `tools/r9j-actual-frontage.mjs` without running its browser section. All three recorded SHA-256 values match current accepted plan and reconstructed routes. The unique guarded replacement appends one real alley between authored grid nodes `-2,-7` and `-1,-7`, exposes the diagnostic node table, and leaves existing plan edges intact. It does mutate the disposable candidate world through its normal owner staging; it does not install product code or add fake scenery. No browser or build rerun was required for this rejected route. The builder's carried 163-module build is prior unchanged-source evidence, not a fresh critic build.

## Public draft validity

Both accepted rows are directly `valid:true`, `reason:null`, affordable, with unchanged before/after road/lot/building counts and no recorded engine/browser/HTTP errors. Snapped nodes are 100/101 for seed 1337 and 103/104 for seed 7. Their x/z endpoints match the owner candidate, and all four baseline endpoints have degree 2.

| Seed | Run | Terrain endpoint rise | Recomputed grade | Displayed metric | Cost |
|---|---:|---:|---:|---:|---:|
| 1337 | 80 m | 7.784414291 m | 9.730517864% | 9.73% | 106 |
| 7 | 80 m | 5.884117126 m | 7.355146408% | 7.36% | 102 |

These agree with the shipped evaluator's terrain endpoint-rise/horizontal-path-length calculation and 12% ordinary-road threshold. The screenshots visibly show white valid ribbons with grade/cost chips. This proves preview validity for the specified straight, elevation-zero, magnet-snapped alley on the unchanged world. It does not prove a committed native user action, payment/undo behavior, a maximum driven slope, or that the saved authored road design is exactly the preview's vertical profile. Only the first anchor is clicked; count equality is not a full-world nonmutation oracle.

The superseded root JSON really has `pass:false` despite valid rows. Comparing every retained row field except image path across the original root, final-v2 and final-v3 gives exact equality. Thus the early aggregate failure is a harness failure, not contrary road-legality evidence. The specific unary-coercion cause is builder provenance: no old executable snapshot is retained in the inspected screen evidence. The intermediate final-v2 checked only `typeof draft.valid === 'boolean'`, so its aggregate could pass an invalid draft; it is superseded. The current verifier and accepted final-v3 require `draft.valid === true`. I re-read the revised builder paragraph, parsed final-v3, recomputed both grades and independently viewed both replacement originals. This closes the boolean-type harness weakness. The two superseded final-v2 originals were also inspected, for 16 images viewed overall and 14 in the accepted evidence register.

## Actual owner yield and invariants

| Seed | Roads | Painted cells | Unique claimed cells | Lots/buildings | Gained / lost / retained keys |
|---|---:|---:|---:|---:|---:|
| 1337 | 604→605 | 9964→9941 | 4882→4879 | 612→612 | 1 / 1 / 611 |
| 7 | 646→647 | 10113→10094 | 5176→5189 | 648→649 | 1 / 0 / 648 |

Recomputed all counts, stable-key differences, memberships, serialized building/lot bijections and repeated candidate projections from the full retained data. All six owner worlds have 16 ready modules, no recorded errors, unique public memberships and one actual building per lot. Candidate repeats match the declared projection exactly; only Democity phase/stage timings are excluded from its stats component. This is a bounded serialized projection, not an all-runtime-state determinism claim; full terrain payload is absent, so only the recorded terrain digest comparison can be checked.

Seed 1337 gains `1073:left:108,61` and loses `350:right:100,59`, with unchanged class totals. Seed 7 gains `1140:left:108,60`, adding one low-density industrial lot. All 611/648 retained keys preserve audited planar geometry and cell memberships. Same numeric lot IDs are only 80/634; same building IDs are 247/382. These are separate fresh startups, not incremental regeneration or save-restore tests. Prior stable-key reuse is not falsified by these numeric differences.

Every prior edge payload is exact and the new edge is last. Only the two endpoint-node y values change per seed. Services serialize exactly; Buildings, Simulation, Transit, economy and terrain hashes differ on both. Population changes 8046→8043 and 8018→8019; cash changes 26397.355105→26049.717007 and 25738.835428→25456.127437. Roads/Zoning rebuilding and fresh ID-keyed building generation explain why this is not a local-pixels-only candidate. Painted-cell loss by itself is not a universal quality defect, since a legitimate road consumes land; rejection here rests on the specific cross-seed net-lot requirement and lack of demonstrated broader benefit.

## Visual judgment

The new alley forms a readable short connection through the industrial block. In the supplied directed angles it joins the two existing streets without an obvious floating road or disconnected junction. This is a limited visual judgment, not a complete contact/collision certificate. The baseline/candidate aerials remain sparse and visibly change many building forms; there is no evidence of a whole-city quality-band improvement.

The verifier matches directed target height to baseline, addressing the previous R9g camera-height issue. It does not retain actual camera matrices per image. Fresh pages, frame settling, moving traffic, smoke and environmental rendering remain confounds. Recomputed every RGB metric and verified the four ×4 difference images exactly:

| Seed/view | Normalized RGB MAE | Changed pixels | Max-channel change ≥8 pixels |
|---|---:|---:|---:|
| 1337 aerial | 0.012200068209 | 367322 | 210553 |
| 1337 directed | 0.010139349078 | 292796 | 142689 |
| 7 aerial | 0.029621332355 | 739043 | 479551 |
| 7 directed | 0.008239360803 | 251995 | 108520 |

These measure full-frame differences, not road-only attribution or quality. Aggregate state JSON accompanies these images rather than independent renderer-performance sidecars. No FPS, raw-heap, triangle, full-matrix or save/load gate passes are established.

## Exhaustion boundary and next ranked issue

Recomputed R8y's `actualGap && predictedLots > 0` sets. Seed 1337 has two: `-8,-11→-7,-11` and `-2,-7→-1,-7`. Seed 7 has those plus `8,-7→9,-7` and `1,3→1,4`. The intersection is exactly the two now tested. R9i rejects the first on public grade; R9j rejects the second under the positive-yield-on-both-seeds rule. All four R8y positive rows in seed 7 and both in seed 1337 fail its stronger `safeReadOnly` screen. R8y was a calibrated heuristic; actual rebuilding supersedes its predicted yield for these tested straight alleys only.

This closes the common positive shortlist, **not** all cardinal missing links, all widths/alignments, mid-block splits, seed-specific legal designs, or combined strategies. Stopping this shortlist is reasonable prioritization. The stronger proposition that every later isolated link must fail, or that only broad coordinated redesign can work, is not proved by these two tests.

Rank 1, sparse fabric, remains open for a separately designed frontage/layout effort. For the next bounded independent path, return to rank 2, Props foliage: the newly inspected ordinary directed views still show exposed flat crowns and dense cut-out conifers after the accepted atlas work. First attribute the currently visible defect to its actual normal LOD/class in these accepted-source views, then consider one owner-local crown/shading candidate. Preserve the accepted range, transition and cap settings and do not repeat rejected force-LOD material/alpha experiments without new evidence. This is a proposed measurement step, not a score promise or reopening of R9f's closed top-cell bleed question. All other whole-game visual/performance issues remain open.

## Individual image register

- `shots/democity/r9j-legal-frontage-owner/final-v1/baseline_seed1337_aerial.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/baseline_seed1337_directed.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/candidate_seed1337_aerial.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/candidate_seed1337_directed.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/baseline_seed7_aerial.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/baseline_seed7_directed.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/candidate_seed7_aerial.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/candidate_seed7_directed.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/seed1337_aerial_difference_x4.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/seed1337_directed_difference_x4.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/seed7_aerial_difference_x4.png`
- `shots/democity/r9j-legal-frontage-owner/final-v1/seed7_directed_difference_x4.png`
- `shots/democity/r9j-legal-frontage-screen/final-v3/tool_draft_seed1337.png`
- `shots/democity/r9j-legal-frontage-screen/final-v3/tool_draft_seed7.png`
