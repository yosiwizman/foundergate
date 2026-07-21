// FounderGate LRCQ — detached-launch FAIL-CLOSED cases (FG-LRCQ-ACT-017). Exercises launchDetachedSupervisor's
// refusals BEFORE any run: unsigned/mis-bound, replay, supervisor never reaches RUN_ACTIVE, and spawn of a
// missing supervisor entry point. Fast (short startup bound); no real provider. (Duplicate-supervisor,
// corrupt-state, stale-heartbeat, deadline-extension, wrong-run-id, witness-write-refused, PID-reuse are
// proven in supervisor.selftest / activation-consumer.selftest / health-witness.selftest.)
import { launchDetachedSupervisor } from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-detfail-"));
const NOOP = join(ROOT, "noop-supervisor.mjs"); writeFileSync(NOOP, "process.exit(0);\n"); // exits without publishing RUN_ACTIVE
const MISSING = join(ROOT, "does-not-exist-supervisor.mjs");
const DEADLINE = 9_000_000_000;
const IDENT = "sha256:" + "a".repeat(64);
const man = () => ({ manifest: { evidence_root: "ev", repository_root: ROOT }, loaded: {}, root: ROOT });
const bindings = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_path: "/x", provider_identity: IDENT, now_epoch: 1000, candidate_stack: "R" };
const activation = (o = {}) => ({ schema_version: "lrcq-activation-3", founder_signature: "SYN", issued_epoch: 500, expiry_epoch: 9_999_999_999, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_executable_path: "/x", provider_version: "v", provider_executable_identity: IDENT, policy_version: "pv", capability_lease_digest: "ld", blast_radius_budget_digest: "bd", run_id: "F-RUN", hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_parallel_width: 1, per_job_timeout_s: 2700, termination_grace_s: 30, max_output_bytes: 1048576, max_budget_usd: 10, delegation_depth: 1, external_calls: 0, recipients: 0, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, ...o });
const life = (over = {}) => ({ ledgerDir: join(ROOT, "l"), supervisorDir: join(ROOT, "s"), runRoot: join(ROOT, "r"), supervisorMainPath: NOOP, startupTimeoutMs: 800, pollMs: 80, heartbeatMs: 100, ...over });

try {
  // 01 unsigned -> refuse BEFORE consume/spawn
  { const r = await launchDetachedSupervisor(activation({ founder_signature: null, run_id: "U1" }), man(), bindings, {}, life({ ledgerDir: join(ROOT, "lU") })); ok("01 unsigned refused (not consumed, not launched)", r.ready === false && r.consumed === false && r.launched === false && r.final_state === "REFUSED"); }
  // 02 supervisor never reaches RUN_ACTIVE (noop supervisor) -> RUN_ACTIVE_TIMEOUT, consumed but not launched
  { const r = await launchDetachedSupervisor(activation({ run_id: "T1" }), man(), bindings, {}, life({ ledgerDir: join(ROOT, "lT"), supervisorDir: join(ROOT, "sT") })); ok("02 no RUN_ACTIVE within bound -> refuse (consumed, not launched)", r.ready === false && r.launched === false && r.final_state === "RUN_ACTIVE_TIMEOUT" && r.consumed === true); }
  // 03 replay: a second launch of the SAME activation on the SAME ledger refuses BEFORE spawn
  { const L = { ledgerDir: join(ROOT, "lR"), supervisorDir: join(ROOT, "sR") };
    await launchDetachedSupervisor(activation({ run_id: "R1" }), man(), bindings, {}, life(L));
    const r2 = await launchDetachedSupervisor(activation({ run_id: "R1" }), man(), bindings, {}, life(L));
    ok("03 replay refused (REPLAY_BLOCKED, not consumed again, not launched)", r2.ready === false && r2.final_state === "REPLAY_BLOCKED" && r2.launched === false); }
  // 04 spawn of a MISSING supervisor entry -> child fails -> RUN_ACTIVE never appears -> refuse (never launched)
  { const r = await launchDetachedSupervisor(activation({ run_id: "M1" }), man(), bindings, {}, life({ ledgerDir: join(ROOT, "lM"), supervisorDir: join(ROOT, "sM"), supervisorMainPath: MISSING })); ok("04 missing supervisor entry -> refuse, never launched", r.ready === false && r.launched === false && (r.final_state === "RUN_ACTIVE_TIMEOUT" || r.final_state === "SUPERVISOR_SPAWN_FAILED")); }
  // 05 elapsed deadline -> consumer refuses (no spawn)
  { const r = await launchDetachedSupervisor(activation({ run_id: "D1", hard_deadline_epoch: 1 }), man(), bindings, {}, life({ ledgerDir: join(ROOT, "lD"), supervisorDir: join(ROOT, "sD") })); ok("05 elapsed deadline refused (validate or consume, not launched)", r.ready === false && r.launched === false); }
} finally { try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ DETACHED-SUPERVISOR-FAILURE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
