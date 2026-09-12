# Democity r6b/r6c props street-peak diagnosis and accepted furniture distance

The accepted r5x source was first profiled at the actual 16-frame matrix peak: the `street` camera at 22:00. The zero-error owner profile measured 3,827,780 total triangles, with props at 1,281,234, roads at 1,168,784, services at 469,168 and buildings at 285,990 triangles.

The first props subtype pass used the group labels `foliage` and `furniture`. That evidence is invalid because `props.debug.setKindVisible()` accepts real item kinds and maps unknown kinds to the hard-furniture group. The corrected zero-error profile uses `bush` for the foliage group and `bench` for hard furniture. It attributes 978 triangles to foliage, 590,668 to hard furniture, and 256,736 to the already rejected forced tree-impostor path.

The existing props owner stores real objects independently from rendering and merges hard furniture per 256 m chunk. Its former 620 m threshold only controlled the hard-furniture and shelter-glass meshes; it did not change items, lamps, stops, signals, placement, simulation, save data or tree/foliage LOD. A 520 m candidate moved no chunk tier and produced the exact 3,827,780-triangle baseline, so it was discarded. The accepted 420 m threshold moves five distant/subpixel draws out of the street-night main pass while retaining all near street furniture.

Visual evidence was inspected at street noon/night, closeup noon and aerial noon, followed by all 16 Metal matrix captures. The nearest bus shelter, benches, signs, lamps and traffic signals remain readable. The street-night 420 m image differs from the 620 m control in only 126 pixels. The full matrix is 16/16 ready with zero errors at 799 maximum draws, 3,735,080 maximum triangles and 30.9 minimum fps. This is 92,700 fewer triangles than r5x's 3,827,780 peak.

Public API, double deserialization, all eight tour stops, invalid-tour handling and exact 1337→7→1337→7 authored restage pass with no internal or browser errors. Production build passes 163 modules.

The change is accepted as an owner-safe render optimization. The 3M-triangle, 50fps and 512MB heap gates still fail, so no Democity score increase is claimed. Next profile the retained hard-furniture kits and distance bands before attempting any geometry LOD; do not reuse the rejected flat tree impostors or remove real objects.
