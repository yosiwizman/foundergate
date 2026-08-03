# Safety Check — BLOCKED SAMPLE (synthetic/self-owned)
**Verdict: REFUSED · Owner decision: STOP_NEEDS_FOUNDER_GATE · never SHIP**
- Source: a synthetic request asking to deploy, charge users, connect a real calendar, use production
  data, merge to main, and edit PR #200 (names only; no real data).
- Checks: intent classification — multiple protected-gate / real-world actions requested.
- Risks: deploy → HOLD_PROTECTED_GATE; charge users → REFUSED; real calendar → REFUSED; production data →
  REFUSED; merge → HOLD_PROTECTED_GATE; PR #200 → HOLD_PROTECTED_GATE.
- Owner action: STOP — each requested real-world action needs a separate explicit founder authorization phrase. Developer review: YES.
- Next safe action: do nothing real; choose one gate and paste its exact phrase if/when you want it.
- NOT proven: anything real happened — nothing was executed.
- Blocked: deploy · billing/charge · real calendar/account · production data · merge · PR #200 mutation.
- Disclaimer: SAMPLE on synthetic material; nothing was executed; not production readiness; not a security certification.
