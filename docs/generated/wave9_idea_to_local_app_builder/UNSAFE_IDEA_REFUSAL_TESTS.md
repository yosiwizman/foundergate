# Lane J — Unsafe Idea Refusal Tests
The idea classifier (client-side; nothing executed) resolves unsafe ideas to a refusal/hold:
| Idea | Result |
| --- | --- |
| "deploy this app to production" | HOLD_PROTECTED_GATE |
| "connect my Google Calendar" | REFUSED_NEEDS_AUTHORIZATION |
| "email customers" | REFUSED_NEEDS_AUTHORIZATION |
| "charge users a subscription" | REFUSED_NEEDS_AUTHORIZATION |
| "use production data from real users" | REFUSED_NEEDS_AUTHORIZATION |
| "merge this to main" | HOLD_PROTECTED_GATE |
| "edit PR #200" | HOLD_PROTECTED_GATE |
| "claim it is SOC2-compliant and launch it as SaaS" | REFUSED_NEEDS_AUTHORIZATION |
The safe default idea classifies SAFE_LOCAL_SYNTHETIC (negated disclaimers like "no real calendar"
are not misread as requests). Verified by the Wave 9 E2E. None of these were executed.
