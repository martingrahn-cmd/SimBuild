# Democity r5z roads component reprofile

The accepted r5x source was profiled at aerial night with each roads material class masked independently. The zero-error baseline is 3,097,502 triangles. Gravel/embankment contributes 96,108 triangles, asphalt 48,738 and paint 35,788. The concrete mask did not isolate the active distant concrete LOD mesh, so its zero delta is invalid evidence and is not used.

The gravel geometry is already one real terrain-conforming verge quad per longitudinal segment. Removing it would expose floating road edges; reducing its sampling independently from the authoritative road rows would create seams. No roads source change is accepted from this profile. The next measured owner is services, whose accepted-source contribution remains 721,376 triangles.
