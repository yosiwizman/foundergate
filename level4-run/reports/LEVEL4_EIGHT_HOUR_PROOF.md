# Level-4 Eight-Hour Endurance Proof

**Verdict: LEVEL4_EIGHT_HOUR_PROVEN** — from monitor+ledger disk spans, not the wall-clock timer.

## Duration (from disk, independently recomputed by Checker)
| Stream | First | Last | Span | Samples | Max gap |
|--------|-------|------|------|---------|---------|
| monitor | 2026-07-31T13:20:08Z | 2026-07-31T21:21:58Z | **481.83 min** | 482 | 1.03 min |
| ledger | 2026-07-31T13:20:08Z | 2026-07-31T21:22:34Z | **482.43 min** | 483 | 1.03 min |

Both streams span >= 480 min with continuous 60s samples, strictly monotonic. Bar = 480 min; run-to = 482 min (margin so the last sample clears 480 — the boundary lesson learned at Level 3).

## Autonomy / integrity
caffeinate on throughout (482/482), no founder prompt, provider_used=0, external_sends=0 (483/483), no evidence-write failure (no root HELD), lock=none, origin/main 4f2394a5 unchanged, PRs 200/201/202 untouched. Health 49, git/lock 49, recovery 17 sub-checks. Four midpoint liveness records at ~120/240/360/450 min (evidence/processes/). Evidence written live to the move-immune fixed root `~/.foundergate/runs/<run_id>/level4-proof/`.

## Note
The generic classifier's top-level `verdict` string reads `LEVEL2_TWO_HOUR_PROVEN` (fixed label, evaluated at min=480); the authoritative field is `level4_verdict = LEVEL4_EIGHT_HOUR_PROVEN`. Cosmetic only; Checker + Gate Advisor both flagged and cleared it.

## Scope honesty
Proves eight-hour unattended endurance + move-resilient continuous evidence ONLY. Does NOT prove or validate an overnight wide build (no product build, no provider spend, no multi-lane mutation exercised). No production/commercial/customer-ready claim.
