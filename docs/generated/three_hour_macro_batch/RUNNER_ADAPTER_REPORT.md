# Runner Adapter Report
The adapter is `run-check.mjs`'s exported `runRealCheck()` + the CLI entrypoint that writes `runs/last-run.json`. The browser consumes that JSON (same-origin fetch). No provider, no network, no external repo. A future run-server could invoke the runner on demand; today the operator runs one CLI command and the dashboard reflects the real result.
