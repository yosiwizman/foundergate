# SD-1 FIX — BUILD REPORT (builder)

> Sensitive code lane. ONE builder (this report) + ONE independent adversarial checker (separate file).
> Scope strictly: `src/tools/soak-driver.mjs` + its selftest + this tracked evidence. The M1 and every
> soak branch were NOT touched. No 24h soak, no run-2 repackage, no VB1 action, no signatures here.

## The defect (SD-1)
Found by independent verification of the run-2 PASS bundle. `src/tools/soak-driver.mjs`:
- the verdict emitter (`computeVerdict`, ~line 344) references `intervention-log.jsonl` **unconditionally**;
- but the file was created **only on the first `intervention()` append** (`makeEvidence`, `appendFileSync`).

So a **zero-intervention** run produced **no** intervention log. The verdict named a file that did not exist
→ manifest-vs-contents inconsistency. Hand-adding an empty (0-byte) file does NOT cure it either: the
evidence-integrity guard (`src/tools/evidence-integrity.selftest.mjs:52`) rejects any 0-byte file under
`docs/assembly-evidence/` — so the empty-file repackage failed CI (this is exactly what blocked the run-2
re-verification merge).

## The fix (run-start sentinel)
`makeEvidence` gains `openInterventionLog(run_id)`, called **once at run start** (right after `run_id` is
known, before the monitor loop). It appends exactly one honest sentinel JSONL line:

```json
{"type":"log-opened","note":"interventions log opened at run start; zero interventions unless lines follow","ts":"<real ISO>","run_id":"<run id>"}
```

Properties that make this correct:
- **Non-empty at run start** — a zero-intervention run yields a 1-line file (167 bytes), so it passes the
  guard's `st.size === 0` gate and the verdict's unconditional reference becomes truthful.
- **Unambiguous** — the sentinel carries `type:"log-opened"` and **never** a `kind`. Real interventions
  carry `kind` (and no `type`). A reader/counter keys on `kind`, so the sentinel is **never counted** as an
  intervention. A sentinel-only file = **zero interventions**.
- **Append-only + idempotent** — `openInterventionLog` writes at most once (guarded by `interventionLogOpened`)
  and only appends; it can never truncate or displace a real record. Real interventions append AFTER it.
- **Accumulator/verdict untouched** — nothing counts intervention-log lines; the AND-gate
  (`accumulatorPassed && quietEligible && drift.ok`) and `isSoakEligible` (attestation chain) never read this
  file, so the sentinel cannot move any verdict input.

## Path coverage (no 0-byte, no absent log)
- **Run starts, zero interventions (the PASS case):** sentinel at run start → 1-line non-empty log. ✓
- **Run starts, real interventions:** sentinel first, interventions appended after, all counted. ✓
- **Refusal before start** (caffeinate-not-held / acquisition-refused): `intervention()` is called in
  `acquireGuardedLease` → log non-empty (a real refusal record; no sentinel, since the run never started). ✓
- **Fatal before/after start:** outer catch calls `intervention("FATAL_ERROR", …)` → non-empty. ✓

## Scope / non-touch
- Changed: `src/tools/soak-driver.mjs` (a flag, the `openInterventionLog` method, one call site) and
  `src/tools/soak-driver.selftest.mjs` (+4 SD-1 checks, +`statSync` import).
- NOT touched: the accumulator (`reliability-soak.mjs`), the PASS/verdict emitter logic, the monitor,
  `src/run-attestation`, `src/shwl`, `src/quiet-host-monitor`, or any other accepted module. The M1 and all
  soak branches were never touched.

## Selftest coverage added (all required cases)
1. file **exists and is non-empty** at run start (the guard's exact 0-byte criterion);
2. **sentinel-only ⇒ zero interventions** (one line, `type:"log-opened"`, no `kind`);
3. a **real intervention appends after** the sentinel and **is counted**; the sentinel is never counted/displaced;
4. **idempotent** (repeat calls write no second sentinel);
5. **refusal path** stays non-empty without a sentinel.

## Local verification
- `node src/tools/soak-driver.selftest.mjs` → PASS (21 checks).
- `node src/tools/evidence-integrity.selftest.mjs` against a live sentinel-only log → size 167 > 0 (accepted).
- `npm test` → **ALL GREEN: 83/83** (the transient 1 red was an untracked leftover 0-byte file from the M1
  repackage in the working tree, since removed — never a tracked file, never my change).

## What the M1's run-2 repackage must contain (for the next re-verification)
A **non-empty** `intervention-log.jsonl` produced by this fixed driver: for the zero-intervention run-2, that
is **exactly one sentinel line** of the format above (with run-2's real `ts` and `run_id`) and nothing else —
which is manifest-consistent (VERDICT names it), non-empty (guard accepts it), and unambiguous (sentinel-only
= zero interventions). No 0-byte file; no hand-authored intervention content.
