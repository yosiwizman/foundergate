# M1 role floor — operations

The role floor lets the founder work with one persistent Orchestrator instead
of four terminal windows and four pasted prompts. It lives at
`tools/role-floor/`, is **inactive**, and is not registered in any FounderGate
manifest or launcher.

Despite the name of this document, the package supports two hosts. The M1
profile is the four-role build floor; the M4 profile adds the three governed
integration roles. See `tools/role-floor/docs/M4_HANDOFF.md` for the M4.

## The shape of it

```
FOUNDER
  |
  v
M1 ORCHESTRATOR
  |-- BUILDER
  |-- CHECKER
  `-- ADVISOR
```

Later, elsewhere, and never on the M1:

```
M4 SERIAL INTEGRATION WRITER -> INDEPENDENT FINAL VERIFIER -> M4 MERGE SHERIFF
```

## Commands

```bash
bash tools/role-floor/bin/fg-role-floor-start.sh  --host m1   # start or safely resume
bash tools/role-floor/bin/fg-role-floor-status.sh --host m1   # compact status
tmux attach -t foundergate-m1                                 # attach
bash tools/role-floor/bin/fg-role-floor-stop.sh   --host m1   # graceful stop
```

`--plan` prints the window plan and creates nothing. Status and stop work when
the tmux session is gone and every Claude session is dead — they read disk.

The floor requires tmux. It never installs it: a missing prerequisite returns
`STATUS: BLOCKED` naming exactly what is missing.

## What the founder does and does not do

Does: describe the lane to the Orchestrator, read the status line, decide at
gates.

Does not: open four terminals, paste role prompts, relay SHAs or paths, read
raw logs, restart a role after context exhaustion, or decide routine
continuation steps.

## The four windows

| window | reads | writes | never |
|---|---|---|---|
| orchestrator | disk, read-only GitHub | lane contracts, dispatch, handoffs, status | product source, verdicts, merges |
| builder | its lease | source inside the lease, builder report, candidate freeze | its own verdict, CLEAN, merge |
| checker | the exact frozen SHA | checker verdict and report | repairs, pushes, advisor state |
| advisor | a CLEAN candidate | decision packet | code, verdicts, decisions |

Each window shows role, lane, task, authorization, candidate SHA, lease,
attempt, status, last durable event, and whether the founder is needed.

## Lane states

`NOT_STARTED QUEUED STARTING RUNNING WAITING_DEPENDENCY WAITING_FOR_FREEZE
READY_FOR_CHECK CHECKING CLEAN FINDINGS BLOCKED READY_FOR_ADVISOR ADVISING
READY_FOR_FOUNDER_GATE HUMAN_ACTION_REQUIRED M4_HANDOFF_REQUIRED
CONTEXT_EXHAUSTED ESCALATED STOP_REQUESTED STOPPED STALE DRIFT`

## Where state lives

Outside the repository, at
`${HOME}/FounderGateRuns/role-floor/<host>/<run-id>/`:

```
control/  RUN_MANIFEST RUN_STATE ROLE_REGISTRY LANE_REGISTRY
          TASK_QUEUE.jsonl EVENTS.jsonl RETRY_LEDGER
          NEXT_SAFE_ACTION.md SHA256SUMS.txt
queue/ leases/ roles/ handoffs/ reports/ logs/ founder-gates/ tmp/
```

Mutable documents are replaced atomically. `EVENTS.jsonl` is append-only and
hash-chained: an in-place edit breaks the chain and resume refuses to continue.

## When something stops

The supervisor stops automatic continuation and writes `NEXT_SAFE_ACTION.md`
for: a founder gate, a merge, a protected-main write, deployment, activation, a
credential or permission change, a destructive action, a lease collision,
candidate drift, an invalid report binding, an exhausted retry budget, or an M4
handoff. It never converts findings into CLEAN and never re-grades a completed
verdict on resume.

## Before using it for real

The package has never been started against a real repository, and tmux was not
installed on the machine that built it, so its tmux behaviour is proven against
a recording stub rather than a live server. It needs an independent audit and a
live-tmux run before it supervises anything that matters. Registering it in a
manifest or launcher is a separate serial-integration step.
