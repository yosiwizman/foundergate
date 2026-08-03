# Lane I — Builder Report
**Builder does not self-certify. Builder does NOT claim CLEAN.** Independent Checker and Terminal Advisor
verdicts are in their own reports.

## Files changed / added
- `src/idea_builder/template-registry.mjs` (NEW) — isomorphic single-source registry: request hash +
  template selection + gate/refuse rules.
- `src/idea_builder/generate-manifests.mjs` (NEW) — runs each template's real selftest and writes bound
  template manifests + per-request evidence manifests.
- `tests/generated_apps/calculator/**` (NEW) — real local calculator app (core.mjs, index.html, package.json,
  tests/calculator.selftest.mjs, LIMITATIONS.md).
- `tests/idea_builder_binding/binding.selftest.mjs` (NEW) — 11 binding assertions incl. the regression.
- `tests/e2e-dashboard/falsegreen-binding.mjs` (NEW) — 17 live-UI checks incl.
  FALSE_GREEN_REGRESSION_CALCULATOR_REQUEST_MUST_NOT_OPEN_TASK_PLANNER.
- `demo/founder_operating_environment/assets/app.mjs` (EDIT) — Idea Builder rewired to the registry:
  classify shows template selection + request hash; load fetches the bound template manifest and renders
  request-bound status; preview href is derived from the manifest; unsupported/held show no DONE/PASS and no
  preview; missing manifest → UNKNOWN (never green).
- `demo/founder_operating_environment/index.html` (EDIT) — de-hardcoded the preview link (now `id`+`href="#"`,
  JS-bound), corrected the honesty warning to describe supported templates + refusal, added a disabled-link style.
- `demo/founder_operating_environment/assets/binding/{calculator,task_planner}_manifest.json` (NEW, generated).
- `tests/e2e-dashboard/wave9-builder.mjs` (EDIT) — updated to the corrected contract (planner idea → task_planner
  template; gate/refuse map to HELD_REQUIRES_FOUNDER_GATE / UNSUPPORTED_LOCAL_TEMPLATE).

## Architecture change (request-binding mechanism)
Single shared registry module used by BOTH browser and node. The typed request is hashed and classified once;
supported requests load a template manifest whose `test_result` came from that template's real selftest and
whose `preview_url` is the artifact path. The UI cannot show DONE/PASS or a preview that isn't in the bound
manifest. Static Wave 9 JSON is no longer on the current-build path.

## Calculator support
Real deterministic calculator (add/sub/mul/div/clear + single-expression evaluator, div-by-zero + invalid
handled). Selftest PASS 12/12.

## Unsupported handling
CRM/real-integration/unknown ideas → UNSUPPORTED_LOCAL_TEMPLATE (no build, no preview). deploy/merge/PR#200 →
HELD_REQUIRES_FOUNDER_GATE.

## Tests run (Builder-observed; see TEST_REPORT + independent reports)
- calculator.selftest: PASS 12/12
- binding.selftest: PASS 11/11
- planner.selftest (regression): PASS 13/13
- e2e falsegreen-binding: 17/17
- e2e wave9-builder (updated): 21/21
- e2e wave11-safety-check (cross-panel a11y): 14/14

## Known limits / what Builder cannot certify
- Only two local templates are supported (calculator, task_planner); everything else is honestly unsupported.
- Local synthetic only; not production/SaaS/secure/customer-ready/commercial. Decision never SHIP.
- Builder cannot certify its own correctness — the Checker and Terminal Advisor verdicts are authoritative.
