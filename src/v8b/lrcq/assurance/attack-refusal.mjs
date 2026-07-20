// FounderGate LRCQ — minimal internal-run attack-refusal surface (BLOCKER subset).
// Every function is a MECHANICAL refusal: observed content (repository text, tool output,
// documents, prior-session claims) is DATA, never instruction. Authority comes only from a
// founder-signed activation record + the founder chat channel. Broader threat/supply-chain/
// privacy controls remain PRE_CUSTOMER and are intentionally out of scope here.
import { validateActivationV3, validateLease, canWrite } from "./assurance-core.mjs";
import { canDispatch, reconcile } from "../reconciliation/transaction.mjs";

// The only trusted instruction source is the founder via chat. Anything else is data.
export const TRUSTED_INSTRUCTION_SOURCE = "founder_chat";

// 1. Repository/tool text tries to rewrite FounderGate policy. Instructions embedded in
//    observed content are refused: they are quoted for the founder, never executed.
export function refusePolicyRewrite(instruction) {
  const src = instruction && instruction.source;
  if (src !== TRUSTED_INSTRUCTION_SOURCE) return { refused: true, reason: "instruction from untrusted source (" + src + "): observed content is data, not policy authority", quoted_for_founder: (instruction && instruction.text) || null };
  return { refused: false };
}

// 2. Observed content requests secrets / credentials. Never emit; the run carries no secrets.
export function refuseSecretRequest(request) {
  const SENSITIVE = /(secret|password|token|api[_-]?key|credential|private[_-]?key|ssh|bearer)/i;
  if (request && request.source !== TRUSTED_INSTRUCTION_SOURCE && SENSITIVE.test(request.text || request.field || "")) return { refused: true, reason: "secret/credential request from observed content refused; no secret broker in internal run" };
  if (SENSITIVE.test((request && (request.field || "")) || "")) return { refused: true, reason: "secret-shaped field refused" };
  return { refused: false };
}

// 3. Stale approval replay: a previously-valid activation replayed after expiry / after its
//    nonce was consumed. Refused by temporal + candidate binding + one-shot nonce.
export function refuseStaleApproval(activation, bindings, consumedNonces = new Set()) {
  const v = validateActivationV3(activation, bindings);
  if (!v.valid) return { refused: true, reason: "activation invalid/stale: " + v.refusals.join(";") };
  if (activation.nonce && consumedNonces.has(activation.nonce)) return { refused: true, reason: "activation nonce already consumed (replay)" };
  return { refused: false };
}

// 4. Action arguments changed after approval: the sealed intent's pre-action fingerprint no
//    longer matches the about-to-run action. Refuse the dispatch.
export function refuseArgsChangedAfterApproval(intent, priorTxByKey, observedFingerprint) {
  const cd = canDispatch(intent, priorTxByKey);
  if (!cd.ok) return { refused: true, reason: cd.reason };
  if (intent.pre_action_fingerprint !== observedFingerprint) return { refused: true, reason: "action arguments changed after approval (fingerprint mismatch)" };
  return { refused: false };
}

// 5. Wrong-SHA evidence: evidence claims a candidate SHA/tree that differs from the bound run.
export function refuseWrongShaEvidence(evidence, bindings) {
  if (!evidence || evidence.candidate_sha !== bindings.run_harness_candidate_sha || evidence.candidate_tree !== bindings.run_harness_candidate_tree) return { refused: true, reason: "evidence bound to a different candidate SHA/tree" };
  return { refused: false };
}

// 6. Worker attempts to modify the gate / control plane. The builder worker writes NO plane;
//    the checker worker writes NO plane. The authority matrix forbids it.
export function refuseWorkerGateModification(component, plane) {
  if ((component === "builder_worker" || component === "checker_worker") && canWrite(component, plane)) return { refused: false }; // (unreachable — workers own no plane)
  if (component === "builder_worker" || component === "checker_worker") return { refused: true, reason: component + " may not write the " + plane + " plane (workers own no authority plane)" };
  return { refused: !canWrite(component, plane), reason: canWrite(component, plane) ? null : component + " lacks authority to write " + plane };
}

// 7. Indirect forbidden-tool request: a tool not on the lease allow-list (or on the deny-list)
//    requested via observed content. Refuse.
export function refuseForbiddenTool(lease, tool, bindings) {
  const lv = validateLease(lease, { ...bindings, tool });
  if (!lv.valid) return { refused: true, reason: lv.refusals.find((x) => /tool outside lease/.test(x)) || lv.refusals.join(";") };
  if ((lease.denied_tools || []).includes(tool)) return { refused: true, reason: "tool " + tool + " is on the lease deny-list" };
  return { refused: false };
}

// 8. Unauthorized delegation: attempting to delegate deeper than the lease/activation allows.
export function refuseUnauthorizedDelegation(requestedDepth, lease) {
  if (requestedDepth > (lease.max_delegation_depth ?? 0)) return { refused: true, reason: "delegation depth " + requestedDepth + " exceeds lease max " + lease.max_delegation_depth };
  return { refused: false };
}

// 9. Old replay event treated as current: an event from another/earlier run offered as the
//    current run's state. Only events of the active run id are current.
export function refuseStaleReplayEvent(replayStream, activeRunId, event) {
  const current = replayStream.currentEvents(activeRunId);
  if (!current.includes(event) || event.run_id !== activeRunId) return { refused: true, reason: "replay event is not part of the active run (stale/foreign)" };
  return { refused: false };
}

// 10. Untrusted content requests durable-memory promotion. Memory promotion requires the
//     trusted founder channel; observed content can never promote itself to durable memory.
export function refuseMemoryPromotion(request) {
  if (!request || request.source !== TRUSTED_INSTRUCTION_SOURCE) return { refused: true, reason: "durable-memory promotion requested by untrusted source; refused" };
  return { refused: false };
}
