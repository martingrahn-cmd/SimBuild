# Democity r7u local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

r7u removes one distant hard-furniture chunk from the measured slow street view while retaining the seven chunks within 251 m and every real prop record. The source change is owner-local and does not alter placement, traffic-light state, lamps, trees, save data or simulation. The final peak drops 22,798 triangles and two draws from r7t.

All required and directed images were inspected with zero errors. The nearest street context remains intact and matrix A/B differences are small. Build, API, repeated deserialize, tour and exact cross-seed restage pass. The matrix minimum is 44.2 fps, so no 50 fps or score claim is justified; the coarse 256 m chunk boundary also makes further radius reduction unsafe without redesign.

Accept the bounded margin and retain **6.0 FAIL**.
