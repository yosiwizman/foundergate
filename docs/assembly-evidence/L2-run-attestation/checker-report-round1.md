# L2 run-attestation — Independent Adversarial Checker Report (round 1, SHA 5bb850ce)

> Independent adversarial checker (builder ≠ checker). Report = evidence. Committed verbatim.

**VERDICT: NOT CLEAN** — one MEDIUM (F1): the full-chain-rewrite attack passes as `intact` and forges §29 eligibility, and this residual was UNDISCLOSED (the report implied re-hashed edits are always caught). Everything else held. Closed in round 2 (SHA c55e823e) via honest disclosure + an external anchor.

## Scope/hygiene (PASS)
Diff = exactly 6 added files under `src/run-attestation/**` + the L2 report; `src/shwl/**` untouched and not imported; no `akior`; no other-lane/ledger; no `SOAK PASS` literal in any source; no `Date.now()`.

## F1 (MEDIUM) — Undisclosed full-rewrite residual defeats tamper-evidence & §29 honesty
A genuine 2h run (NOT_ELIGIBLE for a 9h claim) is edited to `end_at = +9h`, then the attacker rebuilds the whole chain — `previous_hash` cascade from the PUBLIC constant `GENESIS_HASH` and recompute every `entry_hash`:
```
honest verify: intact  9h-eligibility: NOT_ELIGIBLE (7200s < 32400s)
FORGED verify: intact  9h-eligibility: ELIGIBLE (32400s)   <-- forged short run passes
```
Same technique erases an unresolved FAILURE entry. Root cause: an unauthenticated hash chain whose only anchor is the constant `GENESIS_HASH`; any attacker knows it, so `verifyAttestation` re-walks a consistently re-hashed forgery and returns `intact`. No external anchor / signature. It is UNDISCLOSED, and report §3 stated "EDIT (with and without re-hashing) … are each detected" — true only for a SINGLE-entry re-hash. Fix (either closes it): (a) disclose as a scoped same-user-FS-tampering residual (like the accepted SHWL events.log); (b) add a real external anchor (record the head `entry_hash` out-of-band / sign the head).

## Hardening nits (LOW; fail-closed, downstream of F1)
- Intact chain + unparseable timestamp → `isSoakEligible` THROWS instead of returning UNKNOWN (never eligible, but a TypeError vs structured UNKNOWN).
- `verifyAttestation` doesn't forbid entries after `RUN_SEAL`, nor a second `RUN_SEAL` (both return intact; only reachable via file rewrite).

## What I could NOT break (round 1)
Every PARTIAL tamper caught (payload edit → broken-at; single-entry re-hash → broken-at-next via downstream linkage; delete/reorder/splice → broken; genesis change even fully re-hashed → broken-at-entry-0). §29 span math honest (negative/zero span, string/number timestamps, NaN/Infinity claimSeconds rejected; unresolved failure blocks; broken chain that would pass → UNKNOWN). No SOAK PASS emission. Append-only store not silently rewritable via the API; no proto-pollution. Canonical hashing deterministic; no collision found. The 16 selftests genuinely exercise their guarantees (does NOT test the full-rewrite case — consistent with F1 being untested + undisclosed).
