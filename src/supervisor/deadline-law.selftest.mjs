// PAES-WORKER-DEADLINE-HOTFIX-3 — HARD DEADLINE LAW selftest (pure, deterministic).
import { originalRunDeadline, remainingRunSeconds, workerSpawnDecision, jobStateForOutcome, isDoneOutcome, shouldStopScheduling, WORKER_OUTCOMES } from "./deadline-law.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

// --- originalRunDeadline: immutable source, checkpoint preferred, fail closed ---
ok("01 checkpoint.original_deadline preferred over cycle.deadline",
  originalRunDeadline({ checkpoint: { original_deadline: 5000 }, cycle: { deadline: 9999 } }) === 5000);
ok("02 falls back to cycle.deadline when no checkpoint", originalRunDeadline({ cycle: { deadline: 7000 } }) === 7000);
ok("03 malformed/missing -> null (fail closed)",
  originalRunDeadline({}) === null && originalRunDeadline({ checkpoint: { original_deadline: "x" }, cycle: {} }) === null && originalRunDeadline() === null);
ok("04 non-positive deadline rejected -> null", originalRunDeadline({ checkpoint: { original_deadline: 0 }, cycle: { deadline: -1 } }) === null);
// immutability: the SAME inputs always yield the SAME deadline (restart/recovery reuse)
ok("05 deadline is a pure function of its source (restart reuses it)",
  originalRunDeadline({ checkpoint: { original_deadline: 4242 } }) === originalRunDeadline({ checkpoint: { original_deadline: 4242 } }));

// --- remainingRunSeconds ---
ok("06 remaining = deadline - now", remainingRunSeconds(1000, 400) === 600);
ok("07 non-finite -> null (fail closed)", remainingRunSeconds("x", 1) === null && remainingRunSeconds(1, NaN) === null);

// --- workerSpawnDecision: the core law ---
ok("08 deadline passed (remaining<=0) -> no spawn, RUN_DEADLINE_EXPIRED",
  (() => { const d = workerSpawnDecision({ originalDeadlineS: 1000, nowS: 1000 }); return d.spawn === false && d.outcome === "RUN_DEADLINE_EXPIRED"; })());
ok("09 deadline in the past -> no spawn",
  workerSpawnDecision({ originalDeadlineS: 1000, nowS: 1001 }).spawn === false);
ok("10 unknown deadline -> no spawn (fail closed)",
  workerSpawnDecision({ originalDeadlineS: null, nowS: 1000 }).spawn === false && workerSpawnDecision({ originalDeadlineS: NaN, nowS: 1 }).spawn === false);
ok("11 job timeout SHORTER than remaining -> effective=job, WORKER_TIMEOUT",
  (() => { const d = workerSpawnDecision({ originalDeadlineS: 1000, nowS: 100, jobTimeoutS: 300 }); return d.spawn && d.effectiveTimeoutS === 300 && d.timeoutOutcome === "WORKER_TIMEOUT"; })());
ok("12 job timeout LONGER than remaining -> capped at remaining, RUN_DEADLINE_EXPIRED",
  (() => { const d = workerSpawnDecision({ originalDeadlineS: 1000, nowS: 900, jobTimeoutS: 5000 }); return d.spawn && d.effectiveTimeoutS === 100 && d.timeoutOutcome === "RUN_DEADLINE_EXPIRED"; })());
ok("13 no job timeout -> capped at remaining, RUN_DEADLINE_EXPIRED",
  (() => { const d = workerSpawnDecision({ originalDeadlineS: 1000, nowS: 700 }); return d.effectiveTimeoutS === 300 && d.timeoutOutcome === "RUN_DEADLINE_EXPIRED"; })());
ok("14 ENV/queue can NEVER enlarge beyond remaining (giant/Infinity/NaN/0/neg ignored, capped at remaining)",
  [1e12, Infinity, NaN, 0, -5].every((jt) => workerSpawnDecision({ originalDeadlineS: 1000, nowS: 400, jobTimeoutS: jt }).effectiveTimeoutS === 600));
ok("15 effective never exceeds remaining for any positive job timeout",
  [1, 50, 599, 600, 601, 10000].every((jt) => workerSpawnDecision({ originalDeadlineS: 1000, nowS: 400, jobTimeoutS: jt }).effectiveTimeoutS <= 600));
ok("16 job timeout exactly equal to remaining -> deadline is binding (RUN_DEADLINE_EXPIRED)",
  workerSpawnDecision({ originalDeadlineS: 1000, nowS: 400, jobTimeoutS: 600 }).timeoutOutcome === "RUN_DEADLINE_EXPIRED");

// --- outcome -> DONE guard ---
ok("17 only SUCCESS is DONE", jobStateForOutcome("SUCCESS") === "DONE" && isDoneOutcome("SUCCESS") === true);
ok("18 timeout/deadline/stop/overflow/spawn/unknown are NOT DONE (fail closed)",
  ["WORKER_TIMEOUT", "RUN_DEADLINE_EXPIRED", "TERMINATED_BY_STOP", "OUTPUT_OVERFLOW", "SPAWN_ERROR", "FAILED", "UNKNOWN_FAILURE"].every((o) => jobStateForOutcome(o) === "FAILED" && isDoneOutcome(o) === false));
ok("19 UNKNOWN outcome fails closed (never DONE)", isDoneOutcome("UNKNOWN_FAILURE") === false && jobStateForOutcome("anything-weird") === "FAILED");

// --- stop scheduling only on run-deadline expiry ---
ok("20 stop scheduling only on RUN_DEADLINE_EXPIRED",
  shouldStopScheduling("RUN_DEADLINE_EXPIRED") === true && ["SUCCESS", "WORKER_TIMEOUT", "FAILED", "TERMINATED_BY_STOP", "OUTPUT_OVERFLOW"].every((o) => shouldStopScheduling(o) === false));

// --- outcome vocabulary ---
ok("21 all 8 governed outcomes are declared", WORKER_OUTCOMES.length === 8 &&
  ["SUCCESS", "FAILED", "WORKER_TIMEOUT", "RUN_DEADLINE_EXPIRED", "OUTPUT_OVERFLOW", "SPAWN_ERROR", "TERMINATED_BY_STOP", "UNKNOWN_FAILURE"].every((o) => WORKER_OUTCOMES.includes(o)));

console.log(`\nDEADLINE-LAW SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
