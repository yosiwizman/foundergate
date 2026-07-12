# AKIOR soak-MONITORING tooling + soak-DEFECT history — PATTERN AUTHORITY (LANE C harvest)

> **HONESTY GUARD (Assembly Manual §29 + Law 54) — READ FIRST.**
> **AKIOR soak evidence is PATTERN AUTHORITY ONLY; it is not, and can never be cited as, a
> FounderGate `FOUNDERGATE HARNESS <N>-HOUR SOAK PASS`.** AKIOR's timestamps, SHAs, iteration
> counts, and run verdicts are another repository's evidence. They may inform HOW FounderGate
> watches its own long runs; they can NEVER stand in for FounderGate running its own soak on its
> own SHA. A FounderGate soak-pass line is valid only when FounderGate's own harness produced it
> with real start/end timestamps spanning the claim (enforced by
> `src/tools/report-provenance.mjs` `validateSoakClaims`).
>
> **Provenance / scope.** This is a COPY-ONLY, read-only harvest from the sibling repo
> `akior-activepieces-engine` (never modified, never executed). Each pattern below carries a
> provenance line naming its exact AKIOR source `path`. Written-Authority Law (§28): this doc
> extends the already-committed survey
> `docs/lanes/authority/akior-harness-harvest-report.md @ ed7aec9785e6b1ef68c60f2a4c2756e9c0fe6128`.

---

## Part 1 — MONITORING patterns (how AKIOR watches a long run)

### P1. Injectable-probe reliability WINDOW: uptime / error-rate / p50-p95 latency / longest-fail-streak / restart-survival
A single window of health samples reduces (pure, no I/O) to `{ uptimePct, errorRatePct, latencyP50Ms,
latencyP95Ms, longestFailStreak, restartSamples, restartRecovered, restartSurvived, sloPass }`. The PROBE is
**injected** — the module performs NO network, NO provider call, NO `Date.now()` (the caller stamps time so the
harness stays deterministic and testable). A sample is `{ ok, status?, latencyMs?, ts?, restart? }`. Errors thrown
by the probe are recorded as a failed sample and never rethrown — "a reliability harness must survive the thing it
measures." Latency percentiles use nearest-rank; the fail-streak is the longest run of non-`ok` samples.
- Provenance: `akior-activepieces-engine/scripts/_lib/akior-reliability-harness.mjs` (Phase 2A.474)

### P2. SLO thresholds ("daily-use ready" — advisory, not a gate)
The SLO AKIOR holds itself to, frozen as data: `minUptimePct 99.0`, `maxErrorRatePct 1.0`, `maxP95LatencyMs 2000`,
`maxConsecutiveFailures 2`. A window/soak `sloPass` is `true` only when there is at least one sample AND uptime,
error-rate, p95 (when measurable), and worst fail-streak all clear their bound. Note it is explicitly ADVISORY, not
a merge gate.
- Provenance: `akior-activepieces-engine/scripts/_lib/akior-reliability-harness.mjs` (`SLO`, `summarize`)

### P3. Multi-window SOAK accumulator: fold many windows over wall-clock into one rolling verdict
The harness summarizes ONE window; a SOAK accumulates MANY windows over wall-clock into a single rolling report —
the thing that, once started and left running for days, produces the "daily reliability" evidence. `appendWindow`
folds a window summary into a NEW state (never mutates), tracking totals, worst fail-streak, restart counts, an
average-of-p95 estimate, and first/last caller-supplied timestamps. `rollupSoak` derives rolling uptime/error-rate,
`spanMs`/`spanHours`, restart-survival, and a rolling `sloPass`. It performs NO probing, NO network, NO time call —
the runner supplies windows + timestamps. Marked `firesNothing: true`.
- Provenance: `akior-activepieces-engine/scripts/_lib/akior-reliability-soak.mjs` (Phase 2A.479)

### P4. INERT loopback soak runner: GET /health only, samples to a gitignored path, fires nothing
The runner probes the local control-service `GET /health` on an interval and folds each window into the rolling
report. It makes ONLY loopback GET probes (no provider, no mutation, no send), writes runtime samples under
`.akior/reliability/` (gitignored — never committed), never arms a marker, never crosses the send boundary. Start
it and leave it running to accumulate multi-day evidence; Ctrl-C stops it and the JSON persists.
- Provenance: `akior-activepieces-engine/scripts/akior-reliability-soak.sh`

### P5. Resource-LEAK trend detection — warm-up drop + steady-state base/tail + coarse gate + monotonic-climb discriminator
The whole point of a soak is to catch SLOW leaks/degradation. A soaked process almost always ALLOCATES during the
first N iterations (module init, JIT, cache/arena warm-up) then PLATEAUS, so comparing the tail against the VERY
FIRST samples conflates benign warm-up with a real leak. The method:
1. DROP a leading warm-up fraction (`warmupFrac` default 0.25), then take BOTH the baseline window and the tail
   window from the REMAINING steady-state region. Warm-up-then-plateau ⇒ base≈tail (ratio≈1) ⇒ PASS; a series still
   climbing in steady state ⇒ tail>base ⇒ can FAIL. Windows never overlap (effective K ≤ half the steady region).
