# Democity r8o — mountain-material local candidates rejected

**Builder decision: reject every r8o product candidate and retain the pre-r8o terrain source. Democity and whole-game remain 6.0/10 FAIL.**

## Diagnosis

Four fresh current-source city captures reproduce the whole-game critic's coarse/stretched mountain surface with zero errors. The industry and riverfront views show large pale islands across the lower mountain and repeated soft dark motifs above them. A temporary magenta component capture, removed immediately after use, proves that the pale islands are the scree branch rather than the triplanar rock branch. The scree blend covers most of the mountain foot and many patches higher on the slope.

The active source combines slope with 170 m, 41 m and fine noise to select rock/scree/grass. Scree then uses a bright `gravel_floor_02` parking-gravel albedo, while the darker `rock_face` triplanar branch covers a much smaller share than the full-frame appearance initially suggested. The visible issue therefore spans material selection, palette and missing geological form; it is not safely attributable to one rock UV scale.

## Rejected candidates

1. **Triplanar scale, rotation and domain warp.** Reduced the far rock scale and decorrelated projections without extra samples. Four original city images looked nearly unchanged. Crop repeat/variance metrics were neutral or slightly worse, so the change was reverted.
2. **Weaker macro control of rock/scree masks.** Reduced the 170/41 m noise contribution and tied rock more closely to resolved slope. Original images developed larger pale fields and clearer contour-like material boundaries. This was a visual regression and was reverted.
3. **One secondary rock albedo sample.** Blended a rotated 23 m sample on the dominant triplanar projection. Four city and three isolated terrain originals remained visually almost unchanged. Matched isolated-frame difference was only 0.014–0.061 mean absolute RGB; pixels changing by more than two levels ranged 0.168–1.060%, and pixels changing by more than eight stayed below 0.014%. The extra GPU sample did not earn its cost and was reverted.
4. **Scree palette remap.** Kept the mask and sample count but used the gravel texture as luminance grain over a darker grey-brown palette. It changed 6.63–15.39% of full-frame pixels by more than two levels, but all four pinned mountain crops lost luminance spread: standard deviation fell 31.13→29.10, 30.47→28.72, 26.03→24.99 and 28.12→26.71. Original inspection found a darker surface without a clear reduction in coarse patch structure. It was reverted.

## Verification and retained state

- All 27 supplied originals were opened and inspected: four baseline city frames, four frames for each of four product candidates, three isolated candidate frames, three matched isolated baseline frames and one diagnostic layer frame.
- Every screenshot sidecar reports ready state and zero errors. The three isolated candidate3 pairs keep matching geometry counts. City-frame counters are not treated as matched: for example, riverfront12 is 241 draws / 1,311,068 triangles at baseline and 246 / 1,312,596 in each candidate, consistent with an unmatched render/reflection or traffic phase rather than evidence of changed terrain geometry. Short-run FPS variation is not treated as an optimization result.
- Production build passes with 163 transformed modules after all candidate and diagnostic hunks were removed.
- `git diff --check` passes. Final `src/modules/terrain/material.js` SHA256 is `fcc1c60e31f321d72be524789ac53da31f0bcdffd68419dc29c04c0ff41478b0`.
- No heightfield, land-cover texture, roads, buildings, services, geometry, RNG, simulation, save state or architecture contract was changed.

## Decision and next path

The local shading-only path is exhausted for this round. A credible mountain improvement needs coordinated geological material distribution or terrain form evidence and would cross the bounded owner-safe constraint used here. The documented defect remains open; no score increase or visual improvement is claimed.

Continue with the next measured owner-safe bottleneck. The whole-game performance failure has reproducible frame/update data and can be profiled without changing city state. Sparse city fabric remains the highest visual issue, but existing evidence says its safe solution requires coordinated zoning/building frontage design rather than another scalar or showcase-only fill.

Evidence:

- `shots/democity/r8o-mountain-material-baseline/`
- `shots/democity/r8o-mountain-material-candidate/`
- `shots/democity/r8o-mountain-material-candidate2/`
- `shots/democity/r8o-mountain-material-candidate3/`
- `shots/democity/r8o-mountain-material-candidate4/`
- `shots/democity/r8o-mountain-material-layer-diagnosis/`
- `shots/democity/r8o-mountain-material-baseline-isolated/`
- `shots/democity/r8o-mountain-material-candidate3-isolated/`
