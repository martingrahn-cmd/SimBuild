# Democity r6t local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

r6t addresses a measured active-play render cost rather than hiding content. Water surface animation continues every frame, fixed-camera planar geometry refreshes at four-frame cadence, and camera motion or explicit scene invalidation refreshes immediately. The cadence probe, active performance controls, directed water views, full matrix and save/restage contracts all pass.

The result is material but insufficient: fixed-camera active aerial-night performance improves by roughly 2–4 fps yet remains 43.64–44.46 fps, below the 50 fps gate. Peak geometry is unchanged at 2,997,270 because the reflection remains real, and memory, city scale, lighting, seating, grain, activity and lifecycle issues remain. Static captures support visual integrity but do not justify a higher art or gameplay score.

Accept r6t and retain 6.0 FAIL. Measure the remaining terrain/reflection GPU cost before changing reflection resolution or visible terrain detail.
