# **FounderGate Assembly Manual — V1.2**

**Autonomous Gate-to-Gate Correction for Roadmap V8.11**

*Low-Hand Founder Build Book: CTO Runs Autonomous Bundles; Founder Stops Only at True Gates*

*V1.2 correction: B1 and B2 are now phases of parent bundle B12 — after gate G1, the FounderGate CTO runs Schema Foundation and the Truth Dashboard UI back-to-back with no founder stop between them; the next founder appearance is gate G2.*

---

## 1. Purpose

This manual takes FounderGate from roadmap approval through V8-A1 completion with the founder's hands protected. The V1.0 manual was safe but too manual: it made the founder paste a prompt for every substep and stopped after each one. V1.1 fixes that. The FounderGate CTO (Harvest Terminal) now runs **autonomous bundles** from one true founder gate to the next — wide where dependency-safe, never stopping between harmless steps — and the founder appears exactly four times before V8-A1 is done.

This is not a roadmap. This is not product proof. This is not implementation authorization by itself: implementation starts only when gate G1 is recorded.

## 2. Controlling authority

**Roadmap V8.11 controls. This Assembly Manual cannot override Roadmap V8.11. If this manual conflicts with Roadmap V8.11, Roadmap V8.11 wins. Section 16.0 of Roadmap V8.11 remains the only authoritative V8-A1 Build Contract.**

## 3. Founder Bus Prohibition

**Founder Bus Prohibition:**
The founder must not be used as a prompt relay between this manual and any terminal. The FounderGate CTO (Harvest Terminal) must run autonomous batch bundles from one true founder gate to the next. The founder is called only for true founder gates, UI witness, live/sensitive approval, or final accept/reject decisions. Routine step progression, evidence collection, ledger updates, PR preparation, selftests, CI checks, safe repairs, and progress tracking are FounderGate CTO (Harvest Terminal) responsibilities.

## 3A. Seat Map — WHERE to paste (critical)

FounderGate work happens in the **foundergate repo**, whose one writer and merge sheriff is the **Harvest Terminal** (the terminal titled "Extract FounderGate harness components from AKIOR"). **All bundle prompts (P-B0…P-B4) are pasted into the Harvest Terminal — the FounderGate CTO.**

| Terminal on your screen | Repo it owns | Role | Do you paste FounderGate bundles here? |
| ----- | ----- | ----- | ----- |
| Harvest Terminal ("Extract FounderGate harness components…") | foundergate (private) | **FounderGate CTO — sole writer/merge sheriff** | **YES — all P-B prompts** |
| Terminal-0 ("akior-activepieces-engine") | AKIOR | AKIOR CTO — sole writer for AKIOR | **NO — never** |
| Doctrine terminal ("FounderGate doctrine and evidence baseline") | advisor-on-project-harness | Doctrine/evidence source | No |
| Terminal Advisor ("akior-advisor-lane") | none (read-only) | Independent disk verification | No — it writes nothing |

Naming note: where Roadmap V8.11 says "Terminal-0," it uses the name as a role term meaning *the CTO seat of the repo being built*. For the foundergate repo, that seat is the Harvest Terminal. This manual therefore says **FounderGate CTO (Harvest Terminal)** throughout. One writer per repo is law; crossing seats is a scope violation and must be refused by the receiving terminal.

## 4. How to use this manual

The founder does not manually execute every substep. A0–A30 remain ordered internal assembly steps, but the FounderGate CTO (Harvest Terminal) executes them inside approved autonomous bundles. the FounderGate CTO (Harvest Terminal) updates the Where-Am-I table, Evidence Ledger, PR/SHA records, machine profile records, and acceptance packet automatically. The founder reviews summarized evidence only at true founder gates.

Your entire V8-A1 workflow is: **P-B0 → G1 → P-B12 → G2 → P-B3 → G3 → P-B4 → G4.** P-B12 means "V8-A1 Implementation Bundle to UI Witness" — it combines phases B1 (Schema Foundation) and B2 (Truth Dashboard UI) in one paste; the FounderGate CTO runs both back-to-back and stops next at G2. That is the whole manual from your side.

## 5. Founder rules (always in force)

- Do not approve live action.
- Do not approve payment / provider / send activation.
- Do not approve V8-A2, V8-B, V8-C, V8-D, or V8-E work before V8-A1 passes (Roadmap Law 69).
- Do not accept "done" without evidence.
- UNKNOWN means unknown — an honest answer, never a defect to paper over.
- Green CI is not product proof.
- Panic does not stop everything in V8-A1 — the card must say what it did not stop.
- Cost guard is policy/config/display only in V8-A1; runtime enforcement begins V8-B.

## 6. Gate Types

**Machine Gate:**
A validation checkpoint the FounderGate CTO (Harvest Terminal) and Checker can run without founder input. Examples: schema-first gate, CI green, cannot-invent-state tests, Playwright smoke screenshots, exact-SHA verification, lint/typecheck, and fixture validation. Machine gates do not require the founder unless they fail, conflict with scope, touch a true founder gate, or produce missing/ambiguous evidence.

**True Founder Gate:**
A decision only the founder may make. Examples: start V8-A1 implementation, UI witness, Stranger Test / Low-Hand checks, live-action approval, payment/provider/send activation, production data use, external account connection, legal/IP/security escalation, final V8-A1 approve/reject, and approval to move to V8-A2.

**The FounderGate CTO must not stop at machine gates if the approved bundle allows continuation and proof passes. it must stop at true founder gates.**

## 7. Autonomous Bundle Map

