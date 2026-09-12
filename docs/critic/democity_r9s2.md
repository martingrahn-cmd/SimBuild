# Democity R9s2 — independent review

**REVISE the submitted broad road-history repair. The paused exact-restore milestone passes; Democity and whole-game remain 6.0/10 FAIL.** The disposable alley remains rejected as authored infill.

This review is pinned to the submitted Tools hash `f76c0ffebf004ce05b2e2993e032bb4253c70342cbc5b5d721bd7471cd902e23`, source hashes recorded in `history-boundaries.json`, and main summary `ec06c56a81048a321cde4e5d55200af415ef7e6ea2dce5d666afc76abee1d52f`. Tools changed again during the review. No later revision is credited with these captures or judged by this verdict. The preserved source snapshot is `shots/democity/r9s2-road-safe-restore/source/`: all seven saved files were independently hash-verified, including reconstructed Tools and the subsequently added `src/modules/tools/undo.js` matching `80804e54…`. The snapshot completion does not change the R9s2 verdict. The later product is a separate R9t revision awaiting its own evidence.

## Findings

1. **Unrelated new construction can lose its lot link (Tools/Zoning/Buildings).** The new Buildings restore correctly limits demolition/restoration to changed lot IDs. However, undo still deserializes the complete old Zoning envelope. For an unaffected lot with unchanged key/ID that was free before the road and gained a building afterward, its saved `buildingId:null` overwrites the current owner link. The new building object survives because the lot is outside the affected set, but the live inverse pointer is lost. This is a concrete source-derived case, not a new browser reproduction. The supplied later-state test levels an already occupied lot; it does not test free-to-built growth. Preserve current links for unaffected keys/IDs and check both ownership directions after undo/redo.

2. **Failure compensation is only verified after settlement and for one recoverable rejection (Tools).** `restoreOwners` captures rollback owners without first settling pending Zoning. An immediate undo with a late rejection can capture a post-road graph alongside pre-road lot identities, making compensation itself fail. The supplied test waits 120 frames, injects one `false` before Zoning mutates, and allows every compensation operation to succeed. A compensation failure/throw is still not backed by an UndoStack recovery journal. This is narrower than the statement that any failed leaf is atomic.

3. **Not every rebuild call is checked (Roads/Tools).** `roads.restoreTransaction` now returns the rebuild result, which is an improvement. But `roads:rebuilt` still emits after a caught rebuild failure; initial road commit ignores the rebuild result; and the height-restore helper ignores its secondary road-rebuild result. A successful completion event and general checked-owner claim need narrower semantics or a repair.

4. **Road demolition remains open.** The existing endpoint inverse has not moved onto these primitives. Straight construction fixtures do not certify demolition or long, mixed histories.

## What the evidence establishes

I parsed all 47,085,667 bytes of the new main summary and independently recomputed every retained phase's counts, stable-key sets, fresh-repeat, exact/semantic comparisons, road components, and both directions of lot/building ownership. All 20 phase snapshots have a full bijection with no duplicate IDs, duplicate cells or overlapping lot memberships. Every phase records 16 ready modules and no engine errors; all six worlds have empty browser/HTTP-error arrays.

| Main fixture | Seed1337 | Seed7 |
|---|---:|---:|
| Before lots/buildings | 612/612 | 648/648 |
| Commit | 612/612 | 649/649 |
| Undo | 612/612 | 648/648 |
| Redo | 612/612 | 649/649 |
| Retained lot and building IDs | 611 | 647 |
| Fresh repeat / undo exact / redo exact | true / true / true | true / true / true |
| Undo / redo semantic | true / true | true / true |
| Commit/redo cost | 96 | 96 |

All retained compared fields now match in undo and redo, including Roads profile arrays, Zoning identities, Buildings, Simulation and Transit. Terrain in this main test remains a digest plus 21 samples. The replacement verifier now requires all exact/semantic flags in its aggregate pass; unlike the R9p gate, these are no longer informational only.

The paused all-mode test returns seed1337 `612/612/0 → 612/611/1 → 612/612/0 → 612/611/1` and seed7 `648/648/0 → 649/647/2 → 648/648/0 → 649/647/2` for lots/buildings/free. Money restores on undo and deducts96 on redo. These are counts and link summaries, not complete owner records, but they support absence of eager new construction in paused all-mode.

The boundary test executes A and B in one synchronous page evaluation, then compares undo B to a separately settled A-only world. Retained six-owner digests match for that comparison and both-redo versus original two-commit state. Undo-A baseline equality is retained only as a boolean: its digest row is omitted. All history counts follow 2/0→1/1→0/2→2/0. The selected second transaction is `(80,120)→(80,200)`, also96.

