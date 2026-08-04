# Claims & Limits — Fine-Grained PAT Proof (rerun; scope hold)

## Allowed claim (this run)
FounderGate read the founder's Keychain-stored fine-grained PAT into memory only (never exposed), attempted read-only verification, and **held** without performing intake because the token does not grant access to the sandbox repo (404) and presents a broad/ambiguous visibility surface. **No token was exposed; no non-sandbox repository contents were fetched.**

## Forbidden claims (none asserted)
actual-sandbox-intake-proven · narrow-single-repo-scope-verified · private-repo-support-complete · customer-repo · GitHub-App-proven · existing-founder-repo-proven · production/SaaS/commercial/paid-ready · security/compliance-certified · merge-ready · Codex-supported · Gate-8-complete.

## Hard boundary
Token never printed/packaged. No sandbox intake performed. No existing/customer repo contents fetched. No code execution, no provider call, no deploy/bill/merge. PR #200 + protected `main` untouched. **Never SHIP.**
