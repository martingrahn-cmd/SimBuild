# Democity r6s frame-owner and reflection-cadence diagnosis

r6s changes verification tooling only. The original 40-frame shadow timing sample was too noisy for source decisions: disabling individual shadow owners produced inconsistent frame-rate direction. Its submitted-triangle attribution remains useful, but its timing values are superseded.

Four interleaved 180-frame street-night controls on accepted r6r are stable at 47.18, 47.43, 47.32 and 47.66 fps. Temporary owner visibility masks show the largest render-time deltas from terrain, props and roads: hiding terrain reaches 58.72 fps, props 56.22 fps and roads 51.30 fps. These masks are diagnosis only; no scene content is removed in production.

The profiler now records minimum, maximum and average per-frame draw/triangle totals and accepts an explicit simulation speed. At a fixed aerial-night camera, paused speed 0 averages about 324 draws / 1.910M triangles and 44.43–46.35 fps because the planar reflection refreshes periodically. Active speed 1 averages about 417 draws / 2.354M triangles and 39.72–41.89 fps with almost no frame-to-frame range. This proves the animated-water invalidation currently forces the half-resolution planar city reflection every active frame.

No production change or critic-score change is made in r6s. The next bounded candidate must keep reflective water, update immediately for camera or explicit scene changes, and reduce only redundant active-animation refreshes. It must be measured under active simulation and visually inspected before acceptance.
