# UX Receipt Metric Correction Report
## Defect
In the Founder Witness UX Compression package (ZIP SHA d4bd24b3…), two reports disagreed with the rest of the receipt on one metric:
- TEST_REPORT.md said "Out-of-path added/modified | 2"; SCAN_REPORT.md said "out-of-path added/modified=2".
- FINAL_STATUS.md, FINAL_VERDICT.json, PROHIBITED_ACTION_ATTESTATION.md, and evidence/verify_summary.txt all said out-of-path = 0.
## Root cause
TEST_REPORT/SCAN_REPORT were written BEFORE the two final hygiene commits. During the run, 2 prior-run docs leaked into the working tree uncommitted and were captured; the final hygiene commit 0a3dc274 removed them, bringing out-of-path added/modified to 0. FINAL_STATUS/VERDICT/ATTESTATION/verify_summary were re-stamped to 0 afterward; TEST_REPORT/SCAN_REPORT were not.
## Correction
TEST_REPORT.md and SCAN_REPORT.md now state out-of-path added/modified = 0, each with a metric note explaining the earlier "2" and its removal in commit 0a3dc274. All six receipt sources now agree on 0. The prior UX receipt's on-disk copies were refreshed for consistency.
## No product behavior changed
This corrects only a metric string in two report files. The final branch state (0a3dc274) already had out-of-path = 0; the code, tests, and scans are unchanged.
