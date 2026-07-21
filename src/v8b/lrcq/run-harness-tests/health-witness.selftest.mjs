// FounderGate LRCQ — health-witness verdict semantics (FG-LRCQ-ACT-016/020). Deterministic synthetic
// snapshots drive the ACTIVE-run verdict rules: HEALTHY_CONTINUE only while RUN_ACTIVE + progressing;
// COMPLETED_HEALTHY for a successful terminal (never HEALTHY_CONTINUE); HELD for stall / controlled stop /
// missing-cost; FAILED for boundary/identity/lineage/deadline/dead-supervisor breach; INSUFFICIENT otherwise.
// Also encodes the mutation guards: post-terminal must not be HEALTHY_CONTINUE; a legitimate between-job
// zero-child interval with progress stays HEALTHY_CONTINUE (no final-snapshot-child requirement).
import { witnessHealth } from "../run-harness/health-witness.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// Base healthy ACTIVE snapshot at poll i (evidence index grows; provider child present; RUN_ACTIVE).
function base(i, over = {}) {
  const s = {
    supervisor: { run_id: "R", supervisor_pid: 4321, immutable_hard_deadline_epoch: 9e12, state: "RUN_ACTIVE", heartbeat_epoch: 1000 + i, activation_id: "sha256:aa", process_start_identity: "PSID" },
    supervisor_alive: true, duplicate_supervisors: 0, consumed: true,
    queue_total: 3, queue_initial_expected: 3, provider_child_present: true, provider_descendant_of_supervisor: true,
    provider_identity: "pid", provider_expected_identity: "pid", escaped_processes: 0,
    evidence_index_count: 1 + i, cost_spent_usd: 1.0, cost_ceiling_usd: 10, cost_reservation_exceeded: false, missing_cost_held: true,
    protected_main_sha: "M", protected_main_baseline_sha: "M", akior_or_m1_access: false, customer_or_prod_access: false,
    merge_push_deploy_send_payment: false, crash_count: 0, second_provider_route: false, second_executor: false, terminal_state: null,
  };
  return deepMerge(s, typeof over === "function" ? over(i) : over);
}
function deepMerge(a, b) { const o = { ...a }; for (const k of Object.keys(b)) { o[k] = (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) ? deepMerge(a[k] || {}, b[k]) : b[k]; } return o; }
async function verdict(overFn, polls = 3) { return (await witnessHealth({ snapshot: (i) => base(i, overFn ? overFn(i) : {}), polls, pollMs: 0, sleep: () => Promise.resolve() })).result; }

// ---- core active-run + terminal semantics ----
ok("01 active run, evidence grows + provider present, RUN_ACTIVE -> HEALTHY_CONTINUE", (await verdict(null)) === "HEALTHY_CONTINUE");
ok("02 successful terminal (STOPPED_EXHAUSTED) -> COMPLETED_HEALTHY (never HEALTHY_CONTINUE)", (await verdict(() => ({ supervisor: { state: "STOPPED_EXHAUSTED" }, terminal_state: "STOPPED_EXHAUSTED", provider_child_present: false }))) === "COMPLETED_HEALTHY");
ok("03 legitimate between-job zero-child but evidence still grows -> HEALTHY_CONTINUE", (await verdict((i) => ({ provider_child_present: false, evidence_index_count: 5 + i }))) === "HEALTHY_CONTINUE");
ok("04 stall: RUN_ACTIVE, no evidence growth, no child, frozen heartbeat -> HELD", (await verdict(() => ({ provider_child_present: false, evidence_index_count: 5, supervisor: { heartbeat_epoch: 1000 } }))) === "HELD");
ok("05 heartbeat advances alone (no evidence growth, no child) -> HEALTHY_CONTINUE", (await verdict((i) => ({ provider_child_present: false, evidence_index_count: 5, supervisor: { heartbeat_epoch: 2000 + i } }))) === "HEALTHY_CONTINUE");

