# Democity r5g build record — 2026-09-08

The r5f heap allocation profile identified the roads pavement lookup as a retained-allocation candidate: its object/array-per-triangle construction sampled 20.25 MB in `surface.add` during seed-7 restage. r5g preserves the exact public `surfaceHeightAt(x,z)` contract but stores triangle data in one packed Float32Array and keeps only integer triangle references in spatial cells.

## Verification

- `shots/democity/r5g/heap-profile.json` records 1,095/1,095 finite real-road surface queries after restage, with 216,615 indexed triangles in 12,130,440 packed bytes and zero browser/runtime errors.
- The sampled allocation attributed to `surface.add` falls from 20.25 MB to 1.08 MB. This is local attribution, not a claim that total game heap fell by the same amount.
- Public contract probe: `shots/democity/r5g/apicheck.json`. All 13 methods exist, two deserialize calls pass, all eight tour stops pass, invalid tour returns false, and both error lists are empty.
- Standard Metal matrix: `shots/democity/r5g/summary.json`, **16/16 ready, 0 errors**, peak **915 draws / 3,943,946 triangles / 31.7 fps**. Aerial noon was inspected; rendering and city composition are unchanged.

## Retained limits

The normal app-reported heap is volatile across independent Chromium sessions: the r5g public probe records 600.6 MB primary and 1,105.7 MB after seed-7 restage. The result remains well above the 512 MB gate. r5g therefore verifies a bounded local allocation improvement only; it does not claim an overall heap improvement, performance-gate pass, or score rise.
