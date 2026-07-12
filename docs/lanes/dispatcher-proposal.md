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
>    "sign" a gate on your behalf. This proposal draws each of those lines as a hard rule — and, after
>    a round-1 adversarial check, states the *mechanism* that enforces each one (not just the promise).
> 4. **What you can test now.** Nothing to run — this is a document. Read the five mechanical rules,
>    the routing table, and the open-gaps list below, and confirm they match what you want.
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
phantom would be born. The rules below exist to make that impossible **by construction** — enforced
by identity, attestation, and a CI guard, not by good intentions.

---

## The five hard design rules (each states its enforcement mechanism)

These are **hard rules**. A rule stated as prose only is not enough — that was the round-1 checker's
core finding — so each rule below names the mechanism that enforces it. A dispatcher that cannot
mechanically enforce all five is out of spec and **must not ship**.

1. **The dispatcher gets its OWN lane — and its own identity.** The dispatcher runs under a distinct
   identity/credential that is never the CTO's and never the Advisor's, and it is never folded into
   either role. *Mechanism:* the running dispatcher holds a routing capability only — it carries no
   credential that can build, audit, or sign — and the build-lane guard (rule 5) verifies at build
   time that the dispatcher identity, the CTO identity, and the Advisor identity are three distinct
   identities. The router that decides "who does this?" is therefore never one of the answers.

2. **The CTO role is NOT the Advisor role — enforced by disjoint credentials.** CTO and Advisor are
   provisioned from **disjoint credentials that no single process can hold at the same time**. Every
   work item entering the dispatcher carries a **verifiable caller identity** (a signed attestation of
   who is calling); the dispatcher **rejects** any item whose caller is unauthenticated or whose
   identity maps to **more than one role**. *Mechanism:* a role-identity attestation layer — each role
   holds its own signing key, so "a badge" is a cryptographic attestation, not a label a process may
   assert about itself. (Closes F1.)

3. **AUDIT↔Advisor, BUILD↔CTO — checked on the way IN and on the way OUT; the two NEVER cross.** On
   entry, build work is routed only to the CTO and audit work only to the Advisor, using the caller
   identity from rule 2. On return, a routed **result** is accepted **only if it is attested by the
   identity of the role it was routed to**: an AUDIT result must be signed by the Advisor identity, a
   BUILD result by the CTO identity. A result signed by the other role — a CTO-authored "audit," an
   Advisor-authored "build" — is **rejected as a role-cross**. The one-way routing table therefore
   holds on entry *and* on exit; no path in either direction lets one role speak in the other's name.
   (Closes F2; F1 supplies the identities.)

