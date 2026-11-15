# Final native scroll recheck — bounded pilot

**Result: PARTIAL — native scroll works; Reset reach was not demonstrated.** This is not a full pilot pass.

## Run

A fresh headless Microsoft Edge session used the existing `http://127.0.0.1:3012/` app, Puppeteer Core 25.16.0, 1440×900 desktop and 390×640 touch-enabled mobile viewports (`isMobile:false`, `hasTouch:true`). It completed the real 152-second journey: start, walk to the Impact Basin, native `F` discovery, explicit practice entry, wrong/correct matches through 3/3 completion, reset, mobile re-entry/Back/Escape, history selection, codex close, and ordinary-world resume. No store or localStorage writes were used by the runner.

- The real wheel moved the existing codex scroll pane from `scrollTop=252` to `812` (`clientHeight=510`, `scrollHeight=2273`); real touch moved it from `812` to `997`. Both native inputs produced positive scroll changes.
- **Reset reach is unresolved/failed for this run.** The last measured Reset button box was `y=755..803` in a `640px` viewport, outside view. The runner's visible-target helper then returned no point and stopped scrolling. It did not click Reset on mobile, and this run must not be described as proving that the mobile footer is reachable. Desktop Reset was natively clicked and verified at `0 of 3 matched · Attempts: 0`.
- Desktop and mobile layout measurements accepted: 6 records, readable 16px copy, no horizontal overflow, record rows within article, and dialog/header controls within the viewport. Mobile record-copy widths were 175–209px; desktop widths 293–339px. The captured mobile scroll image shows scrollable record content, but not the Reset button.
- The real matching sequence completed, including wrong-attempt feedback and correct A→rim, B→basin, C→slope pairs. Back-to-note retained the NASA URL `https://science.nasa.gov/photojournal/fluidized-crater-ejecta/`; re-entry started fresh. Thirteen paused-state comparisons had no changes to exploration/progress/inventory/rover/player-XZ/save snapshots or active seconds. Close resumed normal world time.
- No console/page/request errors were recorded. The owned browser closed.

## Integrity fence

The live run inventoried 144 source, 36 test, and 8 configuration inputs (188 total). Before/after missing counts were 0; hash-difference count was 0 across all 188; navigation-family difference count was 0. The runner's exact evidence is in [native-final-run.json](../../scratch/2026-11/week-46/2026-11-15_zip-pilot-scroll-native/native-final-run.json). Only the authorized scratch runner/log/screenshots and this report were written; product and test source were not changed.

## Captures

- [Desktop practice at top](../../scratch/2026-11/week-46/2026-11-15_zip-pilot-scroll-native/desktop-practice-top.png)
- [Desktop completion](../../scratch/2026-11/week-46/2026-11-15_zip-pilot-scroll-native/desktop-completion.png)
- [Mobile practice at top](../../scratch/2026-11/week-46/2026-11-15_zip-pilot-scroll-native/mobile-practice-top.png)
- [Mobile after native scroll gestures](../../scratch/2026-11/week-46/2026-11-15_zip-pilot-scroll-native/mobile-practice-scrolled.png)

**Remaining acceptance gap:** Reset-button visibility/reach after native mobile scrolling. The run should remain PARTIAL until this is proved by a correctly targeted native gesture; no source change or full-world retravel is justified by this evidence alone.
