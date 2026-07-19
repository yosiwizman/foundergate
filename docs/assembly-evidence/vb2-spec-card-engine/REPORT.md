# VB2 — Spec Card Engine (standalone plain-English spec card)

**Requirement (V8-B completion matrix):** *Spec Card Engine* — **PARTIAL**. The only spec-card
material on disk was a side effect of the ARE blueprint compiler
(`src/autonomous-run/blueprint-compiler.mjs`), which emits a thin card
`{ spec_card_id, requirement_id, gate, acceptance, trace }` per requirement. The matrix names the
missing behaviour as a **"standalone spec-card engine"** — i.e. what ROADMAP §18 (N16) actually
asks for.

**Status after this lane:** built. A standalone engine lifts one blueprint requirement into a
**plain-English spec card** with the four contents N16 requires — (1) what the founder asked for, as
understood; (2) what "done" looks like, testable; (3) what it will **not** do; (4) open questions —
and a founder-readable surface renders it, with maximum honesty about what has and has not actually
been approved or recorded.

## What ROADMAP §18 (N16) asks for, and where each piece lives

- *"Before any major feature, produce a spec card in plain English"* → `deriveSpecCard(blueprint,
  requirementId, opts)`.
- *"what founder asked for / what 'done' looks like / what it will NOT do / open questions"* → the
  four card sections, lifted verbatim from the blueprint (requirement text, acceptance criteria,
  non-goals, known-unknowns + founder-decisions-required).
- *"Founder approves spec card before any lane spawns"* → the approval view. An unapproved card is
  **awaiting** and spawns **no** lane; only an explicit `approved` record lets a lane spawn.
- *"Requirements-to-tests pipeline: idea → requirement → acceptance criteria → proof → gate"* → the
  pipeline view, each stage marked present/absent from the card alone.
- *"Scope kill-switch commands"* → shown as **reference only** (this surface fires none of them).

## What was added

- **`src/v8b2/spec-card-engine.mjs`** — a pure, read-only engine + surface. It:
  - `deriveSpecCard(...)` reads a caller-supplied blueprint object and lifts one requirement into a
    plain-English card. It **never classifies the gate itself** — gate classification is ARLC's job,
    delegated; the caller passes the compiler's verdict in.
  - renders the card (text + HTML + a complete page), placing the four contents, the approval state,
    the requirements-to-tests pipeline, open concerns, and the scope kill-switch reference.
  - carries the snapshot's **`source` truth-label** (`live` vs `fixture`) to the page.
  - No `fs` / net / `child_process` / clock / randomness. Same snapshot in → byte-identical page out.

- **`src/v8b2/spec-card-engine.selftest.mjs`** — 21 checks: the engine lifts all four contents and
  binds acceptance criteria to the right requirement; the unapproved-is-never-approved / no-lane law;
  the approved-then-lane-may-spawn path; honest non-approved states (pending/blank/rejected); the
  missing-"done" law; honest testability; missing-non-goals / not-"all-clear"; the gate is taken
  exactly as classified and unclassified is never assumed autonomous; the pipeline presence map; the
  kill-switch reference; purity; garbage-in honest degrade; source truth-label; the mock truth-label;
  a complete page with balanced `<section>` tags; the seductive-lie HTML guard; injection-safe
  escaping; deterministic output; and the three act-edge scans (source imports, rendered page,
  exported names).

- **`docs/assembly-evidence/vb2-spec-card-engine/`** — this REPORT, the deterministic generator
  (`render-evidence.mjs`), and two rendered pages.

## The honesty stance — never invent state (Law 54)

- **A spec card is approved only when an approval record explicitly says so.** With no record, the
  card is *"awaiting founder approval — no lane may spawn"*, never assumed approved. Assuming approval
  is the most seductive spec-card lie there is — it is exactly the founder gate N16 exists to hold.
- **"What done looks like" is the acceptance criteria, verbatim.** With none, *"no testable
  definition of done"* is said out loud; a criterion is marked **testable** only when it declares
  *how* it is proven.
- **"What it will NOT do" is the declared non-goals.** With none, *"the scope boundary is undefined"*
  — never a manufactured boundary.
- **Open questions are shown as given;** an empty list is said out loud, never read as "all clear".
- **The gate is shown exactly as the compiler classified it.** With no verdict, *"gate not classified
  — not assumed autonomous"*.

## Evidence (rendered from a real compiler run, offline)

`render-evidence.mjs` runs a self-describing blueprint through the **real** ARE blueprint compiler,
so each card's **gate is the compiler's own ARLC-delegated verdict**, then lifts each requirement
into a plain-English card and writes one page each:

- **`spec-card-routine.html`** — `FR-SPEC-1` (render a spec card): gate
  **`OPERATIONAL_AUTONOMOUS`**, all 5 pipeline stages present, **awaiting approval → no lane may
  spawn**.
- **`spec-card-founder-gate.html`** — `FR-SPEC-2` (a customer-data requirement): gate
  **`TRUE_FOUNDER_GATE`** (the compiler routed it there), **awaiting approval → no lane may spawn**.

Reproduce:

```
node docs/assembly-evidence/vb2-spec-card-engine/render-evidence.mjs
```

Because there is **no approval record on disk** for these cards today, both pages render
*"awaiting founder approval — no lane may spawn"*. That is the real, on-disk truth (N16: the founder
approves the card before any lane spawns, and no such approval has been given). The self-test proves
the surface renders the **approved → lane-may-spawn** path correctly, so the capability is proven
even though no committed card is approved yet.

## Read-only / no act edge (verified)

- The spec-card-engine self-test is green (21/21).
- Both rendered pages contain **zero** of: `<script>`, `<form>`, `<button>`, `<input>`, inline `on*=`
  handlers, `href=`, or any `<a>` anchor.
- The surface module imports no side-effecting Node built-in and touches no disk/network. There is
  nothing here to approve a card, spawn a lane, or fire a scope kill-switch — approving a spec card
  and spawning its lane is a later, separately-gated act and is **not** wired here.

Local commit only; Terminal-0 owns merges.
