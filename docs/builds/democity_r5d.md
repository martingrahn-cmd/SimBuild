# Democity r5d builder record — 2026-09-08

## Scope

This continuation uses the existing terrain, props and environment ownership paths. It does not add city content, duplicate lighting, change service economics or alter the Democity public API.

- Near-camera grass scatter is widened from 0.45 m to 0.55 m and its radius is reduced from 30 m to 26 m. The terrain shader and the separate mid-range tuft layer remain in place.
- Street-furniture shadow casting now ends at 360 m instead of 560 m. Furniture remains rendered out to the established detail radius, and shadows remain at street-view distances.
- The existing exposure control now makes at most a 13% compensation only when a low sun is in the camera's forward direction. Side-lit and sun-behind views use the prior exposure path.

## Verification

- `npm run build` passes with 163 transformed modules.
- The r5d standard 16-frame Metal matrix is ready with zero errors (`shots/democity/r5d/summary.json`). Its conservative first-pass maximum is **947 draws / 4,593,198 triangles / 37.0 fps**. It remains a failed performance gate.
- Three exact repeats of the anomalous aerial-night case settle identically at **534 draws / 3,127,163 triangles**; exact repeats of the other two initial outliers settle at **421 / 3,053,545** (street noon) and **726 / 3,014,411** (golden skyline). The first-pass maximum is retained as evidence rather than replaced with the lower values.
- Directed r5c captures of the same geometry/shadow change show 2,816,679 triangles in aerial dawn, 3,179,665 in golden street, and 2,953,065 in noon closeup, all with zero errors. They show retained local furniture shadows and no lost gameplay object.
- The renewed current-source public probe passes all 13 Democity methods, two successful deserializations, eight valid tour stops, invalid-tour rejection, seed-7 restage, and zero browser/runtime errors (`shots/democity/r5c/apicheck.json`). Primary contents remain 612 buildings, 31 services, 503/507 utility coverage and 306/507 health-and-education coverage.
- In the directed 17:30 skyline, the sunward city/water crop mean luminance changes from **0.650606** to **0.618229** and the sky crop from **0.948289** to **0.936778**. Viewed output retains the city silhouette and water, but remains visibly sun-washed.

## Limits

The matrix still exceeds the 3M/50-fps target and the current probe heap is 1009.4 MB before seed-7 restage and 1264.6 MB after it. The initial-matrix versus repeat discrepancy must be treated as a verification limitation until screenshot settling is made deterministic. The view-aware exposure change reduces clipping pressure but does not make the golden skyline pass. No critic score is justified by this builder record.
