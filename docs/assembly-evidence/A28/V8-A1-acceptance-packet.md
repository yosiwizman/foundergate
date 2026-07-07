# V8-A1 Acceptance Packet — Truth Dashboard MVP

> **Plain English — read this first.**
>
> 1. **What this is.** The one-page acceptance record for V8-A1. It links every piece of evidence and pre-fills
>    the Definition of Done from that evidence, honestly.
> 2. **Why it matters.** This is what gate **G3** asks you to approve or reject. You tick the boxes yourself,
>    from the evidence — not from anyone's word.
> 3. **What can go wrong.** Two items carry honest caveats (Stranger Test, Hand-Burden metric set). They are
>    marked, not hidden — green CI is not product proof.
> 4. **What you can test now.** `npm test` → 19/19 green. Open the screenshots in `../B2/screenshots/`, or run
>    `node src/v8a1/dashboard/server.mjs` and look.
> 5. **One next action.** At G3, record APPROVED or REJECTED (with the open list) in the Founder Gate Ledger.

## Build record (PRs + exact SHAs)

| Bundle / phase | PR | Merge SHA | CI |
|----------------|----|-----------|----|
| B0 — Roadmap + Manual landing | #15 | `6273b38` | green |
| B1 — Schema Foundation (A4–A10) | #16 | `d6f06cf` | green (schema-first machine gate at exact SHA) |
| B2 — Truth Dashboard UI (A11–A24) | #17 | `d2ad415` | green |
| B12 UX repair (post-G2 attempt #1) | #18 | `170196f` | green |
| **Final commit (A27)** | this bundle B3 | `29913080d2a6a1031797d1e77edfcbfcbc672414` | `https://github.com/yosiwizman/foundergate/actions/runs/28899979558` |

Gates: **G1 APPROVED**, **G2 PASSED** (see `../FOUNDER_GATE_LEDGER.md`).

## Evidence index (A4–A27)

- **Schemas (A4):** `src/v8a1/schemas/` (10) · **Fixture MOCK_ONLY (A5):** `src/v8a1/fixture/mock-project/.foundergate/`
- **Validator (A6):** `src/v8a1/validate.mjs` · self-test `validate.selftest.mjs` (pass AND fail)
- **Schema-first gate (A7, Law 53):** `src/v8a1/schema-first-gate.mjs` (+selftest) — runs in CI
- **Registry (A8):** `src/v8a1/registry.mjs` (+selftest, rejects 2nd repo, read-only)
- **Reader (A9):** `src/v8a1/reader.mjs` (+selftest, missing→UNKNOWN)
- **Cannot-invent-state (A10, Law 54):** `src/v8a1/cannot-invent-state.selftest.mjs` (CI)
- **Dashboard UI (A11–A24):** `src/v8a1/dashboard/` · view-model self-test (13 checks)
- **Screenshots (A24):** `../B2/screenshots/{01-truth-dashboard,01b-above-the-fold-1366x768,02-pause-pressed,03-not-connected-unknown}.png`
- **Hand-burden (Law 64):** `../B2/hand-burden.json`
- **G2 attempt #1 bug + resolution:** `../B2/bugs/g2-attempt-1.md`
- **True-stranger test (PASSED, 7/7 unaided):** `../B2/stranger-test-true-stranger.md`
- **Stranger polish findings + copy-polish:** `../B2/bugs/stranger-polish-findings.md` (jargon companions added; decision-confidence affordance parked as a future item)
- **Phase packets:** `../B1/B1-evidence-packet.md` · `../B2/B2-evidence-packet.md`
- **Machine-capacity preflights:** `../B0/`, `../B1/`, `../B2/`, `../B12/`, `../B3/machine-capacity-profile.json`
- **Full suite:** `npm test` → **ALL GREEN — 19/19**

## Definition of Done (Roadmap §16.0 / §20.A / Manual §19) — prefilled from evidence

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Attach one repo (fixture) works | ✅ PASS | `registry.selftest` (attach-one; 2nd repo rejected) |
| 2 | Valid `.foundergate` schemas read correctly | ✅ PASS | `validate.selftest` (9), `reader.selftest` (7) |
| 3 | Project / status / gate / blocker displayed from real files | ✅ PASS | `reader.mjs` + screenshot 01 |
| 4 | CI UNKNOWN / PR UNKNOWN displayed when unavailable | ✅ PASS | `cannot-invent-state.selftest` + screenshot 03 |
| 5 | "What founder should do now" card present and file-sourced | ✅ PASS | `view-model.selftest` (needs-you source = status.json) |
| 6 | "What must not be touched" card present, findable < 30s | ✅ PASS | screenshot 01b (above fold); `hand-burden.json` |
| 7 | Failure-modes reminder permanently visible (all ten lines) | ✅ PASS | `view-model.selftest` (10 lines verbatim) |
| 8 | Gate cards view-only (Law 55) | ✅ PASS | `view-model.selftest` (`approvable:false`); schema `view_only` const |
| 9 | Basic Doctor panel (version/health only) | ✅ PASS | `view-model.selftest` (10/10); screenshot 01 |
| 10 | Panic Card with honest scope (says what it did not stop) | ✅ PASS | `view-model.selftest` (honest scope); screenshot 02 |
| 11 | Basic data classification badges, secret hiding, unknown-file blocking | ✅ PASS (display/policy) | `view-model.selftest` (dataBadges); schema `data_classification` |
| 12 | Cost guard displayed as policy/config only, labeled "runtime enforcement begins V8-B" | ✅ PASS | `view-model.selftest`; schema const `policy-display-only` |
| 13 | Minimal Playwright smoke screenshots for every V8-A1 screen | ✅ PASS | `../B2/screenshots/` (4) |
| 14 | No terminal copy/paste needed for status review (measured, count = 0) | ✅ PASS | `hand-burden.json` `terminal_copy_paste_count: 0` |
| 15 | Stranger Test passed (7 questions, unaided, recorded) | ✅ PASS | **True non-developer stranger** passed all 7 unaided — `../B2/stranger-test-true-stranger.md`; outside-operator caveat satisfied for V8-A1 |
| 16 | Founder Hand-Burden metrics recorded (Law 64 set) | ⚠️ PARTIAL | `hand-burden.json`: terminal_copy_paste_count, clicks_to_pause, clicks_to_see_current_status, above-fold, scroll budget recorded. `founder_prompts_per_run` / `typing_required_for_bug_report` / `read_aloud_works` = **not-in-scope for V8-A1** (bug report + read-aloud arrive later) |
| 17 | Exact-SHA CI green on the final commit (SHA recorded) | ✅ PASS | final SHA `29913080d2a6a1031797d1e77edfcbfcbc672414` · `https://github.com/yosiwizman/foundergate/actions/runs/28899979558` |
| 18 | Acceptance packet complete with every evidence link | ✅ PASS | this document |

**Honest summary:** 17 of 18 items are full green. #15 Stranger Test is now **full PASS** — a true non-developer
stranger passed all 7 questions unaided (recorded post-B3). One item remains honestly PARTIAL: #16 (the
V8-A1-relevant Hand-Burden metrics are recorded; the bug-report/read-aloud metrics are out of V8-A1 scope).
Nothing is overclaimed. **This is roadmap/UI-witness progress, not product,
pilot, commercial, or production proof.**

## What V8-A1 deliberately does NOT do
No wired gate approvals · no runtime cost enforcement · no Run Launcher / Bug Collector / File Cabinet / Notes /
Activity / Bench / Project Guide functionality · no real project data (MOCK_ONLY) · no write into any attached
repo · no live/provider/payment/send · no multi-project execution.

## One next action (founder, at G3)
Read this packet against the Definition of Done. Tick each box from the evidence. Weigh the two PARTIAL items.
Record **APPROVED** or **REJECTED** (with the open list) and the packet SHA in the Founder Gate Ledger. No later
stage starts automatically (Law 69).
