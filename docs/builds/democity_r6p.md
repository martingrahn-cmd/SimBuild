# Democity r6p accepted 360 m building shadow boundary

After accepted r6o, a 384 m three-tile threshold was measured first. Because chunk centres are discrete, it removed only 4,338 additional triangles and still peaked at 3,002,124. It was not integrated as a completed gate.

r6p tests the next actual chunk transition at 360 m. Four building chunks begin at 362–380 m from the fixed street camera; they retain all LOD0/LOD1 visible geometry and building state but stop shadow submission. The remaining 20 nearby chunks inside 360 m keep the existing shadow-only LOD2 geometry and full near-cascade facade relief. The threshold is horizontal, so aerial camera height cannot disable the central shadow neighbourhood.

Street and aerial noon, golden-hour and night captures were inspected, followed by all 16 Metal matrix images. Central tower shadows, close facade relief and street contact remain readable with no radial transition or missing building. The matrix is 16/16 ready with zero errors at 532 maximum draws, 2,997,270 maximum triangles and 45.4 minimum fps, 9,192 triangles below r6o and 2,730 below the 3M budget.

Public API, double deserialization, all eight tour stops and exact 1337→7→1337→7 authored restage pass. Heap remains failed at 774.2–1,094.2 MB. Production build passes 163 modules.

r6p is accepted with Democity held at 6.0 FAIL. The composed triangle budget now passes, but 50fps, 512MB heap, city scale, lighting, seating, grain, activity and lifecycle gates remain failed. Further geometry removal is not the next priority; profile the frame and retained-heap bottlenecks on accepted r6p source.
