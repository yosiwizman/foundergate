# Founder Safety Check (Phase 7.1) — Evidence Index

- **Service + job:** `src/safety_check/{service.mjs, run-job.sh, evidence-pack.mjs}` (+ selftests). The button POSTs `/api/check` → mints a run-id → spawns `run-job.sh` (real VM pipeline).
- **UI (truth-corrected):** `src/founder_url_drop/ui/safety.{html,css,js}` — neutral first; per-run-id; founder language.
- **Live UI-created run (sealed):** `docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/` — RUN_RESULT (COMPILEABILITY_OBSERVED, compileall 0, GUARD_PASS, egress DENIED, socket ABSENT, VM destroyed) + RUN_LEDGER + EVIDENCE_PACK (json/md/html/sha256) + artifact hashes.
- **Evidence Pack:** JSON canonical → MD/HTML/PDF/sha256/zip; spec `docs/product/FOUNDERGATE_EVIDENCE_PACK_SPEC.md`; claim register.
- **Actual Playwright + axe:** `tests/e2e/safety.spec.mjs`, `playwright.config.mjs`; results `docs/testing/evidence/playwright-results.json` (20 passed); trace `docs/testing/evidence/traces/sample-trace.zip`; evidence `docs/testing/FOUNDER_SAFETY_CHECK_PLAYWRIGHT_AXE_EVIDENCE.md`.
- **Exact-SHA CI:** `.github/workflows/phase7-1-safety-check-ci.yml` (GitHub-hosted; Node+Python+Playwright+axe; no VM/secrets).
- **One-click launcher:** `tools/macos/*` + `docs/product/FOUNDER_SAFETY_CHECK_LOCAL_LAUNCHER.md` (app not committed).
- **Advisor:** `docs/research/opensandbox/phase7_1/PHASE7_INDEPENDENT_ADVISOR_AUDIT.md` (PASS-WITH-CORRECTIONS).
- **Commercial (DRAFT):** `docs/commercial/*` (offer/scope/intake/pricing-hypotheses/refund — human legal review required; payment NOT enabled).
- **Coordination:** `docs/coordination/FOUNDER_SAFETY_CHECK_PHASE7_1_{LEDGER.jsonl, RECOVERY_STATE.json}`.
