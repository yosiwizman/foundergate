# AUTHORITY — Separation of Duties (and the phantom "VA-REPAIR-5" lesson)

**Status:** committed authority artifact (per §28 THE WRITTEN-AUTHORITY LAW — an authorizing
artifact must resolve on disk, verbatim, before any work it backs). This file exists so the
Dispatcher-Design proposal can cite a resolving `path @ SHA` for the two principles it rests on.

Plain English: this page writes down two rules the whole harness already lives by, so a proposal
that leans on them is not leaning on a memory or a chat message — it is leaning on a committed file.

---

## (a) The separation-of-duties principle

**No single agent may both propose (or build) work AND approve its own work.** The party that
*does* the work is never the party that *judges* or *authorizes* it. Concretely, in FounderGate:

- The builder is never the checker. Every sensitive surface is built under **1 builder + 1
  independent adversarial checker**, and the checker writes nothing into the product.
- The role that **audits** work (the Advisor) is a different identity and authority from the role
  that **builds** work (the CTO). Neither may impersonate or inject on behalf of the other.
- The party that **routes** work (the Dispatcher) is neither the builder nor the approver — it only
  hands each piece of work to the correct role.
- The **gate signature** — the act that says "this is approved" — is reserved to the **founder
  alone**. No agent, dispatcher, CTO, or Advisor may auto-issue a gate signature.

Why this is load-bearing: if one agent could both do the work and sign off on it, the sign-off is
worthless — it is the fox certifying the henhouse. Separation of duties keeps the approval honest
because the approver has no stake in the work passing.

This is not a new rule invented for the dispatcher; it is the harness's existing doctrine. The
independent-adversarial-checker practice is recorded in the harness stress log:

> **Standing lesson:** every one of these was invisible to the confirmation-oriented tests and
> visible only to an adversarial or dogfooding pass. Keep the independent-checker + dogfood-the-guard
> practices; treat a green suite as necessary, never sufficient.
>
> — `docs/status/HARNESS_STRESS_LOG.md`

and the same log's stress event S1 shows *why* builder-must-not-be-checker is not optional:

> S1 | **False confidence from passing tests** — VB0 had 26 green isolation self-tests, yet a 32-bit
> `projectId` hash was attacker-collidable ... | the **independent adversarial checker** (builder ≠
> checker), 3 rounds ...
>
> — `docs/status/HARNESS_STRESS_LOG.md`

---

## (b) The phantom "VA-REPAIR-5" lesson (verbatim)

The founder-mandated Provenance Law (§26) records the concrete failure that separation of duties and
written authority exist to prevent. Quoted verbatim from `docs/ASSEMBLY_MANUAL.md` §26:

> A bundle-completion report is **INVALID** unless **every claimed lane cites a PR and a SHA that
> RESOLVE ON DISK** (`git cat-file`). A claim with no resolvable commit is a phantom, not a
> deliverable. The founder's advisor will **reject** any completion report that lacks a resolvable
> PR + SHA for every lane. This is the permanent lock against the class that caused the Run-6 abort:
> a "VA-REPAIR-5" bundle was believed-reviewed but had **never been built** — no branch, no PR, no
> commit; only L3 existed. Never report a lane as done without a merged PR + SHA.
>
> — `docs/ASSEMBLY_MANUAL.md` §26 (THE PROVENANCE LAW — no phantom bundles)

And from §28 (THE WRITTEN-AUTHORITY LAW), verbatim, naming the same phantom as the reference class:

> Work started before its authority is committed is a **doctrine violation** — the same class as the
> phantom "VA-REPAIR-5" (work believed-specified that never landed on disk) and the FD design package
> (referenced but absent at audit time).
>
> — `docs/ASSEMBLY_MANUAL.md` §28 (THE WRITTEN-AUTHORITY LAW)

**The lesson for a dispatcher.** A phantom slipped through because the review believed something that
had no resolving artifact behind it. A dispatcher that routes work must therefore: (1) never route
"approval" to itself or to any agent — only the founder signs; (2) keep the auditing role (Advisor)
and the building role (CTO) as separate authorities so one cannot rubber-stamp the other; and (3) be
built as a sensitive surface under one builder plus one independent checker, so the router itself is
not a place a phantom can be born.