**Bundle B0 — Roadmap + Manual Landing** · Includes: A0, A1, A2 · Purpose: land Roadmap V8.11, this manual, the architecture note, and the V8-A1 lane packet as docs-only · Founder interaction: initial approval only, if not already given · Stop after: V8-A1 lane packet ready · Next true founder gate: **G1**.

**Gate G1 — Founder approves V8-A1 implementation start** · Founder sentence: "I approve starting V8-A1 implementation per the approved V8-A1 lane packet." · No V8-A1 implementation code starts before this sentence is recorded. G1 authorizes parent bundle B12 (phases B1 + B2) end-to-end; the founder is next needed at G2.

**Bundle B12 — V8-A1 Implementation to UI Witness (parent bundle — the founder-paste unit)** · Includes: phase B1 Schema Foundation (A4–A10) + phase B2 Truth Dashboard V8-A1 UI (A11–A24) · Runs after: G1 founder approval · Stops at: G2 Founder UI Witness + Low-Hand Checks · **Rule: B1 is a machine-gated phase inside B12. If B1 passes, the FounderGate CTO continues directly into B2. No founder stop occurs between B1 and B2 unless there is a true founder gate, safety/privacy/live/payment/provider/legal/external-account boundary, Roadmap V8.11 conflict, missing evidence, or unrepaired validation failure.**

**Phase B1 — Schema Foundation (internal phase of B12)** · Includes: A4, A5, A6, A7, A8, A9, A10 · Runs autonomously after G1 as the first phase of B12 · Contents: schema set, fixture project, schema validator, schema-first machine gate, attached-project registry, repo-local project/status reader, cannot-invent-state guard.

**Phase B2 — Truth Dashboard V8-A1 UI (internal phase of B12)** · Includes: A11–A24 · Runs automatically, with no founder stop, immediately after phase B1 passes its machine gates with complete evidence · Contents: Truth Dashboard shell, Projects screen, Project Dashboard, status card, view-only gate/blocker display, CI UNKNOWN / PR UNKNOWN behavior, "what founder should do now" card, "what must not be touched" card, permanent Failure-Modes Reminder, basic Doctor panel, honest-scope Panic Card, data classification badges, cost guard display (policy/config only), Playwright smoke screenshots.

**Gate G2 — Founder UI Witness + Low-Hand Checks** · Includes: A25, A26 · Founder performs: visual review, Stranger Test (or delegates to a non-developer tester), Hand-Burden checks, confirms zero terminal copy/paste for status review.

**Bundle B3 — Final CI + Acceptance Packet** · Includes: A27, A28 · Runs autonomously after G2 is complete · Contents: exact-SHA CI, final V8-A1 acceptance packet.

**Gate G3 — Founder Approves or Rejects V8-A1 Complete** · Includes: A29 · No later stage starts automatically.

**Bundle B4 — V8-A2 Proposal Only** · Includes: A30 · Runs only after G3 APPROVED · Creates proposal only · No V8-A2 code.

**Gate G4 — Founder separately approves or rejects V8-A2 start.**

## 8. Autonomous Continuation Rule

**Autonomous Continuation Rule:** Continue through all listed substeps in this bundle without asking the founder between harmless steps. Do not stop after each substep. Update the evidence ledger, progress ledger, PR/SHA records, machine profile record, and bundle packet yourself. Stop only at a true founder gate, a safety/privacy/live/payment/provider/legal/external-account boundary, a Roadmap V8.11 conflict, a failed validation that cannot be repaired within scope, missing evidence, or unclear scope.

## 9. Harmless Repair Loop

**Harmless Repair Loop:** If a test, lint, schema, CI, Playwright smoke, formatting, docs consistency, fixture, or typecheck failure occurs inside an approved bundle, the FounderGate CTO may repair it autonomously up to three times if the repair remains inside the bundle's allowed scope. After the third same failure, park the lane, mark FAILED, and call the founder only if a founder decision is needed.

## 10. Founder Hand-Transport Budget

**Founder Hand-Transport Budget for V8-A1:**
Founder prompts/interactions before V8-A1 acceptance:
1. P-B0 / docs landing if needed.
2. G1 founder approval to start V8-A1 implementation.
3. P-B12 runs B1+B2 to G2.
4. G2 UI witness / Stranger Test / Low-Hand checks.
5. P-B3 final CI + acceptance packet.
6. G3 approve/reject V8-A1 complete.
7. P-B4 V8-A2 proposal only, after G3 approved.
8. G4 approve/reject V8-A2 start.

**There is no founder prompt between B1 and B2.** Routine copy/paste between substeps is forbidden. If the manual requires the founder to paste more than the bundle prompts and true gate sentences, the manual failed.

## 11. Machine Capacity Preflight

**Machine Capacity Preflight:** Before each autonomous bundle, the FounderGate CTO (Harvest Terminal) must inspect the current machine and choose safe lane limits. The founder does not manually choose lane count. It records: operating system, CPU cores, RAM, available disk, Docker availability, Playwright availability, Node/Git/GitHub CLI status, local writer slots available, cloud writer slots available, recommended parallel lanes, heavy build lane limit, Playwright lane limit, safe mode true/false, and the reason for the chosen lane count. Output file: docs/assembly-evidence/<bundle-id>/machine-capacity-profile.json. If the machine is weak, it must reduce lane count. If the machine is strong, it may run wider only if dependency-safe and file-lock-safe. More writers never override dependency safety, file locks, secrets policy, founder gates, or Roadmap V8.11.

## 12. Resource-Aware Lane Rules

