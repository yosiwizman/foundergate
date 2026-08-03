# Lane F — Scenario Batch Runner
"Run scenario + fixture matrix" runs the synthetic scenario matrix (pass/fail/refused/broken/
no-test/deps-missing) plus the Wave-5 fixture matrix, into one aggregate evidence package. No fake
pass, no fake export, no real data. Verified (E2E): scenario rows present + passing; unsafe refused.
