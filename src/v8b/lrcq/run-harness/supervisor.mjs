// FounderGate LRCQ — run SUPERVISOR ownership (FG-LRCQ-ACT-015). Exactly one supervisor owns a run's
// immutable deadline, queue, and cost ledger. It records its PID + a heartbeat, REFUSES a duplicate
// supervisor for the same run, installs the immutable deadline from the consumption receipt (never a new
// window), and writes a durable terminal state. Fail-closed. It does NOT invoke the provider or mint
// authority — it wraps the already-reviewed harness execution and its evidence/lock/recovery plane.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const SUPERVISOR_SCHEMA = "lrcq-supervisor-1";
export const SUPERVISOR_STATES = ["RUN_ACTIVE", "STOPPED_DEADLINE", "STOPPED_BY_STOP", "STOPPED_EXHAUSTED", "CONTROLLED_BUDGET_STOP", "HELD", "FAILED_CLOSED", "TORN_DOWN"];

const statePath = (dir, run_id) => join(dir, "supervisor-" + String(run_id).replace(/[^a-zA-Z0-9_.-]/g, "_") + ".state.json");

// Is a recorded supervisor process still alive? (injectable for deterministic tests)
export function supervisorAlive(pid, opts = {}) {
  const probe = opts.aliveProbe || ((p) => { try { process.kill(p, 0); return true; } catch (e) { return e && e.code === "EPERM"; } });
  return typeof pid === "number" && probe(pid);
}

// Claim single-supervisor ownership of the run. Refuses if a LIVE supervisor already owns it.
export function startSupervisor(opts = {}) {
  const { stateDir, run_id, consumerReceipt } = opts;
  if (!stateDir || !run_id || !consumerReceipt || consumerReceipt.consumed_once !== true) return { ok: false, reason: "REFUSED: missing state dir / run_id / consumed receipt" };
  const now = typeof opts.now === "number" ? opts.now : Math.floor(Date.now() / 1000);
  const pid = typeof opts.pid === "number" ? opts.pid : process.pid;
  const has = opts.exists || existsSync;
  const read = opts.read || ((p) => readFileSync(p, "utf8"));
  const write = opts.write || ((p, c) => writeFileSync(p, c));
  const mkdirp = opts.mkdirp || ((p) => mkdirSync(p, { recursive: true }));
  const deadline = consumerReceipt.immutable_hard_deadline_epoch;
  if (typeof deadline !== "number" || deadline <= now) return { ok: false, reason: "REFUSED: no valid immutable deadline in receipt" };

  const sp = statePath(stateDir, run_id);
  // Duplicate-supervisor refusal: a RUN_ACTIVE state with a live PID means one already owns this run.
  if (has(sp)) {
    let prior = null; try { prior = JSON.parse(read(sp)); } catch { return { ok: false, reason: "REFUSED: existing supervisor state is corrupt (fail-closed)" }; }
    if (prior && prior.state === "RUN_ACTIVE" && supervisorAlive(prior.supervisor_pid, opts)) return { ok: false, reason: "REFUSED: a live supervisor already owns run " + run_id, duplicate: true, existing_pid: prior.supervisor_pid };
    if (prior && SUPERVISOR_STATES.includes(prior.state) && prior.state !== "RUN_ACTIVE") return { ok: false, reason: "REFUSED: run already reached terminal state " + prior.state, terminal: prior.state };
    // prior RUN_ACTIVE but pid dead => a crashed supervisor; recovery is a founder-gated decision, not a silent re-own.
    if (prior && prior.state === "RUN_ACTIVE") return { ok: false, reason: "REFUSED: prior supervisor recorded RUN_ACTIVE but its process is gone — needs founder-gated recovery, not silent re-ownership", stale_active: true };
  }
  try { mkdirp(stateDir); } catch { /* */ }
  const state = {
    schema: SUPERVISOR_SCHEMA, run_id, supervisor_pid: pid, activation_id: consumerReceipt.activation_id,
    start_epoch: now, immutable_hard_deadline_epoch: deadline, run_duration_s: consumerReceipt.run_duration_s,
    max_budget_usd: consumerReceipt.max_budget_usd, heartbeat_epoch: now, state: "RUN_ACTIVE",
    owns: ["immutable_deadline", "queue", "cost_ledger", "process_tree"],
  };
  try { write(sp, JSON.stringify(state, null, 2) + "\n"); } catch (e) { return { ok: false, reason: "REFUSED: supervisor state write failed: " + (e && e.message) }; }
  const handle = {
    ...state, state_path: sp,
    heartbeat(t) { const now2 = typeof t === "number" ? t : Math.floor(Date.now() / 1000); state.heartbeat_epoch = now2; write(sp, JSON.stringify(state, null, 2) + "\n"); return now2; },
    // The immutable deadline can NEVER be extended by the supervisor.
    setTerminal(finalState, reason) { if (!SUPERVISOR_STATES.includes(finalState) || finalState === "RUN_ACTIVE") throw new Error("invalid terminal state"); state.state = finalState; state.terminal_reason = reason || null; state.terminal_epoch = Math.floor(Date.now() / 1000); write(sp, JSON.stringify(state, null, 2) + "\n"); return finalState; },
  };
  return { ok: true, handle, launch_receipt: { run_id, supervisor_pid: pid, immutable_hard_deadline_epoch: deadline, state: "RUN_ACTIVE", activation_id: consumerReceipt.activation_id, run_duration_s: consumerReceipt.run_duration_s, max_budget_usd: consumerReceipt.max_budget_usd } };
}

// Read-only supervisor state (witness/recovery use this; never mutates).
export function readSupervisorState(stateDir, run_id, opts = {}) {
  const read = opts.read || ((p) => readFileSync(p, "utf8"));
  const has = opts.exists || existsSync;
  const sp = statePath(stateDir, run_id);
  if (!has(sp)) return null;
  try { return JSON.parse(read(sp)); } catch { return { corrupt: true }; }
}
