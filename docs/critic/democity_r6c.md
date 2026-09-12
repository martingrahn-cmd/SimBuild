# Democity r6c local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

The candidate changes only props-owned hard-furniture and shelter-glass visibility beyond 420 m. The real object set, deterministic placement, lamp/stop/signal behavior, public API and exact cross-seed restoration remain intact. All 16 matrix captures were inspected; near street furniture remains readable across day, golden hour and night, while the removed distant meshes were below useful visual resolution.

The improvement is measurable but bounded. The verified matrix peak falls from 3,827,780 to 3,735,080 triangles and maximum draws from 801 to 799. The minimum measured frame rate is still 30.9fps, heap remains volatile above 512MB, and city scale, lighting, seating, district grain and activity remain failed. The result does not justify a higher score.

Accept the 420 m furniture render distance with the score held. Profile retained furniture geometry by real kit and distance band before another candidate; any later LOD must preserve the same real items and near-camera silhouettes.
