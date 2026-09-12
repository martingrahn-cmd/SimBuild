# Democity R8v — last-owner lot-membership normalization

## Decision

**Candidate submitted for independent review. Democity and whole-game remain 6.0/10 — FAIL.** This is a zoning-owner consistency repair, not a city-scale, appearance, FPS, memory or score improvement.

R8u proved that `genEdge()` produces every lot for one road before those lots enter the global `claimed` map. Curved/corner raster sampling therefore left 5/6 repeated references inside lots and two keys referenced by two lots in seed1337/7. The accepted ownership map already resolved every shared key to the later claimant. Removing the later copy directly was unsafe because three later lots used the overlap as their first-cell identity key.

## Bounded change

`src/modules/zoning/grid.js` now:

- records the raw generated front cell as owner-local `_identityCell` and uses it in `_lotKey()`;
- leaves slot generation, lot frames, claim order and `claimed.set(key, lot.id)` untouched;
- after every claim is known, removes repeated references inside each lot and retains a cell only in the current final claimant's membership.

The normalization does not create cells, move or resize lots, change fixed class widths/depths, or repair the pre-existing seed1337 lot227 and seed7 lot200, which still have five unique raster keys inside unchanged16×24m nominal frames.

Exact saved source hashes:

- pre: `7e027c0fb9cb1ebb9b77cf10b5f77126e59f1615589e0ca0464f7855ab609eab`
- candidate: `030ee74038052ff28f7b3c68378d5954ed01f373a8318879a583e6da04c83ecb`

## Exact contract evidence

`baseline-contracts.json` routes the exact saved pre-R8v `grid.js`; `candidate-contracts.json` loads current source. Each branch starts a fresh seed1337 and seed7 page, performs two public zoning refreshes and two whole-save restores, and retains complete lot membership plus stable projections.

Both candidate pages pass all20 refresh/restore snapshots without browser or simulation errors. The cross-branch comparison passes for:

- 9,964/10,113 zone cells, 612/648 lots and 612/648 buildings;
- every lot ID, building ID, edge, side, identity cell, position, elevation, width, depth, heading, axes, class, corner and frontage parameter;
- reconstructed final-winner membership map, zoning cell save, full buildings save, roads save, serialized simulation and non-derived economy fields;
- the public geometry-aware `lotAt()` result at every painted cell centre.

`lotAt()` is not a raw ownership-map getter: it can return a geometrically containing lot for unclaimed cells and can return null when a claimed raster centre falls outside its nominal frame. Equality is therefore a public-query check, not direct enumeration of private `claimed`. The final-winner reconstruction is exact for the saved memberships and the production change never mutates `claimed` after building it.

The only membership changes are seven removed references in seed1337 and eight in seed7. Candidate replay has 4,882/5,176 raw and unique references, zero within-lot duplicates and zero cross-lot overlaps. R8u's pre-source replay has been regenerated through source routing after an initial command mistakenly used the tool's default output path; it again records the original 4,889/5,184 raw references, 5/6 internal duplicates and2/2 overlaps. No product source was swapped during that repair.

Additional checks:

- production build: 163 modules, pass;
- Democity public API, double deserialize and all eight tour stops: pass;
- exact 1337→7→1337→7 authored restage: pass;
- 32 mixed-use owner records and two whole-save restores: exact, pass;
- no simulation or browser errors in any contract run.

The restage evidence records raw heap growth to923.4MB on its final page. That remains a failed project gate and is not attributed to this small change.

## Visual evidence

Three directed baseline/candidate views cover every shared-key site: seed1337 edge444 and seed7 edges443/685. All six originals and the candidate montage were inspected. No missing buildings, broken zoning fill, boundary tear or visible ownership artifact was found.

For each view, the complete zoning overlay geometry hash is exact across branches, including indices and every position/mask/cell attribute. Overlay and whole-frame render counts also match exactly:100,440 or102,008 overlay triangles in five draws, and identical per-view draw/triangle totals. One image pair is pixel exact; the other two differ by3.4093% and1.4932% of pixels with very small normalized RMSE. The harness attempted to hide real-time modules, but Props can restore its group visibility during water-reflection events and trees remain visible. Pixel deltas are retained without claiming a single owner. Exact overlay buffers are the boundary-geometry gate.

The ordinary unmasked aerial smoke is visually intact and errors=0 at430 draws /2,062,014 triangles. Its sampled11fps and571.2MB heap are failures/host-sensitive observations, not an optimization result.

## Limits

The two tested seeds do not exercise the fallback where normalization removes a lot's original identity cell; `_identityCell` equals the retained first cell for all1,260 observed lots. Fresh-page same-save restores verify current saves, but do not import a separately retained historical city file. Normalization cost was not profiled independently. R8v removes bookkeeping contradictions only; claimed coverage, lot/building counts, city fabric, the five-key raster lots and all ranked whole-game failures remain.

## Evidence

- `shots/democity/r8v-lot-membership/source/`
- `shots/democity/r8v-lot-membership/baseline-contracts.json`
- `shots/democity/r8v-lot-membership/candidate-contracts.json`
- `shots/democity/r8v-lot-membership/baseline-candidate-compare.json`
- `shots/democity/r8v-lot-membership/slot-order-candidate.json`
- `shots/democity/r8v-lot-membership/apicheck.json`
- `shots/democity/r8v-lot-membership/restage/restage-cycle.json`
- `shots/democity/r8v-lot-membership/mixed-use.json`
- `shots/democity/r8v-lot-membership/baseline-visual/`
- `shots/democity/r8v-lot-membership/candidate-visual/`
- `shots/democity/r8v-lot-membership/visual-compare.json`
- `shots/democity/r8v-lot-membership/smoke.png` and `.json`
- `tools/lot-membership-contract-probe.mjs`
- `tools/lot-membership-visual.mjs`
