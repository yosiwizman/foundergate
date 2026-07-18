# Phase 7 Independent Advisor Audit (Phase 7.1, Lane 2) — recorded by Terminal-0

**Role:** independent, read-only Advisor (did not build Phase 7). No files written by the Advisor; server started on loopback + curled + killed; no M1/Docker/VM contact. Verdict recorded here by Terminal-0.

## VERDICT: PHASE7-ADVISOR: PASS-WITH-CORRECTIONS

### Core truth-gap — mechanical answer B (READS, does not LAUNCH)
`src/founder_url_drop/server.mjs` has zero `spawn`/`child_process`/`exec`. `/api/check` returns `buildState()` which only reads committed evidence files; `ui/urldrop.js` animates fake stages via `setTimeout(140ms)` then renders pre-recorded evidence. **PHASE7-TRUTH-GAP: BUTTON-DID-NOT-LAUNCH-A-NEW-RUNTIME — CONFIRMED.**

### Findings (tested, not assumed)
- #2 Reads-not-launches — **CONFIRMED** (answer B).
- #3 Result appears before a repo is selected — **CONFIRMED** (`/api/state` returns a completed COMPILEABILITY_OBSERVED with no run; `loadState()` autoloads).
- #4 Evidence is global, not run-bound — **CONFIRMED** (static `run_id: p7-ui-live`).
- #5 Claude-in-Chrome, not Playwright — **CONFIRMED** (no trace file).
- #7 No automated axe — **CONFIRMED** (structural-only).
- #8 Requires Node terminal + localhost URL — **CONFIRMED**.
- #6 Exact-SHA CI absent — **REFUTED**: existing `selftests.yml` ran on exact head `6a26978` (CI run 29605437576, success) and auto-discovers `urldrop.selftest.mjs`; but it exercises only classifier/state logic (no runtime job exists to test).

### Corrections required (Phase 7.1)
1. Button launches a REAL runtime job (spawn/run). 2. No result/evidence before a run is initiated. 3. Bind displayed evidence to a per-run run-id. 4. Actual Playwright + trace. 5. Automated axe. 6. One-click launcher (no terminal). (Exact-SHA CI already satisfied; extend it to cover the new runtime UI + Playwright/axe.)

### Supporting: PR #158 OPEN/DRAFT/unmerged (base spike/opensandbox-public-repo-intake-phase6, head 6a26978); Phase-6 Advisor PASS; false-green + a11y evidence present; fixed-fixture real; main unchanged (e1ca1989); runners 0.