The forced-leaf test returns false, preserves six owner digests and the 1/0 history position, then successfully undoes to baseline. Money equality is a retained boolean without the compared amounts. The digest selector explicitly excludes Simulation, even though the transient snapshot computes its hash. This is not an all-owner atomicity proof.

The later-state fixture advances one fixed Simulation tick to121301 and changes existing building4/lot4 to level3. Its preserved-record and affected-record equality results are booleans; the compared after-records are not retained. Money moves from25679.251538487555 before undo to25775.251538487555 and back after redo, proving the recorded later income was not rewound. This supports preserving that level change and tick, not new construction or sustained autonomous growth.

## Compatibility, source and contracts

All declared evidence hashes match. The seven frozen source hashes match their submitted source boundary; six still match the current tree, while Tools moved during review. The full frozen hashes are in the JSON report. `ARCHITECTURE.md:401` and the five owner core requests now declare Roads restoration/completion, Zoning identity/settlement, Buildings lot-scope restoration, and Simulation reconciliation. The declarations about preserving unrelated construction and checking every owner call exceed the submitted implementation in the cases above.

The retained build succeeds with163 modules (392ms is a build duration, not game performance). Both Democity API checks return two successful deserializations and eight successful tour stops with equal retained census. Those calls target the Democity serializer, not exhaustive owner save semantics.

The legacy test loads a current normalized seed7 save with only the Zoning envelope reduced to historical `{cells}`. Two core restores return true. Twelve other modules compare exactly; Zoning content/lot links and Props content compare semantically. The only retained differences are `nextLot649→1945` (+1296=2×648) and Props version66→68. That is a qualified compatibility pass, not full-byte identity or every historical-save guarantee. Full raw payloads are absent from this JSON.

The cross-seed report's zero count means no height difference greater than1e-6 across263169 transient values, not a retained raw-byte proof. Road hashes quantize to1e-4 and the terrain hash samples every seventeenth value. Features/counts/districts and retained hashes match. The save-atomicity probe reports exact rollback of14 serialized modules plus time/camera after one intentional late Transit rejection; it retains one expected engine error and one browser error. This core-save recovery is separate from Tools failed-leaf compensation.

## Visual inspection and score

All eight originals, all four amplified differences, and the contact sheet were individually inspected at original resolution. The new road is continuous in visible sections. Candidate office replacement is visible; seed7's large foreground tower still occludes much of the directed frontage. Sparse urban fabric and coarse tree rendering remain. There are no undo/redo screenshots, so visual restoration is supported by serialized state rather than a matching undo frame. The baseline/candidate image labels mean absence/presence of the transaction on the revised product, not old/new product source.

All four RGB MAEs, changed-pixel counts, strong-pixel counts and exact clamped x4 difference images were recomputed from originals. MAEs are0.005690073908,0.011294160514,0.006201052257,0.006205882353 (seed1337 aerial/directed, then seed7 aerial/directed). Traffic and foliage contaminate these differences; they are not quality metrics. No performance matrix, heap gate, night/weather assessment, blind judging or visual evidence warrants changing6.0.

## Inspection register

All image paths below are relative to `shots/democity/r9s2-road-safe-restore/`:

- `baseline_seed1337_aerial.png` — individually inspected.
- `candidate_seed1337_aerial.png` — individually inspected.
- `baseline_seed1337_directed.png` — individually inspected.
- `candidate_seed1337_directed.png` — individually inspected.
- `baseline_seed7_aerial.png` — individually inspected.
- `candidate_seed7_aerial.png` — individually inspected.
- `baseline_seed7_directed.png` — individually inspected.
- `candidate_seed7_directed.png` — individually inspected.
- `seed1337_aerial_difference_x4.png` — individually inspected.
- `seed1337_directed_difference_x4.png` — individually inspected.
- `seed7_aerial_difference_x4.png` — individually inspected.
- `seed7_directed_difference_x4.png` — individually inspected.
- `contact-sheet.png` — individually inspected.

All JSON files in that directory and its two API subdirectories were read in full, together with the retained build log, named verification tools, owner source and architecture/core-request additions. Full hashes, metrics and bounded evidence are retained in the paired JSON.

**Next priority:** preserve the current inverse link for unrelated free-to-built lots through road undo/redo, then verify coherent rollback capture and explicit failure recovery. The current positive paused and level-change results should remain recorded, without treating them as complete gameplay closure.
