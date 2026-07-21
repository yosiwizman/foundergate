// FounderGate LRCQ — run-wide cost ledger (FG-LRCQ-ACT-012). $10 is the MAXIMUM TOTAL across
// every builder, checker, correction and handshake session. Before each provider spawn a bounded
// amount is reserved (retaining reserve for a required checker), and that session's --max-budget-usd
// is set to no more than the remaining UNRESERVED amount. After each session the mechanically-
// reported cost is committed and unused reserve released. Missing cost evidence stops the run.
export const CENTS = (usd) => Math.round(usd * 100);
export const USD = (cents) => cents / 100;

const sessionKey = (s) => (s.role || "?") + ":" + (s.job || "?") + ":" + (s.attempt ?? "?") + ":" + (s.session_id || "");

export class BudgetLedger {
  constructor(totalUsd) { this.totalCents = CENTS(totalUsd); this.reservedCents = 0; this.spentCents = 0; this.records = []; this.open = new Map(); }
  spent() { return USD(this.spentCents); }
  reserved() { return USD(this.reservedCents); }
  remaining() { return USD(this.totalCents - this.spentCents - this.reservedCents); }

  // Reserve for a session. capUsd is the per-session cap; keepReserveUsd retains headroom for a
  // required later stage (e.g., the checker). Returns { ok, session_cap_usd } or a refusal.
  reserve(session, capUsd, keepReserveUsd = 0) {
    const availableCents = this.totalCents - this.spentCents - this.reservedCents - CENTS(keepReserveUsd);
    if (availableCents <= 0) return { ok: false, reason: "CONTROLLED_BUDGET_STOP", remaining: this.remaining() };
    const sessionCapCents = Math.min(CENTS(capUsd), availableCents);
    if (sessionCapCents <= 0) return { ok: false, reason: "CONTROLLED_BUDGET_STOP" };
    this.reservedCents += sessionCapCents; this.open.set(sessionKey(session), sessionCapCents);
    const rec = { event: "RESERVE", session, role: session.role, job: session.job, attempt: session.attempt, session_cap_usd: USD(sessionCapCents), reserved_total_usd: this.reserved(), spent_total_usd: this.spent(), remaining_usd: this.remaining() };
    this.records.push(rec);
    return { ok: true, session_cap_usd: USD(sessionCapCents) };
  }

  // Commit actual reported cost after a session; release its unused reservation.
  commit(session, actualUsd, transportEvidenceDigest) {
    if (!this.open.has(sessionKey(session))) return { ok: false, reason: "no reservation for session" };
    if (typeof actualUsd !== "number" || !Number.isFinite(actualUsd) || actualUsd < 0) { this.reservedCents -= this.open.get(sessionKey(session)); this.open.delete(sessionKey(session)); this.records.push({ event: "HELD_COST_EVIDENCE_MISSING", session, role: session.role, job: session.job, attempt: session.attempt }); return { ok: false, reason: "HELD_COST_EVIDENCE_MISSING" }; }
    const reservedCents = this.open.get(sessionKey(session)); this.open.delete(sessionKey(session));
    // Commit the TRUE reported cost. Do NOT silently cap it at the reservation — a session that spent
    // more than it reserved (e.g. the per-session CLI cap was not honored) must be counted at its real
    // cost so the run-wide ceiling reflects reality and stops the next required stage, rather than being
    // masked. A per-session overspend is recorded as its own event for the evidence plane.
    const actualCents = CENTS(actualUsd);
    this.reservedCents -= reservedCents; this.spentCents += actualCents;
    if (actualCents > reservedCents) this.records.push({ event: "BUDGET_OVERSPEND", session, role: session.role, job: session.job, attempt: session.attempt, reserved_usd: USD(reservedCents), reported_cost_usd: actualUsd, spent_total_usd: this.spent() });
    this.records.push({ event: "COMMIT", session, role: session.role, job: session.job, attempt: session.attempt, reported_cost_usd: actualUsd, committed_cost_usd: USD(actualCents), spent_total_usd: this.spent(), remaining_usd: this.remaining(), transport_evidence_digest: transportEvidenceDigest || null });
    return { ok: true, spent_total_usd: this.spent(), overspent: actualCents > reservedCents };
  }

  // May a new required stage start? False once committed+reserved would reach the ceiling.
  canStart(nextReserveUsd = 0) { return (this.spentCents + this.reservedCents + CENTS(nextReserveUsd)) <= this.totalCents && this.remaining() > 0; }
  overCeiling() { return (this.spentCents + this.reservedCents) > this.totalCents; }
}
