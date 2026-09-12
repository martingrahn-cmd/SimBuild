# Democity r8e — Northbank port-crane articulation

## Bounded change

The independent whole-game review identifies the port cranes as thin bars on isolated pads. r8e changes only the existing `crane` landmark kind, affecting the same two real Northbank crane records. Each now has a four-legged portal frame, side cross-bracing, paired top rails, boom, kingpost and stays, counterweight, operator cab, trolley, twin hoist lines and spreader. Positions, footprints, terrain seats, serialized landmark records and the surrounding road/apron state are unchanged.

## Verification

- Production build passes 163 modules.
- The full 16-frame 1920×1080 High/Metal matrix is 16/16 ready with zero errors: 473 maximum draws, 2,264,008 maximum triangles and 48.4 minimum sampled fps. The 50fps gate remains failed.
- All 16 frames, both current bridge captures and the directed before/after crop were inspected. The pair reads as working gantry cranes by day and retains a coherent silhouette at night; no new occlusion or composition defect was found.
- The 380×300 crane crop changes 2.50345% normalized MAE and the full bridge frame changes 0.144189%.
- The exact 13-landmark plan and eight merged owner draws remain. Landmark geometry rises from 5,740 to 6,172 triangles (+432).
- Public API, double deserialize, eight tour stops and exact 1337→7→1337→7 restage pass with zero errors and unchanged city counts/coverage.

Evidence: `shots/democity/r8e-port-baseline`, `shots/democity/r8e-port-candidate`, and `shots/democity/r8e-port`.

## Decision

Accept r8e. It repairs the measured crane silhouette within the existing real landmark owner at negligible composed cost. Democity and whole-game remain 6.0 FAIL because port silos/apron and the broader industrial yard remain sparse, city scale and 50fps still fail, and foliage, grounding, broad frontage, night depth and subjective play remain open.
