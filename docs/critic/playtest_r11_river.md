# Local critical review — PT-14 river

**Decision: accept bounded visual fix; scores unchanged.**

The human defect is reproduced in the baseline: from valley and high aerial angles, inland water is dominated by broad sky reflection and reads as a hole through the terrain. The candidate is correctly limited to Terrain's established water shader and existing sea mask. Noon normal-entry and terrain aerial captures show a distinct inland body colour and coherent bank contact; the coast capture preserves the stronger open-sea mirror. The 22:00 capture remains readable and introduces no bright-water regression. All captures and the shader contract report zero errors.

This closes the reported sky-hole symptom locally. It does not claim physically simulated current direction, improved bank geometry, or a terrain critic score increase. Human retest remains required.
