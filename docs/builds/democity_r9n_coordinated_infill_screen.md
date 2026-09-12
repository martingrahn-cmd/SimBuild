# Democity R9n — coordinated mid-block frontage screen

## Local decision

**Accept the read-only screen and advance only grid block `1,0:v` to disposable actual-owner staging. Make no product or score change; Democity and whole-game remain 6.0/10, FAIL.**

R9i/R9j exhaust R8y's two common positive existing-node/cardinal links. R9n tests the documented broader path: a road across a block interior whose endpoints snap to and split two existing boundary edges. This is a coordinated graph change rather than another missing direct node-to-node link.

## Method

`tools/r9n-coordinated-infill-screen.mjs` routes only a disposable shallow copy of Democity's authored grid-node table from unchanged `plan.js`. Fresh seed1337 and seed7 worlds enumerate combinations with all four authored corner nodes. For each they construct horizontal and vertical centerlines between two opposite side midpoints. This does not assert that all four block boundaries are closed roads.

Candidates require two different nearby, straight edges at the proposed endpoints. A geometric ranking counts currently painted, unclaimed zone cells 7–34 m from the interior 8–92% of the line; claimed cells inside a 10 m road-core proxy and within 24 m of either endpoint are counted separately. Water and maximum sampled terrain slope are recorded. This is a screen against the current world, not an actual frontage prediction or proof of complete surrounding road topology.

The 100 highest-ranked candidates per seed are then posed through the shipped public Tools API as straight, ground-level, two-way alleys with magnet snapping. No draft is committed. Before/after node, edge, lot, building and painted-cell counts are exact, and both pages have zero engine/browser/HTTP errors.

## Results

| Measure | seed1337 | seed7 |
|---|---:|---:|
| Four-corner mid-block candidates | 281 | 318 |
| Highest-ranked public drafts tested | 100 | 100 |
| Publicly valid drafts | 89 | 82 |
| Accepted world before/after | 468 nodes /604 edges /612 lots/buildings /9,964 cells, exact | 493 /646 /648 /10,113, exact |

There are 41 common valid keys within the separately top-100 screened sets. Only three have zero claimed core cells and at most three endpoint-risk cells in both seeds:

| Key | Minimum unclaimed side-band cells | Maximum claimed core / endpoint cells | Maximum public grade |
|---|---:|---:|---:|
| `-3,1:h` | 17 | 0 /3 | 5.78% |
| `1,0:v` | 17 | 0 /3 | 3.83% |
| `0,1:h` | 4 | 0 /2 | 2.05% |

`1,0:v` is selected because it is the central unwarped 80 m centerline, keeps the same exact endpoints in both seeds and has the lower cross-seed displayed grade among the two 17-cell choices. It runs from `(80,40)` to `(80,120)`. The retained public states show both endpoints snapping to the intended real road edges in both seeds, valid drafts, cost96, and rounded endpoint rise/run of2.81% on seed1337 and3.83% on seed7. The road evaluator also checks sampled cut/water rules; the displayed grade is not maximum intervening terrain slope. The screen records21/17 painted unclaimed side-band cells, zero claimed road-core cells and three claimed endpoint-proxy cells.

The alternative `-3,1:h` is a warped96m outer route with 5.78% on seed1337. It is not advanced in parallel. `0,1:h` has materially less measured opportunity.

## Evidence and source scope

- `shots/democity/r9n-coordinated-infill/screen-v1.json` — SHA-256 `6c958ce19cf834414135fc1d6701062a7a8ffef696bc170a84773565db9a8271`
- `tools/r9n-coordinated-infill-screen.mjs` — SHA-256 `b1641658f6e9296aa63d50a19365fafaa6a8419610b698de18af3f1d53e42460`
- product `src/modules/democity/plan.js` — SHA-256 `c439a6e88f87f40aac5182698d4406540e21f04ce659975b2b0e8cb4e4d26bd6`
- disposable routed plan — SHA-256 `bb95e06de52aededb99989e04cb747626bdf52a3bf5377f29d53f82d06e78d75`

The routed global is observability only. The public tool drafts temporarily alter tool preview state and are canceled; they do not mutate road, terrain, zoning, building, simulation, service or save state. No product file changes.

## Limits and next step

The top-100 sets are rank-truncated independently, so 41 is not the number of all valid common mid-block candidates. The complete grid/cell maps and unranked candidate rows are not persisted, so the 281/318 totals and geometric cell counts are builder-tool results rather than independently reconstructible from this JSON alone. The cell-band/core/endpoint measures are proxies. They do not execute edge splitting, road cut/fill, zoning regeneration, lot geometry, building allocation, economy, services or Transit. Public tool validity covers placement rules and funds in the fresh scene; it does not promise positive lots or stable accepted parcel keys. Exact node/edge payload serialization was not compared because no commit occurred; count equality plus the tool path is the retained no-world-mutation check.

No screenshot is required to accept a noncommitted numeric screen, and no visual/performance/API/save gate passes from it. The next bounded step is a fresh disposable public-tool commit of only `1,0:v`, repeated for both seeds. Measure the real split-edge journal outcome, lot/building yield, claimed/painted cells, deterministic repeat, owner state and directed visuals. Reject it if useful cross-seed stock, integrity or visual coherence fails.
