# VB1 → VB3 Hardening Amendment — VB3 Entry Criteria (DRAFT)

**STATUS: DRAFT — PENDING INDEPENDENT CHECK**

> This is a **design DRAFT**. It **AUTHORIZES NOTHING**, accepts nothing, and merges nothing.
> The author lane (W1) makes **NO readiness claim and NO approval claim**. Every item below is
> proposed as a **VB3 ENTRY CRITERION** — a precondition that must be independently satisfied and
> independently checked *before* VB3 executor wiring is accepted. No card is issued by this document.

---

## Purpose

VB1 shipped a checker-CLEAN safety core: nothing executes for real in VB1 (`VB3_VERIFIER = null`),
and the round-2 independent adversarial checker closed all six actionable round-1 findings with
committed proofs, leaving three tracked, non-blocking VB1→VB3 residuals (LOW-2, NEW-1, NEW-2) plus
two structural properties (immutable approval provenance, mechanical single-writer enforcement) that
were *conventional* in VB1 and must become *mechanical* before real execution is wired.

This amendment restates those residuals and properties as **VB3 entry criteria** so that the
transition from an inert verifier (`VB3_VERIFIER = null`) to a live verifier cannot occur until each
hardening is present and independently verified.

### Cited authorities (§28 — resolvable full-40-char blob SHAs)

- VB1 round-2 independent checker report:
  `docs/assembly-evidence/VB1/checker-report-round2.md @ 2ad8d3daf61e87e8c6584a34b19c7613a7b26434`
- V8-B build contract (records the same three residuals as tracked VB1→VB3 items):
  `docs/lanes/V8-B-build-contract.md @ 670046b74b805790de785daa3f14cb0c7f5bad12`

All citations resolve at the frozen base commit; each SHA above is a full 40-character blob SHA
obtainable via `git rev-parse HEAD:<path>` and readable via `git cat-file -p <sha>`.

---

## VB3 Entry Criteria

Each criterion states the VB1-era residual/property, the hazard it closes, and the **acceptance test**
that must pass (independently, at the frozen VB3 SHA) before VB3 wiring is accepted.

### EC-1 — Rollback commit-phase TOCTOU closed (NEW-2)

**Residual (per round-2 report):** the rollback pre-verify phase canonicalizes `pAbs`/`bAbs`, but the
commit loop operates on the *raw* manifest path (`b.path` / `b.backup`). For a restore entry whose
`b.path` is nonexistent at verify time (reachable only via a tampered manifest), a concurrent process
planting a symlink at `b.path` between pre-verify and commit could have the copy follow it outside the
recorded containment root. In VB1 this is closed in practice only when the AKIOR-#8 lock is held across
backup → mutate → rollback; it is not closed *structurally*.

**Entry criterion:** the rollback commit loop **MUST** re-canonicalize the target path and re-check
containment against the recorded root **immediately before each write**, and **MUST** open the target
with an `O_NOFOLLOW`-equivalent guarantee (or write via a pre-opened, containment-checked file
descriptor) so that no symlink planted between verify and commit can redirect the write. The
`absent`-delete path (which uses `unlinkSync` and does not follow symlinks) must retain that property.

**Acceptance test:** an adversarial repro that (a) supplies a tampered manifest whose `b.path` is absent
at verify time and (b) races a symlink plant between pre-verify and commit **MUST** fail closed
(PATH_ESCAPE / no write outside root, zero bytes written outside the recorded root), *without* relying
on any advisory lock being held. Legitimate rollback still byte-restores.

### EC-2 — Immutable approval provenance (append-only, tamper-evident)

**Property (VB1 baseline):** approvals are HMAC-signed and field-bound over `{work, action, nonce,
rollbackable}` against the VB3-held `verifier.secret`, verified via `timingSafeEqual`. Unforgeability,
field binding, and HMAC hygiene hold at the *point of verification*. What VB1 does **not** provide is a
tamper-evident record that a given approval was recorded and honored.

**Entry criterion:** recorded approvals **MUST** be written to an **append-only provenance log** such
that a recorded approval is **tamper-evident** — any post-hoc edit, reorder, or deletion of a recorded
approval is detectable (e.g., hash-chained / monotonic-sequenced entries bound to the same signed
fields). The provenance record **MUST** bind the exact signed fields so a recorded entry cannot be
silently re-pointed to a different `work`/`action`/`nonce`.

**Acceptance test:** given a recorded approval, any mutation of the provenance record (edit a field,
delete an entry, reorder entries, splice a forged entry) **MUST** be detected by the provenance
verification. A genuine, unmodified chain verifies. No approval outside the append-only record is
treated as honored.

### EC-3 — Single-writer guard mechanically enforced (LOW-2 / AKIOR #4)

