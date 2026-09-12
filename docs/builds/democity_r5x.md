# Democity r5x — volumetric props LOD1 reduction

Props LOD1 now emits 40 rather than 48 leaf cards per canonical tree. LOD1 remains a real, instanced, shadow-casting volumetric crown with the same trunk geometry, species morph, atlas, material, deterministic RNG and transition rules. It does not use the rejected LOD2 top-down impostor.

Inspected aerial noon/night captures retain tree volume and city silhouette. The clean profile reduces aerial-night props from 894,676 to 864,900 triangles and the whole scene from 3,127,278 to 3,097,502. Public API/double deserialize/tour and exact 1337→7→1337→7 restage pass. The complete 16-image Metal matrix is zero-error at 801 max draws, 3,827,780 max triangles and 41.3 min fps. Build passes 163 modules.

The candidate is accepted for its measured, visually inspected reduction; Democity remains 6.0 FAIL because the 3M/50fps and broader quality gates remain unmet.
