# Phase 7.1 Roadmap Reconciliation

**Status:** design record. Phase 7.1 Lane F. Every row uses a precise label — never "mostly done",
"nearly complete", "basically supported", or "almost ready".

Labels: `IMPLEMENTED` · `PROVEN` (runtime evidence on exact SHA) · `COMPATIBILITY_PREPARED` ·
`PLANNED` · `HELD` · `NOT_AUTHORIZED` · `UNKNOWN`.

| Artifact / capability | V8.11 section | Roadmap stage | Current consumer | Current proof | Future consumer | Remaining gate | Claim boundary (label) |
|---|---|---|---|---|---|---|---|
| Disk-first truth | Evidence discipline | Active | Safety Check service | `runs/<id>/` ledger + recovery, live run sc-0bc1b04f | all projects | none | **PROVEN** |
| Exact-SHA proof | Version integrity | Active | run-job.sh / evidence-pack | exact_commit + manifest sha256 on sc-0bc1b04f | all projects | none | **PROVEN** |
| Builder/checker separation | Governance | Active | Phase 7.1 lanes | independent checker returned FINDINGS→corrected | all projects | none | **PROVEN** |
| Terminal-0 merge sheriff | Governance | Active | PR #159 (unmerged) | main unchanged e1ca1989 | all merges | founder+T0 | **IMPLEMENTED** (policy) |
| Wide/narrow execution | Execution modes | Active | Lane F wide-safe; live run narrow | this doc + sc-0bc1b04f | all projects | none | **IMPLEMENTED** |
| Evidence Pack | Evidence engine | Active | evidence-pack.mjs | 6 formats on sc-0bc1b04f | all projects (namespaced) | none for core | **PROVEN** (core) / **COMPATIBILITY_PREPARED** (multi-project) |
| Founder control plane | Founder gate | Active | safety UI | neutral-first UI, results run-bound | all projects | founder witness | **IMPLEMENTED** |
| Safety Check | Runtime check | Active | fixed fixture | live run sc-0bc1b04f | second project, AKIOR | adapters + audit | **PROVEN** (fixture) / **COMPATIBILITY_PREPARED** (generic) |
| Endurance evidence | Reliability | Future | — | none | operators | soak run | **PLANNED** |
| Witness Engine | Witness | Active | witness package | WITNESS_CARD + indexes | all projects | founder witness | **COMPATIBILITY_PREPARED** |
| Second-project proof | Multi-project | Future | synthetic web adapter (test) | contract tests only | operator | live second run | **COMPATIBILITY_PREPARED** (contract) / **PLANNED** (live) |
| Outside-operator proof | Distribution | Future | one-click launcher | launcher builds; no external operator run | operators | operator trial | **COMPATIBILITY_PREPARED** |
| Private-repository intake | Intake | Future | — | none; explicitly HELD | customers | auth + policy | **HELD** |
| Customer repository support | Commercial | Future | — | none | customers | full program | **NOT_AUTHORIZED** |
| AKIOR adoption | Adoption | Future | schema-only descriptor | contract test (NOT_AUTHORIZED) | AKIOR | adapter + AKIOR-side audit | **NOT_AUTHORIZED** / **COMPATIBILITY_PREPARED** (descriptor) |
| Design-partner commercialization | Commercial | Future | DRAFT docs | 5 DRAFT docs, no payment | partners | human legal review | **PLANNED** (DRAFT) |
| Tamper-evident ledger | Integrity | Future | reserved pack fields | fields reserved, no signing | all projects | signing stage | **PLANNED** |
| Provider replacement | Sandbox | Active | OpenSandbox candidate | adapter seam + patch policy | operators | second provider | **COMPATIBILITY_PREPARED** |
| Worker expansion | Scale | Future | — | none | operators | scale design | **PLANNED** |

## Reconciliation notes
- **PROVEN** rows have live runtime evidence on an exact SHA (sc-0bc1b04f) or a governance fact
  (main unchanged, checker independence).
- **COMPATIBILITY_PREPARED** rows have a contract/seam + synthetic tests but **no live multi-project
  or external proof**.
- **PLANNED / HELD / NOT_AUTHORIZED** rows are explicitly not implemented and not claimed.
- No row is blurred. OpenSandbox remains a tested candidate, not an adopted dependency.
