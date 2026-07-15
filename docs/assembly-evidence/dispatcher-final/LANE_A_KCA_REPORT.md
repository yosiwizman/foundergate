# Lane A (docs) — Dispatcher Final-Authority · HR-4 KCA provable-disjointness clause · build note

**STATUS: DRAFT — supports no readiness claim.** This lane amended ONE existing design-authority draft
(`docs/lanes/dispatcher-final-authority.md`, still `STATUS: DRAFT`) so that its **HR-4 (Key-Custody
Authority)** carries an **explicit provable-disjointness clause** as **binding text INSIDE the document**.
The draft still **authorizes nothing**, **fires no gate**, makes **no readiness claim**, and claims
**no soak-pass**. It merely states the disjointness requirement as a **hard build precondition**.

## The gap this closes
An independent re-check found HR-4 pushed the KCA's authorization to *"a separate, out-of-scope
artifact"* and carried **no disjointness requirement** — leaving a seam where the Key-Custody Authority
could coincide with a role it attests (collapsing HR-1 forgery resistance and the separation-of-duties
basis). The requirement now lives **inside HR-4**, not beside it.

## What changed in HR-4 (before → after)

**BEFORE** — HR-4 titled *"Key-custody dependency (named; not granted here)"*; its custody bullet ended:

> **This authority does not itself grant custody.** It records the dependency and the interface (issue,
> rotate, revoke, attest); the KCA's own authorization is a **separate, out-of-scope artifact**. Stating
> the dependency here prevents the seam where the dispatcher would otherwise be its own key issuer —
> which would collapse HR-1's forgery resistance.

The "separate, out-of-scope artifact" wording is **removed**. HR-4 now requires, as binding text:

**AFTER** — HR-4 titled *"Key-Custody Authority: existence + provable disjointness (hard build
precondition)"*, with these binding requirements:

1. **KCA MUST exist and be §28-cited before build.** A dispatcher build lane must not be authorized
   until the KCA exists **and** its authorization artifact is committed and **§28-cited** by
   `path @ SHA` — a **full 40-character** git object SHA, resolvable in-worktree. Until that citation
   resolves, the precondition is unmet and no build lane may proceed.
2. **KCA MUST be provably DISJOINT from every role it attests** — **no entity may simultaneously be the
   KCA and any of CTO (build) / Advisor (audit) / dispatcher / founder.** A KCA coinciding with a role
   is rejected as a self-custody seam: it collapses HR-1's forgery resistance and destroys the
   separation-of-duties basis. Provable = verifiable from committed evidence, not asserted.
3. **The KCA's own separation-of-duties and its `key → role` attestations MUST be verifiable/auditable**
   from committed record — checkable after the fact, not taken on trust.
4. **"No agent may mint its own signing key"** is preserved but marked **necessary, not sufficient**:
   without the provable disjointness above, a KCA that is also a role could attest its own key and still
   pass this check while defeating its purpose.

Ancillary edits (consistency only): the **F1 row** of the carried-forward findings ledger now notes that
HR-4 states the existence + §28-citation + provable-disjointness precondition **IN-doc**; the **scope
guardrail** on the KCA now reflects that HR-4 states these binding preconditions without supplying,
satisfying, or firing a gate on any of them. All other rules (CF-1…CF-5, HR-1…HR-3, HR-5, HR-6), all
F1–F7 dispositions, and all §28 citations are **preserved unchanged**. `STATUS: DRAFT` retained.

## Authority (§28) — full 40-char SHAs, resolvable via `git -C <worktree> rev-parse HEAD:<path>`

| Cited artifact | AUTHORITY (path @ SHA) |
|---|---|
| Amended draft (this note describes; SHA is the post-commit blob of the amended file) | `docs/lanes/dispatcher-final-authority.md` @ `8b3459005e242cee0bc9dc7fb71d5411238282fd` |
| Separation-of-duties authority (doctrine HR-4 disjointness rests on) | `docs/lanes/authority/separation-of-duties.md` @ `1817cf2ba5aaec2f6fe9c26972e57ba4654ba936` |
| Superseded dispatcher proposal (origin the draft carries forward) | `docs/lanes/dispatcher-proposal.md` @ `3200874d3b4ac72d9a8484b069c5da58d06bf7f2` |

## Host discipline
Docs-only. No code, no key-custody artifact, no signer created; no local test/build/soak/service run.
Read-only git/gh + docs writes only. Secret-scanned. **No readiness claim.** This amended draft must go
to an independent adversarial checker before it can back any authorization.
