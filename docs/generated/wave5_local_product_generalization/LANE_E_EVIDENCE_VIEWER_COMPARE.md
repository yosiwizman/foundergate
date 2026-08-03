# Lane E — Evidence Viewer Compare / Multi-Package Replay
- Load the latest local sealed package summary (single or aggregate) via read-only /api/last-evidence.
- Capture as A and B, then Compare A vs B across: kind, aggregate conclusion, pass/total, refused,
  decision ceiling, limitations, what-was-not-proven, ZIP verified — with same/DIFF flags.
- No raw logs, no full SHA, no arbitrary private file picker.
Verified (E2E): compare shows fields + same/DIFF; no 40-hex SHA.
