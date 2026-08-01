# CTO Receipt Correction Report
## Defect
The prior CTO package (ZIP SHA b2e82420…) bound the FINAL head to `0381aea0e75e` in FINAL_STATUS.md, FINAL_VERDICT.json, BACKUP_AND_GITHUB_SYNC_REPORT.md, and CHANGED_FILES_REPORT.md. The actual final branch head is `80ce45b2208f` (evidence/final_head.txt and GitHub already had it right). `0381aea0e75e` was the PRIMARY sensitive-runtime build commit (the ~64-file build); `80ce45b2208f` is a small follow-up documentation/disclosure correction commit (auth threat-model note + changed-files note requested by the Checker/Advisor). The final-head fields were written using the pre-follow-up SHA and not re-stamped.
## Affected files (corrected)
FINAL_STATUS.md · FINAL_VERDICT.json · BACKUP_AND_GITHUB_SYNC_REPORT.md · CHANGED_FILES_REPORT.md. FINAL_VERDICT.json now carries BOTH final_head=80ce45b2208f and earlier_frozen_candidate=0381aea0e75e (+ primary_build / final_correction commit fields).
## Corrected final head
`80ce45b2208f786b524ec50b953599a779c7df89`. Historical role of `0381aea0e75e8b492138d6da0a4117e182f3bd62`: earlier frozen candidate / primary sensitive-runtime build commit — retained, not final.
## Why evidence-correction only
No product code, test, or scan claim changed. `80ce45b2208f` is a doc-only superset of `0381aea0e75e` (same build + disclosure notes); all test/scan results (114/114, session-token 11/11, action-gate 9/9, E2E 3/3, soak 12/4/0) were produced against this exact tree and remain valid. Only the head identifier string was wrong; it now binds to the actual final commit.
## No product behavior changed
Correction touches only evidence-record identifier fields. The CTO branch content is unchanged; origin/main remains 65fd0166; PR #200 OPEN, untouched.
