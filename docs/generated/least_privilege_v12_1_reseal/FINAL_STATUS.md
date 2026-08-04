# FINAL STATUS — Least-Privilege V12.1 Evidence Reseal

**STATUS: V12_1_LEAST_PRIVILEGE_EVIDENCE_RESEALED_WITH_LIMITS**

## Two-SHA seal (non-recursive)
- **evaluated_sha** = `931dd5314f373e22d717561daaf64c25a460f972` — the exact least-privilege source candidate both reviewers verified (branch `run/private-repo-least-privilege-deploy-key-20260804T0630ET`).
- **evidence_commit_sha** = recorded in `SEAL.json` (written after this reseal is committed; points backward to the evidence commit, never to itself). The witness ZIP contains `SEAL.json`.

## What V12.1 corrects (vs the prior sealed ZIP)
1. Adds **CHECKER_REPORT.md** (verdict CHECK_PASS / CLEAN_WITH_LIMITS) — was absent.
2. Adds **GATE_ADVISOR_REPORT.md** (verdict GATE_READY_WITH_LIMITS) — was absent.
3. Reconciles the seal-head mismatch: prior FINAL_STATUS embedded the pre-amend intermediate `19f280e`; the true evaluated head is `931dd5314f373e22d717561daaf64c25a460f972`. See CANDIDATE_IDENTITY_RECONCILIATION.
4. Reseals with both reviewer reports **inside** the package.

## Underlying proof (unchanged, re-affirmed)
One temporary repo-scoped **READ-ONLY deploy key** on the founder-owned private sandbox repo · intake used **only** that key (SSH IdentitiesOnly; broad auth used only to create+delete the key) · exact commit `fb54698d…` · 5 fake secrets held (no content exposed) · 25/25 write attempts refused · key **revoked** + post-revocation access **failed** + private key **destroyed** · evidence **REPLAY_VERIFIED** · headed UI proof 17/17.

## Reviewer verdicts (captured, bound to evaluated_sha)
- Checker (a696b619f4efbb8b6): **CHECK_PASS** → CLEAN_WITH_LIMITS.
- Gate Advisor (a818b62b4d41b782c): **GATE_READY_WITH_LIMITS**; independently confirmed the deploy key is gone via live `gh api` (`[]`).

## Untouched / blocked
origin/main `65fd0166` untouched · PR #200 OPEN/DRAFT untouched · existing repo · customer repo · code exec · write/merge · provider · Gate 8 · deploy · bill — all BLOCKED. **Never SHIP.**
