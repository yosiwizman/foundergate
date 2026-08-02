# Safety Classification
Shown before Run, in the deck-style intake card:
- **Source classification**: SAFE_LOCAL_DEMO / HOLD_NEEDS_AUTHORIZATION / REFUSED.
- **Objective classification**: SAFE / REFUSED.
- **Run eligibility**: READY_LOCAL_DEMO / HOLD_NEEDS_AUTHORIZATION / REFUSED / UNKNOWN
  (UNKNOWN when the local backend is unavailable).
Run is **disabled** unless eligibility is READY_LOCAL_DEMO. Classification updates live as the
founder changes source/objective, and on each health poll.
Verified (E2E): all four eligibility outcomes exercised.
