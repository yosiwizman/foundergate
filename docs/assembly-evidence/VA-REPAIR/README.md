# VA-REPAIR — stranger-caught UX fixes (before → after)

> **Plain English.** Run 1 of the Stranger Test failed on three steps. This folder holds the five fixes that
> answer every confusion "Ralph" hit, each locked by a permanent automated check (the anti-repeat law), with
> before/after screenshots. Nothing here changes what the product is *allowed* to do — it's all how it *looks* and
> *responds*. Next: a real person re-runs the test.

**Product moved:** all fixes are wide-safe UI/presentation. No access/classification enforcement changed
(`cabinet.mjs`/`tree.mjs` untouched), no live/send path, no gate code. Suite: **ALL GREEN (40/40)**.

| # | Stranger confusion (Run 1) | Fix | Committed anti-repeat check | Before → After |
|---|-----------------------------|-----|------------------------------|-----------------|
| **D1** | Dashboard was "a page of letters"; 12+ min to answer the 8 questions | Answer-first cards: each question leads with a colour-coded status chip (Waiting on you / 2 protected / 1 blocker / dev / …), derived only from real state (Law 54) | `src/v8a1/dashboard/scan-budget.selftest.mjs` + extended smoke fold geometry | `before/dashboard.png` → `after/dashboard.png` |
| **D5** | "Don't change these" not prominent; took seconds to find | Raised, lock-coloured, higher card with a 🔒 icon | smoke: `#do-not-touch` above the fold at 1366×768 | `before/dashboard-fold.png` → `after/dashboard-fold.png` |
| **D2** | Restart/Refresh/Clear-Cache looked active but did nothing | Controls now reload the sandboxed preview and every control shows a plain-English feedback line | `src/v8a2/preview/no-dead-controls.selftest.mjs` | `before/preview.png` → `after/preview.png` |
| **D3** | Nothing to try-"send", so the honest refusal was untestable | A labelled practice "Send" in the mock app → inline refusal only ("practice version — never really sends") | `src/v8a2/preview/mock-send-refusal.selftest.mjs` | `after/preview.png` (control present) |
| **D4** | Blocked/unknown files "very difficult to find" | Blocked classes get a red row rail + lock glyph + bold red badge; one-click "show only protected & blocked" filter | `src/v8a3/filecabinet/badge-visibility.selftest.mjs` | `before/filecabinet.png` → `after/filecabinet-blocked.png` |

**Also fixed (process):** the launcher now runs on a **throwaway copy** of the fixture (`FG_PROJECT_ROOT` → temp dir),
so a live session can never mutate the committed mock data again (that corrupted main during Run 1, now repaired).

**Steps that already passed (unchanged):** Step 3 (Bug Collector), Step 5 (Project Guide — cited answers +
injection refusal + draft card), Step 6 (view-only decision card).

Run record: `stranger-test-run-1.md`. Next: **G-VA-REWITNESS** → founder authorizes a re-run with a real person.
