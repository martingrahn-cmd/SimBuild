# Democity r7b–r7e building colour/LOD diagnosis and rejected thresholds

r7b uses the buildings owner's existing public `forceLod(1)` contract as a diagnostic upper bound at the accepted r6y street-night peak. Two 180-frame LOD1 controls run at 49.67–49.74 fps between baselines at 46.99–48.82 fps. Draw count remains 346 and the sampled peak falls only 17,888 triangles. The result shows some potential in the near building colour pass, but does not justify removing LOD0 from every chunk.

The chunk map finds five LOD0 chunks at box distances 0, 41.76, 51.31, 66.15 and 76.69 m. r7c tests the next actual transition by reducing `LOD_SWITCH` from 84 to 72 m, moving only the 76.69 m chunk to the already accepted LOD1 geometry. The peak falls 10,800 triangles, but four controls remain at 47.86–49.15 fps, inside the accepted baseline range. r7d tests 60 m, retaining the three chunks inside 51.31 m; it produces the same critical peak because the additional changed chunk is outside that peak frustum, and repeats the same timing range. Both candidates are rejected and `LOD_SWITCH` is restored to 84 m.

r7e isolates building normal, ORM and emissive atlas costs with seven 120-frame controls. The diagnostic variants measure 48.98, 49.25 and 48.97 fps against interleaved baselines at 47.10–48.94 fps. The spread is not stable evidence of a material-specific bottleneck, and each map is required for the established building appearance. No material is changed.

All profile runs report zero browser and simulation errors. No candidate is integrated and Democity remains **6.0 FAIL**. These results close small building LOD/material tweaks as an evidence-based path to the 50 fps gate; any later building draw-call redesign must account for dynamic chunk rebuilding, exact restage, raycasting and the 512 MB lifecycle gate before production work.

Evidence:

- `shots/democity/r7b-building-colour-lod-profile/lod1-controls.json`
- `shots/democity/r7b-building-colour-lod-profile/chunk-map.json`
- `shots/democity/r7c-candidate-building-lod72/controls.json`
- `shots/democity/r7d-candidate-building-lod60/controls.json`
- `shots/democity/r7d-candidate-building-lod60/chunk-map.json`
- `shots/democity/r7e-building-material-profile/controls.json`
