# UI Change Report (Lane B — canonical dashboard only, additive)
Changes to demo/founder_operator_dashboard/ (no new UI; all existing IDs/mechanics preserved):
1. Added a top "Founder Mode" summary panel.
2. Added a large primary button "Run safe demo check" (proxies the real Start).
3. Added a large secondary button "Export evidence package" (proxies the real Export; disabled until a run completes).
4. Added plain-English blocks: "What happened", "Can I trust this?", "What should I do next?" — mirrored honestly from the real run status (no fake state).
5. Collapsed the technical/reviewer cards behind a <details>Technical / reviewer view (optional)</details>; the reviewer console link is unchanged.
6. Bigger, easier-to-click buttons (min ~281x66 px).
7. Status readable in Founder Mode without scrolling into technical cards.
8. Decision wording kept honest: INTERNAL_DEMO_ONLY, never SHIP, not production/secure/customer-ready.
9. Added an explicit "What UNKNOWN means" explanation.
10. Start/status/result/Export mechanics preserved (Founder buttons click the same real controls).
The technical/reviewer view is NOT removed — only made optional. Verified by 17/17 usability checks + axe 0 violations.
