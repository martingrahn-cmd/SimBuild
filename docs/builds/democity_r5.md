# Democity r5 builder record — 2026-09-08

## Scope

W5 addresses the first two ranked findings from the W4 independent review: oversized night-light pools and their composed geometry cost, followed by the golden-hour exposure curve. It deliberately leaves city density, ownership contracts, services, roads and simulation data unchanged.

- The existing lamp-pool height field is reduced from 24×24 to 12×12 segments. It still conforms to terrain, while reducing the transparent pool mesh from 1,152 to 288 triangles per lamp.
- The pool shader uses a tighter radial falloff. Its maximum additive intensity falls from 0.95 to 0.28 and the companion halo from 0.28 to 0.12.
- The existing environment ownership path now limits the day/golden-hour exposure curve to `lerp(1.45, 1.15, highSun) + lowSun * 0.25`.

## Verification

- `npm run build` passes with 163 transformed modules.
- The standard 16-frame Metal matrix is ready with **zero errors** (`shots/democity/r5/summary.json`). Its peak is **751 draws / 4,473,160 triangles / 35.6 fps**, down from W4’s 5,075,465 triangles / 27 fps. That is an **11.87%** peak triangle reduction and a **31.85%** minimum-fps increase, but it still fails the 3M / 50 fps composed targets.
- The standard night aerial falls from W4’s 4,887,017 to **3,742,217** triangles (23.42% lower). Viewed aerial, street, skyline and close-up frames show materially smaller, localized pools instead of the former repeated white discs.
- Directed district, whole-game, repeat/crop, 1280×720 and seed-7 captures were taken and inspected. The fresh API probe confirms all 13 Democity methods, two successful deserialize calls, valid eight-stop navigation, an invalid tour rejection, restage, and zero browser/runtime errors (`shots/democity/r5/apicheck.json`).
- The probe retains the W4 functional baseline: 612 buildings, 31 services, one transit line/8 stops, 503/507 utility coverage and 306/507 health-and-education coverage. Seed 7 remains 616 buildings and 508/517 utilities, 317/517 health-and-education.

## Result and limits

Night lamps now read as restrained pools in the standard night views, and the measured composed night cost is lower. This is a verified local improvement, not a passing critic verdict. The matrix remains over the triangle ceiling, the fresh probe heap is 934.8 MB (1,108.3 MB after the seed-7 restage), and the 17:30 skyline still loses substantial city and water detail to the sun-facing exposure. The city also remains visibly sparse and repetitive, with schematic district edges. Those limits remain open for the r5 critic.
