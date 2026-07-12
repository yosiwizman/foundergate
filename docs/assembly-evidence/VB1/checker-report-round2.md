# VB1 — Independent Adversarial Executor Checker Report (round 2)

> **Provenance:** produced by the same INDEPENDENT read-only adversarial checker subagent (builder ≠ checker),
> resumed to re-review the round-1 fixes against the ACTUAL fixed source. Committed verbatim as evidence.

**VERDICT: ALL SEVEN ROUND-1 FINDINGS CLOSED — mergeable.** HIGH-1/HIGH-2/MEDIUM-1/2/3/LOW-1 verified CLOSED by re-running the exact round-1 repros plus fresh attacks (all refused); LOW-2 residual is acceptable. Two NEW observations are LOW / non-blocking (a caller-substitutable `verifier` capability that is inert in VB1, and a commit-phase symlink-TOCTOU that needs a tampered manifest **plus** a concurrent race and is closed when the AKIOR-#8 lock is honored). Nothing found that lets untrusted data drive execution, escape the token gate, or turn rollback into an arbitrary-write primitive.

Re-verified against the current source: `executor.mjs`, `session-token.mjs`, `rollback.mjs`, new `atomic-store.mjs`. Committed suite green: 29 VB1 proofs (atomic-store 4 · executor 7 · rollback 8 · session-token 10).

## HIGH-1 — Forgeable act edge → CLOSED
The boolean `approval.wired===true` is gone; `act()` now calls `verifyApproval()` for real, which HMACs the bound fields (`work, action, nonce, rollbackable`) against a VB3-held `verifier.secret` via `timingSafeEqual`. `VB3_VERIFIER = null` in VB1 ⇒ `actEdgeWired()` is false ⇒ `verifyApproval` returns false for any input. Re-ran round-1 repro + fresh attacks: forged `{wired:true}` → NO_WIRED_APPROVAL ran=0; forged-sig no-verifier → NO_WIRED_APPROVAL ran=0; replay signed approval for other work → APPROVAL_MISMATCH; tamper action after signing → sig no longer matches; non-hex/empty/number sig → false (no throw); correct sig (test verifier) → true. Unforgeability + field binding + HMAC hygiene all hold; `actEdgeWired()` is now the real predicate.

## HIGH-2 — Rollback arbitrary write → CLOSED
`backupStores` requires a containment `root`, canonicalizes it (realpath of deepest existing prefix, /var↔/private/var + symlinks), refuses out-of-root store paths at backup time, records root+backup_dir in the manifest. `rollbackFromBackup` pre-verifies every entry — including `absent` deletes — is within the recorded root (PATH_ESCAPE, zero writes) and every backup is inside the recorded backup_dir + sha-matched, before any write. Out-of-root overwrite → PATH_ESCAPE; out-of-root delete (absent:true) → PATH_ESCAPE; `..` traversal → PATH_ESCAPE; symlink-inside-root→outside → PATH_ESCAPE; backup outside backup_dir → INCOMPLETE_RESTORE; legit rollback → OK restored=1; backupStores out-of-root → throws.

## MEDIUM-1 — Immortal token on unparseable expiry → CLOSED
`use()` returns MALFORMED when `!Number.isFinite(Date.parse(expires_at))` — fail-closed.

## MEDIUM-2 — Empty scope = wildcard → CLOSED
`use()` requires a non-empty scope containing the exact action; empty scope authorizes nothing (default-mint + action → OUT_OF_SCOPE).

## MEDIUM-3 — Missing action skips scope → CLOSED
`action == null` is OUT_OF_SCOPE in `use()`; `act()` rejects non-string/empty action up front with NO_ACTION (before the token gate).

## LOW-1 — Net-zero TOCTOU / no lock → CLOSED (mitigation shipped)
New `atomic-store.mjs` `withFileLockSync` (O_EXCL create, stale reclaim, release in finally). Mutual exclusion + release-on-throw verified. Closes LOW-1 when the caller wraps backup→mutate→rollback in the lock (advisory; see NEW-2).

## LOW-2 — Central write-intent guard deferred → residual ACCEPTABLE
Recording the single-sanctioned-writer guard (#4) as a VB1/VB3 follow-up is acceptable: the concrete VB1 hazard is already closed structurally by HIGH-1 (no approval authenticates in VB1) and HIGH-2 (rollback writes root-contained). Keep it a tracked, visible residual delivered with VB3's executor.

## NEW observations (LOW — non-blocking, VB3-era hardening)
**NEW-1 — `verifier` is a caller-substitutable capability parameter (LOW; inert in VB1).** `act({... verifier = VB3_VERIFIER})` accepts a per-call `verifier`; a caller supplying its own `{secret}` + a matching signed approval + its own `mutate` thunk executes. NOT a data-forgery escalation — it requires controlling a code-level capability and the mutate thunk (the caller is already the trusted client; it can only run its own thunk, not smuggle untrusted approval data). Inert in VB1 (`VB3_VERIFIER = null`, no legitimate secret). VB3: bind the verifier through a module-private capability set only by VB3 wiring, not a defaultable call argument. Not blocking.

**NEW-2 — Commit phase re-derives from the raw manifest path (symlink TOCTOU; LOW).** Pre-verify canonicalizes `pAbs`/`bAbs`, but the commit loop operates on raw `b.path`/`b.backup`. For a restore entry whose `b.path` is nonexistent at verify time (only reachable via a tampered manifest), a concurrent process planting a symlink at `b.path` between pre-verify and commit would have `copyFileSync` follow it outside root. Needs both the tampered-manifest capability and a race by a writer not honoring the #8 lock; the static crafted-manifest primitive is fully closed, and `absent`-delete uses `unlinkSync` (does not follow symlinks). VB3 defense-in-depth: re-canonPath + re-check containment immediately before each op, open with O_NOFOLLOW / write via fd. Closed in practice when #8 lock is held across backup→mutate→rollback. Not blocking.

## What I could NOT break (round 2)
- Approval forgery / replay / field-swap / HMAC confusion — all refused; authentic sig still verifies.
- Rollback arbitrary write/delete — out-of-root, `..`, symlink-in-root, backup-outside-backup_dir all fail-closed with zero writes; legit rollback byte-restores.
- Token gate — immortal-expiry, empty-scope-wildcard, action-omission bypasses all closed; revoked/expired/boot-mismatch still refuse (order affects only the reason string).
- Lock — mutual exclusion + release-on-throw + re-acquire verified.
- `mutate()` on a refusal — every gate returns before the sole `mutate()` call site.

**Bottom line:** all six actionable round-1 findings CLOSED with committed proofs, LOW-2 an acceptable tracked residual, NEW-1/NEW-2 LOW VB3-era hardening notes that do not gate the VB1 merge. Recommend merge; carry NEW-1/NEW-2/LOW-2 into the VB3 build.

---

## CTO disposition
Round-2 verdict accepted. The VB1 **safety core** is checker-CLEAN and cleared to MERGE. NEW-1, NEW-2, and LOW-2 are recorded as tracked **VB1→VB3 residuals** in the V8-B build contract; none of the three is exploitable in VB1 (nothing executes for real — `VB3_VERIFIER = null`). **VB1 ACCEPTANCE remains HELD** independently of this merge: per the §29 Honest-Duration & Soak-Proof Law and the G1-B-VB1 gate signature, acceptance requires a real `FOUNDERGATE HARNESS <N>-HOUR SOAK PASS` (8–9h then 24h) whose start/end timestamps genuinely span the claimed hours — which cannot be produced in-session (≈33h floor). No acceptance card is issued until that soak lands honestly.
