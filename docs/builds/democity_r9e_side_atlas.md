# Democity R9e — structural broad/narrow impostor side atlas

## Local decision

**Advance the installed candidate to independent review. Keep Democity at 6.0/10, FAIL.**

The R9d diagnosis showed that the accepted four-triangle impostor is flatter, denser and darker than LOD1, while a global alpha threshold change did not materially repair the mismatch. R9e changes only the procedural side silhouettes for the two measured dominant classes, broad and narrow. Each former single blob is split into three deterministic lobes with the same total leaf-primitive count. Geometry, material alpha, LOD selection, records, placement and simulation are unchanged.

## Product change and ownership

`src/modules/props/textures.js` changes from source SHA256 `35fad7717730b7a4f59c12dd8554cdf5bf178653e88313026900b74abf0f6596` to installed SHA256 `6090fe11d3104bcda0d9729f250e856153ebad69c1c55f083e122ed89dedf039`.

- Narrow retains 420 leaf primitives, now split 150/150/120 across three vertically offset lobes.
- Broad retains 520 leaf primitives, now split 180/180/160 across three offset lobes.
- The existing four-triangle impostor geometry, two deterministic side variants, alpha test 0.42, tint, depth material, `LOD1_R=205`, `BAND=12`, `CAP1=520`, six-metre update threshold, chunk records, tree transforms, save data and RNG call count are unchanged.
- Conifer, wide and ornamental generators are byte-identical. The five top-canopy generator loops are source-identical.

`tools/lod1-impostor-visual.mjs` was made rerunnable against either the R9d accepted source or installed R9e source. `tools/lod1-side-atlas-contract.mjs` adds a disposable accepted/product atlas probe and does not rewrite product source.

## Matched selector-band evidence

The accepted and candidate pages isolate only real park sub-buckets whose implemented selector distance is 193–217 m. Traffic and Transit are hidden on those disposable pages; the existing public `props.debug.setLod(1|2)` forces the same source trees through LOD1 and impostor representations at synchronized camera matrices. All ten accepted originals, ten candidate originals, five enhanced differences and the comparison contact sheet were inspected. Each page is ready with all modules, exact forced partitions and zero engine/browser errors.

| View | Real selector-band trees | Candidate MAE reduction vs LOD1 | Strong-pixel reduction |
|---|---:|---:|---:|
| Day 0° | 20 | 14.00% | 11.26% |
| Day 90° | 9 | 15.48% | 13.34% |
| Day 180° | 19 | 14.86% | 11.03% |
| Day 270° | 14 | 16.35% | 12.44% |
| Night 0° | 20 | -0.93% | 5.72% |

Daylight inspection agrees with the measurements: broad and narrow crowns have visible internal gaps and a less circular, dense silhouette, bringing them closer to the coarse separated LOD1 crowns without removing trees or adding geometry. Night is visually close to neutral; normalized MAE worsens by 0.93%, while strong mismatching pixels fall by 5.72%. No night quality claim is made. Conifers remain dark and monolithic and are outside this candidate.

Fresh-page LOD1 images are exact across the 90°, 180° and 270° runs. Day 0° drifts by normalized MAE `0.000004910` / 397 pixels and night by `0.000024103` / 1,743 pixels. These small non-Props fresh-page differences are recorded and are not attributed to the texture candidate.

The installed product was rerun through the same exact-band verifier after its source-state check was repaired. It reproduces the 20/9/19/14/20 source-tree counts, exact LOD1/impostor partitions, alpha 0.42 and zero errors at installed texture hash `6090fe…`.

## Atlas containment check

Fresh actual-Chrome/Metal pages generated the accepted and product 1024² atlases from identical seed 1337 state. The expected four cells change: broad/narrow side A and broad/narrow side B. Conifer, wide, ornamental and unused cells are pixel-exact. Four of five top cells are pixel-exact. The narrow top cell has 142 changed pixels confined to its bottom 12 rows (`x=93–149`, `y=244–255` within the cell), normalized cell MAE `0.000439031`, because the existing whole-atlas blur/dilation allows the changed broad side-B cell below it to bleed across the cell boundary. The top generator and RNG position are unchanged. This is explicitly disclosed rather than called exact preservation. Current aerial selection submits 1,939 LOD1 and zero impostors, so the affected top impostor cell is not sampled by the verified aerial path. Both full atlases and the 5× difference image were inspected.

## Product verification

- Production build passes with 163 transformed modules.
- Public Democity API, double deserialize, all eight tour stops and invalid-stop rejection pass with zero browser/engine errors. Census remains 468 road nodes, 604 edges, 9,964 cells, 612 lots/buildings, 31 services and one eight-stop Transit line.
- Exact authored restage 1337→7→1337→7 passes for both repeated seeds. Raw heap endpoints are 733.2→825.6→914.9→995.6 MB, so the volatile memory gate remains failed.
- The transition ledger passes. Synchronized endpoints remain `0/204/2127` at 155 m and `0/114/2477` at 255 m. The moving run drains its queue from a maximum of 44 to zero and ends at ordinary `0/117/2475`, then exact `0/114/2477`. The cap stress result is exactly `0/520/1775`. All three final originals were inspected; no scene loss or visible transition corruption appears.
- All 16 standard 1920×1080 High/Metal product originals are ready and zero-error. They span 46.1–60.0 FPS, peak at 468 draws / 2,275,778 triangles / 756.4 MB raw heap, and were individually inspected. The strict 50 FPS and 512 MB gates remain failed.
- Separate noon/night aerial captures are ready, zero-error and inspected. They submit zero impostors through the established top-down LOD1 path. No missing foliage, atlas contamination or new silhouette break is visible.

## Limits and score

This is a bounded representation improvement, not a complete foliage solution. Broad and narrow side silhouettes improve at one seed and the actual park transition band, but conifers remain visibly dark, the wide class is absent from the matched sample, night improvement is unproven, and no weather or multi-seed matrix is supplied. The atlas probe exposes a small post-process bleed into one unused-in-aerial top cell rather than claiming exact top-cell identity. Performance and memory fail, the broader sparse/repeated city fabric remains, and no subjective human playtest or fresh reference calibration is supplied.

Democity therefore remains **6.0/10, FAIL** pending independent review.

## Evidence

- `shots/democity/r9e-side-atlas/accepted/`
- `shots/democity/r9e-side-atlas/candidate/`
- `shots/democity/r9e-side-atlas/comparison.json`
- `shots/democity/r9e-side-atlas/comparison-contact.png`
- `shots/democity/r9e-side-atlas/product-isolation/`
- `shots/democity/r9e-side-atlas/atlas-contract/`
- `shots/democity/r9e-side-atlas/product-contracts/apicheck.json`
- `shots/democity/r9e-side-atlas/product-restage/restage-cycle.json`
- `shots/democity/r9e-side-atlas/product-ledger/ledger.json`
- `shots/democity/r9e-side-atlas/product-matrix/summary.json` and 16 originals
- `shots/democity/r9e-side-atlas/product-aerial/`

## Next bounded work if accepted

Keep the R9e side-atlas change and the 6.0 score. Move to the next verified Democity bottleneck rather than retuning range, band, cap, alpha or the same broad/narrow atlas again. The remaining Props representation defect is the conifer mismatch, but it should compete against the ranked whole-city geometry/heap and golden-hour issues using measured evidence before another foliage edit.
