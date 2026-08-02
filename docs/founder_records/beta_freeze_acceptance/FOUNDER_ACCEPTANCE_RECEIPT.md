# Founder Acceptance Receipt — foundergate-beta-freeze-1
| Field | Value |
|-------|-------|
| Record type | Founder acceptance of an internal beta-scope candidate (WITH LIMITS) |
| Accepted artifact | foundergate-beta-freeze-1 (frozen minimal beta-scope candidate) |
| Freeze root hash (SHA-256 of FREEZE_MANIFEST.txt) | 8e7c7db823b514970fe8bcdb3fbe1b2a38c972cee2d739419a76f9ec820d1fd1 |
| Freeze verify at acceptance | OK (shasum -c) · self-test 30/30 |
| Source of core | yosiwizman/task-ledger-demo@0bb2817174c9 (unchanged) |
| Acceptance date | 2026-08-02 (ET) |
| Founder | Yossi Wiseman |
| Prior review | Terminal Advisor BETA_FREEZE_CONFIRMED_WITH_LIMITS · Checker CLEAN · Gate Advisor BETA_FREEZE_READY_WITH_LIMITS |

## Exact founder acceptance statement (verbatim)
> I ACCEPT the frozen FounderGate beta slice foundergate-beta-freeze-1 as an internal beta-scope candidate with limits. This acceptance does not authorize merge, PR-ready marking, PR #200 mutation, provider use, spend, deployment, customer/private/production data, public/customer beta launch, security/compliance claims, SaaS launch, or final commercial readiness.

## Effect
- Marks foundergate-beta-freeze-1 as ACCEPTED_WITH_LIMITS as an INTERNAL beta-scope candidate, bound to the exact freeze root hash above.
- Confers NO execution authority. Every item disclaimed in the statement remains a separate protected founder gate.
- The acceptance is invalidated if the artifact changes (a different freeze root hash means a different, un-accepted artifact).
