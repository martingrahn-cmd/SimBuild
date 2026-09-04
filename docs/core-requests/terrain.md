# terrain → core / other-module requests

## 1. environment: sky dome must follow the *rendering* camera (planar reflections, cube cameras)
`src/modules/environment/sky.js` places a 10 m BackSide dome at the main camera each frame
(`S.sky.update(cam.position)`). When any other camera renders the scene (terrain's planar water reflection
camera, future PMREM/cube cameras, effects passes) the dome is off-centre and the sky is missing (black).
Suggested fix (environment-owned, tiny): position the dome in `mesh.onBeforeRender(renderer, scene, camera)`
from `camera.matrixWorld` instead of the main camera, or make the dome vertex shader ignore translation
(`gl_Position = projectionMatrix * mat4(mat3(modelViewMatrix)) * vec4(position, 1.0)` with `.xyww`).
Until then, the water composites the reflection RT over the equirect sky LUT (`uEnvSky`) using the RT alpha,
so reflections stay correct but lose the dome's clouds and sun disc.

## 2. camera: `screenToGround` allocates a Raycaster per call
Cosmetic. `world.terrain.raycast` is allocation-free apart from the result; a cached Raycaster in
`CityCamera.screenToGround` would remove the per-call garbage when tools drag brushes.

## 3. main.js init order for the full game
`registry.initAll(MODULE_NAMES)` initialises `terrain` before `environment` unless the module declares
`dependencies: ['environment']` (terrain now does). Consider initialising by `WAVES` order so
`environment` is always first.
