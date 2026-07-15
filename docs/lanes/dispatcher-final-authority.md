`STATUS: DRAFT — PENDING INDEPENDENT CHECK · SUPERSEDES dispatcher-proposal.md`

# Dispatcher Final-Authority (DRAFT · supersedes the dispatcher proposal)

> **Plain English — read this first.**
>
> 1. **What this is.** A *design authority draft* for the "dispatcher" — the traffic controller that
>    receives incoming work and hands each piece to exactly one role. It supersedes the earlier
>    `dispatcher-proposal.md` in authority: it carries that proposal's rules forward unchanged and then
>    tightens them into **mechanical** rules that name their own enforcement. **No code is written or
>    authorized here. This document AUTHORIZES NOTHING** — it is a draft to read, check, and (later)
>    approve, not a build order.
> 2. **Why it supersedes.** The round-1 checker found the first draft asserted its rules in prose with
>    no enforcement mechanism. The proposal closed most of that in design. This draft goes further: it
>    replaces "the dispatcher decides who does this and logs it" with a **signed, out-of-band routing
>    envelope**, replay protection, an explicit **DENY matrix**, a named key-custody dependency, a
>    hardware step-up on the founder gate, and an **anchored ledger** — so a routing decision cannot be
>    forged, replayed, guessed, or quietly rewritten.
> 3. **What can go wrong (and is forbidden here).** A forged or inferred routing decision; a captured
>    decision replayed later; the build role (CTO) and the audit role (Advisor) routing into each
>    other; an agent minting its own signing key; a founder gate signed without a hardware confirmation;
>    or a routing record edited after the fact. Each of those is drawn as a hard, mechanical rule below.
> 4. **What you can test now.** Nothing to run — this is a document. Read the mechanical rules, the DENY
>    matrix, and the carried-forward gap list, and confirm they match what you want.
> 5. **One next action.** This draft must go to an **independent adversarial checker** before it can
>    back any authorization. It makes **no readiness claim** and grants no build authority.

---

## Relationship to the superseded proposal

This draft **supersedes `docs/lanes/dispatcher-proposal.md` in authority**. It does **not** edit that
file or its round-1 checker report — both remain committed and are cited verbatim by `path @ SHA` in
§28 below. Where this draft and the proposal agree, the proposal's text stands as the origin; where
this draft is stricter, **this draft is the governing statement**. The proposal's five hard rules and
its seven findings (F1–F7) are carried forward here **unchanged in intent** and, where a new mechanism
strengthens a finding's disposition, that is stated explicitly.

Nothing here weakens any rule the proposal made. The founder remains the **sole** gate signer; the
CTO (build) and the Advisor (audit) remain **disjoint** authorities; the dispatcher **only routes** and
never builds, audits, or signs.

---

## Carried forward from the proposal (unchanged, still binding)

The proposal's five hard rules remain in force verbatim in intent; restated in one line each so this
draft is self-contained:

- **CF-1 — Own lane, own identity.** The dispatcher runs under a distinct identity that is never the
  CTO's and never the Advisor's; it holds a routing capability only and can never build, audit, or sign.
- **CF-2 — CTO ≠ Advisor, disjoint credentials.** Build (CTO) and audit (Advisor) are provisioned from
  disjoint credentials no single process can hold at once; every item carries a verifiable caller
  identity, and a multi-role or unauthenticated caller is rejected. *(proposal Rule 2; closes F1.)*
- **CF-3 — One-way routing, checked in and out.** BUILD routes only to the CTO, AUDIT only to the
  Advisor; a returning result is accepted only if attested by the identity of the role it was routed
  to. A cross-authored result is rejected as a role-cross. *(proposal Rule 3; closes F2.)*
- **CF-4 — Gate signatures never auto-issued, forwarded, or replayed.** Only the founder signs a gate;
  the signature is bound to the bundle's `path @ SHA` plus a one-time nonce; the dispatcher may
  transport but never re-present a signature. *(proposal Rule 4; closes F3 — this draft mechanizes the
  binding further in HR-2 and HR-3.)*
- **CF-5 — Dispatcher is a SENSITIVE surface.** Any dispatcher build lane ships a named validator / CI
  guard that verifies checker identity ≠ builder identity and blocks merge on a green suite alone, built
  under one builder plus one independent adversarial checker. *(proposal Rule 5; tracks F4.)*

The proposal's self-modification rule (self-change → UNROUTED, founder bootstrap; closes F5) and its
immutable founder-visible routing log with low-confidence → UNROUTED (closes F6) are also carried
forward; the routing log is **strengthened into the anchored ledger of HR-6**. F7 (runtime attestation)
remains a build-lane requirement, now partially served by the ledger and envelope mechanisms below.

