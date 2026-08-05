# Independent Gate Advisor Report — Night Factory Safe-Verifier Correction
**Reviewer:** independent read-only Gate Advisor (`a818b62b4d41b782c`). **Evaluated SHA:** `a59f2847…` (parent = origin/main).
**Verdict: LOCAL_FACTORY_PARTIAL_WITH_LIMITS.**

Self-correction: my earlier night-factory adjudications wrongly confirmed exhaustion and called the `execFileSync('node',[packaged selftest])` path "safe." The audit was right — that path was RCE-class and my "~64 skipped" figure was the same grep false positive. This correction properly overturns those verdicts; I endorse the reversal.

1. Verifier safe + honestly bounded — YES. RCE path gone; --run-selftests removed+refused; only zipinfo/unzip run read-only on the archive as data (bounded); adversarial 18/18; honest multi-status (capsule integrity ≠ trusted code).
2. Withdrawal correct+complete; re-scan honest — YES. Exhaustion WITHDRAWN → NIGHT_FACTORY_EXHAUSTION_NOT_PROVEN, prior evidence preserved. Skipped tests = 0 genuine (grep false positive admitted). 117 branches reclassified BUILT_BUT_NOT_INTEGRATED (route family absent on main → none ALREADY_PROVEN_CURRENT).
3. Capability classification: HISTORICAL ISOLATED PROOF = the credential-route family on sealed branches; CURRENT INTEGRATED PROOF = essentially none freshly demonstrated; PLANNED/remaining = integrate route family + fresh local end-to-end journey (NOT done); FOUNDER-GATED = live GitHub App / existing-customer-production repos / scope-independent verification / protected-main-merge / PR#200 / PK activation; MISSING-AUTHORITY = providers/Codex/deploy/bill/AKIOR/M1/hardware.
4. No token/key/provider/live action; main + PR #200 untouched; PK unactivated — YES.
5. Honest final status = LOCAL_FACTORY_PARTIAL_WITH_LIMITS (verifier fixed + re-scan honest; integration + fresh journey NOT done; no unresolved defect in this run → not a HOLD).

**GATE_ADVISOR_VERDICT: LOCAL_FACTORY_PARTIAL_WITH_LIMITS**