// ---- boundary-critical => FAILED ----
ok("06 changed immutable deadline -> FAILED", (await verdict((i) => ({ supervisor: { immutable_hard_deadline_epoch: 9e12 + i } }))) === "FAILED");
ok("07 changed process-start identity -> FAILED", (await verdict((i) => ({ supervisor: { process_start_identity: "PSID" + i } }))) === "FAILED");
ok("08 duplicate supervisor -> FAILED", (await verdict(() => ({ duplicate_supervisors: 1 }))) === "FAILED");
ok("09 escaped provider child (present but not descendant) -> FAILED", (await verdict(() => ({ provider_child_present: true, provider_descendant_of_supervisor: false }))) === "FAILED");
ok("10 escaped_processes>0 -> FAILED", (await verdict(() => ({ escaped_processes: 1 }))) === "FAILED");
ok("11 wrong provider identity -> FAILED", (await verdict(() => ({ provider_identity: "EVIL" }))) === "FAILED");
ok("12 protected-main drift -> FAILED", (await verdict((i) => ({ protected_main_sha: "M" + i }))) === "FAILED");
ok("13 supervisor dead while claiming RUN_ACTIVE (stale) -> FAILED", (await verdict(() => ({ supervisor_alive: false }))) === "FAILED");
ok("14 replay no longer blocked (consumed false) -> FAILED", (await verdict(() => ({ consumed: false }))) === "FAILED");
ok("15 crash loop (crash_count>=3) -> FAILED", (await verdict(() => ({ crash_count: 3 }))) === "FAILED");
ok("16 cost reservation exceeded -> FAILED", (await verdict(() => ({ cost_reservation_exceeded: true }))) === "FAILED");
ok("17 terminal FAILED_CLOSED during witness -> FAILED", (await verdict(() => ({ supervisor: { state: "FAILED_CLOSED" }, terminal_state: "FAILED_CLOSED" }))) === "FAILED");
ok("18 second provider route/executor -> FAILED", (await verdict(() => ({ second_provider_route: true }))) === "FAILED");

// ---- HELD tier ----
ok("19 controlled hold terminal (HELD) -> HELD", (await verdict(() => ({ supervisor: { state: "HELD" }, terminal_state: "HELD" }))) === "HELD");
ok("20 controlled budget stop -> HELD", (await verdict(() => ({ supervisor: { state: "CONTROLLED_BUDGET_STOP" }, terminal_state: "CONTROLLED_BUDGET_STOP" }))) === "HELD");
ok("21 missing cost condition on active run -> HELD (not HEALTHY_CONTINUE)", (await verdict(() => ({ missing_cost_held: false }))) === "HELD");

// ---- INSUFFICIENT ----
ok("22 unreadable state (no run state, not terminal) -> INSUFFICIENT_EVIDENCE", (await verdict(() => ({ supervisor: { state: undefined }, supervisor_alive: false, terminal_state: null }))) === "INSUFFICIENT_EVIDENCE");
ok("23 no snapshot source -> INSUFFICIENT_EVIDENCE", (await witnessHealth({})).result === "INSUFFICIENT_EVIDENCE");

// ---- structural: witness is read-only by construction (mutation guards 20-25) ----
const HERE = dirname(fileURLToPath(import.meta.url));
const hwSrc = readFileSync(join(HERE, "../run-harness/health-witness.mjs"), "utf8");
ok("24 health-witness performs no writes/spawns (read-only)", !/writeFileSync|appendFileSync|mkdirSync|rmSync|spawn\(|execFile|child_process/.test(hwSrc));
ok("25 result carries read_only:true", (await witnessHealth({ snapshot: (i) => base(i), polls: 2, pollMs: 0, sleep: () => Promise.resolve() })).read_only === true);
ok("26 mutation guard: post-terminal success is COMPLETED_HEALTHY, asserting != HEALTHY_CONTINUE", (await verdict(() => ({ supervisor: { state: "STOPPED_EXHAUSTED" }, terminal_state: "STOPPED_EXHAUSTED" }))) !== "HEALTHY_CONTINUE");

console.log("\nLRCQ HEALTH-WITNESS SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
