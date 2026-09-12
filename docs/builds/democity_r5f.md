# Democity r5f build record — 2026-09-08

The valid r5e peak accounting showed that the periodic planar-water reflection, not an unstable LOD result, added a fixed 148 draws and 1,465,999 triangles to the aerial-night frame. A diagnostic pass at `shots/democity/r5e/reflection-profile.json` attributed 40 draws / 853,376 triangles of that reflection to props. Buildings, roads, terrain proxies and services remain in the reflection.

The terrain water callback now publishes `water:reflection`; props owns the response and hides only its own group during the low-resolution reflection render. The main scene never hides props. This keeps module ownership intact and avoids a terrain-to-props scene-graph mutation.

## Verification

- Production build: `npm run build` passes, 163 modules transformed.
- Standard Metal matrix: `shots/democity/r5f/summary.json`, **16/16 ready, 0 errors**, peak **915 draws / 3,943,946 triangles / 31.3 fps**.
- The comparable r5e peak was 960 draws / 4,627,862 triangles / 32.0 fps. The new peak reduces the measured recurring-reflection cost by 683,916 triangles at the matrix peak; direct aerial-night captures reduce from 4,593,198 to 3,739,822 triangles.
- Targeted aerial-night and skyline-night screenshots were viewed side by side with r5e. Water retains reflected buildings, bridges, roads and shoreline form; the removed fine props are not a visible loss at the reflection resolution.
- Public Democity probe: `shots/democity/r5f/apicheck.json`. All 13 API methods are functions; two deserialize calls succeed; all eight tour stops succeed; invalid tour index returns false; internal and browser errors are empty.

## Retained limits

This is a real geometry reduction, but not a gate pass. The standard peak still exceeds the 3M triangle limit, minimum rate remains below 50 fps, and the API probe records 852 MB primary heap and 1,064.6 MB after seed-7 restage. Golden-hour skyline wash, repeated asset language, city scale, seating/clearance and cross-seed lifecycle remain open.
