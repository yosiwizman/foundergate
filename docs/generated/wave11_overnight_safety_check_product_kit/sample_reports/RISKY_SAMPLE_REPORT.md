# Safety Check — RISKY SAMPLE (synthetic/self-owned)
**Verdict: REPAIR · Owner decision: REPAIR_BEFORE_SHOWING · never SHIP**
- Source: synthetic app that declares dependencies but has no tests (self-owned; no customer data).
- Checks: node with declared deps; node_modules absent → HOLD_DEPENDENCIES_NOT_INSTALLED (no install);
  no test files → NO_TESTS_FOUND.
- Risks: no tests to prove behavior; dependencies uninstalled; cannot confirm the app works.
- Owner action: repair first (add tests / provide a runnable state); do not present as verified. Developer review: YES.
- Next safe action: add tests and re-check; nothing was installed or faked.
- NOT proven: that the app works; production/security/scale.
- Blocked: deploy · install without authorization · presenting as verified.
- Disclaimer: SAMPLE on synthetic material; not production readiness; not a security certification; not legal advice.
