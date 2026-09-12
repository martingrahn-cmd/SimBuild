> **Independent verdict: REVISE.** The frozen R9s2 evidence remains useful, but later construction on an unchanged formerly free lot lost its Zoning link, and immediate pre-settle undo failure was untested. See `docs/critic/democity_r9s2.md` and the R9t replacement report.

# Democity R9s2 — owner-safe road transaction restore

## Decision submitted for independent review

**Accept the bounded road-construction history repair at unchanged Democity/whole-game 6.0/10 FAIL. Keep the R9n alley rejected.** The `(80,40)→(80,120)` alley and the immediate `(80,120)→(80,200)` extension are disposable public transaction fixtures only. No route is authored into the product city and no visual score increase is requested.

The initial R9s evidence proved exact paused fixture restore, but its broad integration claim was rejected during independent review. Whole-Buildings restoration could rewind later unrelated growth or levels, a failed history leaf could leave partial mutation, two commits inside Zoning's 60 ms coalescing window could capture mismatched owners, and the new contracts were undocumented. R9s2 replaces that implementation and retains the rejection as part of the evidence trail.

## Bounded product repair

- Roads treats `terrain:changed {restore:true}` as authoritative replay, preserving saved design profiles rather than resampling conformed terrain. `restoreTransaction()` restores exact graph/allocator/profile data and now propagates rebuild failure. `roads:rebuilt` marks derived completion.
- Zoning saves a validated stable-key/lot-ID/building-ID envelope plus `nextLot`, and exposes `settleForHistory()` so a following road commit cannot snapshot stale lots. A changed lot journal closes Simulation/Transit derivation at the same owner boundary. Legacy cells-only payloads remain supported.
- Buildings restores only the symmetric set of lot IDs changed by the road inverse. Unrelated buildings are not cleared. Its save output is canonical by ID.
- Tools checks every owner operation and captures a rollback image of the current owners before inverse work. Any failed leaf compensates Roads, terrain, Zoning and Buildings, reconciles dependents, returns false, leaves history in place and changes no money.
- Simulation reconciles current Roads/Buildings without rewinding time, treasury, demand or RNG. Transit recomputes from `sim:reconciled`.

No authored geometry, demand rule, coverage, route, simulation pacing, visual material, LOD or performance tuning changed.

## Verification results

`shots/democity/r9s2-road-safe-restore/summary.json` requires exact success, not the earlier R9p pass rule. Fresh baseline/candidate/repeat worlds at seeds 1337 and 7 have 16/16 ready modules and zero engine/browser/HTTP errors. Candidate repeats, undo and redo are exact for both seeds. The comparison includes complete Roads graph/design/allocator, Zoning cells and identities, Buildings, Simulation, Services, Transit, economy and directed surface samples. Seed 1337 returns 612 lots/buildings; seed 7 returns 648. Redo returns 612/612 and 649/649 respectively, with the exact €96 charge.

`history-boundaries.json` adds adversarial coverage and SHA-256 over complete owner serialization, including every terrain value:

- two public road commits in the same frame: undo B equals an independently settled A-only world, undo A equals baseline, and both redos equal the original two-commit world;
- one forced Zoning rejection during undo: the public call returns false, all owner digests and money remain unchanged, history remains 1 undo/0 redo, and the next ordinary undo equals baseline;
- after the road action, Simulation advances one fixed tick and an unaffected building levels through its owner API: undo restores the retired affected building record exactly while preserving the later unrelated record and tick; redo preserves them again.

The paused `showcase=all` construction test remains owner-safe in both seeds. Commit/redo leave 1/2 replacement lots free for ordinary Simulation; undo restores 612/612 and 648/648 with zero orphan/mismatched links. The adversarial test separately proves exact retired identity and later unrelated state.

Broader regression checks pass:

- retained production build: 163 modules transformed;
- Democity API, two consecutive deserializations and all eight tour stops at both seeds;
- seed-7 fresh versus restage: exact counts/features/districts and zero differences across all 263,169 terrain values;
- forced late Transit save rejection: all 14 modules, terrain, time and camera roll back exactly before a valid restore;
- cells-only legacy Zoning save restores twice with exact cells/lots/building links and props content, a safe monotonic allocator, no orphan or broken links, and zero errors. Because that historical payload contains no `nextLot`, its allocator cursor advances from 649 to 1945; Props' event version advances 66→68 while its content remains exact. These are recorded compatibility limits, not hidden exactness claims.

All eight originals and four amplified differences were inspected via the retained contact sheet; all four candidate originals were also inspected at full resolution. The real alley is continuous and no orphan geometry or restore artifact is visible. The pictures support transaction integrity only.

## Frozen hashes

Sources:

- Roads `3f7f0746398490801ce32a0309fd918e8e8384b939040673b79809f807b98895`
- Tools `f76c0ffebf004ce05b2e2993e032bb4253c70342cbc5b5d721bd7471cd902e23`
- Zoning index/grid `1da228b88e43bd797c4652964ede47b7b132320b6ac5c55b1b8bfc26d310f3be` / `e24fb02649fcdf8f867e1befe44b2191859dede08d3b9221b180061b9165ba83`
- Buildings `7ea45bea2181fafb20d1bc39653a9e7839750b0bf685e6aa8d03a4728fe3b79b`
- Simulation `7da7a565dc589706c86c46db0887546057f6564a33efb8d1f6be09dbf0498e79`

Evidence:

- exact two-seed matrix `ec06c56a81048a321cde4e5d55200af415ef7e6ea2dce5d666afc76abee1d52f`
- history boundaries `7137c7fccea4a8ae272cb077bbf754fa4b6b731a5223c031cd9a816c95fbcb3a`
- all-mode construction `7b31121b8cbbd0ebc82e651a390e2d19d1de69b9e6b490332536125172650ec6`
- legacy Zoning `91cf38754fc0e60d7189ea85ae7f73a6136143b0ca13b4af4944fd9e8597bf30`
- cross-seed `bd51775ed7201e54b398b09d93536e12e336737e50b1f02dde98ae7c4b0fe8b2`
- save atomicity `d5dc73767d3f0400be6f739572374074b4cc416bb961a73b79171f36418e1cde`
- API seed 1337/7 `953579ba8b47fbbfd65417946852a94bfc74dbc16bf7b1e637df4b441dc248f8` / `e4261e19bf7c42d394efebcf48f46bb6d69f602b5e829b17ae8828eab0e38c11`
- build log `782435d1eeb128ca5734c5a0f44205eae4b148c00087ae564a059d2b223e8a77`
- contact sheet `716b5ac032edf2e42200e7fab01f588f82c27a8647d292c87acc0f66538e25e0`

## Remaining boundary and next work

This repair is qualified to straight-edge split road construction and the tested transaction ordering. Curved-edge splitting is unavailable by owner contract. Road demolition still uses its older endpoint inverse and has not inherited this path; it is the next bounded history repair after independent acceptance. Democity and whole-game remain 6.0/10 FAIL.
