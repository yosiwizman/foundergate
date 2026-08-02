# HOLD Behavior Report
Unsafe/uncertain conditions return HOLD/REFUSED, never a pass:
- wrong-account → HOLD (never substitutes an account).
- offline/no-network → HOLD (never fakes a remote verification).
- secret-like token present → REFUSED (never packages).
- unsafe action type (delete/deploy/push/publish/exec/chmod/network) → REFUSED.
This mirrors the real run behavior (e.g. the earlier AKIOR HOLD when the second account was unauthenticated).