2. Apply TWO thresholds on the steady ratio: a coarse growth factor (default 2×, "did it balloon") AND a tighter
   CLIMB factor (default 1.3×) that fires on a sustained shallow climb the coarse gate would miss — the explicit
   "monotonic climb FAILS / warm-up-then-flat PASSES" discriminator for rss + external.
- Provenance: `akior-activepieces-engine/tests/stress/foundergate-soak.mjs` (`steadyStats`, `evaluateTrend`)

### P6. Metric-specific gates: heap coarse-only (GC-sawtooth), external FLOOR, fd ABSOLUTE-slack, honest evaluability
- **heap** uses the coarse gate ONLY — `heapUsed` is GC-sawtooth and a tight climb factor would flake.
- **external (native/Buffer)** is EVALUATED only when the steady baseline is ≥ `externalFloorMB` (default 4 MB);
  below the floor the ratio is meaningless, so it is recorded as `EXTERNAL_NOT_EVALUATED` — "recorded, NOT asserted."
- **fd** uses an ABSOLUTE-slack gate (`fdSlack` default 8) because fds must be ~flat; teardown-per-iteration makes a
  rising count a genuine leak signal, not noise.
- **Evaluability honesty:** `trend.evaluable=false` when iterations < `minTrendIters` ⇒ asserts are SKIPPED (not
  forced to FAIL) and the top-line verdict must be UNCERTAIN, not a bare pass; `fdEvaluable=false` when the platform
  exposes no fd count ⇒ recorded as NOT CHECKED, never silently a pass.
- Provenance: `akior-activepieces-engine/tests/stress/foundergate-soak.mjs` (trend thresholds + `evaluateTrend`)

### P7. Real-store SENTINEL: sha256 snapshot before/after to prove a soak mutated nothing real
A soak that is supposed to touch nothing real snapshots the live-action stores (existence, size, mtime, sha256)
before the run and diffs them after; any change is a `REAL_STORE_TOUCHED` failure pinned to the first-breach
iteration. The prefix-scoped temp-leak check (`akior-stress-*` only) ensures an unrelated tmp file can never
false-FAIL a multi-hour run.
- Provenance: `akior-activepieces-engine/tests/stress/foundergate-stress-harness.mjs` (`snapshotRealStores`, `diffRealStores`)

### P8. Daemon LIVENESS / heartbeat: last-tick freshness, per-tick DROP reason, running-SHA build-stamp
The resilience audit found NO liveness anywhere: if the inbound listener died, the founder texted and got NOTHING
with zero signal why. The fix is ONE heartbeat end to end — the daemon writes a marker every tick recording
`lastTickAt`, the per-tick DROP reason (`ignored-sender`, `AUTOREPLY_NOT_ARMED`, `read-error:<src>`,
`DELIVERY_FAILED`, `llm-down`, …), armed/LLM/wacli status, handled/staged counts, and a `runningSha` BUILD-STAMP.
Liveness is derived purely from heartbeat AGE vs a threshold (`intervalMs × staleAfterIntervals + grace`): RED when
stale or absent. Recording the drop REASON turns a whole class of silent-failure findings VISIBLE. The `runningSha`
is compared to repo HEAD so a reload that never took (a STALE build) is detectable even while the daemon ticks. The
cron/scheduler daemon mirrors the same pattern (`lastTickAt`, `lastError`, `deliveryArmed`, `runningSha`; stale if
last tick > 5 min).
- Provenance: `akior-activepieces-engine/scripts/_lib/akior-listener-heartbeat.mjs`,
  `akior-activepieces-engine/scripts/_lib/akior-cron-heartbeat.mjs`

### P9. Alerting anti-trust: HARD vetoes so a monitor that "looks reliable" on cheap metrics can't hide a real miss
A checker/monitor can nail the CHEAP metrics (fast, few loops, low false-positive) while a disqualifying condition
hides underneath. HARD vetoes force UNRELIABLE / red regardless of the aggregate: `HIGH_MISS_RATE` (misses ≥ 20% of
labelled defects), `FLAPPING_VERDICT` (PASS/FAIL flips on re-run of the same input — "a coin flip"), `ALARM_STORM`
(≥ 50% spurious findings — "crying wolf" trains everyone to ignore it, including true catches), `REVIEW_THRASH`
(≥ 5 loops). SOFT warnings (`ELEVATED_FALSE_POSITIVE`, `ANY_MISS`, `VERDICT_DRIFT`, `SLOW_REVIEW`, `MULTI_LOOP`)
flag friction without failing. A human-auditable copy is kept in sync with the scorer so the rules can't silently
drift.
- Provenance: `akior-activepieces-engine/harness/checker/metrics/reliability-vetoes.json`,
  `akior-activepieces-engine/harness/checker/metrics/fixtures/alarm-storm.illustrative.json`

---

## Part 2 — soak-DEFECT history (what broke during AKIOR soaks, and the lesson)

