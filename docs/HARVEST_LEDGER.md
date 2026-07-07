# Harvest Ledger

**Plain English — what this is:** the running, append-only record of every component copied from the source
harness into FounderGate — where it came from, what changed to decouple it, whether the secret scan was clean,
and whether its self-test ran **green in this repo**. If it isn't in this ledger with a green self-test, it is
not extracted.

**Why it matters:** this is the founder's single source of truth for "what is actually real here." It is the
honest counterweight to any roadmap percentage.

**What can go wrong:** a component logged as done without a green-in-this-repo self-test. Guard: every row must
cite the self-test result observed *here*, not in AKIOR.

---

## Legend

- **Difficulty:** CLEAN (no AKIOR coupling) · LIGHT-DECOUPLE (generic renames/paths) · HEAVY-COUPLED (parked).
- **Scan:** result of the safety-patch secret/coupling scan over the staged changes.
- **Self-test:** result observed by running the component's self-test **standalone in this repo**.

## Components

| # | Component | Source path | New path | Difficulty | Decoupling changes | Scan | Self-test (this repo) | Date |
|---|-----------|-------------|----------|-----------|--------------------|------|-----------------------|------|
| — | _(none extracted yet)_ | | | | | | | |

## Scan log

| Date | Commit / branch | Scan result | Notes |
|------|-----------------|-------------|-------|
| 2026-07-06 | `main` bootstrap | CLEAN | Matches were `.gitignore` exclusion rules + README policy text; no secrets/couplings. |
| 2026-07-06 | `mission1-foundation-records` | CLEAN | Docs-only (foundation records). Scan matches were prose ("risk-classifier", "risk. The"); no secrets/couplings. |
