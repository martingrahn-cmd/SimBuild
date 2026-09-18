# R29 normalized building colour buffers

## Scope

R29 changes only the retained representation of the Buildings vertex `color` attribute. Authored facade colour and contact-AO values are clamped to their established 0–1 range, quantized to normalized unsigned 16-bit values and consumed by the unchanged building shader. Positions, normals, UVs, indices, window state, building tint indices, geometry generation, LOD selection, saves and simulation are unchanged.

Three preceding candidates were rejected and reverted before integration. Two Terrain horizon fades changed pixels without materially improving the inspected waterfront seam. A Worley squared-distance kernel retained exact land-cover bytes but improved the six-pair seed-1337 median only 994.75→992.15ms (0.26%), inside noise. A Buildings half-float colour/window candidate produced severe dark-facade and missing-night-window regressions despite zero WebGL errors.

## Evidence

Evidence directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r29/`.

- `memory-baseline/memory-inventory.json` and `memory-candidate/memory-inventory.json`: identical 2,643,278 Buildings vertices and 1,313,894 triangles. Buildings CPU buffers fall 146,454,272→130,594,604 bytes; browser backing storage falls 409,626,160→393,766,568 bytes. Both pages are zero-error.
- `building-color-buffer-contract.json`: all 111 unique building geometries use normalized `Uint16Array` colour and unchanged `Float32Array` window state. Colour storage is exactly 15,859,668 bytes; serialize→deserialize→flush keeps the exact Buildings SHA-256 `972e8066…2289c` and identical representation.
- Matched block captures retain 95 draws / 714,164 triangles by day and 93 / 691,812 at night, errors 0. Normalized ImageMagick MAE is 4.66493e-07 by day and 1.13471e-07 at night. All four originals and the contact sheet were inspected; no colour banding, changed lit-window pattern, dark facade or material failure is visible.
- Canonical Vite build: PASS, 164 modules.
- `node src/modules/simulation/selftest.mjs 90 1337`: PASS; deterministic repeat and exact mid-run save/load.

The raw heap/fps values in separate fresh pages vary and are not used as causal evidence. The exact buffer and backing-storage deltas are the acceptance basis.

## Decision

Accept R29. It removes 15.86 MB of retained building/backing storage without changing scene geometry, building state or visible presentation. Buildings remains **7.4/10 FAIL** and whole-game remains **6.0/10 FAIL**. The 512 MB project gate is still not certified by a sustained forced-GC whole-game matrix, and the larger city-fabric, foliage, night-depth and site-integration findings remain open.
