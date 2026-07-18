// ARE-1 Final Run Proof Capsule.
// Missing evidence never becomes PASS. Partial evidence -> INSUFFICIENT_EVIDENCE.
// PASS requires ALL declared completion predicates; PASS_WITH_LIMITATIONS names
// every unmet non-blocking predicate.
import { createHash } from "node:crypto";

export const FINAL_STATUSES = [
  "PASS", "PASS_WITH_LIMITATIONS", "NOT_PASSED", "INSUFFICIENT_EVIDENCE", "CANCELLED", "SUPERSEDED",
];

export const CAPSULE_REQUIRED = [
  "run_identity", "blueprint_identity", "blueprint_digest", "final_manifest_digest",
  "start_time", "end_time", "exact_starting_sha", "exact_final_sha",
  "lanes_attempted", "lanes_completed", "lanes_blocked", "machine_actions",
  "merge_actions", "sandbox_actions", "tests", "ci", "checker_verdicts",
  "advisor_verdicts", "founder_gates", "founder_decisions", "human_expert_gates",
  "evidence_index", "hashes", "known_limitations", "unresolved_requirements",
  "final_status", "next_action",
];

// completionPredicates: [{id, blocking:true/false, met:true/false, evidence:[...]}]
export function computeFinalStatus(completionPredicates, evidence) {
  const preds = completionPredicates || [];
  const anyEvidence = Array.isArray(evidence) && evidence.length > 0;

  // Missing evidence can NEVER produce PASS. No completion predicates at all, or
  // no evidence at all, is insufficient — not a pass by vacuous truth.
  if (preds.length === 0) {
    return { status: "INSUFFICIENT_EVIDENCE", reason: "no completion predicates declared" };
  }
  if (!anyEvidence) {
    return { status: "INSUFFICIENT_EVIDENCE", reason: "no evidence present" };
  }

  const blocking = preds.filter((p) => p.blocking !== false);
  const nonBlocking = preds.filter((p) => p.blocking === false);

  // Evidence completeness: every predicate claiming evidence must have a
  // non-empty evidence pointer. Missing => cannot PASS.
  const missingEvidence = preds.filter((p) => p.met && (!p.evidence || p.evidence.length === 0));

  if (!anyEvidence && preds.some((p) => p.met)) {
    return { status: "INSUFFICIENT_EVIDENCE", reason: "claims met predicates with no evidence" };
  }
  const unmetBlocking = blocking.filter((p) => !p.met);
  if (unmetBlocking.length > 0) {
    // Some blocking predicate unmet. If it is unmet for lack of evidence, that's
    // INSUFFICIENT_EVIDENCE; otherwise NOT_PASSED.
    const dueToEvidence = unmetBlocking.every((p) => p.unmet_reason === "missing_evidence");
    return { status: dueToEvidence ? "INSUFFICIENT_EVIDENCE" : "NOT_PASSED",
             reason: "unmet blocking predicates", unmet: unmetBlocking.map((p) => p.id) };
  }
  if (missingEvidence.length > 0) {
    return { status: "INSUFFICIENT_EVIDENCE", reason: "met predicates without evidence", ids: missingEvidence.map((p) => p.id) };
  }
  const unmetNonBlocking = nonBlocking.filter((p) => !p.met);
  if (unmetNonBlocking.length > 0) {
    return { status: "PASS_WITH_LIMITATIONS", unmet_non_blocking: unmetNonBlocking.map((p) => p.id) };
  }
  return { status: "PASS" };
}

export function capsuleDigest(capsule) {
  return "sha256:" + createHash("sha256").update(JSON.stringify(capsule)).digest("hex");
}

export function buildCapsule(fields) {
  const missing = CAPSULE_REQUIRED.filter((f) => !(f in fields));
  if (missing.length) return { ok: false, reason: "incomplete capsule", missing };
  if (!FINAL_STATUSES.includes(fields.final_status)) {
    return { ok: false, reason: `invalid final_status ${fields.final_status}` };
  }
  return { ok: true, capsule: fields, digest: capsuleDigest(fields) };
}
