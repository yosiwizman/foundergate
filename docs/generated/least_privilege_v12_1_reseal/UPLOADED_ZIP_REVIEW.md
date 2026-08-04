# Uploaded ZIP Review (A1)

Mechanical inspection of the prior least-privilege witness ZIP.

| Field | Value |
| --- | --- |
| ZIP SHA-256 | `d46ce5cfa54b25d00ab7d17686241e5844926ca14c277818051f9587497dc476` |
| Unzip integrity | **OK** |
| Internal SHA256SUMS | **OK** (38 entries) |
| Entry count | 49 |
| FINAL_STATUS.md | PRESENT |
| PROJECT_KNOWLEDGE_UPDATE_BUNDLE_V12.md | PRESENT |
| REVOCATION_PROOF.json | PRESENT |
| ACTUAL_LEAST_PRIVILEGE_EVIDENCE.json | PRESENT |
| UI screenshots / video | 8 png / 1 webm PRESENT |
| **CHECKER_REPORT.md** | **ABSENT** |
| **GATE_ADVISOR_REPORT.md** | **ABSENT** |
| Secret scan | CLEAN |
| Private-key scan | CLEAN |
| Candidate identity in ZIP FINAL_STATUS | `19f280e…` (pre-amend intermediate) |

**Classification: `V12_PACKAGE_INCOMPLETE_REVIEW_REPORTS_MISSING`.** The proof content is intact and secret-clean; the package is missing the two independent reviewer reports (the ZIP was sealed before the reviewers finished) and its FINAL_STATUS records the pre-amend seal head. Both are corrected in V12.1.
