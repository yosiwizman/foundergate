# Lane I — Builder Report
**Builder does not self-certify and does NOT claim CLEAN.** Independent Checker + Terminal Advisor verdicts
are authoritative and in their own reports.

## What was built (local app factory)
- `src/local_app_builder/archetypes.mjs` — archetype library (real cores + UIs + app-specific tests).
- `src/local_app_builder/app-factory.mjs` — engine: generateAndTest() writes an app to its own folder, runs
  its real selftest, and binds results into a manifest (DONE needs files; PASS needs tests to pass; preview
  derived from artifact; verdicts PENDING).
- `src/local_app_builder/run-factory.mjs` — orchestrator: records deterministic selection BEFORE build,
  generates+tests 4 apps, writes the UI factory index.
- UI: `demo/founder_operating_environment/` — added a "Factory Proof" panel (nav-factory) that loads
  factory_index.json and shows request ids, generated paths, test results, bound preview buttons, and the
  unsupported example. Idea Builder was not further crowded.
- Tests: tests/local_app_factory/{factory.selftest, false-green-regression, unsupported-held}.mjs +
  tests/e2e-dashboard/factory-visible-proof.mjs (headed).

## Selected apps (seed 20260803T0835ET, recorded before build)
score_keeper (req_f436e095), budget_tracker (req_4dd98a1c), inventory_list (req_0c103ebd), notes_board (req_48826a22).
Calculator and task planner were excluded by rule.

## Generated app paths
tests/generated_apps/factory_runs/<request_id>/ each with index.html, core.mjs, tests/<app>.selftest.mjs,
manifest.json, LIMITATIONS.md, package.json.

## Tests created + run
per-app selftests (6/5/5/5), factory unit 18/18, false-green regression 11/11, unsupported/held 14/14,
registry binding 22/22, headed visible-browser proof 10/10.

## Known limits / what Builder cannot certify
- Only these archetypes are supported; arbitrary app generation is NOT claimed.
- Local synthetic only; not production/SaaS/secure/customer/commercial. Never ship. Gate 8 not addressed.
- Builder cannot certify its own correctness — see independent Checker + Terminal Advisor.
- A real aggregate bug was found by visible-browser proof and fixed mid-run (disclosed, not hidden).
