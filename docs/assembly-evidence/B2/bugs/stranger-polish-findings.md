# Bug evidence — true-stranger polish findings (post-B3)

- **Date:** 2026-07-07
- **Source:** the true non-developer Stranger Test (which PASSED). These are *polish* findings, not failures.

## Findings

1. **Jargon confusion (visible technical tokens).** The stranger understood the dashboard but stumbled on raw
   tokens: `gate`, `CI`, `PR`, `V8-A1`, `MOCK_ONLY`, and bare filenames. They want a plain-English companion for
   each. → Fixed this lane (bounded copy-polish): "Decision Needed" retitle, "Checks (CI)" gentle hint,
   "Developer work package #7 (PR)", "Demo mode — no real customer data (MOCK_ONLY)", plain companions for
   remaining tokens; file paths kept as small print.
2. **Missing decision-confidence affordance (N24).** The stranger wanted a small signal of *how confident* the
   system is in what it's showing. → **Recorded for a later lane.** Not implemented here: adding a confidence
   affordance is a new UI affordance beyond this bundle's bounded copy/styling scope, so it is parked as a future
   finding rather than forced through.

## Disposition

Finding 1 resolved by the bounded copy-polish in this lane (each translation is now an automated required-string
anti-repeat check). Finding 2 parked as a scoped future item (no new capability added in V8-A1).
