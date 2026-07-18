# ARLC-1 Advisor Record (final, read-only)

**Candidate:** `governance/arlc-1-lifecycle-controller` @ `d477e0e` (off verified main `e4f69db`).
**Separation of duties honored:** builder (Terminal-0) ≠ ARLC1-CHECKER (independent) ≠ ARLC1-RECHECKER (fresh independent). No component certified its own work.

## Verdict: ARLC1-ADVISOR: READY-TO-ACTIVATE (controller core)

The machine-enforced Autonomous Repository Lifecycle **law + controller core** is built, tested, independently checked, corrected, and re-checked clean.

### Delivered & qualified
- **Law**: `.foundergate/governance/autonomous_repository_lifecycle.json` (+ schema, + `.foundergate/pointers/active_repository_lifecycle_policy.json` with SHA-256 digests pinning policy, controller lib, safety floor `e1fbb8f0…`, and STACK-1F merge authority `af5b7489…`).
- **Controller** `tools/terminal0/arlc_lib.py`: action classification (UNKNOWN→**fail-closed** to founder gate), fixed 8-level precedence, separation-of-duties (duty-category rule; no component may self-certify), merge-eligibility engine (fail-closed on missing facts), signed HMAC eligibility-token connector boundary (head-drift / self-execution / method / empty-SHA guards), no-loss cleanup (protected-trunk/evidence/not-passed/ancestry guards).
- **Tests**: `tools/terminal0/tests/test_arlc.py` — **56/56 pass**, incl. 12 regression tests for every ARLC1-CHECKER finding.
- **Historical replay** (`historical_replay.py`, read-only, live git): the #151–#162 cumulative merge (`e4f69db`) is independently classified **OPERATIONAL_AUTONOMOUS + ELIGIBLE** — the qualified engine confirms it would autonomously permit exactly the merge that was performed, and the mutation tests prove it would have blocked had any predicate failed.
- **Governance**: founder authorization (verbatim), conflict/supersession report.

### Independent-checker cycle (honest disclosure)
ARLC1-CHECKER found **2 substantive fail-open/false-negative defects** (never-delete-main was exact-string only; self-certification passed SoD) + 2 hardening gaps. All fixed and covered by regression tests; ARLC1-RECHECKER confirmed CLEAN. Findings were **not** re-labeled — they were corrected.

### NOT yet built — bounded remaining work (honestly scoped, not claimed complete)
1. **Persistent LaunchAgent reconciler** (`com.software4all.foundergate.repository-lifecycle`) — **NOT installed.** A live daemon that autonomously writes `main` is a standing system change; per the ARLC-1 spec it may activate only after its OWN full qualification gate (tests + checker + Advisor + CI + Advisor-confirms-cannot-bypass). Held until built and qualified. Terminal-0 will not install a live auto-merge daemon without that complete gate.
2. **Bootstrap + continuation/shutdown guard + CLI** (`arlc_controller.py`) — library exists and is qualified; the runtime wrappers are not built.
3. **PANIC/HOLD runtime wiring** — encoded in policy; not runtime-enforced.
4. Non-blocking hardening from ARLC1-RECHECKER (SHA hex-format validation; deeper ref normalization) — recorded, non-exploitable.

### Does not authorize / does not weaken
Unchanged: no OpenSandbox adoption, no customer/private execution, no production, no release, no payments, no AKIOR, no provider activation, no self-hosted runners, no evidence rewrite. Safety floor, evidence/checker/Advisor, exact-SHA CI, qualification, and rollback requirements all intact. UNKNOWN fails closed.
