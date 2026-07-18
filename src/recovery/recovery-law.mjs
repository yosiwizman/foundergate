// ORC-1R Effect-Aware Recovery Law. Every recoverable action carries exactly one
// effect class; recovery eligibility is decided by that class. UNKNOWN/MISSING
// fails closed (park + route a gate). The held-action sink remains the ONLY
// external-action boundary — nothing here executes; it only DECIDES.
// A worker cannot relabel an effect to a weaker class to dodge a gate.

export const EFFECT_CLASSES = [
  "READ_ONLY", "REVERSIBLE_LOCAL", "REPOSITORY_MUTATION",
  "EXTERNAL_IDEMPOTENT", "EXTERNAL_UNCERTAIN", "IRREVERSIBLE",
];

// Ordered by escalating risk; a worker may never DOWNGRADE a declared class.
const RISK_RANK = { READ_ONLY: 0, REVERSIBLE_LOCAL: 1, REPOSITORY_MUTATION: 2, EXTERNAL_IDEMPOTENT: 3, EXTERNAL_UNCERTAIN: 4, IRREVERSIBLE: 5 };

// Decide whether an action interrupted by an outage may be retried/resumed.
// Returns { decision: "retry"|"resume"|"reconcile_then_retry"|"park_route_gate", gate?, reasons }.
export function recoveryDecision(action, ctx = {}) {
  const cls = action && action.effect_class;
  const reasons = [];

  // FAIL CLOSED: unknown/missing/invalid effect class -> park + route a gate.
  if (!cls || !EFFECT_CLASSES.includes(cls)) {
    return { decision: "park_route_gate", gate: "TRUE_FOUNDER_GATE", reasons: ["unknown/missing effect class -> fail closed"] };
  }
  // Anti-relabel: a declared original class cannot be silently downgraded.
  if (action.declared_original_class && RISK_RANK[cls] < RISK_RANK[action.declared_original_class]) {
    return { decision: "park_route_gate", gate: "TRUE_FOUNDER_GATE", reasons: [`effect downgraded ${action.declared_original_class}->${cls} (relabel blocked)`] };
  }
  // A completed+sealed action is terminal — never re-executed.
  if (action.lifecycle === "EVIDENCE_SEALED") {
    return { decision: "park_route_gate", gate: null, reasons: ["already EVIDENCE_SEALED — terminal, no re-execution"], terminal: true };
  }

  switch (cls) {
    case "READ_ONLY":
      return ctx.state_validated
        ? { decision: "retry", reasons: ["read-only; state validated"] }
        : { decision: "park_route_gate", gate: null, reasons: ["read-only retry needs state validation"] };
    case "REVERSIBLE_LOCAL":
      return (ctx.rollback_done && ctx.duplicate_checked)
        ? { decision: "resume", reasons: ["reversible-local; rollback + dup checks done"] }
        : { decision: "park_route_gate", gate: null, reasons: ["reversible-local needs rollback + duplicate checks first"] };
    case "REPOSITORY_MUTATION":
      return ctx.repo_reconciled
        ? { decision: "reconcile_then_retry", reasons: ["repo mutation; worktree/branch/commit/remote/PR/evidence reconciled"] }
        : { decision: "park_route_gate", gate: null, reasons: ["repo mutation needs full repo reconciliation before retry"] };
    case "EXTERNAL_IDEMPOTENT":
      if (!action.idempotency_key) return { decision: "park_route_gate", gate: "TRUE_FOUNDER_GATE", reasons: ["external-idempotent retry blocked: missing idempotency key"] };
      if (!ctx.external_state_reconciled) return { decision: "park_route_gate", gate: "TRUE_FOUNDER_GATE", reasons: ["external-idempotent retry blocked: external state not reconciled"] };
      if (!ctx.authority_permits) return { decision: "park_route_gate", gate: "TRUE_FOUNDER_GATE", reasons: ["external-idempotent retry blocked: authority does not permit"] };
      return { decision: "retry", reasons: ["external-idempotent; key + external reconciliation + authority all satisfied"] };
    case "EXTERNAL_UNCERTAIN":
      return { decision: "park_route_gate", gate: "TRUE_FOUNDER_GATE", reasons: ["external-uncertain: park + route gate; never auto-retry"] };
    case "IRREVERSIBLE":
      return { decision: "park_route_gate", gate: "HUMAN_EXPERT_GATE", reasons: ["irreversible: never auto-retry; route founder/human-expert gate"] };
    default:
      return { decision: "park_route_gate", gate: "TRUE_FOUNDER_GATE", reasons: ["unreachable -> fail closed"] };
  }
}

// Classify an interrupted journal action's post-outage certainty.
export function postOutageCertainty(action) {
  const lc = action && action.lifecycle;
  if (lc === "EVIDENCE_SEALED") return "SEALED_TERMINAL";
  if (lc === "ACTION_COMPLETED") return "COMPLETED_EVIDENCE_UNSEALED";
  if (lc === "ACTION_STARTED") return "UNCERTAIN";
  if (lc === "INTENT_RECORDED") return "NOT_STARTED";
  return "UNKNOWN";
}

// Held-action boundary: the only authorized external-action path. Any action
// that is external and not routed through the held-action sink is rejected.
export function heldActionBoundaryOk(action, ctx = {}) {
  const external = ["EXTERNAL_IDEMPOTENT", "EXTERNAL_UNCERTAIN", "IRREVERSIBLE"].includes(action.effect_class);
  if (!external) return { ok: true };
  if (ctx.via_held_action_sink !== true) return { ok: false, reason: "external action must pass through the held-action sink" };
  return { ok: true };
}
