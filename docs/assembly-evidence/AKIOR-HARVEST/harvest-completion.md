# AKIOR-HARVEST — completion report

**Bundle:** AKIOR-HARVEST (PART A adopt-now wide-safe + PART B pattern-authority-only contract citations).
**Authority:** the AKIOR harness harvest report, committed verbatim FIRST (§28) —
`docs/lanes/authority/akior-harness-harvest-report.md`. Lane PR + SHA are stamped into these rows and the
Evidence-Ledger row after this PR merges.

## PART A — adopt-now (wide-safe; real FounderGate code/process)
| Lane | What landed | Evidence (file) | Authority (path) |
|---|---|---|---|
| Reliability soak accumulator (#5) | Pure rolling accumulator: folds health-sample windows over wall-clock into an SLO verdict; emits a §29-valid `<N>-HOUR SOAK PASS` line ONLY when the run spans the claim + meets the SLO, else an honest NOT-PASSED line — the tool the soak-proof law demanded (dogfooded against `validateSoakClaims`) | `src/tools/reliability-soak.mjs` + `reliability-soak.selftest.mjs` | `docs/lanes/authority/akior-harness-harvest-report.md` |
| CI ops (#9) | `concurrency` group + `cancel-in-progress` on the selftests workflow (coalesce redundant runs); gitignore `*.copy` / `cycle-*` so secret-shaped scratch files can't be swept in | `.github/workflows/selftests.yml` + `.gitignore` | `docs/lanes/authority/akior-harness-harvest-report.md` |
| Harness stress log (#6) + auditor fan-out (#10) | A redline log treating breakage as DATA, seeded with adopted doctrine (never `git add -A`; hermetic mocks mask contract bugs; CI coalescing; worktree hygiene; wide read-only auditor fan-out) AND 5 real stress events from this session (VB0 checker HIGH, provenance false-positives, fixture corruption, all-digit-SHA, `git add -A` sweeps) | `docs/status/HARNESS_STRESS_LOG.md` | `docs/lanes/authority/akior-harness-harvest-report.md` |

## PART B — pattern-authority-only (contract citations; code built under each gate)
The V8-B contract now cites the sensitive AKIOR patterns as **pattern authority** (built under their own gates, not
now): rate-limiter/interruption-recovery (#1), session-token/boot-id preflight (#2), rollback-snapshot fail-closed
drill (#3), single-executor write-intent containment (#4), atomic-store lock (#8), and front-UI fail-closed witness
detectors (#7). See `docs/lanes/V8-B-build-contract.md` → "Adopted harness patterns (AKIOR-HARVEST — pattern
authority)". VB1's §29 soak requirement now names the committed accumulator as its tool.

## Verification
Suite 55/55 green (54 prior + the soak accumulator proof). The soak accumulator is dogfooded against §29
(`validateSoakClaims`): a spanning+SLO-met run emits a valid PASS; a short or SLO-missed run never emits "SOAK PASS".
Nothing here touches an executor/token/live path — PART B is docs-only pattern citations; the sensitive code is
built later under `G1-B-*` gates.
