# Cities: Skylines II — visual reference for critics

Reference screenshots (official Steam store images, used ONLY for comparison, never copied into the repo):
`/tmp/claude-0/-home-user-SimBuild/c06ed41b-9bdf-5ab7-ace6-40b62a5e4281/scratchpad/ref/cs2_1.jpg` … `cs2_8.jpg` (1920×1080). Read them with the image reader before scoring.

## What CS2 looks like (observed from the references)

**Light & atmosphere**
- Warm, slightly desaturated daylight; high dynamic range handled by filmic tone mapping — no blown highlights, no crushed blacks; shadows are cool-blue, deep but readable.
- Long soft shadows from trees and buildings; contact shadows / ambient occlusion under every object (cars, trees, kerbs).
- Aerial haze: distant terrain fades toward a pale warm-grey sky colour; far detail loses contrast, not just colour.
- Night: city glows warm sodium/LED; windows are individually lit with random on/off and warm/cool tints; road lamps make soft pools; bloom is subtle.

**Terrain**
- Fine grain: grass is not a flat green; there's colour variation at 1 m and 20 m scales, bare dirt patches, worn paths, rock outcrops on slopes, sand/shingle at water edges.
- Water is planar with reflections, slight shore transparency, gentle waves; rivers meander naturally.
- Forest coverage is dense, with trees of several species/heights and autumn colour variety (yellows, oranges, greens together).

**Roads**
- Asphalt is dark warm-grey with lane centre wear (lighter, smoother) and slight colour noise; edges have kerbs and paler concrete sidewalks; crosswalks are white bars; lane markings are crisp white/yellow with small gaps; intersections have proper corner radii and turning arrows.
- Roads sit ON terrain with cut/fill embankments and retaining walls, never floating or z-fighting.
- Highways: barriers, wider lanes, gentle curves; interchanges with sweeping ramps; bridges with piers.

**Buildings**
- Photoreal facades: distinct floor lines, window grids with depth (reveals), balconies, roof clutter (HVAC, vents, water tanks, parapets), ground floor shops with awnings and signage. Materials: glass with reflections, concrete, brick, plaster; nothing is a flat colour box.
- Lot fit: buildings align to road frontage, with driveways, parking, fences, gardens, small trees around them.
- Variety: dozens of styles per zone; height variation; high-density downtown clusters, mid-rise transitions, low-rise suburbs.

**Props & life**
- Street lamps at regular spacing, traffic lights at signalised intersections, signs, benches, bins, bus stops; parked cars; pedestrians.
- Traffic: varied cars/trucks/buses driving on the correct side, queuing at lights, headlights at night.

**UI**
- Dark translucent bottom bar with colourful flat icons, top-left info panels, blue accent, clean sans-serif, numbers right-aligned. Overlays (zone colours) are saturated but translucent with a grid pattern.

## Scoring scale (per module, per shot set)
- **10** indistinguishable from CS2 at that zoom/time
- **9** AAA; an expert finds only subtle differences
- **8.5** AAA with nits (PASS threshold)
- **8** AA: clearly high quality, one or two visible systemic weaknesses
- **7** good indie
- **6** competent but obviously synthetic (repetitive tiling, flat lighting, no AO, no variation)
- **5** programmer art (flat colours, boxes, no textures)
- **3** broken / mostly missing
- **0** nothing renders / errors

Hard fail regardless of look: any console error, module status != ready, draw calls over the module's declared budget, z-fighting/flicker, objects floating or sunk, black screen at any of the standard times.

## Standard matrix
Cameras: aerial, street, skyline, closeup (plus the module's own presets). Times: 06.5 (golden hour), 12 (noon), 17.5 (late afternoon), 22 (night).
