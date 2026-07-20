// WAVE2 observability correction selftest — the three founder-facing status
// defects from the post-run audit, incl. the run's exact broken values.
import { normalizeHeartbeatAge, resolveLifecycle, scopeEvents, branchActivityIsLiveness, BRANCH_ACTIVITY_NOTE } from "./status-core.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

// The run's real stop moment (ms) + a "now" ~30s later.
const RUN_HB_MS = 1784428534019;         // heartbeat.json ts as written by HOTFIX-2 (milliseconds)
const NOW_MS = RUN_HB_MS + 30_000;

// --- A. HEARTBEAT UNIT NORMALIZATION ---
ok("01 seconds heartbeat -> correct positive age", (() => { const r = normalizeHeartbeatAge({ ts: Math.floor(NOW_MS/1000) - 10 }, NOW_MS); return r.unit === "s" && r.ageSeconds === 10 && r.status === "OK"; })());
ok("02 MILLISECONDS heartbeat -> correct age (NOT negative) [the exact bug]", (() => { const r = normalizeHeartbeatAge({ ts: RUN_HB_MS }, NOW_MS); return r.unit === "ms" && r.ageSeconds === 30 && r.status === "OK"; })());
ok("03 the run's raw ms ts never yields a negative age", normalizeHeartbeatAge({ ts: RUN_HB_MS }, NOW_MS).ageSeconds >= 0);
ok("04 malformed heartbeat (non-number) -> UNKNOWN", normalizeHeartbeatAge({ ts: "x" }, NOW_MS).status === "UNKNOWN");
ok("05 malformed heartbeat (<=0) -> UNKNOWN", normalizeHeartbeatAge({ ts: 0 }, NOW_MS).status === "UNKNOWN" && normalizeHeartbeatAge({ ts: -5 }, NOW_MS).status === "UNKNOWN");
ok("06 stale heartbeat (>120s, seconds) -> STALE", (() => { const r = normalizeHeartbeatAge({ ts: Math.floor(NOW_MS/1000) - 500 }, NOW_MS); return r.status === "STALE" && r.ageSeconds === 500; })());
ok("07 stale heartbeat (ms) -> STALE", normalizeHeartbeatAge({ ts: RUN_HB_MS - 500_000 }, NOW_MS).status === "STALE");
ok("08 no heartbeat -> NONE", normalizeHeartbeatAge(null, NOW_MS).status === "NONE" && normalizeHeartbeatAge(undefined, NOW_MS).status === "NONE");
ok("09 future/impossible timestamp -> UNKNOWN (never a huge negative)", normalizeHeartbeatAge({ ts: NOW_MS + 10_000_000 }, NOW_MS).status === "UNKNOWN");
ok("10 age is never negative for any input", [{ts:RUN_HB_MS},{ts:Math.floor(NOW_MS/1000)},{ts:NOW_MS+1e6},{ts:1}].every(h => { const a = normalizeHeartbeatAge(h, NOW_MS).ageSeconds; return a === null || a >= 0; }));

// --- B. FINAL LIFECYCLE STATE PRECEDENCE ---
ok("11 STOPPED_EXHAUSTED -> COMPLETED (queue exhausted)", resolveLifecycle({ state: { state: "STOPPED_EXHAUSTED" } }).lifecycle_display === "COMPLETED (queue exhausted)");
ok("12 the run's masking case: lifecycle from state.json, handoff is HISTORICAL only", (() => {
  const r = resolveLifecycle({ state: { state: "STOPPED_EXHAUSTED" }, handoff: { result: "SAFE_TO_LEAVE_UNATTENDED" } });
  return r.lifecycle_display === "COMPLETED (queue exhausted)" && r.historical_launch_evidence === "SAFE_TO_LEAVE_UNATTENDED" && r.source === "state.json" && r.is_final === true;
})());
ok("13 SAFE_TO_LEAVE_UNATTENDED is NOT shown as the lifecycle state", resolveLifecycle({ state: { state: "STOPPED_EXHAUSTED" }, handoff: { result: "SAFE_TO_LEAVE_UNATTENDED" } }).lifecycle_display !== "SAFE_TO_LEAVE_UNATTENDED");
ok("14 RUNNING active run distinct + not final", (() => { const r = resolveLifecycle({ state: { state: "RUNNING" } }); return r.lifecycle_display === "RUNNING" && r.is_final === false; })());
ok("15 deadline stop distinct", resolveLifecycle({ state: { state: "RUN_DEADLINE_EXPIRED" } }).lifecycle_display === "STOPPED (run deadline reached)");
ok("16 failed + held distinct", resolveLifecycle({ state: { state: "FAILED" } }).lifecycle_display === "FAILED" && resolveLifecycle({ state: { state: "HOLD_CORRECTABLE" } }).lifecycle_display === "HELD (correctable)");
ok("17 missing state.json -> UNKNOWN (not handoff)", (() => { const r = resolveLifecycle({ handoff: { result: "SAFE_TO_LEAVE_UNATTENDED" } }); return r.lifecycle_display === "UNKNOWN" && r.historical_launch_evidence === "SAFE_TO_LEAVE_UNATTENDED"; })());
ok("18 historical handoff success + completed lifecycle coexist without masking", (() => { const r = resolveLifecycle({ state: { state: "STOPPED_EXHAUSTED" }, handoff: { result: "SAFE_TO_LEAVE_UNATTENDED" } }); return r.lifecycle_state === "STOPPED_EXHAUSTED" && r.historical_launch_evidence === "SAFE_TO_LEAVE_UNATTENDED"; })());

