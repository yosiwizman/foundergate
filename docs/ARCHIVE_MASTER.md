# FounderGate Archive Master — v4

> **Plain English.** One rolled-up history of everything that has shipped in the FounderGate repo, refreshed to
> today. It folds in the V8-A2 close and the V8-A3 build, and carries the founder-gate ledger through
> G1-A3-IMPL. It is the "where did we get to" record; the living detail lives in the ledgers it points to.
>
> **Version:** v4 · **As of:** 2026-07-10 · **Repo:** private · **Suite:** `npm test` → ALL GREEN (31/31).

## 1. Phase A — Harness extraction (customer AKIOR → product)
Ten runnable components extracted from AKIOR into `src/`, each green standalone, copy-only, decoupled: evidence
bus · prepush checker · proof-package builder · cage-evidence ledger · mock-providers + network tripwire ·
held-action sink · cage-escape model · swarm coordinator + metrics · github-collector · adapters + registry. Plus
foundation records, the extraction map/ledger, and the imported doctrine. (See `docs/HARVEST_LEDGER.md`,
`docs/EXTRACTION_MAP.md`, `docs/doctrine/`.)

## 2. Phase B — Assembly Manual V1.2 / Roadmap V8.11 build
Landed the approved Roadmap V8.11 + Assembly Manual V1.2 (byte-identical), then built the V8-A stages gate-to-gate.

### V8-A1 — Truth Dashboard MVP — **COMPLETE, accepted (G3)**
Schema foundation (12-item `.foundergate` subset, validator, fixture, cannot-invent-state, attach-one registry,
reader) + the read-only Truth Dashboard (8 questions, view-only gates, honest Panic, failure-modes, data badges,
cost display-only). Gates G1→G4 all recorded. Product-final `acd2b04`. Acceptance:
`docs/assembly-evidence/A28/V8-A1-acceptance-packet.md`.

### V8-A2 — Preview Bay + Bug Collector — **COMPLETE, CLOSED**
Preview Bay (allowlist-only, fail-closed, loopback, tracked-process, no-live-path proof) + Bug Collector
(capture→auto-classify→store, capture-only). The sensitive process-control was independently checker-reviewed
(a HIGH finding — control API bound to all interfaces — caught and fixed). Witnessed PASS (G2-A2), accepted
(G4-A2). Product-final `dba8720`; dual-pinned close with raw verification:
`docs/assembly-evidence/A2/V8-A2-acceptance-packet.md`.

### V8-A3 — File Cabinet — **BUILT, awaiting G2-A3 witness**
Classified, read-only file viewer: a data-class badge on every file; secrets hidden; unknown blocked (fail-safe);
preview/copy/download gated; symlinks resolved to their real target. The sensitive secret-hiding core was
independently checker-reviewed — **two confirmed HIGH content-leaks** (broken `**` glob; `README→.env` symlink)
were caught and fixed, with a committed no-secret-leak proof. Product-final `e92f8b9`. Acceptance:
`docs/assembly-evidence/A3/V8-A3-acceptance-packet.md`. **Next: G2-A3 (founder UI witness).**

## 3. Proposals & contracts on file
- V8-A2 proposal (built) · V8-A3 proposal → **lane packet/build contract** (built).
- **V8-A4 (Project Guide)** — DRAFT, pending G2-A3 (`docs/lanes/V8-A4-proposal.md`).

## 4. Founder Gate Ledger (through G1-A3-IMPL)
| Gate | Decision |
|------|----------|
| G1 — start V8-A1 impl | APPROVED |
| G2 — V8-A1 UI witness | PASSED (true-stranger PASS recorded) |
| G3 — V8-A1 accept | APPROVED (`acd2b04`) |
| G4 — V8-A2 start | APPROVED |
| G1-A2 — start V8-A2 impl | APPROVED |
| G2-A2 — V8-A2 UI witness | PASSED |
| G4-A2 — accept V8-A2 | ACCEPTED (`dba8720`) |
| G1-A3 — start V8-A3 (proposal) | APPROVED |
| G1-A3-IMPL — start V8-A3 impl | APPROVED (`aa8fcc1`) |
| **G2-A3 — V8-A3 UI witness** | **PENDING (in progress)** |
Full detail: `docs/assembly-evidence/FOUNDER_GATE_LEDGER.md`.

## 5. Safety posture & anti-repeat guards (permanent, CI-enforced)
- Repo private throughout; every commit secret-scanned; no live/provider/send/payment path anywhere.
- Sensitivity ruling honored on both sensitive surfaces (V8-A2 process-control, V8-A3 secret-hiding): one builder
  + one independent adversarial checker before merge; each caught real HIGH bugs.
- **Evidence-integrity guard** (`src/tools/evidence-integrity.selftest.mjs`, runs in CI): no empty evidence file,
  no unstamped placeholder, no write-before-truncate stamp pattern, no gitignored self-test, no empty/malformed
  stamped SHA/PR. Safe stamp helper (`scripts/stamp.mjs`) reads-before-write and refuses empty replacements.

## 6. Where to look next
`docs/assembly-evidence/WHERE_AM_I.md` (live status) · `docs/assembly-evidence/EVIDENCE_LEDGER.md` (per-substep) ·
the acceptance packets above. **One next action for the founder: witness the File Cabinet (G2-A3).**
