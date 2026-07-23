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
| result | Source parsing observed | `python -m compileall` exit 0 — byte-compiles the Python source to bytecode; the project is never executed |
| build/tests/security/prod | Build/Tests/Security/Production readiness not proven | not run |
| held | HELD — general public-repository execution not yet authorized | fixed-fixture |
| held_busy | HELD — one Safety Check is already running | single-job lock |
| refused | Refused: <reason> | private/ssh/etc |
| teardown_pending | Temporary sandbox removal: pending | not yet destroyed |
| pack_unknown | Evidence Pack: UNKNOWN | not complete |
| pause | Pause requested. FounderGate will stop at the next safe cleanup point. Immediate cancellation is not yet proven. | honest pause |

## Rationale for the `result` copy (normative)
`python -m compileall` **byte-compiles the Python source to bytecode**. It **does not merely search text**, and it **does not execute the project**. It proves nothing about runtime behavior, dependency correctness, native compilation, integration, safety, or production readiness. Never describe this check as "no compiler runs": a compiler does run, but no build system, package installer, test runner, linker, or native toolchain runs, and no repository-defined command is executed.

Founder-facing stage copy for this check is "running harness-owned source parsing check" (`src/founder_url_drop/ui/safety.js`, `src/safety_check/service.mjs`, `src/safety_check/run-job.sh` must all emit that exact stage name). Only labels changed: the machine classification token in `RUN_RESULT.json` and the Evidence Pack JSON key `compileability` are unchanged machine contracts. This register and `FOUNDER_SAFETY_CHECK_UI_TRUTH_CONTRACT.md` clause 6 must agree.
