# Stale-Head Prevention Standard
Every future run MUST run the final-head guard after its last commit and before recording the ZIP SHA. If a follow-up commit is made after FINAL_STATUS/VERDICT were written, re-stamp and re-run the guard. A run may not be declared "done" while the guard reports any FAIL. This retires the stale-head defect class mechanically rather than by vigilance.
