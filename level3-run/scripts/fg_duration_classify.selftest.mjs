#!/usr/bin/env node
// Deterministic tests for the move-resilient duration classifier.
// No clock, no fs — synthetic timestamped lines only.
import { classifyDuration, extractTimestamps } from "./fg_duration_classify.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.error("FAIL:", name); } };

// helper: build N lines starting at base, cadenceSec apart, prefix tag
function series(startIso, n, cadenceSec, tag = "x") {
  const base = Date.parse(startIso); const out = [];
  for (let i = 0; i < n; i++) {
    const t = new Date(base + i * cadenceSec * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    out.push(`${t} | ${tag}=${i}`);
  }
  return out;
}

const MIN = 120;
// A full 2h+ stream at 60s cadence: 121 samples spans 120 min exactly; use 130 -> 129 min.
const mon2h = series("2026-07-30T13:00:00Z", 131, 60, "load");
const led2h = series("2026-07-30T13:00:00Z", 131, 60, "ledger");

// 1. both monitor & ledger >= threshold, continuous -> PASS
ok("both>=120 continuous -> PROVEN", classifyDuration({ monitorLines: mon2h, ledgerLines: led2h, minMinutes: MIN }).verdict === "LEVEL2_TWO_HOUR_PROVEN");
ok("both>=120 pass flag", classifyDuration({ monitorLines: mon2h, ledgerLines: led2h, minMinutes: MIN }).pass === true);

// 2. monitor < required -> NOT PROVEN (only 30 min of monitor)
const mon30 = series("2026-07-30T13:00:00Z", 31, 60, "load");
ok("monitor<120 -> NOT_PROVEN", classifyDuration({ monitorLines: mon30, ledgerLines: led2h, minMinutes: MIN }).verdict === "LEVEL2_DURATION_NOT_PROVEN");

// 3. ledger < required -> NOT PROVEN
const led30 = series("2026-07-30T13:00:00Z", 31, 60, "ledger");
ok("ledger<120 -> NOT_PROVEN", classifyDuration({ monitorLines: mon2h, ledgerLines: led30, minMinutes: MIN }).verdict === "LEVEL2_DURATION_NOT_PROVEN");

// 4. timer completed but ledger MISSING -> INSUFFICIENT_EVIDENCE
ok("ledger missing -> INSUFFICIENT", classifyDuration({ monitorLines: mon2h, ledgerLines: [], minMinutes: MIN }).verdict === "INSUFFICIENT_EVIDENCE");
ok("monitor missing -> INSUFFICIENT", classifyDuration({ monitorLines: [], ledgerLines: led2h, minMinutes: MIN }).verdict === "INSUFFICIENT_EVIDENCE");

// 5. write-failure marker -> HELD, never pass (fail-closed)
ok("write-failure -> HELD", classifyDuration({ monitorLines: mon2h, ledgerLines: led2h, statusState: "HELD_EVIDENCE_WRITE_FAILURE", minMinutes: MIN }).verdict === "HELD_EVIDENCE_WRITE_FAILURE");
ok("write-failure not pass", classifyDuration({ monitorLines: mon2h, ledgerLines: led2h, statusState: "HELD_EVIDENCE_WRITE_FAILURE", minMinutes: MIN }).pass === false);

// 6. mid-run gap (logs died ~62 min in like L3B, then a lone late line) -> INSUFFICIENT (continuity broken)
//    first 62 samples at 60s, then a single sample 4h later.
const gap = series("2026-07-30T13:00:00Z", 62, 60, "load");
gap.push("2026-07-30T17:02:00Z | load=late"); // 4h jump
ok("mid-run 4h gap -> INSUFFICIENT", classifyDuration({ monitorLines: gap, ledgerLines: gap, minMinutes: MIN }).verdict === "INSUFFICIENT_EVIDENCE");

// 7. exactly threshold boundary: span == 120 -> PASS (>=)
const monExact = series("2026-07-30T13:00:00Z", 121, 60, "load"); // spans exactly 120 min
ok("span==120 exact -> PROVEN", classifyDuration({ monitorLines: monExact, ledgerLines: monExact, minMinutes: MIN }).verdict === "LEVEL2_TWO_HOUR_PROVEN");

// 8. just under: 119.something -> NOT PROVEN
const monUnder = series("2026-07-30T13:00:00Z", 120, 60, "load"); // spans 119 min
ok("span 119 -> NOT_PROVEN", classifyDuration({ monitorLines: monUnder, ledgerLines: monUnder, minMinutes: MIN }).verdict === "LEVEL2_DURATION_NOT_PROVEN");

// 9. timestamp extraction ignores non-timestamped noise
ok("extract skips noise", extractTimestamps(["garbage", "2026-07-30T13:00:00Z | ok", "more junk"]).length === 1);

// 10. spans reported are honest numbers
const r = classifyDuration({ monitorLines: mon2h, ledgerLines: led2h, minMinutes: MIN });
ok("monitor_span reported ~130", r.monitor_span_min === 130);

console.log(`fg_duration_classify.selftest: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
