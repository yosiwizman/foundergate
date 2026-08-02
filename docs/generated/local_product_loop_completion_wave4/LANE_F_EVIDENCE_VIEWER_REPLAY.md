# Lane F — Evidence Viewer / Replay
The Evidence Viewer panel loads the latest local sealed package summary via read-only, loopback-only
`GET /api/last-evidence`. It shows a founder-readable summary: kind, aggregate conclusion, passed,
refused, decision ceiling (never SHIP), limitations, what was NOT proven, and whether the ZIP
verified. No raw logs, no full SHA, no secrets, no customer/private/production data, no arbitrary
file picker. Verified (E2E): replays the sealed aggregate summary; no 40-hex SHA shown.
