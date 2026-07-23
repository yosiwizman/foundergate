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

## Threat model — read this before relying on anything below

An independent audit of the previous version proved that several of its stated
guarantees did not hold. This section states what is now enforced and what is
not, so that no operator relies on a boundary that is not there.

**Enforced against any process running this code:**

- **Founder authority.** A founder decision receipt is a detached SSHSIG
  signature verified against a **public** key pinned by SHA-256 fingerprint.
  The package holds no private key and contains no signing verb — `grep -rn
  -- '-Y sign' bin lib` returns nothing, and the selftest asserts it. No
  process running this package can author an APPROVE, however much of the disk
  it can read.
- **Mechanical refusals.** Sequencing, lease, expiry, drift, one-time-use,
  scope-binding and shape refusals are named and fail closed.

**NOT enforced, stated plainly:**

- **This is not a boundary against a hostile process running as the same macOS
  user.** Four tmux windows are four transcripts, not four principals. Role
  capabilities, artifact MACs, lease seals, the retry ledger and the event
  chain are all keyed with a per-run secret at `control/.writer_secret`, mode
  0600, owned by the same user every role runs as. A process that reads that
  file can recompute those seals. Real role isolation would need separate OS
  users with ACLs on the run root, or separate machines; neither is
  implemented. What role separation buys here is **accident resistance and an
  audit trail** — not forgery resistance.
- **`PACKAGE_DIGESTS.txt` proves integrity, never authenticity.** It ships
  inside the tree it describes. Regenerating it after a modification is two
  lines of shell, and it will then report OK. Authenticity requires the
  externally supplied `--expect-sha` / `--expect-tree` anchor that
  `fg-m4-bootstrap.sh` refuses to start without.
- **A host profile name proves nothing about the machine.** `--host m4` selects
  a configuration. Physical-host authority additionally requires an external,
  signed, hardware-bound enrollment record that this package can only verify
  and never create. The shipped profiles enroll no machine, so every M4
  authority path fails closed today.

## Commands

```bash
bash tools/role-floor/bin/fg-role-floor-start.sh  --host m1
bash tools/role-floor/bin/fg-role-floor-status.sh --host m1
bash tools/role-floor/bin/fg-role-floor-stop.sh   --host m1
tmux attach -t foundergate-m1
```

Substitute `--host m4` and `foundergate-m4` on the M4. The M4 bootstrap checks
the physical-host enrollment, the repository, an **externally supplied**
candidate identity, and the package digests before it will create anything:

```bash
bash tools/role-floor/bin/fg-m4-bootstrap.sh --check --repo /path/to/foundergate
bash tools/role-floor/bin/fg-m4-bootstrap.sh --repo /path/to/foundergate \
     --expect-sha <sha from out-of-band audit evidence> \
     --expect-tree <tree from out-of-band audit evidence> --allow-start
```

`--allow-start` **refuses** without `--expect-sha`/`--expect-tree`, and refuses
if the package worktree is dirty. `--plan` prints the deterministic window plan
and creates nothing.

## What the floor enforces

**The artifact-class table.** Every result is written through a role-scoped
writer that refuses any artifact class outside the role's profile entry, before
any credential is examined. A Builder presenting a Builder capability cannot
write a `checker_verdict`. On `m1` nothing can publish a merge receipt at all.

**Per-launch single-use capabilities.** A role credential is 32 random bytes,
handed to the launched process once over a mode-0600 FIFO that is unlinked on
first read, and represented on disk only by a keyed commitment. There is no
token file to copy and nothing on disk from which the credential can be
recomputed. Capabilities are bound to run, task, role, prompt digest, session,
candidate SHA/tree, the issuing event-chain position and a launch nonce; they
expire, and a relaunch invalidates the previous one. **This is not a defence
against a same-user process that reads the launched process's environment or
calls these functions directly** — see the threat model above.

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