- Docs-only lanes may run parallel.
- Schema lanes must avoid same-file conflicts.
- Validator/test lanes may run after schemas exist.
- UI card lanes may run parallel only after shell, reader, and unknown-state guard exist.
- Playwright lanes are limited because browsers/ports can conflict.
- Docker lanes are forbidden in V8-A1 unless explicitly allowed by Roadmap V8.11 and a founder gate.
- Local writer lanes are limited by RAM.
- Cloud writer lanes are limited by merge-conflict risk, not local RAM.
- No two writers may edit the same file set at the same time.
- the FounderGate CTO (Harvest Terminal) remains merge sheriff of the foundergate repo (Terminal-0 remains AKIOR's, separately).
- Checker/reviewer must inspect bundle evidence before calling the founder.

## 13. Parallel Lane DAG

**B1 dependency map:** A4 schema set first → A5 fixture depends on A4 → A6 validator depends on A4/A5 → A7 schema-first machine gate depends on A6 → A8 attached-project registry may begin after the fixture path exists → A9 project/status reader depends on A4/A5 → A10 cannot-invent-state guard depends on A9 and the CI/test harness.

**B2 dependency map:** A11 shell first → A12 Projects screen depends on A8/A11 → A13 Project Dashboard depends on A9/A11/A12 → A14 status card depends on A9/A13 → A15 view-only gate/blocker display depends on gate folder definitions and A13 → A16 CI UNKNOWN / PR UNKNOWN depends on A10/A13 → A17 NeedsYouCard depends on A9/A13 → A18 SafetyLabels depends on locks/data classification and A13 → A19 Failure-Modes Reminder depends on A11 → A20 DoctorPanel depends on validator/reader health → A21 Panic Card depends on shell and the incident path → A22 DataClassBadge depends on data_classification.json → A23 CostQuotaDisplay depends on cost_budget.json → A24 Playwright smoke depends on A11–A23 screens.

**Parallel work is allowed only where dependencies and file locks permit. The bundle may run wide, but it must not create merge chaos or fake evidence.**

## 14. Founder Where-Am-I table (FounderGate-CTO-maintained)

**The FounderGate CTO (Harvest Terminal) updates this table after every substep. The founder reads it only at gates. The founder does not manually maintain this table.**

| Bundle ID | Substeps included | Current substep | Status | Latest PR | Latest SHA | Evidence packet | Machine profile path | Next true founder gate | Founder action needed? | Safe to proceed? |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| B0 | A0, A1, A2 | — | Not started | — | — | docs/assembly-evidence/B0/ | docs/assembly-evidence/B0/machine-capacity-profile.json | G1 | No | Unknown |
| **B12 — V8-A1 Implementation to UI Witness** | B1 (A4–A10) + B2 (A11–A24) | — | Awaiting G1 | — | — | docs/assembly-evidence/B12/ | docs/assembly-evidence/B12/machine-capacity-profile.json | **G2** | No | Unknown |
| ↳ B1 (child phase of B12 — not a founder-paste stop) | A4–A10 | — | Awaiting G1 | — | — | docs/assembly-evidence/B1/ | docs/assembly-evidence/B1/machine-capacity-profile.json | none — continues into B2 | No | Unknown |
| ↳ B2 (child phase of B12 — not a founder-paste stop) | A11–A24 | — | Runs after B1 machine gates | — | — | docs/assembly-evidence/B2/ | docs/assembly-evidence/B2/machine-capacity-profile.json | G2 | No | Unknown |
| B3 | A27, A28 | — | Awaiting G2 | — | — | docs/assembly-evidence/B3/ | docs/assembly-evidence/B3/machine-capacity-profile.json | G3 | No | Unknown |
| B4 | A30 | — | Awaiting G3 | — | — | docs/assembly-evidence/B4/ | docs/assembly-evidence/B4/machine-capacity-profile.json | G4 | No | Unknown |

## 15. Internal substep reference (A0–A30)

These are the FounderGate CTO's (Harvest Terminal's) internal assembly steps — the founder never pastes per-step prompts. Full per-step scope, proof, and stop conditions live in the bundle prompts (Appendix 17) and the V8-A1 lane packet; roadmap Section 16.0 controls all of it.

| Step | What it is | Bundle/Gate | Key honesty rule |
| ----- | ----- | ----- | ----- |
| A0 | Roadmap approval + commit prep | B0 | docs plan only |
| A1 | Commit V8.11 to docs/ROADMAP.md | B0 | byte-identical, PR+SHA |
| A2 | V8-A1 lane packet | B0 | quotes §16.0 only |
| A3 | Founder gate entry = G1 | G1 | founder sentence recorded |
| A4 | .foundergate schema set (12-item subset) | B1 | schemas only, no extras |
| A5 | Fixture project, MOCK_ONLY | B1 | no real data ever |
| A6 | Schema validator + selftest | B1 | proves pass AND fail |
| A7 | Schema-first machine gate (Law 53) | B1 | CI-wired, exact SHA |
| A8 | Attached-project registry (one repo, read-only) | B1 | rejects second repo |
| A9 | Project/status reader | B1 | missing file → UNKNOWN |
| A10 | Cannot-invent-state guard (Law 54) | B1 | 4 UNKNOWN rules in CI |
| A11 | Truth Dashboard shell | B2 | UNKNOWN placeholders only |
| A12 | Projects screen (A1 subset) | B2 | UNKNOWN for later fields |
| A13 | Project Dashboard (A1 subset) | B2 | no fake panels |
| A14 | Status / current-state card | B2 | file-traceable text |
| A15 | Gate/blocker display, view-only (Law 55) | B2 | no wired approvals |
| A16 | CI UNKNOWN / PR UNKNOWN (Law 68) | B2 | never green from stale |
| A17 | "What founder should do now" card | B2 | file-sourced only |
| A18 | "What must not be touched" card | B2 | <30s findable (Law 64) |
| A19 | Failure-Modes Reminder, permanent | B2 | all ten lines |
| A20 | Basic Doctor panel | B2 | version/health only |
| A21 | Honest-scope Panic Card | B2 | says what it did NOT stop |
| A22 | Data classification badges | B2 | secret hidden, unknown blocked |
| A23 | Cost guard display | B2 | policy/config only, labeled |
| A24 | Playwright smoke screenshots | B2 | every A1 screen |
| A25 | Stranger Test | G2 | founder-run, unaided |
| A26 | Hand-Burden checks | G2 | measured, copy-paste = 0 |
| A27 | Exact-SHA CI | B3 | one recorded SHA |
| A28 | Acceptance packet | B3 | every link present |
| A29 | Founder approve/reject V8-A1 | G3 | founder decision |
| A30 | V8-A2 proposal only | B4 | no code, awaits G4 |

