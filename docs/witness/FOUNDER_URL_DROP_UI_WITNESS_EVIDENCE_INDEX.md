# Founder Witness — Evidence Index (Phase 7)

Plain pointers behind the witness card. The founder need not read these.

- **UI app:** `src/founder_url_drop/server.mjs` + `ui/urldrop.{html,css,js}`; selftest `urldrop.selftest.mjs` (16 OK).
- **Live run state (real, fresh):** `docs/research/opensandbox/phase7/OPEN_SANDBOX_PHASE7_UI_RUN_STATE.json` — commit `621e4974…`, archive `fd8597e4…`, manifest `649ecb02…` (12 files), GUARD_PASS, egress DENIED, docker socket ABSENT, compileall exit 0, teardown 204/404, VM destroyed.
- **Phase 6 durable evidence (reused, checker-clean):** `docs/research/opensandbox/phase6/{OPEN_SANDBOX_PHASE6_SOURCE_ACQUISITION_EVIDENCE.json, _RUNTIME_EVIDENCE.json, _RESULT.md, _CHECKER_REPORT.md}`.
- **Independent audits:** Phase-6 Advisor `docs/research/opensandbox/phase7/PHASE6_ADVISOR_AUDIT.md` (PASS); Phase-7 final checker CHECKER-CLEAN (24/24).
- **UI proof:** `docs/testing/FOUNDER_URL_DROP_UI_BROWSER_PROOF.md` (20 assertions + corrected modal bug); accessibility `..._ACCESSIBILITY_EVIDENCE.md`; false-green `..._FALSE_GREEN_REPORT.md`.
- **Spec/copy/protocol:** `docs/product/FOUNDER_URL_DROP_UI_{SPEC,COPY_REGISTER,WITNESS_PROTOCOL,STRANGER_TEST}.md`.
- **Patch guard:** `prototypes/sandbox_provider_adapter/{patch_compatibility.py,test_patch_compatibility.py}` (7 OK); policy `docs/architecture/OPEN_SANDBOX_PATCH_MAINTENANCE_POLICY.md`.
- **Negative fixtures:** `prototypes/customer_repository_intake/test_negative_fixtures.py` (19 OK).
- **Coordination:** `docs/coordination/FOUNDER_URL_DROP_UI_PHASE7_{LEDGER.jsonl,RECOVERY_STATE.json}`.
