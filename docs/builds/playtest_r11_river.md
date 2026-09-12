# R11 PT-14 river rendering fix — 2026-09-12

## Result

Accepted locally with no critic score change. The water shader now uses the existing Terrain-owned sea mask to separate inland water from open sea. Rivers/lakes receive 52% less broad reflection strength and a lower minimum Fresnel mix, exposing the existing depth-tinted water body. A restrained east-west tonal ripple remains visible after fine normals disappear at aerial distance. The open sea retains the established reflection response.

## Evidence

- Human baseline: `shots/playtest-checkpoint-2026-09-11/human-river-sky-hole.png`.
- Matched terrain valley baseline: `shots/playtest-fixes-r11/river-baseline-valley.png`.
- Accepted valley: `shots/playtest-fixes-r11/river-candidate-valley.png`.
- Open-sea preservation: `shots/playtest-fixes-r11/river-candidate-coast.png`.
- Normal player entry, noon and 22:00: `river-candidate-player-12.png`, `river-candidate-player-22.png`.
- Contract: `river-contract-player-12.json`, `river-contract-player-22.json`; both PASS with errors=0.
- Production build: PASS, 163 modules.
- Simulation selftest: deterministic, different seed and exact simulation save/load PASS.
- Normal checkpoint probe and traffic causality probe: PASS. Existing Props semantic serialization limitation remains disclosed.

The accepted aerial captures show a continuous blue-green inland water body bounded by banks instead of the prior high-contrast cloud/sky cut-out. The sea remains reflective in the coast capture. No terrain heights, water collision, simulation state, ownership boundary, draw count or triangle count changed.
