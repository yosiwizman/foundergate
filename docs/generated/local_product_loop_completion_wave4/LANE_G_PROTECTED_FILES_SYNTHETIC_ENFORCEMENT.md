# Lane G — Protected Files Synthetic Enforcement Upgrade
Client-side only (no filesystem access): typed-name classifier + sample allowlist + sample
blocklist + BATCH classification over a synthetic manifest. Blocked names are never read (they are
strings matched by regex). Labeled LOCAL_SYNTHETIC_ENFORCEMENT_DEMO — not production enforcement.
Verified (E2E): ALLOWED/BLOCKED/HOLD single check + batch classify shows all three.