> Reminder: the runs below are AKIOR's, on AKIOR's SHAs and clock. They are cited here as
> LESSONS about monitoring design — never as FounderGate soak evidence.

### D1. Sentinel false-positive on a daemon-SHARED store (the one FAIL of AKIOR's long run)
AKIOR's multi-hour stress run completed 14,504 iterations of scenarios H2–H7 with zero correctness failures and no
resource leak (`degraded=false`, fd flat at 13, external stable) — yet the run's verdict was `FAIL` for one reason:
`realStoresUntouched=false`. At iteration 2252 (~75 min in) the sentinel saw `.akior/cron-jobs.json` change (sha256
differed, same size). **Root cause:** that file is the reminder store, SHARED with the autonomous cron daemon (a
separate live process, `morning-briefing`/`night-summary` jobs), which rewrites it on its own schedule — so a
legitimate daemon write during ANY multi-hour run is a guaranteed false-positive. It was NOT an isolation breach:
the soak routed through a temp-store injection seam and never wrote the real store, and a `TEST_GUARD` throw-guard
independently `throws` on any real-store write under test. **Lesson:** a real-store sentinel must EXCLUDE
daemon-shared files and lean on the throw-guard for those; watch only stores no external process mutates. Net: no
loss of real protection, no more false FAIL.
- Provenance: `akior-activepieces-engine/docs/status/AKIOR_FOUNDERGATE_8H_SOAK_RESULT_AND_SENTINEL_FIX.md`,
  `akior-activepieces-engine/evidence/soak/8h-run/soak-report.json` (`failures[0].kind = "REAL_STORE_TOUCHED"`,
  `firstBreachIteration = 2252`)

### D2. Background workers get REAPED at guard-blocked turn-ends — a durable long run needs `nohup` + `disown`
AKIOR's long run only survived to full duration because it was detached with `nohup`+`disown`; `run_in_background`
processes were reaped at guard-blocked turn-ends. **Lesson:** a multi-hour soak must be launched with a durable
detach mechanism, not a session-scoped background job that the harness can reap between turns.
- Provenance: `akior-activepieces-engine/docs/status/AKIOR_FOUNDERGATE_8H_SOAK_RESULT_AND_SENTINEL_FIX.md`

### D3. Tiny native-memory baselines produce meaningless leak ratios — floor them out
AKIOR's run recorded `EXTERNAL_NOT_EVALUATED steady baseline native memory 2.26MB < floor 4MB — external leak
recorded, NOT asserted`. **Lesson:** below a native-memory floor the growth ratio is noise; record it, do not
assert on it. (Codified as P6.)
- Provenance: `akior-activepieces-engine/evidence/soak/8h-run/soak-report.json` (`trendReasons`)

### D4. Warm-up conflation is the classic soak false-signal — drop the ramp before measuring
The stress harness carries an explicit note that comparing the tail to the very first samples conflates benign
warm-up growth (module init, JIT, arena growth) with a real slow leak. **Lesson:** always drop a warm-up fraction
and measure the steady-state region, and pair a coarse gate with a climb discriminator. (Codified as P5.)
- Provenance: `akior-activepieces-engine/tests/stress/foundergate-soak.mjs` (LEAK-VS-WARMUP method comment)

### D5. Restart-stability soak proved survivability but NOT power-loss — honest scope limitation
An earlier restart-stability soak repeated stop→start→reachability→honest header→clean-stop across cycles and
passed, but the doc is explicit that it proves restart stability only and does NOT simulate OS power-loss or a
`kill -9` mid-write (deferred to a future "hard" soak). **Lesson:** state precisely what a soak does and does NOT
cover; do not let a restart soak be read as a crash-durability proof.
- Provenance: `akior-activepieces-engine/docs/status/ACTIVEPIECES_PHASE_2A127_RUNTIME_SOAK.md`

### D6. Silent failure has zero signal — a heartbeat with a drop reason is the cure
Before the heartbeat, a dead listener produced nothing but a gitignored log; the founder saw silence. **Lesson:**
every long-lived daemon a soak depends on must emit a liveness heartbeat with a per-tick drop reason and a build
stamp, so "stuck/dead/erroring-but-ticking/stale-build" are all visible from one read. (Codified as P8.)
- Provenance: `akior-activepieces-engine/scripts/_lib/akior-listener-heartbeat.mjs` (module header, findings R2/R7/R8/R11/R12/R13/R16)

---

## FounderGate adoption (this lane)
Patterns P5, P6, and P8 are implemented as an ORIGINAL, wide-safe, zero-dependency helper
`src/tools/soak-monitor.mjs` (+ `soak-monitor.selftest.mjs`), a pure resource-trend + liveness accumulator that
watches windows and REPORTS breaches (leak / degradation / staleness) and emits NO soak-pass string. It is kept
SEPARATE from the existing availability/SLO accumulator `src/tools/reliability-soak.mjs` (harvest #5) and does not
import it, `soak-run.mjs`, or `src/v8b1/**`. Patterns P1–P4, P7, P9 are recorded here as authority for future lanes.
Nothing in this doc is, or may be cited as, FounderGate soak evidence.
