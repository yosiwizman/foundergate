// FounderGate V8-B VB1 — SINGLE-SANCTIONED EXECUTOR + write-intent containment (AKIOR #4).
//
// This is the ONE gated writer: every visible-surface mutation MUST route through act().
// It refuses to act unless, in order:
//   1. a valid, non-revoked, non-expired, boot-bound, IN-SCOPE session token authorizes it,
//   2. a WIRED approval exists for THIS specific work — the "act edge". Until VB3 (the
//      Gate/Witness Engine) wires approvals, no approval can be `wired:true`, so real
//      execution is REFUSED (contract: the executor's act edge is gated on VB3),
//   3. the action is declared rollback-able AND a rollback backup was taken (reversible +
//      evidence — no act without a way back and a record).
// A refusal always returns exactly why; a success always leaves evidence.
//
// Pure Node. Holds no run loop; it only decides + performs one guarded mutation via the
// caller-supplied `mutate` thunk. `now` is DATA.

import { use, REASON } from "./session-token.mjs";

export const REFUSE = Object.freeze({
  NO_TOKEN: "NO_TOKEN", TOKEN_INVALID: "TOKEN_INVALID", NO_WIRED_APPROVAL: "NO_WIRED_APPROVAL",
  APPROVAL_MISMATCH: "APPROVAL_MISMATCH", NOT_ROLLBACKABLE: "NOT_ROLLBACKABLE", NO_BACKUP: "NO_BACKUP",
});

export function act({ tokenStore, tokenId, bootId, action, work, approval, backup, mutate } = {}, { now = Date.now() } = {}) {
  // 1) session-token gate (least-privilege, revocable, boot-bound)
  const u = use(tokenStore || { tokens: [] }, tokenId, { bootId, action, now });
  if (!u.ok) return { ok: false, reason: u.reason === REASON.NO_TOKEN || u.reason === REASON.NOT_FOUND ? REFUSE.NO_TOKEN : REFUSE.TOKEN_INVALID, detail: u.reason, evidence: null };

  // 2) WIRED-APPROVAL gate — the ACT EDGE. Real execution requires a recorded approval
  //    WIRED to exactly this work. VB3 is the only thing that can produce `wired:true`;
  //    until then every real act is refused here.
  if (!approval || approval.wired !== true) {
    return { ok: false, reason: REFUSE.NO_WIRED_APPROVAL, detail: "act edge gated on VB3 — no wired approval", evidence: null };
  }
  if (approval.work !== work) {
    return { ok: false, reason: REFUSE.APPROVAL_MISMATCH, detail: `approval is for "${approval.work}", not "${work}"`, evidence: null };
  }

  // 3) reversibility + evidence: rollback-able AND a backup taken
  if (approval.rollbackable !== true || typeof mutate !== "function") return { ok: false, reason: REFUSE.NOT_ROLLBACKABLE, evidence: null };
  if (!backup || !Array.isArray(backup.backups)) return { ok: false, reason: REFUSE.NO_BACKUP, evidence: null };

  // all gates passed -> perform exactly one guarded mutation and leave evidence.
  const result = mutate();
  return { ok: true, reason: "OK", evidence: { work, action, approved_by: approval.recorded_by || "UNKNOWN", backup_at: backup.created_at, result } };
}

// Is the executor's act edge currently wired? In VB1 it never is (VB3 unbuilt), so this
// is always false — a machine-checkable statement that VB1 cannot execute for real.
export function actEdgeWired(approval) {
  return !!(approval && approval.wired === true);
}
