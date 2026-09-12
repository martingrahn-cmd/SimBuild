# Democity r6z/r7a shadow profile and rejected service shadow proxy

r6z separates the remaining building and service shadow cost on accepted r6y source with interleaved 180-frame street-night controls. Removing all building shadows saves 43 peak submissions and 39,764 peak triangles but does not produce a repeatable timing gain: the diagnostic reaches 48.42 fps inside the 47.53–48.42 fps baseline range. Building shadows therefore remain unchanged.

Removing all service shadows reaches 49.99 fps, about 1.6–2.5 fps above its adjacent controls, and removes 40 submissions / 294,474 peak triangles. That result is an upper bound rather than an acceptable production change because it includes nearby civic contact shadows. A 360 m horizontal mask affects only four meshes / 28,740 peak triangles and has no repeatable benefit. A 220 m mask affects seven meshes / 84,986 peak triangles and measures roughly 0.8 fps above adjacent controls, with substantial run variation.

r7a tested using the services owner's existing footprint-and-height proxy only for shadow submission from 220–420 m while retaining the real detailed colour geometry, facility IDs, coverage, utility behavior and near shadows. It reduces the street-night peak from 2,997,270 to 2,912,392 triangles, but the four 180-frame controls remain at 47.86–48.86 fps, within accepted baseline variation. Draw count remains 346 because shadow-only proxy meshes still produce zero-count main-pass calls, and the distant shadow silhouette becomes coarser.

The r7a candidate is rejected and fully reverted. Service rendering remains on the accepted r6y contract. No score changes: Democity remains **6.0 FAIL**. The next bounded diagnosis is building colour LOD timing; the existing traffic contract deliberately keeps agent motion independent of `?speed=` and must not be changed as a performance shortcut.

Evidence:

- `shots/democity/r6z-shadow-colour-profile/shadow-controls.json`
- `shots/democity/r6z-shadow-colour-profile/service-far360-controls.json`
- `shots/democity/r6z-shadow-colour-profile/service-far220-controls.json`
- `shots/democity/r7a-candidate-service-shadow-proxy/controls.json`
- `shots/democity/r7a-candidate-service-shadow-proxy/smoke_street_22.png`
