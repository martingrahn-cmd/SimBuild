# Democity R9h — independent staged-allocation audit

**Decision: ACCEPT the bounded diagnosis. No product change is justified by this trace. Democity remains 6.0/10, FAIL; the whole-game 6.0/10 FAIL assessment and 8.5 pass gate are unchanged.**

## Scope and inspection register

Read the current `docs/builds/democity_r9h_allocation_trace.md`, all of `tools/staged-allocation-trace.mjs`, and the complete 4,071,978-byte `shots/democity/r9h-allocation-trace/trace.json`. Reviewed `docs/critic/democity_r9g.md` and its JSON, the retained R9g final summary, and the relevant Democity staging, Zoning allocation/normalization, and Buildings spawn/RNG source. This is a nonvisual diagnosis. No new screenshots were required or taken; the eight R9g originals and four differences were individually inspected in that preceding review.

The verification below replays arithmetic and relationships from retained evidence, rather than rerunning a browser. Only this critic report pair was written.

## Independently verified results

All four captured worlds have 16 ready modules and zero recorded engine/browser/HTTP errors. Each retains two completed `regenLots()` calls through the readiness snapshot. Both calls start with an empty prior-lot map and `nextLot=1`; the first emits no lots and the second creates the full table. The source places `zoning.refresh()` before the bulk paint. Therefore the empty-to-painted startup explanation is supported; the trace itself does not directly record painted-cell counts or call-stack phase names.

Recomputed the deterministic jitter and comparator for all eight saved orders. Removing the candidate edge leaves the exact baseline existing-edge order. Positions below are **zero-based indices in the full eligible-edge order**, not street-only ranks.

| Seed | New edge / index | New-edge yield | Changed existing key-sequence rows | Baseline → candidate lots | Final nextLot |
|---|---|---:|---:|---:|---:|
| 1337 | 1073 / 213 | 0 | 1 | 612 → 611 | 613 → 612 |
| 7 | 1140 / 154 | 2 | 2 | 648 → 648 | 649 → 649 |

For seed 1337, edge 335 at baseline index 219/candidate 220 loses `335:right:42,19` and retains `335:right:42,16`. All 187 retained keys with different numeric lot IDs lie in baseline ID interval 426–612, mapping to candidate 425–611: exactly −1 each.

For seed 7, edge 348 at index 140 replaces `348:right:51,25` with `348:right:51,26` without changing its count. New edge 1140 then adds `1140:right:45,25` and `1140:left:46,22`. Edge 346 at baseline index 228/candidate 229 loses `346:left:45,16` and `346:left:45,20`. The 126 retained keys with different IDs occupy baseline 307–432 and candidate 309–434: exactly +2 each. The later two-lot loss restores the allocator offset.

Every raw generated ID, per-edge post-generation counter, added list, empty removed list and final counter agrees with sequential allocation. Replaying last-owner claims and per-lot deduplication reconstructs the final membership arrays exactly. Raw within-lot duplicate occurrences remain 5/5 for seed 1337 baseline/candidate and 6/6 for seed 7; cross-lot repeated claims remain 2 in each. These are pre-normalization observations, not renewed public membership defects. Final normalized references are 4882→4870 and 5176→5170. Final key/ID/identity-cell/membership projections match the corresponding R9g retained worlds exactly. Their road/lot/building counts also agree.

This trace corroborates the earlier finding that 611/645 retained stable keys preserve planar lot geometry and membership. It does not establish that hundreds of parcel geometries moved. All recorded final-regeneration building bindings are null at that stage. Buildings subsequently assigns its own sequential IDs and uses ID-keyed RNG. That source makes broad fresh-world form differences plausible, but R9h does **not** trace each spawn or derive the separate 229/286 building-ID changes event by event.

## Source and instrumentation audit

Reconstructed both routed plans and the instrumented grid from current source using the verifier's transformations, without launching its browser section. All five SHA-256 values match `trace.json`; exact values are recorded in the accompanying JSON. Current plan and grid remain the accepted product files.

The candidate injects only the same disposable R9g 16 m street between authored nodes `-8,-11` and `-7,-11`. Both variants receive the same grid observer. `genEdge()` already returns an eager array; instrumentation invokes it once, copies its output before existing reuse/claim processing, and leaves those decisions intact. `_lotKey()` and `hash2()` are pure reads/calculations. The four grid replacement markers are guarded for uniqueness. The plan marker is not similarly guarded by the tool, but has the expected single occurrence in this audited source and the reconstructed hash is exact. Logging allocates memory and changes host timing; this is no timing or performance experiment.

## Qualifications and next priority

Accept “two calls” as the captured startup interval, not a promise that no later refresh occurs. The verifier snapshots after readiness, without a further quiescence interval. It does not retain a full-world transaction, independent RNG/economy equality, or repeat runs of the instrumented candidate. R9g's candidate-repeat evidence is prior evidence with its stated serialized-projection limits. Equal lot/building counts alone would not prove a binding bijection; that stronger check comes from the earlier R9g payload audit.

This is not an incremental regeneration, save/restore, or migration test. Existing `regenLots()` explicitly reuses prior stable-key IDs and building bindings; there is no prior table in the measured fresh allocation. No identity rewrite or speculative save fix is warranted.

The next bounded owner-safe experiment is the **same endpoint pair as an actual alley**, routed through the real Roads/Zoning owners. R8y used alley calibration while R9g tested a 16 m street, so useful alley yield remains unmeasured. Measure actual net lot/claimed-cell changes on both seeds before proposing a product candidate; then require repeatability, retained planar geometry, actual road/terrain profile and visual integrity. Mean endpoint rise/run is not a driven maximum-grade test. Test incremental stable-key preservation separately if the candidate first demonstrates useful yield. This is a hypothesis, not a prediction or an exhaustive search of localized designs.

Whole-game rank 1, sparse urban fabric, remains open. R9h improves causal diagnosis only; it adds no frontage, buildings, gameplay or visual quality. Other ranked visual and performance issues remain open, and no score increase or gate pass follows.
