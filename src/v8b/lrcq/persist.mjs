// FounderGate LRCQ — disk-first durable persistence + idempotent recovery.
// Atomic writes (tmp + rename). A restart rebuilds the controller from the last
// durable snapshot and never duplicates a job, gate, or evidence packet.
import { writeFileSync, readFileSync, existsSync, renameSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { Controller } from "./controller.mjs";

export function atomicWrite(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  renameSync(tmp, path);
}
export function saveSnapshot(dir, controller) {
  atomicWrite(join(dir, "recovery-state.json"), {
    schema: "lrcq-recovery-1",
    run_id: controller.run_id, mode: controller.mode, maxWidth: controller.maxWidth,
    deadlineEpoch: controller.deadlineEpoch, now: controller.now, paused: controller.paused,
    runtime_state: controller.runtime_state, stop_reason: controller.stop_reason, gate: controller.gate,
    seq: controller.seq, jobs: controller.jobs, events: controller.events, sealed: [...controller.sealed],
  });
}
// Idempotent resume: rebuild a Controller from disk. RUNNING jobs whose evidence was
// NOT sealed are reset to PENDING (safe re-attempt, no duplicate completion); RUNNING
// jobs whose evidence WAS sealed are promoted to COMPLETED (the crash happened after
// seal but before the final-state write) — never double-run, never falsely green.
export function resume(dir) {
  const p = join(dir, "recovery-state.json");
  if (!existsSync(p)) return null;
  const s = JSON.parse(readFileSync(p, "utf8"));
  const c = new Controller({ mode: s.mode, run_id: s.run_id, maxWidth: s.maxWidth, deadlineEpoch: s.deadlineEpoch, now: s.now });
  c.paused = s.paused; c.runtime_state = s.runtime_state; c.stop_reason = s.stop_reason; c.gate = s.gate; c.seq = s.seq;
  c.sealed = new Set(s.sealed || []);
  c.jobs = s.jobs.map((j) => {
    if (j.status === "RUNNING") {
      if (c.sealed.has(j.job_id)) return { ...j, status: "COMPLETED", status_reason: "recovered: evidence sealed before crash" };
      return { ...j, status: "PENDING", status_reason: "recovered: crashed before evidence seal — safe re-attempt" };
    }
    return { ...j };
  });
  c.byId = new Map(c.jobs.map((j) => [j.job_id, j]));
  // rebuild locks for any (post-recovery) RUNNING jobs — after reset there are none,
  // so locks start empty (fail-safe): no stale lock is treated as a live writer.
  c.locks = new Map(); c.activeBranches = new Map(); c.activeWorktrees = new Map();
  c.recovered = true;
  return c;
}
// Duplicate-run prevention: a live (unexpired, recently-checkpointed) run refuses a second start.
export function detectLiveRun(dir, nowEpoch, staleAfterS = 300) {
  const p = join(dir, "recovery-state.json");
  if (!existsSync(p)) return { live: false };
  const s = JSON.parse(readFileSync(p, "utf8"));
  const age = nowEpoch - (s.now || 0);
  if (["RUNNING", "PAUSED", "READY"].includes(s.runtime_state) && age < staleAfterS) return { live: true, run_id: s.run_id, age };
  return { live: false, stale: age >= staleAfterS, run_id: s.run_id };
}
