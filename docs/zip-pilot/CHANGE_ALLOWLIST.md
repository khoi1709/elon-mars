# Pilot change allowlist and preservation fence

Compare these changes to the pre-pilot DIRTY worktree snapshot, not just published HEAD. This allowlist is permission for the bounded approved pilot only; it is not a staging/publication list. No Git mutation/publication authorized.

## Existing product inputs allowed to differ

- src/App.tsx — local readiness state/callback, normal Canvas/HUD route retained.
- src/modules/outpost-3d/MarsCanvas.tsx — observed normal first-frame readiness, context lifecycle/error boundary, original rendering settings/scene retained.
- src/modules/mission-control/MissionControlOverlay.tsx — readiness prop pass-through only.
- src/modules/mission-control/QuickControlsManual.tsx — original static horizon and descriptive readiness; Start/back/close unchanged and enabled.
- src/modules/mission-control/ScienceCodex.tsx — explicit optional practice in the selected unlocked impact article; same dialog and NASA notes retained, activity exit/selection/focus lifecycle. Follow-up7ee CLASS-ONLY min-w-0/gridminmax0 containment authorized to fix actual390px inner-panel clipping; no additional behavior/store/source-content changes.
- src/modules/mission-control/ImpactPracticePanel.tsx — explicitly authorized B-owned pilot path from the original dispatch, NOT unrelated existing work. The baseline snapshot raced B's allowed new-file creation and already captured this path at SHA db4ff37335cae68296099ffcde4d7c1c275cd6d010f8e7d3443cc1192368550c; B's completed authorized panel is6ec4c6c798d86c2072a884802c6b57734b0b5e460a3bd801f9c1f66ca901e58f. Therefore count it as a pilot-owned CHANGED baseline input, not as an unlisted foreign modification or a missing/new path. Do not alter either baseline manifest or source to hide this race; retain the explicit comparison finding and classification.

## New product inputs

- src/modules/outpost-3d/sceneReadiness.ts — bounded first-normal-frame/context observer, no compile/render/resource mutation.
- src/modules/mission-control/impactPractice.css — component-prefixed responsive/accessible style, no downloaded assets.

ImpactPracticePanel is new to the approved feature, but is classified above as an existing baseline input because the read-only snapshot observed B's early new-file creation during the parallel dispatch. Only the2 remaining source additions listed here are absent from the baseline.

## Existing test inputs allowed to differ

- tests/mission-v2/release-entry.test.mjs — adequate React useState/useCallback harness, original route assertions retained, readiness prop/callback behavior.
- tests/original-map/mission-control-rover-controls.test.mjs — normal React props fixture call({}) only.
- tests/original-map/first-person-camera.test.mjs — adequate React boundary/hooks and actual readiness observer fixture in the Canvas gesture regression. Earlier camera/math/frustum/physics assertions are pre-existing and must be retained.
- tests/original-map/rover-store.test.mjs — authorized test-only ed1d971a repair after full release gate exposed stale missing scienceInteraction/naturalSiteDefinitions imports. Resolve actual repository pure modules rather than stubbing validators; retain all existing remote actor independence/range/region/parking assertions. No product/store/domain edit authorized. This is a fourth existing test input allowed to differ after the first gate's recorded failure, and requires full gate rerun.

## New tests

- tests/original-map/zip-pilot-impact-panel.test.mjs — behavior and runtime capability-denial tests; not a substitute for native store/saves invariance.
- tests/original-map/zip-pilot-scene-readiness.test.mjs — first normal frame, error/context loss/restore/stale/unmount behavior and non-blocking Start contract.
- tests/original-map/zip-pilot-impact-integration.test.mjs — real component/hook behavior for explicit entry, current selected/unlocked eligibility, practice exit/selection/close and focus lifecycle.
- tests/original-map/zip-pilot-impact-layout.test.mjs — scoped regression after confirmed desktop/mobile pilot clipping; actual-container columns and grid/item min-width containment, source-level invariants supplemented by independent native rect/image/scroll checks. Owned by7eelayoutrepair, no external test deletions/weakening.

## Documentation and temporary evidence

Only this pilot's documentation belongs in docs/zip-pilot. Single-use baseline/native/gate scripts, JSON, captures and logs belong INSIDE the target repository's scratch/2026-11/week-46/2026-11-15_zip-pilot-*/ hierarchy. Those are evidence, not architecture or production assets. Existing scratch/profile/output/docs files stay untouched.

## Protected inputs and identities

All other pre-pilot source/test/config identities must match the captured182-file manifest: store/exploration/save/resource/reward logic; current camera/player/rover/physics/world/terrain/material/landmark/science catalog/inspection validation; existing authored assets; held FieldGuideModal/ImpactFieldTools source and orphan test; all package/config/lock entries and test support files. Do not remove untracked code or old artifacts. Pilot new files are counted positively, not ignored by a narrow known-filenames hash check.

Keep HEADd941b7051414390ebfb84e17f68607c1dfdc5faf, branchfeature/five-frontiers-20261114 and an empty index. Normal production dist output is allowed only as the requested existing npm run build result; it is not deployment. Existing localhost3012 remains target; no listener/server restart, and localhost3015/referencecheckoutHEAD098ef8307c5ed005c17b1301ef7d722f3e30c9f5 remains read-only with its prior untracked artifacts preserved.

## Final gate requirements

One Luna gate owner records every actual source/test/config path and raw SHA before and after final tests/build. Compare all entries in the pre-pilot manifest and explicitly enumerate every addition, missing path and change. Any out-of-allowlist mismatch is a finding, never silently repaired or zero-filled. Report missing0 explicitly only after actual positive inspection. All changed pilot paths must be present in the final fence.

Run the exact ancestor TypeScript no-emit command, all affected tests, the full release test subset (all original-map tests except the held orphan impact-field-tools test, all mission-v2 test.mjs files and the two existing cinematic cjs regressions) and normal npm run build. Explicitly name exclusions/skips and do not misreport excluded tests as passing. Native proof uses genuine input and read-only telemetry from the existing3012 world, not synthetic state; that independent checker remains a separate acceptance gate.
