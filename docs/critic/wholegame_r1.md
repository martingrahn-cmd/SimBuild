# Whole-game critic — round 1

**Score: 6.1/10 — FAIL.** The current build is recognisably a playable city builder and its authored districts form one coherent map, but the whole frame remains well below the 8.5 CS2 bar. It misses the 50fps budget and still reads as a compact prototype with repeated, coarse art.

## Evidence reviewed

All eight CS2 references were reviewed before scoring. Fresh current-source evidence contains 32 required 1920×1080 combinations across every declared camera: downtown, suburb, industry, riverfront, interchange, park, night-downtown and bridge at 06:30, 12:00, 17:30 and 22:00, plus downtown at 1280×720 and aerial rain/cloudy noon. Every image was inspected, including full-resolution checks of the main day/night district views.

All 35 captures are ready with zero console errors. The 32-frame matrix peaks at **469 draw calls** (`park_17p5`) and **2,788,342 triangles** (`night_downtown_22`), both inside budget. Minimum performance is **43.7fps** (`downtown_17p5`), so the 50fps gate fails. The original rain/cloudy evidence is later proven invalid by r7y's explicit-weather diagnosis; the 720p downtown view reaches59.9fps.

## Ranked whole-game issues

1. **blocker — the city is too small and sparse for its camera height** — owners: `democity`, `zoning`, `buildings`, `roads`. Downtown has a legible core, but broad lawns and one-building frontages separate repeated towers. Suburb and interchange expose empty parcels and weak block enclosure. This matches the measured 611 buildings against the 1,200 requirement. Evidence: `shots/democity/rwholegame1/downtown_12.png`, `suburb_12.png`, `interchange_12.png`.
2. **blocker — 50fps whole-frame budget still fails** — owners: `environment`, `effects`, `terrain`, `buildings`, `props`, `roads`. Nine matrix views are below 50fps; the minimum is 43.7 despite every frame remaining under 3M triangles and 469 draws. Interchange also falls to 46.4fps with only 1.64M triangles, so further work must profile pass cost and overdraw rather than chase triangle totals alone. Evidence: `shots/democity/rwholegame1/summary.json`.
3. **major — repeated coarse assets dominate the art direction** — owners: `buildings`, `props`, `services`, `democity`. Towers repeat a small set of rectangular curtain-wall shells and window grids; houses reuse similar roofs and footprints; foliage alternates between flat bright cards and simple dark cones; civic objects include large unarticulated white volumes. Evidence: `downtown_12.png`, `suburb_12.png`, `park_12.png`.
4. **major — night has lit windows but lacks convincing local illumination and street life** — owners: `environment`, `effects`, `buildings`, `props`, `traffic`, `transit`. The skyline is now dark and readable, but windows often become white panels, streets remain largely empty, and lamp pools do not build the layered warm city depth visible in CS2. Evidence: `downtown_22.png`, `night_downtown_22.png`, `riverfront_22.png`.
5. **major — terrain, roads and objects do not consistently sit in the same physical world** — owners: `terrain`, `roads`, `buildings`, `services`, `props`. Large clean grass gaps, thin trunks, hard slab edges, simple terrain skirts and several monolithic facilities weaken contact and scale. The known measured building seating failures remain unresolved. Evidence: `park_12.png`, `industry_12.png`, `suburb_12.png`.
6. **major — weather does not materially transform the frame** — owners: `environment`, `effects`, `terrain`, `roads`. The fresh aerial rain and cloudy captures are nearly the same clear, bright city view at review scale; wet response, rain readability and cloud mood do not carry across the whole scene. Evidence: `aerial_rain_12.png`, `aerial_cloudy_12.png`.
7. **major — life is numerically present but visually thin** — owners: `traffic`, `transit`, `props`, `democity`. Cars, pedestrians, buses, smoke and lit windows exist, yet standard frames still read like a staged diorama because motion sources are small and unevenly distributed across large open blocks. Evidence: `downtown_12.png`, `suburb_12.png`, `night_downtown_22.png`.

## Strengths to preserve

- The map reads immediately as one city with a downtown core, suburbs, industrial edge, river, bridges, highway and park.
- Road hierarchy and land-use grouping are legible from the supplied cameras.
- Noon, golden hour and night are clearly distinct, and the r7l/r7p lighting fixes remain visible.
- The HUD is coherent and fits at 1280×720.
- All owners are ready, all captures are error-free, draw calls and triangle totals pass, and save/simulation correctness has separate exact evidence.

## Decision

No score is inferred from module averages. **6.1** reflects a functioning, coherent prototype above the programmer-art anchor but below the “clearly a good indie city builder” 7 anchor because scale, asset finish, grounding, weather, life and performance all remain conspicuous in the whole frame.
