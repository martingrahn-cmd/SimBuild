# R31 normalized merged Props colour buffers

## Scope

R31 changes only the retained colour representation produced by Props' merged-geometry accumulator. Its audited colour domain is 0–1, so the 103 merged furniture/foliage geometries now store RGB as normalized unsigned 16-bit values. Shared tree base geometry, normals, UVs, instance data, placements, LOD selection, materials, simulation and saved Props data are unchanged.

## Evidence

Evidence directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r31/`.

- `props-attribute-inventory-candidate.json` and `props-color-buffer-contract.json`: 103 intended geometries / 933,646 vertices use normalized `Uint16Array` RGB, exactly 5,601,876 bytes. The 153 shared tree-instance geometries retain their established Float32 base colours. Props SHA-256 remains exactly `e9ab36bc…6d03` after deserialize/rebuild, and the representation repeats exactly.
- `memory-candidate/memory-inventory.json`: Props CPU buffers fall 52,859,208→47,257,332 bytes. Browser backing storage falls 372,623,355→367,021,063 bytes, within 416 bytes of the exact attribute delta. Geometry remains 1,030,627 vertices / 709,470 triangles.
- Matched day/night park captures retain exactly 493 / 453 draws and 1,903,498 / 2,258,608 triangles, errors 0. Normalized MAE is 1.9703e-05 by day and 1.79033e-07 at night. The four originals and amplified differences were inspected; original presentation is visually equivalent, while the amplified maps confine differences to tiny vegetation/furniture colour quantization pixels.
- Canonical Vite build: PASS, 164 modules.
- `node src/modules/simulation/selftest.mjs 90 1337`: PASS; deterministic repeat and exact mid-run save/load.

## Decision

Accept R31. It removes 5.60 MB of retained Props/backing storage without changing scene content, state or visible presentation. Props remains **6.4/10 FAIL** and whole-game remains **6.0/10 FAIL**. This does not certify the sustained 512 MB gate or improve the stylized/planar foliage that remains visible in the same evidence.
