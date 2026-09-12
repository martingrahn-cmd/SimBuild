> **Superseded/revised:** Independent review rejected this broad R9s integration claim. The retained paused evidence remains valid, but whole-Buildings restore, failed-leaf atomicity, fast consecutive commits and documentation required revision. See `democity_r9s2_road_safe_restore.md` for the replacement implementation and fresh evidence.

# Democity R9s — complete road transaction restore

## Local decision

**Accept the owner-safe road transaction restore at unchanged Democity/whole-game 6.0/10 FAIL. Keep the R9n alley rejected.** The rejected `(80,40)→(80,120)` alley remains only a disposable public transaction fixture. Commit, undo and redo now preserve exact road graph/profile identity, terrain, zoning lots, building ownership, Simulation projection and Transit routes across both verified seeds.

## Root causes and bounded product changes

R9o showed that a valid public road edit could be deterministic on first commit but fail its inverse. The failure had four owner boundaries:

- Roads treated `terrain:changed {restore:true}` as a fresh sculpt and sampled already-conformed terrain back into immutable design profiles. Restore events now preserve the saved profile and request a preservation rebuild without resampling.
- Tools rebuilt removed/split roads from endpoint descriptions, allocating new node/edge IDs and sampling new profiles. Road history now snapshots the Roads owner before and after commit and calls the new `roads.restoreTransaction()` owner API, which restores graph IDs, design arrays and the allocator cursor.
- Zoning's prior save payload retained painted cells but not the identity map needed when a transaction temporarily removes an edge-side/front-cell key. Zoning now serializes `nextLot` plus stable key/lot ID/building ID rows. Its owner consumes an optional validated identity map during the same lot regeneration, so emitted added/removed journals use the restored IDs. Legacy payloads containing only `cells` remain supported.
- Buildings is restored through its existing owner serializer after Zoning has restored live lot identities. Simulation then reconciles current Roads/Buildings stock and redistributes occupancy without rewinding clock, treasury, demand or RNG. Transit listens to that reconciliation and recomputes its owned demand/route cache.

Roads now publishes `roads:rebuilt` after derived merge/profile lengths are final. Simulation synchronizes road kilometres at that owner-complete boundary. Simulation serialization orders owned building records by stable ID, removing insertion-order differences without changing simulation state.

No authored road, district, zoning, building, service, demand, growth, coverage, route or visual tuning changed.

## Measured intermediate rounds

- **R9q guard:** skipping design resampling on restore made every untouched edge profile/elevation exact and made redo's 21 road-surface samples exact. Undo/redo still failed because split road IDs were regenerated. Retained summary SHA-256 `52484a1d9c01d5976e712b62ad1e8347d654b3597454b77a56e8009023c5464c`.
- **R9r owner snapshots:** Roads/Zoning/Buildings snapshots produced `undoSemantic:true` and `redoSemantic:true` in both seeds. Exact comparison still failed only in derived Simulation state: building-record insertion order, occupancy-dependent Transit ridership after undo, and road-kilometre synchronization before the final Roads rebuild. Retained summary SHA-256 `43bf1ef10fddcb6f363d24ee3c7e838ea73570a8c68f8fcdbaf8317b09ab490f`.
- **R9s final:** reconciliation and the owner-complete road event close those derived differences. Both seeds report `undoExact:true`, `undoSemantic:true`, `redoExact:true`, `redoSemantic:true` and exact fresh candidate repeats.

The first R9s `showcase=all` check used the frozen R9p harness and returned false because that old acceptance rule required the known bug (`undo.integrity.unbuiltLots.length>=1`). Its product state was already correct: seed 1337 went 612→611→612→611 buildings with zero orphan links. That raw file was overwritten by the corrected R9s harness run; the obsolete rule and observed result are recorded here rather than presented as product evidence.

## Exact two-seed transaction evidence

`shots/democity/r9s-road-complete-restore/summary.json` launches baseline, candidate and candidate-repeat Democity worlds for seeds 1337 and 7, then checks public commit/undo/redo after owner settling.

