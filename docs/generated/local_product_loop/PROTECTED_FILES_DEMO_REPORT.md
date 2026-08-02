# Protected Files — Synthetic Enforcement Demo
Files/Protected Files is a LOCAL_SYNTHETIC_ENFORCEMENT_DEMO: it classifies a typed synthetic file
name against a sample allowlist/denylist entirely in the browser. ALLOWED (demo/notes/tests/
task-ledger), BLOCKED for safety (secrets/*.env/customer/production/private/credential), or HOLD
(not on the allowlist). No real files are scanned, no secrets, no customer/private/production files.
Clearly labeled NOT production enforcement. Verified: ALLOWED/BLOCKED/HOLD paths all pass.
