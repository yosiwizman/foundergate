# VA-REPAIR-2 — friendly dashboard redesign (Stranger Run-2 findings)

> **Plain English.** Run 2 (a 9-year-old, first-time user) was a big improvement — 5/7 steps passed and D1–D5
> all held — but she still couldn't fully run it alone. She hit three product-confusion points; this bundle
> redesigns the dashboard into one friendly page that answers them. Same product, same permissions — only the
> home screen changed.

**Product moved:** wide-safe UI/presentation only. No gate code, no enforcement change, no live path. Reader
model unchanged except added, Law-54-honest friendly fields. Suite: **ALL GREEN (42/42)**.

## Provenance (important — for the record)
The design mockup that guided this redesign is an **AI-generated concept image created at the 9-year-old's request
AFTER her test**. It is **design input, NOT stranger evidence.** Her stranger evidence is solely her **verbatim
test results** in `../VA/stranger-test-run-2.md`. Findings F1/F2/F3 derive from her verbatim answers, not from the
mockup. Every friendly sentence on the new page is a **template over real model fields** (Law 54) — never invented,
no fabricated timestamps.

## The three findings → fixes → guards
| # | Her words (Run 2) | Fix | Committed anti-repeat guard |
|---|-------------------|-----|------------------------------|
| **F1** | "I do not really understand what it is supposed to do" | A plain-language one-line project summary at the top ("Your project is waiting for you. It needs you to read one decision…"), from real state | `home-model.selftest.mjs` (F1 present, populated, friendly-copy clean) + smoke (above the fold + populated) |
| **F2** | "I probably would not notice the $50 unless somebody showed me" | A big, hard-to-miss **$50 / month** card (display-only disclaimer kept) | `home-model.selftest.mjs` (from real budget, display-only) + smoke (font-size ≥ 30px, present) |
| **F3** | "I do not really understand the decision… lots of words… not sure what I am supposed to choose" | The "Waiting for You" card leads with a one-sentence plain summary; details secondary; **view-only** | `home-model.selftest.mjs` (lead present + friendly + view-only) + smoke (populated + view-only affordance) |

## Two mandatory legal corrections to the mockup (enforced)
- **Pause honesty:** the mockup said "Pause Everything"; the product uses **"Pause & get help"** (honest scope). The
  existing pause-honesty + size guards still pass.
- **Decision is view-only (Law 55):** the mockup's "Make a Decision · Move the project forward" tile is replaced by
  **"Read the Decision · See what's waiting (view only)"**; the main button is **"Read the Decision"**. No
  approve/act affordance anywhere. Locked by `home-model.selftest.mjs` (ACT-word ban) + smoke.

## Existing guards preserved (adapted to the new layout, not deleted)
scan-budget (8 answers remain individually scannable — 5 status chips + summary + activity + protect card, each a
`data-answer` element) · fold geometry (summary + status strip above the fold at 1366×768) · no-dead-controls
(every tile links; every nav item links or is disabled+staged) · pause size/honesty · "safety" never labels the
Checks chip · banned-words lint · cannot-invent-state (disconnected → UNKNOWN).

## Before → after
`before/dashboard.png` (the D1/D5 dashboard Run 2 saw) → `after/dashboard.png` (the friendly redesign).

Next: **G-VA-REWITNESS-2** (founder witness of before/after) → authorize **Stranger Test Run 3** with a fresh
third stranger. **V8-A acceptance fires only after a run passes all 7 steps unaided.**
