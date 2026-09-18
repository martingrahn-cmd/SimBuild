# R21 exact Props texture-frontier startup optimization

## Scope

Profiling attributes nearly the complete normal-entry Props initialization cost to procedural texture generation. Three pre-change high-quality runs measured 356.8, 322.4 and 333.0ms; a later five-run interleaved baseline measured a 330.2ms median. The expensive alpha dilation rescanned every atlas pixel on each of 6–10 passes even though only the next one-pixel boundary can change.

R21 retains the same pass boundaries, eight-neighbour order, RGB averages and alpha bytes but tracks only that changing frontier. It does not change atlas dimensions, art inputs, textures, prop placement, IDs, geometry, density, rendering rules or serialization. The normal checkpoint probe also now handles a clean browser correctly by using the real New Game path when Continue is deliberately disabled.

## Verification

- `tools/props-texture-dilation-probe.mjs`: PASS. Five candidate runs measure 254.2, 218.7, 210.0, 212.1 and 230.9ms; median 218.7ms versus the 330.2ms five-run baseline, a 33.8% reduction.
- The combined browser pixel hash for leaf, impostor, bark, glow, signs, furniture albedo and detail normal remains exactly `387862b1a9de129bc79d79aab394e1b3dd54c58873258734fd88071b9718bba0`. Every individual texture hash also matches.
- Three production starts: menu ready 2.731–2.812s, Props 287–294ms, Audio 17–18ms, errors=0. Terrain remains 1.698–1.730s and dominates startup.
- `tools/playtest-checkpoint-probe.mjs`: PASS from a clean browser through the real New Game path. Save/load/delete, camera, time and all 14 serialized modules are exact; Props restores 2,500/2,500 items exactly.
- Matched buildings/aerial visual evidence: 60.1fps, 183 draws, 1,029,476 triangles, errors=0. Pixel MAE against the R19 exact reference is `6.93e-8`, visually indistinguishable; the captured frame was inspected.
- `vite build --emptyOutDir=false`: PASS, Vite 8.2.2, 164 modules.
- `node src/modules/simulation/selftest.mjs 90 1337`: deterministic repeat and exact save/load PASS.

## Decision

Accept the byte-exact frontier traversal and the clean-start checkpoint repair. Props startup improves without changing its image data, scene topology or save state. Keep the cold-start gate open because Terrain still dominates and the end-to-end sample remains a short three-run measurement.
