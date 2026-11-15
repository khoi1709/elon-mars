# Render-quality and FieldCamp-key verification

**Independent checker:** Luna. **Run:** 2026-11-14 13:08–13:12 +07. **Scope:** read-only source review plus fresh public-UI runtime check; no source repair or gameplay-state injection.

## Result

PASS for the checked items. The source fence was unchanged from the initial to final hash capture:

| File | SHA-256 (before = after) | Last modified (+07) |
|---|---|---|
| `src/game/mission/world/MissionWorld.tsx` | `789C298A2418C702FD5CFC55E3702FF913B2BD058145AC5ED98757FA78DCF6AD` | 2026-11-14 12:39:28.976 |
| `src/game/mission/world/FieldCamp.tsx` | `71209117027A22EA25AE79E9DE8A5EA4952E825073C53389E80115D6F1C66D79` | 2026-11-14 12:39:02.482 |

Source review: `MissionWorld` selects R3F Canvas DPR `1` for low and `[1, 1.5]` for high, conditionally enables Canvas shadows, and conditionally sets the directional-light shadow map to `2048×2048`. WebGL antialias remains statically `true` at context creation; this is not dynamically disabled. `FieldCamp`'s `box` helper accepts an optional React key, and mapped box-row calls supply stable row keys. The rendered world maps all five region camps.

## Fresh runtime

Started a fresh mission from the visible **Old Lake Shore** selection, used the visible **Skip scene** control, and changed quality through the visible Pause/Low/High/Return-to-field controls. Browser viewport was CSS `1280×800`, device scale factor `2`.

| State | Saved quality | Canvas bitmap | Canvas/CSS ratio | WebGL antialias |
|---|---|---:|---:|---|
| Fresh high | high | `1920×1200` | `1.5×` | true |
| Toggle 1 | low | `1280×800` | `1×` | true |
| Toggle 2 | high | `1920×1200` | `1.5×` | true |
| Toggle 3 | low | `1280×800` | `1×` | true |

The sequence was `high → low → high → low`; all three visible setting changes persisted (save revisions `2→3→4→5`). Read-only documented mission-save snapshots before and after show identical Leo pose, active rover, Leo return pose, every rover pose, station stock, and all region progress. Only intended quality settings/revisions changed.

Captured console warnings/errors: none. Page exceptions: none. Failed requests: none. Missing-list-key warning filter: zero matches; `OperationModule` warning filter: zero matches. This is absence of warnings in this fresh run, not proof for every browser or code path.

## Limits and cleanup

Actual Canvas DPR change was measured. Shadow enable/map-size behavior was source-verified; renderer shadow internals, FPS, frame time, GPU cost, and performance improvement were not benchmarked. Screenshot was not used as performance evidence. No source files were changed.

A temporary strict-port Vite server ran only at `http://127.0.0.1:3003/?mission=frontiers`; its owned process was stopped and port 3003 was confirmed free. The temporary Puppeteer/Edge run completed and closed its browser; no matching checker-owned Edge process remained. Port 3000 and other Edge processes were not touched. The helper and machine-readable capture are in `output/mission-v2/render-quality-keys/`.

The maker reported a prior exact strict `tsc --noEmit` exit 0 and 14 mission tests passing (14/0); this checker did not rerun those completed checks.