## 16. Evidence Ledger (FounderGate-CTO-maintained)

**The FounderGate CTO (Harvest Terminal) maintains this ledger automatically. The founder reviews it only at gates. No DONE row may exist without an evidence path and exact SHA. Anything not checked in the current run is UNKNOWN.**

| Date | Bundle | Substep | Evidence file/path | PR # | Exact SHA | Verified by | Label (DONE / UNKNOWN / STALE / FAILED) |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |

## 17. Founder Gate Ledger (founder-maintained — true gates only)

Only true founder gates go here. Machine gates do not require founder ledger entries unless they fail and need a founder decision.

| Date | Gate | Decision | Exact sentence / result recorded | Packet SHA |
| ----- | ----- | ----- | ----- | ----- |
| | G1 — start V8-A1 implementation | | "I approve starting V8-A1 implementation per the approved V8-A1 lane packet." | |
| | G2 — UI witness / Stranger Test / Hand-Burden completion | | | |
| | G3 — V8-A1 approve/reject | | | |
| | G4 — V8-A2 start approve/reject | | | |
| | Any live/payment/provider/send/production/legal/IP/security/external-account gate | | | |

## 18. Do Not Accept These Claims

- "done" without evidence
- "green" without exact SHA
- "preview works" without screenshot / Playwright proof
- "safe" without data classification
- "cost guard works" if it only exists as text and is claimed as runtime enforcement
- "Panic stops everything" during V8-A1
- "Project Guide can route work" before V8-B
- "Gate approval works" before V8-B
- "pilot ready"
- "commercial ready"
- "platform ready"
- "production ready"

## 19. V8-A1 Definition of Done (from Roadmap V8.11 Section 16.0 / 20.A)

- [ ] Attach one repo (fixture) works
- [ ] Valid .foundergate schemas read correctly
- [ ] Project / status / gate / blocker displayed from real files
- [ ] CI UNKNOWN / PR UNKNOWN displayed when unavailable
- [ ] "What founder should do now" card present and file-sourced
- [ ] "What must not be touched" card present, findable in under 30 seconds
- [ ] Failure-modes reminder permanently visible (all ten lines)
- [ ] Gate cards view-only
- [ ] Basic Doctor panel (version/health only)
- [ ] Panic Card with honest scope (says what it did not stop)
- [ ] Basic data classification badges, secret hiding, unknown-file blocking
- [ ] Cost guard displayed as policy/config only, labeled "runtime enforcement begins V8-B"
- [ ] Minimal Playwright smoke screenshots for every V8-A1 screen
- [ ] No terminal copy/paste needed for status review (measured, count = 0)
- [ ] Stranger Test passed (7 questions, unaided, recorded)
- [ ] Founder Hand-Burden metrics recorded (Law 64 set)
- [ ] Exact-SHA CI green on the final commit (SHA recorded)
- [ ] Acceptance packet complete with every evidence link

## 20. Stop After V8-A1

After V8-A1 passes (G3 = APPROVED), the founder must explicitly approve moving to V8-A2 at gate G4. No automatic continuation. B4 produces a proposal only. Roadmap Law 69 governs: V8-A1 is the only active build contract until the G4 entry exists.

## 21. Troubleshooting

| Symptom | Meaning | What happens |
| ----- | ----- | ----- |
| A machine gate fails inside a bundle | Normal | Harmless Repair Loop: up to 3 in-scope repairs; 3rd same failure = lane parked FAILED; founder called only if a decision is needed |
| Evidence missing from a bundle packet | Bundle not done | The FounderGate CTO must complete it; the gate does not open |
| A screen shows data with no file behind it | Law 54 violation | Checker rejects before the founder ever sees it |
| Anyone proposes V8-A2 work early | Law 69 violation | Refuse; point at G4 |
| A claim from Section 18 appears | Overclaim | Reject on sight |
| Founder tired / hands hurt at a gate | Human limit | Stop. The system waits indefinitely; the Where-Am-I table holds the place |

## 22. Appendix 17 — Low-Hand Bundle Prompts

**These prompts are operational artifacts — part of this manual, never part of docs/ROADMAP.md.** The founder pastes bundle prompts (P-B0, P-B12, P-B3, P-B4) and reads gate scripts (P-G*). P-B1/P-B2 below are internal phase references only — never founder-paste prompts. A4–A24 remain internal substeps inside bundles — never founder-paste prompts.

