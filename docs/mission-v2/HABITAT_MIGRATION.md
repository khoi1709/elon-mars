# RealHabitatCraft local reuse record

## Change boundary

Copied the already-approved procedural source from `C:\Hackathon\src\game\art\realism\RealHabitatCraft.tsx` to `src/game/art/realism/RealHabitatCraft.tsx` byte-for-byte. SHA-256 (source and destination): `674b18b8b56e6a3da843be62d6fca1e6d07ec07eb678b9a8178fc9a2c1e41646`. No model edits, build, renderer, browser, downloaded asset, or shared material change was made. The existing release `src/game/art/realism/materials.ts` was retained unchanged (its SHA-256 is `369f56701e628ccb3cfb3c87e11f239a1476e78e478c91a4995a4a1bff788f51`).

## Provenance and terms evidence

The source itself describes the habitat as “HI-SEAS-informed” and the vestibule/access as fictional adaptations, not a replica. `C:\Hackathon\docs\ares-cradle-reboot\production\art\REALISM_HABITAT_NOTES.md` records that the lead authored the current correction after a worker's earlier stub and notes were rejected; it expressly disclaims exact HI-SEAS engineering, NASA certification, and an existing Mars base. `C:\Hackathon\docs\ares-cradle-reboot\production\art\REALISM_SOURCE_REVIEW.md` records this exact source hash and bounded source review. The release guide `C:\Hackathon\docs\art-library\README.md` points to local Ares procedural sources for reuse and says the NASA Perseverance GLB is reference-only, not cleared for production.

No creator credit or license/terms declaration specific to this `RealHabitatCraft.tsx` was found in the source or cited local habitat notes/review. The source notes attribute the corrected implementation to the lead but do not provide a legal creator identity or grant terms. Do not infer CC0 or transfer terms from other assets or the legacy `HabitatDome.tsx`. Rights/terms for this exact source remain unverified; preserve the attribution and comments in the exact copy and resolve terms before any distribution requirement. NASA's external GLB remains reference-only: it was not copied, downloaded, or used as model geometry here.

## Contract and source-derived placement facts

- Named export `RealHabitatCraft`; props are optional `position: [x,y,z]`, `heading` (radians), and `lit`. No scale prop.
- Local coordinates use +Y up and +Z toward the entry. Root position is the neutral origin/ground reference; yaw is around Y. An integration caller's transform will rotate/translate local points.
- Source entry hatch center: local `[0, 1.25, 3.79]`. Landing/threshold box center: local `[0, 0.21, 3.87]` (box size `[1.88, 0.06, 0.78]`). A practical nominal airlock/entry approach point is local `[0, 0, 3.87]` on the threshold centerline; this is a placement observation, **not** an exported gameplay/collision API or a guarantee of walkable access.
- The prior source-equivalent geometry record in `REALISM_HABITAT_NOTES.md` reports analytical bounds min `[-4.105, ~0, -3.63]`, max `[3.63, 3.676245, 6.332]`, dimensions approximately `7.735 × 3.676245 × 9.962` Three.js units. Treat these as reported source-derived envelope values (nominal metre-like art units), not a runtime `THREE.Box3` measurement in this migration. They support rough placement only; they are not physically calibrated dimensions. No new model scale is imposed.
- HI-SEAS is inspiration only. This procedural fictional structure does not establish real habitat scale, engineering, accessibility, collision, or mission authority. Its `lit` prop changes a small observation pane/hatch indicator only.

## Verification

New bounded test: `node --test tests/mission-v2/habitat-reuse.test.mjs` — PASS, 3/3. It asserts original/destination bytes and recorded SHA equality, expected API/geometry/entry markers, and that every referenced `realMaterials` key is exported. It does not render the model or measure a runtime bounding box.

Strict no-emit check: `npm run lint` (`tsc --noEmit`; `tsconfig.json` has `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`) — **FAIL, exit 1** on unrelated existing diagnostics: `src/game/mission/MissionGame.tsx(9,1)` unused `MissionCinematic`; `src/game/mission/presentation/cinematics/MissionCinematic.tsx(18,7)` unused `PANEL`; `src/game/mission/state.ts(505,13)` unused `center`; `src/game/mission/world/MissionWorld.tsx(486,45)` property `x` is not valid for `readonly [number, number]`. No unrelated files were changed to address them.

This migration did not run a build, app integration, browser, or visual/lighting/performance QA. Independent review and later integration/render checks remain separate gates.
