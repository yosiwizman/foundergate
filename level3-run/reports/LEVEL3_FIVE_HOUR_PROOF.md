# Level-3 Five-Hour Endurance Proof

**Verdict: LEVEL3_FIVE_HOUR_PROVEN** — from monitor+ledger disk spans, not the wall-clock timer.

## Duration (from disk, independently recomputed by Checker)
| Stream | First | Last | Span | Samples | Max gap |
|--------|-------|------|------|---------|---------|
| monitor | 2026-07-31T02:39:01Z | 2026-07-31T07:40:38Z | **301.62 min** | 302 | 1.02 min |
| ledger | 2026-07-31T02:39:01Z | 2026-07-31T07:40:17Z | **301.27 min** | 302 | 1.02 min |

Both streams span >= 300 min with continuous 60s samples. Bar = 300 min.

## Two attempts — full honesty
- **Run #1: LEVEL3_DURATION_NOT_PROVEN.** A clean ~5h unattended run, but disk spans were 299.63 / 299.27 min — ~22-44s under 300. Root cause (harness config): samplers were stopped at exactly 300 wall-clock min (discrete-sample span < elapsed), and the copied launcher hardcoded classifier `--min 120` (mislabeling the summary). No false claim was made; the run was classified NOT_PROVEN. Evidence preserved in `evidence/run1_notproven/`.
- **Fix (one-line intent):** run samplers to 302 min so the last sample lands >=300, and classify against `--min 300` with a Level-3 relabel. The proven run-loop logic was unchanged; validated by re-running the relabel on run #1's real logs (correctly returned NOT_PROVEN).
- **Run #2 (this proof): LEVEL3_FIVE_HOUR_PROVEN.** monitor 301.62 / ledger 301.27 min.

## Autonomy / integrity
caffeinate on throughout (302/302), no founder prompt, provider_used=0, external_sends=0, no evidence-write failure (no root HELD), lock=none, origin/main 4f2394a5 unchanged, PRs 200/201/202 untouched. Health 31, git/lock 31, recovery 11 sub-checks. Evidence written live to the move-immune fixed root `~/.foundergate/runs/<run_id>/level3-proof/`.

## Note
The generic classifier's top-level `verdict` string reads `LEVEL2_TWO_HOUR_PROVEN` (its fixed label, evaluated at min=300); the authoritative Level-3 field is `level3_verdict = LEVEL3_FIVE_HOUR_PROVEN`. Cosmetic only; both Checker and Gate Advisor flagged and cleared it.

## Scope honesty
Proves five-hour unattended endurance + move-resilient evidence ONLY. Does NOT prove Level 4 (8h), nor product build under load. No production/commercial/customer-ready claim.
