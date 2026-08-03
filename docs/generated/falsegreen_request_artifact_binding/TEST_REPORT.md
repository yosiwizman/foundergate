# Lane N — Test Report
| Test | Type | Result |
| --- | --- | --- |
| tests/generated_apps/calculator/tests/calculator.selftest.mjs | unit (calculator) | **PASS 12/12** |
| tests/idea_builder_binding/binding.selftest.mjs | unit (request→template binding) | **PASS 11/11** |
| tests/generated_apps/wave9_appointment_task_planner/tests/planner.selftest.mjs | unit (planner regression) | **PASS 13/13** |
| tests/e2e-dashboard/falsegreen-binding.mjs | E2E (live UI binding) | **17/17** |
| tests/e2e-dashboard/wave9-builder.mjs | E2E (updated contract) | **21/21** |
| tests/e2e-dashboard/wave11-safety-check.mjs | E2E (cross-panel a11y incl. idea) | **14/14** |

Key proven behaviors:
- Calculator request → calculator template, **PASS 12/12**, preview opens Calculator (regression:
  FALSE_GREEN_REGRESSION_CALCULATOR_REQUEST_MUST_NOT_OPEN_TASK_PLANNER passes).
- Task-planner request → task_planner template, **PASS 13/13**, preview opens Appointment/Task Planner.
- Unsupported request → UNSUPPORTED_LOCAL_TEMPLATE, **no DONE/PASS**, preview disabled.
- Preview href == manifest.preview_url (derived, not hardcoded); missing manifest → UNKNOWN (never green).
- a11y: 0 serious/critical across panels.
