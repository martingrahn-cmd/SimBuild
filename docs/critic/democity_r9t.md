# Democity R9t — independent review

**ACCEPT the bounded straight-edge road construction history repair. Democity and whole-game remain 6.0/10 FAIL against the 8.5 gate.** This accepts the tested owner-state repair and successful compensation of the two one-shot Zoning refusals. It does not accept the disposable alley as authored infill or close all road history.

## Source and ownership

All seven saved source files under `shots/democity/r9t-road-history-owner-scope/source/` independently match their recorded SHA-256 values and matched live source at review. Tools is `e8a5cd984ca18d32edd5576c3623d0a487c87058f2c81e5291a7a6e9734a7f84`; boundary evidence is `f2ce3a825026efacf89a6f7c3b8928893e18b4d7240b825b6697458e793c061c`; matrix is `5cfb9a79e546d48954dc4eee35d78d1bd5d079248f3af786b7160069c051071e`. Full hashes are in the paired JSON. Old R9s/R9s2 captures are not credited to this revision.

The exact R9s2→R9t product delta is two Tools changes. First, `zoning.settleForHistory()` runs before every inverse compensation snapshot, closing the current graph's deferred parcel journal. Second, Tools clones the saved Zoning envelope and substitutes the current `buildingId` for unchanged stable key/ID rows outside the affected set. Changed lot identities still use saved links and Buildings' affected-lot restore. This repairs the specific R9s2 free-to-built inverse-link defect while preserving owner APIs; Tools does not directly mutate live owner tables. The other six reviewed owner files are unchanged from R9s2. No authored layout, material, RNG, camera or simulation pacing change is introduced by the R9t delta.

ARCHITECTURE's R9t amendment and Tools/Zoning/Buildings core-request additions now declare both boundaries and explicitly leave persistent compensation, demolition and curved splits open. The preceding R9s2 paragraph's “Every owner call is checked” must be read narrowly: initial commit rebuild and secondary terrain-triggered rebuild failure propagation are still not established. No broad atomic-failure claim is accepted.

## Five boundary tests

1. **Two immediate commits:** A and B run synchronously in one browser evaluate call and cost 96 each. Seven complete owner digest rows for independent A and undo-B match; both and redo-both match. History moves 2/0→1/1→0/2→2/0. Undo-A baseline equality is a true harness flag, but the afterUndoA digest row is omitted, so that one equality cannot be independently recomputed from retained rows.
2. **Immediate requested failed undo:** a one-shot Zoning refusal returns false with history 1/0. All seven after-failure digests equal an independently settled candidate, and the next ordinary undo matches baseline. Commit and undo use separate Playwright evaluate calls without explicit settling between them. This is not proof of the same renderframe or a still-pending 60 ms journal; the unconditional settlement ordering is established by source inspection.
3. **Settled failed undo:** seven owner digests remain equal; the retained money amounts independently verify 25,674.71318153628 before/after refusal and 25,770.71318153628 after successful undo, exactly the 96 refund. History remains 1/0 on failure. The injected refusal happens before Zoning mutation and compensates successfully; it is not persistent or arbitrary late-failure coverage.
4. **Later occupied-building change:** building 2 on unrelated lot 2 changes through its owner from level 3 to 2; Simulation reaches tick 121301. Harness predicates require exact retained record and tick across undo/redo, and exact affected retired building restoration. Money independently preserves the later 4.538356951275 gain while undo refunds 96 and redo charges 96. Post-undo/redo building records are omitted; their equality flags cannot be independently recomputed from JSON.
5. **Later new building:** the harness demolishes building 3 before the road, then uses real Buildings `requestSpawn` on freed lot 3 afterward, producing building 692 and advancing one Simulation tick. Both undo/redo predicates explicitly require the exact new building record and `lot.buildingId=692`, addressing both ownership directions. These post-records also survive only as audited predicates, not retained raw rows. This is real owner construction, not proof of native UI or long autonomous construction behavior.

All five retained tests and aggregate pass are true; all reported engine/browser error lists are empty. The seven digests now include Simulation as well as Roads, Zoning, Buildings, Services, Transit and complete serialized Terrain values. I independently compared every retained digest pair and the available money arithmetic. Unrelated later demolition is supported by the same current-link logic but was not separately exercised.

## Exact matrix and regressions

I parsed the complete matrix and independently recomputed both seeds' candidate-repeat, undo/redo exact and semantic comparisons, retained stable IDs, cell/count deltas, money and both-direction building/lot ownership. All four undo/redo flags are true at seeds 1337 and 7; all 20 retained phase snapshots are 16/16 ready with zero errors and no ownership mismatch. Seed1337 keeps 612 lots/buildings; seed7 changes 648→649→648→649. Retained lot/building identities are 611 and 647. Both transactions add two nodes and three net edges, cost 96, and change claimed cells by −4/+12 respectively. This is exactness of the saved stable projection and owner payloads, with a sampled terrain digest and 21 terrain samples, not byte identity of every live world/render field.