---

## The six mechanical hard rules (this draft's contribution)

Each rule is stated so it is **mechanically checkable** — a build lane can point at the artifact that
enforces it. A dispatcher that cannot enforce all six is out of spec and **must not ship**. These rules
sit **on top of** CF-1…CF-5; they do not replace them.

### HR-1 — Signed, out-of-band routing envelope

Every routing decision is carried in a **signed routing envelope** that is delivered **out-of-band** —
on a channel separate from the in-band work item — and is **never inferable or forgeable from in-band
content**. Mechanically:

- A routing decision is **valid only if** it arrives as an envelope **signed by the routing authority's
  signing key** (see HR-4 for where that key comes from). An unsigned decision, or one whose signature
  does not verify, is **rejected** — there is no "infer the route from the payload" fallback.
- The envelope binds, at minimum: the **origin role**, the **destination role**, the target work item's
  `path @ SHA`, a **one-time nonce**, and a **freshness timestamp/expiry** (see HR-2).
- **Out-of-band** means the envelope travels on a channel the in-band submitter does not control, so a
  crafted work item cannot **manufacture** its own routing decision. The dispatcher **must not** derive
  a route from in-band fields (headers, filenames, self-asserted labels); those are advisory only and
  are re-checked against the signed envelope.
- Consequence: a party that can write a work item still **cannot forge where it routes**. Routing
  authority lives in the signature on the envelope, not in the content being routed.

### HR-2 — Replay protection (nonce + freshness)

A captured envelope **cannot be replayed**. Mechanically:

- Each envelope carries a **one-time nonce** drawn from a monotonic/anti-collision source. The
  dispatcher maintains a **seen-nonce set**; an envelope whose nonce has already been consumed is
  **rejected as a replay**. A nonce is single-use across the whole system, not per-channel.
- Each envelope carries a **freshness window** (issued-at + short expiry). An envelope presented outside
  its window is **rejected as stale**, independent of the nonce check — so even a first-seen nonce does
  not resurrect an expired decision.
- The nonce is **bound into the signed body** (HR-1), so it cannot be stripped or swapped without
  breaking the signature. Replay of an envelope onto a *different* work item fails because the item's
  `path @ SHA` is also in the signed body.
- This is the same anti-forward, anti-replay discipline the proposal's Rule 4 (CF-4) applies to founder
  gate signatures, generalized to **every** routing envelope: bound SHA + one-time nonce + freshness.

### HR-3 — Origin→destination DENY matrix (explicit deny, not default-allow)

Routing is governed by an **explicit origin→destination DENY matrix**. A route is permitted **only if**
the (origin, destination) pair is on the allow list **and** not on the deny list; anything not
explicitly allowed is **denied by default**. The **build role and the audit role can never route into
each other** — this is an explicit DENY, stated below, not an emergent property of classification.

| Origin ↓ \ Destination → | CTO (build) | Advisor (audit) | Founder (gate) | Dispatcher (self) |
|---|---|---|---|---|
| **CTO (build)** | n/a (self) | **DENY** (CTO↔Advisor) | ALLOW (submit result / request gate) | DENY |
| **Advisor (audit)** | **DENY** (CTO↔Advisor) | n/a (self) | ALLOW (submit result / request gate) | DENY |
| **Founder (gate)** | ALLOW | ALLOW | ALLOW | ALLOW (bootstrap / self-change) |
| **Dispatcher (self)** | ALLOW (route BUILD) | ALLOW (route AUDIT) | ALLOW (transport gate request) | DENY (may not route its own change — UNROUTED) |

**The load-bearing cell: `CTO ↔ Advisor = DENY`, in both directions.** The build role (CTO) and the
audit role (Advisor) **can never route into each other**. A build role can never open a route that
lands in the audit role, and an audit role can never open a route that lands in the build role. This is
an **explicit deny**, evaluated before any allow, so a mis-classification (proposal F6) cannot silently
cross the streams: crossing is blocked by the matrix even if the classifier is wrong. Any (origin,
destination) pair absent from the allow set is **denied**, and any pair on the deny set is denied even
if it also appears to be allowed — **deny wins**. Low-confidence or unmapped pairs fall to **UNROUTED /
held for the founder**, never to a best-guess route.

### HR-4 — Key-Custody Authority: existence + provable disjointness (hard build precondition)

