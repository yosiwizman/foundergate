# V8-A2 Proposal — Preview Bay + Bug Collector (PROPOSAL ONLY)

> **Plain English — read this first.**
>
> 1. **What this is.** A *proposal* for the next stage, V8-A2. It describes — in scope terms taken from Roadmap
>    §16 — what V8-A2 would add: a **Preview Bay** (look at your app safely inside FounderGate) and a **Bug
>    Collector** (click "Report Problem" and capture evidence). **No code is written here.**
> 2. **Why it matters.** V8-A1 lets you *read* your project's truth. V8-A2 is the first step toward *interacting*
>    with it safely — seeing the app run and reporting what's wrong — without touching a terminal.
> 3. **What can go wrong.** Scope creep (building V8-B gate-approval or worker-fixing into V8-A2), or a preview
>    that can reach the real world. This proposal draws those lines explicitly and keeps them gated.
> 4. **What you can test now.** Nothing to run — this is a document. You can read the two scope lists below and
>    confirm they match what you want next.
> 5. **One next action.** At gate **G4**, approve or reject *starting* V8-A2. Approval is not code; V8-A2
>    implementation would be its own gated build (Law 69).

---

## Authority & status

- **Authority:** Roadmap V8.11 §16 staged plan; Preview Bay §4.5 (+ security §4.5.1); Bug Collector §4.7.
- **Status:** **PROPOSAL ONLY.** No V8-A2 code exists or is authorized by this document. Under Law 69, V8-A1
  remains the only active build contract until the founder approves V8-A2 start at gate **G4**.
- **Predecessor:** V8-A1 (Truth Dashboard MVP) is complete and approved (G3, product-final `acd2b04`).

## What V8-A2 would deliver (in scope, per §16)

### 1. Preview Bay (§4.5 / §4.5.1)
Open the built app **inside FounderGate** — the founder never starts servers, copies localhost URLs, or clears
browser cache manually (No Naked Localhost law).

**V8-A2 controls (in scope):**
- Start App Preview · Stop App Preview · Restart Preview
- Refresh App View · Clear Preview Cache
- Open Full Screen (controlled review mode)
- Report Problem (hands off to the Bug Collector — see below)
- Read Aloud (Low-Hand Mode: read a summary of what's on screen) *— if implemented in V8-A2*

**Always-on preview labels (required):** environment (preview/staging/live/unknown) · data (test/real/mock/unknown)
· sends (off/held/live) · payments (mock/test/live) · build version · last-refreshed time · proof-recording status
· release label · data classification.

**Isolation (security §4.5.1):** the Preview Bay embeds an *untrusted* app, so V8-A2 must ship explicit isolation
(sandboxing per §4.5.1). **Preview control is not live action** — any live provider/send/payment path stays gated.

**Preview-failure support (C7):** if a preview fails, show *what failed* and *what the CTO must check* in plain
English with a next action — never a blank screen, never a fabricated success.

### 2. Bug Collector / Founder Evidence Capture (§4.7)
When the founder sees something wrong, they click **Report Problem** and V8-A2:
- captures a screenshot + context,
- lets the founder mark the area / add a note / add an optional voice note (Low-Hand Mode),
- applies data classification automatically (C3),
- stores an evidence packet in the project's `.foundergate/bugs` (or `evidence`),
- verifies the bug-report screen renders via a Playwright V8-A2 smoke.

**Founder Evidence law:** a founder screenshot/bug report is valid harness evidence — stored, version-bound,
project-bound, environment-labeled, data-classified, and triaged like Playwright evidence.

## Explicit non-goals (NOT in V8-A2 — stay deferred/gated)

- **Gate approval in the Preview Bay.** Approve / Reject / Defer are **V8-B+ only**, after the Gate/Witness Engine
  is wired and proven. In V8-A2 they are **view-only or absent**; Preview Bay review is **not** gate approval.
- **Worker fixes from a bug.** V8-A2 **captures** evidence only. CTO triage into a lane, worker fix in a cage,
  checker attack, resolved card, and the anti-repeat check (B6) are **V8-B**. A bug does not launch a fix by itself.
- **Reset Test Data** and **Record Witness** — **V8-B+ / gated**.
- **Any live provider / send / payment / production path** — remains gated at every stage.
- **File Cabinet (V8-A3), Project Guide (V8-A4), Run Launcher / Bench / multi-project autonomy (V8-B+).**

## Proposed acceptance criteria for V8-A2 (for a future build contract)

*(Illustrative — the binding V8-A2 contract would be authored like §16.0 was for V8-A1, only after G4.)*
- Preview Bay starts/stops/restarts/refreshes a preview with all required labels always shown; No-Naked-Localhost
  holds; isolation per §4.5.1 proven; preview-failure shows plain-English error + next action (never blank/fake).
- Report Problem captures a screenshot + context, stores a data-classified evidence packet under
  `.foundergate/bugs`, and a Playwright smoke proves the bug-report screen renders.
- Approve/Reject/Defer are demonstrably view-only or absent (not wired to any approval).
- No live/provider/send/payment path is reachable from the Preview Bay.
- Founder Hand-Burden: reporting a bug needs no terminal and no typed prose (voice/mark options work).

## One next action (founder, at G4)
Approve or reject **starting** V8-A2 in the Founder Gate Ledger. Approval authorizes a *future* gated V8-A2 build;
it is not code and starts nothing automatically (Law 69). Rejection (with a reason) keeps V8-A1 as the sole active
contract.