**Prompt P-B0 — Roadmap + Manual Landing Bundle**

```
HARVEST TERMINAL (FounderGate CTO): FounderGate autonomous bundle B0 — Roadmap + Manual Landing.
Authority: docs/ROADMAP.md (V8.11), Section 16.0 build contract; Assembly Manual V1.2 bundle B0.
Included internal substeps (execute ALL, in DAG order): A0, A1, A2.
Purpose: Land Roadmap V8.11, Assembly Manual V1.1, and the V8-A1 lane packet as docs-only.
Allowed scope: Docs-only: docs/ROADMAP.md (V8.11 verbatim), docs/ASSEMBLY_MANUAL.md, docs/architecture/MACHINE_CAPACITY_AND_LANE_SCHEDULER.md, docs/lanes/V8-A1-lane-packet.md, ledgers scaffolding, evidence folders.
Forbidden scope: Any code, any schema, any src/ change, any implementation.
Machine Capacity Preflight: run first; write docs/assembly-evidence/B0/machine-capacity-profile.json; choose lane count yourself; reduce lanes on a weak machine.
Autonomous Continuation Rule: continue through all substeps without asking the founder between harmless steps; do not stop after each substep; update the Where-Am-I table, Evidence Ledger, PR/SHA records, and bundle packet yourself.
Harmless Repair Loop: up to three in-scope autonomous repairs per failure class; third same failure = park lane, mark FAILED, call founder only if a founder decision is needed.
Dependency / lane safety: parallel work is allowed only where the Parallel Lane DAG and file locks permit; docs-only lanes parallel; no two writers on the same file set; Playwright lanes limited; Docker forbidden in V8-A1; the FounderGate CTO (Harvest Terminal) remains merge sheriff of the foundergate repo (Terminal-0 remains AKIOR's, separately); the Checker inspects bundle evidence before any founder call.
Evidence packet required: Complete B0 evidence packet: PR links, merge SHAs, byte-identical roadmap check, lane packet quoting Section 16.0.
Stop conditions: V8-A1 lane packet ready and docs landed. Then stop. Also stop immediately on: true founder gate, live/payment/provider/send/production/external-account boundary, Roadmap V8.11 conflict, unrepairable failure, missing evidence, unclear scope.
Next true founder gate: G1.
```

**Prompt P-G1 — Founder Gate: Founder approves V8-A1 implementation start**

*(This is a founder script, not a CTO prompt. The FounderGate CTO (Harvest Terminal) waits.)*

```
Founder gate G1 — Founder approves V8-A1 implementation start.
What the FounderGate CTO gives you first: the bundle packet summary, one page, plain English, with evidence links.
What you do: Record in the Founder Gate Ledger: "I approve starting V8-A1 implementation per the approved V8-A1 lane packet." No V8-A1 implementation code starts before this sentence is recorded.
Review focus: Read the B0 packet summary (one page). Confirm the lane packet quotes Section 16.0 and nothing beyond it.
Record the decision in the Founder Gate Ledger with date and packet SHA. Nothing proceeds until recorded.
```

**Prompt P-B12 — V8-A1 Implementation to UI Witness (founder-paste)**

```
HARVEST TERMINAL (FounderGate CTO): FounderGate autonomous parent bundle B12 — V8-A1 Implementation to UI Witness.
Authority: docs/ROADMAP.md (V8.11), Section 16.0 build contract; Assembly Manual V1.2 bundle B12. Gate G1 is recorded.
Included phases and internal substeps (execute ALL, in DAG order):
  Phase B1 — Schema Foundation: A4, A5, A6, A7, A8, A9, A10.
  Phase B2 — Truth Dashboard V8-A1 UI: A11, A12, A13, A14, A15, A16, A17, A18, A19, A20, A21, A22, A23, A24.
Allowed scope: Section 5 V8-A1 minimum .foundergate subset; fixture with MOCK_ONLY data; validator + selftests (pass AND fail directions); CI wiring; Section 18 V8-A1 allowed frontend and backend subsets wired to real readers; UNKNOWN wherever data is absent; view-only gate cards; honest-scope Panic Card; cost guard as policy/config display only; Playwright smoke per screen.
Forbidden scope: any extra schema beyond the 12-item subset; any real project data; any write into an attached repo; Preview Bay, Bug Collector, File Cabinet, Notes, Activity, Run Launcher, Bench, Project Guide; wired gate approvals; runtime cost enforcement; panic overclaim; anything on the Section 5/6 deny-list.
Machine Capacity Preflight: run before EACH phase; write docs/assembly-evidence/B12/machine-capacity-profile.json (plus per-phase B1/B2 profiles); choose lane count yourself; reduce lanes on a weak machine.
Resource-Aware Lane Rules and Parallel Lane DAG (Manual Sections 12–13) govern all parallelism: B1 order A4→A5→A6→A7 with A8/A9/A10 per DAG; B2 order A11 first, then DAG-parallel A12–A23, A24 last; no two writers on one file set; Playwright lanes limited; Docker forbidden.
Autonomous Continuation Rule: continue through all substeps of BOTH phases without asking the founder between harmless steps; do not stop after each substep; update the Where-Am-I table, Evidence Ledger, PR/SHA records, and bundle packet yourself.
PHASE TRANSITION RULE: If B1 passes all machine gates (including the A7 schema-first machine gate) and evidence is complete, continue directly into B2 under parent bundle B12. Do not call the founder between B1 and B2.
Harmless Repair Loop: up to three in-scope autonomous repairs per failure class; third same failure = park the lane, mark FAILED, call the founder only if a founder decision is needed.
Evidence packets required: complete B1 packet (per-substep folders A4–A10, selftest outputs both directions, schema-first machine-gate report with CI link at exact SHA) AND complete B2 packet (per-substep folders A11–A24, Playwright smoke screenshots for every screen, cannot-invent-state CI runs, honest-scope Panic press evidence).
Stop conditions: stop at G2 only after ALL B1 and B2 evidence is complete. Also stop immediately on: true founder gate, live/payment/provider/send/production/external-account boundary, Roadmap V8.11 conflict, unrepairable failure, missing evidence, unclear scope.
Next true founder gate: G2 — Founder UI Witness + Low-Hand Checks.
```

