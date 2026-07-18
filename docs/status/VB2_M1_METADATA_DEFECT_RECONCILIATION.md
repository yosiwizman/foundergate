# VB2 M1 Post-Run Metadata Defect Reconciliation (annotated; evidence NOT rewritten/force-pushed)
- Historical ledger note mentioning `soak-evidence-vb2-undefined`: a display/interpolation defect in a
  ledger message. **Actual** branch = soak-evidence-vb2-integrated-8h-rerun-20260717T173028Z; **actual**
  commit = 68cb1fa; **actual** parent = b9af1def. The branch was created and the commit pushed ONLY
  after all 18 checks passed and the Git freeze ended; NO git mutation occurred during the 8h active
  window (RESULT-ONEPAGE: "Git during active window: NONE", isolated detached worktree). The `undefined`
  string is a proven historical message defect, not a real branch/commit ambiguity.
- Some final-seal ledger events omit the qualification_run_id field. Preserved as historical; future
  ledger schema must require qualification_run_id + driver_lease_run_id + intended/actual branch+commit
  + operation timestamp + result.
**POST_RUN_METADATA_DEFECTS: ANNOTATED_NON_RUNTIME_DEFECTS** (actual git operations fully proven from
the evidence commit/parent/branch; no active-window mutation).
