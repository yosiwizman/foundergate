# FounderGate — Enterprise Assurance Adoption Backlog V2
**Publication status: AMENDMENT CANDIDATE FOR OUTSIDE REVIEW.** Not accepted governance, not current verified state, not implementation authority, not a roadmap authorization, not founder approval, not merge authority. **No dates. No stage-advancement claims. No implementation commands. No final register IDs.**

## Non-authority statement
This backlog proposes candidate adoption items only. It authorizes no implementation and asserts no current verified state. Claim ceiling applies to every line (local/synthetic with limits; not production/SaaS/commercial/customer/paid/security-certified; provider/private-repo/hardware/deploy/bill/merge blocked).

## 1. Conflict-obedient adoption register (D-11)
> **An adoption register may not pre-empt its own conflict register.** Every row whose corresponding conflict/clarification is open reads **BLOCKED — FOUNDER DECISION REQUIRED (<PX-ID>)** or **TERMINAL VERIFICATION REQUIRED LATER (TVRL)**.

| Candidate adoption item | Build vs Integrate | Decision |
| --- | --- | --- |
| Status vocabulary reconciliation | n/a (governance) | BLOCKED — FOUNDER DECISION REQUIRED (PX-CF-001 / open vocabulary clarification) |
| Maturity-scheme choice (ladder vs M-levels) | n/a | BLOCKED — FOUNDER DECISION REQUIRED (PX-CF re: X-04) |
| Numeric readiness scoring | n/a | BLOCKED — FOUNDER DECISION REQUIRED (X-05); two scoring systems must not coexist |
| Policy-engine technology (e.g. OPA/Rego) | Integrate (adapt) | BLOCKED — FOUNDER DECISION REQUIRED (PX-CF re: X-07 / CR-03) |
| Identity-provider (SSO/SAML/OIDC/SCIM) | Integrate beneath role law | BLOCKED — FOUNDER DECISION REQUIRED (X-03/CR-04); IdP authenticates, FounderGate authorises |
| Connector scoping / tiers | Adapt | BLOCKED — FOUNDER DECISION REQUIRED (X-10 / CR-06); one evidence-confidence model |
| Freshness windows | n/a | BLOCKED — FOUNDER DECISION REQUIRED |
| Retention classes & legal-hold obligations | n/a | BLOCKED — FOUNDER DECISION REQUIRED |
| Emergency-access model | n/a | BLOCKED — FOUNDER DECISION REQUIRED (PX-CF-003 / X-03) |
| Multi-tenancy | Build (foundation) | BLOCKED — FOUNDER DECISION REQUIRED |
| Trust Center publication | n/a | BLOCKED — FOUNDER DECISION REQUIRED (X-13 CR-18); structure only, every entry bound to a fallback phrase |
| Acceptance status of the 07-17 execution addendum | n/a | BLOCKED — FOUNDER DECISION REQUIRED (PX-CLR-002 / X-12 / CLR-024) |
| Source-of-truth ordering | n/a | BLOCKED — FOUNDER DECISION REQUIRED (PX-CF-006 / X-13 / CLR-003) |
| Current program state across divergent snapshots | n/a | TERMINAL VERIFICATION REQUIRED LATER (X-11) |
| Environment Run Contract candidate | n/a | BLOCKED — FOUNDER DECISION REQUIRED (X-08); neither of two candidates authoritative; PK V7 caps containment |
| AI System Configuration Manifest duplication | Merge-or-reject | BLOCKED — ADVISOR (X-09); duplicate schemas prohibited by §42-item-7 |
| Register-series reconciliation | n/a | BLOCKED — ADVISOR/Terminal-0 (PX-CF-005 / X-14); renumber into existing series |
| SBOM / provenance / signing | Integrate on existing V8-B/V8-D ladder | TVRL (does the license/IP register exist today?) — never "SLSA compliant" |
| SARIF scanner normalisation | Integrate (normalise), reject own scanner | TVRL — scanner output evidences what was scanned, never what is secure |
| Searchable/exportable audit UI | Adapt on top of Laws 51/54 | TVRL — export is evidence, not certification |
| Anti-drift ratchet + AI authority ceiling | Build (governance code) | Candidate (strongest new proposal); founder-gated; PLANNED |

