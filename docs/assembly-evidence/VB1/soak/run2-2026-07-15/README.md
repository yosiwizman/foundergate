# VB1 qualifying soak — RUN 2 — 2026-07-15 — VERDICT: **PASS**

**Gate verdict: `FOUNDERGATE HARNESS 8-HOUR SOAK PASS`.** See `VERDICT.txt` (authoritative).

This is the sleep-fixed re-run of the VB1 8–9h qualifying soak, using the REVIEWED, merged driver
(`src/tools/soak-driver.mjs`, checker-CLEAN, part of the 83/83 suite). It is bound to `main` SHA
`490440d2a18910fe02f412d588ccddce132522e6` and ran under a `caffeinate -dimsu` power assertion so
the host could not idle-sleep — the single failure that produced Run 1's honest NOT-PASSED.

## The AND-gate held — all three, independently re-verified from the raw evidence

| Gate | Result | How it was checked |
|------|--------|--------------------|
| Availability SLO | **100.000%** over 33 samples (0 failures) vs 99% SLO | `soak-8h.json` — every health window ok |
| Duration | **actual span 8.0026h (28,809s) ≥ 8h** | raw start/end timestamps; inter-sample gaps 900–910s prove REAL wall-clock, not fabricated bunching |
| QUIET_HOST eligibility | **INTACT the whole run** — downgraded:false, 0 episodes | `monitor-snapshot.json`; all 481 monitor samples quiet + eligible, no foreign-workload sightings |
| Frozen-code integrity | **NO DRIFT** (manifest_hash unchanged on re-freeze) | `attestation-anchor.json`, freeze re-verify at end |

The verdict = availability SLO **AND** QUIET_HOST **AND** frozen-code integrity. All true → PASS.
Nothing was massaged; a PASS is the highest-scrutiny case and every element was re-derived from the
raw files, not taken from the driver's own summary.

## Why this run passed where Run 1 did not

Run 1 (2026-07-14, honest NOT-PASSED, branch `soak-evidence-vb1-8h`) failed only because the Mac
idle-slept ~19 times, starving the lease heartbeat → permanent §5.1 QUIET_HOST downgrade. Run 2
launched the same protocol under `caffeinate -dimsu`, verified in the driver's own process tree
(`caffeine-assertion.json`) and independently via `pmset` (`caffeinate-independent-verification.md`,
`pmset-assertions-at-launch.txt`) as asserting `PreventUserIdleSystemSleep` + `PreventUserIdleDisplaySleep`
on behalf of the driver with no timeout. The host stayed awake; the heartbeat never went stale.
`intervention-log.jsonl` is **empty** — zero interventions across the full 8 hours.

## The five §29 evidence elements (present for this PASS)

| # | §29 element | Where |
|---|-------------|-------|
| 1 | Named PASS line | `VERDICT.txt` (`FOUNDERGATE HARNESS 8-HOUR SOAK PASS`) |
| 2 | Real start/end timestamps | start `2026-07-15T03:10:52Z` / end `2026-07-15T11:11:01Z` (span 8.0026h) |
| 3 | Exact SHA under test | `490440d2a18910fe02f412d588ccddce132522e6` — freeze manifest, chain `EXTERNAL_ANCHOR`, verdict |
| 4 | Monitoring evidence during the run | `monitor-record.jsonl` (481 samples), `monitor-snapshot.json` |
| 5 | Failures / interventions log | `intervention-log.jsonl` (empty — no interventions) |

## Independent re-verification at commit time (operator, read-only)

- Span from raw timestamps: 28,809s ≥ 28,800s; 33/33 windows ok; gaps 900–910s (real wall-clock).
- Attestation chain: `intact`; head-anchored; returns `broken-anchor` on a wrong anchor (tamper-evidence live).
- Ingredient eligibility: `ELIGIBLE` (span 8.005h, no unresolved failures).
- QUIET_HOST: 0 downgrade episodes; all 481 samples quiet + eligible.
- Frozen code: no drift. Caffeinate: held. Capability: no leak on any evidence surface.

## File index

| File | What it is |
|------|-----------|
| `VERDICT.txt` | **Authoritative gate verdict** (PASS) |
| `soak-8h-PASS.txt` | The accumulator's availability+duration report (consistent with the gate PASS) |
| `freeze-manifest.json` | L1 freeze — per-file sha256 of `src/`+`scripts/`+`package.json`; `manifest_hash`; git anchor |
| `environment-provenance.json` | L3 host/environment record (qual-host-m1); no secrets |
| `attestation/attestation.log` | L2 sealed, hash-chained attestation (RUN_OPEN → EXTERNAL_ANCHOR → VERDICT → RUN_SEAL) |
| `attestation-anchor.json` | Sealed head `entry_hash`, chain verdict, ingredient eligibility |
| `monitor-record.jsonl` / `monitor-snapshot.json` | L4 continuous monitor (481 samples) + final snapshot (0 episodes) |
| `intervention-log.jsonl` | Failures/interventions — **empty** (clean run) |
| `soak-8h.json` / `soak-console.log` | Accumulator state (33 windows) + runner stdout |
| `caffeine-assertion.json`, `caffeinate-independent-verification.md`, `pmset-*.txt` | Caffeinate assertion evidence (driver + operator) |
| `lease-acquired.json` / `lease-release.json` | Lease lifecycle bookends (owner pid, purpose, clean release) |
| `lease-record-redacted.json` | Final lease record — capability **redacted** (§4.5) |
| `lease-events.log` | Shared append-only host lease log (Run 1 + Run 2; Run 2 = ACQUIRE,PREFLIGHT_PASS,ACTIVATE,RELEASE — clean) |
| `capability-leak-scan.json` | §4.5 proof: capability appears on no evidence surface (`leaked:false`) |
| `driver.log` | The reviewed driver's own run log |

*The Pro's sheriff handles the evidence merge. Nothing here was merged and no PR was opened against code.*
