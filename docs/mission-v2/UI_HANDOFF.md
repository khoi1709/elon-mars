# Mission UI handoff

## Delivered

- `MissionGame.tsx` composes the mission store, world boundary, activity boundary, and scoped UI panels.
- Start flow supports any of five landing stations, then an accessible skippable static intro.
- In-field HUD includes objective, selected station, local stock groups, map, notebook, pause/settings, touch D-pad, and one context action.
- Observation and optional branch panels require a short tool/comparison action before dispatching `OBSERVE`/`BRANCH`; opening a note does not mutate mission state.
- Base panel previews essential stock before confirmation, exposes support recovery, opens the controlled `ActivityPanel`, previews two operations, and dispatches domain events only.
- Activities receive live lake context (`roverPose` plus camera heading/framing) and partial progress is dispatched through `ACTIVITY_PROGRESS`.
- Finale supports goal selection, arrival-base selection, three named system checks, visible HOLD/GO state, labeled Mira delay with snapshot revision, arrival, and later free exploration.
- Corrupt/future saves and storage failures are surfaced from `useMissionStore` without overwriting the existing bytes.
- Scoped Barlow assets are copied from `C:\Hackathon\public\fonts` to `public/fonts` with OFL notice.

## Integration notes

- The lead must route this surface from `App.tsx` (outside this worker's write scope); no global route was changed here.
- The world worker must provide `src/game/mission/world/MissionWorld.tsx` with the contract props used by `MissionGame`: `state`, `dispatch`, `onInteract`, `paused`, and optional `input`/`interactRequested`. The lake adapter must expose actual rover pose and camera state through `state`/activity context; this UI deliberately does not synthesize evidence.
- Domain state/store files are concurrent ownership. `MissionGame` uses the frozen event names and reads `base.report` (reports belong to `BaseState`).
- `pnpm run lint` was blocked by the environment's ignored `esbuild` build-script install guard. Direct `tsc --noEmit` reached the current checkout and reports the missing world module plus pre-existing/in-flight state typing diagnostics; no UI-owned diagnostics remain.

## Visual verification

Run the app through the lead's existing release route after world integration. Check desktop and narrow mobile widths, keyboard Escape/modal close, reduced motion, mute/large-text settings, map geometry, operation previews, and the lake activity with real rover proximity/heading. Do not treat static intro as the later 3D cinematic; cinematic ownership remains separate.

The interface intentionally avoids fake telemetry, emoji, glass/neon surfaces, and unscoped global CSS. Game-unit values are labeled as fictional balance, while notebook entries link to public science references and explain the boundary between source facts and the fictional scenario.
