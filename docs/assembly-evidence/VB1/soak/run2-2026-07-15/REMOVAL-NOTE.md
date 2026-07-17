# Removal note — Run 2 bundle (option-(b) intervention-log removal)

> Addition-only. This note records a removal that already happened at sheriff-merge; it modifies no existing
> file in this bundle and no sealed byte. It resolves Audit A finding L-1 (a stale manifest reference).

## What was removed, and under whose ruling
The 0-byte `intervention-log.jsonl` that `VERDICT.txt`, `README.md`, and `REPACKAGING-NOTE.md` reference as an
(empty) manifest artifact was **removed at the sheriff-merge under the founder's option-(b) ruling** — the
removal is recorded in merge commit **`4bd2f8e`** ("Remove 0-byte intervention-log.jsonl per founder ruling
(option b)"), an ancestor of the current main. So the bundle's committed tree does **not** contain that file.

## Why the removal is honest and lossless
- **The file never contained run data.** Run 2 executed under the pre-SD-1-fix driver, which by its then-current
  design created no intervention log on a zero-intervention run. There was no log to lose.
- **Zero interventions are independently over-determined** — not by the (absent) file, but by the monitor
  record (`monitor-record.jsonl`: 481/481 run-phase samples quiet+eligible, zero violations, zero downgrades;
  `monitor-snapshot.json` `episodes:[]`) and by the L2 attestation (`unresolvedFailures:[]` on an intact,
  head-anchored chain).
- **No sealed byte was modified** — then or now. The L2 attestation seal binds the run *data*, not these manifest
  documents; both the run-2 seal and every other sealed artifact verify **intact** (correct anchor → intact;
  a deliberately wrong anchor → broken-anchor). This note adds a file; it changes none.

## Status
The absence of `intervention-log.jsonl` here is the founder-ruled outcome for this pre-fix bundle; the
authoritative `EVIDENCE_LEDGER` row `VB1-SOAK-RUN2-PASS` records it plainly. All future runs use the fixed
driver and are born with the SD-1 sentinel log (see the 24h bundle `run24-2026-07-15/intervention-log.jsonl`).
