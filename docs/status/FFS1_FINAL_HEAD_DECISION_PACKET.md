# FFS-1 Final-Head Closure Decision Packet

**Why:** the founder-facing launcher gained FG_OPEN_PATH (commit e9adac5) AFTER the prior foreground
capture (0af5f0c), independent checker (0af5f0c) and final Advisor (efa406c). That change affects the
exact surface the founder will use, so the prior foreground/checker/Advisor evidence is **STALE** for
the final launcher tree. This closure requalifies ONE frozen final candidate.

## Root-cause wording correction
PACK_FAILURE_CLASSIFICATION: **GENERATOR_RETURNED_NONZERO_DURING_LIVE_RUN**
PRECISE_UNDERLYING_CAUSE: **UNKNOWN**
Note: a possible-but-unproven explanation (Chrome/PDF contention) was considered but NOT mechanically
proven. Unchanged facts: stage 11 was UNKNOWN and no pack was produced during the live run; the pack
was later recovered deterministically from existing sealed evidence.

## Drift (prior attestations are STALE for the final tree)
| Attestation | SHA |
|---|---|
| prior foreground capture | 0af5f0c (rebound; captured against a103f2e working tree) |
| independent checker | 0af5f0c / working head 76d581d |
| final Advisor | efa406c |
| launcher FG_OPEN_PATH change | e9adac5 |
| FINAL CANDIDATE | (frozen below) |

Requalification at the final candidate: rebuild Desktop app, local tests, exact-SHA CI, fresh
foreground replay, fresh checker, fresh Advisor — all bound to one SHA. Merge stays BLOCKED. No new
live run / sandbox / VM. No main merge / OpenSandbox adoption / AKIOR / M1.
