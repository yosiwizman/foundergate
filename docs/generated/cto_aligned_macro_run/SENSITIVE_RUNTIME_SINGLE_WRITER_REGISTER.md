# Sensitive Runtime Single-Writer Register
Sole author of all sensitive runtime files this run: Terminal-0. Files (to be created/modified):
- src/operator_console/server-core.mjs (add token+Origin auth) · run-server.mjs (enforce auth)
- src/operator_console/action-gate.mjs (local action gate skeleton + simulated executor) [new]
- src/operator_console/rollback.mjs (rollback simulation on disposable fixtures) [new]
- src/operator_console/session-token.mjs (token discipline) [new]
- demo/founder_operator_dashboard/launch-foundergate.command (no-terminal launcher) [new]
No other writer. Checker read-only. Git diff scope is restricted to these + docs/tests.

## Verification (git diff vs base 42e3cdf)
- demo/founder_operator_dashboard/launch-foundergate.command
- src/operator_console/action-gate.mjs
- src/operator_console/rollback.mjs
- src/operator_console/run-server.mjs
Sole author: Terminal-0. No parallel agent modified these files.
