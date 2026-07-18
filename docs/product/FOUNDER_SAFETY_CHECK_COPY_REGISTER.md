# Founder Safety Check — Copy Register (Phase 7.1, Lane A)
| Key | Copy | Basis |
|---|---|---|
| neutral | No check has run yet | initial state |
| run_started | Safety Check run | real job created |
| run_id | Run ID <id> | per-run binding |
| exact | Exact version locked | resolved commit |
| ports | Internal ports were not publicly exposed. | GUARD_PASS |
| docker | The check had no access to Docker controls. | SOCKET_ABSENT |
| net | Internet access was blocked during the check. | default-deny egress |
| result | Compileability observed | compileall exit 0 |
| build/tests/security/prod | Build/Tests/Security/Production readiness not proven | not run |
| held | HELD — general public-repository execution not yet authorized | fixed-fixture |
| held_busy | HELD — one Safety Check is already running | single-job lock |
| refused | Refused: <reason> | private/ssh/etc |
| teardown_pending | Temporary sandbox removal: pending | not yet destroyed |
| pack_unknown | Evidence Pack: UNKNOWN | not complete |
| pause | Pause requested. FounderGate will stop at the next safe cleanup point. Immediate cancellation is not yet proven. | honest pause |
