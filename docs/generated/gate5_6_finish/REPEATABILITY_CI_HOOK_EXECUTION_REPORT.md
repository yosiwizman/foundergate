# Repeatability CI Hook — Execution Report
Ran the hook locally: an initial batch then a rerun appended to the same durable trend (5 -> 8 runs). Every run: 12/12 fixtures as expected, single verdict signature, 0 flake, 0 fail, 0 false-green (~98-99ms/run). Proven rerunnable and append-only. Evidence: evidence/CI_HOOK_TREND.json.
