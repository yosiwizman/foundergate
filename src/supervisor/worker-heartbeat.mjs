// PAES post-activation heartbeat independence (launch-safety).
//
// Runs a worker child process to completion while emitting REAL heartbeats on a
// fixed interval, so supervisor liveness is INDEPENDENT of how long the worker
// blocks. The child runs via a NON-BLOCKING spawn — the single-threaded event
// loop stays free to fire the heartbeat timer for the whole worker duration.
//
// This closes the starvation window: previously the worker ran under spawnSync,
// which froze the event loop so beat() (which refreshes the singleton lock's
// last_heartbeat) could not fire; a worker longer than the staleness interval
// (120s) made a LIVE supervisor look stale and thus recoverable/replaceable.
//
// The beats are genuine, not synthetic: the timer only fires while THIS process
// is alive and its loop is free. If the supervisor process actually dies, the
// timer dies with it and heartbeats genuinely stop — so a truly dead/crashed
// supervisor is still correctly detected as stale.

export function runBeatingChild({
  spawnChild, beat, intervalMs,
  maxBufferBytes = 64 * 1024 * 1024,
  setIntervalFn = setInterval, clearIntervalFn = clearInterval,
}) {
  return new Promise((resolve) => {
    let child;
    try { child = spawnChild(); }
    catch (e) { resolve({ ok: false, status: null, stdout: "", stderr: String(e), overflow: false, error: String(e), beats: 0 }); return; }

    let out = "", err = "", overflow = false, settled = false, beats = 0;
    const hb = setIntervalFn(() => { beats += 1; try { beat(); } catch { /* beat must never crash the worker */ } }, intervalMs);
    const finish = (status) => {
      if (settled) return; settled = true;
      clearIntervalFn(hb);
      resolve({ ok: status === 0 && !overflow, status, stdout: out, stderr: err, overflow, beats });
    };
    if (child.stdout) { try { child.stdout.setEncoding("utf8"); } catch { /* */ }
      child.stdout.on("data", (d) => { out += d; if (out.length > maxBufferBytes) { overflow = true; try { child.kill(); } catch { /* */ } } }); }
    if (child.stderr) { try { child.stderr.setEncoding("utf8"); } catch { /* */ }
      child.stderr.on("data", (d) => { err += d; }); }
    child.on("close", (code) => finish(code));
    child.on("error", (e) => { err += String(e); finish(null); });
  });
}
