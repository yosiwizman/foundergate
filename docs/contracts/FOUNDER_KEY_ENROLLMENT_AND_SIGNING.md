# Founder Key Enrollment & Signing Ceremonies (FG-LRCQ-ACT-028)

## Governed public-key authority
`docs/governance/FOUNDER_KEY_AUTHORITY.json` (`lrcq-founder-key-authority-1`) holds **public** keys only:
`active_keys` (≤ 1 current), `revoked_keys`. Public key = SPKI DER base64; fingerprint =
`sha256:<hex over raw SPKI DER>`. The loader (`founder-key-authority.mjs`) is fail-closed: rejects
missing/symlink/malformed/schema-mismatch/duplicate-fingerprint/multiple-current/fingerprint-mismatch/
malformed-SPKI/revoked/unknown, recomputes every fingerprint, and returns `NO_CURRENT_KEY` when empty. No
env var, CLI flag, or arbitrary path may replace this file in production. **This wave: `active_keys` is
empty — no real founder key is enrolled.**

## Enrollment ceremony (`tools/terminal0/lrcq/founder-key-enroll.mjs`)
Interactive TTY only (refuses piped/unattended). Generates an Ed25519 keypair; writes an **encrypted**
PKCS#8 private key to `~/.foundergate/keys/founder-ed25519.p8` (atomic `wx` create, mode 600, never
overwrites, never a symlink). Passphrase is read twice via hidden TTY — never from argv/env/pipe/file, never
logged, never persisted. Writes only a **public** enrollment candidate + safe receipt OUTSIDE the repo; it
never edits the governed authority file. Partial files are removed on cancel/failure. The private key never
leaves the encrypted file. A later, separately-reviewed wave mechanically imports only the public candidate.

## Signing ceremony (`tools/terminal0/lrcq/founder-sign.mjs`)
Interactive TTY only. Loads the fixed external encrypted key, proves its public fingerprint == the current
governed fingerprint, reads the **exact** founder-authorization bytes from `--authorization-file` (regular
file, owner-only, safe perms, no symlink, no normalization), computes `authorization_text_digest`, builds a
V4 payload from the frozen unsigned template + mechanically-derived current state, shows candidate/provider/
backlog/limits/exclusions/digests/fingerprint, requires a typed confirmation, reads the passphrase via
hidden TTY, signs Ed25519, immediately re-verifies, and writes the signed activation + safe receipt OUTSIDE
the repo. No partial activation on cancel/timeout/denied-key/verification-failure. Never prints/persists the
passphrase or private bytes. Forbidden: `--private-key`, `--public-key`, `--authority-file`, `--passphrase`,
env key/passphrase substitution, arbitrary schema, V3 output.

## Key lifecycle
- **Loss:** the encrypted key file is gone → re-enroll a new key; import its public entry; revoke the old
  fingerprint.
- **Compromise:** move the fingerprint to `revoked_keys`; any activation signed by it is refused.
- **Rotation:** enroll a new key, import as current, move the previous to `revoked_keys` (≤ 1 current).
- **Machine migration:** copy only the encrypted `.p8` (never decrypt it in transit); the fingerprint is
  unchanged.
- **Private-key prohibitions:** no private PKCS#8/unencrypted key/passphrase in Git, logs, receipts,
  reports, fixtures, snapshots, env, or argv — ever.

## Requirement
Real founder enrollment (importing one public key as `current`) must occur, in its own reviewed wave, BEFORE
the final runtime freeze and package generation used for an authorized run.
