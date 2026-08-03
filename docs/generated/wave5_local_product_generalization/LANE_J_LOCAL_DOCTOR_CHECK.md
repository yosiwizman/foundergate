# Lane J — Clean-Machine / Doctor Local Check
`src/local_repo_runner/doctor.mjs` (read-only; no secrets, no provider, no network) reports:
- Required: node, unzip, zip, ditto; local server port (4880) availability; Desktop launcher presence.
- Optional runtimes: python3, go, cargo, java/javac (missing ones only affect their fixture adapters,
  which return UNKNOWN_RUNTIME_MISSING — never a fake pass).
- Playwright availability (node_modules or cache).
Result on this machine: summary READY_LOCAL (node + unzip + launcher present; java present; go/cargo
absent → their adapters honestly report UNKNOWN_RUNTIME_MISSING). Report saved in the sealed receipt.
