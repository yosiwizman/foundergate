# Lane 0 — False-Green Failure Record (preserved, not rewritten)
This correction exists because of a confirmed failure. That failure is preserved here in full.

- **Founder request:** "Build a simple calculator app."
- **Old UI claim:** SAFE / DONE / **PASS 13/13** / preview available.
- **Old actual preview:** **Appointment / Task Planner** (not a calculator).
- **Classification:** **FALSE_GREEN_CONFIRMED** (independent Checker + Terminal Advisor, audit
  FounderGate_FalseGreen_Calculator_Mismatch_Audit_COMPLETE_20260803T0630ET).
- **Source cause:** the typed idea reached only a safety classifier; the build status came from a static
  JSON (assets/idea_builder.json) describing the planner; the preview link was hardcoded to
  tests/generated_apps/wave9_appointment_task_planner/index.html; no calculator was generated; PASS 13/13
  belonged to the task planner, not the calculator request. The typed idea was never bound to an
  artifact / test / preview.
- **Gate 8: BLOCKED** at time of failure.
- **No commercial execution allowed.**

This record must not be overwritten with a clean narrative. The correction below is valid only if it makes
this class of failure impossible to show silently as green.
