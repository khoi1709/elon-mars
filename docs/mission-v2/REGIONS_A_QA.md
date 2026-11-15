# Region A browser QA — Impact Ridge and Wind Basin

**Status: PASS on final run.** Manual-control-equivalent Puppeteer UI checks were performed against the running Vite app at `http://127.0.0.1:3000/?mission=frontiers` on 2026-11-14 using fresh temporary Edge profiles. All actions were public UI clicks or keyboard movement; application save inspection was read-only. No application source/config was changed.

## Final run

- Command: `node --check scripts/mission-qa/browser-regions-a-real.mjs` — exit 0.
- Command: `node scripts/mission-qa/browser-regions-a-real.mjs` — managed job `pwsh-608581aaf1d7446d`, exit 0; both per-region outcomes PASS.
- IMPACT: selected Impact Ridge, skipped the cinematic through its UI, captured real world/base/activity/report PNGs; made two observations, paid the essential pack once (12/4/5/4 → 10/3/4/3), verified wrong-pair caution without losing correct matches, completed three actual signal/context matches, selected Protected sample store, filed report; persisted report/activity/stock survived reload. Final stock **8 EU / 3 meals / 4 water / 3 air**.
- DUST: selected Wind Basin, skipped the cinematic through its UI, made two observations, paid once (12/4/5/4 → 10/3/4/3), rotated actual tile controls and ran each of the three visible boards, verified each route and saved `activityDone=true`, selected Clean solar panels, filed report; persisted report/activity/stock survived reload. Final stock **10 EU / 3 meals / 4 water / 3 air**.
- Repeat-report UI: after filing, the base showed “Report filed” and did not offer Submit region report again.
- No page errors or failed requests. One React console warning: missing unique `key` on children rendered by `OperationModule` in `FieldCamp.tsx`.

## Source fence

Before/after SHA-256 maps are included in each region JSON report. All 13 tracked app files matched exactly (`sourceChanged: false`); selected fingerprints:

- `src/game/mission/world/MissionWorld.tsx`: `b29b8e2809344292ebf8d6222a22ebedd0e845db4fe65e9737e22dd14a488ab2`
- `src/game/mission/world/FieldCamp.tsx`: `9959b74b78c4709cb299647ff48a63f7ae589511203688f23f6b71bf4727791a`
- `src/game/mission/activities/ActivityPanel.tsx`: `d75d20c11dbf04eed9dbb936b0f6dff8aeb6f59dd53c7b246454ff7eff18e6af`
- `src/game/mission/activities/rules.ts`: `dbde07ebe16eb4ef48fb9fce64314099b4c1e1d47ec9a5bc1308bc6b5d59eda5`

## Artifacts

- IMPACT report and checkpoints: `C:/Hackathon/scratch/2026-11/week-46/2026-11-14_browser-regions-a/impact-attempt3/report.json`
- DUST report and checkpoints: `C:/Hackathon/scratch/2026-11/week-46/2026-11-14_browser-regions-a/dust-attempt3/report.json`
- IMPACT activity and filed report screenshots: `.../impact-attempt3/05-activity-complete.png`, `.../impact-attempt3/06-report-filed.png`
- DUST activity and filed report screenshots: `.../dust-attempt3/05-activity-complete.png`, `.../dust-attempt3/06-report-filed.png`
- Other region screenshots and initial helper-attempt diagnostics are in the same dated scratch folder. The earlier attempts were incomplete due to QA-helper assertion/Edge-profile reuse, not app defects; their reports are retained separately and are not counted as passes.

## Not covered

No mobile layout run, continuous five-campaign playthrough, FPS/performance claim, other regions, or report-repeat transaction injection. No tests/build beyond the listed Node syntax check and live browser run.
