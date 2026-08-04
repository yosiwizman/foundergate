# Claims & Limits — Least-Privilege Read-Only Deploy Key Proof (W8)

## What IS proven (local, with limits)
- FounderGate created **one** temporary **repo-scoped READ-ONLY deploy key** on the **founder-owned private sandbox repo** (`read_only=true`, confirmed by the GitHub API).
- The actual private-repo **read-only intake used ONLY that deploy key** (SSH, `IdentitiesOnly=yes`); the broad GitHub auth was used **only** to create and delete the key — never for the intake.
- Exact identity bound: repo · **private:YES** · exact commit · canonical manifest · snapshot + archive digests.
- 5 fake secret-like files were **held/redacted**; contents were **never sent to any model**.
- 25/25 write/mutation attempts **REFUSED** (a read-only key cannot write; the read-only path exposes no write/exec/provider capability). No real GitHub mutation was attempted.
- The deploy key was **revoked/deleted**; **post-revocation access failed** (Permission denied); the **private key was destroyed** before sealing.
- Evidence **replays deterministically** (REPLAY_VERIFIED), independently of any model.

## What is NOT proven / NOT claimed
- NOT fine-grained-PAT proof · NOT GitHub-App proof.
- NOT customer-repo or existing-valuable-repo support · NOT private-repo-support-complete.
- NOT production / SaaS / commercial / paid / security- or compliance-certified.
- No provider call, no code execution, no deploy, no billing, no outreach, no merge.

## Hard limits (blocked; each needs a separate founder gate)
existing repo · customer repo · code execution · write/merge · provider call · Gate 8 · deploy · bill — all **BLOCKED**. PR #200 and protected `main` **UNTOUCHED**. **Never SHIP.**
