# Test Report — convergence-capture E2E (headless chromium + axe-core)

Command: `OP_PORT=4880 node tests/e2e-dashboard/convergence-capture.mjs`
Target: `http://127.0.0.1:4880/demo/founder_operating_environment/index.html`

Result: **ALL GREEN — 15/15 convergence checks passed.**

Observed on the live run:
- tests chip: `30/30`
- decision chip: `INTERNAL_DEMO_ONLY (never SHIP)`
- evidence freshness: `FRESH`
- axe-core: `{ total: 0, serious: 0, ids: [] }` (0 serious/critical)
- real export: `SEALED_EXPORT_LOCAL` in the technical/reviewer view

Checks covered: deck shell grid + dark bg `rgb(13,17,23)`; chips + run button visible; Export
disabled until a real run; click Run → tests reach `30/30`; decision INTERNAL_DEMO_ONLY never
SHIP; freshness FRESH; no full 40-hex SHA in body; no raw-log markers; Export enabled after run;
click Export → SEALED_EXPORT_LOCAL; honest banner present; axe 0 serious/critical.

Screenshots (in the sealed receipt): `converge_open.png`, `converge_result.png`,
`converge_exported.png`.

Contrast fix note: the sole a11y finding on first pass was white-on-blue (`#3b82f6`, 3.67:1) on
the active nav + primary button. Fixed in the prototype's local override to `#1d4ed8` (WCAG AA)
without altering the deck aesthetic. Final axe: 0 serious/critical.
