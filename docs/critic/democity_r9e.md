# Democity R9e — independent product review

**ACCEPT the bounded side-atlas candidate. Democity remains 6.0/10, FAIL; whole-game 6.0/10, FAIL remains unchanged.** Acceptance is a local visual judgment, not an 8.5 gate pass or closure of the foliage/whole-city ranking.

Broad and narrow impostor crowns are less uniformly circular and more open in the measured daylight views. Their branching silhouette is a modest visible improvement at the actual selector transition band. They still look flatter and darker than the coarse separated LOD1 leaf clusters. Neither representation is a visual reference ideal. The night result is essentially inconclusive, conifers remain conspicuously solid, and the matrix still shows repeated buildings, underfilled blocks, coarse mountains, broad cloud reflections and simple night lighting. There is no basis for increasing the score.

## Scope and source verification

Read current HANDOFF and relevant STATUS execution/Democity context, the R9e builder report, R9d critic pair, both changed verification tools and relevant Props implementation. The cumulative Git diff includes earlier work; it is not the R9e scope. Independently replacing exactly the two installed three-blob blocks with the verifier's two pre-R9e calls reproduces the declared complete pre-file hash:

- textures pre: `35fad7717730b7a4f59c12dd8554cdf5bf178653e88313026900b74abf0f6596`
- textures installed: `6090fe11d3104bcda0d9729f250e856153ebad69c1c55f083e122ed89dedf039`
- unchanged chunks: `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`
- unchanged trees: `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17`

This verifies two procedural side-crown changes only: narrow 420 primitives become 150+150+120, broad 520 become 180+180+160. Each primitive consumes the same six RNG calls; splitting the loops changes their deterministic shape progression but not the subsequent RNG position. No gameplay, save, camera, record or API branch is introduced. Other side generators and top generators are source-identical. Four submitted impostor triangles, alpha/depth configuration 0.42, 205 m range, ±12 m band, 520 normal selection guard and 6 m movement threshold stay installed. Unchanged material configuration does not imply identical shadow pixels when its alpha texture changes.

The visual verifier recognizes exactly one pre/product marker state, records the corresponding source and routed-texture hashes, and refuses to apply lobes twice. It routes a disposable field hook, filters a real park chunk's sub-buckets, hides Traffic/Transit there and forces representations via the existing public debug API. This is intentional diagnostic isolation, not an ordinary gameplay view or a product edit. Three actual rendered frames are awaited after each representation selection. Raw-file hashes and route markers support source provenance; no complete hash of every served module/response is retained. The atlas verifier similarly reconstructs and routes pre-source only on its disposable accepted page; its pass boolean tests successful 1024² capture/error status, not pixel containment.

## Recomputed matched evidence

All 20 accepted/candidate comparison metrics were recomputed from original RGB PNGs, including MAE/255, any-change counts, ≥8 channel-difference counts and fractions. Each case sidecar exactly matches its summary row. All three isolation branches have the same camera setup and tree entries, exact forced partitions, 0.42 alpha metadata, ready module snapshots and zero errors. The installed product isolation rerun reproduces the candidate source counts.

| View | Source trees / buckets | Accepted pair MAE | Candidate pair MAE | MAE reduction | Strong-pixel reduction |
|---|---:|---:|---:|---:|---:|
| Day 0° | 20 / 7 | .004462768171 | .003838063826 | 13.9981% | 11.2614% |
| Day 90° | 9 / 3 | .002409760046 | .002036656278 | 15.4830% | 13.3390% |
| Day 180° | 19 / 7 | .004981892500 | .004241656076 | 14.8585% | 11.0285% |
| Day 270° | 14 / 6 | .001407800775 | .001177629887 | 16.3497% | 12.4428% |
| Night 0° | 20 / 7 | .001490682114 | .001504488421 | −0.9262% | 5.7188% |

Independent reconstruction from the retained R9d full 130-tree chunk—floor(x/32), floor(z/32), bucket mean x/z and shared chunk cy—matches every selected R9e index at 193 ≤ sd < 217 m. This establishes actual selector-band membership, rather than the earlier individual-base distance proxy. Class counts are respectively broad/narrow/conifer/ornamental 12/6/2/0, 5/4/0/0, 10/5/3/1 and 3/8/0/3; night repeats day 0. Wide is absent. Approximate projected-centre visibility is not an occlusion mask.

These are consistency metrics against LOD1, not proof of naturalism. Visual inspection supports the daylight improvement separately. Fresh-page LOD1 is pixel-exact at day 90/180/270; day 0 drifts 397 pixels, MAE .000004910156; night drifts 1,743 pixels, MAE .000024103198. The night drift exceeds the pair-MAE worsening .000013806307, so that small negative change is not a clean causal texture result. Same-page pairs still span rendered frames with other systems active. Enhanced difference panels contain a few distant non-tree differences. No object-ID foliage mask establishes exclusive attribution.

## Atlas containment — real but small cross-cell change

All 16 cell change counts and premultiplied-RGBA MAEs were recomputed. Changed cells are 1:25,676 pixels; 2:8,891; 7:142; 11:26,417; 12:8,924. All other cells are RGBA-exact, including conifer/wide/ornamental sides, four top cells and unused cell 15.

