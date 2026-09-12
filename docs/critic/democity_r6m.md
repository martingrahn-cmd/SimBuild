# Democity r6m local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

The repaired r6l profiler identifies hard furniture as 338,682 of the 505,788 submitted props shadow triangles. r6m stops only three roughly 300 m furniture chunks from entering shadow cascades while retaining every visible prop and the three nearest shadow chunks. All 16 matrix images and six directed street/aerial images were inspected without a visible regression.

The peak falls from 3,155,766 to 3,088,020 triangles. It still exceeds 3M; 44.6 minimum fps and 767–1,078 MB heap fail. Broader city scale, lighting, seating, grain and activity remain unresolved. No score increase is supported.

Accept the 240 m furniture shadow radius and retain 6.0 FAIL. Do not lower it again under the current 256 m chunk contract; inspect building shadow distance next.
