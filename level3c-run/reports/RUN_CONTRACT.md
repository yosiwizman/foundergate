# Run Contract — Level-3C Logging Fix + Level-2 Two-Hour Proof

- **run_id:** FounderGate_Level3C_LoggingFix_Level2_Proof_20260730T0845ET
- **Max runtime:** 3.5 h · **Part A max:** 60 min · **Part B minimum wall-clock:** 120 min
- **Provider invocations:** 0 planned (fix is pure local bash; no provider needed). Hard max 1 only if a local correction were impossible — it is not.
- **No** customer/private/production data. **No** external sends.
- **Fixed evidence root:** `~/.foundergate/runs/FounderGate_Level3C_LoggingFix_Level2_Proof_20260730T0845ET/`
- **Level-2 proof root:** `<fixed root>/level2-proof/`

## Two-part authority
- **Part A** — move-resilient logging fix (fixed non-Finder evidence root; fail-closed on write failure; duration from monitor+ledger disk spans only).
- **Part B** — one uninterrupted ≥120-min Level-2 proof, **only if** Part A passes short qualification + independent Checker CLEAN.

## Final statuses
`LEVEL3C_LOGGING_FIX_READY_AND_LEVEL2_TWO_HOUR_PROVEN` · `LEVEL3C_LOGGING_FIX_READY_LEVEL2_NOT_RUN` · `LEVEL2_DURATION_NOT_PROVEN` · `CORRECTION_REQUIRED` · `INSUFFICIENT_EVIDENCE` · `HOLD`

## Honesty rule
A completed timer is never a PASS. Level-2 PASS requires monitor span ≥120 min **and** ledger span ≥120 min proven from disk, with Checker + Gate Advisor confirming the same unchanged evidence.
