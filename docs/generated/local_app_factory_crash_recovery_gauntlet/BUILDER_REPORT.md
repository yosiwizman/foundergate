# Builder Report — Crash / Recovery Gauntlet
**Builder does not self-certify; does NOT claim CLEAN.** Independent Checker + Terminal Advisor are authoritative.

## Faults injected (12) + files changed
- New: src/generated_app_runner/validate-app.mjs (classifier), src/local_app_builder/crash-harness.mjs (fault injection + recovery), tests/local_app_factory/{crash-fixtures.selftest, false-green-hostile}.mjs, tests/e2e-dashboard/factory-crash-visible-proof.mjs.
- Registry: added isUnsafeRequest() (distinguish real-world unsafe intent from "no Idea-Builder template").
- UI: added Crash Test panel (nav-crash) fetching crash_index.json.
- Fixtures isolated under tests/generated_apps/crash_fixtures/ — Round 1 & Round 2 evidence NOT modified.

## Recovery logic
Regenerate-from-archetype (F01/F02/F06/F11), rebind preview (F04), verify-live-server (F10). Stale/mismatch/
failing-test/unsafe/post-mutation are HELD (never recovered). Each recovery re-tests before OK; original failure preserved.

## Tests run
crash-fixtures 14/14, false-green hostile 10/10, unsupported 16/16, headed visible proof 5/5; regression wave11 14/14 + round2 proof 10/10.

## Visible browser evidence
crash_panel_overview + 6 fixture-row crops (missing_manifest/wrong_preview/test_failure/stale_evidence holds; recovered_manifest; recovered_server) + video. 12 fixtures, all HELD, all previews BLOCKED, 6 recovered, 0 green.

## Known limits / what Builder cannot certify
Local synthetic only; fixed classifier over fixed archetypes. Server-down is an isolated unreachable-endpoint injection (shared demo server not killed). Not production/SaaS/secure/customer/commercial. Gate 8 not addressed. Builder cannot certify its own correctness.
