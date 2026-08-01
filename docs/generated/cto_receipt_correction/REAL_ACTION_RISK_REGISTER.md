# Real Action Risk Register
| Risk | Mitigation (required before real execution) |
|------|---------------------------------------------|
| Destructive action | Hard allowlist of non-destructive types; forbidden types refused |
| Path escape | Sanitize + boundary-check to an explicitly-scoped dir |
| Irreversibility | Capture a rollback receipt BEFORE acting; verify rollback after |
| Unauthorized trigger | Require session token + loopback Origin |
| Scope creep | One action per request; no batching; founder authorizes the action class |
| Silent failure | Honest UNKNOWN/ERROR states; never fabricate success |
All are design requirements; real execution remains a founder gate (not crossed).
