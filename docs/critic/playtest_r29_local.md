# R29 local critical review

**Decision: accept the normalized 16-bit Buildings colour buffer at unchanged scores.**

The change has a measured owner-local benefit: the same 2,643,278 building vertices retain 15,859,668 fewer bytes, and the fresh browser's backing storage falls by the same amount. The dedicated contract proves the shader-facing type, normalization flag, unchanged Float32 window state and exact Buildings restore hash. This is stronger evidence than the volatile raw heap and fps endpoints.

The visual risk is adequately bounded. Day and night block views retain exact draw/triangle counts and differ by only 4.66493e-07 / 1.13471e-07 normalized MAE. Inspection finds no banding, tint shift or change to lit-window selection. The earlier half-float attempt failed visibly and is correctly excluded; the two horizon trials and 0.26% land-cover micro-optimization are also correctly rejected.

No score rises. A 15.86 MB saving does not by itself pass the 512 MB sustained-memory gate, improve sparse/repeated city fabric or make the building art meet the 8.5 reference standard. Buildings stays **7.4 FAIL** and whole-game stays **6.0 FAIL**.
