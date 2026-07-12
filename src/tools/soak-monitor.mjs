// FounderGate — SOAK-MONITOR: pure resource-trend + liveness observability accumulator
// (LANE C harvest; adopt-now, wide-safe). Watches the per-iteration RESOURCE samples and
// the daemon HEARTBEAT of a long-running soak and reports DEGRADATION / LEAK / STALENESS
// breaches. It fires NOTHING: no network, no provider, no disk write, no Date.now() — every
// timestamp and every sample is DATA passed in by the caller. It cannot execute or mutate
// anything real; it is a measurement substrate only.
//
// RELATIONSHIP TO THE EXISTING SOAK LANE (kept deliberately SEPARATE):
//   • src/tools/reliability-soak.mjs (VB1 lane) folds health WINDOWS into an availability
//     SLO verdict and emits the §29 "<N>-HOUR SOAK PASS" line. THIS file does the other
//     half of soak monitoring — the RESOURCE-leak trend + daemon liveness — and emits NO
//     soak-pass string at all (it reports breaches only, so it can never fabricate a soak).
//   This module does NOT import reliability-soak.mjs / soak-run.mjs / src/v8b1/**.
//
// Adapted as an original implementation from AKIOR patterns surveyed read-only in
// docs/lanes/authority/akior-soak-monitoring-harvest.md:
//   - warmup-drop + steady-state base/tail + coarse-gate + climb-discriminator + external
//     floor + fd absolute-slack .......... AKIOR tests/stress/foundergate-soak.mjs (evaluateTrend/steadyStats)
//   - heartbeat staleness / liveness ...... AKIOR scripts/_lib/akior-listener-heartbeat.mjs, akior-cron-heartbeat.mjs

export const SOAK_MONITOR_VERSION = "lane-c-1";

// Default thresholds. Every one is overridable so a supervisor can tune sensitivity.
export const DEFAULT_THRESHOLDS = Object.freeze({
  rssGrowthFactor: 2.0,      // FAIL if steady tail-mean rss  > steady baseline-mean rss  * factor
  heapGrowthFactor: 2.0,     // FAIL if steady tail-mean heap > steady baseline-mean heap * factor (coarse only — heap is GC-sawtooth)
  externalGrowthFactor: 2.0, // FAIL if steady tail-mean native/external > baseline-mean * factor
  durGrowthFactor: 3.0,      // FAIL if steady tail-mean iteration ms > baseline-mean * factor
  climbFactor: 1.3,          // MONOTONIC-CLIMB discriminator (rss + external): a sustained shallow climb the coarse gate misses
  fdSlack: 8,                // fds must be ~flat: FAIL if steady tail fd exceeds baseline fd by more than this (absolute)
  externalFloorMB: 4,        // external leak EVALUATED only when steady baseline native memory >= this (tiny values give meaningless ratios)
  warmupFrac: 0.25,          // fraction of leading iterations DROPPED as warm-up before the steady window is taken
  minTrendIters: 6,          // trend asserts evaluated only once at least this many samples exist
  trendWindow: 3,            // K: baseline/tail window size within the steady region
});

function num(x, d = 0) { return typeof x === "number" && isFinite(x) ? x : d; }
function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function parseTs(ts) {
  if (typeof ts === "number" && isFinite(ts)) return ts;
  const n = Date.parse(String(ts).replace(" ", "T"));
  return Number.isNaN(n) ? null : n;
}

// A fresh monitor state. Samples are pushed in order; timestamps are caller-supplied DATA.
export function newMonitor(thresholds = {}) {
  return {
    version: SOAK_MONITOR_VERSION,
    thresholds: { ...DEFAULT_THRESHOLDS, ...(thresholds && typeof thresholds === "object" ? thresholds : {}) },
    samples: [],
  };
}

