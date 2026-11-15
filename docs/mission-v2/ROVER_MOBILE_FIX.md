# Rover mobile rendering — investigation status (incomplete)

**Status:** INCOMPLETE. No product cause was established and no application source was changed. Do not interpret the prior positive canvas dimensions or the attempted test as proof of mobile rendering. This is not a verified fix.

## Evidence available

- Baseline `C:/Hackathon/output/ares-phase0/rover-migration/desktop.png` (1280×800) was opened as a native PNG: it visibly contains the rover on brown terrain.
- Baseline `C:/Hackathon/output/ares-phase0/rover-migration/mobile.png` (390×844) was opened as a native PNG: its page header and controls are visible, but the canvas interior is uniformly dark/blank; no rover or terrain is visible.
- Baseline `report.json` reported a positive canvas bitmap size and no page errors. Those checks did not measure scene pixels.
- The original `C:/Hackathon/scratch/2026-11/week-46/2026-11-14_phase0/verify-rover-migration.mjs` changed Puppeteer viewport settings from desktop without mobile emulation flags to mobile with `isMobile` and `hasTouch`; that transition may reload the page. It did not establish what happens on size-only resize versus fresh mobile load.
- Localhost:3000 was empty before this run. The same-checkout Vite server was started with `npm run dev -- --host 127.0.0.1`, and `http://127.0.0.1:3000/?review=rover` returned HTTP 200. The checker was told to use that server; see cleanup below.

## Attempted verification

Command: `node scripts/mission-qa/rover-mobile.mjs`

The script launched installed Edge through existing `puppeteer-core` at `C:/Hackathon/node_modules`, with a temporary profile under `C:/Hackathon/output/ares-phase0/rover-migration/mobile-fix/edge-profile` and no security-disabling flags. Before the first screenshot, Puppeteer failed with:

`ProtocolError: Page.captureScreenshot timed out.`

The run exited with code 1 at `scripts/mission-qa/rover-mobile.mjs:83` in the first desktop `page.screenshot`; no new screenshot/report artifacts were produced. The script's `finally` closed its own browser. The failure does not establish a render cause. The script's current screenshot pixel sampler also performs many individual `getImageData(x,y,1,1)` calls and is inefficient; it was frozen for independent checker review and must not be treated as validated QA.

## Source and unverified test scope

`src/game/review/RoverReview.tsx` was read and left unchanged. No CSS collision, flex measurement, camera issue, stale render root, or other app root cause is asserted. The new `scripts/mission-qa/rover-mobile.mjs` was authored to distinguish a stable-emulation same-document desktop → mobile-width → desktop-width resize from a fresh mobile-emulation load, and to require screenshot interior color evidence, but it has **not passed**. Interactions/assertions beyond the attempted capture were not reached. A checker separately owns its own limited capture lane and its findings must be recorded before promoting this status.

## Required follow-up

1. Obtain checker findings and actual native PNGs for size-only resize, fresh mobile, and desktop return; use `read_image` and describe whether both rover and terrain are visible. If the checker cannot establish a source defect, keep this report incomplete and do not make a speculative app change.
2. Make the pixel sampler practical by acquiring `getImageData` once per capture and sampling its returned typed array (or an already-installed PNG reader); rerun only when authorized and with adequate time.
3. Reproduce a demonstrated app cause before making the narrowest correction in `RoverReview.tsx`; verify desktop → mobile-size → desktop and fresh mobile with actual scene pixels, console/page/WebGL errors, and relevant touch/scroll/focus/reduced-motion checks.

## Artifacts and jobs

Baseline evidence: `C:/Hackathon/output/ares-phase0/rover-migration/desktop.png`, `C:/Hackathon/output/ares-phase0/rover-migration/mobile.png`, `C:/Hackathon/output/ares-phase0/rover-migration/report.json`.

Attempted artifact directory: `C:/Hackathon/output/ares-phase0/rover-migration/mobile-fix/`; currently contains only the temporary Edge profile directory and no screenshot/report. My browser run `pwsh-6924e8f657364519` completed exit code 1 and was collected. My owned Vite server is background job `pwsh-ff4558ce13d94d26`, URL `http://127.0.0.1:3000/?review=rover`; it remains running only for the independent checker and must be stopped and collected once the checker releases it. No unrelated Edge processes or servers were killed.
