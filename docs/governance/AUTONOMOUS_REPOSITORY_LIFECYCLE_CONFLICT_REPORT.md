# ARLC-1 Conflict & Supersession Report

**Terminal-0 · 2026-07-17.** Resolves the precedence conflict between the new
standing autonomous-merge authority and earlier per-merge founder-approval rules.

## Conflicts identified

| # | Prior rule | New rule (ARLC-1) | Resolution |
|---|---|---|---|
| C1 | "Every write to `main` requires an explicit founder merge gate." | "Routine mechanically-qualified merges are Terminal-0 operations." | **Superseded** for `OPERATIONAL_AUTONOMOUS` actions only. Founder gate retained for `TRUE_FOUNDER_GATE` / `HUMAN_EXPERT_GATE`. |
| C2 | STACK-1F authority (`autonomous_merge_authority.json`) — merge-specific. | ARLC-1 — full lifecycle (merge + close + cleanup + queues). | ARLC-1 **extends** STACK-1F; STACK-1F remains the merge-authority sub-policy; both pinned by digest in the pointer. |
| C3 | Policy path named `.foundergate/policies/` in the ARLC-1 request. | `.foundergate/policies/` is a **frozen accepted-product tree**. | Placed under `.foundergate/governance/` + `.foundergate/pointers/` to preserve the freeze (same correction applied in STACK-1F). |

## Precedence (fixed, non-reorderable)

`hard_safety_floor` > `explicit_founder_instruction` > `disk_policy` >
`qualification_locks` > `derived_state` > `task_prompt` > `advisor_narrative` >
`chat_memory`. A lower source can never override a higher one; encoded in
`arlc_lib.resolve_precedence` and covered by tests 11–16.

## What is NOT superseded

Evidence/checker/Advisor/exact-SHA-CI/qualification/rollback requirements;
customer-data, payment, provider-activation, production, public-release,
security-boundary, and live-action gates; no self-hosted runners; no evidence
rewrite/force-push. UNKNOWN actions **fail closed** to a founder gate.
