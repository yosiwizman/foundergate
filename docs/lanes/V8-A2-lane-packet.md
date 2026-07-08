# V8-A2 Lane Packet — Build Contract (Preview Bay + Bug Collector)

> **Plain English — read this first.**
>
> 1. **What this is.** The one-page **build contract** for V8-A2 — the exact, bounded scope a future
>    implementation bundle (P-A2-BUILD) is allowed to build: a **Preview Bay** and a **Bug Collector**. It's the
>    V8-A2 equivalent of the §16.0 contract that governed V8-A1.
> 2. **Why it matters.** It's what gate **G1-A2** asks you to approve *starting to build*. It fixes what's in,
>    what's out, and how V8-A2 will be proven — so the build runs autonomously without scope creep.
> 3. **What can go wrong.** The big risk is a preview that can reach the real world, or building V8-B gate-wiring
>    / worker-fixing into V8-A2. This contract forbids those explicitly and keeps them gated.
> 4. **What you can test now.** Nothing to run — a document. Read the Allowed / Forbidden / Acceptance lists and
>    confirm they match the approved proposal.
> 5. **One next action.** At **G1-A2**, record: *"I approve starting V8-A2 implementation per the approved V8-A2
>    lane packet."* No V8-A2 code starts before that sentence is recorded (Law 69).

---

## Authority & provenance
- **Authority:** Roadmap V8.11 §16 (V8-A2 stage) — Preview Bay §4.5 / §4.5.1; Bug Collector §4.7.
- **Approved proposal:** `docs/lanes/V8-A2-proposal.md` (PR #22, SHA `bd582d3`); **G4 recorded** (V8-A2 start
  approved).
- **Predecessor:** V8-A1 complete & approved (G3, product-final `acd2b04`).
- **Law 69:** this contract authorizes nothing until **G1-A2** is recorded; V8-A1 patterns (schema-first, cannot-
  invent-state, view-only, exact-SHA CI, honest scope) carry forward.

## 🔒 SENSITIVITY RULING (verbatim)

> Preview Bay starts/stops local app processes — tracked-process control is semi-sensitive; the implementation
> bundle therefore runs ONE primary builder + ONE independent checker, Harvest Terminal as sheriff; Bug Collector
> capture lanes are wide-safe.

**Applied:** the Preview Bay lanes (PA*) run **one primary builder + one independent read-only checker**, Harvest
Terminal (FounderGate CTO) as sole merge sheriff — never two writers on the process-control surface. The Bug
Collector lanes (BC*) are **wide-safe** and may run in parallel where the DAG and file locks permit.

## Allowed scope (component subset)

### Preview Bay (§4.5 / §4.5.1)
- Preview state schema (extend `.foundergate/preview.json`) + validator extension.
- Preview **process control**: Start / Stop / Restart Preview, Refresh App View, Clear Preview Cache
  (starts/stops/refreshes a **local** preview process only).
- Embedded preview window with **isolation per §4.5.1** (untrusted app sandboxed).
- Always-on preview **labels**: environment (preview/staging/live/unknown) · data (test/real/mock/unknown) ·
  sends (off/held/live) · payments (mock/test/live) · build version · last-refreshed time · proof-recording
  status · release label · data classification.
- **Open Full Screen** (controlled review mode); **Read Aloud** (Low-Hand summary) *if implemented*.
- **Preview-failure support (C7):** plain-English "what failed + what to check + next action" — never a blank
  screen, never a fabricated success.
- **Report Problem** entry point (hands off to the Bug Collector).

### Bug Collector (§4.7)
- **Report Problem** → capture screenshot + context.
- Founder marks the area / adds a note / optional **voice note** (Low-Hand Mode).
- **Data classification applied automatically** (C3).
- Evidence packet **stored in the project's `.foundergate/bugs`** (or `evidence`), version-/project-/environment-
  bound and data-classified.
- **Playwright V8-A2 smoke** proving the bug-report screen renders.

