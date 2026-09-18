# R33 night-window highlight rolloff

## Scope

Fresh current-source downtown, street, night and overview captures showed that the rare brightest baked window tier clipped into large cool-white panels under the established night exposure. R33 changes only its display response in the Buildings fragment shader: values through 0.86 remain exact, while the portion above 0.86 uses a 0.35 slope. Window selection, warm/cool assignment, authored tier data, packed attributes, geometry, daytime material, simulation and saves are unchanged.

## Evidence

Evidence directory: `/Volumes/ExtDrive/SimBuild-verification-2026-09-06/evidence/playtest-fixes-r33/`.

- The locked `night_downtown` pair retains exactly 395 draws / 2,827,820 triangles, errors 0. Pixels above 85% luminance fall 0.622637%→0.462095%, and above 90% fall 0.287375%→0.209057%. The street pair retains 392 / 3,005,400 and changes 0.451341%→0.349682% above 85%, 0.213301%→0.186777% above 90%.
- All five accepted candidate/baseline originals were inspected. The largest white panels recover visible warm/cool tone and less glare while dim/mid windows, occupied pattern, facade mass and street readability remain. The 17:30 frame remains readable and zero-error.
- `building-contract.json`: all 111 geometries preserve the R29/R30 normalized Uint16 colour/window representation and exact Buildings SHA-256 `972e8066…2289c` after deserialize/flush.
- Canonical Vite build: PASS, 164 modules.
- `node src/modules/simulation/selftest.mjs 90 1337`: PASS; deterministic repeat and exact mid-run save/load.

An initial shell loop accidentally passed camera/time as one invalid camera string and produced four default-camera frames with filenames containing spaces. They are excluded from accepted evidence; the explicit rerun in `current/` is the valid R33 baseline.

The directed street night frame reaches 3,005,400 triangles, so the 3M whole-scene gate remains failed even though the overview is below it. Single-run fps variation is not used as evidence.

## Decision

Accept R33 as a bounded highlight/readability improvement. Buildings remains **7.4/10 FAIL**, Democity remains **6.0/10 FAIL**, and whole-game remains **6.0/10 FAIL**. Repetitive facade families, weak ground contact, foliage quality and broader night source/fixture cohesion remain open.
