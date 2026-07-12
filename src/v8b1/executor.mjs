// FounderGate V8-B VB1 — SINGLE-SANCTIONED EXECUTOR + write-intent containment (AKIOR #4).
//
// The ONE gated writer: every visible-surface mutation MUST route through act(). It
// refuses unless, in order:
//   1. a valid, non-revoked, non-expired, boot-bound, IN-SCOPE session token authorizes it
//      (a non-empty action listed in the token's non-empty scope),
//   2. an AUTHENTICATED, UNFORGEABLE approval bound to THIS work+action — the "act edge".
//      An approval is a plain object the caller CANNOT self-forge: it carries an HMAC
//      signature over its bound fields, verifiable only with a VB3-held secret. In VB1
//      there is NO VB3 verifier (VB3 unbuilt) → `actEdgeWired()` is false → NO approval
//      can verify → every real execution is REFUSED. `act()` calls `verifyApproval` for
//      real (not a decorative boolean).
//   3. the action is rollback-able AND a rollback backup was taken (reversible + evidence).
// A refusal always says why; a success always leaves evidence.
//
// Pure Node. `verifier` defaults to VB3_VERIFIER (null in VB1). `now` is DATA.
// (checker round-1 HIGH-1: the old `approval.wired===true` boolean was caller-forgeable.)

import { createHmac, timingSafeEqual } from "node:crypto";
import { use, REASON } from "./session-token.mjs";

export const REFUSE = Object.freeze({
  NO_ACTION: "NO_ACTION", NO_TOKEN: "NO_TOKEN", TOKEN_INVALID: "TOKEN_INVALID",
  NO_WIRED_APPROVAL: "NO_WIRED_APPROVAL", APPROVAL_MISMATCH: "APPROVAL_MISMATCH",
  NOT_ROLLBACKABLE: "NOT_ROLLBACKABLE", NO_BACKUP: "NO_BACKUP",
});

// VB1 ships NO VB3 approval verifier — VB3 is unbuilt. The act edge is therefore HARD
// gated: no approval can authenticate, so act() cannot execute for real. (A verifier is
// `{ secret }`; only VB3 will hold one.)
export const VB3_VERIFIER = null;

export function actEdgeWired(verifier = VB3_VERIFIER) {
  return !!(verifier && typeof verifier.secret === "string" && verifier.secret.length > 0);
}

// The canonical bytes an approval signs over — bound to the specific work + action so an
// approval for one action can never authorize another.
function canon({ work, action, nonce, rollbackable }) {
  return JSON.stringify({ work, action, nonce, rollbackable: rollbackable === true });
}

// Sign an approval — this is the VB3 side; it needs the secret. In VB1 there is no secret
// to sign with, so no valid approval can be produced. Exposed so VB3 (and proofs) can mint
// authentic approvals; useless without the verifier's secret.
export function signApproval(verifier, { work, action, nonce, rollbackable = true, recorded_by } = {}) {
  if (!actEdgeWired(verifier)) throw new Error("cannot sign: no verifier (VB3 not wired)");
  const sig = createHmac("sha256", verifier.secret).update(canon({ work, action, nonce, rollbackable })).digest("hex");
  return { work, action, nonce, rollbackable, recorded_by, sig };
}

// Verify an approval against the verifier. Unforgeable: a caller without the secret cannot
// produce a matching sig. Returns false when there is no verifier (VB1) — so the act edge
// is closed until VB3 is wired.
export function verifyApproval(approval, verifier = VB3_VERIFIER) {
  if (!actEdgeWired(verifier)) return false;
  if (!approval || typeof approval.sig !== "string") return false;
  const expected = createHmac("sha256", verifier.secret).update(canon(approval)).digest("hex");
  try {
    const a = Buffer.from(approval.sig, "hex"), b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}

export function act({ tokenStore, tokenId, bootId, action, work, approval, backup, mutate, verifier = VB3_VERIFIER } = {}, { now = Date.now() } = {}) {
  // 0) an action is mandatory (checker MEDIUM-3: a missing action must never skip scope).
  if (typeof action !== "string" || !action) return { ok: false, reason: REFUSE.NO_ACTION, evidence: null };

  // 1) session-token gate (least-privilege, revocable, boot-bound, in-scope).
  const u = use(tokenStore || { tokens: [] }, tokenId, { bootId, action, now });
  if (!u.ok) return { ok: false, reason: (u.reason === REASON.NO_TOKEN || u.reason === REASON.NOT_FOUND) ? REFUSE.NO_TOKEN : REFUSE.TOKEN_INVALID, detail: u.reason, evidence: null };

  // 2) ACT EDGE — an AUTHENTICATED approval bound to THIS work+action. In VB1 there is no
  //    verifier, so verifyApproval() is always false: a forged `{ wired:true }` object (or
  //    any plain object) is refused here. This is the machine-true "act edge gated on VB3".
  if (!verifyApproval(approval, verifier)) {
    return { ok: false, reason: REFUSE.NO_WIRED_APPROVAL, detail: actEdgeWired(verifier) ? "approval failed verification" : "act edge gated on VB3 — no verifier", evidence: null };
  }
  if (approval.work !== work || approval.action !== action) {
    return { ok: false, reason: REFUSE.APPROVAL_MISMATCH, detail: `approval bound to ${approval.work}/${approval.action}, not ${work}/${action}`, evidence: null };
  }

  // 3) reversibility + evidence.
  if (approval.rollbackable !== true || typeof mutate !== "function") return { ok: false, reason: REFUSE.NOT_ROLLBACKABLE, evidence: null };
  if (!backup || !Array.isArray(backup.backups)) return { ok: false, reason: REFUSE.NO_BACKUP, evidence: null };

  // all gates passed → exactly one guarded mutation, with evidence.
  const result = mutate();
  return { ok: true, reason: "OK", evidence: { work, action, approved_by: approval.recorded_by || "VB3", backup_at: backup.created_at, result } };
}
