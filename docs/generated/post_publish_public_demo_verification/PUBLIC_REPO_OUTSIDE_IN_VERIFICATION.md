# Public Repo Outside-In Verification
Verified 2026-08-01 (ET) by fresh clone from the public URL — no local shortcuts.

| Check | Result |
|-------|--------|
| Clone from public URL works | YES |
| Default branch | main |
| HEAD commit | 0bb2817174c95f121b05de28686f706aeec82dd5 |
| HEAD == published commit | YES (exact match, GitHub did not advance) |
| File list matches candidate root | YES (9 files) |
| Self-test (node tests/task-ledger.selftest.mjs) | ALL GREEN: 30/30 |
| Dependencies | none |
| Install requirement | none (node_modules absent, package.json deps = none) |
| README honest | YES (local-only; no network/secrets/auth/db; never SHIP) |
| KNOWN_LIMITATIONS present + honest | YES (not production/customer/secure/compliant/deployed) |
| LICENSE present | YES (MIT) |
| .gitignore present | YES |

Conclusion: the public repo is exactly the vetted candidate, verified from outside the machine.
