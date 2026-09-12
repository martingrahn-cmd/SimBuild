# Democity r6y local critical review

**Verdict: 6.0 / 10 — FAIL (score held).**

r6w establishes buildings as the largest remaining non-reflection render owner. r6x is correctly rejected because its texture-read optimization did not beat measurement variation. r6y instead targets the separately measured retained-memory blocker with standard static-attribute encodings. It saves 31.5 MB in the building owner, preserves exact LOD counts and restage identity, and passes the complete visual/API evidence set.

The forced-GC lifecycle result is meaningful: clean load is 480.0 MB and post-restage is 509.9 MB, both below 512 MB. This closes that measured clause. The score must still remain 6.0 because the 50 fps gate fails and city scale, golden/night lighting, seating, tiling/grain, activity, ordinary progression and whole-world restore issues remain. The matrix minimum of 44.1 fps is retained as failed evidence.

Accept r6y and retain 6.0 FAIL. Separate building/service colour and shadow timing before changing their chunk or shadow contracts.
