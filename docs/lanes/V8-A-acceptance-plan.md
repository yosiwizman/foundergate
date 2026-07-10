# V8-A Full-Acceptance Plan — Stranger Test + Evidence + Gate Skeleton (PLANNING ONLY)

> **Plain English — read this first.**
>
> 1. **What this is.** The checklist for accepting **all of V8-A** (the founder-facing product: Truth Dashboard +
>    Preview Bay + Bug Collector + File Cabinet + Project Guide) as one whole — once V8-A4 is built and closed.
> 2. **Why it matters.** It defines the single test that proves the promise: **a non-developer stranger can run a
>    real project with no terminal, no prompts, no code.**
> 3. **What can go wrong.** Accepting on the builder's word instead of a true stranger's hands. This plan requires
>    an actual outside operator and captured evidence.
> 4. **What you can test now.** Nothing — this is a plan. The acceptance gate fires **only after V8-A4 closes**.
> 5. **One next action.** None now. Hold until V8-A4 (Project Guide) is complete and accepted (G4-A4).

---

## Authority & status
- **Authority:** Roadmap V8.11 (V8-A full-acceptance) + the Founder Readability Law + Hand-Burden law.
- **Status:** **PLANNING ONLY.** Authorizes nothing; fires only after **V8-A4 closes** (Law 69). No code.
- **Scope of acceptance:** V8-A1 Truth Dashboard · V8-A2 Preview Bay + Bug Collector · V8-A3 File Cabinet ·
  V8-A4 Project Guide — accepted together as the founder-facing V8-A product.

## The Stranger Test script (a true non-developer, no terminal, no prompts, no code)
A person who has never seen the project operates **one real project** end to end, unaided, using only the
dashboard UI. The observer records PASS/FAIL per step and any confusion, verbatim.

1. **See the truth.** Open the dashboard; answer the 8 status questions ("what is this / is it working / is it
   safe / what's it costing / what's blocked / what needs me / can I pause / what happened") from the screen alone.
2. **Preview the app.** Open the Preview Bay; confirm it's the real app with honest labels; confirm a live/send
   action is refused honestly (no real send).
3. **Report a bug.** Capture a bug through the Bug Collector; confirm it's stored/classified as evidence — with no
   terminal.
4. **Browse files safely.** Open the File Cabinet; confirm a data-class badge on every file; preview a safe
   document; confirm a **secret shows hidden** (no contents) and an **unknown shows blocked**.
5. **Ask in plain English.** Use the Project Guide: ask "why is this blocked?" and "what does this file do?"; get
   an honest, cited explanation; confirm the Guide **refuses** a file that tries to trick it and **never** reveals
   hidden content; draft a bug report or note as a card (nothing is sent or routed).
6. **Read a gate.** Open a view-only gate card; confirm it explains the decision in plain English with a prefilled
   sentence and **no action buttons** (view-only).
7. **Pause / do-not-touch.** Confirm Pause is one click and the do-not-touch items are visible immediately.

**Pass bar:** all 7 completed **unaided**, no terminal, no copy/paste to an outside tool, no code, no developer
translation — with the stranger's own words captured.

## Evidence requirements (captured, committed)
- **Stranger-test record:** who (a true non-developer, not the founder/builder), the verbatim run notes,
  PASS/FAIL per step, and any confusion — under `docs/assembly-evidence/VA/stranger-test.md`.
- **Hand-Burden proof:** zero-terminal for every step above (`docs/assembly-evidence/VA/hand-burden.json`).
- **Per-stage acceptance already on file:** V8-A1 (`A28/`), V8-A2 (`A2/`), V8-A3 (`A3/`), V8-A4 (`A4/`) packets,
  each with exact-SHA CI green and product-final SHA.
- **Independent audits on the sensitive surfaces:** V8-A2 process-control, V8-A3 secret-hiding, V8-A4 injection —
  checker reports + (where run) Terminal Advisor disk audit.
- **Repo posture:** private; secret-clean; no live/provider/send/payment path anywhere; suite ALL GREEN at the
  acceptance SHA.
- **Full-suite + guard green** at the exact acceptance commit (evidence-integrity guard + all self-tests).

## Gate card skeleton (V8-A full acceptance — fires only after V8-A4 closes)
- **Title:** V8-A Full Acceptance — the founder-facing product as one whole.
- **What you're accepting:** Dashboard + Preview Bay + Bug Collector + File Cabinet + Project Guide, each closed
  with its own gate, now accepted together.
- **Proof table:** per-stage product-final SHA + exact-SHA CI + witness result; stranger-test PASS; repo private;
  suite green.
- **Honest posture:** read-only product; no live path; sensitive surfaces independently checked.
- **Prefilled approval sentence (to be finalized at the gate):**
  *"I accept V8-A complete — Truth Dashboard, Preview Bay, Bug Collector, File Cabinet, and Project Guide — at
  their accepted product-final commits, stranger-test PASSED, exact-SHA CI green, repo private."*
- **Alternatives:** accept, accept-with-noted-follow-ups, or hold with specified fixes.

## One next action
**None now.** Hold until V8-A4 (Project Guide) is complete and accepted (G4-A4); then this plan drives the V8-A
full-acceptance gate.
