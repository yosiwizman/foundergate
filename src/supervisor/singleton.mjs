// PAES singleton lock — prevents duplicate/racing supervisors (a real overlap
// was observed in prior qualification). Atomic acquire via exclusive file
// create (O_EXCL); a stale lock (dead PID or expired heartbeat) is recoverable,
// a healthy one is never duplicated. Pure logic + a thin fs wrapper so the
// decision path is unit-testable without real processes.
import { openSync, writeSync, closeSync, existsSync, readFileSync, unlinkSync } from "node:fs";

// A supervisor is HEALTHY iff its process is alive AND its heartbeat is fresh.
export function isHealthy(lock, ctx) {
  if (!lock) return false;
  const alive = ctx.pid_alive === true;
  const fresh = (ctx.now - (lock.last_heartbeat || 0)) <= (ctx.stale_interval ?? 120);
  return alive && fresh;
}

// Decide what an incoming launcher should do given any existing lock.
export function evaluateAcquire(existing, req, ctx) {
  if (!existing) return { action: "acquire", reason: "no existing lock" };
  if (isHealthy(existing, ctx)) {
    // Never duplicate a healthy supervisor; also reject run/SHA mismatch races.
    return { action: "reject", reason: "healthy supervisor already running",
      existing_pid: existing.pid, existing_run_id: existing.run_id };
  }
  // Stale lock: recover atomically. Guard against stale PID reuse + mismatches.
  if (req.run_id && existing.run_id && req.run_id === existing.run_id && req.nonce === existing.nonce) {
    return { action: "reject", reason: "same run_id+nonce replay (second launcher racing the first)" };
  }
  return { action: "recover", reason: "stale lock (dead PID or expired heartbeat)", recovered_from: existing.pid };
}

function mkLock(req, now) {
  return { pid: req.pid, pgid: req.pgid, run_id: req.run_id, exact_sha: req.exact_sha,
    started: now, last_heartbeat: now, deadline: req.deadline, nonce: req.nonce };
}

// Atomic acquire. Returns {acquired, lock} or {acquired:false, existing, decision}.
// Concurrency-safe: fresh acquire is O_EXCL; stale/corrupt recovery is serialized
// through an O_EXCL recovery mutex with a re-check, so two racing recoverers can
// never both win (fixes the unlink+create TOCTOU).
export function acquireSingleton(lockPath, req, ctx) {
  const fileExists = existsSync(lockPath);
  const existing = fileExists ? safeRead(lockPath) : null;
  const corrupt = fileExists && existing === null; // exists but unparseable -> stale/recoverable
  const decision = corrupt
    ? { action: "recover", reason: "corrupt/empty lock", recovered_from: null }
    : evaluateAcquire(existing, req, ctx);
  if (decision.action === "reject") return { acquired: false, existing, decision };

  if (decision.action === "recover") {
    // Serialize recovery: only one process may reclaim a stale/corrupt lock.
    const rlock = lockPath + ".recover";
    let rfd;
    try { rfd = openSync(rlock, "wx"); }
    catch { return { acquired: false, existing, decision: { action: "reject", reason: "recovery in progress by a peer" } }; }
    try {
      // Re-check under the mutex: a peer may already have published a healthy lock.
      const cur = existsSync(lockPath) ? safeRead(lockPath) : null;
      if (cur && isHealthy(cur, ctx)) {
        return { acquired: false, existing: cur, decision: { action: "reject", reason: "peer recovered to a healthy lock" } };
      }
      try { unlinkSync(lockPath); } catch { /* already gone */ }
      const fd = openSync(lockPath, "wx");
      const lock = mkLock(req, ctx.now);
      writeSync(fd, JSON.stringify(lock, null, 2) + "\n");
      closeSync(fd);
      return { acquired: true, lock, recovered: existing ? existing.pid : null };
    } finally { try { unlinkSync(rlock); } catch { /* */ } }
  }

  // Fresh acquire (no lock): O_EXCL — only one of N racing starts wins.
  let fd;
  try { fd = openSync(lockPath, "wx"); }
  catch { return { acquired: false, existing: safeRead(lockPath), decision: { action: "reject", reason: "lost creation race" } }; }
  const lock = mkLock(req, ctx.now);
  writeSync(fd, JSON.stringify(lock, null, 2) + "\n");
  closeSync(fd);
  return { acquired: true, lock, recovered: null };
}

export function releaseSingleton(lockPath, ownerPid) {
  if (!existsSync(lockPath)) return { released: false, reason: "no lock" };
  const l = safeRead(lockPath);
  if (l && l.pid !== ownerPid) return { released: false, reason: "not owner" };
  try { unlinkSync(lockPath); return { released: true }; } catch { return { released: false, reason: "unlink failed" }; }
}

function safeRead(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
