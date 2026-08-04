# Candidate Identity Reconciliation (A2)

## The mismatch
- ZIP `FINAL_STATUS.md` records **`19f280e…`** as the sealing head.
- The terminal and **both reviewers** cite **`931dd5314f373e22d717561daaf64c25a460f972`** (931dd53) as the evaluated head.

## Root cause (mechanical, benign)
`FINAL_STATUS.md` was written with a `__SEAL_HEAD__` placeholder, filled with the *then-current* HEAD `19f280e` (the first commit), and the commit was **amended** to stamp the seal head. The amend rewrote the commit to **`931dd5314f373e22d717561daaf64c25a460f972`**, which is the commit that actually **contains** `FINAL_STATUS.md`. So `19f280e` is the **pre-amend intermediate**, and the file text was simply written one step too early. There is **no divergent candidate** — the pushed remote head of the prior branch is `931dd5314f373e22d717561daaf64c25a460f972`, the local head is `931dd5314f373e22d717561daaf64c25a460f972`, the tree the reviewers read is `931dd5314f373e22d717561daaf64c25a460f972`.

## Resolution — explicit non-recursive two-SHA seal
- **evaluated_sha** = `931dd5314f373e22d717561daaf64c25a460f972` — the exact source candidate both reviewers verified.
- **evidence_commit_sha** = the V12.1 commit on `run/least-privilege-v12-1-reseal-credential-matrix-20260804T0700ET` that adds this reconciliation + the two reviewer reports (recorded after commit; non-recursive because the evaluated commit does not contain evidence about itself).

**Status: RECONCILED** (not `HOLD_CANDIDATE_IDENTITY_CONFLICT`).
