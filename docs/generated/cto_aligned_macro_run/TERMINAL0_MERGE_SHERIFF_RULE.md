# Terminal-0 Merge Sheriff Rule
Terminal-0 is the sole integrator. Lane outputs are reconciled by Terminal-0; no lane overwrites another's files. Sensitive runtime files are locked to Terminal-0; the Checker reviews only; integration happens only after the read-only checker passes. Conflicts (none expected, disjoint paths) are recorded in INTEGRATION_CONFLICT_REGISTER.md.
