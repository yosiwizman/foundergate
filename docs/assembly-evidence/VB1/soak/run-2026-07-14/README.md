# VB1 qualifying soak — run of 2026-07-14 — VERDICT: NOT-PASSED

**Gate verdict: `FOUNDERGATE HARNESS 8-HOUR SOAK — NOT-PASSED`.** See `VERDICT.txt` (authoritative).

This directory is the complete, honest §29 evidence bundle for the first lease-guarded VB1 8–9h
qualifying soak. The run executed for its full span with a perfect availability record, but it
**FAILED the quiet-host gate** and is therefore NOT a pass. Nothing here has been massaged,
restarted, or scrubbed. The verdict is fixed and will not change.

## The one true reason it did not pass

The Mac **idle-slept repeatedly during the run**. When the host suspends, the lease's 30-second
heartbeat cannot fire; once a beat is older than 3× its 60s interval, the accepted SHWL state
machine correctly derives `STALE_HEARTBEAT → RECOVERY_REQUIRED`, and the L4 quiet-host monitor
scores that as a genuine non-quiet interval. Per Assembly Manual §29 / SHWL §5.1 that
**permanently disqualifies QUIET_HOST for this run, with no restoration** — so the verdict is
NOT-PASSED regardless of anything else.

- First violation: **2026-07-14T16:33:34Z** (≈1h20m into the run). QUIET_HOST latched off from
  that instant to the end.
- Ten stale-heartbeat detections total (see `intervention-log.jsonl`), matching ~19 host-sleep
  gaps in `monitor-record.jsonl` where samples that should be 60s apart are ~1000s apart.
- Root cause is the **host environment (power management), not the code under test.** The frozen
  code was re-verified at the end with **no drift**, and every health probe passed.

**To re-run and have a chance at PASS:** hold a power assertion for the whole span, e.g. launch
the driver under `caffeinate -dimsu`, so the Mac cannot idle-sleep. That is a fresh founder
release decision; it was **not** done here and nothing has been re-run.

## What "PASS" appears in these files, and why the gate still fails

Two artifacts contain a literal `8-HOUR SOAK PASS` line. **Neither is the gate verdict.** They are
honest sub-results of layers that do not evaluate quiet-host:

- `soak-8h-PASS.txt` — the §29 accumulator's own output (`src/tools/reliability-soak.mjs`). It
  reports **availability + duration only**: 100.000% over a real 8.13h span. That claim is true
  and its timestamps genuinely span the claim (so it is valid under `report-provenance`
  `validateSoakClaims`). The accumulator has no knowledge of quiet-host and never claims it.
- The L2 attestation's `isSoakEligible` returns `ELIGIBLE` — again **span + no-unresolved-failures
  only**, not quiet-host.

The **gate verdict** (`VERDICT.txt`) is the AND of all three requirements —
accumulator SLO **AND** QUIET_HOST eligibility **AND** frozen-code integrity. QUIET_HOST failed,
so the gate is **NOT-PASSED**. This layering is exactly what §29 intends: the accumulator cannot
fabricate a duration, and the quiet-host gate is a separate, stricter condition on top.

## The 10 `OVERRIDE` events in the lease log are NOT founder overrides

`lease-events.log` shows `OVERRIDE` entries. These are the **§5.1 downgrade consequence itself** —
the accepted attestation module records a permanent quiet-host disqualification as an
`OVERRIDE`-kind event (`reason: QUIET_HOST_MONITOR:MISSING_HEARTBEAT`,
`consequence: QUIET_HOST_PERMANENTLY_DISQUALIFIED`). **No founder override was ever issued.** One
event per stale-heartbeat detection.

## Honest disclosure: an earlier PREFLIGHT_FAIL (a self-inflicted false positive)

