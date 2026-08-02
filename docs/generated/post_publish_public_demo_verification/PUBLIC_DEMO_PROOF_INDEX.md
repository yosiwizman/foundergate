# Public Demo Proof Index
- Public repo: https://github.com/yosiwizman/task-ledger-demo
- Published commit: 0bb2817174c95f121b05de28686f706aeec82dd5
- Visibility: PUBLIC · Owner: yosiwizman (founder's own account)

## What this proves
- A real, publicly reachable GitHub repository exists under the founder's own account.
- Anyone can clone it and independently run its self-test to 30/30 green with no dependencies and no install.
- The published code is dependency-free, network-free, secret-free, and makes only honest claims.
- FounderGate's honesty discipline holds in public: decision() never returns SHIP.

## What this does NOT prove
- NOT production software, NOT a deployed service, NOT secure/hardened, NOT compliant/certified.
- NOT customer validation, NOT revenue, NOT market validation, NOT a SaaS.
- NOT cross-account (AKIOR) proof — this is a single self-owned demo repo.
- NOT evidence about FounderGate's private runtime, provider integration, or beta.

## Test result
- Fresh clone → `node tests/task-ledger.selftest.mjs` → ALL GREEN: 30/30.

## Scan result
- Secrets 0 · internal-refs 0 · network/exec 0 · positive-overclaims 0 · SHIP-claims 0.

## How a reviewer/investor should read it
- Treat it as a small, honest engineering-hygiene artifact: clean testable code, published transparently, with its own limitations stated up front.
- It demonstrates process discipline (honest claims, self-verifying tests, no secret leakage) — not commercial readiness.

## Why this is not production/SaaS/customer validation
- It is an in-memory demo module with synthetic data, no persistence, no auth, no network, no multi-user handling — and it says so in KNOWN_LIMITATIONS.
