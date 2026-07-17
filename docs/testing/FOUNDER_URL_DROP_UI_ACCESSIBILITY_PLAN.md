# Founder URL-Drop UI — Accessibility Plan (Phase 7, Lane E)

## Checks
- Keyboard-only operation (tab order, Enter activates primary action); visible focus ring on every control.
- Large touch targets (>=44px) for the primary action + fixture shortcut + Pause.
- Screen-reader labels (aria-label / aria-labelledby) on input, primary button, cards, drawer.
- Progress announced via `aria-live="polite"`; result + refusal announced via `aria-live="assertive"`.
- Read-aloud status text mirrors visible status (UNKNOWN/STALE/HELD/refused/compileability-observed).
- One-action primary button; no terminal requirement; Pause & get help reachable by keyboard at all times.
- Refusals: private URL refusal + unsupported/non-fixture HELD are announced, not silent.
- Missing status → UNKNOWN; lost backend state → UNKNOWN; stale result → STALE — each announced.
- Failure states (acquisition/validation/sandbox/compileability/teardown-pending/deletion-missing) never announce success.
- Mobile-width (<=390px) renders single-column, no horizontal scroll, targets remain large.

## Method
Automated structural checks (roles/labels/live-regions/focusable order) in the selftest + the browser proof; manual read-through against this list. Record pass/fail in the accessibility evidence note.
