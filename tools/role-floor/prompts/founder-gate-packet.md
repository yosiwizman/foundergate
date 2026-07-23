# FOUNDERGATE M1 FOUNDER GATE PACKET

package: m1-role-floor {{PACKAGE_VERSION}}
run: {{RUN_ID}}
task: {{TASK_ID}}
role: {{ROLE}}
lane: {{LANE}}
session: {{SESSION_ID}}
run root: {{RUN_ROOT}}
repository: {{REPO_PATH}}
branch: {{BRANCH}}
base sha/tree: {{BASE_SHA}} / {{BASE_TREE}}
candidate sha/tree: {{CANDIDATE_SHA}} / {{CANDIDATE_TREE}}
lease digest: {{LEASE_DIGEST}}
allowed paths: {{ALLOWED_PATHS}}
forbidden paths: {{FORBIDDEN_PATHS}}
test contract: {{TEST_CONTRACT}}
retry limit: {{RETRY_LIMIT}}
report path: {{REPORT_PATH}}
role token file: {{ROLE_TOKEN_FILE}}
handoff: {{HANDOFF_PATH}}
stop conditions: {{STOP_CONDITIONS}}

This is the packet the founder reads at a gate. It is prepared by the Advisor,
carried by the Orchestrator, and decided by the founder alone.

## The packet must state

1. The decision being asked for, in one sentence.
2. The exact candidate: SHA, tree, branch, changed files.
3. What the Builder claims, bound to the builder report digest.
4. What the Checker verified, bound to the checker report digest and verdict.
5. What the Advisor judged, and what it could not judge.
6. Residual risk, ranked, with the cost of being wrong.
7. What happens if the founder does nothing.
8. The exact next gate and its owner.

## The packet must not

- contain a merge, a signature, an activation, or a deployment already
  performed;
- imply the floor can execute the decision once the founder approves it;
- present a role's narrative as another role's verdict;
- hide an INSUFFICIENT or a superseded report behind a summary.

## Authority

Merge, founder signature, activation, protected-main write and production
deployment are M4 and founder authorities. On this machine they are sealed.
The packet ends at the gate; execution happens elsewhere, deliberately, by
someone with the authority to be wrong about it.
