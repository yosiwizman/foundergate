# Checker Report — Independent Read-Only (Crash Gauntlet; tried to FALSIFY)
All falsification attempts REFUTED:
1. Fake fixtures? REFUTED — F05 has a real failing test; F07/F08 are Round1/Round2 copies w/ stale run_ids; F12 carries a checker hash. Live F05 → HOLD_TEST_FAILURE.
2. Recovery rewrote history? REFUTED — each recovered fixture keeps original actual_classification (HOLD_*) + separate recovery.after_classification (e.g. F02: HOLD_CORRUPTED_MANIFEST → after OK, retested PASS 5/5).
3. Broken shows green? REFUTED — crash-fixtures 14/14; anyGreenOnBroken=false; every preview_allowed=false.
4. Wrong preview/stale accepted? REFUTED — false-green-hostile 10/10; F07/F08 HOLD_STALE_EVIDENCE; F04 HOLD_PREVIEW_MISMATCH.
5. Checksum corruption ignored? REFUTED — F12 HOLD_POST_CHECKER_MUTATION (content hash differs).
6. Screenshots stale/fake? REFUTED — 7 real PNGs, 7 distinct md5, non-trivial.
7. Visible browser not used? REFUTED — 344KB .webm present.
8. Self-certified? REFUTED — fixture manifests PENDING; BUILDER_REPORT does not claim CLEAN.
9. Unsupported got preview? REFUTED — F09 HOLD_UNSUPPORTED_OR_UNSAFE; unsupported 16/16.
10. Boundary breached / prior evidence corrupted? REFUTED — factory_runs & factory_round2 tracked evidence EMPTY diff; origin/main 65fd01669f80; PR #200 untouched; changes additive + scoped.

Recovery accounting: 12 injected / 12 HELD / 6 recovered to OK+retested PASS (F01,F02,F04,F06,F10,F11); F07/F08 recovery correctly FAILED and stayed HOLD_STALE; F03/F05/F09/F12 not recovered.
Limits (non-defects): 6 recovered fixtures are recovered in-place, so their original broken state is verified via preserved records + retest; browser evidence assessed from webm/PNG (browser not re-driven, per read-only mandate).

**CHECKER_VERDICT: CLEAN_WITH_LIMITS**
