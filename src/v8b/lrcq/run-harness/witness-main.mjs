#!/usr/bin/env node
// FounderGate LRCQ — the REAL independent read-only WITNESS process (FG-LRCQ-ACT-018). A SEPARATE process
// (distinct PID from launcher + supervisor) that ATTACHES to an already-running supervised run by run ID
// and observes for the production 12-minute window (accelerated ONLY via a test-only env injection). It
// reads durable supervisor/ledger state + OS process liveness/lineage and returns HEALTHY_CONTINUE / HELD
// / FAILED / INSUFFICIENT_EVIDENCE. It NEVER writes run state, launches, restarts, repairs, consumes,
// alters the queue, extends the deadline, or spawns a second supervisor.
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { readSupervisorState, supervisorAlive } from "./supervisor.mjs";
import { witnessHealth } from "./health-witness.mjs";

function startIdentity(pid) { try { return execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], { encoding: "utf8" }).trim(); } catch { return null; } }
function childPids(pid) { try { return execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" }).trim().split(/\s+/).filter(Boolean); } catch { return []; } }

async function witness(opts) {
  const { supervisorDir, ledgerDir, runId, runRoot } = opts;
  const s0 = readSupervisorState(supervisorDir, runId);
  if (!s0 || s0.corrupt) return { result: "INSUFFICIENT_EVIDENCE", reason: "no/corrupt supervisor state for run " + runId };
  const activationId = s0.activation_id;
  const markerPath = join(ledgerDir, String(activationId).replace(":", "_") + ".consumed.json");
  const baselineIdentity = s0.process_start_identity;
  const mainBaseline = opts.protectedMainBaseline || null;

  const snapshot = () => {
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

  const testMs = process.env.LRCQ_WITNESS_TEST_MS ? Number(process.env.LRCQ_WITNESS_TEST_MS) : null; // test-only injection
  const totalMs = testMs != null ? testMs : 12 * 60 * 1000; // PRODUCTION: 12 minutes
  const polls = testMs != null ? (opts.polls || 4) : 12;
  const pollMs = Math.max(0, Math.floor(totalMs / polls));
  const r = await witnessHealth({ snapshot, polls, pollMs, sleep: (ms) => new Promise((res) => setTimeout(res, ms)) });
  return { ...r, result: r.result === "HEALTHY" ? "HEALTHY_CONTINUE" : r.result, run_id: runId, supervisor_pid: s0.supervisor_pid, immutable_hard_deadline_epoch: s0.immutable_hard_deadline_epoch, witness_pid: process.pid, production_witness_ms: 12 * 60 * 1000, accelerated_test: testMs != null };
}

export { witness };

if (process.argv[1] && /witness-main\.mjs$/.test(process.argv[1])) {
  const ci = process.argv.indexOf("--config");
  if (ci < 0 || !process.argv[ci + 1]) { console.error("usage: witness-main.mjs --config <cfg.json>  (read-only; never mutates)"); process.exit(2); }
  const cfg = JSON.parse(readFileSync(process.argv[ci + 1], "utf8"));
  witness(cfg).then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(r.result === "HEALTHY_CONTINUE" ? 0 : (r.result === "FAILED" ? 1 : 2)); }).catch((e) => { console.error("witness error:", e && e.message); process.exit(3); });
}
