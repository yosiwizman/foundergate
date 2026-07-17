# Founder URL-Drop UI — Copy Register (Phase 7, Lane B)

Every founder-facing string, with its truth basis. No string may overstate.

| Key | Exact copy | Truth basis |
|---|---|---|
| title | Check a public GitHub project | scope |
| public_only | Public repositories only | fixed public path |
| no_private | Private repositories are not supported | out of scope |
| fixture_note | Evaluation fixture | pypa/sampleproject only |
| primary_action | Run Safety Check | one primary action |
| commit_lock | Exact commit locked | resolved commit is the identity |
| result_pass_named | Compileability observed | compileall exit 0 |
| build | Build not proven | not run |
| tests | Tests not proven | not run |
| security | Security not proven | runc, not hardened |
| production | Production readiness not proven | design-only |
| no_customer | No customer code | fixture only |
| removed | Temporary sandbox removed | teardown + VM destroyed |
| candidate | OpenSandbox candidate — not adopted | not adopted |
| held_other | HELD — general public-repository execution not yet authorized | fixed-fixture restriction |
| unknown | UNKNOWN | missing evidence |
| stale | STALE | run older than evidence |
| pause | Pause & get help | always visible |

Rules: never show "PASS" alone — always "Compileability observed" with the three NOT-proven badges. Never "safe"/"secure"/"ready". Missing → UNKNOWN. Stale → STALE.
