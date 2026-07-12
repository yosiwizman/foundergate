// FounderGate — self-test for src/tools/soak-monitor.mjs.
// Proves each degradation / leak / staleness assert GENUINELY fires, and that benign
// warm-up-then-flat runs PASS. Pure Node, zero deps, no network, no disk, no Date.now().

import assert from "node:assert";
import {
  newMonitor, recordSample, steadyStats, evaluateTrend, livenessFromHeartbeat, report,
  DEFAULT_THRESHOLDS, SOAK_MONITOR_VERSION,
} from "./soak-monitor.mjs";

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; console.log(`  PASS: ${msg}`); };

// Helper: build a monitor from an array of samples.
function monitorOf(samples, thresholds = {}) {
  let m = newMonitor(thresholds);
  for (const s of samples) m = recordSample(m, s);
  return m;
}
// Helper: a flat resource series (warm-up ramp then plateau) — the benign case.
function flatSeries(n, { rss = 100, heap = 30, external = 0, fd = 13, dur = 100 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    // warm-up ramp over the first 25% then plateau with tiny sawtooth
    const warm = i < n * 0.25 ? (i / (n * 0.25)) : 1;
    out.push({
      ts: 1000 + i,
      rssMB: rss * (0.7 + 0.3 * warm) + (i % 2), // ramps up then flat + sawtooth
      heapMB: heap + (i % 3) * 2,                 // GC sawtooth, no trend
      externalMB: external,
      fdCount: fd,
      iterationMs: dur + (i % 2),
    });
  }
  return out;
}

console.log("== soak-monitor self-test ==");

// ---- purity: recordSample never mutates input ----
{
  const a = newMonitor();
  const b = recordSample(a, { ts: 1, rssMB: 100 });
  ok(a.samples.length === 0 && b.samples.length === 1, "recordSample is pure (returns new state, input untouched)");
  ok(b.thresholds.rssGrowthFactor === DEFAULT_THRESHOLDS.rssGrowthFactor, "defaults carry into new monitor state");
}

// ---- benign warm-up-then-flat run PASSES (no degradation) ----
{
  const m = monitorOf(flatSeries(40));
  const t = evaluateTrend(m);
  ok(t.evaluable === true, "evaluable when samples >= minTrendIters");
  ok(t.degraded === false, "warm-up-then-flat run is NOT flagged degraded (warm-up excluded)");
  ok(t.rssLeak === false && t.heapLeak === false, "no rss/heap leak on a plateaued series");
  ok(t.detail.rssGrowthX <= 1.3, "steady-state rss growth ratio is ~flat (<=1.3x)");
}

// ---- RSS coarse balloon gate FIRES ----
{
  const s = flatSeries(40);
  // make the tail balloon > 2x the steady baseline
  for (let i = 30; i < 40; i++) s[i].rssMB = 400;
  const t = evaluateTrend(monitorOf(s));
  ok(t.rssLeak === true && t.degraded === true, "RSS coarse-gate leak fires on a 2x tail balloon");
  ok(t.reasons.some((r) => r.startsWith("RSS_LEAK")), "RSS_LEAK reason recorded");
}

// ---- RSS monotonic-CLIMB discriminator FIRES below the coarse gate ----
{
  const s = flatSeries(40, { rss: 100 });
  // sustained shallow climb: tail ~1.4x baseline (below 2x coarse, above 1.3x climb)
  for (let i = 0; i < 40; i++) s[i].rssMB = 100 + i * 2.0; // steady base ~122 vs tail ~176 => ~1.44x (climb, < 2x coarse)
  const t = evaluateTrend(monitorOf(s));
  ok(t.rssLeak === true, "RSS climb-discriminator fires on a sustained shallow climb the coarse gate misses");
  ok(t.reasons.some((r) => r.includes("climb")), "climb reason recorded");
}

// ---- HEAP coarse gate fires; GC-sawtooth alone does NOT ----
{
  const sawtooth = flatSeries(40, { heap: 30 }); // pure sawtooth
  ok(evaluateTrend(monitorOf(sawtooth)).heapLeak === false, "heap GC-sawtooth (no trend) does NOT flag a leak");
  const s = flatSeries(40, { heap: 30 });
  for (let i = 30; i < 40; i++) s[i].heapMB = 120;
  ok(evaluateTrend(monitorOf(s)).heapLeak === true, "HEAP coarse-gate leak fires on a 2x tail");
}

// ---- EXTERNAL floor: below floor NOT evaluated; above floor leak fires ----
{
  const below = monitorOf(flatSeries(40, { external: 2 })); // 2MB < 4MB floor
  const tb = evaluateTrend(below);
  ok(tb.externalEvaluable === false, "external below floor is NOT evaluated");
  ok(tb.notes.some((x) => x.startsWith("EXTERNAL_NOT_EVALUATED")), "external-not-evaluated note surfaced (recorded, not asserted)");

  const s = flatSeries(40, { external: 10 }); // baseline above floor
  for (let i = 0; i < 40; i++) s[i].externalMB = 10 + i * 0.6; // shallow climb
  const ta = evaluateTrend(monitorOf(s));
  ok(ta.externalEvaluable === true && ta.externalLeak === true, "external ABOVE floor evaluates and climb leak fires");
}