Top narrow cell 7 is **not exact**. Its 142 changed pixels occupy local x93–149/y244–255. Of these, 135 change alpha; 63 cross the nominal 0.42 threshold at the base mip. This is not merely invisible RGB dilation. The reported .000439031 is premultiplied-RGBA MAE; raw RGBA MAE is .000616709391. Existing whole-atlas blur/dilation permits adjacent broad side-B content to affect the top cell. This is a small disclosed side effect, not a demonstrated large rendering regression, but it prevents claiming exact top-view preservation.

The noon atlas capture records 1,939 LOD1 and zero impostors. Separate noon/night aerial sidecars record valid images but contain no LOD histogram. Their unchanged steep-pitch selection explains why they are useful scene-integrity checks and do not directly exercise the changed top impostor cell. No forced top/mip/shadow comparison establishes all consequences of the 142-pixel change. I accept the installed daylight gain with this explicit limit; do not extend the atlas again while calling the top cell preserved.

## Contract, ledger and performance verification

The supplied API result has all 13 methods, two successful deserializations with identical recorded census, eight successful tour stops, invalid stop false and zero errors. Census: 468 road nodes, 604 edges, 9,964 zoning cells, 612 lots/buildings, 31 services, one line/eight stops. This is the recorded public-contract scope, not a full saved-world byte equality test. Authored restage digest strings are exactly equal for repeated 1337 and repeated 7. Their fields cover buildings/services/transit; they do not independently prove complete save/economy/RNG/Props state or multi-seed visual identity. No dedicated fresh mixed-use contract is retained here.

The full ledger was parsed and its source/output membership counts, distances, band rules, fades and endpoint equality recomputed. Synchronized histograms are 0/204/2127 at 155 m; 0/175/2325 at 193; 0/171/2346 at 205; 0/163/2423 at 217; 0/114/2477 at 255. Source bucket counts are 1059/1145/1145/1176/1192; source entries 2295/2472/2472/2535/2564. Exact endpoint membership equals the static 255 m ledger, and start equals static 155 m.

The moving record has 169 contiguous monotonic rows, 171 update events, 17,510 copy calls and 15 camera-distance resets. Rebuilding histograms from those calls and reset boundaries matches every recorded event. Queue maximum 44 drains to zero. Ordinary endpoint remains 0/117/2475, with camera 4.220309 m from last evaluation; forcing exact yields 0/114/2477. Zero queue does not mean exact camera convergence. Auto/exact image delta is .000393013571 normalized RGB MAE and 15,998 changed pixels; multiple rendered frames and real-time Traffic prevent foliage-only attribution.

Forced cap: 1,059 deduplicated source buckets/2,295 entries partition into 520 LOD1 and 1,775 impostors, with no fades. This is a disposable force-field stress test, not ordinary selection or a global top-down ceiling. Membership is deduplicated from actual copy outputs and does not independently enumerate omitted eligible inputs. No <72 m coverage, per-instance fade-buffer oracle or exhaustive temporal-pop certification is established. The three ledger PNGs were inspected; the retained video was not played in full.

All 16 matrix sidecars match their summary rows and contain 16 ready modules/zero errors. Measured FPS spans 46.1–60.0, with two <50 cases: suburb noon 46.1 and suburb 17:30 49.3. Peak sampled draws 468, triangles 2,275,778, raw endpoint heap 756.4 MB; nine heap endpoints exceed 512 MB. Separate aerial noon/night are 55.4/53.8 FPS and 612.1/479.4 MB, zero errors. These are Apple M4/Chrome Metal captures, not a matched performance A/B or universal sustained FPS guarantee. Sampled geometry maxima are distinct from last-render counts. Strict FPS and memory gates remain unpassed.

Restage raw heap is 733.2→825.6→914.9→995.6 MB. These endpoints warrant investigation but do not establish a retained leak without forced-GC/retained-object evidence. No forced-GC memory claim is accepted. The builder reports a successful 163-module build; no round-specific build log is retained in the supplied folder, and this critic did not rerun it.

## Inspection register and limits

All **53 originals** were inspected individually at original resolution: 10 in each of accepted, candidate and product-isolation; 16 product-matrix frames (downtown, industry, park, suburb × 6p5/12/17p5/22); aerial_12/22; moving_end_auto, moving_end_exact, cap_stress_synced; accepted-atlas and product-atlas. All seven derived images were also inspected: comparison-contact, five candidate_diff_x5 frames and atlas difference-x5. The companion JSON lists every exact path. All 43 supplied JSON files were parsed, with the contract/membership/pixel/sidecar checks described above. Contact sheets did not replace original inspection.

No new captures, gameplay session, reference calibration, blind comparison, weather sweep, second-seed visual matrix, small distant-tree test, forced top-view atlas test or sustained performance test was performed by this critic. Existing gameplay and whole-game requirements remain open; this local texture change proves no additional simulation behavior.

## Next bounded priority

**Props verification first: exercise the changed top cell through an isolated forced top-impostor comparison and inspect its mip/alpha boundary, preserving the current range, band, cap, geometry and state.** The measured 142-pixel cross-cell effect is a concrete ownership-safe target. If visible leakage survives filtering, evaluate one cell-contained post-process candidate with unchanged RNG and explicit unaffected-cell equality. This is a narrowly justified follow-up, not authorization to retune the same broad/narrow silhouettes again.

Conifer representation remains the clearest residual Props visual mismatch, but broader city fabric and the measured performance/raw-memory failures retain higher whole-game significance. Whole-game rank 1 and the other open ranks are not closed by this local acceptance. Any subsequent product choice should compete against those measured issues rather than accumulate cosmetic score claims.
