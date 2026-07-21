#!/usr/bin/env node
// FounderGate LRCQ — the REAL independent read-only WITNESS process (FG-LRCQ-ACT-018/019/020/021). A SEPARATE
// process (distinct PID) that ATTACHES to a running supervised run by run ID and observes for the PRODUCTION
// 12-minute window. Its snapshot is built ONLY from mechanically observed / authoritative-durable sources
// (supervisor state dir, the run's evidence index, git protected-main ref, OS process state) — NO hard-coded
// safe values, NO self-comparison, NO caller-supplied safety conclusion. Controls a read-only observer
// cannot truthfully observe (cost ceiling, AKIOR/customer/merge/etc.) are reported as
// HARNESS_ENFORCED_NOT_WITNESS_OBSERVED, not asserted green. Returns HEALTHY_CONTINUE (RUN_ACTIVE + validated
// productivity) / COMPLETED_HEALTHY (successful terminal) / HELD / FAILED / INSUFFICIENT_EVIDENCE.
//
// SEAM CLOSURE (FG-LRCQ-ACT-019): the production window is an IMMUTABLE constant WITNESS_PRODUCTION_MS =
// 720000 (12 min) / 12 polls, NO override; LRCQ_WITNESS_TEST_MS present -> PRODUCTION_WITNESS_OVERRIDE_REFUSED.
// Accelerated witnessing exists ONLY in the test-only witness-accel entry (same core; timing only).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readSupervisorState } from "./supervisor.mjs";
import { witnessHealth } from "./health-witness.mjs";
import { supervisorObservation, childPids, processArgs, parseEvidenceIndex, liveSupervisorOwners, protectedMainState } from "./witness-sources.mjs";

export const WITNESS_PRODUCTION_MS = 12 * 60 * 1000; // immutable reviewed production window: 720000 ms
export const WITNESS_PRODUCTION_POLLS = 12;

// Build the read-only snapshot closure. Every field is mechanically observed or derived from an authoritative
// durable record; unobservable controls are omitted from the verdict (surfaced separately as harness-enforced).
function buildSnapshot(opts, s0) {
  const { supervisorDir, ledgerDir, runId, evidenceIndexPath, jobIds, providerExpectedPath, repoRoot, protectedMainRef, protectedMainBaseline, perJobTimeoutS } = opts;
  const activationId = s0.activation_id;
  const markerPath = join(ledgerDir, String(activationId).replace(":", "_") + ".consumed.json");
  const baselineIdentity = s0.process_start_identity;
  return () => {
    const { s, alive } = supervisorObservation(supervisorDir, runId, baselineIdentity);
    const kids = alive ? childPids(s.supervisor_pid) : [];
    // A provider is "present" only when a supervisor descendant is running the MANIFEST-BOUND provider
    // executable (a real cross-check of the observed process's argv against the expected path) — NOT any
    // child (the supervisor legitimately also spawns machine-verifier / git helpers) and NOT a config
    // self-comparison. exeMatch is true when such a child is present, undefined otherwise.
    const providerChild = !!providerExpectedPath && kids.some((pid) => { const a = processArgs(pid); return !!a && a.includes(providerExpectedPath); });
    const exeMatch = providerChild ? true : undefined;
    const evidence = parseEvidenceIndex(evidenceIndexPath, { runId, jobIds });
    const pmain = protectedMainState({ repoRoot, ref: protectedMainRef, baseline: protectedMainBaseline });
    return {
      supervisor: { run_id: s.run_id, supervisor_pid: s.supervisor_pid, immutable_hard_deadline_epoch: s.immutable_hard_deadline_epoch, state: s.state, heartbeat_epoch: s.heartbeat_epoch, activation_id: s.activation_id, process_start_identity: s.process_start_identity },
      supervisor_alive: alive, consumed: existsSync(markerPath), live_supervisor_owners: liveSupervisorOwners(supervisorDir, runId),
      provider_child_present: providerChild, provider_descendant_of_supervisor: providerChild ? true : undefined, provider_exe_matches_expected: exeMatch,
      evidence, queue_total: Array.isArray(jobIds) ? jobIds.length : undefined,
      protected_main: pmain, now_epoch: Math.floor(Date.now() / 1000), per_job_timeout_s: perJobTimeoutS,
      immutable_deadline_epoch: s.immutable_hard_deadline_epoch,
      terminal_state: s.state && s.state !== "RUN_ACTIVE" ? s.state : null,
    };
  };
}

// Timing-parameterized core. PRODUCTION pins { WITNESS_PRODUCTION_MS, WITNESS_PRODUCTION_POLLS }; the ONLY
// caller passing a shortened window is the structurally test-only witness-accel entry. Verdict returned verbatim.
export async function witnessWithTiming(opts, { totalMs, polls }) {
  const s0 = readSupervisorState(opts.supervisorDir, opts.runId);
  if (!s0 || s0.corrupt) return { result: "INSUFFICIENT_EVIDENCE", reason: "no/corrupt supervisor state for run " + opts.runId };
  const snapshot = buildSnapshot(opts, s0);
  const pollMs = Math.max(0, Math.floor(totalMs / polls));
  const r = await witnessHealth({ snapshot, polls, pollMs, sleep: (ms) => new Promise((res) => setTimeout(res, ms)) });
  return { ...r, run_id: opts.runId, supervisor_pid: s0.supervisor_pid, immutable_hard_deadline_epoch: s0.immutable_hard_deadline_epoch, witness_pid: process.pid, production_witness_ms: WITNESS_PRODUCTION_MS, accelerated_test: totalMs !== WITNESS_PRODUCTION_MS };
}

// PRODUCTION witness entry: immutable 12-minute window; NO override path. Fails closed on the retired accelerator.
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
  witness(cfg).then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(r.result === "HEALTHY_CONTINUE" || r.result === "COMPLETED_HEALTHY" ? 0 : (r.result === "FAILED" ? 1 : 2)); }).catch((e) => { console.error("witness error:", e && e.message); process.exit(3); });
}
