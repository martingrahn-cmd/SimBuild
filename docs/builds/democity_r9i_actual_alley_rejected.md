# Democity R9i — actual alley candidate rejected

## Local decision

**Reject the disposable alley candidate. Keep product source and Democity/whole-game score unchanged at 6.0/10, FAIL.**

The remaining R8y/R9g geometry question was tested through the actual Roads and Zoning owners at the same `-8,-11 -> -7,-11` endpoints. The alley produces positive net frontage on both seeds and repeats exactly, but the shipped player road tool rejects that same link on both seeds because its grade exceeds the established 12% limit. A staged city link that the player cannot legally reproduce is not an acceptable density repair.

## Method

`tools/actual-frontage-alley.mjs` performs no source edit. A disposable Vite response appends one real `alley` edge after all accepted plan edges, then starts fresh actual-Chrome/Metal baseline, candidate and candidate-repeat worlds for seeds 1337 and 7. It records Roads, Zoning, Buildings, Simulation, Services and Transit owner state, stable lot keys, raw IDs, terrain samples, duplicate/overlap checks and two visual views. Candidate directed views reuse the baseline terrain target height, eliminating R9g's small camera-height mismatch.

`tools/r9i-tool-validity.mjs` then loads unchanged product worlds and uses only the public Tools API to pose the exact alley draft. It does not commit. The before/after road, lot and building counts remain equal.

## Owner result

| Seed | Roads | Zoned cells | Claimed cells | Lots/buildings | Stable keys gained/lost |
|---|---:|---:|---:|---:|---:|
| 1337 | 604 -> 605 | 9,964 -> 9,972 | 4,882 -> 4,894 | 612 -> 613 | 2 / 1 |
| 7 | 646 -> 647 | 10,113 -> 10,113 | 5,176 -> 5,200 | 648 -> 650 | 2 / 0 |

All six worlds reach 16 ready modules with zero engine, browser or HTTP errors. There are no duplicate or overlapping public lot memberships. The accepted road-edge payload prefix remains exact, the new edge is last, and both candidates repeat exactly under the captured deterministic projection. Services serialize exactly in both seeds. Fresh building/simulation state changes as expected from the R9h sequential-ID boundary; these separate startups are not evidence of incremental restore failure.

All eight baseline/candidate originals and four amplified differences were inspected. The actual road closes a missing local connection coherently and the new industrial frontage is real; seed 1337 joins two degree-1 endpoints, while seed 7 joins degree-2 and degree-1 endpoints. In seed 7, two retained identity keys (`346:left:45,20` and `348:right:51,25`) also change local parcel geometry/cells, so retained-key identity alone is not a geometry-invariance result. The broad aerial differences remain dominated by the already diagnosed fresh building-ID procedural changes. No fake or showcase-only object is involved.

## Rejection gate

The public Tools draft is invalid before any mutation:

| Seed | Length | Measured grade | Tool result |
|---|---:|---:|---|
| 1337 | 72 m | 20.80% | `Grade 21 % > 12 %` |
| 7 | 72 m | 12.32% | `Grade 12 % > 12 %` |

Both draft screenshots show the shipped red invalid ribbon and grade chip on the exact endpoints. Road/lot/building counts remain unchanged because no commit occurs. Positive density is therefore insufficient: the candidate violates the current player-authoring contract in both required seeds.

## Evidence

- `shots/democity/r9i-actual-frontage/final-v1/summary.json`
- `shots/democity/r9i-actual-frontage/final-v1/tool-validity.json`
- eight baseline/candidate originals and four difference images under the same evidence root
- `tools/actual-frontage-alley.mjs`
- `tools/r9i-tool-validity.mjs`

## Limits and next direction

This rejection applies to this endpoint pair and straight alley only. It does not prove that every local frontage link is invalid, that a curved or differently anchored link cannot pass, or that incremental stable-key reuse is defective. Because the candidate fails before legal commit, the conditional incremental-identity experiment is no longer warranted for this link.

The next city-fabric search must include the public road-tool validity check before expensive owner staging. It may consider other existing-node links or legal multi-segment/curved alignments, but must still require positive net lots on both seeds, exact repeatability, retained geometry, coherent visuals and no regression of architecture, simulation or restore contracts.