The envelope signing keys of HR-1 and the founder gate key of CF-4 **depend on a key-custody
authority** — the **Key-Custody Authority (KCA)**. This document **does not grant custody** of any
key, creates no signer, and fires no gate; it states, as **binding text**, the conditions the KCA
**must** satisfy **before any dispatcher build lane is authorized**. Mechanically:

- **KCA MUST exist and be §28-cited before build.** The routing authority's signing key, each role's
  attestation key (CF-2), and the founder gate key are **issued, held, rotated, and revoked by the
  KCA**. A dispatcher build lane **must not be authorized** until the KCA exists **and** its
  authorization artifact is **committed and §28-cited** here by `path @ SHA` — a **full 40-character**
  git object SHA, resolvable in-worktree. Until that citation resolves, this precondition is **unmet**
  and no build lane may proceed. *(This draft states the requirement; it does not itself supply or
  self-satisfy the citation — that is a later, checked act.)*
- **KCA MUST be provably DISJOINT from every role it attests.** **No entity may simultaneously be the
  KCA and any of CTO (build) / Advisor (audit) / dispatcher / founder.** The KCA identity is
  **disjoint** from all four, and this disjointness **must be provable** — verifiable from committed
  evidence, not asserted. A KCA that **coincides with any role it attests** is rejected as a
  self-custody seam: it would let that role vouch for its own signing key, which **collapses HR-1's
  forgery resistance** and destroys the **separation-of-duties basis** (a signer certifying its own
  authority is the fox certifying the henhouse). This is a **hard build precondition**: a build lane
  whose KCA is not provably disjoint from CTO, Advisor, dispatcher, and founder is **out of spec and
  must not ship**.
- **The KCA's own separation-of-duties and its `key → role` attestations MUST be verifiable/auditable.**
  The KCA is itself subject to separation of duties: its custody acts (issue, rotate, revoke) and each
  binding it attests (`key → role`) must be **independently verifiable and auditable** from committed
  record — the disjointness above and every attestation must be **checkable after the fact**, not taken
  on trust.
- **No agent may mint its own signing key.** A key is trusted **only if** the KCA attests to the binding
  `key → role`. An envelope signed by a key the KCA does not vouch for is **rejected** exactly like an
  unsigned envelope (HR-1). This rule is **necessary but not sufficient**: without the provable
  disjointness above, a KCA that is also a role could still attest its own key and pass this check while
  defeating its purpose.

### HR-5 — Hardware-backed step-up on the founder gate

A **founder gate** — and any routing decision the matrix flags as **sensitive** (e.g., a route that can
lead to a release, an acceptance, or a self-change bootstrap) — **requires a hardware-backed step-up
confirmation** before the decision takes effect. Mechanically:

- The founder gate signature of CF-4 is only accepted if it is accompanied by a **hardware-backed
  step-up** (a hardware security key / hardware-bound authenticator the founder physically exercises).
  A gate "signed" without the hardware step-up is **rejected** — software possession of a key is
  necessary but **not sufficient** for a gate.
- The step-up is **bound to the same nonce and `path @ SHA`** as the envelope (HR-1/HR-2), so a captured
  step-up cannot be forwarded to a different gate or replayed to a later one.
- Sensitive routes identified by the DENY matrix / classification (HR-3) inherit the same requirement:
  the dispatcher **holds** the item as UNROUTED until the hardware step-up is presented and verified. No
  agent can supply the step-up on the founder's behalf.
- This raises the bar the proposal set (founder is sole signer) from "the founder's key" to "the founder
  physically present with hardware," closing the seam where a stolen software key alone could pass a gate.

### HR-6 — Anchored, append-only ledger

Every routing decision is recorded in an **append-only, hash-anchored ledger**. This **strengthens**
the proposal's "immutable, founder-visible routing log" (F6 disposition) into a tamper-evident chain.
Mechanically:

- Each ledger entry records the **full signed envelope** (HR-1), its **nonce and freshness** (HR-2), the
  **matrix decision** (allow/deny and the cell hit, HR-3), any **hardware step-up** proof (HR-5), and the
  **outcome** (routed-to role, UNROUTED, or rejected-with-reason).
- Entries are **append-only** and **hash-anchored**: each entry carries the hash of the prior entry (a
  hash chain), so any edit, deletion, or reordering of a past entry **breaks the chain** and is
  detectable. The chain head is periodically **anchored** to an external witness so the whole history
  cannot be silently rewritten.
- The ledger is **founder-visible** and **read-only to every agent**: the dispatcher, CTO, and Advisor
  may **append** decision records but may **never rewrite** history. A rejected or replayed envelope is
  **also** recorded, so an attempted forgery or replay leaves an indelible trace.