// recordSample — fold one per-iteration resource sample. Pure: returns a NEW state, never
// mutates the input. A sample carries { ts, rssMB?, heapMB?, externalMB?, fdCount?, iterationMs? }.
// Missing fields are tolerated (recorded as null → NOT evaluated, never silently a pass).
export function recordSample(state, sample = {}) {
  const s = state && typeof state === "object" ? state : newMonitor();
  const one = {
    ts: sample.ts ?? null,
    rssMB: typeof sample.rssMB === "number" ? sample.rssMB : null,
    heapMB: typeof sample.heapMB === "number" ? sample.heapMB : null,
    externalMB: typeof sample.externalMB === "number" ? sample.externalMB : null,
    fdCount: typeof sample.fdCount === "number" ? sample.fdCount : null,
    iterationMs: typeof sample.iterationMs === "number" ? sample.iterationMs : null,
  };
  return { ...s, samples: [...s.samples, one] };
}

// steadyStats — LEAK-VS-WARMUP core. Drop `warmupCount` leading samples, then take the
// baseline window (first effK) and the tail window (last effK) from the REMAINING steady
// region. A warm-up-then-plateau has base≈tail (ratio≈1); a series still climbing in steady
// state has tail>base. Windows never overlap (effK <= half the steady region).
export function steadyStats(xs, warmupCount, K) {
  const steady = xs.slice(warmupCount);
  const n = steady.length;
  const effK = Math.max(1, Math.min(K, Math.floor(n / 2) || 1));
  const base = mean(steady.slice(0, effK));
  const tail = mean(steady.slice(-effK));
  const ratio = base > 0 ? tail / base : null;
  return { base, tail, ratio, effK, steadyLen: n };
}

