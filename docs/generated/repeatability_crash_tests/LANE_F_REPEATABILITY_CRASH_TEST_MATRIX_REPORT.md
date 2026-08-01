# Lane F — Repeatability / Crash-Test Matrix — Report
Defines the repeatability proof ladder + local deterministic fixtures. No external repo execution, no provider run, no private data.

## 10 safe objectives (library)
1. add input validation (reject empty). 2. add a defensive default bucket. 3. add a remove/undo op. 4. fix an off-by-one. 5. add an evidence-note export. 6. rename a field with back-compat. 7. add a pure formatter. 8. guard a divide-by-zero. 9. add a bounded retry (pure). 10. add a status transition guard.

## Fixture repos (local, synthetic)
See fixtures/repeatability_crash_tests/. Each is a tiny local module + JSON manifest; none is external or real.

## Failure cases / crash tests
- test asserts a wrong value (expected RED); - throw on invalid input (expected caught); - empty input (INSUFFICIENT); - all-blocked (DO_NOT_SHIP); - process exit non-zero on failure.

## Evidence requirements & scoring rubric
Each run binds: pre/post SHA, diffstat, pass/fail counts, honest decision (never SHIP), Checker+Advisor. Score = {objective met? tests green? bounded? honest decision? evidence sealed?} → PASS_WITH_LIMITS / INSUFFICIENT / DO_NOT_SHIP.

## Local deterministic fixture tests
Executed this run: a crash-matrix self-test proving the RED/caught/INSUFFICIENT/DO_NOT_SHIP behaviors deterministically.