**Internal phase reference B1 — Schema Foundation**

*Internal phase reference only — not a founder-paste prompt. Executed inside P-B12.*

```
PHASE B1 (inside parent bundle B12) — Schema Foundation.
Authority: docs/ROADMAP.md (V8.11), Section 16.0 build contract; Assembly Manual V1.2 bundle B1.
Included internal substeps (execute ALL, in DAG order): A4, A5, A6, A7, A8, A9, A10.
Purpose: Build the schema layer: schema set, fixture project, schema validator, schema-first machine gate, attached-project registry (one repo, read-only), repo-local project/status reader, cannot-invent-state guard.
Allowed scope: The Section 5 V8-A1 minimum .foundergate subset, fixture with MOCK_ONLY data, validator + selftests (pass AND fail directions), CI wiring, the Section 18 backend subset items listed for these steps only.
Forbidden scope: Any UI. Any extra schema beyond the 12-item subset. Any real project data. Any write into an attached repo. Anything from the Section 5/6 deny-list.
Machine Capacity Preflight: run first; write docs/assembly-evidence/B1/machine-capacity-profile.json; choose lane count yourself; reduce lanes on a weak machine.
Autonomous Continuation Rule: continue through all substeps without asking the founder between harmless steps; do not stop after each substep; update the Where-Am-I table, Evidence Ledger, PR/SHA records, and bundle packet yourself.
Harmless Repair Loop: up to three in-scope autonomous repairs per failure class; third same failure = park lane, mark FAILED, call founder only if a founder decision is needed.
Dependency / lane safety: parallel work is allowed only where the Parallel Lane DAG and file locks permit; docs-only lanes parallel; no two writers on the same file set; Playwright lanes limited; Docker forbidden in V8-A1; the FounderGate CTO (Harvest Terminal) remains merge sheriff of the foundergate repo (Terminal-0 remains AKIOR's, separately); the Checker inspects bundle evidence before any founder call.
Evidence packet required: B1 evidence packet: per-substep evidence folders A4-A10, selftest outputs (both directions), schema-first machine-gate report with CI link at exact SHA, machine-capacity-profile.json.
Continuation: If B1 passes all machine gates and evidence is complete, continue directly into B2 under parent bundle B12. Do not call the founder between B1 and B2. Also stop immediately on: true founder gate, live/payment/provider/send/production/external-account boundary, Roadmap V8.11 conflict, unrepairable failure, missing evidence, unclear scope.
Next: phase B2, automatically.
```

**Internal phase reference B2 — Truth Dashboard V8-A1 UI**

*Internal phase reference only — not a founder-paste prompt. Executed inside P-B12.*

```
PHASE B2 (inside parent bundle B12) — Truth Dashboard V8-A1 UI.
Authority: docs/ROADMAP.md (V8.11), Section 16.0 build contract; Assembly Manual V1.2 bundle B2.
Included internal substeps (execute ALL, in DAG order): A11, A12, A13, A14, A15, A16, A17, A18, A19, A20, A21, A22, A23, A24.
Purpose: Build every V8-A1 screen: shell, Projects screen, Project Dashboard, status card, view-only gate/blocker display, CI UNKNOWN / PR UNKNOWN behavior, needs-you card, do-not-touch card, permanent Failure-Modes Reminder, basic Doctor panel, honest-scope Panic Card, data classification badges, cost guard display (policy/config only), Playwright smoke screenshots.
Allowed scope: The Section 18 V8-A1 allowed frontend subset only, wired to real readers; UNKNOWN everywhere data is absent; Playwright smoke per screen.
Forbidden scope: Preview Bay, Bug Collector, File Cabinet, Notes, Activity, Run Launcher, Bench, Project Guide, wired gate approvals, any deny-list module, any runtime cost enforcement, any panic overclaim.
Machine Capacity Preflight: run first; write docs/assembly-evidence/B2/machine-capacity-profile.json; choose lane count yourself; reduce lanes on a weak machine.
Autonomous Continuation Rule: continue through all substeps without asking the founder between harmless steps; do not stop after each substep; update the Where-Am-I table, Evidence Ledger, PR/SHA records, and bundle packet yourself.
Harmless Repair Loop: up to three in-scope autonomous repairs per failure class; third same failure = park lane, mark FAILED, call founder only if a founder decision is needed.
Dependency / lane safety: parallel work is allowed only where the Parallel Lane DAG and file locks permit; docs-only lanes parallel; no two writers on the same file set; Playwright lanes limited; Docker forbidden in V8-A1; the FounderGate CTO (Harvest Terminal) remains merge sheriff of the foundergate repo (Terminal-0 remains AKIOR's, separately); the Checker inspects bundle evidence before any founder call.
Evidence packet required: B2 evidence packet: per-substep folders A11-A24, Playwright smoke screenshots for every screen, cannot-invent-state CI runs, honest-scope Panic press evidence, machine-capacity-profile.json.
Stop conditions: All A11-A24 evidence present; every screen has a robot screenshot; zero fabricated state. Then stop at gate G2 — the next true founder gate. Also stop immediately on: true founder gate, live/payment/provider/send/production/external-account boundary, Roadmap V8.11 conflict, unrepairable failure, missing evidence, unclear scope.
Next true founder gate: G2.
```

