# Runtime Machine-Evidence Contract (TBF-1)

Runtime-affecting work must produce, bound to the exact candidate SHA:
unit; integration; bounded live runtime **where authorized only**; negative; fault injection;
crash recovery; rollback; cleanup; **teardown** (verified before any green); orphan detection;
resource limits; **exact-version proof**; and an **independent checker**. Missing teardown, missing
crash-recovery proof, or an unverified exact version blocks readiness. A live runtime may run only
under explicit authorization; otherwise that class is `BLOCKED`, never waived to PASS.
