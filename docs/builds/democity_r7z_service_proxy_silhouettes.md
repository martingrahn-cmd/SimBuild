# Democity r7z — service proxy silhouettes

## Bounded change

The independent whole-game review ranked primitive service-distance geometry among the most visible current defects. Fresh inventory from every declared Democity camera confirmed the cause: beyond the existing 800 m owner boundary each paid facility was represented by one box. Downtown noon contained seven such facilities (three coal plants, two incinerators, one pump and one sewage outlet) in only 84 triangles. Interchange contained 21 proxy chunks in 312 triangles.

`services/render.js` retains the 800 m distance and the existing real item/chunk ownership. Its far mesh now composes deterministic kind-specific silhouettes from shared low-poly primitives: cooling-tower pairs and a stack for coal, a hall and stack for incineration, legs/tank for pumps, settling tanks for sewage, and two-volume outlines for civic buildings. The same real IDs, catalogue footprints, positions, headings, terrain seats, coverage, costs, loads and serialized data remain authoritative. No facility was removed or added.

The diagnostic `tools/services-visible-profile.mjs` now records the real IDs and kinds represented by each chunk. This changes evidence only.

## Verification

- `npm run build`: 163 modules, pass.
- Four 1920x1080 Metal captures were inspected: downtown noon, park noon, interchange noon and night-downtown 22:00; all have zero errors.
- Exact crops show the two blank downtown plant blocks replaced by recognizable plant silhouettes. The interchange's broad blank halls become separated civic/service volumes. Full-frame RGB MAE is 0.2031% downtown and 0.2226% interchange; directed crop MAE is 3.0144% and 2.5401%.
- Downtown proxy geometry rises from 84 to 900 triangles; the final composed frame rises only 816 triangles, 1,400,447 to 1,401,463. Draw calls remain 430 peak / 324 final. A serial capture is 51.3 fps versus the prior 52.0 fps control; this does not establish a gain or regression.
- Interchange proxy geometry rises from 312 to 1,780 triangles and remains one merged draw per far chunk.
- Public Democity API, double deserialize and all eight tour stops pass with zero errors. Counts remain 468 road nodes, 604 edges, 9,964 zone cells, 612 lots/buildings, 31 services and one eight-stop line.
- Exact 1337→7→1337→7 restage passes. Deliberate late-owner save rejection still restores all 14 owners, terrain, time and camera exactly; the expected rejection error is evidence of the exercised path.

Evidence: `shots/democity/r7z-services-inventory`, `shots/democity/r7z-services-profile`, `shots/democity/r7z-proxy`, and `shots/integration/r7z-save-atomicity-regression.json`.

## Decision

Accept the render-only silhouette replacement. It fixes the measured monolithic-proxy defect at negligible composed cost without weakening state or architecture gates. Democity and whole-game remain 6.0 FAIL: the facilities are still procedural and low-detail, primitive landmarks, sparse frontage, foliage, night depth, grading and the 50 fps matrix gate remain open.
