// ARE-1 Run Envelope — state machine + immutable Run Manifest.
// UNKNOWN never transitions directly to PASS. A builder cannot create
// CHECKER-CLEAN. A checker cannot execute the work it checks.
import { createHash } from "node:crypto";

export const STATES = [
  "BLUEPRINT_RECEIVED", "BLUEPRINT_INVALID", "BLUEPRINT_HELD", "BLUEPRINT_ACCEPTED",
  "PLAN_COMPILED", "PLAN_CHECKED", "READY_TO_RUN", "RUNNING", "ROUTINE_CORRECTION",
  "TRUE_FOUNDER_GATE", "HUMAN_EXPERT_GATE", "BLOCKED", "RECOVERING", "EVIDENCE_SEALING",
  "CHECKER_REQUIRED", "CHECKER_FINDINGS", "ADVISOR_REQUIRED", "PASS",
  "PASS_WITH_LIMITATIONS", "NOT_PASSED", "INSUFFICIENT_EVIDENCE", "CANCELLED", "SUPERSEDED",
];

const TERMINAL = new Set(["PASS", "PASS_WITH_LIMITATIONS", "NOT_PASSED", "INSUFFICIENT_EVIDENCE", "CANCELLED", "SUPERSEDED"]);

// Only these predecessors may reach PASS/PASS_WITH_LIMITATIONS.
const PASS_PREDS = new Set(["ADVISOR_REQUIRED", "EVIDENCE_SEALING"]);

const REQUIRED_TRANSITION_FIELDS = [
  "prior_state", "next_state", "reason_code", "actor", "authority_source",
  "exact_sha", "blueprint_digest", "manifest_digest", "evidence_paths",
  "timestamp", "idempotency_key", "recovery_action",
];

export function validateTransition(t) {
  const problems = [];
  for (const f of REQUIRED_TRANSITION_FIELDS) {
    if (t[f] === undefined || t[f] === null || t[f] === "") problems.push(`missing ${f}`);
  }
  if (!STATES.includes(t.prior_state)) problems.push(`unknown prior_state ${t.prior_state}`);
  if (!STATES.includes(t.next_state)) problems.push(`unknown next_state ${t.next_state}`);
  // UNKNOWN never -> PASS
  if ((t.prior_state === "UNKNOWN" || !STATES.includes(t.prior_state)) &&
      (t.next_state === "PASS" || t.next_state === "PASS_WITH_LIMITATIONS")) {
    problems.push("UNKNOWN/invalid prior may not transition to PASS");
  }
  if ((t.next_state === "PASS" || t.next_state === "PASS_WITH_LIMITATIONS") && !PASS_PREDS.has(t.prior_state)) {
    problems.push(`PASS requires prior in {${[...PASS_PREDS].join(",")}}, got ${t.prior_state}`);
  }
  // Builder cannot create CHECKER-CLEAN; checker cannot execute the work.
  if (t.next_state === "PLAN_CHECKED" && t.actor && t.builder_actor && t.actor === t.builder_actor) {
    problems.push("builder cannot self-certify (create CHECKER-CLEAN)");
  }
  if (t.next_state === "RUNNING" && t.actor && t.checker_actor && t.actor === t.checker_actor) {
    problems.push("checker cannot execute the work it checks");
  }
  return { valid: problems.length === 0, problems };
}

export function isTerminal(state) { return TERMINAL.has(state); }

// ---- Immutable Run Manifest ----
export const MANIFEST_REQUIRED = [
  "autonomous_run_id", "project_id", "blueprint_id", "blueprint_digest",
  "blueprint_version", "exact_base_sha", "active_policy_digests", "arlc_version",
  "scl_version", "gate_witness_version", "compiler_version", "planned_lanes",
  "permitted_actions", "forbidden_actions", "active_founder_decisions",
  "unresolved_founder_gates", "human_expert_gates", "data_classes",
  "sandbox_class", "providers", "budgets", "expected_evidence",
  "checker_assignments", "rollback_plan", "recovery_plan", "start_conditions",
  "completion_conditions", "stop_conditions",
];

export function manifestDigest(m) {
  const sortValue = (v) => Array.isArray(v) ? v.map(sortValue)
    : (v && typeof v === "object")
      ? Object.keys(v).sort().reduce((o, k) => { o[k] = sortValue(v[k]); return o; }, {})
      : v;
  return "sha256:" + createHash("sha256").update(JSON.stringify(sortValue(m))).digest("hex");
}

export function validateManifest(m) {
  const missing = MANIFEST_REQUIRED.filter((f) => !(f in m));
  return { valid: missing.length === 0, missing };
}

// A manifest CHANGE must produce a new version + digest + reason + authority,
// never an in-place mutation of a historical manifest.
export function reviseManifest(oldManifest, changes, meta) {
  if (!meta || !meta.reason || !meta.authority || !meta.changed_scope) {
    return { ok: false, reason: "manifest revision requires reason+authority+changed_scope" };
  }
  const oldDigest = manifestDigest(oldManifest);
  const next = { ...oldManifest, ...changes, manifest_version: (oldManifest.manifest_version || 1) + 1 };
  const newDigest = manifestDigest(next);
  if (newDigest === oldDigest) return { ok: false, reason: "no-op revision" };
  return { ok: true, manifest: next, prior_digest: oldDigest, new_digest: newDigest, meta };
}
