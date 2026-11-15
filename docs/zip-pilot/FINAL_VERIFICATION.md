# Final release verification — selective ZIP pilot

## Scope and provenance

Verification ran against `C:\Hackathon\output\ares-release\repo`, existing localhost:3012 only. Published identity remains HEAD `d941b7051414390ebfb84e17f68607c1dfdc5faf`, branch `feature/five-frontiers-20261114`; Git index is empty. No source/test edits, dependency install, staging, commit, push, deploy, server restart, or archive execution was performed by this gate. The requested normal `npm run build` wrote the existing `dist/` output only. The built `dist/deployment-check.json` honestly reports `gitCommit=d941b7051414390ebfb84e17f68607c1dfdc5faf`, `verified=false`, `trackedChanges=true`.

## Positive-path source fence

All actual `src/` files, test `.mjs`/`.cjs` files, and the eight baseline root config/lock paths were positively enumerated and SHA-256 hashed before tests/build and again afterward. The pre-pilot dirty baseline comprises 142 source + 32 test/support + 8 config/lock identities (182); current inventory is 144 source + 35 test `.mjs`/`.cjs` + 8 config/lock (187). Missing current positive paths: **0**. Missing baseline paths: **0**. Source/test/config hashes changed during the test/build window: **0**.

Enumerated pilot additions absent from baseline: `src/modules/mission-control/impactPractice.css`, `src/modules/outpost-3d/sceneReadiness.ts`, `tests/original-map/zip-pilot-impact-integration.test.mjs`, `tests/original-map/zip-pilot-impact-panel.test.mjs`, and `tests/original-map/zip-pilot-scene-readiness.test.mjs`.

Nine baseline input SHA changes are explicitly recorded: `src/App.tsx`, `src/modules/mission-control/ImpactPracticePanel.tsx`, `src/modules/mission-control/MissionControlOverlay.tsx`, `src/modules/mission-control/QuickControlsManual.tsx`, `src/modules/mission-control/ScienceCodex.tsx`, `src/modules/outpost-3d/MarsCanvas.tsx`, `tests/mission-v2/release-entry.test.mjs`, `tests/original-map/first-person-camera.test.mjs`, and `tests/original-map/mission-control-rover-controls.test.mjs`. The eight paths other than `ImpactPracticePanel.tsx` are the allowlisted modified product/test inputs. The baseline snapshot captured the panel early during its authorized B-owner creation (baseline SHA `db4ff37335cae68296099ffcde4d7c1c275cd6d010f8e7d3443cc1192368550c`; finalized SHA `6ec4c6c798d86c2072a884802c6b57734b0b5e460a3bd801f9c1f66ca901e58f`). `CHANGE_ALLOWLIST.md` explicitly records and classifies this snapshot race; the manifest and code were not rewritten to hide it.

NUL-delimited Git-status comparison preserved all 5,325 pre-pilot status records; there are zero prior status paths missing. Added paths are the authorized pilot paths/docs, native evidence, and this gate's reports/logs. The full positive inventory and per-path hashes are in `scratch/2026-11/week-46/2026-11-15_zip-pilot-final-gate/pre-test-inventory.json` and `post-build-inventory.json`; exact status-path delta is `scratch/2026-11/week-46/2026-11-15_zip-pilot-final-gate/status-delta.json`.

## Automated checks

- Exact ancestor TypeScript command: `node C:/Hackathon/node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false -p tsconfig.json` — **exit 0**, no diagnostics.
- Release test subset: **31 files**, all `tests/original-map/*.test.mjs` except the explicitly held orphan `tests/original-map/impact-field-tools.test.mjs`, plus all `tests/mission-v2/*.test.mjs`. Result **179 tests: 177 pass, 1 fail, 1 skipped**. Sole failure is `tests/original-map/rover-store.test.mjs`: its loader throws `Unexpected import in store test: ../outpost-3d/scienceInteraction` before store assertions. The fixture lacks a shim for an import in the pre-pilot dirty store implementation. No tests were weakened, skipped, or modified to mask this. The one skip is the external HABITAT_SOURCE case (`HABITAT_SOURCE not provided; destination SHA-256 is always checked`). The held orphan test was verified unchanged from baseline raw SHA `a5cf10ac4f2412ec0924f605373600b512eae98ef5a56933211a58b0876fa08b` and is not claimed as passing.
- Both required cinematic CJS regressions pass: `cinematic-regression.cjs` and `cinematic-geometry-regression.cjs`.
- Normal `npm run build` — **exit 0**. Vite emits the existing large-chunk warning: `three-vendor` is 1,027.53 kB, exceeding 1,024 kB. This is a warning, not a build failure or performance/FPS claim.

Full command output and test list: `scratch/2026-11/week-46/2026-11-15_zip-pilot-final-gate/` (`tsc.*.log`, `release-tests.*`, `release-test-files.txt`, `cinematic-*.log`, `build.*.log`).

## Native acceptance status and limitations

Readiness-only native smoke evidence reports real first frame, enabled Start, help/Escape/preference behavior, 390×640 layout/touch scrolling and reduced-motion behavior; see `scratch/2026-11/week-46/2026-11-15_zip-pilot-readiness-native/report.json`.

Impact native run reached the feature through genuine movement and F inspection, opened the original NASA note and optional practice, but stopped at its first match action because its harness searched for the wrong label (`Match with Impact basin and rim`). It did not finish wrong/correct matching, completion/reset/exit, or live save/state invariance, so impact native acceptance is **incomplete**, not passed. The observed desktop practice article is only about 510.75 px wide; some frame card content reports scroll width 84 px in a 45 px box, confirming a readability/layout concern. The owner should review these results after all read-only checkers close and decide on a scoped CSS correction plus native recheck. Existing home camera occlusion remains a separately documented baseline issue.

The stale `rover-store` fixture failure and incomplete impact native walk both block a fully green final gate. No follow-up code or harness edits were authorized/performed here. HEAD/index and existing 3012/3015 services were left untouched (both returned HTTP 200 on final read-only check). No native final approval, deployment, or publication is claimed.
