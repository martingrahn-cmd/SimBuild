# Democity r5d — local evidence review

**Score: 6.0 / 10 — FAIL.** The work removes measured shadow work from distant furniture and reduces low-sun clipping in the affected composition, but the city remains over its composed-performance and heap gates. The score is held.

## Evidence reviewed

- The r5d standard 16-frame matrix is all ready with zero errors. Its conservative first pass peaks at **947 draws / 4,593,198 triangles / 37.0 fps** (`shots/democity/r5d/summary.json`). That does not pass the 3M / 50-fps target.
- Exact repeat captures expose a settling variance in three first-pass frames: aerial-night settles at 534 draws / 3,127,163 triangles three times; street noon settles at 421 / 3,053,545; golden skyline settles at 726 / 3,014,411. These controls support the source-level reduction, but they do not erase the recorded worst first-pass outcome.
- Viewed dawn, noon, golden and night captures retain roads, shelters, local furniture, traffic and city form. The golden skyline's sunward region is less bright by the recorded crop metrics, yet water and distant buildings still lose too much separation next to the sun.
- The renewed runtime probe passes its public contract and state operations with zero errors (`shots/democity/r5c/apicheck.json`). It does not validate a memory pass: heap is 1009.4 MB primary and 1264.6 MB after seed-7 restage.

## Ranked remaining issues

1. **blocker — composed geometry, frame rate and heap still fail.** The conservative r5d matrix maximum is 4.59M triangles at 37 fps, and the renewed probe heap is well above 512 MB. The lower repeat values are not a substitute for a full stable matrix.
2. **blocker — capture settling is not deterministic enough for a performance verdict.** Three first-pass cases produced substantially higher draw/triangle counts than their exact repeats. Resolve the wait/LOD/shadow settling condition before making comparative gate claims.
3. **major — golden-hour skyline still lacks enough form separation.** The targeted compensation reduces measured luminance, but the sunward water, road and far-city region remain overly bright.
4. **major — city grain, district transitions, bridge clearance, ground seating, seed lifecycle and street activity retain their prior failed clauses.** This scope did not alter them.
5. **major — no score change is evidence-supported.** The changes are real and verified locally, but no final quality threshold has been cleared.

## Decision

Hold at **6.0 FAIL**. Preserve the distant-furniture shadow cutoff and constrained exposure behavior. Next stabilize the evidence capture path, then continue heap/source-geometry investigation from fresh stable measurements. Do not start whole-game judging or blind A/B while this blocker remains open.
