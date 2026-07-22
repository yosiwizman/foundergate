// FounderGate LRCQ — side-effect transaction protocol (A02) + reconciliation state
// machine (A10/B17). Pure, fail-closed. Every provider launch is a governed side effect:
// intent is sealed BEFORE dispatch; an uncertain dispatched transaction is NEVER blindly
// retried. Unknown states are HELD, never green.
export const TX_STATES = ["PLANNED", "INTENT_RECORDED", "AUTHORIZED", "DISPATCHED", "EXTERNALLY_OBSERVED", "RECONCILED", "SEALED"];
export const TX_EXCEPTIONS = ["NEEDS_RECONCILIATION", "EXTERNAL_EFFECT_UNKNOWN", "DUPLICATE_PREVENTED", "COMPENSATION_REQUIRED", "COMPENSATION_COMPLETED"];
export const INTENT_FIELDS = ["transaction_id", "idempotency_key", "run_id", "job_id", "attempt", "role", "candidate_stack", "backlog_digest", "lease_digest", "blast_budget_digest", "prompt_digest", "tool_digests", "worktree", "branch", "pre_action_fingerprint", "deadline_epoch", "budget_usd", "evidence_dir"];

export function validateIntent(intent) {
  const r = []; if (!intent || typeof intent !== "object") return { valid: false, refusals: ["intent absent"] };
  for (const f of INTENT_FIELDS) if (intent[f] === undefined || intent[f] === null || intent[f] === "") r.push("intent missing " + f);
  return { valid: r.length === 0, refusals: r };
}

// A dispatch is admissible only if a valid, AUTHORIZED intent exists first, and its
// idempotency key has not already been dispatched (duplicate prevention).
export function canDispatch(intent, priorTxByKey) {
  const v = validateIntent(intent);
  if (!v.valid) return { ok: false, reason: "no sealed intent: " + v.refusals.join(";") };
  if (intent.state !== "AUTHORIZED") return { ok: false, reason: "intent not AUTHORIZED (state=" + intent.state + ")" };
  const prior = priorTxByKey && priorTxByKey[intent.idempotency_key];
  if (prior && ["DISPATCHED", "EXTERNALLY_OBSERVED", "RECONCILED", "SEALED"].includes(prior.state)) return { ok: false, reason: "DUPLICATE_PREVENTED: idempotency key already dispatched", duplicate: true };
  return { ok: true };
}

// Reconciliation decision. Inputs describe observed reality; output is a deterministic
// reconciliation state + recovery recommendation. Never returns a "green" for uncertainty.
// obs = { intent_exists, dispatch_exists, process_alive, definitive_result, evidence_agrees, worktree_unchanged, checkpoint_corrupt }
export function reconcile(obs) {
  if (obs.checkpoint_corrupt) return { state: "HELD", recommend: "ABANDON", reason: "corrupt checkpoint / contradictory evidence" };
  if (obs.dispatch_exists && obs.process_alive) return { state: "ACTIVE_PROCESS_FOUND", recommend: "WAIT", reason: "live process — do not duplicate" };
  if (obs.intent_exists && !obs.dispatch_exists && !obs.process_alive && obs.worktree_unchanged) return { state: "SAFE_TO_RESUME", recommend: "RESUME", reason: "intent only; no dispatch; worktree unchanged" };
  if (obs.dispatch_exists && !obs.process_alive && !obs.definitive_result) return { state: "NEEDS_RECONCILIATION", recommend: "BRANCH", reason: "dead process, no definitive result — do NOT re-fire; diagnostic branch only" };
  if (obs.definitive_result && obs.evidence_agrees) return { state: "RESULT_COMPLETE", recommend: "RESUME", reason: "definitive sealed result agrees with evidence" };
  if (obs.definitive_result && !obs.evidence_agrees) return { state: "HELD", recommend: "ABANDON", reason: "result/evidence disagree" };
  return { state: "EXTERNAL_EFFECT_UNKNOWN", recommend: "ABANDON", reason: "state cannot be established — HELD, never green" };
}

// RESUME is permitted ONLY after proving no duplicate effect.
export function mayResume(reconResult, noDuplicateEffectProven) {
  return (reconResult.state === "SAFE_TO_RESUME" || reconResult.state === "RESULT_COMPLETE") && noDuplicateEffectProven === true;
}
// BRANCH must NOT re-fire the original transaction.
export function branchIsDiagnosticOnly(reconResult) { return reconResult.recommend === "BRANCH"; }
// ABANDON preserves evidence + parks; other lanes continue.
export function abandonPreservesEvidence(reconResult) { return reconResult.recommend === "ABANDON"; }
