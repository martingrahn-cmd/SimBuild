# Democity R8u — independent slot/claim-order audit

**ACCEPT the diagnostic. A bounded zoning-owner membership correction is justified for testing, not yet accepted as product code. Democity and whole-game remain 6.0/10 — FAIL; rank 1 remains open.**

I independently re-parsed all 1,180 ordered edge records and 15,196 observed slot tokens, reconstructed all 1,447 full-depth runs, and inspected all 1,260 emitted lot records and 10,073 raw cell references programmatically. Every saved run, per-edge lot count and membership aggregate matches. This supplies the actual run evidence missing from R8t without turning current counts into a universal capacity ceiling.

## Verified replay

| Measurement | Seed 1337 | Seed 7 |
| --- | ---: | ---: |
| Ordered edges / full-depth runs | 569 / 730 | 611 / 717 |
| Eligible full-depth slots | 2,048 | 2,116 |
| Sum of fixed-width run quotients | 612 | 648 |
| Recorded actual lots / buildings | 612 / 612 | 648 / 648 |
| Slots in too-short runs | 419 | 394 |
| Quotient remainder slots, including short runs | 640 | 611 |
| Classed but shallow slots | 1,578 | 1,663 |
| Null/unpainted slot samples | 3,718 | 4,073 |
| Raw / within-lot unique references | 4,889 / 4,884 | 5,184 / 5,178 |
| Globally unique claimed keys | 4,882 | 5,176 |
| Other stored edge / side references | 1,361 / 754 | 1,496 / 773 |
| Class mismatch / beyond preferred depth | 0 / 0 | 0 / 0 |
| Within-lot repeated references | 5 | 6 |
| Keys shared across different lots | 2 | 2 |

Widths/depths match current palette constants. Each edge's independently calculated quotient equals both its replay count and the count of emitted membership records referencing that edge. Total tokens partition exactly into full-depth, shallow and null samples. Short-run slots are a subset of remainder slots; neither is a promise of recoverable frontage, and some remainder is absorbed by corner extensions.

The per-lot uniqueness sums minus the two cross-lot excess references yield 4882/5176 global keys, matching R8t. Every repeated key's stored metadata agrees. Mixed-owner totals are raw reference counts, not counts of distinct physical cells. These actual memberships confirm that stored nearest-road ownership is not the same constraint as real lot frontage.

## Overlap and safe candidate boundary

Seed1337 lots235/236 on edge444 left share `63,98` and `64,98`; seed7 lots63/64 on edge443 left share `125,85`, while lots379/380 on edge685 right share `12,146`. All are real duplicated lot membership, not hypothetical estimates.

**Do not simply remove overlap from the later lot.** The first cell of lot236 is `63,98`; lot64 starts at `125,85`; lot380 starts at `12,146`. `_lotKey()` includes the first cell. First-winner dedupe would therefore alter the stable identity key for all three affected later lots, despite leaving enough cells by the nominal area calculation.

I also performed a bounded offline normalization of saved memberships that keeps the later claimant and removes repeated references within each lot. It preserves every first key and the global claimed union in both seeds. Earlier lot235 changes8→6 unique keys; lot63 changes10→9; lot379 changes7→6, meeting their nominal6/9/6 minima. Later ownership agrees with the current `claimed.set(key, lot.id)` overwrite behavior. This supports a last-owner-preserving candidate, not a tested implementation or a universal guarantee for other layouts.

Four lots per seed contain internal duplicates: seed1337 IDs227,609,610,612 and seed7 IDs200,643,647,648. Their exact keys and before/after sizes are recorded in the JSON companion. Lot227 and lot200 already have only5 unique raster keys for a nominal6-cell residential-low lot. Dedupe cannot add a missing cell. Keep that existing limitation explicit; neither delete the lot nor invent cells or resize its geometry to conceal it. A nominal world-space rectangle does not itself guarantee an equal number of distinct quantized raster samples.

Source supports the failure mechanism. `regenLots()` receives the complete array returned by `genEdge()` before updating the global claimed map. Both side slot tables and all resulting runs in that edge therefore see earlier-edge claims, but not newly generated same-edge claims. `_splitRun()` appends sampled keys without deduplication. The supplied overlap pairs are consistent with that mechanism. Exact per-slot key sequences are absent, so the sampling collision is not geometrically replayed offline.

## Digest, state and evidence scope

The recorded before/after counts agree and `publicLotDigestEqual` is true for both seeds. Inspection of the tool confirms an actual in-page comparison of sorted `{id, buildingId, edgeId, side, cells}` projections. **The digest strings are discarded**, so their equality cannot be independently recomputed from saved before/after records. Calling this a full public-lot digest overstates coverage: positions, dimensions, heading, class, building contents and economy are not included. Equal building counts do not establish unchanged building/economy state.

`diagnose()` is a public diagnostic API, but internally calls `regenLots()`, replaces lot objects/map contents and advances `nextLot` before stable IDs are restored. Disposable pages are appropriate. It is not a pure getter. No product or saved user data was edited by this audit.

R8u now retains complete emitted lot-cell memberships and observed class/depth slot strings. It still does not retain every sampled slot key, all unclaimed painted cells or road geometry, so “full raw topology” should mean this narrower retained evidence. Arithmetic and membership reconstruction are exact; independent geometric rerunning of the entire generator is not possible from this JSON alone. The pass flag checks errors, count equality and the narrow digest boolean, not every city-state invariant.

## Next priority and limits

The next owner is **zoning**, supported by buildings/democity: test deduplication while preserving current last-claim ownership, stable first keys, lot frames/counts, building links, global union and deterministic regeneration. Check existing-city migration/load as well as fresh seeds, repeated regeneration/restage and visible zoning boundaries. A simplistic earlier-claim winner is contraindicated by the supplied data. No rank1 capacity improvement, new visual score or general performance benefit follows from removing a handful of redundant references.

I read the R8u builder report and entire profiling tool/JSON, current grid regeneration/sampler/splitter/diagnose paths, palette, public zoning API and R8t critic. Exact paths, source hashes, recalculated records and limits are in the JSON report. No screenshots were requested or inspected; no browser, build, FPS, memory, API/restage or gameplay test was rerun. No product, STATUS or HANDOFF changes were made. Acceptance is for the evidence-based diagnosis and bounded candidate direction only.
