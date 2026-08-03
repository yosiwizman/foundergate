# Lane A — Request → Artifact Binding Contract (the new law)
Every Idea Builder run is a single bound chain. The same `request_id` / `request_hash` threads through:

```
request → template selection → generated artifact → tests → preview URL → evidence manifest → checker verdict → terminal advisor verdict
```

## Required fields (per request)
- `request_id` (= `req_<request_hash>`)
- `request_text`
- `request_hash` (FNV-1a of the typed text; identical in browser + node via the shared registry)
- `supported_template_id` OR `unsupported_reason`
- `generated_artifact_id`
- `generated_app_path`
- `preview_url`
- `test_plan_id`
- `test_results_path`
- `evidence_manifest_path`
- `builder_identity`
- `checker_verdict`
- `terminal_advisor_verdict`
- `final_status`

## Rules (enforced by code + tests)
- **DONE** cannot appear unless `request_id` binds to an artifact (a supported template was selected).
- **PASS** cannot appear unless tests bind to that artifact (the manifest's `test_result` comes from that
  template's real selftest run).
- **Preview** cannot open unless `preview_url` binds to the artifact — the link href is DERIVED from the
  fetched template manifest, never hardcoded.
- If the request is unsupported, status is **UNSUPPORTED_LOCAL_TEMPLATE**; if it is a protected real-world
  action, status is **HELD_REQUIRES_FOUNDER_GATE**. Neither shows DONE/PASS or a preview.
- Static historical Wave 9 evidence (assets/idea_builder.json) is **no longer read** by the current-build
  path; it may only be shown as historical demo, never as a current build result.
- The UI shows **UNKNOWN** (never green) if the bound manifest is missing/unreadable.
- **Builder cannot set the Checker verdict.** **Checker cannot modify the artifact.** **Terminal Advisor
  cannot modify the artifact.** (Role separation — see role transcripts + attestation.)

## Single source of truth
`src/idea_builder/template-registry.mjs` is the ONLY place request→template selection and the request hash
are defined. The browser Idea Builder imports it over HTTP; the node manifest generator imports it directly.
Because both sides share one module, the on-screen status and the on-disk evidence cannot drift.
