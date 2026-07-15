# Tracked finding SD-1 — soak-driver intervention-log created conditionally

**Status: CLOSED-BY this SD-1 fix-lane merge** (checker CLEAN + CI green).

## Finding
`src/tools/soak-driver.mjs`: the verdict emitter (`computeVerdict`) references `intervention-log.jsonl`
**unconditionally** as §29 element 5, but the file was created **only on the first `intervention()`
append**. A zero-intervention run therefore advertised a file it never created.

## How it surfaced
Found by the Harvest Terminal's **independent verification of the VB1 run-2 8-9h qualifying soak PASS
bundle** (branch `soak-evidence-vb1-8h-run2`). Original evidence commit `684dc8b` omitted the file →
manifest-vs-contents inconsistency (recorded EVIDENCE-DEFECT). The M1's additive repackage (`3665c13`)
added an **empty (0-byte)** `intervention-log.jsonl`, which the evidence-integrity guard
(`src/tools/evidence-integrity.selftest.mjs:52` — rejects any 0-byte file under `docs/assembly-evidence/`)
rejects; that turned the branch-protection-required `selftests` check red, so the re-verification merge
was refused (DISCREPANCY — merge nothing, report, STOP).

## Fix (this lane)
`makeEvidence` gains `openInterventionLog(run_id)`, called **once at run start** (right after `run_id`
is known), appending exactly one honest sentinel line:
`{"type":"log-opened","note":"interventions log opened at run start; zero interventions unless lines follow","ts":"<real ISO>","run_id":"<run id>"}`.
A zero-intervention run now yields a **non-empty, manifest-consistent, unambiguous** log (sentinel carries
`type`, never `kind`; a sentinel-only file = zero interventions; real interventions append after it;
append-only + idempotent). The accumulator, PASS emitter, monitor, and every accepted module are untouched.

Built by ONE builder + ONE independent adversarial checker (VERDICT CLEAN); `npm test` GREEN 83/83.
See `BUILD_REPORT.md` and `checker-report.md` in this directory.

## Consequence for the outstanding 8-9h soak
This unblocks the M1's run-2 repackage: the M1 must produce a **non-empty** `intervention-log.jsonl` from
this fixed driver — for the zero-intervention run-2, exactly one sentinel line (with run-2's real `ts` and
`run_id`) and nothing else. Then the Harvest Terminal re-verifies. No 24h soak and no VB1 acceptance are
authorized by this lane.
