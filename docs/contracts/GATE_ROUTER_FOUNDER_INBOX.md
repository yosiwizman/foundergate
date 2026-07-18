# Gate Router, Founder Decision Inbox & Autonomy Policy Envelope (FGRI-1)

**Product rule (executable):** A BACKEND WORKER MAY NEVER ASK AN INTERACTIVE TERMINAL QUESTION DURING AN AUTONOMOUS RUN. The Gate Router sits between autonomous workers and founder authority. Terminal output is operational evidence, not the decision interface.

## On uncertainty/missing authority a worker does exactly one of:
1. resolve mechanically from disk authority; 2. apply the documented safe default; 3. park ONLY the affected lane, create a structured Founder Decision Inbox request, and continue every unrelated authorized lane.

## Enforcement (`src/gate-router/gate-router.mjs`, 35/35 tests)
- `detectInteractiveQuestion` intercepts questions/menus/stdin-reads/unresolved-authority in worker output.
- `handleWorkerOutput` -> park_and_route, markers INTERACTIVE_QUESTION_INTERCEPTED / LANE_PARKED / DECISION_ROUTED / UNRELATED_WORK_CONTINUED, **never grants authority**.
- `verifyDecision` rejects missing/altered/stale/expired/wrong-gate/wrong-SHA/replayed/duplicate/generated/builder decisions and auto-refuses FULL_AUTONOMY / SKIP_PERMISSIONS / DIRECT_PUSH.
- `classifyCost` distinguishes modeled vs actual ($15 warn, $25 gate); modeled cost is never presented as actual billing; new billable spend requires a separate gate.
- `classifyGate` fails closed (UNKNOWN -> founder gate).

## Autonomy Policy Envelope
`.foundergate/governance/autonomy_policy_envelope.json` (digest-pinned): 540-min deadline, 2 code writers, 1 sensitive writer, 3 restarts/job, DIRECT_PUSH/SKIP_PERMISSIONS/ESCALATION DENIED, narrow allowlist, safe default = park-and-continue.

## Founder Decision Inbox
Read-only 127.0.0.1 backend; plain-English cards (Activate safely / Keep paused / Review details); NEVER shows credentials, raw flags, merge commands, or unsafe options.

## Current PAES gate: RESOLVED — ACTIVATE_SAFE_NARROW_ALLOWLIST (digest-bound, one-time, verified).
