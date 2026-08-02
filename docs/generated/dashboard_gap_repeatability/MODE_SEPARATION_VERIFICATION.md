# Mode Separation — Verification
- Founder render (screenshots/founder_mode_render.txt): contains 0 full SHAs / 0 sha-256 (grep-verified). renderFounderText THROWS if a SHA would leak — enforced in code and asserted in self-tests.
- Developer render (screenshots/developer_mode_render.txt): contains the head SHA (>=1) and guard outputs — as intended.
- Self-tests assert: founder text has no 40/64-hex; a buildLabel that is a full SHA is rejected to UNKNOWN; developer text MAY include the SHA. 14/14 green.