The separate paused `showcase=all` construction records preserve Simulation pacing: seed1337 is lots/buildings/free 612/612/0→612/611/1→612/612/0→612/611/1; seed7 is 648/648/0→649/647/2→648/648/0→649/647/2. Undo and redo money are exact, owner integrity is clean, and replacement lots remain free for Simulation on commit/redo. These records are a bounded paused test, not a long-term economy test.

Both Democity API probes pass double deserialize and eight tour stops with unchanged census and no errors. This tests Democity's deserialize API, not a double load of every owner. Cross-seed fresh7/restaged7 retained counts, districts/features and reported hashes agree. The 263,169-value comparison counts only differences greater than 1e-6; reported zero/maxAbs0 is therefore tolerance-qualified. No retained raw array permits a new bitwise comparison.

The forced late Transit save refusal reports exact rollback for all 14 canonical owner payloads, time and camera and a subsequent valid restore. Its one expected injected engine/browser error is disclosed. Equality is against a normalized valid-load baseline, not arbitrary pre-load runtime identity. Legacy testing strips Zoning to cells in a current normalized seed7 save and restores twice: cells/lots/links and props content match, while nextLot advances 649→1945 (+2×648) and Props.version66→68. Full moduleExact is correctly false; this does not establish every historical save format.

The retained build log passes with 163 transformed modules in 1.05 s. Several deterministic regression JSON files are byte-identical to prior evidence and contain no embedded source hashes; their recorded rerun provenance is builder-supplied. I do not infer an independent browser rerun or performance improvement from them.

## Images and score

All eight original PNGs, all four x4 differences and the contact sheet were inspected individually at original resolution, including all four full-resolution candidates. Image metadata is retained within the matrix rather than separate PNG sidecars. The visible road is continuous; parcel redevelopment replaces the nearby tower deterministically, with no obvious duplicate building geometry in visible areas. Seed7's directed scene is substantially occluded by the foreground tower. These are transaction absent/present images on R9t, not pre/post-product images. No undo/redo screenshot is supplied, so visual restoration rests on serialized-state evidence rather than an exact restored image.

All four normalized RGB MAEs, changed-pixel and ≥8-channel-difference counts, and exact clamped x4 images were independently recomputed:

| Seed/view | Normalized RGB MAE | Changed pixels | Strong pixels ≥8 |
|---|---:|---:|---:|
| 1337 aerial | 0.005507637250 | 221670 | 67923 |
| 1337 directed | 0.011307999602 | 441499 | 152664 |
| 7 aerial | 0.006203637512 | 220018 | 77523 |
| 7 directed | 0.006209328729 | 342734 | 74740 |

Traffic and foliage differ across captures; these are not isolated rendering or quality metrics. Sparse blocks, coarse tree treatment and repetitive surfaces remain. No full performance matrix, memory gate, night/weather comparison, reference recalibration or blind judging was performed in this mechanical round. There is no basis for raising 6.0 or closing whole-game visual issues.

## Inspection register

Paths relative to `shots/democity/r9t-road-history-owner-scope/`; every PNG below individually viewed at original resolution:

- `baseline_seed1337_directed.png` (original).
- `seed7_directed_difference_x4.png` (derived).
- `seed7_aerial_difference_x4.png` (derived).
- `baseline_seed7_directed.png` (original).
- `candidate_seed1337_aerial.png` (original).
- `candidate_seed7_aerial.png` (original).
- `candidate_seed7_directed.png` (original).
- `baseline_seed1337_aerial.png` (original).
- `seed1337_directed_difference_x4.png` (derived).
- `baseline_seed7_aerial.png` (original).
- `seed1337_aerial_difference_x4.png` (derived).
- `contact-sheet.png` (derived).
- `candidate_seed1337_directed.png` (original).

The complete `summary.json`, `history-boundaries.json`, `construction-timing.json`, `cross-seed.json`, `save-atomicity.json`, `zoning-legacy-save.json`, both API JSONs, build log, seven source snapshots, actual source delta, boundary/matrix and supporting verification tools, previous R9s2 critic and current architecture/core-request amendments were reviewed. Full evidence hashes and recomputed metrics are retained in the paired JSON.

**Next bounded priority:** migrate and verify the older road-demolition inverse with owner-safe graph/terrain/parcel/building restoration and later unrelated state. Keep persistent compensation refusal and rebuild-error propagation explicitly open. The rejected disposable alley should remain outside authored Democity.
