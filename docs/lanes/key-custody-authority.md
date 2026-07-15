`STATUS: DRAFT — PENDING INDEPENDENT CHECK · AUTHORIZES NOTHING · FIRES NO GATE`

# Key-Custody Authority (KCA) — DRAFT authority (provable disjointness)

> **Plain English — read this first.**
>
> 1. **What this is.** A *design authority draft* defining the **Key-Custody Authority (KCA)** — the
>    authority that vouches for *which key belongs to which role*, so the dispatcher's signed routing
>    envelopes and the founder's hardware step-ups can be trusted. The dispatcher final-authority draft
>    (`dispatcher-final-authority.md`, **HR-4**) names the KCA as a **hard build precondition** and points
>    here for its definition.
> 2. **What it does NOT do.** This document **AUTHORIZES NOTHING.** It **grants custody of no key**,
>    **creates no signer**, **stands up no KCA**, and **fires no gate.** It writes down, as text to be
>    checked, *what a KCA must be* and *what would prove it is disjoint* from the roles it attests. It is a
>    draft to read, check, and (later) approve — not a build order and not an attestation.
> 3. **Why it matters.** If the party that vouches for a signing key is *also* the party that signs, the
>    vouching is worthless — the fox certifies the henhouse. The dispatcher's entire forgery-resistance
>    (a route is trusted only because its envelope is signed by a KCA-attested key) collapses the moment
>    the KCA and an attested role share a controlling principal. So the KCA's value is *only* as strong as
>    its **provable disjointness** from every role it attests.
> 4. **What you can test now.** Nothing to run — this is a document. Read the custody classes, the §28
>    citation form, the disjointness requirement and its two binding residual clauses, and confirm they
>    match what you want before this ever backs a build lane.
> 5. **One next action.** This draft must go to an **independent adversarial checker** (builder ≠ checker)
>    and a sheriff before it can back any authorization. It makes **no readiness claim** and **no
>    soak-pass claim**, and grants no build authority.

---

## 1. What the KCA is, and its purpose

The **Key-Custody Authority (KCA)** is the authority that **attests `key → role` bindings**: it is the
single, auditable source of truth for the statement *"this signing key belongs to this role, and no
other."* Nothing else in the system is permitted to make that statement.

Its purpose is to make the dispatcher's trust chain **grounded** rather than **assumed**:

- The dispatcher (`dispatcher-final-authority.md`, HR-1) accepts a routing decision **only if** it arrives
  as an envelope signed by the routing authority's signing key. "Signed by *the* routing authority" is only
  meaningful if some authority independent of the router **attests** that the verifying key really is the
  routing authority's — and is not, say, the CTO's key wearing the router's name. That attesting authority
  is the KCA.
- The founder gate (CF-4 / HR-5) is accepted **only if** signed by the founder gate key **and** accompanied
  by a hardware step-up. Again, "the founder's key" is only trustworthy if an independent authority attests
  the binding `key → founder`. That is the KCA.
- HR-4's rule "**no agent may mint its own signing key**" is enforceable **only** because a key is trusted
  *solely* when the KCA attests its `key → role` binding. An envelope signed by a key the KCA does not vouch
  for is rejected exactly like an unsigned envelope.

So the KCA is the **root of the routing/gate trust chain**. It does not route, build, audit, or sign gates;
it **attests bindings** and it **custodies the material** those bindings point at. Everything the dispatcher
trusts, it trusts because the KCA vouched for a key — which is exactly why the KCA must be **provably
disjoint** from everything it vouches for (§4).

This document is a DRAFT authority: it **defines** the KCA and **states the conditions it must satisfy**. It
does **not** instantiate a KCA, does not custody any key, and does not itself satisfy any of the conditions
below — supplying the actual KCA authorization artifact and its resolving §28 citation is a **later, checked
act** performed by a separate, gated lane.

---

## 2. What the KCA custodies (enumerated classes)

The KCA **issues, holds, rotates, and revokes** the following classes of key material, credentials, and
capabilities. This is an enumeration of *classes*, not an inventory of live secrets — **no key material,
secret, fingerprint, or credential appears in this document** (see §7, secret-scan clean).

