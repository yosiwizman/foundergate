// FounderGate — Claude Code Adapter selftest (hermetic, offline).
//
// PURE NODE. No network, no provider, no store, no marker. Runs the adapter
// over the committed REAL H8 lane fixture and a set of runtime-built inputs,
// proving both the happy path (a real lane normalizes to the H7 shape) and the
// teeth (every hard-guard refusal fires). Prints a final PASS/FAIL marker.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeLane,
  normalizeLaneFile,
  buildProofPacket,
  validateWorkerRecord,
  assertControlledLane,
  WORKER_RECORD_KEYS,
  WORKER_STATUSES,
  ClaudeCodeAdapterError,
} from "./claude-code-adapter.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_FIXTURE = resolve(HERE, "fixtures", "example-lane-h8.json");

let pass = 0;
let fail = 0;
const fails = [];
function ok(name) {
  pass++;
  console.log(`  PASS: ${name}`);
}
function bad(name, detail) {
  fail++;
  fails.push(`${name}${detail ? " — " + detail : ""}`);
  console.log(`  FAIL: ${name}${detail ? " — " + detail : ""}`);
}
function check(cond, name, detail) {
  cond ? ok(name) : bad(name, detail);
}
// Assert that fn throws a ClaudeCodeAdapterError (the guard has teeth).
function refuses(fn, name) {
  try {
    fn();
    bad(name, "expected a refusal but none was thrown");
  } catch (e) {
    if (e instanceof ClaudeCodeAdapterError) ok(name);
    else bad(name, `threw the wrong error type: ${e && e.name}`);
  }
}

console.log("== adapter selftest ==");

// --- A. Real lane normalizes to the H7 worker shape ---------------------------
const realLane = JSON.parse(readFileSync(REAL_FIXTURE, "utf8"));
check(realLane._label === "real", "fixture is labelled real");

const rec = normalizeLane(realLane);
check(
  JSON.stringify(Object.keys(rec).sort()) ===
    JSON.stringify([...WORKER_RECORD_KEYS].sort()),
  "record has exactly the six H7 keys",
  Object.keys(rec).join(",")
);
check(validateWorkerRecord(rec).valid, "record passes validateWorkerRecord");
check(
  typeof rec.lane_prompt === "string" &&
    rec.lane_prompt.includes("h8-claude-code-adapter") &&
    rec.lane_prompt.includes("LEASE:") &&
    rec.lane_prompt.includes("EXCLUSIONS:"),
  "lane_prompt carries lane id, lease, and exclusions"
);
check(
  rec.lane_prompt.includes("harness/adapters/claude-code/**"),
  "lane_prompt names the real lease glob"
);
check(rec.branch === "foundergate/h8-claude-code-adapter", "branch preserved");
check(rec.pr === null, "pr is honest null (not yet opened)");
check(rec.gate_report === null, "gate_report null (no founder gate on this lane)");
check(rec.status === "running", "status derived to running (started, no PR yet)", rec.status);
check(WORKER_STATUSES.includes(rec.status), "status is in the closed status set");
check(
  Array.isArray(rec.proof.tests) &&
    rec.proof.tests.length === 2 &&
    rec.proof.tests.every((t) => t.offline === true),
  "proof.tests normalized, all offline"
);
check(rec.proof.status === "unproven", "proof.status honest default unproven");

// --- B. Proof packet around the real lane -------------------------------------
const packet = buildProofPacket(realLane, { label: "real" });
check(packet.adapter === "claude-code", "packet adapter=claude-code");
check(packet.generated_offline === true, "packet generated_offline=true");
check(packet.source_label === "real", "packet source_label=real");
check(packet.all_checks_pass === true, "packet all_checks_pass=true");
check(
  packet.checks.some((c) => c.name === "no-remote-execution" && c.pass),
  "packet asserts no-remote-execution"
);
check(
  packet.checks.some((c) => c.name === "lease-repo-relative" && c.pass),
  "packet asserts lease-repo-relative"
);
// The file-loading path yields the same record.
const packet2 = normalizeLaneFile(REAL_FIXTURE, { label: "real" });
check(
  JSON.stringify(packet2.worker_record) === JSON.stringify(rec),
  "normalizeLaneFile yields the same record as normalizeLane"
);

