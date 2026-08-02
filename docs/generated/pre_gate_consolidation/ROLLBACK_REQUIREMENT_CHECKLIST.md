# Rollback Requirement Checklist (must all hold before real execution)
- [ ] Capture prior state (content/existence) as a rollback token BEFORE acting.
- [ ] Action is on the non-destructive allowlist.
- [ ] Action runs only inside an explicitly-scoped disposable dir.
- [ ] Session token + loopback Origin required.
- [ ] Rollback restores prior content or removes a newly-created file.
- [ ] verifyRolledBack confirms pre-action state.
- [ ] If rollback cannot be guaranteed -> REFUSE.
Proven today only in SIMULATION.
