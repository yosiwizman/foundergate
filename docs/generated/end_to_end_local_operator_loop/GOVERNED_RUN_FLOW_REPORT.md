# Governed Run Flow
The Run button, only when eligible:
- uses the real local backend (127.0.0.1) `/api/start`;
- runs only safe demo / self-owned material (allowlisted target);
- does not install dependencies, access network, use a provider, or spend money;
- does not mutate protected repos or use customer/private/production data;
- returns honest COMPLETE / UNKNOWN / HOLD / ERROR (with a run timeout → HOLD).
Every run first resets all panels to UNKNOWN (no stale green). The decision is shown only after a
real completed run and can never be SHIP.
Verified (E2E): default + custom-safe runs COMPLETE 30/30; failure modes → HOLD/ERROR (Wave 3 suite).
