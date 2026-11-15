# Habitat reuse migration — independent review

**Review time:** 2026-11-14 10:55 +07 (SE Asia Standard Time). **Verdict: PASS for exact source reuse only, WITH LIMITS.** This is not visual, runtime-placement, collision, physics, whole-world integration, or licensing approval. No build or browser/render test was run.

## Evidence and checks

- Read approved original `C:\Hackathon\src\game\art\realism\RealHabitatCraft.tsx`, release copy `src/game/art/realism/RealHabitatCraft.tsx`, `C:\Hackathon\docs\art-library\README.md`, and the directly referenced habitat/source records `docs/ares-cradle-reboot/production/art/REALISM_HABITAT_NOTES.md`, `REALISM_RESEARCH_FLASH.md`, `REALISM_ACCURACY_LUNA.md`, `REALISM_SOURCE_REVIEW.md`, `REALISM_STATE.md`, and `assets/game-art/MANIFEST.md` (source workspace records). Also read release `src/game/art/realism/materials.ts`, `tsconfig.json`, `package.json`, and the new reuse regression test.
- **PASS — byte identity:** original and release source SHA-256 both `674b18b8b56e6a3da843be62d6fca1e6d07ec07eb678b9a8178fc9a2c1e41646`; independent `fc /b` reported `no differences encountered`.
- **PASS — shared material unchanged/compatible:** source and release `materials.ts` SHA-256 both `369f56701e628ccb3cfb3c87e11f239a1476e78e478c91a4995a4a1bff788f51`. The model imports `realMaterials` from `./materials`; the regression asserts all referenced keys are exported. No material edit observed in this scoped check.
- **PASS — focused regression:** independently ran `node --test tests/mission-v2/habitat-reuse.test.mjs`; exit 0, **3/3 passed**, covering exact hash/bytes, API and geometry markers/+Z entry, and material-key export compatibility.
- **INCOMPLETE — repository strict check:** `tsconfig.json` explicitly has `strict: true`, `noEmit: true`, `noUnusedLocals: true`, and `noUnusedParameters: true`. Ran `npx tsc --noEmit --pretty false`; exit 1 with these diagnostics:
  - `src/game/mission/presentation/cinematics/MissionCinematic.tsx(18,7): error TS6133: 'PANEL' is declared but its value is never read.`
  - `src/game/mission/state.ts(505,13): error TS6133: 'center' is declared but its value is never read.`
  - `src/game/mission/world/MissionWorld.tsx(486,45): error TS2353: Object literal may only specify known properties, and 'x' does not exist in type 'readonly [number, number]'.`
  These are unrelated to the copied model; no fixes were attempted. A focused strict/noEmit TypeScript command on the model returned no diagnostics (exit 0), but does not substitute for repository-wide typecheck.

## Geometry, orientation, and scope limits

Actual source declares local root ground origin, +Y up, vestibule/entry toward +Z, and heading as rotation about Y. At default placement, the **closed hatch visual center** is `[0, 1.25, 3.79]`; it is not an open doorway or a collision/interaction contract. The **landing/threshold mesh center** is `[0, 0.21, 3.87]`, with its box top at local Y `0.24`. The ramp starts around Z `4.26`, extends 2.05 units, and slopes downward by 0.2; its toe is around Z `6.31`, top about Y `0.04` (mesh underside approaches ground). These are separate source-derived observation points only. No single `airlockPoint`, gameplay trigger, access guarantee, collision proxy, or domain authority is provided or claimed; integration must choose semantics separately.

The source record's **analytical local component envelope** is min `[-4.105, ~0, -3.63]`, max `[3.63, 3.676245, 6.332]`, size `7.735 × 3.676245 × 9.962`. This is not a runtime world-space bounding box: it includes connected service equipment on negative X, dish and ramp rails beyond the shell radius, and transforms with root position/heading. These metrics are documented upstream source-equivalent analysis; this review did not independently recompute a runtime bounding box. Do not substitute shell radius `3.45` for whole-model clearance.

## Provenance and rights

Evidence identifies this as locally authored procedural Ares geometry, HI-SEAS-informed, with a fictional vestibule/access adaptation; it is not an imported NASA model, literal HI-SEAS replica, NASA-certified habitat, or current Mars base. The art-library guide points to local reuse sources; the source notes attribute the corrected v2 module to lead authorship following rejection of an earlier draft. The inspected records do **not** establish a specific creator declaration or license/redistribution terms for this exact `RealHabitatCraft.tsx`. Therefore terms remain **unverified**; procedural/local authorship does not imply CC0 or any other license. Preserve that uncertainty; do not copy the study-only HI-SEAS photo or NASA reference GLB into production. NASA GLB reference-only status is confirmed in the art-library guide.

## Disposition and boundaries

Accept the staged exact-byte copy and its focused source/material regression only. Repository strict check is **not passing** as checked due to the exact unrelated diagnostics above. No model/shared-material/runtime/world/UI/manifests/config/test-source changes were made by this reviewer. No visual, performance, gameplay placement, hatch accessibility, ramp collision, or human preference conclusion follows from this source check. The maker migration note `docs/mission-v2/HABITAT_MIGRATION.md` was not present when checked; maker prose was not used in place of inspected source or the focused test.
