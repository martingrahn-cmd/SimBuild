# Module spec: `props`

## Purpose
The props module adds street furniture and vegetation so the city feels alive and detailed.

## World data owned
`world.props` — the items map, the kinds list, and a version counter. Emit an event when things change.

## Visual target
Props should look really good and match the quality of Cities: Skylines II. Trees should look natural and varied,
with nice foliage. Street lamps should look realistic and give off a pleasant glow at night. Benches, bins, signs
and other furniture should be well modelled and placed sensibly along the streets. The overall impression should be
lush and believable, never programmer art. Pay attention to the lighting and make sure everything fits the scene.

## Acceptance criteria
1. Trees look good and varied.
2. There are several species of tree.
3. Street lamps glow at night and look attractive.
4. Traffic lights are placed at intersections.
5. Benches, bins, hydrants, signs and bus stops are present along streets.
6. Forests are placed on the terrain in sensible places.
7. Performance is good.
8. There are no errors.
9. The showcase looks impressive at all times of day.
10. Everything is instanced properly for efficiency.

## Budget
Keep the draw calls reasonable and the triangle count sensible. Do not use too much texture memory.

## Known failure modes
Avoid things looking flat or repetitive. Avoid bad performance. Avoid errors in the console.

## Dependencies
Uses roads and terrain. Should handle it gracefully if they are missing.

## Showcase
Stage a nice scene with a forest and a street with lamps and furniture, and declare some camera presets so the
critic can take good screenshots of it.
