# Test Report — Task-Planner NL Matcher Correction
| Test | Result |
| --- | --- |
| tests/idea_builder_binding/binding.selftest.mjs (incl. FOUNDER_BLIND_REGRESSION_TO_DO_APP_MUST_BIND_TO_TASK_PLANNER) | **PASS 22/22** |
| tests/generated_apps/calculator/tests/calculator.selftest.mjs | PASS 12/12 |
| tests/e2e-dashboard/task-planner-nl-matcher.mjs (live UI + screenshots) | **11/11** |
| tests/e2e-dashboard/falsegreen-binding.mjs (regression) | 17/17 |
| tests/e2e-dashboard/wave9-builder.mjs (regression) | 21/21 |

Proven: "build to do app" → task_planner (PASS 13/13, planner preview); to-do/todo/task list/checklist →
task_planner; real reminders+calendar & reminder emails → held/refused (no DONE/PASS/preview); deploy & PR#200
→ HELD; calculator → calculator; unrelated → UNSUPPORTED. No false-green.
