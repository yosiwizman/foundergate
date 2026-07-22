// FounderGate LRCQ — TEST-ONLY in-process supervised-run orchestration (FG-LRCQ-ACT-019).
//
// RELOCATED here, OUT of the production launcher (tools/terminal0/lrcq/run-five-hour.mjs), so the
// synchronous / in-process supervised route is structurally ABSENT from the production authority graph.
// Production real-activation execution uses ONLY launchDetachedSupervisor (a genuine detached OS process).
// This module exists solely to unit-test the activation-lifecycle control plane (durable one-time
// consumption + anti-replay + single-owner supervisor + durable terminal state) with SYNTHETIC signed
// fixtures + DETERMINISTIC stub providers — NEVER the real provider. No production module imports it.
import { executeSignedRun } from "../../../../../tools/terminal0/lrcq/run-five-hour.mjs";
import { validateActivationV3 } from "../../assurance/assurance-core.mjs";
import { consumeActivation } from "../../run-harness/activation-consumer.mjs";
import { startSupervisor } from "../../run-harness/supervisor.mjs";
import { resolve } from "node:path";

// Map a harness result to a durable supervisor terminal state (all fail-closed / bounded stops).
export function mapTerminalState(result) {
  const fstate = result && result.final_state;
  if (fstate === "STOPPED_DEADLINE") return { state: "STOPPED_DEADLINE", reason: "hard deadline reached" };
  if (fstate === "STOPPED_BY_STOP") return { state: "STOPPED_BY_STOP", reason: "stop control observed" };
  if (fstate === "CONTROLLED_BUDGET_STOP" || (result && result.outcome_status === "CONTROLLED_BUDGET_STOP")) return { state: "CONTROLLED_BUDGET_STOP", reason: "run-wide $10 ceiling" };
  if (fstate && /HELD/.test(fstate)) return { state: "HELD", reason: fstate };
  if (result && result.ready === false) return { state: "HELD", reason: (result.refused && result.refused.stage) || "not ready" };
  return { state: "STOPPED_EXHAUSTED", reason: "queue drained / run complete" };
}

export async function executeSupervisedRun(activation, man, runBindings, counters, exec = {}, life = {}) {
  const root = man.root;
  const ledgerDir = life.ledgerDir || resolve(root, man.manifest.evidence_root, "activation-ledger");
  const supervisorDir = life.supervisorDir || resolve(root, man.manifest.evidence_root, "supervisor");
  const now = typeof life.now === "number" ? life.now : Math.floor(Date.now() / 1000);
  // Gate 0: an unsigned/mis-bound record never consumes or supervises — run the authoritative refusal path.
  if (!validateActivationV3(activation, runBindings).valid) { const r = await executeSignedRun(activation, man, runBindings, counters, exec); return { ...r, consumed: false, supervised: false }; }
  // Gate 1: consume exactly once (durable, anti-replay).
  const consumption = consumeActivation(activation, { ledgerDir, now });
  if (!consumption.ok) return { ready: false, refused: { stage: "activation_consumption", reasons: [consumption.reason] }, final_state: consumption.replay_blocked ? "REPLAY_BLOCKED" : "CONSUMPTION_REFUSED", consumed: false, consumption };
  // Gate 2: single supervisor ownership (PID + heartbeat + immutable deadline from the receipt).
  const sup = startSupervisor({ stateDir: supervisorDir, run_id: activation.run_id, consumerReceipt: consumption, now, pid: life.pid });
  if (!sup.ok) return { ready: false, refused: { stage: "supervisor", reasons: [sup.reason] }, final_state: "SUPERVISOR_REFUSED", consumed: true, consumption, supervisor: sup };
  let result;
  try {
    sup.handle.heartbeat(now);
    result = await executeSignedRun(activation, man, runBindings, counters, exec);
    const term = mapTerminalState(result);
    sup.handle.setTerminal(term.state, term.reason);
    return { ...result, consumed: true, supervised: true, consumption_receipt: consumption, launch_receipt: sup.launch_receipt, terminal_state: term.state };
  } catch (e) {
    try { sup.handle.setTerminal("FAILED_CLOSED", e && e.message); } catch { /* */ }
    return { ready: false, refused: { stage: "supervised_execution", reasons: [e && e.message] }, final_state: "FAILED_CLOSED", consumed: true, consumption_receipt: consumption, launch_receipt: sup.launch_receipt, terminal_state: "FAILED_CLOSED" };
  }
}
