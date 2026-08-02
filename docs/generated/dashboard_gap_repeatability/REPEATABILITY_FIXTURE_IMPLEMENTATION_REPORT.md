# Repeatability Fixture Implementation Report
- Runner: tests/repeatability/ladder-runner.mjs — builds 12 synthetic fixtures in a temp dir (deterministic; no clock/random; no network; no external/customer data).
- Fixtures 01–04 use the REAL FounderGate guards (final-head, receipt-consistency) so the ladder is non-vacuous (the same guards used in production receipts). 05–07 use real shasum/unzip. 08–12 use real string/scan/refuser logic.
- Result this run: 12/12 behaved as expected; false-green count = 0. Machine-readable results in evidence/ladder_results.json.
