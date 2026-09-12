# Democity R9d — independent representation diagnosis and alpha rejection

**ACCEPT the qualified diagnosis; REJECT the alphaTest 0.42→0.50 candidate. No product change. Democity remains 6.0/10 FAIL, below the 8.5 gate.**

The same-page pairs establish a substantial visual discontinuity between the installed LOD1 and impostor representations. The disposable alpha increase gives a small numerical consistency improvement but leaves the main silhouette, tone and apparent-volume differences intact. It does not earn promotion or a higher score. LOD1 itself remains coarse; distance to its pixels is not a measure of photographic quality.

## Source and verification scope

Current source independently hashes to:

- `src/modules/props/chunks.js`: `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`.
- `src/modules/props/trees.js`: `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17`.

Both summaries retain the chunks hash. The accepted summary predates explicit trees hash/alpha metadata; the candidate summary retains the matching trees hash and alpha0.50. This limitation is now acknowledged in the builder report. The current disk source retains both0.42 values. Independently reconstructing the raw two-literal alpha replacement gives SHA256 `b06204cfaa528d77d1d6585fd62b578ab15854a89e33650909a44f9bc88c4a51`; this is an audit reconstruction, not a retained hash of Vite's served transformed response.

The source route adds only the constructor exposure to chunks.js. For the candidate it replaces exactly two `alphaTest: 0.42` occurrences in trees.js, belonging to visual and depth impostor materials. It changes neither the geometry generator nor atlas, tint, RNG, world/save records, range, BAND, CAP1 or movement threshold. It changes the depth material's alpha test too: unchanged shadow configuration is supported, but identical shadow pixels or top-down appearance are not established.

The disposable runtime deliberately replaces the private field's chunk map with chunk45, hides other tree meshes, and locks Traffic/Transit groups invisible. Public `props.debug.setLod(1)` and `(2)` then select real renderer representations. Camera matrices are refreshed and each capture waits at least three actual rendered frames; the retained frame counters confirm this in all20 representation snapshots. This is diagnostic access, not a proposed public ownership/API pattern. The map/group overrides are not restored, but each page closes; no such edits enter product source or saved state.

The failed-freeze record contains five failed cases, with stalls at frame29 except day180/frame28, and two deduplicated error strings. It is an invalid earlier evidence attempt, not a product-rendering failure. Current code removes the freeze-before-settle contradiction. Both completed summaries have five successful cases, zero aggregate/case/sim errors, exact forced histograms and ready module snapshots. The builder reports a163-module build; no round-specific build log exists in the supplied directories, so this audit does not independently verify that new build claim or rerun a build.

## Independently reconstructed source census

The isolated chunk contains **130 real entries in53 sub-buckets**, not11. Class counts are16 conifer,59 broad,44 narrow,0 wide and11 ornamental. Indices0–129 are unique. Source entries and camera setups match exactly across accepted/candidate branches in all five cases; entries also match between each same-page LOD1/impostor pair. Every forced histogram is0/130/0 or0/0/130, without saturation or fade copies.

I recomputed projection heights, the viewport predicate, size/angle-bin aggregation, class counts and projected-area weights from entries and recorded camera matrices. Projection residuals are below1.8e-11px. Area weights match when using the actual Float32 IMP_QUAD inputs, rather than treating1.05 as exact double precision. They remain height²×width-factor proxies, not measured visible area, alpha coverage or occlusion. The viewport predicate allows1.05 NDC margins and tests projected base depth/vertical midpoint, so “in-frame” is a useful approximate centre test, not a guarantee of an unoccluded whole tree. Relative-angle bins can be regrouped from recorded angles; raw headings are not separately retained for independent angle derivation.

Reconstructing floor(x/32),floor(z/32) groups, their mean x/z and shared chunk cy reproduces all53 buckets and the corrected selector-distance aggregates:

| View | Approx. in-frame | Individual-base band proxy | In-frame entries in selector band | All source entries below193 / band / ≥217m |
|---|---:|---:|---:|---:|
| Day0 | 88 | 13 | 18 | 67 /20 /43 |
| Day90 | 129 | 14 | 9 | 22 /9 /99 |
| Day180 | 122 | 12 | 18 | 13 /19 /98 |
| Day270 | 86 | 11 | 12 | 68 /14 /48 |
| Night0 | 88 | 13 | 18 | 67 /20 /43 |

The original11–14 counts were individual-tree-base distance proxies, not the selector's metric. The builder and analysis summary now distinguish them. These reconstructed distances are eligibility accounting for an isolated forced test, not observations of normal per-tree stochastic fade visibility. The full source population includes both nearer and farther trees; forcing the chunk does not establish that most trees are larger than their ordinary transition appearance. There are no wide-class entries. Most projected centres exceed32px here, and no entry occupies the below8px bins, so small far-tree survival is not tested.

## Pixel arithmetic and visual judgment

