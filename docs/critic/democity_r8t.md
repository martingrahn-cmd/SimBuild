# Democity R8t — independent parcel-capacity audit

**ACCEPT the corrected diagnostic and the decision to make no product change. Democity and whole-game remain 6.0/10 — FAIL; rank 1 remains open.**

I re-read the corrected builder report before finalizing this review. It now identifies 804/789 as conditional estimates, limits the connectivity check to retained subsets, and requires actual slot/claim-order replay before selecting a product change. Those corrections address the main overclaim found in this audit. The findings below explain the remaining model/evidence limits; they are not a claim that the corrected report still asserts impossibility.

The saved counts are internally consistent. The component model, however, imposes conditions that the actual lot sampler does not enforce. Its 804/789 totals are conditional packing estimates, not validated ceilings on the accepted implementation. Coordinated frontage work is a reasonable investigation, not an established mathematical necessity.

## Independently checked arithmetic

| Measurement | Seed 1337 | Seed 7 |
| --- | ---: | ---: |
| Painted cells | 9,964 | 10,113 |
| Actual recorded lots / buildings | 612 / 612 | 648 / 648 |
| Claimed / unclaimed cells | 4,882 / 5,082 | 5,176 / 4,937 |
| Unclaimed within / beyond stored preferred depth | 4,376 / 706 | 4,262 / 675 |
| All cells within stored preferred depth | 9,258 | 9,438 |
| Leftover four-neighbour component quotient sum | 143 | 128 |
| Existing lots plus that estimate | 755 | 776 |
| Leftover eight-neighbour quotient, recorded | 150 | 137 |
| Full four-neighbour quotient sum | 794 | 778 |
| Full eight-neighbour quotient, recorded | 804 | 789 |
| Class-only quotient sum | 1,229 | 1,244 |

For both seeds, I recomputed claimed + unclaimed = painted; within + beyond = unclaimed; all unclaimed class, depth and road-type sums; preferred class totals; four-neighbour class sums; and class-only quotients using the exact current palette areas. Those areas are 6/9 residential, 6/9 commercial, 12/16 industrial and 9/16 office cells for low/high density. Tool constants match the fixed nominal dimensions in the zoning contract.

Class-only terms sum to **151 + 777 + 205 + 56 + 9 + 31 = 1229** and **143 + 778 + 226 + 52 + 39 + 6 = 1244**. The JSON report retains explicit class-keyed terms.

I checked all 120 retained component records against floor(cells / minimum area). Seed 1337's largest 30 leftover/full components contain 512/863 cells and sum to 30/77 estimated lots; seed 7's contain 528/762 cells and sum to 29/61. Every retained quotient matches. The full lists are absent, so the eight-neighbour totals and connected-component counts cannot be independently reconstructed from saved raw topology. Aggregate agreement does not substitute for that reconstruction.

Unclaimed cells are 51.004%/48.818% of painted stock. Only 13.892%/13.672% of unclaimed cells exceed their stored class depth. This supports “mostly inside the preferred band”; it does not isolate all remaining loss as width remainder.

## Ranked findings

1. **Component ownership is stricter than actual lot sampling** — owner: zoning. tools/parcel-capacity-profile.mjs:28,32 groups by stored cell edgeId/side/class and filters stored depth. grid.js:319-327 instead checks sampled cell existence, matching class and prior claims; it does not enforce stored edgeId, side or depth. A lot road owner does not imply identical owner metadata on every sampled raster cell. 804/789 are conditional component-model quotients, not established upper bounds on current legal lot generation. Reassignment is not solely a hypothetical future algorithm.

2. **Existing-lot validation does not validate the bound assumptions** — owner: zoning. Tool line36 first filters lot.cells to the preferred set, then checks only eight-neighbour connectivity, without owner/class component identity. It also does not check unique cell count against LOT_SLOTS*LOT_DEPTH or disjoint allocation across lots. grid.js:400-403 appends quantized keys without deduplication. The recorded zero disconnected lots proves connected nonempty retained subsets only. It does not prove all original lot cells fit one component or satisfy the distinct-cell area assumption. Actual duplicate/overlap counts were not captured; this review does not claim they occurred.

3. **No candidate justified is supported; architectural necessity is not proved** — owner: democity. The actual _splitRun fixes k=floor(runLength/want) before remainder/corner assignment. The current run alone cannot gain another complete lot from moving its remainder. However altered sampling, earlier-edge competition or later-edge claims are not explored by this diagnostic. Historical r7s trials are two specific rejected layouts, not an exhaustive search. Accept the decision to select no product change. Qualify coordinated frontage work as a reasonable next investigation, not a proven requirement or proof that every bounded splitter change is impossible.

4. **Saved evidence supports arithmetic checks but not replay of all connectivity counts** — owner: democity. Only 30 largest four-neighbour components per category per seed are saved. No full cells/lots map or eight-neighbour component list is present. pass checks only errors and the cell partition equality. Class aggregate quotients and all 120 retained component quotients can be recomputed; global connectivity counts and 150/137/804/789 cannot independently be rebuilt from this artifact. Repeated-run equality is a builder assertion without a second retained final record.

## Decision and next action

The fixed-run statement is sound: `_splitRun` sets `k = floor((i1-i0)/want)` before distributing leftover or corner slots. Moving the same run's remainder cannot increase that k. It does not establish the global effect on subsequent competing edges, other sampling phases or regrouped runs. The nominal dimensions also do not by themselves prove that every lot consumes that many distinct raster keys; source appends sampled keys without a uniqueness assertion. This is a missing validation, not a finding that actual duplicate lots exist.

The r7s saved records independently confirm 573 lots/buildings for the 64 m trial, 695 for the 80 m no-split trial, and 612 for the restored city; road nodes are 515/342/468. Those two rejected layouts are useful negative evidence. They do not exhaust owner-safe frontage strategies. R8g likewise documents 612 lots despite expanded real mixed-use treatment.

The next bounded task should belong to **zoning**, supported by democity/roads/buildings: validate the diagnostic against the actual ordered slot runs and retain enough cells/lot membership to replay it. Measure mixed stored-owner membership, excluded-depth keys, unique-cell area and overlap before advertising a ceiling. Then assess real feasible yield for both seeds, either from a justified splitter intervention or specific proposed frontage corridors. Preserve normal APIs, building/lot identities, restage, fixed class dimensions and rendering budgets. No product candidate, filler buildings or score increase is justified by R8t alone.

## Inspection and limits

I read the R8t builder report, entire profiling tool and profile JSON; current grid sampler/regenerator/splitter and palette; relevant architecture and zoning contract sections; R7s report and all three cityscale records; and the R8g independent report. Exact inspected paths and source hashes are listed in the JSON companion. The current tool/report specify 1280×720 High/Metal/headless, not a 1080p capture.

The tool reads real public world maps after readiness and does not mutate city state. Its pass flag checks zero sim/browser errors and the cell partition equality only. Both seeds pass that narrow check. Existing-lot `disconnected=0` checks connected nonempty **filtered subsets**, not all assumptions of the packing model. A single final profile remains; repeated-run equality is reported by the builder but not independently replayable from duplicate records.

No screenshots were requested or inspected; this diagnosis has no visual claim. No live browser, build, performance, API/restage, memory or full-game test was run by this critic. The conditional class-only quotient is neither a legal-lot construction nor proof that 1400 lots are impossible. No game gate is newly passed, no visual score is recalibrated, and no product source, STATUS or HANDOFF file was changed.
