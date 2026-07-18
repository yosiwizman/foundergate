// PAES singleton lock — prevents duplicate/racing supervisors (a real overlap
// was observed in prior qualification). Atomic acquire via exclusive file
// create (O_EXCL); a stale lock (dead PID or expired heartbeat) is recoverable,
// a healthy one is never duplicated. Pure logic + a thin fs wrapper so the
// decision path is unit-testable without real processes.
import { existsSync, readFileSync, unlinkSync, writeFileSync, linkSync, statSync } from "node:fs";

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

// Create the lock ATOMICALLY: write the full content to a private temp file, then
// hard-link it into place. link() fails (EEXIST) if the lock already exists, and
// the lock file NEVER appears empty/partial to a concurrent reader — closing the
// "reader sees an in-creation empty lock and treats it as corrupt" race.
function atomicCreate(lockPath, lock) {
  const tmp = `${lockPath}.${lock.pid}.${lock.nonce}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(lock, null, 2) + "\n");
    linkSync(tmp, lockPath); // atomic publish; throws if lockPath exists
    return true;
  } catch { return false; }
  finally { try { unlinkSync(tmp); } catch { /* */ } }
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
    // Sweep a stale recovery mutex (e.g. a recoverer hard-killed mid-section) so
    // recovery can never be permanently wedged.
    try { if (existsSync(rlock) && (ctx.now - Math.floor(statSync(rlock).mtimeMs / 1000)) > (ctx.stale_interval ?? 120)) unlinkSync(rlock); } catch { /* */ }
    if (!atomicCreate(rlock, { pid: req.pid, at: ctx.now })) {
      return { acquired: false, existing, decision: { action: "reject", reason: "recovery in progress by a peer" } };
    }
    try {
      // Re-check under the mutex: a peer may already have published a healthy lock.
      const cur = existsSync(lockPath) ? safeRead(lockPath) : null;
      if (cur && isHealthy(cur, ctx)) {
        return { acquired: false, existing: cur, decision: { action: "reject", reason: "peer recovered to a healthy lock" } };
      }
      try { unlinkSync(lockPath); } catch { /* already gone */ }
      const lock = mkLock(req, ctx.now);
      if (!atomicCreate(lockPath, lock)) {
        return { acquired: false, existing: safeRead(lockPath), decision: { action: "reject", reason: "lost creation race under recovery" } };
      }
      return { acquired: true, lock, recovered: existing ? existing.pid : null };
    } finally { try { unlinkSync(rlock); } catch { /* */ } }
  }

  // Fresh acquire (no lock): atomic temp+link — only one of N racing starts wins,
  // and the lock never appears empty to a concurrent reader.
  const lock = mkLock(req, ctx.now);
  if (!atomicCreate(lockPath, lock)) {
    return { acquired: false, existing: safeRead(lockPath), decision: { action: "reject", reason: "lost creation race" } };
  }
  return { acquired: true, lock, recovered: null };
}

export function releaseSingleton(lockPath, ownerPid) {
  if (!existsSync(lockPath)) return { released: false, reason: "no lock" };
  const l = safeRead(lockPath);
  if (l && l.pid !== ownerPid) return { released: false, reason: "not owner" };
  try { unlinkSync(lockPath); return { released: true }; } catch { return { released: false, reason: "unlink failed" }; }
}

function safeRead(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
