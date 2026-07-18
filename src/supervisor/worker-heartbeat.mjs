// PAES worker helper — heartbeat independence (HOTFIX-2) + governed bounded
// execution and process-tree termination (WORKER-DEADLINE-HOTFIX-3).
//
// Runs a worker child NON-BLOCKING while emitting REAL heartbeats on a fixed
// interval, so supervisor liveness is independent of how long the worker blocks.
// Beats are genuine: the timer only fires while THIS process's loop is free; if
// the supervisor dies, the timer dies with it and beats genuinely stop.
//
// HOTFIX-3 adds a HARD bounded timeout and governed termination. The worker is
// spawned in its own process GROUP (caller uses detached:true) so the whole
// process tree can be signalled with kill(-pgid). On timeout / stop / overflow
// the helper escalates SIGTERM -> (bounded grace) -> SIGKILL and VERIFIES the
// group is gone (never "done because a signal was sent"). Heartbeats continue
// while the worker is still alive and stop only after it is confirmed gone.
//
// Every path resolves exactly one WORKER_OUTCOME; UNKNOWN fails closed.

// Default termination against the child's process GROUP (pgid === child.pid when
// spawned detached). Falls back to the single child if the group signal fails.
const defaultKillTree = (child, signal) => {
  let sent = false;
  try { if (child.pid) { process.kill(-child.pid, signal); sent = true; } } catch { /* group gone or not a leader */ }
  if (!sent) { try { child.kill(signal); } catch { /* */ } }
};
// Group liveness: signal 0 to the group; ESRCH => gone. If the group probe is not
// permitted/available, fall back to the child's own liveness.
const defaultIsTreeAlive = (child) => {
  try { if (child.pid) { process.kill(-child.pid, 0); return true; } } catch (e) { if (e && e.code === "ESRCH") return false; }
  try { if (child.pid) { process.kill(child.pid, 0); return true; } } catch { /* */ }
  return false;
};
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function runBeatingChild({
  spawnChild, beat, intervalMs,
  maxBufferBytes = 64 * 1024 * 1024,
  // --- HOTFIX-3 governance (all optional; omitted => run to natural completion) ---
  effectiveTimeoutS = null,          // hard cap (seconds); null/<=0/non-finite => no timer
  timeoutOutcome = "WORKER_TIMEOUT", // classification if the timer fires (WORKER_TIMEOUT | RUN_DEADLINE_EXPIRED)
  graceMs = 2000,                    // bounded grace between SIGTERM and SIGKILL
  verifyMs = 2000,                   // bounded window to confirm the tree is gone after SIGKILL
  stopRequested = null,              // () => bool ; polled -> TERMINATED_BY_STOP
  stopPollMs = 500,
  onEvent = null,                    // (obj) => void ; termination-intent/escalation audit hook
  // injectables for deterministic tests
  killTree = defaultKillTree, isTreeAlive = defaultIsTreeAlive, sleepFn = defaultSleep,
  setIntervalFn = setInterval, clearIntervalFn = clearInterval,
  setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout,
}) {
  return new Promise((resolve) => {
    let child;
    try { child = spawnChild(); }
    catch (e) { resolve({ outcome: "SPAWN_ERROR", ok: false, status: null, stdout: "", stderr: String(e), overflow: false, error: String(e), beats: 0, escalated: false, terminated: false }); return; }

    let out = "", err = "", overflow = false, settled = false, beats = 0;
    let terminating = false, escalated = false, treeGone = false;
    const emit = (o) => { try { onEvent && onEvent(o); } catch { /* audit must never crash the worker */ } };

    const hb = setIntervalFn(() => { beats += 1; try { beat && beat(); } catch { /* beat must never crash the worker */ } }, intervalMs);
    let timeoutTimer = null, stopTimer = null;
    const clearAux = () => { if (timeoutTimer) clearTimeoutFn(timeoutTimer); if (stopTimer) clearIntervalFn(stopTimer); timeoutTimer = stopTimer = null; };

    const finish = (outcome, status) => {
      if (settled) return; settled = true;
      clearAux(); clearIntervalFn(hb); // heartbeat stops only here — after the worker is done/gone
      resolve({ outcome, ok: outcome === "SUCCESS", status: status ?? null, stdout: out, stderr: err, overflow, beats, escalated, terminated: treeGone });
    };

    // Governed termination: SIGTERM -> bounded grace -> SIGKILL -> VERIFY gone.
    // Heartbeats keep firing during this window (the supervisor IS alive) and stop
    // only in finish() after the tree is confirmed gone.
    const terminate = async (reason) => {
      if (terminating || settled) return; terminating = true;
      clearAux(); // no more timeout/stop triggers; hb stays until finish
      emit({ evt: "worker_termination_intent", reason });
      killTree(child, "SIGTERM");
      emit({ evt: "worker_signal", signal: "SIGTERM", reason });
      await sleepFn(graceMs);
      if (isTreeAlive(child)) {
        escalated = true;
        killTree(child, "SIGKILL");
        emit({ evt: "worker_signal", signal: "SIGKILL", reason, escalated: true });
        // bounded verification that the group is actually gone
        const deadline = graceMs > 0 ? verifyMs : verifyMs;
        let waited = 0; const step = Math.max(25, Math.min(200, stopPollMs));
        while (isTreeAlive(child) && waited < deadline) { await sleepFn(step); waited += step; }
      }
      treeGone = !isTreeAlive(child);
      emit({ evt: "worker_terminated", reason, escalated, tree_gone: treeGone });
      // If the tree could NOT be confirmed gone, fail closed with a distinct
      // outcome so the caller/checker sees a cleanup failure (never a success).
      finish(treeGone ? reason : "UNKNOWN_FAILURE", null);
    };

    if (child.stdout) { try { child.stdout.setEncoding("utf8"); } catch { /* */ }
      child.stdout.on("data", (d) => { out += d; if (!overflow && out.length > maxBufferBytes) { overflow = true; terminate("OUTPUT_OVERFLOW"); } }); }
    if (child.stderr) { try { child.stderr.setEncoding("utf8"); } catch { /* */ }
      child.stderr.on("data", (d) => { err += d; }); }

    child.on("close", (code) => {
      if (settled) return;
      if (terminating) return; // the termination sequence owns finishing (verifies the tree)
      finish(code === 0 && !overflow ? "SUCCESS" : "FAILED", code);
    });
    child.on("error", (e) => { if (settled || terminating) return; err += String(e); finish("SPAWN_ERROR", null); });

    // hard bounded timeout (monotonic via setTimeout on the effective seconds)
    if (typeof effectiveTimeoutS === "number" && Number.isFinite(effectiveTimeoutS) && effectiveTimeoutS > 0) {
      timeoutTimer = setTimeoutFn(() => { terminate(timeoutOutcome); }, Math.round(effectiveTimeoutS * 1000));
    }
    // supervisor PANIC-stop polling during the worker
    if (typeof stopRequested === "function") {
      stopTimer = setIntervalFn(() => { try { if (stopRequested()) terminate("TERMINATED_BY_STOP"); } catch { /* */ } }, stopPollMs);
    }
  });
}
