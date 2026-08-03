# Founder Usability Report
- **Keyboard navigation:** the sidebar buttons are real `<button>`s and focusable; panels toggle on click/Enter. Founder Drive Mode is the first sidebar item ("start here").
- **Readable labels:** plain-English status cards (Engine, Brakes, Evidence, Checker, Advisor, Gate 8, Commercial, Production/SaaS) each with a one-line explanation.
- **Accessibility:** axe wcag2a/wcag2aa on the Drive Mode + Reviewer panels → **0 serious/critical**.
- **No hidden "ship" language:** the "What should I do next?" box never says ship; decision is "never SHIP".
- **No ambiguous green:** unknown/blocked states are shown as BLOCKED/NOT READY (amber/red), not green.
- **No raw-log / terminal requirement:** the founder reads a table + cards; no logs, Git, SHAs, or terminal.
- **Technical view preserved:** a "Technical view (reviewers)" button opens the Truth Dashboard; all detailed panels remain in the sidebar.
- Verified by tests/e2e-dashboard/drive-reviewer-ui.mjs (27/27) + headed visible proof (5/5).
