# Democity r6u/r6v moving-reflection diagnosis and accepted 640 target

r6u profiles accepted r6t with active simulation and continuous camera rotation. The full planar reflection costs about 107 average draws, 526k average submitted triangles and 3.9–4.5 fps: real-reflection controls run at 41.21–41.83 fps, while a diagnostic public `setReflection(false)` mask reaches 45.70–45.74 fps. The latter still fails 50 fps, so reflection resolution alone cannot close the frame-rate gate.

Global diagnostic `T_NO_FINE`, `T_NO_MACRO` and combined terrain shader variants show no repeatable benefit against interleaved 180-frame street-night controls. No terrain surface material or visible detail change is accepted from that result.

r6v tests the High-quality planar target at 640×320 instead of 768×384; Ultra remains 1280×640. Four 180-frame moving-camera controls improve from 41.21–41.83 fps to 41.82–42.39 fps. The modest gain is repeatable and reduces reflection pixels by 30.6% without changing submitted geometry.

Exact 768/640 paused A/B captures at terrain coast and Democity bridge noon/night differ by only 0.021–0.039% whole-image MAE. Both sides of all three comparisons were inspected and the water/reflected skyline is visually equivalent at 1080p. The 16-frame candidate matrix is zero-error at 532 maximum draws and 2,997,270 maximum triangles; its 44.4 minimum single-capture fps is lower than r6t's noisy 46.5 and is not claimed as an improvement. Public API, double deserialization, tour and exact authored restage pass. Production build passes 163 modules.

r6v is accepted with Democity held at 6.0 FAIL. The moving-camera path improves modestly with no measurable visual loss, but both moving and fixed active play remain below 50 fps and all broader issues remain.
