# R30 normalized building window buffers

## Scope

R30 changes only the retained representation of Buildings' four-component `win` vertex attribute. The established value domains are encoded as normalized unsigned 16-bit values: window state and variant use their existing 0–1 range, tier is encoded against 1.5, and bias against 1.4. The building vertex shader reconstructs those two authored scales before the unchanged material logic runs. Geometry generation, window selection, facade colour, LOD, simulation and save ownership are unchanged.

## Evidence

Evidence directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r30/`.

- `building-window-buffer-contract.json`: all 111 unique building geometries use normalized `Uint16Array` colour and `Uint16Array` window storage. The 2,643,278 vertices retain exactly 21,146,224 bytes of window data, versus 42,292,448 bytes in R29. Serialize→deserialize→flush preserves the exact Buildings SHA-256 `972e8066…2289c` and the packed representation.
- `memory-candidate/memory-inventory.json`: Buildings CPU buffers fall 130,594,604→109,448,380 bytes. Fresh-page browser backing storage falls 393,766,568→372,623,355 bytes; its 3,011-byte deviation from the exact attribute delta is page-allocation noise. Geometry remains 2,643,278 vertices / 1,313,894 triangles.
- The matched R29/R30 night block retains 93 draws / 691,812 triangles and errors 0. Normalized ImageMagick MAE is 2.12444e-07. Both originals and the side-by-side comparison were inspected; the lit-window pattern, brightness, facade tint and silhouettes are visually equivalent.
- Canonical Vite build: PASS, 164 modules.
- `node src/modules/simulation/selftest.mjs 90 1337`: PASS; deterministic repeat and exact mid-run save/load.

R29 and R30 together remove 37,005,892 bytes from the current Buildings CPU-buffer inventory. Raw heap and fps endpoints remain too variable for a sustained whole-game claim.

## Decision

Accept R30. It removes another 21.15 MB of retained building/backing storage with explicit, bounded reconstruction and no verified visual, state or restore regression. Buildings remains **7.4/10 FAIL** and whole-game remains **6.0/10 FAIL**. The sustained 512 MB gate is still uncertified, and this memory improvement does not resolve city fabric, foliage, lighting depth or site integration.
