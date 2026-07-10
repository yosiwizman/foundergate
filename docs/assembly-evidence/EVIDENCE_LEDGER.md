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
| 2026-07-08 | B5 | V8-A2 build contract + lane packet (no code) | docs/lanes/V8-A2-lane-packet.md (incl. SENSITIVITY RULING; PA/BC/AC DAG) | #23 | 5048355706b8734d11d1f81092706b5f40279fa7 | FounderGate CTO + CI | DONE |
| 2026-07-08 | A2-PA | Preview Bay PA1-PA7 (allowlist-only, no-live, tracked-process) | src/v8a2/preview/ + server.mjs; PREVIEW-CONTROLLER(10)/SERVER(4)/NO-LIVE-PATH(7)/SCHEMA(4) | #24 | 89c7c8621d7e03554f40bb7413161c9544499e4d | Builder + INDEPENDENT CHECKER (round-2 PASS) + CI | DONE |
| 2026-07-08 | A2-PA | Independent checker report (7 findings fixed) | docs/assembly-evidence/A2-PA/checker-report.md (+ -round2.md) | #24 | 89c7c8621d7e03554f40bb7413161c9544499e4d | Independent checker | DONE |
| 2026-07-08 | A2-PA | Preview screenshots (idle/running/failure) | docs/assembly-evidence/A2-PA/screenshots/*.png | #24 | 89c7c8621d7e03554f40bb7413161c9544499e4d | Playwright | DONE |
| 2026-07-08 | A2-BC | Bug Collector BC1-BC6 (capture→C3 classify→store) | src/v8a2/bugs/ (V8A2-BUG-COLLECTOR-SELFTEST PASS 6); capture-only, fail-closed | #25 | 270719db9f6f4a851810d067950c82e72cff063c | Builder + CI | DONE |
| 2026-07-08 | A2-BC | Bug-captured screenshots | docs/assembly-evidence/A2-BC/screenshots/*.png | #25 | 270719db9f6f4a851810d067950c82e72cff063c | Playwright | DONE |
| 2026-07-08 | A2-AC | Cannot-invent-state for V8-A2 surfaces (Law 54) | src/v8a2/cannot-invent-state.selftest.mjs (PASS 5) | #26 | dba8720f430ad80e8449cb3d79120035c97a91c2 | Builder + CI | DONE |
| 2026-07-08 | A2-AC | V8-A2 acceptance packet + exact-SHA CI | docs/assembly-evidence/A2/V8-A2-acceptance-packet.md; CI success at dba8720 (https://github.com/yosiwizman/foundergate/actions/runs/28961920072) | #26 | dba8720f430ad80e8449cb3d79120035c97a91c2 | FounderGate CTO + CI | DONE |
| 2026-07-08 | A2-CLOSE | V8-A2 CLOSED — G2-A2 PASSED; dual-pin + raw verification | docs/assembly-evidence/A2/V8-A2-acceptance-packet.md + verification/* | — | dba8720 | Founder (G2-A2) + FounderGate CTO | DONE |
| 2026-07-08 | A3-PROPOSAL | V8-A3 File Cabinet proposal only (no code) | docs/lanes/V8-A3-proposal.md · docs/assembly-evidence/A3/V8-A3-proposal-evidence.md | #28 | 5e6d86716b5ad9ac305545cbd51af08e0558cb0b | FounderGate CTO + CI | DONE |
| 2026-07-08 | A3-PACKET | V8-A3 build contract + lane packet (no code) | docs/lanes/V8-A3-lane-packet.md (SENSITIVITY RULING; FC-CLASS/FC-UI/AC DAG) | #29 | aa8fcc182dad97c8c4aada528b5b81fc297dff9d | FounderGate CTO + CI | DONE |
| 2026-07-10 | A3-FC-CLASS | File Cabinet classification+access (fail-safe; no-secret-leak proof) | src/v8a3/filecabinet/cabinet.mjs; CLASSIFY(11)/NO-SECRET-LEAK(9) | #31 | b5497161253ac1177313f2026af1da5616bd59f6 | Builder + INDEPENDENT CHECKER (round-2 PASS) + CI | DONE |
| 2026-07-10 | A3-FC-CLASS | Independent checker report (2 HIGH leaks fixed) | docs/assembly-evidence/A3-FC/checker-report.md (+ -round2.md) | #31 | b5497161253ac1177313f2026af1da5616bd59f6 | Independent checker | DONE || 2026-07-10 | A3-FC-UI | File Cabinet browse/preview (badges, safe preview, gated copy/download) | src/v8a3/filecabinet/ (tree 6 / server 4 / smoke) | #32 | e92f8b9c0df81950adb2dc9a99491674cfd4bc20 | Builder + CI | DONE |
| 2026-07-10 | A3-AC | Law-54 + V8-A3 acceptance packet; exact-SHA CI green | docs/assembly-evidence/A3/V8-A3-acceptance-packet.md; CI success at e92f8b9 (https://github.com/yosiwizman/foundergate/actions/runs/29097063338) | #32 | e92f8b9c0df81950adb2dc9a99491674cfd4bc20 | FounderGate CTO + CI | DONE |
| 2026-07-10 | A3-PARALLEL | 4 wide-safe lanes during G2-A3 window: guard hardening (SHA/PR/empty-stamp) + stamp-helper empty-refusal; V8-A4 draft proposal; Archive Master v4; V8-A3 advisor-audit prompt | src/tools/evidence-integrity.selftest.mjs · scripts/stamp.mjs · docs/lanes/V8-A4-proposal.md · docs/ARCHIVE_MASTER.md · docs/assembly-evidence/A3/advisor-audit-prompt.md | #33 | 823fa4b0c67266152c9d4da25fea353d2dac2802 | FounderGate CTO + CI (https://github.com/yosiwizman/foundergate/actions/runs/29098222302) | DONE |

**Legend:** `#15` and `6273b3808f2af8bad3983cfde41bbc44772a9dcc` are stamped with the real PR number and the exact merge commit SHA immediately
after the sheriff merge (living-ledger maintenance, not a second bundle PR). Until stamped they read as their
literal placeholder tokens, which count as UNKNOWN.
