# Persistent Autonomous Execution Supervisor (PAES-1)

The prior wave stopped because a Claude conversational turn ended — no executor
persisted. PAES-1 adds the missing persistent execution layer: a user-level
launchd agent + supervisor loop that reloads queue/lease/recovery/next-safe-action
from disk and re-invokes the unattended executor until a real deadline or a
machine stop-predicate.

## Unattended executor — PROVEN
`claude -p <prompt> --output-format json --allowedTools <allowlist>` runs
non-interactively on the existing authenticated install (no credential copying),
returns structured JSON, exits 0, leaves no child process. Evidence:
`.foundergate/supervisor/unattended_capability.json`.

**Two material findings (must inform activation):**
1. COST_PROFILE — an idle probe cost $0.09 (full repo context reloaded on the
   1M-context model each call); 9h continuous re-invocation implies significant
   autonomous spend (directive: do not bypass plan/account limits).
2. PERMISSION_RELAXATION — unattended edit/commit/**merge** workers need a tool
   allowlist or `--dangerously-skip-permissions`, relaxing the OS permission
   guard that blocked a direct-push-to-main earlier this session (directive:
   NO SILENT POLICY WEAKENING).

## Mechanical Continuation Law (executable)
`src/supervisor/supervisor-core.mjs` encodes: a worker exit / Claude final answer
/ terminal closure / context compaction / PR merge / checker finishing / parked
founder gate is NOT program completion. STOP is permitted only on a machine
predicate (deadline+drained, exhausted, PANIC, integrity failure, corruption,
writer collision, executor lost, restart-limit) AND is REJECTED while eligible
safe work remains (`STOP_REJECTED_QUEUE_NONEMPTY`). A report action can never
stop the supervisor. 42/42 synthetic qualification tests.

## Boundaries
User-level only (no root/system daemon), RunAtLoad=false, KeepAlive=false
(bounded, no unbounded restart loop), 127.0.0.1 read-only status (no action
controls), ≤2 code workers, ≤1 sensitive-core writer, Terminal-0 sole merge
sheriff. No M1/AKIOR/customer/private/production/payment/external. OpenSandbox
CANDIDATE only. VB3 act edge FROZEN. 48h qualification NOT started.

## Activation gate
Per Phase 10, activation requires: executor proven ✅, full qualification
(incl. LIVE worker-kill/recovery/terminal-survival), checker-clean, Advisor-ready,
exact-SHA CI. The LIVE qualification + loading a 9-hour autonomous-merge daemon
is the outstanding step — see PAES1_STATUS.md.
