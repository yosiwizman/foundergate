# Safety Check Rehearsal — using this self-owned target instead of a design partner

## Why this exists
Yossi does not currently have a real design partner or a public-repo prospect. Rather than invent one (forbidden), FounderGate can rehearse its concierge **Safety Check** against this **self-owned, non-sensitive** demo target. Every step of the real concierge process (qualify → intake → suitability → scope → governed run → review → evidence note → honest decision → handback) can be practiced here with zero external risk.

## How this target maps to the concierge process
| Concierge stage | On this self-owned target |
|-----------------|---------------------------|
| Qualify | Trivially qualifies: public-intent, non-sensitive, small objective. |
| Intake | Objective taken from DEMO_OBJECTIVES.md. |
| Repo suitability | PASS — no secrets, no private/customer data (synthetic sample only). |
| Scope lock | One objective + `src/`+`tests/` paths + $0 cost cap (no-provider rehearsal). |
| Governed run | Make the bounded change locally in an isolated branch; run the 24-test suite. |
| Independent review | Checker + Gate Advisor read-only (as in this very package). |
| Evidence note | SHA, changed files, test counts, honest decision. |
| Honest decision | `SUITABLE_FOR_CONCIERGE_TRIAL_WITH_LIMITS` or `INTERNAL_DEMO_ONLY` — never SHIP. |
| Handback | Founder-readable note; no external send. |

## What a rehearsal proves — and does NOT
- **Proves:** the process, the tooling, and the honesty discipline work end-to-end on a real (if self-owned) codebase.
- **Does NOT prove:** external demand, willingness-to-pay, security/compliance, production readiness, or that a real partner finds it useful. Those require a real prospect (a founder gate), not a self-owned rehearsal.

## Current rehearsal state
- Demo target built + 24/24 self-test green; CLI runs; full FounderGate suite 117/117.
- No objective has been *executed* as a change yet — the three objectives are staged for a future run. This document is the rehearsal plan + readiness, not a completed check.
