# Activity implementation handoff

## Owned files

- `src/game/mission/activities/rules.ts` — serializable per-region progress shapes, strict validation/normalization, solved-state derivation, and pure action helpers.
- `src/game/mission/activities/ActivityPanel.tsx` — accessible per-region interaction UI exported as `ActivityPanel`.
- `tests/mission-v2/activity-rules.test.mjs` — Node built-in tests; transpiles the pure rules module with the workspace TypeScript dependency, without installs.
- `scripts/mission-qa/activity-rules.mjs` — direct `node` test wrapper.

## Domain integration

Import `isActivityComplete(region, progress)` from `activities/rules.ts` and use it as the exact activity completion authority before accepting `ACTIVITY_COMPLETE`. It validates structure and solves the actual activity; no `complete` boolean or generic flag is trusted. `initialActivityProgress(region)` exports valid serializable initial snapshots. `normalizeActivityProgress(region, unknown)` recovers malformed/mismatched values to safe initials for presentation. `isActivityProgressValid(region, value)` exposes strict validation.

`ActivityPanel` signature:

```ts
{
  region: RegionId;
  progress: unknown;
  assisted: boolean;
  onProgress: (progress: unknown) => void;
  onComplete: () => void;
  surveyContext?: LakeSurveyContext;
}
```

The first five props remain backwards-compatible. `onComplete` is invoked only after pure derived completion; consumers must still validate through domain rules.

## Saved progress shapes

Every region snapshot carries `kind` and `version: 1`:

- impact: `{ kind:'impact', version:1, matches:[{signal,context}, ...] }`; only the three exact signal/context pairs accepted, no duplicate signal/context.
- dust: `{ kind:'dust', version:1, rotations:number|null[][] }`; three rows of nine, active tile rotation 0..3, inactive cells null. `DUST_BOARDS` defines three authored tile boards and obstacle locations. `runDustModel(boardIndex, row)` checks connected routes, accepts any valid route, and returns stop path/reason; `rotateDustTile` rejects invalid edits and preserves solved boards.
- volcano: `{ kind:'volcano', version:1, order:LayerId[] }`; exact four-layer permutation; completion checks only the authored overlap partial order, allowing either valid middle-layer order.
- ice: `{ kind:'ice', version:1, site:IceSiteId|null, percent:0..100 step 5, checked:boolean, labeled:boolean, sealed:boolean }`; requires site, in-range 30–70 check, label then seal. `stepIceDrill`, `checkIceDrill`, `labelIceCore`, `sealIceCore` provide retry-safe transitions.
- lake: `{ kind:'lake', version:1, selectedTarget:LakeTargetId, captures:Record<LakeTargetId,{wide:LakeCapture|null,close:LakeCapture|null,location:LakeLocationFix|null}> }`. Evidence records actual x/z, camera heading, and the recorded framing ('wide' or 'close'); wide within 34 units, close within 12, position within 8, aim ≤20 degrees toward target. All three evidence kinds needed per target.

## Lake world adapter needed

Pass optional context refreshed from actual rover/camera runtime state:

```ts
type LakeSurveyContext = {
  roverPose: { x: number; z: number; heading: number };
  camera: { heading: number; framing: 'wide' | 'close' };
};
```

Update it when rover pose moves, camera aim changes, or live camera framing changes. Do not use activity-panel controls/checkboxes to claim those values; without context the panel explicitly waits and disables capture buttons. Targets are authored in game world coordinates in `LAKE_SURVEY_TARGETS` (x/z near lake center [200,170]). The UI only requests a capture from this live context; it does not fabricate NASA imagery or claim camera integration exists.

## Test / check results

- `node --test tests/mission-v2/activity-rules.test.mjs` — **6/6 passed**. Covers malformed/cross-region/extra/duplicate values, exact and wrong pair matching/retry, every valid dust route enumeration and sensor stop, alternate volcano valid orders and wrong order, ice range/workflow, and lake missing-context/heading/framing/distance/evidence completeness.
- `npx tsc --noEmit --pretty false` — activity implementation errors resolved; overall existing worktree currently fails outside owned scope due to concurrent `MissionGame.tsx` imports of not-yet-created `./state`, `./store`, `./world/MissionWorld`, several unused names/report field errors and literal `EOF` in `MissionGame.tsx` / `world/worldNavigation.ts`. Re-run after domain/world/UI owners finish.
