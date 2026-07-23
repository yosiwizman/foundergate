# FounderGate Evidence Pack — Claim Register (Phase 7.1, Lane B)
| Claim | Label | Basis |
|---|---|---|
| exact commit binding | PROVEN | git ls-remote HEAD -> 40-hex; bound to all artifacts |
| immutable snapshot digest | PROVEN | archive + canonical manifest SHA-256 |
| in-sandbox manifest match | PROVEN | recomputed in sandbox == Pro manifest |
| source parsing (Evidence Pack JSON key `compileability`) | OBSERVED | `python -m compileall` exit 0 — byte-compiles the Python source to bytecode; the project is never executed |
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

## Source-parsing claim — founder/partner-facing label and rationale (normative)
The founder- and partner-facing label for this claim is **Source parsing observed**.

`python -m compileall` **byte-compiles the Python source to bytecode**. It **does not merely search text**, and it **does not execute the project**. It proves nothing about runtime behavior, dependency correctness, native compilation, integration, safety, or production readiness. Never describe this check as "no compiler runs": a compiler does run, but no build system, package installer, test runner, linker, or native toolchain runs, and no repository-defined command is executed.

Only the human-readable label changed. The Evidence Pack JSON key `compileability` and the machine classification token written to `RUN_RESULT.json` are unchanged machine contracts and must not be renamed.