// --- C. Guards have teeth (fail-closed) ---------------------------------------
refuses(
  () => assertControlledLane({ ...realLane, execution_target: "remote" }),
  "refuses a remote execution target"
);
refuses(
  () => assertControlledLane({ ...realLane, execution_target: "cloud" }),
  "refuses a cloud execution target"
);
refuses(
  () => assertControlledLane({ ...realLane, requires_new_credential: true }),
  "refuses a lane needing a new credential"
);
refuses(
  () => assertControlledLane({ ...realLane, flips_activation_marker: true }),
  "refuses a lane that flips an activation marker"
);
refuses(
  () => assertControlledLane({ ...realLane, performs_provider_send: true }),
  "refuses a lane that performs a provider send"
);
refuses(
  () => assertControlledLane({ ...realLane, captures_microphone: true }),
  "refuses a lane that captures the microphone"
);
refuses(
  () => normalizeLane({ ...realLane, strict_lease: ["/etc/passwd"] }),
  "refuses an absolute-path lease"
);
refuses(
  () => normalizeLane({ ...realLane, strict_lease: [] }),
  "refuses an empty lease"
);
refuses(
  () => normalizeLane({ ...realLane, lane_id: "" }),
  "refuses a lane with no lane_id"
);
refuses(
  () => normalizeLane({ ...realLane, branch: "" }),
  "refuses a lane with no branch"
);

// --- D. validateWorkerRecord teeth --------------------------------------------
check(
  !validateWorkerRecord({ ...rec, extra: 1 }).valid,
  "validateWorkerRecord rejects an unknown key"
);
const { branch, ...missing } = rec;
check(
  !validateWorkerRecord(missing).valid,
  "validateWorkerRecord rejects a missing key"
);
check(
  !validateWorkerRecord({ ...rec, status: "nonsense" }).valid,
  "validateWorkerRecord rejects an out-of-set status"
);

// --- E. Gate honesty: a gated lane can never be green -------------------------
const gatedLane = {
  ...realLane,
  status: "delivered", // caller optimistically claims delivered...
  founder_gate: {
    requires_founder_gate: true,
    gate_reason: "first live provider crossing",
    gate_trigger: "provider-live-crossing",
    agent_may_self_fire: true, // ...and even claims self-fire
  },
};
const gatedRec = normalizeLane(gatedLane);
check(gatedRec.gate_report !== null, "gated lane produces a gate_report");
check(
  gatedRec.gate_report.agent_may_self_fire === false,
  "provider-live gate is NEVER self-fireable (demoted to false)"
);
check(
  gatedRec.status === "gate_pending",
  "optimistic 'delivered' is DEMOTED to gate_pending under a live gate",
  gatedRec.status
);
check(
  validateWorkerRecord({ ...gatedRec, status: "merged" }).valid === false,
  "validateWorkerRecord rejects a live-gate + merged pairing"
);

// --- F. PR normalization -------------------------------------------------------
const prRec = normalizeLane({
  ...realLane,
  pr: { number: 213, url: "https://github.com/x/y/pull/213", draft: true },
});
check(
  prRec.pr && prRec.pr.number === 213 && prRec.pr.draft === true,
  "PR fields normalized when present"
);
check(prRec.status === "delivered", "an opened PR (no gate) derives status delivered", prRec.status);
refuses(
  () => normalizeLane({ ...realLane, pr: { number: -3 } }),
  "refuses a non-positive PR number"
);

// --- Summary ------------------------------------------------------------------
console.log("");
console.log(`ADAPTER-SELFTEST: PASS=${pass} FAIL=${fail}`);
if (fail === 0) {
  console.log("ADAPTER-SELFTEST: ALL-GREEN");
  process.exit(0);
} else {
  console.log("ADAPTER-SELFTEST: FAILURES:\n  - " + fails.join("\n  - "));
  process.exit(1);
}
