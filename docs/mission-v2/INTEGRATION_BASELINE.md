# Mission v2 integration baseline — provisional source-WIP

**Status:** Baseline-only, read-only source review; makers were still writing. These checks/findings are provisional, not an acceptance gate. No application, config, or source files changed. One pre-existing output directory (`dist/`) was refreshed by the direct production bundle command; report is the only intentional write. Do not treat a successful Vite bundle as approval or completion.

## Checks

- **TypeScript:** `node C:\Hackathon\node_modules\typescript\bin\tsc --noEmit --pretty false --incremental false -p tsconfig.json` — **exit 1**. No TypeScript cache emitted. Exact diagnostics:
  - `src/game/mission/presentation/cinematics/MissionCinematic.tsx(2,66): error TS6133: 'KeyboardEvent' is declared but its value is never read.`
  - `src/game/mission/presentation/cinematics/MissionCinematic.tsx(19,7): error TS6133: 'DUST' is declared but its value is never read.`
  - `src/game/mission/presentation/cinematics/MissionCinematic.tsx(83,22): error TS2304: Cannot find name 'useThree'.`
  - `src/game/mission/presentation/cinematics/timeline.ts(62,26): error TS6133: 'kind' is declared but its value is never read.`
  - `src/game/mission/state.ts(156,102): error TS18046: 'value.rovers' is of type 'unknown'.`
  - `src/game/mission/state.ts(159,76): error TS18046: 'value.bases' is of type 'unknown'.`
  - `src/game/mission/state.ts(160,80): error TS18046: 'value.surveys' is of type 'unknown'.`
  - `src/game/mission/state.ts(181,7): error TS6133: 'message' is declared but its value is never read.`
  - `src/game/mission/state.ts(267,19): error TS2352: Conversion of type '{ [k: string]: { observations: never[]; branches: never[]; paid: false; supportBaseId: RegionId; activityDone: false; activityProgress: null; assist: false; operation: null; deferred: null; }; }' to type 'Record<RegionId, SurveyState>' may be a mistake because neither type sufficiently overlaps. If this was intentional, convert the expression to 'unknown' first. Type '{ [k: string]: ...; }' is missing properties `ice`, `dust`, `impact`, `volcano`, `lake`.

  `tsconfig.json` includes all of `src` and references `tsconfig.node.json` (which includes only `vite.config.ts`). The executed direct `-p tsconfig.json` covered the complete app TypeScript graph, including mission files; it did not run the referenced project as a build-mode reference graph. Repo-local `node_modules` exposed no direct TypeScript/Vite binaries, so `pnpm exec tsc ...` was attempted first but stopped before invoking tsc: `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.21.5`, exit 1. No install/approval workaround was attempted.
- **Production bundling:** `node C:\Hackathon\node_modules\vite\bin\vite.js build` — **exit 0**, Vite 5.4.21, transformed 2,779 modules, completed in 13.46s. This direct Vite build bypasses package script `build` (`tsc && vite build`) and therefore does not establish type safety. Warning: minified `three-vendor` chunk is 1,027.38 kB (>1,024 kB). Bundle includes only current app graph; mission route is not presently integrated into App, so this is effectively legacy-route coverage.

## Cross-boundary source observations (provisional)

- `state.ts` imports `isActivityComplete` from `activities/rules.ts`; `ACTIVITY_COMPLETE` checks the shared derived completion against saved `activityProgress` (`state.ts:2,346-349,484-489`). Completion is not accepted from a raw event boolean.
- **Validation gap:** save validation does not recompute completion integrity. `validSurvey` accepts any JSON `activityProgress` and any boolean `activityDone` (`state.ts:102-110`); `normalizeMission` returns that survey unchanged after only ID checks (`167-178`). Thus a persisted `activityDone: true` can pass validation without proof that matching progress solves the activity. Report flag consistency is also not reconciled: `validBase` checks only `report` boolean (`95-100`), while save normalization does not establish that a report meets activity/operation/support prerequisites. Do not weaken validation or infer that the transition guard repairs a forged persisted flag.
- **Pose:** `normalizeMission` validates Leo and every rover against finite/world-bounded pose and heading limits (`state.ts:68-69,156`); the lake rover is included. Shared lake evidence rules validate actual x/z, range, camera heading/alignment and framing (`activities/rules.ts:249-269`).
- **Support accounting:** refreshed `initialMission` now sets each survey’s `supportBaseId: id` (`state.ts:267-280`), matching each region’s local stock used by the UI. `store.ts` now blocks writes after corrupt/future saves, preserves raw bytes, and requires explicit recovery when only the backup exists (`store.ts:61-75,85-114,140-145`). No dynamic browser/storage exercise was run.
- **World/UI API:** `MissionWorld` exports both named and default component; default wrapper owns `<Canvas>` around `MissionWorldScene` that uses `useFrame` (`MissionWorld.tsx:3,498,584,648-661`). Props include optional `input` and `interactRequested` (`31-38`); UI supplies both (`MissionGame.tsx:298`). UI pauses the world for any open panel (`290`). Type-level import/props appear aligned, though the full TS check failed for unrelated listed diagnostics and no route runtime was launched.
- **Lake feasibility caveat:** `ActivityModal` supplies `surveyContext` only while `state.activeRover === regionId` (`MissionGame.tsx:208-212`). But opening any panel pauses movement (`290`) and rover movement/camera updates live in the world (`MissionWorld.tsx:592-623`); in the lake activity modal the game offers Wide/Close state toggle but no visible rover-movement or camera-aim control. Static source therefore shows live lake captures require the rover already positioned/aimed before opening the modal; controls for completing three targets in that flow are not evident. No interactive validation performed.
- **Route:** `MissionGame` has default and named exports (`MissionGame.tsx:242,318`), but `App.tsx` branches only on `?review=rover`; otherwise it renders legacy `MarsCanvas` and `MissionControlOverlay` (`App.tsx:5-18`). No preview-only `?mission=frontiers` branch is present. Default legacy route remains intact.

## Changed paths and disposition

- Intentional write: `docs/mission-v2/INTEGRATION_BASELINE.md`.
- Build output refreshed: `dist/` from the direct Vite command.
- No source/config repair, cast, completion flag change, validation weakening, install, browser, or server operation. Makers were not confirmed frozen; re-run relevant checks after `ALL_MAKERS_FROZEN`. Findings above are provisional and not acceptance criteria.