// ---- DURATION slowdown gate FIRES ----
{
  const s = flatSeries(40, { dur: 100 });
  for (let i = 30; i < 40; i++) s[i].iterationMs = 500; // >3x baseline
  const t = evaluateTrend(monitorOf(s));
  ok(t.durSlowdown === true && t.degraded === true, "SLOWDOWN gate fires on a 3x steady-tail iteration duration");
}

// ---- FD absolute-slack gate: flat fds pass; a climb fails; missing fds = NOT CHECKED ----
{
  ok(evaluateTrend(monitorOf(flatSeries(40))).fdLeak === false, "flat fd count does NOT flag an fd leak");
  const s = flatSeries(40);
  for (let i = 0; i < 40; i++) s[i].fdCount = 13 + i; // grows by >8
  const t = evaluateTrend(monitorOf(s));
  ok(t.fdLeak === true && t.fdEvaluable === true, "FD_LEAK fires when fds climb past the absolute slack");
  const noFd = flatSeries(40).map((x) => ({ ...x, fdCount: null }));
  const tn = evaluateTrend(monitorOf(noFd));
  ok(tn.fdEvaluable === false && tn.notes.some((x) => x.startsWith("FD_NOT_EVALUATED")), "no fd counts => NOT CHECKED, never a silent pass");
}

// ---- evaluability honesty: too few samples => SKIP, UNCERTAIN not a pass ----
{
  const t = evaluateTrend(monitorOf(flatSeries(3)));
  ok(t.evaluable === false && t.degraded === false, "short run is NOT evaluable and NOT force-failed");
  ok(t.notes.some((x) => x.startsWith("TREND_NOT_EVALUATED")), "short run surfaced as UNCERTAIN (not a bare pass)");
  const rep = report(monitorOf(flatSeries(3)));
  ok(rep.evaluated === false, "report marks a short run as not-evaluated");
}

// ---- liveness: fresh vs stale vs missing heartbeat ----
{
  const base = 1_000_000;
  const fresh = livenessFromHeartbeat({ heartbeat: { lastTickAt: base }, nowTs: base + 10_000, intervalMs: 15000 });
  ok(fresh.alive === true && fresh.reason === "FRESH", "heartbeat within threshold is FRESH/alive");
  const stale = livenessFromHeartbeat({ heartbeat: { lastTickAt: base, lastDropReason: "llm-down" }, nowTs: base + 120_000, intervalMs: 15000 });
  ok(stale.alive === false && stale.reason === "STALE", "heartbeat older than threshold is STALE/dead");
  ok(stale.lastDropReason === "llm-down", "last per-tick drop reason surfaced so an erroring daemon is visible");
  const none = livenessFromHeartbeat({ heartbeat: null, nowTs: base });
  ok(none.alive === false && none.reason === "NO_HEARTBEAT", "missing heartbeat => NO_HEARTBEAT (daemon never ran / died)");
  const stamp = livenessFromHeartbeat({ heartbeat: { lastTickAt: base, runningSha: "deadbeef" }, nowTs: base + 1000 });
  ok(stamp.runningSha === "deadbeef", "running-SHA build-stamp surfaced for stale-build detection");
}

// ---- report: clean run is breachFree; degraded run is not ----
{
  const clean = report(monitorOf(flatSeries(40)), { heartbeat: { lastTickAt: 5000 }, nowTs: 5000 });
  ok(clean.breachFree === true && clean.firesNothing === true, "clean, live run reports breachFree and firesNothing");
  const s = flatSeries(40); for (let i = 30; i < 40; i++) s[i].rssMB = 400;
  ok(report(monitorOf(s)).breachFree === false, "degraded run is NOT breachFree");
}

// ---- no soak-pass string is ever emitted (honesty guard) ----
{
  const rep = report(monitorOf(flatSeries(40)), { heartbeat: { lastTickAt: 5000 }, nowTs: 5000 });
  const blob = JSON.stringify(rep);
  ok(!/soak\s+pass/i.test(blob), "monitor output contains NO 'SOAK PASS' string (reports breaches only)");
  ok(SOAK_MONITOR_VERSION === "lane-c-1", "version tag present");
  // steadyStats windows never overlap
  const st = steadyStats([1, 2, 3, 4], 0, 3);
  ok(st.effK <= 2, "steadyStats windows never overlap (effK <= half the steady region)");
}

console.log(`\nSOAK-MONITOR-SELFTEST: PASS (${checks} checks)`);
