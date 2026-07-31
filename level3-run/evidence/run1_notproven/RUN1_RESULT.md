# Run #1 — LEVEL3_DURATION_NOT_PROVEN (honest)
- monitor span 299.63 min (300 samples, max gap 1.03) — BELOW 300
- ledger span 299.27 min (300 samples, max gap 1.05) — BELOW 300
- Clean ~5h unattended run, no write failure, caffeinate on, no founder prompt, origin/main + PRs untouched.
- Root cause (harness config, both fixed for run #2):
  1. driver ran to exactly 300 wall-clock min, so samplers were stopped at ~299.6 min span (discrete-sample span < elapsed).
  2. copied launcher hardcoded classifier --min 120, mislabeling duration_summary as LEVEL2_TWO_HOUR_PROVEN.
- Fix: run-to 302 min (span clears 300 by margin) + classify --min 300 + Level-3 relabel.
