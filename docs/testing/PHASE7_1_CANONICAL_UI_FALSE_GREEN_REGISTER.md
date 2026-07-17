# Phase 7.1-Q False-Green Register

Each false-green path and the guard that prevents it (proven in qualification.selftest.mjs / cache-a11y / service.mjs):
- completed result before a run → `/api/state` NEUTRAL; result-grid hidden (PASS).
- result without run id / repo / commit → result is read from `runs/<id>` and carries run_id+repo+exact_commit (PASS).
- stale result marked current → hard-reload + injected stale localStorage stay neutral (PASS).
- cleanup shown before proof → `teardown_complete` gate requires the destroy stage DONE (PASS).
- first-responsive-port reuse → launcher verifies canonical identity; foreign 200 → UNKNOWN_SERVICE (PASS).
- old UI served as canonical → only the neutral-first `safety.html` is served at `/`; no alternate active route (PASS).
- unknown run id → 404, never a fabricated result (PASS).
- non-fixture / SSH / credential URL treated as runnable → HELD / REFUSED (PASS).
