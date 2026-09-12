# Democity r6l/r6m props shadow-class attribution and accepted furniture shadow contract

r6l repairs and extends the temporary main-pass profiler so props shadow submissions are divided by actual mesh structure rather than shader cache keys that do not exist before compilation. On accepted r6k source at street 22:00, props shadows submit 505,788 peak triangles: hard furniture 338,682, tree LOD0 131,940, tree LOD1 34,632 and foliage 534. The six furniture chunks contain 183,466 source triangles; three are centred about 298–310 m from the camera and three about 73–220 m away.

r6m reduces only the props-owned hard-furniture shadow radius from 360 m to 240 m. Furniture and shelter glass remain visible to the existing 420 m render distance. The three nearest 256 m chunks keep shadows; the three roughly 300 m chunks cease shadow submission. Tree, foliage, signal, placement, simulation and save behavior are unchanged.

Street and aerial noon, golden-hour and night captures were inspected, followed by all 16 Metal matrix images. Nearby benches, stops, signals and their contact shadows remain readable. The matrix is 16/16 ready with zero errors at 775 maximum draws, 3,088,020 maximum triangles and 44.6 minimum fps, 67,746 triangles below r6k.

Public API, double deserialization, all eight tour stops and exact 1337→7→1337→7 authored restage pass. Heap remains failed at 767.2–1,077.9 MB. Production build passes 163 modules.

r6m is accepted with Democity held at 6.0 FAIL. The matrix still exceeds 3M by 88,020 triangles and the 50fps/512MB and broader visual gates remain failed. Lowering the furniture radius again is unsafe because a 256 m chunk centred 210–220 m away can contain close visible street furniture. Next inspect the already compact buildings shadow contract by measured distance before any source change.
