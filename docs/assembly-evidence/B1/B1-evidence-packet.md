# B1 Evidence Packet — Schema Foundation (phase of parent bundle B12)

> **Plain English.** This phase built the *foundation* under the dashboard: the `.foundergate` schemas, a mock
> project that passes them, a validator that bites both ways, a reader that never invents state, an attach-one
> registry, and the schema-first machine gate. No UI yet — that is phase B2. Everything here is proven by a
> self-test that runs green in this repo and in CI.

## Substeps A4–A10

| Substep | What was built | Where | Proof |
|---------|----------------|-------|-------|
| A4 | `.foundergate` schema set (12-item subset: 7 file schemas + 3 folder-entry schemas + validator + fixture) | `src/v8a1/schemas/` | `validate.selftest` — 10 schemas exist |
| A5 | Fixture project, **MOCK_ONLY** (no real data) | `src/v8a1/fixture/mock-project/.foundergate/` | every file `"mock": true`, class `MOCK_ONLY` |
| A6 | Schema validator + self-test (**pass AND fail** directions) | `src/v8a1/validate.mjs` · `validate.selftest.mjs` | 9 checks — accepts fixture, rejects bad enum/const/missing/extra |
| A7 | Schema-first machine gate (**Law 53** — no schema, no UI) | `src/v8a1/schema-first-gate.mjs` · `.selftest.mjs` | `SCHEMA-FIRST-GATE: PASS`; runs in CI |
| A8 | Attach-one-repo registry (read-only; rejects a 2nd repo) | `src/v8a1/registry.mjs` · `registry.selftest.mjs` | 5 checks — 2nd repo rejected; attach writes nothing |
| A9 | Repo-local project/status reader (missing → UNKNOWN) | `src/v8a1/reader.mjs` · `reader.selftest.mjs` | 7 checks — 8 questions in order, honest UNKNOWN |
| A10 | Cannot-invent-state guard (**Law 54**, runs in CI) | `src/v8a1/cannot-invent-state.selftest.mjs` | 5 checks — missing→UNKNOWN, CI/PR UNKNOWN, stale→STALE, no fabricated positives |

## Self-test results (this repo, standalone) — see `selftests/*.out.txt`

```
V8A1-VALIDATOR-SELFTEST: PASS (9 checks)
V8A1-READER-SELFTEST: PASS (7 checks)
V8A1-CANNOT-INVENT-STATE-SELFTEST: PASS (5 checks)
V8A1-REGISTRY-SELFTEST: PASS (5 checks)
V8A1-SCHEMA-FIRST-GATE-SELFTEST: PASS (2 checks)
```
Full suite via `npm test`: **ALL GREEN — 18/18 self-tests** (13 harvested components + 5 V8-A1 B1 self-tests).

## Machine gate (A7) — CI link at exact SHA

The schema-first gate and cannot-invent-state test run in the `selftests` CI job on this PR at its exact head
SHA. **CI link + exact SHA are stamped below on merge** (living-evidence maintenance, per the B0 pattern):

- Machine-capacity preflight: `docs/assembly-evidence/B1/machine-capacity-profile.json`
- PR: `#16` · exact merge SHA: `d6f06cfac79becf62f5556bd0014c13407b5fb0d` · CI: https://github.com/yosiwizman/foundergate/actions/runs/28890531536

## Scope honesty

No UI was built in B1. No real project data. No write into any attached repo. Cost guard exists only as a schema
field constrained to `policy-display-only`. Gate entries are `view_only: true` (Law 55). Nothing beyond the
Section 16.0 / 12-item subset was implemented.
