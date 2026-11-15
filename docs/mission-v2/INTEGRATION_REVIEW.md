# Five Frontiers integration review (provisional)

**Disposition:** captured-hash QA only; not final campaign acceptance. The Lake/UI/world owner was still changing sources during this run. Re-run full build and QA against the final source snapshot after that work lands. This review does not claim the full five-region campaign or Lake gate passes.

## Commands and results

- `node C:/Hackathon/node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false -p tsconfig.json` — exit 0; no diagnostics.
- `npm run build` — exit 0; `tsc && vite build`, Vite 5.4.21, 2,789 modules transformed, build completed in 14.84 s. Warning: `three-vendor-DJAg6P-1.js` is 1,027.40 kB, above Vite's 1,024 kB chunk warning threshold (286.62 kB gzip).
- `node --test tests/mission-v2/integration-state.test.mjs tests/mission-v2/activity-rules.test.mjs` — exit 0; 9/9 tests passed (3 state/integration and 6 activity rules).
- `node scripts/mission-qa/integration-checker-preview.mjs` — exit 0. Browser visited `http://127.0.0.1:3000/?mission=frontiers`, rendered title → intro → world, canvas 1280×800; zero uncaught `pageerror` events. A real W keypress changed Leo's saved pose from `(-200,-170)` to `(-200,-165.8996)`; no save was injected.

## Native visual evidence

- [Title screen](../../isolatedoutput/mission-v2/integration-review/01-title.png)
- [World screen](../../isolatedoutput/mission-v2/integration-review/02-world.png)
- [Browser result JSON](../../isolatedoutput/mission-v2/integration-review/browser-result.json)

Native PNG review: title screen renders, but at 1280×800 the region list is cut off at the lower viewport edge and the primary “Begin field mission” action is not visible in the captured first view. World visibly renders terrain, base/rover, UI and route markers, but the player avatar is very small and distant, the brown terrain is dark/low contrast, and base/rover visually dominate. Title action visibility and player readability/camera framing are visual acceptance failures requiring follow-up. This is visual evidence, not a camera-performance measurement.

## Remaining risks / cleanup

- **P1 visual:** improve and re-review player scale/framing and terrain readability. No source edits were made by this checker.
- Full campaign playthrough, five reports, Lake survey gate, mobile runtime and performance/FPS were not tested; do not infer acceptance from the unit tests or build.
- Checker code: [integration-checker-preview.mjs](../../scripts/mission-qa/integration-checker-preview.mjs). It used Puppeteer Core with Edge's default temporary launch profile (no explicit userDataDir); browser closed in the script's `finally`. No persistent Edge profile was created or touched.
- Owned Vite job `pwsh-7f0e4aff857747db` was stopped and collected after capture. No browser background job was started.
