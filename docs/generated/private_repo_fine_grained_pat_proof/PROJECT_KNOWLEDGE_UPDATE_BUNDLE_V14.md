# Project Knowledge Update Bundle V14 — Fine-Grained PAT Proof (rerun: scope hold)

**Status: EVIDENCE SUMMARY (local, with limits). Not accepted governance. Authorizes nothing. Never SHIP.**

## This bundle (V14, rerun)
A fine-grained PAT is now stored in the Keychain. FounderGate read it into memory only (never exposed), attempted read-only verification, and **held at `HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS`**: the token returns 404 on the sandbox repo (no access) while its `/user/repos` visibility is broad (100+ repos across owners). No intake was performed; no non-sandbox contents were fetched; no token was exposed. Self-tests remain green (13/7/8/7/5/30); the live-intake driver correctly refused to fabricate a result on the 404.

## Correct remediation (founder)
Recreate the fine-grained PAT restricted to ONLY the sandbox repo with Contents:Read + Metadata:Read (no other repo access, no write/workflow/org-wide), store under the same Keychain service, and rerun.

## Still blocked / not claimed
actual-sandbox-intake · narrow-scope-verified · GitHub-App · existing-founder-repo · customer-repo · private-repo-support-complete · production/SaaS · merge-ready · Gate-8 · Codex. PR #200 + protected main untouched.
