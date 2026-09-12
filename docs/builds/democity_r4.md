# Democity r4 builder record — 2026-09-08

## Scope

W3's health-and-education reach was 302/511 homes (59.10%), below the 60% clause. This r4 change adds one real, paid `school` reservation with a central target. It uses the existing road-frontage candidate search, normal service validation, normal spending, and the existing coverage graph. It does not change density, the road plan, owner boundaries, utility supply, or simulation economics.

## Verification

- `npm run build` passed: 163 modules transformed.
- The existing census was run unchanged against separate `shots/democity/rdev4/` output, including a fresh seed 7 page. Both have zero browser errors.
- Standard seed: 31 paid facilities, 612 buildings/lots, 306/507 homes with health and education (**60.36%**); power and water reach 503/507 (**99.21%**). The added school is the seventh school at `(154,160)`.
- Fresh seed 7: 31 paid facilities, 648 buildings/lots, 345/548 homes with health and education (**62.96%**); power and water reach 519/548 (**94.71%**). The added school is at `(238,160)`.
- The city still pre-rolls to 8,046 residents and remains solvent in the controlled fixture. The existing `No valid reserved university site` warning remains.
- Viewed `aerial_12.png` and `night_downtown_22.png`; both render normally with zero errors.
- Whole-game smoke after this change: `shots/smoke_w4.png`, 28.7 fps, 562 draws, 3,361,455 triangles, zero errors.

## Result and limits

The narrow shared-civic-coverage failure is repaired in this builder run. This is not an independent critic verdict and does not alter the frozen r3 score of 6.0/10. City scale, cross-seed restage, bridge seating, night lighting, repetition, and the composed 3M-triangle / 50-fps failures remain open.

Evidence: `shots/democity/rdev4/probe.json`, `shots/democity/rdev4/seed7-probe.json`, `shots/democity/rdev4/census-contracts.json`, and `shots/smoke_w4.png`.
