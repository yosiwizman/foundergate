# FounderGate Demo Tasks

A tiny, self-owned, **non-sensitive** local JavaScript module for tracking task status and attaching evidence notes. It exists as a **safe demonstration target** for FounderGate Safety Check rehearsals — so a demo does not require a real design partner or a customer's repository.

## Properties (by design)
- **Local-only** — runs with plain Node.js, no install, no dependencies.
- **No network, no secrets, no auth, no database, no customer data, no deployment.**
- **Deterministic + pure** — easy to test and reason about.
- **Honest decision discipline** — the ledger's `decision()` never returns "SHIP"; the strongest local outcome is `ALL_DONE_LOCAL_DEMO`.

## Run it
```
cd demo/self_owned_public_demo_target
node cli.mjs                 # summarize the sample ledger
node tests/task-ledger.selftest.mjs   # run the self-test (expects ALL GREEN: 24/24)
```

## Files
- `src/task-ledger.mjs` — the module (addTask, setStatus, addEvidenceNote, summarize, decision).
- `cli.mjs` — reads a JSON ledger and prints a summary + honest decision.
- `sample-data.json` — synthetic, non-sensitive sample tasks.
- `tests/task-ledger.selftest.mjs` — 24 self-contained assertions.
- `DEMO_OBJECTIVES.md`, `SAFETY_CHECK_REHEARSAL.md`, `KNOWN_LIMITATIONS.md`, `FUTURE_PUBLIC_REPO_PLAN.md`.

## What this is NOT
Not production software, not customer-ready, not secure/compliant, not deployed. It is a clean demo fixture.
