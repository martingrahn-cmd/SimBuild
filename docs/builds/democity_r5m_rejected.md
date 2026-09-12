# Democity r5m rejection record — 2026-09-08

r5l attributed 562,080 aerial-night triangles to buildings. r5m tested exposing the buildings owner's already-generated shadow-only LOD2 geometry as a distant colour mesh, while retaining deterministic plans, LOD0/LOD1, shadows and all simulation/restore data.

At the first useful 560 m threshold, aerial noon measured 2,819,576 triangles but the inspected image showed large grey, untextured building silhouettes. The 720 m threshold saved too little to matter, while 560 m visibly damaged city form. The complete LOD2 colour-pass candidate was reverted.

The raw failure capture remains at `shots/democity/r5m/aerial_12_d560.png`. No matrix, contract probe, score change or performance claim applies to this rejected source. r5j remains the verified production baseline.
