# Lane G — Provider-at-Scale Plan (PLANNING ONLY — no provider call, no spend)

## Basis
- A single bounded provider proof was previously accepted (one `claude -p` call, exact cost ≤ $1.00).
  No provider call or spend occurs in this planning phase.

## Controls (planned before any at-scale use)
- **Budget ceilings** (daily/monthly), **per-run caps**, and a **kill switch** that hard-stops on
  breach. **Local-vs-provider decision:** prefer local; use provider only when explicitly needed and
  within budget. **Refusal-if-over-budget** returns REFUSED (never silently spends).
- **Logging + cost evidence:** per-call cost recorded; running total; founder-visible summary.

## Founder authorization phrase (INACTIVE)
`I AUTHORIZE a bounded provider-at-scale PROOF with a hard $ ceiling, per-run caps, a kill switch, and refusal on over-budget — proof only, not production and not commercial.`