// evaluateTrend — decide whether the run DEGRADED and WHY. Honest about evaluability:
//   • evaluable=false when samples < minTrendIters → resource asserts SKIPPED (not forced to
//     FAIL) and the caller's verdict must be UNCERTAIN, not a bare pass.
//   • fdEvaluable=false when no sample carried an fd count → fd assert NOT CHECKED (never a silent pass).
//   • externalEvaluable=false when steady native memory is below the floor → too small to assert.
export function evaluateTrend(state) {
  const st = state && typeof state === "object" ? state : newMonitor();
  const t = st.thresholds || DEFAULT_THRESHOLDS;
  const samples = Array.isArray(st.samples) ? st.samples : [];
  const K = Math.max(1, num(t.trendWindow, 3) | 0);
  const climbFactor = num(t.climbFactor, 1.3) > 0 ? num(t.climbFactor, 1.3) : 1.3;
  const fdSlack = num(t.fdSlack, 8);
  const externalFloorMB = num(t.externalFloorMB, 4);
  const warmupFrac = num(t.warmupFrac, 0.25);

  const rss = samples.map((s) => num(s.rssMB));
  const heap = samples.map((s) => num(s.heapMB));
  const external = samples.map((s) => num(s.externalMB));
  const durs = samples.map((s) => num(s.iterationMs));
  const fds = samples.map((s) => s.fdCount).filter((x) => x != null);

  const n = samples.length;
  const evaluable = n >= (num(t.minTrendIters, 6) | 0);
  const warmupCount = evaluable ? Math.min(Math.floor(n * warmupFrac), Math.max(0, n - 2)) : 0;

  const reasons = [];   // memory / duration / external reasons -> RESOURCE_DEGRADATION
  const fdReasons = []; // fd reasons -> FD_LEAK (kept a distinctly-named failure)
  const notes = [];     // informational not-evaluated notes (force no FAIL)
  let rssLeak = false, heapLeak = false, externalLeak = false, durSlowdown = false, fdLeak = false;
  let fdEvaluable = false, externalEvaluable = false;
  const detail = { evaluable, iterations: n, window: K, warmupDropped: warmupCount, warmupFrac, climbFactor };

  if (evaluable) {
    const r = steadyStats(rss, warmupCount, K);
    const h = steadyStats(heap, warmupCount, K);
    const e = steadyStats(external, warmupCount, K);
    const d = steadyStats(durs, warmupCount, K);
    detail.steadyLen = r.steadyLen;
    detail.rssBaseMB = Number(r.base.toFixed(2)); detail.rssTailMB = Number(r.tail.toFixed(2));
    detail.heapBaseMB = Number(h.base.toFixed(2)); detail.heapTailMB = Number(h.tail.toFixed(2));
    detail.externalBaseMB = Number(e.base.toFixed(2)); detail.externalTailMB = Number(e.tail.toFixed(2));
    detail.durBaseMs = Math.round(d.base); detail.durTailMs = Math.round(d.tail);
    detail.rssGrowthX = r.ratio == null ? null : Number(r.ratio.toFixed(3));
    detail.heapGrowthX = h.ratio == null ? null : Number(h.ratio.toFixed(3));
    detail.externalGrowthX = e.ratio == null ? null : Number(e.ratio.toFixed(3));
    detail.durGrowthX = d.ratio == null ? null : Number(d.ratio.toFixed(3));

    // rss: coarse balloon gate + monotonic-climb discriminator.
    if (r.ratio != null && r.tail > r.base * num(t.rssGrowthFactor, 2)) {
      rssLeak = true;
      reasons.push(`RSS_LEAK steady tail ${r.tail.toFixed(1)}MB > steady baseline ${r.base.toFixed(1)}MB x${num(t.rssGrowthFactor, 2)}`);
    } else if (r.ratio != null && r.tail > r.base * climbFactor) {
      rssLeak = true;
      reasons.push(`RSS_LEAK(climb) steady tail ${r.tail.toFixed(1)}MB still climbing > steady baseline ${r.base.toFixed(1)}MB x${climbFactor} (post-warmup)`);
    }
    // heap: coarse gate only (heapUsed is GC-sawtooth; a tight climb factor would flake).
    if (h.ratio != null && h.tail > h.base * num(t.heapGrowthFactor, 2)) {
      heapLeak = true;
      reasons.push(`HEAP_LEAK steady tail ${h.tail.toFixed(1)}MB > steady baseline ${h.base.toFixed(1)}MB x${num(t.heapGrowthFactor, 2)}`);
    }
    // external (native/Buffer): evaluated only above the floor.
    if (e.base >= externalFloorMB && e.ratio != null) {
      externalEvaluable = true;
      if (e.tail > e.base * num(t.externalGrowthFactor, 2)) {
        externalLeak = true;
        reasons.push(`EXTERNAL_LEAK steady tail ${e.tail.toFixed(1)}MB > steady baseline ${e.base.toFixed(1)}MB x${num(t.externalGrowthFactor, 2)}`);
      } else if (e.tail > e.base * climbFactor) {
        externalLeak = true;
        reasons.push(`EXTERNAL_LEAK(climb) steady tail ${e.tail.toFixed(1)}MB still climbing > steady baseline ${e.base.toFixed(1)}MB x${climbFactor} (post-warmup)`);
      }
    } else {
      externalEvaluable = false;
      notes.push(`EXTERNAL_NOT_EVALUATED steady baseline native memory ${e.base.toFixed(2)}MB < floor ${externalFloorMB}MB — recorded, NOT asserted`);
    }
    // duration: coarse gate on steady baseline (excludes slow warm-up iterations).
    if (d.ratio != null && d.tail > d.base * num(t.durGrowthFactor, 3)) {
      durSlowdown = true;
      reasons.push(`SLOWDOWN steady tail ${Math.round(d.tail)}ms > steady baseline ${Math.round(d.base)}ms x${num(t.durGrowthFactor, 3)}`);
    }
    // fd: ABSOLUTE-slack gate (fds must be ~flat). Only if measured on this platform.
    if (fds.length >= (num(t.minTrendIters, 6) | 0)) {
      fdEvaluable = true;
      const f = steadyStats(fds, Math.min(warmupCount, Math.max(0, fds.length - 2)), K);
      detail.fdBase = Number(f.base.toFixed(2));
      detail.fdTail = Number(f.tail.toFixed(2));
      detail.fdDeltaAbs = Number((f.tail - f.base).toFixed(2));
      if (f.tail - f.base > fdSlack) {
        fdLeak = true;
        fdReasons.push(`FD_LEAK steady tail fd ${f.tail.toFixed(1)} > steady baseline ${f.base.toFixed(1)} by >${fdSlack} (fds should be ~flat)`);
      }
    } else {
      notes.push("FD_NOT_EVALUATED no fd counts supplied on this platform — NOT CHECKED (never a silent pass)");
    }
  } else {
    notes.push(`TREND_NOT_EVALUATED only ${n} sample(s) < minTrendIters ${num(t.minTrendIters, 6)} — verdict is UNCERTAIN, not a pass`);
  }

  const degraded = rssLeak || heapLeak || externalLeak || durSlowdown;
  return {
    version: SOAK_MONITOR_VERSION,
    evaluable, fdEvaluable, externalEvaluable,
    degraded, fdLeak,
    rssLeak, heapLeak, externalLeak, durSlowdown,
    reasons, fdReasons, notes, detail,
  };
}

