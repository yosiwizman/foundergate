# LRCQ Live Run Console — Accessibility Evidence (Phase 10)

Captured from the real rendered console (Chrome, `read_page` accessibility tree) at the
`wave2-historical` and `queue-exhausted` fixtures.

## Verified (present in the accessibility tree)
- **Skip link** — `link "Skip to content" href="#main"` (first focusable).
- **Landmarks** — `banner` (header), `main`, and one `region` per section.
- **Semantic headings** — every section has a `heading` ("Overall run status", "Current work", "Queue summary", "Progress summary", "Time & deadline", "Heartbeat & freshness", "Cost & limits", "Stop reason & next safe action", "Acceptance boundary", "Branches & worktrees", "Current vs historical timeline").
- **Live regions** — founder banner is `alert` (`aria-live="assertive"`); lifecycle is `status` (`aria-live="polite"`).
- **List semantics** — queue/progress/time/cost/acceptance summaries are `list` → `listitem`.
- **Notes** — witness-flag exposed as `note`.
- **Visible focus** — `:focus-visible { outline: 2px solid #6ea8fe }` in console.css.
- **Responsive** — single-column grid under 820px; no horizontal scroll of the page body; wide `<pre>` scrolls inside its own box.

## Honest-status checks (no fake green)
- No required state is hidden. The lifecycle and every chip name the exact fact: `COMPLETED (queue exhausted)`, `HEARTBEAT OK/NONE/STALE`, `NOT MERGED`, `NOT ACCEPTED`, `HISTORICAL`, `REPLAY-BLOCKED`, `UNKNOWN`.
- No bare green "PASS": the only green chips (`chip-observed`) name a specific observed fact; `NOT MERGED`/`NOT ACCEPTED` render amber (`chip-notproven`).
- The six acceptance-boundary statements are always rendered as list items.

## Limitations (disclosed)
- This is `read_page` accessibility-tree + visual evidence, not a full axe-core automated audit. A deeper automated a11y sweep (axe/pa11y) is queued in the five-hour backlog.
- Contrast values chosen for dark theme; not yet formally measured against WCAG AA ratios.
