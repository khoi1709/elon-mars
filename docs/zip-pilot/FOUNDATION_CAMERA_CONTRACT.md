# Approved minimal foundation / camera corrective contract

## Human approval

User explicitly selected “Approve minimal foundation + camera repair (Recommended)” after being told that the filled solid slab intersects the spawn and a camera-only fix is invalid. Authorized change: habitat interior foundation/floor rendering to match existing walking ground, then third-person camera repair. Preserve exterior silhouette/materials, controls, physics authority, saves and all other world content. This is not a habitat redesign, actor relocation or campaign change.

CurrentStudioownerdd48441d alone owns HabitatDome.tsx, optional small pure habitatFoundationGeometry.ts, CameraRig.tsx, thirdPersonCamera.ts and at most two new focused foundation/visibility tests. No physicsEngine/worldRegions/AstronautPlayer/rover/store/UI/package changes. Old55b camera-onlymakerclosedNOedits atcorrectdependencyboundary. Current runtime statuses are in CURRENT_STATUS.md; no duplicate writer or source change while an independent final checker is running.

## Ground and geometry invariants

- Existing player feet/control ground remains−.4. The MarsTerrain plinth top already equals−.4 and is not edited. Actor spawn/pose/physics and save contents stay unchanged.
- Replace filled capped interior foundation/collar rendering with real annular wall/shell construction and an actual interior void. Outer radii/profile/y/material family remain. A cap may exist only across the annular wall, never across walkable interior.
- South and East existing walk apertures must not acquire new rendered low walls across their passage. Derive/reconcile exact limits with existing shared ring opening data; no new access rule or movement authority. Actor-center legal South range is x±(1.15−.34)=±.81 and East range z±(.65−.34)=±.31 with existing radius. A source test claiming x1.25 is a 'shared actor-radius passage' is incorrect (outside shared South raw half-width1.15); do not widen rendered openings arbitrarily or add angle+.035 merely to pass a mislabelled edge fixture. Use actual legal centers/footprint and finite crossing rays at each profile's real midpoint height.
- No global transparency/clipping, conditional hide/show or deletion of the habitat/foundation to reveal the actor. Dome, shutters, ramp, comms, lights and interior props remain untouched outside the approved foundation correction.
- Built-geometry checks must inspect actual vertex/ray intersections and world bounds. Repeating geometry params in a test fixture without using the actual mesh construction does not prove the rendered hole exists.

## Camera and controls

- Human camera remains third-person and supports non-inverted mouse/touch drag without mandatory pointer lock. Indoor frame must show the real actor and walkable floor, not a large occluding wall or only a viewport projection behind solid geometry.
- Valid indoor boom/azimuth/elevation must account for rendered habitat obstruction, support actor head/feet framing and safe ground/obstacle clearance. No per-frame heavy geometry mutation or new rendering loop.
- Preserve safe damping/final swept camera validation and finite/large-delta behavior. Avoid abrupt PI reversal/feedback when a preferred boom is blocked.
- Door entry/exit should transition safely without moving the actor, crossing solid walls or persistent popping. Camera is presentation, not a movement/progression capability.
- Remote rover remains independent with its hardware heading, W/S movement, quick release stop, A-left/D-right, and camera-only return to human. Human position is unchanged by remote handoff.

## Acceptance — mandatory independent checks

### Maker evidence

Capture a full pre-edit positive source/test/config hash baseline for this new increment and protect the accepted pilot. Run actual focused foundation/visibility tests, existing camera/input/dynamics/store checks and exact ancestor TypeScript command. If old fixtures legitimately conflict, identify exact assertion and approved contract change rather than removing/skipping checks. A quick genuine home native view is useful before closure; it is not independent acceptance.

### Different native QA after source closure

Use the existing3012 with fresh secure-default Edge and actual mouse/keyboard/touch; read-only runtime/R3F telemetry is allowed. No injected actor poses/progress/saves/store actions, synthetic game events, DOMclick or unsafe browser flags. No new server/app/port or3015 writes.

1. First-join Start closes normally; actual astronaut boots/torso/helmet are recognizable and not inside the solid slab. Capture normal play scale from home with body and floor visible.
2. Real right/up drag and repeated bounded up remain non-inverted and do not rotate the movement basis unexpectedly. Full actor framing and actual non-occluded sightline both matter.
3. Walk through the existing East airlock and return through real input, including the narrow waypoints. Verify both sides of the wall, interior/exterior transitions, safe camera clearance and no actor teleport.
4. Native stand/walk/run/stop/jump/double-jump/land near home: actor floor alignment/contact and camera safety remain, including walls/low objects. Do not certify collisions from a single screenshot.
5. Reach a normally accessible regional rover via real input if needed; native R handoff, W/S/release/A/D/orbit and exit preserve human XZ, remote authority and existing progress.
6. Reopen guide/map/codex or accepted optional practice where legitimately available; no camera input leaks into dialogs or source-level save/resource changes.

Read actual PNGs and state coverage/limits, not just screenshot counts. No face/boot occlusion hidden by helper math, no fixed-frame FPS guarantee. If a real remaining defect is outside assigned paths, report dependency before editing.

### Final release fence

Run all applicable focused tests and the established release subset (all original-map test.mjs except held orphanImpactFieldTools; allmission-v2 test.mjs; two cinematicCJS), exactNodeTypeScript and normalnpmrunbuild. Capture all actual source/test/config paths/hashes before and after; changed baseline paths must be exactly approved foundation/camera files and new focused tests. Accepted pilot inputs, world/physics/stores/art/locks and unrelated files must retain bytes from the new increment baseline. Git HEADd941featurebranch/indexempty and3015reference identity unchanged; full prior untracked path inventory preserved (use all-untracked raw NUL and long-path-safe probes). No staging/commit/push/deployment.
