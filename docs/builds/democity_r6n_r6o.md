# Democity r6n/r6o building shadow-distance attribution and accepted near-shadow contract

r6n extends the temporary shadow profiler with horizontal-distance masks so aerial camera height cannot be mistaken for ground distance. On accepted r6m source at street 22:00, buildings submit 130,514 shadow triangles. Removing only chunks beyond 400 m horizontally would remove 84,656 of those; the same mask at aerial noon removes 160,006 while retaining the central 400 m shadow neighbourhood. Vertical-distance masks were rejected as invalid for this purpose because they removed nearly every aerial building shadow.

r6o adds a buildings-owned 400 m horizontal shadow radius to the existing 128 m chunk LOD update. Both deterministic LOD0/LOD1 visible meshes, building plans, facade relief, shadow-only LOD2 geometry and save data remain. Only chunks beyond the radius cease shadow submission; close buildings keep full near-cascade relief and contact shadows.

Street and aerial noon, golden-hour and night captures were inspected, followed by all 16 Metal matrix images. The central towers retain their long city-form shadows, street and closeup views keep facade/contact depth, and no radial shadow edge is visible. The matrix is 16/16 ready with zero errors at 532 maximum draws, 3,006,462 maximum triangles and 44.9 minimum fps, 81,558 triangles below r6m.

Public API, double deserialization, all eight tour stops and exact 1337→7→1337→7 authored restage pass. Heap remains failed at 659.8–1,098.0 MB. Production build passes 163 modules.

r6o is accepted with Democity held at 6.0 FAIL. The matrix still exceeds 3M by 6,462 triangles and the 50fps/512MB and broader visual gates remain failed. Next test the owner-natural three-tile radius of 384 m; accept it only if the same visual and contract evidence remains clean.
