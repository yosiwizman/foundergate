# VA-REPAIR-3 — research-grounded dashboard redesign + realistic demo (Run-3 findings)

> **Plain English.** Run 3 (an adult non-developer, "Dana") failed: she spent 20+ minutes on the first screen,
> **couldn't find the project name** (a regression the redesign had introduced), the front felt "condensed /
> overwhelming," and the preview "looked like a broken app." This bundle rebuilds the dashboard around
> established UX research and replaces the skeletal demo with a believable small product. Same product, same
> permissions — only the home screen and the demo *content* changed.

**Product moved:** wide-safe UI + fixture-*content* only. No gate code, no enforcement change, no live/send path
(the demo's "Send order" is an inline refusal, no network). Suite: **ALL GREEN (42/42)** + dashboard smoke green.

## Design authority (cited per the bundle)
Apple **Human Interface Guidelines** — clarity, deference, depth, consistency. Established dashboard UX practice:
the **5-second rule** (a stranger should grasp status in ~5s), the **5–9 metric ceiling** (5 status chips), a
**three-layer summary → context → detail** progressive-disclosure structure, **F-pattern** priority placement
(identity in the top-left "golden triangle"), **data-ink reduction** (fewer boxes, more air), an **8-pt spacing
grid**, **semantic status colours** (green=good / amber=needs you / red=problem / grey=unknown), and **44 px
minimum touch targets**.

## The three findings → fixes → guards
| # | Dana's finding (Run 3) | Fix | Committed anti-repeat guard |
|---|------------------------|-----|------------------------------|
| **R1** | Couldn't find the **project name** (redesign regression) | Identity-first header: project **name** (`project.json`) + one-line **description** + the plain summary, all model-derived (Law 54) | `home-model.selftest.mjs` (R1 identity, incl. disconnected → no invented name) + smoke (`#proj-name` renders the model name, above the fold) |
| **R2** | Front "condensed / overwhelming"; 20+ min | **Three disclosure layers.** Layer 1 (the ONLY thing above the fold): identity + ≤5 semantic status chips + one next action. Layer 2: waiting detail, activity, tiles. Layer 3 (collapsed `<details>`): safe/pause/cost, do-not-touch, evidence, health, remember. 8-pt grid, one type scale, 44 px targets, data-ink pass, dark theme with air. | smoke **fold budget** (≤6 role-labelled answers above 768 px; Layer 2 starts below the fold) + 8 answers preserved (relocated across layers) + honesty superset present in DOM **and visible on expand** (progressive disclosure, not hiding) |
| **R3** | Preview "looked like a broken app" | **Realistic demo:** the mock app is now a believable **Luna Café — order ahead** one-pager (logo, nav, 3 priced menu cards, a practice "Send order" → honest refusal, no network). `project.json` renamed to match, a café README added, so Dashboard + File Cabinet + Guide read as one coherent real project. Fixture-pristine manifest **re-blessed** as an intentional change. | `mock-send-refusal.selftest.mjs` (Luna Café + ≥3 priced items + nav + send-refusal + **no network path**) |

## Existing guards preserved (adapted, not deleted)
F1/F2/F3 (`home-model`), honesty superset (all five A1 translations, now DOM-present + visible-on-expand),
safety-chip no-blanket-claim, no-invented-timestamps, scan-budget (8 scannable answers), no-dead-controls, pause
size/honesty, "safety"-not-in-Checks, banned words, cannot-invent-state (disconnected → UNKNOWN).

## Fixture change (recorded, intentional)
The `.foundergate` **fixture-pristine manifest was re-blessed** (`node src/v8a1/fixture-pristine.selftest.mjs
--write`, 18 files) because the demo content changed on purpose: `app/index.html` (Luna Café), `project.json`
(name + new optional `description` field, added to `project.schema.json`), `docs/CURRENT_STATUS.md` (café, keeps
"MOCK_ONLY founder document"), new `docs/README.md`.

## Before → after
`before/dashboard.png` + `before/dashboard-5sec-fold.png` + `before/preview.png` → `after/dashboard.png` +
`after/dashboard-5sec-fold.png` (the 5-second still) + `after/cafe-app.png` (the realistic demo).

## Provenance (for the record)
The run-2 design mockup was AI-generated design input, not stranger evidence. VA-REPAIR-3 is grounded in the cited
public UX research above and in Dana's **verbatim** Run-3 answers (`../VA/stranger-test-run-3.md`) — not in any
mockup.

Next: **G-VA-REWITNESS-3** (founder witness of before/after) → authorize **Run 4** with a fresh stranger. **V8-A
acceptance fires only after a run passes all 7 steps unaided.**
