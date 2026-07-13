# SHWL BUILD — Independent Adversarial Checker Report (round 2, SHA 5a9cea49)

> Same independent adversarial checker, delta re-review after the OBS-1/OBS-2 fixes. Report = evidence. Committed verbatim.

**VERDICT: CLEAN — OBS-1/OBS-2 closed, no regression; ready for merge.**

Confirmed `git rev-parse HEAD` == `5a9cea49f7ab30bb19c6da71a525434bd6f554b4`. Delta touches only the two flagged modules + their selftests + the report (`attestation.mjs`, `attestation.selftest.mjs`, `adversarial.selftest.mjs`, `BUILD_REPORT.md`). Checker edited nothing (worktree clean); no real `~/.cldh` created; no `akior` path written; full suite run in temp roots.

## OBS-2 — CLOSED (attestation reconstructs from the authoritative append-only `events.log`)
`loadAttestation` now consults `events.log` first; a recorded `OVERRIDE`/`QUIET_HOST_PERMANENTLY_DISQUALIFIED` for the run wins over any file value. Independently verified (temp roots):
- **(a)** override → DELETE the owner-only attestation file → `isQuietHostEligible` still **false** (`disqualified_reason=RECONSTRUCTED_FROM_EVENTS_LOG`).
- **(b)** override → tamper the file to `quiet_host_eligible:true` → still **false** (events.log wins).
- **(c)** attestation file missing AND `events.log` unreadable → **false**, fail-closed (`FAIL_CLOSED_NO_AUTHORITATIVE_RECORD`). A genuinely fresh run (no override, no log) correctly stays eligible — not broken for legitimate use.
- No `restore/re-enable/grant/reset` export exists; a second override never re-grants; disqualification is per-run.

**Mutation-verified non-vacuous:** neutering `eventsDisqualify`, flipping the fail-closed branch, or letting the file value win each makes `attestation.selftest` FAIL.

**Residual (unchanged scope, not a defect):** eligibility can return to `true` only by destroying/truncating/rewriting the append-only `events.log` itself — same-user filesystem tampering against the audit authority, explicitly outside the cooperative-not-security model (§5, §11.5) and forbidden by contract (§7.5 "no project truncates or rewrites it"). Strict improvement over round-1 (where mere attestation-file deletion sufficed).

## OBS-1 — CLOSED (two isolated fixtures)
- **stale-alone** — interval 30s / TTL 24h, `now=T0+200s`: stale but not expired → `RECOVERY_REQUIRED`, `STALE_HEARTBEAT`, lock held.
- **expiry-alone** — interval 3600s / TTL 60s, `now=T0+120s`: expired but heartbeat fresh → `RECOVERY_REQUIRED`, `EXPIRED`, lock held.
Mutation-verified: the round-1 masked case now FAILS when the guarantee is removed (was silently passing at 29ebbf59).

## Regression — none
- Full suite **76/76 GREEN**; §8.1 matrix **14/14 GREEN**; adversarial 10/10; attestation 8/8.
- Round-1 attack battery (expiry/stale-alone stay locked, orphan/tamper/delete→RECOVERY, PID-reuse, prior-boot, old-owner-can't-delete, 40-proc double-acquire→1 winner, forged/short/absent capability refused, strict `=== true`) — all still defended.
- Round-1 14-row mutation harness — all guarantees still genuinely enforced (matrix row 12 now defense-in-depth: `events.log` authoritative; a mutation removing both the file downgrade and the events.log append breaks row 12, confirming enforcement).
- Capability still no-leak; no `~/.cldh`/AKIOR writes; fail-closed everywhere.

**Both observations closed with no regression. CLEAN — ready for merge.**
