# V8-C Proposal — The Blueprints Era (PROPOSAL ONLY) — DRAFT · PENDING V8-B

STATUS: DRAFT · PENDING V8-B

> **STATUS: DRAFT — PENDING V8-B ACCEPTANCE.** This is a *draft* written while V8-B (Making It Real) is still
> being built and has **not** been accepted as a whole. It is **not** a gate card and **authorizes nothing**
> (Law 69). It becomes a live proposal / gate card only **after V8-B whole-stage acceptance passes**. Nothing in
> the "Blueprints era" may start before then.

> **Plain English — read this first.**
>
> 1. **What this is.** A draft plan for **V8-C: the Blueprints era** — where the founder can **save a run they
>    trust as a named, reusable Blueprint** and re-launch it later with one click, instead of re-answering every
>    question and re-approving every step from scratch each time.
> 2. **Why it matters.** V8-B teaches the product to *do* one run at a time. V8-C is the step from "I can run this
>    once" to "I can save the good run and run it again on demand" — the difference between a tool you re-configure
>    every time and a tool that remembers the setup you already approved.
> 3. **What can go wrong.** A saved Blueprint is a *stored intent to act*. If a Blueprint could launch without a
>    fresh, recorded approval, or could carry a stale/forged configuration, or could smuggle another project's
>    secret content into a re-launch, that would be exactly the kind of quiet, un-gated action V8-B was built to
>    forbid. Every one of those is pre-ruled SENSITIVE below.
> 4. **What you can test now.** Nothing — this is a draft document. There is no V8-C code and none is authorized.
> 5. **One next action.** None until **V8-B is accepted as a whole**. Then this draft can be promoted to a real
>    V8-C proposal and its first gate card.

---

## Authority & status
- **Authority (era this follows):** `docs/lanes/V8-B-build-contract.md` @ `81ee00848f271e94401ea4049de2c1c2611ab0a3`
  (V8-B — Making It Real: Run Launcher + executor, CTO queue, wired Gate/Witness Engine, runtime cost enforcement,
  Guide routing). V8-C **builds on** that era; it does not widen or re-open it.
- **Carried-forward laws:** 44/53/54/55/57/64/68/69 — schema-first (53), cannot-invent-state (54),
  view-only-until-wired (55), injection boundary (57), Founder Hand-Burden (64), source-of-truth precedence (68),
  and only-an-active-build-contract-authorizes-work (69).
- **Status:** **DRAFT, pending V8-B whole-stage acceptance.** Proposal only; no V8-C code; authorizes nothing
  (Law 69). Every `VCn` gate below is **PENDING V8-B acceptance** — see the dependency note.

## What the "Blueprints era" is (in plain English)
A **Blueprint** is a **saved, named run configuration** — a re-usable template the founder builds *out of a run
they already understand and trust*. Instead of re-deciding everything each time, the founder can:
- **Name and save** a run they just approved ("Nightly staging build", "Weekly report refresh") as a Blueprint.
- **Re-launch** that Blueprint later — the same steps, the same guardrails, the same budget — with far less setup.
- **Read, edit, version, and retire** Blueprints from the dashboard, in plain English, with no terminal.
- **See exactly what a Blueprint will do** *before* it runs — a Blueprint is a *proposal to act*, never a
  silent auto-action.

A Blueprint is therefore **a saved intent**, not a live process. Re-launching a Blueprint does not skip the gate —
it **pre-fills** the run so the founder approves faster, but the approval is still real, still recorded, still
wired to that specific re-launch (this is the V8-B Gate/Witness Engine doing its job, re-used).

## Why V8-C comes AFTER V8-B (it builds on the Run Launcher + executor)
A Blueprint is only meaningful once there is a real run to save. Concretely, V8-C **depends on V8-B being real**:
- **Run Launcher + executor (VB1)** — a Blueprint is a *saved launch*. There is nothing to save until the Run
  Launcher and its rollback-able, evidence-leaving executor exist. V8-C stores and replays what VB1 can run.
- **Wired Gate / Witness Engine (VB3)** — re-launching a Blueprint must still produce a **real, recorded
  approval wired to that specific re-launch**. Without VB3, a Blueprint would be an un-gated auto-action — exactly
  what is forbidden. V8-C re-uses VB3; it does not re-implement or weaken it.
- **Runtime cost enforcement (VB4)** — a saved run carries a saved budget. That budget must still **block** an
  over-limit paid action at re-launch time. V8-C inherits VB4's enforcement; a Blueprint cannot out-run the budget.
