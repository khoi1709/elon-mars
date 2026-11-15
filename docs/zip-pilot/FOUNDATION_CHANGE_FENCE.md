# Foundation/camera increment — exact preservation fence

The accepted ZIP pilot is a completed prior milestone, not a clean working tree. Compare this corrective increment to the maker's actual pre-edit baseline at scratch/2026-11/week-46/2026-11-15_studio-foundation-camera/prechange-input-hashes.json and prechange-git-status-v1-z.nul, not to HEAD or the older pilot182-file snapshot. Sole approved ownerdd48441d has already recorded192 source/test/root-config inputs and copies of its overlapping dirty files.

## Allowed baseline content differences

- src/modules/outpost-3d/HabitatDome.tsx — replace filled foundation/collar interior with actual hollow construction and existing passage cutouts, preserving outer profile/materials and all unrelated assemblies.
- src/modules/character/CameraRig.tsx — camera-only indoor/exterior selection/framing/safe damping, no actor/progress writes.
- src/modules/character/thirdPersonCamera.ts — pure camera geometry/visibility math and constraints, preserving accepted remote controls.

## Allowed additions

- Optional src/modules/outpost-3d/habitatFoundationGeometry.ts — one small pure geometry builder/definition consumed by the rendered foundation and actual geometry tests, not a second physics or map authority.
- tests/original-map/home-camera-visibility.test.mjs — focused full-body framing AND real occluder/line-of-sight behavior, not solely NDC projection.
- tests/original-map/habitat-foundation.test.mjs — optional separate focused actual-built-geometry tests if not combined above.

No existing test path is currently assigned for edits. If the existing camera harness has a legitimate changed assumption/import dependency, report it and assign one test-only owner after source closure. Keep old behavioral assertions and explain actual contract change; never delete/skip the failure merely to green the gate.

## Protected content

All other source/test/config hashes must equal this increment baseline. In particular:
- MarsTerrain plinth/ground, worldRegions sampler/bounds/routes, physicsEngine colliders/support/control constants, AstronautPlayer spawn/physics/model, rover dynamics/store/control paths.
- HabitatInterior, dome shell/shutters/ramp/comms/lights/exterior identity, unrelated materials/assets.
- Exploration/expedition/campaign stores, schema/storage keys, NASA science validation/catalog, inventory/slow survival/rewards.
- Accepted pilot App/MarsCanvas/readiness/manual/codex/practice source and tests, except legitimate runtime consuming the corrected CameraRig from within the existing scene.
- Package manifests, lockfiles, Vite/TypeScript/Tailwind/PostCSS/root HTML config, all unrelated tracked/untracked code/docs/output/browser profiles.

Accepted pilot anchors include CSS861B96FB8C9BD49D3ACE86F78831E7878082386001EE55DED70B0E65A78FC917 and ScienceCodexED65EEB0B23E2EEBDD59EB7E444149B680F2282B621A51183BBF90876134A197; those must remain unchanged. Do not restore from HEAD or reference3015 to eliminate pre-existing modifications.

## Final gate comparison

One Luna gate owner after maker write-release:
1. Positively discover actual source/test/config files and all baseline paths; record raw SHA-256 per file, no missing→zero/null→success masking. Count actual inputs rather than assuming192 after additions.
2. Report exact changed existing paths and additions against the new baseline; unexpected changes/additions/missing paths are findings, not silent fixes.
3. Capture full actual input hashes before and after tests/build/native where applicable. No source writes during independent QA; a later repair invalidates affected acceptance and needs another check.
4. Verify HEADd941b7051414390ebfb84e17f68607c1dfdc5faf /feature/five-frontiers-20261114/indexempty; no staging/publication. Reference3015HEAD098ef8307c5ed005c17b1301ef7d722f3e30c9f5 stays detached/tracked-clean with old untracked artifacts.
5. Raw NUL Git status MUST use --untracked-files=all, handle trailing empty and rename records, compare baseline path sets/status codes and actual existence. Use long-path-safe Node/Win32 extended-length probes; classic PowerShell Test-Path can falsely report old browserCacheStorage paths overMAX_PATH missing. Do not restore/delete/clean anything to conceal a probe error.
6. Exact ancestor TypeScript no-emit, all affected/new tests and established release subset, two cinematicCJS, normalnpmrunbuild. Report held orphan/external-source skip explicitly. Existing chunk warning does not authorize a dependency/chunk redesign or FPS guarantee.

Documentation for this corrective increment belongs in docs/zip-pilot alongside current Studio handoff/contract; single-use scripts, logs and screenshots stay under the target repository's temporal scratch hierarchy. Existing completed pilot reports remain historical evidence, not modified to pretend they tested future geometry.
