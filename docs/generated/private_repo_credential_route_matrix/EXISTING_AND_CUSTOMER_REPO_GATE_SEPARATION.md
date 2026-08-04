# Existing / Customer Repo Gate Separation (B4)

Five repo classes kept strictly separate; a label may never silently upgrade:

1. **Synthetic fixture** — LOCAL_OK_WITH_LIMITS.
2. **Founder-owned sandbox** — PROVEN_WITH_LIMITS (the deploy-key proof).
3. **Customer-like private (synthetic stand-in)** — LOCAL_SYNTHETIC_ONLY (still not a real customer repo).
4. **Existing valuable founder private repo** — TRUE_FOUNDER_GATE_BLOCKED.
5. **Customer private/production repo** — TRUE_FOUNDER_GATE_BLOCKED.

`attemptUpgrade(from,to)` **refuses** any move up a level unless the exact founder-gate token for that target class is presented (`FOUNDER_GATE:<TARGET>`). Tests prove a sandbox proof can never be treated as an existing-founder or customer repo. (See repo_gate_classifier.selftest — 8/8.)
