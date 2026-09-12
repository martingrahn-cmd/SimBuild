# Democity r5v — LOD1 roof-clutter correction

## Change

`src/modules/buildings/generate.js` now applies the existing LOD distinction in `roofClutter`: LOD0 retains planned HVAC, tanks, vents, bulkheads, solar and masts; LOD1 retains the atlas-backed facade, roof deck, parapet and crown silhouette but omits sub-metre equipment. The function already calculated `near = o.lod === 0` but did not use it. This is an owner-local geometry change; it does not alter building plans, IDs, lots, coverage, simulation, shadows, save data or the real city staging flow.

## Evidence

- `shots/democity/r5u/lod-probe.json` establishes the original aerial-night baseline: 977,816 LOD0 versus 227,290 LOD1 owner triangles, and forcing LOD1 gives 3,238,326 whole-scene triangles.
- `shots/democity/r5v-candidate/lod-probe.json` gives 200,332 LOD1 triangles, a 26,958-triangle (11.9%) owner reduction. Forced LOD1 reaches 3,127,278 whole-scene triangles, 111,048 below the original forced comparison. Both LOD rows are zero-error.
- Inspected captures `aerial_12.png`, `downtown_12.png`, and `aerial_22_lod1.png` preserve facades, roof slabs, parapets, crowns and the city silhouette. The removed equipment is not visible as a visual regression at the LOD1 camera distance.
- `shots/democity/r5v-candidate/apicheck.json` passes public API, double deserialization and all eight tour stops. `restage-cycle.json` passes exact 1337→7→1337→7 authored restage with no browser or internal errors.
- `shots/democity/rr5v-candidate/summary.json` is a clean 16/16 Metal matrix: 801 max draws, **3,840,308** max triangles, 44.3 minimum fps, zero errors. The prior verified r5p matrix peak was 3,909,080 triangles, so the accepted reduction is 68,772 triangles (1.76%) at the actual full-matrix peak.
- `npm run build` passes all 163 modules.

The 3M triangle and 50fps gates remain failed. Frame-rate results from separate runs are not treated as a score improvement. This change is accepted because it is deterministic, preserves inspected visual identity and makes a measured reduction without replacing real scene content.
