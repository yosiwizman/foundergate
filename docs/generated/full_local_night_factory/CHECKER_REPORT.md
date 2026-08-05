# Independent Checker Report — Full Local Night Factory (final, cycle 2)
**Reviewer:** independent read-only Checker (`a696b619f4efbb8b6`), fresh context; did not repair the candidate.
**Evaluated SHA:** `ed5248c462e647a5b148b1df7bcd3c71c481ad2b` (parent = cycle-1 candidate `02d21125`).
**Verdict: CLEAN_WITH_LIMITS.**

- Original HOLD_CORRECTABLE (a re-sealed capsule surfaced an attacker-mutable status beside OVERALL:PASS with no caveat) is **resolved** by the always-on authenticity caveat: `status_label_authenticated:false` + explicit NOTE + CLI "surfaced status (NOT authenticated)" + evaluated_sha cross-check guidance — present on EVERY run incl. forgeries. This is the load-bearing control.
- The prior denylist evasions (ALL_GREEN_READY_FOR_PRODUCTION, LIVE_GITHUB_APP_INTAKE_PROVED, ROUTE_DONE_SHIP_IT, …) are now BLOCKED (status_label_recognized_shape FAIL).
- Known-good statuses PASS (not over-strict): LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS, FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS, TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED, AUTHORIZED_MACRO_QUEUE_EXHAUSTED_WITH_FULL_PROGRAM_PROOF.
- Self-test 15/15; real GitHub App capsule OVERALL PASS (10/10, inner self-tests executed); read-only + safe; isolation intact (only tools/evidence + tests/tools + docs/generated/full_local_night_factory changed); origin/main == 65fd01669f80; PR #200 OPEN/DRAFT; no PR; no real secret.
- Full-program exhaustion (A–I) stands; could not name a missed eligible WIDE_SAFE local task.

**Residual limitation (reported, NON-BLOCKING).** The recognized-shape allowlist is decoratable — appending `_WITH_LIMITS` (or matching `*_REQUIRED`/`HOLD*`/`WAIT*`/`TRUE_FOUNDER_GATE*`/`*_EXHAUSTED*`) makes any overclaim string PASS the shape check (e.g. `PRODUCTION_READY_WITH_LIMITS`). Because the status is ALWAYS disclaimed as NOT authenticated, this is not a true false-green. **The Checker explicitly recommends AGAINST further shape-tweaking cycles** (free-text status labels cannot be robustly validated by any pattern; the treadmill adds no safety). The only sound control is the authenticity caveat (already implemented + load-bearing). Optional future hardening: exact-match against a finite enumerated set of real status literals. The doc already frames the shape guard honestly as "(ALLOWLIST, best-effort)" and states the caveat, not the shape guard, is load-bearing.

**CHECKER_VERDICT: CLEAN_WITH_LIMITS**
