# Democity r6q/r6r retained-memory attribution and accepted shared building buffer

r6q adds a forced-GC CPU memory inventory. Accepted r6p retains 519.6 MB backing storage at clean load. Buildings own 220.9 MB of CPU geometry buffers, props 52.8 MB, services 43.9 MB and roads 22.2 MB. Inspection identifies the buildings duplication: each 128 m chunk stored `[full, simple, shadow]` for its LOD0 mesh and a second `[simple, shadow]` copy for its LOD1 mesh even though only one LOD mesh can be visible.

r6r gives both building LOD meshes one shared immutable `[full, simple, shadow]` attribute/index store. Each mesh retains its own main-pass start/count, reflection selection, shadow selection, visibility and callbacks. Rebuild/dispose deduplicates shared geometry disposal, and accounting stores the main index count on the mesh. No vertex, triangle, plan, facade, shadow or save data is removed.

Forced LOD0/LOD1 reports the same 977,816/200,332 building triangle totals as accepted r6p. All 16 Metal matrix images were inspected and remain zero-error at 532 maximum draws, 2,997,270 maximum triangles and 45.8 minimum fps. Public API, double deserialization, all eight tour stops and exact 1337→7→1337→7 authored restage pass.

Buildings CPU buffer storage falls from 220.9 to 176.7 MB and total backing storage from 519.6 to 475.4 MB. Clean-load reported heap falls from 552.4 to 510.0 MB, but forced-GC post-restage reported heap remains 541.7 MB and the ordinary four-stage raw sequence is 537.9–921.6 MB. The 512 MB gate therefore remains failed after restage.

r6r is accepted with Democity held at 6.0 FAIL. It removes 44.3 MB of duplicate CPU geometry without changing the scene. Next profile frame time by owner on accepted r6r; do not change geometry that already passes its gate.
