# SD-1 INDEPENDENT ADVERSARIAL CHECKER REPORT

> Independent checker ≠ builder. Read-only review of the SD-1 fix diff + surrounding code + the guard.
> Committed verbatim as evidence. Its job was to BREAK the fix, not welcome it.

**VERDICT: CLEAN**

`npm test` was run on the current working tree: **GREEN, 83/83 self-tests passed.** The soak-driver selftest alone is **21 checks PASS** (was 17; +4 SD-1 checks). Diff is scoped to exactly two files: `src/tools/soak-driver.mjs` (+26 lines) and `src/tools/soak-driver.selftest.mjs` (+59 lines).

## Attack-area findings

1. **Sentinel masking/displacing a real intervention — PASS (no hole).** Both the sentinel and real records use `appendFileSync` on the same path; appends never truncate. `openInterventionLog` runs in `run()` immediately after `run_id` is known and *before* the monitor loop, attestation, or any `intervention()` call in the started-run path — so the sentinel is always line 1. The `interventionLogOpened` flag (closure-local per `makeEvidence`) makes it write-at-most-once; a fresh `makeEvidence` per run means no cross-run leakage. No path emits a real intervention before the sentinel in an acquired run (pre-acquisition `intervention()` calls only occur on refusal, which returns early and never reaches `openInterventionLog`).

2. **0-byte / absent log for a started or verdict-named run — PASS (no hole).** Enumerated every path:
   - *Normal PASS, zero interventions:* sentinel → 1-line non-empty file; VERDICT.txt names it. ✓
   - *NOT-PASSED with interventions:* sentinel + `kind` records, non-empty; named. ✓
   - *caffeinate-not-held refusal:* `intervention("CAFFEINATE_NOT_HELD")` creates the file non-empty; refusal VERDICT.txt names it via default `failuresRef`. ✓
   - *acquisition/preflight refusal:* `intervention("ACQUISITION_REFUSED")` → non-empty; named. ✓ Both `acquireGuardedLease` false-returns are preceded by an `intervention()` call, so no refusal exits with an empty log.
   - *fatal before run start* (HEAD mismatch, dirty scope, secret leak): outer catch `intervention("FATAL_ERROR")` creates the file non-empty; the fatal VERDICT.txt deliberately does **not** name `intervention-log.jsonl`, so no manifest-vs-file inconsistency. ✓
   - *fatal after run start:* sentinel already present + FATAL_ERROR line → non-empty. ✓
   No written VERDICT.txt names a file that is absent or 0-byte.

3. **Counter/verdict confusing sentinel with an intervention — PASS (no hole).** The AND-gate `isPass = accumulatorPassed && quietEligible && drift.ok` draws from `soak.passed(soakState)` (reads `statePath`, not the log), `monitor.snapshot()`, and `recheckFreezeDrift` — none read `intervention-log.jsonl`. `isSoakEligible` reads attestation entries, not the log. Confirmed in the *real* emitted records, not just tests: sentinel = `{type:"log-opened", note, ts, run_id}` (**no `kind`**); real intervention = `{at, kind, detail}` (**no `type`**). A `kind`-keyed reader never counts the sentinel. Verified live: sentinel serializes non-empty, `"kind" in sentinel === false`, `type === "log-opened"`.

4. **Emitter/manifest/log triangle consistent on PASS and both NOT-PASSED paths — PASS.** PASS and refusal NOT-PASSED both name `intervention-log.jsonl` and the file is present + non-empty on disk in each (sentinel resp. refusal record). The fatal NOT-PASSED omits the filename from its text, and the file is non-empty anyway. No verdict references an artifact that isn't on disk non-empty.

5. **Selftests real, not trivial — PASS.** Reverting the fix (removing `openInterventionLog`) makes `ev.openInterventionLog(...)` a TypeError → all four SD-1 checks fail. Weakening is caught: `assert.ok(!("kind" in recs[0]))` fails if the sentinel ever carried `kind`; the idempotency check asserts `recs.length === 1` after three calls (becomes 3 if the guard is dropped); the refusal check asserts a refusal record keeps the log `size > 0` with one line and no sentinel. These bind the exact correctness properties. `npm test` green at 83/83.

6. **Scope — PASS (no violation).** `git diff --stat` shows only `soak-driver.mjs` and `soak-driver.selftest.mjs` modified. The accumulator (`reliability-soak.mjs`), the PASS/verdict emitter logic (`computeVerdict` unchanged — only its `failuresRef` default is consumed, not edited), the monitor, `src/run-attestation`, `src/shwl`, `src/quiet-host-monitor` are untouched.

## Notes on builder claims
- Builder's "167 bytes" for the sentinel is off by a few bytes (measured 163 for `run_abc123`; the real figure depends on `run_id` length). Immaterial — the only property that matters is `size > 0` vs `st.size===0`, which holds.
- Builder's path-coverage table and the "sentinel carries `type`, never `kind`" invariant are independently confirmed in the real code, not merely asserted in tests.
