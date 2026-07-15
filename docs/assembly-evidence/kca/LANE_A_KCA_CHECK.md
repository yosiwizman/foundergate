# Lane A — Key-Custody Authority DRAFT — Independent Adversarial Check

> Independent adversarial checker (checker ≠ the Lane A builder). READ-ONLY re-check of `docs/lanes/key-custody-authority.md`. Report = evidence. Committed verbatim.

**VERDICT: CLEAN DRAFT — but disjointness UNSATISFIABLE in the current single-founder reality (REPORTABLE FINDING, not a doc failure).**

Target: `docs/lanes/key-custody-authority.md` @ `7b4dbfb24b19bb880fcb7c81fb793690f9695823`; +1 docs file, no `src/`.

## The finding — disjointness from the FOUNDER role is unsatisfiable today
D-1 requires the KCA be provably disjoint from all four roles **including founder**. In the current **one-founder / two-Mac / no-second-principal** reality:
- the founder is the sole human and IS the founder role, so any KCA the founder controls shares the founder's principal (D-1 "same human operates or can authenticate as both" — violated);
- the two Macs don't rescue it — both are founder-administered, a common-control path (two labels tracing to one controlling principal are one principal);
- a founder-held hardware token doesn't rescue it — under founder control; it can give disjointness from the *software agent* roles (CTO/Advisor/dispatcher) but **not** from the *founder* role, which is the binding constraint.

So a KCA provably disjoint from the founder cannot EXIST today without a new precondition. **The DRAFT already states this honestly** (§7: "A second, independent principal is required … If no such second principal exists, the disjointness is unattainable … the HR-4 precondition simply cannot be met yet"). The doc does not falsely claim disjointness — it is a correct DRAFT declaring an unmet precondition.

## The rest — PASS
- **Provable vs asserted (§5): PASS.** Concrete non-self-assertable proof (P-1 distinct principals on distinct hardware/credentials; P-2 auditable append-only `key→role` record; P-3 explicit no-single-principal attestation + control-graph "no edge"; P-4 committed §28 `path @ full-40-char-SHA`, re-derivable by an adversary who is neither KCA nor role; "green self-check necessary, never sufficient"). Minor limitation: P-1/P-3 require proving a negative — a committed control-graph excludes only *disclosed* edges; undisclosed shared admin / sham third-party can't be fully mechanized (mitigated by after-the-fact adversarial audit).
- **D-1 / D-2 bind (PASS, no clean evasion):** nominally-separate-but-founder-controlled account, time-slicing, shared break-glass/root, and KCA-delegating-through-a-role are all explicitly named as violations. Only residual is the proving-a-negative limit above.
- **Hygiene (PASS):** both §28 citations resolve full-40-char (`dispatcher-final-authority.md @ 8b34590…`, `separation-of-duties.md @ 1817cf2…`); STATUS DRAFT, authorizes nothing, fires no gate, no soak-pass line, no key material, docs-only; does not cite a phantom KCA artifact for itself.

## Options to meet the precondition (a FOUNDER decision — no signature queued)
1. **Second independent principal** — a genuinely distinct human/account/machine controlling the KCA, disjoint from all four roles. *Not available today (single founder).*
2. **External trusted third party / custodian** — an outside attestation authority holding the K1–K4 material. Cleanest path to true founder-disjointness; cost = onboarding + trusting an external party.
3. **Hardware-token-as-KCA-root — PARTIAL / insufficient alone.** A founder-held token does not create founder-disjointness; useful only for the software-agent roles. Do NOT treat as satisfying D-1.
4. **Documented single-founder exception with compensating controls** — instead of a false disjointness proof, record an explicit checker-acknowledged exception (append-only tamper-evident K4 record, hardware step-up, adversarial after-the-fact audit) + a written commitment to migrate to option 1 or 2 before the dispatcher build's forgery-resistance is load-bearing.

## Disposition
Per the founder's pre-set rule for the unsatisfiable branch: **queue NO signature.** The DRAFT lands on-record (authorizes nothing; honestly declares its unmet precondition); the founder decides among the options above before any lane may treat the KCA as an existing precondition. No dispatcher build is unblocked (its HR-4 KCA precondition remains unmet).
