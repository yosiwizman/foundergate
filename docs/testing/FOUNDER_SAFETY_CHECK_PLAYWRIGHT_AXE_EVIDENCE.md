# Founder Safety Check — Actual Playwright + Automated Axe Evidence (Phase 7.1, Lane D)

**Real Playwright Test 1.61.1** (not Claude-in-Chrome) + **@axe-core/playwright** ran against the live loopback service in a deterministic, clearly-labeled UI-CI mode (`FG_UI_CI=1`, fresh runs dir) so the full flow is exercised without a 5-minute VM. The founder-witness path always spawns the real job; CI mode is UI-only and labeled `CI-FIXTURE`.

## Result: **20 passed, 0 failed** (desktop Chromium + mobile Pixel 5 Chromium)
- Config: `playwright.config.mjs` (trace: on, screenshot: on, video retain-on-failure). Report: `docs/testing/evidence/playwright-report/`. Results JSON: `docs/testing/evidence/playwright-results.json`. Sample trace: `docs/testing/evidence/traces/sample-trace.zip` (open with `npx playwright show-trace`).
- Spec `tests/e2e/safety.spec.mjs` proves: initial neutral state (no result); fixture button binds the URL; **Run creates a new run-id, shows stages, result bound to run + repository (commit 621e4974)**; build/tests/security/production remain not proven; **Evidence Pack download link set**; another public URL HELD; SSH URL refused; Pause visible + honest ("cancellation is not yet proven"); no raw terminal/localhost founder-facing; **axe: no critical or serious violations**.
- Correction cycles reaching green: cycle 1 (run-job.sh heredoc bug), cycle 2 (teardown GET-before-kill; Evidence Pack completion), cycle 3 (axe `.pill-info` contrast; mobile device → Pixel 5 chromium; Pause assertion case).

**Note:** Claude-in-Chrome captures from Phase 7 remain supplementary only; this is the authoritative Playwright evidence.
