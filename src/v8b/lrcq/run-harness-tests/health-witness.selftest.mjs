// FounderGate LRCQ — health-witness verdict semantics over OBSERVED-ONLY fields (FG-LRCQ-ACT-020/021).
// No hard-coded safe value can green a check; productivity requires validated evidence advancement OR a
// verified in-flight provider within signed grace (heartbeat alone / one transient child never suffice);
// UNKNOWN protected-main fails closed; unobservable controls are reported (not asserted). Deterministic.
import { witnessHealth } from "../run-harness/health-witness.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

function base(i, over = {}) {
  const s = {
    supervisor: { run_id: "R", supervisor_pid: 4321, immutable_hard_deadline_epoch: 9e12, state: "RUN_ACTIVE", heartbeat_epoch: 1000 + i, activation_id: "sha256:aa", process_start_identity: "PSID" },
    supervisor_alive: true, consumed: true, live_supervisor_owners: 1,
    provider_child_present: true, provider_descendant_of_supervisor: true, provider_exe_matches_expected: true,
    evidence: { sealed_jobs: 1 + i, valid_records: 2 + i, malformed: 0, foreign_run: 0, foreign_job: 0, non_monotonic: 0, last_event_epoch: 1000 + i },
    queue_total: 3, protected_main: { ok: true }, now_epoch: 2000, per_job_timeout_s: 2700, immutable_deadline_epoch: 9e12, terminal_state: null,
  };
  return deepMerge(s, typeof over === "function" ? over(i) : over);
}
function deepMerge(a, b) { const o = { ...a }; for (const k of Object.keys(b)) { o[k] = (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) ? deepMerge(a[k] || {}, b[k]) : b[k]; } return o; }
async function verdict(overFn, polls = 3) { return (await witnessHealth({ snapshot: (i) => base(i, overFn ? overFn(i) : {}), polls, pollMs: 0, sleep: () => Promise.resolve() })).result; }

// ---- productivity vs liveness ----
ok("01 active + validated evidence advances -> HEALTHY_CONTINUE", (await verdict(null)) === "HEALTHY_CONTINUE");
ok("02 active + verified in-flight provider within grace (no evidence growth) -> HEALTHY_CONTINUE", (await verdict(() => ({ evidence: { sealed_jobs: 1, valid_records: 2, last_event_epoch: 2000 } }))) === "HEALTHY_CONTINUE");
ok("03 heartbeat advances ONLY (no evidence growth, no provider) -> HELD (liveness != productivity)", (await verdict((i) => ({ provider_child_present: false, provider_exe_matches_expected: undefined, evidence: { sealed_jobs: 1, valid_records: 2, last_event_epoch: 1000 }, supervisor: { heartbeat_epoch: 1000 + i } }))) === "HELD");
ok("04 one transient child at first poll only, no evidence growth -> HELD", (await verdict((i) => ({ provider_child_present: i === 0, provider_exe_matches_expected: i === 0 ? true : undefined, evidence: { sealed_jobs: 1, valid_records: 2, last_event_epoch: 1000 } }))) === "HELD");
ok("05 hung provider beyond per-job grace, no evidence growth -> HELD", (await verdict(() => ({ evidence: { sealed_jobs: 1, valid_records: 2, last_event_epoch: 1000 }, now_epoch: 1000 + 2700 + 50 }))) === "HELD");

// ---- terminal ----
ok("06 successful terminal -> COMPLETED_HEALTHY (never HEALTHY_CONTINUE)", (await verdict(() => ({ supervisor: { state: "STOPPED_EXHAUSTED" }, terminal_state: "STOPPED_EXHAUSTED", provider_child_present: false }))) === "COMPLETED_HEALTHY");
ok("07 controlled budget stop -> HELD", (await verdict(() => ({ supervisor: { state: "CONTROLLED_BUDGET_STOP" }, terminal_state: "CONTROLLED_BUDGET_STOP" }))) === "HELD");
ok("08 terminal FAILED_CLOSED -> FAILED", (await verdict(() => ({ supervisor: { state: "FAILED_CLOSED" }, terminal_state: "FAILED_CLOSED" }))) === "FAILED");