4. **Gate signatures are NEVER auto-issued — and never forwarded or replayed.** Only the founder signs
   a gate; no agent — dispatcher, CTO, Advisor, or router — may issue a signature. A founder signature
   is **cryptographically bound to the specific evidence bundle it approves (that bundle's path @ SHA)
   plus a one-time nonce**. The dispatcher may *transport* a signature but may **never re-present**
   one: forwarding a prior approval onto a different item, or replaying a stale signed bundle, is
   invalid exactly like auto-issuing. Any signature whose bound SHA or nonce does not match the item
   at the gate is **rejected**. (Closes F3.)

5. **The dispatcher is a SENSITIVE surface — and its sensitivity is mechanized, not promised.** Any
   dispatcher build lane **must ship a named validator / CI guard** that (a) verifies the **checker
   identity is not the builder identity**, and (b) **blocks merge on a green test suite alone** —
   green is necessary, never sufficient — until the independent checker has passed. *Where it lives:*
   a self-test under `src/tools/` (for example `dispatcher-duty-separation.selftest.mjs`), discovered
   by `scripts/run-selftests.mjs` and run in CI by `.github/workflows/selftests.yml`, in the same
   family as `report-provenance.mjs` (§26) and the two §28 CI guards. (Closes F4.) The dispatcher is
   built under **one builder plus one independent adversarial checker**, the checker blind to the
   builder and writing nothing into the product.

---

## Routing table

The dispatcher classifies each incoming item and hands it to exactly one destination. It never keeps
work for itself and never signs anything. Entry is one-way; **returning results are re-checked**
against the identity of the role they were routed to.

| Incoming work | Classified as | Routes to | Mandate of that role | The dispatcher must NEVER |
|---|---|---|---|---|
| Change product code / implement a feature / fix a bug | BUILD | CTO | builds the product | route it to the Advisor, or let the CTO wear the Advisor badge |
| Review / adversarially check / audit someone else's work | AUDIT | Advisor | audits, read-only; writes no product | route it to the CTO, or let the Advisor wear the CTO badge |
| A finished result returning from a routed role | RESULT | Accepted only if attested | a BUILD result must be signed by the CTO identity; an AUDIT result by the Advisor identity | accept a result signed by the other role (a CTO-authored "audit" or an Advisor-authored "build") — that is a role-cross |
| Approve / sign a gate (release, acceptance, go/no-go) | APPROVAL | Founder only | signs gates (human, sole signer); signature bound to the bundle path @ SHA + one-time nonce | auto-issue, forward, or replay a signature, or delegate signing to any agent |
| Work that modifies the dispatcher itself (its own code/config) | SELF-CHANGE | UNROUTED — held for the founder | built via a bootstrap path, not routed by the dispatcher-under-change | let the running dispatcher route, check, or approve its own change |
| Decide who a piece of work belongs to | ROUTING | Dispatcher (self) | routes only, never builds/audits/signs | perform the build, perform the audit, or issue an approval |
| Unclear / low-confidence classification | UNROUTED | Held for the founder | no action until a human classifies it | guess and route BUILD/AUDIT work to the wrong role |

**Reading the table:** each row is a one-way street. BUILD only ever reaches the CTO; AUDIT only ever
reaches the Advisor; APPROVAL only ever reaches the founder; the dispatcher only ever routes. The two
work streams (build and audit) never cross **on entry or on return**, and no agent ever signs a gate.

**Every routing decision is logged.** Each decision is written to an **immutable, founder-visible
routing log** (append-only, tamper-evident). Any **low-confidence** classification falls to UNROUTED
and is held for the founder rather than routed on a best guess; the **founder (or a designated human),
not the dispatcher**, decides an item that cannot be classified safely — the dispatcher may not
resolve its own uncertainty by guessing. (Closes F6.)

---

## Open design gaps raised by the round-1 checker (must-fix before authorization)

An independent adversarial checker reviewed the first draft. Verdict: §28 authority integrity **CLEAN**,
but the design was **NOT-CLEAN** — the rules were asserted in prose with no enforcement mechanism. The
checker report is committed verbatim at `docs/assembly-evidence/dispatcher/checker-report.md`. It
raised seven gaps; each is dispositioned below. Findings one through five must be closed before this
design could be authorized to build.

**F1 — caller identity at the input (CRITICAL, must-fix). Disposition: closed-in-design.** Rule 2 now
requires a verifiable caller identity per item, rejects unauthenticated or multi-role callers, and
provisions the CTO and the Advisor from disjoint credentials; the enforcing attestation layer is a
build-lane requirement.

**F2 — result provenance (CRITICAL, must-fix). Disposition: closed-in-design.** Rule 3 and the RESULT
row now accept a routed result only if it is attested by the routed-to role's identity; a
cross-authored result is rejected as a role-cross.

**F3 — signature binding, no forward or replay (CRITICAL, must-fix). Disposition: closed-in-design.**
Rule 4 now binds the founder signature to the bundle path @ SHA plus a one-time nonce, and forbids the
dispatcher from re-presenting, forwarding, or replaying a signature.

**F4 — mechanized sensitivity (HIGH, must-fix). Disposition: tracked-as-build-lane-requirement.** Rule
5 names the validator / CI guard (checker identity is not the builder identity; a green suite alone
blocks merge) and where it will live; the guard itself is built in the dispatcher build lane, not in
this document.

**F5 — self-modification routing (HIGH, must-fix). Disposition: closed-in-design.** The routing table
now sends any change to the dispatcher itself to UNROUTED / held for the founder, built via a bootstrap
path that does not use the dispatcher-under-change to route its own audit.

**F6 — classification safety (HIGH). Disposition: closed-in-design.** The design now requires an
immutable, founder-visible routing log for every decision and forces any low-confidence classification
to UNROUTED; the founder (or a designated human), not the dispatcher, decides an item that cannot be
classified safely.

**F7 — runtime attestation (MEDIUM). Disposition: tracked-as-build-lane-requirement (future work).** A
runtime integrity / attestation requirement — so the deployed dispatcher provably matches the
checker-approved artifact — is recorded as a build-lane hardening requirement, to resolve before or
during build.

---

## Scope guardrails (what this proposal does NOT authorize)

- It does **not** authorize writing any dispatcher code. Any build is a separate, gated lane.
- It does **not** change any role's current mandate, nor create a new signer. The founder remains the
  sole gate signer.
- It does **not** touch product code, soak lanes, or anything outside `docs/`.

---

## Authority (Written-Authority Law §28)

Per §28, every authorizing artifact is committed verbatim and cited by `path @ SHA` before it backs a
claim. The separation-of-duties principle and the phantom "VA-REPAIR-5" lesson (quoted from Assembly
Manual §26 and §28, plus the harness stress-log standing lesson) are captured verbatim in the first
file below; the seven open design gaps are sourced from the round-1 checker report in the second.

| Claim this proposal makes | Authority (path @ commit) |
|---|---|
| Separation of duties: no agent both does and approves its own work | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| Phantom lesson: work with no resolving artifact is not a deliverable, so routing must never sign for itself | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| Sensitive surfaces are built under one builder plus one independent adversarial checker | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| The seven open design gaps are recorded verbatim from the round-1 adversarial checker | `docs/assembly-evidence/dispatcher/checker-report.md` @ `4a03eb8a847c84cc8f2c5b635e560d6781e4e2be` |
