# Converged Founder Operating Environment — Wave 2 (local-only)

Expands the deck-style local Founder operating environment beyond the first Truth Dashboard screen
with truthful panels: Truth Dashboard (live-local), Preview (local demo view), Evidence
(live-local sealed export), Decisions (view-only), Ask Guide (static), Files/Protected Files
(display-only), plus a Founder Mode fallback link and an optional Technical view.

Deck visual language reused (`assets/fg.css` is a byte-identical, unmodified copy of the deck
stylesheet; only inline overrides exist for WCAG AA contrast). Not a third UI; convergence, not a
fork. Local-only, internal. NOT production / SaaS / secure / customer-ready / market-validated /
paid / commercial.

Entry: `src/operator_console/run-server.mjs` serves
`demo/founder_operating_environment/index.html` on 127.0.0.1 only.
