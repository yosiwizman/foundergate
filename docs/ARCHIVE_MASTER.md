# FounderGate Archive Master — v5

> **Plain English.** One rolled-up history of everything that has shipped in the FounderGate repo, refreshed to
> today. It folds in the V8-A3 close, the V8-A4 build and close, the G4-A3 security amendment, and carries the
> founder-gate ledger through G4-A4. It is the "where did we get to" record; the living detail lives in the
> ledgers it points to.
>
> **Version:** v5 · **As of:** 2026-07-10 · **Repo:** private · **Suite:** `npm test` → ALL GREEN (36/36) ·
> **Guard:** evidence-integrity PASS.

## 1. Phase A — Harness extraction (customer AKIOR → product)
Ten runnable components extracted from AKIOR into `src/`, each green standalone, copy-only, decoupled: evidence
bus · prepush checker · proof-package builder · cage-evidence ledger · mock-providers + network tripwire ·
held-action sink · cage-escape model · swarm coordinator + metrics · github-collector · adapters + registry. Plus
foundation records, the extraction map/ledger, and the imported doctrine. (See `docs/HARVEST_LEDGER.md`,
`docs/EXTRACTION_MAP.md`, `docs/doctrine/`.)

## 2. Phase B — Assembly Manual V1.2 / Roadmap V8.11 build
Landed the approved Roadmap V8.11 + Assembly Manual V1.2 (byte-identical), then built the V8-A stages gate-to-gate.
**All four V8-A stages are now built and accepted;** the whole-product Stranger Test is authorized and awaiting a
real-person run.

### V8-A1 — Truth Dashboard MVP — **COMPLETE, accepted (G3)**
Schema foundation (12-item `.foundergate` subset, validator, fixture, cannot-invent-state, attach-one registry,
reader) + the read-only Truth Dashboard (8 questions, view-only gates, honest Panic, failure-modes, data badges,
cost display-only). Product-final `acd2b04`. Acceptance: `docs/assembly-evidence/A28/V8-A1-acceptance-packet.md`.

### V8-A2 — Preview Bay + Bug Collector — **COMPLETE, accepted (G4-A2)**
Preview Bay (allowlist-only, fail-closed, loopback, tracked-process, no-live-path proof) + Bug Collector
(capture→auto-classify→store). Sensitive process-control independently checker-reviewed (a HIGH — control API
bound to all interfaces — caught and fixed). Product-final `dba8720`. `docs/assembly-evidence/A2/`.

### V8-A3 — File Cabinet — **COMPLETE, accepted (G4-A3) · later amended**
Classified read-only file viewer: a data-class badge on every file; secrets hidden; unknown blocked (fail-safe);
preview/copy/download gated; symlinks resolved to their real target. Secret-hiding core checker-reviewed — **two
HIGH content-leaks** (broken `**` glob; `README→.env` symlink) caught and fixed. Witnessed (G2-A3), accepted
(G4-A3). Product-final `e92f8b9`. **Amendment:** during V8-A4 review a **hard-link content-leak** (a secret
hard-linked to a safe name) was found in the shared enforcement and fixed (`nlink>1` fail-closed) — V8-A3
acceptance stands, amended; enforcement now at `a957b01`. `docs/assembly-evidence/A3/`.

### V8-A4 — Project Guide — **COMPLETE, accepted (G4-A4)**
In-dashboard, plain-English chat that *explains* the project (cited, honest UNKNOWN — Law 54) and *drafts* review
cards. Read-only: reads state via the V8-A1 reader and file content only through the File Cabinet enforcement, so
it can never see or quote what the Cabinet hides; treats file/question text as data, never instructions (Law 57);
refuses actions/routing. Sensitive answer-core + injection boundary independently checker-reviewed — **one HIGH
hard-link leak** (see the V8-A3 amendment) caught and fixed; committed injection + no-blocked-content-leak proofs.
Witnessed (G2-A4), accepted (G4-A4). Product-final `a957b01`. `docs/assembly-evidence/A4/`.

## 3. Proposals & contracts on file
- V8-A2 / V8-A3 / V8-A4 proposals + build contracts — all built & accepted.
- **V8-A full-acceptance plan** — `docs/lanes/V8-A-acceptance-plan.md`; **Stranger Test kit** —
  `docs/lanes/stranger-test-script.md` + `docs/lanes/stranger-test-evidence-template.md` (one-command start:
  `npm run stranger-test`).
- **V8-B (Making It Real)** — DRAFT, pending V8-A acceptance (`docs/lanes/V8-B-proposal.md`); all executor / gate-
  engine / session-token / rollback / cost-enforcement paths pre-ruled SENSITIVE.

## 4. Founder Gate Ledger (through G4-A4)
| Gate | Decision |
|------|----------|
| G1 · G2 · G3 — V8-A1 | APPROVED · PASSED (true-stranger) · APPROVED (`acd2b04`) |
| G4 · G1-A2 · G2-A2 · G4-A2 — V8-A2 | APPROVED · APPROVED · PASSED · ACCEPTED (`dba8720`) |
| G1-A3 · G1-A3-IMPL · G2-A3 · G4-A3 — V8-A3 | APPROVED · APPROVED · PASSED · ACCEPTED (`e92f8b9`) |
| ↳ G4-A3 AMENDMENT — hard-link fix | ACCEPTANCE STANDS (amended; enforcement → `a957b01`) |
| G1-A4 · G1-A4-IMPL · G2-A4 · G4-A4 — V8-A4 | APPROVED · APPROVED · PASSED · ACCEPTED (`a957b01`) |
| **V8-A-ACCEPTANCE-START — Stranger Test** | **APPROVED (awaiting a real-person run)** |
| **V8-A ACCEPTANCE — whole product** | **PENDING (fires after the Stranger Test)** |
Full detail: `docs/assembly-evidence/FOUNDER_GATE_LEDGER.md` · stage twin: `docs/assembly-evidence/STAGE_TRACKER.md`.

## 5. Safety posture & anti-repeat guards (permanent, CI-enforced)
- Repo private throughout; every commit secret-scanned; no live/provider/send/payment path anywhere; all servers
  loopback; all work on the MOCK_ONLY fixture.
- Sensitivity ruling honored on every sensitive surface (V8-A2 process-control, V8-A3 secret-hiding, V8-A4
  injection boundary): one builder + one independent adversarial checker before merge; each caught a real HIGH.
- **Evidence-integrity guard** (`src/tools/evidence-integrity.selftest.mjs`, CI): no empty evidence file, no
  unstamped placeholder, no write-before-truncate stamp, no gitignored self-test, no empty/malformed stamped
  SHA/PR. Safe stamp helper (`scripts/stamp.mjs`) reads-before-write and refuses empty replacements.
- **Stranger-test anti-repeat law:** every stranger-caught confusion becomes a permanent automated check before
  V8-A acceptance.

## 6. Where to look next
`docs/assembly-evidence/WHERE_AM_I.md` (live status) · `docs/assembly-evidence/STAGE_TRACKER.md` (stage twin) ·
`docs/assembly-evidence/EVIDENCE_LEDGER.md` (per-substep). **One next action for the founder: run the Stranger
Test with a real non-developer (`npm run stranger-test`).**
