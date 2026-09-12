# Democity r6k local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

The candidate corrects an internal mismatch by using the props owner's declared 120 m LOD1 shadow limit. It changes no real prop, visible geometry, species, placement, save data or simulation. Near LOD0/LOD1 tree shadows remain. All 16 matrix images and directed tree-contact evidence were inspected without a visible regression.

The peak falls from 3,181,662 to 3,155,766 triangles. It still exceeds 3M; 43.0 minimum fps and 658–994MB heap fail. Broader city scale, lighting, seating, grain and activity remain unresolved. No score increase is supported.

Accept use of `LOD1_CAST_R` and retain 6.0 FAIL. Attribute remaining props shadows by mesh class before another candidate.
