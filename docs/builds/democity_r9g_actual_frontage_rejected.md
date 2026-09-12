# Democity R9g — actual owner-built frontage link rejected

## Decision

**Reject the disposable `-8,-11 → -7,-11` street candidate and keep production source unchanged. Democity remains 6.0/10, FAIL.**

R8y ranked this existing-node cardinal gap because it was dry on both accepted seeds, stayed below its zone-paint slope sample threshold and predicted one lot per seed. R9g replaces those proxies with an actual Roads-owned edge followed by the normal zoning, lot, building, simulation, service and transit stages. The candidate does not create useful net frontage and produces a broadly different fresh authored city state.

## Method

`tools/actual-frontage-link.mjs` intercepts only the disposable browser response for `src/modules/democity/plan.js`. The baseline response exposes the authored grid-node table. The candidate response appends one ordinary two-lane `street` through the existing local `add()` helper immediately before `P.nodes=nodes;return P;`, after every accepted road edge has already been authored. The checked product file remains SHA-256 `c439a6e88f87f40aac5182698d4406540e21f04ce659975b2b0e8cb4e4d26bd6`.

Fresh actual-Chrome/Metal pages run baseline, candidate and an identical candidate repeat for seeds1337 and7. The tool records:

- complete public Roads, Zoning, Buildings, Simulation, Services and Transit serializations;
- exact lot membership and stable frontage keys, duplicate/overlap checks and economy state;
- complete terrain serialization hashes plus 21 samples along the new edge;
- module readiness/errors and owner statistics;
- baseline/candidate full aerial and directed link views, plus 4× differences.

The deterministic comparison includes every recorded static payload and excludes only Democity wall-clock staging durations. The first completed evidence root correctly failed because those host timings were included; it is retained as a harness incident. The final root repeats both candidate worlds exactly.

## Actual frontage result

| Seed | Roads | Zoned cells | Claimed cells | Lots / buildings | Stable lots gained / lost |
|---|---:|---:|---:|---:|---:|
| 1337 baseline | 604 | 9,964 | 4,882 | 612 / 612 | — |
| 1337 candidate | 605 | 9,966 | 4,870 | **611 / 611** | **0 / 1** |
| 7 baseline | 646 | 10,113 | 5,176 | 648 / 648 | — |
| 7 candidate | 647 | 10,107 | 5,170 | **648 / 648** | **3 / 3** |

Seed1337 loses industrial lot `335:right:42,19` and its building, while claimed membership falls by12 cells. Seed7 creates two lots on the new edge and shifts one nearby existing frontage key, but removes three accepted keys; stock is unchanged and claimed membership falls by6 cells. The actual street therefore does not realize the proxy's predicted positive yield.

R8y's estimate calibrated every prospective link with an existing alley's5.55m frontage / approximately4.05m paved half-width. R9g uses the16m two-lane street type the authored grid logic would assign at this omitted horizontal pair. This is the appropriate continuation of that street network, but it is not a like-for-like test of the narrower alley geometry. The result rejects this street candidate and does not independently reject an alley or another narrow-road design.

The new edge is last in both road arrays: ID1073 between accepted nodes69/70 on seed1337 and ID1140 between nodes67/68 on seed7. Every pre-existing edge payload and identity remains byte-equal. Only the two shared endpoint node surface heights change as the real Roads owner conforms terrain. Candidate repeats are exact across roads, terrain hashes, lots, zoning, buildings, simulation, services, transit and economy. All six worlds have16 ready modules, zero engine/browser/HTTP errors, no duplicate lot membership, no overlaps and one building per lot.

The edge's 72m design profile has a17.746m endpoint rise on seed1337, a24.65% mean rise/run, and a10.004m endpoint rise on seed7, a13.89% mean rise/run. These are endpoint averages from the stored design profile, not measured maximum or driven road-surface grades. They still show why R8y's terrain-slope samples could not certify the resulting road profile.

## State and visual impact

Appending the edge preserves existing road order, but the fresh candidate startup differs broadly from the fresh baseline:

- seed1337 retains611 stable lot keys, but only424 retain the same lot ID and382 the same building ID;
- seed7 retains645 stable keys, but only519 retain the same lot ID and359 the same building ID;
- all611/645 retained stable keys keep equal planar lot geometry and cell membership; the churn is in numeric lot/building allocation and generated building forms, not displacement of retained parcels;
- Buildings, Simulation, Transit and economy serializations all change on both seeds; Services serialization remains exact;
- seed1337 changes population/jobs from8,046/19,566 to8,049/19,381 and money from26,397.36 to26,037.38;
- seed7 changes population/jobs from8,018/23,109 to8,021/23,056 and money from25,738.84 to26,373.12, including a different loan principal.

All eight originals and four differences were inspected at original resolution. On seed1337 the directed views connect two former degree-one dead ends; on seed7 they connect one degree-one end into an endpoint that already had degree two. The road itself renders coherently. The views also show buildings removed or replaced around the link without any density gain, and the aerial pairs expose broad building-form redistribution across the city. Image differences are therefore large and are not treated as a local road-quality metric: aerial normalized MAE is0.0262604/0.00805478 and directed MAE0.0280720/0.0223082 for seeds1337/7. The directed target height is recalculated from each world's live terrain and differs by0.770116m /0.373091m, so shoreline and terrain-wide directed differences also include a small viewpoint shift.

The candidate deterministically changes real terrain as expected from Roads ownership; terrain hashes differ from baseline. This report does not call all terrain change a regression. The rejection is already established by negative/zero lot yield; the broad fresh-world allocation/state changes and seed1337 mean endpoint grade make this particular link still less attractive.

## Verification boundary

The final diagnostic passes as a test harness. Production build passes with163 transformed modules in329ms. No product source or score is changed. A same-world rollback/import of this disposable response is not required to reject a candidate that already fails its basic yield and preservation conditions. Runtime traffic positions are not used as deterministic state evidence.

This rejects one actual localized street link, not every possible coordinated frontage design. It strengthens R8y's warning for the most promising shared, dry, below-threshold cardinal pair: an appended street cannot be assumed to create the predicted lot. A narrower alley remains untested. These are separate fresh startups. Their cross-run ID differences do not prove that ordinary incremental `regenLots()` loses existing identities; that path explicitly reuses prior stable keys and remains untested here.

## Evidence

- `shots/democity/r9g-actual-frontage/final/summary.json`
- final eight `baseline_*` / `candidate_*` originals
- final four `*_difference_x4.png` images
- `shots/democity/r9g-actual-frontage/final/build.log`
- superseded first root `shots/democity/r9g-actual-frontage/summary.json`
- `tools/actual-frontage-link.mjs`

## Next bounded priority

Do not install this link or immediately try adjacent cardinal gaps with equal or worse R8y risk. The evidence points to the ownership cascade itself: small frontage topology changes reorder large parts of the stable lot/building allocation. The next bounded diagnostic should locate the exact ordering boundary that turns one local road change into hundreds of lot/building ID changes, using unchanged geometry and read-only traces. Any later city-fabric design needs an identity-preserving localized regeneration contract before more road candidates are worthwhile.
