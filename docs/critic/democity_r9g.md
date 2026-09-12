# Democity R9g — independent actual-frontage rejection review

**ACCEPT the qualified rejection record; REJECT the appended street candidate. Democity and whole-game remain6.0/10 — FAIL.** The actual road produces−1 net lot on seed1337 and zero on seed7, with fewer claimed cells in both. This is enough to reject it as a city-fabric improvement. No product change, score increase or whole-game rank closure is justified.

## Recomputed evidence

I parsed the full13,080,742-byte final summary, independently recomputed all six world censuses, lot keys, gains/losses, ID comparisons, membership duplicates/overlaps and building-to-lot bindings, and compared both candidate repeats. I individually inspected all eight1920×1080 originals and four differences at original resolution. All four RGB metrics and4× difference images reproduce exactly. The JSON companion registers every path and detailed result.

| Seed/state | Road edges | Painted cells | Claimed cells | Lots/buildings |
| --- | ---: | ---: | ---: | ---: |
|1337 baseline |604 |9,964 |4,882 |612/612 |
|1337 candidate |605 |9,966 |4,870 |611/611 |
|7 baseline |646 |10,113 |5,176 |648/648 |
|7 candidate |647 |10,107 |5,170 |648/648 |

Seed1337 gains no stable key and loses industrial key`335:right:42,19`, containing12 cells. Seed7 gains`1140:right:45,25`, `1140:left:46,22` and`348:right:51,26`, while losing`346:left:45,16`, `346:left:45,20` and`348:right:51,25`. Two gained keys belong to the new road; the third is an8m shift along an existing frontage. This is redistribution, not three net new lots. Industrial stock falls59→58 on1337 and stays52 on7; every other type/density count stays equal.

All six runs have unique stable keys, unique lot IDs, no duplicate cell references, no inter-lot overlaps and all claimed keys in serialized paint. I verified a bijection between every lot's buildingId and each serialized building's lotId, rather than relying only on equal totals. Each startup reports16 ready modules and zero engine/browser/HTTP errors. The recurring deferred-furniture and missing reserved-university warnings are retained.

The candidate edge is1073 between nodes69/70 on1337 and1140 between67/68 on7, last in both road arrays. Every old edge payload remains exactly equal. Only the two shared nodes'`y` fields change; IDs, horizontal positions and designY remain equal. Baseline endpoint degrees are1/1 on1337 and2/1 on7: only1337 connects two former dead ends; seed7 connects a dead end to a through road.

## Identity, determinism and scope

Of611 retained keys on1337,424 retain their lot ID and382 retain their building ID. Of645 retained keys on7,519 retain their lot ID and359 retain their building ID. Thus187/126 lot IDs and229/286 building IDs differ across the two fresh startups. **Every retained key preserves its exact cell array and planar geometry/type/density/corner fields.** This is a useful precise target for the next allocation trace.

These are fresh worlds, not a mutation of one established city. `regenLots()` explicitly builds a map of previous stable keys and restores matching lot/building IDs. R9g does not demonstrate a defect in that ordinary incremental preservation path. The staged startup may allocate new IDs differently even where final frontage matches. Buildings additionally fork plan RNG from building ID/type/density and spawn through lot iteration order, so ID changes can influence distant architecture. That is a source-supported mechanism to investigate, not a completed attribution of every changed building.

The repeated candidate projection is structurally exact for counts, Roads, lots, Zoning, Buildings, Simulation, Services, Transit, terrain hash/samples, economy and Democity stats with phaseMs/stageMs removed. Other recorded statistics contain timing differences: Roads ms, Zoning overlay ms, Services buildMs/gridMs and module timings. This is not an assertion that the entire JSON, renderer or world state is identical. The public Simulation serialization's city field isnull, and unrecorded owners/runtime traffic are outside the comparison. Terrain is represented by hashes and21 samples, so the terrain hash preimages cannot be independently reconstructed from this artifact.

