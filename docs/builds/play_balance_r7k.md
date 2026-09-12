# r7k ordinary-play economy balance

The recorded earned city is a native 404-resident save with 552 zoned buildings after growth, seven paid facilities, 27,384 treasury and no synthetic demo population or money. On accepted pre-r7k tuning, a 30-day public simulation run becomes insolvent at every tested tax rate: day 8 at 10%, day 10 at 15%, and day 12 at 20%. Final balances are -82,406, -61,772 and -41,139. The city pays 1,548/day in municipal upkeep for private zoned buildings plus a flat 1,500/day administration charge, before 1,640 services and 402 roads.

r7k removes the duplicate municipal upkeep charge from private zoned buildings. Their infrastructure burden remains in real road and service upkeep, and they continue to produce tax income. Administration becomes 100/day plus 0.3 per resident/day, so the cost grows with the city instead of imposing the same 1,500 on a hamlet and metropolis.

On the same earned save, all three 30-day scenarios remain solvent. At 10% tax the over-serviced city ends at 1,880 with 72.5% happiness. At 15% it ends at 22,513, only -147/day, with 59.5% happiness. At 20% it ends at 43,147 and +547/day, but happiness falls to 46.5%. This creates a real policy tradeoff instead of guaranteed insolvency.

The 90-day extension is deliberately stricter. With no player action and no free lots, 10% becomes negative on day 33. At 15% the city remains solvent at 13,714; at 20% it reaches 75,942. Population rises from 404 to 465 and then plateaus because all 552 lots are occupied, so continued growth correctly requires the player to zone more land. Two independent 30-day 15% runs are byte-identical.

Simulation selftest, production build (163 modules), Democity API/double-deserialize/tour, exact 1337→7→1337→7 restage and r7j save rollback all pass. The inspected Metal aerial has zero errors at 428 draws / 1,986,946 triangles / 47.7 fps. r7k is accepted as a balance correction, while sustainable default-tax play without intervention and interactive multi-hour human play remain open.

Evidence: `shots/integration/r7k-play-balance.json` (old tuning), `r7k-play-balance-candidate-scaled.json`, `r7k-play-balance-candidate-scaled-90d.json`, the two determinism files, and `shots/integration/r7k-balance-final/`.
