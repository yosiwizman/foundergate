# Evidence Binding Test Report
A focused verifier checked the corrected CTO receipt against 11 binding conditions:
- 1 FINAL_STATUS binds final head 80ce45b: PASS
- 2 FINAL_VERDICT head==80ce45b: PASS
- 2b FINAL_VERDICT final_head==80ce45b: PASS
- 3 FINAL_VERDICT earlier_frozen_candidate==0381aea: PASS
- 3b FINAL_VERDICT head is NOT 0381aea: PASS
- 4 BACKUP has final head 80ce45b: PASS
- 4b BACKUP has earlier candidate 0381aea: PASS
- 5 CHANGED_FILES has primary build 0381aea: PASS
- 5b CHANGED_FILES has final head 80ce45b: PASS
- 6 evidence/final_head.txt==80ce45b: PASS
- 7 no FINAL_STATUS stale-final 0381aea: PASS

Result: all conditions PASS. FINAL_STATUS.md and FINAL_VERDICT.json bind final head 80ce45b; FINAL_VERDICT carries both final_head (80ce45b) and earlier_frozen_candidate (0381aea); BACKUP and CHANGED_FILES distinguish the primary build commit (0381aea) from the final head (80ce45b); evidence/final_head.txt matches 80ce45b; no top-level report treats 0381aea as the final head.
