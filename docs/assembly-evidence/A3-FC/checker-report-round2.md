# Independent Checker Report — Round 2 (File Cabinet fix verification)

> **Plain English.** The same independent adversarial checker re-attacked the fixes for all four round-1 findings.
> Verdict: **PASS — all four CLOSED, no new holes; every leak path from round 1 is now blocked with real content.**

## Overall verdict: PASS

| Finding | Result | Why it holds |
|---------|--------|--------------|
| #2 symlink leak (HIGH) | **CLOSED** | `gated()` resolves `realpathSync`, requires the real path inside `realpathSync(root)`, and re-classifies by the real target (`mostRestrictive`). Blocked: `README.md→.env`, `roadmap.md→/etc/hosts`, dir-symlinks, symlink **chains**, sibling-prefix `../proj-evil/...`. |
| #1 broken `**` glob (HIGH) | **CLOSED** | single-pass `globToRe`; `**`→`.*` (cross-slash), `*`→`[^/]*`, `?`→`[^/]`. Escalation fires at every depth; no glob throws or fails to escalate. |
| #3 case/extension (MED) | **CLOSED** | lowercase + trim; expanded extensions. `.ENV`, `.env `, `.env.local.bak`, `.p8/.ppk/.pkcs12/.asc/.gpg`, `.pgpass`, `.htpasswd`, `server.KEY`, `passwd` → SECRET; `id_rsa.pub` excluded. |
| #4 uncaught throw (LOW) | **CLOSED** | `gated()` try/catch fails closed to `{allowed:false, UNKNOWN}` with no content; message uses class names only, never file content. |

**New holes introduced by the fixes:** none found.

## Residual notes (non-leaking) and disposition
1. `.envrc` / `wp-config.php` / `backup.env` / `prod.env` were UNKNOWN-blocked (fail-safe) but not labelled SECRET.
   **Applied post-round-2:** `isSecretPath` now labels these SECRET (test added), so the founder sees "protected",
   not "unclassified".
2. Theoretical `realpath → read` TOCTOU: the checker judged it **not a practical bypass** in this threat model
   (the attacker already owns the files and gains only what the process can already read). **Accepted risk /
   optional future hardening** (fd-based `O_NOFOLLOW` read) — not required for merge.

## Evidence
Post-fix + note-1 self-tests green: `V8A3-CLASSIFY-SELFTEST` and `V8A3-NO-SECRET-LEAK-PROOF` PASS; full suite green.
The sensitive FC-CLASS path is **checker-approved for merge** (round-2 PASS).
