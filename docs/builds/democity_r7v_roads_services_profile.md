# Democity r7v roads/services profile and concrete LOD margin

r7v profiles the accepted r7u slow street view before changing production. The visible owner masks measure 49.144 fps at baseline, 52.104 fps with road concrete hidden and 53.097 fps with services hidden. Removing road shadows (49.010 fps) or service shadows (48.749 fps) does not improve timing, so neither accepted shadow contract is weakened.

Dedicated probes inventory the real LOD chunks. Services has 27 owner chunks in the street view. A 640 m detail threshold would exchange four distant chunks there and four in aerial noon, but the inspected aerial candidate turns paid facilities into large beige monoliths. Its two 240-frame street controls, 47.529 and 48.810 fps, also remain inside the accepted-source variation. The service candidate is rejected and the verified 800 m threshold is restored.

Road concrete consists of five 1024 m tiles. At the street camera, the existing full-detail tiles are centred 492, 671, 685 and 743 m away. r7v changes only the colour-pass detail threshold from 800 to 700 m, moving the 743 m tile from its existing 34,116-triangle full geometry to its 16,876-triangle top-face LOD. The full accumulator and `PavementSurface`, road topology, bridge heights, collision, terrain conformance and save state are unchanged. Aerial noon keeps its three existing full-detail tiles.

Build, public API, double deserialize, all eight tour stops and exact 1337→7→1337→7 restage pass. All 16 standard images and seven directed street/aerial/skyline/interchange comparisons were inspected with zero errors. Street A/B mean absolute difference is 0.000170/255 with p99 zero; interchange noon/golden/night show no visible curb, bridge or deck-side failure. The standard matrix peaks at **530 draws / 2,884,298 triangles / 39.6 minimum fps**, reducing r7u's peak by 34,480 triangles while still failing 50 fps.

Accept the bounded road geometry margin and retain Democity at **6.0 FAIL**. Do not lower service detail below 800 m under the current box-proxy contract. A larger concrete reduction would require finer road chunks or a distinct geometry representation because the remaining tiles cover broad, visually important regions.

Evidence: `shots/democity/r7v-roads-services-profile/`, `shots/democity/r7v-services-visible/`, `shots/democity/r7v-services-640/`, `shots/democity/r7v-roads-visible/`, `shots/democity/r7v-roads-700/`, `shots/democity/r7v/`.
