# Mission cinematic frozen-source final review

Status: **FAIL for the scoped regression suite**; independent actual-Three geometry checks and strict TypeScript pass. This is source/test verification only. No visual/runtime acceptance is claimed.

## Commands and results

1. `node tests/mission-v2/cinematic-regression.cjs` — exit code **0**.

```text
PASS cinematic regression: durations, bounded deterministic telemetry, descent/ramp order (normal + reduced motion), and departure sequence
```

2. `node tests/mission-v2/cinematic-geometry-regression.cjs` — exit code **1**. It parses and starts, but assertion fails on source helper's open-ramp +Z direction at `tests/mission-v2/cinematic-geometry-regression.cjs:34`:

```text
AssertionError [ERR_ASSERTION]: open tip must extend forward (+Z)
    at Object.<anonymous> (C:\Hackathon\output\ares-release\repo\tests\mission-v2\cinematic-geometry-regression.cjs:34:12)
...
actual: false
expected: true
```

3. Exact strict TypeScript command — exit code **0**, no diagnostics:

```text
node C:\Hackathon\node_modules\typescript\bin\tsc --noEmit --strict --noUnusedLocals --noUnusedParameters --skipLibCheck --target ES2020 --lib ES2020,DOM,DOM.Iterable --module ESNext --moduleResolution bundler --jsx react-jsx --baseUrl . src/game/mission/presentation/cinematics/timeline.ts src/game/mission/presentation/cinematics/MissionCinematic.tsx src/game/mission/presentation/cinematics/index.ts
```

## Independent actual Three.js transform audit

Transpiled the frozen actual TSX helper in memory and used the installed project `three` dependency's `Quaternion`, `Euler`, and `Vector3`. Checked the actual JSX strut quaternion/center/length box transform against hinge and foot-top endpoints, actual nested ramp and trim mesh transforms against helper corners, actual ramp mesh's local `[0, -RAMP_LENGTH, 0]` tip, all 8 ramp/trim/strut/foot corners and hull ground clearance across legs/ramp values 0, 0.5, and 1 (9 combinations), and finite results for NaN/+Infinity/-Infinity inputs individually and paired.

```json
{
  "actualThree": "installed project dependency",
  "stateCount": 9,
  "legEndpointMaxError": 2.220446049250313e-16,
  "rampCornerMaxError": 0,
  "trimCornerMaxError": 0,
  "rampTipMaxError": 0,
  "minActualSolidY": -0.10000000000000009,
  "groundY": -0.1,
  "minFootPadBottomY": -0.1,
  "nonfiniteInputs": "NaN and +/-Infinity individually and paired finite"
}
```

The near-machine-epsilon endpoint difference and `9e-17` ground delta are floating-point rounding within the specified `1e-9` tolerance. Actual Three geometry meets tested endpoint/corner/clearance expectations; the frozen geometry regression nevertheless fails its open-ramp-forward assertion, so the scoped regression is not green.

## Frozen source review

- Confirmed no unused `PANEL` declaration; exact strict no-unused compilation passes.
- `getLanderGeometryPose` uses `Quaternion.setFromUnitVectors(+Y, normalized strut delta)`, finite positive length guard, midpoint and quaternion tuple. Actual JSX strut mesh receives that quaternion and the corresponding center/length.
- Ramp tip uses the ramp mesh's actual local negative-Y endpoint transformed around the hinge. Actual nested mesh corners agree with helper corners.
- Public cinematic props/exports remain present. Focus target is captured before skip-button autofocus; cleanup restores the prior connected element and removes its focus marker. Timeline API, reduced-motion branching and phase sequencing remain covered by the unchanged passing timeline regression. Canvas camera updates remain scoped to the cinematic's own `useThree()` scene.
- No rendered visual acceptance is claimed.
