# Evidence Pack — Scope & Limitations (DRAFT — HUMAN LEGAL REVIEW REQUIRED)
- One exact commit per packet; results do not transfer to other versions.
- Checks performed = the named modules only (currently: exact-commit binding, immutable snapshot, archive-entry validation, harness-owned source parsing via `python -m compileall`).
- Source parsing observed ≠ build/tests/security/production. Those are NOT proven.
- What that observation is: `python -m compileall` byte-compiles the Python source to bytecode. It does not merely search text, and it does not execute the project. It proves nothing about runtime behavior, dependency correctness, native compilation, integration, safety, or production readiness. A compiler does run; no build system, package installer, test runner, linker, or native toolchain runs, and no repository-defined command is executed.
- runc standard-container isolation, not a microVM; OpenSandbox tested, not adopted.
- Public-repository fixed fixture only; private repos and customer code out of scope.
- Deletion/VM-destruction proven under observable state, not forensic erasure.
- No certification, compliance, or vulnerability-completeness claim.
DRAFT — HUMAN LEGAL REVIEW REQUIRED.
