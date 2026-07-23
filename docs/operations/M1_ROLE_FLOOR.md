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
          TASK_QUEUE.jsonl EVENTS.jsonl EVENTS.anchor.json
          RETRY_LEDGER CONSUMED_RECEIPTS.json
          NEXT_SAFE_ACTION.md SHA256SUMS.txt SHA256SUMS.mac
queue/ leases/ roles/ handoffs/ reports/ logs/ founder-gates/ tmp/
```

Mutable documents are replaced atomically. `EVENTS.jsonl` is append-only, with
a keyed per-line digest chained to its predecessor, and its length and head are
committed in `EVENTS.anchor.json` plus an append-only witness outside the run
root. An in-place edit, an insertion, a deletion, a truncated tail and a
wholesale rewrite are each a named refusal, and resume refuses to continue.

## What is and is not a boundary

This matters more than any feature below, so read it before relying on the
floor for anything.

**Enforced.** The founder decision gate. A founder receipt is a detached SSHSIG
signature verified against a **public** key pinned by fingerprint. The package
holds no private key and contains no signing verb, so no process running this
code — including any Claude role context — can author an approval. Receipts are
scope-bound (run, task, repository, branch, host profile, action, exact SHA and
tree, final-verifier report digest), expire, and are spent exactly once.

**Enforced.** Mechanical, named, fail-closed refusals for sequencing, leases,
drift, expiry, replay, path escape, protected branches and artifact classes.

**Not enforced.** Role separation is **not** a security boundary against a
hostile process running as the same macOS user. Four windows are four
transcripts, not four principals. Every keyed seal in the run root is keyed with
a secret stored in that same run root, mode 0600, owned by the user every role
runs as. Treat role separation as accident resistance plus an audit trail. An
earlier version of this package claimed a Builder could not publish a Checker
verdict "even with full disk access"; an independent audit disproved that, and
the claim has been removed rather than softened.

**Not enforced.** `PACKAGE_DIGESTS.txt` proves integrity, not authenticity, and
`--host m4` proves configuration, not machine identity. M4 authority
additionally requires an external, signed, hardware-bound enrollment record and
an externally supplied `--expect-sha`/`--expect-tree`; neither is enrolled
today, so every M4 authority path currently refuses.

## When something stops

The supervisor stops automatic continuation and writes `NEXT_SAFE_ACTION.md`
for: a founder gate, a merge, a protected-main write, deployment, activation, a
credential or permission change, a destructive action, a lease collision,
candidate drift, an invalid report binding, an exhausted retry budget, or an M4
handoff. It never converts findings into CLEAN and never re-grades a completed
verdict on resume.

## Before using it for real

The package has never been started against a real repository and no role has
ever been launched through it. It needs an independent audit before it
supervises anything that matters. Registering it in a manifest or launcher is a
separate serial-integration step.

## Record of corrections

An independent audit of the previous version returned a blocking finding, and
this version is the result of the correction cycle. Two of its findings could
not be closed in code and are recorded here truthfully instead:

- **Commit `a891b9b8`'s subject does not describe commit `a891b9b8`.** It reads
  "add M4 role-floor profile and durable handoff", but that commit modifies
  four files and its real content is the `fg_split_noglob` one-writer-control
  fix. The M4 profile files were added by `2f18159c`. History was not rewritten
  because both commits are sealed in the original transfer bundle.
- **The top-level Builder report in the external build evidence directory is
  stale.** It names `a891b9b8` as head, says tmux is not installed, and reports
  152/0/2 selftest totals. The corrected record — head `3106fdc2`, live tmux
  verified, 157/0/1 — is in that directory's `live-tmux-qualification/`
  subdirectory. That report is external evidence outside this repository and
  was deliberately not edited. Read the live-tmux qualification record, not the
  top-level report, as the description of `3106fdc2`.

## Selftests

```bash
bash tools/role-floor/selftest/role-floor-selftest.sh          # behaviour
bash tools/role-floor/selftest/role-floor-security-selftest.sh # adversarial
```

The second re-runs the attacks the audit actually executed and asserts each one
now fails. Both use throwaway fixtures, stubs and keypairs in a temporary
directory, contact no model or provider, and touch nothing outside it.
