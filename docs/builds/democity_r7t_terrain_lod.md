# Democity r7t measured High terrain LOD threshold

r7t starts with a fresh 120-frame owner profile of the accepted street 06:30 view. The baseline measures 46.875 fps. Temporarily masking terrain, props, roads, services and buildings reaches 60.00, 58.54, 53.03, 53.08 and 56.09 fps respectively; masking traffic does not help. These masks are attribution only.

Terrain LOD scale 0.7 removes 44,692 peak triangles but does not repeatably improve fps. Scale 0.6 removes 60,800 and sometimes exceeds 50 fps, but it would make High coarser than the established Medium 0.65 threshold, so it is rejected. The accepted High scale is 0.65, equal to Medium and still finer than Low. Two interleaved 240-frame pairs improve from 48.325→49.050 and 47.728→48.241 fps while removing 57,216 peak triangles in the measured view.

All 16 standard Metal captures and a directed interchange view were inspected. No new seams, silhouette damage or terrain/shadow discontinuity was found. Against r7r, the maximum whole-image mean absolute difference is 0.194727/255, no frame has more than 1.7764% pixels changing by over two levels, and maximum p99 difference is four levels. The standard matrix remains error-free at 532 maximum draws and falls from 2,998,792 to 2,941,576 maximum triangles. Minimum captured fps improves from 43.2 to 44.9 but still fails 50 fps.

Build passes 163 modules. Public API, double deserialize, all eight tour stops and exact 1337→7→1337→7 restaging pass. This owner-safe geometry/timing margin is accepted with Democity held at **6.0 FAIL**. It does not close performance, scale, lighting, seating, variation or human-play gates.

Evidence: `shots/democity/r7t-current-profile/`, `shots/democity/r7t-terrain-lod/`, `shots/democity/r7t/`.
