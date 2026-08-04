# FINAL STATUS — Fine-Grained PAT Read-Only Sandbox Proof (new token; intake proven)

**STATUS: FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS**

FounderGate performed **actual private-repo read-only intake** of the founder-owned sandbox using **only** the Keychain-stored fine-grained PAT.

## Gating checks (token in memory only; never printed)
- Fingerprint **`fgpat_99a4a9b8dd970464`** — **NOT** the old failed `fgpat_46a4db8921b7ccdd` (token was genuinely replaced).
- `GET /repos/.../sandbox` → **200** (was 404). Private: YES. Default branch: main.

## Intake (using ONLY the fine-grained PAT; not broad auth, not deploy key)
- Exact commit: **`fb54698d5cbba4b55ef5aac2b189615154efc76e`**
- Files: **9** · total bytes: **1104** · manifest + archive/snapshot digests bound (SNAPSHOT_DIGESTS.json).
- Secret classification: **5 fake secret files held** (fingerprints/counts only; contents never sent to any model).
- Structural: no path traversal · no symlink escape · no submodules.
- Evidence replay: **REPLAY_VERIFIED**. Write/abuse refusal matrix: **30/30**.

## Why "with scope limits" (honest)
The repository `permissions` object reflects the **owner's role** on the repo (admin/push=true for the owner), **not** the fine-grained token's granted scope; GitHub does not expose a fine-grained PAT's permission set via a read-only API, and FounderGate will **not** attempt a write to test refusal (forbidden). So read-only **scope** is asserted by the founder's token configuration (Contents:Read + Metadata:Read, sandbox-only, 7-day expiry) but is **not independently mechanically verified** here. The read-only **intake** itself is proven (only GET requests were made).

## Token safety
Token read from Keychain into process memory only; used solely in the HTTPS Authorization header; never printed, logged, screenshotted, committed, packaged, or placed in argv/disk. Redacted fingerprint only.

## Blocked / untouched
existing repo · customer repo · GitHub App · code exec · write/merge · provider · Gate 8 · deploy · bill — BLOCKED. PR #200 + protected `main` UNTOUCHED. **Never SHIP.**