// ---- boundary-critical (observed) => FAILED ----
ok("09 wrong provider executable (exe match false) -> FAILED", (await verdict(() => ({ provider_exe_matches_expected: false }))) === "FAILED");
ok("10 provider child not a supervisor descendant -> FAILED", (await verdict(() => ({ provider_descendant_of_supervisor: false }))) === "FAILED");
ok("11 duplicate live supervisor owners -> FAILED", (await verdict(() => ({ live_supervisor_owners: 2 }))) === "FAILED");
ok("12 changed immutable deadline -> FAILED", (await verdict((i) => ({ supervisor: { immutable_hard_deadline_epoch: 9e12 + i } }))) === "FAILED");
ok("13 changed process-start identity -> FAILED", (await verdict((i) => ({ supervisor: { process_start_identity: "PSID" + i } }))) === "FAILED");
ok("14 supervisor dead while RUN_ACTIVE -> FAILED", (await verdict(() => ({ supervisor_alive: false }))) === "FAILED");
ok("15 replay no longer blocked -> FAILED", (await verdict(() => ({ consumed: false }))) === "FAILED");
ok("16 evidence index foreign-run records -> FAILED", (await verdict(() => ({ evidence: { foreign_run: 1 } }))) === "FAILED");
ok("17 evidence index malformed records -> FAILED", (await verdict(() => ({ evidence: { malformed: 1 } }))) === "FAILED");
ok("18 evidence index non-monotonic -> FAILED", (await verdict(() => ({ evidence: { non_monotonic: 1 } }))) === "FAILED");
ok("19 protected-main drift (ok:false) -> FAILED", (await verdict(() => ({ protected_main: { ok: false } }))) === "FAILED");

// ---- UNKNOWN fail-closed ----
ok("20 protected-main UNKNOWN (git error, ok:null) -> INSUFFICIENT_EVIDENCE (never green)", (await verdict(() => ({ protected_main: { ok: null } }))) === "INSUFFICIENT_EVIDENCE");
ok("21 unreadable run state -> INSUFFICIENT_EVIDENCE", (await verdict(() => ({ supervisor: { state: undefined }, supervisor_alive: false, terminal_state: null }))) === "INSUFFICIENT_EVIDENCE");
ok("22 no snapshot source -> INSUFFICIENT_EVIDENCE", (await witnessHealth({})).result === "INSUFFICIENT_EVIDENCE");

// ---- honesty + read-only + mutation guards ----
const full = await witnessHealth({ snapshot: (i) => base(i), polls: 2, pollMs: 0, sleep: () => Promise.resolve() });
ok("23 result carries read_only:true", full.read_only === true);
ok("24 cost + boundaries reported as HARNESS_ENFORCED_NOT_WITNESS_OBSERVED (not asserted green)", Array.isArray(full.harness_enforced_not_witness_observed) && full.harness_enforced_not_witness_observed.some((x) => /cost/i.test(x)) && full.harness_enforced_not_witness_observed.some((x) => /AKIOR|merge|customer/i.test(x)));
const HERE = dirname(fileURLToPath(import.meta.url));
const hwSrc = readFileSync(join(HERE, "../run-harness/health-witness.mjs"), "utf8");
ok("25 health-witness performs no writes/spawns (read-only) + no hard-coded cost/boundary safe values", !/writeFileSync|appendFileSync|mkdirSync|rmSync|spawn\(|execFile|child_process/.test(hwSrc) && !/cost_ceiling_usd:\s*10|akior_or_m1_access:\s*false|merge_push_deploy_send_payment:\s*false/.test(hwSrc));
ok("26 mutation guard: post-terminal success is COMPLETED_HEALTHY, asserting != HEALTHY_CONTINUE", (await verdict(() => ({ supervisor: { state: "STOPPED_EXHAUSTED" }, terminal_state: "STOPPED_EXHAUSTED" }))) !== "HEALTHY_CONTINUE");
ok("27 mutation guard: heartbeat-only cannot be HEALTHY_CONTINUE", (await verdict((i) => ({ provider_child_present: false, provider_exe_matches_expected: undefined, evidence: { sealed_jobs: 1, valid_records: 2, last_event_epoch: 1000 }, supervisor: { heartbeat_epoch: 5000 + i } }))) !== "HEALTHY_CONTINUE");

console.log("\nLRCQ HEALTH-WITNESS SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
