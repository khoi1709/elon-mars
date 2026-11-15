# Campaign-path QA report

**Status:** provisional model-level pass; this is not browser campaign acceptance. The mission-state implementation was under concurrent hardening, so the observed passing source snapshot must not be treated as a final release gate. App/world/UI source was independently still in progress.

## Executed test

Command (from repository root):

```text
node --test tests/mission-v2/campaign-path.test.mjs tests/mission-v2/integration-state.test.mjs tests/mission-v2/activity-rules.test.mjs
```

Exit: `0`. Results: `10` tests passed, `0` failed. The campaign test executes two distinct legal reducer-event campaigns:

- start `impact`; visit `impact → dust → volcano → ice → lake`
- start `lake`; visit `lake → ice → volcano → dust → impact`

The event paths use `START`, actual-pose `MOVE`/`UNLOCK`, `OBSERVE`, `PAY_SURVEY`, shared activity progress helpers and reducer completion, `CHOOSE_OPERATION`, and `COMPLETE_REPORT` for each region. Serialized mission state is passed through `validateMission` after each dispatched major transition. The Lake test enters the rover, moves via reducer to each target approach, records evidence through `recordLakeEvidence` using the reducer rover pose, exits, and checks Leo is restored to the exact pre-entry pose. No activity-done/report/check flags are set to force progress.

Assertions include starting stock `12/4/5/4`, essential payment `10/3/4/3` when paid from an initially stocked own base, nonnegative stock, dust clean-panels immediate operation netting back to `10` energy, and idempotent repeat operation/report attempts. Both paths collect all five reports, record a legitimate HOLD with incomplete arrival-base checks, travel to the selected dust base before on-site checks, ignore stale response revision, approve only the exact fresh `saveRevision`, arrive and depart while preserving exploration state. Travel between unlocked bases preserves stock and Lake evidence.

## Source observation fence

SHA-256 values collected immediately before and after the final combined test command were identical:

- `src/game/mission/state.ts`: `CE25836A9852C20DEAAA236CE692820DA68A5842EDB53BB3CB82909B7E07F8A6`
- `src/game/mission/store.ts`: `E8EBBA3EEBF47B6E7C5B411E5FDB7345C11E78942A614CDFF313EAC462686239`
- `src/game/mission/activities/rules.ts`: `DBDE07EBE16EB4EF48FB9FCE64314099B4C1E1D47EC9A5BC1308BC6B5D59EDA5`
- `src/game/mission/content.ts`: `89B2B39CBA2213B4EE093CDC05782FF9F2A135311B9D199110F6EDBD2AF7FADB`
- `src/game/mission/contract.ts`: `E802849887F794E0EFB52EFAFEF93DFBDFD7D648701E7A51DC3D10BFF0F7F357`

This establishes source stability only during that test run, not final-owner freeze or final-gate status.

## Scope limits

This tests the reducer and shared pure activity rules, not the browser game, camera/capture acceptance, UI/world, or full campaign experience. Alternate optional operation branches, support-deficit recovery, stock transfers/reserved commitments, and any separate post-shift dust reward timing were not exercised. No product source was changed by this worker; only `tests/mission-v2/campaign-path.test.mjs` and this report are in scope.
