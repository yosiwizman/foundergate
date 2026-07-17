# GitHub URL Intake Design (public repository, read-only, exact commit)

**Status:** DESIGN · Phase 5 · **no code executes during intake; no repository is cloned in this phase.** Sandbox execution of the acquired snapshot is a later, separately-gated stage.

## The public-repository flow
```
Founder enters a public GitHub URL
  → normalize URL (scheme/host/owner/repo; strip fragments, trailing .git)
  → verify allowed host (github.com only, first version)
  → resolve repository metadata (UNTRUSTED — used only to find the default branch)
  → resolve requested ref (requested_ref or default branch)
  → BIND EXACT COMMIT SHA  ← execution identity
  → acquire archive or shallow snapshot OF THAT EXACT COMMIT (into a temp acquisition workspace)
  → verify archive structure (reject traversal / absolute paths / unsafe symlinks / unsafe entries)
  → calculate snapshot SHA-256 digest (bound to the exact commit)
  → scan ONLY for intake-risk indicators (languages, package managers, licenses, secret-like files,
      large files, submodules, LFS) — NO execution
  → produce intake manifest (deterministic)
  → pass the IMMUTABLE snapshot (by digest) to the provider-neutral sandbox adapter (later stage)
  → retain evidence
  → delete the temporary snapshot
  → prove deletion
```

## Identity & trust statements (explicit)
- **A URL alone is not sufficient identity.** URLs are mutable pointers; the same URL can resolve to different content over time.
- **The exact commit SHA is the execution identity.** Everything downstream binds to the resolved commit, never to the ref or URL.
- **GitHub archive URLs are transport, not authority.** Where the bytes come from does not confer trust on the bytes.
- **Repository metadata is untrusted input** (used only to discover a default branch name).
- **README content is untrusted data.** **Build scripts are untrusted.** **Package-manager lifecycle scripts are untrusted.**
- **No code executes during intake.** Classification is static indicator-scanning only. Sandbox execution is a later gated stage.

## Normalization rules (first version)
- Accept only `https://github.com/<owner>/<repo>` (optionally `.git` suffix, optional `/tree/<ref>` or `/commit/<sha>` path forms mapped to a requested ref/commit).
- Reject: non-`github.com` hosts; `http://` (require HTTPS); `git@`/`ssh://` SSH URLs; `file://` and local paths; any `user:pass@` userinfo; any `?…token=`/credential query string; any embedded token pattern.
- Owner/repo must match GitHub's allowed name charset; no path traversal in owner/repo.

## Archive-structure safety (during future acquisition)
Reject any archive entry that: is an absolute path; contains `..` path traversal; is a symlink whose target escapes the snapshot root; is a device/fifo/socket; exceeds per-file or total size limits; exceeds the file-count limit; is an unresolved submodule (held); or is a Git LFS pointer requiring a separate fetch (held unless separately authorized).

## Private repository path — **PLANNED, NOT AUTHORIZED**
Not designed or built in this phase. Future options and the requirements each would impose:
| Option | Security | Revocation | Permission scope | Audit | User burden |
|---|---|---|---|---|---|
| **GitHub App installation** | App private key must be secured/rotated; per-install tokens short-lived | per-installation uninstall + token expiry | fine-grained repo/permission selection | webhook + token-use audit trail | customer installs an App, approves scopes |
| **Fine-grained temporary token** | token secret in transit/at rest; short TTL mandatory | explicit revoke + short expiry | scoped to selected repos/permissions | token-use logging | customer mints + pastes a token |
| **Customer-uploaded archive** | no live credential; verify upload integrity + provenance | n/a (no standing access) | none (single snapshot) | upload manifest + digest | customer exports + uploads an archive |
| **Customer-controlled relay** | trust boundary at the relay; auth to relay | customer stops the relay | whatever the relay exposes | relay-side logs (external) | customer runs/points a relay |

Selection deferred to a later, separately-authorized design; **do not select or build one here.** Any private path must add: explicit credential handling (never in plaintext logs/evidence), revocation, least-privilege scope, full audit, and minimal user burden.
