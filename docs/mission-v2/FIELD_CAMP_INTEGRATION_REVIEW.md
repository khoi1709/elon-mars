# Field-camp integration review

**Independent checker:** this session; no source repairs. **Source freeze receipt:** parent-reported 12:02:33 +07. Checker read `MissionWorld.tsx` (695 lines), `FieldCamp.tsx` (133), `SolCompanion.tsx` (55), and `RealHabitatCraft.tsx`; did not edit them. Current SHA-256:

- `MissionWorld.tsx` — `B29B8E2809344292EBF8D6222A22EBEDD0E845DB4FE65E9737E22DD14A488AB2`
- `FieldCamp.tsx` — `9959B74B78C4709CB299647FF48A63F7AE589511203688F23F6B71BF4727791A`
- `SolCompanion.tsx` — `4CC8A9A0C7F3273D6F3E2A204B705F71AC70879AF214AE48FB55EAB7626D9BBF`

## Checks

- `node C:/Hackathon/node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false -p tsconfig.json` — **exit 0** (explicitly printed `TSC_EXIT=0`).
- `node --test tests/mission-v2/integration-state.test.mjs tests/mission-v2/activity-rules.test.mjs tests/mission-v2/base-safety-regressions.test.mjs` — **14 passed, 0 failed** (3 integration-state, 6 activity-rules, 5 safety-regressions).
- Source read matched the stated contract: `FieldCamp` safely defaults/sanitizes its local habitat offset, applies it to craft/operation only, and leaves OPS console at local `[0,0,8]`; Lake habitat offset samples terrain at `center+[-15,-12]`; interaction target remains `center+[0,8]`. Sol remains pose-owned/render-only at Leo `+[1.3,1.6]`. This is source review, not collider or transformed-geometry measurement.

## Browser evidence

Used an owned Vite process on strict port 3000 and headless Edge/Puppeteer at `http://127.0.0.1:3000/?mission=frontiers`; selected Lake through the visible start-region button and used visible **Skip scene**. No state injection or teleport. Native PNG inspection confirmed a pale geodesic habitat and hatch at upper left, OPS console around center, and Leo with a separate small rover on visible terrain; the habitat is distant/small in this default Lake view. The post-interaction PNG shows the station dialog overlay.

- [Fresh Lake world PNG](../../output/mission-v2/field-camp-integration/fresh-lake-field-world.png) — 1280×800, SHA-256 `d6ef877c6f01888fbc940acb5fc08998bdf5a1b7ad090ed4fea95e7be756848c`.
- [Fresh Lake E-dialog PNG](../../output/mission-v2/field-camp-integration/fresh-lake-after-E.png) — 1280×800, SHA-256 `2f6c8b2700d948a65ac60d136ec66e8650f9b65d52e3ccfb8a939695e12a11cb`.
- [Keyboard walk-up screenshot](../../output/mission-v2/field-camp-integration/lake-console-walkup.png) and [walk-up E-dialog screenshot](../../output/mission-v2/field-camp-integration/lake-console-walkup-dialog.png); machine-readable states: [fresh runtime](../../output/mission-v2/field-camp-integration/runtime-check.json), [walk-up](../../output/mission-v2/field-camp-integration/walkup-check.json).

At fresh Lake pose `(200,182)`, actual `E` opened “Old Lake Shore station” (console target `(200,178)`, distance 4); save stayed at revision 2 and stock remained `12/4/5/4`. Separately, real `S` then `W` moved Leo from `z=182` to `185.42315` and back to `182.7263`; actual `E` at distance `4.7263` opened the same station. Walk-up save revision was 31; stock remained `12/4/5/4`. **No Lake activity capture was attempted; no first-capture claim.**

## Limits and cleanup

Actual transformed Three.js `Box3` bounds, multi-region bounds, Sol-vs-geometry envelope, collision certification, FPS/shadow cost, and activity capture behavior were **not measured**. A React development console warning occurred during the first world render: missing list-child `key` in `OperationModule` (`FieldCamp.tsx`); no page exception was recorded. Source was left unchanged.

Browser automation closed in `finally`. Owned strict-port Vite job `pwsh-e4f8973607ca4f49`, PID `33236`, was stopped and its output collected; its completed status was exit 1 after explicit stop. Port 3000 verified free; no Puppeteer Edge automation process remained. Other pre-existing Edge processes were observed but not touched. No relevant background jobs remain.
