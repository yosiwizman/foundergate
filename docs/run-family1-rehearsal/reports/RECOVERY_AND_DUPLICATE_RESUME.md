# PHASE 6 — Recovery & Duplicate-Resume Audit
- Recovery file exists and is readable after a simulated interruption (evidence/recovery/recovery_state.json).
- Simulated resume verified IDENTICAL run_id + candidate SHA + queue_sha256 → resume ALLOWED only on exact match.
- Duplicate active operation REFUSED: a second lock attempt fails while this run holds the lock; a mismatched
  resume (wrong run_id/candidate) is refused fail-closed (evidence/duplicate_resume/duplicate_resume_refusal.json).
- No stale lock remains from prior runs (only this run's lock, released at completion). Queue state complete (8/8).
- Final state deterministic: same candidate + same queue → same job verdicts.
