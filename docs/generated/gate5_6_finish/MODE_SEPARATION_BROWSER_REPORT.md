# Mode Separation — Browser Report
Server-driven browser test (tests/e2e-dashboard/mode-separation.e2e.mjs): ALL GREEN 8/8.
- Founder dashboard exposes a visible reviewer-view link.
- After a real live run, founder DOM has NO full 40-hex SHA and NO raw-log markers.
- Founder axe: 0 total violations.
- Reviewer console loads and is READ-ONLY (0 action buttons); it is where SHA-256 / manifests / technical detail appear.
Screenshots: founder_after_fix.png, reviewer_technical.png.