- **Class K1 — Routing-authority signing key.** The private signing key whose signature makes a routing
  envelope valid under HR-1. Custody = issue, hold, rotate, revoke; the binding attested is `K1 → routing
  authority (dispatcher's routing capability)`. The dispatcher *uses* the verifying side; it never *holds*
  custody of K1 and cannot mint or re-issue it.
- **Class K2 — Per-role attestation keys.** One distinct attestation key **per attested role** — CTO
  (build), Advisor (audit), dispatcher, founder — used to bind and verify each role's identity (CF-2's
  "disjoint credentials no single process can hold at once"). Custody attests each `K2ᵢ → roleᵢ` binding.
  These are **per-role and mutually distinct**; the KCA never issues one key that speaks for two roles.
- **Class K3 — Founder hardware-step-up root.** The trust root for the founder's **hardware-backed** gate
  step-up (HR-5) — the root against which a hardware security key / hardware-bound authenticator the founder
  physically exercises is verified. Custody attests `K3 → founder hardware step-up`. Software possession of
  a gate key is necessary but not sufficient; the hardware root anchors "the founder physically present."
- **Class K4 — Capability / attestation-record authority.** The capability to *emit `key → role`
  attestations at all*, plus custody of the **append-only attestation record** in which every issue /
  rotate / revoke and every `key → role` binding is written so it is auditable after the fact (HR-4's
  "independently verifiable and auditable from committed record"). K4 is the capability that makes K1–K3
  attestations *mean something*; it is itself subject to the KCA's own separation of duties (§6).

For every class, the custody lifecycle is **issue → hold → rotate → revoke**, and **every act in that
lifecycle is recorded** in the K4 attestation record so it is independently checkable — not taken on trust.

---

## 3. §28 citation form (how a KCA authorization artifact is cited)

Per the Written-Authority Law (§28), an authorizing artifact must **resolve on disk, verbatim, before any
work it backs**, and is cited by **`path @ SHA`**. For the KCA specifically, HR-4 requires the citation to
be **mechanically checkable**. The exact form is:

```
<path> @ <full-40-character git object SHA>
```

- **`<path>`** is the in-worktree path of the KCA authorization artifact (the committed file that stands up
  the KCA and records its disjointness proof and its `key → role` attestations).
- **`<SHA>`** is a **full 40-character** git object SHA — **not** an abbreviated/short SHA, **not** a branch
  name, **not** a tag. Abbreviated SHAs are rejected: the citation is only valid at full 40-char width.
- The SHA **must resolve in-worktree**, mechanically, via:

  ```
  git -C <worktree> rev-parse HEAD:<path>
  ```

  If that command does not resolve to the cited 40-char SHA, the citation is **unmet** and the KCA
  precondition of HR-4 is **not satisfied** — no build lane may proceed on it. This is the same
  `git cat-file`-resolvable discipline the Provenance Law (§26) requires: a claim with no resolvable commit
  is a **phantom, not a deliverable**.

**This draft does not — and must not — cite a KCA authorization artifact for itself.** The KCA authorization
artifact does not yet exist; asserting a `path @ SHA` for it here would be a phantom citation of exactly the
"VA-REPAIR-5" class §28 forbids (see the separation-of-duties authority, §b). Supplying that citation is a
**later, checked act** by a separate gated lane, after which an independent checker verifies it resolves.
The §28 citations *this* draft makes — of the two authorities it rests on — are in §8 and **do** resolve
in-worktree today.

---

## 4. Provable disjointness from every role it attests (the core requirement)

The KCA is worth exactly as much as its **disjointness** from the roles it attests. HR-4 states it as a
**hard build precondition**: *no entity may simultaneously be the KCA and any of CTO (build) / Advisor
(audit) / dispatcher / founder*, and this disjointness **must be provable** — verifiable from committed
evidence, not asserted.

**The requirement.** The KCA MUST be **provably disjoint** from **every** role it attests — CTO, Advisor,
dispatcher, and founder — such that no attested role can vouch for its own signing key. A KCA that
**coincides with any role it attests** is rejected as a **self-custody seam**: it would let that role
certify its own authority, which **collapses HR-1's forgery resistance** and **destroys the
separation-of-duties basis** (`separation-of-duties.md` §a — the approver must have no stake in the work
passing; a signer certifying its own key is the fox certifying the henhouse).

Disjointness is **not** satisfied by "a different name" or "a distinct identity string." It is required at
the **principal** level, with **no common-control or collusion path**. The two tracked residuals below are
therefore stated as **BINDING clauses**, not aspirations:

