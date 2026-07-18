# TBF-1 Decision Packet

**Host:** Mac16,11 / Apple M4 Pro. **Base:** facfd82. **Branch:** policy/test-before-founder-tbf1.
**Policy digest:** 6df22c4f6f53735ba66a62f9c8dcbc299e5f3c84daa57ba8a023680814947c4e · state ACTIVE (founder-authorized).

| Determination | Value |
|---|---|
| POLICY_ON_DISK_VERSIONED_MACHINE_READABLE | YES (.foundergate/policies + pointer + schemas) |
| POLICY_INTEGRITY_ENFORCED | YES (digest + non-weakenable invariant floor) |
| IMPACT_CLASSIFICATION_FAIL_CLOSED | YES (UNKNOWN blocks) |
| APPLICABILITY_MATRIX_DEFINED | YES (impact_matrix + doc mirror) |
| UI_EVIDENCE_LAW_ENFORCED | YES (headed/headless/a11y/false-green distinct + required) |
| WITNESS_READINESS_DERIVED_ONLY | YES (validator-only; builder cannot set) |
| MERGE_READINESS_DERIVED | YES (green CI alone insufficient) |
| SELFTESTS | 30/30 PASS |
| MUTATION_PROOFS | 11/11 PASS (guard fires) |
| CTO_PROMPT_LAW_TEMPLATE | YES (stop value TBF-HOLD: ACTIVE-POLICY-MISSING-OR-INVALID) |
| EVALUATION_CLASS_REGISTERED | YES (component-classification §4) |
| EXACT_SHA_CI | SUCCESS (tbf1-policy + selftests on 2060db5) |
| INDEPENDENT_CHECKER | TBF-CHECKER-CLEAN |
| FINAL_ADVISOR | TBF-ADVISOR: READY-FOR-INTEGRATION |
| MAIN_MERGE / OPENSANDBOX_ADOPTION / AKIOR / M1 | NO / NO / NO / NO |
