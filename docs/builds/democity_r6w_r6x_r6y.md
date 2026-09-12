# Democity r6w/r6x/r6y owner profile, rejected ORM sample and accepted 16-bit building attributes

r6w completes the long non-reflection owner profile on accepted r6v. Interleaved 180-frame street-night controls run at 47.43–48.75 fps. Temporary owner masks reach 53.26 fps for buildings, 51.52 for services, 49.53 for traffic and 48.91 for transit. Buildings remove 99 peak draws but only 195,240 peak triangles, which points to draw/screen cost rather than a missing coarse geometry LOD. These masks are diagnostic only.

r6x tested reusing one ORM atlas sample for both building roughness and metalness. Four 180-frame controls stayed inside the original variation band at 47.46–48.65 fps. The change had no verified benefit and was rejected and reverted before further work.

r6y addresses the measured retained-memory owner without changing geometry. Static building normals and atlas UVs move from 32-bit floats to normalized signed/unsigned 16-bit attributes; the exact 0–511 building tint slot moves to an unsigned 16-bit integer. Position, vertex colour and baked window state remain 32-bit. Shader-visible values, material logic, raycasting, IDs and saved state are preserved.

Building CPU buffers fall from 176,668,412 to 145,175,588 bytes, exactly 31,492,824 bytes. Total forced-GC backing storage falls from 475.4 to 443.9 MB and clean reported heap from 508.8 to 480.0 MB. The post-restage forced-GC report falls from r6r's 541.7 to 509.9 MB, closing the 512 MB measured lifecycle gate. Raw uncollected restage readings remain variable and are not substituted for the forced-GC gate.

Forced LOD0/LOD1 totals remain exactly 977,816/200,332. An exact baseline/candidate closeup differs by 0.0216% whole-image MAE, and all 16 candidate images were inspected without UV, normal, tint or raycast corruption. The matrix is zero-error at 532 maximum draws and 2,997,270 maximum triangles; its 44.1 minimum single-capture fps remains failed and is not an improvement claim. Public API, double deserialization, all eight tour stops and exact 1337→7→1337→7 authored restage pass. Production build passes 163 modules.

r6y is accepted with Democity held at 6.0 FAIL. Both composed geometry and forced-GC memory gates now pass, but 50 fps and the broader city-scale, lighting, seating, grain, activity and lifecycle-quality gates remain.
