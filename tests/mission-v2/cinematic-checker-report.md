# Cinematic independent checker report — FAIL

## Scope
Reviewed `C:\Hackathon\docs\ares-autonomy\IMPLEMENTATION_CONTRACT.md` (A2/ownership), `C:\Users\ADMIN\Downloads\MASTER_PLAN.md` lines 97–132, and the four actual sources:
- `src/game/mission/presentation/cinematics/timeline.ts`
- `src/game/mission/presentation/cinematics/MissionCinematic.tsx`
- `src/game/mission/presentation/cinematics/index.ts`
- `src/game/mission/presentation/cinematics/cinematics.css`

No `tests/mission-v2/cinematic*` tests or `docs/mission-v2/CINEMATIC_HANDOFF.md` were found. Only this checker report was written; source remains frozen. No browser QA performed.

## Verification
Strict, isolated no-emit TypeScript check, using the existing parent dependency:

`node C:\Hackathon\node_modules\typescript\bin\tsc --noEmit --strict --noUnusedLocals --noUnusedParameters --skipLibCheck --target ES2020 --lib ES2020,DOM,DOM.Iterable --module ESNext --moduleResolution bundler --jsx react-jsx --baseUrl . src/game/mission/presentation/cinematics/timeline.ts src/game/mission/presentation/cinematics/MissionCinematic.tsx src/game/mission/presentation/cinematics/index.ts`

**FAIL, exit 1:** `src/game/mission/presentation/cinematics/timeline.ts(147,80): error TS2554: Expected 1 arguments, but got 2.` `descentAltitude` is declared with one argument at line 62; line 147 passes `kind, p`. No emit occurred.

Executed the actual `timeline.ts` in memory using existing TypeScript `transpileModule` and Node `vm` (no output files). Seven pure assertions: **6 PASS, 1 FAIL**. Pass: durations (intro 40s, arrival 28s, departure 24s); clamp negative/NaN/Infinity/overrun; deterministic same-input frame; normal descent phase order and ramp closed during touchdown; departure time-shift → ramp-close → ascent → away with increasing offset; scenario telemetry labels. Fail: reduced-motion touchdown ramp-closed assertion—the actual frame returns `rampOpen = 0.6` at `timeline.ts:135`.

## API and material findings
`index.ts:1–4` publicly exports `MissionCinematic` and frame/duration API. Props are `{kind:'intro'|'arrival'|'departure'; baseCenter:[number,number]; reducedMotion:boolean; onComplete:()=>void}`. The 40-second intro is within the 35–45s requirement. Actual scene has its own fullscreen Canvas/camera and local lights, constructed lander/body/fins/engine/ramp, procedural Mars ground/context, captions and scenario-labeled telemetry. No imports of world/domain implementation or global store/state mutations were found. Normal-motion descent ordering and departure sequencing were independently asserted.

Reject pending corrections because:
- **Compile blocker:** stale two-argument call at `timeline.ts:147` (exact error above).
- **Contract violation:** reduced-motion touchdown opens the ramp (`timeline.ts:135`) before settling; test confirms.
- **Visual construction gap:** `MissionCinematic.tsx:45–47` landing-leg/foot meshes are static and never use `frame.legsDeployed`; feet extend below the scene floor at landed root position (mesh centers/size at lines 46–47 vs ground plane `Ground:63`). Ramp uses Z-axis rotation (`:35, :53`) rather than a clear horizontal hinge/pitch axis.
- **Focus restoration concern:** effect calls `skipRef.current?.focus()` before reading `document.activeElement` (`MissionCinematic.tsx:125–127`), so captured `previousFocus` is already the Skip button; cleanup restoration (`:150`) cannot restore the pre-dialog focus. RAF cleanup and once-per-presentation completion guard are present; timeline effect dependencies omit callback/baseCenter identity, so those changes do not restart it.

These are static/source and pure timeline checks only; no claim of visual polish, browser behavior, integration, or flight fidelity. Required correction: fix the one-argument altitude call and keep reduced-motion touchdown ramp closed; address leg deployment/ground clearance, ramp hinge, and actual focus capture/restore before accepting.