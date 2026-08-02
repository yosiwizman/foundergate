# Repeatability CI Report
Runner: tests/repeatability/ci-runner.mjs — runs the crash-test ladder N times (N=5 this run), each with an isolated temp fixture dir, and compares verdict signatures.
Result: **ALL GREEN — 5/5 runs deterministic**; every run: 12/12 fixtures as expected, fail 0, false-green 0, exit 0. Verdict signature identical across all runs. Machine-readable: REPEATABILITY_N3_RESULTS.json.
