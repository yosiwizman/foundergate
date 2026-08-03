# Failure Fixture Plan (12 controlled fixtures)
Fixtures are isolated under tests/generated_apps/crash_fixtures/<fixture_id>/ — Round 1 & Round 2 evidence are never touched.
| fixture_id | injected fault | expected classification | expected UI | expected evidence | recovery |
| --- | --- | --- | --- | --- | --- |
| F01_missing_manifest | delete manifest.json | HOLD_MISSING_MANIFEST | HELD, no preview | failure recorded | RECOVERED (regenerate from archetype) |
| F02_corrupted_manifest | invalid JSON | HOLD_CORRUPTED_MANIFEST | HELD, no preview | failure recorded | RECOVERED (regenerate) |
| F03_hash_mismatch | request_text changed, request_id stale | HOLD_REQUEST_HASH_MISMATCH | HELD, no preview | failure recorded | HELD (cannot infer true request) |
| F04_preview_mismatch | preview_url → other app | HOLD_PREVIEW_MISMATCH | HELD, no preview | failure recorded | RECOVERED (rebind) |
| F05_test_failure | failing app test | HOLD_TEST_FAILURE | HELD, no PASS | failure recorded | HELD (never fake pass) |
| F06_missing_index | delete index.html | HOLD_PARTIAL_GENERATION | HELD, no preview | failure recorded | RECOVERED (regenerate) |
| F07_stale_round1 | Round 1 app as current | HOLD_STALE_EVIDENCE | HELD, no preview | failure recorded | HELD (require current run_id) |
| F08_stale_round2 | Round 2 app as current | HOLD_STALE_EVIDENCE | HELD, no preview | failure recorded | HELD (require current run_id) |
| F09_unsupported | manifest for unsafe request | HOLD_UNSUPPORTED_OR_UNSAFE | HELD, no preview | failure recorded | HELD (refused) |
| F10_server_unavailable | preview server unreachable | HOLD_SERVER_UNAVAILABLE | HELD, no preview | failure recorded | RECOVERED (verify live server) |
| F11_partial_generation | core.mjs missing | HOLD_PARTIAL_GENERATION | HELD, no preview | failure recorded | RECOVERED (clean + regenerate) |
| F12_post_checker_mutation | files mutated after checker hash | HOLD_POST_CHECKER_MUTATION | HELD, no preview | failure recorded | HELD (verdict invalidated) |
Result: 12 tested · 12 HELD · 6 recovered · 0 shown green. (CRASH_FIXTURE_RESULTS.json)
