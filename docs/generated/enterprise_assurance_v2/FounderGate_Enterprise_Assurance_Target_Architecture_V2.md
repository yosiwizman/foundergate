# FounderGate — Enterprise Assurance Target Architecture V2
**Publication status: AMENDMENT CANDIDATE FOR OUTSIDE REVIEW.** Not accepted governance, not current verified state, not implementation authority, not a maturity target, not founder approval, not merge authority.

## Non-authority statement
This artifact asserts no current verified state and authorizes no implementation. Classifications are document-source classifications, not machine facts. Claim ceiling (every line): LOCAL/SYNTHETIC with limits; NOT production/SaaS/commercial/customer/paid/security-certified; NOT real physical containment; provider/private-repo/hardware/deploy/bill/merge blocked.

## Mock-Diagram principle (Roadmap V8.11 Law 71 — placed prominently, verbatim intent)
> **Target-state illustrations are never implementation authority.** The **active stage build contract** (Roadmap Law 69) governs all implementation and all sequencing. This document proposes **no** sequencing and **no** maturity target. Any diagram or "target" here is a target-state illustration only — not authorized, not sequenced.

## Corrected Domains 1–17
For each domain: a **source-classified documented-capability** statement, then a separate **TERMINAL VERIFICATION REQUIRED LATER (TVRL)** question. No classification is upgraded beyond what its cited source supports; nothing marked ACCEPTED HISTORICAL EVIDENCE is upgraded to current state; nothing marked NORMATIVE GOVERNANCE is downgraded to UNKNOWN.

| # | Domain | Documented capability (source-classified) | Current state — TVRL question |
| --- | --- | --- | --- |
| 1 | Shared platform foundation | NORMATIVE GOVERNANCE (`.foundergate/` project-truth folder + schema-first gate, Roadmap Laws 1/5/53) + BUILT BUT NOT ACCEPTED (dashboard reading it) | Do `.foundergate/` schemas validate today; does the dashboard read real harness truth? |
| 2 | Policy as code | PLANNED REQUIREMENT (policy engine) + NORMATIVE GOVERNANCE (lane-contract law 39, lane review law 48) | Does a policy engine exist in code; is lane review automated or manual? |
| 3 | Enterprise identity & authority | NORMATIVE GOVERNANCE (full role law, Law 70 helper identity, Law 58 delegation gate, trust tiers T0–T5) | Any identity enforcement beyond a single local founder user? |
| 4 | Unified audit & evidence | ACCEPTED HISTORICAL EVIDENCE (ledgers, evidence bus) + BUILT BUT NOT ACCEPTED (replay chain) + PLANNED (tamper-evidence, V8-D) | Current ledger contents/row counts; is the evidence bus wired into the control plane? |
| 5 | Connectors & normalisation | ACCEPTED HISTORICAL EVIDENCE (provider-neutral sandbox adapter, *conditional on addendum acceptance*) + PLANNED (breadth) | Is the adapter on protected main; current Integration Hub state; OpenSandbox patch-drift? |
| 6 | Continuous runtime verification | ACCEPTED HISTORICAL EVIDENCE (8h + 24h soak PASS on earlier layers) + UNKNOWN (integrated VB2 rerun — sealed or not) | **Priority:** did the integrated VB2 8h rerun seal, and with what verdict? |
| 7 | Deployment verification & rollback | PLANNED REQUIREMENT — deploy is a **blocked** founder gate; rollback/recovery exists only as governance | Confirm the deploy gate remains closed. |
| 8 | Security orchestration | BUILT BUT NOT ACCEPTED (Harvest W1 isolation proofs) + PLANNED (threat model, scanners) | Do W1 artifacts exist on disk; their acceptance status? |
| 9 | Software supply-chain assurance | NORMATIVE GOVERNANCE (License/IP Register law 66) + PLANNED (SBOM staged V8-B/V8-D) | Does the license/IP register artifact exist today? |
| 10 | Enterprise approval mechanics | NORMATIVE GOVERNANCE (founder gates, six-item protocol, one-PR-one-gate) | Is any gate engine wired (Law 55: gate cards view-only until a proven engine exists)? |
| 11 | Searchable evidence & audit UI | ACCEPTED HISTORICAL EVIDENCE (V8-A truth surfaces, Laws 51/54) + PLANNED (search/export) | Current dashboard state; does the cannot-invent-state test run in CI today? |
| 12 | Golden paths & scorecards | PLANNED (blueprints) + NORMATIVE GOVERNANCE (Release Label Ladder) | Is any release label currently assigned to any project? |
| 13 | Incident evidence & reverification | PLANNED (system, V8-D) + ACCEPTED HISTORICAL EVIDENCE (preserved real incidents) | Are preserved incident records on disk with evidence refs? |
| 14 | Trust Center & disclosure | UNSUPPORTED as a requirement; useful proposal only (claims governed by the Claim Blocker table) | Founder decision (Trust Center publication), not a disk fact. |
| 15 | Documentation, training, support | NORMATIVE GOVERNANCE (Document Family Map, Law 52 consumer rule) + PLANNED (support org) | Which companion docs currently exist on disk? |
| 16 | Customer outcome measurement | PLANNED (method) + ABSENT (outcomes — no customers) | n/a until customers exist. |
| 17 | Continuous learning & controlled evolution | NORMATIVE GOVERNANCE (failure preservation, 3-cycle-then-park, Bench, staleness law) | Do Bench records exist and are they being written? |

