# Lane C — Run Failure / Interruption

- Running state is visible ("Running a safe local check…"; Run disabled during the run).
- On `/api/start` returning ERROR → "ERROR — …"; export stays disabled; decision stays UNKNOWN.
- On REFUSED / INSUFFICIENT / UNAUTHORIZED → "HOLD — …" with a plain next step.
- On timeout → an AbortController stops the run and shows "HOLD — run took too long".
- Decision is shown as INTERNAL_DEMO_ONLY **only** after a real completed run; otherwise UNKNOWN.
- No raw logs; next action always says stop and ask ChatGPT.

Verified (Lane K E2E, scenarios 4/5/6): ERROR, REFUSED→HOLD, timeout→HOLD; export disabled in all.