| Result | seed 1337 | seed 7 |
|---|---:|---:|
| Baseline lots / buildings | 612 / 612 | 648 / 648 |
| Commit lots / buildings | 612 / 612 | 649 / 649 |
| Undo lots / buildings | 612 / 612 | 648 / 648 |
| Redo lots / buildings | 612 / 612 | 649 / 649 |
| Public cost | €96 | €96 |
| Candidate fresh repeat | exact | exact |
| Undo full serialized comparison | exact | exact |
| Redo full serialized comparison | exact | exact |
| Orphans / unbuilt lots / inverse mismatches in Democity | 0 / 0 / 0 | 0 / 0 / 0 |

The exact comparison covers counts; complete Roads nodes, edges, design profiles and allocator; Zoning cells and lot identities; live lot geometry/membership; Buildings; Simulation; Services; Transit; terrain digest and 21 directed height/slope/road/surface samples; economy projection; graph components; and ownership integrity. All six worlds have 16/16 ready modules and zero engine/browser/HTTP errors.

## Whole-game construction ownership

The R9s `showcase=all`, paused harness preserves the R9p construction boundary while requiring complete undo:

| Phase | seed 1337 lots / buildings / free | seed 7 lots / buildings / free |
|---|---:|---:|
| Before | 612 / 612 / 0 | 648 / 648 / 0 |
| Commit | 612 / 611 / 1 | 649 / 647 / 2 |
| Undo | 612 / 612 / 0 | 648 / 648 / 0 |
| Redo | 612 / 611 / 1 | 649 / 647 / 2 |

Commit and redo still leave new lots free in the paused whole-game alias; no Democity-only eager refill leaks into ordinary play. Undo restores the retired pre-transaction building and every inverse link. Money is baseline on undo and baseline minus €96 on commit/redo. This paused test does not claim later construction timing under advancing Simulation.

## Broader regression evidence

- `npm run build`: pass, 163 modules transformed.
- Democity public API, double deserialize and eight-stop tour: pass independently for seeds 1337 and 7, zero errors.
- Fresh seed 7 versus `restage({seed:7})`: exact terrain/features/counts/districts, exact road node/design hashes, and 0 differences across all 263,169 terrain values.
- Forced late Transit save rejection: all 14 serialized owners, terrain, clock and camera roll back exactly; a subsequent valid restore passes.
- All eight final originals and four amplified difference images were inspected. The real alley is continuous; owner replacements occur only in the candidate state; no orphan geometry remains. The images are transaction evidence and do not rehabilitate the rejected authored route or support a visual score increase.

## Evidence hashes

- Final exact transaction summary: `9a8279469a6d8527ae1d350d43e22e60530908974170207b614b78e2f79dfa97`.
- Whole-game seed 1337: `c232f55f8a7a4ac9a17ca6fe0f9d55230f7a760b4b63655fc266cc44ef6fd1e1`.
- Whole-game seed 7: `175be4d2dd68d23cb360edd834232c002abe7c0f96deb236a6d4755b1944a560`.
- Cross-seed restage: `bd51775ed7201e54b398b09d93536e12e336737e50b1f02dde98ae7c4b0fe8b2`.
- Save atomicity: `d5dc73767d3f0400be6f739572374074b4cc416bb961a73b79171f36418e1cde`.
- API seed 1337 / seed 7: `953579ba8b47fbbfd65417946852a94bfc74dbc16bf7b1e637df4b441dc248f8` / `e4261e19bf7c42d394efebcf48f46bb6d69f602b5e829b17ae8828eab0e38c11`.
- R9s whole-game harness: `3a10a790df5d4a3691ab0e0bc7a6b2875265cfe5c2e1f90e289a98e41f2e7785`.

Current source hashes are recorded in the independent critic report so attribution is checked against the reviewed tree.

## Remaining scope and next verified priority

This evidence covers the straight-edge split road fixture and one inverse cycle per fresh world. Curved-edge splitting remains unavailable by owner contract. Road demolition still uses its older endpoint inverse and has not inherited this snapshot path; it must be brought onto the same complete owner restore contract before the road-history issue is closed broadly. The rejected R9n alley is not authored into the city.

After independent review, continue with the road-demolition inverse using the accepted transaction primitives, then return to the highest-ranked verified whole-game visual bottleneck. Democity and whole-game remain 6.0/10 FAIL.
