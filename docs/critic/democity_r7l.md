# Democity r7l local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

r7l fixes one attributable night presentation defect through the established environment owner. The visible sky, including clouds and horizon fog, is exposed down at night while the PMREM radiance input stays unchanged. The result is clearly darker sky separation without weakening the real facade, road, water or lamp lighting.

The skyline's mean, median and highlight ratio move from 59.44 / 49.69 / 3.33 to 41.01 / 39.04 / 4.24 and now meet those bounds. This does not close the blocker: skyline and aerial bright fractions are still only 0.664% and 0.638% against 0.8%, reflecting the same sparse city-scale light density rather than a reason to inflate window or lamp sprites. Directed near views pass their whole-frame luminance and contrast bounds and remain visually coherent.

All 16 standard captures and both directed night captures are zero-error and inspected. Build, API, double deserialize, tour and exact cross-seed restage pass. Peak geometry remains 2,997,270 triangles and 532 draws; minimum measured fps is 46.6, so the performance gate remains failed. Golden-hour washout, city scale, seating, district grain, activity and weak spatial seed variation are unchanged.

Accept the source change and retain **6.0 FAIL**. Further night improvement should come from real occupied frontage and street activity when the scale/performance design supports it, not from enlarging or multiplying emissive effects.
