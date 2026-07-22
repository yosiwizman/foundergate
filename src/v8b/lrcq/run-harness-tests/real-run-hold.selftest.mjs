// FounderGate LRCQ — real-run teardown-truth + terminal-mapping regression (FG-LRCQ-ACT-023). Locks the two
// defects the first founder-authorized real run exposed: (1) an early PROVIDER failure (pre-spawn
// ACTIVATION_REFUSED, tree_gone=null) was mislabeled HELD_TEARDOWN_DEFECT; (2) the supervisor mapped a held
// teardown defect to STOPPED_EXHAUSTED. Uses synthetic witness snapshots + source mutation guards; no real Claude.
import { witnessHealth } from "../run-harness/health-witness.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "../../../..");
const rd = (p) => readFileSync(join(SRC, p), "utf8");

// A supervisor that maps a HELD teardown/provider defect to state "HELD" -> the witness must report HELD,
// never COMPLETED_HEALTHY (which is only for a clean STOPPED_EXHAUSTED).
function heldTerminalSnap(i, state) {
  return { supervisor: { run_id: "R", supervisor_pid: 1, immutable_hard_deadline_epoch: 9e12, state, heartbeat_epoch: 1000 + i, activation_id: "a", process_start_identity: "P" },
    supervisor_alive: false, consumed: true, live_supervisor_owners: 1, provider_child_present: false, provider_descendant_of_supervisor: undefined, provider_exe_matches_expected: undefined,
    evidence: { sealed_jobs: 0, valid_records: 0, malformed: 0, foreign_run: 0, foreign_job: 0, non_monotonic: 0, last_event_epoch: 1000 }, queue_total: 25,
    protected_main: { ok: true }, now_epoch: 2000, per_job_timeout_s: 2700, immutable_deadline_epoch: 9e12, terminal_state: state };
}
const verdict = async (state) => (await witnessHealth({ snapshot: (i) => heldTerminalSnap(i, state), polls: 2, pollMs: 0, sleep: () => Promise.resolve() })).result;

// ---- witness must classify held terminals as HELD, and only clean exhaustion as COMPLETED_HEALTHY ----
ok("01 witness over HELD terminal -> HELD (not COMPLETED_HEALTHY)", (await verdict("HELD")) === "HELD");
ok("02 clean STOPPED_EXHAUSTED (0 productive) -> COMPLETED_HEALTHY", (await verdict("STOPPED_EXHAUSTED")) === "COMPLETED_HEALTHY");
ok("03 a teardown/provider hold must NOT surface as STOPPED_EXHAUSTED at the witness", (await verdict("HELD")) !== "COMPLETED_HEALTHY");

// ---- real-provider teardown_status truth (source) ----
const rp = rd("src/v8b/lrcq/provider/real-provider.mjs");
ok("04 real-provider inits teardown_status=NOT_ATTEMPTED + provider_invocation (never null)", /teardown_status:\s*"TEARDOWN_NOT_ATTEMPTED"/.test(rp) && /provider_invocation:\s*"PROVIDER_NOT_ATTEMPTED"/.test(rp));
ok("05 real-provider sets an explicit teardown_status (CONFIRMED/UNKNOWN/FAILED) at the teardown check", /teardown_status\s*=\s*tv\.gone\s*\?\s*"TEARDOWN_CONFIRMED"/.test(rp) && /TEARDOWN_UNKNOWN/.test(rp) && /TEARDOWN_FAILED/.test(rp));
ok("06 real-provider records provider_invocation lifecycle (SPAWN_ATTEMPTED/SPAWNED/OUTPUT_RECEIVED)", /PROVIDER_SPAWN_ATTEMPTED/.test(rp) && /PROVIDER_SPAWNED/.test(rp) && /PROVIDER_OUTPUT_RECEIVED/.test(rp));

// ---- harness: teardown defect vs early provider failure (source mutation guards) ----
const h = rd("src/v8b/lrcq/run-harness/harness.mjs");
ok("07 harness has a HELD_PROVIDER_FAILURE branch distinct from HELD_TEARDOWN_DEFECT", /HELD_PROVIDER_FAILURE/.test(h) && /HELD_TEARDOWN_DEFECT/.test(h));
ok("08 mutation guard: a teardown defect requires tree_gone===false OR teardown_status FAILED/UNKNOWN (NOT a bare tree_gone==null)", /genuineTeardownDefect\s*=\s*prov\.tree_gone === false \|\| po\.outcome === "TEARDOWN_FAILED" \|\| ts === "TEARDOWN_FAILED" \|\| ts === "TEARDOWN_UNKNOWN"/.test(h) && !/prov\.tree_gone == null && prov\.provider_outcome\)\s*\{\s*[\s\S]{0,80}HELD_TEARDOWN_DEFECT/.test(h));
ok("09 harness maps a provider failure to STOPPED_PROVIDER_FAILURE / HELD_PROVIDER_FAILURE outcome", /STOPPED_PROVIDER_FAILURE/.test(h) && /outcome_status = "HELD_PROVIDER_FAILURE"/.test(h));

// ---- supervisor-main exhaustive terminal mapping (source mutation guards) ----
const sm = rd("src/v8b/lrcq/run-harness/supervisor-main.mjs");
ok("10 supervisor-main: held/defect/provider-failure terminals map to HELD (regex covers TEARDOWN_DEFECT + PROVIDER_FAILURE)", /TEARDOWN_DEFECT\|PROVIDER_FAILURE/.test(sm) && /term = "HELD"/.test(sm));
ok("11 supervisor-main: no STOPPED_EXHAUSTED fall-through default; unknown terminal fails closed to HELD", /let term = "HELD"/.test(sm) && /UNKNOWN_TERMINAL \(fail-closed\)/.test(sm) && !/let term = "STOPPED_EXHAUSTED"/.test(sm));
ok("12 supervisor-main: only a clean STOPPED_EXHAUSTED with a non-held outcome maps to STOPPED_EXHAUSTED", /fstate === "STOPPED_EXHAUSTED" && !held\(ostat\)/.test(sm));

console.log("\nLRCQ REAL-RUN-HOLD SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
