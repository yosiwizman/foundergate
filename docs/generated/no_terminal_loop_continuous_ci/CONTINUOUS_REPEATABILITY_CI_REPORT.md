# Continuous Repeatability CI Report
Runner: tests/repeatability/continuous-ci.mjs — runs the ladder N times, appends to a DURABLE trend history (REPEATABILITY_TREND_HISTORY.json) with per-run timing + verdict signature; rerunnable by one command (proven: a second N=3 batch appended to the same history).
Result: ****. 15 total runs, single verdict signature (fully stable), 0 flake, 0 fail, 0 false-green; ~104ms/run.
