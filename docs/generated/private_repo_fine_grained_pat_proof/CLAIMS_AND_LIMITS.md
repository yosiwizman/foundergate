# Claims & Limits — Fine-Grained PAT Proof (W9)

## Allowed claim (this run)
FounderGate **prepared and tested the fine-grained PAT proof path locally** (authority model, Keychain-only loader, refusal matrix, revocation model, evidence replay, UI), but **actual fine-grained PAT intake was NOT asserted because no safe Keychain PAT was present**. No token was requested from the founder; no secret was exposed.

## Forbidden claims (none asserted)
private-repo-support-complete · customer-repo-support-complete · GitHub-App-proven · existing-founder-private-repo-proven · customer-repo-proven · production/SaaS/commercial/paid-ready · security/compliance-certified · no-secrets-possible · no-risk · merge-ready · Codex-supported · Gate-8-complete.

## Hard boundary
No token requested/printed/packaged. No actual PAT intake. No existing/customer repo touched. No code execution, no provider call, no deploy/bill/merge. PR #200 + protected `main` untouched. **Never SHIP.**
