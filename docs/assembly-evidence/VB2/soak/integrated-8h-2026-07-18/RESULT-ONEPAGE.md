# VB2 INTEGRATED SOAK — ONE-PAGE RESULT (Founder Release, VB1-through-VB2, 8h, §29)

## VERDICT (AND-gate only, from `VERDICT.txt`)
**`FOUNDERGATE HARNESS 8-HOUR SOAK — NOT-PASSED`**

The AND-gate = availability SLO **AND** QUIET_HOST eligibility **AND** frozen-code integrity.
Two of three held; the third failed:

| Gate element | Result |
|---|---|
| Availability SLO | ✅ PASS — 100.000% (SLO 99.00%), 34/34 samples ok |
| QUIET_HOST eligibility (§5.1) | ✅ INTACT — 0 downgrades, 0 episodes, 495/495 run samples eligible |
| Frozen-code integrity | ❌ **DRIFT DETECTED** — "git HEAD moved during the run: `73e2c40…` != `b9af1def…`" |

→ AND-gate = NOT-PASSED. **Honest NOT-PASSED, recorded as-is; not massaged.**

### True root cause (full transparency)
The failing element is **not a product defect and not real source drift**. The frozen scope
(`src/`+`scripts/`+`package.json`) was byte-identical throughout (manifest_hash unchanged). The guard
that fired is `recheckFreezeDrift`'s **"git HEAD did not move"** assertion. HEAD moved because **I made
a checkpoint `git commit` (`73e2c40`) on the branch while the run was active** — committing advanced the
branch/HEAD off the detached bound SHA `b9af1def…`. That is a harness-procedure error on my part.
A clean PASS requires a re-run with **no git commit during the active window** (commit evidence only
after RELEASE, or from a separate worktree so the run's HEAD stays pinned to the bound SHA). I did **not**
re-run — that is the founder's/Advisor's call.

## Run span (real timestamps)
- **Start:** 2026-07-17T07:39:29.090Z  **End:** 2026-07-17T15:54:29.041Z
- **Actual span:** 8.250h (claim 8h) — span ≥ claim satisfied.

## Availability
- **100.000%** over **34/34** samples (ok 34 / fail 0), SLO 99.00%. Every integrated probe tick passed.

## Quiet-host
- **INTACT the whole run.** Driver monitor-snapshot: `quiet_host_downgraded=false`, `eligible_final=true`, `episodes=0`.
- **Quiet-host sample count:** 495 run-phase monitor samples, **0** with `eligible=false`, **0** foreign-heavy sightings.
- **System sleep:** ZERO — confirmed by BOTH records: driver monitor (0 episodes) and independent sentinel (99 ticks, `max_new_system_sleep=0`).

## caffeinate proof (independent pmset, `step5-caffeinate-proof.json`)
- `pid 1716(caffeinate): PreventSystemSleep … asserting on behalf of 'node' (pid 1715)` — the `-dimsu`
  pin held **PreventSystemSleep** over the driver's own process tree, no `-t` timeout. System-wide
  PreventSystemSleep 0→1 at launch; sentinel confirms held every one of 99 ticks. Driver self-report: `HELD (descendant)`.

## Rehearsal — BOTH proofs PASS (`rehearsal-result.json`, before the real run)
- **4a quiet-host detector FIRES:** real `scanHostRows` flagged a foreign second-soak + xcodebuild@95% → real
  `prohibitedWorkloadAppeared` → §5.1 downgrade → `eligibleNow()=false`; stale-heartbeat via real `deriveDecision`
  → MISSING_HEARTBEAT downgrade; clean control stayed eligible.
- **4b VB2 store load-bearing:** integrated probe (VB1 session-token launch + contained act-edge → write+read a
  run_draft THROUGH `src/v8b2/classified-object-store.mjs`) exits 0; store-bypass exits 1. Bypass FAILS → store is in the path.

## Lease trail (`~/.cldh/host-workload-lease/events.log`)
`ACQUIRE → PREFLIGHT_PASS → ACTIVATE` (07:39:28Z) → heartbeat ×10 (last 15:54:00Z) → **`RELEASE SOAK_NOT_PASSED (ok:true)`** (15:54:29Z).
- No OVERRIDE, no downgrade (`override:null`, `recovery:null`). Capability dir empty → **no capability leak**.
- Note: RELEASE reason is `SOAK_NOT_PASSED` (not `SOAK_COMPLETE`) because the gate verdict was NOT-PASSED — the honest release for this outcome. Attestation sealed 15:54:29Z, chain **intact**.

## SHA under test
`b9af1def60009ac9dae69bf519b5e0a2680d4600` (host qual-host-m1; run `run_7cbb7cb1-b70e-4ec7-9cf3-35be6f11b174`).

## Bottom line
Substantively the soak was flawless — 8.25h, 100% availability, quiet-host intact, zero sleep, caffeinate
pinned, honest seal, clean release. It is recorded **NOT-PASSED** solely because a frozen-code-integrity
guard correctly caught that git HEAD moved mid-run (my checkpoint commit). The guard did its job; the record
is honest. **MERGE NOTHING** — evidence committed to `soak-evidence-vb2-integrated-8h` only.
