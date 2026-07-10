# FounderGate Stage Tracker — disk twin of the founder's printed tracker

> **Plain English.** This is the on-disk copy of the stage tracker the founder keeps on paper — so the printed
> tracker always has a truthful twin in the repo. One row per V8-A stage: what it is, whether it's done, its
> product-final commit, and the last founder gate. `WHERE_AM_I.md` holds the live per-substep detail; this is the
> stage-level summary.
>
> **As of:** 2026-07-10 · **Repo:** private · **Suite:** `npm test` → ALL GREEN (31/31) ·
> **Guard:** evidence-integrity PASS.

## V8-A stages

| Stage | What it is (plain English) | Status | Product-final SHA | Last founder gate |
|-------|----------------------------|--------|-------------------|-------------------|
| **V8-A1 — Truth Dashboard** | See your project's truth: 8 status questions, view-only gates, honest Panic/Pause, data badges | ✅ **COMPLETE / ACCEPTED** | `acd2b04` | G3 APPROVED |
| **V8-A2 — Preview Bay + Bug Collector** | See the real app (honest labels, live refusals) and capture a bug as evidence — no terminal | ✅ **COMPLETE / ACCEPTED** | `dba8720` | G4-A2 ACCEPTED |
| **V8-A3 — File Cabinet** | Safely browse/preview/copy/download files; a data-class badge on every file; secrets hidden, unknown blocked | ✅ **COMPLETE / ACCEPTED (amended)** | `e92f8b9` → `a957b01` | G2-A3 PASSED · G4-A3 ACCEPTED · security amendment (hard-link fix) |
| **V8-A4 — Project Guide** | In-dashboard plain-English chat: explain status/files/gates from evidence, draft bug/notes — read-only, never acts | ✅ **COMPLETE / ACCEPTED** | `a957b01` | G2-A4 PASSED · G4-A4 ACCEPTED |
| **V8-A — Full acceptance** | The whole founder-facing product accepted together via the Stranger Test | 🧑‍🔬 **STRANGER TEST AUTHORIZED — awaiting a real-person run** | — | V8-A-ACCEPTANCE-START APPROVED |

## Gate ledger (stage-level, latest per stage)

| Gate | Decision | Anchor |
|------|----------|--------|
| G3 — accept V8-A1 | APPROVED | product-final `acd2b04` |
| G4-A2 — accept V8-A2 | ACCEPTED | product-final `dba8720` (CI 28961920072) |
| G2-A3 — V8-A3 UI witness | PASSED | product-final `e92f8b9` |
| G4-A3 — accept V8-A3 | ACCEPTED | product-final `e92f8b9` (CI 29097063338) |
| G1-A4 — start V8-A4 (proposal) | APPROVED (start only) | proposal `docs/lanes/V8-A4-proposal.md` |
| G1-A4-IMPL — start V8-A4 build | APPROVED | build contract PR #36 |
| G2-A4 — V8-A4 UI witness | PASSED | product-final `a957b01` (CI 29104173885) |
| G4-A4 — accept V8-A4 | ACCEPTED | product-final `a957b01` (CI 29104173885) |
| **V8-A ACCEPTANCE — whole product** | **PENDING** | fires after the Stranger Test run |

## Contracts & plans on file
- **V8-A4 build contract:** `docs/lanes/V8-A4-lane-packet.md` (SENSITIVITY RULING: injection boundary → 1 builder
  + 1 adversarial checker; PG-CORE/PG-UI/AC DAG).
- **V8-A full-acceptance plan:** `docs/lanes/V8-A-acceptance-plan.md` (Stranger Test script, evidence, gate skeleton).
- **Full history:** `docs/ARCHIVE_MASTER.md` · **live detail:** `docs/assembly-evidence/WHERE_AM_I.md` ·
  **per-substep:** `docs/assembly-evidence/EVIDENCE_LEDGER.md` · **gates:** `docs/assembly-evidence/FOUNDER_GATE_LEDGER.md`.

## One next action for the founder
Run the **Stranger Test** with a real non-developer using `docs/lanes/stranger-test-script.md`; capture their notes in `docs/lanes/stranger-test-evidence-template.md`. The final V8-A acceptance gate fires after the run.
