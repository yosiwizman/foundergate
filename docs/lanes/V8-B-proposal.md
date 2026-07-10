# V8-B Proposal — Making It Real (PROPOSAL ONLY) — DRAFT · PENDING V8-A ACCEPTANCE

> **STATUS: DRAFT — PENDING V8-A ACCEPTANCE.** This is a *draft* written while the V8-A Stranger Test is still to
> be run. It is **not** a gate card and **authorizes nothing** (Law 69). It becomes a live proposal / gate card
> only **after the Stranger Test passes and V8-A is accepted**.

> **Plain English — read this first.**
>
> 1. **What this is.** A draft plan for **V8-B: making the safe, read-only product *actually do things*** — under
>    the same gates and proofs. Today V8-A *shows* you the truth and *drafts* for you; V8-B is where approvals
>    become real actions.
> 2. **Why it matters.** It's the step from "a trustworthy window" to "a trustworthy operator" — still founder-
>    gated, still evidence-first, but now it can start a run, act on an approval, and enforce a budget.
> 3. **What can go wrong.** This is where the real power (and real risk) lives: running code, real approvals,
>    session tokens, rollbacks, spending money. **Every one of those is pre-ruled SENSITIVE** (below).
> 4. **What you can test now.** Nothing — a draft document.
> 5. **One next action.** None until the Stranger Test passes and V8-A is accepted. Then this can become a real
>    proposal.

---

## Authority & status
- **Authority:** Roadmap V8.11 **V8-B scope** + Laws 44/53/54/55/57/64/68/69.
- **Status:** **DRAFT, pending V8-A ACCEPTANCE.** Proposal only; no V8-B code; authorizes nothing (Law 69).
- **Predecessors:** V8-A1–A4 built & accepted; V8-A whole-product acceptance via the Stranger Test is the
  precondition for promoting this draft.

## What V8-B would deliver (in scope)
- **Run Launcher** — start a real build/run from the dashboard (not just preview), tracked and pausable.
- **CTO queue** — the Project Guide's *drafts* can be **routed** to a real work queue (this is the routing V8-A4
  deliberately deferred). A queued request is a founder-visible item, not an auto-action.
- **Wired Gate / Witness Engine** — **approvals become real**: recording an approval actually unblocks the gated
  work (today gates are view-only records; V8-B connects them to execution).
- **Runtime cost enforcement** — the budget stops being display-only and actually **blocks** paid actions over the
  limit at runtime.
- **Guide routing** — the in-dashboard Guide can hand a structured request to the queue / an expert, with the
  founder's explicit go-ahead.

## 🔒 Pre-ruled SENSITIVITY (verbatim — applies throughout V8-B)
> The gate/approval/witness-engine, executor, session-token, rollback, and cost-enforcement paths are ALL
> SENSITIVE — one builder + one independent adversarial checker each, throughout V8-B.

**Applied:** each of these surfaces runs **one primary builder + one independent adversarial checker** before
merge (the checker tries to make the surface act without a valid approval, escape a gate, leak or misuse a session
token, skip a rollback, or exceed the budget; report = evidence; re-review after fixes; findings CLOSED before
merge), Harvest Terminal as sole sheriff. Any UI shells around them are wide-safe. Carries forward: schema-first
(53), cannot-invent-state (54), view-only until wired (55), injection boundary (57), source-of-truth (68), only
the active build contract authorizes work (69).

## Explicit non-goals / guardrails (even in V8-B)
- No action ever happens without a **real, recorded founder approval** wired to that specific work.
- No paid/live/provider/send/payment action without passing **runtime cost enforcement** and its gate.
- No secret/blocked content ever exposed (the File Cabinet + Guide boundaries stand).
- Every executor action is **rollback-able** and leaves evidence; session tokens are least-privilege and revocable.

## Proposed staged plan (for a future set of V8-B build contracts, each its own gate)
1. **Wired Gate/Witness Engine** (SENSITIVE) — approvals unblock work, verifiably.
2. **Run Launcher + executor** (SENSITIVE) — start/track/pause a real run; rollback-able.
3. **CTO queue + Guide routing** (SENSITIVE routing boundary) — drafts become queued, founder-gated items.
4. **Runtime cost enforcement** (SENSITIVE) — budget actually blocks over-limit paid actions.
Each stage: schema-first, builder + independent adversarial checker, committed adversarial proofs, exact-SHA CI,
UI witness, accept gate — the same rhythm as V8-A.

## One next action
**None until the Stranger Test passes and V8-A is accepted.** Then this draft can be promoted to a real V8-B
proposal and gate card.
