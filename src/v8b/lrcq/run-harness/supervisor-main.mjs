#!/usr/bin/env node
// FounderGate LRCQ — the REAL dedicated SUPERVISOR process (FG-LRCQ-ACT-017). Spawned DETACHED by the
// launcher (new process group, stdin disconnected, stdout/stderr redirected to durable run files) so it
// OUTLIVES the launcher/terminal and keeps the supervised run operating up to the immutable deadline. It
// owns: RUN_ACTIVE publication + PID + process-start identity, the heartbeat, executeSignedRun (the ONE
// existing executor + provider adapter), the immutable deadline, and durable terminal state + teardown.
// It NEVER invokes real Claude directly — it runs whatever provider the manifest binds (a stub in tests).
import { readFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { startSupervisor } from "./supervisor.mjs";
import { readConsumedReceipt } from "./activation-consumer.mjs";
import { executeSignedRun } from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";

function processStartIdentity(pid) { try { return execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], { encoding: "utf8" }).trim(); } catch { return null; } }

async function supervise(cfgPath) {
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  const { activation, man, bindings, exec, ledgerDir, supervisorDir } = cfg;
  const log = (o) => { try { appendFileSync(cfg.eventLog || "/dev/null", JSON.stringify({ ...o, pid: process.pid, at: Math.floor(Date.now() / 1000) }) + "\n"); } catch { /* */ } };

  // The launcher already atomically consumed the activation; the supervisor reads the durable receipt
  // (immutable deadline) and NEVER re-consumes or mints a new window. Fail closed if not consumed.
  const receipt = readConsumedReceipt(activation, { ledgerDir });
  if (!receipt || receipt.corrupt || receipt.consumed_once !== true) { log({ evt: "SUPERVISOR_ABORT", reason: "activation not durably consumed" }); process.exit(3); }

  const sup = startSupervisor({ stateDir: supervisorDir, run_id: activation.run_id, consumerReceipt: receipt, pid: process.pid, process_start_identity: processStartIdentity(process.pid) });
  if (!sup.ok) { log({ evt: "SUPERVISOR_REFUSED", reason: sup.reason }); process.exit(4); }
  log({ evt: "RUN_ACTIVE", run_id: activation.run_id, supervisor_pid: process.pid, immutable_hard_deadline_epoch: receipt.immutable_hard_deadline_epoch });

  // Advance the heartbeat on a bounded interval while the run executes (in THIS process, not the launcher).
  const hbMs = typeof cfg.heartbeatMs === "number" ? cfg.heartbeatMs : 30000;
  const hb = setInterval(() => { try { sup.handle.heartbeat(Math.floor(Date.now() / 1000)); } catch { /* */ } }, hbMs);
  if (hb.unref) hb.unref();

  let counters = { c: {}, wrap(name, fn) { this.c[name] = 0; return async (...a) => { this.c[name]++; return fn(...a); }; } };
  let term = "STOPPED_EXHAUSTED", reason = "queue drained";
  try {
    const result = await executeSignedRun(activation, man, bindings, counters, exec);
    const fstate = result && result.final_state;
    if (fstate === "STOPPED_DEADLINE") { term = "STOPPED_DEADLINE"; reason = "hard deadline reached"; }
    else if (fstate === "STOPPED_BY_STOP") { term = "STOPPED_BY_STOP"; reason = "stop control"; }
    else if (fstate === "CONTROLLED_BUDGET_STOP" || (result && result.outcome_status === "CONTROLLED_BUDGET_STOP")) { term = "CONTROLLED_BUDGET_STOP"; reason = "$10 ceiling"; }
    else if (fstate && /HELD/.test(fstate)) { term = "HELD"; reason = fstate; }
    else if (result && result.ready === false) { term = "HELD"; reason = (result.refused && result.refused.stage) || "not ready"; }
    log({ evt: "RUN_TERMINAL", final_state: fstate, mapped: term, refused: result && result.refused });
  } catch (e) { term = "FAILED_CLOSED"; reason = (e && e.message) || "error"; log({ evt: "RUN_FAILED_CLOSED", reason }); }
  clearInterval(hb);
  try { sup.handle.setTerminal(term, reason); } catch { /* */ }
  // Bounded process-group teardown: reap any lingering descendant provider process in our group.
  try { process.kill(-process.pid, "SIGTERM"); } catch { /* no descendants / already gone */ }
  log({ evt: "TORN_DOWN", terminal: term });
  process.exit(0);
}

if (process.argv[1] && /supervisor-main\.mjs$/.test(process.argv[1])) {
  const ci = process.argv.indexOf("--config");
  if (ci < 0 || !process.argv[ci + 1]) { console.error("usage: supervisor-main.mjs --config <cfg.json>"); process.exit(2); }
  supervise(process.argv[ci + 1]).catch((e) => { console.error("supervisor error:", e && e.message); process.exit(5); });
}
