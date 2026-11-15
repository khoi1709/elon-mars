# ZIP pilot — bounded native Reset reachability recheck

## Result

**PASS — no product defect reproduced.** The earlier `mobileResetButtonReached: false` was a premature stop in the test harness's first-visible-content helper, not evidence that the Reset control was unreachable. Native wheel and touch gestures over the actual visible Codex scroll pane advanced that pane to its measured bottom, where Reset was visibly inside both the pane and dialog; the real button click reset the optional practice's local attempt count.

## Evidence and method

- Target: existing `http://127.0.0.1:3012/`; fresh headless Microsoft Edge via installed `puppeteer-core` 25.16.0. No server/dependency changes.
- Duration: 140 seconds. First-join first-frame text and Start were observed; a real keyboard-controlled walk reached the Impact Basin; grounded native `F` discovered `impact.science-2` and showed its original NASA source link. Practice remained an explicit optional action.
- At mobile viewport 390×640 (`isMobile:false`, `hasTouch:true`), a real wrong pair produced `0 of 3 matched; Attempts: 1`. Input point `(195,358)` was verified inside the visible overflow scroll ancestor and dialog before each gesture. Actual wheel `scrollTop`: `1502→302→0`; touch: `0→165`; wheel toward the footer: `165→725→1285→1763` (maximum `1763`).
- At bottom, Reset bounds were `x=45..199, y=549.0..597.1`; the measured pane bounds were `x=13..377, y=103.6..613.4`. A native button click changed attempts `1→0` and displayed “Practice reset. Choose a signal to begin again.” The content-height change afterward slightly reduced maximum scroll to 1736; Reset remained within the pane.
- Read-only comparison before/after the practice confirmed paused exploration, expedition progress, inventories, player XZ, rover state, and all three save-key strings were unchanged. No app-store or localStorage write was used to inject progress; the browser was closed by the runner.
- Positive SHA-256 fence: 188 source/test/config paths, zero differences, zero missing before/after. Browser page/console/request errors: zero. Owned browser closed.

## Artifacts and scope

- Native runner: [zip-reset-reach.mjs](../../scratch/2026-11/week-46/2026-11-15_zip-pilot-reset-reach/zip-reset-reach.mjs)
- Full timestamped JSON, input measurements, invariant snapshots, and hashes: [zip-reset-reach.json](../../scratch/2026-11/week-46/2026-11-15_zip-pilot-reset-reach/zip-reset-reach.json)
- Mobile view at practice top: [mobile-practice-top.png](../../scratch/2026-11/week-46/2026-11-15_zip-pilot-reset-reach/mobile-practice-top.png)
- Mobile view with Reset visible: [mobile-reset-visible.png](../../scratch/2026-11/week-46/2026-11-15_zip-pilot-reset-reach/mobile-reset-visible.png)

No source, test, CSS, configuration, dependency, or server changes were made. This bounded native reachability check does not rerun or replace the separate automated test/type/build gate and does not claim broader performance or camera acceptance.
