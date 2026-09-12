# Democity r6h/r6i owner reprofile and accepted service shadow distance

r6h measures the accepted r6g street-22 peak at 3,267,680 triangles. Props contributes 1,143,222, roads 746,696, services 469,168 and buildings 285,990 triangles. Hard props furniture contributes 452,656; the existing forced tree LOD2 would save 256,736 but remains visually rejected.

Services uses owner-held 128 m chunks. At the street camera, the largest service chunks are centred 122 m (45,336 source triangles) and 334 m (25,616) away; both retain full shadows. Detail chunks at 465–756 m continued to submit small facility parts and foliage to every shadow cascade.

r6i adds a 420 m services shadow distance while keeping the existing 800 m visible-detail/proxy threshold. Every real paid facility, footprint, visible geometry, coverage, live load, rotor/emitter state and serialized record is unchanged. Only distant detail meshes stop shadow submission.

Street, aerial and industry noon/golden-hour captures were inspected, followed by all 16 Metal matrix images. Near power-station volumes and civic contact shadows remain; distant facilities remain visible. The matrix is 16/16 ready with zero errors at 784 maximum draws, 3,181,662 maximum triangles and 40.7 minimum fps, 86,018 triangles below r6g.

Public API, double deserialization, all eight tour stops, invalid-tour handling and exact 1337→7→1337→7 authored restage pass. Heap remains failed and volatile at 668.7–1,130.9 MB. Production build passes 163 modules.

r6i is accepted with Democity held at 6.0 FAIL. The matrix still exceeds 3M by 181,662 triangles and fails 50fps/512MB; re-profile remaining shadow and colour submissions rather than adding city density or removing real facilities.
