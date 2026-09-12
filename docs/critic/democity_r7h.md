# Democity r7h local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

r7f proves that cross-seed restage was rebuilding a seed-7 plan over seed-1337 terrain. r7g fixes ownership at the source: terrain regenerates from the correct root RNG stream, roads discard only their derived terrain basis, and new-world restage resets authored road IDs without weakening ordinary deserialization. Fresh and restaged seed 7 now match exactly across 263,169 terrain samples, features, road topology, authored counts and districts. The public API, double deserialize, tour and exact multi-restage cycle pass.

The corrected seed-7 world is larger and initially raised forced-GC heap above 512 MB. r7h closes that regression through standard lossless or normalized service-attribute encodings. Service buffers fall by 21,286,956 bytes and the heavier seed-7 world measures 509.1 MB after forced GC. Exact noon/night A/B differences stay below 0.006%, and all directed and matrix evidence is visually clean.

Accept the combined r7g+r7h source. Hold the score at 6.0 because the 48.1 fps matrix minimum still fails 50 fps, zero of nine district centroids move more than 50 m between the two tested seeds, and the existing city-scale, night/golden lighting, seating, grain, activity, ordinary progression and whole-world atomic-restore failures remain. This repair closes cross-seed equivalence; it does not satisfy the broader deterministic-variation clause.
