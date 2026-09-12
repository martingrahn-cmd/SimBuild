# Democity r5f — local critical review

**Score: 6.0 / 10 — FAIL (held).**

r5f removes a measured, visually dispensable reflection-only detail pass without removing main-view gameplay or city geometry. All 16 required captures and the public contract probe are clean. The standard peak improves from r5e's 4.63M to **3.94M triangles**, and viewed night water still carries the legible city mass rather than a blank or showcase-only substitute.

The score does not rise. The whole-scene geometry target remains missed by roughly 0.94M triangles, the 50-fps requirement is still missed, retained heap after restage is still roughly 1.06GB, and the representative r5f images still show repetitive façades, sparse street activity, an overexposed sunward skyline, inadequate city scale, and unresolved seating/bridge/cross-seed failures. This performance reduction is evidence to continue from, not evidence that the city meets the quality bar.

Evidence: `docs/builds/democity_r5f.md`, `shots/democity/r5f/summary.json`, `shots/democity/r5f/apicheck.json`, and `shots/democity/r5e/reflection-profile.json`.
