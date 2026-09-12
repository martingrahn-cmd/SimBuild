# Democity r6j/r6k shadow attribution and accepted props LOD1 shadow contract

r6j extends the temporary profiler with `shadow:<owner>` targets that hold `castShadow=false` through owner per-frame updates on the isolated diagnostic page. At accepted r6i street-22, submitted shadow costs are props 531,684 triangles, services 294,474, roads 170,802, buildings 130,514, transit 31,008 and traffic 3,972. Visible colour passes remain enabled during these measurements.

Props already declared `LOD1_CAST_R = 120`, but `_updateChunk()` ignored it and used a hard-coded 240 m value. r6k applies the existing owner constant. LOD0 near trees, the nearest LOD1 chunk, hard furniture, foliage and all visible tree geometry remain unchanged; only farther volumetric LOD1 tree meshes stop entering shadow cascades.

Street noon/golden-hour, closeup and aerial captures were inspected, followed by all 16 Metal matrix images. Nearby tree contact shadows remain readable and no tree disappears. The matrix is 16/16 ready with zero errors at 778 maximum draws, 3,155,766 maximum triangles and 43.0 minimum fps, 25,896 triangles below r6i.

Public API, double deserialization, all eight tour stops and exact 1337→7→1337→7 authored restage pass. Heap remains failed at 658.2–993.7 MB. Production build passes 163 modules.

r6k is accepted with Democity held at 6.0 FAIL. The matrix still exceeds 3M by 155,766 triangles and 50fps/512MB remain failed. Next divide the remaining props shadow submission by actual mesh class before considering another distance or geometry change.
