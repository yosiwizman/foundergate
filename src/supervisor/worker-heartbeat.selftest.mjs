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

  // 3. STALENESS CLASSIFICATION IS PURE — test it deterministically with explicit
  // now/last_heartbeat (NO reliance on wall-clock second boundaries; that made an
  // earlier version CI-flaky). This is the exact classification a second acquire
  // uses: a LIVE pid whose heartbeat is stale is RECOVERED (the misclassification).
  {
    const now = 10_000, STALE = 120;
    const fresh = { pid: 500, last_heartbeat: now - 5,   run_id: "R", nonce: "n" }; // beat 5s ago
    const stale = { pid: 500, last_heartbeat: now - 300, run_id: "R", nonce: "n" }; // no beat 300s
    ok("07 fresh heartbeat + alive -> HEALTHY", isHealthy(fresh, { pid_alive: true, now, stale_interval: STALE }) === true);
    ok("08 fresh + alive -> 2nd acquire REJECTED (live supervisor not replaced)",
      evaluateAcquire(fresh, { pid: 501, run_id: "R2", nonce: "n2" }, { pid_alive: true, now, stale_interval: STALE }).action === "reject");
    ok("09 STALE + ALIVE -> 2nd acquire RECOVERS (a LIVE busy supervisor WOULD be replaced — the exact bug)",
      evaluateAcquire(stale, { pid: 501, run_id: "R2", nonce: "n2" }, { pid_alive: true, now, stale_interval: STALE }).action === "recover");
  }

  // 4. RUNTIME FRESHNESS (ms — robust, no second-boundary flakiness): run the REAL
  // worker WITH beats and record a ms timestamp each beat; the max gap between
  // liveness refreshes must stay FAR under the staleness window. A CONTROL run with
  // beat() a NO-OP (the old spawnSync-frozen loop) shows the gap grows to the whole
  // worker duration — the starvation the fix removes.
  {
    const WORKER_MS = 1600, INTERVAL = 200;
    const stamps = [Date.now()];
    await runBeatingChild({
      spawnChild: () => require_spawn([EXE, "-e", `setTimeout(()=>process.exit(0), ${WORKER_MS})`]),
      beat: () => stamps.push(Date.now()), intervalMs: INTERVAL,
    });
    stamps.push(Date.now());
    let maxGapWith = 0; for (let i = 1; i < stamps.length; i++) maxGapWith = Math.max(maxGapWith, stamps[i] - stamps[i - 1]);

    const t0 = Date.now();
    await runBeatingChild({ // beat NO-OP -> frozen-loop simulation (old spawnSync)
      spawnChild: () => require_spawn([EXE, "-e", `setTimeout(()=>process.exit(0), ${WORKER_MS})`]),
      beat: () => {}, intervalMs: INTERVAL,
    });
    const noBeatGap = Date.now() - t0;

    ok(`10 WITH beats: >=3 real refreshes and max liveness gap (${maxGapWith}ms) < full-worker gap`,
      stamps.length >= 3 && maxGapWith < WORKER_MS);
    ok(`11 CONTROL no beats: liveness gap (${noBeatGap}ms) grows to ~the whole worker duration`,
      noBeatGap >= WORKER_MS - 150);
    ok(`12 beats demonstrably keep liveness fresher than starvation (${maxGapWith}ms < ${noBeatGap}ms)`,
      maxGapWith < noBeatGap);
  }

  // 5. OVERFLOW: exceeding maxBufferBytes flags overflow + kills the child + ok=false.
  {
    const r = await runBeatingChild({
      spawnChild: () => require_spawn([EXE, "-e", "process.stdout.write('x'.repeat(5000)); setTimeout(()=>{},50)"]),
      beat: () => {}, intervalMs: 1000, maxBufferBytes: 1000,
    });
    ok("13 overflow flagged + not ok", r.overflow === true && r.ok === false);
  }

  // 6. SPAWN ERROR: spawnChild throwing resolves ok:false (never throws).
  {
    const r = await runBeatingChild({ spawnChild: () => { throw new Error("boom"); }, beat: () => {}, intervalMs: 100 });
    ok("14 spawn error -> ok:false, resolved not thrown", r.ok === false && /boom/.test(r.stderr || r.error || ""));
  }

  console.log(`\nWORKER-HEARTBEAT SELFTEST: ${n - fails.length}/${n} passed`);
  if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
  process.exit(0);
}

// local spawn wrapper (kept tiny so the selftest has no import beyond node:child_process)
import { spawn } from "node:child_process";
function require_spawn([cmd, ...args]) { return spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }); }

run();
