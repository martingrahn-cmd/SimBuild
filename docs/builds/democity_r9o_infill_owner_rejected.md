# Democity R9o — public infill owner staging, rejected

## Local decision

**Reject `1,0:v` as a Democity product change and retain Democity/whole-game at 6.0/10 FAIL.** The real public Tools commit adds the intended connected alley in both seeds, but it produces no new building stock and exposes two existing gameplay-correctness failures: zoning changes are not published after a road-driven rebuild, and road undo/redo does not restore the same road-surface/Transit state. The authored Democity plan is unchanged.

## Method

`tools/r9o-infill-owner-stage.mjs` launches fresh unchanged-product Democity worlds for seeds 1337 and 7. Each candidate world commits the exact R9n route `(80,40)→(80,120)` as a ground-level two-way alley through the shipped public Tools API, waits for owner settling, captures aerial and directed views, then exercises public undo and redo. A second fresh candidate world per seed repeats the committed state. Complete Road, Zoning, Building, Simulation, Services and Transit snapshots are retained, together with a Terrain serialization digest and 21 directed terrain/road-surface samples.

`tools/r9o-retained-analysis.mjs` then audits those complete snapshots offline. It adds the missing bidirectional lot/building check and separates terrain data restoration from derived road-surface and Transit restoration. It performs no browser launch or product mutation.

## Actual commit result

Both public commits are valid and cost exactly €96. Both replace two endpoint edges with four split edges and add the connector: +2 road nodes and +3 net road edges. Existing unaffected edge IDs remain stable at commit. Fresh candidate repeats are exact in the original retained comparison, and all browser/engine error arrays are empty.

| Result | seed 1337 | seed 7 |
|---|---:|---:|
| Lots before → after | 612 → 612 | 648 → 649 |
| Buildings before → after | 612 → 612 | 648 → 648 |
| Claimed cells delta | −4 | +12 |
| Gained / lost lots | 1 / 1 | 2 / 1 |
| Orphan buildings after commit | 1 | 1 |
| Unbuilt live lots after commit | 1 | 2 |

The retained owner audit identifies building 616 pointing to removed lot 102 on seed 1337 and building 652 pointing to removed lot 109 on seed 7. Their replacement office lots have no building. The same orphan persists through undo and redo, while newly regenerated replacement lot IDs continue to have no building. The original `oneBuildingPerLot` check saw the unbuilt lots but did not check the inverse building-to-live-lot relation; the offline audit closes that evidence gap.

Source inspection explains the result. A road event marks Zoning dirty. Its deferred `refreshBand('event')` regenerates lots with the default `emit=false`, so downstream owners receive no `zones:changed` event. Buildings therefore neither removes stock tied to `lots.removed` nor applies its Democity `spawnFreeLots` fallback to new live lots.

## Undo/redo failure

The retained ground-terrain digest and all sampled ground heights/slopes restore: each seed's before/undo values match, as do after/redo. This is strong retained ground-state evidence, but the digest is 32-bit and the full Terrain serialization was not saved, so it is not a byte-for-byte proof. Economy and Services snapshots match their respective phase. Lot geometry matches before/undo and after/redo after ignoring regenerated IDs.

Derived road surfaces and Transit do not restore. Before/undo road-surface samples differ at six of the 21 directed sample positions in each seed; after/redo differs at 18 of 21. Transit route edge IDs, all eight stop records and headway differ, while retained line length remains unchanged. The road graph uses regenerated IDs after undo/redo. In addition, `splitEdge` records the removed edge without its `elevation` field, while the undo re-add path accepts elevation. The broader road rebuild also changes derived elevation flags on unrelated edges, so this evidence does not justify a narrow field-only patch.

The retained offline audit remains `pass:false`. R9o therefore cannot support an authored infill, density, restore, determinism, visual-quality or score claim.

## Visual inspection

All eight originals and four amplified difference images were inspected. In both seeds the directed candidate shows a coherent north–south alley through the previously open central block; no floating or disconnected pavement is apparent. It also visibly leaves the new frontage empty. Candidate images retain the open road-tool panel, so the numerical whole-frame differences are contaminated by UI and moving traffic and cannot measure the alley alone. They are evidence of gross visual coherence only.

## Evidence

- `shots/democity/r9o-infill-owner/summary.json` — SHA-256 `61b173312b798fae89fc462df61dce158bf62445e9af491176b582916250494d`
- `shots/democity/r9o-infill-owner/retained-analysis.json` — SHA-256 `2b1b84c78ca0fc86b4ebc496fcbd1c4682d630423667816ea0eef9747bbdb8ac`
- `tools/r9o-infill-owner-stage.mjs` — SHA-256 `b952ec2b609faa4d46435df872ce20ac85d6a62a34459897bdd0da478036c485`
- `tools/r9o-retained-analysis.mjs` — SHA-256 `94fb83cf812578989d3d1db98530f5ea329c40dbeab28f5f61f6638f3128334b`
- unchanged `src/modules/democity/plan.js` — SHA-256 `c439a6e88f87f40aac5182698d4406540e21f04ce659975b2b0e8cb4e4d26bd6`

## Next verified priority

Repair the road→zoning→buildings owner lifecycle first, without altering authored layout, coverage, simulation demand or normal-game construction timing. The road-driven Zoning rebuild must publish its real added/removed lot journal. Buildings must remove only buildings whose zoning-owned lot was removed and leave newly free normal-game lots to Simulation; the existing Democity/no-Simulation fallback may refill only where it already does.

Then reproduce the exact public transaction. Require bidirectional lot/building integrity in commit, undo and redo, exact fresh repeat, zero errors and unchanged Services/economy behavior. Keep the infill candidate rejected. Treat road-surface/Transit restore as a separate measured defect after owner integrity is fixed; do not claim undo/redo correctness from topology or terrain hashes alone.
