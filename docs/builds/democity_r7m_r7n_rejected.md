# Democity r7m/r7n rejected diagnostics — 2026-09-09

## r7m street activity

The current owner probe finds 6/9/3 real traffic vehicles and 8/7/0 pedestrians within 150 m of the street target at 12:00/17:30/22:00. Total owner fleets are 157/240/39. Calling the existing public `traffic.setDensity(1)` followed by 120 real owner steps does not override the time profile and yields 8/10/2 nearby vehicles. A showcase density call therefore does not close the real distribution problem and was not added to production.

Evidence: `shots/democity/activity-probe/activity.json` and `shots/democity/r7m-activity-diagnosis/density1.json`. A safe repair needs traffic-owned trip origins/destinations weighted by actual occupied land use while preserving route, collision, budget and deterministic restore contracts. No explicit showcase fleet was inserted.

## r7n golden aureole

The 17:30 skyline baseline has 12.1289% of 480 px pixels above luma 235. A bounded candidate reduced only the broadest visible-sky aureole term from 0.035 to 0.012. The new frame remained visually washed out and measured 12.2261%, within capture/cloud variation and slightly worse. This proves the broad dome aureole is not the dominant source of the sun/water wash. The candidate is rejected and the 0.035 source value restored.

Evidence: `shots/democity/r7n-golden-aureole/baseline-stats.json`, `candidate_skyline_17p5.png`, and its adjacent JSON. Do not repeat a broad exposure or aureole scalar. The next useful diagnosis must isolate direct sun-lit surfaces, water reflection and sky/horizon contributions in one page session.
