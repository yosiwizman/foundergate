# FounderGate Evidence Pack — Claim Register (Phase 7.1, Lane B)
| Claim | Label | Basis |
|---|---|---|
| exact commit binding | PROVEN | git ls-remote HEAD -> 40-hex; bound to all artifacts |
| immutable snapshot digest | PROVEN | archive + canonical manifest SHA-256 |
| in-sandbox manifest match | PROVEN | recomputed in sandbox == Pro manifest |
| compileability | OBSERVED | `python -m compileall` exit 0 |
| network isolation | OBSERVED | default-deny egress; example.com denied |
| docker socket | OBSERVED | absent inside workload |
| host mounts | OBSERVED | none (only provider execd-staging volume) |
| loopback port binding | OBSERVED | GUARD_PASS; 127.0.0.1 only |
| teardown | PROVEN | DELETE 204 / GET 404 |
| snapshot deletion | PROVEN | removed (observable state) |
| VM destruction | PROVEN | instance/dir removed |
| build | NOT_PROVEN | not run |
| tests | NOT_PROVEN | not run |
| security | NOT_PROVEN | runc; no audit |
| production readiness | NOT_PROVEN | design-only |
| general public execution | HELD | fixed-fixture restriction |
| private repositories | REFUSED | out of scope |
| missing evidence | UNKNOWN | fail-closed |
