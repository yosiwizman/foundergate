# Public Repo Rules
A repo is eligible ONLY if ALL hold:
- It is **publicly visible** (not private, not internal-only).
- It contains **no secrets** (a secret scan comes back clean of real tokens/keys).
- It contains **no customer / private / production data** (no PII, no prod configs, no real user records).
- The objective is **small and bounded** (a focused change, not a rewrite).
- The prospect is **comfortable with an honest do-not-ship / insufficient outcome.**

If any is false → the repo is **NOT eligible** for the concierge phase. Decline and explain why (it protects both sides).
