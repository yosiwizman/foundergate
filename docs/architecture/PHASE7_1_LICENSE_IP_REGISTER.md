# Phase 7.1 — Dev-Dependency License / IP Register

Development-only dependencies added for actual Playwright + automated accessibility testing (Lane D). `node_modules/` is git-ignored; `package.json` + `package-lock.json` are committed.

| Package | Version | Source | License | Purpose |
|---|---|---|---|---|
| @playwright/test | ^1.61.1 | npm (Microsoft) | Apache-2.0 | actual browser E2E tests + trace/report |
| @axe-core/playwright | ^4.12.1 | npm (Deque) | MPL-2.0 | automated accessibility (axe) scan in Playwright |
| (chromium browser) | via `npx playwright install chromium` | Playwright CDN | BSD-style (Chromium) | headless browser for tests + Evidence Pack PDF |

No runtime/production dependency was added; FounderGate's runtime remains zero-dependency. No unrelated dependency was added. Accessibility testing is automated structural checking, **not** an accessibility certification.
