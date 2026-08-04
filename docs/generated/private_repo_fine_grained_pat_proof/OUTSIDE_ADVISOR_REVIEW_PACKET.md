# Outside-Advisor Review Packet — Fine-Grained PAT Proof (intake proven, scope limits)

## Scope
Live rerun with a NEW correctly-scoped fine-grained PAT. Outcome: **FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS** — actual sandbox read-only intake via the Keychain PAT; read-only scope not independently verifiable (no write attempted). No token exposed; no non-sandbox repo touched.

## Independently checkable
- KEYCHAIN_PAT_DISCOVERY.json — new fingerprint fgpat_99a4a9b8dd970464 (≠ old fgpat_46a4db8921b7ccdd), token_value_seen_by_log:false.
- PAT_SCOPE_VALIDATION.json — /user 200, sandbox 200, repo_role_permissions (owner artifact), read_only_scope_independently_verified:false + note.
- ACTUAL_FINE_GRAINED_PAT_EVIDENCE.json — label FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS, intake_occurred:true, exact_commit fb54698d5cbba4b55ef5aac2b189615154efc76e, all safety flags false; replay REPLAY_VERIFIED.
- PRIVATE_REPO_MANIFEST.json / SNAPSHOT_DIGESTS.json — 9 files, commit + manifest + archive digests.
- REDACTION_SUMMARY.json — 5 held (fingerprints/counts only). WRITE_REFUSAL_RESULTS.json — 30/30.
- Live-intake module — GET-only; token only in Authorization header; owner-role caveat documented.

## Adversarial questions answered
1. **Token exposed?** No — memory only, header only; redacted fingerprint; no token literal in any file.
2. **Was it really the sandbox, read-only?** Yes for the sandbox (200, exact commit bound) and read-only in method (only GETs); read-only *scope* is asserted-not-independently-verified (documented, not overclaimed).
3. **Broad-auth / deploy-key / other repo?** No — fine-grained PAT only; no non-sandbox contents fetched; no broad-auth/deploy-key intake.
4. **Overclaim?** No — label is INTAKE_PROVEN_WITH_SCOPE_LIMITS, not READY_WITH_LIMITS; scope-verification limit stated plainly.

## Correct next step
Optional: an independent read-only scope verification would require a controlled, founder-authorized write-refusal test (a separate gate). Otherwise this is the honest ceiling for a fine-grained PAT read.
