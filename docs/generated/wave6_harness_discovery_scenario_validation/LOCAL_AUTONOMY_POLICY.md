# Lane H2 — Local Autonomy Policy
- Claude MAY continue local build/test/evidence work without founder interruption.
- Claude MAY use browser tools (Playwright + axe) and tests to prove local behavior.
- Claude MAY create synthetic fixtures/scenarios and write run roots, docs, tests, local UI code, ZIP.
- Claude MUST stop only for: a protected founder gate, a hard blocker, fake-evidence risk, an
  unresolved Checker HOLD, or a Gate Advisor HOLD.
- The founder is NOT asked for visual gates while safe local backlog remains — one batch gate at the end.
