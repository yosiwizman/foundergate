# FounderGate — Founder Design Package v2 (IMPLEMENTATION CONTRACT)

**Authority:** founder-mandated design control (Run-6 abort, ledger 2026-07-11). The CTO implements these
four mockups PIXEL-FAITHFULLY. No CTO-initiated design iteration. Deviations only where a mockup would
violate an existing law — and every deviation must be listed in the completion report.

**Files:** 01_Dashboard.html · 02_PreviewBay.html · 03_FileCabinet.html · 04_ProjectGuide.html
(+ fg.css, the shared tokens — merge into the existing tokens.css, do not fork).

## Per-page requirements

### 01 Dashboard
- Header: PROJECT eyebrow · project name (from project.json) · one-line description · Get Help · Pause & get help.
- ALIVE LINE (new): green glowing dot + "Project healthy — connected, all files in place." + amber
  "Waiting on you: …" continuation. **Law 54 derivation: the green light = health/connection
  (files-found + server-connected), NOT run_state — the diagnosis proved run-state green is impossible
  on the fixture. If health checks fail, the dot goes red with honest wording. Never invented.**
- Six chips exactly as drawn. STATUS chip = "Healthy · waiting on you" (health + state combined).
  SPENDING chip carries "display only" inline (the old accordion disclosure, relocated).
- Honesty line under chips (unchanged string).
- Amber-trimmed Waiting card WITH "Pause instead" button (same action & honest wording as header pause).
- What's Next panel: derived ONLY from next_action + pending gates; honest absence wording. No schedules.
- Quick actions row (5 tiles, decision tile view-only tag).
- **NO ACCORDIONS.** Layer-3 drop-downs are DELETED. Their guarded content relocates:
  - Green-CI translation: stays as the honesty line (already present).
  - Other four A1 translations: the "Good to know" footnote strip (small, dim, always visible).
  - Do-not-touch summary: one footnote line + FULL list moves to the File Cabinet banner (03).
  - Safety checklist content: covered by the alive line + Safety chip (demo-mode wording preserved).
  - **GUARD MIGRATION: the honesty-superset, do-not-touch-geometry, and scan-budget guards must be
    UPDATED to the new locations in the SAME PR — relocate assertions, never delete them. The
    completion report lists each guard's old→new assertion.**

### 02 Preview Bay
- Labels row, controls row as drawn ("Save report" not "Send report" — reports save, they don't send).
- **THE EMBED GROWS WITH ITS CONTENT.** No fixed 420px frame: size the iframe to its content height
  (or set min-height ≥ the café's natural height) so "Send order (practice)" is FULLY VISIBLE with no
  inner scrolling at 1366×768 and 1440×900. This is L0, finally. Guard: screenshot INSIDE the embed
  (the embedded app's own URL at the rendered size) asserting the practice-send control is within view.
- The café keeps its honest refusal line under the button.

### 03 File Cabinet ("Files")
- Do-not-touch banner pinned at top (relocated from dashboard) — calm purple, not alarming.
- Toolbar: List/Reading toggle · Sort · Search · "Only protected & blocked" filter.
- List: grouped, dim directory prefix / bright filename tail, calm purple locks, green SAFE badges.
- READING PANE DOMINATES (~2/3 width): a document opens big and readable; Copy text / Download only.
- All read-only; all access through the existing checker-approved cabinet enforcement; search/sort stay
  presentation-only (existing no-leak proofs must pass unchanged).

### 04 Project Guide ("Ask Guide")
- Same shell/design system. Suggested-question chips, chat with cited answers (Source lines), the
  amber-trimmed refusal style, draft cards labeled "draft only, not sent" with Copy.
- Every honesty behavior IDENTICAL to current — this is a reskin of the surface, zero behavior change.

## Process requirements (non-negotiable)
1. The three harness fixes from the run-6 diagnosis land FIRST (true-viewport rendering, inside-iframe
   screenshots, mechanical critical-path gate) — the new UI cannot be verified by a broken harness.
2. Visual Self-Review Law applies at true 1366×768 and 1440×900 against these mockups side-by-side;
   verdict per screen = "matches mockup: yes/no + differences."
3. Completion report: EVERY lane cites a PR + SHA that resolves on disk (git cat-file) — reports
   without resolving SHAs are invalid per the new law.
4. All existing guards pass (relocated where this spec says so). Law 54/55, no-leak, pause honesty,
   banned words, calm-color law: all in force. No live path. MOCK_ONLY.
5. Stop at a founder witness gate with live URLs + mockup-vs-live screenshots.
