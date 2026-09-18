# R30 local critical review

**Decision: accept the normalized 16-bit Buildings window buffer at unchanged scores.**

The candidate has a precise owner-local result: the same 2,643,278 building vertices retain 21,146,224 fewer bytes. The shader reconstruction is tied to audited authored maxima rather than an inferred visual scalar. The dedicated probe verifies every geometry's array type and normalization, exact byte counts, and the unchanged serialized Buildings hash after restore.

The night comparison is the relevant visual gate because `win` drives lit-window presentation. It retains exact draw and triangle counts, differs by only 2.12444e-07 normalized MAE, and inspection finds the same lit-window pattern, brightness and facade treatment. The R29 Float16 failure remains rejected; R30 does not reuse that unsafe representation.

No score rises. The improvement increases memory margin but does not certify the sustained 512 MB whole-game gate or improve the visible defects that determine the current review. Buildings stays **7.4 FAIL** and whole-game stays **6.0 FAIL**.
