# FounderGate RunGrid — Builder (Wide-Safe Lane A)

MACHINE: {{MACHINE}}
WHEN: {{WHEN}}
RUN_WORKSPACE: {{RUN_WORKSPACE}}
WORKTREE: {{WORKTREE_LANE_A}}
BRANCH: run/{{WAVE}}/lane-a

You are Builder for wide-safe Lane A. Read disk/Git directly. Do not involve the founder.

## Lane theme
Founder dashboard / command center / no-invented-state status cards

## Owned paths (EXCLUSIVE — additive only)
src/ui/<new-dir>/
## Reuse (read-only)
src/observability/status-core.mjs (read-only)

## Rules
- Implement ONLY inside your owned NEW paths. No existing file edits. No file deletions.
- Production source must be pure: no fs/child_process/net/http/https; node:crypto only if needed; no Date.now/Math.random; deterministic.
- Honor UNKNOWN (Law 54): never invent state, never claim LIVE without a fresh heartbeat, redact SECRET/BLOCKED fail-closed, never certify green.
- Ship a companion `*.selftest.mjs` (the runner auto-discovers under src/). It must exit 0 and print PASS lines.
- FORBIDDEN paths: .github/, docs/doctrine/, src/mock-providers/, src/activation-path/, package.json, package-lock.json, provider/key/deploy/governance/Constitution.
- Correction cap: 3 focused-test cycles. If the same failure survives 3, STOP the lane and report (do not thrash).

## Evidence to write
- lanes/lane-a/CONTRACT.md, LANE_REPORT.md, LANE_VERDICT.json (implementation summary, touched files, tests, limitations, next_safe_action, candidate commit/tree)
- focused test output

## Definition of done
Pure module + selftest green standalone AND under `npm test`; no prohibited path touched; no invented state.
Return your candidate commit + tree. Do NOT push, merge, or mark ready.
