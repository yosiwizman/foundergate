// Lane A selftest — Founder command center + evidence freshness.
import { buildCommandCenter, classifyEvidenceFreshness, renderCommandCenterText, UNKNOWN } from "./command-center.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Lane A — command center + evidence freshness ==");

const HB_MS = 1784428534019, NOW = HB_MS + 30_000;

// 01 fresh hb + RUNNING -> LIVE, real age
(() => { const cc = buildCommandCenter({ runId: "r", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, nowMs: NOW }); ok("01 fresh+RUNNING -> LIVE age30", cc.liveness === "LIVE" && cc.heartbeat_age_seconds === 30); })();
// 02 no heartbeat -> NO HEARTBEAT, never LIVE, age null
(() => { const cc = buildCommandCenter({ runId: "r", state: { state: "RUNNING" }, nowMs: NOW }); ok("02 no hb -> NO HEARTBEAT/age null", cc.liveness === "NO HEARTBEAT" && cc.heartbeat_age_seconds === null && cc.liveness !== "LIVE"); })();
// 03 evidence within window -> FRESH
(() => { const cc = buildCommandCenter({ runId: "r", evidence: [{ label: "pack", ts: Math.floor(NOW/1000) - 100 }], nowMs: NOW, freshWithinS: 3600 }); ok("03 recent evidence -> FRESH", cc.evidence_freshness === "FRESH" && cc.evidence_counts.fresh === 1); })();
// 04 evidence older than window -> STALE
(() => { const cc = buildCommandCenter({ runId: "r", evidence: [{ label: "pack", ts: Math.floor(NOW/1000) - 100000 }], nowMs: NOW, freshWithinS: 3600 }); ok("04 old evidence -> STALE", cc.evidence_freshness === "STALE" && cc.evidence_counts.stale === 1); })();
// 05 malformed evidence ts -> UNKNOWN (never invented FRESH)
(() => { const cc = buildCommandCenter({ runId: "r", evidence: [{ label: "bad", ts: "x" }], nowMs: NOW }); ok("05 malformed ts -> UNKNOWN not FRESH", cc.evidence_freshness === UNKNOWN && cc.evidence_freshness !== "FRESH"); })();
// 06 any stale dominates a fresh
(() => { const cc = buildCommandCenter({ runId: "r", evidence: [{ label: "a", ts: Math.floor(NOW/1000)-10 }, { label: "b", ts: Math.floor(NOW/1000)-99999 }], nowMs: NOW }); ok("06 stale dominates", cc.evidence_freshness === "STALE" && cc.evidence_counts.fresh === 1 && cc.evidence_counts.stale === 1); })();
// 07 empty evidence -> NONE (not FRESH)
(() => { const cc = buildCommandCenter({ runId: "r", evidence: [], nowMs: NOW }); ok("07 empty evidence -> NONE", cc.evidence_freshness === "NONE"); })();
// 08 ms-timestamped evidence handled (no negative)
(() => { const cc = buildCommandCenter({ runId: "r", evidence: [{ label: "ms", ts: HB_MS - 5000 }], nowMs: NOW }); ok("08 ms evidence -> FRESH, age>=0", cc.evidence_freshness === "FRESH" && cc.evidence[0].ageSeconds >= 0); })();
// 09 no nowMs -> evidence NONE (withheld, not guessed)
(() => { const cc = buildCommandCenter({ runId: "r", evidence: [{ label: "x", ts: 123 }] }); ok("09 no nowMs -> evidence NONE + liveness UNKNOWN", cc.evidence_freshness === "NONE" && cc.liveness === UNKNOWN); })();
// 10 run-scoped events counted, not legacy/other
(() => { const cc = buildCommandCenter({ runId: "R", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, events: [{ run_id: "R" }, {}, { run_id: "Z" }], nowMs: NOW }); ok("10 event scoping", cc.current_events === 1 && cc.historical_events === 2); })();
// 11 missing runId -> UNKNOWN
ok("11 missing runId -> UNKNOWN", buildCommandCenter({ nowMs: NOW }).run_id === UNKNOWN);
// 12 output frozen + invented_state false
(() => { const cc = buildCommandCenter({ runId: "r", nowMs: NOW }); ok("12 frozen + invented_state false", Object.isFrozen(cc) && Object.isFrozen(cc.evidence) && cc.invented_state === false); })();
// 13 deterministic render
(() => { const a = { runId: "r", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, evidence: [{ label: "p", ts: Math.floor(NOW/1000)-5 }], nowMs: NOW }; ok("13 deterministic render", renderCommandCenterText(buildCommandCenter(a)) === renderCommandCenterText(buildCommandCenter(a))); })();
// 14 classifyEvidenceFreshness null-safe
ok("14 classify null-safe", classifyEvidenceFreshness(null, NOW).status === "NONE");
// 15 handoff historical, not shown as lifecycle
(() => { const cc = buildCommandCenter({ runId: "r", state: { state: "STOPPED_EXHAUSTED" }, handoff: { result: "SAFE_TO_LEAVE_UNATTENDED" }, nowMs: NOW }); ok("15 lifecycle from state, not handoff", cc.lifecycle_display === "COMPLETED (queue exhausted)"); })();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nLANE-A-COMMAND-CENTER-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
