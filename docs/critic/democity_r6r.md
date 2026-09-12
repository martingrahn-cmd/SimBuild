# Democity r6r local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

r6q attributes the largest retained CPU buffer owner to buildings and proves a duplicated simple/shadow range. r6r shares the immutable combined range between the mutually exclusive LOD meshes. Forced LOD totals are unchanged, every matrix image was inspected, and API/exact restage remain intact.

The change removes 44.3 MB of duplicate building buffers. Clean-load reported heap reaches 510.0 MB, but post-restage forced-GC reporting remains 541.7 MB and the uncollected multi-restage sequence remains much higher. The 512 MB lifecycle gate is not closed. Frame rate remains below 50 fps and broader city quality issues remain. No score increase is supported.

Accept the shared building buffer and retain 6.0 FAIL. Profile frame time by owner next.