## Doctrinal Invariants (D1–D7) — corrected name (D-05)
*(Renamed from "differentiators"; content kept. These are invariants, not the product differentiators.)*
- **D1 Exact-state binding** — evidence binds to the exact state it was produced against; stale/mismatched evidence fails closed.
- **D2 Fail-closed handling** — missing/uncertain evidence yields HOLD/UNKNOWN, never a silent pass.
- **D3 Founder-sole acceptance** — only the founder accepts, via the six-item signature protocol.
- **D4 Failure preservation** — honest failures are recorded and never rewritten as success.
- **D5 Builder–Checker separation** — the builder never authors the checker verdict; nothing self-certifies.
- **D6 Advisor read-only posture** — advice never mutates; reverify before relying on historical fact.
- **D7 Active-operation non-interference** — no competing write operation outside Terminal-0 supervision.

## FounderGate Differentiators (PN1–PN6) — Preserved (D-05), each with PROVEN and PLANNED layers
> Two-layer law (R-063): PROVEN and PLANNED are labelled and **never blurred**. Competitive form is always **"no AI-builder product does this,"** never "nobody does this."

- **PN1 — Endurance Evidence.**
  - PROVEN: Run 1 honest NOT-PASSED (host slept, guard refused, ledgered and kept); Run 2 8h PASS (`VB1-SOAK-RUN2-PASS`); 24h PASS (`VB1-SOAK-24H-PASS`: 24.0021h, 97/97 health checks, 1441/1441 quiet-host samples, independently re-derived). **Claim boundary:** proves stability of the *tested probe under recorded conditions* — NOT feature correctness, load, or scale.
  - PLANNED: endurance as a customer feature (plain-English soak setup, ephemeral per-run cloud VMs, honest PASS/NOT-PASSED cards, 8h→24h→48h→30d ladder), post-VB3. Integrated VB2 rerun status stays **UNKNOWN pending seal**.
- **PN2 — The Witness Engine (VB3).**
  - PROVEN today: **nothing** — stated plainly. What exists: the signed spec (EC-1…EC-5, 48h acceptance soak, founder-witness ceremony), inherited invariants **H3** (the founder clicks, never the machine, at acceptance) and **H4** (a screen may never show two truths), and the act edge machine-gated at `VB3_VERIFIER=null` — **provably OFF**, itself honest evidence of discipline.
  - PLANNED: the full engine (gate cards with real approve buttons, witnessed execution, run receipts, endurance field on every gate card). Enterprise approval mechanics sit **beneath** VB3, never as a substitute; H3 and H4 survive as invariants.
- **PN3 — Panic Card / Pause & Get Help.**
  - PROVEN: shipped in accepted V8-A; `PANIC_CARD.md` harness-owned, never hand-edited; Stranger-Test citation (a 16-year-old first-timer found the pause unaided and saw the honest stop message, recorded). **Honest limit:** it pauses a read-only product today; do not imply it halts live systems. (Roadmap Law 50: emergency pause always visible.)
  - PLANNED: at VB3, pause interacts with live actions under VB3's labels.