### Clause D-1 (BINDING) — Principal-level common-control exclusion

**No shared human, account, or machine principal may control both the KCA and any attested role.**
Disjointness is at the level of the **controlling principal**, not merely a distinct identity or name. It is
a violation — and the KCA is out of spec — if **any** of the following holds for the KCA and any of CTO /
Advisor / dispatcher / founder:

- the **same human** operates or can authenticate as both;
- the **same account** (login, service account, credential set, key store, or role assumption) can act as
  both;
- the **same machine principal** (host, process, container, VM, TPM/enclave, or hardware token) holds or can
  exercise the custody material of both;
- there exists **any common-control or collusion path** — a shared administrator, a shared root of trust, a
  shared recovery/break-glass credential, a shared signing host, or a delegation edge — by which one
  principal could cause both the KCA and an attested role to act.

Two labels that trace back to one controlling principal are **one** principal for this clause. The
disjointness is between **who or what can actually control the material**, not between the names on the
material.

### Clause D-2 (BINDING) — Explicit no-proxy clause

**The KCA may NOT delegate, sub-delegate, or route its attestation authority through any attested role.**
No attested role — CTO, Advisor, dispatcher, or founder — may act as a **proxy** for KCA attestation. It is
a violation — and the KCA is out of spec — if:

- the KCA **delegates** or **sub-delegates** its `key → role` attestation capability (K4) to an attested
  role, in whole or in part, permanently or temporarily;
- an attestation is **issued, relayed, co-signed, counter-signed, transported, or rubber-stamped by** an
  attested role such that the role stands (even partially) between the KCA and the binding it attests;
- the KCA **routes** its attestation authority **through the dispatcher** (or any attested role) so that
  the role's action is load-bearing for the attestation's validity.

The attestation authority must reach the `key → role` binding **directly from a principal disjoint (per
D-1) from every attested role** — never *via* one of those roles. A proxy path re-introduces exactly the
self-custody seam D-1 excludes, through a delegation edge instead of a shared login.

---

## 5. What a disjointness PROOF consists of

A disjointness claim is worthless if it is **self-asserted**. HR-4 requires the disjointness to be
**verifiable from committed evidence**. Concretely, a proof that satisfies §4 consists of **all** of the
following, **committed and independently checkable** (by an adversarial checker who is not the KCA and not
any attested role), **not** taken on trust:

- **P-1 — Distinct principals bound to distinct hardware/credentials.** Committed evidence that the
  principal controlling the KCA and the principal(s) controlling each attested role are **distinct at the
  human/account/machine level** (D-1), each **bound to distinct hardware / credentials / key stores** with
  **no shared** signing host, root of trust, recovery credential, or admin. Distinctness is shown at the
  *controlling-principal* level, not by exhibiting two different names.
- **P-2 — Auditable `key → role` attestation record.** The append-only attestation record (class K4)
  showing, for each of K1 / K2ᵢ / K3, the binding `key → role`, its issue/rotate/revoke history, and the
  principal that made each attestation — such that any binding is **checkable after the fact** and any
  attested key can be traced to a KCA act (HR-4: no agent mints its own key).
- **P-3 — Attestation that no single principal holds both, with no proxy edge.** An explicit, committed
  attestation that **no single principal** controls both the KCA and any attested role (D-1) **and** that
  the attestation authority is **not delegated, sub-delegated, or routed through any attested role** (D-2)
  — including evidence that the delegation/control graph contains **no edge** connecting the KCA principal
  to any attested-role principal.
- **P-4 — Independently checkable, committed, not self-asserted.** Every item above is **committed** (§28
  `path @ full-40-char-SHA`, §3) and **resolvable in-worktree**, so an independent adversarial checker can
  re-derive the conclusion from the artifacts rather than believing the KCA's own word. A green
  self-check is **necessary, never sufficient** (`separation-of-duties.md` §a, standing lesson).

If any of P-1…P-4 is missing or self-asserted, the disjointness proof is **incomplete** and the HR-4
precondition is **unmet** — regardless of how the KCA describes itself.

---

## 6. The KCA's own separation of duties

