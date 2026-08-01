# Max-Wide Receipt Correction Report

## Defect found
The sealed max-wide package (FounderGate_Max_Wide_Autonomous_Build_Review_ChatGPT_20260801T1630ET.zip, SHA-256 2be4c290…) recorded the branch head inconsistently:
- FINAL_STATUS.md and FINAL_VERDICT.json bound head = `36f72c1f` (the value captured at the initial freeze, BEFORE the follow-up "Advisor-note correction" commit).
- evidence/final_head.txt, the terminal output, and GitHub all identify the actual final head = `547de7344147d67b13ce8d58c8d24a9cdc8fed7e`.

The two commits: `36f72c1f` = initial frozen candidate (79 files); `547de734` = final head after a small doc-only follow-up commit (added BROWSER/ACCESSIBILITY reports + corrected a file-count) requested by the Gate Advisor. FINAL_STATUS/VERDICT were written using the pre-follow-up SHA and not re-stamped after the second commit.

## Files corrected (this run)
- CORRECTED_MAX_WIDE_FINAL_STATUS.md — head now `547de7344147`, with a historical note that `36f72c1f` was the earlier frozen candidate.
- CORRECTED_MAX_WIDE_FINAL_VERDICT.json — `head`=547de734 (full), `tree` re-derived, `earlier_frozen_head`=36f72c1f, plus an `evidence_binding_correction` field.
- The prior run's receipt copies were refreshed on disk to match (evidence hygiene).
- BACKUP_AND_GITHUB_SYNC_REPORT.md (this run) states the initial-frozen vs final-head distinction and origin/main unchanged.

## Why this is evidence-correction only
No product code, test, or scan claim changed. The corrected head `547de734` is a superset of `36f72c1f` (same 79-file build + a doc-only commit). All test/scan results (114/114 suite, lane tests, browser 3/3, a11y 0-serious, scans 0) were mechanically produced against this exact tree and remain valid. Only the head/tree identifier string was wrong; it is now bound to the actual final commit.

## No product behavior changed
The correction touches only evidence-record identifier fields. The max-wide branch content is unchanged; protected origin/main remains `65fd0166`; PR #200 remains OPEN and untouched.
