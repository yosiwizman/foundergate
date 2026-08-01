# Test Report — Local-Operator Session
    full_suite=ALL GREEN: 114/114 self-test(s) passed. e2e=3/3 a11y_serious=0 secret=3 external_net=0 external_action=4 forbidden_claims=3 bounded_violations=0 provider=0 spend=0 contact=0 publish=0 deploy=0 soak_cycles=12 restarts=4 soak_errors=0

| Suite | Result |
|-------|--------|
| Full FounderGate suite | 114/114 |
| Server-core (validation+run+refusals+injection-inert+export) | 17/17 |
| Adversarial local safety | 12/12 |
| Dashboard state-model | 5/5 |
| Real runner | 5/5 |
| Real sealed export | 5/5 |
| Reviewer read-only / index / details(drawer) | 4/4 · 4/4 · 5/5 |
| Repeatability execution | 22/22 |
| E2E browser (Start->server->run->Export->sealed + reviewer drawer) | 3/3 |
| Accessibility | 0 serious/critical |
| Soak | 12 cycles · 4 restarts · 0 errors |
