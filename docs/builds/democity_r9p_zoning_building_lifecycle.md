# Democity R9p — road-driven zoning/building lifecycle

## Local decision

**Accept the bounded owner-lifecycle repair at unchanged Democity/whole-game 6.0/10 FAIL. Keep the R9o infill route rejected.** Road- and terrain-driven lot regeneration now publishes its real added/removed journal once per settled rebuild. Buildings retires only stock whose zoning-owned lot ID is explicitly removed. Ordinary whole-game construction remains Simulation-paced; the existing Democity/no-Simulation staging fallback is unchanged.

## Product change

- `src/modules/zoning/index.js`: deferred zonable-band rebuild now calls `refreshBand('event', true)`. The existing helper increments Zoning version and emits one `zones:changed {cells:[], lots:{added,removed}}` only when the lot journal is nonempty, matching the architecture event contract.
- `src/modules/buildings/index.js`: the existing `zones:changed` subscriber consumes `change.lots.removed`, finds buildings whose `lotId` is in that exact set, demolishes them through the Buildings owner's existing path, then drops only those old cached lot references. Its pre-existing eager fallback remains restricted to `showcase==='democity'` or a build without Simulation.

No authored route, lot-generation rule, building plan, coverage, economy, demand, service or Transit behavior was changed.

## Democity lifecycle verification

`tools/r9p-zoning-building-lifecycle.mjs` reuses the rejected `(80,40)→(80,120)` alley only as a disposable public transaction fixture. It launches baseline, candidate and candidate-repeat worlds for seeds 1337 and 7; closes the tool before images; and audits both directions of every live lot/building link after commit, undo and redo.

The first attempt was discarded after two valid worlds because a third page reached the old generic ready flag before every required serialize API was published. The tool now waits for all seven API functions. The complete rerun passes.

| Result | seed 1337 | seed 7 |
|---|---:|---:|
| Commit lot/building counts | 612 / 612 | 649 / 649 |
| Undo lot/building counts | 612 / 612 | 648 / 648 |
| Redo lot/building counts | 612 / 612 | 649 / 649 |
| Orphan buildings, every phase | 0 | 0 |
| Unbuilt live lots, every Democity phase | 0 | 0 |
| Mismatched inverse links | 0 | 0 |
| Candidate fresh repeat | exact | exact |
| Zoning version before→commit→undo→redo | 1→2→3→4 | 1→2→3→4 |
| Public price | €96 | €96 |

All six worlds report 16/16 modules ready, zero engine/browser/HTTP errors and no duplicate or multiply claimed lot cells. Retained unaffected lots/buildings preserve 611/647 IDs. The seed-1337 replacement keeps stock level while seed 7's two gained/one lost lots yield one real additional building. This is transaction-fixture behavior, not acceptance of the route as authored layout.

The R9p harness `pass:true` is deliberately scoped to owner lifecycle, public transaction validity, fresh-repeat determinism and graph-journal shape. Its retained `undoExact`, `undoSemantic`, `redoExact` and `redoSemantic` remain false because R9o's separately measured road-surface/Transit restore defect is unresolved. The harness does not convert that failure into a pass.

## Whole-game construction ownership

Fresh paused `showcase=all` worlds exercise the same Democity-authored city while `world.flags.showcase==='all'`, so the Democity-only eager branch cannot run. Both seeds remove the one building whose old lot disappeared, leave replacement lots free and preserve zero orphan/mismatched references:

| Phase | seed 1337 lots/buildings/free | seed 7 lots/buildings/free |
|---|---:|---:|
| Before | 612 /612 /0 | 648 /648 /0 |
| Commit | 612 /611 /1 | 649 /647 /2 |
| Undo | 612 /611 /1 | 648 /647 /1 |
| Redo | 612 /611 /1 | 649 /647 /2 |

Money restores baseline on undo and returns to −€96 on redo. This proves only that the new handler does not immediately construct replacement buildings in this paused whole-game alias. Later construction through ordinary Simulation steps was not exercised. The result also makes the remaining transaction limit explicit: undo restores lot geometry but does not restore the implicitly demolished building. That joins the already open road-surface/Transit restore issue and is not claimed fixed here.

The initial combined `all` run completed seed 1337 but its second page timed out before API publication. That partial file is retained as failed tooling history. A separate readiness diagnostic then reached ready in ten seconds with 16/16 modules and zero errors, and the fresh seed-7 transaction passed. The earlier startup timeout remains unresolved and nonreproduced; the later successes do not classify it as a tooling-only failure, so it is excluded from product conclusions.

## Visual inspection

All eight final originals and four amplified difference images were inspected. Closing the road panel removes R9o's dominant UI contamination. The alley is continuous in the directed views. Seed 1337 replaces the invalidated office building with a different deterministic building on its new lot; seed 7 fills both live replacement lots in Democity. No orphaned old building remains visible. Camera occlusion and live traffic/foliage still make the images unsuitable for an isolated quality score, and the route remains rejected.

## Validation and evidence

- `npm run build`: observed pass, 163 modules transformed; a standalone build log was not retained in the evidence directory.
- Democity lifecycle summary: `pass:true`, SHA-256 `7eba465a8746c33203daa8a9a938b2c78e1c5a5ce201e721d9e0aa5dd32e4e07`.
- Whole-game seed 1337 extracted completed run: `pass:true`, SHA-256 `b9b8385c7f440c45c60511055fe119eba3775dbf5b46074c82ec0e36727c1498`.
- Whole-game seed 7 standalone run: `pass:true`, SHA-256 `568c14d789cd36433a93e725fe301b07bef5027dbc966a6e055000206e9e6587`.
- Seed-7 readiness diagnostic: `pass:true`, SHA-256 `b300bf301828173ef4e157c0bb717ca0d372236608dc440cbdc14c90605c8176`.
- Zoning source SHA-256 `e6774668b976ea0a1dd3e66ada8624bd04f96175c7b7dff98c35df824c557ee0`.
- Buildings source SHA-256 `0771c773925d4f7a91f3862963c600ab5495989ce188493963816b506c7e6fc4`.
- Main lifecycle tool SHA-256 `0dfa5b530ab9ed468ac8a2340a1d648bb1976b4be6fcb879563285e18ecdea68`.

## Next verified priority

Repair the public road transaction's complete restore contract. Diagnose why undo/redo rebuilds derived road profiles with different surface heights and changes unrelated edge elevation flags. Preserve graph topology, terrain, service behavior and live Transit references. The same transaction must also restore or deterministically rebind buildings implicitly retired by its lot journal. Do not adopt the rejected alley or change score while restore remains false.
