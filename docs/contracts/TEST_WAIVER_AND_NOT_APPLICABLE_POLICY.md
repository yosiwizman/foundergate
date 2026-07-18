# Test Waiver & NOT_APPLICABLE Policy (TBF-1)

A test class may be `NOT_APPLICABLE` only when: (1) the task impact does not invoke it; (2) a specific
reason from the permitted list is recorded; (3) the validator confirms the reason. A required test
(derived from the impacts) can **never** be NOT_APPLICABLE — attempting it fails validation.

Permitted reasons: `no_rendered_surface`, `no_runtime_surface`, `no_api_surface`, `no_data_layer`,
`no_external_dependency`, `no_security_boundary`, `no_authority_gate`, `no_live_action`,
`no_production_surface`, `documentation_only_no_execution`.

A required test that cannot run is `BLOCKED` — never converted to PASS. No waiver may authorize hidden
false-green, missing exact-SHA binding, missing teardown, missing authority proof, missing founder
signature, or missing independent checker where required.
