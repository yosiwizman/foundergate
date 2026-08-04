# Independent Checker Report — Fine-Grained PAT Proof (intake proven, scope limits)

**Binding**
- Reviewer: independent read-only Checker (agent `a696b619f4efbb8b6`).
- Branch: `run/private-repo-fine-grained-pat-proof-ready-20260804T0810ET`, head `0c7e85d`.
- Posture: read-only; no GitHub writes, no provider calls, no token exposure.

**Verdict: CLEAN_WITH_LIMITS** — the intake is genuine, the scope-limit is honestly stated, and no token leaked.

---

All eight hard gates confirmed read-only against the committed branch (head 0c7e85d).

1. PASS — Token never exposed: KEYCHAIN_PAT_DISCOVERY fingerprint fgpat_99a4a9b8dd970464, is_old_failed_fingerprint false, token_value_seen_by_log/token_printed/token_written_to_disk all false. No real token literal anywhere (`git grep github_pat_[A-Za-z0-9_]{40,}` empty). Live-intake is read-only by construction: only `method: 'GET'` (https.request) and `https.get` — no POST/PUT/PATCH/DELETE; token placed only in `'Authorization': 'Bearer ' + token`; `liveIntake` returns only safe metadata.
2. PASS — New token + sandbox now accessible: PAT_SCOPE_VALIDATION fingerprint_changed_from_failed_token true, sandbox_status 200, read_only_scope_independently_verified false with honest caveat ("repo permissions object reflects owner role, not token grant; no write attempted (forbidden) → PARTIAL"). The repo_role_permissions {admin/maintain/push/triage/pull: true} is correctly identified as the owner-role artifact, NOT proof the token can write. Label is correctly the scope-limited variant, not full READY.
3. PASS — Actual intake bound: ACTUAL_FINE_GRAINED_PAT_EVIDENCE label FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS, intake_occurred true, exact_commit fb54698d5cbba4b55ef5aac2b189615154efc76e, all safety flags false. Replay (exercised): clean → REPLAY_VERIFIED; tampered → HOLD_REPLAY_MISMATCH. PRIVATE_REPO_MANIFEST file_count 9, SNAPSHOT_DIGESTS carries exact_commit + manifest_digest + archive_digest.
4. PASS — REDACTION_SUMMARY 5 held (personal_customer_data 2, database_url 2, api_key 1, private_key 1), fingerprints/counts only, no secret value, contents_never_sent_to_model true. WRITE_REFUSAL_RESULTS 30/30 all_held.
5. PASS — Self-tests ALL GREEN: authority 13/13, keychain_loader 7/7, runner 8/8, revocation 7/7, replay 5/5, refusal 30/30.
6. PASS — fine_grained_pat_index.json status FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS; not_proven explicitly includes "read-only scope INDEPENDENTLY verified → scope partial"; no FINE_GRAINED_PAT_PROOF_READY / *_SUPPORT_COMPLETE / GITHUB_APP_PROVEN / PRODUCTION_READY / SECURITY_CERTIFIED / MERGE_READY; 8 screenshots present.
7. PASS — claim-blocker clean (25 files, 0 violations); `read_only_scope_independently_verified: true` never asserted; CLAIMS_AND_LIMITS forbidden block lists read-only-scope-independently-verified and all other forbidden claims.
8. PASS — origin/main == 65fd01669f80…; PR #200 OPEN/DRAFT; no PR. Live-intake targets only OWNER_REPO (the sandbox); no non-sandbox repo contents fetched.

Scope-limits label assessment (the critical ask): neither overclaim nor underclaim. Not an overclaim — never claims the read-only scope was independently verified (explicitly false, listed in not_proven and forbidden-claims); correctly attributes push/admin to the owner role rather than the token. Not an underclaim — the intake genuinely occurred (intake_occurred true, sandbox 200, exact commit fb54698d bound, 9-file manifest + snapshot digests). No token leaked at any layer.

Non-failing note: PAT_SCOPE_VALIDATION carries sub-label `PAT_INTAKE_VERIFIED_SCOPE_PARTIAL` while the run outcome label is `FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS` — two consistent labels at two layers (scope-validation record vs run outcome); the index carries both correctly. All counts accurate.

**CHECKER_VERDICT: CLEAN_WITH_LIMITS**
