# FINAL STATUS — Least-Privilege Read-Only Deploy Key Proof

**STATUS: LEAST_PRIVILEGE_DEPLOY_KEY_PROOF_READY_WITH_LIMITS**

- One temporary repo-scoped **READ-ONLY deploy key** created on the founder-owned private sandbox repo (`read_only=true`).
- Actual private-repo read-only intake used **only** that deploy key (SSH `IdentitiesOnly=yes`); broad auth used only to create+delete the key.
- Exact commit `fb54698d5cbba4b55ef5aac2b189615154efc76e` · manifest + snapshot digests bound.
- 5 fake secrets held (no content exposed) · 25/25 write attempts refused.
- Deploy key **revoked** · post-revocation access **failed** (Permission denied) · private key **destroyed**.
- Evidence **REPLAY_VERIFIED** · headed UI proof **17/17** (8 screenshots).
- BLOCKED: existing repo · customer repo · code exec · write/merge · provider · Gate 8 · deploy · bill. PR #200 + protected `main` UNTOUCHED. Never SHIP.

Sealing head: 19f280e983a786755bcc3411f564e67f2eb1c92f
