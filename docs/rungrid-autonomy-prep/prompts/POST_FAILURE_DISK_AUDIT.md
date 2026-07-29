# FounderGate RunGrid — Post-Failure Disk Audit (READ-ONLY)

MACHINE: {{MACHINE}}
WHEN: {{WHEN}}
RUN_WORKSPACE: {{RUN_WORKSPACE}}
CANONICAL_REPO: {{CANONICAL_REPO}}

Invoke this when a wave HOLDs, a stop condition fires, or evidence looks contradictory. Purpose: reconstruct
exactly what happened FROM DISK, without asking the founder to read logs or transport errors. READ-ONLY.

## Do
1. Read the run workspace `logs/` and `evidence/` in order; build a timeline of stage transitions.
2. Read the last-written FINAL_VERDICT.json / lane verdicts / checker+advisor verdicts.
3. Diff expected vs actual: candidate SHAs, PR heads (`gh pr view`), origin/main, lock owner, tmux/process state.
4. Classify the failure: {competing_lock | pr_drift | repeated_failure | unsafe_mutation | secret_detected |
   evidence_contradiction | scope_departure | auth_session_failure | deadline | macro_queue_exhausted | true_founder_gate}.
5. Determine the earliest safe resume point (which macro-queue stage) OR whether a true founder gate is required.
6. Confirm no partial mutation leaked: main unchanged, PRs unchanged, no prohibited path touched, no secret staged.

## Write ONLY
- reports/POST_FAILURE_AUDIT.md (timeline, root cause, classification, earliest safe resume stage, exact next_safe_action)
- evidence/post_failure_audit.json ({"classification":"...","root_cause":"...","resume_stage":N,"invariants_intact":true,"next_safe_action":"..."})

Do not repair product code. Do not mutate git/GitHub. If a true founder gate is required, say so plainly and stop.
