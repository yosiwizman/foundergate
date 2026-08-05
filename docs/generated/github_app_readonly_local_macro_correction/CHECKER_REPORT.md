# Independent Checker Report — GitHub App Read-Only Local Macro (CORRECTION)

**Binding**
- Reviewer: independent read-only Checker (agent `a696b619f4efbb8b6`), fresh context; did not repair the candidate.
- **Evaluated SHA:** `5e97bd5ea638d463536dca53a8e1b55240e81b07` (tree `6db44d2` matches).
- Branch: `run/github-app-readonly-local-macro-correction-20260805T0126ET`.

**Verdict: CLEAN_WITH_LIMITS.** All eleven falsification attempts confirmed the correction holds; no defect could be triggered.

---

1. PASS — Authority allowlist enforced (25/25). Good sandbox-read-only spec → ACCEPTED_READONLY_SPEC; every over-broad variant refused with a specific reason (all/multi → HOLD_SCOPE_UNSAFE, wrong repo → HOLD_TARGET_NOT_SANDBOX, contents:write → HOLD_WRITE_PERMISSION_BLOCKED, actions → HOLD_FORBIDDEN_PERMISSION, unknown key → HOLD_UNKNOWN_PERMISSION, missing contents/metadata → respective HOLDs, null → HOLD_MALFORMED). 0 wrongly accepted; exact-allowlist match enforced.
2. PASS — Replay false-green resistance (13/13). Flipping each safety flag → 0 verified-while-unsafe, re-sealed with correctly recomputed digest: github_app_proven=true → HOLD_CONTRADICTORY_EVIDENCE; existing_valuable_repo_touched=true → HOLD_REPLAY_MISMATCH via the independent PROHIBITED_FLAGS loop (not the digest). Digest-valid-but-unsafe never verifies.
3. PASS — Contract semantic validation (24/24). All 12 semantically-invalid variants → OVERCLAIM_REFUSED/HOLD; 0 wrongly satisfied; the satisfied path exists for complete+valid evidence (non-vacuous).
4. PASS — Executable refusal matrix (41/41 held). 39 EXECUTABLE_REFUSAL_PATH each naming a real enforcement fn (evaluateAppAction, validateInstallSpec, scanForSecrets, replay, assertNotRealProof, validateContract); 0 literal==literal masquerade; 2 CATALOG_ONLY_POLICY_ASSERTION counted separately, not claimed as executed.
5. PASS — Secret scan clean: no real ghs_/ghp_/github_pat_/PEM-body/Authorization value; the only pattern hits are header-only fake fixtures in secret_guard + refusal_matrix.
6. PASS — Clean-extraction reproduced: copied only the github-app .mjs files into a fresh temp dir and ran two selftests there — ALL GREEN 25/25 and 13/13; zero third-party runtime deps / self-containment.
7. PASS — UI honest: packaged_ui status LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS; no forbidden labels; 8 screenshots present; UNKNOWN-on-missing present.
8. PASS — Recovery: RECOVERY_RESUME_TRANSCRIPT matches_recovery_state true, founder_involved false.
9. PASS — Isolation: changed-vs-origin/main is ONLY github-app source/tests + correction-doc paths; origin/main == 65fd01669f80…; PR #200 OPEN/DRAFT; no PR opened for this branch.
10. PASS — Non-recursive two-SHA binding: evaluated commit 5e97bd5 does NOT contain any reviewer report / TWO_SHA_EVIDENCE_SEAL (added post-review as a separate later commit).
11. PASS — Forbidden-claims scan clean: forbidden terms appear only inside the "Forbidden claims (none asserted)" enumeration; the "Allowed claim" section explicitly states it did NOT prove live GitHub App intake. FINAL_STATUS = LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS, next decision TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED — matches evidence.

Count check: all counts accurate and independently reproduced (authority 25/25, replay 13/13 over 26 prohibited flags, contract 24/24, refusal 41/41 = 39 exec + 2 catalog, simulator 8/8, secret_guard 11/11; refusal results total 41 all_held true; 8 screenshots). No way found to make the simulator or evidence read as a live GitHub App proof.

Limit: point-in-time read-only verification at the frozen SHA; LOCAL-ONLY corrected preparation — no live app/token/repo; live GitHub App read-only intake remains a true founder gate; harness exercised adversarially.

**CHECKER_VERDICT: CLEAN_WITH_LIMITS**
