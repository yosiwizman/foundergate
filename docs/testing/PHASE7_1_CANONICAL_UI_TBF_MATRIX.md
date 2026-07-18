# Phase 7.1-Q Machine-Verification Matrix (evidence map)

| Class | Evidence | Result |
|---|---|---|
| headed_local_browser / screenshots / trace / video | docs/testing/evidence/phase7-1-q/headed/{screenshots,trace.zip,video} | PASS (headed Mac Playwright) |
| console_log / network_log / page_error_log | headed/{console_log,network_log,page_errors}.json | PASS (0 page-errors) |
| initial_neutral_state / stale_state / cache_storage_service_worker | headed 01/02/14 + cache-a11y/cache_a11y_result.json (SW NONE; stale ignored) | PASS |
| responsive_mobile / keyboard_only / focus_behavior / automated_accessibility / zoom_200 / reduced_motion | phase7-1 Playwright+axe (CI) + cache_a11y_result.json | PASS |
| actual_playwright / headless_exact_sha_ci | phase7-1-safety-check CI at qual head | PASS |
| false_green | qualification.selftest (neutral-first, stale ignored, no fabricated result) | PASS |
| syntax_unit / contract_tests / negative_requests / malformed_input / schema_validation / evidence_binding | qualification.selftest.mjs (19 checks) + service.selftest | PASS |
| deny_path / unauthorized_path | qualification.selftest (SSH/file/credential REFUSED; non-fixture HELD) | PASS |
| isolation / permission | canonical-identity.selftest (loopback 127.0.0.1; no private path) | PASS |
| secret_scan | docs/testing/evidence/phase7-1-q/SECRET_SCAN.json | CLEAN |
| process/port/worktree identity (Lane C) | canonical-identity.selftest + launcher.test.sh 14/14 (foreign→UNKNOWN_SERVICE) | PASS |
| unit / crash_recovery / teardown / cleanup / exact_version_proof | qualification.selftest + sc-0bc1b04f sealed run | PASS |
| mutation_gate_fires / protected_file_check / second_authority / signature_bypass | TBF mutation suite (11) + qualification deny/hold + false-green register | PASS |
| live bounded runtime | sc-0bc1b04f (prior real UI-created run; VM destroyed) — see AUTHORITY note | PROVEN(prior) / new run BLOCKED unless disk-authorized |
| independent_checker / final_advisor | this lane's checkers + Advisor | see decision packet |
