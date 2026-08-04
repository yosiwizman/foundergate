# Independent Gate Advisor Report — V12.1 Reseal + Credential Route Matrix (B8)

**Binding**
- Reviewer: independent read-only Gate Advisor (agent `a818b62b4d41b782c`, "Independent Terminal Advisor"), separate from the Checker.
- Branch: `run/least-privilege-v12-1-reseal-credential-matrix-20260804T0700ET`, head `d57cf381`; evidence commit `8ea8b330`; evaluated_sha `931dd53`.
- Posture: read-only; modified nothing, made no provider call.

**Verdicts:** Part A → **V12_1_RESEAL_READY_WITH_LIMITS** · Part B → **CREDENTIAL_ROUTE_MATRIX_READY_WITH_LIMITS**.

---

Both parts fully verified. The two-SHA seal is mechanically sound and the credential matrix keeps every route honestly separated.

**Gate Advisor Adjudication — V12.1 Reseal (Part A) + Credential Route Matrix (Part B)**
Branch head `d57cf381`, evidence commit `8ea8b330`, evaluated_sha `931dd53` · read-only, separate from Checker. Remote `origin/main` = `65fd01669f80…` (unchanged); PR #200 OPEN, untouched.

**PART A — legitimate, honest correction (not a re-proof, not an overclaim).**
- **Two SHAs bound correctly and non-recursively — mechanically confirmed.** `931dd53` (evaluated) and the stale `19f280e` share the **same parent** `6d7f2ab8` and carry identical commit messages — proving they are amend siblings (pre-amend vs amended), not a divergent candidate. `931dd53` genuinely contains the prior proof's `FINAL_STATUS.md`. The evidence commit `8ea8b330` is a **descendant** of `931dd53`, so the seal points strictly backward; the evaluated commit contains no evidence about itself. Non-recursion holds. Root cause (a `__SEAL_HEAD__` placeholder filled with the then-current HEAD one step before the amend) is accurate and benign. Correct resolution: RECONCILED, not CANDIDATE_IDENTITY_CONFLICT.
- **Reviewer verdicts faithfully represented.** The captured `GATE_ADVISOR_REPORT.md` is my own prior adjudication reproduced verbatim (GATE_READY_WITH_LIMITS), and the Checker verdict (CHECK_PASS / CLEAN_WITH_LIMITS) is recorded; `SEAL.json` binds both to `evaluated_sha`. This directly fixes the two documented defects.
- **No re-proof, no overclaim.** FINAL_STATUS states the underlying proof is "unchanged, re-affirmed" — the reseal captures reports and reconciles identity; it does not re-run the deploy-key proof or upgrade any claim.

**PART B — every route honestly separated; no new boundary crossed.**
- Of 7 modeled routes, **exactly one** is `PROVEN_WITH_LIMITS` (read-only deploy key). Fine-grained PAT, GitHub App, uploaded archive = `PLANNED_BLOCKED`; customer relay = `FUTURE_BLOCKED`; existing-founder-repo and customer-prod-repo = `TRUE_FOUNDER_GATE`. The invariant is enforced in code+tests; the 20/20 negative/refusal matrix is `all_held: true`. PAT/App readiness artifacts are **contracts, not proofs** — they refuse over-broad scope and HOLD unknowns.
- CLAIMS_AND_LIMITS asserts none of the forbidden claims. Hard boundary confirmed: no real credential created or used, no PAT/App/existing/customer repo touched, no provider call, no code exec, no deploy/bill/merge; PR #200 and protected `main` untouched. Nothing silently inherits "proven" from the deploy-key route.

No overclaim, no authority leak, no required corrections in either part. Optional housekeeping (unchanged): the founder-owned sandbox repo still exists (private) and can be deleted at will; its only credential is already revoked and destroyed.

**Part A — GATE_ADVISOR_VERDICT: V12_1_RESEAL_READY_WITH_LIMITS**
**Part B — GATE_ADVISOR_VERDICT: CREDENTIAL_ROUTE_MATRIX_READY_WITH_LIMITS**