**Residual (per round-2 report):** the single-sanctioned-writer property (the central write-intent
guard, AKIOR #4 / LOW-2) was recorded as an *acceptable tracked residual* in VB1 — the concrete VB1
hazard is already closed structurally (HIGH-1: no approval authenticates; HIGH-2: rollback writes are
root-contained), so the guard was deferred to VB3 as a *conventional* expectation.

**Entry criterion:** the central write-intent guard **MUST** be **mechanically enforced**, not
conventional. There **MUST** be a single sanctioned write path through which all execution-phase and
rollback-phase writes pass; a write attempted outside that path **MUST** be structurally impossible or
fail closed — it must not depend on callers voluntarily honoring a convention or advisory lock.

**Acceptance test:** an attempt to perform an execution/rollback write bypassing the sanctioned
write-intent guard **MUST** fail closed (no write occurs), demonstrated by a repro that tries to write
directly rather than through the guard. Holding or not holding an advisory lock does not change the
outcome.

### EC-4 — Module-private verifier capability (NEW-1)

**Residual (per round-2 report):** `act({... verifier = VB3_VERIFIER})` accepts a per-call `verifier`
as a **defaultable call argument**. A caller supplying its own `{secret}` plus a matching signed
approval plus its own `mutate` thunk could execute. This is inert in VB1 (`VB3_VERIFIER = null`, no
legitimate secret) and is not a data-forgery escalation — but it is a code-level capability exposed on
the public call surface.

**Entry criterion:** VB3 **MUST** bind the verifier as a **module-private capability set only by VB3
wiring** — it **MUST NOT** be a defaultable `act()` argument. The public `act()` surface must expose no
parameter through which a caller can substitute its own verifier/secret. The only path to a live
verifier is the internal VB3 wiring.

**Acceptance test:** static/structural inspection **MUST** show `act()` exposes no caller-substitutable
`verifier` parameter, and a runtime attempt to pass a substitute verifier through the public surface
**MUST** be ignored/refused (the module-private capability is the sole authority). The verifier is set
only by VB3 wiring.

### EC-5 — Proven-still-inert-at-freeze (gate before wiring is accepted)

**Property:** VB1's entire safety argument rests on `VB3_VERIFIER = null` ⇒ `actEdgeWired()` is false
⇒ `verifyApproval` returns false for any input ⇒ nothing executes for real. VB3 wiring flips this. The
transition must be gated by a proof that, *at the exact frozen SHA being accepted*, the verifier is
still inert — i.e., no approval executes — so the acceptance is anchored to a code state that has not
already gone live.

**Entry criterion:** before VB3 wiring is accepted, a check **MUST** prove `VB3_VERIFIER` is still
**inert (no approval executes)** at the frozen SHA under evaluation. Acceptance of the wiring **MUST**
be conditioned on this proof; a SHA at which the verifier is already live is not eligible for the
inert-baseline acceptance step.

**Acceptance test:** at the frozen VB3 SHA, an independent check runs the VB1 inert-verifier proofs
(forged `{wired:true}` → NO_WIRED_APPROVAL ran=0; forged-sig no-verifier → NO_WIRED_APPROVAL ran=0;
etc.) and confirms **ran=0** — no approval executes — establishing the inert baseline against which the
subsequent wiring diff is reviewed.

---

## What this DRAFT does NOT do

- It does **not** authorize VB3 wiring, VB1 acceptance, or any merge.
- It does **not** issue an acceptance card and emits **no** soak-pass line.
- It does **not** modify any `src/**` file, the shared host-workload lease, the EVIDENCE_LEDGER /
  FOUNDER_GATE_LEDGER, or any other lane's file.
- It records **VB1 acceptance remains HELD** per the §29 Honest-Duration & Soak-Proof Law: acceptance
  requires a genuine `FOUNDERGATE HARNESS <N>-HOUR SOAK PASS` whose timestamps honestly span the
  claimed hours, which is out of scope for this docs-only DRAFT and is **not** claimed here.

## Independent-check checklist (to be performed by a separate checker, not the author lane)

- [ ] EC-1 adversarial commit-phase symlink-race repro fails closed without an advisory lock.
- [ ] EC-2 provenance tamper (edit/delete/reorder/splice) is detected; genuine chain verifies.
- [ ] EC-3 out-of-guard write attempt fails closed regardless of advisory-lock state.
- [ ] EC-4 `act()` exposes no caller-substitutable verifier; substitute is refused.
- [ ] EC-5 inert-baseline proof shows ran=0 at the frozen VB3 SHA before wiring is accepted.
- [ ] All cited authorities resolve at their full-40-char SHAs.

*Author lane: W1. Author makes no readiness or approval claim. STATUS: DRAFT — PENDING INDEPENDENT CHECK.*
