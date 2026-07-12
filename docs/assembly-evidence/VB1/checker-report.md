# VB1 — Independent Adversarial Executor Checker Report (round 1)

> **Provenance:** produced by an INDEPENDENT read-only adversarial checker subagent dispatched by the CTO under the
> SENSITIVITY RULING (builder ≠ checker). Committed verbatim as evidence. Round-2 re-review (after fixes) is in
> `checker-report-round2.md`. All findings must be CLOSED before merge.

**VERDICT: NOT CLEAN — 2 HIGH, 3 MEDIUM, 2 LOW.** The act edge is only *conventionally* gated (`approval.wired:true` is a trivially self-forgeable plain-object field the executor never authenticates — VB1 executes real mutations today), and `rollbackFromBackup` grants arbitrary file delete/overwrite via a crafted manifest with no path containment or manifest-integrity binding. Plus a fail-open immortal-token bug on unparseable expiry, empty-scope-means-god, and scope-skip-on-missing-action. All findings must be CLOSED before merge.

## HIGH-1 — The "act edge gated on VB3" is only conventional; `wired:true` is caller-forgeable and `act()` executes real mutations in VB1
`act()` gated real execution on `approval.wired !== true`, but `approval` is a plain object supplied by the caller with NO authenticity check (no signature/HMAC/capability). Any caller can hand-craft `{ wired:true, work, rollbackable:true }` and `mutate()` runs for real. `actEdgeWired()` was dead code (never consulted). The executor's own selftest constructed a forged `wired` object and asserted success — institutionalizing the hole. **Repro:** a forged approval with `recorded_by:"ATTACKER"` passed every gate, ran `mutate()`, and was stamped into evidence as the approver. **Fix:** make approvals unforgeable (HMAC/signature over `{work, action, nonce, expiry}` verified against a VB3-held secret); until VB3 exists, hard-gate `act()` so no plain-object approval can execute; make `actEdgeWired` the actual predicate; invert the "success" test.

## HIGH-2 — `rollbackFromBackup` allows arbitrary file delete/overwrite via a crafted manifest (no path containment, no manifest integrity)
Rollback used `b.path`/`b.backup` straight from the manifest with zero validation they lie within any intended tree; the pre-verify only checked `sha(b.backup)===b.sha` (both attacker-controlled). `absent:true` entries skipped pre-verify entirely yet triggered `unlinkSync(b.path)`. **Repro:** F4a deleted a file never backed up via `{path:VICTIM, absent:true}`; F4b overwrote a trusted config via `{path:VICTIM, backup:evil.bak, sha:sha(evil)}` (sha self-consistent). **Fix:** confine every `b.path` to an allowlisted root recorded at backup time (reject `..`/symlink/out-of-tree, fail-closed); pre-verify absent entries too; integrity-bind the manifest.

## MEDIUM-1 — Unparseable `expires_at` fails OPEN → an immortal token
`use()` did `Date.parse(t.expires_at) <= now`; for a non-empty but unparseable value `Date.parse` returns `NaN` and `NaN <= now` is `false` → never expires. **Repro:** `expires_at:"whenever"` returns OK at `now = T0 + 999999999`. **Fix:** `if (!Number.isFinite(Date.parse(...))) return MALFORMED`.

## MEDIUM-2 — Empty scope means UNRESTRICTED, and it is the mint DEFAULT
The scope check was guarded by `t.scope.length`, so an empty scope short-circuited to authorized-for-everything; `mint()` defaulted `scope=[]`. **Repro:** empty-scope token authorized `run.delete.EVERYTHING`. **Fix:** empty scope authorizes nothing (fail-closed).

## MEDIUM-3 — Missing `action` skips the scope check entirely
The scope check was guarded by `action != null`; a `null` action bypassed scope and returned OK. **Repro:** a `["run.start"]`-scoped token returned OK for `action=undefined`. **Fix:** missing action when a scope is set is OUT_OF_SCOPE; `act()` requires a non-empty action.

## LOW-1 — Net-zero `unlink` is a TOCTOU clobber of a concurrently-created file (no cross-process lock)
The AKIOR atomic-store lock (#8) that would hold backup+mutate+undo under one lock is cited in the contract but not implemented. **Fix:** implement #8 and hold it across backup→mutate→rollback.

## LOW-2 — "Single-sanctioned writer" is asserted, not enforced
No central write-intent guard blocks other write doors (`rollback.mjs`, `session-token.mjs` write directly). The single-writer property is conventional. Informational for VB1; #4 is slated built under VB1/VB3. **Fix:** land the central write-intent guard.

## What I could NOT break (closed)
- No torn/partial restore on a legitimate manifest (full pre-verify before commit).
- Fail-closed on no manifest / missing backup / tampered sha / catastrophic dir (zero writes).
- `use()` reason ordering is not a decision bypass (all non-OK branches deny; ordering changes only the reason string).
- Boot-bound cross-restart reuse refused (caveat: caller must supply a fresh unpredictable bootId per restart).
- `mutate()` never runs on a refusal (every gate returns before the sole mutate() call).

**Note:** the current executor "success" test and its forged `wired` object demonstrate HIGH-1 rather than guard against it — they must be inverted as part of the fix.

---

## CTO disposition — every finding fixed (locked by a committed proof)
| Finding | Fix | Proof |
|---|---|---|
| **HIGH-1** | Approvals are **HMAC-signed** over `{work,action,nonce,rollbackable}`, verified against a VB3 secret; `VB3_VERIFIER=null` in VB1 so `verifyApproval` is always false; `act()` calls it for real; the "success" test now uses a signed approval and a **forged plain approval is asserted REFUSED** | `executor.selftest.mjs` (HIGH-1 CLOSED + VB3 unwired) |
| **HIGH-2** | Rollback confines **every** path (restore + absent-delete) to the root recorded at backup time (canonical/realpath, reject out-of-tree) → new `PATH_ESCAPE` code, zero writes | `rollback.selftest.mjs` (overwrite + delete crafted-manifest → PATH_ESCAPE, victim untouched) |
| **MEDIUM-1** | Unparseable expiry → `MALFORMED` (fail-closed) | `session-token.selftest.mjs` MEDIUM-1 |
| **MEDIUM-2** | Empty scope authorizes nothing | `session-token.selftest.mjs` MEDIUM-2 |
| **MEDIUM-3** | Missing action → OUT_OF_SCOPE; `act()` requires an action (`NO_ACTION`) | `session-token`/`executor` selftests |
| **LOW-1** | Atomic-store lock implemented (`atomic-store.mjs`, #8) — mutual exclusion + stale reclaim + release-on-throw | `atomic-store.selftest.mjs` |
| **LOW-2** | Recorded as a known residual: the central write-intent guard (#4) is a VB1/VB3 follow-up; VB1's single-writer is still conventional | VB1 completion report (residual) |
