# Democity r7t local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

r7t is a bounded terrain-owner optimization backed by current-source profiling. High uses the established Medium 0.65 LOD distance scale, preserving quality ordering while removing 57,216 peak triangles in the measured slow street view. Two 240-frame A/B pairs show small consistent fps gains. The rejected 0.6 experiment is not shipped.

All 16 standard frames and the interchange view were inspected with zero errors. A/B differences are small and no new seam or terrain-form failure is visible. Build, API, double deserialize, tour and exact cross-seed restage pass. The final matrix improves peak geometry to 2,941,576 and minimum fps to 44.9, but 50 fps still fails and the existing coarse terrain-shadow weakness is not claimed fixed.

Accept the measured margin and retain **6.0 FAIL**. Continue from owner profiling; do not infer a pass from one view or lower terrain detail further without a quality-contract change.