**Prompt P-G2 — Founder Gate: Founder UI Witness + Low-Hand Checks (A25 + A26)**

*(This is a founder script, not a CTO prompt. The FounderGate CTO (Harvest Terminal) waits.)*

```
Founder gate G2 — Founder UI Witness + Low-Hand Checks (A25 + A26).
What the FounderGate CTO gives you first: the bundle packet summary, one page, plain English, with evidence links.
What you do: Perform the visual review of every V8-A1 screen; run (or delegate to a non-developer tester) the Stranger Test — the 7 questions answered unaided: safe? dangerous? done? blocked? needs me? next action? do-not-touch?; run the Hand-Burden checks with the FounderGate CTO measuring: terminal_copy_paste_count for status review must equal 0, clicks_to_stop_panic, clicks_to_see_current_status, do-not-touch found in under 30 seconds. Record all results in the Founder Gate Ledger.
Review focus: Review the B2 packet: look at every Playwright screenshot yourself; press the Panic Card in the fixture and confirm it says what it did NOT stop.
Record the decision in the Founder Gate Ledger with date and packet SHA. Nothing proceeds until recorded.
```

**Prompt P-B3 — Final CI + Acceptance Packet Bundle**

```
HARVEST TERMINAL (FounderGate CTO): FounderGate autonomous bundle B3 — Final CI + Acceptance Packet.
Authority: docs/ROADMAP.md (V8.11), Section 16.0 build contract; Assembly Manual V1.2 bundle B3.
Included internal substeps (execute ALL, in DAG order): A27, A28.
Purpose: Run exact-SHA CI on the final commit and assemble the complete V8-A1 acceptance packet.
Allowed scope: CI run + one packet document linking every A4-A27 evidence path, G2 records included, Definition-of-Done checklist prefilled from evidence.
Forbidden scope: Any new code beyond CI fixes inside the Harmless Repair Loop; any new claims without evidence.
Machine Capacity Preflight: run first; write docs/assembly-evidence/B3/machine-capacity-profile.json; choose lane count yourself; reduce lanes on a weak machine.
Autonomous Continuation Rule: continue through all substeps without asking the founder between harmless steps; do not stop after each substep; update the Where-Am-I table, Evidence Ledger, PR/SHA records, and bundle packet yourself.
Harmless Repair Loop: up to three in-scope autonomous repairs per failure class; third same failure = park lane, mark FAILED, call founder only if a founder decision is needed.
Dependency / lane safety: parallel work is allowed only where the Parallel Lane DAG and file locks permit; docs-only lanes parallel; no two writers on the same file set; Playwright lanes limited; Docker forbidden in V8-A1; the FounderGate CTO (Harvest Terminal) remains merge sheriff of the foundergate repo (Terminal-0 remains AKIOR's, separately); the Checker inspects bundle evidence before any founder call.
Evidence packet required: B3 evidence packet: CI link + exact SHA + docs/assembly-evidence/A28/V8-A1-acceptance-packet.md with zero missing links.
Stop conditions: Acceptance packet complete; exact SHA recorded. Then stop. Also stop immediately on: true founder gate, live/payment/provider/send/production/external-account boundary, Roadmap V8.11 conflict, unrepairable failure, missing evidence, unclear scope.
Next true founder gate: G3.
```

**Prompt P-G3 — Founder Gate: Founder approves or rejects V8-A1 complete (A29)**

*(This is a founder script, not a CTO prompt. The FounderGate CTO (Harvest Terminal) waits.)*

```
Founder gate G3 — Founder approves or rejects V8-A1 complete (A29).
What the FounderGate CTO gives you first: the bundle packet summary, one page, plain English, with evidence links.
What you do: Read the acceptance packet against the Definition of Done. Tick every box yourself, from evidence. Record APPROVED or REJECTED with the packet SHA in the Founder Gate Ledger. No later stage starts automatically.
Review focus: Any unchecked box = REJECT with the open list; the FounderGate CTO repairs inside scope; you re-review.
Record the decision in the Founder Gate Ledger with date and packet SHA. Nothing proceeds until recorded.
```

**Prompt P-B4 — V8-A2 Proposal Only Bundle**

