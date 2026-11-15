# Offline cache matching fix review — 2026-11-14

**Verdict: PASS for the frozen candidate tested; not a claim about later unbuilt changes.** Independent verification confirms the exact frozen build under test could bootstrap and enter the intro after the preview server was stopped and browser offline mode enabled. It does not prove every cached asset, route, browser, or future mobile-CSS-modified build works offline.

## Independent verification

- Focused test: `node --test tests/mission-v2/offline-cache.test.mjs` — exit 0; one test passed, zero failed.
- Harness validation: `node --check scratch/2026-11/week-46/2026-11-14_offline-bootstrap-check/offline-check.mjs` — exit 0.
- Runtime: managed job `pwsh-4386ce90d85a47dd` — exit 0. The fresh unique Edge profile opened `http://127.0.0.1:3002/?mission=frontiers` and showed `.mission-start-screen` with six buttons. Active cache `ares-v2-ares-cradle-0150a5a9a602f117e053` had 28 entries. After online reload, the page had controller `http://127.0.0.1:3002/service-worker.js`. With browser offline mode enabled and owned preview PID 23064 stopped (`SIGTERM`, `{ "code": null, "signal": "SIGTERM" }`), reloading the same URL displayed the same start screen and six buttons. Clicking `Begin field mission` changed the UI to intro text `A new landing site` with `Skip scene`. Console errors, page errors, and failed requests were all empty. Puppeteer closed the browser (`browserClosed: true`).
- Detailed independent evidence: [runtime-evidence.json](../../scratch/2026-11/week-46/2026-11-14_offline-bootstrap-check/runtime-evidence.json). The maker's separate successful runtime evidence is preserved as [maker-runtime-evidence.json](../../scratch/2026-11/week-46/2026-11-14_offline-bootstrap-check/maker-runtime-evidence.json).
- The maker reported (not independently rerun here) a strict `npm run build` pass (tsc + Vite) and a 28-file, 2,872,924-byte output.

## Source and focused-test review

The reported change is narrowly scoped to the generated worker's non-navigation exact-precache branch: same-origin, in-scope GET guard and exact absolute URL membership remain before `cache.match(request, { ignoreVary: true })`; cache miss still falls back to network. Navigation index fallback retains its prior matching behavior. The build policy version `static-ignore-vary-v1` participates in the generated cache identity, so this policy change creates a distinct cache (prior observed cache `ares-v2-ares-cradle-15b7bf689009d091bfef`; tested cache `ares-v2-ares-cradle-0150a5a9a602f117e053`). No guard was removed in the reviewed source. Read-only SHA-256 fingerprints: plugin `033CC4BEE313A4495958DE45AA22652CC761DB7929D1A4FACBF7EE04C3296A4C`; focused test `084601FFF6A5BAEB89061EB5F529C381B954D0BC292798AF0AC0F4A09D81FE6E`.

The focused VM test builds and executes the generated worker against fixture CacheStorage/Request-like stubs. It asserts the option is `ignoreVary: true`, cached JavaScript response MIME/body, exact-query unlisted request bypass, no cache lookup for unlisted or guarded requests (API, auth, external origin, POST, and navigation to files/asset paths), and unchanged navigation fallback matching. Test limitation: its stub returns the cached response based on the explicit option but does **not** emulate browser CacheStorage's native Vary mismatch for default matching. Thus it verifies the worker's chosen option and request boundaries, not a native CacheStorage Vary reproduction. The fresh-browser offline before/after observations provide runtime corroboration of the resulting app behavior, but not isolated proof that Vary was the sole prior failure cause.

## Scope

This review covers the source and frozen build observed on this run; it does not evaluate any subsequent source changes or rebuild. No checker-owned application, plugin, test, dependency, or configuration edits were made. Checker artifacts are limited to this review and the task scratch evidence/harness files.