All accepted metrics and all three candidate-comparison families were recomputed from original RGB images, including hashes, changed-pixel counts, ≥8-channel thresholds, reductions and mean-RGB brightness values. The latter is not perceptually weighted luminance and is evaluated on differing silhouette/background pixels, not matched material texels.

| Pair | Accepted pair MAE/255 | Candidate pair MAE/255 | Strong pixels accepted→candidate | MAE reduction | Accepted impostor darker share |
|---|---:|---:|---:|---:|---:|
| Day0 | .019166234845 | .018402141078 | 202007→196079 | 3.9867% | 70.7614% |
| Day90 | .022105667010 | .021079460810 | 212089→205781 | 4.6423% | 75.8941% |
| Day180 | .018830347147 | .017970247821 | 177320→172172 | 4.5676% | 77.8660% |
| Day270 | .018096586152 | .017452213447 | 184652→179587 | 3.5607% | 70.8116% |
| Night0 | .006114077125 | .005883223518 | 165653→158897 | 3.7758% | 46.6397% |

Strong-pixel reductions are2.7430–4.0784%. These are finite differences, not a quality threshold. Day270's any-change pixel count actually rises370183→370899, so improvement is not universal across every metric.

At original resolution, LOD1 has large separated bright leaf clusters, including visibly angular conifer clusters; impostors form denser, flatter and darker daylight silhouettes. Neither is a calibrated visual ideal. The alpha candidate slightly erodes edges and opens gaps, particularly in broad/narrow crowns, while retaining the same basic planar shapes and daylight tonal difference. It adds no visible volume. No definite black geometry, shader failure or major non-tree scene loss appears in the supplied completed samples. This supports rejecting this specific global-alpha candidate, not proving all atlas/material improvements impossible.

Cross-run LOD1 images are exactly equal only for day90/day180/day270. Day0 differs by302 pixels, MAE0.000001758175; night0 differs by8443 pixels, MAE0.000230649359, including4572 strong pixels. The latter is comparable to the night paired-MAE reduction0.000230853607. Therefore the small night improvement cannot be attributed solely to alpha. Same-page representation pairs are the primary evidence, but they also render multiple frames with other systems active; hiding Traffic/Transit does not prove every remaining pixel is static. Night contact differences include distant lit details as well as trees. No object-ID material mask isolates pure foliage contribution.

The day/night brightness-sign difference argues against promoting an untested global brightness scalar, but it does not alone identify the best physically correct tint. Alpha reduction can shrink small silhouettes; that is a plausible untested risk, not an observed small-tree failure in this large-tree test.

## Inspection register and limits

All20 original1920×1080 PNGs were inspected individually: in **each** of `shots/democity/r9d-lod1-impostor/` and `shots/democity/r9d-lod1-impostor-alpha050/`, `day_a0_lod1.png`, `day_a0_impostor.png`, `day_a90_lod1.png`, `day_a90_impostor.png`, `day_a180_lod1.png`, `day_a180_impostor.png`, `day_a270_lod1.png`, `day_a270_impostor.png`, `night_a0_lod1.png`, `night_a0_impostor.png`. Accepted `contact.png` and candidate `candidate-contact.png` were also inspected at their original1920×1800 resolution; neither replaced inspection of originals. Enhanced difference panels were viewed in the accepted contact, not each separate enhanced PNG at full resolution.

Both full summary JSONs and all ten case sidecars were parsed and checked; each sidecar equals its corresponding summary case. Accepted comparison/analysis JSON, failed-freeze JSON, candidate-comparison JSON, the full tool, updated builder report, current chunks/trees source and relevant atlas code were read. The inspector wrote only this report pair and did not rerun browser captures.

Accepted endpoint FPS27.1–61.1/raw heap480.7–669.4MB; candidate30.9–58.9/raw heap493.2–734.8MB. These fresh-page, isolated-world endpoints do not establish causal performance, sustained50FPS, ordinary2ms update cost or forced-GC512MB memory compliance. No performance gate passes by this diagnosis. No fresh API/save/double-restore/restage contract, normal whole-city matrix, weather, multi-seed, top-down, continuous-motion or blind/reference calibration is supplied. That is appropriate for a rejected disposable candidate, but would be insufficient for product acceptance.

## Next bounded priority

**Props: test one structural side-atlas hypothesis for the dominant broad/narrow silhouettes, keeping the installed geometry and selection budgets fixed.** Before implementing it, inspect whether existing atlas shading/per-instance inputs can improve crown depth and daytime/nighttime consistency at actual transition scale. Atlas generation currently fills cells0–14 and shader selection uses only those ranges; cell15 is unselected, but an unused cell is not evidence that it can solve all five classes or create geometry. A bounded feasibility review of that cell and current inputs is supported; an automatic product change is not.

Any visual candidate should use matched same-page controls, both day/night, real transition-sized trees and explicit small-tree survival, rather than optimizing global pixel distance to coarse LOD1. Keep0.42,205m,±12m,520 and6m installed. If no concrete within-budget hypothesis survives, return to the higher-ranked city-fabric work. Existing whole-game rankings and **6.0 FAIL** remain open.
