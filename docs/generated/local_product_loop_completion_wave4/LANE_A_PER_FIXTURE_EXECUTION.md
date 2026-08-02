# Lane A — Per-Fixture Execution Adapters
`src/local_repo_runner/fixture-runner.mjs` executes ONLY vetted synthetic/self-owned fixtures from a
strict key allowlist, via execFileSync array-args (NO shell), with a 15s timeout, NO network, NO
dependency install, NO provider, NO spend. Backend endpoint: `POST /api/run-fixture {key}` (token +
loopback auth).
Fixture classes: node pass, node fail, node no-test, python pass (no install), static web, broken
project; unsafe-name key refused before execution; unknown key → HOLD. Unknown project type →
UNKNOWN/HOLD (never fake green). Verified live: node-pass→PASS, node-fail→FAIL,
node-no-test→NO_TESTS_FOUND, python-pass→PASS, static-web→PASS, broken→BROKEN_PROJECT,
customer_private_repo→UNSAFE_SOURCE_REFUSED, unknown→HOLD_REFUSED (E2E adapter matrix 8/8).
