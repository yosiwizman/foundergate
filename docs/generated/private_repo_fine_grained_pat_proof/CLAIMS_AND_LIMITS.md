# Claims & Limits — Fine-Grained PAT Proof (intake proven, scope limits)

## Allowed claim (this run)
FounderGate proved **actual private-repo read-only intake** against the founder-owned private sandbox using a **Keychain-stored fine-grained PAT** — without token exposure, without broad-gh-auth intake, without deploy-key intake — with exact commit/manifest/snapshot binding, fake-secret classification, a 30/30 write-refusal matrix, evidence replay, and UI proof. The read-only **scope** is asserted by the founder's token config but **not independently mechanically verified** (owner-role permissions artifact; no write attempted) → **scope limits**.

## Forbidden claims (none asserted)
private-repo-support-complete · customer-repo-support-complete · GitHub-App-proven · existing-founder-repo-proven · customer-repo-proven · read-only-scope-independently-verified · production/SaaS/commercial/paid-ready · security/compliance-certified · no-secrets-possible · no-risk · merge-ready · Codex-supported · Gate-8-complete.

## Hard boundary
Token never printed/packaged. Intake used only the fine-grained PAT (Keychain), HTTPS header only. No existing/customer repo touched. No code execution, no build/test from repo, no provider call, no deploy/bill/merge. PR #200 + protected `main` untouched. **Never SHIP.**
