# Customer Intake Trust Boundaries (design)

**Status:** DESIGN · Phase 5 · no runtime. Twelve boundaries a public-repo intake crosses. PLANNED architecture; nothing is deployed and no customer code executes.

## Boundary map (text)
```
[12 Founder approval authority]
      ▲ accept/reject (separate from execution & intake)
      │ hashed intake evidence
[1 Founder-facing intake UI] → [2 Intake API] → [3 Source-provider adapter] → [4 GitHub public endpoint]
                                     │                     │ read-only HTTPS (no creds)
                                     │                     ▼
                                     │            [5 Temporary acquisition workspace]  (disposable, outside FG home/src)
                                     │                     │ exact-commit archive + digest
                                     │                     ▼
                                     │            [6 Immutable snapshot]  (by SHA-256, bound to exact commit)
                                     │                     │
                                     │            [7 Risk classifier]  (static indicators only; no execution)
                                     │                     ▼
                                     │            [8 Sandbox-provider adapter] → [9 Disposable run host]  (LATER gated stage)
                                     │                                                   │ evidence
                                     │            [10 Evidence collector] ───────────────┘
                                     ▼                     │ hashed
                              [11 Evidence ledger]  ◄──────┘  (append-only)
```

## Per-boundary specification
| # | Boundary | Data entering | Data leaving | Authority entering | Authority forbidden | Credentials | Retention | Deletion required | Proof required | Failure state |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Founder intake UI | URL, declared fields | intake request | founder request only | execution/accept authority | none | request record | n/a | request logged | reject malformed input |
| 2 | Intake API | intake request | neutral calls | orchestration only | founder-acceptance | none | request+decisions | n/a | request id | reject/HOLD |
| 3 | Source-provider adapter | normalized request | neutral observations | the calls it makes | provider self-acceptance; writing FG source | none (public path) | none | n/a | schema-valid responses | provider-neutral error |
| 4 | GitHub public endpoint | read-only queries | archive/metadata | none (untrusted source) | any write-back | **none** (public) | none | n/a | exact-commit resolved | reject on ambiguity |
| 5 | Temp acquisition workspace | archive bytes | verified snapshot | disposable FS only | reading FG source; being under FG home/src | none | short TTL | **YES** | deletion proof | reject unsafe entries |
| 6 | Immutable snapshot | verified bytes | digest + manifest | none | mutation | none | until analysis done | YES (after) | digest bound to commit | reject no-digest |
| 7 | Risk classifier | snapshot | indicators | read-only | executing code | none | classifications | n/a | deterministic manifest | HOLD on secret/submodule/LFS |
| 8 | Sandbox-provider adapter | immutable snapshot (digest) | neutral evidence | the calls it makes | provider self-acceptance | none unless later-gated | n/a | n/a | neutral types | UNKNOWN/NOT-PASSED |
| 9 | Disposable run host | snapshot | evidence | its own OS only | FG merge/signature authority | none | destroyed after run | YES (host) | host destroyed | UNKNOWN if unproven |
| 10 | Evidence collector | evidence streams | hashed evidence | read-only | altering a verdict | none | export before host destroy | n/a | hashes | INCOMPLETE ⇒ not-passed |
| 11 | Evidence ledger | hashed evidence | evidence for checking | append-only write | provider self-certification | none | durable | n/a | append-only integrity | n/a |
| 12 | Founder approval | hashed evidence | accept/reject | **final acceptance** | intake/execution authority | none | decision | n/a | founder decision | human judgment |

## Mandatory rules
- **No customer repository is mounted from the live FounderGate filesystem**; no repo is placed in the founder's normal home project directory; **no customer repository can read FounderGate source**.
- **No customer code executes during intake.** Exact commit required. Exact snapshot digest required. Temporary acquisition directory required (disposable, isolated).
- **Deny symlink / path-traversal escape.** **Default-deny network** at the later execution stage.
- The **source provider cannot approve** work; the **sandbox provider cannot approve** work; the **evidence collector cannot accept** work; **founder acceptance remains separate** — no provider may write the founder-acceptance field.