**Founder decision receipts.** VERIFY here; SIGN elsewhere. A receipt is a
detached SSHSIG signature over the canonical body
`jq -S -c 'del(.signature)' receipt.json`, produced with
`ssh-keygen -Y sign -n foundergate.founder-receipt.v2` by a private key held on
founder hardware that this package never touches. The signed body binds schema
and version, action, repository, host profile, run id, task id, branch,
candidate SHA and tree, the final-verifier report digest, issue time, expiry, a
unique nonce and the signer fingerprint. Missing, extra, duplicate, reordered
or malformed fields fail closed before any cryptography runs. A receipt is
spent exactly once, recorded in both a keyed consumed-receipt ledger and the
event chain; if the ledger is missing or unreadable the receipt is **refused**,
never treated as unspent.

**Durable evidence.** `EVENTS.jsonl` carries a **keyed** per-line digest and
commits to its predecessor, and its length and head are anchored in
`EVENTS.anchor.json` plus an append-only witness outside the run root. In-place
edits, insertions, deletions, tail truncation and wholesale rewrites are all
named refusals. Mutable JSON is replaced atomically. State is sealed in
`SHA256SUMS.txt` with a keyed MAC, and resume refuses corrupted or ambiguous
state rather than guessing. Against an actor who can read the run writer secret
this is tamper *evidence*, not tamper *proofing*.

## Layout

```
bin/     start, status, stop, dispatch, supervisor, m4 bootstrap
lib/     common, hosts, state, leases, roles, claude-adapter
config/  hosts/m1.json, hosts/m4.json
prompts/ protected role prompts, digest-verified before launch
schema/  control-plane schemas
selftest/role-floor-selftest.sh           deterministic behaviour
selftest/role-floor-security-selftest.sh  adversarial regressions
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
bash tools/role-floor/selftest/role-floor-security-selftest.sh
```

The first asserts that the floor does what it should. The second re-runs the
attacks an independent audit executed against the previous version and asserts
that each one now fails. Both run against a throwaway git repository, a
recording tmux stub, a Claude stub, and throwaway Ed25519 keypairs generated in
a temporary directory and destroyed with it. Neither launches a real role
session, contacts a model or provider, reads or writes `~/.foundergate`, or
touches any repository but its own fixture.

The security selftest plays the founder with a throwaway private key, because
verification cannot be exercised without one. That key exists only inside the
test's temporary directory. It gives the package no ability to sign: the
signing verb appears in the test files and nowhere under `bin/` or `lib/`.

## Record of corrections

This version was produced by a security correction cycle after an independent
audit returned a blocking finding. Two audit findings could not be closed in
code and are recorded here instead:

- **Commit `a891b9b8`'s subject is inaccurate.** It reads "add M4 role-floor
  profile and durable handoff", but that commit modifies exactly four files
  (`PACKAGE_DIGESTS.txt`, `lib/common.sh`, `lib/leases.sh`, the selftest) and
  its real content is the introduction of `fg_split_noglob` and its use in
  `fg_path_is_shared_surface`, `fg_lease_request` and `fg_lease_path_allowed`
  — the glob-expansion one-writer-control fix, plus regression tests
  T09b/T09c/T09d. The M4 profile files were all added by commit `2f18159c`.
  History was **not** rewritten to fix this: both commits are sealed in the
  original transfer bundle. Anyone bisecting for the M4 profile should look at
  `2f18159c`; anyone looking for the one-writer-control fix should look at
  `a891b9b8`, whatever its subject line says.
- **The top-level Builder report in the external build evidence directory is
  stale.** It describes commit `a891b9b8` as head, states that tmux was not
  installed, and reports 152/0/2 selftest totals. The corrected picture — head
  `3106fdc2`, live tmux verified, 157/0/1 — exists only in that directory's
  `live-tmux-qualification/` subdirectory. That report is external audit
  evidence outside this repository and was deliberately not edited. Treat the
  live-tmux qualification record, not the top-level report, as the description
  of `3106fdc2`.

## Not integrated

This package is not registered in any FounderGate manifest or launcher. Doing
so is a separate serial-integration step, documented in `docs/M4_HANDOFF.md`.