- Consequence and F7 tie-in: because the deployed dispatcher's every decision is anchored, a decision
  that did not come from the checker-approved artifact is **visible after the fact**, giving the runtime
  attestation gap (F7) a durable, tamper-evident audit surface pending full runtime attestation.

---

## Carried-forward findings ledger (F1–F7)

| Finding (round-1 checker) | Proposal disposition (carried) | This draft's mechanical strengthening |
|---|---|---|
| **F1** — caller identity at input (CRITICAL) | closed-in-design (Rule 2 / CF-2) | HR-1 out-of-band signed envelope + HR-4 KCA-attested key bind who may route; **HR-4 now states IN-doc a hard build precondition: the KCA must exist, be §28-cited (`path @ SHA`), and be provably DISJOINT from CTO / Advisor / dispatcher / founder** — no self-custody seam |
| **F2** — result provenance (CRITICAL) | closed-in-design (Rule 3 / CF-3) | HR-3 DENY matrix blocks CTO↔Advisor even under mis-classification |
| **F3** — signature forward/replay (CRITICAL) | closed-in-design (Rule 4 / CF-4) | HR-2 nonce + freshness generalized to every envelope; HR-5 hardware step-up on gates |
| **F4** — mechanized sensitivity (HIGH) | build-lane requirement (Rule 5 / CF-5) | unchanged: named CI guard, checker ≠ builder, green ≠ sufficient |
| **F5** — self-modification routing (HIGH) | closed-in-design (self-change → UNROUTED) | HR-3 matrix: Dispatcher→Dispatcher = DENY (UNROUTED, founder bootstrap) |
| **F6** — classification safety (HIGH) | closed-in-design (routing log, low-conf → UNROUTED) | HR-3 explicit deny before allow; HR-6 anchored ledger replaces the plain log |
| **F7** — runtime attestation (MEDIUM) | tracked-as-build-lane-requirement | HR-6 anchored ledger gives a tamper-evident runtime audit surface (partial) |

**F1, F2, F3, F4, F5 must be closed before this design could be authorized to build**, exactly as the
round-1 checker required. This draft closes them in design more tightly; it does **not** declare them
built, and it makes **no readiness claim**.

---

## Scope guardrails (what this draft does NOT authorize)

- It does **not** authorize writing any dispatcher code, key-custody code, ledger code, or CI guard. Any
  build is a separate, gated lane under one builder plus one independent adversarial checker.
- It does **not** grant custody of any key, create any signer, or stand up the Key-Custody Authority. It
  names the KCA as a **dependency** and, in HR-4, states as **binding text** the hard build preconditions
  the KCA must satisfy — existence, a §28 `path @ SHA` citation, and **provable disjointness** from CTO /
  Advisor / dispatcher / founder — without itself supplying, satisfying, or firing a gate on any of them.
- It does **not** change any role's current mandate. The founder remains the sole gate signer; CTO and
  Advisor remain disjoint; the dispatcher only routes.
- It does **not** touch product code (`src/**`), soak lanes, the shared host workload lease, the
  superseded proposal, or that proposal's checker report. It supersedes the proposal **in authority**,
  by reference — not by edit.
- It makes **no readiness or soak-pass claim** of any kind. This is a DRAFT pending independent check.

---

## Authority (Written-Authority Law §28)

Per §28, every authorizing artifact is committed and cited by `path @ SHA` before it backs a claim. The
SHAs below are full 40-character git object SHAs resolvable in this worktree via
`git -C <worktree> rev-parse HEAD:<path>`. This draft supersedes the proposal **in authority**; it cites
the proposal and its round-1 checker report as the origin it carries forward, and the separation-of-duties
authority as the doctrine it rests on. **No soak-pass line is claimed.**

| Claim this draft makes | Authority (path @ SHA) |
|---|---|
| Superseded proposal, carried forward unchanged in intent (five hard rules, routing table, F1–F7 dispositions) | `docs/lanes/dispatcher-proposal.md` @ `3200874d3b4ac72d9a8484b069c5da58d06bf7f2` |
| Round-1 adversarial checker findings F1–F7, verbatim, that this draft mechanically strengthens | `docs/assembly-evidence/dispatcher/checker-report.md` @ `6436eadf58d218ed59d5291234713b8237c9d292` |
| Separation of duties: no agent both does and approves its own work; CTO (build) ≠ Advisor (audit); dispatcher only routes; founder is sole gate signer | `docs/lanes/authority/separation-of-duties.md` @ `1817cf2ba5aaec2f6fe9c26972e57ba4654ba936` |
