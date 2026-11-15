# Volcano + Ice Region Browser QA

**Desktop result: PASS for both targeted region flows.** Executed against the shared Vite URL `http://127.0.0.1:3000/?mission=frontiers`; each map run used a fresh temporary headless Edge profile at 1280×800. Visible UI actions only (select/start, cinematic skip, real keyboard navigation + E, actual controls, report); mission localStorage was read-only for verification. No app/source/config writes, state injection, reducer events, or persisted-state mutation.

## Desktop results

- **Blackstone Steps / Volcano:** saved observations `volcano-v1`/`volcano-v2`; paid essential pack once, 12/4/5/4 → 10/3/4/3; reordered via actual Up/Down controls to foundation → channel → ridge-side → cap and checked. Chose Passive insulation and submitted the report. Read-only save after reload: `activityDone=true`, `report=true`, stock 8/3/4/3; survey, operation, and operation-output transaction IDs each appear once.
- **Enclosed Ice Wall / Ice:** saved `ice-i1`/`ice-i2`; paid once; selected Layer window, used +5% controls to 50%, then Check → Add site + layer label → Seal core box. Chose Analyze the core and submitted report. After reload: site/reading/check/label/seal and activity completion persisted, report true, stock 8/3/4/3; three transaction IDs each occur once.
- Source hashes for mission entry/game/activity/rules/state/store/content/contract/world/FieldCamp/cinematics were identical before/after successful runs. No failed network requests recorded.

## Mobile visual/interaction smoke — PARTIAL, visual FAIL

Fresh temporary Edge profile, Lake selected through UI, intro skipped, and a 390×844 touch-emulated smoke. Actual touch on Move up changed saved Leo z 182 → 181.904; map opened/closed; pause and Reduced motion control worked. No horizontal overflow; stage filled viewport. This does **not** establish mobile pass. World screenshot shows the objective and stock HUD overlapped by the D-pad at x=187–323, y=644–734, obscuring stock labels/values; all five touch controls are 44×44 px (<48). Map content is vertically scrollable and its right-side label clips at viewport edge in the captured state. Treat mobile visual layout as failed/needs follow-up. No fix attempted; no broad mobile layout, performance, FPS, or device claim.

## Runtime note and harness history

Both desktop regions and mobile smoke recorded a React missing-list-key warning attributed to `OperationModule` at `FieldCamp.tsx:98`. No application fix was attempted. The initial Volcano helper run failed on its own assumption that initial `activityProgress` was non-null; it was null as designed. Corrected bounded Volcano-only run passed. This helper issue is not an app defect.

## Artifacts / commands / disposition

Runner: [browser-regions-b.mjs](../../scripts/mission-qa/browser-regions-b.mjs), optional smoke: [browser-regions-b-mobile.mjs](../../scripts/mission-qa/browser-regions-b-mobile.mjs). Scratch results/PNGs: `C:/Hackathon/scratch/2026-11/week-46/2026-11-14_browser-regions-b/` (`volcano-result.json`, `ice-result.json`, `mobile-result.json`, region activity/report/reload images, and mobile title/world/map/pause images). First combined command exited 1 due to helper null-progress bug; corrected Volcano command `node --check scripts/mission-qa/browser-regions-b.mjs; node scripts/mission-qa/browser-regions-b.mjs volcano` exited 0. Ice passed in the combined run despite its aggregate exit 1. Mobile smoke command exited 0.

Targeted desktop mechanics, report transactions, own-stock accounting and reload persistence passed for both maps. Application remains unmodified. This is not full release acceptance.
