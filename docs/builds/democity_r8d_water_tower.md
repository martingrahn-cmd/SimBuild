# Democity r8d — Birch water-tower articulation

## Bounded change

After r8c repaired the blank hospital, the adjacent water tower remained the independent whole-game critic's most obvious suburban landmark primitive: a single cylinder and cone on four unbraced posts. r8d keeps the same real `Birch Water Tower` record, position, footprint and terrain seat. Its merged owner geometry now uses a flared bowl and banded tank, service catwalk and rail posts, central riser, maintenance landing and ladder, plus real cross-bracing between the original support legs.

No water coverage, service item, economy value or simulation record is created or changed. The landmark remains part of the normal Democity scene in every applicable camera.

## Verification

- Production build passes 163 modules.
- The full 16-frame 1920×1080 High/Metal matrix is 16/16 ready with zero errors: 473 maximum draws, 2,262,280 maximum triangles and 45.0 minimum sampled fps. The 50fps gate remains failed.
- All 16 frames plus the full-resolution noon/night suburb views and before/after crop were inspected. The new braced silhouette stays legible by day and night; no composition or occlusion regression was found.
- The 300×360 water-tower crop changes 2.86897% normalized MAE; the complete suburb frame changes 0.152241%.
- The exact 13-landmark authored plan and eight merged owner draws remain. Landmark geometry rises from 4,724 to 5,740 triangles (+1,016), still negligible within the composed gate.
- Public API, double deserialize, all eight tour stops and exact 1337→7→1337→7 restage pass with zero errors and unchanged world counts/coverage.

Evidence: `shots/democity/r8d-water-candidate` and `shots/democity/r8d-water`.

## Decision

Accept r8d. It replaces a measured blank primitive with recognizable real infrastructure within the existing owner contract. Democity and whole-game remain 6.0 FAIL because port cranes/silos and other assets remain procedural, broad frontage and scale still fail, and 50fps, foliage, grounding, night depth and subjective play remain open.
