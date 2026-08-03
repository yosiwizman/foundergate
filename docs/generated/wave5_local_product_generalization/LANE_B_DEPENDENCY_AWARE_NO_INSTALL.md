# Lane B — Dependency-Aware No-Install Policy
- package manifest declares dependencies AND node_modules present → may run (safe fixture) → PASS/FAIL.
- package manifest declares dependencies AND node_modules absent → HOLD_DEPENDENCIES_NOT_INSTALLED.
- requirements.txt present without venv/deps → HOLD_DEPENDENCIES_NOT_INSTALLED.
- cargo/go/java toolchain missing → UNKNOWN_RUNTIME_MISSING.
- install command requested → REFUSED_NEEDS_AUTHORIZATION.
No install is ever attempted; no network. Verified live + E2E.
