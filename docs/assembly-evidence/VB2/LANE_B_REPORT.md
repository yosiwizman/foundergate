# LANE B — VB2 CTO-queue data model + read-only UI shell (NON-EXECUTING scaffold)

**Lane:** B (VB2) — a builder separate from the VB1 builder, working only in worktree
`foundergate-lanes/B-vb2` on branch `lane-vb2-scaffold`, based on main
`321888e7022ad0760d7dc7b151a6eb0e6a8e4560`.

**Scope built:** a pure, zero-dependency CTO-queue **data model** and a **read-only UI
shell** (display only). No executor, no approval, no act edge — the *act* edge for
anything queued depends on VB3 (Gate/Witness Engine wiring), which is not present here.

## §28 Written-authority citation

- **Build contract (authority for VB2 = CTO queue):**
  `docs/lanes/V8-B-build-contract.md @ 81ee00848f271e94401ea4049de2c1c2611ab0a3`
  (blob SHA at `main:docs/lanes/V8-B-build-contract.md`).
- **Base commit (main):** `321888e7022ad0760d7dc7b151a6eb0e6a8e4560`.

## Claims table (with AUTHORITY)

| # | Claim | Evidence (proof) | Authority (`path @ 40-char SHA`) |
|---|-------|------------------|----------------------------------|
| 1 | VB2 is the **CTO queue**: Guide drafts become **founder-visible queued items, never auto-actions**. | `src/v8b2/cto-queue.mjs` (record-only model); `cto-queue.selftest.mjs` round-trips. | `docs/lanes/V8-B-build-contract.md @ 81ee00848f271e94401ea4049de2c1c2611ab0a3` (§Allowed scope "CTO queue"; §Substep DAG `VB2`) |
| 2 | A queued item **acts only once VB3 wires approvals** — no act edge exists in this scaffold. | `no-act-edge.selftest.mjs`: exports contain no execute/act/approve/run function; no fs/net/child_process import. | `docs/lanes/V8-B-build-contract.md @ 81ee00848f271e94401ea4049de2c1c2611ab0a3` (§Substep DAG: "act edge depends on VB3"; §Forbidden scope) |
| 3 | The queue **carries a data class and never contains SECRET/blocked content**. | `validateItem` refuses `SECRET`/`BLOCKED`/`UNKNOWN`; `cto-queue.selftest.mjs` data-class boundary check. | `docs/lanes/V8-B-build-contract.md @ 81ee00848f271e94401ea4049de2c1c2611ab0a3` (§Forbidden scope: data-class boundary; §Substep DAG `VB2`) |
| 4 | **Law 54 — never invent state:** status enum includes an honest `UNKNOWN`; `getItem` returns `null` for an unknown id; `created_at` is caller-supplied DATA, never a clock read. | `cto-queue.selftest.mjs` (UNKNOWN status, null lookup, non-ISO `created_at` rejected). | `docs/lanes/V8-B-build-contract.md @ 81ee00848f271e94401ea4049de2c1c2611ab0a3` (§Forbidden scope: "No inventing state (Law 54)") |
| 5 | The **UI shell is wide-safe & read-only**: plain-English, no action-looking affordance; takes a queue, returns a string; zero writes. | `queue-view.mjs`; `no-act-edge.selftest.mjs` (pure string, deterministic, no mutation, no `<script>`/form/button/on\*/href). | `docs/lanes/V8-B-build-contract.md @ 81ee00848f271e94401ea4049de2c1c2611ab0a3` (§Wide-safe shells) |
| 6 | **Schema-first (Law 53):** queue conforms to a committed JSON schema; code enums == schema enums. | `src/v8b2/schemas/cto_queue.schema.json`; `cto-queue.selftest.mjs` schema conformance check. | `docs/lanes/V8-B-build-contract.md @ 81ee00848f271e94401ea4049de2c1c2611ab0a3` (§Staged gate plan: "schema-first (53)") |
| 7 | **Lane isolation:** no module under `src/v8b2` imports or references anything under `src/v8b1`. | `no-act-edge.selftest.mjs` (import-line scan + production-module word scan). | Lane B task charter (separate builder, off VB1's code). |

## Files created

- `src/v8b2/cto-queue.mjs` — pure data model: `emptyQueue`, `addItem`, `listItems`,
  `getItem`, `validateItem` (+ `QueueError`, enums). No side effects; immutable mutators.
- `src/v8b2/queue-view.mjs` — read-only UI shell: `renderQueueText`, `renderQueueHtml`
  (queue in, string out; escapes content; no affordances).
- `src/v8b2/schemas/cto_queue.schema.json` — committed JSON schema for the queue.
- `src/v8b2/cto-queue.selftest.mjs` — schema validation + add/list/get round-trips.
- `src/v8b2/no-act-edge.selftest.mjs` — critical proof: NO act/approval/execute path;
  render is pure/zero-write; no v8b1 import.
- `docs/assembly-evidence/VB2/LANE_B_REPORT.md` — this report.

## Test result

`npm test` (from the worktree): **ALL GREEN — 57/57 self-tests passed** (55 pre-existing
+ 2 new VB2 suites: `cto-queue` 15 checks, `no-act-edge` 10 checks after hardening) on
Node v24.

## Independent adversarial checker — verdict & findings disposition

**Verdict: CLEAN** (full report committed verbatim at
`docs/assembly-evidence/VB2/checker-report.md`). All five non-executing safety claims
held; five LOW hardening notes only.

| Finding | Disposition | Proof |
|---------|-------------|-------|
| **LOW-1** — renderers did not re-validate `data_class`; a hand-crafted queue could render SECRET in the clear | **CLOSED** — `queue-view.mjs` `displaySafe()` redacts the human content of any item whose `data_class` is not a permitted display class; boundary re-asserted at display. | `no-act-edge.selftest.mjs`: hand-crafted SECRET item renders `[REDACTED …]`, content never in the clear. |
| **LOW-2** — `validateItem` did not enforce `additionalProperties:false` (code/schema divergence) | **CLOSED** — `validateItem` now rejects any unknown own-key against `ALLOWED_ITEM_KEYS`. | `cto-queue.selftest.mjs`: item with extra key → `valid:false`. |
| **LOW-3** — no length caps (only `minLength:1`) | **CLOSED** — `maxLength` caps added in both `validateItem` (`MAX_LEN`) and `cto_queue.schema.json`; code caps == schema caps. | `cto-queue.selftest.mjs`: over-long field → `valid:false`; schema/code caps match. |
| **LOW-4** — `ISO_RE` is shape-only (`9999-99-99T…` passes) | **NOTED** (informational) — still caller-supplied DATA, never a clock read; numeric epoch correctly rejected. No code change required. | — |
| **LOW-5** — `validateItem` then `normaliseItem` each read props (a caller's side-effecting getter runs up to twice) | **NOTED** (informational) — a caller's own side effect, not a VB2 act edge; VB2 remains non-executing. No code change required. | — |

Test count after hardening: **ALL GREEN — 57/57** self-tests (VB2 suites: `cto-queue`
15 checks, `no-act-edge` 10 checks), Node v24.

## Boundary confirmation

**No `src/v8b1` import; no act edge.** VB2 is data model + display only. No executor,
no approval path, no session token, no wiring to execution. Nothing under `src/v8b1/**`
was imported, read into code, referenced, or modified.
