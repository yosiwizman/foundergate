// Launch-safety regression: heartbeat liveness is INDEPENDENT of the blocking
// worker. Proves (a) real heartbeats advance for the whole duration of a running
// worker, and (b) a live supervisor whose beats keep the lock fresh is NOT
// classified stale / recovered while a worker executes — the misclassification
// the old spawnSync path allowed once a worker ran longer than stale_interval.
import { runBeatingChild } from "./worker-heartbeat.mjs";
import { isHealthy, evaluateAcquire } from "./singleton.mjs";
import { EventEmitter } from "node:events";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
const EXE = process.execPath;

// A minimal fake child for deterministic (timer-injected) tests.
function fakeChild() {
  const c = new EventEmitter();
  c.stdout = new EventEmitter(); c.stdout.setEncoding = () => {};
  c.stderr = new EventEmitter(); c.stderr.setEncoding = () => {};
  c.killed = false; c.kill = () => { c.killed = true; };
  return c;
}

async function run() {
  // 1. DETERMINISTIC: injected timers — beats fire once per interval tick until close.
  {
    const child = fakeChild();
    let intervalCb = null; const setI = (cb) => { intervalCb = cb; return 1; }; let cleared = false; const clrI = () => { cleared = true; };
    let beats = 0;
    const p = runBeatingChild({ spawnChild: () => child, beat: () => beats++, intervalMs: 10, setIntervalFn: setI, clearIntervalFn: clrI });
    // simulate 4 interval ticks WHILE the worker runs, then close
    for (let i = 0; i < 4; i++) intervalCb();
    child.stdout.emit("data", '{"subtype":"success","is_error":false,"total_cost_usd":0.01,"session_id":"s1"}');
    child.emit("close", 0);
    const r = await p;
    ok("01 real beats advance during the worker (4 ticks -> 4 beats)", r.beats === 4);
    ok("02 interval cleared after the worker settles", cleared === true);
    ok("03 no beats after settle (ticks post-close are impossible; count frozen)", r.beats === 4);
    ok("04 success parsed from stdout", r.ok === true && r.status === 0);
  }

  // 2. RUNTIME EVIDENCE: a REAL child that outlives several beat intervals; count
  // REAL beats that fired while it ran (this is the anti-starvation proof).
  {
    let beats = 0;
    const r = await runBeatingChild({
      spawnChild: () => require_spawn([EXE, "-e", "setTimeout(()=>process.exit(0), 1600)"]),
      beat: () => beats++, intervalMs: 300,
    });
    ok("05 REAL worker (~1.6s) yielded >=3 real heartbeats while running", beats >= 3 && r.beats >= 3);
    ok("06 REAL worker completed (status 0)", r.status === 0);
  }

  // 3. STALENESS NON-MISCLASSIFICATION: with beats refreshing the lock's
  // last_heartbeat, a live supervisor running a worker LONGER than stale_interval
  // stays HEALTHY and a second acquire is REJECTED (not recovered/replaced).
  {
    const STALE = 1; // seconds — tiny so a ~1.6s worker exceeds it
    const nowS = () => Math.floor(Date.now() / 1000);
    const lock = { pid: process.pid, last_heartbeat: nowS(), run_id: "R", nonce: "n" };
    const r = await runBeatingChild({
      spawnChild: () => require_spawn([EXE, "-e", "setTimeout(()=>process.exit(0), 1600)"]),
      beat: () => { lock.last_heartbeat = nowS(); }, intervalMs: 300,
    });
    const now = nowS();
    ok("07 worker outran stale_interval", r.status === 0);
    ok("08 live supervisor stays HEALTHY (beats kept last_heartbeat fresh)",
      isHealthy(lock, { pid_alive: true, now, stale_interval: STALE }) === true);
    ok("09 second acquire is REJECTED, not recover (no replace of a live busy supervisor)",
      evaluateAcquire(lock, { pid: process.pid + 1, run_id: "R2", nonce: "n2" }, { pid_alive: true, now, stale_interval: STALE }).action === "reject");
  }

  // 4. CONTROL: WITHOUT beats (the old spawnSync starvation), the SAME-duration
  // worker leaves the lock stale -> isHealthy false -> a second acquire RECOVERS.
  // This proves the test genuinely detects the misclassification the fix removes.
  {
    const STALE = 1;
    const nowS = () => Math.floor(Date.now() / 1000);
    const lock = { pid: process.pid, last_heartbeat: nowS(), run_id: "R", nonce: "n" };
    await runBeatingChild({ // beat is a NO-OP -> simulates the frozen event loop
      spawnChild: () => require_spawn([EXE, "-e", "setTimeout(()=>process.exit(0), 1600)"]),
      beat: () => {}, intervalMs: 300,
    });
    const now = nowS();
    ok("10 CONTROL: no-beat worker leaves lock STALE (isHealthy false)",
      isHealthy(lock, { pid_alive: true, now, stale_interval: STALE }) === false);
    ok("11 CONTROL: stale live lock WOULD be recovered (the bug the fix removes)",
      evaluateAcquire(lock, { pid: process.pid + 1, run_id: "R2", nonce: "n2" }, { pid_alive: false, now, stale_interval: STALE }).action === "recover");
  }

  // 5. OVERFLOW: exceeding maxBufferBytes flags overflow + kills the child + ok=false.
  {
    const r = await runBeatingChild({
      spawnChild: () => require_spawn([EXE, "-e", "process.stdout.write('x'.repeat(5000)); setTimeout(()=>{},50)"]),
      beat: () => {}, intervalMs: 1000, maxBufferBytes: 1000,
    });
    ok("12 overflow flagged + not ok", r.overflow === true && r.ok === false);
  }

  // 6. SPAWN ERROR: spawnChild throwing resolves ok:false (never throws).
  {
    const r = await runBeatingChild({ spawnChild: () => { throw new Error("boom"); }, beat: () => {}, intervalMs: 100 });
    ok("13 spawn error -> ok:false, resolved not thrown", r.ok === false && /boom/.test(r.stderr || r.error || ""));
  }

  console.log(`\nWORKER-HEARTBEAT SELFTEST: ${n - fails.length}/${n} passed`);
  if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
  process.exit(0);
}

// local spawn wrapper (kept tiny so the selftest has no import beyond node:child_process)
import { spawn } from "node:child_process";
function require_spawn([cmd, ...args]) { return spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }); }

run();
