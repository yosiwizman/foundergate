# Stranger Test — Run 1 (RESULT: FAILED)

> **Status: COMPLETED — FAILED.** A real non-developer ran all 7 steps observed by the founder on 2026-07-10.
> Overall FAIL: Steps 1, 2, and 4 did not pass. V8-A acceptance stays PENDING. Repair bundle VA-REPAIR follows;
> the stranger test must be RE-RUN and PASSED before V8-A acceptance.

## Who & when
- **Stranger (a true non-developer):** "Ralph"
- **Observed by:** the founder
- **Date:** 2026-07-10
- **Setup:** `npm run stranger-test` — Dashboard :4173, Preview Bay :4300, File Cabinet :4400, Guide :4500 (loopback, mock data). All four confirmed answering at session start.

## Per-step capture (verbatim from the founder's dictation)

| # | Step | Result | Verbatim notes |
|---|------|--------|-----------------|
| 1 | See what's going on (Dashboard) | **FAIL** | Took over 12 minutes to answer the 8 questions from the screen. "Very difficult for non developer user to understand the layout, the structure, where is everything. Have to read through everything in order to understand where it's what." "You get lost in all the letters." "I passed all your quick check-in and started going right to colors." |
| 2 | Look at the actual app + honest refusal (Preview Bay) | **FAIL** | "There is no send button for the user to try to send." Preview does start and stop; "Restart, refresh, clear cache is not really active or responsive." Full screen works. |
| 3 | Report a problem (Bug Collector) | **PASS** | Report filed and confirmed captured. |
| 4 | Look through the files (File Cabinet) | **PARTIAL FAIL** | Badges seen, safe doc read, secret stayed hidden; but "very difficult to find" the unknown/blocked files; "there's no visually see unknown block as requested." |
| 5 | Ask in plain English (Project Guide) | **PASS** | Cited answer, file answer, trick refused, draft card produced (screenshots on file). |
| 6 | Read a decision card (view-only gate) | **PASS** | "I see where it says where things stand... state, blocked, waiting for decisions. Clearly." |
| 7 | Pause & protect (Dashboard) | **MARGINAL PASS** | "It's visible, but it's not clearly finding on the page and took few seconds." |

**Injection-refusal check (step 5):** PASS — the Guide refused the trick and kept secrets hidden (screenshots on file).

## Overall
- **Could they run it entirely on their own?** No — not without difficulty on Steps 1, 2, 4.
- **Their words, verbatim (the blunt version):** "Please do not change these — even if it could be raised a little bit, look like a raised button, maybe a different color." "You gotta read through a whole entire page... it's gonna take a long time. Review wise, it wasn't so easy to see."
- **Pass bar:** all 7 steps PASS and unaided. → **Overall: FAIL**

## 🔒 Anti-repeat law — confusions → permanent automated checks (VA-REPAIR)
> Every stranger-caught confusion becomes a permanent automated check before V8-A acceptance.

| # | Confusion found | Fix (lane) | Committed check that will guard it |
|---|-----------------|------------|-------------------------------------|
| 1 | Dashboard is a "page of letters"; 12+ min to find the 8 answers | **D1** — answer-first typography, colour status chips, 8 scannable cards | scan-budget check: each of 8 answers a distinct labelled element + fold/scroll geometry |
| 2 | Restart/Refresh/Clear Cache look active but do nothing | **D2** — make them work-with-feedback or disabled+labelled | no-dead-controls check: every enabled button has a handler + visible state change; inert = disabled+label |
| 3 | Nothing to try-"send" in the preview, so honest-refusal is untestable | **D3** — mock "Send" that shows the plain-English live-refusal | committed refusal test (mock send → refusal only, no real send path) |
| 4 | UNKNOWN/blocked files hard to find; no clear visual for "blocked" | **D4** — distinct colour+icon for blocked + one-click jump/filter | badge-visibility contrast check |
| 5 | "Don't change these" not prominent; took seconds to find | **D5** — raised, distinct-colour, higher-position card | geometry check: sits above the fold at 1366×768 |

## What happens next
Repair bundle **VA-REPAIR** (D1–D5, wide-safe UI) runs now; each fix is locked by its anti-repeat check. Then the
founder witnesses before/after at **G-VA-REWITNESS**, authorizes a re-run, and the Stranger Test is re-run with a
real person. **V8-A acceptance fires only after a re-run PASSES.**
