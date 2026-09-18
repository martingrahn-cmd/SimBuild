# R27 local critical review

## Verdict

**ACCEPT, no score change.** The retained candidate directly repairs the oversized pale service-light discs visible in R26. The new pools read as warm illumination around the real park lamps, and the softer falloff no longer competes with the paths, fountain and surrounding road network.

This is a bounded material repair. It does not turn the pools into physically based lighting, add surface-aware occlusion, or solve the wider night composition. Tree and shrub silhouettes remain stylized, the arena and park still form separate sites across the road, and large parts of the city retain sparse or repetitive fabric. Raising either Services or whole-game would overstate this local gain.

Contract evidence is strong for the changed surface. Pool count, contact count, plane geometry and serialized Services state remain exact. Contact-shadow alpha is byte-stable while the pool texture is independently measured; pools are visible only at night. The broader two-seed Democity contract, Services restore and Simulation deterministic save/load also pass. Daytime render counts are exact and its matched image differs only by normalized MAE `1.37615e-06`.

The night render has exactly the same 453 draws and 2,258,608 triangles as R26 and zero errors. The observed 60.0 versus 58.3 fps is ordinary variation, so no performance improvement is claimed. No full sustained matrix or formal blind comparison was rerun for this bounded change.

Hold **Services 7.0** and **whole-game 6.0**, both FAIL. Continue with fresh current-source diagnosis of the highest visible whole-frame weakness. Favor a measurable owner-safe foliage-structure or occupied-block-fabric improvement, and do not repeat the exhausted global road-order, emissive-scalar or LOD-material trials.
