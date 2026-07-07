# Evidence Ledger (FounderGate-CTO-maintained)

> **Plain English.** This is the living evidence record for the Assembly Manual V1.2 bundle run. The FounderGate
> CTO (Harvest Terminal) maintains it automatically; the founder reads it only at gates. **No DONE row may exist
> without an evidence path and an exact SHA. Anything not checked in the current run is UNKNOWN.**
>
> This is the *live* ledger. The template lives in Assembly Manual §16 (`docs/ASSEMBLY_MANUAL.md`), which is kept
> byte-identical and is therefore not edited in place.

| Date | Bundle | Substep | Evidence file/path | PR # | Exact SHA | Verified by | Label (DONE / UNKNOWN / STALE / FAILED) |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| 2026-07-07 | B0 | A0 — Roadmap approval + commit prep | docs/assembly-evidence/B0/ | #15 | 6273b3808f2af8bad3983cfde41bbc44772a9dcc | FounderGate CTO (Harvest Terminal) | DONE |
| 2026-07-07 | B0 | A1 — Commit V8.11 to docs/ROADMAP.md (byte-identical) | docs/ROADMAP.md (sha256 verified identical to source) | #15 | 6273b3808f2af8bad3983cfde41bbc44772a9dcc | FounderGate CTO (Harvest Terminal) | DONE |
| 2026-07-07 | B0 | A1 — Assembly Manual + architecture note + validation | docs/ASSEMBLY_MANUAL.md · docs/architecture/MACHINE_CAPACITY_AND_LANE_SCHEDULER.md · docs/assembly-evidence/ASSEMBLY_MANUAL_V1_2_VALIDATION.md (18 PASS / 0 FAIL) | #15 | 6273b3808f2af8bad3983cfde41bbc44772a9dcc | FounderGate CTO (Harvest Terminal) | DONE |
| 2026-07-07 | B0 | A2 — V8-A1 lane packet (quotes §16.0 only) | docs/lanes/V8-A1-lane-packet.md | #15 | 6273b3808f2af8bad3983cfde41bbc44772a9dcc | FounderGate CTO (Harvest Terminal) | DONE |
| 2026-07-07 | B0 | Machine Capacity Preflight | docs/assembly-evidence/B0/machine-capacity-profile.json (macOS, 12 cores, 24 GB; recommended_parallel_lanes 3; safe_mode false) | #15 | 6273b3808f2af8bad3983cfde41bbc44772a9dcc | FounderGate CTO (Harvest Terminal) | DONE |
| 2026-07-07 | B1 | A4–A6 schemas+validator | src/v8a1/schemas/ · src/v8a1/validate.mjs (V8A1-VALIDATOR-SELFTEST PASS 9) | #16 | d6f06cfac79becf62f5556bd0014c13407b5fb0d | FounderGate CTO + CI (https://github.com/yosiwizman/foundergate/actions/runs/28890531536) | DONE |
| 2026-07-07 | B1 | A7 schema-first machine gate (Law 53) | src/v8a1/schema-first-gate.mjs (SCHEMA-FIRST-GATE PASS; CI green at exact SHA) | #16 | d6f06cfac79becf62f5556bd0014c13407b5fb0d | FounderGate CTO + CI | DONE |
| 2026-07-07 | B1 | A8 attach-one registry | src/v8a1/registry.mjs (V8A1-REGISTRY-SELFTEST PASS 5; 2nd repo rejected) | #16 | d6f06cfac79becf62f5556bd0014c13407b5fb0d | FounderGate CTO + CI | DONE |
| 2026-07-07 | B1 | A9 project/status reader | src/v8a1/reader.mjs (V8A1-READER-SELFTEST PASS 7; missing→UNKNOWN) | #16 | d6f06cfac79becf62f5556bd0014c13407b5fb0d | FounderGate CTO + CI | DONE |
| 2026-07-07 | B1 | A10 cannot-invent-state (Law 54) | src/v8a1/cannot-invent-state.selftest.mjs (PASS 5; CI) | #16 | d6f06cfac79becf62f5556bd0014c13407b5fb0d | FounderGate CTO + CI | DONE |

**Legend:** `#15` and `6273b3808f2af8bad3983cfde41bbc44772a9dcc` are stamped with the real PR number and the exact merge commit SHA immediately
after the sheriff merge (living-ledger maintenance, not a second bundle PR). Until stamped they read as their
literal placeholder tokens, which count as UNKNOWN.
