# Founder Gates — Parking and Safe-Work Exhaustion

> **Plain English — read this first.**
>
> 1. **What this is.** The rule for what the harness does when it hits a decision only the founder can make: it **parks** that decision and keeps doing other safe work, instead of stopping and waiting.
> 2. **Why it matters.** Without this rule, the harness would interrupt the founder at the first gate and go idle — even though plenty of harmless work remained. This is post-surgery accessibility: the founder should be interrupted **once**, when safe work is truly exhausted, not repeatedly for every planning decision.
> 3. **What can go wrong.** The harness stops too early (idles at the first gate) or too late (crosses a gate it should have parked). Two gates are special: a clean PR waiting for the founder's merge, and anything involving real/private data or secrets — both stop the harness immediately.
> 4. **What you can test now.** Look at the **Return conditions** below. The harness should come back to you only when one of those three is true. If it returns for any other reason, it stopped too early.
> 5. **One next action.** Remember the shape: most gates get **parked** (recorded and left in place while safe work continues); a ready merge gate or a real/private-data gate stops the harness **immediately**.

> **Status: DOCTRINE.** This describes the harness behavior contract for gate handling. The tooling named at the end is illustrative of the intended mechanism, not a claim of a fully wired system.

---

## Definitions

### Founder gate
An action that only the founder may authorize or perform. Two kinds:

- **Blocking gate** — the project cannot advance along that path without the founder (e.g. external send, signing, sales, public release, PR merge, real or private data).
- **Informational gate** — a decision the founder will eventually make, but which does not block other safe work (e.g. "which sales channel," "which icon").

### Parked founder gate
A founder gate that has been **recorded** (with its type, reason, blocked action, still-allowed safe work, and recommended founder action) and then **left in place** while the harness continues other safe work. The blocked action is **never executed** by the harness.

### Safe local work
Work that is reversible, private, and non-activating: local packaging, checksums, docs, proofs, validators, control-center/cockpit files, status/registry updates, harness scripts, and **bounded docs-only** or clearly-safe source PRs (which still stop at the founder merge gate).

### Forbidden work
External send/contact, email/text, public upload, releases, signing/notarization, credentials/secrets, sales/payment setup, real/private/client data, model-URL/checksum/deep-link/updater/telemetry changes, pushing to a protected main branch, merging PRs, and any "no-mistakes" irreversible action.

### Safe-work exhaustion
The state where **every** safe local task in the project's safe-work queue is done and the only remaining paths are founder gates or forbidden actions. Determined conservatively — when in doubt, treat safe work as remaining rather than exhausted.

---

## Return conditions

Return to the founder **only** when one is true:

1. **SAFE_WORK_EXHAUSTED** — all safe local work is done; only a founder gate remains.
2. **CLEAN PR MERGE GATE** — a docs/clean PR is open, verified, and awaits the founder's merge.
3. **TRUE_BLOCKER** — safe local work cannot continue without a forbidden action, or a proof fails and cannot be safely repaired.

---

## Behavior on hitting a gate

- **Blocking non-merge gate** (external send, signing, sales, public release) → **PARK IT** (record it), then continue the safe-work queue.
- **Merge gate** (a clean PR needs the founder's merge) → **stop immediately** and report. The founder must merge; nothing else safe supersedes a ready merge.
- **Real/private data or secrets** → **stop immediately** and never proceed.

---

## Examples

| Gate hit | Action |
|---|---|
| External tester **send** | PARK; continue packaging/docs/cockpit/checklists |
| **Signing/notarization** | PARK; continue signing-research docs only (no certs/secrets) |
| **Sales/payment** | PARK; continue safe copy/dry-plan docs only (no accounts) |
| **PR merge** gate (clean PR) | STOP immediately; founder merges |
| **Real/private data** needed | STOP immediately; never use it |
| Brand icon (informational) | PARK; continue icon-intake docs; no source edit without artwork |

---

## Tooling (intended mechanism)

The gate-handling mechanism is expressed through a small set of helpers and records:

- **Park a gate** — append a gate record to the project's founder-gates log.
- **List parked gates** — a founder-readable list, split into blocking vs informational.
- **Safe-work exhaustion check** — a conservative determination of SAFE_WORK_REMAINS / SAFE_WORK_EXHAUSTED / TRUE_BLOCKER.
- **Safe-work queue** — the enumerated safe local tasks plus their status, per project.
- **Parking validator** — validates the mechanism itself.

**None of these tools ever execute a blocked or forbidden action.**
