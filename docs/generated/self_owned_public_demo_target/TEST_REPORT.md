# Test & Scan Report — Rehearsal Chain (Obj2 + Obj3)
| Check | Result | Classification |
|-------|--------|----------------|
| Demo self-test | 30 / 30 green (was 27; +3 for removeTask) | DEMO_SUITE_PASS |
| Full FounderGate suite (regression) | 117 / 117 green | FULL_SUITE_PASS |
| CLI smoke | runs; honest IN_PROGRESS | CLI_SMOKE_PASS |
| Objective 2 (removeTask) | removes; throws on unknown id; no renumber | OBJ2_PASS |
| Objective 3 (all-done honesty) | ALL_DONE_LOCAL_DEMO; SHIP unreachable | OBJ3_PASS |
| Change boundedness | 3 code files + docs, in scope | SCOPE_BOUNDED_PASS |
| Secret scan | 0 | SECRET_SCAN_PASS |
| Network in code | 0 | NETWORK_SCAN_PASS |
| Forbidden-claim scan | 0 | CLAIM_DISCIPLINE_PASS |
| Provider / spend / contact / publish / deploy | 0 / $0 / 0 / 0 / 0 | NO_PROVIDER_NO_SPEND_PASS |
