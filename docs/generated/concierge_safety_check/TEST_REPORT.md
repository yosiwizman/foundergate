# Test & Scan Report — Concierge Safety Check Dry Run

| Check | Result | Classification |
|-------|--------|----------------|
| Full pure self-test suite (`node scripts/run-selftests.mjs`) | 117 / 117 green | FULL_SUITE_PASS |
| Concierge demo smoke (banner + main, 6 pages, chromium) | 6 / 6 pass, 0 unexpected | DEMO_SMOKE_PASS |
| Accessibility (axe-core, 6 pages) | 0 serious/critical; 6 moderate/minor disclosed | A11Y_PASS |
| Local link/path check | 0 broken links | LINK_CHECK_PASS |
| Forbidden-claim positive-assertion scan | 0 | CLAIM_DISCIPLINE_PASS |
| Secret scan (real token shapes) | 0 | SECRET_SCAN_PASS |
| Network-reference scan (site) | 0 real external refs | NETWORK_SCAN_PASS |
| Invented-customer/revenue scan | 0 | NO_CUSTOMER_CLAIM_PASS |
| Provider invocations (this op) | 0 | NO_PROVIDER_PASS |
| Outbound contact / external send (this op) | 0 | NO_CONTACT_PASS |
| Spend (this op) | $0.00 | NO_SPEND_PASS |

**A11y note:** the 6 moderate/minor violations are one per page — the deliberate high-visibility warning banner sits outside a landmark. Intentional; disclosed. No doc claims the site is "fully accessible" or "WCAG compliant."
**Network note:** the string "analytics" appears once as prose ("no external sends, no analytics, no telemetry") on data-rules.html — descriptive text, not a reference. Real external refs = 0.
