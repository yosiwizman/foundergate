# FounderGate role floor

A tmux operating floor for FounderGate. The founder talks to one persistent
Orchestrator; the package mechanically launches and supervises the other roles
in their own fresh Claude contexts, behind leases, gates and durable evidence.

One implementation, two host profiles:

| profile | windows | adds |
|---|---|---|
| `m1` | orchestrator, builder, checker, advisor | nothing; integration, verification and merge are `M4_HANDOFF_REQUIRED` |
| `m4` | the same four, plus serial-integration, final-verifier, merge-sheriff | governed integration authority |

A host is configuration (`config/hosts/<host>.json`), not a fork. Nothing in
`bin/` or `lib/` branches on the host name to decide what is allowed; it reads
the loaded profile.

> The package is **inactive**. It has never been started against a real
> repository, and starting it is a deliberate act.

## Commands

```bash
bash tools/role-floor/bin/fg-role-floor-start.sh  --host m1
bash tools/role-floor/bin/fg-role-floor-status.sh --host m1
bash tools/role-floor/bin/fg-role-floor-stop.sh   --host m1
tmux attach -t foundergate-m1
```

Substitute `--host m4` and `foundergate-m4` on the M4. The M4 has a bootstrap
that verifies the host, the repository and every package digest before it will
create anything:

```bash
bash tools/role-floor/bin/fg-m4-bootstrap.sh --check --repo /path/to/foundergate
bash tools/role-floor/bin/fg-m4-bootstrap.sh --repo /path/to/foundergate --allow-start
```

`--plan` prints the deterministic window plan and creates nothing.

## What the floor guarantees

**Role separation.** Every result is written through a role-scoped writer. The
writer refuses any artifact class outside the role's profile entry and requires
a run-scoped token bound to role, task, prompt digest and session identity. A
Builder cannot publish a Checker verdict even with full write access to the run
root. On `m1` nothing can publish a merge receipt at all.

**One writer.** Every writable task needs a lease. Overlapping path globs, two
writers on one branch, protected branches, stale reuse, role mismatch and
digest tampering are all named refusals. Shared integration surfaces need the
serial-integration role, which exists only on `m4`, and only one such writer
may hold a lease at a time.

**Exact candidates.** The Builder freezes a candidate bound to commit SHA, tree
SHA, parent, diff digest, changed files, cleanliness, branch, remote status and
its own report digest. The Checker refuses a dirty tree, a moved head, a
missing tree object or an unbound prose description.

**Sequencing.** builder → freeze → checker → CLEAN → advisor → founder packet →
STOP. Findings park the candidate, archive the checker evidence as superseded,
and open one bounded correction cycle. Findings never become CLEAN.

**Bounded continuation.** The supervisor advances a lane only when the next
action is already authorized, dependencies are met, the lease is valid, no
drift occurred and retry budget remains. It stops for founder signature, merge,
protected-main writes, deployment, activation, credential changes, destructive
actions, lease collisions, candidate drift, invalid bindings and M4 handoff.

**Context recovery.** A session exit is classified mechanically; not every exit
is context exhaustion. A valid exhaustion rebuilds a disk-backed handoff and
restarts the *same* role in a fresh context. Context restarts are counted
separately from correction attempts.

**Durable evidence.** `EVENTS.jsonl` is append-only and hash-chained; any
in-place edit breaks the chain. Mutable JSON is replaced atomically. State is
sealed in `SHA256SUMS.txt`, and resume refuses corrupted or ambiguous state
rather than guessing.

## Layout

```
bin/     start, status, stop, dispatch, supervisor, m4 bootstrap
lib/     common, hosts, state, leases, roles, claude-adapter
config/  hosts/m1.json, hosts/m4.json
prompts/ protected role prompts, digest-verified before launch
schema/  control-plane schemas
selftest/role-floor-selftest.sh
docs/    M4_HANDOFF.md, M4_HANDOFF.json
```

Run state lives **outside** the repository, at
`${HOME}/FounderGateRuns/role-floor/<host>/<run-id>/`.

## Role launching

Roles are launched by deterministic stdin from a protected prompt file
(`claude < prompt.md`) in a respawned tmux window. No clipboard relaying, no
character-by-character `send-keys`, and never `--continue`, `--resume` or
`--dangerously-skip-permissions` — each role gets its own transcript. CLI
capabilities are detected from the installed binary rather than assumed.

## Selftest

```bash
bash tools/role-floor/selftest/role-floor-selftest.sh
```

Runs against a throwaway git repository, a recording tmux stub and a Claude
stub that is never fed a prompt. It launches no real role session, contacts no
model or provider, and touches no repository but its own fixture.

## Not integrated

This package is not registered in any FounderGate manifest or launcher. Doing
so is a separate serial-integration step, documented in `docs/M4_HANDOFF.md`.
