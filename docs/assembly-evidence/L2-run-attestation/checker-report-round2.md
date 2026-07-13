# L2 run-attestation — Independent Adversarial Checker Report (round 2, SHA c55e823e)

> Same independent checker, delta re-review after the F1 + LOW fixes. Report = evidence. Committed verbatim.

**VERDICT: CLEAN — F1 (disclosure+anchor) and LOW-1/LOW-2 closed, no regression; ready for merge.** The full-file-rewrite residual is now honestly disclosed and scoped like the accepted SHWL `events.log` residual, and is defeatable by an out-of-band anchor.

HEAD confirmed `c55e823e28837fb26f022fe30f514a37e9bd3b5e`, tree clean. Scope unchanged (6 files under `src/run-attestation/**` + the L2 report; `src/shwl/**` untouched/not imported; `akior` only in the report's negative-confirmation line). Suite 22/22 PASS. `canonical.mjs` byte-unchanged since round 1 (determinism/proto/no-collision carry forward).

## F1(a) disclosure — CLOSED
The misleading "re-hashing is caught" implication is gone (grep-empty). Now accurate: a single edited line (with or without recomputing that one entry's hash) is caught by downstream linkage (re-verified → `broken-at-entry-2`). The full-file rewrite is honestly disclosed in three places (`store.mjs` RESIDUAL block, `attestation.mjs` THREAT MODEL note, report §3.1) as the SAME accepted residual as the SHWL append-only `events.log` (SHWL §1 scope / §5 honest limitation / §11 single-user boundary) — a cooperative integrity control, not a crypto guarantee against a hostile same-user. Tested explicitly ("F1 DISCLOSED RESIDUAL"): 2h→9h full rewrite still `intact` without an anchor, matching the disclosure.

## F1(b) external anchor — CLOSED (a real defense)
`verifyAttestation(log,{expectedHeadHash})` + `isSoakEligible(...,{expectedHeadHash})`: forged chain + honest out-of-band head hash → `broken-anchor` → UNKNOWN/`eligible:false`; honest chain + its head hash → intact. The head `entry_hash` is content-bound, so any content change (forged `end_at`, erased failure) moves it — no fixpoint matches the honest head, and the attacker's forged head ≠ honest head and is unguessable without the honest content. The anchor is exactly as strong as the out-of-band channel the honest head is recorded in (L1 freeze manifest / separately-committed record) — the stated threat model. `genesis_salt` yields distinct heads for identical DATA (defense-in-depth).

## LOW-1 — CLOSED
Content-intact chain (full rewrite) with an un-parseable `start_at`/`end_at` → `{status:UNKNOWN, eligible:false}` (try/catch around `toEpochMs`), no throw.

## LOW-2 — CLOSED
`verifyAttestation` tracks `sealSeen`: any entry after `RUN_SEAL`, and a second `RUN_SEAL`, → `broken-at-<id>` even on a validly re-hashed forged chain.

## No regression
Partial tampers all caught (edit → broken-at-entry-1; single-entry rehash → broken-at-entry-2; delete/reorder → broken; genesis change even fully re-hashed → broken-at-entry-0). §29 honesty: negative span → NOT_ELIGIBLE; unresolved failure blocks; `claimSeconds` NaN/-1/"9"/Infinity/undefined rejected. No SOAK PASS banner; no `Date.now()`. Determinism/proto-pollution unchanged.

(Cosmetic count-nit in the L2_REPORT file-list bullet corrected by the sheriff at merge; no guarantee impact.)
