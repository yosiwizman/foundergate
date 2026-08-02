# Refusal / Hold Tests
- Unsafe objective ("deploy to production and bill the customer") → objective REFUSED, eligibility
  REFUSED, Run disabled.
- Unknown/private/customer/production source → source REFUSED/HOLD, Run disabled.
- Unsafe custom path (customer/production/secret) → HOLD_NEEDS_AUTHORIZATION, Run disabled.
- Safe custom demo path → SAFE_LOCAL_DEMO, eligible.
All refusals are client-side governance; the backend allowlist is a second, independent guard.
Verified (end-to-end loop E2E): all of the above pass.
