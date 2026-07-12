`STATUS: DRAFT · design proposal, not authorized to build`

# Dispatcher-Design Proposal (DRAFT)

> **Plain English — read this first.**
>
> 1. **What this is.** A *proposal* for a "dispatcher" — a traffic controller that receives incoming
>    work and hands each piece to the right role. It writes down the rules the dispatcher must obey.
>    **No code is written or authorized here.** This is a document to read and approve, not a build.
> 2. **Why it matters.** Right now, deciding "who does this piece of work?" is done by hand. A
>    dispatcher makes that routing explicit and safe — so building work always goes to the builder,
>    auditing work always goes to the auditor, and approval always stays with you (the founder).
> 3. **What can go wrong (and is forbidden here).** Folding the router into the builder or the
>    auditor; letting the builder impersonate the auditor (or vice-versa); or letting any agent
>    "sign" a gate on your behalf. This proposal draws each of those lines as a hard rule.
> 4. **What you can test now.** Nothing to run — this is a document. Read the five design rules and
>    the routing table below and confirm they match what you want.
> 5. **One next action.** Approve or reject *starting* a dispatcher build. Approval is not code; any
>    build would be its own gated, evidence-first lane under one builder and one independent checker.

---

## Why this exists

Separation of duties: **no single agent may both propose (or build) work and approve its own work.**
If the party that does the work is also the party that judges it, the sign-off is worthless — it is
the fox certifying the henhouse. A dispatcher makes the split mechanical: it *routes* work to the
correct role but never *does* the work and never *approves* it. The three jobs — route, build/audit,
approve — stay in three different hands (dispatcher, CTO/Advisor, founder).

This is not a new idea. The harness already runs every sensitive surface under one builder plus one
independent adversarial checker, and it already learned — the hard way — what happens when a review
believes work that was never actually built. That failure had a name: the phantom "VA-REPAIR-5"
bundle, "believed-reviewed but ... never ... built — no branch, no PR, no commit." A dispatcher that
could route "approval" to itself, or let a builder wear the auditor's badge, is exactly how another
phantom would be born. The rules below exist to make that impossible by construction.

---

## The five hard design rules

These are **hard rules**: a dispatcher that violates any one of them is out of spec and must not ship.

1. **The dispatcher gets its OWN lane.** The dispatcher is its own identity and its own build lane.
   It is **never** folded into the CTO's role or the Advisor's role. The router that decides "who
   does this?" must not also be one of the answers, or it can quietly route work to itself.

2. **The CTO role is NOT the Advisor role.** These are two separate identities with two separate
   authorities. The CTO's authority is to *build*. The Advisor's authority is to *audit*. One agent
   may never hold both badges at once. The dispatcher must address them as distinct destinations.

3. **AUDIT routes to the Advisor; BUILD routes to the CTO; the two NEVER cross.** Auditing work is
   handed only to the Advisor. Building work is handed only to the CTO. The CTO may **never**
   inject, impersonate, or act on behalf of the Advisor, and the Advisor may **never** inject,
   impersonate, or act on behalf of the CTO. There is no path in the dispatcher that lets one role
   speak in the other's name.

4. **Gate signatures are NEVER auto-issued.** No gate is ever signed by the dispatcher or by any
   agent — not the CTO, not the Advisor, not the router. **Only the founder signs gates.** The
   dispatcher may *prepare* a gate (assemble the evidence and present it) but the signature is a
   human act reserved to the founder. An auto-issued signature is treated as invalid, always.

5. **The dispatcher is a SENSITIVE surface.** Because the router sits on the critical path for every
   piece of work, it is built like the other sensitive surfaces: **one builder plus one independent
   adversarial checker**, the checker blind to the builder and writing nothing into the product.
   A green test suite is necessary but never sufficient; the independent checker must pass first.

---

## Routing table

The dispatcher classifies each incoming item and hands it to exactly one destination. It never keeps
work for itself and never signs anything.

| Incoming work | Classified as | Routes to | Mandate of that role | The dispatcher must NEVER |
|---|---|---|---|---|
| Change product code / implement a feature / fix a bug | BUILD | CTO | builds the product | route it to the Advisor, or let the CTO wear the Advisor badge |
| Review / adversarially check / audit someone else's work | AUDIT | Advisor | audits, read-only; writes no product | route it to the CTO, or let the Advisor wear the CTO badge |
| Approve / sign a gate (release, acceptance, go/no-go) | APPROVAL | Founder only | signs gates (human, sole signer) | auto-issue the signature itself or delegate signing to any agent |
| Decide who a piece of work belongs to | ROUTING | Dispatcher (self) | routes only, never builds/audits/signs | perform the build, perform the audit, or issue an approval |
| Unclear / cannot classify safely | UNROUTED | Held for the founder | no action until classified | guess and route BUILD/AUDIT work to the wrong role |

**Reading the table:** each row is a one-way street. BUILD only ever reaches the CTO; AUDIT only ever
reaches the Advisor; APPROVAL only ever reaches the founder; the dispatcher only ever routes. The two
work streams (build and audit) never cross, and no agent ever signs a gate.

---

## Scope guardrails (what this proposal does NOT authorize)

- It does **not** authorize writing any dispatcher code. Any build is a separate, gated lane.
- It does **not** change any role's current authority, nor create a new signer. The founder remains
  the sole gate signer.
- It does **not** touch product code, soak lanes, or anything outside `docs/`.

---

## Authority (Written-Authority Law §28)

Per §28, every authorizing artifact is committed verbatim and cited by `path @ SHA` before it backs a
claim. The two authorities this proposal rests on are captured verbatim in the file cited below (the
separation-of-duties principle, and the phantom "VA-REPAIR-5" lesson quoted from Assembly Manual §26
and §28, plus the harness stress-log standing lesson).

| Claim this proposal makes | Authority (path @ commit) |
|---|---|
| Separation of duties: no agent both does and approves its own work | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| Phantom lesson: work with no resolving artifact is not a deliverable, so routing must never sign for itself | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| Sensitive surfaces are built under one builder plus one independent adversarial checker | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
