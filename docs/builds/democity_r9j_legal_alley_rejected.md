# Democity R9j — legal alley candidate rejected

## Local decision

**Reject the disposable `-2,-7 -> -1,-7` alley. Keep product source and Democity/whole-game score unchanged at 6.0/10, FAIL.**

R9j applies the R9i review's required ordering: the public player tool validates the link before any full owner staging. The candidate is legal and renders coherently, but it fails the established useful-yield requirement across both seeds. Seed 1337 replaces one accepted lot with one new lot for zero net stock, while seed 7 gains one. Painted zoned cells fall on both seeds.

## Public tool pre-screen

`tools/r9j-tool-validity.mjs` loads unchanged product worlds, selects the public alley tool and poses the exact endpoint pair without committing:

| Seed | Length | Grade | Valid | Before/after owner counts |
|---|---:|---:|---|---|
| 1337 | 80 m | 9.73% | yes | roads/lots/buildings exact |
| 7 | 80 m | 7.36% | yes | roads/lots/buildings exact |

Both screenshots were inspected. They show the white valid ribbon, cost and grade chips on snapped existing nodes. Both pages have zero engine, browser and HTTP errors. The first harness root accidentally applied unary numeric coercion to its final boolean and wrote `pass:false`; its captured rows were valid but that summary is superseded. A second root tested only that `valid` was boolean rather than requiring `true`; it is also superseded. `shots/democity/r9j-legal-frontage-screen/final-v3/tool-validity.json` is the accepted exact rerun and explicitly requires both final drafts to be valid.

## Actual owner staging

`tools/r9j-actual-frontage.mjs` makes no source edit. A disposable Vite response appends one real `alley` edge after all accepted plan edges, then starts fresh actual-Chrome/Metal baseline, candidate and candidate-repeat worlds for seeds 1337 and 7.

| Seed | Roads | Zoned cells | Claimed cells | Lots/buildings | Stable keys gained/lost |
|---|---:|---:|---:|---:|---:|
| 1337 | 604 -> 605 | 9,964 -> 9,941 | 4,882 -> 4,879 | 612 -> 612 | 1 / 1 |
| 7 | 646 -> 647 | 10,113 -> 10,094 | 5,176 -> 5,189 | 648 -> 649 | 1 / 0 |

All six worlds reach 16 ready modules with zero engine/browser/HTTP errors, one building per lot and no duplicate or overlapping public lot memberships. Existing road-edge identity and payload prefixes remain exact, the new edge is last, Services serialization remains exact and both candidate deterministic projections repeat exactly. Terrain, fresh Buildings/Simulation and Transit state change through the real owner rebuild; no unchanged-state claim is made.

The gained seed-1337 lot is `1073:left:108,61`; existing `350:right:100,59` is lost. Seed 7 gains `1140:left:108,60` without losing a stable key. The result directly supersedes R8y's one-lot-per-seed estimate: actual terrain/frontage/junction rebuilding produces zero/+1 net lots and removes 23/19 painted zoned cells.

## Visual inspection

All eight baseline/candidate originals, four amplified differences and both public-tool drafts were inspected. The alley closes the local industrial-grid gap without an obvious floating surface, broken junction or fake content. The broad aerial differences again reflect fresh sequential-ID building-form changes as well as the local road/terrain update. Visual coherence does not override the failed density result.

## Evidence

- `shots/democity/r9j-legal-frontage-screen/final-v3/tool-validity.json`
- two valid public-tool screenshots under that root
- `shots/democity/r9j-legal-frontage-owner/final-v1/summary.json`
- eight owner originals and four amplified differences under that root
- `tools/r9j-tool-validity.mjs`
- `tools/r9j-actual-frontage.mjs`

Current product build evidence remains the post-R9i unchanged-source 163-module build. No product file changed in R9j.

## Limits and next direction

This rejection applies to this exact straight alley and both accepted seeds. Together R9i and R9j exhaust the two common positive-yield existing-node/cardinal candidates identified by R8y's screen: the first is invalid by grade and the second gives zero/+1 net lots. This does not exhaust mid-block splits, non-cardinal or coordinated layout strategies.

Do not continue enumerating the remaining R8y gaps as if they met the same evidence bar: they are seed-specific, predicted zero-yield or already fail stronger risk screens. Return to the ranked whole-game issues and select a different measured owner-safe path; any later city-scale attempt needs a broader coordinated layout design rather than another isolated missing link.
