# Reviewer-Mode Surfacing Report
Surfaced the EXISTING reviewer console from the canonical dashboard (anti-drift: no new UI). Added one nav link `Reviewer view (technical)` -> ../reviewer_console/index.html in demo/founder_operator_dashboard/index.html.
- Reviewer console (demo/reviewer_console/) is the technical surface: shows sealed-package SHA-256s, manifests, read-only detail drawers. It is READ-ONLY (0 action buttons — verified in-browser).
- Founder dashboard remains plain-English; the technical detail lives one click away in reviewer mode, not inline.
