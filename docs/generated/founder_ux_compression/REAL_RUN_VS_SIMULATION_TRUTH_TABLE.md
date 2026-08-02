# Real Run vs Simulation Truth Table
| Situation | What happens | What the UI says |
|-----------|--------------|------------------|
| Server running + valid objective | REAL local check (real commit + real tests) | COMPLETE — real local run via the loopback server |
| Empty objective | no run | INSUFFICIENT — enter an objective |
| Disallowed target | refused | REFUSED — target not in the local allowlist |
| Bad/no token or external Origin | refused | UNAUTHORIZED — session token/Origin check failed |
| Server OFF | no run | LOCAL_SERVER_UNAVAILABLE (UNKNOWN) |
There is NO silent "simulation" path in the server-backed dashboard; the honest fallback is UNKNOWN. (A separate offline simulation module exists but is not the dashboard's server path.)
