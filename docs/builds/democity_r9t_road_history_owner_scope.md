# Democity R9t — road history with unchanged-lot ownership

## Decision submitted for independent review

**Accept the bounded straight-road construction history repair at unchanged Democity/whole-game 6.0/10 FAIL.** R9s2 remains a documented REVISE checkpoint. The tested alleys are disposable public Tools transactions and are not authored into Democity. No score increase is requested.

## Defect closed beyond R9s2

R9s2 restored Buildings only for changed lot IDs, but Zoning still replayed every pre-action `buildingId`. If an unrelated lot was free when the road was built and gained a building later, undo retained the new Building object while resetting its live lot link to null. R9t preserves the current `buildingId` for every unchanged stable lot key/ID and keeps saved links authoritative only for the changed lot set.

Undo could also be requested before the current road's deferred 60 ms Zoning rebuild. R9t calls the owner settlement boundary before every road undo/redo rollback image, so an immediate inverse and any compensation snapshot describe the same current graph.

The R9s2 owner changes remain: exact Roads graph/profile/allocator restore, authoritative restored terrain, validated Zoning identity envelopes, affected-lot Buildings restore, canonical Buildings serialization, owner-complete Simulation reconciliation and Transit refresh. No authored geometry, visual materials, LODs, economy pacing, coverage or route tuning changed.

## Five adversarial boundary tests

`shots/democity/r9t-road-history-owner-scope/history-boundaries.json` hashes complete serialization for Roads, Zoning, Buildings, Simulation, Services, Transit and all Terrain values.

1. Two public road commits occur in the same frame. Undo B equals an independent settled A-only world; undo A equals baseline; redo A+B equals the original two-commit world.
2. A one-shot Zoning refusal is injected during undo in the same frame as commit. Compensation converges to the independent settled candidate, history remains 1/0, and the next normal undo equals baseline.
3. The same one-shot refusal after settlement leaves all seven owner digests and money exactly unchanged (`€25,674.71318153628`), retains history, and a normal undo returns to the exact `€25,770.71318153628` baseline.
4. An unrelated occupied building is changed through its owner from level 3 to level 2 and Simulation advances to tick 121301. The exact changed record and tick survive undo/redo; the affected retired building returns exactly.
5. Distant lot 3 is made genuinely free before the road transaction, then real building 692 is constructed there afterward and Simulation advances. The complete new record and `lot.buildingId=692` survive undo and redo.

All five pass with zero engine/browser errors. These are specific one-shot refusal tests with successful compensation. Recovery from a second persistent owner refusal during compensation is not claimed.

## Exact matrix and regression evidence

The fresh two-seed matrix requires candidate repeat, undo and redo exactness and passes all four flags at seeds 1337 and 7. All six worlds report 16/16 ready modules and zero errors. The paused all-mode construction test returns 612/612 and 648/648 on undo, leaves 1/2 replacement lots for Simulation on commit/redo, and has no orphan/mismatched owners.

The following also pass against the frozen R9t source:

- retained production build, 163 modules transformed;
- Democity API, double deserialize and eight-stop tour at both seeds;
- exact seed-7 fresh/restage counts, features and zero differences over 263,169 terrain values;
- forced late Transit refusal with exact rollback of all 14 save owners, terrain, time and camera;
- two cells-only legacy Zoning restores with exact cells/lots/links and props content, safe monotonic allocator, and the explicitly recorded absent-cursor/event-version differences.

All eight originals and four amplified difference images were inspected in the retained contact sheet; all four candidate originals were inspected at full resolution. The real candidate road is continuous with no orphan geometry or restore artifact. Visual quality remains 6.0 FAIL.

## Frozen hashes

- Sources: Roads `3f7f0746398490801ce32a0309fd918e8e8384b939040673b79809f807b98895`; Tools `e8a5cd984ca18d32edd5576c3623d0a487c87058f2c81e5291a7a6e9734a7f84`; UndoStack `80804e542abc61f6e82a513a1aeb16dc7eee3ac34e9a4e151b793e7a1b2ac771`; Zoning index/grid `1da228b88e43bd797c4652964ede47b7b132320b6ac5c55b1b8bfc26d310f3be` / `e24fb02649fcdf8f867e1befe44b2191859dede08d3b9221b180061b9165ba83`; Buildings `7ea45bea2181fafb20d1bc39653a9e7839750b0bf685e6aa8d03a4728fe3b79b`; Simulation `7da7a565dc589706c86c46db0887546057f6564a33efb8d1f6be09dbf0498e79`.
- Evidence: boundary `f2ce3a825026efacf89a6f7c3b8928893e18b4d7240b825b6697458e793c061c`; matrix `5cfb9a79e546d48954dc4eee35d78d1bd5d079248f3af786b7160069c051071e`; construction `7b31121b8cbbd0ebc82e651a390e2d19d1de69b9e6b490332536125172650ec6`; legacy `91cf38754fc0e60d7189ea85ae7f73a6136143b0ca13b4af4944fd9e8597bf30`; cross-seed `bd51775ed7201e54b398b09d93536e12e336737e50b1f02dde98ae7c4b0fe8b2`; save rollback `d5dc73767d3f0400be6f739572374074b4cc416bb961a73b79171f36418e1cde`; API `953579ba8b47fbbfd65417946852a94bfc74dbc16bf7b1e637df4b441dc248f8` / `e4261e19bf7c42d394efebcf48f46bb6d69f602b5e829b17ae8828eab0e38c11`; build `241bfe1ae8c50ddfd0476205cbbf9c37598c23bda010d4fa2ec0da4ecb08d114`; contact sheet `1f756eaeb5c114e515a8df36f28fe553f71ec4e3e10a822bb11350315f07111d`.

## Remaining scope and next work

This closes the tested straight-edge split construction path. Curved-edge splitting remains unavailable. Road demolition still uses endpoint reconstruction and has not inherited this owner-safe transaction path. Migrate and verify demolition next if independent review accepts R9t. Democity and whole-game remain 6.0/10 FAIL.
