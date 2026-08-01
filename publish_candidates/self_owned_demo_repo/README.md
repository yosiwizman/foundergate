# Demo Tasks

A tiny, dependency-free JavaScript module for tracking task status and attaching short evidence notes. It is a small, self-contained demonstration of clean, testable, honest local code.

## Properties
- **Local-only** — plain Node.js, no install, no dependencies.
- **No network, no secrets, no auth, no database, no data collection.**
- **Deterministic + pure** — easy to test and reason about.
- **Honest status** — the ledger's `decision()` reports `INSUFFICIENT`, `DO_NOT_SHIP`, `IN_PROGRESS`, or `ALL_DONE_LOCAL_DEMO`. It never reports "SHIP"; the strongest local outcome is `ALL_DONE_LOCAL_DEMO`.

## Run
```
node cli.mjs                          # summarize the sample ledger
node tests/task-ledger.selftest.mjs   # run the self-test (expects ALL GREEN: 30/30)
```

## Files
- `src/task-ledger.mjs` — the module (addTask, removeTask, setStatus, addEvidenceNote, summarize, decision).
- `cli.mjs` — reads a JSON ledger and prints a summary.
- `sample-data.json` — synthetic, non-sensitive sample tasks.
- `tests/task-ledger.selftest.mjs` — 30 self-contained assertions.

## License
MIT (see LICENSE).