// --- C. RUN-SCOPED EVENT FILTERING ---
const evs = [
  { evt: "session_supervisor_start", run_id: "OLD-run" },
  { evt: "worker_result" },                                  // legacy unscoped
  { evt: "worker_result", run_id: "v8b-wave-2-1784421259" },
  { evt: "session_supervisor_stop", run_id: "v8b-wave-2-1784421259" },
];
ok("19 current timeline = only active run_id events", (() => { const s = scopeEvents(evs, "v8b-wave-2-1784421259"); return s.current.length === 2 && s.current.every(e => e.run_id === "v8b-wave-2-1784421259"); })());
ok("20 legacy unscoped events -> historical, NOT current (no fake progress)", (() => { const s = scopeEvents(evs, "v8b-wave-2-1784421259"); return s.legacy_unscoped === 1 && s.historical.some(e => !("run_id" in e)); })());
ok("21 other-run events -> historical, not current", (() => { const s = scopeEvents(evs, "v8b-wave-2-1784421259"); return s.historical.some(e => e.run_id === "OLD-run"); })());
ok("22 no active run id -> nothing counted as current (fail closed, no fake progress)", scopeEvents(evs, null).current.length === 0);
ok("23 empty/missing events -> empty scopes", scopeEvents(undefined, "r").current.length === 0 && scopeEvents([], "r").historical.length === 0);

// --- D. BRANCH ACTIVITY IS EVIDENCE, NOT LIVENESS ---
ok("24 branch activity is never a liveness signal", branchActivityIsLiveness() === false && /EVIDENCE/.test(BRANCH_ACTIVITY_NOTE));

// --- E. ADDED FALSE-GREEN / ADVERSARIAL COVERAGE (Phase 4 completion) ---
// NaN / Infinity heartbeat timestamps must fail safe (typeof number but not finite).
ok("25 NaN heartbeat ts -> UNKNOWN (not OK, not negative)", (() => { const r = normalizeHeartbeatAge({ ts: NaN }, NOW_MS); return r.status === "UNKNOWN" && r.status !== "OK" && r.ageSeconds === null; })());
ok("26 Infinity/-Infinity heartbeat ts -> UNKNOWN", normalizeHeartbeatAge({ ts: Infinity }, NOW_MS).status === "UNKNOWN" && normalizeHeartbeatAge({ ts: -Infinity }, NOW_MS).status === "UNKNOWN");
ok("27 ms value cannot be read as seconds (unit detected at 1e11 boundary)", (() => { const r = normalizeHeartbeatAge({ ts: RUN_HB_MS }, NOW_MS); return r.unit === "ms" && r.ageSeconds >= 0 && r.ageSeconds < 1e6; })());
// Panic must remain a distinct final state.
ok("28 panic -> STOPPED (panic), distinct + final", (() => { const r = resolveLifecycle({ state: { state: "STOPPED_PANIC" } }); return r.lifecycle_display === "STOPPED (panic)" && r.is_final === true; })());
// Malformed events cannot produce fake current progress.
ok("29 malformed events (null/non-object) -> historical, never current", (() => { const s = scopeEvents([null, 5, "x", { run_id: "r" }], "r"); return s.current.length === 1 && s.historical.length === 3; })());
// Duplicate events are counted as EVENTS (not silently deduped into inflated job totals);
// the display labels scope.current as "events", never as accepted/merged jobs.
ok("30 duplicate active-run events counted as events, no job-count field emitted", (() => { const d = { run_id: "r", evt: "worker_result", job: "j1" }; const s = scopeEvents([d, d], "r"); return s.current.length === 2 && !("jobs_done" in s) && !("accepted" in s) && !("merged" in s); })());
// Worker/queue completion must never imply acceptance, merge, or production readiness.
ok("31 STOPPED_EXHAUSTED never displays ACCEPTED/MERGED/PRODUCTION/SAFE", (() => { const disp = resolveLifecycle({ state: { state: "STOPPED_EXHAUSTED" }, handoff: { result: "SAFE_TO_LEAVE_UNATTENDED" } }).lifecycle_display; return disp === "COMPLETED (queue exhausted)" && !/ACCEPT|MERGE|PRODUCTION|READY|SAFE/i.test(disp); })());
ok("32 lifecycle/scope outputs expose no acceptance/merge inference", (() => { const l = resolveLifecycle({ state: { state: "STOPPED_EXHAUSTED" } }); const s = scopeEvents([{ run_id: "r" }], "r"); const keys = Object.keys(l).concat(Object.keys(s)).join(","); return !/accept|merged|production|feature_accepted/i.test(keys); })());
// UNKNOWN can never read as green/OK; STALE can never read as current/OK; HELD never accepted.
ok("33 UNKNOWN heartbeat status is never OK", ["x", 0, NaN, Infinity].every(t => normalizeHeartbeatAge({ ts: t }, NOW_MS).status !== "OK"));
ok("34 STALE is a distinct status, never OK/current", (() => { const r = normalizeHeartbeatAge({ ts: Math.floor(NOW_MS/1000) - 500 }, NOW_MS); return r.status === "STALE" && r.status !== "OK"; })());
ok("35 HELD lifecycle never renders as accepted", (() => { const disp = resolveLifecycle({ state: { state: "HOLD_CORRECTABLE" } }).lifecycle_display; return /HELD/.test(disp) && !/ACCEPT/i.test(disp); })());

console.log(`\nWAVE2 OBSERVABILITY STATUS-CORE SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