- **CTO queue + Guide routing (VB2/VB5)** — a Blueprint may be *offered* to the queue or drafted by the Guide,
  but only under the same founder-visible, no-auto-action rules V8-B established.

In one line: **V8-B makes a run real once; V8-C makes a trusted run repeatable — under the same gates.** Reversing
the order would mean saving something that cannot yet run and re-launching it without a wired gate — a non-starter.

## 🔒 Pre-ruled SENSITIVITY (inherited from V8-B, applied to Blueprints)
> A Blueprint is a stored intent to run real, gated work. Every path that **saves**, **edits**, **versions**, or
> **re-launches** a Blueprint is SENSITIVE — one builder + one independent adversarial checker each, throughout
> V8-C — because each inherits V8-B's executor, gate/approval, session-token, rollback, and cost-enforcement risk.

**Applied — the independent adversarial checker on each V8-C path must try to…**

| Pre-ruled sensitive path | The checker must try to… |
| --- | --- |
| Blueprint save / capture | save a Blueprint that captures more than the run authorized — extra scope, another project's context, or a secret/blocked value pulled into the stored config. |
| Blueprint re-launch | re-launch a Blueprint **without** a fresh recorded approval wired to that re-launch; replay an old approval; or launch a Blueprint the founder never approved. |
| Blueprint edit / version | mutate a saved Blueprint so the founder approves version A but version B runs; lose the version history; or make a "same Blueprint" quietly do something new. |
| Blueprint budget carry-over | re-launch a Blueprint whose saved budget is stale or absent and slip a paid action past runtime cost enforcement. |
| Blueprint isolation | build a Blueprint under one project that, on re-launch, reads or writes another project's content (crosses the VB0 attached-project boundary). |

Each checker's report is committed as evidence, re-reviewed after fixes, findings CLOSED before merge, and the
attack cases become **permanent committed CI proof** — the same rhythm as V8-A and V8-B. Any dashboard UI shell
around a Blueprint (the Blueprints list, the "save this run" card, the re-launch preview) is **wide-safe**.

## Explicit non-goals / guardrails (even in V8-C)
- **No Blueprint ever launches without a real, recorded founder approval wired to that specific re-launch.** A
  Blueprint pre-fills the gate; it never replaces it. No "run automatically", no schedule-and-forget in V8-C.
- **No live / provider / send / payment / production path** activates as a side effect of saving or re-launching a
  Blueprint — those remain behind their own dedicated, later gates.
- **No secret / blocked content is ever captured into or replayed from a Blueprint** — the File Cabinet + Project
  Guide data-class boundaries stand; a Blueprint stores configuration, never SECRET/unknown-blocked values.
- **No inventing state (Law 54)** — a Blueprint that cannot be read, or whose target project/run no longer exists,
  says UNKNOWN / STALE / CONFLICT honestly; it never pretends it can still run.
- **No cross-project bleed** — a Blueprint is bound to the project it was saved under (VB0 boundary); it cannot be
  re-pointed to smuggle one project's run into another without an explicit, gated re-bind.

## Provisional VC0..VCn DAG (for a future set of V8-C build contracts — each its own founder gate)
Spine order: **define the Blueprint schema → save/capture → read/list → re-launch (gated) → edit/version →
share/offer to queue.** Safety dependency overriding the spine: **no Blueprint may actually launch until re-launch
is wired to the V8-B Gate/Witness Engine (VB3)** — earlier phases may build and store Blueprints and their
evidence, but the *act* edge depends on VB3 landing in V8-B. Each `VCn` phase is SENSITIVE: one builder + one
independent adversarial checker.

- **`VC0` Blueprint schema + store (foundation)** — a schema-first, versioned representation of a saved run
  configuration (what it launches, its guardrails, its saved budget, the project it is bound to). Cannot-invent-
  state honest (Law 54). Depends: V8-B `VB1` (there must be a real run shape to describe). **Founder gate:
  `G1-C-VC0`.**
- **`VC1` Save / capture a run as a Blueprint** — turn an approved run into a named Blueprint; capture only what
  the run authorized; never capture secret/blocked content. Depends: `VC0`, V8-B `VB1`. **Founder gate: `G1-C-VC1`.**
- **`VC2` Read / list / explain Blueprints (view-only)** — a plain-English Blueprints list: what each does, when it
  last ran, whether it is still runnable (or STALE/UNKNOWN). No launch button that is not wired. Depends: `VC0`.
  **Founder gate: `G1-C-VC2`.**
