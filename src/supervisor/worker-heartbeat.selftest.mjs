// PAES worker helper selftest — heartbeat independence (HOTFIX-2) + governed
// bounded execution & process-tree termination (WORKER-DEADLINE-HOTFIX-3).
import { runBeatingChild } from "./worker-heartbeat.mjs";
import { isHealthy, evaluateAcquire } from "./singleton.mjs";
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
const EXE = process.execPath;
const rspawn = ([cmd, ...args], opts = {}) => spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
const alivePid = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fakeChild(pid = 424242) {
  const c = new EventEmitter();
  c.pid = pid;
  c.stdout = new EventEmitter(); c.stdout.setEncoding = () => {};
  c.stderr = new EventEmitter(); c.stderr.setEncoding = () => {};
  c.kill = (sig) => { c.lastSignal = sig; };
  return c;
}
// Deterministic harness: capture injected timers/fns so the test drives time.
function harness({ treeAliveAfter = { SIGTERM: false }, timeoutOutcome = "WORKER_TIMEOUT", withStop = false } = {}) {
  const child = fakeChild();
  const state = { timeoutCb: null, beatCb: null, stopCb: null, cleared: [], sent: [], events: [], beats: 0, treeAlive: true };
  const killTree = (c, sig) => { state.sent.push(sig); if (treeAliveAfter[sig] === false) state.treeAlive = false; };
  const isTreeAlive = () => state.treeAlive;
  const opts = {
    spawnChild: () => child,
    beat: () => { state.beats += 1; },
    intervalMs: 10, graceMs: 5, verifyMs: 5, stopPollMs: 50,
    effectiveTimeoutS: 1, timeoutOutcome,
    killTree, isTreeAlive, sleepFn: () => Promise.resolve(),
    setTimeoutFn: (cb) => { state.timeoutCb = cb; return "T"; },
    clearTimeoutFn: (h) => state.cleared.push(h),
    setIntervalFn: (cb) => { if (!state.beatCb) { state.beatCb = cb; return "HB"; } state.stopCb = cb; return "STOP"; },
    clearIntervalFn: (h) => state.cleared.push(h),
    onEvent: (o) => state.events.push(o),
  };
  if (withStop) opts.stopRequested = () => state.stopRequested === true;
  return { child, state, promise: runBeatingChild(opts) };
}

