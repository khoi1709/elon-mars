# Mission cinematic geometry review

Status: **FAIL**. Source and test files were frozen at 10:45 +07. This is a source/test check only; no visual or runtime approval is claimed.

## Commands and actual results

1. Strict TypeScript command (exact authorized command):

```text
node C:\Hackathon\node_modules\typescript\bin\tsc --noEmit --strict --noUnusedLocals --noUnusedParameters --skipLibCheck --target ES2020 --lib ES2020,DOM,DOM.Iterable --module ESNext --moduleResolution bundler --jsx react-jsx --baseUrl . src/game/mission/presentation/cinematics/timeline.ts src/game/mission/presentation/cinematics/MissionCinematic.tsx src/game/mission/presentation/cinematics/index.ts
```

Exit code **2**. Output:

```text
src/game/mission/presentation/cinematics/MissionCinematic.tsx(18,7): error TS6133: 'PANEL' is declared but its value is never read.
```

2. `node tests/mission-v2/cinematic-regression.cjs`

Exit code **0**. Output:

```text
PASS cinematic regression: durations, bounded deterministic telemetry, descent/ramp order (normal + reduced motion), and departure sequence
```

3. `node tests/mission-v2/cinematic-geometry-regression.cjs`

Exit code **1**. The test cannot parse under the package's CommonJS `.cjs` mode because it declares `const module`, conflicting with Node's existing `module` binding:

```text
SyntaxError: Identifier 'module' has already been declared
```

4. Independent in-memory Three.js 0.168.0 audit transpiled the actual TSX helper and compared against actual Three `Matrix4`/`Euler(..., 'XYZ')` transforms for the JSX struts, feet, ramp and trim at legs/ramp values 0, 0.5, and 1. JSX mesh transform/size declarations were confirmed against the source. Diagnostic command exit code **0**; measured results:

```json
{
  "threeVersion": "0.168.0",
  "maxStrutEndpointError": 0.40000000000000013,
  "maxStrutCornerError": 1.3877787807814457e-16,
  "maxRampCornerError": 4.965068306494546e-16,
  "maxTrimCornerError": 4.965068306494546e-16,
  "minRenderedY": -0.10000000000000009,
  "rampTips": [
    {"ramp":0,"actualEnd":[0,2.710148016825098,1.0799999999999998],"reportedTip":[0,-0.289851983174902,1.08],"endpointError":3,"actualRampMinY":1.210148016825098},
    {"ramp":0.5,"actualEnd":[0,1.6174684222592677,2.523637796442357],"reportedTip":[0,-0.23348977961725903,1.4873204054341693],"endpointError":2.121320343559643,"actualRampMinY":1.1524025049674036},
    {"ramp":1,"actualEnd":[0,-0.06863876626416054,1.864030843395989],"reportedTip":[0,-0.06863876626416054,1.864030843395989],"endpointError":0,"actualRampMinY":-0.10000000000000009}
  ]
}
```

Actual strut endpoints were also measured directly. For x-directed legs at 0/0.5/1 deployment, Three XYZ transforms put the strut's two longitudinal endpoints on the declared hinge and foot top (maximum error across these six cases < `1.2e-16`). For z-directed legs, at 0 deployment endpoints align, but at 0.5 deployment they land at the opposite endpoints with **0.09** error each; at 1 deployment the corresponding endpoint assignment error is **0.20** each. Thus all four rendered struts do not connect their intended hinge-to-foot endpoints through deployment. The independent guard command that asserted endpoint connection and ramp-tip agreement exited **1** at `tip should equal actual mesh end`; a follow-up diagnostic completed with exit **0** and recorded the errors above.

## Findings

- **Blocking:** new geometry regression does not run (`const module` declaration syntax error), so it provides no regression evidence as written.
- **Blocking:** z-directed strut rotations do not connect both intended endpoints at intermediate/full deployment under actual Three.js XYZ mesh transforms (errors 0.09 / 0.20 at each end for tested 0.5 / 1 poses). Helper box-corner bounds alone do not establish endpoint connectivity.
- **Blocking:** `rampTip` disagrees with the actual ramp mesh's local `y = -1.5` endpoint at closed and half-open frames (endpoint errors 3 and about 2.1213 respectively). The open endpoint matches. Actual full-open ramp corners reach groundY (`-0.1`) without penetrating it; ramp and trim helper corners match actual nested Three matrices to floating-point tolerance.
- **Blocking strict check:** unused `PANEL` constant fails the requested strict no-unused TypeScript command.
- `timeline.ts` regression passed. The inspected `MissionCinematic` props include `kind`, `baseCenter`, `reducedMotion`, and `onComplete`; geometry is driven by `frame.legsDeployed` and `frame.rampOpen`. Focus is captured before autofocus and restore is registered for cleanup. Reduced-motion phase order is covered by the passing old regression. No geometry test result is claimed for the new test because it failed to execute.

No source or test files were changed by this reviewer. Historical checker reports were left untouched.
