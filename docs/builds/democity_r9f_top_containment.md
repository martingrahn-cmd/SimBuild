# Democity R9f — exact top-cell containment verification

## Local decision

**Accept as verification-only closure and advance to independent review. Keep the installed R9e product unchanged and Democity at 6.0/10, FAIL.**

R9e intentionally changed broad/narrow side silhouettes, but its existing whole-atlas blur/dilation also changed 142 pixels in top narrow cell 7. R9f exercises those exact pixels through the renderer before considering a product containment change. It changes no product source, atlas generator, LOD selector, geometry, state, simulation or score.

## Method

`tools/lod1-top-cell-containment.mjs` opens one actual-Chrome/Metal seed-1337 Democity page at speed zero. It exposes the existing Props field on that disposable response and retains the same scene, camera and field while applying three states:

1. decode and install the retained R9e product atlas;
2. reinstall that product atlas, clear only cell 7, and copy only accepted cell 7 into the cleared region;
3. reinstall the product atlas as a replay control.

Both source atlases therefore use the same PNG decode/canvas path. Before any swap, the verifier retains the live product RGBA bytes and requires the live canvas PNG to match the retained product PNG. After every swap it compares all 1024² canvas pixels directly against that live reference. A passing contained state must reproduce exactly 142 changed RGBA pixels, 135 alpha changes, 63 nominal alpha-0.42 crossings and local inclusive bounds x93–149/y244–255. Product and product replay must have zero changed atlas pixels. This byte oracle prevents a whole-atlas substitution or source-over alpha union from passing.

Traffic and Transit groups are hidden to reduce unrelated motion. Three real field distances exercise different projected sizes and mips: 150, 300 and 600 m. A fourth diagnostic maps every submitted tree to top narrow cell 7 at 300 m to amplify the measured spill; it is disposable and is not an ordinary game view. The public debug path forces real source-tree instances to the existing four-triangle impostor geometry. The shared colour and depth textures are marked for upload so Three.js regenerates the colour-map mip chain.

Product provenance is exact:

- `src/modules/props/textures.js`: `6090fe11d3104bcda0d9729f250e856153ebad69c1c55f083e122ed89dedf039`
- `src/modules/props/chunks.js`: `60ae70eb2d9249f07e01dc9af0d832ff7c4756ea0b14789fbb09348d42e93834`
- `src/modules/props/trees.js`: `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17`
- retained accepted atlas PNG: `3c2ff34dc47dcacd3ad76ae181d1bd67e53863eac6661f17eb5d50ea4b86ac71`
- retained/live product atlas PNG: `4d846cdaaf8380af089f89b6349f08435a7b8f46397b0639b5710a482326517f`

## Result

The final-v2 verifier passes with all 16 modules ready and no engine, browser or HTTP errors. The page contains 822 real narrow-class instances among 3,022 tree records. Forced top submissions are 1,203 / 1,932 / 2,555 across the actual distances and 1,932 in the amplified case; product, contained and replay histograms are equal within every case.

Every contained capture independently records the exact 142 / 135 / 63 atlas delta at global inclusive bounds x861–917/y500–511. Every product and replay capture records zero atlas delta.

| Case | Product↔contained MAE | Changed / strong pixels | Product replay control |
|---|---:|---:|---:|
| Actual 150 m | 0.000074854 | 3,565 / 1,271 | MAE 0.000051108; 967 strong |
| Actual 300 m | 0.000101786 | 115,602 / 559 | MAE 0.000074404; 130 strong |
| Actual 600 m | 0.000053949 | 18,704 / 1,085 | **pixel-exact** |
| Amplified all-narrow 300 m | 0.000082765 | 20,284 / 1,375 | **pixel-exact** |

The 600 m actual view and amplified view are clean causal controls: product replay is pixel-exact while the cell-contained state changes sparse rendered canopy-edge fragments. This proves the 142 base-atlas pixels can survive filtering and rendering. The near and mid captures have non-atlas replay drift, so their raw screen totals are not attributed exclusively to cell 7.

All twelve originals and four 8× differences were inspected at original resolution. Product, contained and replay are visually indistinguishable in every ordinary view. The amplified originals are also visually indistinguishable at normal viewing scale. Enhanced differences show sparse canopy-edge flecks, without a seam, foreign silhouette or missing crown. The forced top impostors remain flat radial sprites, an existing debug-forced representation weakness that this test neither introduces nor approves for ordinary aerial selection.

Per-frame draw and triangle counts are not stable in the near and mid sequences, and the first far frame differs before the contained/replay pair settles. The amplified three-state sequence is stable at 165 draws / 846,241 triangles. R9f makes no performance claim because this verifier was designed for pixel causality rather than a timed steady-state performance comparison.

## Superseded harness runs

Earlier R9f summaries are retained as failed-verifier history and are not supporting evidence:

- the first draft called `freeze()` and then waited for a frame counter that freezing had stopped;
- two subsequent captures failed post-processing because the shell Python lacked NumPy/Pillow;
- the first completed method swapped the full accepted atlas and could not attribute the result uniquely to 142 pixels;
- the first cell-only method drew accepted cell 7 with default source-over blending, alpha-unioning semi-transparent pixels instead of replacing them.

Final-v2 fixes those defects by using the bundled Python/Pillow runtime, clearing the target cell before copying it, and enforcing the direct live-product RGBA oracle. Earlier images and summaries remain only as incident records.

## Verification and boundary

Production build passes with 163 transformed modules; `build.log` is retained in the R9f evidence root. Product source hashes remain exactly R9e. Since R9f changes only a verifier and swaps pixels inside a disposable page, the accepted R9e API/restage/ledger contracts remain the applicable product-state evidence and are not re-claimed as fresh R9f tests.

The top-cell effect is measurable, but no inspectable visual defect appears in the supplied ordinary or amplified views. A production cell-contained post-process would change atlas-border behavior without a demonstrated visible gain, so the evidence does not justify that risk. R9f closes only this bounded containment question. It does not close conifer mismatch, ordinary side-transition quality, flat forced top impostors, city fabric, sustained 50 FPS or retained-memory gates.

## Evidence

- `shots/democity/r9f-top-containment/final-v2/summary.json`
- final-v2 twelve `*_product.png`, `*_contained.png`, `*_product_replay.png` originals
- final-v2 four `*_difference_x8.png` images
- final-v2 `live-product-atlas.png`
- `shots/democity/r9f-top-containment/build.log`

## Next bounded priority if independently accepted

Return to the ranked whole-city issues. R8y used conservative city-fabric proxies and left actual road-owner/frontage yield untested. The next diagnostic may route one localized missing link after existing road IDs, then measure real zoning, lots, buildings and state across both accepted seeds before any product road is considered. Preserve all R8y limits and reject the candidate if its small possible yield destabilizes accepted identities, terrain, restore behavior or visual integrity.
