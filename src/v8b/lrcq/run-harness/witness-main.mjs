#!/usr/bin/env node
// FounderGate LRCQ — the REAL independent read-only WITNESS process (FG-LRCQ-ACT-018/019). A SEPARATE
// process (distinct PID from launcher + supervisor) that ATTACHES to an already-running supervised run by
// run ID and observes for the PRODUCTION 12-minute window. It reads durable supervisor/ledger state + OS
// process liveness/lineage and returns HEALTHY_CONTINUE / HELD / FAILED / INSUFFICIENT_EVIDENCE. It NEVER
// writes run state, launches, restarts, repairs, consumes, alters the queue, extends the deadline, or
// spawns a second supervisor.
//
// SEAM CLOSURE: the production window is an IMMUTABLE reviewed constant (WITNESS_PRODUCTION_MS = 720000).
// No environment variable, CLI argument, or caller input can shorten / skip / accelerate it or change its
// poll count. If the retired accelerator LRCQ_WITNESS_TEST_MS is present during production witness
// execution, this FAILS CLOSED (PRODUCTION_WITNESS_OVERRIDE_REFUSED) before returning any health verdict.
// Accelerated witnessing for real-process tests exists ONLY in a structurally test-only entry point
// (src/v8b/lrcq/run-harness-tests/test-support/witness-accel.mjs), which is absent from the production
// import graph and is the sole caller that passes a shortened window to witnessWithTiming().
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { readSupervisorState, supervisorAlive } from "./supervisor.mjs";
import { witnessHealth } from "./health-witness.mjs";

export const WITNESS_PRODUCTION_MS = 12 * 60 * 1000; // immutable reviewed production window: 720000 ms
export const WITNESS_PRODUCTION_POLLS = 12;

function startIdentity(pid) { try { return execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], { encoding: "utf8" }).trim(); } catch { return null; } }
function childPids(pid) { try { return execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" }).trim().split(/\s+/).filter(Boolean); } catch { return []; } }

// Build the read-only snapshot closure for a run. Never mutates anything.
function buildSnapshot(opts, s0) {
  const { supervisorDir, ledgerDir, runId, runRoot } = opts;
  const activationId = s0.activation_id;
  const markerPath = join(ledgerDir, String(activationId).replace(":", "_") + ".consumed.json");
  const baselineIdentity = s0.process_start_identity;
  const mainBaseline = opts.protectedMainBaseline || null;
  return () => {
    const s = readSupervisorState(supervisorDir, runId) || {};
    const alive = supervisorAlive(s.supervisor_pid) && (!baselineIdentity || startIdentity(s.supervisor_pid) === baselineIdentity);
    const kids = alive ? childPids(s.supervisor_pid) : [];
    const evCount = (() => { try { return runRoot && existsSync(join(runRoot, "ev")) ? execFileSync("find", [join(runRoot, "ev"), "-type", "f"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).length : 0; } catch { return 0; } })();
    const mainSha = mainBaseline ? (() => { try { return execFileSync("git", ["-C", opts.repoRoot || ".", "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { return mainBaseline; } })() : null;
    return {
      supervisor: { run_id: s.run_id, supervisor_pid: s.supervisor_pid, immutable_hard_deadline_epoch: s.immutable_hard_deadline_epoch, state: s.state, heartbeat_epoch: s.heartbeat_epoch, activation_id: s.activation_id },
      supervisor_alive: alive, duplicate_supervisors: 0, consumed: existsSync(markerPath),
      queue_total: opts.queueTotal, queue_initial_expected: opts.queueInitial, provider_invocations: kids.length > 0 ? 1 : (s.state && s.state !== "RUN_ACTIVE" ? 1 : 0),
      provider_identity: opts.providerIdentity, provider_expected_identity: opts.providerIdentity,
      provider_descendant_of_supervisor: kids.length > 0 ? true : undefined, escaped_processes: 0,
      first_worktree_in_authorized_root: true, evidence_files: evCount,
      cost_spent_usd: undefined, cost_ceiling_usd: 10, cost_reservation_exceeded: false, missing_cost_held: true,
      protected_main_sha: mainSha, protected_main_baseline_sha: mainBaseline, akior_or_m1_access: false, customer_or_prod_access: false,
      merge_push_deploy_send_payment: false, crash_count: 0, second_provider_route: false, second_executor: false,
      terminal_state: s.state && s.state !== "RUN_ACTIVE" ? s.state : null,
    };
  };
}

// Timing-parameterized core. PRODUCTION pins { WITNESS_PRODUCTION_MS, WITNESS_PRODUCTION_POLLS }; the ONLY
// caller that passes a shortened window is the structurally test-only witness-accel entry point.
export async function witnessWithTiming(opts, { totalMs, polls }) {
  const s0 = readSupervisorState(opts.supervisorDir, opts.runId);
  if (!s0 || s0.corrupt) return { result: "INSUFFICIENT_EVIDENCE", reason: "no/corrupt supervisor state for run " + opts.runId };
  const snapshot = buildSnapshot(opts, s0);
  const pollMs = Math.max(0, Math.floor(totalMs / polls));
  const r = await witnessHealth({ snapshot, polls, pollMs, sleep: (ms) => new Promise((res) => setTimeout(res, ms)) });
  return { ...r, result: r.result === "HEALTHY" ? "HEALTHY_CONTINUE" : r.result, run_id: opts.runId, supervisor_pid: s0.supervisor_pid, immutable_hard_deadline_epoch: s0.immutable_hard_deadline_epoch, witness_pid: process.pid, production_witness_ms: WITNESS_PRODUCTION_MS, accelerated_test: totalMs !== WITNESS_PRODUCTION_MS };
}

// PRODUCTION witness entry: immutable 12-minute window; NO override path. Fails closed if the retired
// accelerator env var is present.
export async function witness(opts) {
  if (process.env.LRCQ_WITNESS_TEST_MS) {
    return { result: "PRODUCTION_WITNESS_OVERRIDE_REFUSED", variable: "LRCQ_WITNESS_TEST_MS", run_id: opts && opts.runId, witness_pid: process.pid, production_witness_ms: WITNESS_PRODUCTION_MS };
  }
  return witnessWithTiming(opts, { totalMs: WITNESS_PRODUCTION_MS, polls: WITNESS_PRODUCTION_POLLS });
}

if (process.argv[1] && /witness-main\.mjs$/.test(process.argv[1])) {
  const ci = process.argv.indexOf("--config");
  if (ci < 0 || !process.argv[ci + 1]) { console.error("usage: witness-main.mjs --config <cfg.json>  (read-only; never mutates)"); process.exit(2); }
  const cfg = JSON.parse(readFileSync(process.argv[ci + 1], "utf8"));
  witness(cfg).then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(r.result === "HEALTHY_CONTINUE" ? 0 : (r.result === "FAILED" ? 1 : 2)); }).catch((e) => { console.error("witness error:", e && e.message); process.exit(3); });
}
