# Parallel-Safe Lane Standard
Non-sensitive lanes (docs/fixtures/static UI) run with disjoint paths under Terminal-0 as sole integrator. Sensitive runtime is single-writer + independent checker. Read-only Agents (Checker/Advisor) never write code. No two lanes share a file.
