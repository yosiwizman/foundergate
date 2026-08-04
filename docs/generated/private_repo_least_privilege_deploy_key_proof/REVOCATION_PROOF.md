# Revocation Proof (W5)
- Deploy key id 159240599 **DELETED** from GitHub (exit 0).
- Verified: key no longer appears in repo deploy keys (present count = 0).
- **Post-revocation read-only access with the same private key FAILED** (git ls-remote exit 128 → access denied) — the revoked credential no longer works.
- Local private key material **destroyed** (true); ephemeral credential root excluded from git + final ZIP.