Buildings, Simulation, Transit and economy differ from baseline on both seeds; Services are exact. Population/jobs change8,046/19,566→8,049/19,381 and8,018/23,109→8,021/23,056. Cash changes26,397.355105→26,037.377747 and25,738.835428→26,373.115376. Seed7 loan principal increases125,000→126,000. These are deterministic staged-simulation outcomes, not evidence of money corruption or a player's road charge. Negative/zero frontage yield remains the decisive rejection reason.

## Road and visual qualifications

The72m stored design profiles rise17.746385574m and10.003980160m: mean endpoint rise/run24.647757742% and13.894416889%. The revised builder report correctly labels these as design endpoint averages. They are not maximum, rendered-pavement or driven grades. Roads owns subsequent terrain conformation; sampled terrain endpoint rises are12.737526894m and8.326004505m. Surface queries contain7/8 null results and irregular non-null values. This evidence does not certify continuous pavement sampling, collision behavior or physical road validity, and no invented numeric grade gate is applied.

R8y's prospective yield used an8m alley calibration, including5.55m frontage and approximately4.05m paved half-width. R9g constructs a16m two-lane street, consistent with the authored street type at this deliberately omitted horizontal pair. It is a valid test of that street proposal, but not a like-for-like falsification of the alley estimator. Narrower geometry remains untested. Nor does a failed proxy screen elsewhere prove an adjacent actual design cannot work.

The directed originals show a real connected road with local building replacement/removal. They do not show useful density gain. The aerial originals visibly redistribute tower crowns, heights and facade forms well beyond the link; those broad changes are not an attractive cost for zero additional city fabric. No road traffic/access benefit was measured that could outweigh the failed frontage objective.

| Seed/view | Normalized RGB MAE | Changed pixels | Strong pixels≥8 |
| --- | ---: | ---: | ---: |
|1337 aerial |0.026260433057 |683,641 |445,008 |
|1337 directed |0.028071959095 |1,804,660 |675,483 |
|7 aerial |0.008054776386 |257,342 |130,713 |
|7 directed |0.022308150266 |1,727,637 |471,479 |

These numbers are not quality scores or exclusive road/terrain-impact measurements. Directed cameras target live terrain+5m: retained midpoint samples imply target-height shifts of+0.770115852m and+0.373091221m. Consequently those pairs are not exact same-camera controls; their shoreline and terrain-wide differences include viewpoint movement. Fresh-page water/environment and actual traffic continue to add uncontrolled pixel differences. No camera matrix, replay control or synchronized per-image performance sidecar is supplied. The structural world comparisons and clearly visible changed building forms support rejection without exclusive pixel attribution.

## Source and verification decision

I reconstructed the unique response replacement and all three source hashes: product plan`c439a6e88f87f40aac5182698d4406540e21f04ce659975b2b0e8cb4e4d26bd6`, baseline route`9b7aba470c24351ad55ad46d82e9c71cb50d2b769f8ee0cbb34b5a7e0f48838d`, candidate route`f4ceb3326ef5748cfd2ef6c0aacc96f07fd543e115dc327d06f837e7d5fd50da`. The only candidate world mutation is the appended owner-built edge through the existing helper. Source routing/exposed diagnostic globals affect disposable pages; production plan remains unchanged. The current verifier hashes`92d20fe76fbfc0d39f023daf426d41e34f34e846bd0814715dd6bb38729e58da`.

The retained production build passes163 modules in329ms. I did not run a new browser/build or mutate a saved world. A full day/night matrix and rollback experiment are unnecessary to reject a never-installed candidate already failing net yield; their absence must not be described as validation of restore, ordinary UI controls, sustained FPS or retained heap. The earlier timing-related harness failure is builder-reported history; this review bases repeatability on the final normalized projection.

The next bounded priority remains whole-game rank1, but it should be **read-only staged-allocation tracing** with accepted and rejected geometry held fixed. Trace the first divergence in emitted lot order, nextLot assignment, previous-key reuse, building spawn order/IDs and ID-derived plan RNG at successive startup stages. Establish the mechanism before proposing a product repair. Ordinary existing-world regeneration is a separate experiment if a specific hypothesis later requires it; R9g does not justify rewriting its identity contract or blocking every other frontage design.

Only `docs/critic/democity_r9g.md` and `.json` were written. Product source, STATUS, HANDOFF and builder report were not edited.
