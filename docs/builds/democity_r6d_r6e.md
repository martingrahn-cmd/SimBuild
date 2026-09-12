# Democity r6d/r6e concrete profile repair and accepted shadow distance

r6d repairs `tools/mainpass-profile.mjs`. The previous concrete subtype mask hid `roads/concrete/*` meshes, but missed active `roads/concrete-lod/*` meshes and the roads owner restored mesh visibility every frame. The corrected tool includes both names and masks their shared material, which remains disabled through all 40 sampled frames. Its default props subtype names also use real public kinds (`bush`, `bench`) instead of invalid group labels.

The repaired street-22 profile measures 988,150 concrete triangles over 20 draws out of roads' 1,168,784-triangle contribution. Four large detail tiles are centred 492, 671, 685 and 743 m from the street camera. All four previously cast curb, sidewalk, parapet and deck-side shadows through the CSM passes even though only the closest tile has readable contact detail.

r6e retains the visible concrete mesh, the existing 800 m colour LOD, full authoritative road accumulator and PavementSurface. It only stops a detail tile from casting shadows when its centre is beyond 600 m. The nearest street tile retains full contact shadows; distant road colour, bridges, collision/height queries, network and save state are unchanged.

Directed street noon/night, closeup, aerial and bridge noon/golden-hour images were inspected. Differences from r6c are limited to distant/subpixel curb shadows. Both river bridges remain visually intact, and the physical probe still measures minimum clearances of 4.280000 m and 4.144197 m. The complete Metal matrix is 16/16 ready with zero errors at 799 maximum draws, 3,312,992 maximum triangles and 35.4 minimum fps. The r6c peak was 3,735,080, so the verified reduction is 422,088 triangles.

Public API, double deserialization, all eight tour stops and exact 1337→7→1337→7 authored restage pass without internal or browser errors. Heap remains volatile and failed at 719.2–1,125.7 MB. Production build passes 163 modules.

The change is accepted with Democity held at 6.0 FAIL. Re-profile owners on the accepted r6e source; do not infer that the 3M, 50fps or heap gates now pass.
