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
| result_pass_named | Source parsing observed | `python -m compileall` exit 0 — byte-compiles the Python source to bytecode; the project is never executed |
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

Rules: never show "PASS" alone — always "Source parsing observed" with the three NOT-proven badges. Never "safe"/"secure"/"ready". Missing → UNKNOWN. Stale → STALE.

## Rationale for `result_pass_named` (normative)
`python -m compileall` **byte-compiles the Python source to bytecode**. It **does not merely search text**, and it **does not execute the project**. It proves nothing about runtime behavior, dependency correctness, native compilation, integration, safety, or production readiness. Never describe this check as "no compiler runs": a compiler does run, but no build system, package installer, test runner, linker, or native toolchain runs, and no repository-defined command is executed.

Founder-facing stage copy for this check is "checking source parsing" on the URL-drop surface (`src/founder_url_drop/server.mjs`). Only labels changed: the machine classification token in `GET /api/state` / `RUN_RESULT.json`, the `limitations` JSON keys, and the Evidence Pack JSON key `compileability` are unchanged machine contracts. This register, `FOUNDER_URL_DROP_UI_SPEC.md` and `FOUNDERGATE_EVIDENCE_PACK_CLAIM_REGISTER.md` must agree.
