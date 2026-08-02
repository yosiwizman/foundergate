# Repo / Source Intake
- Default option: **Safe local demo — self-owned** (SAFE_LOCAL_DEMO). Also: Local fixture (self-owned).
- **Unknown / private / customer / production** source → REFUSED / HOLD_NEEDS_AUTHORIZATION; never run.
- Optional local path: accepted only if it matches a known safe demo path
  (`self_owned_demo_repo` / the demo selftest / a `/demo/` path) and contains no
  customer/private/production/secret markers; otherwise HOLD_NEEDS_AUTHORIZATION.
- Even if a source were mis-selected, the backend `/api/start` allowlist independently refuses any
  target that is not the self-owned demo / local fixture.
Verified (E2E): default SAFE_LOCAL_DEMO; unknown source REFUSED + Run disabled; safe path SAFE;
unsafe path HOLD + Run disabled.
