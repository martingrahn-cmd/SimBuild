# Democity R9d — synchronized LOD1/impostor diagnosis and rejected alpha candidate

## Decision

**Accept the diagnosis; reject the disposable impostor `alphaTest 0.42→0.50` candidate. No product source changed. Democity remains 6.0/10, FAIL.**

R9c established that the normal selector, fade ledger, CAP1 partition and six-metre update threshold behave as implemented. R9d therefore holds `LOD1_R=205`, `BAND=12`, `CAP1=520` and the update threshold at six metres, then isolates representation quality in one real park chunk. The accepted LOD1 crown and accepted impostor have a large, repeatable visual mismatch: LOD1 reads as bright separated leaf clusters, while the impostor reads as a darker, denser, camera-facing silhouette in daylight. Raising impostor alpha test modestly reduces pairwise pixel error but does not repair flatness, tonal discontinuity or crown structure, so it is not promoted.

## Method and ownership

`tools/lod1-impostor-visual.mjs` routes only a constructor hook into Vite's transformed `chunks.js` so a disposable page can isolate the real park chunk nearest the camera target. The chunk contains 130 real source trees in 53 sub-buckets, below the unchanged normal `CAP1=520`. All other tree chunks are hidden only on the disposable page; Traffic and Transit groups are hidden to remove known real-time image noise. The tool then uses the existing public `props.debug.setLod(1|2)`, synchronizes camera projection/world/inverse matrices, waits three rendered frames and captures each representation at the same camera.

The accepted run covers four 90-degree daylight azimuths and the first azimuth at night. It records every isolated source entry's impostor class, deterministic side variant, projected height, in-frame status and relative LOD1 heading angle. The retained entries also reconstruct all 53 actual selector buckets using the implemented 32 m floor key, mean x/z and shared chunk `cy`; 9–18 in-frame trees per daylight view belong to buckets inside the real 193–217 m transition band. This is still a representation stress test, not an automatic-selector or whole-city performance test. Forcing one full 256 m chunk includes both nearer and farther samples outside normal transition distance. It exposes the representation difference but prevents interpreting full-frame difference percentages as ordinary-game transition frequency.

The first run called `freeze()` before waiting for rendered frames and correctly failed with a render-stall error. Its overwritten top-level result is retained as `summary.failed-freeze.json`. The repaired run removes that contradiction and passes all five pages with zero errors. Both normal startup warnings remain: deferred road furniture before `roads:changed` and no valid reserved university site.

Current production source is unchanged after both disposable runs:

- `src/modules/props/chunks.js`: `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`
- `src/modules/props/trees.js`: `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17`
- `npm run build`: 163 modules, pass.

## Accepted-source diagnosis

The isolated chunk contains 16 conifer, 59 broad, 44 narrow and 11 ornamental entries; the wide class is absent. Depending on azimuth, 86–129 centres are in-frame. Relative heading samples are distributed across every folded 22.5-degree bin, so the mismatch is not confined to a narrow card-edge orientation. Daylight strong-difference pixels show the impostor darker than LOD1 in 70.76–77.87% of cases. At night that share is 46.64%, so a global brightness multiplier is not supported by this evidence.

| Pair | In-frame trees | In-frame trees in selector band | RGB MAE / 255 | Pixels with channel delta ≥8 | Impostor darker on strong pixels |
|---|---:|---:|---:|---:|---:|
| Day 0° | 88 | 18 | 0.019166235 | 202,007 | 70.76% |
| Day 90° | 129 | 9 | 0.022105667 | 212,089 | 75.89% |
| Day 180° | 122 | 18 | 0.018830347 | 177,320 | 77.87% |
| Day 270° | 86 | 12 | 0.018096586 | 184,652 | 70.81% |
| Night 0° | 88 | 18 | 0.006114077 | 165,653 | 46.64% |

All ten accepted-source originals and the five-row contact sheet were inspected at original resolution. No black geometry, missing non-tree scene content or shader failure is visible. The pair differences are plainly localized to the isolated trees. Broad and narrow classes dominate both count and projected area; conifers remain especially dark and monolithic as impostors. The test has no wide-class evidence and does not establish multi-seed, weather or moving-camera continuity.

## Rejected alpha candidate

The only candidate routes both visual and depth impostor `alphaTest` values from 0.42 to 0.50 in the disposable transformed `trees.js`. It does not change geometry, atlas pixels, tint, selection, records, saves, RNG, shadow configuration, distance thresholds or CAP1. Because the depth alpha test changes with the visual threshold, identical shadow pixels and top-down appearance are not claimed. The candidate passes the same five pages with exact 130/0 forced LOD1 and 0/130 forced-impostor partitions and zero errors.

Compared with the accepted impostor, the candidate reduces normalized distance to its fresh paired LOD1 image by only 3.56–4.64%; strong changed pixels fall only 2.74–4.08%. This is a representation-consistency metric, not automatic evidence that the candidate is visually better, because the LOD1 crowns are themselves coarse. Visual inspection of all five candidate LOD1 originals, all five candidate impostor originals and the three-column contact sheet shows slightly eroded edges and holes but the same flat, dark daylight silhouette. It does not bring the impostor close to LOD1 crown volume. Two cross-run LOD1 hashes differ because not every surrounding non-Props frame source is frozen across fresh pages: day 0° drifts by 302 pixels / 0.000001758 normalized MAE, and night drifts by 8,443 pixels / 0.000230649. The night drift is effectively the same size as the reported night paired-MAE reduction of 0.000230854, so that small night delta cannot be attributed solely to alpha. Candidate decisions use same-page LOD1/impostor pairs, while exact cross-run equality is not claimed.

The candidate is therefore rejected without touching product source. A more aggressive global alpha threshold risks thin or vanishing small trees and still cannot add depth. A daylight tint scalar is also unsupported by the night sign reversal. Any next Props candidate needs a structural atlas or geometry hypothesis that preserves the current four-triangle impostor budget, or evidence strong enough to justify a separately measured budget change.

## Evidence

- Accepted diagnosis: `shots/democity/r9d-lod1-impostor/summary.json`, five case JSON files, ten originals, five enhanced difference images, `comparison-metrics.json`, `analysis-summary.json`, and `contact.png`. This earlier summary records the chunks source hash but predates the tool's explicit tree-source hash field; the current accepted `trees.js` hash and the candidate run both record `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17`.
- Failed verifier attempt: `shots/democity/r9d-lod1-impostor/summary.failed-freeze.json`.
- Disposable alpha candidate: `shots/democity/r9d-lod1-impostor-alpha050/summary.json`, five case JSON files, ten originals, `candidate-comparison.json`, and `candidate-contact.png`.

## Next bounded work

Keep the alpha candidate rejected and production source unchanged. Before another product edit, inspect whether the existing unused sixteenth impostor-atlas cell and per-instance data can supply a depth/variation cue without extra geometry, or whether the correct next priority should move away from Props because the remaining mismatch cannot be repaired inside the four-triangle budget. Do not change range, band, cap or update threshold from this diagnosis.
