# Claims & Limits Matrix

| # | Claim | Status |
| --- | --- | --- |
| 1 | Deck visual language reused (not a new/third UI style) | TRUE — `assets/fg.css` is a copy of the deck `fg.css` |
| 2 | Truth Dashboard is wired to the REAL local backend | TRUE — 3 real `/api/*` calls, no mock path |
| 3 | Live run produces real tests result + real commit | TRUE — allowlisted real runner via `/api/start` |
| 4 | Export produces a real sealed+verified ZIP | TRUE — `/api/export` → `SEALED_EXPORT_LOCAL` |
| 5 | Decision surface never returns "ship" | TRUE — decision shown as "… (never SHIP)" |
| 6 | Evidence freshness never guessed | TRUE — FRESH only after a real commit; else UNKNOWN |
| 7 | Deck's *shipped* state has live backend today | **FALSE / NOT CLAIMED** — deck lanes remain display-only/mock |
| 8 | Founder Mode is the full product | **FALSE / NOT CLAIMED** — it is the live-local proof surface |
| 9 | Production / SaaS / security / compliance readiness | **NOT CLAIMED** |
| 10 | Customer / paid / market / commercial validation | **NOT CLAIMED** |

## Explicit limits (unchanged, all preserved)
Local-only prototype. No merge, no PR-ready marking, no PR #200 mutation, no deployment, no
billing/payment, no customer/private/production data, no provider spend, no outreach, no
commercial/production/SaaS/security/customer/paid/market claims. Does not imply the deck ships
with a live backend today; does not imply Founder Mode is the full product.

Out-of-path added/modified files: **0** (all changes under `demo/founder_operating_environment/`,
`docs/convergence_prototype/`, and one new E2E test).
Safety counters — provider **0**, spend **0**, contact **0**, publish **0**, deploy **0**.
