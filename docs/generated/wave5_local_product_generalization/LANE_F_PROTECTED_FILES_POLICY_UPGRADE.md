# Lane F — Protected Files Synthetic Policy Upgrade
Named synthetic policies: demo-safe, block-secrets, block-customer, block-production, block-private.
- Typed-name check against the selected policy.
- Batch classify a synthetic manifest under the policy.
- Export a synthetic classification report (local JSON download).
- No real filesystem access (regex-only). Labeled LOCAL_SYNTHETIC_ENFORCEMENT_DEMO — not production.
Verified (E2E): block-customer blocks customer/*; block-production does NOT block customer/* (scoping);
export downloads a report.
