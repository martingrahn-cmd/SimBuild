# Democity r5e — verification correction

**Score: 6.0 / 10 — FAIL.** The verifier now captures the recurring reflection pass rather than whichever frame happened to finish last. All 16 standard captures are zero-error, but the valid peak is **4,627,862 triangles / 960 draws** and the minimum rate is **32.0 fps**. The performance gate remains failed and the score remains held.

This supersedes r5d only for capture accounting. The r5d source changes, API contract result, heap failure and golden-hour limitation remain unchanged.