- **PN4 — Failure-Mode Honesty as a Feature.**
  - PROVEN: shipped in accepted V8-A; dashboard standing reminders ("green CI ≠ product works · merged ≠ usable · a screenshot ≠ disk proof · a demo ≠ production"); the system caught a self-certification attempt, refused two evidence shortcuts, kept an honest failure permanently. The user-facing teaching surface (the product actively lowering the user's confidence to the honest level) is a differentiator distinct from D4 (which covers the ledger).
  - PLANNED: the same voice extends to VB3 gate cards.
- **PN5 — Evidence Ledger as Institutional Memory.**
  - PROVEN: `FOUNDER_GATE_LEDGER.md` + `EVIDENCE_LEDGER.md` in daily governing use carrying every signature/verdict incl. honest failures; five investor exhibits render from them. **Moat framing:** switching costs made of *time* — a competitor cannot backfill a ledger made of calendar.
  - PLANNED: the *customer's* ledger (their approvals/evidence/witnessed runs) as the retention core of the subscription.
- **PN6 — Spending Honesty.**
  - PROVEN: shipped in accepted V8-A; the spend tile is display-only in the screenshots; registered rule **never quote a dollar figure in marketing** (the $50/mo is demo-mode copy). Claim is "display-only spend ceiling, surfaced honestly," nothing more.
  - PLANNED: real metering + budget enforcement arrive with live operation (VB3+).

**Overall PN finding preserved:** the two-layer law is what makes all six diligence-proof; restoring PN1–PN6 with layers is not polish.

## Corrected Harness RECONSTRUCTED/GENERAL learning register (D-07)
> The original Harness cross-reference and advantages list were **not supplied**. Every row is `RECONSTRUCTED/GENERAL (R/G)` and **may not be adopted on this basis alone**. Where a FounderGate source independently supports the item, that source is named and the row becomes actionable.

Support labels: `R/G` (reconstruction/general only) · `FOUNDERGATE-SOURCED` (independently supported).

Selected rows (full set carried in Artifact 3 backlog): H-01 shared foundation (R/G — ALREADY EXISTS, extend) · H-02 policy engine (R/G — ADAPT capability / DEFER engine choice, X-07 open) · H-03 enterprise identity (R/G — INTEGRATE beneath role law) · H-07 security scanner normalisation (R/G — ADAPT normalisation / REJECT own scanner) · H-08 supply-chain (R/G — ADAPT to existing V8-B/V8-D ladder) · H-09 approval mechanics (R/G — ADAPT layer beneath the six-item protocol) · H-15 named customers, H-16 external certification, H-17 partners, H-20 pricing, H-21 investor confidence (**REJECT** — forbidden/absent) · H-22 load at real scale (R/G — DEFER; endurance ≠ load, R-019).
**FOUNDERGATE-SOURCED lesson (adopted):** "external tools are evidence providers and action executors; they never become FounderGate's acceptance authority" — independently supported by Law 10 (workers never decision-makers) and Law 8 (no self-certification), so it stands on FounderGate sources, not the reconstruction.

## Integrate-vs-build matrix with cost governance corrected (D-08)
**Cost correction (mandatory — the claim "cost never gates acceptance" is DELETED).** Accepted position:
- Every run carries a **cost budget**; budget and deadline are **binding terms** of a run authorization and may **not** be silently enlarged.
- **Loop detection parks a lane after three identical failures** (repeated identical failures can park a lane).
- The current stage's guard is displayed policy + configuration with a **paid-service block**; runtime enforcement arrives at the real-harness-operation stage.
- **Paid-service activation is founder-gated.**
- External cost-management tools may **provide evidence** but do **not** replace FounderGate control (integrations, not the control authority).

Integrate-vs-build (candidate, non-authoritative): identity providers → **integrate beneath role law**; scanners → **integrate/normalise**, do not build a scanner (RJ-03); policy engine → **adapt** (engine choice open, X-07); connectors → **adapt** with conformance tests (never claim connector-count parity); approval mechanics → **adapt beneath** the founder gate.

## Target architecture & trust boundaries (target-state illustration only)
Illustrative layering (NOT authorized, NOT sequenced): external evidence/action tools (untrusted inputs) → FounderGate connectors/normalisation → deterministic outer controller + evidence plane → founder gate (six-item protocol) → accepted state. Trust boundary: **no external tool, provider, or worker ever crosses into acceptance authority.**

## Conceptual data contracts (annex) — mapped to existing FounderGate objects
Proposed conceptual contracts map onto **existing** objects, never new parallel schemas: audit events → existing `EVIDENCE_LEDGER.md` / `FOUNDER_GATE_LEDGER.md` event model (normalise, don't duplicate); AI system manifest → existing ACT-009 provider-identity envelope + Law 40 versioned role prompts (X-09 merge-or-reject, open); connector confidence → existing evidence-class + worker-trust-tier model (X-10, open); environment run contract → **two competing candidates exist, neither authoritative** (X-08, open; PK V7 caps containment claims).

## Risks and failure modes
Includes the recorded **governance-contamination / orphan-base** failure mode (a real preserved incident) and the Run-1 host-sleep refusal; plus: vocabulary/maturity/register proliferation creating drift; adopting a Harness lesson on the reconstruction alone; treating an external tool as acceptance authority; blurring endurance with load/correctness/scale; assuming any one of three divergent "current" program snapshots (X-11, TVRL).

## Rejection list (preserved)
Own scanner product (RJ-03); second readiness score (RJ-06 / X-05); becoming an incident product (RJ-05); Trust Center as a claim channel outside the Claim Blocker table; named customers / external certification / partners / pricing / investor confidence as buildable modules (H-15…H-21); any illustrative customer number (RJ-18).

## Maturity correction (D-09/D-10) — M0–M5 NOT adopted
- **M0–M5 is not adopted**; no numerical scoring proposal remains active; §29.6-style scoring is removed.
- Only the **objective entry/exit-criteria discipline** is retained, as **candidate criteria** that may later strengthen the **existing Release Label Ladder** and the existing scored-readiness-report instrument **after founder resolution**.
- **Two maturity schemes must not coexist** (X-04/X-05, founder decision). Every "Proposed target M3" becomes "target-state illustration — not authorized, not sequenced," or blank.

## No implementation authorization
Nothing here authorizes implementation, sequencing, merge, deploy, activation, or founder acceptance.

## Final non-authority statement
**This Target Architecture V2 is an outside-review input. It is a target-state illustration set only, activates nothing, sequences nothing, adopts no maturity scheme, and asserts no current verified state.**
