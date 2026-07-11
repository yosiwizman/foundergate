# FD-IMPLEMENT — founder witness + acceptance record

**Bundle:** FD-IMPLEMENT (founder design package v2, pixel-faithful across all four apps).
**Founder witness:** 2026-07-11 — *"Witnessed — the four apps match my mockups; law-forced deviations accepted."*
**Merged:** PR #73, product-final **`85a59f9`** (exact-SHA CI on main = success). Suite 50/50; committed fixture pristine.

## Design package (committed so the spec reference resolves on disk forever)
The founder's four mockups + shared tokens + implementation contract are committed at
`docs/lanes/founder-design-v2/`: `01_Dashboard.html` · `02_PreviewBay.html` · `03_FileCabinet.html` ·
`04_ProjectGuide.html` · `fg.css` · `05_DESIGN_SPEC.md`. FD-IMPLEMENT was built pixel-faithful to these; the
`05_DESIGN_SPEC.md` reference in the FD-IMPLEMENT commit now resolves on disk.

## Disk-proof completion table (line citations corrected)
| Lane | What landed | PR | SHA (`git cat-file` = commit) | Guards relocated/added (file:line) |
|---|---|---|---|---|
| Harness fix 1 — true-viewport | Renders at true 1366×768/1440×900, deviceScaleFactor pinned; **fails if reported ≠ requested** | #71 | `0414887` (merged) | `src/tools/visual-capture.selftest.mjs:30-35` |
| Harness fix 2 — in-embed capture | Measures the café Send **inside** the sandboxed iframe; fails on a clip | #71 | `0414887` (merged) | `src/tools/visual-capture.selftest.mjs:41-46` |
| Harness fix 3 — mechanical gate | Launcher refuses a session on an unwaived critical-path note | #71 | `0414887` (merged) | `src/tools/critical-path-gate.selftest.mjs:42-49` |
| Dashboard v2 (+ accordion delete + guard reloc) | Alive line (health, not run_state), 6 chips, Pause-instead, What's Next, footnotes; no `<details>` | #73 | `85a59f9` (merged) | honesty-superset→`src/v8a1/dashboard/smoke.mjs:82`; do-not-touch→`smoke.mjs:87`; scan-budget→`src/v8a1/dashboard/scan-budget.selftest.mjs:62,78`; J1→`src/v8a1/dashboard/home-model.selftest.mjs:94` |
| Preview Bay — embed grows + inside-embed guard | Embed grows to café content (625px); Send fully visible; "Save report" | #73 | `85a59f9` (merged) | `src/v8a2/preview/no-dead-controls.selftest.mjs:78`; L0 no-fixed-height→`src/tools/visual-capture.selftest.mjs:48-56` |
| File Cabinet reskin | v2 shell; data-driven do-not-touch banner; dim prefix/bright tail; calm locks; dominant reader | #73 | `85a59f9` (merged) | `src/v8a3/filecabinet/badge-visibility.selftest.mjs` + `filecabinet-l3.selftest.mjs` (pass on reskin) |
| Ask Guide reskin | v2 chat; cited answers, amber refusal, draft-only + Copy; zero behavior change | #73 | `85a59f9` (merged) | `src/tools/design-consistency.selftest.mjs:35` |
| tokens.css merge (fg.css) | One shared v2 design language | #73 | `85a59f9` (merged) | `src/tools/design-consistency.selftest.mjs:35` |

## Terminal Advisor pre-witness audit (founder's separate read-only lane)
The Terminal Advisor's two flags were fixed in this evidence bundle:
1. **Spec reference must resolve on disk** — FIXED: the design package (incl. `05_DESIGN_SPEC.md`) is committed at
   `docs/lanes/founder-design-v2/`.
2. **Completion-table line citation for the visual-capture in-embed guard** — FIXED: corrected to
   `src/tools/visual-capture.selftest.mjs:41-46` (the check block; line 9 was the header comment).

**Verbatim audit report:** to be committed at `docs/assembly-evidence/FD/advisor-fd-audit.md` once the founder
supplies the report text from the Terminal Advisor lane. It is not reproduced here to avoid inventing content
(Law 54) — the CTO does not author the founder's independent-lane report.