async function run() {
  // ===== A. NATURAL COMPLETION (backward-compatible) =====
  {
    const h = harness();
    h.child.stdout.emit("data", '{"subtype":"success","is_error":false,"session_id":"s"}');
    h.child.emit("close", 0);
    const r = await h.promise;
    ok("01 natural exit 0 -> SUCCESS", r.outcome === "SUCCESS" && r.ok === true);
    ok("02 heartbeat interval cleared on settle", h.state.cleared.includes("HB"));
    ok("03 timeout timer cleared on natural settle", h.state.cleared.includes("T"));
  }
  {
    const h = harness();
    h.child.emit("close", 3);
    const r = await h.promise;
    ok("04 natural nonzero exit -> FAILED (not DONE)", r.outcome === "FAILED" && r.ok === false);
  }

  // ===== B. TIMEOUT -> graceful termination (SIGTERM works) =====
  {
    const h = harness({ treeAliveAfter: { SIGTERM: false } });
    h.state.timeoutCb();              // fire the hard timeout
    const r = await h.promise;
    ok("05 timeout -> WORKER_TIMEOUT (not SUCCESS/DONE)", r.outcome === "WORKER_TIMEOUT" && r.ok === false);
    ok("06 graceful SIGTERM sufficient -> no escalation", r.escalated === false && h.state.sent.includes("SIGTERM") && !h.state.sent.includes("SIGKILL"));
    ok("07 tree verified gone -> terminated true", r.terminated === true);
    ok("08 heartbeat stopped after termination (HB cleared)", h.state.cleared.includes("HB"));
    ok("09 termination intent + terminated audited", h.state.events.some((e) => e.evt === "worker_termination_intent") && h.state.events.some((e) => e.evt === "worker_terminated"));
  }

  // ===== C. TIMEOUT -> forced termination (SIGTERM ignored, SIGKILL works) =====
  {
    const h = harness({ treeAliveAfter: { SIGTERM: true, SIGKILL: false } }); // TERM does not kill; KILL does
    h.state.timeoutCb();
    const r = await h.promise;
    ok("10 SIGTERM ignored -> escalates to SIGKILL", r.escalated === true && h.state.sent.includes("SIGTERM") && h.state.sent.includes("SIGKILL"));
    ok("11 forced termination -> outcome WORKER_TIMEOUT, tree gone", r.outcome === "WORKER_TIMEOUT" && r.terminated === true);
    ok("12 escalation audited", h.state.events.some((e) => e.evt === "worker_signal" && e.signal === "SIGKILL"));
  }

  // ===== D. RUN DEADLINE as the timeout outcome =====
  {
    const h = harness({ treeAliveAfter: { SIGTERM: false }, timeoutOutcome: "RUN_DEADLINE_EXPIRED" });
    h.state.timeoutCb();
    const r = await h.promise;
    ok("13 deadline-bound timeout -> RUN_DEADLINE_EXPIRED (never DONE)", r.outcome === "RUN_DEADLINE_EXPIRED" && r.ok === false);
  }

  // ===== E. PROCESS-TREE CLEANUP CANNOT BE CONFIRMED -> fail closed =====
  {
    const h = harness({ treeAliveAfter: {} }); // neither TERM nor KILL clears -> tree never gone
    h.state.timeoutCb();
    const r = await h.promise;
    ok("14 tree not gone after SIGKILL -> UNKNOWN_FAILURE (fail closed, never success)", r.outcome === "UNKNOWN_FAILURE" && r.ok === false && r.terminated === false);
  }

  // ===== F. SUPERVISOR STOP during worker =====
  {
    const h = harness({ treeAliveAfter: { SIGTERM: false }, withStop: true });
    h.state.stopRequested = true; h.state.stopCb(); // stop poll observes PANIC
    const r = await h.promise;
    ok("15 stop during worker -> TERMINATED_BY_STOP, tree gone", r.outcome === "TERMINATED_BY_STOP" && r.terminated === true);
  }

  // ===== G. IDEMPOTENT termination (double trigger -> one outcome) =====
  {
    const h = harness({ treeAliveAfter: { SIGTERM: false } });
    h.state.timeoutCb(); h.state.timeoutCb(); // fire twice
    const r = await h.promise;
    const intents = h.state.events.filter((e) => e.evt === "worker_termination_intent").length;
    ok("16 duplicate termination is idempotent (one intent, one outcome)", intents === 1 && r.outcome === "WORKER_TIMEOUT");
  }

  // ===== H. OVERFLOW + SPAWN ERROR (real processes) =====
  {
    const r = await runBeatingChild({
      spawnChild: () => rspawn([EXE, "-e", "process.stdout.write('x'.repeat(5000)); setTimeout(()=>{},2000)"], { detached: true }),
      beat: () => {}, intervalMs: 1000, maxBufferBytes: 1000, graceMs: 100, verifyMs: 1500, effectiveTimeoutS: 30,
    });
    ok("17 overflow -> OUTPUT_OVERFLOW, terminated, not ok", r.outcome === "OUTPUT_OVERFLOW" && r.ok === false && r.terminated === true);
  }
  {
    const r = await runBeatingChild({ spawnChild: () => { throw new Error("boom"); }, beat: () => {}, intervalMs: 100 });
    ok("18 spawn error -> SPAWN_ERROR (no false heartbeat/success)", r.outcome === "SPAWN_ERROR" && r.ok === false && r.beats === 0);
  }

  // ===== I. HEARTBEAT INDEPENDENCE (real child) + classification purity =====
  {
    let beats = 0;
    const r = await runBeatingChild({
      spawnChild: () => rspawn([EXE, "-e", "setTimeout(()=>process.exit(0), 1500)"], { detached: true }),
      beat: () => beats++, intervalMs: 300, effectiveTimeoutS: 30,
    });
    ok("19 real worker completes -> SUCCESS, >=3 real beats while alive", r.outcome === "SUCCESS" && beats >= 3);
  }
  {
    const now = 10_000, STALE = 120;
    const fresh = { pid: 5, last_heartbeat: now - 5, run_id: "R", nonce: "n" };
    const stale = { pid: 5, last_heartbeat: now - 300, run_id: "R", nonce: "n" };
    ok("20 fresh+alive -> 2nd acquire REJECT; STALE+alive -> RECOVER (heartbeat-independence property)",
      evaluateAcquire(fresh, { pid: 6, run_id: "R2", nonce: "n2" }, { pid_alive: true, now, stale_interval: STALE }).action === "reject" &&
      evaluateAcquire(stale, { pid: 6, run_id: "R2", nonce: "n2" }, { pid_alive: true, now, stale_interval: STALE }).action === "recover" &&
      isHealthy(fresh, { pid_alive: true, now, stale_interval: STALE }) === true);
  }

  // ===== J. REAL PROCESS-TREE termination: parent + grandchild, SIGTERM-ignored =====
  {
    // parent ignores SIGTERM and spawns a long-lived grandchild in the same group.
    const code = "process.on('SIGTERM',()=>{}); const {spawn}=require('child_process');" +
      "const c=spawn(process.execPath,['-e','setTimeout(()=>{},60000)']); console.log('GC:'+c.pid); setTimeout(()=>{},60000);";
    const r = await runBeatingChild({
      spawnChild: () => rspawn([EXE, "-e", code], { detached: true }),
      beat: () => {}, intervalMs: 200, effectiveTimeoutS: 1, // 1s hard timeout
      graceMs: 400, verifyMs: 3000, stopPollMs: 100,
    });
    const m = /GC:(\d+)/.exec(r.stdout || ""); const gcPid = m ? Number(m[1]) : null;
    ok("21 real timeout on SIGTERM-ignoring tree -> escalates + WORKER_TIMEOUT", r.outcome === "WORKER_TIMEOUT" && r.escalated === true);
    ok("22 real process-tree verified gone (parent group terminated)", r.terminated === true);
    let gcDead = false;
    if (gcPid) { for (let i = 0; i < 20 && !gcDead; i++) { if (!alivePid(gcPid)) gcDead = true; else await sleep(100); } }
    ok(`23 grandchild pid ${gcPid} terminated (no orphan descendant)`, gcPid !== null && gcDead === true);
  }

  console.log(`\nWORKER-HEARTBEAT/GOVERNED SELFTEST: ${n - fails.length}/${n} passed`);
  if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
  process.exit(0);
}
run();
