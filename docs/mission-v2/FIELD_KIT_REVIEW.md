# Field kit modules — focused review

**Scope:** independent source/strict-type review of frozen `FieldCamp.tsx` and `SolCompanion.tsx`; no source repairs. No app/runtime, aesthetics, or FPS acceptance is implied.

## Checks and evidence

- **PASS — scoped strict TypeScript:**
  ```powershell
  & 'C:\Hackathon\node_modules\typescript\bin\tsc' --noEmit --pretty false --incremental false --target ES2020 --module ESNext --moduleResolution bundler --jsx react-jsx --strict --noUnusedLocals --noUnusedParameters --skipLibCheck --lib ES2020,DOM,DOM.Iterable src/game/mission/world/FieldCamp.tsx src/game/mission/world/SolCompanion.tsx
  ```
  Exit 0, no output. This checks the two entry modules and their imports, not all of the app.
- **PASS — copied habitat contract:** `node --test tests/mission-v2/habitat-reuse.test.mjs`, exit 0; 3 passed, 1 skipped because `HABITAT_SOURCE` was not supplied. Destination SHA-256 checked against approved `674b18b8b56e6a3da843be62d6fca1e6d07ec07eb678b9a8178fc9a2c1e41646`; API/geometry markers and material references also pass.
- **Not run:** actual React-element/Three scene traversal, Box3/bounds, rendered geometry counts, browser/runtime checks. Do not treat authored envelope constants as measured coverage.

## API and structural observations

- `FieldCamp({region, position, heading?, base, survey})` renders the copied craft at local origin plus a region-specific operation module and OPS console. Region union is impact/dust/volcano/ice/lake. A finite heading rotates the entire camp; non-finite position components and heading fall back to zero. `survey.operation ?? base.operation` selects visible module variant.
- Declared `FIELDCAMP_LOCAL_ENVELOPE` is `x[-5.85,6.2], y[0,3.75], z[-3.75,8.3]`; it is **authored/unverified**, not measured geometry or a collider. `FIELDCAMP_RAMP_WALKUP` describes a centerline from z=6.31 to 4.26, half-width 0.84; console anchor is `[0,0,8]`, facing +Z. No test here proves ramp clearance, a clear apron at z=12, module containment, or bounds after arbitrary rotation/translation. Equipment is positioned around x=+4.8 for impact/dust/volcano/ice and x=-4.8 for lake; no new cables from these racks to the habitat were found in this module (copied craft service equipment is separate).
- Physical OPS glyph mesh is constructed once from a flat `BufferGeometry`; ordinary `box`/`cylinder` helpers allocate JSX geometry per call. No Three GPU draw-call/timing evidence. The copied habitat and modules use the shared `realMaterials` singleton objects by reference in source; runtime material mutation/disposal lifecycle was not tested. `FieldCamp` does not demonstrate an integrated collider or main-world placement.
- `SolCompanion({pose, groundY, heading?, paused})` consumes `Pose` (`x,z,heading`) and `groundY`; pose/ground non-finite inputs fall back to zero. Heading overrides pose heading if finite. It directly renders a static two-wheel rover: no autonomous movement, state writes, or `useFrame` behavior observed in source. `paused` is required in the public props interface but unused by the render function; current static behavior is pause-independent.
- Declared `SOL_COMPANION_LOCAL_ENVELOPE` is `x[-0.62,0.62], y[0,1.25], z[-0.55,0.55]`, **unverified**. Camera head center y=1.13 with box half-height 0.10 gives top y=1.23; its amber markers have center y=1.23 and radius 0.025, so their source-defined top can reach 1.255. The published maxY 1.25 therefore appears 0.005 too small absent Three geometry/Box3 verification. A parent-level derived display pose/offset is needed if the companion must visually sit beside Leo; this component intentionally uses the exact supplied pose and does not supply movement.

## Limits and handoff

Source freeze was respected: no edits to either module or shared craft/material source. No graph-based exact counts/bounds were completed; all such claims remain unverified. Before relying on envelope constants for placement/collision, run a focused real-Three Box3 traversal for each region and variant, then at translated/yawed placement. Potential integration concern: translating the entire camp also translates the local console fiducial, so a world-fixed `+8` anchor is valid only at the corresponding camp origin/orientation. Selected-operation `null` renders default-looking equipment variants rather than a tested neutral/empty state. These are acceptance/integration limits, not proposed source changes.
