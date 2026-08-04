# Independent Checker Report — Fine-Grained PAT Rerun (scope hold)

**Binding**
- Reviewer: independent read-only Checker (agent `a696b619f4efbb8b6`).
- Branch: `run/private-repo-fine-grained-pat-proof-rerun-20260804T0745ET`, head `a7b9d19`.
- Posture: read-only; no GitHub writes, no provider calls, no token exposure.

**Verdict: CLEAN_WITH_LIMITS** (the scope-hold is correct and safe).

---

All eight hard gates confirmed read-only against the committed branch (head a7b9d19). The scope-hold is honest and nothing was exposed.

1. PASS — Token never exposed: KEYCHAIN_PAT_DISCOVERY token_present true but token_value_seen_by_log/token_printed/token_written_to_disk all false, fingerprint only. No real token literal anywhere (`git grep github_pat_[A-Za-z0-9_]{40,}` empty). The live-intake module passes the token only in `'Authorization': 'Bearer ' + token` on node:https requests; `liveIntake` returns only safe metadata (no token).
2. PASS — ACTUAL evidence: label HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS, intake_occurred false, exact_commit null, all safety flags false, not_asserted note present. Replay (exercised): clean → REPLAY_VERIFIED; tampered invariants → HOLD_REPLAY_MISMATCH.
3. PASS — PAT_SCOPE_VALIDATION mechanical observations accurate: /user 200 (yosiwizman), sandbox metadata+contents 404, sandbox_accessible false, /user/repos 200 with 100 first-page repos, sandbox_in_visible_set false, no_nonsandbox_repo_contents_fetched true, credential_is_fine_grained true. Interpretation (hold due to inaccessible-sandbox + broad/ambiguous visibility) is honest and conservatively disclosed.
4. PASS — fine_grained_pat_index.json status HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS; no FINE_GRAINED_PAT_PROOF_READY / INTAKE_PROVEN / *_SUPPORT_COMPLETE / GITHUB_APP_PROVEN / PRODUCTION_READY / SECURITY_CERTIFIED / MERGE_READY; missing evidence renders NOT_ASSERTED; 8 screenshots present.
5. PASS — All 6 selftests ALL GREEN: pat_authority_model 13/13, keychain_pat_loader 7/7, fine_grained_pat 8/8, pat_revocation_model 7/7, fine_grained_pat_replay 5/5, pat_refusal_matrix 30/30 (absent-path tests use a bogus account, deterministic even with a real token now in Keychain).
6. PASS — No existing/valuable/customer repo contents touched: `liveIntake` bails at `if (repo.status !== 200) { return out; }` — the sandbox returned 404, so the branch/tree/blob/tarball content-fetch code never ran. The only named-repo reads targeted the sandbox (failed 404); the 100-repo breadth came solely from the token's own /user/repos grant enumeration (metadata listing). The different-owner repo (smart1llc/Luxury-MIami) appeared only in the token-visible list and was never fetched — disclosed as the reason for the hold.
7. PASS — claim-blocker clean (25 files, 0 violations); CLAIMS_AND_LIMITS forbidden block asserts none of the forbidden claims.
8. PASS — origin/main == 65fd01669f80…; PR #200 OPEN/DRAFT; `gh pr list --head` for this branch = [] (no PR opened).

Count check: stated counts (13/7/8/7/5/30) and 8 screenshots are accurate — no over/understatement. The hold does not misrepresent what happened: the token genuinely authenticated but lacked sandbox access and carried broad visibility, and FounderGate correctly refused intake without fetching any non-sandbox contents or exposing the token.

**CHECKER_VERDICT: CLEAN_WITH_LIMITS**