// livenessFromHeartbeat — is a long-running daemon still alive? Derived purely from the
// heartbeat's last-tick timestamp vs a caller-supplied `nowTs`. RED (alive:false) when the
// last tick is older than `staleAfterIntervals` poll intervals plus a small grace, or when
// no heartbeat exists (the daemon never ran / died before the first tick). Surfaces the
// last per-tick drop reason so an erroring-but-ticking daemon is also visible.
export function livenessFromHeartbeat({ heartbeat = null, nowTs, intervalMs = 15000, staleAfterIntervals = 2, graceMs = 5000 } = {}) {
  const now = parseTs(nowTs);
  if (now == null) return { present: !!heartbeat, alive: false, ageMs: null, reason: "NO_NOW_TS" };
  if (!heartbeat || heartbeat.lastTickAt == null) {
    return { present: false, alive: false, ageMs: null, reason: "NO_HEARTBEAT", lastDropReason: null };
  }
  const last = parseTs(heartbeat.lastTickAt);
  if (last == null) return { present: true, alive: false, ageMs: null, reason: "BAD_HEARTBEAT", lastDropReason: heartbeat.lastDropReason ?? null };
  const ageMs = Math.max(0, now - last);
  const staleThresholdMs = num(intervalMs, 15000) * num(staleAfterIntervals, 2) + num(graceMs, 5000);
  const alive = ageMs <= staleThresholdMs;
  return {
    present: true,
    alive,
    ageMs,
    staleThresholdMs,
    reason: alive ? "FRESH" : "STALE",
    lastDropReason: heartbeat.lastDropReason ?? null,
    // BUILD-STAMP: the git HEAD the RUNNING daemon started from. Compare to repo HEAD so a
    // reload that never took (a STALE build) is detectable even while the daemon ticks.
    runningSha: heartbeat.runningSha ?? null,
  };
}

// report — a committable summary object of the whole monitored soak. Emits NO "SOAK PASS"
// string: this tool reports BREACHES only and by construction can never fabricate a soak.
export function report(state, { nowTs = null, heartbeat = null, liveness = {} } = {}) {
  const trend = evaluateTrend(state);
  const live = (nowTs != null || heartbeat != null)
    ? livenessFromHeartbeat({ heartbeat, nowTs, ...(liveness || {}) })
    : null;
  const clean = !trend.degraded && !trend.fdLeak && (live == null || live.alive);
  return {
    version: SOAK_MONITOR_VERSION,
    samples: (state && Array.isArray(state.samples)) ? state.samples.length : 0,
    trend,
    liveness: live,
    // "clean" is only meaningful when the trend is actually evaluable; a short run is
    // UNCERTAIN, never a pass.
    breachFree: !!clean,
    evaluated: trend.evaluable,
    firesNothing: true,
  };
}

export default {
  SOAK_MONITOR_VERSION, DEFAULT_THRESHOLDS,
  newMonitor, recordSample, steadyStats, evaluateTrend, livenessFromHeartbeat, report,
};
