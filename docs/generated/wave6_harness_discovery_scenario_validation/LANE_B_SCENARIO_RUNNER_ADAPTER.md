# Lane B — Scenario Runner Adapter
src/scenario_runner/scenario-core.mjs runs vetted synthetic scenarios via execFileSync array-args
(no shell), timeout, no network/install. Statuses: SCENARIO_PASS, SCENARIO_FAIL, NO_TESTS_FOUND,
BROKEN_SCENARIO, HOLD_DEPENDENCIES_NOT_INSTALLED, UNSAFE_SCENARIO_REFUSED, UNKNOWN_RUNTIME_MISSING,
UNKNOWN. Each maps to founder-readable summary + scenario type + preview status + evidence
eligibility + decision ceiling (INTERNAL_DEMO_ONLY, never SHIP) + limitations + not-proven + next
action. Unsafe scenario names are refused BEFORE execution. Verified live + E2E (10/10 matrix).
