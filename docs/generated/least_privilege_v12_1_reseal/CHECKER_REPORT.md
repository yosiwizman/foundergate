# Independent Checker Report — Least-Privilege Read-Only Deploy Key Proof

**Binding**
- Reviewer: independent read-only Checker (agent `a696b619f4efbb8b6`).
- **evaluated_sha:** `931dd5314f373e22d717561daaf64c25a460f972` (the report verifies "against the committed branch (sealing head 931dd53)").
- Branch: `run/private-repo-least-privilege-deploy-key-20260804T0630ET`.
- Posture: read-only; the Checker made no GitHub writes and no provider calls.
- Captured verbatim into the V12.1 package (this report was produced after the prior ZIP was sealed, which is why the prior ZIP lacked it).

**Verdict: CHECK_PASS** (Checker allowed set → `CLEAN_WITH_LIMITS`).

---

All nine hard gates independently confirmed against the committed branch (sealing head 931dd53).

1. PASS — least_privilege_deploy_key.selftest 8/8 ALL GREEN; replay selftest 5/5 ALL GREEN.
2. PASS — DEPLOY_KEY_CREATION_RECORD read_only true, private_key_recorded false. ACTUAL_LEAST_PRIVILEGE_EVIDENCE credential_type READ_ONLY_DEPLOY_KEY, deploy_key_read_only true, broad_gh_auth_used_for_intake false, intake_auth_route ssh_deploy_key_identities_only.
3. PASS — REVOCATION_PROOF deleted true, key_still_in_repo 0, post_revocation_access_failed true, private_key_destroyed true (mechanical, not asserted).
4. PASS — SNAPSHOT_DIGESTS.json binds exact commit fb54698d5cbba4b55ef5aac2b189615154efc76e together with archive_digest + manifest_digest. Note: PRIVATE_REPO_MANIFEST.json is the 9-entry file inventory (no commit field of its own); the commit binding is carried in SNAPSHOT_DIGESTS, whose manifest_digest binds that manifest into the snapshot — so the exact commit is bound as required.
5. PASS — REDACTION_SUMMARY holds 5 fake-secret file entries (by_type: personal_customer_data 2, database_url 2, api_key 1, private_key 1), fingerprints only, no secret VALUE, contents_never_sent_to_model true. WRITE_REFUSAL_RESULTS 25/25 held (independent case recount: 25 cases, 25 held).
6. PASS — Directly exercised the replay module: clean evidence → REPLAY_VERIFIED (uses_ai_reasoning false); tampered invariants (deploy_key_read_only=false and broad_gh_auth_used_for_intake=true) → HOLD_REPLAY_MISMATCH.
7. PASS — Leakage scan of evidence dir + staged modules for PRIVATE KEY blocks / ghp_/github_pat_/gho_/ghs_ / Authorization: Bearer values returned empty. All 8 ui_proof screenshots present: blocked_customer_repo_gate, classifier_held, cred_lifecycle_proof, evidence_replay, least_privilege_overview, repo_identity_commit, revocation_proof, write_refusal_matrix (the two renamed — cred_lifecycle_proof.png, classifier_held.png — are present).
8. PASS — Status LEAST_PRIVILEGE_DEPLOY_KEY_PROOF_READY_WITH_LIMITS. The index "not_proven" list explicitly disclaims fine-grained PAT proof, GitHub App proof, customer/existing-repo support, private-repo-support-complete, and production/SaaS/commercial/security — none are claimed. claim-blocker clean (21 files scanned, 0 violations).
9. PASS — origin/main == 65fd01669f80094e...; PR #200 OPEN/DRAFT; `gh pr list --head` for this branch returns [] (no PR opened).

Proof-count check: coordinator's stated counts (8/8, 5/5, 25/25) are accurate. "5 fake secrets" is accurate as 5 held file entries; by_type totals 6 secret-type instances because fixtures/fake_env.example carries two types (api_key + database_url) — that is a per-type tally, not an inflated file count, so no overstatement. No understated or overstated counts found.

Limit: point-in-time read-only verification; the deterministic deploy-key/replay/refusal harness is the run's own; this proves one bounded synthetic least-privilege sandbox flow (READY_WITH_LIMITS), not general/customer/production private-repo support; the checker made no GitHub writes.

**CHECK_PASS**