The KCA is **itself** subject to separation of duties (HR-4, third bullet). Its custody acts — issue,
rotate, revoke — and each binding it attests (`key → role`) must be **independently verifiable and
auditable** from the committed K4 record. The party that *performs* a custody act must not be the sole party
that *approves* it; the KCA is not exempt from the doctrine it exists to serve
(`separation-of-duties.md` §a). Concretely: the disjointness of §4 and every attestation of §2 must be
**checkable after the fact**, by someone who is neither the KCA nor an attested role — never taken on trust.

---

## 7. Honest scope and real-world preconditions (limits, stated plainly)

This draft does not paper over what a fully-disjoint KCA actually costs. A KCA that is **provably** disjoint
per §4 has **real-world preconditions** that must be met by a build lane — not hand-waved:

- **A second, independent principal is required.** D-1 cannot be satisfied on a single principal. Someone or
  something **other than** the CTO, the Advisor, the dispatcher, and the founder must control the KCA. If no
  such second principal exists, the disjointness is **unattainable**, not merely undocumented — and the
  HR-4 precondition simply cannot be met yet. This is a genuine limit, stated plainly.
- **External / distinct hardware is required.** Distinct hardware, key stores, and roots of trust (P-1) mean
  the KCA's custody material cannot live on the same host, token, enclave, or admin plane as any attested
  role's. Sharing a signing host or a break-glass credential re-collapses disjointness through D-1.
- **A trusted third party may be required.** If, in a given deployment, no *internal* principal is genuinely
  disjoint from all four roles (e.g., a small operation where the same human ultimately controls
  everything), then a **trusted third party** — an external custodian / attestation authority — is a
  **precondition** for a disjoint KCA. Absent that, the honest statement is that the KCA is **not** provably
  disjoint, and HR-4 remains **unmet**.
- **Disjointness is a property to be proven per deployment, not inherited from this document.** This draft
  defines the requirement and the proof shape; it does **not** confer disjointness on any concrete KCA.
  Each instantiation must produce its own P-1…P-4 evidence, committed and checked.
- **No readiness, no soak-pass, no gate.** This document makes **no** readiness claim and **no** soak-pass
  claim. It authorizes nothing and fires no gate.

Stating these limits *is* the honest posture the checker practice demands: better to name the second-principal
/ external-hardware / trusted-third-party precondition than to assert a disjointness the deployment cannot
actually prove.

---

## 8. Scope guardrails (what this draft does NOT do)

- It does **not** authorize writing any KCA code, key-custody code, attestation code, dispatcher code, or CI
  guard. Any build is a separate, gated lane under **one builder plus one independent adversarial checker**.
- It does **not** grant custody of any key, create any signer, issue any attestation, or stand up the KCA. It
  **defines** the KCA and states, as binding text, the conditions it must satisfy.
- It does **not** cite a KCA authorization artifact for itself (none exists yet); doing so would be a phantom
  citation of the class §28/§26 forbid.
- It contains **no key material, secret, credential, or fingerprint** of any kind — only *classes* (§2).
- It does **not** touch product code (`src/**`), the shared host workload lease, any live soak run, or any
  role's current mandate. The founder remains the sole gate signer; CTO and Advisor remain disjoint; the
  dispatcher only routes.
- It makes **no readiness or soak-pass claim** of any kind. This is a DRAFT pending independent check.

---

## 9. Authority (Written-Authority Law §28)

Per §28, every authorizing artifact is committed and cited by `path @ SHA` before it backs a claim. The SHAs
below are **full 40-character** git object SHAs resolvable in this worktree via
`git -C <worktree> rev-parse HEAD:<path>`. **No soak-pass line is claimed. No readiness claim is made.**

| Claim this draft rests on | Authority (path @ SHA) |
|---|---|
| The dispatcher final-authority requires the KCA (HR-4): existence, a §28 `path @ SHA` citation, and **provable disjointness** from CTO / Advisor / dispatcher / founder as a hard build precondition; no agent may mint its own signing key | `docs/lanes/dispatcher-final-authority.md` @ `8b3459005e242cee0bc9dc7fb71d5411238282fd` |
| Separation of duties: no agent both does and approves its own work; the approver has no stake in the work passing; a signer certifying its own key is the fox certifying the henhouse; a green suite is necessary, never sufficient | `docs/lanes/authority/separation-of-duties.md` @ `1817cf2ba5aaec2f6fe9c26972e57ba4654ba936` |
