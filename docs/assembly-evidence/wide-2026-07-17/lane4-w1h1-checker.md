# W1-H1 Adversarial Checker Report — soak accumulator sub-result labeling

**Branch:** `w1h1-accumulator-label` HEAD `325eee3` · **Base:** main `e1cee56`. Checker ≠ author; read-only.

## Verdicts
1. **Scope — PASS.** Diff touches ONLY `reliability-soak.mjs` + its selftest; `slo()/passed()/newSoak()/addWindow()` unchanged; `soak-driver.mjs computeVerdict` (sole gate-token emitter) untouched; `docs/` diff empty.
2. **Label — PASS.** On a met claim `soakReport` emits `"SUB-RESULT (availability + duration only — NOT the gate verdict): <label> <N>-HOUR SOAK availability+duration PASS"`; contains no `SOAK PASS` substring and no gate token.
3. **Mutation proof (core) — PASS.** Scenario availability-passes-but-gate-fails (`quietEligible:false`): `computeVerdict` emits `"... SOAK — NOT-PASSED"` (not PASS); the accumulator sub-result is labeled and carries no gate token; a scan of the combined artifacts for `/FOUNDERGATE HARNESS \d+-HOUR SOAK PASS/` matches ZERO lines. The sub-result cannot be read/parsed as a gate PASS when the gate fails.
4. **Parsing still works — PASS.** `validateSoakClaims(sub-result)` = [] (no false gate-pass); `validateSoakClaims(real gate PASS text)` still returns one ok:true. `npm test` = ALL GREEN 83/83.
5. **No regression — PASS.** Historical run2/run24 bundles unchanged (`docs/` diff empty).

Non-defect note: `soak-run.mjs:3` header comment is now mildly stale (untouched, out-of-scope file) — not a W1-H1 hole.

## FINAL VERDICT: CLEAN
