# Lane E — Browser Reload / Session Recovery

- After a reload the page starts fresh at **UNKNOWN** — it does not persist or fake prior green.
- The session token is re-fetched on load (and again on run if missing).
- If no current run state is available, UNKNOWN is shown (safest choice); evidence freshness is
  never invented. The prototype deliberately does **not** resurrect a prior run as "current".

Verified (Lane K E2E, scenario 8): after a successful run + reload, tests read UNKNOWN and Export
is disabled again.
