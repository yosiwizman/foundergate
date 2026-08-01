# Browser Test Report — Max-Wide Run
Single Playwright (chromium) job over the three UI prototypes (one heavy browser job, per resource rule):
- founder_operator_dashboard, reviewer_console, saas_foundation_shell.
Result: **3/3 pass, 0 unexpected**. Each asserts its banner + a visible main region, captures a full-page screenshot, and runs axe-core. Config: playwright-founder-operator.config.mjs; authoritative report: evidence/fux_report.json.
