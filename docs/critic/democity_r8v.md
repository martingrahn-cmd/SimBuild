# Democity R8v — independent lot-membership review

**ACCEPT the bounded zoning correctness change. Democity and whole-game stay 6.0/10 — FAIL. Rank 1 remains open.** It removes redundant cell memberships while preserving the existing final owner, lot frames/IDs, recorded buildings and economy. It adds no city capacity or demonstrated visual improvement.

## Source and ownership

I compared current `src/modules/zoning/grid.js` with the exact pre-source snapshot. The three hunks retain each generated lot's original first cell as `_identityCell`, prefer that anchor in `_lotKey`, and normalize memberships after all claims have been assigned. The filter keeps one occurrence only when `claimed.get(key) === lot.id`, preserving the existing final claimant. Normalization occurs after the complete generation pass, so it does not alter subsequent frontage sampling or claim competition.

Pre-source SHA256 is `7e027c0fb9cb1ebb9b77cf10b5f77126e59f1615589e0ca0464f7855ab609eab`; current source and candidate snapshot both equal `030ee74038052ff28f7b3c68378d5954ed01f373a8318879a583e6da04c83ecb`. The populated `source/SHA256SUMS` agrees. Its old empty `source/pre/SHA256SUMS` is not evidence.

`_identityCell` is owner-created live metadata, not a new saved authority or consumer requirement. It is regenerated from the original sampled cell sequence; zoning serialization still saves painted cells only. The fallback to `cells[0]` supports previous in-memory lot records. This is a reasonable safeguard against normalization changing a matching key. In these two seeds every anchor still equals the normalized first key, however: the more difficult anchor-retention case is not actually exercised. The source does not change lot sampling, dimensions, positions, RNG, economy or save schema.

## Independently recomputed contracts

I parsed both complete contract branches and checked all20 snapshots: initial, two refreshes and two restores for each seed under baseline and candidate. Every stored stable projection matches. Cross-branch counts, invariant lot frames/identity, reconstructed final claims, public cell-centre picks, zoning saves, building serialization, simulation serialization, roads and recorded economy except derived `net` are equal.

| Result | Seed1337 | Seed7 |
| --- | ---: | ---: |
| Real lots / buildings | 612 / 612 | 648 / 648 |
| Raw references before → after | 4889 → 4882 | 5184 → 5176 |
| Removed references | 7 | 8 |
| Within-lot duplicates before → after | 5 → 0 | 6 → 0 |
| Cross-lot shared keys before → after | 2 → 0 | 2 → 0 |
| Globally claimed keys | 4882 unchanged | 5176 unchanged |

Every candidate array equals independent normalization of the baseline membership using its existing final owner. Changed lot IDs are227,235,609,610,612 for seed1337 and63,200,379,643,647,648 for seed7. No earlier-claim-winner identity regression occurs.

Public `lotAt` is geometry-aware rather than a raw cell-owner getter. I independently reconstructed all9964/10113 painted-cell picks from stored frames and the source algorithm: every result agrees. Both versions include580/535 geometric fallback picks on unclaimed cells. One claimed cell per seed lies outside its lot frame and picks null (`166,89`, lot611; `109,85`, lot647). These are unchanged semantics, not candidate failures, and disallow claiming that public picks equal the ownership map everywhere.

The existing shortfalls remain: lot227 and lot200 each have5 unique keys while retaining a16×24m frame. Dedupe does not create a sixth cell, resize a building or delete a lot. Nominal geometric dimensions and distinct raster membership remain different measures.

Both restores complete without throwing. Current `saves.restore` returns undefined on success, so stored `returned:null` is consistent. Derived `economy.net` resets from10098.9743/9653.1372 to0 after restore in both branches; that exclusion is disclosed, while serialized simulation and all other recorded economy fields match. These are current-save reloads without intervening city perturbation, not direct tests of importing a different historical city or rollback.

The32 mixed-use records match before and after two restores. Restage1337→7→1337→7 reproduces both saved digests exactly, with zero errors. That digest covers selected building/service fields and planned transit, not full world state or every zoning membership.

The corrected baseline and candidate slot-order files were both re-read after the output-path mistake was repaired. Every ordered edge, slot string, run row and run summary matches; quotients remain612/648. Candidate memberships independently reproduce last-owner normalization, with no duplicates/overlaps, no class/depth mismatch and the same one below-nominal unique-area lot per seed. The replay itself retains a narrow digest-equality boolean; the richer contract branches supply the independently comparable snapshots.

## Visual inspection and measurements

I individually viewed all7 originals: standard smoke plus all3 baseline and3 candidate directed views. I also viewed the candidate montage and all6 derived strip/difference images. The JSON inspection register lists every exact path.

The directed pairs show unchanged building placement, zoning outlines and ground treatment. No clear new boundary gap or structural regression is visible. Broad sparse blocks and existing foliage/coast limitations remain. One pair is pixel-identical. Independent comparison of the original RGB pixels reproduces:

| View | Changed pixels | Changed fraction | Normalized RGB RMSE |
| --- | ---: | ---: | ---: |
| seed1337-edge444 | 0 | 0% | 0 |
| seed7-edge443 | 31420 | 3.409288% | 0.0005883724 |
| seed7-edge685 | 13761 | 1.493164% | 0.0003461392 |

All5 zoning-mesh attribute/index hash records match per pair, as do scene draw/triangle counters:131/877890,160/1125861 and73/558599. This supports unchanged supplied overlay geometry, not full-scene byte equivalence: the tool stores32-bit hashes, not raw arrays, materials and transforms.

The visual tool attempts to hide traffic/transit/props/effects once before settling40 frames. **That does not fully isolate props:** its `water:reflection` listener sets the group visible again after reflection; trees remain visible in the originals. Environment/shadow/wind phase differences are plausible contributors, but the harness does not establish that all pixel differences come solely from environment. The tiny distributed differences and exact overlay records support the local no-observed-regression judgment without claiming a perfectly static scene.

The standard smoke is ready for all16 modules with zero errors,430 draws and2062014 triangles, but measures **11FPS** and571.2MB raw heap. Directed candidate FPS is53.1/10.3/8.5 versus baseline53.1/54.1/51.2. Those low results stay recorded; they are not a demonstrated candidate-caused slowdown or a passing sustained50FPS test. Directed raw heap peaks at667.5MB candidate and723.5MB baseline; restage endpoints reach923.4MB. None is forced-GC retained memory. No controlled regeneration-cost measurement or full visual/performance matrix was supplied.

## Remaining priority and limits

City fabric/capacity remains the highest broader priority for democity with zoning/roads/buildings. R8v fixes a small ownership inconsistency; it does not advance612/648 toward the city-scale gates. The five-key lot issue, historical-import/anchor edge cases and current performance uncertainty remain explicit. Do not promote this acceptance to a whole-game pass or score increase.

This is an independent audit of supplied images, complete JSON records and source, with offline recomputation. No new browser capture, build, gameplay session or API/performance run was performed. References were not recalibrated for this nonvisual delta. Only these two critic files were written; no production, STATUS or HANDOFF changes were made.