```
HARVEST TERMINAL (FounderGate CTO): FounderGate autonomous bundle B4 — V8-A2 Proposal Only.
Authority: docs/ROADMAP.md (V8.11), Section 16.0 build contract; Assembly Manual V1.2 bundle B4.
Included internal substeps (execute ALL, in DAG order): A30.
Purpose: Write the V8-A2 proposal document (Preview Bay + Bug Collector scope per Roadmap Section 16). Proposal only.
Allowed scope: One proposal markdown under docs/lanes/.
Forbidden scope: Any V8-A2 code. Any 'while we're here' work. Anything beyond one document.
Machine Capacity Preflight: run first; write docs/assembly-evidence/B4/machine-capacity-profile.json; choose lane count yourself; reduce lanes on a weak machine.
Autonomous Continuation Rule: continue through all substeps without asking the founder between harmless steps; do not stop after each substep; update the Where-Am-I table, Evidence Ledger, PR/SHA records, and bundle packet yourself.
Harmless Repair Loop: up to three in-scope autonomous repairs per failure class; third same failure = park lane, mark FAILED, call founder only if a founder decision is needed.
Dependency / lane safety: parallel work is allowed only where the Parallel Lane DAG and file locks permit; docs-only lanes parallel; no two writers on the same file set; Playwright lanes limited; Docker forbidden in V8-A1; the FounderGate CTO (Harvest Terminal) remains merge sheriff of the foundergate repo (Terminal-0 remains AKIOR's, separately); the Checker inspects bundle evidence before any founder call.
Evidence packet required: Proposal file + PR + SHA at docs/assembly-evidence/A30/.
Stop conditions: Proposal matches Roadmap V8-A2 scope exactly. Then stop. Also stop immediately on: true founder gate, live/payment/provider/send/production/external-account boundary, Roadmap V8.11 conflict, unrepairable failure, missing evidence, unclear scope.
Next true founder gate: G4.
```

**Prompt P-G4 — Founder Gate: Founder separately approves or rejects V8-A2 start**

*(This is a founder script, not a CTO prompt. The FounderGate CTO (Harvest Terminal) waits.)*

```
Founder gate G4 — Founder separately approves or rejects V8-A2 start.
What the FounderGate CTO gives you first: the bundle packet summary, one page, plain English, with evidence links.
What you do: Read the V8-A2 proposal. Approve or reject in the Founder Gate Ledger — on a different day than receiving it, if you wish. Roadmap Law 69 governs until this entry exists.
Review focus: Approving G3 and G4 in the same sitting is allowed but never required; the system waits indefinitely.
Record the decision in the Founder Gate Ledger with date and packet SHA. Nothing proceeds until recorded.
```


---

**Assembly Manual V1.2 is a companion to Roadmap V8.11. If this manual conflicts with Roadmap V8.11, Roadmap V8.11 wins. The FounderGate CTO (Harvest Terminal — the seat Roadmap V8.11 calls "Terminal-0" for this repo) runs autonomous bundles gate-to-gate; B1 continues into B2 without founder relay when machine gates pass.**

---

## 23. THE VISUAL SELF-REVIEW LAW (permanent; founder-mandated 2026-07-10)

**Why this exists:** three of four consecutive founder interventions during the V8-A stranger-test cycle were
*visual* defects the machine already had the tools to catch (a stale-tab/port-identity mix-up; a tall-viewport
dead-space void) — with Playwright and screenshots already in hand. Confirming that checklist elements *exist* is
not the same as *looking* at the screen.

**The law.** Before ANY founder witness gate, stranger session, or gallery handoff, the CTO must:

1. **Capture** full-page AND above-the-fold screenshots of **every** founder-facing screen at **both** standard
   (**1366×768**) and tall (**1440×900**) viewports.
2. **Actually LOOK** at each image and reason about it as a first-time human would — voids, overlaps, truncation,
   misalignment, unreadable contrast, anything that would make a stranger say "this looks broken" — **not merely
   confirm that checklist elements exist.**
3. **Fix** in-scope defects found, **or park and disclose** them.
4. **Record** the review as evidence — the screenshots **plus a one-line verdict per screen** — in the relevant
   bundle's evidence folder (canonical: `docs/assembly-evidence/visual-review/`, file `VISUAL_REVIEW.md`).

**A witness card presented without this recorded review is INVALID and must be rejected by the founder.**

**Honest scope note (part of the law):** this review *reduces, not eliminates,* human catches. Automated geometry
guards + this human-style look are a filter, not a guarantee; the **founder witness gate remains the final filter**.

**Mechanical enforcement:** where mechanical, the suite fails if the visual-review verdict is absent or stale for
founder-facing UI — `src/tools/visual-review.selftest.mjs` (in CI) requires `VISUAL_REVIEW.md` to exist, cover all
four screens at both viewports with a verdict line each, and reference on-disk screenshots.

## 24. UI LANGUAGE LAW — colour (founder-mandated 2026-07-10, Run-4)

**Scary colour fields are banned the same way scary words are.** A stranger ("Jimmy", 11) said the File Cabinet
looked "very red, very scary… like I'm gonna destroy something" — the routine *protected / blocked / hidden*
states were painted in danger-red. Rule:

- **Red is reserved for a genuine PROBLEM** — a real failure, a broken check, or a live danger. Never for a normal,
  expected, protected/hidden state.
- Routine *protected / blocked / hidden* uses the **calm LOCK treatment** (neutral + a quiet purple + a lock glyph):
  distinct and spottable at a glance, but not alarming.
- **Green = good · amber = attention/needs-you · red = PROBLEM · purple = protected · grey = unknown.** These
  semantic colours are shared across all apps via the design tokens (`src/ui/tokens.css`).

Mechanically enforced for the File Cabinet by `src/v8a3/filecabinet/badge-visibility.selftest.mjs` (routine blocked
rows must use the calm lock colour, never a red danger hex or `var(--bad)`), and the shared design language by
`src/tools/design-consistency.selftest.mjs`.

## 25. Design system (founder-mandated 2026-07-10, Run-4)

All four founder-facing apps (Truth Dashboard, Preview Bay, File Cabinet, Project Guide) load and use ONE shared
design-token stylesheet — `src/ui/tokens.css` (palette, type scale, spacing rhythm, and card/badge/chip/button
components). Per-app CSS is layout-only. New founder-facing surfaces must load the shared tokens and use its
components — enforced by `src/tools/design-consistency.selftest.mjs`.
