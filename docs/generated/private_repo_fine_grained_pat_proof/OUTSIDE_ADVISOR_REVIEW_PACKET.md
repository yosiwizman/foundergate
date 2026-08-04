# Outside-Advisor Review Packet — Fine-Grained PAT Proof (rerun; scope hold)

## Scope
Live rerun with a Keychain-stored fine-grained PAT now present. Outcome: **HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS** — token cannot access the sandbox (404) and shows broad visibility (100+ repos); no intake performed; no token exposed; no non-sandbox contents fetched.

## Independently checkable
- Self-tests: authority 13/13 · Keychain loader 7/7 · runner 8/8 · revocation 7/7 · replay 5/5 · refusal matrix 30/30.
- KEYCHAIN_PAT_DISCOVERY.json — token_present:true, fingerprint only, token_value_seen_by_log:false.
- PAT_SCOPE_VALIDATION.json — mechanical observations: /user 200, sandbox 404, /user/repos 100+, sandbox_in_visible_set:false, no_nonsandbox_repo_contents_fetched:true.
- ACTUAL_FINE_GRAINED_PAT_EVIDENCE.json — label HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS, intake_occurred:false, all safety flags false, not_asserted note; replay REPLAY_VERIFIED.
- Live-intake module (fine_grained_pat_live_intake.mjs) — GET-only; token only in Authorization header; refused to fabricate on 404.

## Adversarial questions answered
1. **Was the token exposed?** No — read into memory only, never returned/printed/packaged; no token literal in any file.
2. **Did FounderGate touch existing/valuable/customer repos?** No repository CONTENTS were fetched other than the (failed) sandbox reads. The broad list came from the token's own `/user/repos` grant enumeration; no named non-sandbox repo was read.
3. **Is the hold honest?** Yes — the token genuinely 404s on the sandbox and enumerates broadly; FounderGate refused intake rather than force it, and asserted no success.
4. **Any false green?** No — status is a HOLD; UI shows the hold + remediation; evidence replay verifies the hold record's consistency.

## Correct remediation
Founder recreates a sandbox-only, Contents:Read + Metadata:Read fine-grained PAT (no other access) and reruns.
