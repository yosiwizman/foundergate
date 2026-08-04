# Project Knowledge Update Bundle V14 — Fine-Grained PAT Proof (gate held safely)

**Status: EVIDENCE SUMMARY (local, with limits). Not accepted governance. Authorizes nothing. Never SHIP.**

## New this bundle (V14)
FounderGate built and tested the **fine-grained-PAT read-only proof path** for the founder-owned private sandbox: a Keychain-only token loader (never prints/packages the value; redacted fingerprint only), a PAT authority+scope model (refuses classic-PAT / broad-auth / deploy-key / write / org-wide / workflow scopes), a 30/30 write-abuse refusal matrix, a revocation/expiry model, evidence replay, and a UI panel. **Actual PAT intake was NOT asserted** — the macOS Keychain held no safe fine-grained PAT (service `foundergate-github-fgpat-sandbox-readonly` not found). **No token was requested from the founder; nothing was exposed.**

## Result label
`TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED` — honest hold. Self-tests: 13/13 + 7/7 + 8/8 + 7/7 + 5/5 + 30/30.

## Relationship to V12.1 / V13
V12.1 resealed the deploy-key proof; V13 built the credential-route matrix (fine-grained PAT = PLANNED). V14 is the fine-grained-PAT gate itself, held safely pending founder token creation.

## Still blocked / not claimed
actual-PAT-intake · GitHub-App · existing-founder-repo · customer-repo · private-repo-support-complete · production/SaaS · merge-ready · Gate-8 · Codex. PR #200 + protected main untouched.
