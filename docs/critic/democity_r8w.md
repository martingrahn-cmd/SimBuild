# Democity R8w — independent raw slot-key audit

**ACCEPT as diagnosis only. No product change; Democity and whole-game remain6.0/10 — FAIL.** The recorder observes the actual break reason and its arithmetic checks out. A disposable comparison of deterministic edge orders is a reasonable next hypothesis, not proof of a capacity gain or the uniquely best next intervention. Rank1 remains open.

## Source-route verification

I independently rebuilt the instrumented source from the tool. Current product SHA256 remains `030ee74038052ff28f7b3c68378d5954ed01f373a8318879a583e6da04c83ecb`; diagnostic source hashes to `174c0f1e3b28abdb64d295521a9bcaa5cb9213ed6f68243bd8cf06338c6d12c7`, exactly matching the evidence. Both replacement markers occur once.

The instrumented `_slots` preserves the same key calculation, lookup, predicate order, break points and `keys.push`. It adds reason/key fields at each existing break and copies slot values into the recorder. Missing cell is checked before class mismatch, which is checked before prior claim. No new ownership, road, cell, lot or class decision is introduced. Extra allocation/recording work can change timing; this is not performance-neutral instrumentation or a benchmark.

The zoning owner obtains frontage from roads and samples the road geometry; its run ordering still processes avenue/street/other classes with the existing length/seed ordering. R8v normalizes membership only after claims are decided. The recorder reports that accepted behavior, rather than inventing a separate capacity allocator.

## Recomputed inventory and packing

I traversed every raw side/slot, all1447 run rows and all1260 emitted lots. Every saved summary field, stop partition, run quotient, per-run preferred-key count, adjacent overlap, repetition scope and final ownership classification matches independent recomputation.

| Measurement | Seed1337 | Seed7 |
| --- | ---: | ---: |
| Ordered edges / sampled sides | 569 /1098 | 611 /1180 |
| Slot samples | 7344 | 7852 |
| Unpainted first-cell / painted | 3718 /3626 | 4073 /3779 |
| Full preferred-depth / shallow | 2048 /1578 | 2116 /1663 |
| Full-depth runs / emitted lots | 730 /612 | 717 /648 |
| Shallow stops: prior claim / unpainted / class | 856 /501 /221 | 930 /541 /192 |
| Nominal lot-width slots | 1408 | 1505 |
| Quotient remainder | 640 | 611 |
| Absorbed remainder / adjacent shallow | 96 /73 | 105 /76 |
| Final lot width, in8m slots | 1577 | 1686 |
| Unabsorbed full-depth slots | 544 | 506 |
| Too-short runs / their slots | 336 /419 | 300 /394 |
| Unabsorbed remainder in productive runs | 125 | 112 |

The identities hold exactly:1408+640=2048 and1505+611=2116;1408+96+73=1577 and1505+105+76=1686. Independent corner-extension replay uses retained accepted R8v road endpoints/node degrees and exactly matches every run's extension counts. Short-run slots are already included in remainder totals. These are width/slot-use accounts, not distinct land-area accounts or a predicted number of extra lots.

Using the accepted R8v saved painted-cell classes, road graph and earlier-edge final owners as auxiliary evidence, I independently reconstructed **all15196 sampled key sequences and exact stop reasons** from the supplied coordinates/normals. Every sequence, available depth and stop key agrees. All post-replay lot memberships and available frame fields also match accepted R8v. This corroborates the recorder beyond its aggregate pass flag; the extra source records are named in the JSON report.

## Repetition and cause semantics

The full preferred-depth inventory has6535/6773 references to6336/6601 unique keys:199/172 excess references involving196/167 repeated keys. Of those keys135/105 are ultimately unclaimed.191/165 repeat across different edges. Actual final memberships still comprise4882/5176 globally unique claimed keys, without any within-lot duplicates or cross-lot overlaps. Candidate frontage can be sampled repeatedly and never emitted; raw repetition is not a new ownership defect.

Only4/2 repeated references occur within one slot; adjacent same-side columns overlap by3/3 references, with zero exactly identical adjacent column pairs. This weakens the proposed simple duplicate-column-removal approach. It does not rule out every sampling change.

Two label cautions matter. `sameEdgeSameSideNonAdjacent` counts same-slot references too: its4/2 keys here are delta-zero cases; there are **zero** repeated keys across genuinely nonadjacent distinct slots of one edge side. `nonAdjacentRepeatedKeys`193/164 means no adjacent pair anywhere and also includes cross-edge repetition. Scope flags overlap and cannot be summed as a partition. Similarly, class/depth/null break totals34/141/392 and31/141/403 are transitions immediately after full slots, not every sampler failure or every possible run separator.

The shallow prior-claim count is54.2459%/55.9230% of shallow painted slots, making it the largest category in that subset. But419/474 already stop at the first depth key, and3718/4073 first-cell samples are unpainted. These are not mostly nearly complete free columns. Reasons are first-failure labels:64/63 class-change stops also encounter a prior-claimed key. The categories accurately report branch precedence, not independent physical causes whose removal can be added together.

## Invariants and next hypothesis

The tool records equal lot/building counts and equal projected lot invariants before/after `diagnose`. Source inspection confirms that projection checks IDs, building links, edge/side, identity anchor, xyz, width/depth, heading, class, corner and frontage parameter. **The before/after strings are discarded**. Their equality is a recorded result, not independently reproducible from two saved snapshots. Membership arrays, normal axes, full building contents, economy and allocator state are outside the projection. The post-state agreement with richer accepted R8v evidence strengthens confidence without making R8w a full save/world contract.

Prior-claim competition is sufficiently measured to justify a bounded alternate-order diagnostic on disposable pages. Its result must be **net real lot yield**, including the lots removed from roads that used to claim first. Preserve full baseline/alternative ownership and lot tables, identity changes, building stock and economy/restore implications. A larger count of newly available columns alone is not success. Earlier road-layout trials and this diagnosis do not prove either that order changes will help or that coordinated new frontage is unnecessary.

No screenshot was requested or inspected, because there is no visual claim. No browser rerun, build, FPS, memory, save/gameplay or product test was performed by this critic. Both supplied pages report zero browser/sim errors. Source-route allocation overhead and `diagnose` regeneration remain confined to disposable evidence pages. Only these critic reports were written; product source, STATUS and HANDOFF were not changed.
