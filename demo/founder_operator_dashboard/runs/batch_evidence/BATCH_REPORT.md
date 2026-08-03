# FounderGate — Aggregated Batch Evidence (local, synthetic)

Aggregate: 9/29 fixtures passed; 5 refused; 15 other. Internal demo only — never ship.
Decision ceiling: INTERNAL_DEMO_ONLY (never SHIP)
Limitations: Local-only, internal, synthetic/self-owned fixtures. Not production, not secure, not SaaS, not customer-ready.
What was NOT proven: production readiness, security/compliance, customer/market/paid validation, commercial readiness.

## Individual runs
1. scenario:calendar-app-pass · objective "scenario: calendar-app-pass" · SCENARIO_PASS · INTERNAL_DEMO_ONLY · Synthetic scenario tests passed.
2. scenario:calendar-app-fail · objective "scenario: calendar-app-fail" · SCENARIO_FAIL · UNKNOWN · Synthetic scenario tests failed.
3. scenario:task-app-pass · objective "scenario: task-app-pass" · SCENARIO_PASS · INTERNAL_DEMO_ONLY · Synthetic scenario tests passed.
4. scenario:task-app-fail · objective "scenario: task-app-fail" · SCENARIO_FAIL · UNKNOWN · Synthetic scenario tests failed.
5. scenario:crud-api-pass · objective "scenario: crud-api-pass" · SCENARIO_PASS · INTERNAL_DEMO_ONLY · Synthetic scenario tests passed.
6. scenario:crud-api-fail · objective "scenario: crud-api-fail" · SCENARIO_FAIL · UNKNOWN · Synthetic scenario tests failed.
7. scenario:static-site-pass · objective "scenario: static-site-pass" · SCENARIO_PASS · INTERNAL_DEMO_ONLY · Synthetic static scenario present (nothing to run).
8. scenario:static-site-broken · objective "scenario: static-site-broken" · BROKEN_SCENARIO · UNKNOWN · The scenario could not be run (syntax/module error).
9. scenario:no-test-scenario · objective "scenario: no-test-scenario" · NO_TESTS_FOUND · UNKNOWN · This scenario has no tests to run.
10. scenario:dependency-missing-scenario · objective "scenario: dependency-missing-scenario" · HOLD_DEPENDENCIES_NOT_INSTALLED · UNKNOWN · This scenario declares dependencies that are not installed (no install is attempted).
11. scenario:unsafe-customer-calendar-scenario · objective "scenario: unsafe-customer-calendar-scenario" · UNSAFE_SCENARIO_REFUSED · UNKNOWN · This scenario name looks unsafe (customer/private/production/real-account). Refused before any execution — no real data is touched.
12. scenario:unsafe-production-api-scenario · objective "scenario: unsafe-production-api-scenario" · UNSAFE_SCENARIO_REFUSED · UNKNOWN · This scenario name looks unsafe (customer/private/production/real-account). Refused before any execution — no real data is touched.
13. node-pass · objective "Batch: prove tests pass" · PASS · INTERNAL_DEMO_ONLY · Node tests passed.
14. node-fail · objective "Batch: prove tests pass" · FAIL · UNKNOWN · Tests failed.
15. node-no-test · objective "Batch: prove tests pass" · NO_TESTS_FOUND · UNKNOWN · This project has no tests to run.
16. python-pass · objective "Batch: prove tests pass" · PASS · INTERNAL_DEMO_ONLY · Python fixture passed.
17. static-web · objective "Batch: prove tests pass" · PASS · INTERNAL_DEMO_ONLY · Static web fixture is present (no tests to run).
18. broken · objective "Batch: prove tests pass" · BROKEN_PROJECT · UNKNOWN · The project could not be run (syntax/module error).
19. go-style · objective "Batch: prove tests pass" · UNKNOWN_RUNTIME_MISSING · UNKNOWN · The go toolchain is not installed locally (no install is attempted).
20. rust-style · objective "Batch: prove tests pass" · UNKNOWN_RUNTIME_MISSING · UNKNOWN · The cargo toolchain is not installed locally (no install is attempted).
21. java-style · objective "Batch: prove tests pass" · PASS · INTERNAL_DEMO_ONLY · Java fixture compiled and passed.
22. monorepo · objective "Batch: prove tests pass" · FAIL · UNKNOWN · Monorepo: 1/2 packages passed (pkgA PASS, pkgB FAIL).
23. deps-present · objective "Batch: prove tests pass" · PASS · INTERNAL_DEMO_ONLY · Node tests passed (dependencies already present).
24. deps-missing · objective "Batch: prove tests pass" · HOLD_DEPENDENCIES_NOT_INSTALLED · UNKNOWN · This project declares dependencies but they are not installed (no install is attempted).
25. py-deps-missing · objective "Batch: prove tests pass" · HOLD_DEPENDENCIES_NOT_INSTALLED · UNKNOWN · Python requirements are declared but not installed (no install is attempted).
26. install-requested · objective "Batch: prove tests pass" · REFUSED_NEEDS_AUTHORIZATION · UNKNOWN · Installing dependencies is not allowed here; it needs founder authorization.
27. unsupported · objective "Batch: prove tests pass" · UNKNOWN · UNKNOWN · Unsupported project type — no safe local adapter.
28. customer_private_repo · objective "Batch: prove tests pass" · UNSAFE_SOURCE_REFUSED · UNKNOWN · This source name looks unsafe (customer/private/production/secret/billing). Refused before any execution.
29. unknown-xyz · objective "Batch: prove tests pass" · HOLD_REFUSED · UNKNOWN · Unknown fixture — not on the local allowlist.
