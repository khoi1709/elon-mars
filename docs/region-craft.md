# Outer region craft provenance

This pass authors five in-scene procedural landmarks in `src/modules/outpost-3d/RegionLandmarks.tsx`, with terrain shapes and footprints in `src/modules/outpost-3d/worldRegions.ts`. No external model, texture, NASA GLB, Kenney pack, or downloaded asset was used or copied.

The authored equipment borrows the existing local `RealHabitatCraft` / `RealRoverCraft` visual language and reuses `realMaterials` from `src/game/art/realism/materials.ts` (pale shell, graphite mechanism, satin structure, muted foil, glass, and small amber practical). New landmark geometry is procedural Three.js assembly code; it is not a claim that those sources supply these models or grant redistribution rights. The existing habitat/rover source review records rights for those exact procedural source files as unverified; preserve that status. NASA rover content remains reference-only and was not used as production geometry.

The old home Mars terrain and its first 29 colliders were not changed. New hero collision footprints and top extents are declared alongside the outer map data and consumed by rendering/physics tests.
