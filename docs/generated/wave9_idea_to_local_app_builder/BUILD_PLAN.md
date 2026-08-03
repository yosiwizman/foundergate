# Lane C — Build Plan
- **Files to create:** tests/generated_apps/wave9_appointment_task_planner/{core.mjs, index.html,
  package.json, README.md, LIMITATIONS.md, tests/planner.selftest.mjs}.
- **Test plan:** deterministic node self-test (zero-dep) covering add/list/complete/filter/reject-empty/
  synthetic-capabilities/deterministic-ids.
- **Preview plan:** serve index.html via the local loopback server; exercise add/complete/filter in a browser; screenshot.
- **Evidence plan:** seal a real ZIP including the app, tests, results, preview record, spec, plan, decision.
- **Refusal plan:** a client-side idea classifier refuses/holds unsafe ideas (Lane J).
- **Guarantees:** no-deploy · no-billing · no-account/calendar · no-network · no-install (zero-dep) · no-customer-data.
