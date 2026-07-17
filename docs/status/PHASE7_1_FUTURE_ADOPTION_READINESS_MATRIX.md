# Phase 7.1 Future Adoption Readiness Matrix

**Status:** design record. Phase 7.1 Lane F. Columns are literal booleans/labels — no vague status.

Legend: **Core contract** = project-neutral interface exists · **Fixture impl** = works for the
fixed Python fixture · **Neutral impl** = project-neutral implementation exists (not just fixture) ·
**Synthetic tests** = contract tests exist · **Live proof** = runtime evidence exists ·
**Ind. checker** = independent checker covered it · **Founder witness** = human witness done ·
labels: PROVEN / COMPATIBILITY_PREPARED / IMPLEMENTED / PLANNED / HELD / NOT_AUTHORIZED / UNKNOWN.

| Capability | Core contract | Fixture impl | Neutral impl | Synthetic tests | Live proof | Ind. checker | Founder witness | AKIOR impact | 2nd-project impact | Outside-operator impact | Next gate | Label |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Public source intake | YES | YES | PARTIAL | YES | YES (sc-0bc1b04f) | YES | PENDING | reuse | reuse | reuse | founder witness | PROVEN (fixture) |
| Private source intake | YES (declared HELD) | NO | NO | YES (test 20) | NO | YES | NO | new adapter+authz | new authz | new authz | policy+auth | HELD |
| Exact-version binding | YES | YES | YES | YES (test 03) | YES | YES | PENDING | reuse | reuse | reuse | none | PROVEN |
| Immutable snapshot | YES | YES | YES | YES (test 04) | YES | YES | PENDING | reuse | reuse | reuse | none | PROVEN |
| Project adapter | YES | YES (python) | PARTIAL | YES | YES (python) | YES | PENDING | new android adapter | new adapter | reuse core | split run-job.sh | COMPATIBILITY_PREPARED |
| Check-plan registry | YES | YES | YES | YES (10-15) | YES (python) | YES | PENDING | new modules | new modules | reuse | none | COMPATIBILITY_PREPARED |
| Sandbox-provider replacement | YES | YES (OpenSandbox cand.) | PARTIAL | (patch tests) | YES (candidate) | YES | PENDING | device adapter | 2nd provider | reuse | 2nd provider | COMPATIBILITY_PREPARED |
| Evidence Pack | YES | YES | YES | YES (16,17,18) | YES (6 formats) | YES | PENDING | namespaced ext | namespaced ext | reuse | none | PROVEN (core) |
| Evidence Pack download | YES | YES | YES | (Playwright) | YES | YES | PENDING | reuse | reuse | reuse | none | PROVEN |
| Job recovery | YES | YES | YES | (selftest) | YES | YES | PENDING | reuse | reuse | reuse | none | IMPLEMENTED |
| One-job lock | YES | YES | YES | (selftest) | YES | YES | PENDING | reuse | reuse | reuse | none | IMPLEMENTED |
| Cancellation/pause | YES | PARTIAL (request only) | PARTIAL | (Playwright) | PARTIAL | YES | PENDING | reuse | reuse | reuse | true cancel | COMPATIBILITY_PREPARED |
| Compileability checks | YES | YES | YES (python module) | YES (13) | YES | YES | PENDING | n/a (mobile) | per-language | reuse | none | PROVEN (python) |
| Build checks | YES (declared NOT_PROVEN) | NO | NO | YES (16) | NO | YES | NO | gradle audit | per-language | reuse | design | NOT YET IMPLEMENTED |
| Test execution | YES (declared NOT_PROVEN) | NO | NO | YES | NO | YES | NO | audit | design | reuse | design | NOT YET IMPLEMENTED |
| Security checks | YES (declared NOT_PROVEN) | NO | NO | YES | NO | YES | NO | expert | design | reuse | HUMAN_EXPERT | NOT YET IMPLEMENTED |
| Endurance checks | PARTIAL | NO | NO | NO | NO | NO | NO | audit | design | reuse | soak design | PLANNED |
| Mobile/Android checks | schema-only | NO | NO | YES (13,14,15) | NO | YES | NO | core requirement | n/a | n/a | AKIOR-side audit | NOT_AUTHORIZED |
| Outside-operator install | PARTIAL | YES (launcher) | YES | NO | NO (no ext operator) | YES | NO | reuse | reuse | operator trial | operator trial | COMPATIBILITY_PREPARED |
| Customer ledger | PARTIAL | NO | NO | NO | NO | NO | NO | audit | design | design | full program | PLANNED |
| Witness Engine | YES | YES | PARTIAL | NO | PARTIAL (package) | YES | PENDING | reuse | reuse | reuse | founder witness | COMPATIBILITY_PREPARED |
| Tamper evidence | reserved fields | NO | NO | NO | NO | NO | NO | reuse | reuse | reuse | signing stage | PLANNED |
| Billing | NO | NO | NO | NO | NO | NO | NO | n/a | n/a | design | human legal | PLANNED (DRAFT, no payment) |
| Support & incident handling | NO | NO | NO | NO | NO | NO | NO | n/a | design | design | program | PLANNED |

## Reading the matrix
- **PROVEN** capabilities have live runtime evidence (sc-0bc1b04f) or a passing selftest/Playwright.
- **COMPATIBILITY_PREPARED** = contract + (usually) synthetic tests, but no live multi-project or
  external-operator proof.
- **NOT YET IMPLEMENTED / PLANNED / HELD / NOT_AUTHORIZED** are stated plainly and never inflated.
- The four founder-witness-critical claims (build, tests, security, production) are **NOT_PROVEN**
  and remain so in the UI and Evidence Pack.
