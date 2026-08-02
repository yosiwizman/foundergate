# Founder Dashboard — Truth Table (anti-false-green)
| freshness | tests | checker | gate | => ready? |
|-----------|-------|---------|------|-----------|
| FRESH | all-pass | CLEAN | READY | GREEN (ready=true) |
| STALE | all-pass | CLEAN | READY | NOT ready |
| FRESH | 29/30 | CLEAN | READY | NOT ready |
| FRESH | all-pass | FINDINGS | READY | NOT ready |
| FRESH | all-pass | CLEAN | HOLD | NOT ready |
| UNKNOWN (any signal missing) | — | — | — | NOT ready; signal listed in unknowns[] |
| invalid value (e.g. tests passed>total, freshness="green") | — | — | — | UNKNOWN, never fake green |
Verified by 14/14 self-tests. Green requires ALL four load-bearing signals affirmatively good.
