// FounderGate V8-B VB1 — CROSS-PROCESS ATOMIC-STORE LOCK (AKIOR #8).
//
// An exclusive advisory file lock so a daemon / UI / test can't produce a torn read or a
// lost update on a shared store. The executor is meant to hold this across
// backup → mutate → rollback so an undo descriptor can't go stale and a net-zero delete
// can't clobber a concurrently-created file (checker round-1 LOW-1).
//
// Pure Node, zero-dependency. Exclusive create (O_EXCL) is the lock; a stale lock (older
// than staleMs) is reclaimed; acquisition blocks up to timeoutMs then throws.

import { openSync, closeSync, unlinkSync, statSync, writeSync } from "node:fs";

// A real synchronous sleep (no busy-spin) via Atomics.wait on a throwaway buffer.
function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(1, ms)); } catch { /* not available — proceed */ }
}

export function withFileLockSync(lockPath, fn, { timeoutMs = 5000, staleMs = 30000, retryMs = 25, now = Date.now } = {}) {
  const start = now();
  let fd = null;
  for (;;) {
    try { fd = openSync(lockPath, "wx"); break; } // O_EXCL — only one holder wins
    catch (e) {
      if (e.code !== "EEXIST") throw e;
      // reclaim a stale lock (holder likely died without releasing)
      try { const st = statSync(lockPath); if (now() - st.mtimeMs > staleMs) { unlinkSync(lockPath); continue; } } catch { /* gone; retry */ }
      if (now() - start > timeoutMs) throw new Error(`lock timeout after ${timeoutMs}ms: ${lockPath}`);
      sleepSync(retryMs);
    }
  }
  try { try { writeSync(fd, `${process.pid} ${new Date(now()).toISOString()}\n`); } catch { /* best-effort marker */ } return fn(); }
  finally { try { closeSync(fd); } catch { /* already closed */ } try { unlinkSync(lockPath); } catch { /* already gone */ } }
}