## 2. Dependency graph (no dates, no stage advancement claims)
```
[Founder resolves open conflicts]  ──►  everything downstream is BLOCKED until resolved
   ├─ status-vocabulary clarification ──► maturity-scheme choice ──► readiness-scorecard direction
   ├─ execution-addendum acceptance (X-12) ──► Domain 5 connector classifications become firm
   ├─ source-of-truth ordering (X-13) ──► register-series reconciliation (Terminal-0)
   └─ policy-engine / IdP / connector scoping decisions ──► integrate-vs-build execution (later, gated)

[Terminal-0 read-only disk audit (TVRL list)] ──► confirms current program state / ledgers / gate-engine / W1 artifacts
```
No node above is sequenced or dated here; sequencing is governed solely by the active build contract (Law 69).

## 3. Adversarial and negative-test families (candidate)
- **Vocabulary drift:** attempt to treat the 20-state annex as normative → must be refused (annex is non-normative).
- **Authority bypass:** attempt an external approval or standing break-glass to constitute acceptance → must fail (only the six-item founder gate accepts).
- **Cost bypass:** attempt to silently enlarge a budget/deadline or auto-activate a paid service → must be refused; 3-identical-failure loop must park a lane.
- **Self-certification:** a worker/provider/model claim used as acceptance → must be rejected.
- **State invention:** a dashboard shows success when a source is unavailable → must show UNKNOWN (Law 54 test in CI).
- **Classification inflation:** upgrade any domain past its cited source → must be caught.
- **Reconstruction adoption:** adopt a Harness lesson on the reconstruction alone → must be blocked.
- **Endurance blur:** present "endured 24h" as load/scale/correctness → must be refused (R-019).
- **Register collision:** assign a final CF/CLR ID in ChatUI → must be refused (provisional PX only; Terminal-0 reconciles).

## 4. Evidence requirements (per adoption item, candidate)
Each item, before any future adoption, requires: the resolving founder decision (for BLOCKED items) or the Terminal-0 disk audit answer (for TVRL items); a source-classified capability statement; a claim-limitation bound to the Claim Blocker fallback phrase; and — for integrate items — conformance/fault-injection evidence that the external tool remains an evidence provider, never acceptance authority.

## 5. Provisional register entries (PX-CF / PX-CLR only)
Provisional conflict entries PX-CF-001..006 and clarification entries PX-CLR-001..003 are defined in the Governance Amendment Candidate V2 and indexed in `PROVISIONAL_REGISTER_INDEX.md`. **No final CF-nnn/CLR-nnn is assigned here.** Terminal-0 reconciles all provisional entries against the authoritative disk registers and assigns collision-free final identifiers through the governed disk process; existing authoritative entries are never renumbered.

## 6. Explicit build-vs-integrate decisions (candidate summary)
- **Integrate (never build):** identity providers, scanners (normalise only), cost-management tools (evidence only), broad connectors (adapt with conformance).
- **Build (governance, founder-gated):** anti-drift ratchet + AI authority ceiling; missing-evidence surface (not a second score); multi-tenancy foundation (blocked pending founder decision).
- **Reject (not modules):** own scanner, second readiness score, incident product, Trust Center content channel, named-customers/certification/partners/pricing/investor-confidence.

## 7. Final non-authority statement
**This Adoption Backlog V2 is an outside-review input. It authorizes no implementation, sequences nothing, assigns no final register IDs, adopts no maturity scheme, and keeps every unresolved conflict BLOCKED pending a founder or Terminal-0 decision. It asserts no current verified state.**
