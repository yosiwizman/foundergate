# Static Code & Authority Analysis (Lane B) — false-green paths closed

- No hardcoded completed result on any GET route; `/api/state` returns NEUTRAL when no run (proven).
- No result is served without a run id / repository / exact commit (read from `runs/<id>`).
- No legacy/preloaded evidence route; results render only from a bound run's disk ledger.
- Cleanup shown only when the destroy stage is DONE (`teardown_complete` gate).
- No first-responsive-port reuse: launcher verifies canonical identity (service + ui_contract + repo_id);
  a foreign 200 → UNKNOWN_SERVICE (fail closed).
- No alternate founder route / no direct host execution (fixture only; SSH/private/credential REFUSED).
- No silent fallback: unknown identity → opens no unknown service, runs no check.
Proven by tools/qual/qualification.selftest.mjs, src/safety_check/canonical-identity.selftest.mjs,
tools/macos/launcher.test.sh.
