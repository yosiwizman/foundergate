# Founder URL-Drop UI — Accessibility Evidence (Phase 7)

Structural checks against `FOUNDER_URL_DROP_UI_ACCESSIBILITY_PLAN.md`, verified in the DOM + selftest.

- Skip-to-content link present (`.skip`, focusable). ✓
- Keyboard: input + both buttons + Pause are native focusable controls; Enter on the input runs the check; visible focus ring via `:focus-visible` (3px outline). ✓
- Large touch targets: primary button min-height 48px; Pause min-height 44px; fixture button 48px. ✓
- Labels: input has `<label for>` + `aria-describedby`; Pause has `aria-label`; cards use `aria-labelledby`; evidence `<summary>` has `aria-label`. ✓
- Live regions: progress timeline + stage `aria-live="polite"`; result + refusal `aria-live="assertive"` (announced). ✓
- Read-aloud status mirrors visible status (UNKNOWN/STALE/HELD/refused/Compileability observed). ✓
- One primary action; no terminal requirement; Pause reachable by keyboard at all times; modal is `role="dialog" aria-modal="true"` and Escape-closable. ✓
- Refusals (private → refused; non-fixture → HELD) are surfaced in an `role="alert"` region. ✓
- Missing/lost state → UNKNOWN; stale → STALE — announced, never green. ✓
- Mobile ≤390px: single-column, no horizontal scroll, targets remain large (verified via 390px screenshot). ✓

Method: DOM/aria structure verified by inspection + the app selftest; browser proof captured the responsive + refusal states. No automated axe run in this phase (recorded limitation); structural a11y is met by construction.
