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
| 2026-07-07 | B2 | A11–A14 shell/projects/dashboard/status | src/v8a1/dashboard/ (V8A1-VIEW-MODEL-SELFTEST PASS 11) | #17 | d2ad41503caa2b9044ca30a69f4aa9a41a6940d2 | FounderGate CTO + CI (https://github.com/yosiwizman/foundergate/actions/runs/28891028148) | DONE |
| 2026-07-07 | B2 | A15/A16 view-only gates + CI/PR UNKNOWN + STALE (Law 54/55/68) | view-model.mjs; screenshot 03 disconnected=UNKNOWN | #17 | d2ad41503caa2b9044ca30a69f4aa9a41a6940d2 | FounderGate CTO + CI | DONE |
| 2026-07-07 | B2 | A17–A19 needs-you/do-not-touch/failure-modes(10) | src/v8a1/dashboard/app.js | #17 | d2ad41503caa2b9044ca30a69f4aa9a41a6940d2 | FounderGate CTO + CI | DONE |
| 2026-07-07 | B2 | A20–A23 Doctor/Panic(honest)/data-badges/cost(display-only) | src/v8a1/dashboard/ | #17 | d2ad41503caa2b9044ca30a69f4aa9a41a6940d2 | FounderGate CTO + CI | DONE |
| 2026-07-07 | B2 | A24 Playwright smoke screenshots (every screen) | docs/assembly-evidence/B2/screenshots/*.png (3) | #17 | d2ad41503caa2b9044ca30a69f4aa9a41a6940d2 | FounderGate CTO (Playwright) | DONE |
| 2026-07-07 | B12 UX repair | G2 attempt #1 defects fixed (layout/copy/styling of A11-A24 only) | docs/assembly-evidence/B2/bugs/g2-attempt-1.md (RESOLVED) | #18 | 170196f2f98e07322004b3b068b0963fce72cf62 | FounderGate CTO + CI (https://github.com/yosiwizman/foundergate/actions/runs/28898704211) | DONE |
| 2026-07-07 | B12 UX repair | app-shell + friendly copy + calm Pause + above-the-fold (1366x768) | src/v8a1/dashboard/ (V8A1-VIEW-MODEL-SELFTEST PASS 13) | #18 | 170196f2f98e07322004b3b068b0963fce72cf62 | FounderGate CTO + CI | DONE |
| 2026-07-07 | B12 UX repair | anti-repeat guards + refreshed screenshots + hand-burden | docs/assembly-evidence/B2/hand-burden.json + screenshots/*.png (4) | #18 | 170196f2f98e07322004b3b068b0963fce72cf62 | FounderGate CTO (Playwright) | DONE |
| 2026-07-07 | B3 | A27 exact-SHA CI green on final commit | main CI at 2991308 SUCCESS (https://github.com/yosiwizman/foundergate/actions/runs/28899979558) | #19 | 29913080d2a6a1031797d1e77edfcbfcbc672414 | FounderGate CTO + CI | DONE |
| 2026-07-07 | B3 | A28 V8-A1 acceptance packet (DoD 16/18 PASS, 2 honest PARTIAL) | docs/assembly-evidence/A28/V8-A1-acceptance-packet.md | #19 | 29913080d2a6a1031797d1e77edfcbfcbc672414 | FounderGate CTO | DONE |
| 2026-07-07 | Copy-polish | True-stranger test PASSED (7/7 unaided) | docs/assembly-evidence/B2/stranger-test-true-stranger.md | #20 | acd2b0419ed7edb2f8526a41c5d669e7fbe905d5 | true stranger + FounderGate CTO | DONE |
| 2026-07-07 | Copy-polish | Bounded visible-copy pass + 5 required-string anti-repeat guards | src/v8a1/dashboard/ (V8A1-VIEW-MODEL-SELFTEST PASS 17) | #20 | acd2b0419ed7edb2f8526a41c5d669e7fbe905d5 | FounderGate CTO + CI (https://github.com/yosiwizman/foundergate/actions/runs/28902439097) | DONE |
| 2026-07-07 | Copy-polish | A28 DoD #15 Stranger Test -> PASS (17/18 full) | docs/assembly-evidence/A28/V8-A1-acceptance-packet.md | #20 | acd2b0419ed7edb2f8526a41c5d669e7fbe905d5 | FounderGate CTO | DONE |
| 2026-07-08 | B4 | A30 V8-A2 proposal only (no code) | docs/lanes/V8-A2-proposal.md · docs/assembly-evidence/A30/V8-A2-proposal-evidence.md | #22 | bd582d3ea0f5e2e1e2cf8e4b207512aacc693546 | FounderGate CTO + CI | DONE |

**Legend:** `#15` and `6273b3808f2af8bad3983cfde41bbc44772a9dcc` are stamped with the real PR number and the exact merge commit SHA immediately
after the sheriff merge (living-ledger maintenance, not a second bundle PR). Until stamped they read as their
literal placeholder tokens, which count as UNKNOWN.