The append-only `lease-events.log` opens with `ACQUIRE, PREFLIGHT_FAIL` *before* the real run's
`ACQUIRE, PREFLIGHT_PASS, ACTIVATE`. That first attempt was **refused by the preflight** because
the launch command line literally contained the string `soak-run.mjs` (from a process check) and
the monitor matched the launching shell as a "second soak" — grep matching itself. Nothing was
started; the reservation released cleanly. The matcher was fixed (a shell `-c` argv is text, not
evidence of work) and re-proven before the real run. This pair is left in the record on purpose,
not scrubbed.

## The five §29 evidence elements (present for this NOT-PASSED verdict)

| # | §29 element | Where |
|---|-------------|-------|
| 1 | Named verdict line | `VERDICT.txt` (`… 8-HOUR SOAK — NOT-PASSED`) |
| 2 | Real start/end timestamps | start `2026-07-14T15:13:57Z` / end `2026-07-14T23:21:49Z` (actual span 8.131h) — in `VERDICT.txt`, `soak-8h.json`, and the sealed chain |
| 3 | Exact SHA under test | `c22b86a2f70847490961595b383c0ee358aaaa33` — in `freeze-manifest.json`, the chain's `EXTERNAL_ANCHOR` entry, and `VERDICT.txt` |
| 4 | Monitoring record captured during the run | `monitor-record.jsonl` (177 run samples incl. the sleep-gap record), `monitor-snapshot.json` |
| 5 | Failures / interventions log | `intervention-log.jsonl` (10 quiet-host violations, timestamped) |

## File index

| File | What it is |
|------|-----------|
| `VERDICT.txt` | **Authoritative gate verdict** (NOT-PASSED) with the true reasons |
| `freeze-manifest.json` | L1 freeze — per-file sha256 of `src/`+`scripts/`+`package.json` at the SHA; `manifest_hash`; git external anchor |
| `environment-provenance.json` | L3 host/environment record (qual-host-m1); no secrets |
| `attestation/attestation.log` | L2 sealed, hash-chained attestation (RUN_OPEN → EXTERNAL_ANCHOR → VERDICT → RUN_SEAL) |
| `attestation-anchor.json` | The sealed head `entry_hash` (the real `expectedHeadHash`), chain verdict, ingredient eligibility |
| `monitor-record.jsonl` | L4 continuous monitor samples (loadavg, foreign-workload scan, quiet eligibility) incl. sleep gaps |
| `monitor-snapshot.json` | L4 final snapshot: downgrade=true, the exact non-quiet episodes, the monitor's classification rule |
| `intervention-log.jsonl` | Every intervention/anomaly, timestamped |
| `soak-8h.json` | The accumulator state (all 28 health windows) |
| `soak-8h-PASS.txt` | The accumulator's availability+duration sub-result — **NOT the gate verdict** (see above) |
| `soak-console.log` | The runner's stdout, one line per 15-min health tick |
| `lease-acquired.json` / `lease-release.json` | Lease lifecycle bookends (owner pid, purpose, clean release) |
| `lease-record-redacted.json` | Final lease record — capability material **redacted** (§4.5) |
| `lease-events.log` | Append-only lease event trail (incl. the disclosed PREFLIGHT_FAIL and the §5.1 downgrades) |
| `capability-leak-scan.json` | §4.5 proof: the lease capability appears on no evidence surface (`leaked:false`) |
| `preflight-guard.json` | L4 preflight (lease-guard) result at launch |
| `driver.log` | The run harness's own log |
| `soak-driver.mjs` | The run harness that orchestrated L1–L4 + SHWL (committed as evidence, for audit) |

## Independently re-verified at seal time

- Attestation chain: `intact`; head-anchored; returns `broken-anchor` on a wrong anchor (tamper-evidence live).
- Frozen code: **no drift** (`manifest_hash` unchanged on re-freeze at end).
- Capability: **no leak** on any evidence surface.
- Lease: released cleanly (`RELEASED / SOAK_NOT_PASSED`), lock free.

*The Pro's sheriff handles the evidence merge. Nothing here was merged and no PR was opened against code.*