## Forbidden scope (stays deferred / gated)
- **Wired Approve / Reject / Defer buttons** — V8-B+ only (after the Gate/Witness Engine is wired & proven). In
  V8-A2 they are **view-only or absent**; Preview Bay review is **not** gate approval.
- **Reset Test Data** — V8-B+ / gated.
- **Record Witness** — V8-B+ / gated.
- **Bug triage into a lane / worker fixes / checker-attack / resolved card / anti-repeat auto-check (B6)** —
  **V8-B**. V8-A2 *captures* evidence only; a bug never launches a fix by itself.
- **Any live / provider / send / payment / production path** — remains gated at every stage.
- Anything outside Preview Bay + Bug Collector (File Cabinet V8-A3, Project Guide V8-A4, Run Launcher/Bench/multi-
  project V8-B+).

## Acceptance criteria (the V8-A2 build contract)
- Preview Bay starts/stops/restarts/refreshes a **local** preview with **all required labels always shown**;
  No-Naked-Localhost holds; **isolation per §4.5.1 is proven**; preview-failure shows plain-English error + next
  action (never blank/fake).
- **Preview control is not live action:** no live/provider/send/payment path is reachable from the Preview Bay
  (proven by test).
- Report Problem captures a screenshot + context, stores a **data-classified evidence packet** under
  `.foundergate/bugs`, and a **Playwright smoke** proves the bug-report screen renders.
- Approve / Reject / Defer are demonstrably **view-only or absent** (wired to no approval).
- **Cannot-invent-state** holds for all new surfaces (missing → UNKNOWN; preview state honest).
- Founder Hand-Burden: reporting a bug needs **no terminal and no typed prose** (voice/mark options work).
- **Exact-SHA CI green** on the final V8-A2 commit; acceptance packet complete with every evidence link.

## Evidence plan
Per-substep evidence folders under `docs/assembly-evidence/A2-*/`; validator/reader self-tests (pass AND fail);
cannot-invent-state CI; **Playwright smoke screenshots** for every V8-A2 screen (Preview Bay states + bug-report
screen) + a preview-failure state; an **isolation proof** for §4.5.1; a **no-live-path proof**; a machine-capacity
preflight per bundle/phase; and a V8-A2 acceptance packet checked against the acceptance criteria above.

## Substep DAG (for a future P-A2-BUILD bundle)

**Phase PA — Preview Bay (semi-sensitive: 1 builder + 1 checker, sheriff):**
- `PA1` preview schema (`.foundergate/preview.json`) + validator extension — *first*.
- `PA2` preview process controller (start/stop/restart/refresh/clear-cache) — depends `PA1`. *(tracked-process
  control — the semi-sensitive surface.)*
- `PA3` required preview labels rendering — depends `PA1`.
- `PA4` embedded preview window + **§4.5.1 isolation** — depends `PA2`, `PA3`.
- `PA5` preview-failure support (C7) — depends `PA2`, `PA4`.
- `PA6` Open Full Screen + Read Aloud (if implemented) — depends `PA4`.
- `PA7` no-live-path proof (no provider/send/payment reachable) — depends `PA4`.

**Phase BC — Bug Collector (wide-safe: capture lanes may run in parallel):**
- `BC1` Report Problem entry point (from Preview Bay + dashboard) — depends `PA4` (hook only).
- `BC2` capture screenshot + context — depends `BC1`.
- `BC3` mark area / note / optional voice (Low-Hand) — depends `BC2`.
- `BC4` auto data classification (C3) — depends `BC3`.
- `BC5` evidence packet storage in `.foundergate/bugs` — depends `BC4`.
- `BC6` Playwright V8-A2 smoke (bug-report render) — depends `BC1`–`BC5`.

**Phase AC — acceptance:** `AC1` cannot-invent-state CI for new surfaces · `AC2` exact-SHA CI · `AC3` V8-A2
acceptance packet. Gate after PA+BC+AC evidence complete: **G2-A2 (UI witness)**.

## One next action (founder, at G1-A2)
Approve or reject *starting* V8-A2 implementation. Approval authorizes the P-A2-BUILD bundle to run under this
contract; it is not code and starts nothing automatically (Law 69).
