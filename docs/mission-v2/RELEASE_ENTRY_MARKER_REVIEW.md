# Release entry and deployment marker verification — 2026-11-14

**Verdict: PASS for the built candidate and routes exercised; build provenance is explicitly unverified due to tracked changes.** This review covers the currently built local candidate only. It does not prove a public Vercel deployment or commit identity.

## Checks

- Maker-reported full `npm run build` (`tsc` + Vite) — exit 0; 2,801 modules transformed, 28 precache files, 2,891,663 bytes. This checker did not rerun the build.
- Independent `node --test tests/mission-v2/release-entry.test.mjs tests/mission-v2/release-marker.test.mjs tests/mission-v2/offline-cache.test.mjs` — exit 0, 4/4 tests passed.
- `node --check scratch/2026-11/week-46/2026-11-14_release-entry-marker-check/smoke.mjs` — exit 0.
- Managed runtime job `pwsh-e4f00985cb9f4e60` — exit 0. Fresh Edge profile using default browser security; owned preview PID 17092, stopped with SIGTERM. Browser closed.

## Runtime results

The local preview served `/deployment-check.json` with HTTP 200 and `Content-Type: application/json`. The parsed marker schema is `schemaVersion: 1`, `campaignId: ares-cradle`, `mode: production`, `builtAt: 2026-11-14T08:03:02.311Z`, `gitCommit: 12a74d5a737cf9e682c1d9696bada1119c7b7b4e`, `provenanceSource: git-head`, `verified: false`, `trackedChanges: true`. The SHA is descriptive only; the marker correctly does not assert verification because tracked changes existed at build time.

The generated service-worker manifest was `ares-v2-ares-cradle-a611996091dfdc89cd9e`, with 28 files and 2,891,663 bytes; it includes `deployment-check.json`.

Route smoke results:

- `/?mission=frontiers`: Five Frontiers start screen, six buttons.
- `/`: same default Five Frontiers start screen, six buttons.
- `/?legacy=1`: legacy gameplay HUD and canvas.
- `/?review=rover`: rover-review page.
- `/?review=rover&legacy=1`: rover-review page, confirming review route priority.

No browser console errors or failed requests were recorded. Detailed evidence: [runtime-evidence.json](../../scratch/2026-11/week-46/2026-11-14_release-entry-marker-check/runtime-evidence.json).

## Scope and release limits

Reviewed App routing preserves rover review first, defaults to the mission game except explicit `legacy=1`, and keeps the `mission=frontiers` alias working. Marker generation emits `deployment-check.json` before offline inventory/hash generation; the runtime manifest confirms inclusion. Focused tests cover query routing, provenance validation (including dirty/mismatch/unknown cases), placeholder replacement and inventory inclusion, and existing offline-cache boundaries. No application or test source was changed by this checker; its only added files are this report and scratch smoke evidence/script. Public deployment still requires separate authorization and public revision verification; local HTTP success alone is not deployment proof.