- **`VC3` Re-launch a Blueprint (gated — the sensitive core)** — re-launching pre-fills the run and produces a
  **fresh recorded approval wired to that re-launch** via the V8-B Witness Engine; replay, forged, and
  never-approved launches all refused; the saved budget is re-checked against runtime cost enforcement. Depends:
  `VC1`, and **V8-B `VB3` (wired gate) + `VB4` (cost enforcement)**. **Founder gate: `G1-C-VC3`.**
- **`VC4` Edit / version a Blueprint** — edit produces a new, named version; the founder always sees which version
  they are approving; history is preserved; "same Blueprint, new behaviour" is impossible without a visible version
  bump. Depends: `VC0`, `VC3`. **Founder gate: `G1-C-VC4`.**
- **`VCn` Share / offer a Blueprint to the queue (routing boundary)** — a Blueprint may be *offered* into the V8-B
  CTO queue or drafted by the Guide as a founder-visible item, never an auto-action, never revealing blocked
  content. Depends: V8-B `VB2` (queue) + `VB5` (routing), and `VC3`. **Founder gate: `G1-C-VCn`.**

**Wide-safe shells (may run parallel where locks permit):** the Blueprints list, the "save this run" card, the
re-launch preview, and the version-history view are wide-safe once their sensitive core is merged and proven —
plain-English, no scary/ambiguous affordances, no action-looking buttons that are not wired.

## Provisional staged gate plan (`G1-C-*` per sub-system — each its own gate)
Each sub-system is its own build contract instance with its own implementation-start gate. **None fires until
V8-B is accepted as a whole** (Law 69). No sub-system auto-follows the previous one; the founder records each
sentence explicitly.

| Gate | Authorizes starting… | Prefilled start sentence (finalized at the gate) | Dependency |
| --- | --- | --- | --- |
| `G1-C-VC0` | Blueprint schema + store | *"I approve starting V8-C Blueprint schema + store per this proposal-turned-contract."* | PENDING V8-B acceptance |
| `G1-C-VC1` | Save / capture a run as a Blueprint | *"I approve starting V8-C Blueprint save/capture per this contract."* | PENDING V8-B acceptance |
| `G1-C-VC2` | Read / list / explain Blueprints | *"I approve starting V8-C Blueprint read/list per this contract."* | PENDING V8-B acceptance |
| `G1-C-VC3` | Re-launch a Blueprint (gated) | *"I approve starting V8-C Blueprint re-launch (gated) per this contract."* | PENDING V8-B acceptance |
| `G1-C-VC4` | Edit / version a Blueprint | *"I approve starting V8-C Blueprint edit/version per this contract."* | PENDING V8-B acceptance |
| `G1-C-VCn` | Share / offer a Blueprint to the queue | *"I approve starting V8-C Blueprint share/offer-to-queue per this contract."* | PENDING V8-B acceptance |

Each sub-system then follows the same rhythm as V8-A/V8-B: schema-first (53), builder + independent adversarial
checker, committed adversarial proofs, exact-SHA CI, UI witness (`G2-C-*`), accept gate (`G3-C-*`). A final
**V8-C whole-stage acceptance** (with its own Stranger Test at the V8-C gate) would accept the Blueprints product
as one whole.

## ⛔ Dependency note — every VC gate is PENDING V8-B acceptance
**No `VCn` sub-system and no `G1-C-*` gate may start until V8-B is accepted as a whole.** This is not a soft
ordering preference — it is a hard safety dependency:
- V8-C **stores and replays** what V8-B can run. Without an accepted Run Launcher + executor (VB1) there is nothing
  legitimate to save, and without the accepted, proven Wired Gate/Witness Engine (VB3) a re-launch cannot be gated.
- Building V8-C against an *un-accepted* V8-B would mean saving Blueprints of a run whose safety is not yet proven,
  and re-launching them through a gate whose adversarial proofs are not yet CLOSED — importing every open V8-B risk
  into a *repeatable* surface. That multiplies risk instead of containing it.
- Therefore each row of the gate plan carries **PENDING V8-B acceptance** in its dependency column, and this
  document stays **DRAFT** until V8-B whole-stage acceptance passes. Authorization for any V8-C work comes only
  from a future, live V8-C build contract recorded *after* that acceptance (Law 69).

## Authority & claims
The single provenance-checked claims table for this LANE D draft — every claim with its PR, resolvable SHA, and the
V8-B era authority it follows — is in the companion report `docs/assembly-evidence/v8c/LANE_D_REPORT.md`.

## One next action
**None until V8-B is accepted as a whole.** Then this draft can be promoted to a real V8-C proposal and its first
gate card (`G1-C-VC0`). It is not code and starts nothing automatically (Law 69).
