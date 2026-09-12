# Democity r5e verification record — 2026-09-08

The screenshot verifier now samples every rendered frame during its measurement window and reports the peak draw/triangle cost. This includes the planar-water reflection, which intentionally refreshes every eighth frame.

- Three identical aerial-night controls now agree exactly at **682 draws / 4,593,198 triangles**.
- The full 16-frame Metal matrix is ready with zero errors at `shots/democity/r5e/summary.json`: **960 max draws / 4,627,862 max triangles / 32.0 min fps**.
- This is the valid conservative reference for the r5d source. It confirms the composed 3M / 50-fps gate still fails; no source quality claim is raised from earlier last-frame-only metrics.
