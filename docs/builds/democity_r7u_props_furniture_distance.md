# Democity r7u measured distant furniture culling

r7u follows the r7t current-source owner profile. Temporarily masking all props raises the slow street 06:30 sample from 46.875 to 58.539 fps. Correct subtype masks show hard merged furniture as the material contributor; the tree-kind masks are timing noise, foliage is only 978 peak triangles, and the global forced tree LOD2 path remains a rejected visual upper bound.

A dedicated visible-chunk probe finds eight hard-furniture chunks in the slow view. Seven have geometry centres within 251 m; one 22,582-triangle chunk is centred at 298 m. The accepted candidate changes only the hard-furniture/glass visibility radius from 420 m to 280 m. It does not delete world props, change placement, save data, lamp/signal state, tree LOD, foliage, near furniture or simulation.

Two 240-frame candidate controls measure 48.630 and 48.526 fps against the preceding accepted-source controls 48.325 and 47.728. The final 16-frame matrix is error-free at 530 draws and 2,918,778 peak triangles, 22,798 below r7t. Its 44.2 minimum is noisy and below r7t's 44.9; no whole-matrix fps gain is claimed.

All 16 standard images and four directed A/B views were inspected, including an amplified difference image. Near shelters, signal housings, lamps and benches remain. Across the full matrix the maximum mean absolute difference is 0.153063/255, at most 0.8549% pixels change by more than two levels, and maximum p99 is one level. Build, public API, double deserialize, tour and exact restage pass.

Accept the bounded geometry/profile improvement and retain Democity at **6.0 FAIL**. The 50 fps gate, scale, seating, lighting, variation and human-play gates remain open. Do not lower the coarse 256 m furniture distance again without a per-object or finer-chunk design.

Evidence: `shots/democity/r7u-props-profile/`, `shots/democity/r7u-props-280/`, `shots/democity/r7u/`.
