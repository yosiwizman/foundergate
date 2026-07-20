// FounderGate LRCQ — Reconciliation Inbox data model (Tier-1). Durable, machine-readable
// records for uncertain side effects. Unknown external effect stays HELD. Never green.
import { reconcile } from "./transaction.mjs";

export const INBOX_FIELDS = ["transaction_id", "idempotency_key", "job_id", "attempt", "target", "dispatch_state", "process_state", "result_state", "reconciliation_classification", "safe_retry", "required_external_query", "recommendation", "evidence_links", "founder_action_required"];

// Build an inbox entry from an observed transaction. `obs` is the reconciliation observation.
export function inboxEntry(tx, obs) {
  const r = reconcile(obs);
  const held = ["HELD", "EXTERNAL_EFFECT_UNKNOWN", "NEEDS_RECONCILIATION"].includes(r.state);
  return {
    transaction_id: tx.transaction_id, idempotency_key: tx.idempotency_key, job_id: tx.job_id, attempt: tx.attempt ?? 1,
    target: tx.target ?? tx.branch ?? "n/a",
    dispatch_state: obs.dispatch_exists ? "DISPATCHED" : "NOT_DISPATCHED",
    process_state: obs.process_alive ? "ALIVE" : "GONE",
    result_state: obs.definitive_result ? (obs.evidence_agrees ? "DEFINITIVE_AGREES" : "DEFINITIVE_DISAGREES") : "NONE",
    reconciliation_classification: r.state,
    safe_retry: r.state === "SAFE_TO_RESUME" || r.state === "RESULT_COMPLETE",
    required_external_query: held ? (tx.external_query ?? "verify external effect before any retry") : null,
    recommendation: r.recommend,
    evidence_links: tx.evidence_links ?? [],
    founder_action_required: held,
  };
}

// The inbox is append-only; entries are never silently marked green.
export class ReconciliationInbox {
  constructor() { this.entries = []; }
  add(tx, obs) { const e = inboxEntry(tx, obs); this.entries.push(e); return e; }
  // items requiring founder attention (uncertain / held)
  pending() { return this.entries.filter((e) => e.founder_action_required); }
  // guard: nothing may be auto-retried while any uncertain effect is pending
  mayAutoRetry(idempotency_key) { const e = this.entries.find((x) => x.idempotency_key === idempotency_key); return !!e && e.safe_retry === true && e.founder_action_required === false; }
}

export const INBOX_STATEMENTS = [
  "FounderGate will not retry an uncertain action until reconciliation is complete.",
  "Unknown side-effect state is HELD.",
  "Worker success is not checker acceptance.",
  "Checker CLEAN is not merge authority.",
];
