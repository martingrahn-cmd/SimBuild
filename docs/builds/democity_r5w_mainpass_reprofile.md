# Democity r5w accepted-source main-pass reprofile

`tools/mainpass-profile.mjs` was rerun on the accepted r5v source at aerial
night. `shots/democity/r5w/mainpass-profile.json` is zero-error throughout.
The 3,127,278-triangle baseline attributes 894,676 triangles to props, 807,272
to roads, 721,376 to services and 451,032 to buildings. Props remains the
highest measured owner cost.

The props subtype rerun records foliage/furniture at 243,460 triangles and the
existing LOD2 debug path at 215,876 triangles. The latter is the r5k top-down
tree impostor already rejected for visibly flat circular sprites, so it is not
reintroduced. Tree kind masking did not isolate a separate cost in this tool;
the next step is a props-owner geometry/profile inspection before any source
change. No score changes apply.
