# Demo Target Report — FounderGate Demo Tasks

**What was built:** a self-owned, non-sensitive, local-only JavaScript task-ledger module to serve as a standing FounderGate Safety Check rehearsal target — so demos/rehearsals need no real design partner or customer repo. No prospect was invented.

## Contents
| File | Purpose |
|------|---------|
| src/task-ledger.mjs | Pure module: addTask/setStatus/addEvidenceNote/summarize/decision (never returns SHIP). |
| cli.mjs | Reads a JSON ledger, prints summary + honest decision. |
| sample-data.json | Synthetic, non-sensitive sample tasks. |
| package.json | Local scripts only; **0 dependencies**. |
| tests/task-ledger.selftest.mjs | 24 self-contained assertions. |
| README / DEMO_OBJECTIVES / SAFETY_CHECK_REHEARSAL / KNOWN_LIMITATIONS / FUTURE_PUBLIC_REPO_PLAN | Docs. |

## Verification
- Demo self-test: **24/24 green**.
- CLI smoke: runs, prints honest `IN_PROGRESS` on sample data (40% done).
- Full FounderGate suite (regression): **117/117 green**.
- Scans: secret **0**, network-in-code **0**, dependencies **0**, forbidden-claim **0** — all 0.

## Properties held
Non-sensitive · local-only · no network · no secrets · no auth · no database · no customer data · no deployment. Honest decision discipline preserved (no SHIP).

## Role
This replaces a missing design-partner repo **for rehearsal only**. It proves the process/tooling/honesty work on a real self-owned codebase; it does NOT prove external demand, willingness-to-pay, security, compliance, or production readiness.
