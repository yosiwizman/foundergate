# Lane I — Long Regression / Soak
Soak: 25 governed runs (each honest 30/30) + periodic real exports + one aggregate batch export +
reload recovery (chip → UNKNOWN, no stale green) + persistent history (25 rows) + clear-history +
evidence viewer replay + all refusal cases. No stale green, no fake export, no raw logs / full SHA
in the founder view, no protected action. Verified: wave4-completion 20/20 (incl. 25/25 soak).
Full regression across suites: 123 checks GREEN (local-product-loop 20, wave4 20, end2end 27,
wave3 32, wave2 24); axe 0 serious/critical.
