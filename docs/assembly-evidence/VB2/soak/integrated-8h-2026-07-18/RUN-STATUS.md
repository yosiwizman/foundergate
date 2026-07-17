# VB2 Integrated Soak — RUN STATUS (live)

**Host:** qual-host-m1 (live-verified: `hostname`)
**Bound SHA:** `b9af1def60009ac9dae69bf519b5e0a2680d4600` (main == origin/main == bound, gate PASS after authorized fast-forward)
**Branch:** `soak-evidence-vb2-integrated-8h` (HEAD == bound SHA; frozen scope src/+scripts/+package.json CLEAN)
**Run id:** `run_7cbb7cb1-b70e-4ec7-9cf3-35be6f11b174`  **Lease:** `lease_e9c12296d27d478583e0cfe367b2cb9c`
**Driver pid:** 1715  **caffeinate pid:** 1716  **soak-run pid:** 1765

## Preflight (step 3) — sleep-truth
- Idle-sleep timers all **0** (sleep/displaysleep/disksleep/standby). Residual maintenance-sleep capability (powernap/womp/tcpkeepalive) delegated to the caffeinate `-s` pin. See `preflight-sleep-truth.json`.

## Rehearsal (step 4) — BOTH proofs PASS (`rehearsal-result.json`)
- **4a quiet-host detector FIRES:** real `scanHostRows` flags a foreign second-soak + xcodebuild@95% → real `prohibitedWorkloadAppeared` → §5.1 downgrade → `eligibleNow()=false`. Stale-heartbeat via real `deriveDecision` → MISSING_HEARTBEAT downgrade. Clean control stays eligible.
- **4b store in launch path:** integrated probe (VB1 session-token launch + contained act-edge → write+read a run_draft THROUGH `src/v8b2/classified-object-store.mjs`) exits 0 normally; with the store bypassed it exits 1. Bypass FAILS → store is load-bearing.

## Launch (step 5) — caffeinate-pinned
- `caffeinate -dimsu node src/tools/soak-driver.mjs --sha … --claim 8 --interval 900 --ttl 36000 --host qual-host-m1 --purpose "VB2 integrated soak (VB1-through-VB2)" --evidence <dir> --repo <repo> --probe "node <dir>/integrated-probe.mjs"`
  - `--repo` added (required by `validateOptions`; step-5 template omitted it).
- **caffeinate proof (independent pmset):** `pid 1716(caffeinate): PreventSystemSleep … asserting on behalf of 'node' (pid 1715)`. System-wide PreventSystemSleep 0→1. No `-t` timeout. See `step5-caffeinate-proof.json`.
- HARD GATE ok — HEAD = bound SHA, frozen scope clean; L1 manifest 340 files; **preflight quiet**; SD-1 intervention log opened at run start.

## Run window
- **Start:** 2026-07-17T07:39:29Z · **Claim:** 8h · **Expected end:** ~2026-07-17T15:39Z · probe every 900s (~32 samples).
- First real probe sample: **ok** (avail 100%).

## Live monitoring
- Driver: `monitor-record.jsonl` (60s), heartbeat (30s), probe windows in `soak-8h.json`, `intervention-log.jsonl` (SD-1).
- Independent sentinel `sentinel-watch.mjs` → `sentinel-oversight.jsonl` (300s): driver liveness, caffeinate held, **new system-sleep detection**.

## Remaining (step 6, at completion)
Assemble the five §29 elements + verdict line from the AND-gate; confirm lease trail ACQUIRE→PREFLIGHT_PASS→ACTIVATE→heartbeat→RELEASE(SOAK_COMPLETE, ok:true); produce one-page result; final commit to this branch. **MERGE NOTHING.**
