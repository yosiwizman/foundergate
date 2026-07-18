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

// Atomic acquire. Returns {acquired, lock} or {acquired:false, existing, decision}.
export function acquireSingleton(lockPath, req, ctx) {
  const existing = existsSync(lockPath) ? safeRead(lockPath) : null;
  const decision = evaluateAcquire(existing, req, ctx);
  if (decision.action === "reject") return { acquired: false, existing, decision };
  if (decision.action === "recover") {
    // Preserve the stale record's evidence pointer, then replace atomically.
    try { unlinkSync(lockPath); } catch { /* race: another recoverer won */ }
  }
  // O_EXCL create: fails if a competitor created it first (race-safe).
  let fd;
  try { fd = openSync(lockPath, "wx"); }
  catch { return { acquired: false, existing: safeRead(lockPath), decision: { action: "reject", reason: "lost creation race" } }; }
  const lock = { pid: req.pid, pgid: req.pgid, run_id: req.run_id, exact_sha: req.exact_sha,
    started: ctx.now, last_heartbeat: ctx.now, deadline: req.deadline, nonce: req.nonce };
  writeSync(fd, JSON.stringify(lock, null, 2) + "\n");
  closeSync(fd);
  return { acquired: true, lock, recovered: decision.action === "recover" ? decision.recovered_from : null };
}

export function releaseSingleton(lockPath, ownerPid) {
  if (!existsSync(lockPath)) return { released: false, reason: "no lock" };
  const l = safeRead(lockPath);
  if (l && l.pid !== ownerPid) return { released: false, reason: "not owner" };
  try { unlinkSync(lockPath); return { released: true }; } catch { return { released: false, reason: "unlink failed" }; }
}

function safeRead(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
